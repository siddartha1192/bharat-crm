const express = require('express');
const router = express.Router();
const googleCalendarService = require('../services/googleCalendar');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const { tenantContext, getTenantFilter, autoInjectTenantId } = require('../middleware/tenant');
const prisma = new PrismaClient();

// Apply authentication to all routes
router.use(authenticate);
router.use(tenantContext);

// Get Google Calendar authorization URL
router.get('/auth/url', (req, res) => {
  try {
    const user = req.user;
    const tenant = req.tenant;

    // Generate CSRF state token
    const state = `${user.id}-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // Get authorization URL (with tenant-specific OAuth if configured)
    const authUrl = googleCalendarService.getAuthUrl(tenant, user.id, state);

    res.json({
      success: true,
      authUrl,
      message: 'Please visit the URL to authorize Calendar access',
    });
  } catch (error) {
    console.error('Error generating auth URL:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate authorization URL: ' + error.message,
    });
  }
});

// Handle OAuth callback and store tokens
router.post('/auth/callback', async (req, res) => {
  try {
    const { code, state } = req.body;
    const user = req.user;
    const tenant = req.tenant;

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
    const tokens = await googleCalendarService.getTokensFromCode(code, tenant);

    // Save tokens to user record
    const updatedUser = await googleCalendarService.saveUserTokens(user.id, tokens);

    res.json({
      success: true,
      message: 'Google Calendar connected successfully',
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        calendarConnected: true,
        calendarConnectedAt: updatedUser.calendarConnectedAt,
      },
    });
  } catch (error) {
    console.error('Error handling OAuth callback:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to connect Google Calendar: ' + error.message,
    });
  }
});

// Disconnect Google Calendar
router.post('/auth/disconnect', async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await googleCalendarService.disconnectCalendar(userId);

    res.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    console.error('Error disconnecting Google Calendar:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to disconnect Google Calendar: ' + error.message,
    });
  }
});

// Check connection status
router.get('/auth/status', async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        calendarAccessToken: true,
        calendarRefreshToken: true,
        calendarTokenExpiry: true,
        calendarConnectedAt: true,
        calendarScopes: true,
        // Backward compatibility
        googleAccessToken: true,
        googleRefreshToken: true,
        googleTokenExpiry: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    const status = googleCalendarService.getConnectionStatus(user);

    res.json({
      success: true,
      status,
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
    const tenant = req.tenant;
    const { start, end, syncWithGoogle } = req.query;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        calendarAccessToken: true,
        calendarRefreshToken: true,
        calendarTokenExpiry: true,
        // Backward compatibility
        googleAccessToken: true,
        googleRefreshToken: true,
        googleTokenExpiry: true,
      }
    });

    let events = [];

    // Fetch from database
    const dbEvents = await prisma.calendarEvent.findMany({
      where: getTenantFilter(req, {
        userId,
        ...(start && { startTime: { gte: new Date(start) } }),
        ...(end && { endTime: { lte: new Date(end) } })
      }),
      orderBy: { startTime: 'asc' }
    });

    events = dbEvents;

    // Sync with Google Calendar if connected and requested
    if (syncWithGoogle === 'true' && googleCalendarService.isCalendarConnected(user)) {
      try {
        const auth = await googleCalendarService.getAuthenticatedClient(user, tenant);
        const googleEvents = await googleCalendarService.listEvents(auth, start, end);

        // Sync Google events to database
        for (const gEvent of googleEvents) {
          const existingEvent = await prisma.calendarEvent.findFirst({
            where: getTenantFilter(req, { googleEventId: gEvent.id })
          });

          if (!existingEvent) {
            // Create new event in database
            const newEvent = await prisma.calendarEvent.create({
              data: {
                userId,
                tenantId: req.tenant.id,
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
    const { title, description, startTime, endTime, location, attendees, isAllDay, color, reminders, syncWithGoogle } = req.body;

    if (!title || !startTime || !endTime) {
      return res.status(400).json({ error: 'Title, start time, and end time are required' });
    }

    let googleEventId = null;

    // Create in Google Calendar if connected and sync is requested
    if (syncWithGoogle) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          calendarAccessToken: true,
          calendarRefreshToken: true,
          calendarTokenExpiry: true,
          googleAccessToken: true,
          googleRefreshToken: true,
        }
      });

      if (googleCalendarService.isCalendarConnected(user)) {
        try {
          const auth = await googleCalendarService.getAuthenticatedClient(user, req.tenant);

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
        tenantId: req.tenant.id,
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
    const { eventId } = req.params;
    const { title, description, startTime, endTime, location, attendees, isAllDay, color, reminders, syncWithGoogle } = req.body;

    const existingEvent = await prisma.calendarEvent.findFirst({
      where: getTenantFilter(req, {
        id: eventId,
        userId
      })
    });

    if (!existingEvent) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Update in Google Calendar if connected and event has googleEventId
    if (syncWithGoogle && existingEvent.googleEventId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          calendarAccessToken: true,
          calendarRefreshToken: true,
          calendarTokenExpiry: true,
          googleAccessToken: true,
          googleRefreshToken: true,
        }
      });

      if (googleCalendarService.isCalendarConnected(user)) {
        try {
          const auth = await googleCalendarService.getAuthenticatedClient(user, req.tenant);

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
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (startTime !== undefined) updateData.startTime = new Date(startTime);
    if (endTime !== undefined) updateData.endTime = new Date(endTime);
    if (location !== undefined) updateData.location = location;
    if (attendees !== undefined) updateData.attendees = attendees;
    if (isAllDay !== undefined) updateData.isAllDay = isAllDay;
    if (color !== undefined) updateData.color = color;
    if (reminders !== undefined) updateData.reminders = reminders;

    const updatedEvent = await prisma.calendarEvent.update({
      where: { id: eventId },
      data: updateData
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
    const { eventId } = req.params;

    const event = await prisma.calendarEvent.findFirst({
      where: getTenantFilter(req, {
        id: eventId,
        userId
      })
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Delete from Google Calendar if it exists there
    if (event.googleEventId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          calendarAccessToken: true,
          calendarRefreshToken: true,
          calendarTokenExpiry: true,
          googleAccessToken: true,
          googleRefreshToken: true,
        }
      });

      if (googleCalendarService.isCalendarConnected(user)) {
        try {
          const auth = await googleCalendarService.getAuthenticatedClient(user, req.tenant);

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
