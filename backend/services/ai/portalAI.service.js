/**
 * Portal AI Service - Enterprise Grade
 * Full database access, can query anything, RAG enabled
 * For internal use in the CRM portal
 */

const { ChatOpenAI } = require('@langchain/openai');
const { HumanMessage, SystemMessage, AIMessage } = require('@langchain/core/messages');
const { PrismaClient } = require('@prisma/client');
const aiConfig = require('../../config/ai.config');
const vectorDBService = require('./vectorDB.service');

const prisma = new PrismaClient();

class PortalAIService {
  constructor() {
    this.llm = null;
    this.initialized = false;
  }

  /**
   * Initialize the Portal AI
   */
  async initialize() {
    if (this.initialized || !aiConfig.enabled) {
      return;
    }

    try {
      console.log('🚀 Initializing Portal AI Service (Enterprise)...');

      this.llm = new ChatOpenAI({
        openAIApiKey: aiConfig.openaiApiKey,
        modelName: aiConfig.portalAI.model,
        temperature: aiConfig.portalAI.temperature,
        maxTokens: aiConfig.portalAI.maxTokens,
      });

      // Initialize vector DB
      await vectorDBService.initialize();

      this.initialized = true;
      console.log('✅ Portal AI Service initialized');
    } catch (error) {
      console.error('❌ Error initializing Portal AI:', error);
      throw error;
    }
  }

  /**
   * Get system prompt for Portal AI
   */
  getSystemPrompt(userId, dbStats = {}) {
    return `You are an enterprise-grade AI assistant for ${aiConfig.company.name} CRM Portal.

**YOUR CAPABILITIES:**
You have FULL ACCESS to:
1. ✅ Complete CRM database (leads, contacts, deals, tasks, calendar, invoices, etc.)
2. ✅ All product documentation and API docs
3. ✅ User activity logs and analytics
4. ✅ Email threads and WhatsApp conversations
5. ✅ Business intelligence and reporting

**CURRENT USER:**
User ID: ${userId}
Access Level: Full (Internal User)

**DATABASE STATISTICS:**
${JSON.stringify(dbStats, null, 2)}

**YOUR ROLE:**
- Answer ANY question about the CRM data
- Provide insights and analytics
- Help with complex queries
- Explain features and API usage
- Generate reports and summaries
- Suggest optimizations and improvements

**RESPONSE GUIDELINES:**
1. Be comprehensive and detailed (you have more token budget than WhatsApp AI)
2. Use markdown formatting for better readability
3. Include relevant data and statistics
4. Provide actionable insights
5. If you need more context, ask specific questions
6. For data queries, explain what data you found and what it means

**AVAILABLE DATA MODELS:**
- Lead: Sales leads with pipeline stages
- Contact: Customer contacts with full details
- Deal: Sales opportunities with values
- Task: To-do items with assignments
- CalendarEvent: Scheduled appointments
- Invoice: Generated invoices with line items
- WhatsAppConversation: WhatsApp chat history
- WhatsAppMessage: Individual messages
- EmailLog: Email communications
- User: CRM users and their roles
- Department & Team: Organizational structure

**QUERY EXAMPLES:**
❓ "Show me top 5 leads from last week"
✅ I'll query the Lead model, filter by createdAt in the last 7 days, order by value, and return top 5 with details.

❓ "What's the conversion rate this month?"
✅ I'll calculate: (Deals won this month / Total leads this month) * 100 and show you the breakdown.

❓ "How do I use the WhatsApp API?"
✅ I'll search the documentation and provide a detailed guide with code examples.

**IMPORTANT:**
- You can see ALL data but respect user privacy in responses
- For sensitive queries, remind about data privacy
- If you're uncertain about data, say so
- Provide sources when referencing documentation

Remember: You're the most powerful AI assistant in this CRM. Use your full capabilities!`;
  }

  /**
   * Get database statistics for context
   */
  async getDatabaseStats() {
    try {
      const [
        leadsCount,
        contactsCount,
        dealsCount,
        tasksCount,
        eventsCount,
        invoicesCount,
      ] = await Promise.all([
        prisma.lead.count(),
        prisma.contact.count(),
        prisma.deal.count(),
        prisma.task.count(),
        prisma.calendarEvent.count(),
        prisma.invoice.count(),
      ]);

      return {
        leads: leadsCount,
        contacts: contactsCount,
        deals: dealsCount,
        tasks: tasksCount,
        calendarEvents: eventsCount,
        invoices: invoicesCount,
      };
    } catch (error) {
      console.error('Error getting database stats:', error);
      return {};
    }
  }

