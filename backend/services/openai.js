const OpenAI = require('openai');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Default model and temperature for tenants who don't specify
const DEFAULT_OPENAI_MODEL = 'gpt-4o-mini';
const DEFAULT_OPENAI_TEMPERATURE = 0.7;
const OWNER_EMAIL = process.env.OWNER_EMAIL || 'siddartha1192@gmail.com';
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001/api';

// Bharat CRM Product Knowledge Base
const PRODUCT_KNOWLEDGE = `
# Bharat CRM - Complete Business Management Solution

## What is Bharat CRM?
Bharat CRM is a comprehensive customer relationship management system specifically designed for Indian businesses. It centralizes all customer interactions, sales processes, and business communications into one unified platform.

## Key Features & Benefits:

### 1. WhatsApp Integration (What you're using right now!)
- Direct WhatsApp messaging from the CRM
- Complete message history storage
- Link conversations to contacts and leads
- Never miss a customer message
**Benefit:** Manage all WhatsApp business conversations in one place with full context

### 2. Lead Management
- Capture leads from multiple sources (web forms, WhatsApp, calls, social media)
- Track leads through sales pipeline: new → contacted → qualified → proposal → negotiation → won/lost
- Priority-based assignment and follow-up reminders
- Estimated deal value tracking
**Benefit:** Convert more leads into customers with organized follow-ups

### 3. Contact & Customer Management
- Comprehensive contact database with company details
- Industry categorization for Indian businesses
- GST and PAN number storage
- Track lifetime customer value
**Benefit:** 360-degree view of every customer relationship

### 4. Production-Grade Email System
- Gmail integration with automatic reply tracking
- Send emails to leads and contacts from CRM
- Threaded email conversations
- Email statistics and tracking
**Benefit:** Professional email communication with full tracking

### 5. Google Calendar Integration
- Sync CRM events with Google Calendar
- Schedule meetings and follow-ups
- Set reminders for important activities
**Benefit:** Never miss an appointment or follow-up

### 6. GST-Compliant Invoice Generation
- Professional invoices with CGST, SGST, IGST
- Multiple payment methods (UPI, bank transfer, Razorpay, etc.)
- Invoice status tracking (draft, sent, paid, overdue)
**Benefit:** Get paid faster with professional invoices

### 7. Deal Pipeline Management
- Visual deal tracking through sales stages
- Probability scoring and expected close dates
- Deal value monitoring
**Benefit:** Focus on deals that matter most

### 8. Task Management
- Create and assign tasks to team members
- Priority levels and due date tracking
- Task workflow: todo → in-progress → completed
**Benefit:** Keep your team organized and productive

### 9. Team & User Management
- Role-based access (Admin, Manager, Agent, Viewer)
- Department and team structures
- Activity logging for audit trails
**Benefit:** Secure access control and accountability

### 10. Modern, Easy-to-Use Interface
- Clean professional design
- Works on desktop and mobile
- Dark mode support
**Benefit:** User-friendly interface that your team will love

## Pricing & Plans
For pricing information and customized plans for your business, please schedule a consultation with our team.

## Why Choose Bharat CRM?
✅ Built specifically for Indian businesses
✅ WhatsApp-first approach (India's #1 business communication channel)
✅ GST-compliant invoicing
✅ All-in-one solution (no need for multiple tools)
✅ Modern, fast, and reliable technology
✅ Excellent customer support

## Industries We Serve:
- Technology & IT Services
- Manufacturing
- Retail & E-commerce
- Export & Import
- Healthcare
- Professional Services
- Textile & Apparel
- Food & Beverage
- And many more...

## How It Helps Your Business:
- **Sales Teams:** Never lose a lead, track every interaction
- **Business Owners:** Complete visibility into sales and customer relationships
- **Customer Service:** Respond faster with complete customer history
- **Finance:** Generate invoices instantly and track payments
`;

