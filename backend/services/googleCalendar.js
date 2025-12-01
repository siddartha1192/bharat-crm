const { google } = require('googleapis');

class GoogleCalendarService {
  constructor() {
    this.clientId = process.env.GOOGLE_CLIENT_ID;
    this.clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    this.redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5173/calendar/callback';
  }

  // Create OAuth2 client
  getOAuth2Client() {
    return new google.auth.OAuth2(
      this.clientId,
      this.clientSecret,
      this.redirectUri
    );
  }

  // Generate auth URL for user to authorize
  getAuthUrl() {
    const oauth2Client = this.getOAuth2Client();

    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events'
    ];

    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent'
    });
  }

  // Exchange authorization code for tokens
  async getTokensFromCode(code) {
    const oauth2Client = this.getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);
    return tokens;
  }

  // Set credentials from stored tokens
  async getAuthenticatedClient(accessToken, refreshToken) {
    const oauth2Client = this.getOAuth2Client();
    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken
    });

    // Refresh token if expired
    oauth2Client.on('tokens', (tokens) => {
      if (tokens.refresh_token) {
        // Update refresh token in database
        console.log('New refresh token:', tokens.refresh_token);
      }
      console.log('New access token:', tokens.access_token);
    });

    return oauth2Client;
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
