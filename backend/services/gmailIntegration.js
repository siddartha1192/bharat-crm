const { PrismaClient } = require('@prisma/client');
const { google } = require('googleapis');
const { decrypt } = require('../utils/encryption');

const prisma = new PrismaClient();

// Gmail OAuth scopes (service-specific, NOT for login)
const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.modify', // For marking as read, etc.
];

class GmailIntegrationService {
  /**
   * Get tenant-specific OAuth2 client
   *
   * @param {Object} tenant - Tenant object with settings
   * @returns {OAuth2Client} - Configured OAuth2 client
   */
  getTenantOAuthClient(tenant) {
    if (!tenant.settings?.mail?.oauth?.clientId || !tenant.settings?.mail?.oauth?.clientSecret) {
      throw new Error('Tenant mail OAuth not configured. Please configure mail settings first.');
    }

    const clientId = tenant.settings.mail.oauth.clientId;
    const clientSecret = decrypt(tenant.settings.mail.oauth.clientSecret);
    const redirectUri = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/integrations/gmail/callback`;

    return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  }

  /**
   * Generate Gmail authorization URL
   *
   * @param {Object} tenant - Tenant object
   * @param {string} userId - User ID requesting authorization
   * @param {string} state - CSRF protection state parameter
   * @returns {string} - Authorization URL
   */
  getAuthUrl(tenant, userId, state) {
    const oauth2Client = this.getTenantOAuthClient(tenant);

    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: GMAIL_SCOPES,
      prompt: 'consent', // Force consent to ensure refresh token
      state: state || `${userId}-${Date.now()}`, // CSRF protection
    });
  }

  /**
   * Exchange authorization code for tokens
   *
   * @param {Object} tenant - Tenant object
   * @param {string} code - Authorization code from OAuth callback
   * @returns {Promise<Object>} - Tokens object { access_token, refresh_token, expiry_date, scope }
   */
  async getTokensFromCode(tenant, code) {
    const oauth2Client = this.getTenantOAuthClient(tenant);

    try {
      const { tokens } = await oauth2Client.getToken(code);
      return tokens;
    } catch (error) {
      console.error('Error exchanging code for tokens:', error.message);
      throw new Error('Failed to get Gmail tokens: ' + error.message);
    }
  }

  /**
   * Save user Gmail tokens to database
   *
   * @param {string} userId - User ID
   * @param {Object} tokens - Tokens from Google OAuth
   * @returns {Promise<Object>} - Updated user object
   */
  async saveUserTokens(userId, tokens) {
    const expiryDate = tokens.expiry_date ? new Date(tokens.expiry_date) : new Date(Date.now() + 3600 * 1000);

    try {
      const user = await prisma.user.update({
        where: { id: userId },
        data: {
          gmailAccessToken: tokens.access_token,
          gmailRefreshToken: tokens.refresh_token || undefined, // Keep existing if not provided
          gmailTokenExpiry: expiryDate,
          gmailConnectedAt: new Date(),
          gmailScopes: tokens.scope ? tokens.scope.split(' ') : GMAIL_SCOPES,
        },
        select: {
          id: true,
          email: true,
          name: true,
          googleEmail: true,
          gmailConnectedAt: true,
        },
      });

      console.log(`[Gmail Integration] User ${userId} connected Gmail successfully`);
      return user;
    } catch (error) {
      console.error('Error saving Gmail tokens:', error.message);
      throw new Error('Failed to save Gmail tokens: ' + error.message);
    }
  }

  /**
   * Get authenticated Gmail client for user
   *
   * @param {Object} user - User object with Gmail tokens
   * @param {Object} tenant - Tenant object
   * @returns {Promise<google.gmail_v1.Gmail>} - Authenticated Gmail client
   */
  async getAuthenticatedClient(user, tenant) {
    if (!user.gmailAccessToken || !user.gmailRefreshToken) {
      throw new Error('Gmail not connected for this user');
    }

    const oauth2Client = this.getTenantOAuthClient(tenant);

    // Set user credentials
    oauth2Client.setCredentials({
      access_token: user.gmailAccessToken,
      refresh_token: user.gmailRefreshToken,
      expiry_date: user.gmailTokenExpiry ? new Date(user.gmailTokenExpiry).getTime() : undefined,
    });

    // Check if token is expired and refresh if needed
    if (user.gmailTokenExpiry && new Date(user.gmailTokenExpiry) <= new Date()) {
      console.log(`[Gmail Integration] Token expired for user ${user.id}, refreshing...`);
      await this.refreshUserTokens(user.id, tenant);

      // Reload user with new tokens
      const updatedUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: {
          gmailAccessToken: true,
          gmailRefreshToken: true,
          gmailTokenExpiry: true,
        },
      });

      oauth2Client.setCredentials({
        access_token: updatedUser.gmailAccessToken,
        refresh_token: updatedUser.gmailRefreshToken,
        expiry_date: updatedUser.gmailTokenExpiry ? new Date(updatedUser.gmailTokenExpiry).getTime() : undefined,
      });
    }

    return google.gmail({ version: 'v1', auth: oauth2Client });
  }

  /**
   * Refresh expired Gmail tokens
   *
   * @param {string} userId - User ID
   * @param {Object} tenant - Tenant object
   * @returns {Promise<Object>} - New tokens
   */
  async refreshUserTokens(userId, tenant) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        gmailRefreshToken: true,
      },
    });

    if (!user || !user.gmailRefreshToken) {
      throw new Error('No refresh token available for this user');
    }

    const oauth2Client = this.getTenantOAuthClient(tenant);
    oauth2Client.setCredentials({
      refresh_token: user.gmailRefreshToken,
    });

    try {
      const { credentials } = await oauth2Client.refreshAccessToken();

      await prisma.user.update({
        where: { id: userId },
        data: {
          gmailAccessToken: credentials.access_token,
          gmailTokenExpiry: new Date(credentials.expiry_date),
        },
      });

      console.log(`[Gmail Integration] Refreshed tokens for user ${userId}`);
      return credentials;
    } catch (error) {
      console.error('Error refreshing Gmail tokens:', error.message);
      throw new Error('Failed to refresh Gmail tokens: ' + error.message);
    }
  }

  /**
   * Disconnect Gmail integration for user
   *
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - Success message
   */
  async disconnectGmail(userId) {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: {
          gmailAccessToken: null,
          gmailRefreshToken: null,
          gmailTokenExpiry: null,
          gmailConnectedAt: null,
          gmailScopes: null,
        },
      });

      console.log(`[Gmail Integration] User ${userId} disconnected Gmail`);
      return { message: 'Gmail disconnected successfully' };
    } catch (error) {
      console.error('Error disconnecting Gmail:', error.message);
      throw new Error('Failed to disconnect Gmail: ' + error.message);
    }
  }

  /**
   * Check if user has Gmail connected
   *
   * @param {Object} user - User object
   * @returns {boolean} - True if Gmail is connected
   */
  isGmailConnected(user) {
    return !!(user.gmailAccessToken && user.gmailRefreshToken);
  }

  /**
   * Get Gmail connection status for user
   *
   * @param {Object} user - User object
   * @returns {Object} - Connection status details
   */
  getConnectionStatus(user) {
    const connected = this.isGmailConnected(user);

    return {
      connected,
      email: connected ? user.googleEmail || user.email : null,
      scopes: connected ? user.gmailScopes : null,
      connectedAt: connected ? user.gmailConnectedAt : null,
      tokenExpiry: connected ? user.gmailTokenExpiry : null,
      tokenExpired: connected && user.gmailTokenExpiry
        ? new Date(user.gmailTokenExpiry) <= new Date()
        : null,
    };
  }
}

module.exports = new GmailIntegrationService();
