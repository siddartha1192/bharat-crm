const express = require('express');
const router = express.Router();
const whatsappService = require('../services/whatsapp');
const conversationStorage = require('../services/conversationStorage');
const whatsappAIService = require('../services/ai/whatsappAI.service');
const actionHandlerService = require('../services/ai/actionHandler.service');
const { authenticate } = require('../middleware/auth');
const { tenantContext, getTenantFilter, autoInjectTenantId } = require('../middleware/tenant');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const openaiService = require('../services/openai');

// Import io instance for WebSocket broadcasts
const { io } = require('../server');

/**
 * Helper function to get tenant-specific API configurations
 * @param {Object} tenant - Tenant object with settings
 * @returns {Object} - { whatsappConfig, openaiConfig }
 */
function getTenantAPIConfig(tenant) {
  const settings = tenant?.settings || {};

  return {
    whatsappConfig: settings.whatsapp || null,
    openaiConfig: settings.openai || null
  };
}

// Apply authentication and tenant context to all routes EXCEPT webhooks
router.use((req, res, next) => {
  // Skip auth for webhook endpoints (called by WhatsApp servers)
  if (req.path === '/webhook') {
    return next();
  }
  authenticate(req, res, next);
});

router.use((req, res, next) => {
  // Skip tenant context for webhook endpoints
  if (req.path === '/webhook') {
    return next();
  }
  tenantContext(req, res, next);
});

// ============ PROTECTED ENDPOINTS (REQUIRE AUTH) ============

// Send WhatsApp message to a contact
router.post('/send', async (req, res) => {
  try {
    const userId = req.user.id;
    const { message, phoneNumber, contactId } = req.body;

    // Get tenant-specific API configurations
    const { whatsappConfig } = getTenantAPIConfig(req.tenant);

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // If contactId is provided, verify the contact belongs to the user
    let recipientPhone = phoneNumber;
    let contactName = 'Contact';

    if (contactId) {
      const contact = await prisma.contact.findFirst({
        where: getTenantFilter(req, {
          id: contactId,
          userId
        })
      });

      if (!contact) {
        return res.status(404).json({ error: 'Contact not found' });
      }

      recipientPhone = contact.whatsapp || contact.phone;
      contactName = contact.name;
    }

    if (!recipientPhone) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    // Check if WhatsApp is configured
    if (!whatsappService.isConfigured(whatsappConfig)) {
      return res.status(503).json({
        error: 'WhatsApp is not configured',
        message: 'Please configure WhatsApp API credentials in Settings or environment variables'
      });
    }

    // Send the message with tenant-specific config
    const result = await whatsappService.sendMessage(recipientPhone, message, whatsappConfig);

    // Get or create conversation
    let conversation = await prisma.whatsAppConversation.findUnique({
      where: {
        userId_contactPhone: {
          userId,
          contactPhone: recipientPhone
        }
      }
    });

    // Get user info for sender name
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true }
    });

    if (!conversation) {
      // Create new conversation
      const filePath = conversationStorage.getFilePath(userId, recipientPhone);
      conversation = await prisma.whatsAppConversation.create({
        data: {
          userId,
          tenantId: req.tenant.id,
          contactName,
          contactPhone: recipientPhone,
          contactId: contactId || null,
          lastMessage: message,
          lastMessageAt: new Date(),
          filePath
        }
      });
    } else {
      // Update existing conversation
      conversation = await prisma.whatsAppConversation.update({
        where: { id: conversation.id },
        data: {
          lastMessage: message,
          lastMessageAt: new Date()
        }
      });
    }

    // Save message to database
    const savedMessage = await prisma.whatsAppMessage.create({
      data: {
        conversationId: conversation.id,
        tenantId: req.tenant.id,
        message,
        sender: 'user',
        senderName: user?.name || 'User',
        status: 'sent',
        messageType: 'text',
        metadata: { whatsappMessageId: result.messageId }
      }
    });

    // Save message to file
    await conversationStorage.saveMessage(userId, recipientPhone, savedMessage);

    // 🔌 Broadcast sent message via WebSocket
    if (io) {
      io.to(`user:${userId}`).emit('whatsapp:new_message', {
        conversationId: conversation.id,
        message: savedMessage
      });

      io.to(`user:${userId}`).emit('whatsapp:conversation_updated', {
        conversationId: conversation.id,
        contactName: contactName,
        lastMessage: message,
        lastMessageAt: new Date(),
        unreadCount: 0,
        aiEnabled: conversation.aiEnabled
      });

      console.log(`🔌 WebSocket: Broadcasted sent message to user ${userId}`);
    }

    res.json({
      success: true,
      messageId: result.messageId,
      recipient: contactName,
      phone: recipientPhone,
      message: 'Message sent successfully',
      conversationId: conversation.id
    });
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    res.status(500).json({
      error: 'Failed to send message',
      message: error.message
    });
  }
});

