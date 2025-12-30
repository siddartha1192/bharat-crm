const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/auth');
const { tenantContext } = require('../../middleware/tenant');
const gmailIntegrationService = require('../../services/gmailIntegration');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Get Gmail OAuth authorization URL
 * GET /api/integrations/gmail/auth/url
 */
router.get('/auth/url', authenticate, tenantContext, async (req, res) => {
  try {
    const user = req.user;
    const tenant = req.tenant;

    // Check if tenant has mail configuration
    if (!tenant.settings?.mail?.oauth?.clientId) {
      return res.status(400).json({
        success: false,
        error: 'Mail integration not configured',
        message: 'Please ask your administrator to configure mail settings first',
        action: 'contact_admin',
      });
    }

    // Generate CSRF state token
    const state = `${user.id}-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // Get authorization URL
    const authUrl = gmailIntegrationService.getAuthUrl(tenant, user.id, state);

    // Optionally store state in session or database for verification (recommended for production)
    // For now, we'll include userId in state and verify it in callback

    res.json({
      success: true,
      authUrl,
      message: 'Please visit the URL to authorize Gmail access',
    });
  } catch (error) {
    console.error('Error generating Gmail auth URL:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate authorization URL: ' + error.message,
    });
  }
});

/**
 * Gmail OAuth callback handler
 * POST /api/integrations/gmail/callback
 */
router.post('/callback', authenticate, tenantContext, async (req, res) => {
  try {
    const user = req.user;
    const tenant = req.tenant;
    const { code, state } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'Authorization code is required',
      });
    }

    // Verify state parameter (basic check - extract userId)
    if (state && !state.startsWith(user.id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid state parameter - possible CSRF attack',
      });
    }

    // Exchange code for tokens
    const tokens = await gmailIntegrationService.getTokensFromCode(tenant, code);

    // Save tokens to user record
    const updatedUser = await gmailIntegrationService.saveUserTokens(user.id, tokens);

    res.json({
      success: true,
      message: 'Gmail connected successfully',
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        gmailConnected: true,
        gmailConnectedAt: updatedUser.gmailConnectedAt,
      },
    });
  } catch (error) {
    console.error('Error in Gmail OAuth callback:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to connect Gmail: ' + error.message,
    });
  }
});

/**
 * Get Gmail connection status
 * GET /api/integrations/gmail/status
 */
router.get('/status', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        googleEmail: true,
        gmailAccessToken: true,
        gmailRefreshToken: true,
        gmailTokenExpiry: true,
        gmailConnectedAt: true,
        gmailScopes: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    const status = gmailIntegrationService.getConnectionStatus(user);

    res.json({
      success: true,
      status,
    });
  } catch (error) {
    console.error('Error fetching Gmail status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch Gmail status: ' + error.message,
    });
  }
});

/**
 * Disconnect Gmail integration
 * POST /api/integrations/gmail/disconnect
 */
router.post('/disconnect', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await gmailIntegrationService.disconnectGmail(userId);

    res.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    console.error('Error disconnecting Gmail:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to disconnect Gmail: ' + error.message,
    });
  }
});

/**
 * Test Gmail connection by sending a test email to self
 * POST /api/integrations/gmail/test
 */
router.post('/test', authenticate, tenantContext, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        googleEmail: true,
        gmailAccessToken: true,
        gmailRefreshToken: true,
        gmailTokenExpiry: true,
      },
    });

    const tenant = req.tenant;

    // Check if Gmail is connected
    if (!gmailIntegrationService.isGmailConnected(user)) {
      return res.status(400).json({
        success: false,
        error: 'Gmail not connected',
        message: 'Please connect your Gmail account first',
      });
    }

    // Get authenticated Gmail client
    const gmail = await gmailIntegrationService.getAuthenticatedClient(user, tenant);

    // Send test email to self
    const emailContent = [
      `To: ${user.googleEmail || user.email}`,
      'Subject: Gmail Integration Test - Bharat CRM',
      '',
      'This is a test email from Bharat CRM Gmail integration.',
      '',
      'If you receive this email, your Gmail integration is working correctly!',
      '',
      `Sent at: ${new Date().toLocaleString()}`,
    ].join('\n');

    const encodedEmail = Buffer.from(emailContent).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedEmail,
      },
    });

    res.json({
      success: true,
      message: 'Test email sent successfully! Check your inbox.',
    });
  } catch (error) {
    console.error('Error testing Gmail connection:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send test email: ' + error.message,
    });
  }
});

module.exports = router;
