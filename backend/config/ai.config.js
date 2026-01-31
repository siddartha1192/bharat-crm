/**
 * Enterprise AI Configuration
 * All AI-related configuration loaded from environment variables
 * NOTE: Per-tenant OpenAI API keys should be configured in Settings for chat/completions
 * The OPENAI_API_KEY env var is used for system operations like embeddings
 */

module.exports = {
  // System-level OpenAI API key (used for embeddings in vector DB)
  // This is separate from per-tenant API keys used for chat completions
  openaiApiKey: process.env.OPENAI_API_KEY,

  // Company/Product Information
  company: {
    name: process.env.COMPANY_NAME || 'Bharat CRM',
    description: process.env.COMPANY_DESCRIPTION || 'Complete Business Management Solution for Indian Businesses',
    tagline: process.env.PRODUCT_TAGLINE || 'Centralize all customer interactions, sales processes, and business communications',
    ownerEmail: process.env.OWNER_EMAIL || 'siddartha1192@gmail.com',
  },

  // Vector Database Configuration
  vectorDB: {
    url: process.env.QDRANT_URL || ':memory:',
    apiKey: process.env.QDRANT_API_KEY,
    collectionName: process.env.VECTOR_COLLECTION_NAME || 'bharat_crm_knowledge',
    embeddingModel: process.env.EMBEDDING_MODEL || 'text-embedding-3-small',
  },

  // WhatsApp AI Configuration (Conversational + Structured Actions)
  whatsappAI: {
    model: process.env.WHATSAPP_AI_MODEL || 'gpt-4o-mini',
    temperature: parseFloat(process.env.WHATSAPP_AI_TEMPERATURE || '0.3'),
    maxTokens: 1000,
    allowedActions: (process.env.ALLOWED_WHATSAPP_ACTIONS || 'create_appointment,create_task,create_lead,get_features').split(','),
  },

  // Portal AI Configuration (Enterprise, Full Access)
  portalAI: {
    model: process.env.PORTAL_AI_MODEL || 'gpt-4o',
    temperature: parseFloat(process.env.PORTAL_AI_TEMPERATURE || '0.7'),
    maxTokens: parseInt(process.env.PORTAL_AI_MAX_TOKENS || '2000'),
  },

  // Context Configuration
  context: {
    maxMessages: parseInt(process.env.MAX_CONTEXT_MESSAGES || '15'),
  },

  // Knowledge Base
  knowledgeBase: {
    path: process.env.KNOWLEDGE_BASE_PATH || './knowledge_base',
  },

  // API Configuration
  api: {
    baseUrl: process.env.API_BASE_URL || 'http://localhost:3001/api',
  },
};