// System prompt for AI assistant (dynamically generated with company name)
const getSystemPrompt = (companyName = 'Bharat CRM') => {
  return `You are an intelligent AI assistant for ${companyName}, using Bharat CRM - a comprehensive business management platform for Indian businesses.

Your responsibilities:
1. Answer questions about ${companyName}'s services, products, and how Bharat CRM helps manage their business
2. Help potential customers understand how ${companyName} can solve their business problems
3. Be enthusiastic but professional, highlighting benefits relevant to their questions
4. When customers want to schedule an appointment/demo, collect the following information:
   - Full Name
   - Email Address
   - Phone Number (if not already known from WhatsApp)
   - Company Name (optional)
   - Preferred Date and Time for the appointment
   - Purpose of appointment (demo, consultation, support, etc.)
5. Once you have all appointment details, format them clearly for booking confirmation

Important guidelines:
- Be concise and friendly
- Focus on benefits, not just features
- Understand that you're chatting via WhatsApp with business prospects
- If asked about pricing, mention that custom plans are available and suggest booking a consultation
- Use simple language suitable for WhatsApp conversations
- When detecting appointment intent, proactively offer to help schedule it

Product Knowledge:
${PRODUCT_KNOWLEDGE}

Remember: You're representing ${companyName}. Be helpful, professional, and always focus on how we can help their business succeed.`;
};

class OpenAIService {
  /**
   * Get OpenAI configuration from tenant-specific settings
   * @param {Object} tenantConfig - Tenant-specific OpenAI configuration (REQUIRED)
   * @returns {Object} - { apiKey, model, temperature, enabled }
   */
  getConfig(tenantConfig = null) {
    if (tenantConfig && tenantConfig.apiKey) {
      return {
        apiKey: tenantConfig.apiKey,
        model: tenantConfig.model || DEFAULT_OPENAI_MODEL,
        temperature: tenantConfig.temperature !== undefined ? tenantConfig.temperature : DEFAULT_OPENAI_TEMPERATURE,
        enabled: tenantConfig.enabled !== undefined ? tenantConfig.enabled : true
      };
    }
    // No fallback - tenant MUST configure their own OpenAI API
    return {
      apiKey: null,
      model: DEFAULT_OPENAI_MODEL,
      temperature: DEFAULT_OPENAI_TEMPERATURE,
      enabled: false
    };
  }

  /**
   * Create OpenAI client with tenant-specific configuration
   * @param {Object} tenantConfig - Tenant-specific OpenAI configuration (REQUIRED)
   * @returns {OpenAI} - OpenAI client instance
   */
  createClient(tenantConfig = null) {
    const config = this.getConfig(tenantConfig);

    if (!config.enabled || !config.apiKey) {
      throw new Error('OpenAI API not configured for this tenant. Please configure OpenAI API settings in Settings.');
    }

    return new OpenAI({ apiKey: config.apiKey });
  }

  /**
   * Check if AI is enabled (with optional tenant config)
   * @param {Object} tenantConfig - Optional tenant-specific OpenAI configuration
   * @returns {boolean}
   */
  isEnabled(tenantConfig = null) {
    const config = this.getConfig(tenantConfig);
    return config.enabled && !!config.apiKey;
  }

