/**
 * Portal AI Service - Enterprise Grade
 * Full database access, can query anything, RAG enabled
 * For internal use in the CRM portal
 */

const { ChatOpenAI } = require('@langchain/openai');
const { HumanMessage, SystemMessage, AIMessage } = require('@langchain/core/messages');
const aiConfig = require('../../config/ai.config');
const vectorDBService = require('./vectorDB.service');
const databaseTools = require('./databaseTools.service');

const prisma = require('../../lib/prisma');

// Configuration for conversation memory (increased limits for better context retention)
const MEMORY_CONFIG = {
  MAX_MESSAGES: 50, // Keep last 50 messages before summarizing (increased from 20)
  MESSAGES_TO_KEEP: 25, // Keep most recent 25 messages after summarization (increased from 10)
  SUMMARIZE_THRESHOLD: 40, // Summarize when messages exceed this count (increased from 15)
};

class PortalAIService {
  constructor() {
    this.vectorDBInitialized = false;
  }

  /**
   * Initialize Vector DB (one-time initialization)
   */
  async initializeVectorDB() {
    if (this.vectorDBInitialized) {
      return;
    }

    try {
      await vectorDBService.initialize();
      this.vectorDBInitialized = true;
      console.log('✅ Vector DB initialized for Portal AI');
    } catch (error) {
      console.warn('⚠️ Vector DB initialization failed');
      console.warn('   Error:', error.message);
    }
  }

  /**
   * Create LLM instance with tenant-specific API key
   * @param {Object} tenantConfig - Tenant-specific OpenAI configuration
   * @returns {ChatOpenAI} - LLM instance
   */
  createLLM(tenantConfig) {
    if (!tenantConfig || !tenantConfig.apiKey) {
      throw new Error('OpenAI API not configured for this tenant. Please configure OpenAI API settings in Settings.');
    }

    return new ChatOpenAI({
      openAIApiKey: tenantConfig.apiKey,
      modelName: tenantConfig.model || aiConfig.portalAI.model,
      temperature: tenantConfig.temperature !== undefined ? tenantConfig.temperature : aiConfig.portalAI.temperature,
      maxTokens: aiConfig.portalAI.maxTokens,
    });
  }

