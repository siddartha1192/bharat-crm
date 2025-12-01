# Google Calendar Integration Setup Guide

This guide will help you set up Google Calendar integration with Bharat CRM.

## Features

✅ Create, edit, and delete events in Google Calendar
✅ Sync events from Google Calendar to your CRM
✅ Beautiful interactive calendar UI with Month/Week/Day/Agenda views
✅ Color-coded events
✅ Add attendees and locations to events
✅ Set reminders for events
✅ All-day event support
✅ Two-way sync with Google Calendar

---

## Step 1: Create Google Cloud Project

1. **Go to Google Cloud Console**
   Visit: https://console.cloud.google.com

2. **Create a New Project**
   - Click on the project dropdown (top left)
   - Click "New Project"
   - Enter project name: "Bharat CRM"
   - Click "Create"

3. **Enable Google Calendar API**
   - In the search bar, type "Google Calendar API"
   - Click on "Google Calendar API"
   - Click "Enable"

---

## Step 2: Create OAuth 2.0 Credentials

1. **Go to Credentials Page**
   - In Google Cloud Console, go to "APIs & Services" > "Credentials"

2. **Configure OAuth Consent Screen**
   - Click "OAuth consent screen" in the left menu
   - Select "External" user type
   - Click "Create"

   **Fill in the required information:**
   - App name: `Bharat CRM`
   - User support email: Your email
   - Developer contact email: Your email
   - Click "Save and Continue"

   **Scopes:**
   - Click "Add or Remove Scopes"
   - Add these scopes:
     - `https://www.googleapis.com/auth/calendar`
     - `https://www.googleapis.com/auth/calendar.events`
   - Click "Update" and then "Save and Continue"

   **Test Users (for development):**
   - Click "Add Users"
   - Add your Gmail address
   - Click "Save and Continue"

3. **Create OAuth Client ID**
   - Go back to "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Select application type: "Web application"
   - Name: `Bharat CRM Web Client`

   **Add Authorized JavaScript origins:**
   ```
   http://localhost:5173
   ```

   **Add Authorized redirect URIs:**
   ```
   http://localhost:5173/calendar/callback
   ```

   - Click "Create"
   - **IMPORTANT:** Copy the Client ID and Client Secret

---

## Step 3: Configure Backend Environment Variables

1. **Edit `.env` file in the `/backend` directory:**

```bash
cd backend
nano .env
```

2. **Add your Google Calendar credentials:**

```env
# Google Calendar API Configuration
GOOGLE_CLIENT_ID=your_actual_client_id_here
GOOGLE_CLIENT_SECRET=your_actual_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:5173/calendar/callback
```

**Example:**
```env
GOOGLE_CLIENT_ID=123456789-abc123def456.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-AbC123DeF456GhI789
GOOGLE_REDIRECT_URI=http://localhost:5173/calendar/callback
```

3. **Save the file** (Ctrl+X, then Y, then Enter)

---

## Step 4: Run Database Migration

Run the Prisma migration to create the calendar tables:

```bash
cd backend
npx prisma migrate dev --name add_google_calendar
npx prisma generate
```

---

## Step 5: Restart Backend Server

Restart your backend server to load the new environment variables:

```bash
cd backend
npm start
```

You should see:
```
🚀 Server is running on http://localhost:3001
📊 API endpoints available at http://localhost:3001/api
```

---

## Step 6: Connect Google Calendar in the CRM

1. **Open the CRM** in your browser: http://localhost:5173

2. **Log in** to your account

3. **Navigate to Calendar page** (click "Calendar" in the sidebar)

4. **Click "Connect Google Calendar"** button

