# Google Calendar Sync - Enterprise Solution Guide

## Overview

This document describes the enterprise-level Google Calendar synchronization system implemented to address sync issues and provide reliable two-way synchronization between the CRM and Google Calendar.

## Problems Solved

### 1. Token Expiration Issues
**Problem**: Calendar operations failed with "token expired" errors because token refresh wasn't properly implemented.

**Solution**:
- Automatic token refresh before every Google Calendar API call
- Proper error handling with user-friendly messages
- Token expiration tracking and validation

### 2. Manual Sync Only
**Problem**: Events only synced when explicitly requested (`syncWithGoogle=true`)

**Solution**:
- **Auto-sync by default**: All calendar operations now automatically sync to Google Calendar if connected
- Can be explicitly disabled by passing `syncWithGoogle=false`
- Sync status tracking for each event

### 3. No Two-Way Sync
**Problem**: Changes made in Google Calendar (deletions, updates) didn't sync back to CRM

**Solution**:
- **Manual sync endpoint** (`POST /api/calendar/sync`)
- **Webhook-based real-time sync** using Google Calendar Push Notifications
- Background sync jobs for reliability

## New Features

### 1. Automatic Sync
All calendar operations now sync automatically:
- **Create**: New events are automatically created in Google Calendar
- **Update**: Changes to events automatically update Google Calendar
- **Delete**: Deleted events are automatically removed from Google Calendar

### 2. Sync Status Tracking
Each calendar event now has:
- `syncStatus`: `"local_only"`, `"synced"`, or `"error"`
- `lastSyncError`: Error message if sync failed

### 3. Two-Way Synchronization

#### Manual Sync
```bash
POST /api/calendar/sync
{
  "start": "2026-01-01T00:00:00Z",  # Optional
  "end": "2026-12-31T23:59:59Z"     # Optional
}
```

This endpoint:
- Fetches all events from Google Calendar
- Creates missing events in CRM database
- Updates modified events
- Deletes events that were removed in Google Calendar

#### Webhook-Based Sync (Real-Time)

**Setup webhooks**:
```bash
POST /api/calendar/watch
```

This creates a Google Calendar push notification channel that:
- Receives real-time notifications when calendar changes
- Automatically triggers sync when changes detected
- Expires after 7 days (needs renewal)

**Stop webhooks**:
```bash
POST /api/calendar/stop-watch
```

### 4. Enhanced Error Handling

All operations now return detailed sync status:
```json
{
  "event": { /* event data */ },
  "syncStatus": {
    "synced": true,
    "error": null
  }
}
```

If token is expired:
```json
{
  "event": { /* event data */ },
  "syncStatus": {
    "synced": false,
    "error": "Calendar token expired. Please reconnect your Google Calendar in Settings."
  }
}
```

## Database Schema Changes

### User Model
Added webhook tracking fields:
- `calendarWebhookChannelId`: Google Calendar watch channel ID
- `calendarWebhookResourceId`: Google Calendar watch resource ID
- `calendarWebhookExpiration`: When the calendar watch expires

### CalendarEvent Model
Added sync tracking fields:
- `syncStatus`: Sync status (`"local_only"`, `"synced"`, `"error"`)
- `lastSyncError`: Last error message if sync failed

## API Endpoints

### Existing Endpoints (Enhanced)

#### `POST /api/calendar/events` - Create Event
- Now auto-syncs to Google Calendar by default
- Returns sync status
- Handles token refresh automatically

#### `PUT /api/calendar/events/:id` - Update Event
- Auto-syncs updates to Google Calendar
- Returns sync status
- Handles token refresh automatically

#### `DELETE /api/calendar/events/:id` - Delete Event
- Auto-deletes from Google Calendar
- Returns sync status
- Handles token refresh automatically

### New Endpoints

#### `POST /api/calendar/sync` - Manual Sync
Manually trigger a full two-way synchronization.

**Request**:
```json
{
  "start": "2026-01-01T00:00:00Z",
  "end": "2026-12-31T23:59:59Z"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Calendar synced successfully",
  "stats": {
    "created": 5,
    "updated": 3,
    "deleted": 2
  }
}
```

#### `POST /api/calendar/watch` - Setup Webhooks
Enable real-time sync via Google Calendar push notifications.

**Response**:
```json
{
  "success": true,
  "message": "Calendar push notifications enabled",
  "channel": {
    "id": "calendar-user123-1234567890",
    "resourceId": "ABC123XYZ",
    "expiration": "2026-01-18T00:00:00.000Z"
  }
}
```

#### `POST /api/calendar/stop-watch` - Stop Webhooks
Disable Google Calendar push notifications.

#### `POST /api/calendar/webhook/google` - Webhook Receiver
Internal endpoint for receiving Google Calendar push notifications. This is called by Google, not by your frontend.

## Usage Guide

### For End Users

#### Connecting Google Calendar
1. Go to Settings → Calendar Integration
2. Click "Connect Google Calendar"
3. Authorize the application
4. ✅ Calendar is now connected and will auto-sync

#### Creating Events
1. Create an event in the CRM calendar
2. Event automatically syncs to Google Calendar
3. Check sync status badge/icon on the event

#### Syncing Changes from Google Calendar
**Option 1: Manual Sync** (Recommended for now)
- Click "Sync Calendar" button in the calendar view
- All changes from Google Calendar are imported

