const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { tenantContext, getTenantFilter, autoInjectTenantId } = require('../middleware/tenant');
const portalAIService = require('../services/ai/portalAI.service');
const whatsappAIService = require('../services/ai/whatsappAI.service');
const vectorDBService = require('../services/ai/vectorDB.service');

// Apply authentication to all AI routes
router.use(authenticate);
router.use(tenantContext);

/**
 * Portal AI Chat - Ask anything about the CRM
 */
router.post('/chat', async (req, res) => {
  try {
    const userId = req.user.id;
    const { message, conversationHistory } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    console.log(`\n🚀 Portal AI Query from user ${userId}: "${message}"`);

    // Process with Portal AI
    const response = await portalAIService.processMessage(
      message,
      userId,
      conversationHistory || []
    );

    res.json({
      success: true,
      response: response.message,
      data: response.data,
      sources: response.sources,
      stats: response.stats,
    });
  } catch (error) {
    console.error('Error in Portal AI chat:', error);
    res.status(500).json({
      error: 'Failed to process message',
      message: error.message,
    });
  }
});

/**
 * Clear conversation history for current user
 */
router.delete('/conversation', async (req, res) => {
  try {
    const userId = req.user.id;

    console.log(`\n🗑️ Clearing conversation history for user ${userId}`);

    await portalAIService.clearConversation(userId);

    res.json({
      success: true,
      message: 'Conversation history cleared successfully',
    });
  } catch (error) {
    console.error('Error clearing conversation:', error);
    res.status(500).json({
      error: 'Failed to clear conversation',
      message: error.message,
    });
  }
});

/**
 * Get AI system status
 */
router.get('/status', async (req, res) => {
  try {
    const whatsappEnabled = whatsappAIService.isEnabled();
    const portalEnabled = portalAIService.isEnabled();

    // Get vector DB stats
    let vectorStats = null;
    try {
      await vectorDBService.initialize();
      vectorStats = await vectorDBService.getStats();
    } catch (error) {
      console.error('Error getting vector DB stats:', error);
    }

    res.json({
      whatsapp: {
        enabled: whatsappEnabled,
        model: process.env.WHATSAPP_AI_MODEL || 'gpt-4o-mini',
        temperature: parseFloat(process.env.WHATSAPP_AI_TEMPERATURE || '0.3'),
      },
      portal: {
        enabled: portalEnabled,
        model: process.env.PORTAL_AI_MODEL || 'gpt-4o',
        temperature: parseFloat(process.env.PORTAL_AI_TEMPERATURE || '0.7'),
      },
      vectorDatabase: vectorStats,
    });
  } catch (error) {
    console.error('Error getting AI status:', error);
    res.status(500).json({
      error: 'Failed to get AI status',
      message: error.message,
    });
  }
});

/**
 * Search documents in vector database
 */
router.post('/search', async (req, res) => {
  try {
    const { query, limit, minScore } = req.body;

    if (!query || !query.trim()) {
      return res.status(400).json({ error: 'Query is required' });
    }

    console.log(`\n🔍 Vector search: "${query}"`);

    const results = await vectorDBService.searchWithScore(
      query,
      limit || 5,
      minScore || 0.7
    );

    res.json({
      success: true,
      query,
      results,
      count: results.length,
    });
  } catch (error) {
    console.error('Error searching vector database:', error);
    res.status(500).json({
      error: 'Failed to search documents',
      message: error.message,
    });
  }
});

/**
 * Ingest documents into vector database
 */
router.post('/ingest', async (req, res) => {
  try {
    const userId = req.user.id;
    const { documents } = req.body;

    if (!documents || !Array.isArray(documents) || documents.length === 0) {
      return res.status(400).json({ error: 'Documents array is required' });
    }

    console.log(`\n📚 Ingesting ${documents.length} documents...`);

    // Validate document format
    for (const doc of documents) {
      if (!doc.content) {
        return res.status(400).json({ error: 'Each document must have content' });
      }
    }

    const result = await vectorDBService.addDocuments(documents);

    res.json({
      success: true,
      message: `Successfully ingested ${result.chunksAdded} document chunks`,
      chunksAdded: result.chunksAdded,
    });
  } catch (error) {
    console.error('Error ingesting documents:', error);
    res.status(500).json({
      error: 'Failed to ingest documents',
      message: error.message,
    });
  }
});

/**
 * Clear vector database (admin only)
 */
router.delete('/clear', async (req, res) => {
  try {
    const userId = req.user.id;

    // TODO: Add admin check here
    console.log(`\n🗑️ Clearing vector database...`);

    await vectorDBService.clearCollection();

    res.json({
      success: true,
      message: 'Vector database cleared successfully',
    });
  } catch (error) {
    console.error('Error clearing vector database:', error);
    res.status(500).json({
      error: 'Failed to clear vector database',
      message: error.message,
    });
  }
});

/**
 * Get vector database statistics
 */
router.get('/stats', async (req, res) => {
  try {
    await vectorDBService.initialize();
    const stats = await vectorDBService.getStats();

    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error('Error getting vector DB stats:', error);
    res.status(500).json({
      error: 'Failed to get statistics',
      message: error.message,
    });
  }
});

module.exports = router;
