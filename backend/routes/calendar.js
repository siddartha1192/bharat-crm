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

    console.log(`[Calendar Status] Checking for user: ${userId}`);

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
      },
    });

    if (!user) {
      console.error(`[Calendar Status] User not found: ${userId}`);
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    console.log(`[Calendar Status] User found, getting connection status...`);
    const status = googleCalendarService.getConnectionStatus(user);

    console.log(`[Calendar Status] Status:`, status);

    res.json({
      success: true,
      status,
    });
  } catch (error) {
    console.error('[Calendar Status] Error:', error);
    console.error('[Calendar Status] Error stack:', error.stack);
    res.status(500).json({
      success: false,
      error: 'Failed to check connection status: ' + error.message,
    });
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

    // Get user calendar connection status
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        calendarAccessToken: true,
        calendarRefreshToken: true,
        calendarTokenExpiry: true,
      }
    });

    let googleEventId = null;
    let syncError = null;

    // AUTO-SYNC: Always sync to Google Calendar if connected (unless explicitly disabled)
    const shouldSync = syncWithGoogle !== false && googleCalendarService.isCalendarConnected(user);

    if (shouldSync) {
      try {
        console.log(`[Calendar Create] Syncing event to Google Calendar for user ${userId}`);
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
        console.log(`[Calendar Create] Successfully synced to Google Calendar: ${googleEventId}`);
      } catch (error) {
        console.error('[Calendar Create] Error syncing to Google Calendar:', error);
        syncError = error.message;

        // If it's a token error, mark it clearly
        if (error.message.includes('invalid_grant') || error.message.includes('Token has been expired')) {
          syncError = 'Calendar token expired. Please reconnect your Google Calendar in Settings.';
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
        googleEventId,
        syncStatus: googleEventId ? 'synced' : (syncError ? 'error' : 'local_only'),
        lastSyncError: syncError
      }
    });

    res.json({
      event,
      syncStatus: {
        synced: !!googleEventId,
        error: syncError
      }
    });
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ error: 'Failed to create event: ' + error.message });
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

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        calendarAccessToken: true,
        calendarRefreshToken: true,
        calendarTokenExpiry: true,
      }
    });

    let syncError = null;
    let newGoogleEventId = existingEvent.googleEventId;

    // AUTO-SYNC: Sync to Google Calendar if user wants sync and Google Calendar is connected
    const shouldSync = syncWithGoogle !== false && googleCalendarService.isCalendarConnected(user);

    if (shouldSync) {
      try {
        const auth = await googleCalendarService.getAuthenticatedClient(user, req.tenant);

        // If event doesn't have googleEventId yet, create it in Google Calendar
        if (!existingEvent.googleEventId) {
          console.log(`[Calendar Update] Event has no googleEventId, creating in Google Calendar`);
          const googleEvent = await googleCalendarService.createEvent(auth, {
            title: title !== undefined ? title : existingEvent.title,
            description: description !== undefined ? description : existingEvent.description,
            startTime: startTime !== undefined ? startTime : existingEvent.startTime.toISOString(),
            endTime: endTime !== undefined ? endTime : existingEvent.endTime.toISOString(),
            location: location !== undefined ? location : existingEvent.location,
            attendees: attendees !== undefined ? attendees : existingEvent.attendees,
            isAllDay: isAllDay !== undefined ? isAllDay : existingEvent.isAllDay,
            reminders: reminders !== undefined ? reminders : existingEvent.reminders
          });
          newGoogleEventId = googleEvent.id;
          console.log(`[Calendar Update] Created in Google Calendar with ID: ${newGoogleEventId}`);
        } else {
          // Update existing Google Calendar event
          console.log(`[Calendar Update] Updating event ${eventId} in Google Calendar`);
          await googleCalendarService.updateEvent(auth, existingEvent.googleEventId, {
            title: title !== undefined ? title : existingEvent.title,
            description: description !== undefined ? description : existingEvent.description,
            startTime: startTime !== undefined ? startTime : existingEvent.startTime.toISOString(),
            endTime: endTime !== undefined ? endTime : existingEvent.endTime.toISOString(),
            location: location !== undefined ? location : existingEvent.location,
            attendees: attendees !== undefined ? attendees : existingEvent.attendees,
            isAllDay: isAllDay !== undefined ? isAllDay : existingEvent.isAllDay,
            reminders: reminders !== undefined ? reminders : existingEvent.reminders
          });
          console.log(`[Calendar Update] Successfully synced to Google Calendar`);
        }
      } catch (error) {
        console.error('[Calendar Update] Error syncing to Google Calendar:', error);
        syncError = error.message;

        if (error.message.includes('invalid_grant') || error.message.includes('Token has been expired')) {
          syncError = 'Calendar token expired. Please reconnect your Google Calendar in Settings.';
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

    // Update googleEventId if we created it
    if (newGoogleEventId && newGoogleEventId !== existingEvent.googleEventId) {
      updateData.googleEventId = newGoogleEventId;
    }

    // Update sync status
    if (syncError) {
      updateData.syncStatus = 'error';
      updateData.lastSyncError = syncError;
    } else if (shouldSync) {
      updateData.syncStatus = 'synced';
      updateData.lastSyncError = null;
    }

    const updatedEvent = await prisma.calendarEvent.update({
      where: { id: eventId },
      data: updateData
    });

    res.json({
      event: updatedEvent,
      syncStatus: {
        synced: shouldSync && !syncError,
        error: syncError
      }
    });
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ error: 'Failed to update event: ' + error.message });
  }
});