**Option 2: Enable Webhooks** (Real-time, requires backend URL to be publicly accessible)
- Click "Enable Real-time Sync" in calendar settings
- Changes from Google Calendar sync automatically

### For Developers

#### Running the Migration
```bash
# Apply the database migration
cd backend
npm run prisma:migrate

# Or manually apply:
psql -U your_user -d your_database -f prisma/migrations/add_calendar_sync_fields.sql
```

#### Testing Auto-Sync
```javascript
// Create an event - it will auto-sync
const response = await fetch('/api/calendar/events', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: 'Test Event',
    startTime: '2026-01-15T10:00:00Z',
    endTime: '2026-01-15T11:00:00Z'
    // syncWithGoogle: true is default, no need to specify
  })
});

const { event, syncStatus } = await response.json();
console.log('Synced:', syncStatus.synced);
console.log('Error:', syncStatus.error);
```

#### Disabling Auto-Sync (if needed)
```javascript
// Create event without syncing to Google
const response = await fetch('/api/calendar/events', {
  method: 'POST',
  body: JSON.stringify({
    title: 'Local Only Event',
    startTime: '2026-01-15T10:00:00Z',
    endTime: '2026-01-15T11:00:00Z',
    syncWithGoogle: false  // Explicitly disable sync
  })
});
```

## Monitoring and Troubleshooting

### Check Sync Status
```sql
-- View all events with sync issues
SELECT id, title, syncStatus, lastSyncError
FROM "CalendarEvent"
WHERE syncStatus = 'error';

-- View events that haven't synced
SELECT id, title, syncStatus
FROM "CalendarEvent"
WHERE googleEventId IS NULL;
```

### Common Issues

#### 1. "Token expired" Error
**Symptom**: Events show `syncStatus: "error"` with message "Calendar token expired"

**Solution**:
1. Go to Settings → Calendar Integration
2. Click "Disconnect"
3. Click "Connect Google Calendar" again
4. Re-authorize

#### 2. Webhook Not Working
**Symptom**: Changes in Google Calendar don't appear in CRM

**Possible causes**:
- Webhook expired (after 7 days)
- Backend URL not publicly accessible
- Firewall blocking Google's webhook requests

**Solutions**:
- Re-enable webhooks (`POST /api/calendar/watch`)
- Ensure `BACKEND_URL` environment variable is set correctly
- Use manual sync as alternative

#### 3. Duplicate Events
**Symptom**: Same event appears twice

**Solution**:
- This shouldn't happen with proper `googleEventId` tracking
- Run manual sync to fix: `POST /api/calendar/sync`

## Security Considerations

### Token Storage
- Tokens are stored securely in the database
- Refresh tokens are used to obtain new access tokens
- Tokens are never exposed to the frontend

### Webhook Verification
- Webhooks verify Google-specific headers
- Channel tokens include userId for authorization
- Only authenticated users can setup webhooks

### Rate Limiting
Google Calendar API has rate limits:
- 1,000,000 queries per day
- 10 queries per second per user

The sync system handles this by:
- Only syncing when necessary
- Batch processing updates
- Exponential backoff on errors

## Best Practices

### For Users
1. **Use Manual Sync Daily**: Click "Sync Calendar" once per day
2. **Check Sync Status**: Look for sync error indicators on events
3. **Reconnect if Needed**: If you see persistent token errors, reconnect calendar

### For Administrators
1. **Monitor Token Expiration**: Set up alerts for users with expired tokens
2. **Renew Webhooks**: Create a cron job to renew webhooks before they expire (every 6 days)
3. **Log Sync Errors**: Monitor `lastSyncError` fields for patterns

### For Developers
1. **Always Handle Sync Errors**: Check `syncStatus` in responses
2. **Show Sync Status to Users**: Display badges/icons indicating sync state
3. **Provide Reconnect Option**: Make it easy for users to reconnect calendar

## Future Enhancements

1. **Background Sync Job**: Periodic sync every hour for all users
2. **Conflict Resolution**: Handle conflicts when both sides modified the same event
3. **Selective Sync**: Allow users to choose which calendars to sync
4. **Sync Queue**: Queue sync operations for better reliability
5. **Webhook Auto-Renewal**: Automatically renew webhooks before expiration

## Environment Variables

Add these to your `.env` file:

```bash
# Required for webhooks
BACKEND_URL=https://your-backend-domain.com

# Google OAuth (existing)
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
```

## Testing

### Manual Testing Checklist

- [ ] Create event in CRM → Verify it appears in Google Calendar
- [ ] Update event in CRM → Verify changes appear in Google Calendar
- [ ] Delete event in CRM → Verify it's deleted from Google Calendar
- [ ] Create event in Google Calendar → Manual sync → Verify it appears in CRM
- [ ] Update event in Google Calendar → Manual sync → Verify changes appear in CRM
- [ ] Delete event in Google Calendar → Manual sync → Verify it's deleted from CRM
- [ ] Test with expired token → Verify error message
- [ ] Reconnect calendar → Verify sync works again
- [ ] Enable webhooks → Create event in Google → Verify real-time sync
- [ ] Disable webhooks → Verify it stops syncing

## Support

For issues or questions:
1. Check the logs for detailed error messages
2. Review sync status in database
3. Try reconnecting Google Calendar
4. Contact development team with specific error messages

---

**Last Updated**: January 11, 2026
**Version**: 2.0 (Enterprise Sync)
