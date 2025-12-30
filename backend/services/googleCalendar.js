const { google } = require('googleapis');
const { decrypt } = require('../utils/encryption');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Calendar OAuth scopes (service-specific, NOT for login)
const CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events'
];

class GoogleCalendarService {
  constructor() {
    // Global fallback credentials
    this.globalClientId = process.env.GOOGLE_CLIENT_ID;
    this.globalClientSecret = process.env.GOOGLE_CLIENT_SECRET;
    this.globalRedirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5173/calendar/callback';
  }

  /**
   * Get tenant-specific OAuth2 client or fallback to global
   * @param {Object} tenant - Tenant object with settings
   * @returns {OAuth2Client} - Configured OAuth2 client
   */
  getOAuth2Client(tenant = null) {
    // Try tenant-specific configuration first
    if (tenant?.settings?.mail?.oauth?.clientId && tenant?.settings?.mail?.oauth?.clientSecret) {
      try {
        const clientId = tenant.settings.mail.oauth.clientId;
        const clientSecret = decrypt(tenant.settings.mail.oauth.clientSecret);
        const redirectUri = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/calendar/callback`;

        console.log(`📅 [Tenant: ${tenant.id}] Using tenant-specific Calendar OAuth`);

        return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
      } catch (error) {
        // Check if it's a decryption error
        if (error.message && error.message.includes('decrypt')) {
          console.error(`❌ [Tenant: ${tenant?.id}] Failed to decrypt OAuth client secret: ${error.message}`);
          console.error('💡 This usually happens when ENCRYPTION_KEY is not set in .env or has changed');
          console.error('📝 Solution: Set ENCRYPTION_KEY in .env and reconfigure mail settings');

          // Don't fallback on decryption errors - user needs to fix configuration
          throw new Error(
            'Cannot decrypt mail configuration. Please ask your administrator to:\n' +
            '1. Set ENCRYPTION_KEY in .env file\n' +
            '2. Reconfigure mail settings in Settings > API Config > Mail Integration'
          );
        }

        console.error(`❌ [Tenant: ${tenant?.id}] Error creating tenant Calendar OAuth client: ${error.message}`);
        console.log('🔄 [FALLBACK] Using global Calendar OAuth credentials');
      }
    }

    // Fallback to global credentials
    if (!this.globalClientId || !this.globalClientSecret) {
      throw new Error('Calendar OAuth not configured. Please either configure tenant mail settings or set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env');
    }

    return new google.auth.OAuth2(
      this.globalClientId,
      this.globalClientSecret,
      this.globalRedirectUri
    );
  }

  /**
   * Generate authorization URL for Calendar integration
   * @param {Object} tenant - Tenant object
   * @param {string} userId - User ID requesting authorization
   * @param {string} state - CSRF protection state parameter
   * @returns {string} - Authorization URL
   */
  getAuthUrl(tenant = null, userId = null, state = null) {
    const oauth2Client = this.getOAuth2Client(tenant);

    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: CALENDAR_SCOPES,
      prompt: 'consent',
      state: state || `${userId}-${Date.now()}`,
    });
  }

  /**
   * Exchange authorization code for tokens
   * @param {string} code - Authorization code
   * @param {Object} tenant - Tenant object
   * @returns {Promise<Object>} - Tokens object
   */
  async getTokensFromCode(code, tenant = null) {
    const oauth2Client = this.getOAuth2Client(tenant);
    const { tokens } = await oauth2Client.getToken(code);
    return tokens;
  }

  /**
   * Save user calendar tokens to database
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
          calendarAccessToken: tokens.access_token,
          calendarRefreshToken: tokens.refresh_token || undefined,
          calendarTokenExpiry: expiryDate,
          calendarConnectedAt: new Date(),
          calendarScopes: tokens.scope ? tokens.scope.split(' ') : CALENDAR_SCOPES,
        },
        select: {
          id: true,
          email: true,
          name: true,
          calendarConnectedAt: true,
        },
      });

      console.log(`[Calendar Integration] User ${userId} connected Calendar successfully`);
      return user;
    } catch (error) {
      console.error('Error saving Calendar tokens:', error.message);
      throw new Error('Failed to save Calendar tokens: ' + error.message);
    }
  }

  /**
   * Get authenticated Calendar client for user with tenant-specific config
   * @param {Object} user - User object with calendar tokens
   * @param {Object} tenant - Tenant object
   * @returns {Promise<OAuth2Client>} - Authenticated OAuth2 client
   */
  async getAuthenticatedClient(user, tenant = null) {
    if (!user.calendarAccessToken || !user.calendarRefreshToken) {
      throw new Error('Calendar not connected for this user');
    }

    const oauth2Client = this.getOAuth2Client(tenant);

    oauth2Client.setCredentials({
      access_token: user.calendarAccessToken,
      refresh_token: user.calendarRefreshToken,
      expiry_date: user.calendarTokenExpiry ? new Date(user.calendarTokenExpiry).getTime() : undefined,
    });

    // Check if token is expired and refresh if needed
    if (user.calendarTokenExpiry && new Date(user.calendarTokenExpiry) <= new Date()) {
      console.log(`[Calendar Integration] Token expired for user ${user.id}, refreshing...`);
      await this.refreshUserTokens(user.id, tenant);

      // Reload user with new tokens
      const updatedUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: {
          calendarAccessToken: true,
          calendarRefreshToken: true,
          calendarTokenExpiry: true,
        },
      });

      oauth2Client.setCredentials({
        access_token: updatedUser.calendarAccessToken,
        refresh_token: updatedUser.calendarRefreshToken,
        expiry_date: updatedUser.calendarTokenExpiry ? new Date(updatedUser.calendarTokenExpiry).getTime() : undefined,
      });
    }

    // Refresh token if expired
    oauth2Client.on('tokens', (tokens) => {
      if (tokens.refresh_token) {
        console.log('New Calendar refresh token received');
      }
      console.log('New Calendar access token received');
    });

    return oauth2Client;
  }

  /**
   * Refresh expired Calendar tokens
   * @param {string} userId - User ID
   * @param {Object} tenant - Tenant object
   * @returns {Promise<Object>} - New tokens
   */
  async refreshUserTokens(userId, tenant = null) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        calendarRefreshToken: true,
      },
    });

    if (!user || !user.calendarRefreshToken) {
      throw new Error('No refresh token available for this user');
    }

    const oauth2Client = this.getOAuth2Client(tenant);
    oauth2Client.setCredentials({
      refresh_token: user.calendarRefreshToken,
    });

    try {
      const { credentials } = await oauth2Client.refreshAccessToken();

      await prisma.user.update({
        where: { id: userId },
        data: {
          calendarAccessToken: credentials.access_token,
          calendarTokenExpiry: new Date(credentials.expiry_date),
        },
      });

      console.log(`[Calendar Integration] Refreshed tokens for user ${userId}`);
      return credentials;
    } catch (error) {
      console.error('Error refreshing Calendar tokens:', error.message);
      throw new Error('Failed to refresh Calendar tokens: ' + error.message);
    }
  }

  /**
   * Disconnect Calendar integration for user
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - Success message
   */
  async disconnectCalendar(userId) {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: {
          calendarAccessToken: null,
          calendarRefreshToken: null,
          calendarTokenExpiry: null,
          calendarConnectedAt: null,
          calendarScopes: null,
        },
      });

      console.log(`[Calendar Integration] User ${userId} disconnected Calendar`);
      return { message: 'Calendar disconnected successfully' };
    } catch (error) {
      console.error('Error disconnecting Calendar:', error.message);
      throw new Error('Failed to disconnect Calendar: ' + error.message);
    }
  }

  /**
   * Check if user has Calendar connected
   * @param {Object} user - User object
   * @returns {boolean} - True if Calendar is connected
   */
  isCalendarConnected(user) {
    return !!user.calendarAccessToken && !!user.calendarRefreshToken;
  }

  /**
   * Get Calendar connection status for user
   * @param {Object} user - User object
   * @returns {Object} - Connection status details
   */
  getConnectionStatus(user) {
    const connected = this.isCalendarConnected(user);

    return {
      connected,
      scopes: connected ? (user.calendarScopes || null) : null,
      connectedAt: connected ? (user.calendarConnectedAt || null) : null,
      tokenExpiry: connected ? user.calendarTokenExpiry : null,
      tokenExpired: connected && user.calendarTokenExpiry
        ? new Date(user.calendarTokenExpiry) <= new Date()
        : null,
    };
  }

  // List events from Google Calendar
  async listEvents(auth, timeMin, timeMax) {
    const calendar = google.calendar({ version: 'v3', auth });

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: timeMin || new Date().toISOString(),
      timeMax: timeMax,
      maxResults: 100,
      singleEvents: true,
      orderBy: 'startTime',
    });

    return response.data.items || [];
  }

  // Create event in Google Calendar
  async createEvent(auth, eventData) {
    const calendar = google.calendar({ version: 'v3', auth });

    const event = {
      summary: eventData.title,
      description: eventData.description || '',
      location: eventData.location || '',
      start: {
        dateTime: eventData.startTime,
        timeZone: eventData.timeZone || 'Asia/Kolkata',
      },
      end: {
        dateTime: eventData.endTime,
        timeZone: eventData.timeZone || 'Asia/Kolkata',
      },
      attendees: (eventData.attendees || []).map(email => ({ email })),
      reminders: eventData.reminders || {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 },
          { method: 'popup', minutes: 30 },
        ],
      },
    };

    if (eventData.isAllDay) {
      event.start = {
        date: eventData.startTime.split('T')[0],
        timeZone: eventData.timeZone || 'Asia/Kolkata',
      };
      event.end = {
        date: eventData.endTime.split('T')[0],
        timeZone: eventData.timeZone || 'Asia/Kolkata',
      };
    }

    const response = await calendar.events.insert({
      calendarId: 'primary',
      resource: event,
      sendUpdates: 'all',
    });

    return response.data;
  }

  // Update event in Google Calendar
  async updateEvent(auth, eventId, eventData) {
    const calendar = google.calendar({ version: 'v3', auth });

    const event = {
      summary: eventData.title,
      description: eventData.description || '',
      location: eventData.location || '',
      start: {
        dateTime: eventData.startTime,
        timeZone: eventData.timeZone || 'Asia/Kolkata',
      },
      end: {
        dateTime: eventData.endTime,
        timeZone: eventData.timeZone || 'Asia/Kolkata',
      },
      attendees: (eventData.attendees || []).map(email => ({ email })),
      reminders: eventData.reminders || {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 },
          { method: 'popup', minutes: 30 },
        ],
      },
    };

    if (eventData.isAllDay) {
      event.start = {
        date: eventData.startTime.split('T')[0],
        timeZone: eventData.timeZone || 'Asia/Kolkata',
      };
      event.end = {
        date: eventData.endTime.split('T')[0],
        timeZone: eventData.timeZone || 'Asia/Kolkata',
      };
    }

    const response = await calendar.events.update({
      calendarId: 'primary',
      eventId: eventId,
      resource: event,
      sendUpdates: 'all',
    });

    return response.data;
  }

  // Delete event from Google Calendar
  async deleteEvent(auth, eventId) {
    const calendar = google.calendar({ version: 'v3', auth });

    await calendar.events.delete({
      calendarId: 'primary',
      eventId: eventId,
      sendUpdates: 'all',
    });

    return { success: true };
  }

  // Get single event
  async getEvent(auth, eventId) {
    const calendar = google.calendar({ version: 'v3', auth });

    const response = await calendar.events.get({
      calendarId: 'primary',
      eventId: eventId,
    });

    return response.data;
  }

  // Check if user has connected Google Calendar
  isConfigured() {
    return !!(this.clientId && this.clientSecret);
  }
}

module.exports = new GoogleCalendarService();
