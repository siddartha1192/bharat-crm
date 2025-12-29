/**
 * WhatsApp AI Service - Limited, Structured Output
 * Only handles: Features, Appointments, Tasks, Leads
 * Returns structured JSON for easy action processing
 */

const { ChatOpenAI } = require('@langchain/openai');
const { HumanMessage, SystemMessage, AIMessage } = require('@langchain/core/messages');
const { PrismaClient } = require('@prisma/client');
const aiConfig = require('../../config/ai.config');
const vectorDBService = require('./vectorDB.service');

const prisma = new PrismaClient();

// Configuration for WhatsApp conversation memory
const WHATSAPP_MEMORY_CONFIG = {
  MAX_MESSAGES: 40, // Keep last 40 messages before summarizing
  MESSAGES_TO_KEEP: 25, // Keep most recent 25 messages after summarization
  SUMMARIZE_THRESHOLD: 30, // Summarize when messages exceed this count
};

class WhatsAppAIService {
  constructor() {
    this.llm = null;
    this.initialized = false;
  }

  /**
   * Initialize the WhatsApp AI
   */
  async initialize() {
    if (this.initialized || !aiConfig.enabled) {
      return;
    }

    try {
      console.log('🤖 Initializing WhatsApp AI Service...');

      this.llm = new ChatOpenAI({
        openAIApiKey: aiConfig.openaiApiKey,
        modelName: aiConfig.whatsappAI.model,
        temperature: aiConfig.whatsappAI.temperature,
        maxTokens: aiConfig.whatsappAI.maxTokens,
        modelKwargs: {
          response_format: { type: "json_object" }
        }
      });

      // Try to initialize vector DB for feature retrieval (optional)
      try {
        await vectorDBService.initialize();
        console.log('✅ Vector DB initialized for WhatsApp AI');
      } catch (error) {
        console.warn('⚠️ Vector DB initialization failed - WhatsApp AI will work without product knowledge context');
        console.warn('   Error:', error.message);
      }

      this.initialized = true;
      console.log('✅ WhatsApp AI Service initialized');
    } catch (error) {
      console.error('❌ Error initializing WhatsApp AI:', error);
      throw error;
    }
  }

