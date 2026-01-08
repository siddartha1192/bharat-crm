const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const whatsappService = require('../services/whatsapp');
const openaiService = require('../services/openai');
const { encrypt, decrypt, isEncrypted } = require('../utils/encryption');

const prisma = new PrismaClient();

/**
 * Get tenant API settings (WhatsApp, OpenAI)
 * GET /api/settings/api-config
 */
router.get('/api-config', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

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
          enabled: settings.openai?.enabled !== false,
          companyName: settings.openai?.companyName || 'Bharat CRM'
        },
        cloudinary: {
          configured: !!(settings.cloudinary?.cloudName && settings.cloudinary?.apiKey && settings.cloudinary?.apiSecret),
          cloudName: settings.cloudinary?.cloudName || null,
          hasApiKey: !!settings.cloudinary?.apiKey,
          hasApiSecret: !!settings.cloudinary?.apiSecret
        },
        mail: {
          configured: !!(settings.mail?.oauth?.clientId && settings.mail?.oauth?.clientSecret),
          provider: settings.mail?.provider || 'google_workspace',
          enabled: settings.mail?.enabled !== false,
          domain: settings.mail?.domain || null,
          hasClientId: !!settings.mail?.oauth?.clientId,
          hasClientSecret: !!settings.mail?.oauth?.clientSecret,
          clientId: settings.mail?.oauth?.clientId || null,
          smtp: settings.mail?.smtp || null
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
router.put('/whatsapp', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
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
router.put('/openai', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { apiKey, model, temperature, enabled, companyName } = req.body;

    // Validate required fields
    if (!apiKey) {
      return res.status(400).json({
        success: false,
        error: 'OpenAI API key is required'
      });
    }

    // Validate company name
    if (!companyName || companyName.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Company name is required'
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
        enabled: enabled !== false,
        companyName: companyName.trim()
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
        enabled: enabled !== false,
        companyName: companyName.trim()
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
router.post('/test-whatsapp', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
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
router.post('/test-openai', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
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
 * Update Cloudinary API settings
 * PUT /api/settings/cloudinary
 */
router.put('/cloudinary', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { cloudName, apiKey, apiSecret } = req.body;

    // Validate required fields
    if (!cloudName || !apiKey || !apiSecret) {
      return res.status(400).json({
        success: false,
        error: 'Cloudinary cloud name, API key, and API secret are required'
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

    // Test Cloudinary configuration before saving
    try {
      const cloudinary = require('cloudinary').v2;
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret
      });

      // Test with a simple API call to verify credentials
      await cloudinary.api.ping();
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: 'Failed to validate Cloudinary configuration: ' + error.message
      });
    }

    // Update tenant settings
    const currentSettings = user.tenant.settings || {};
    const updatedSettings = {
      ...currentSettings,
      cloudinary: {
        cloudName,
        apiKey,
        apiSecret
      }
    };

    await prisma.tenant.update({
      where: { id: user.tenant.id },
      data: { settings: updatedSettings }
    });

    res.json({
      success: true,
      message: 'Cloudinary settings updated successfully',
      settings: {
        configured: true,
        cloudName
      }
    });
  } catch (error) {
    console.error('Error updating Cloudinary settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update Cloudinary settings'
    });
  }
});

/**
 * Test Cloudinary connection
 * POST /api/settings/test-cloudinary
 */
router.post('/test-cloudinary', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { cloudName, apiKey, apiSecret } = req.body;

    if (!cloudName || !apiKey || !apiSecret) {
      return res.status(400).json({
        success: false,
        error: 'Cloud name, API key, and API secret are required'
      });
    }

    // Test the configuration
    try {
      const cloudinary = require('cloudinary').v2;
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret
      });

      // Test with a ping to verify credentials
      await cloudinary.api.ping();

      res.json({
        success: true,
        configured: true,
        message: 'Cloudinary configuration is valid',
        cloudName
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        configured: false,
        error: 'Invalid Cloudinary configuration: ' + error.message
      });
    }
  } catch (error) {
    console.error('Error testing Cloudinary connection:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to test Cloudinary connection: ' + error.message
    });
  }
});

/**
 * Update Mail API settings (Google Workspace OAuth)
 * PUT /api/settings/mail
 */