  /**
   * Get system prompt for Portal AI
   * @param {string} userId - User ID
   * @param {Object} dbStats - Database statistics
   * @param {Array} pipelineStages - Pipeline stages
   * @param {Object} tenantConfig - Tenant-specific OpenAI configuration
   */
  getSystemPrompt(userId, dbStats = {}, pipelineStages = [], tenantConfig = null) {
    const now = new Date();
    const currentDate = now.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const currentDateTime = now.toISOString();

    // Format pipeline stages for the prompt
    const stagesDescription = pipelineStages.length > 0
      ? `\n**AVAILABLE PIPELINE STAGES:**\nThe user has the following pipeline stages configured:\n${pipelineStages.map(s => `- ${s.name} (slug: "${s.slug}")${s.isDefault ? ' [DEFAULT]' : ' [CUSTOM]'}`).join('\n')}\n\nWhen querying deals by stage, use the exact slug values listed above.`
      : '';

    const companyName = tenantConfig?.companyName || aiConfig.company.name;
    console.log(`🏢 Portal AI - Company Name: "${companyName}" (from ${tenantConfig?.companyName ? 'tenant config' : 'default config'})`);
    console.log(`   Full tenantConfig:`, JSON.stringify(tenantConfig, null, 2));
    return `You are an enterprise-grade AI assistant for ${companyName} CRM Portal.

**CURRENT DATE AND TIME:**
Today is ${currentDate}
Current ISO DateTime: ${currentDateTime}
IMPORTANT: Use this date for all "today", "this month", "this week" queries!

**YOUR CAPABILITIES:**
You have FULL DATABASE ACCESS through function calling tools:
1. ✅ query_leads - Query and filter leads
2. ✅ query_contacts - Query and filter contacts
3. ✅ query_deals - Query and filter deals/opportunities
4. ✅ query_tasks - Query and filter tasks
5. ✅ query_invoices - Query and filter invoices
6. ✅ query_calendar_events - Query calendar events
7. ✅ query_whatsapp_conversations - Query WhatsApp conversations for marketing insights
8. ✅ get_analytics - Get aggregated metrics (conversion rates, revenue, pipeline value, etc.)
9. ✅ web_search - Search the web using DuckDuckGo for external information and current events

**CURRENT USER:**
User ID: ${userId}
Access Level: Full (Internal User)

**DATABASE STATISTICS:**
${JSON.stringify(dbStats, null, 2)}
${stagesDescription}

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

❓ "What meetings do I have today?"
✅ Call query_calendar_events with: { startDate: "today", limit: 20 }

❓ "Show me WhatsApp conversations from this week"
✅ Call query_whatsapp_conversations with: { dateFrom: "start of week", limit: 20 }

❓ "List recent WhatsApp chats with unread messages"
✅ Call query_whatsapp_conversations with: { hasUnread: true, sortBy: "lastMessageAt", limit: 15 }

**RESPONSE GUIDELINES:**
1. ALWAYS use functions to fetch data - don't make up data
2. **CRITICAL: Format all data as markdown tables for better visual appeal**
   - Use GitHub Flavored Markdown table syntax
   - Include column headers with clear labels
   - Align data in columns properly
   - Example format:
     | Name | Email | Status | Value |
     |------|-------|--------|-------|
     | John | john@example.com | New | $5,000 |
3. After tables, provide insights and context about the data
4. If data is empty, explain possible reasons
5. For analytics, present metrics in a summary table when possible
6. For large result sets, show tables with key highlights
7. When asked about "today" or current date, use the date provided above

**KNOWLEDGE BASE & WEB SEARCH:**
- If **RELEVANT DOCUMENTATION** section appears below, it contains information from uploaded knowledge base files
- **PRIORITIZE** information from RELEVANT DOCUMENTATION when answering questions about products, features, or company information
- For current events, news, or external information not in the CRM database, use the web_search function
- Always cite sources when using documentation or web search results

**CSV/EXCEL DATA HANDLING:**
- When answering questions about uploaded CSV/Excel files, the RELEVANT DOCUMENTATION section will contain matching rows
- **CRITICAL**: Present ALL rows from RELEVANT DOCUMENTATION, not just a sample
- If the user asks to "filter", "find", or "show" data from uploaded files, you MUST include all matching rows from the documentation
- Each row is preserved intact (not chunked), so you'll see complete records
- Always mention how many total rows were found (e.g., "Found 15 matching records")

**IMPORTANT:**
- You MUST call functions to get actual data from the database
- Never fabricate data or statistics
- If a function returns an error, explain it to the user
- Respect data privacy in responses
- Always provide actionable insights along with data
- ALWAYS use the current date provided at the top for date calculations
- When RELEVANT DOCUMENTATION is provided, use it as the primary source of truth for that topic
- For CSV/Excel queries, present data in well-formatted markdown tables

Remember: Use your functions! You have direct database access - use it to provide accurate, real-time data.`;
  }