  /**
   * Get system prompt for WhatsApp AI
   */
  getSystemPrompt() {
    return `You are an AI assistant for ${aiConfig.company.name} on WhatsApp.

**CRITICAL: YOU MUST ALWAYS RESPOND IN VALID JSON FORMAT. NEVER RESPOND IN PLAIN TEXT.**

**YOUR PRIMARY ROLE:**
1. Answer questions about OUR CRM/products/services/features using information provided in RELEVANT PRODUCT INFORMATION section
2. Book appointments/demos with our team
3. Create tasks for follow-ups
4. Capture lead information

**PRIORITY #1: ANSWERING PRODUCT QUESTIONS**
When RELEVANT PRODUCT INFORMATION section appears below:
- This contains knowledge about OUR products/services/features
- YOU MUST use this information to answer user questions
- ANY question about "our product", "your CRM", "features", "how it works", "what you offer" etc. should be answered using this information
- Be helpful, friendly, and informative when product information is available

**EXAMPLES OF PRODUCT QUESTIONS (always answer these if information is available):**
- "What features does your CRM have?"
- "How does the WhatsApp system work in your CRM?"
- "What can your product do?"
- "Tell me about your services"
- "How does X feature work?"
- "What integrations do you support?"

**ONLY REFUSE these types of questions:**
- General knowledge: "what is the capital of France", "how does blockchain work", "tell me a joke"
- Other companies: "how does Salesforce work" (unless comparing with our product)
- Personal advice: health, legal, financial advice
- Unrelated technical: "how to code in Python" (unless it's about our API/integrations)

**IF NO RELEVANT PRODUCT INFORMATION IS PROVIDED:**
Only then say: "I'm specifically designed to help with information about ${aiConfig.company.name}'s products and services, book appointments, and capture leads. I cannot answer general questions. How can I assist you with our products or services?"

**YOU CANNOT:**
- Access customer database
- Retrieve user data
- Modify existing records
- Query CRM data
- Answer questions outside our product/service scope

**OUTPUT FORMAT (MANDATORY):**
You MUST respond in valid JSON format with this exact structure:
{
  "message": "Your friendly message to the user (will be sent on WhatsApp)",
  "actions": [
    {
      "type": "create_appointment" | "create_task" | "create_lead" | "none",
      "data": {
        // Action-specific data
      },
      "confidence": 0.0-1.0
    }
  ],
  "metadata": {
    "intent": "question" | "appointment" | "task" | "lead" | "general",
    "sentiment": "positive" | "neutral" | "negative"
  }
}

**ACTION TYPES:**

1. **create_appointment**: When user wants to book a demo/meeting
   Required data: { name, email, date, time }
   Optional: { company, phone, notes }

2. **create_task**: When user needs follow-up or has a request
   Required data: { title, description }
   Optional: { priority, dueDate }

3. **create_lead**: When capturing a new potential customer
   Required data: { name, email }
   Optional: { phone, company, source, notes, priority, estimatedValue }

4. **none**: Just answering a question, no action needed

**RULES:**
- Keep messages concise and friendly (WhatsApp style)
- Use emojis sparingly (only when appropriate)
- ALWAYS ask for missing required information
- Only create ONE action per response
- Set confidence based on how certain you are about extracted data:
  * 1.0 = User explicitly provided all data
  * 0.7-0.9 = Inferred some information
  * <0.7 = Guessing, need confirmation

**TASK CREATION FLOW:**
User: "Can you create a task for me?"
You: {
  "message": "Sure! What's the task title and description?",
  "actions": [{"type": "none"}],
  "metadata": {"intent": "task", "sentiment": "positive"}
}

User: "Title: Social media automation. Description: LinkedIn and Facebook autoposting on tech. Priority: low. Due: Dec 19, 2025"
You: {
  "message": "Perfect! I've created your task 'Social media automation' with low priority, due on December 19, 2025. ✅",
  "actions": [{
    "type": "create_task",
    "data": {
      "title": "Social media automation",
      "description": "LinkedIn and Facebook autoposting on tech",
      "priority": "low",
      "dueDate": "2025-12-19"
    },
    "confidence": 1.0
  }],
  "metadata": {"intent": "task", "sentiment": "positive"}
}

**APPOINTMENT BOOKING FLOW:**
User: "I want a demo"
You: {
  "message": "Great! I'd love to schedule a demo. What's your name?",
  "actions": [{"type": "none"}],
  "metadata": {"intent": "appointment", "sentiment": "positive"}
}

User: "Raj Kumar, email raj@example.com, tomorrow at 3 PM"
You: {
  "message": "Perfect! I'm confirming your demo for tomorrow at 3 PM, Raj. You'll receive a calendar invite at raj@example.com shortly! 📅",
  "actions": [{
    "type": "create_appointment",
    "data": {
      "name": "Raj Kumar",
      "email": "raj@example.com",
      "date": "tomorrow",
      "time": "3 PM"
    },
    "confidence": 1.0
  }],
  "metadata": {"intent": "appointment", "sentiment": "positive"}
}

**LEAD CREATION FLOW:**
User: "I'm interested in your product"
You: {
  "message": "That's great! I'd love to help. What's your name and email?",
  "actions": [{"type": "none"}],
  "metadata": {"intent": "lead", "sentiment": "positive"}
}

User: "I'm Sarah Johnson, email sarah@techcorp.com, phone +1234567890, from TechCorp, this is urgent"
You: {
  "message": "Thanks Sarah! I've captured your details with urgent priority. Someone from our team will reach out to you shortly! 🎯",
  "actions": [{
    "type": "create_lead",
    "data": {
      "name": "Sarah Johnson",
      "email": "sarah@techcorp.com",
      "phone": "+1234567890",
      "company": "TechCorp",
      "priority": "urgent",
      "source": "WhatsApp",
      "notes": "Expressed interest in product via WhatsApp"
    },
    "confidence": 1.0
  }],
  "metadata": {"intent": "lead", "sentiment": "positive"}
}

**PRODUCT/FEATURES QUESTIONS:**
When asked about features or products:
1. Check the RELEVANT PRODUCT INFORMATION section below for answers
2. If information is found, provide a helpful, friendly answer based on that information
3. Keep answers concise but informative (2-4 sentences)
4. If the user asks for more details, provide them from the available information
5. If no relevant information is found, politely say you don't have that specific information

Example:
User: "What features does your CRM have?"
RELEVANT PRODUCT INFORMATION: "Our CRM includes contact management, pipeline tracking, email automation..."
You: {
  "message": "Our CRM offers powerful features including contact management, pipeline tracking, and email automation. Would you like to know more about any specific feature?",
  "actions": [{"type": "none"}],
  "metadata": {"intent": "question", "sentiment": "positive"}
}

**ERROR HANDLING (CRITICAL):**
If any action fails (appointment, task, lead creation), you MUST:
1. Inform the user that the action failed
2. Explain what went wrong (e.g., "I couldn't create the appointment because the date format was unclear")
3. Ask the user to provide the missing or corrected information
4. NEVER silently ignore errors - always notify the user

Example Error Flow:
User: "Book me for tomorrow"
AI tries to create appointment but fails due to missing year
You: {
  "message": "I tried to schedule your appointment, but I need more details. Could you please provide:\n• Your full name\n• Your email address\n• A complete date with year (e.g., December 20, 2025)\n• Preferred time",
  "actions": [{"type": "none"}],
  "metadata": {"intent": "appointment", "sentiment": "neutral"}
}

**DATE FORMAT REQUIREMENTS:**
For appointments, ALWAYS require complete dates:
- Acceptable: "December 20, 2025", "20/12/2025", "2025-12-20"
- If user says "tomorrow" or "next week", calculate the FULL date with year
- If date is ambiguous, ask for clarification with a specific format

**REMEMBER:**
1. ALWAYS output valid JSON - never plain text
2. ALWAYS include the "actions" array with at least one action
3. When you have all required data for a task/appointment/lead, CREATE IT immediately with the appropriate action type
4. If action fails, NEVER ignore it - ask user to re-enter correct information
5. CRITICAL: Never silently fail - always notify user of errors and request corrections
6. No additional text before or after the JSON`;
  }

