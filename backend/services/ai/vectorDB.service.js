/**
 * Vector Database Service
 * Uses Qdrant Cloud for vector storage and OpenAI for embeddings
 *
 * IMPORTANT: All OpenAI API keys come from tenant settings (Settings tab),
 * NOT from environment variables. Each operation requires tenant config.
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
    this.initialized = false;
    // Cache for embeddings instances per API key (to avoid re-creating)
    this.embeddingsCache = new Map();
    // Cache for vector stores per API key
    this.vectorStoreCache = new Map();
  }

  /**
   * Get vector dimension for configured embedding model
   * @param {string} modelName - Optional model name override
   * @returns {number} Vector dimension
   */
  getVectorDimension(modelName = null) {
    const model = modelName || aiConfig.vectorDB.embeddingModel;
    const dimension = EMBEDDING_DIM_MAP[model];

    if (!dimension) {
      console.warn(`⚠️ Unknown embedding model: ${model}, defaulting to 1536 dimensions`);
      return 1536;
    }

    return dimension;
  }

  /**
   * Get or create embeddings instance for a specific API key
   * @param {string} apiKey - OpenAI API key from tenant settings
   * @param {string} modelName - Optional embedding model override
   * @returns {OpenAIEmbeddings}
   */
  getEmbeddings(apiKey, modelName = null) {
    if (!apiKey) {
      throw new Error('OpenAI API key is required. Please configure it in Settings > AI Configuration.');
    }

    const cacheKey = `${apiKey.substring(0, 8)}_${modelName || aiConfig.vectorDB.embeddingModel}`;

    if (!this.embeddingsCache.has(cacheKey)) {
      const embeddings = new OpenAIEmbeddings({
        openAIApiKey: apiKey,
        modelName: modelName || aiConfig.vectorDB.embeddingModel,
      });
      this.embeddingsCache.set(cacheKey, embeddings);
    }

    return this.embeddingsCache.get(cacheKey);
  }

  /**
   * Get or create vector store for a specific API key
   * @param {string} apiKey - OpenAI API key from tenant settings
   * @returns {Promise<QdrantVectorStore>}
   */
  async getVectorStore(apiKey) {
    if (!apiKey) {
      throw new Error('OpenAI API key is required. Please configure it in Settings > AI Configuration.');
    }

    const cacheKey = apiKey.substring(0, 8);

    if (!this.vectorStoreCache.has(cacheKey)) {
      const embeddings = this.getEmbeddings(apiKey);
      const vectorStore = await QdrantVectorStore.fromExistingCollection(
        embeddings,
        {
          client: this.client,
          collectionName: aiConfig.vectorDB.collectionName,
        }
      );
      this.vectorStoreCache.set(cacheKey, vectorStore);
    }

    return this.vectorStoreCache.get(cacheKey);
  }

  /**
   * Initialize Qdrant client connection (no OpenAI key needed)
   */
  async initialize() {
    if (this.initialized) {
      return;
    }

    try {
      console.log('🔧 Initializing Vector Database (Qdrant client only)...');
      console.log(`📡 Connecting to Qdrant at ${aiConfig.vectorDB.url}`);

      // Initialize Qdrant client (no OpenAI key needed here)
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
              size: vectorSize,
              distance: 'Cosine',
            },
          });
          console.log(`✅ Collection created with ${vectorSize} dimensions`);
        } catch (createError) {
          if (createError.status === 409) {
            console.log(`✅ Collection '${aiConfig.vectorDB.collectionName}' already exists (conflict resolved)`);
          } else {
            throw createError;
          }
        }
      }

      this.initialized = true;
      console.log('✅ Vector Database (Qdrant) initialized successfully');
      console.log('ℹ️  Note: OpenAI API key will be loaded from tenant settings for each operation');
    } catch (error) {
      console.error('❌ Error initializing Vector Database:', error);
      throw error;
    }
  }

  /**
   * Add documents to vector database
   * @param {Array} documents - Array of { content, metadata } objects
   * @param {string} tenantId - Tenant ID for multi-tenant isolation
   * @param {Object} tenantConfig - Tenant config with apiKey (REQUIRED)
   */
  async addDocuments(documents, tenantId, tenantConfig = null) {
    await this.initialize();

    if (!tenantId) {
      throw new Error('tenantId is required for document upload');
    }

    // Get API key from tenant config
    const apiKey = tenantConfig?.apiKey;
    if (!apiKey) {
      throw new Error('OpenAI API key is required. Please configure it in Settings > AI Configuration.');
    }

    try {
      console.log(`📚 Adding ${documents.length} documents to vector database for tenant ${tenantId}...`);

      // Get vector store with tenant's API key
      const vectorStore = await this.getVectorStore(apiKey);

      // Split documents into chunks for better retrieval
      const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 600,
        chunkOverlap: 100,
      });

      const splitDocs = [];
      let chunkedCount = 0;
      let preservedCount = 0;

      for (const doc of documents) {
        const metadata = { ...(doc.metadata || {}), tenantId };

        if (metadata.doNotChunk) {
          const contextPrefix = metadata.fileType && metadata.fileName
            ? `[${metadata.fileType.toUpperCase()} Data from ${metadata.fileName}${metadata.sheetName ? ` - Sheet: ${metadata.sheetName}` : ''}]\n`
            : '';

          const enhancedContent = `${contextPrefix}${doc.content}`;

          splitDocs.push({
            pageContent: enhancedContent,
            metadata: metadata
          });
          preservedCount++;
        } else {
          const chunks = await textSplitter.createDocuments([doc.content], [metadata]);
          splitDocs.push(...chunks);
          chunkedCount += chunks.length;
        }
      }

      console.log(`📄 Processing complete: ${preservedCount} documents preserved (CSV/Excel rows), ${chunkedCount} chunks created from text docs`);

      // Add to vector store
      await vectorStore.addDocuments(splitDocs);

      console.log('✅ Documents added successfully with tenant isolation');
      return { success: true, chunksAdded: splitDocs.length };
    } catch (error) {
      console.error('❌ Error adding documents:', error);
      throw error;
    }
  }

  /**
   * Search for relevant documents with tenant isolation
   * @param {string} query - Search query
   * @param {number} k - Number of results to return
   * @param {string} tenantId - Tenant ID for filtering results
   * @param {Object} tenantConfig - Tenant config with apiKey (REQUIRED)
   * @param {Object} additionalFilters - Optional additional filters
   * @returns {Array} - Array of relevant documents
   */
  async search(query, k = 10, tenantId = null, tenantConfig = null, additionalFilters = {}) {
    await this.initialize();

    if (!tenantId) {
      throw new Error('tenantId is required for vector search to enforce tenant isolation');
    }

    const apiKey = tenantConfig?.apiKey;
    if (!apiKey) {
      throw new Error('OpenAI API key is required. Please configure it in Settings > AI Configuration.');
    }

    try {
      const vectorStore = await this.getVectorStore(apiKey);

      const filter = {
        must: [
          {
            key: 'tenantId',
            match: { value: tenantId }
          }
        ]
      };

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

      if (additionalFilters.excludeFullFile) {
        filter.must_not = filter.must_not || [];
        filter.must_not.push({
          key: 'isFullFile',
          match: { value: true }
        });
      }

      const results = await vectorStore.similaritySearch(query, k, filter);

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
   * @param {Object} tenantConfig - Tenant config with apiKey (REQUIRED)
   * @param {Object} additionalFilters - Optional additional filters
   */
  async searchWithScore(query, k = 15, minScore = 0.5, tenantId = null, tenantConfig = null, additionalFilters = {}) {
    await this.initialize();

    if (!tenantId) {
      throw new Error('tenantId is required for vector search to enforce tenant isolation');
    }

    const apiKey = tenantConfig?.apiKey;
    if (!apiKey) {
      throw new Error('OpenAI API key is required. Please configure it in Settings > AI Configuration.');
    }

    try {
      const vectorStore = await this.getVectorStore(apiKey);

      // ADAPTIVE APPROACH: Try multiple filter strategies
      let results = await this._searchWithFilter(vectorStore, query, k, tenantId, additionalFilters, false);

      if (results.length === 0) {
        console.log('⚠️ No results with flat keys, trying with "metadata." prefix...');
        results = await this._searchWithFilter(vectorStore, query, k, tenantId, additionalFilters, true);
      }

      if (results.length === 0) {
        console.log('⚠️ No results with filters, searching without filters and filtering manually...');
        const unfilteredResults = await vectorStore.similaritySearchWithScore(query, k * 2);

        console.log(`🔍 DEBUG: Got ${unfilteredResults.length} results without filters`);

        results = unfilteredResults.filter(([doc, _score]) => {
          const docTenantId = doc.metadata?.tenantId || doc.metadata?.metadata?.tenantId;
          return docTenantId === tenantId;
        });

        console.log(`🔍 DEBUG: After manual tenant filtering: ${results.length} results`);
      }

      console.log(`🔍 DEBUG: Qdrant returned ${results.length} results before score filtering`);

      const filtered = results
        .filter(([_, score]) => score >= minScore)
        .map(([doc, score]) => ({
          content: doc.pageContent,
          metadata: doc.metadata,
          score,
        }));

      console.log(`🔍 DEBUG: After score filtering (>= ${minScore}): ${filtered.length} results`);

      return filtered;
    } catch (error) {
      console.error('❌ Error searching with score:', error);
      throw error;
    }
  }

  /**
   * INTERNAL: Try searching with a specific filter strategy
   */
  async _searchWithFilter(vectorStore, query, k, tenantId, additionalFilters, useMetadataPrefix) {
    const prefix = useMetadataPrefix ? 'metadata.' : '';

    const filter = {
      must: [
        {
          key: `${prefix}tenantId`,
          match: { value: tenantId }
        }
      ]
    };

    if (additionalFilters.fileType) {
      filter.must.push({
        key: `${prefix}fileType`,
        match: { value: additionalFilters.fileType }
      });
    }

    if (additionalFilters.fileName) {
      filter.must.push({
        key: `${prefix}fileName`,
        match: { value: additionalFilters.fileName }
      });
    }

    if (additionalFilters.sheetName) {
      filter.must.push({
        key: `${prefix}sheetName`,
        match: { value: additionalFilters.sheetName }
      });
    }

    if (additionalFilters.excludeFullFile) {
      filter.must_not = filter.must_not || [];
      filter.must_not.push({
        key: `${prefix}isFullFile`,
        match: { value: true }
      });
    }

    const results = await vectorStore.similaritySearchWithScore(query, k, filter);
    return results;
  }

  /**
   * Get retriever for LangChain integration
   * @param {Object} tenantConfig - Tenant config with apiKey (REQUIRED)
   * @param {number} k - Number of results
   */
  async getRetriever(tenantConfig, k = 5) {
    await this.initialize();

    const apiKey = tenantConfig?.apiKey;
    if (!apiKey) {
      throw new Error('OpenAI API key is required. Please configure it in Settings > AI Configuration.');
    }

    const vectorStore = await this.getVectorStore(apiKey);
    return vectorStore.asRetriever(k);
  }

  /**
   * Clear all documents from collection
   * @param {Object} tenantConfig - Tenant config with apiKey (REQUIRED for reinitializing vector store)
   */
  async clearCollection(tenantConfig = null) {
    await this.initialize();

    try {
      console.log('🗑️ Clearing vector database collection...');

      await this.client.deleteCollection(aiConfig.vectorDB.collectionName);

      const vectorSize = this.getVectorDimension();
      await this.client.createCollection(aiConfig.vectorDB.collectionName, {
        vectors: {
          size: vectorSize,
          distance: 'Cosine',
        },
      });

      // Clear caches since collection was recreated
      this.vectorStoreCache.clear();
      this.embeddingsCache.clear();

      console.log('✅ Collection cleared and recreated');
      return { success: true };
    } catch (error) {
      console.error('❌ Error clearing collection:', error);
      throw error;
    }
  }

  /**
   * Get collection stats from Qdrant Cloud (no API key needed)
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

  /**
   * DEBUG: Get sample points from collection (no API key needed)
   */
  async getSamplePoints(limit = 5) {
    await this.initialize();

    try {
      const response = await this.client.scroll(aiConfig.vectorDB.collectionName, {
        limit,
        with_payload: true,
        with_vector: false
      });

      return response.points;
    } catch (error) {
      console.error('❌ Error getting sample points:', error);
      throw error;
    }
  }

  /**
   * DEBUG: Search without any filters (requires API key for embeddings)
   */
  async searchWithoutFilters(query, k = 10, tenantConfig = null) {
    await this.initialize();

    const apiKey = tenantConfig?.apiKey;
    if (!apiKey) {
      throw new Error('OpenAI API key is required. Please configure it in Settings > AI Configuration.');
    }

    try {
      const vectorStore = await this.getVectorStore(apiKey);
      const results = await vectorStore.similaritySearchWithScore(query, k);

      return results.map(([doc, score]) => ({
        content: doc.pageContent,
        metadata: doc.metadata,
        score,
      }));
    } catch (error) {
      console.error('❌ Error in unfiltered search:', error);
      throw error;
    }
  }
}

// Export singleton instance
module.exports = new VectorDBService();