  /**
   * Generate AI response for WhatsApp message
   * @param {Array} conversationHistory - Previous messages
   * @param {string} userMessage - Current user message
   * @param {Object} tenantConfig - Optional tenant-specific OpenAI configuration
   * @returns {Promise} - AI response with appointment data
   */
  async generateResponse(conversationHistory, userMessage, tenantConfig = null) {
    if (!this.isEnabled(tenantConfig)) {
      throw new Error('AI feature is disabled or not configured');
    }

    try {
      const config = this.getConfig(tenantConfig);
      const openai = this.createClient(tenantConfig);
      const companyName = tenantConfig?.companyName || 'Bharat CRM';

      // Prepare conversation history for OpenAI
      const messages = [
        { role: 'system', content: getSystemPrompt(companyName) },
        ...conversationHistory.map(msg => ({
          role: msg.sender === 'contact' ? 'user' : 'assistant',
          content: msg.message,
        })),
        { role: 'user', content: userMessage },
      ];

      // Call OpenAI API
      const completion = await openai.chat.completions.create({
        model: config.model,
        messages: messages,
        temperature: config.temperature,
        max_tokens: 500, // Keep responses concise for WhatsApp
      });

      const aiResponse = completion.choices[0].message.content;

      // Check if response contains appointment details
      const appointmentData = this.extractAppointmentData(aiResponse, conversationHistory);

      return {
        response: aiResponse,
        appointmentData: appointmentData,
        tokensUsed: completion.usage.total_tokens,
      };
    } catch (error) {
      console.error('OpenAI API error:', error);
      throw new Error(`AI response generation failed: ${error.message}`);
    }
  }

