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
const databaseTools = require('./databaseTools.service');

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
You have FULL DATABASE ACCESS through function calling tools:
1. ✅ query_leads - Query and filter leads
2. ✅ query_contacts - Query and filter contacts
3. ✅ query_deals - Query and filter deals/opportunities
4. ✅ query_tasks - Query and filter tasks
5. ✅ query_invoices - Query and filter invoices
6. ✅ query_calendar_events - Query calendar events
7. ✅ get_analytics - Get aggregated metrics (conversion rates, revenue, pipeline value, etc.)

**CURRENT USER:**
User ID: ${userId}
Access Level: Full (Internal User)

**DATABASE STATISTICS:**
${JSON.stringify(dbStats, null, 2)}

**HOW TO USE FUNCTIONS:**
When users ask about CRM data, you MUST use the appropriate function to query the database.

Examples:
❓ "Show me top 5 leads from last week"
✅ Call query_leads with: { dateFrom: "7 days ago", sortBy: "estimatedValue", sortOrder: "desc", limit: 5 }

❓ "What's the conversion rate this month?"
✅ Call get_analytics with: { metric: "conversion_rate", dateFrom: "start of month" }

❓ "List all pending tasks"
✅ Call query_tasks with: { status: "todo", limit: 50 }

❓ "Show deals in negotiation stage worth over $10,000"
✅ Call query_deals with: { stage: "negotiation", minValue: 10000 }

❓ "What's our total pipeline value?"
✅ Call get_analytics with: { metric: "pipeline_value" }

**RESPONSE GUIDELINES:**
1. ALWAYS use functions to fetch data - don't make up data
2. After getting function results, format them in a readable way with markdown
3. Provide insights and context about the data
4. If data is empty, explain possible reasons
5. For analytics, explain what the numbers mean
6. For large result sets, summarize key highlights

**IMPORTANT:**
- You MUST call functions to get actual data from the database
- Never fabricate data or statistics
- If a function returns an error, explain it to the user
- Respect data privacy in responses
- Always provide actionable insights along with data

Remember: Use your functions! You have direct database access - use it to provide accurate, real-time data.`;
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
   * Process chat message in Portal with function calling
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
      const relevantDocs = await vectorDBService.search(userMessage, 3);
      const docContext = relevantDocs.length > 0
        ? `\n\n**RELEVANT DOCUMENTATION:**\n${relevantDocs.map((doc, i) => `${i + 1}. ${doc.content.substring(0, 500)}...`).join('\n\n')}`
        : '';

      // Build messages array
      const messages = [
        new SystemMessage(this.getSystemPrompt(userId, dbStats) + docContext),
      ];

      // Add conversation history
      for (const msg of conversationHistory.slice(-10)) { // Keep last 10 messages
        if (msg.role === 'user') {
          messages.push(new HumanMessage(msg.content));
        } else if (msg.role === 'assistant') {
          messages.push(new AIMessage(msg.content));
        }
      }

      // Add current user message
      messages.push(new HumanMessage(userMessage));

      // Get available tools
      const tools = databaseTools.getTools();

      // Call OpenAI with function calling (up to 3 iterations)
      const maxIterations = 3;
      let iteration = 0;
      let finalResponse = null;
      let functionCallResults = [];

      while (iteration < maxIterations) {
        console.log(`\n🔄 Iteration ${iteration + 1}`);

        // Invoke LLM with tools
        const response = await this.llm.invoke(messages, {
          tools,
          tool_choice: iteration === 0 ? 'auto' : 'auto',
        });

        // Check if AI wants to call functions
        if (response.additional_kwargs?.tool_calls) {
          const toolCalls = response.additional_kwargs.tool_calls;
          console.log(`🔧 AI wants to call ${toolCalls.length} function(s)`);

          // Add assistant message with tool calls
          messages.push(new AIMessage({
            content: response.content || '',
            additional_kwargs: { tool_calls: toolCalls },
          }));

          // Execute each tool call
          for (const toolCall of toolCalls) {
            const functionName = toolCall.function.name;
            const functionArgs = JSON.parse(toolCall.function.arguments);

            console.log(`🔧 Calling: ${functionName}`, functionArgs);

            // Execute the function
            const result = await databaseTools.executeTool(functionName, functionArgs);
            functionCallResults.push({ function: functionName, result });

            // Add function result to messages
            messages.push({
              role: 'tool',
              content: JSON.stringify(result),
              tool_call_id: toolCall.id,
            });
          }

          iteration++;
        } else {
          // No more function calls, this is the final response
          finalResponse = response.content;
          break;
        }
      }

      // If we hit max iterations, get a final response
      if (!finalResponse) {
        const finalResponseObj = await this.llm.invoke(messages);
        finalResponse = finalResponseObj.content;
      }

      console.log('✅ Portal AI Response generated');

      return {
        message: finalResponse,
        data: functionCallResults,
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