  /**
   * Query CRM database based on natural language
   * @param {string} query - Natural language query
   * @param {string} userId - User making the query
   * @returns {Object} Query results with explanation
   */
  async queryDatabase(query, userId) {
    try {
      console.log(`🔍 Database Query: "${query}"`);

      // Determine intent and extract parameters
      const intentResponse = await this.llm.invoke([
        new SystemMessage(`Analyze this CRM database query and extract:
1. Entity type (Lead, Contact, Deal, Task, CalendarEvent, Invoice, etc.)
2. Filters needed (date range, status, value, etc.)
3. Sort order
4. Limit

Return as JSON: { entity, filters, sort, limit }

Query: "${query}"`),
      ]);

      const intent = JSON.parse(intentResponse.content);
      console.log('📊 Query intent:', intent);

      // Execute Prisma query based on intent
      let results = [];
      const modelName = intent.entity.toLowerCase();

      if (prisma[modelName]) {
        const where = this.buildWhereClause(intent.filters);
        const orderBy = this.buildOrderBy(intent.sort);

        results = await prisma[modelName].findMany({
          where,
          orderBy,
          take: intent.limit || 10,
        });
      }

      return {
        success: true,
        count: results.length,
        data: results,
        query: intent,
      };
    } catch (error) {
      console.error('Error querying database:', error);
      return {
        success: false,
        error: error.message,
        data: [],
      };
    }
  }

  /**
   * Build Prisma where clause from filters
   */
  buildWhereClause(filters) {
    const where = {};

    if (!filters) return where;

    for (const [key, value] of Object.entries(filters)) {
      if (key === 'dateRange') {
        where.createdAt = {
          gte: new Date(value.start),
          lte: new Date(value.end),
        };
      } else if (typeof value === 'string') {
        where[key] = { contains: value, mode: 'insensitive' };
      } else {
        where[key] = value;
      }
    }

    return where;
  }

  /**
   * Build Prisma orderBy from sort specification
   */
  buildOrderBy(sort) {
    if (!sort) return { createdAt: 'desc' };

    const [field, direction] = sort.split(':');
    return { [field]: direction || 'desc' };
  }

  /**
   * Process chat message in Portal
   * @param {string} userMessage - User's message
   * @param {string} userId - User ID
   * @param {Array} conversationHistory - Previous messages
   * @returns {Object} AI response with optional data
   */
  async processMessage(userMessage, userId, conversationHistory = []) {
    await this.initialize();

    try {
      console.log('\n🚀 Portal AI Processing...');
      console.log(`User: ${userId}`);
      console.log(`Query: "${userMessage}"`);

      // Get database stats for context
      const dbStats = await this.getDatabaseStats();

      // Search vector DB for relevant documentation
      const relevantDocs = await vectorDBService.search(userMessage, 5);
      const docContext = relevantDocs.length > 0
        ? `\n\n**RELEVANT DOCUMENTATION:**\n${relevantDocs.map((doc, i) => `${i + 1}. ${doc.content}`).join('\n\n')}`
        : '';

      // Check if this is a data query
      let dataResults = null;
      const isDataQuery = /show|list|get|find|count|search|how many/i.test(userMessage);

      if (isDataQuery) {
        dataResults = await this.queryDatabase(userMessage, userId);
      }

      // Build messages
      const messages = [
        new SystemMessage(this.getSystemPrompt(userId, dbStats) + docContext),
      ];

      // Add conversation history
      for (const msg of conversationHistory) {
        if (msg.role === 'user') {
          messages.push(new HumanMessage(msg.content));
        } else {
          messages.push(new AIMessage(msg.content));
        }
      }

      // Add current message with data context
      let messageWithContext = userMessage;
      if (dataResults && dataResults.success) {
        messageWithContext += `\n\n**DATABASE QUERY RESULTS:**\n${JSON.stringify(dataResults, null, 2)}`;
      }

      messages.push(new HumanMessage(messageWithContext));

      // Get AI response
      const response = await this.llm.invoke(messages);

      console.log('✅ Portal AI Response generated');

      return {
        message: response.content,
        data: dataResults,
        sources: relevantDocs.map(doc => doc.metadata),
        stats: dbStats,
      };
    } catch (error) {
      console.error('❌ Error processing Portal message:', error);
      throw error;
    }
  }

  /**
   * Check if service is enabled
   */
  isEnabled() {
    return aiConfig.enabled;
  }
}

// Export singleton instance
module.exports = new PortalAIService();
