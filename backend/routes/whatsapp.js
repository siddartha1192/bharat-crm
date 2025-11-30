const express = require('express');
const router = express.Router();
const whatsappService = require('../services/whatsapp');
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

    // Log the message in database (optional - you can create a messages table)
    // For now, just return success
    res.json({
      success: true,
      messageId: result.messageId,
      recipient: contactName,
      phone: recipientPhone,
      message: 'Message sent successfully'
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

module.exports = router;