// Background sync: Sync Google Calendar events to database
router.post('/sync', async (req, res) => {
  try {
    const userId = req.user.id;
    const { start, end } = req.body;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        calendarAccessToken: true,
        calendarRefreshToken: true,
        calendarTokenExpiry: true,
      }
    });

    if (!googleCalendarService.isCalendarConnected(user)) {
      return res.status(400).json({ error: 'Google Calendar not connected' });
    }

    console.log(`[Calendar Sync] Starting two-way sync for user ${userId}`);

    try {
      const auth = await googleCalendarService.getAuthenticatedClient(user, req.tenant);
      const googleEvents = await googleCalendarService.listEvents(auth, start, end);

      let created = 0;
      let updated = 0;
      let deleted = 0;

      // Get all local events with googleEventId
      const localEvents = await prisma.calendarEvent.findMany({
        where: getTenantFilter(req, {
          userId,
          googleEventId: { not: null }
        })
      });

      const localEventMap = new Map(localEvents.map(e => [e.googleEventId, e]));
      const googleEventIds = new Set(googleEvents.map(e => e.id));

      // Sync Google events to local database
      for (const gEvent of googleEvents) {
        const existingEvent = localEventMap.get(gEvent.id);

        if (!existingEvent) {
          // Create new event in database
          await prisma.calendarEvent.create({
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
              isAllDay: !!gEvent.start?.date,
              syncStatus: 'synced'
            }
          });
          created++;
        } else {
          // Update existing event if modified
          const googleUpdated = new Date(gEvent.updated);
          const localUpdated = existingEvent.updatedAt;

          if (googleUpdated > localUpdated) {
            await prisma.calendarEvent.update({
              where: { id: existingEvent.id },
              data: {
                title: gEvent.summary || 'Untitled Event',
                description: gEvent.description || '',
                startTime: new Date(gEvent.start?.dateTime || gEvent.start?.date),
                endTime: new Date(gEvent.end?.dateTime || gEvent.end?.date),
                location: gEvent.location || '',
                attendees: (gEvent.attendees || []).map(a => a.email),
                isAllDay: !!gEvent.start?.date,
                syncStatus: 'synced'
              }
            });
            updated++;
          }
        }
      }

      // Delete local events that no longer exist in Google Calendar
      for (const localEvent of localEvents) {
        if (!googleEventIds.has(localEvent.googleEventId)) {
          await prisma.calendarEvent.delete({
            where: { id: localEvent.id }
          });
          deleted++;
        }
      }

      console.log(`[Calendar Sync] Complete: ${created} created, ${updated} updated, ${deleted} deleted`);

      res.json({
        success: true,
        message: 'Calendar synced successfully',
        stats: { created, updated, deleted }
      });
    } catch (error) {
      console.error('[Calendar Sync] Error:', error);

      if (error.message.includes('invalid_grant') || error.message.includes('Token has been expired')) {
        return res.status(401).json({
          error: 'Calendar token expired. Please reconnect your Google Calendar in Settings.',
          requiresReconnect: true
        });
      }

      throw error;
    }
  } catch (error) {
    console.error('Error syncing calendar:', error);
    res.status(500).json({ error: 'Failed to sync calendar: ' + error.message });
  }
});