  /**
   * Get minimal system prompt (with limited database query capabilities)
   * @param {string} userId - User ID
   * @param {Object} dbStats - Database statistics
   * @param {Array} pipelineStages - Pipeline stages
   * @param {Object} tenantConfig - Tenant-specific OpenAI configuration
   */
  getMinimalSystemPrompt(userId, dbStats = {}, pipelineStages = [], tenantConfig = null) {
    const now = new Date();
    const currentDate = now.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const currentDateTime = now.toISOString();

    const companyName = tenantConfig?.companyName || aiConfig.company.name;

    // Format pipeline stages for the prompt
    const stagesDescription = pipelineStages.length > 0
      ? `\n**AVAILABLE PIPELINE STAGES:**\nThe user has the following pipeline stages configured:\n${pipelineStages.map(s => `- ${s.name} (slug: "${s.slug}")${s.isDefault ? ' [DEFAULT]' : ' [CUSTOM]'}`).join('\n')}\n\nWhen querying deals by stage, use the exact slug values listed above.`
      : '';

    return `You are an AI assistant for ${companyName} CRM Portal in **Minimal Mode** (optimized for fewer AI credits).

**CURRENT DATE AND TIME:**
Today is ${currentDate}
Current ISO DateTime: ${currentDateTime}
IMPORTANT: Use this date for all "today", "this month", "this week" queries!

**YOUR CAPABILITIES (MINIMAL MODE):**
In this mode, you have CRM database query access with optimized credit usage:
- ✅ Query leads, contacts, deals, and tasks from the database
- ✅ Get analytics (conversion rates, pipeline value)
- ✅ Query calendar events and invoices
- ✅ Query WhatsApp conversations
- ✅ Answer questions using the knowledge base documentation
- ✅ Provide general guidance and explanations about CRM features
- ❌ Web search disabled (use Full AI mode for external information)

**AVAILABLE TOOLS:**
1. ✅ query_leads - Query and filter leads
2. ✅ query_contacts - Query and filter contacts
3. ✅ query_deals - Query and filter deals/opportunities
4. ✅ query_tasks - Query and filter tasks
5. ✅ query_invoices - Query and filter invoices
6. ✅ query_calendar_events - Query calendar events
7. ✅ query_whatsapp_conversations - Query WhatsApp conversations
8. ✅ get_analytics - Get aggregated metrics (conversion rates, revenue, pipeline value)

**CURRENT USER:**
User ID: ${userId}
Access Level: Full (Internal User)

**DATABASE STATISTICS:**
${JSON.stringify(dbStats, null, 2)}
${stagesDescription}

**HOW TO USE FUNCTIONS:**
When users ask about CRM data, you MUST use the appropriate function to query the database.

Examples:
❓ "Show me top 5 leads from last week"
✅ Call query_leads with: { dateFrom: "7 days ago", sortBy: "estimatedValue", sortOrder: "desc", limit: 5 }

❓ "What's the conversion rate this month?"
✅ Call get_analytics with: { metric: "conversion_rate", dateFrom: "start of month" }

❓ "List all pending tasks"
✅ Call query_tasks with: { status: "todo", limit: 50 }

❓ "Show deals worth over $10,000"
✅ Call query_deals with: { minValue: 10000 }

**RESPONSE GUIDELINES:**
1. ALWAYS use functions to fetch data - don't make up data
2. **CRITICAL: Format all data as markdown tables for better visual appeal**
3. After tables, provide insights and context about the data
4. If data is empty, explain possible reasons
5. For analytics, present metrics in a summary format
6. When asked about "today" or current date, use the date provided above

**KNOWLEDGE BASE:**
- If **RELEVANT DOCUMENTATION** section appears below, it contains information from uploaded knowledge base files
- **PRIORITIZE** information from RELEVANT DOCUMENTATION when answering questions about products, features, or company information
- Always cite sources when using documentation

**CSV/EXCEL DATA HANDLING:**
- When answering questions about uploaded CSV/Excel files, the RELEVANT DOCUMENTATION section will contain matching rows
- **CRITICAL**: Present ALL rows from RELEVANT DOCUMENTATION, not just a sample
- If the user asks to "filter", "find", or "show" data from uploaded files, you MUST include all matching rows from the documentation
- Each row is preserved intact (not chunked), so you'll see complete records
- Always mention how many total rows were found (e.g., "Found 15 matching records")
- Present CSV/Excel data in well-formatted markdown tables

**MINIMAL MODE OPTIMIZATIONS:**
- Limited to fewer iterations for faster responses
- No web search (reduces credit usage)
- Focuses on CRM data and knowledge base queries
- For current events or external info, suggest Full AI mode

Remember: Use your functions to query the CRM database for accurate, real-time data!`;
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
        whatsappConversationsCount,
      ] = await Promise.all([
        prisma.lead.count(),
        prisma.contact.count(),
        prisma.deal.count(),
        prisma.task.count(),
        prisma.calendarEvent.count(),
        prisma.invoice.count(),
        prisma.whatsAppConversation.count(),
      ]);