5. **Authorize the application:**
   - You'll be redirected to Google
   - Select your Google account
   - Click "Continue" (you may see a warning since it's unverified - click "Advanced" and "Go to Bharat CRM")
   - Review the permissions
   - Click "Continue"

6. **You'll be redirected back to the CRM**
   The button should now say "Disconnect Google Calendar"

---

## Step 7: Using the Calendar

### Create an Event

1. **Click on a date/time** in the calendar (or click "New Event" button)
2. **Fill in the event details:**
   - Title (required)
   - Description (optional)
   - Start time and end time
   - Location (optional)
   - Attendees (comma-separated emails)
   - Color (for visual organization)
   - Toggle "Sync with Google Calendar" if you want it synced
3. **Click "Create Event"**

### Edit an Event

1. **Click on an existing event** in the calendar
2. **Make your changes** in the dialog
3. **Click "Update Event"**

### Delete an Event

1. **Click on an event** to open it
2. **Click the "Delete" button**
3. **Confirm deletion**

### Sync with Google Calendar

- **Click "Sync with Google"** button to pull latest events from Google Calendar
- Events created in Google Calendar will appear in the CRM
- Events created in the CRM (with sync enabled) will appear in Google Calendar

### Calendar Views

Switch between different views:
- **Month** - Overview of the entire month
- **Week** - Detailed week view
- **Day** - Single day with hourly breakdown
- **Agenda** - List view of upcoming events

---

## Troubleshooting

### Error: "Google Calendar not configured"

**Problem:** Environment variables are not set

**Solution:**
1. Check if `.env` file exists in `/backend` directory
2. Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set
3. Restart the backend server

---

### Error: "Redirect URI mismatch"

**Problem:** The redirect URI in Google Cloud Console doesn't match your application

**Solution:**
1. Go to Google Cloud Console > Credentials
2. Edit your OAuth client ID
3. Ensure the redirect URI is exactly: `http://localhost:5173/calendar/callback`
4. Save changes

---

### Events not syncing from Google Calendar

**Problem:** Sync is not pulling Google events

**Solution:**
1. Click "Disconnect Google Calendar" and reconnect
2. Make sure you granted calendar permissions during OAuth
3. Click "Sync with Google" button to manually trigger sync
4. Check backend logs for errors

---

### "This app isn't verified" warning during OAuth

**Problem:** Your app is in development mode

**Solution:**
This is normal for development. You have two options:

**Option 1 (Quick - for development):**
- Click "Advanced"
- Click "Go to Bharat CRM (unsafe)"
- This is safe since it's your own app

**Option 2 (For production):**
- Submit your app for Google verification
- Go to OAuth consent screen in Google Cloud Console
- Click "Publish App"
- Follow the verification process

---

## Production Deployment

When deploying to production:

1. **Update redirect URIs:**
   ```
   https://your-domain.com/calendar/callback
   ```

2. **Update environment variable:**
   ```env
   GOOGLE_REDIRECT_URI=https://your-domain.com/calendar/callback
   ```

3. **Add production domain to authorized origins:**
   ```
   https://your-domain.com
   ```

4. **Verify your app** with Google (required for public use)

---

## Security Best Practices

1. **Never commit `.env` file** to version control
2. **Use environment variables** for all sensitive data
3. **Rotate credentials** regularly in production
4. **Implement proper user authentication** before OAuth
5. **Monitor API usage** in Google Cloud Console

---

## API Endpoints

### Authentication

**GET** `/api/calendar/auth/url` - Get Google OAuth URL
**POST** `/api/calendar/auth/callback` - Handle OAuth callback
**POST** `/api/calendar/auth/disconnect` - Disconnect Google Calendar
**GET** `/api/calendar/auth/status` - Check connection status

### Events

**GET** `/api/calendar/events` - Get all events
**POST** `/api/calendar/events` - Create event
**PUT** `/api/calendar/events/:id` - Update event
**DELETE** `/api/calendar/events/:id` - Delete event

---

## FAQ

### Q: Can multiple users connect their own Google Calendars?
**A:** Yes! Each user can connect their own Google account. Events are isolated per user.

### Q: What happens if I disconnect Google Calendar?
**A:** Events created in the CRM will remain in the database. Events in Google Calendar won't be deleted.

### Q: Can I create events without syncing to Google?
**A:** Yes! Just toggle off "Sync with Google Calendar" when creating/editing events.

### Q: How often does it sync with Google?
**A:** Sync is manual. Click "Sync with Google" button to pull latest events.

### Q: Can I invite people to events?
**A:** Yes! Add attendees' email addresses when creating/editing events. They'll receive Google Calendar invitations if sync is enabled.

### Q: Are there any costs?
**A:** Google Calendar API has a free tier with generous quotas. Check current quotas at: https://console.cloud.google.com

---

## Resources

- [Google Calendar API Documentation](https://developers.google.com/calendar/api/guides/overview)
- [Google Cloud Console](https://console.cloud.google.com)
- [OAuth 2.0 for Web Applications](https://developers.google.com/identity/protocols/oauth2/web-server)
- [API Quotas and Limits](https://developers.google.com/calendar/api/guides/quota)

---

## Example: Complete Setup Flow

```bash
# 1. Create Google Cloud project and OAuth credentials
# (Follow steps in Google Cloud Console)

# 2. Configure backend
cd backend
nano .env
# Add GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI

# 3. Run migration
npx prisma migrate dev --name add_google_calendar
npx prisma generate

# 4. Restart backend
npm start

# 5. Open CRM and connect Google Calendar
# Navigate to Calendar page and click "Connect Google Calendar"

# 6. Start creating and managing events!
```

---

**Happy scheduling! 📅**
