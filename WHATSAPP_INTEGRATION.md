# WhatsApp Business API Integration Guide

This guide will help you integrate WhatsApp Business API with your Bharat CRM to send messages directly to your contacts.

## Features

✅ Send WhatsApp messages to contacts via the CRM
✅ Click-to-chat functionality (opens WhatsApp Web/App)
✅ Beautiful chat modal interface
✅ Message delivery confirmation
✅ Support for WhatsApp Business API

## Prerequisites

1. **WhatsApp Business Account** - You need a verified WhatsApp Business account
2. **Meta Business Suite Access** - Access to Facebook Business Manager
3. **WhatsApp Business API** - Set up through Meta (formerly Facebook)

## Setup Instructions

### Step 1: Get WhatsApp Business API Credentials

1. **Create a Meta Business Account**:
   - Go to [Meta Business Suite](https://business.facebook.com)
   - Create or use an existing Business Manager account

2. **Set up WhatsApp Business API**:
   - In Meta Business Suite, go to "WhatsApp Manager"
   - Click "Create App" or use an existing app
   - Add WhatsApp as a product to your app

3. **Get your credentials**:
   - **Phone Number ID**: Go to WhatsApp > API Setup
     - You'll see your phone number ID in the "From" phone number section
   - **Access Token**:
     - Go to WhatsApp > API Setup
     - Copy the temporary access token (for testing)
     - For production, generate a permanent token from System Users

### Step 2: Configure Backend Environment Variables

1. Create a `.env` file in the `/backend` directory (if not exists):

```bash
cd backend
cp .env.example .env
```

2. Edit the `.env` file and add your WhatsApp credentials:

```env
# WhatsApp Business API Configuration
WHATSAPP_TOKEN=your_actual_whatsapp_business_api_token
WHATSAPP_PHONE_ID=your_actual_phone_number_id
```

**Example**:
```env
WHATSAPP_TOKEN=EAAG9ZCx...your_long_token_here
WHATSAPP_PHONE_ID=123456789012345
```

### Step 3: Restart the Backend Server

After adding the environment variables, restart your backend server:

```bash
cd backend
npm start
```

You should see no errors about missing WhatsApp configuration.

### Step 4: Test the Integration

1. **Add WhatsApp Number to a Contact**:
   - Go to Contacts in your CRM
   - Edit or create a contact
   - Add a WhatsApp number (with country code, e.g., +919876543210)

2. **Send a Test Message**:
   - Click on the contact to view details
   - You'll see a green "WhatsApp" section
   - Click "Send" button
   - Type a message and click "Send Message"

3. **Verify**:
   - Check if the message was delivered
   - You should see a success confirmation
   - The recipient should receive the message on WhatsApp

## Usage

### In Contact Cards

- **WhatsApp Number Display**: Contact cards show WhatsApp numbers with a green icon
- **Click to Open**: Click on the WhatsApp number to open WhatsApp Web/App directly

### In Contact Details

- **Send Button**: Opens a modal to compose and send messages via API
- **Open Button**: Opens WhatsApp Web/App in a new tab
- **Action Button**: Quick access to send WhatsApp messages from the action bar

### WhatsApp Chat Modal

- **Message Composition**: Type your message (supports up to unlimited characters)
- **Send via API**: Uses WhatsApp Business API for guaranteed delivery
- **Open WhatsApp Web**: Alternative option to open chat in WhatsApp
- **Success Confirmation**: Visual confirmation when message is sent

## API Endpoints

### Check WhatsApp Status

```bash
GET /api/whatsapp/status
Headers: X-User-Id: <your_user_id>
```

Response:
```json
{
  "configured": true,
  "message": "WhatsApp is configured and ready to use"
}
```

### Send Message

```bash
POST /api/whatsapp/send
Headers:
  Content-Type: application/json
  X-User-Id: <your_user_id>

Body:
{
  "contactId": "contact_uuid",
  "message": "Your message here"
}
```

Or send to a specific number without contactId:
```json
{
  "phoneNumber": "+919876543210",
  "message": "Your message here"
}
```

Response:
```json
{
  "success": true,
  "messageId": "wamid.HBgLMTk4NzY1NDMyMTAVAgARGBI5...",
  "recipient": "John Doe",
  "phone": "+919876543210",
  "message": "Message sent successfully"
}
```

## Troubleshooting

### Error: "WhatsApp is not configured"

**Problem**: Environment variables are missing
**Solution**:
1. Check if `.env` file exists in `/backend` directory
2. Verify `WHATSAPP_TOKEN` and `WHATSAPP_PHONE_ID` are set
3. Restart the backend server

### Error: "Failed to send message"

**Problem**: Invalid credentials or API issues
**Solution**:
1. Verify your WhatsApp Business API token is valid
2. Check if the phone number ID is correct
3. Ensure your Meta app has WhatsApp permissions
4. Check backend logs for detailed error messages

### Error: "Invalid phone number"

**Problem**: Phone number format is incorrect
**Solution**:
1. Ensure phone numbers include country code (e.g., +91 for India)
2. Remove spaces and special characters (system does this automatically)
3. Format should be: +919876543210

### Messages not being delivered

**Possible causes**:
1. **Template required**: For new conversations, WhatsApp requires approved message templates
2. **24-hour window**: You can only send free-form messages within 24 hours of user interaction
3. **Phone number not on WhatsApp**: Verify the recipient has WhatsApp
4. **API limits**: Check if you've hit API rate limits

**Solution**:
- For new conversations, use approved message templates
- For follow-ups within 24 hours, you can send any message
- Check Meta Business Suite for message delivery status

## WhatsApp Business API Limitations

1. **Message Templates**:
   - First message to a user must use an approved template
   - Templates must be pre-approved by Meta

2. **24-Hour Window**:
   - After user replies, you have 24 hours to send free-form messages
   - After that, you need to use templates again

3. **Rate Limits**:
   - Depends on your Business API tier
   - Check Meta Business Suite for your limits

4. **Quality Rating**:
   - Maintain high-quality messages to avoid restrictions
   - Avoid spam or promotional content

## Advanced Features (Coming Soon)

- 📎 Send media (images, documents, videos)
- 📝 Use message templates
- 🤖 Auto-reply with AI (OpenAI integration ready)
- 💬 Conversation history tracking
- 📊 Message analytics and delivery reports

## Cost

- **WhatsApp Business API**: Pricing varies by country
- Check current pricing at [WhatsApp Business API Pricing](https://developers.facebook.com/docs/whatsapp/pricing)
- In India: ~₹0.33 per business-initiated conversation
- User-initiated conversations (within 24h window): Free

## Support

For issues with:
- **CRM Integration**: Check application logs and backend server
- **WhatsApp API**: Contact Meta Business Support
- **Message Templates**: Submit via Meta Business Suite

## Security Best Practices

1. **Never commit `.env` file** to version control
2. **Use environment variables** for all sensitive data
3. **Rotate tokens** regularly for production
4. **Limit API access** to authorized users only
5. **Monitor usage** to detect unusual activity

## Resources

- [WhatsApp Business API Documentation](https://developers.facebook.com/docs/whatsapp)
- [Meta Business Suite](https://business.facebook.com)
- [WhatsApp Business API Pricing](https://developers.facebook.com/docs/whatsapp/pricing)
- [Message Templates Guide](https://developers.facebook.com/docs/whatsapp/message-templates)

## Example: Getting Started

1. Set up Meta Business Account
2. Add WhatsApp to your app
3. Get temporary token for testing
4. Add credentials to `.env`:
   ```env
   WHATSAPP_TOKEN=your_token_here
   WHATSAPP_PHONE_ID=your_phone_id_here
   ```
5. Restart backend: `npm start`
6. Test by sending a message to your own WhatsApp number
7. Once verified, request production access from Meta

---

**Note**: The provided bot code you shared uses webhook-based message receiving and OpenAI responses. This CRM integration focuses on sending messages. You can combine both by adding the webhook endpoints to the server.js file if you want to receive and auto-respond to messages as well.