// Send template message
router.post('/send-template', async (req, res) => {
  try {
    const userId = req.user.id;
    const { contactId, templateName, phoneNumber, parameters, languageCode, components } = req.body;

    // Get tenant-specific API configurations
    const { whatsappConfig } = getTenantAPIConfig(req.tenant);

    if (!templateName) {
      return res.status(400).json({ error: 'Template name is required' });
    }

    // If contactId is provided, verify the contact belongs to the user
    let recipientPhone = phoneNumber;

    if (contactId) {
      const contact = await prisma.contact.findFirst({
        where: getTenantFilter(req, {
          id: contactId,
          userId
        })
      });

      if (!contact) {
        return res.status(404).json({ error: 'Contact not found' });
      }

      recipientPhone = contact.whatsapp || contact.phone;
    }

    if (!recipientPhone) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    // Check if WhatsApp is configured
    if (!whatsappService.isConfigured(whatsappConfig)) {
      return res.status(503).json({
        error: 'WhatsApp is not configured',
        message: 'Please configure WhatsApp API credentials in Settings or environment variables'
      });
    }

    // Send template message with enhanced support
    const result = await whatsappService.sendTemplateMessage(
      recipientPhone,
      templateName,
      languageCode || 'en',
      components || { body: parameters || [] },
      whatsappConfig
    );

    res.json({
      success: true,
      messageId: result.messageId,
      message: 'Template message sent successfully'
    });
  } catch (error) {
    console.error('Error sending template message:', error);
    res.status(500).json({
      error: 'Failed to send template message',
      message: error.message
    });
  }
});

// Send image via WhatsApp
router.post('/send-image', async (req, res) => {
  try {
    const { phoneNumber, imageUrl, caption } = req.body;
    const { whatsappConfig } = getTenantAPIConfig(req.tenant);

    if (!phoneNumber || !imageUrl) {
      return res.status(400).json({ error: 'Phone number and image URL are required' });
    }

    if (!whatsappService.isConfigured(whatsappConfig)) {
      return res.status(503).json({ error: 'WhatsApp is not configured' });
    }

    const result = await whatsappService.sendImage(phoneNumber, imageUrl, caption || '', whatsappConfig);

    res.json({
      success: true,
      messageId: result.messageId,
      message: 'Image sent successfully'
    });
  } catch (error) {
    console.error('Error sending image:', error);
    res.status(500).json({ error: 'Failed to send image', message: error.message });
  }
});

// Send document via WhatsApp
router.post('/send-document', async (req, res) => {
  try {
    const { phoneNumber, documentUrl, filename, caption } = req.body;
    const { whatsappConfig } = getTenantAPIConfig(req.tenant);

    if (!phoneNumber || !documentUrl) {
      return res.status(400).json({ error: 'Phone number and document URL are required' });
    }

    if (!whatsappService.isConfigured(whatsappConfig)) {
      return res.status(503).json({ error: 'WhatsApp is not configured' });
    }

    const result = await whatsappService.sendDocument(phoneNumber, documentUrl, filename || '', caption || '', whatsappConfig);

    res.json({
      success: true,
      messageId: result.messageId,
      message: 'Document sent successfully'
    });
  } catch (error) {
    console.error('Error sending document:', error);
    res.status(500).json({ error: 'Failed to send document', message: error.message });
  }
});

// Send video via WhatsApp
router.post('/send-video', async (req, res) => {
  try {
    const { phoneNumber, videoUrl, caption } = req.body;
    const { whatsappConfig } = getTenantAPIConfig(req.tenant);

    if (!phoneNumber || !videoUrl) {
      return res.status(400).json({ error: 'Phone number and video URL are required' });
    }

    if (!whatsappService.isConfigured(whatsappConfig)) {
      return res.status(503).json({ error: 'WhatsApp is not configured' });
    }

    const result = await whatsappService.sendVideo(phoneNumber, videoUrl, caption || '', whatsappConfig);

    res.json({
      success: true,
      messageId: result.messageId,
      message: 'Video sent successfully'
    });
  } catch (error) {
    console.error('Error sending video:', error);
    res.status(500).json({ error: 'Failed to send video', message: error.message });
  }
});

// Send audio via WhatsApp
router.post('/send-audio', async (req, res) => {
  try {
    const { phoneNumber, audioUrl } = req.body;
    const { whatsappConfig } = getTenantAPIConfig(req.tenant);

    if (!phoneNumber || !audioUrl) {
      return res.status(400).json({ error: 'Phone number and audio URL are required' });
    }

    if (!whatsappService.isConfigured(whatsappConfig)) {
      return res.status(503).json({ error: 'WhatsApp is not configured' });
    }

    const result = await whatsappService.sendAudio(phoneNumber, audioUrl, whatsappConfig);

    res.json({
      success: true,
      messageId: result.messageId,
      message: 'Audio sent successfully'
    });
  } catch (error) {
    console.error('Error sending audio:', error);
    res.status(500).json({ error: 'Failed to send audio', message: error.message });
  }
});