router.put('/mail', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { provider, enabled, domain, oauth, smtp } = req.body;

    // Validate required fields
    if (!oauth?.clientId || !oauth?.clientSecret) {
      return res.status(400).json({
        success: false,
        error: 'Mail OAuth client ID and client secret are required'
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

    // Validate OAuth client ID format (basic validation)
    if (!oauth.clientId.includes('.apps.googleusercontent.com') && provider === 'google_workspace') {
      return res.status(400).json({
        success: false,
        error: 'Invalid Google OAuth client ID format'
      });
    }

    // Encrypt the client secret before storing
    const encryptedClientSecret = encrypt(oauth.clientSecret);

    // Update tenant settings
    const currentSettings = user.tenant.settings || {};
    const updatedSettings = {
      ...currentSettings,
      mail: {
        provider: provider || 'google_workspace',
        enabled: enabled !== false,
        domain: domain || null,
        oauth: {
          clientId: oauth.clientId,
          clientSecret: encryptedClientSecret,
          allowedDomains: oauth.allowedDomains || []
        },
        smtp: smtp || {
          fromName: user.tenant.name,
          fromEmail: smtp?.fromEmail || `noreply@${domain || 'example.com'}`,
          replyTo: smtp?.replyTo || user.tenant.contactEmail
        },
        features: {
          sendEmail: true,
          readReplies: true,
          threadTracking: true
        }
      }
    };

    await prisma.tenant.update({
      where: { id: user.tenant.id },
      data: { settings: updatedSettings }
    });

    // Log mail configuration update
    console.log(`[Tenant: ${user.tenant.id}] Mail integration configured by user ${userId}`);

    res.json({
      success: true,
      message: 'Mail settings updated successfully',
      settings: {
        configured: true,
        provider: provider || 'google_workspace',
        enabled: enabled !== false,
        domain: domain || null,
        clientId: oauth.clientId
      }
    });
  } catch (error) {
    console.error('Error updating mail settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update mail settings: ' + error.message
    });
  }
});

/**
 * Get Mail settings (detailed view for admins)
 * GET /api/settings/mail
 */
router.get('/mail', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

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

    // Only ADMIN users can view detailed mail settings
    if (user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Only administrators can view mail settings'
      });
    }

    const settings = user.tenant.settings || {};
    const mailSettings = settings.mail || {};

    // Decrypt the client secret if it exists (only for ADMIN viewing their own settings)
    let decryptedClientSecret = null;
    if (mailSettings.oauth?.clientSecret) {
      try {
        decryptedClientSecret = decrypt(mailSettings.oauth.clientSecret);
        console.log('[Mail Settings] Successfully decrypted client secret for display');
      } catch (decryptError) {
        console.error('[Mail Settings] Failed to decrypt client secret:', decryptError.message);
        console.error('[Mail Settings] This usually means ENCRYPTION_KEY has changed or is invalid');
        // Don't throw error, just log it - return null
      }
    }

    // Return settings with decrypted client secret for display
    res.json({
      success: true,
      settings: {
        configured: !!(mailSettings.oauth?.clientId && mailSettings.oauth?.clientSecret),
        provider: mailSettings.provider || 'google_workspace',
        enabled: mailSettings.enabled !== false,
        domain: mailSettings.domain || null,
        oauth: {
          clientId: mailSettings.oauth?.clientId || null,
          clientSecret: decryptedClientSecret, // Send decrypted secret for display
          hasClientSecret: !!mailSettings.oauth?.clientSecret,
          allowedDomains: mailSettings.oauth?.allowedDomains || []
        },
        smtp: mailSettings.smtp || null,
        features: mailSettings.features || {
          sendEmail: true,
          readReplies: true,
          threadTracking: true
        }
      }
    });
  } catch (error) {
    console.error('Error fetching mail settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch mail settings'
    });
  }
});

/**
 * Delete Mail settings
 * DELETE /api/settings/mail
 */
router.delete('/mail', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

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

    // Only ADMIN users can delete API settings
    if (user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Only administrators can delete API settings'
      });
    }

    // Remove mail settings
    const currentSettings = user.tenant.settings || {};
    const updatedSettings = {
      ...currentSettings,
      mail: undefined
    };

    await prisma.tenant.update({
      where: { id: user.tenant.id },
      data: { settings: updatedSettings }
    });

    console.log(`[Tenant: ${user.tenant.id}] Mail integration removed by user ${userId}`);

    res.json({
      success: true,
      message: 'Mail settings removed successfully'
    });
  } catch (error) {
    console.error('Error deleting mail settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete mail settings'
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
