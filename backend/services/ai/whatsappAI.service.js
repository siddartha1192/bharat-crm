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
      });

      // Initialize vector DB for feature retrieval
      await vectorDBService.initialize();

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

**IMPORTANT: Your role is LIMITED to:**
1. Answering questions about product features and benefits
2. Helping users book appointments/demos
3. Creating tasks for follow-ups
4. Capturing lead information

**YOU CANNOT:**
- Access customer database
- Retrieve user data
- Modify existing records
- Query CRM data

**OUTPUT FORMAT:**
You MUST respond in valid JSON format with this structure:
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
   Optional: { phone, company, source, notes }

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

**FEATURES QUESTIONS:**
When asked about features, retrieve from knowledge base and explain benefits briefly.

Remember: Output ONLY valid JSON. No additional text before or after.`;
  }

  /**
   * Process WhatsApp message and return structured response
   * @param {string} conversationId - Conversation ID
   * @param {string} userMessage - User's message
   * @param {string} userId - User ID
   * @returns {Object} Structured response { message, actions, metadata }
   */
  async processMessage(conversationId, userMessage, userId) {
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

      // Search vector DB for relevant product information
      const relevantDocs = await vectorDBService.search(userMessage, 3);
      const productContext = relevantDocs.length > 0
        ? `\n\nRELEVANT PRODUCT INFORMATION:\n${relevantDocs.map(doc => doc.content).join('\n\n')}`
        : '';

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

      return structuredResponse;
    } catch (error) {
      console.error('❌ Error processing WhatsApp message:', error);
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
module.exports = new WhatsAppAIService();