// Send bulk WhatsApp messages to multiple contacts
router.post('/bulk-send', async (req, res) => {
  try {
    const userId = req.user.id;
    const { message, contacts } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
      return res.status(400).json({ error: 'At least one contact is required' });
    }

    // Check if WhatsApp is configured
    if (!whatsappService.isConfigured()) {
      return res.status(503).json({
        error: 'WhatsApp is not configured',
        message: 'Please configure WHATSAPP_TOKEN and WHATSAPP_PHONE_ID in environment variables'
      });
    }

    // Get user info for sender name
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true }
    });

    const results = [];

    // Send message to each contact
    for (const contact of contacts) {
      try {
        const { id: contactId, name: contactName, phone } = contact;

        if (!phone) {
          results.push({
            phone: 'N/A',
            name: contactName,
            success: false,
            error: 'No phone number'
          });
          continue;
        }

        // Send the message
        const result = await whatsappService.sendMessage(phone, message);

        // Get or create conversation
        let conversation = await prisma.whatsAppConversation.findUnique({
          where: {
            userId_contactPhone: {
              userId,
              contactPhone: phone
            }
          }
        });

        if (!conversation) {
          // Create new conversation
          const filePath = conversationStorage.getFilePath(userId, phone);
          conversation = await prisma.whatsAppConversation.create({
            data: {
              userId,
              tenantId: req.tenant.id,
              contactName,
              contactPhone: phone,
              contactId: contactId || null,
              lastMessage: message,
              lastMessageAt: new Date(),
              filePath
            }
          });
        } else {
          // Update existing conversation
          conversation = await prisma.whatsAppConversation.update({
            where: { id: conversation.id },
            data: {
              lastMessage: message,
              lastMessageAt: new Date()
            }
          });
        }

        // Save message to database
        const savedMessage = await prisma.whatsAppMessage.create({
          data: {
            conversationId: conversation.id,
            tenantId: req.tenant.id,
            message,
            sender: 'user',
            senderName: user?.name || 'User',
            status: 'sent',
            messageType: 'text',
            metadata: { whatsappMessageId: result.messageId, bulkSend: true }
          }
        });

        // Save message to file
        await conversationStorage.saveMessage(userId, phone, savedMessage);

        // 🔌 Broadcast sent message via WebSocket
        if (io) {
          io.to(`user:${userId}`).emit('whatsapp:new_message', {
            conversationId: conversation.id,
            message: savedMessage
          });

          io.to(`user:${userId}`).emit('whatsapp:conversation_updated', {
            conversationId: conversation.id,
            contactName: contactName,
            lastMessage: message,
            lastMessageAt: new Date(),
            unreadCount: 0,
            aiEnabled: conversation.aiEnabled
          });
        }

        results.push({
          phone,
          name: contactName,
          success: true,
          messageId: result.messageId
        });

        // Small delay between messages to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`Error sending bulk message to ${contact.phone}:`, error);
        results.push({
          phone: contact.phone,
          name: contact.name,
          success: false,
          error: error.message || 'Failed to send'
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;

    res.json({
      success: true,
      message: `Sent to ${successCount} contact(s). ${failureCount} failed.`,
      results,
      summary: {
        total: results.length,
        success: successCount,
        failed: failureCount
      }
    });

  } catch (error) {
    console.error('Error sending bulk messages:', error);
    res.status(500).json({
      error: 'Failed to send bulk messages',
      message: error.message
    });
  }
});

// Check WhatsApp configuration status
router.get('/status', async (req, res) => {
  const userId = req.user.id;

  // Get tenant-specific API configurations
  const { whatsappConfig, openaiConfig } = getTenantAPIConfig(req.tenant);

  const whatsappConfigured = whatsappService.isConfigured(whatsappConfig);
  const openaiConfigured = openaiService.isEnabled(openaiConfig);

  res.json({
    configured: whatsappConfigured,
    message: whatsappConfigured
      ? 'WhatsApp is configured and ready to use'
      : 'WhatsApp is not configured. Please configure in Settings',
    whatsapp: {
      configured: whatsappConfigured,
      source: whatsappConfig ? 'tenant_settings' : 'environment_variables'
    },
    openai: {
      configured: openaiConfigured,
      source: openaiConfig ? 'tenant_settings' : 'environment_variables'
    }
  });
});

// ============ CONVERSATION MANAGEMENT ============

// Get all conversations for a user
router.get('/conversations', async (req, res) => {
  try {
    const userId = req.user.id;
    const { search, limit = '50', offset = '0' } = req.query;

    const where = getTenantFilter(req, { userId });

    // Add search filter if provided
    if (search) {
      where.OR = [
        { contactName: { contains: search, mode: 'insensitive' } },
        { contactPhone: { contains: search } }
      ];
    }

    const [conversations, total] = await Promise.all([
      prisma.whatsAppConversation.findMany({
        where,
        include: {
          messages: {
            take: 1,
            orderBy: { createdAt: 'desc' }
          }
        },
        orderBy: { lastMessageAt: 'desc' },
        take: parseInt(limit),
        skip: parseInt(offset)
      }),
      prisma.whatsAppConversation.count({ where })
    ]);

    res.json({
      conversations,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({
      error: 'Failed to fetch conversations',
      message: error.message
    });
  }
});

// Get a single conversation with messages
router.get('/conversations/:conversationId', async (req, res) => {
  try {
    const userId = req.user.id;
    const { conversationId } = req.params;
    const { limit = '100', offset = '0' } = req.query;

    const conversation = await prisma.whatsAppConversation.findFirst({
      where: getTenantFilter(req, {
        id: conversationId,
        userId
      }),
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: parseInt(limit),
          skip: parseInt(offset)
        }
      }
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Mark as read (reset unread count)
    if (conversation.unreadCount > 0) {
      await prisma.whatsAppConversation.update({
        where: { id: conversationId },
        data: { unreadCount: 0 }
      });
      conversation.unreadCount = 0;
    }

    res.json(conversation);
  } catch (error) {
    console.error('Error fetching conversation:', error);
    res.status(500).json({
      error: 'Failed to fetch conversation',
      message: error.message
    });
  }
});

// Start a new conversation or get existing one
router.post('/conversations/start', async (req, res) => {
  try {
    const userId = req.user.id;
    const { contactPhone, contactName, contactId } = req.body;

    if (!contactPhone) {
      return res.status(400).json({ error: 'Contact phone is required' });
    }

    // Check if conversation already exists
    let conversation = await prisma.whatsAppConversation.findUnique({
      where: {
        userId_contactPhone: {
          userId,
          contactPhone
        }
      },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 50
        }
      }
    });

    if (!conversation) {
      // Create new conversation
      const filePath = conversationStorage.getFilePath(userId, contactPhone);
      conversation = await prisma.whatsAppConversation.create({
        data: {
          userId,
          tenantId: req.tenant.id,
          contactName: contactName || contactPhone,
          contactPhone,
          contactId: contactId || null,
          filePath
        },
        include: {
          messages: true
        }
      });
    }

    res.json(conversation);
  } catch (error) {
    console.error('Error starting conversation:', error);
    res.status(500).json({
      error: 'Failed to start conversation',
      message: error.message
    });
  }
});

// Search contacts for new conversation
router.get('/search-contacts', async (req, res) => {
  try {
    const userId = req.user.id;
    const { query } = req.query;

    if (!query || query.trim().length < 2) {
      return res.json({ contacts: [] });
    }

    const contacts = await prisma.contact.findMany({
      where: getTenantFilter(req, {
        userId,
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { phone: { contains: query } },
          { whatsapp: { contains: query } },
          { company: { contains: query, mode: 'insensitive' } }
        ]
      }),
      select: {
        id: true,
        name: true,
        company: true,
        phone: true,
        whatsapp: true,
        email: true
      },
      take: 10
    });

    res.json({ contacts });
  } catch (error) {
    console.error('Error searching contacts:', error);
    res.status(500).json({
      error: 'Failed to search contacts',
      message: error.message
    });
  }
});

