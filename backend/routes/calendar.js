const express = require('express');
const router = express.Router();
const googleCalendarService = require('../services/googleCalendar');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const prisma = new PrismaClient();

// Apply authentication to all routes
router.use(authenticate);

// Get Google Calendar authorization URL
router.get('/auth/url', (req, res) => {
  try {
    if (!googleCalendarService.isConfigured()) {
      return res.status(503).json({
        error: 'Google Calendar not configured',
        message: 'Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in environment variables'
      });
    }

    const authUrl = googleCalendarService.getAuthUrl();
    res.json({ authUrl });
  } catch (error) {
    console.error('Error generating auth URL:', error);
    res.status(500).json({ error: 'Failed to generate authorization URL' });
  }
});

// Handle OAuth callback and store tokens
router.post('/auth/callback', async (req, res) => {
  try {
    const { code, userId } = req.body;

    if (!code || !userId) {
      return res.status(400).json({ error: 'Code and userId are required' });
    }

    // Exchange code for tokens
    const tokens = await googleCalendarService.getTokensFromCode(code);

    // Store tokens in database
    await prisma.user.update({
      where: { id: userId },
      data: {
        googleAccessToken: tokens.access_token,
        googleRefreshToken: tokens.refresh_token,
        googleTokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null
      }
    });

    res.json({ success: true, message: 'Google Calendar connected successfully' });
  } catch (error) {
    console.error('Error handling OAuth callback:', error);
    res.status(500).json({ error: 'Failed to connect Google Calendar' });
  }
});

// Disconnect Google Calendar
router.post('/auth/disconnect', async (req, res) => {
  try {
    const userId = req.user.id;

    await prisma.user.update({
      where: { id: userId },
      data: {
        googleAccessToken: null,
        googleRefreshToken: null,
        googleTokenExpiry: null
      }
    });

    res.json({ success: true, message: 'Google Calendar disconnected' });
  } catch (error) {
    console.error('Error disconnecting Google Calendar:', error);
    res.status(500).json({ error: 'Failed to disconnect Google Calendar' });
  }
});

// Check connection status
router.get('/auth/status', async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        googleAccessToken: true,
        googleRefreshToken: true,
        googleTokenExpiry: true
      }
    });

    const isConnected = !!(user?.googleAccessToken && user?.googleRefreshToken);

    res.json({
      connected: isConnected,
      configured: googleCalendarService.isConfigured()
    });
  } catch (error) {
    console.error('Error checking connection status:', error);
    res.status(500).json({ error: 'Failed to check connection status' });
  }
});

// Get all events
router.get('/events', async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        googleAccessToken: true,
        googleRefreshToken: true
      }
    });

    let events = [];

    // Fetch from database
    const dbEvents = await prisma.calendarEvent.findMany({
      where: {
        userId,
        ...(start && { startTime: { gte: new Date(start) } }),
        ...(end && { endTime: { lte: new Date(end) } })
      },
      orderBy: { startTime: 'asc' }
    });

    events = dbEvents;

    // Sync with Google Calendar if connected and requested
    if (syncWithGoogle === 'true' && user?.googleAccessToken && user?.googleRefreshToken) {
      try {
        const auth = await googleCalendarService.getAuthenticatedClient(
          user.googleAccessToken,
          user.googleRefreshToken
        );

        const googleEvents = await googleCalendarService.listEvents(auth, start, end);

        // Sync Google events to database
        for (const gEvent of googleEvents) {
          const existingEvent = await prisma.calendarEvent.findFirst({
            where: { googleEventId: gEvent.id }
          });

          if (!existingEvent) {
            // Create new event in database
            const newEvent = await prisma.calendarEvent.create({
              data: {
                userId,
                title: gEvent.summary || 'Untitled Event',
                description: gEvent.description || '',
                startTime: new Date(gEvent.start?.dateTime || gEvent.start?.date),
                endTime: new Date(gEvent.end?.dateTime || gEvent.end?.date),
                location: gEvent.location || '',
                attendees: (gEvent.attendees || []).map(a => a.email),
                googleEventId: gEvent.id,
                isAllDay: !!gEvent.start?.date
              }
            });
            events.push(newEvent);
          }
        }
      } catch (error) {
        console.error('Error syncing with Google Calendar:', error);
        // Continue with database events even if Google sync fails
      }
    }

    res.json({ events });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// Create event
