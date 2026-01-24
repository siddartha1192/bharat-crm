/**
 * Vector Database Service
 * Uses Qdrant Cloud for vector storage and OpenAI for embeddings
 */

const { QdrantClient } = require('@qdrant/js-client-rest');
const { OpenAIEmbeddings } = require('@langchain/openai');
const { QdrantVectorStore } = require('@langchain/qdrant');
const { RecursiveCharacterTextSplitter } = require('@langchain/textsplitters');
const aiConfig = require('../../config/ai.config');

// Embedding model dimensions mapping (CRITICAL for correct vector similarity)
const EMBEDDING_DIM_MAP = {
  'text-embedding-3-small': 1536,
  'text-embedding-3-large': 3072,
  'text-embedding-ada-002': 1536,
};

class VectorDBService {
  constructor() {
    this.client = null;
    this.vectorStore = null;
    this.embeddings = null;
    this.initialized = false;
  }

  /**
   * Get vector dimension for configured embedding model
   * @returns {number} Vector dimension
   */
  getVectorDimension() {
    const modelName = aiConfig.vectorDB.embeddingModel;
    const dimension = EMBEDDING_DIM_MAP[modelName];

    if (!dimension) {
      console.warn(`⚠️ Unknown embedding model: ${modelName}, defaulting to 1536 dimensions`);
      return 1536;
    }

    console.log(`📐 Using ${dimension} dimensions for model: ${modelName}`);
    return dimension;
  }

  /**
   * Initialize vector database connection to Qdrant Cloud
   */
  async initialize() {
    if (this.initialized) {
      return;
    }

    try {
      console.log('🔧 Initializing Vector Database...');
      console.log(`📡 Connecting to Qdrant at ${aiConfig.vectorDB.url}`);

      // Initialize embeddings
      this.embeddings = new OpenAIEmbeddings({
        openAIApiKey: aiConfig.openaiApiKey,
        modelName: aiConfig.vectorDB.embeddingModel,
      });

      // Initialize Qdrant client
      this.client = new QdrantClient({
        url: aiConfig.vectorDB.url,
        apiKey: aiConfig.vectorDB.apiKey,
        checkCompatibility: false, // Skip version check for cloud compatibility
      });

      // Check if collection exists, create if not
      try {
        await this.client.getCollection(aiConfig.vectorDB.collectionName);
        console.log(`✅ Collection '${aiConfig.vectorDB.collectionName}' exists`);
      } catch (error) {
        console.log(`📝 Creating collection '${aiConfig.vectorDB.collectionName}'...`);
        try {
          const vectorSize = this.getVectorDimension();
          await this.client.createCollection(aiConfig.vectorDB.collectionName, {
            vectors: {
              size: vectorSize, // Dynamic dimension based on embedding model
              distance: 'Cosine',
            },
          });
          console.log(`✅ Collection created with ${vectorSize} dimensions`);
        } catch (createError) {
          // If collection already exists (409 Conflict), that's fine - just continue
          if (createError.status === 409) {
            console.log(`✅ Collection '${aiConfig.vectorDB.collectionName}' already exists (conflict resolved)`);
          } else {
            // Re-throw other errors
            throw createError;
          }
        }
      }

      // Initialize vector store
      this.vectorStore = await QdrantVectorStore.fromExistingCollection(
        this.embeddings,
        {
          client: this.client,
          collectionName: aiConfig.vectorDB.collectionName,
        }
      );

      this.initialized = true;
      console.log('✅ Vector Database initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing Vector Database:', error);
      throw error;
    }
  }

