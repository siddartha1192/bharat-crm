const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { tenantContext } = require('../middleware/tenant');
const gmailIntegrationService = require('../services/gmailIntegration');
const { PrismaClient } = require('@prisma/client');
const { decrypt } = require('../utils/encryption');

const prisma = new PrismaClient();

/**
 * Diagnostic endpoint to check Gmail OAuth configuration
 * GET /api/debug/gmail
 */
router.get('/gmail', authenticate, tenantContext, async (req, res) => {
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
        gmailConnectedAt: true,
        gmailScopes: true,
        tenant: {
          select: {
            id: true,
            name: true,
            settings: true,
          },
        },
      },
    });

    const tenant = req.tenant;

    // Check configuration status
    const diagnostic = {
      user: {
        id: user.id,
        email: user.email,
        googleEmail: user.googleEmail,
        hasGmailAccessToken: !!user.gmailAccessToken,
        hasGmailRefreshToken: !!user.gmailRefreshToken,
        gmailTokenExpiry: user.gmailTokenExpiry,
        tokenExpired: user.gmailTokenExpiry ? new Date(user.gmailTokenExpiry) < new Date() : null,
        gmailConnectedAt: user.gmailConnectedAt,
        gmailScopes: user.gmailScopes,
      },
      tenant: {
        id: tenant.id,
        name: tenant.name,
        hasMailOAuthConfig: !!tenant.settings?.mail?.oauth?.clientId,
        mailOAuthClientIdPrefix: tenant.settings?.mail?.oauth?.clientId?.substring(0, 30) + '...',
        hasEncryptedSecret: !!tenant.settings?.mail?.oauth?.clientSecret,
      },
      environment: {
        frontendUrl: process.env.FRONTEND_URL,
        hasEncryptionKey: !!process.env.ENCRYPTION_KEY,
        expectedRedirectUri: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/integrations/gmail/callback`,
      },
      checks: {
        isGmailConnected: gmailIntegrationService.isGmailConnected(user),
        hasTenantConfig: !!tenant.settings?.mail?.oauth?.clientId,
        canDecryptSecret: false,
      },
    };

    // Try to decrypt secret
    if (tenant.settings?.mail?.oauth?.clientSecret) {
      try {
        const decrypted = decrypt(tenant.settings.mail.oauth.clientSecret);
        diagnostic.checks.canDecryptSecret = !!decrypted;
      } catch (e) {
        diagnostic.checks.canDecryptSecret = false;
        diagnostic.checks.decryptError = e.message;
      }
    }

    // Check if we can create OAuth client
    try {
      const oauthClient = gmailIntegrationService.getTenantOAuthClient(tenant);
      diagnostic.checks.canCreateOAuthClient = true;
    } catch (e) {
      diagnostic.checks.canCreateOAuthClient = false;
      diagnostic.checks.oauthClientError = e.message;
    }

    res.json({
      success: true,
      diagnostic,
      recommendations: generateRecommendations(diagnostic),
    });
  } catch (error) {
    console.error('Error in Gmail diagnostic:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

function generateRecommendations(diagnostic) {
  const recommendations = [];

  if (!diagnostic.environment.hasEncryptionKey) {
    recommendations.push({
      priority: 'CRITICAL',
      issue: 'ENCRYPTION_KEY not set',
      solution: 'Run: node scripts/generate-encryption-key.js and add to .env',
    });
  }

  if (!diagnostic.tenant.hasMailOAuthConfig) {
    recommendations.push({
      priority: 'CRITICAL',
      issue: 'Tenant mail OAuth not configured',
      solution: 'Admin: Go to Settings > API Config > Mail Integration and configure OAuth',
    });
  }

  if (!diagnostic.checks.canDecryptSecret && diagnostic.tenant.hasEncryptedSecret) {
    recommendations.push({
      priority: 'CRITICAL',
      issue: 'Cannot decrypt mail OAuth secret',
      solution: 'ENCRYPTION_KEY changed. Admin must reconfigure mail settings in Settings > API Config',
    });
  }

  if (!diagnostic.user.hasGmailRefreshToken) {
    recommendations.push({
      priority: 'HIGH',
      issue: 'User Gmail not connected',
      solution: 'Go to Settings > Integrations and connect Gmail',
    });
  }

  if (diagnostic.user.tokenExpired) {
    recommendations.push({
      priority: 'MEDIUM',
      issue: 'Gmail token expired (will be auto-refreshed on next use)',
      solution: 'Token will automatically refresh when sending email',
    });
  }

  if (diagnostic.user.hasGmailRefreshToken && !diagnostic.checks.canDecryptSecret) {
    recommendations.push({
      priority: 'CRITICAL',
      issue: 'User has Gmail tokens but tenant OAuth config is invalid',
      solution: 'Disconnect and reconnect Gmail after admin fixes OAuth config',
    });
  }

  // Check redirect URI
  if (diagnostic.environment.expectedRedirectUri) {
    recommendations.push({
      priority: 'INFO',
      issue: 'Verify Google Cloud Console redirect URI',
      solution: `Ensure ${diagnostic.environment.expectedRedirectUri} is in authorized redirect URIs`,
    });
  }

  return recommendations;
}

module.exports = router;
