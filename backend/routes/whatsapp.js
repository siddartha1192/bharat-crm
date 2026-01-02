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
const { normalizePhoneNumber } = require('../utils/phoneNormalization');

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

    // Get tenant settings for API configurations
    const tenant = await prisma.tenant.findUnique({
      where: { id: req.tenant.id },
      select: { settings: true }
    });
    const { openaiConfig } = getTenantAPIConfig(tenant);

    res.json({
      aiFeatureEnabled: whatsappAIService.isEnabled(openaiConfig),
      message: whatsappAIService.isEnabled(openaiConfig)
        ? 'AI assistant is available and ready to use'
        : 'AI assistant is not configured. Please configure OpenAI API settings in Settings.'
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

            // CRITICAL: Extract phone_number_id to identify which tenant this message belongs to
            const phoneNumberId = value.metadata?.phone_number_id;

            if (!phoneNumberId) {
              console.error('❌ No phone_number_id in webhook metadata. Cannot identify tenant.');
              continue;
            }

            console.log(`\n🔍 Webhook received for phone_number_id: ${phoneNumberId}`);

            // Find tenant that owns this phone_number_id
            const tenant = await prisma.tenant.findFirst({
              where: {
                settings: {
                  path: ['whatsapp', 'phoneId'],
                  equals: phoneNumberId
                }
              },
              select: { id: true, name: true, settings: true }
            });

            if (!tenant) {
              console.error(`❌ No tenant found with phone_number_id: ${phoneNumberId}`);
              console.error(`   This phone number is not configured in any tenant's WhatsApp settings.`);
              console.error(`   Message will be ignored.`);
              continue;
            }

            console.log(`✅ Message belongs to tenant: ${tenant.name} (${tenant.id})`);

            // Process incoming messages for this tenant
            if (value.messages && value.messages.length > 0) {
              for (const message of value.messages) {
                await processIncomingMessage(message, value, tenant);
              }
            }

            // Process message status updates (delivered, read, etc.)
            if (value.statuses && value.statuses.length > 0) {
              for (const status of value.statuses) {
                await processMessageStatus(status, tenant);
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

/**
 * Helper function to extract last N digits from phone number
 * @param {string} phone - Phone number
 * @param {number} digits - Number of digits to extract (default 10)
 * @returns {string} Last N digits
 */
function getLastDigits(phone, digits = 10) {
  if (!phone) return '';
  const digitsOnly = phone.replace(/\D/g, ''); // Remove all non-digit characters
  return digitsOnly.slice(-digits); // Get last N digits
}

/**
 * Find contact by comparing last 10 digits of phone number
 * @param {string} phoneNumber - Phone number to search
 * @param {string} tenantId - Tenant ID to filter by
 * @returns {Promise<Array>} Array of matching contacts
 */
async function findContactByLast10Digits(phoneNumber, tenantId) {
  const last10Digits = getLastDigits(phoneNumber, 10);

  if (last10Digits.length < 10) {
    console.log(`⚠️ Phone number ${phoneNumber} has less than 10 digits, using exact match`);
    return [];
  }

  console.log(`🔍 Searching contacts by last 10 digits: ${last10Digits} (Tenant: ${tenantId})`);

  // Get all contacts for this tenant only
  const allContacts = await prisma.contact.findMany({
    where: {
      tenantId: tenantId // CRITICAL: Filter by tenant
    },
    include: {
      user: {
        select: { id: true, name: true, tenantId: true, role: true }
      }
    }
  });

  // Filter contacts where last 10 digits match (check both phone and whatsapp, handle null values)
  const matchingContacts = allContacts.filter(contact => {
    const contactPhoneLast10 = getLastDigits(contact.phone, 10);
    const contactWhatsappLast10 = getLastDigits(contact.whatsapp, 10);

    return contactPhoneLast10 === last10Digits || contactWhatsappLast10 === last10Digits;
  });

  console.log(`✅ Found ${matchingContacts.length} contacts matching last 10 digits`);
  return matchingContacts;
}

/**
 * Find conversations by comparing last 10 digits of phone number
 * @param {string} phoneNumber - Phone number to search
 * @param {string} tenantId - Tenant ID to filter by
 * @returns {Promise<Array>} Array of matching conversations
 */
async function findConversationsByLast10Digits(phoneNumber, tenantId) {
  const last10Digits = getLastDigits(phoneNumber, 10);

  if (last10Digits.length < 10) {
    console.log(`⚠️ Phone number ${phoneNumber} has less than 10 digits`);
    return [];
  }

  console.log(`🔍 Searching conversations by last 10 digits: ${last10Digits} (Tenant: ${tenantId})`);

  // Get all conversations for this tenant only
  const allConversations = await prisma.whatsAppConversation.findMany({
    where: {
      tenantId: tenantId // CRITICAL: Filter by tenant
    },
    include: {
      user: {
        select: { id: true, name: true, tenantId: true }
      }
    }
  });

  // Filter conversations where last 10 digits match and contactPhone is not null
  const matchingConversations = allConversations.filter(conv => {
    if (!conv.contactPhone) return false;
    const convPhoneLast10 = getLastDigits(conv.contactPhone, 10);
    return convPhoneLast10 === last10Digits;
  });

  console.log(`✅ Found ${matchingConversations.length} conversations matching last 10 digits`);
  return matchingConversations;
}

// Helper function to process incoming messages
async function processIncomingMessage(message, value, tenant) {
  try {
    let fromPhone = message.from;
    const messageId = message.id;
    const timestamp = message.timestamp;

    console.log(`\n📨 Processing message for tenant: ${tenant.name} (${tenant.id})`);

    // Normalize phone number - add + prefix if not present
    if (!fromPhone.startsWith('+')) {
      fromPhone = '+' + fromPhone;
    }

    // Normalize phone number to E.164 format for deduplication
    const normalizedResult = normalizePhoneNumber(fromPhone);
    const normalizedPhone = normalizedResult.normalized || fromPhone;

    console.log(`📞 Phone normalization: ${fromPhone} -> ${normalizedPhone}`);

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

    // Find all users who might have this conversation - FILTERED BY TENANT
    // First try using normalized phone number (preferred method)
    let conversations = await prisma.whatsAppConversation.findMany({
      where: {
        contactPhoneNormalized: normalizedPhone,
        tenantId: tenant.id // CRITICAL: Filter by tenant
      },
      include: {
        user: {
          select: { id: true, name: true, tenantId: true }
        }
      }
    });

    // Fallback: If no conversation found with normalized phone, try old phone variations
    if (conversations.length === 0) {
      console.log(`No conversation found with normalized phone, trying old phone variations...`);
      conversations = await prisma.whatsAppConversation.findMany({
        where: {
          contactPhone: {
            in: phoneVariations
          },
          tenantId: tenant.id // CRITICAL: Filter by tenant
        },
        include: {
          user: {
            select: { id: true, name: true, tenantId: true }
          }
        }
      });
    }

    // If no exact match for conversation, try last 10 digits matching
    if (conversations.length === 0) {
      console.log(`No exact conversation match. Trying last 10 digits comparison...`);
      conversations = await findConversationsByLast10Digits(fromPhone, tenant.id);
    }

    // If no conversation exists, try to find the contact in the CRM
    if (conversations.length === 0) {
      console.log(`No existing conversation found for ${fromPhone}. Searching for contact...`);

      // First try exact match with phone variations - FILTERED BY TENANT
      let contacts = await prisma.contact.findMany({
        where: {
          tenantId: tenant.id, // CRITICAL: Filter by tenant
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

      // If no exact match, try last 10 digits matching
      if (contacts.length === 0) {
        console.log(`No exact match found. Trying last 10 digits comparison...`);
        contacts = await findContactByLast10Digits(fromPhone, tenant.id);
      }

      console.log(`Found ${contacts.length} contacts matching phone number`);

      // If no contacts found, create conversation for first ADMIN user to enable AI response for everyone
      let usersToCreateConversationsFor = [];

      if (contacts.length === 0) {
        console.log(`⚠️ No contacts found for ${fromPhone}. Finding ADMIN user from this tenant to create conversation...`);

        // Find first ADMIN user from THIS tenant to handle this message
        const adminUser = await prisma.user.findFirst({
          where: {
            tenantId: tenant.id, // CRITICAL: Filter by tenant
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
            contactPhoneCountryCode: normalizedResult.country ? `+${normalizedResult.country}` : '+91',
            contactPhoneNormalized: normalizedPhone,
            contactId: userInfo.contactId,
            lastMessage: messageText,
            lastMessageAt: new Date(parseInt(timestamp) * 1000),
            unreadCount: 1,
            filePath
          }
        });

        // Add to conversations array for AI processing later
        conversations.push({
          ...conversation,
          user: {
            id: userInfo.userId,
            name: userInfo.userName,
            tenantId: userInfo.tenantId
          }
        });

        console.log(`✅ Created conversation ${conversation.id} for user ${userInfo.userId}`);
      }
    }

    // Now process all conversations (both new and existing)
    console.log(`\n📋 Processing ${conversations.length} conversation(s) for ${fromPhone}`);

    // Check if this is the first occurrence across ALL conversations in ALL tenants (for AI processing)
    const isFirstOccurrence = !(await prisma.whatsAppMessage.findFirst({
      where: {
        whatsappMessageId: messageId
      }
    }));

    console.log(`📝 First occurrence of message ${messageId}: ${isFirstOccurrence}`);

    // Step 1: Save incoming message to ALL conversations
    for (const conversation of conversations) {
      console.log(`Saving message to conversation ${conversation.id} for user ${conversation.userId}`);

      // If conversation doesn't have a contactId, try to find and link the contact
      if (!conversation.contactId) {
        console.log(`⚠️ Conversation ${conversation.id} has no contactId. Searching for matching contact...`);
        console.log(`   Incoming phone: ${fromPhone}`);
        console.log(`   Phone variations: ${phoneVariations.join(', ')}`);
        console.log(`   Last 10 digits: ${getLastDigits(fromPhone, 10)}`);

        // First try exact match with phone variations
        let matchingContacts = await prisma.contact.findMany({
          where: {
            userId: conversation.userId,
            OR: [
              { whatsapp: { in: phoneVariations } },
              { phone: { in: phoneVariations } }
            ]
          }
        });

        console.log(`   Exact match results: ${matchingContacts.length} contacts found`);

        // If no exact match, try last 10 digits matching
        if (matchingContacts.length === 0) {
          console.log(`   No exact match found. Trying last 10 digits comparison...`);
          const allUserContacts = await findContactByLast10Digits(fromPhone);
          // Filter to only this user's contacts
          matchingContacts = allUserContacts.filter(c => c.userId === conversation.userId);
          console.log(`   Last 10 digits match results: ${matchingContacts.length} contacts found`);

          // Debug: Show all user's contacts with phone numbers for debugging
          if (matchingContacts.length === 0) {
            const allContactsForUser = await prisma.contact.findMany({
              where: { userId: conversation.userId },
              select: { id: true, name: true, phone: true, whatsapp: true }
            });
            console.log(`   DEBUG: User has ${allContactsForUser.length} total contacts:`);
            allContactsForUser.forEach(c => {
              const phoneLast10 = getLastDigits(c.phone, 10);
              const whatsappLast10 = getLastDigits(c.whatsapp, 10);
              console.log(`     - ${c.name}: phone=${c.phone} (last10: ${phoneLast10}), whatsapp=${c.whatsapp} (last10: ${whatsappLast10})`);
            });
          }
        }

        // If we found a matching contact, update the conversation
        if (matchingContacts.length > 0) {
          const matchedContact = matchingContacts[0];
          console.log(`✅ Found matching contact: ${matchedContact.name} (${matchedContact.id}). Linking to conversation...`);

          await prisma.whatsAppConversation.update({
            where: { id: conversation.id },
            data: {
              contactId: matchedContact.id,
              contactName: matchedContact.name
            }
          });

          // Update the conversation object for use in AI processing
          conversation.contactId = matchedContact.id;
          conversation.contactName = matchedContact.name;

          console.log(`✅ Conversation ${conversation.id} now linked to contact ${matchedContact.id}`);
        } else {
          console.log(`⚠️ No matching contact found for ${fromPhone}. Conversation remains without contactId.`);
        }
      }

      // Check if message already exists in THIS conversation (per-conversation deduplication)
      const existingMessage = await prisma.whatsAppMessage.findFirst({
        where: {
          whatsappMessageId: messageId,
          conversationId: conversation.id
        }
      });

      if (existingMessage) {
        console.log(`⚠️ Message ${messageId} already exists in conversation ${conversation.id}, skipping`);
        continue; // Skip this conversation
      }

      // Update conversation
      await prisma.whatsAppConversation.update({
        where: { id: conversation.id },
        data: {
          lastMessage: messageText,
          lastMessageAt: new Date(parseInt(timestamp) * 1000),
          unreadCount: { increment: 1 }
        }
      });

      // Save the incoming message
      const savedMessage = await prisma.whatsAppMessage.create({
        data: {
          conversationId: conversation.id,
          tenantId: conversation.tenantId,
          message: messageText,
          sender: 'contact',
          senderName: contactName,
          status: 'received',
          messageType,
          whatsappMessageId: messageId,
          metadata: {
            timestamp: timestamp,
            isFirstOccurrence // Track for reference
          }
        }
      });

      // Save to file
      await conversationStorage.saveMessage(conversation.userId, fromPhone, savedMessage);
      console.log(`✅ Message saved to conversation ${conversation.id} for user ${conversation.userId}`);

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

        console.log(`🔌 WebSocket: Broadcasted incoming message to user ${conversation.userId}`);
      }
    }

    // Step 2: Process AI ONCE if this is first occurrence and any conversation has AI enabled
    const aiEnabledConversation = conversations.find(conv => conv.aiEnabled);

    // Get tenant settings for API configurations (needed for AI check)
    let whatsappConfig = null;
    let openaiConfig = null;
    if (aiEnabledConversation) {
      const tenant = await prisma.tenant.findUnique({
        where: { id: aiEnabledConversation.tenantId },
        select: { settings: true }
      });
      const configs = getTenantAPIConfig(tenant);
      whatsappConfig = configs.whatsappConfig;
      openaiConfig = configs.openaiConfig;
    }

    console.log(`\n🔍 AI CHECK:`);
    console.log(`   - whatsappService.isConfigured(whatsappConfig): ${whatsappService.isConfigured(whatsappConfig)}`);
    console.log(`   - whatsappAIService.isEnabled(openaiConfig): ${whatsappAIService.isEnabled(openaiConfig)}`);
    console.log(`   - Any conversation has AI enabled: ${!!aiEnabledConversation}`);
    console.log(`   - messageType: ${messageType}`);
    console.log(`   - isFirstOccurrence: ${isFirstOccurrence}`);
    console.log(`   - ALL CONDITIONS MET: ${whatsappService.isConfigured(whatsappConfig) && whatsappAIService.isEnabled(openaiConfig) && !!aiEnabledConversation && messageType === 'text' && isFirstOccurrence}`);

    if (whatsappService.isConfigured(whatsappConfig) && whatsappAIService.isEnabled(openaiConfig) && aiEnabledConversation && messageType === 'text' && isFirstOccurrence) {
      try {
        console.log(`\n🤖 ✅ AI PROCESSING STARTING for ${conversations.length} conversation(s)...`);

        // Get structured AI response using first AI-enabled conversation
        const aiResult = await whatsappAIService.processMessage(
          aiEnabledConversation.id,
          messageText,
          aiEnabledConversation.userId,
          contactName,
          openaiConfig
        );

        console.log(`\n🤖 Structured AI Response:`, JSON.stringify(aiResult, null, 2));

        // Execute any actions (only if contact exists in CRM)
        const actionResults = await actionHandlerService.executeActions(
          aiResult.actions,
          {
            userId: aiEnabledConversation.userId,
            contactPhone: fromPhone,
            conversationId: aiEnabledConversation.id,
            contactId: aiEnabledConversation.contactId,
            isKnownContact: !!aiEnabledConversation.contactId
          }
        );

        console.log(`\n⚡ Executed ${actionResults.length} action(s)`);

        // Check if any actions failed
        const failedActions = actionResults.filter(result => !result.success);
        let messageToSend = aiResult.message;

        if (failedActions.length > 0) {
          console.log(`\n⚠️ ${failedActions.length} action(s) failed`);

          const errorDetails = failedActions.map(fa => {
            return `• ${fa.action}: ${fa.error || 'Unknown error'}`;
          }).join('\n');

          messageToSend = `⚠️ I encountered an issue while processing your request:\n\n${errorDetails}\n\nCould you please provide the information again? I need all required details to complete this action.`;

          console.log(`\n🔔 Notifying user about failed actions`);
        }

        // Send WhatsApp reply ONCE
        let whatsappMessageId = null;
        if (whatsappService.isConfigured(whatsappConfig) && messageToSend) {
          const sentMessage = await whatsappService.sendMessage(fromPhone, messageToSend, whatsappConfig);
          whatsappMessageId = sentMessage.messageId;
          console.log(`   ✅ WhatsApp message sent ONCE! Message ID: ${whatsappMessageId}`);
        } else {
          console.log(`\n⚠️ WhatsApp service not configured or no message to send`);
        }

        // Step 3: Save AI response to ALL conversations with this contact
        console.log(`\n📨 Saving AI response to ALL ${conversations.length} conversation(s)...`);

        for (const conversation of conversations) {
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
              whatsappMessageId: whatsappMessageId,
              metadata: {
                whatsappMessageId: whatsappMessageId,
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
          console.log(`   ✅ AI response saved to conversation ${conversation.id} for user ${conversation.userId}`);

          // 🔌 Broadcast AI message via WebSocket to each user
          if (io) {
            io.to(`user:${conversation.userId}`).emit('whatsapp:new_message', {
              conversationId: conversation.id,
              message: aiMessage
            });

            io.to(`user:${conversation.userId}`).emit('whatsapp:conversation_updated', {
              conversationId: conversation.id,
              contactName: contactName,
              lastMessage: messageToSend,
              lastMessageAt: new Date(),
              unreadCount: 0, // AI messages don't increase unread count
              aiEnabled: conversation.aiEnabled
            });

            console.log(`   🔌 WebSocket: Broadcasted AI message to user ${conversation.userId}`);
          }
        }

        console.log(`\n✅ ✅ ✅ AI RESPONSE PROCESSED ONCE AND SAVED TO ALL ${conversations.length} CONVERSATION(S)!`);

      } catch (aiError) {
        console.error('\n❌❌❌ ERROR GENERATING AI RESPONSE:');
        console.error('Error message:', aiError.message);
        console.error('Error stack:', aiError.stack);
        // Continue processing even if AI fails
      }
    } else {
      console.log(`\n⏭️ SKIPPING AI - Conditions not met`);
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
async function processMessageStatus(status, tenant) {
  try {
    const messageId = status.id;
    const statusValue = status.status; // 'sent', 'delivered', 'read', 'failed'

    console.log(`\n📊 Status update for tenant: ${tenant.name} (${tenant.id})`);

    // Update message status in database - FILTERED BY TENANT
    const message = await prisma.whatsAppMessage.findFirst({
      where: {
        tenantId: tenant.id, // CRITICAL: Filter by tenant
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