// Webhook endpoint for Google Calendar push notifications
router.post('/webhook/google', express.json(), async (req, res) => {
  try {
    const channelId = req.headers['x-goog-channel-id'];
    const resourceId = req.headers['x-goog-resource-id'];
    const resourceState = req.headers['x-goog-resource-state'];
    const channelToken = req.headers['x-goog-channel-token'];

    console.log(`[Calendar Webhook] Received notification: ${resourceState} for channel ${channelId}`);

    // Verify the webhook is from Google
    if (!channelId || !resourceId) {
      console.warn('[Calendar Webhook] Invalid webhook headers');
      return res.status(400).json({ error: 'Invalid webhook' });
    }

    // Handle sync events
    if (resourceState === 'sync') {
      console.log('[Calendar Webhook] Sync message received (channel setup confirmation)');
      return res.status(200).send('OK');
    }

    // For exists/not_exists events, trigger a sync
    if (resourceState === 'exists' || resourceState === 'not_exists') {
      console.log(`[Calendar Webhook] Calendar changed (${resourceState}), scheduling sync`);

      // Find user by channel token (userId encoded in token)
      if (channelToken) {
        const userId = channelToken.split('-')[0];

        // Trigger background sync for this user
        setImmediate(async () => {
          try {
            const user = await prisma.user.findUnique({
              where: { id: userId },
              select: {
                id: true,
                tenantId: true,
                calendarAccessToken: true,
                calendarRefreshToken: true,
                calendarTokenExpiry: true,
              }
            });

            if (user && googleCalendarService.isCalendarConnected(user)) {
              console.log(`[Calendar Webhook] Syncing calendar for user ${userId}`);

              // Get tenant for auth
              const tenant = await prisma.tenant.findUnique({
                where: { id: user.tenantId }
              });

              const auth = await googleCalendarService.getAuthenticatedClient(user, tenant);
              const googleEvents = await googleCalendarService.listEvents(auth);

              let created = 0;
              let updated = 0;
              let deleted = 0;

              // Get all local events with googleEventId
              const localEvents = await prisma.calendarEvent.findMany({
                where: {
                  userId,
                  tenantId: user.tenantId,
                  googleEventId: { not: null }
                }
              });

              const localEventMap = new Map(localEvents.map(e => [e.googleEventId, e]));
              const googleEventIds = new Set(googleEvents.map(e => e.id));

              // Sync Google events to local database
              for (const gEvent of googleEvents) {
                const existingEvent = localEventMap.get(gEvent.id);

                if (!existingEvent) {
                  // Create new event in database
                  await prisma.calendarEvent.create({
                    data: {
                      userId,
                      tenantId: user.tenantId,
                      title: gEvent.summary || 'Untitled Event',
                      description: gEvent.description || '',
                      startTime: new Date(gEvent.start?.dateTime || gEvent.start?.date),
                      endTime: new Date(gEvent.end?.dateTime || gEvent.end?.date),
                      location: gEvent.location || '',
                      attendees: (gEvent.attendees || []).map(a => a.email),
                      googleEventId: gEvent.id,
                      isAllDay: !!gEvent.start?.date,
                      syncStatus: 'synced'
                    }
                  });
                  created++;
                } else {
                  // Update existing event if modified
                  const googleUpdated = new Date(gEvent.updated);
                  const localUpdated = existingEvent.updatedAt;

                  if (googleUpdated > localUpdated) {
                    await prisma.calendarEvent.update({
                      where: { id: existingEvent.id },
                      data: {
                        title: gEvent.summary || 'Untitled Event',
                        description: gEvent.description || '',
                        startTime: new Date(gEvent.start?.dateTime || gEvent.start?.date),
                        endTime: new Date(gEvent.end?.dateTime || gEvent.end?.date),
                        location: gEvent.location || '',
                        attendees: (gEvent.attendees || []).map(a => a.email),
                        isAllDay: !!gEvent.start?.date,
                        syncStatus: 'synced'
                      }
                    });
                    updated++;
                  }
                }
              }

              // Delete local events that no longer exist in Google Calendar
              for (const localEvent of localEvents) {
                if (!googleEventIds.has(localEvent.googleEventId)) {
                  await prisma.calendarEvent.delete({
                    where: { id: localEvent.id }
                  });
                  deleted++;
                }
              }

              console.log(`[Calendar Webhook] Sync complete: ${created} created, ${updated} updated, ${deleted} deleted`);
            }
          } catch (error) {
            console.error('[Calendar Webhook] Error in background sync:', error);
          }
        });
      }
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('[Calendar Webhook] Error handling webhook:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Setup Google Calendar push notifications (watch)
router.post('/watch', async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        calendarAccessToken: true,
        calendarRefreshToken: true,
        calendarTokenExpiry: true,
      }
    });

    if (!googleCalendarService.isCalendarConnected(user)) {
      return res.status(400).json({ error: 'Google Calendar not connected' });
    }

    const auth = await googleCalendarService.getAuthenticatedClient(user, req.tenant);
    const calendar = require('googleapis').google.calendar({ version: 'v3', auth });

    const webhookUrl = `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/calendar/webhook/google`;
    const channelId = `calendar-${userId}-${Date.now()}`;

    const response = await calendar.events.watch({
      calendarId: 'primary',
      requestBody: {
        id: channelId,
        type: 'web_hook',
        address: webhookUrl,
        token: `${userId}-${Date.now()}`, // Include userId for identification
        expiration: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days
      }
    });

    // Store channel info in database for later management
    await prisma.user.update({
      where: { id: userId },
      data: {
        calendarWebhookChannelId: channelId,
        calendarWebhookResourceId: response.data.resourceId,
        calendarWebhookExpiration: new Date(parseInt(response.data.expiration))
      }
    });

    console.log(`[Calendar Watch] Setup push notifications for user ${userId}`);

    res.json({
      success: true,
      message: 'Calendar push notifications enabled',
      channel: {
        id: channelId,
        resourceId: response.data.resourceId,
        expiration: new Date(parseInt(response.data.expiration))
      }
    });
  } catch (error) {
    console.error('Error setting up calendar watch:', error);
    res.status(500).json({ error: 'Failed to setup calendar notifications: ' + error.message });
  }
});

