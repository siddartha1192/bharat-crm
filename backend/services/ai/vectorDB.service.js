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
        await this.client.createCollection(aiConfig.vectorDB.collectionName, {
          vectors: {
            size: 1536, // OpenAI embedding dimension for text-embedding-3-small
            distance: 'Cosine',
          },
        });
        console.log('✅ Collection created');
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
   */
  async addDocuments(documents) {
    await this.initialize();

    try {
      console.log(`📚 Adding ${documents.length} documents to vector database...`);

      // Split documents into chunks for better retrieval
      const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
      });

      const splitDocs = [];
      for (const doc of documents) {
        const chunks = await textSplitter.createDocuments([doc.content], [doc.metadata || {}]);
        splitDocs.push(...chunks);
      }

      console.log(`📄 Split into ${splitDocs.length} chunks`);

      // Add to vector store
      await this.vectorStore.addDocuments(splitDocs);

      console.log('✅ Documents added successfully');
      return { success: true, chunksAdded: splitDocs.length };
    } catch (error) {
      console.error('❌ Error adding documents:', error);
      throw error;
    }
  }

  /**
   * Search for relevant documents
   * @param {string} query - Search query
   * @param {number} k - Number of results to return
   * @returns {Array} - Array of relevant documents
   */
  async search(query, k = 5) {
    await this.initialize();

    try {
      const results = await this.vectorStore.similaritySearch(query, k);

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
   * Search with relevance scores
   * @param {string} query - Search query
   * @param {number} k - Number of results
   * @param {number} minScore - Minimum relevance score (0-1)
   */
  async searchWithScore(query, k = 5, minScore = 0.7) {
    await this.initialize();

    try {
      const results = await this.vectorStore.similaritySearchWithScore(query, k);

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
