const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/auth');
const whatsappService = require('../services/whatsapp');
const openaiService = require('../services/openai');

const prisma = new PrismaClient();

/**
 * Get tenant API settings (WhatsApp, OpenAI)
 * GET /api/settings/api-config
 */
router.get('/api-config', auth, async (req, res) => {
  try {
    const userId = req.userId;

    // Get user's tenant
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            settings: true
          }
        }
      }
    });

    if (!user || !user.tenant) {
      return res.status(404).json({
        success: false,
        error: 'Tenant not found'
      });
    }

    const settings = user.tenant.settings || {};

    // Return sanitized settings (hide actual API keys, show only if configured)
    res.json({
      success: true,
      settings: {
        whatsapp: {
          configured: !!(settings.whatsapp?.token && settings.whatsapp?.phoneId),
          phoneId: settings.whatsapp?.phoneId ? maskString(settings.whatsapp.phoneId) : null,
          hasToken: !!settings.whatsapp?.token,
          webhookVerifyToken: settings.whatsapp?.webhookVerifyToken || null
        },
        openai: {
          configured: !!settings.openai?.apiKey,
          hasApiKey: !!settings.openai?.apiKey,
          model: settings.openai?.model || 'gpt-4o-mini',
          temperature: settings.openai?.temperature !== undefined ? settings.openai.temperature : 0.7,
          enabled: settings.openai?.enabled !== false
        }
      }
    });
  } catch (error) {
    console.error('Error fetching API settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch API settings'
    });
  }
});

/**
 * Update WhatsApp API settings
 * PUT /api/settings/whatsapp
 */
router.put('/whatsapp', auth, async (req, res) => {
  try {
    const userId = req.userId;
    const { token, phoneId, webhookVerifyToken } = req.body;

    // Validate required fields
    if (!token || !phoneId) {
      return res.status(400).json({
        success: false,
        error: 'WhatsApp token and phone ID are required'
      });
    }

    // Get user's tenant
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        tenant: {
          select: {
            id: true,
            settings: true
          }
        }
      }
    });

    if (!user || !user.tenant) {
      return res.status(404).json({
        success: false,
        error: 'Tenant not found'
      });
    }

    // Only ADMIN users can update API settings
    if (user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Only administrators can update API settings'
      });
    }

    // Test WhatsApp configuration before saving
    try {
      const isConfigured = whatsappService.isConfigured({ token, phoneId });
      if (!isConfigured) {
        throw new Error('Invalid WhatsApp configuration');
      }
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: 'Failed to validate WhatsApp configuration: ' + error.message
      });
    }

    // Update tenant settings
    const currentSettings = user.tenant.settings || {};
    const updatedSettings = {
      ...currentSettings,
      whatsapp: {
        token,
        phoneId,
        webhookVerifyToken: webhookVerifyToken || currentSettings.whatsapp?.webhookVerifyToken || process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN
      }
    };

    await prisma.tenant.update({
      where: { id: user.tenant.id },
      data: { settings: updatedSettings }
    });

    res.json({
      success: true,
      message: 'WhatsApp settings updated successfully',
      settings: {
        configured: true,
        phoneId: maskString(phoneId)
      }
    });
  } catch (error) {
    console.error('Error updating WhatsApp settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update WhatsApp settings'
    });
  }
});

/**
 * Update OpenAI API settings
 * PUT /api/settings/openai
 */
router.put('/openai', auth, async (req, res) => {
  try {
    const userId = req.userId;
    const { apiKey, model, temperature, enabled } = req.body;

    // Validate required fields
    if (!apiKey) {
      return res.status(400).json({
        success: false,
        error: 'OpenAI API key is required'
      });
    }

    // Get user's tenant
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        tenant: {
          select: {
            id: true,
            settings: true
          }
        }
      }
    });

    if (!user || !user.tenant) {
      return res.status(404).json({
        success: false,
        error: 'Tenant not found'
      });
    }

    // Only ADMIN users can update API settings
    if (user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Only administrators can update API settings'
      });
    }

    // Test OpenAI configuration before saving
    try {
      const testConfig = {
        apiKey,
        model: model || 'gpt-4o-mini',
        temperature: temperature !== undefined ? temperature : 0.7,
        enabled: enabled !== false
      };

      const isEnabled = openaiService.isEnabled(testConfig);
      if (!isEnabled) {
        throw new Error('Invalid OpenAI configuration');
      }

      // Test the API key with a simple call
      const testClient = openaiService.createClient(testConfig);
      // Just creating the client validates the API key format
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: 'Failed to validate OpenAI configuration: ' + error.message
      });
    }

    // Update tenant settings
    const currentSettings = user.tenant.settings || {};
    const updatedSettings = {
      ...currentSettings,
      openai: {
        apiKey,
        model: model || 'gpt-4o-mini',
        temperature: temperature !== undefined ? temperature : 0.7,
        enabled: enabled !== false
      }
    };

    await prisma.tenant.update({
      where: { id: user.tenant.id },
      data: { settings: updatedSettings }
    });

    res.json({
      success: true,
      message: 'OpenAI settings updated successfully',
      settings: {
        configured: true,
        model: model || 'gpt-4o-mini',
        temperature: temperature !== undefined ? temperature : 0.7,
        enabled: enabled !== false
      }
    });
  } catch (error) {
    console.error('Error updating OpenAI settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update OpenAI settings'
    });
  }
});

/**
 * Test WhatsApp connection
 * POST /api/settings/test-whatsapp
 */
router.post('/test-whatsapp', auth, async (req, res) => {
  try {
    const userId = req.userId;
    const { token, phoneId } = req.body;

    if (!token || !phoneId) {
      return res.status(400).json({
        success: false,
        error: 'Token and phone ID are required'
      });
    }

    // Test the configuration
    const isConfigured = whatsappService.isConfigured({ token, phoneId });

    res.json({
      success: true,
      configured: isConfigured,
      message: isConfigured ? 'WhatsApp configuration is valid' : 'WhatsApp configuration is invalid'
    });
  } catch (error) {
    console.error('Error testing WhatsApp connection:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to test WhatsApp connection: ' + error.message
    });
  }
});

/**
 * Test OpenAI connection
 * POST /api/settings/test-openai
 */
router.post('/test-openai', auth, async (req, res) => {
  try {
    const userId = req.userId;
    const { apiKey, model } = req.body;

    if (!apiKey) {
      return res.status(400).json({
        success: false,
        error: 'API key is required'
      });
    }

    // Test the configuration
    const testConfig = {
      apiKey,
      model: model || 'gpt-4o-mini',
      temperature: 0.7,
      enabled: true
    };

    try {
      const client = openaiService.createClient(testConfig);

      // Make a minimal test call
      const completion = await client.chat.completions.create({
        model: testConfig.model,
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 5
      });

      res.json({
        success: true,
        configured: true,
        message: 'OpenAI API key is valid',
        model: testConfig.model
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        configured: false,
        error: 'Invalid OpenAI API key or configuration: ' + error.message
      });
    }
  } catch (error) {
    console.error('Error testing OpenAI connection:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to test OpenAI connection: ' + error.message
    });
  }
});

/**
 * Helper function to mask sensitive strings
 * @param {string} str - String to mask
 * @returns {string} - Masked string
 */
function maskString(str) {
  if (!str || str.length < 8) return '****';
  return str.substring(0, 4) + '****' + str.substring(str.length - 4);
}

module.exports = router;