// Stop watching calendar
router.post('/stop-watch', async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        calendarAccessToken: true,
        calendarRefreshToken: true,
        calendarTokenExpiry: true,
        calendarWebhookChannelId: true,
        calendarWebhookResourceId: true,
      }
    });

    if (!user.calendarWebhookChannelId || !user.calendarWebhookResourceId) {
      return res.status(400).json({ error: 'No active calendar watch found' });
    }

    const auth = await googleCalendarService.getAuthenticatedClient(user, req.tenant);
    const calendar = require('googleapis').google.calendar({ version: 'v3', auth });

    await calendar.channels.stop({
      requestBody: {
        id: user.calendarWebhookChannelId,
        resourceId: user.calendarWebhookResourceId
      }
    });

    await prisma.user.update({
      where: { id: userId },
      data: {
        calendarWebhookChannelId: null,
        calendarWebhookResourceId: null,
        calendarWebhookExpiration: null
      }
    });

    console.log(`[Calendar Watch] Stopped push notifications for user ${userId}`);

    res.json({
      success: true,
      message: 'Calendar push notifications disabled'
    });
  } catch (error) {
    console.error('Error stopping calendar watch:', error);
    res.status(500).json({ error: 'Failed to stop calendar notifications: ' + error.message });
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

    let syncError = null;

    // AUTO-SYNC: Delete from Google Calendar if it exists there
    if (event.googleEventId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          calendarAccessToken: true,
          calendarRefreshToken: true,
          calendarTokenExpiry: true,
        }
      });

      if (googleCalendarService.isCalendarConnected(user)) {
        try {
          console.log(`[Calendar Delete] Deleting event ${eventId} from Google Calendar`);
          const auth = await googleCalendarService.getAuthenticatedClient(user, req.tenant);

          await googleCalendarService.deleteEvent(auth, event.googleEventId);
          console.log(`[Calendar Delete] Successfully deleted from Google Calendar`);
        } catch (error) {
          console.error('[Calendar Delete] Error deleting from Google Calendar:', error);
          syncError = error.message;

          // Don't fail the operation if Google sync fails
          if (error.message.includes('invalid_grant') || error.message.includes('Token has been expired')) {
            console.warn('[Calendar Delete] Token expired, but continuing with local delete');
          }
        }
      }
    }

    // Delete from database
    await prisma.calendarEvent.delete({
      where: { id: eventId }
    });

    res.json({
      success: true,
      message: 'Event deleted successfully',
      syncStatus: {
        synced: event.googleEventId && !syncError,
        error: syncError
      }
    });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ error: 'Failed to delete event: ' + error.message });
  }
});

module.exports = router;