// Delete a conversation
router.delete('/conversations/:conversationId', async (req, res) => {
  try {
    const userId = req.user.id;
    const { conversationId } = req.params;

    const conversation = await prisma.whatsAppConversation.findFirst({
      where: getTenantFilter(req, {
        id: conversationId,
        userId
      })
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Delete conversation file
    await conversationStorage.deleteConversation(userId, conversation.contactPhone);

    // Delete from database (this will cascade delete messages)
    await prisma.whatsAppConversation.delete({
      where: { id: conversationId }
    });

    res.json({ message: 'Conversation deleted successfully' });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    res.status(500).json({
      error: 'Failed to delete conversation',
      message: error.message
    });
  }
});

// Toggle AI assistant for a conversation
router.patch('/conversations/:conversationId/ai-toggle', async (req, res) => {
  try {
    const userId = req.user.id;
    const { conversationId } = req.params;
    const { enabled } = req.body;

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'enabled field must be a boolean' });
    }

    const conversation = await prisma.whatsAppConversation.findFirst({
      where: getTenantFilter(req, {
        id: conversationId,
        userId
      })
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Update AI enabled status
    const updated = await prisma.whatsAppConversation.update({
      where: { id: conversationId },
      data: { aiEnabled: enabled }
    });

    res.json({
      success: true,
      message: `AI assistant ${enabled ? 'enabled' : 'disabled'} for this conversation`,
      aiEnabled: updated.aiEnabled
    });
  } catch (error) {
    console.error('Error toggling AI:', error);
    res.status(500).json({
      error: 'Failed to toggle AI',
      message: error.message
    });
  }
});

// Get AI feature status
router.get('/ai-status', async (req, res) => {
  try {
    const userId = req.user.id;

    res.json({
      aiFeatureEnabled: whatsappAIService.isEnabled(),
      message: whatsappAIService.isEnabled()
        ? 'AI assistant is available and ready to use'
        : 'AI assistant is disabled globally (check ENABLE_AI_FEATURE env variable)'
    });
  } catch (error) {
    console.error('Error checking AI status:', error);
    res.status(500).json({
      error: 'Failed to check AI status',
      message: error.message
    });
  }
});

// ============ WEBHOOK ENDPOINTS (PUBLIC - NO AUTH) ============
// Webhooks are called by WhatsApp/Meta and don't have user tokens

// Webhook verification (GET) - Required by WhatsApp
router.get('/webhook', (req, res) => {
  try {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    // Set a verify token in your .env file
    const VERIFY_TOKEN = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'bharat_crm_webhook_token';

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('Webhook verified successfully');
      res.status(200).send(challenge);
    } else {
      console.error('Webhook verification failed');
      res.status(403).send('Forbidden');
    }
  } catch (error) {
    console.error('Error in webhook verification:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Webhook for receiving messages (POST)
router.post('/webhook', async (req, res) => {
  try {
    const body = req.body;

    // Acknowledge receipt immediately
    res.status(200).send('EVENT_RECEIVED');

    // Process the webhook asynchronously
    if (body.object === 'whatsapp_business_account') {
      for (const entry of body.entry || []) {
        for (const change of entry.changes || []) {
          if (change.field === 'messages') {
            const value = change.value;

            // Process incoming messages
            if (value.messages && value.messages.length > 0) {
              for (const message of value.messages) {
                await processIncomingMessage(message, value);
              }
            }

            // Process message status updates (delivered, read, etc.)
            if (value.statuses && value.statuses.length > 0) {
              for (const status of value.statuses) {
                await processMessageStatus(status);
              }
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Error processing webhook:', error);
    // Still return 200 to prevent WhatsApp from retrying
  }
});

// Helper function to process incoming messages
async function processIncomingMessage(message, value) {
  try {
    let fromPhone = message.from;
    const messageId = message.id;
    const timestamp = message.timestamp;

    // Normalize phone number - add + prefix if not present
    if (!fromPhone.startsWith('+')) {
      fromPhone = '+' + fromPhone;
    }

    // Get contact name from the webhook data
    let contactName = fromPhone;
    if (value.contacts && value.contacts.length > 0) {
      const contact = value.contacts.find(c => c.wa_id === message.from);
      if (contact && contact.profile && contact.profile.name) {
        contactName = contact.profile.name;
      }
    }

    // Extract message content based on type
    let messageText = '';
    let messageType = message.type || 'text';

    switch (messageType) {
      case 'text':
        messageText = message.text.body;
        break;
      case 'image':
        messageText = message.image.caption || '[Image]';
        break;
      case 'document':
        messageText = message.document.caption || '[Document]';
        break;
      case 'audio':
        messageText = '[Audio]';
        break;
      case 'video':
        messageText = message.video.caption || '[Video]';
        break;
      case 'location':
        messageText = '[Location]';
        break;
      default:
        messageText = `[${messageType}]`;
    }

    console.log(`\n======================================`);
    console.log(`📩 Received message from ${fromPhone}: ${messageText}`);
    console.log(`   Type: ${messageType}, ID: ${messageId}`);

    // Phone number variations (with and without +)
    const phoneVariations = [fromPhone];
    if (fromPhone.startsWith('+')) {
      phoneVariations.push(fromPhone.substring(1)); // without +
    } else {
      phoneVariations.push('+' + fromPhone); // with +
    }

    // Find all users who might have this conversation
    // (In multi-user scenario, we need to find the right user)
    const conversations = await prisma.whatsAppConversation.findMany({
      where: {
        contactPhone: {
          in: phoneVariations
        }
      },
      include: {
        user: {
          select: { id: true, name: true, tenantId: true }
        }
      }
    });

    // If no conversation exists, try to find the contact in the CRM
    if (conversations.length === 0) {
      console.log(`No existing conversation found for ${fromPhone}. Searching for contact...`);

      const contacts = await prisma.contact.findMany({
        where: {
          OR: [
            { whatsapp: { in: phoneVariations } },
            { phone: { in: phoneVariations } }
          ]
        },
        include: {
          user: {
            select: { id: true, name: true, tenantId: true, role: true }
          }
        }
      });

      console.log(`Found ${contacts.length} contacts matching phone number`);

      // If no contacts found, create conversation for first ADMIN user to enable AI response for everyone
      let usersToCreateConversationsFor = [];

      if (contacts.length === 0) {
        console.log(`⚠️ No contacts found for ${fromPhone}. Finding ADMIN user to create conversation...`);

        // Find first ADMIN user from any tenant to handle this message
        const adminUser = await prisma.user.findFirst({
          where: {
            role: 'ADMIN',
            isActive: true
          },
          select: { id: true, name: true, tenantId: true, role: true }
        });

        if (adminUser) {
          console.log(`✅ Found ADMIN user ${adminUser.name} (${adminUser.id}) to handle unknown contact`);
          usersToCreateConversationsFor.push({
            userId: adminUser.id,
            userName: adminUser.name,
            tenantId: adminUser.tenantId,
            contactId: null,  // No contact exists yet
            contactName: contactName
          });
        } else {
          console.log(`❌ No ADMIN user found. Cannot create conversation for unknown contact ${fromPhone}`);
          return;  // Exit if no admin user exists
        }
      } else {
        // Map contacts to users for conversation creation
        usersToCreateConversationsFor = contacts.map(contact => ({
          userId: contact.userId,
          userName: contact.user.name,
          tenantId: contact.user.tenantId,
          contactId: contact.id,
          contactName: contactName
        }));
      }

      // Create conversation for each user (either from contacts or admin)
      for (const userInfo of usersToCreateConversationsFor) {
        console.log(`Creating conversation for user ${userInfo.userId} (${userInfo.userName})`);

        const filePath = conversationStorage.getFilePath(userInfo.userId, fromPhone);
        const conversation = await prisma.whatsAppConversation.create({
          data: {
            userId: userInfo.userId,
            tenantId: userInfo.tenantId,
            contactName: userInfo.contactName,
            contactPhone: fromPhone,
            contactId: userInfo.contactId,
            lastMessage: messageText,
            lastMessageAt: new Date(parseInt(timestamp) * 1000),
            unreadCount: 1,
            filePath
          }
        });

        // Save the message
        const savedMessage = await prisma.whatsAppMessage.create({
          data: {
            conversationId: conversation.id,
            tenantId: userInfo.tenantId,
            message: messageText,
            sender: 'contact',
            senderName: contactName,
            status: 'received',
            messageType,
            metadata: {
              whatsappMessageId: messageId,
              timestamp: timestamp
            }
          }
        });

        // Save to file
        await conversationStorage.saveMessage(userInfo.userId, fromPhone, savedMessage);
        console.log(`✅ Message saved to conversation for user ${userInfo.userId}`);

        // 🔌 Broadcast new message via WebSocket
        if (io) {
          io.to(`user:${userInfo.userId}`).emit('whatsapp:new_message', {
            conversationId: conversation.id,
            message: savedMessage
          });

          io.to(`user:${userInfo.userId}`).emit('whatsapp:conversation_updated', {
            conversationId: conversation.id,
            contactName: conversation.contactName,
            lastMessage: messageText,
            lastMessageAt: conversation.lastMessageAt,
            unreadCount: conversation.unreadCount,
            aiEnabled: conversation.aiEnabled
          });

          console.log(`🔌 WebSocket: Broadcasted new message to user ${userInfo.userId}`);
        }

        // Get tenant settings for API configurations
        const tenant = await prisma.tenant.findUnique({
          where: { id: userInfo.tenantId },
          select: { settings: true }
        });
        const { whatsappConfig, openaiConfig } = getTenantAPIConfig(tenant);

        // Process AI response if enabled for new conversation (Structured)
        console.log(`\n🔍 AI CHECK FOR NEW CONVERSATION:`);
        console.log(`   - whatsappAIService.isEnabled(): ${whatsappAIService.isEnabled()}`);
        console.log(`   - conversation.aiEnabled: ${conversation.aiEnabled}`);
        console.log(`   - messageType: ${messageType}`);
        console.log(`   - ALL CONDITIONS MET: ${whatsappAIService.isEnabled() && conversation.aiEnabled && messageType === 'text'}`);

        if (whatsappAIService.isEnabled() && conversation.aiEnabled && messageType === 'text') {
          try {
            console.log(`\n🤖 ✅ AI PROCESSING STARTING (Structured) for new conversation ${conversation.id}...`);

            // Get structured AI response with tenant-specific OpenAI config
            const aiResult = await whatsappAIService.processMessage(
              conversation.id,
              messageText,
              conversation.userId,
              contactName,
              openaiConfig
            );

            console.log(`\n🤖 Structured AI Response:`, JSON.stringify(aiResult, null, 2));

            // Execute any actions
            const actionResults = await actionHandlerService.executeActions(
              aiResult.actions,
              {
                userId: conversation.userId,
                contactPhone: fromPhone,
                conversationId: conversation.id,
              }
            );

            console.log(`\n⚡ Executed ${actionResults.length} action(s)`);

            // Check if any actions failed and notify user
            const failedActions = actionResults.filter(result => !result.success);
            let messageToSend = aiResult.message;

            if (failedActions.length > 0) {
              console.log(`\n⚠️ ${failedActions.length} action(s) failed`);

              // Build error message for user
              const errorDetails = failedActions.map(fa => {
                return `• ${fa.action}: ${fa.error || 'Unknown error'}`;
              }).join('\n');

              messageToSend = `⚠️ I encountered an issue while processing your request:\n\n${errorDetails}\n\nCould you please provide the information again? I need all required details to complete this action.`;

              console.log(`\n🔔 Notifying user about failed actions`);
            }

            // Send message to WhatsApp with tenant-specific config
            if (whatsappService.isConfigured(whatsappConfig) && messageToSend) {
              const sentMessage = await whatsappService.sendMessage(fromPhone, messageToSend, whatsappConfig);
              console.log(`   ✅ WhatsApp message sent! Message ID: ${sentMessage.messageId}`);

              // Save AI response to database
              const aiMessage = await prisma.whatsAppMessage.create({
                data: {
                  conversationId: conversation.id,
                  tenantId: conversation.tenantId,
                  message: messageToSend,
                  sender: 'ai',
                  senderName: 'AI Assistant',
                  status: 'sent',
                  messageType: 'text',
                  isAiGenerated: true,
                  metadata: {
                    whatsappMessageId: sentMessage.messageId,
                    intent: aiResult.metadata?.intent,
                    sentiment: aiResult.metadata?.sentiment,
                    actions: actionResults,
                  }
                }
              });

              // Update conversation
              await prisma.whatsAppConversation.update({
                where: { id: conversation.id },
                data: {
                  lastMessage: messageToSend,
                  lastMessageAt: new Date()
                }
              });

              // Save to file
              await conversationStorage.saveMessage(conversation.userId, fromPhone, aiMessage);
              console.log(`\n✅ ✅ ✅ AI RESPONSE SENT AND SAVED TO NEW CONVERSATION!`);
            } else {
              console.log(`\n⚠️ WhatsApp service not configured or no message to send`);
            }
          } catch (aiError) {
            console.error('\n❌❌❌ ERROR GENERATING AI RESPONSE FOR NEW CONVERSATION:');
            console.error('Error message:', aiError.message);
            console.error('Error stack:', aiError.stack);
            // Continue processing even if AI fails
          }
        } else {
          console.log(`\n⏭️ SKIPPING AI - Conditions not met`);
        }
      }
    } else {
      console.log(`Found ${conversations.length} existing conversation(s) for ${fromPhone}`);

      // Update existing conversations
      for (const conversation of conversations) {
        console.log(`Updating conversation ${conversation.id} for user ${conversation.userId}`);

        // Update conversation
        await prisma.whatsAppConversation.update({
          where: { id: conversation.id },
          data: {
            lastMessage: messageText,
            lastMessageAt: new Date(parseInt(timestamp) * 1000),
            unreadCount: { increment: 1 }
          }
        });

        // Save the message
        const savedMessage = await prisma.whatsAppMessage.create({
          data: {
            conversationId: conversation.id,
            tenantId: conversation.tenantId,
            message: messageText,
            sender: 'contact',
            senderName: contactName,
            status: 'received',
            messageType,
            metadata: {
              whatsappMessageId: messageId,
              timestamp: timestamp
            }
          }
        });

        // Save to file
        await conversationStorage.saveMessage(conversation.userId, fromPhone, savedMessage);
        console.log(`✅ Message saved to existing conversation for user ${conversation.userId}`);

        // 🔌 Broadcast new message via WebSocket
        if (io) {
          io.to(`user:${conversation.userId}`).emit('whatsapp:new_message', {
            conversationId: conversation.id,
            message: savedMessage
          });

          io.to(`user:${conversation.userId}`).emit('whatsapp:conversation_updated', {
            conversationId: conversation.id,
            contactName: contactName,
            lastMessage: messageText,
            lastMessageAt: new Date(parseInt(timestamp) * 1000),
            unreadCount: conversation.unreadCount + 1,
            aiEnabled: conversation.aiEnabled
          });

          console.log(`🔌 WebSocket: Broadcasted new message to user ${conversation.userId}`);
        }

        // Process AI response if enabled (Structured)
        console.log(`\n🔍 AI CHECK FOR EXISTING CONVERSATION (${conversation.id}):`);
        console.log(`   - whatsappAIService.isEnabled(): ${whatsappAIService.isEnabled()}`);
        console.log(`   - conversation.aiEnabled: ${conversation.aiEnabled}`);
        console.log(`   - messageType: ${messageType}`);
        console.log(`   - ALL CONDITIONS MET: ${whatsappAIService.isEnabled() && conversation.aiEnabled && messageType === 'text'}`);

        if (whatsappAIService.isEnabled() && conversation.aiEnabled && messageType === 'text') {
          try {
            console.log(`\n🤖 ✅ AI PROCESSING STARTING (Structured) for existing conversation ${conversation.id}...`);

            // Get structured AI response
            const aiResult = await whatsappAIService.processMessage(
              conversation.id,
              messageText,
              conversation.userId,
              contactName
            );

            console.log(`\n🤖 Structured AI Response:`, JSON.stringify(aiResult, null, 2));

            // Execute any actions
            const actionResults = await actionHandlerService.executeActions(
              aiResult.actions,
              {
                userId: conversation.userId,
                contactPhone: fromPhone,
                conversationId: conversation.id,
              }
            );

            console.log(`\n⚡ Executed ${actionResults.length} action(s)`);

            // Check if any actions failed and notify user
            const failedActions = actionResults.filter(result => !result.success);
            let messageToSend = aiResult.message;

            if (failedActions.length > 0) {
              console.log(`\n⚠️ ${failedActions.length} action(s) failed`);

              // Build error message for user
              const errorDetails = failedActions.map(fa => {
                return `• ${fa.action}: ${fa.error || 'Unknown error'}`;
              }).join('\n');

              messageToSend = `⚠️ I encountered an issue while processing your request:\n\n${errorDetails}\n\nCould you please provide the information again? I need all required details to complete this action.`;

              console.log(`\n🔔 Notifying user about failed actions`);
            }

            // Send message to WhatsApp
            if (whatsappService.isConfigured() && messageToSend) {
              const sentMessage = await whatsappService.sendMessage(fromPhone, messageToSend);
              console.log(`   ✅ WhatsApp message sent! Message ID: ${sentMessage.messageId}`);

              // Save AI response to database
              const aiMessage = await prisma.whatsAppMessage.create({
                data: {
                  conversationId: conversation.id,
                  tenantId: conversation.tenantId,
                  message: messageToSend,
                  sender: 'ai',
                  senderName: 'AI Assistant',
                  status: 'sent',
                  messageType: 'text',
                  isAiGenerated: true,
                  metadata: {
                    whatsappMessageId: sentMessage.messageId,
                    intent: aiResult.metadata?.intent,
                    sentiment: aiResult.metadata?.sentiment,
                    actions: actionResults,
                  }
                }
              });

              // Update conversation
              await prisma.whatsAppConversation.update({
                where: { id: conversation.id },
                data: {
                  lastMessage: messageToSend,
                  lastMessageAt: new Date()
                }
              });

              // Save to file
              await conversationStorage.saveMessage(conversation.userId, fromPhone, aiMessage);
              console.log(`\n✅ ✅ ✅ AI RESPONSE SENT AND SAVED TO EXISTING CONVERSATION!`);

              // 🔌 Broadcast AI message via WebSocket
              if (io) {
                io.to(`user:${conversation.userId}`).emit('whatsapp:new_message', {
                  conversationId: conversation.id,
                  message: aiMessage
                });

                io.to(`user:${conversation.userId}`).emit('whatsapp:conversation_updated', {
                  conversationId: conversation.id,
                  contactName: contactName,
                  lastMessage: aiResult.message,
                  lastMessageAt: new Date(),
                  unreadCount: 0, // AI messages don't increase unread count
                  aiEnabled: conversation.aiEnabled
                });

                console.log(`🔌 WebSocket: Broadcasted AI message to user ${conversation.userId}`);
              }
            } else {
              console.log(`\n⚠️ WhatsApp service not configured or no message to send`);
            }
          } catch (aiError) {
            console.error('\n❌❌❌ ERROR GENERATING AI RESPONSE FOR EXISTING CONVERSATION:');
            console.error('Error message:', aiError.message);
            console.error('Error stack:', aiError.stack);
            // Continue processing even if AI fails
          }
        } else {
          console.log(`\n⏭️ SKIPPING AI - Conditions not met for existing conversation`);
        }
      }
    }

    console.log(`\n✅ Successfully processed incoming message from ${fromPhone}`);
    console.log(`======================================\n`);
  } catch (error) {
    console.error('\n❌❌❌ FATAL ERROR processing incoming message:', error);
    console.error('Error details:', error.message);
    console.error('Stack trace:', error.stack);
    console.log(`======================================\n`);
  }
}

// Helper function to process message status updates
async function processMessageStatus(status) {
  try {
    const messageId = status.id;
    const statusValue = status.status; // 'sent', 'delivered', 'read', 'failed'

    // Update message status in database
    const message = await prisma.whatsAppMessage.findFirst({
      where: {
        metadata: {
          path: ['whatsappMessageId'],
          equals: messageId
        }
      }
    });

    if (message) {
      await prisma.whatsAppMessage.update({
        where: { id: message.id },
        data: { status: statusValue }
      });

      console.log(`Updated message ${messageId} status to ${statusValue}`);
    }
  } catch (error) {
    console.error('Error processing message status:', error);
  }
}

module.exports = router;