  /**
   * Extract appointment data from conversation
   */
  extractAppointmentData(latestMessage, conversationHistory) {
    // Combine recent messages to analyze for appointment details
    const recentMessages = conversationHistory.slice(-10).map(m => m.message).join(' ') + ' ' + latestMessage;

    // Simple pattern matching for appointment data
    const nameMatch = recentMessages.match(/(?:name|I am|I'm)\s+(?:is\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i);
    const emailMatch = recentMessages.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    const phoneMatch = recentMessages.match(/(?:phone|mobile|contact)?\s*(?:number)?\s*:?\s*([+]?[0-9]{10,15})/i);
    const dateMatch = recentMessages.match(/(?:on|date)\s+([0-9]{1,2}[-\/][0-9]{1,2}[-\/][0-9]{2,4}|tomorrow|today|next\s+\w+)/i);
    const timeMatch = recentMessages.match(/(?:at|time)\s+([0-9]{1,2}:[0-9]{2}\s*(?:AM|PM|am|pm)?|[0-9]{1,2}\s*(?:AM|PM|am|pm))/i);
    const companyMatch = recentMessages.match(/(?:company|business|organization)\s+(?:name\s+)?(?:is\s+)?([A-Z][a-zA-Z0-9\s&]+)/i);

    // Check if we have minimum required information
    if (nameMatch || emailMatch || (dateMatch && timeMatch)) {
      return {
        name: nameMatch ? nameMatch[1] : null,
        email: emailMatch ? emailMatch[1] : null,
        phone: phoneMatch ? phoneMatch[1] : null,
        company: companyMatch ? companyMatch[1] : null,
        date: dateMatch ? dateMatch[1] : null,
        time: timeMatch ? timeMatch[1] : null,
      };
    }

    return null;
  }

  /**
   * Create calendar event for appointment using internal API
   */
  async createAppointment(appointmentData, contactPhone, userId) {
    try {
      console.log('📅 Creating appointment via internal calendar API...');
      console.log('Appointment data:', JSON.stringify(appointmentData, null, 2));

      // Parse date and time
      const appointmentDateTime = this.parseDateTime(appointmentData.date, appointmentData.time);

      // Default to 1 hour duration
      const startTime = appointmentDateTime;
      const endTime = new Date(appointmentDateTime.getTime() + 60 * 60 * 1000);

      const title = `CRM Demo/Consultation - ${appointmentData.name || 'WhatsApp Lead'}`;
      const description = `
Appointment Details:
- Name: ${appointmentData.name || 'Not provided'}
- Email: ${appointmentData.email || 'Not provided'}
- Phone: ${appointmentData.phone || contactPhone}
- Company: ${appointmentData.company || 'Not provided'}
- Source: WhatsApp AI Assistant

Contact for: Demo/Consultation about Bharat CRM
      `.trim();

      const attendees = [];
      if (appointmentData.email) {
        attendees.push(appointmentData.email);
      }

      // Get owner user ID if not provided
      if (!userId) {
        userId = await this.getOwnerUserId();
      }

      if (!userId) {
        throw new Error('Could not determine user ID for calendar event');
      }

      // Create event using internal calendar API
      const eventData = {
        title,
        description,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        location: 'WhatsApp/Online',
        attendees,
        isAllDay: false,
        color: 'green',
        reminders: [
          { method: 'email', minutes: 24 * 60 }, // 1 day before
          { method: 'popup', minutes: 30 }, // 30 minutes before
        ],
        syncWithGoogle: true // Sync with Google Calendar if connected
      };

      console.log('📤 Calling internal calendar API with data:', JSON.stringify(eventData, null, 2));

      // Use fetch to call the internal API
      const response = await fetch(`${API_BASE_URL}/calendar/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': userId
        },
        body: JSON.stringify(eventData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(`Calendar API error: ${errorData.error || response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ Calendar event created via internal API:', result.event?.id);

      return {
        success: true,
        eventId: result.event?.id,
        eventLink: result.event?.googleEventId ? `https://calendar.google.com/calendar/event?eid=${result.event.googleEventId}` : null,
        startTime: startTime,
        event: result.event
      };
    } catch (error) {
      console.error('❌ Error creating calendar event:', error);
      console.error('Error details:', error.message);
      console.error('Stack:', error.stack);
      throw new Error(`Failed to create appointment: ${error.message}`);
    }
  }

  /**
   * Parse date and time string into Date object
   */
  parseDateTime(dateStr, timeStr) {
    const now = new Date();
    let targetDate = new Date();

    // Handle relative dates
    if (dateStr && dateStr.toLowerCase() === 'today') {
      targetDate = new Date();
    } else if (dateStr && dateStr.toLowerCase() === 'tomorrow') {
      targetDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    } else if (dateStr && dateStr.toLowerCase().startsWith('next')) {
      // "next monday", "next week" etc.
      targetDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    } else if (dateStr) {
      // Try to parse the date string
      targetDate = new Date(dateStr);
    }

    // Parse time
    if (timeStr) {
      const timeMatch = timeStr.match(/([0-9]{1,2}):?([0-9]{2})?\s*(AM|PM|am|pm)?/i);
      if (timeMatch) {
        let hours = parseInt(timeMatch[1]);
        const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
        const meridiem = timeMatch[3] ? timeMatch[3].toUpperCase() : null;

        if (meridiem === 'PM' && hours < 12) hours += 12;
        if (meridiem === 'AM' && hours === 12) hours = 0;

        targetDate.setHours(hours, minutes, 0, 0);
      }
    } else {
      // Default to 10 AM if no time specified
      targetDate.setHours(10, 0, 0, 0);
    }

    return targetDate;
  }

  /**
   * Get owner user ID from email
   */
  async getOwnerUserId() {
    try {
      const user = await prisma.user.findFirst({
        where: { email: OWNER_EMAIL },
      });
      return user?.id || null;
    } catch (error) {
      console.error('Error fetching owner user ID:', error);
      return null;
    }
  }

  /**
   * Generate AI response for phone call conversation
   * @param {Array} conversationHistory - Previous messages in the call
   * @param {string} userSpeech - What the user just said
   * @param {Object} script - Call script with AI instructions
   * @param {Object} lead - Lead information
   * @param {string} apiKey - OpenAI API key
   * @returns {Promise} - AI response
   */
  async generateCallResponse(conversationHistory, userSpeech, script, lead, apiKey) {
    if (!apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    try {
      const openai = new OpenAI({ apiKey });

      // Build system prompt from script
      const systemPrompt = `You are an AI sales representative making a phone call on behalf of a business.

${script?.aiObjective ? `OBJECTIVE: ${script.aiObjective}` : 'OBJECTIVE: Engage the prospect in a friendly conversation and assess their interest.'}

${script?.aiInstructions ? `INSTRUCTIONS:\n${script.aiInstructions}` : ''}

PERSONALITY: ${script?.aiPersonality || 'professional and friendly'}

LEAD INFORMATION:
- Name: ${lead?.name || 'Unknown'}
- Company: ${lead?.company || 'Not specified'}
- Email: ${lead?.email || 'Not specified'}
- Phone: ${lead?.phone || 'Not specified'}

IMPORTANT GUIDELINES:
- Keep responses short and natural (1-3 sentences max) - this is a phone conversation
- Sound conversational, not robotic
- Listen actively and respond to what the person says
- If they're not interested, politely end the call
- If they want to schedule a meeting, ask for their preferred time
- Don't repeat information unnecessarily
- Be respectful of their time

Remember: You're on a phone call. Keep it natural, brief, and conversational.`;

      // Prepare conversation history
      const messages = [
        { role: 'system', content: systemPrompt },
        ...conversationHistory,
        { role: 'user', content: userSpeech }
      ];

      // Call OpenAI
      const completion = await openai.chat.completions.create({
        model: DEFAULT_OPENAI_MODEL,
        messages: messages,
        temperature: 0.8, // Slightly higher for more natural conversation
        max_tokens: 150, // Keep responses short for phone calls
      });

      const aiResponse = completion.choices[0].message.content;

      // Detect if conversation should end
      const shouldEnd = this.detectCallEnding(aiResponse, userSpeech);

      return {
        response: aiResponse,
        shouldContinue: !shouldEnd,
        tokensUsed: completion.usage.total_tokens
      };
    } catch (error) {
      console.error('[OPENAI] Error generating call response:', error);
      throw error;
    }
  }

  /**
   * Detect if call should end based on conversation
   */
  detectCallEnding(aiResponse, userSpeech) {
    const endingPhrases = [
      'goodbye',
      'thank you for your time',
      'have a great day',
      'talk to you later',
      'bye',
      'not interested',
      'please don\'t call',
      'remove from list',
      'stop calling'
    ];

    const combinedText = (aiResponse + ' ' + userSpeech).toLowerCase();
    return endingPhrases.some(phrase => combinedText.includes(phrase));
  }

  /**
   * Generate smart response based on conversation context
   * @param {string} conversationId - WhatsApp conversation ID
   * @param {string} userMessage - User's message
   * @param {string} userId - User ID
   * @param {Object} tenantConfig - Optional tenant-specific OpenAI configuration
   * @returns {Promise} - AI response result
   */
  async processWhatsAppMessage(conversationId, userMessage, userId, tenantConfig = null) {
    if (!this.isEnabled(tenantConfig)) {
      return null;
    }

    try {
      // Get conversation and check if AI is enabled
      const conversation = await prisma.whatsAppConversation.findUnique({
        where: { id: conversationId },
      });

      if (!conversation || !conversation.aiEnabled) {
        return null; // AI disabled for this conversation
      }

      // Get recent conversation history (last 10 messages)
      const messages = await prisma.whatsAppMessage.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });

      const conversationHistory = messages.reverse();

      // Generate AI response with tenant config
      const result = await this.generateResponse(conversationHistory, userMessage, tenantConfig);

      // If appointment data detected, try to create calendar event
      if (result.appointmentData && result.appointmentData.date && result.appointmentData.time) {
        try {
          console.log('🗓️ Appointment data detected, creating calendar event...');
          const appointment = await this.createAppointment(
            result.appointmentData,
            conversation.contactPhone,
            userId
          );

          if (appointment.success) {
            // Append appointment confirmation to response
            result.response += `\n\n✅ *Appointment Confirmed!*\n📅 ${appointment.startTime.toLocaleString('en-IN', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              timeZone: 'Asia/Kolkata',
            })}\n\nYou'll receive a calendar invite at ${result.appointmentData.email || 'your email'}. Looking forward to speaking with you!`;
          }
        } catch (error) {
          console.error('Appointment creation failed:', error);
          // Don't fail the whole response if appointment creation fails
        }
      }

      return result;
    } catch (error) {
      console.error('Error processing WhatsApp message:', error);
      throw error;
    }
  }
}

module.exports = new OpenAIService();