  /**
   * Add documents to vector database
   * @param {Array} documents - Array of { content, metadata } objects
   * @param {string} tenantId - Tenant ID for multi-tenant isolation
   */
  async addDocuments(documents, tenantId) {
    await this.initialize();

    if (!tenantId) {
      throw new Error('tenantId is required for document upload');
    }

    try {
      console.log(`📚 Adding ${documents.length} documents to vector database for tenant ${tenantId}...`);

      // Split documents into chunks for better retrieval
      // BUT: Respect doNotChunk flag for CSV/Excel rows to preserve data integrity
      // Optimized chunk size: 600 chars (better for semantic search than 1000)
      // Increased overlap: 100 chars (preserves context at boundaries)
      const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 600,
        chunkOverlap: 100,
      });

      const splitDocs = [];
      let chunkedCount = 0;
      let preservedCount = 0;

      for (const doc of documents) {
        // Ensure tenantId is included in metadata for all chunks
        const metadata = { ...(doc.metadata || {}), tenantId };

        // Check if this document should NOT be chunked (e.g., CSV/Excel rows)
        if (metadata.doNotChunk) {
          // Add contextual information to improve semantic search
          // This helps the LLM understand the source and structure without breaking row integrity
          const contextPrefix = metadata.fileType && metadata.fileName
            ? `[${metadata.fileType.toUpperCase()} Data from ${metadata.fileName}${metadata.sheetName ? ` - Sheet: ${metadata.sheetName}` : ''}]\n`
            : '';

          const enhancedContent = `${contextPrefix}${doc.content}`;

          // Add document without chunking to preserve row integrity
          splitDocs.push({
            pageContent: enhancedContent,
            metadata: metadata
          });
          preservedCount++;
        } else {
          // Normal chunking for text documents (PDF, DOCX, TXT, etc.)
          const chunks = await textSplitter.createDocuments([doc.content], [metadata]);
          splitDocs.push(...chunks);
          chunkedCount += chunks.length;
        }
      }

      console.log(`📄 Processing complete: ${preservedCount} documents preserved (CSV/Excel rows), ${chunkedCount} chunks created from text docs`);

      // Add to vector store
      await this.vectorStore.addDocuments(splitDocs);