  /**
   * Process WhatsApp message and return structured response
   * @param {string} conversationId - Conversation ID
   * @param {string} userMessage - User's message
   * @param {string} userId - User ID
   * @param {string} contactName - Name of the contact (optional)
   * @param {string} tenantId - Tenant ID for multi-tenant isolation (optional, will be fetched from conversation if not provided)
   * @returns {Object} Structured response { message, actions, metadata }
   */
  async processMessage(conversationId, userMessage, userId, contactName = null, tenantId = null) {
    await this.initialize();

    try {
      console.log('\n🤖 WhatsApp AI Processing...');
      console.log(`Query: "${userMessage}"`);

      // Get conversation history
      const conversation = await prisma.whatsAppConversation.findUnique({
        where: { id: conversationId },
        include: {
          messages: {
            orderBy: { createdAt: 'desc' },
            take: aiConfig.context.maxMessages,
          },
        },
      });

      // Use tenantId from parameter or fetch from conversation
      const effectiveTenantId = tenantId || conversation?.tenantId;

      // Search vector DB for relevant product information with tenant isolation
      let productContext = '';
      try {
        const relevantDocs = await vectorDBService.search(userMessage, 3, effectiveTenantId);
        if (relevantDocs.length > 0) {
          productContext = `\n\nRELEVANT PRODUCT INFORMATION:\n${relevantDocs.map(doc => doc.content).join('\n\n')}`;
          console.log(`📚 Found ${relevantDocs.length} relevant docs from vector DB`);
        }
      } catch (error) {
        console.warn('❌ Error searching vector database:', error.message);
        console.log('ℹ️  Continuing without product knowledge context');
        // Continue without product context - WhatsApp AI will still work
      }

      // Build message history
      const messages = [
        new SystemMessage(this.getSystemPrompt() + productContext),
      ];

      // Add conversation history (reversed to chronological order)
      const history = conversation?.messages?.reverse() || [];
      for (const msg of history) {
        if (msg.sender === 'contact') {
          messages.push(new HumanMessage(msg.message));
        } else if (msg.sender === 'ai' || msg.isAiGenerated) {
          messages.push(new AIMessage(msg.message));
        }
      }

      // Add current message
      messages.push(new HumanMessage(userMessage));

      // Get AI response
      const response = await this.llm.invoke(messages);
      let responseContent = response.content;

      console.log('🤖 Raw AI Response:', responseContent);

      // Parse JSON response
      let structuredResponse;
      try {
        // Extract JSON if wrapped in markdown code blocks
        const jsonMatch = responseContent.match(/```json\n?([\s\S]*?)\n?```/);
        if (jsonMatch) {
          responseContent = jsonMatch[1];
        }

        structuredResponse = JSON.parse(responseContent);
      } catch (parseError) {
        console.warn('⚠️ AI did not return valid JSON, wrapping response:', parseError.message);
        // Fallback: wrap in basic structure
        structuredResponse = {
          message: responseContent,
          actions: [{ type: 'none' }],
          metadata: { intent: 'general', sentiment: 'neutral' },
        };
      }

      // Validate and sanitize actions
      if (!structuredResponse.actions || !Array.isArray(structuredResponse.actions)) {
        structuredResponse.actions = [{ type: 'none' }];
      }

      // Filter allowed actions
      structuredResponse.actions = structuredResponse.actions.filter(action =>
        aiConfig.whatsappAI.allowedActions.includes(action.type) || action.type === 'none'
      );

      console.log('✅ Structured Response:', JSON.stringify(structuredResponse, null, 2));

      // Save messages to database and manage memory
      try {
        // Get conversation tenantId for saving messages
        const conv = await prisma.whatsAppConversation.findUnique({
          where: { id: conversationId },
          select: { tenantId: true }
        });

        await this.saveMessage(conversationId, 'contact', userMessage, contactName, conv.tenantId);
        await this.saveMessage(conversationId, 'ai', structuredResponse.message, 'AI Assistant', conv.tenantId);

        // Check if we need to summarize conversation
        const conversation = await prisma.whatsAppConversation.findUnique({
          where: { id: conversationId }
        });

        if (conversation && conversation.messageCount > WHATSAPP_MEMORY_CONFIG.SUMMARIZE_THRESHOLD) {
          console.log(`📊 WhatsApp message count (${conversation.messageCount}) exceeds threshold, triggering summarization...`);
          // Run summarization in background
          this.summarizeConversation(conversationId, userId).catch(err =>
            console.error('WhatsApp summarization failed:', err)
          );
        }
      } catch (saveError) {
        console.error('Error saving WhatsApp messages:', saveError);
        // Continue even if save fails
      }

      return structuredResponse;
    } catch (error) {
      console.error('❌ Error processing WhatsApp message:', error);
      throw error;
    }
  }

