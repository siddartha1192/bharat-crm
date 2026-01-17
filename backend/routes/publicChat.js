const express = require('express');
const router = express.Router();
const OpenAI = require('openai');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// System prompt for the AI assistant
const SYSTEM_PROMPT = `You are an AI assistant for Neuragg CRM, an advanced customer relationship management platform. Your role is to help potential customers learn about the product, answer questions, and guide them through the features.

Key Information about Neuragg CRM:

**Product Overview:**
- Neuragg CRM is a comprehensive business management platform designed for modern businesses
- It combines traditional CRM features with cutting-edge AI capabilities
- Perfect for sales teams, customer support, and business development

**Core Features:**
1. **Lead Management** - Track and manage leads through customizable pipelines
2. **Contact Management** - Centralized database for all customer information
3. **AI-Powered Calling** - Automated AI voice calls for lead engagement and follow-ups
4. **WhatsApp Integration** - Direct messaging with customers
5. **Email Campaigns** - Send and track email communications
6. **Task Management** - Organize team tasks and follow-ups
7. **Calendar Integration** - Sync with Google Calendar for scheduling
8. **Forms & Landing Pages** - Create custom forms to capture leads
9. **Reports & Analytics** - Comprehensive business insights and forecasting
10. **Invoice Management** - Create and manage invoices
11. **AI Assistant** - Smart automation and insights

**AI Capabilities:**
- AI-powered voice calls that can qualify leads, schedule demos, and answer questions
- Automatic meeting extraction from call transcripts
- Auto-booking calendar events based on AI-detected scheduling
- Smart lead qualification and scoring
- Automated follow-up recommendations

**Pricing Plans:**
- **FREE**: Basic CRM features for small teams
- **STARTER**: Enhanced features for growing businesses
- **PROFESSIONAL**: Full AI features and advanced automation
- **ENTERPRISE**: Custom solutions with dedicated support

**How to Get Started:**
1. Users can sign up for a free trial
2. Connect their business tools (calendar, email, phone)
3. Import existing leads or start fresh
4. Configure AI calling scripts
5. Start automating their sales process

When answering questions:
- Be friendly, professional, and helpful
- Provide specific feature details when asked
- Suggest scheduling a demo for complex questions
- If asked about pricing, provide general tiers and suggest contacting sales for custom quotes
- If you don't know something, be honest and offer to connect them with the sales team
- Keep responses concise but informative (2-4 sentences usually)
- Use a conversational, engaging tone
- Highlight the AI features as key differentiators

If someone wants to schedule a demo or speak with sales, let them know you can help create a lead for them and someone will reach out within 24 hours.`;

/**
 * POST /api/public/chat
 * Public endpoint for chatbot conversations
 */
router.post('/chat', async (req, res) => {
  try {
    const { message, conversationHistory = [] } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Get OpenAI API key (use first admin's settings or global)
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      console.error('OpenAI API key not configured for public chat');
      return res.status(503).json({
        error: 'Chat service temporarily unavailable',
        message: 'Please contact us at support@neuragg.com for assistance.',
      });
    }

    // Initialize OpenAI client
    const openai = new OpenAI({ apiKey });

    // Prepare conversation messages
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...conversationHistory.slice(-10), // Keep last 10 messages for context
      { role: 'user', content: message },
    ];

    // Get AI response
    const completion = await openai.chat.completions.create({
      model: process.env.CHAT_MODEL || 'gpt-4o-mini',
      messages,
      temperature: 0.7,
      max_tokens: 500,
    });

    const aiResponse = completion.choices[0].message.content;

    // Log the conversation for analytics (optional)
    try {
      // You could store this in a database for analytics
      console.log('[Public Chat]', {
        userMessage: message.substring(0, 100),
        aiResponse: aiResponse.substring(0, 100),
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      // Don't fail the request if logging fails
      console.error('Error logging chat:', error);
    }

    // Check if user is requesting a demo
    const lowerMessage = message.toLowerCase();
    const isDemoRequest = lowerMessage.includes('demo') ||
                          lowerMessage.includes('schedule') ||
                          lowerMessage.includes('call me') ||
                          lowerMessage.includes('contact me') ||
                          lowerMessage.includes('speak to') ||
                          lowerMessage.includes('talk to');

    res.json({
      message: aiResponse,
      isDemoRequest,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Error in public chat:', error);

    // Handle specific OpenAI errors
    if (error.response?.status === 429) {
      return res.status(429).json({
        error: 'Too many requests',
        message: 'Our chat is experiencing high volume. Please try again in a moment.',
      });
    }

    if (error.response?.status === 401) {
      console.error('OpenAI API key invalid');
      return res.status(503).json({
        error: 'Service configuration error',
        message: 'Please contact support@neuragg.com',
      });
    }

    res.status(500).json({
      error: 'Internal server error',
      message: 'Sorry, I encountered an error. Please try again or contact support@neuragg.com',
    });
  }
});

/**
 * POST /api/public/chat/demo-request
 * Submit a demo request from the chatbot
 */
router.post('/chat/demo-request', async (req, res) => {
  try {
    const { name, email, phone, company, message } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    // Get the first active tenant (admin account)
    const firstTenant = await prisma.tenant.findFirst({
      where: {
        status: {
          in: ['ACTIVE', 'TRIAL'],
        },
      },
      include: {
        users: {
          where: { role: 'ADMIN' },
          take: 1,
        },
      },
    });

    if (!firstTenant || !firstTenant.users[0]) {
      console.error('No active tenant found for demo request');
      return res.status(503).json({
        error: 'Service unavailable',
        message: 'Please email us directly at sales@neuragg.com',
      });
    }

    const adminUser = firstTenant.users[0];

    // Create a lead in the system
    // First, find or create a pipeline stage for web demos
    let demoStage = await prisma.pipelineStage.findFirst({
      where: {
        tenantId: firstTenant.id,
        name: { contains: 'Demo', mode: 'insensitive' },
      },
    });

    if (!demoStage) {
      // If no demo stage, use the first stage
      demoStage = await prisma.pipelineStage.findFirst({
        where: { tenantId: firstTenant.id },
        orderBy: { order: 'asc' },
      });
    }

    if (!demoStage) {
      console.error('No pipeline stages found for tenant');
      return res.status(503).json({
        error: 'Service configuration error',
        message: 'Please email us directly at sales@neuragg.com',
      });
    }

    // Create the lead
    const lead = await prisma.lead.create({
      data: {
        name,
        email,
        phone: phone || 'Not provided',
        company: company || 'Not provided',
        source: 'chatbot',
        status: 'new',
        priority: 'high',
        estimatedValue: 0,
        notes: `Demo request from chatbot:\n${message || 'No additional message'}`,
        tags: ['chatbot-demo', 'website'],
        tenantId: firstTenant.id,
        userId: adminUser.id,
        assignedTo: adminUser.id,
        stageId: demoStage.id,
      },
    });

    console.log('[Public Chat] Demo request created:', {
      leadId: lead.id,
      name,
      email,
      tenantId: firstTenant.id,
    });

    res.json({
      success: true,
      message: 'Thank you! Your demo request has been submitted. We\'ll contact you within 24 hours.',
      leadId: lead.id,
    });

  } catch (error) {
    console.error('Error creating demo request:', error);
    res.status(500).json({
      error: 'Failed to submit demo request',
      message: 'Please email us directly at sales@neuragg.com or try again later.',
    });
  }
});

module.exports = router;
