# Gmail OAuth2 Setup Guide for Bharat CRM

This guide will help you set up Gmail OAuth2 for sending emails from Bharat CRM.

## Prerequisites

- Google Cloud Console account
- Gmail account for sending emails
- Google OAuth2 credentials (Client ID and Client Secret)

## Step 1: Enable Gmail API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (the same one you're using for Google Calendar/OAuth)
3. Go to **APIs & Services** → **Library**
4. Search for **Gmail API**
5. Click on it and click **Enable**

## Step 2: Configure OAuth Consent Screen (if not already done)

1. Go to **APIs & Services** → **OAuth consent screen**
2. Add the following scope:
   - `https://www.googleapis.com/auth/gmail.send`
3. Click **Save and Continue**

## Step 3: Get Gmail Refresh Token

### Using Google OAuth2 Playground

1. Go to [Google OAuth2 Playground](https://developers.google.com/oauthplayground)

2. Click the **Settings** icon (⚙️) in the top right

3. Check **"Use your own OAuth credentials"**

4. Enter your:
   - **OAuth Client ID**: Your `GOOGLE_CLIENT_ID` from `.env`
   - **OAuth Client secret**: Your `GOOGLE_CLIENT_SECRET` from `.env`

5. Close settings

6. In the left sidebar under **"Step 1: Select & authorize APIs"**:
   - Scroll down and expand **Gmail API v1**
   - Select: `https://www.googleapis.com/auth/gmail.send`
   - Click **"Authorize APIs"**

7. Sign in with the Gmail account you want to use for sending emails

8. After authorization, in **"Step 2: Exchange authorization code for tokens"**:
   - Click **"Exchange authorization code for tokens"**

9. You'll see a response with:
   ```json
   {
     "access_token": "...",
     "refresh_token": "1//...",
     "expires_in": 3599,
     "token_type": "Bearer"
   }
   ```

10. Copy the `refresh_token` value (starts with `1//`)

## Step 4: Update Your .env File

Add the following to your `backend/.env` file:

```env
# Email Configuration (Gmail OAuth2)
GMAIL_USER=your_email@gmail.com
GMAIL_REFRESH_TOKEN=1//your_refresh_token_here
GMAIL_REDIRECT_URI=https://developers.google.com/oauthplayground

# Frontend URL for email links
FRONTEND_URL=http://localhost:8080
```

Replace:
- `your_email@gmail.com` - The Gmail address you authorized
- `1//your_refresh_token_here` - The refresh token from Step 3

## Step 5: Restart Backend Server

After updating the `.env` file, restart your backend server:

```bash
cd backend
npm run dev
```

## Step 6: Test Email Sending

You can test email sending in several ways:

### 1. Password Reset Email (Easiest)

1. Go to `/forgot-password` in your app
2. Enter your email address
3. Check your inbox for the password reset email

### 2. Using API Directly

```bash
# Send a manual email
curl -X POST http://localhost:3001/api/emails/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "to": "recipient@example.com",
    "subject": "Test Email from Bharat CRM",
    "text": "This is a test email",
    "html": "<h1>This is a test email</h1><p>From Bharat CRM</p>"
  }'
```

### 3. From Frontend Email Tab

1. Navigate to the **Emails** tab
2. Click **Compose New Email**
3. Fill in the details and send

## Troubleshooting

### "Error creating email transporter"

**Cause**: Missing or invalid Gmail credentials

**Solution**:
- Verify `GMAIL_USER`, `GMAIL_REFRESH_TOKEN` are set in `.env`
- Ensure `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are correct
- Make sure you enabled Gmail API

### "Invalid credentials" or "401 Unauthorized"

**Cause**: Refresh token is invalid or expired

**Solution**:
- Generate a new refresh token using OAuth2 Playground (Step 3)
- Make sure the Gmail account has granted permission
- Revoke and re-authorize the app in your [Google Account Permissions](https://myaccount.google.com/permissions)

### "Access blocked: This app's request is invalid"

**Cause**: OAuth consent screen not properly configured

**Solution**:
- Add your Gmail account as a test user in OAuth consent screen
- Make sure Gmail API scope is added
- Ensure your app is in "Testing" mode if not verified

### Emails not being sent

**Cause**: Various reasons

**Solution**:
1. Check backend logs for error messages
2. Verify Gmail API is enabled
3. Check email logs in database: `SELECT * FROM "EmailLog" WHERE status = 'failed'`
4. Ensure refresh token hasn't expired (they usually don't for testing apps)

## Production Considerations

### For Production Deployment:

1. **Verify your OAuth App**:
   - Go through Google's verification process
   - This allows unlimited users (not just test users)

2. **Use Environment Variables**:
   - Never commit `.env` file to version control
   - Use secure environment variable management

3. **Email Limits**:
   - Gmail free accounts: 500 emails/day
   - Google Workspace: 2000 emails/day
   - Consider using SendGrid, AWS SES, or Mailgun for higher volume

4. **Monitoring**:
   - Set up email delivery monitoring
   - Track bounce rates and failures
   - Monitor EmailLog table for failed emails

## Email Features in Bharat CRM

### 1. Password Reset Emails
- Automatically sent when user requests password reset
- Beautiful HTML template with reset link
- Expires in 1 hour

### 2. Lead/Contact Emails
- Send emails directly from Lead or Contact pages
- Automatically tracked in database
- Links email to the specific Lead/Contact

### 3. Deal Emails
- Send proposal or follow-up emails
- Tracked against specific deals

### 4. Manual Emails
- Compose and send custom emails
- Support for CC, BCC, HTML content
- Full email history and tracking

### 5. Email Tracking
- All emails logged in database
- Track sent, failed, pending status
- View email history per entity
- Email stats and analytics

## Database Schema

The `EmailLog` model tracks all emails:

```prisma
model EmailLog {
  id              String   @id
  to              String[] // Recipients
  cc              String[]
  bcc             String[]
  from            String
  subject         String
  body            String   // Plain text
  htmlBody        String?  // HTML version
  status          String   // 'sent' | 'failed' | 'pending'
  errorMessage    String?
  messageId       String?  // Gmail message ID
  entityType      String?  // 'Lead' | 'Contact' | 'Deal'
  entityId        String?
  sentAt          DateTime?
  userId          String   // Who sent it
  createdAt       DateTime
}
```

## Support

If you need help:
1. Check the troubleshooting section above
2. Review backend logs for detailed error messages
3. Verify all configuration steps were followed
4. Check email logs in database for failure reasons

Happy emailing! 📧
