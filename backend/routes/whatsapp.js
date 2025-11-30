const express = require('express');
const router = express.Router();
const whatsappService = require('../services/whatsapp');
const conversationStorage = require('../services/conversationStorage');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Send WhatsApp message to a contact
router.post('/send', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const { contactId, message, phoneNumber } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'User ID is required' });
    }

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // If contactId is provided, verify the contact belongs to the user
    let recipientPhone = phoneNumber;
    let contactName = 'Contact';

    if (contactId) {
      const contact = await prisma.contact.findFirst({
        where: {
          id: contactId,
          userId
        }
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
    if (!whatsappService.isConfigured()) {
      return res.status(503).json({
        error: 'WhatsApp is not configured',
        message: 'Please configure WHATSAPP_TOKEN and WHATSAPP_PHONE_ID in environment variables'
      });
    }

    // Send the message
    const result = await whatsappService.sendMessage(recipientPhone, message);

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
    const userId = req.headers['x-user-id'];
    const { contactId, templateName, parameters, phoneNumber } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'User ID is required' });
    }

    if (!templateName) {
      return res.status(400).json({ error: 'Template name is required' });
    }

    // If contactId is provided, verify the contact belongs to the user
    let recipientPhone = phoneNumber;

    if (contactId) {
      const contact = await prisma.contact.findFirst({
        where: {
          id: contactId,
          userId
        }
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
    if (!whatsappService.isConfigured()) {
      return res.status(503).json({
        error: 'WhatsApp is not configured',
        message: 'Please configure WHATSAPP_TOKEN and WHATSAPP_PHONE_ID in environment variables'
      });
    }

    // Send template message
    const result = await whatsappService.sendTemplateMessage(
      recipientPhone,
      templateName,
      parameters || []
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

// Check WhatsApp configuration status
router.get('/status', async (req, res) => {
  const userId = req.headers['x-user-id'];

  if (!userId) {
    return res.status(401).json({ error: 'User ID is required' });
  }

  res.json({
    configured: whatsappService.isConfigured(),
    message: whatsappService.isConfigured()
      ? 'WhatsApp is configured and ready to use'
      : 'WhatsApp is not configured. Please set WHATSAPP_TOKEN and WHATSAPP_PHONE_ID'
  });
});

// ============ CONVERSATION MANAGEMENT ============

// Get all conversations for a user
router.get('/conversations', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const { search, limit = 50, offset = 0 } = req.query;

    if (!userId) {
      return res.status(401).json({ error: 'User ID is required' });
    }

    const where = { userId };

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
    const userId = req.headers['x-user-id'];
    const { conversationId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    if (!userId) {
      return res.status(401).json({ error: 'User ID is required' });
    }

    const conversation = await prisma.whatsAppConversation.findFirst({
      where: {
        id: conversationId,
        userId
      },
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
    const userId = req.headers['x-user-id'];
    const { contactPhone, contactName, contactId } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'User ID is required' });
    }

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
    const userId = req.headers['x-user-id'];
    const { query } = req.query;

    if (!userId) {
      return res.status(401).json({ error: 'User ID is required' });
    }

    if (!query || query.trim().length < 2) {
      return res.json({ contacts: [] });
    }

    const contacts = await prisma.contact.findMany({
      where: {
        userId,
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { phone: { contains: query } },
          { whatsapp: { contains: query } },
          { company: { contains: query, mode: 'insensitive' } }
        ]
      },
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
    const userId = req.headers['x-user-id'];
    const { conversationId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'User ID is required' });
    }

    const conversation = await prisma.whatsAppConversation.findFirst({
      where: {
        id: conversationId,
        userId
      }
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

module.exports = router;