router.post('/events', async (req, res) => {
  try {
    const userId = req.user.id;

    if (!title || !startTime || !endTime) {
      return res.status(400).json({ error: 'Title, start time, and end time are required' });
    }

    let googleEventId = null;

    // Create in Google Calendar if connected and sync is requested
    if (syncWithGoogle) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          googleAccessToken: true,
          googleRefreshToken: true
        }
      });

      if (user?.googleAccessToken && user?.googleRefreshToken) {
        try {
          const auth = await googleCalendarService.getAuthenticatedClient(
            user.googleAccessToken,
            user.googleRefreshToken
          );

          const googleEvent = await googleCalendarService.createEvent(auth, {
            title,
            description,
            startTime,
            endTime,
            location,
            attendees,
            isAllDay,
            reminders
          });

          googleEventId = googleEvent.id;
        } catch (error) {
          console.error('Error creating Google Calendar event:', error);
          // Continue creating in database even if Google fails
        }
      }
    }

    // Create in database
    const event = await prisma.calendarEvent.create({
      data: {
        userId,
        title,
        description: description || '',
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        location: location || '',
        attendees: attendees || [],
        isAllDay: isAllDay || false,
        color: color || 'blue',
        reminders,
        googleEventId
      }
    });

    res.json({ event });
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// Update event
router.put('/events/:eventId', async (req, res) => {
  try {
    const userId = req.user.id;

    const existingEvent = await prisma.calendarEvent.findFirst({
      where: {
        id: eventId,
        userId
      }
    });

    if (!existingEvent) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Update in Google Calendar if connected and event has googleEventId
    if (syncWithGoogle && existingEvent.googleEventId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          googleAccessToken: true,
          googleRefreshToken: true
        }
      });

      if (user?.googleAccessToken && user?.googleRefreshToken) {
        try {
          const auth = await googleCalendarService.getAuthenticatedClient(
            user.googleAccessToken,
            user.googleRefreshToken
          );

          await googleCalendarService.updateEvent(auth, existingEvent.googleEventId, {
            title,
            description,
            startTime,
            endTime,
            location,
            attendees,
            isAllDay,
            reminders
          });
        } catch (error) {
          console.error('Error updating Google Calendar event:', error);
        }
      }
    }

    // Update in database
    const updatedEvent = await prisma.calendarEvent.update({
      where: { id: eventId },
      data: {
        title,
        description,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        location,
        attendees,
        isAllDay,
        color,
        reminders
      }
    });

    res.json({ event: updatedEvent });
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ error: 'Failed to update event' });
  }
});

// Delete event
router.delete('/events/:eventId', async (req, res) => {
  try {
    const userId = req.user.id;

    const event = await prisma.calendarEvent.findFirst({
      where: {
        id: eventId,
        userId
      }
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Delete from Google Calendar if it exists there
    if (event.googleEventId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          googleAccessToken: true,
          googleRefreshToken: true
        }
      });

      if (user?.googleAccessToken && user?.googleRefreshToken) {
        try {
          const auth = await googleCalendarService.getAuthenticatedClient(
            user.googleAccessToken,
            user.googleRefreshToken
          );

          await googleCalendarService.deleteEvent(auth, event.googleEventId);
        } catch (error) {
          console.error('Error deleting from Google Calendar:', error);
        }
      }
    }

    // Delete from database
    await prisma.calendarEvent.delete({
      where: { id: eventId }
    });

    res.json({ success: true, message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

module.exports = router;