      return {
        leads: leadsCount,
        contacts: contactsCount,
        deals: dealsCount,
        tasks: tasksCount,
        calendarEvents: eventsCount,
        invoices: invoicesCount,
        whatsappConversations: whatsappConversationsCount,
      };
    } catch (error) {
      console.error('Error getting database stats:', error);
      return {};
    }
  }

  /**
   * Get or create user's AI conversation
   * @param {string} userId - User ID
   * @param {string} tenantId - Tenant ID
   * @returns {Object} AI conversation with messages
   */
  async getOrCreateConversation(userId, tenantId) {
    try {
      // Try to find existing conversation
      let conversation = await prisma.aIConversation.findFirst({
        where: { userId },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
            take: MEMORY_CONFIG.MAX_MESSAGES,
          },
        },
      });

      // Create new conversation if doesn't exist
      if (!conversation) {
        conversation = await prisma.aIConversation.create({
          data: {
            userId,
            tenantId,
            messageCount: 0,
          },
          include: {
            messages: true,
          },
        });
        console.log(`📝 Created new AI conversation for user ${userId}`);
      }

      return conversation;
    } catch (error) {
      console.error('Error getting/creating conversation:', error);
      throw error;
    }
  }

  /**
   * Get conversation history for frontend
   * @param {string} userId - User ID
   * @param {string} tenantId - Tenant ID
   * @returns {Object} Conversation with messages formatted for frontend
   */
  async getConversationHistory(userId, tenantId) {
    try {
      const conversation = await this.getOrCreateConversation(userId, tenantId);

      // Format messages for frontend
      const messages = conversation.messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.createdAt,
        // functionCalls is already a JavaScript object (JSONB type), no need to parse
        data: msg.functionCalls || null,
      }));

      return {
        id: conversation.id,
        messageCount: conversation.messageCount,
        summary: conversation.summary,
        messages,
      };
    } catch (error) {
      console.error('Error getting conversation history:', error);
      throw error;
    }
  }

  /**
   * Save message to conversation
   * @param {string} conversationId - Conversation ID
   * @param {string} role - 'user' or 'assistant'
   * @param {string} content - Message content
   * @param {string} tenantId - Tenant ID for multi-tenant isolation
   * @param {Array} functionCalls - Optional function calls made
   */
  async saveMessage(conversationId, role, content, tenantId, functionCalls = null) {
    try {
      await prisma.aIMessage.create({
        data: {
          conversationId,
          role,
          content,
          tenantId,
          // Prisma handles JSONB fields automatically, no need for JSON operations
          functionCalls: functionCalls || null,
        },
      });

      // Update conversation metadata
      await prisma.aIConversation.update({
        where: { id: conversationId },
        data: {
          messageCount: { increment: 1 },
          lastMessageAt: new Date(),
        },
      });
    } catch (error) {
      console.error('Error saving message:', error);
      // Don't throw - conversation should continue even if save fails
    }
  }

  /**
   * Summarize old messages to compress conversation memory
   * @param {string} conversationId - Conversation ID
   * @param {string} userId - User ID
   * @param {Object} tenantConfig - Tenant-specific OpenAI configuration
   */
  async summarizeConversation(conversationId, userId, tenantConfig) {
    try {
      console.log('📝 Summarizing conversation to compress memory...');

      // Get all messages
      const messages = await prisma.aIMessage.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'asc' },
      });

      if (messages.length <= MEMORY_CONFIG.SUMMARIZE_THRESHOLD) {
        return; // No need to summarize yet
      }

      // Messages to summarize (all except the most recent ones to keep)
      const messagesToSummarize = messages.slice(0, -MEMORY_CONFIG.MESSAGES_TO_KEEP);

      // Build conversation text for summarization
      const conversationText = messagesToSummarize
        .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
        .join('\n\n');

      // Create summarization prompt
      const summaryPrompt = `Summarize the following conversation between a user and an AI assistant. Focus on:
1. Key questions asked by the user
2. Important information provided by the assistant
3. Any data queries or analyses performed
4. Context that would be helpful for future conversations

Keep the summary concise (max 500 words) but preserve important details.

Conversation:
${conversationText}

Summary:`;

      // Create LLM for summarization
      const summaryLLM = this.createLLM(tenantConfig);

      // Get summary from LLM
      const summaryResponse = await summaryLLM.invoke([new HumanMessage(summaryPrompt)]);
      const summary = summaryResponse.content;

      console.log(`📊 Summarized ${messagesToSummarize.length} messages into summary`);

      // Update conversation with summary
      await prisma.aIConversation.update({
        where: { id: conversationId },
        data: { summary },
      });

      // Delete old messages (keep only recent ones)
      const messageIdsToDelete = messagesToSummarize.map(m => m.id);
      await prisma.aIMessage.deleteMany({
        where: {
          id: { in: messageIdsToDelete },
        },
      });

      console.log(`🗑️  Deleted ${messageIdsToDelete.length} old messages, kept ${MEMORY_CONFIG.MESSAGES_TO_KEEP} recent`);
    } catch (error) {
      console.error('Error summarizing conversation:', error);
      // Don't throw - continue without summarization
    }
  }

  /**
   * Build conversation history from database
   * @param {Object} conversation - Conversation object with messages
   * @returns {Array} Array of message objects for LLM
   */
  buildConversationHistory(conversation) {
    const history = [];

    // Add summary as context if it exists
    if (conversation.summary) {
      history.push({
        role: 'system',
        content: `Previous conversation summary:\n${conversation.summary}`,
      });
    }

    // Add recent messages
    for (const msg of conversation.messages) {
      history.push({
        role: msg.role,
        content: msg.content,
      });
    }

    return history;
  }

  /**
   * Process chat message in Portal with function calling and persistent memory
   * @param {string} userMessage - User's message
   * @param {string} userId - User ID
   * @param {string} tenantId - Tenant ID
   * @param {Object} tenantConfig - Tenant-specific OpenAI configuration (REQUIRED)
   * @param {Array} conversationHistory - Deprecated: Previous messages (now loaded from DB)
   * @param {string} aiMode - AI mode: 'full' (with function calling) or 'minimal' (single pass, fewer credits)
   * @returns {Object} AI response with optional data
   */
  async processMessage(userMessage, userId, tenantId, tenantConfig = null, conversationHistory = [], aiMode = 'full') {
    // Initialize Vector DB (one-time)
    await this.initializeVectorDB();

    // Create tenant-specific LLM
    const llm = this.createLLM(tenantConfig);

    try {
      console.log('\n🚀 Portal AI Processing...');
      console.log(`User: ${userId}`);
      console.log(`Query: "${userMessage}"`);
      console.log(`🎚️  AI Mode: ${aiMode.toUpperCase()} ${aiMode === 'minimal' ? '(Optimized - database queries enabled, no web search)' : '(Full capabilities - all tools enabled)'}`);

      // Get or create conversation with persistent memory
      const conversation = await this.getOrCreateConversation(userId, tenantId);
      console.log(`💬 Loaded conversation ${conversation.id} (${conversation.messageCount} total messages)`);

      // Get database stats for context
      const dbStats = await this.getDatabaseStats();

      // Get user's pipeline stages (both default and custom)
      const pipelineStages = await databaseTools.getPipelineStages(userId);
      console.log(`📊 Found ${pipelineStages.length} pipeline stages for user`);

      // Search vector DB for relevant documentation with error handling and tenant isolation
      // Use intelligent retrieval: more results for CSV/Excel queries, with adaptive score filtering
      let relevantDocs = [];
      try {
        // Detect if query is likely about CSV/Excel data
        const isDataQuery = /\b(csv|excel|spreadsheet|rows?|data|table|filter|find|show|list)\b/i.test(userMessage);

        // Adaptive parameters based on query type
        // Data queries: Higher k (30), lower minScore (0.45) for better recall on tabular data
        // General queries: Moderate k (10), higher minScore (0.60) for better precision
        const k = 35 //isDataQuery ? 30 : 10;
        const minScore = 0.4//isDataQuery ? 0.45 : 0.60;

        console.log(`🔍 Vector search: k=${k}, minScore=${minScore}, isDataQuery=${isDataQuery}`);

        // Pass tenant config (with API key) to vectorDB service
        relevantDocs = await vectorDBService.searchWithScore(
          userMessage,
          k,
          minScore,
          tenantId,
          tenantConfig, // Pass tenant config with API key
          // Optional: Add filters if query mentions specific file types
          isDataQuery ? { excludeFullFile: false } : {}
        );

        console.log(`📄 Found ${relevantDocs.length} relevant documents (score >= ${minScore})`);
      } catch (error) {
        console.warn('⚠️  Vector DB search failed (continuing without context):', error.message);
        // Continue without vector search results - don't fail the entire request
      }

      const docContext = relevantDocs.length > 0
        ? `\n\n**RELEVANT DOCUMENTATION:**\n${relevantDocs.map((doc, i) => {
            const preview = doc.content.substring(0, 800); // Increased from 500 for more context
            const scoreInfo = doc.score ? ` (relevance: ${(doc.score * 100).toFixed(1)}%)` : '';
            return `${i + 1}. ${preview}...${scoreInfo}`;
          }).join('\n\n')}`
        : '';

      // Build messages array with appropriate system prompt based on AI mode
      let systemPrompt = this.getSystemPrompt(userId, dbStats, pipelineStages, tenantConfig);

      // Modify system prompt for minimal mode
      if (aiMode === 'minimal') {
        systemPrompt = this.getMinimalSystemPrompt(userId, dbStats, pipelineStages, tenantConfig);
      }

      const messages = [
        new SystemMessage(systemPrompt + docContext),
      ];

      // Add conversation history from database (includes summary if available)
      const history = this.buildConversationHistory(conversation);
      for (const msg of history) {
        if (msg.role === 'system') {
          messages.push(new SystemMessage(msg.content));
        } else if (msg.role === 'user') {
          messages.push(new HumanMessage(msg.content));
        } else if (msg.role === 'assistant') {
          messages.push(new AIMessage(msg.content));
        }
      }

      // Add current user message
      messages.push(new HumanMessage(userMessage));

      // Get available tools based on AI mode
      let tools = databaseTools.getTools();
      let maxIterations = 3;

      // MINIMAL MODE: Limited function calling (database queries only, no web search)
      if (aiMode === 'minimal') {
        console.log('⚡ Using MINIMAL mode - database queries enabled, web search disabled, 2 iterations max');

        // Filter out web_search tool to save credits
        tools = tools.filter(tool => tool.function.name !== 'web_search');
        maxIterations = 2; // Limit to 2 iterations instead of 3

        console.log(`   Available tools: ${tools.map(t => t.function.name).join(', ')}`);
      } else {
        // FULL MODE: All tools enabled (up to 3 iterations)
        console.log('🚀 Using FULL mode - all tools enabled (up to 3 iterations)');
      }

      // Call OpenAI with function calling (iterations based on mode)
      let iteration = 0;
      let finalResponse = null;
      let functionCallResults = [];

      while (iteration < maxIterations) {
        console.log(`\n🔄 Iteration ${iteration + 1}`);

        // Invoke LLM with tools
        const response = await llm.invoke(messages, {
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

            // Execute the function with userId for data isolation
            const result = await databaseTools.executeTool(functionName, functionArgs, userId);
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
        const finalResponseObj = await llm.invoke(messages);
        finalResponse = finalResponseObj.content;
      }

      console.log('✅ Portal AI Response generated');

      // Save user message and assistant response to database
      await this.saveMessage(conversation.id, 'user', userMessage, tenantId);
      await this.saveMessage(
        conversation.id,
        'assistant',
        finalResponse,
        tenantId,
        functionCallResults.length > 0 ? functionCallResults : null
      );

      // Check if we need to summarize conversation
      const currentMessageCount = conversation.messageCount + 2; // +2 for user message and assistant response
      if (currentMessageCount > MEMORY_CONFIG.SUMMARIZE_THRESHOLD) {
        console.log(`📊 Message count (${currentMessageCount}) exceeds threshold, triggering summarization...`);
        // Run summarization in background (don't wait for it)
        this.summarizeConversation(conversation.id, userId, tenantConfig).catch(err =>
          console.error('Summarization failed:', err)
        );
      }

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
   * Clear conversation history for a user
   * @param {string} userId - User ID
   */
  async clearConversation(userId) {
    try {
      const conversation = await prisma.aIConversation.findFirst({
        where: { userId },
      });

      if (conversation) {
        // Delete all messages
        await prisma.aIMessage.deleteMany({
          where: { conversationId: conversation.id },
        });

        // Reset conversation
        await prisma.aIConversation.update({
          where: { id: conversation.id },
          data: {
            summary: null,
            messageCount: 0,
            lastMessageAt: new Date(),
          },
        });

        console.log(`🗑️  Cleared conversation for user ${userId}`);
      }
    } catch (error) {
      console.error('Error clearing conversation:', error);
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