      console.log('✅ Documents added successfully with tenant isolation');
      return { success: true, chunksAdded: splitDocs.length };
    } catch (error) {
      console.error('❌ Error adding documents:', error);
      throw error;
    }
  }

  /**
   * Search for relevant documents with tenant isolation and advanced filtering
   * @param {string} query - Search query
   * @param {number} k - Number of results to return (default: 10 for better recall)
   * @param {string} tenantId - Tenant ID for filtering results
   * @param {Object} additionalFilters - Optional additional filters (fileType, fileName, etc.)
   * @returns {Array} - Array of relevant documents
   */
  async search(query, k = 10, tenantId = null, additionalFilters = {}) {
    await this.initialize();

    if (!tenantId) {
      throw new Error('tenantId is required for vector search to enforce tenant isolation');
    }

    try {
      // Build Qdrant filter with tenant isolation
      // CRITICAL: LangChain stores metadata directly in payload, not nested under 'metadata.'
      const filter = {
        must: [
          {
            key: 'tenantId',
            match: { value: tenantId }
          }
        ]
      };

      // Add optional filters for fileType, fileName, etc.
      if (additionalFilters.fileType) {
        filter.must.push({
          key: 'fileType',
          match: { value: additionalFilters.fileType }
        });
      }

      if (additionalFilters.fileName) {
        filter.must.push({
          key: 'fileName',
          match: { value: additionalFilters.fileName }
        });
      }

      if (additionalFilters.sheetName) {
        filter.must.push({
          key: 'sheetName',
          match: { value: additionalFilters.sheetName }
        });
      }

      // Exclude full file summaries if specified (get only actual rows)
      if (additionalFilters.excludeFullFile) {
        filter.must_not = filter.must_not || [];
        filter.must_not.push({
          key: 'isFullFile',
          match: { value: true }
        });
      }

      const results = await this.vectorStore.similaritySearch(query, k, filter);

      return results.map(doc => ({
        content: doc.pageContent,
        metadata: doc.metadata,
      }));
    } catch (error) {
      console.error('❌ Error searching vector database:', error);
      throw error;
    }
  }

  /**
   * Search with relevance scores, tenant isolation, and advanced filtering
   * @param {string} query - Search query
   * @param {number} k - Number of results (default: 15 for better recall)
   * @param {number} minScore - Minimum relevance score (0-1, default: 0.5 for better recall on tabular data)
   * @param {string} tenantId - Tenant ID for filtering results
   * @param {Object} additionalFilters - Optional additional filters (fileType, fileName, etc.)
   */
  async searchWithScore(query, k = 15, minScore = 0.5, tenantId = null, additionalFilters = {}) {
    await this.initialize();

    if (!tenantId) {
      throw new Error('tenantId is required for vector search to enforce tenant isolation');
    }

    try {
      // Build Qdrant filter with tenant isolation
      // CRITICAL: LangChain stores metadata directly in payload, not nested under 'metadata.'
      const filter = {
        must: [
          {
            key: 'tenantId',
            match: { value: tenantId }
          }
        ]
      };

      // Add optional filters for fileType, fileName, etc.
      if (additionalFilters.fileType) {
        filter.must.push({
          key: 'fileType',
          match: { value: additionalFilters.fileType }
        });
      }

      if (additionalFilters.fileName) {
        filter.must.push({
          key: 'fileName',
          match: { value: additionalFilters.fileName }
        });
      }

      if (additionalFilters.sheetName) {
        filter.must.push({
          key: 'sheetName',
          match: { value: additionalFilters.sheetName }
        });
      }

      // Exclude full file summaries if specified (get only actual rows)
      if (additionalFilters.excludeFullFile) {
        filter.must_not = filter.must_not || [];
        filter.must_not.push({
          key: 'isFullFile',
          match: { value: true }
        });
      }

      const results = await this.vectorStore.similaritySearchWithScore(query, k, filter);

      // Filter by minimum score
      const filtered = results
        .filter(([_, score]) => score >= minScore)
        .map(([doc, score]) => ({
          content: doc.pageContent,
          metadata: doc.metadata,
          score,
        }));

      return filtered;
    } catch (error) {
      console.error('❌ Error searching with score:', error);
      throw error;
    }
  }

  /**
   * Get retriever for LangChain integration
   */
  async getRetriever(k = 5) {
    await this.initialize();
    return this.vectorStore.asRetriever(k);
  }

  /**
   * Clear all documents from collection
   */
  async clearCollection() {
    await this.initialize();

    try {
      console.log('🗑️ Clearing vector database collection...');

      // Delete and recreate collection
      await this.client.deleteCollection(aiConfig.vectorDB.collectionName);

      // Recreate collection with correct dimensions
      const vectorSize = this.getVectorDimension();
      await this.client.createCollection(aiConfig.vectorDB.collectionName, {
        vectors: {
          size: vectorSize,
          distance: 'Cosine',
        },
      });

      // Reinitialize vector store
      this.vectorStore = await QdrantVectorStore.fromExistingCollection(
        this.embeddings,
        {
          client: this.client,
          collectionName: aiConfig.vectorDB.collectionName,
        }
      );

      console.log('✅ Collection cleared and recreated');
      return { success: true };
    } catch (error) {
      console.error('❌ Error clearing collection:', error);
      throw error;
    }
  }

  /**
   * Get collection stats from Qdrant Cloud
   */
  async getStats() {
    await this.initialize();

    try {
      const info = await this.client.getCollection(aiConfig.vectorDB.collectionName);
      return {
        name: aiConfig.vectorDB.collectionName,
        pointsCount: info.points_count,
        vectorSize: info.config.params.vectors.size,
        distance: info.config.params.vectors.distance,
      };
    } catch (error) {
      console.error('❌ Error getting stats:', error);
      throw error;
    }
  }
}

// Export singleton instance
module.exports = new VectorDBService();