  /**
   * Save message to WhatsApp conversation
   * @param {string} conversationId - Conversation ID
   * @param {string} sender - 'contact' or 'ai'
   * @param {string} message - Message content
   * @param {string} senderName - Name of the sender
   * @param {string} tenantId - Tenant ID
   */
  async saveMessage(conversationId, sender, message, senderName, tenantId) {
    try {
      await prisma.whatsAppMessage.create({
        data: {
          conversationId,
          message,
          sender,
          senderName: senderName || (sender === 'ai' ? 'AI Assistant' : 'Contact'),
          isAiGenerated: sender === 'ai',
          tenantId,
        },
      });

      // Update conversation metadata
      await prisma.whatsAppConversation.update({
        where: { id: conversationId },
        data: {
          messageCount: { increment: 1 },
          lastMessageAt: new Date(),
          lastMessage: message,
        },
      });
    } catch (error) {
      console.error('Error saving WhatsApp message:', error);
      // Don't throw - conversation should continue
    }
  }

  /**
   * Summarize old WhatsApp messages to compress memory
   * @param {string} conversationId - Conversation ID
   * @param {string} userId - User ID
   */
  async summarizeConversation(conversationId, userId) {
    try {
      console.log('📝 Summarizing WhatsApp conversation to compress memory...');

      // Get all messages
      const messages = await prisma.whatsAppMessage.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'asc' },
      });

      if (messages.length <= WHATSAPP_MEMORY_CONFIG.SUMMARIZE_THRESHOLD) {
        return; // No need to summarize yet
      }

      // Messages to summarize (all except the most recent ones to keep)
      const messagesToSummarize = messages.slice(0, -WHATSAPP_MEMORY_CONFIG.MESSAGES_TO_KEEP);

      // Build conversation text for summarization
      const conversationText = messagesToSummarize
        .map(m => `${m.sender === 'contact' ? 'User' : 'AI Assistant'}: ${m.message}`)
        .join('\n\n');

      // Create summarization prompt
      const summaryPrompt = `Summarize the following WhatsApp conversation between a user and an AI assistant. Focus on:
1. Key questions asked by the user
2. Important information provided by the assistant
3. Any appointments, tasks, or leads created
4. Context that would be helpful for future conversations

Keep the summary concise (max 300 words) but preserve important details.

Conversation:
${conversationText}

Summary:`;

      // Create a separate LLM instance WITHOUT json_object response format for summarization
      const summaryLLM = new ChatOpenAI({
        openAIApiKey: aiConfig.openaiApiKey,
        modelName: aiConfig.whatsappAI.model,
        temperature: 0.3,
        maxTokens: 500,
        // No response_format here - we want plain text summary
      });

      // Get summary from LLM
      const summaryResponse = await summaryLLM.invoke([new HumanMessage(summaryPrompt)]);
      const summary = summaryResponse.content;

      console.log(`📊 Summarized ${messagesToSummarize.length} WhatsApp messages into summary`);

      // Update conversation with summary
      await prisma.whatsAppConversation.update({
        where: { id: conversationId },
        data: { summary },
      });

      // Delete old messages (keep only recent ones)
      const messageIdsToDelete = messagesToSummarize.map(m => m.id);
      await prisma.whatsAppMessage.deleteMany({
        where: {
          id: { in: messageIdsToDelete },
        },
      });

      console.log(`🗑️  Deleted ${messageIdsToDelete.length} old WhatsApp messages, kept ${WHATSAPP_MEMORY_CONFIG.MESSAGES_TO_KEEP} recent`);
    } catch (error) {
      console.error('Error summarizing WhatsApp conversation:', error);
      // Don't throw - continue without summarization
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
module.exports = new WhatsAppAIService();
