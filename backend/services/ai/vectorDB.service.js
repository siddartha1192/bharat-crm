/**
 * Vector Database Service
 * Uses Qdrant Cloud for vector storage and OpenAI for embeddings
 */

const { QdrantClient } = require('@qdrant/js-client-rest');
const { OpenAIEmbeddings } = require('@langchain/openai');
const { QdrantVectorStore } = require('@langchain/qdrant');
const { RecursiveCharacterTextSplitter } = require('@langchain/textsplitters');
const aiConfig = require('../../config/ai.config');

class VectorDBService {
  constructor() {
    this.client = null;
    this.vectorStore = null;
    this.embeddings = null;
    this.initialized = false;
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
          await this.client.createCollection(aiConfig.vectorDB.collectionName, {
            vectors: {
              size: 1536, // OpenAI embedding dimension for text-embedding-3-small
              distance: 'Cosine',
            },
          });
          console.log('✅ Collection created');
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
      const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
      });

      const splitDocs = [];
      let chunkedCount = 0;
      let preservedCount = 0;

      for (const doc of documents) {
        // Ensure tenantId is included in metadata for all chunks
        const metadata = { ...(doc.metadata || {}), tenantId };

        // Check if this document should NOT be chunked (e.g., CSV/Excel rows)
        if (metadata.doNotChunk) {
          // Add document as-is without chunking to preserve row integrity
          splitDocs.push({
            pageContent: doc.content,
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
   * @param {number} k - Number of results to return
   * @param {string} tenantId - Tenant ID for filtering results
   * @param {Object} additionalFilters - Optional additional filters (fileType, fileName, etc.)
   * @returns {Array} - Array of relevant documents
   */
  async search(query, k = 5, tenantId = null, additionalFilters = {}) {
    await this.initialize();

    if (!tenantId) {
      throw new Error('tenantId is required for vector search to enforce tenant isolation');
    }

    try {
      // Build Qdrant filter with tenant isolation
      const filter = {
        must: [
          {
            key: 'metadata.tenantId',
            match: { value: tenantId }
          }
        ]
      };

      // Add optional filters for fileType, fileName, etc.
      if (additionalFilters.fileType) {
        filter.must.push({
          key: 'metadata.fileType',
          match: { value: additionalFilters.fileType }
        });
      }

      if (additionalFilters.fileName) {
        filter.must.push({
          key: 'metadata.fileName',
          match: { value: additionalFilters.fileName }
        });
      }

      if (additionalFilters.sheetName) {
        filter.must.push({
          key: 'metadata.sheetName',
          match: { value: additionalFilters.sheetName }
        });
      }

      // Exclude full file summaries if specified (get only actual rows)
      if (additionalFilters.excludeFullFile) {
        filter.must_not = filter.must_not || [];
        filter.must_not.push({
          key: 'metadata.isFullFile',
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
   * @param {number} k - Number of results
   * @param {number} minScore - Minimum relevance score (0-1)
   * @param {string} tenantId - Tenant ID for filtering results
   * @param {Object} additionalFilters - Optional additional filters (fileType, fileName, etc.)
   */
  async searchWithScore(query, k = 5, minScore = 0.7, tenantId = null, additionalFilters = {}) {
    await this.initialize();

    if (!tenantId) {
      throw new Error('tenantId is required for vector search to enforce tenant isolation');
    }

    try {
      // Build Qdrant filter with tenant isolation
      const filter = {
        must: [
          {
            key: 'metadata.tenantId',
            match: { value: tenantId }
          }
        ]
      };

      // Add optional filters for fileType, fileName, etc.
      if (additionalFilters.fileType) {
        filter.must.push({
          key: 'metadata.fileType',
          match: { value: additionalFilters.fileType }
        });
      }

      if (additionalFilters.fileName) {
        filter.must.push({
          key: 'metadata.fileName',
          match: { value: additionalFilters.fileName }
        });
      }

      if (additionalFilters.sheetName) {
        filter.must.push({
          key: 'metadata.sheetName',
          match: { value: additionalFilters.sheetName }
        });
      }

      // Exclude full file summaries if specified (get only actual rows)
      if (additionalFilters.excludeFullFile) {
        filter.must_not = filter.must_not || [];
        filter.must_not.push({
          key: 'metadata.isFullFile',
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

      // Recreate collection
      await this.client.createCollection(aiConfig.vectorDB.collectionName, {
        vectors: {
          size: 1536,
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
