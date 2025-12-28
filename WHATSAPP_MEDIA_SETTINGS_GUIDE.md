# WhatsApp Media & Multi-Tenant Settings Guide

## Overview

This guide covers the new enhancements to Bharat CRM's WhatsApp integration:

1. **Multi-Tenant API Configuration**: Configure WhatsApp and OpenAI API credentials per tenant
2. **Media Support**: Send images, documents, videos, and audio via WhatsApp
3. **Enhanced Template Messages**: Support for media in WhatsApp templates
4. **Backward Compatibility**: Fallback to environment variables if tenant settings not configured

## Table of Contents

- [API Configuration Management](#api-configuration-management)
- [WhatsApp Media Sending](#whatsapp-media-sending)
- [Template Messages with Media](#template-messages-with-media)
- [Docker Configuration](#docker-configuration)
- [API Reference](#api-reference)

---

## API Configuration Management

### Tenant-Specific Settings

Each tenant can now configure their own WhatsApp and OpenAI API credentials through the settings interface.

### Settings API Endpoints

#### Get Current API Configuration

```http
GET /api/settings/api-config
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "settings": {
    "whatsapp": {
      "configured": true,
      "phoneId": "1234****5678",
      "hasToken": true,
      "webhookVerifyToken": "your_webhook_token"
    },
    "openai": {
      "configured": true,
      "hasApiKey": true,
      "model": "gpt-4o-mini",
      "temperature": 0.7,
      "enabled": true
    }
  }
}
```

#### Update WhatsApp Settings

```http
PUT /api/settings/whatsapp
Authorization: Bearer <token>
Content-Type: application/json

{
  "token": "your_whatsapp_business_api_token",
  "phoneId": "your_whatsapp_phone_number_id",
  "webhookVerifyToken": "your_webhook_verify_token"
}
```

**Response:**
```json
{
  "success": true,
  "message": "WhatsApp settings updated successfully",
  "settings": {
    "configured": true,
    "phoneId": "1234****5678"
  }
}
```

#### Update OpenAI Settings

```http
PUT /api/settings/openai
Authorization: Bearer <token>
Content-Type: application/json

{
  "apiKey": "sk-...",
  "model": "gpt-4o-mini",
  "temperature": 0.7,
  "enabled": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "OpenAI settings updated successfully",
  "settings": {
    "configured": true,
    "model": "gpt-4o-mini",
    "temperature": 0.7,
    "enabled": true
  }
}
```

#### Test WhatsApp Connection

```http
POST /api/settings/test-whatsapp
Authorization: Bearer <token>
Content-Type: application/json

{
  "token": "your_token",
  "phoneId": "your_phone_id"
}
```

#### Test OpenAI Connection

```http
POST /api/settings/test-openai
Authorization: Bearer <token>
Content-Type: application/json

{
  "apiKey": "sk-...",
  "model": "gpt-4o-mini"
}
```

---

## WhatsApp Media Sending

### Send Image

```http
POST /api/whatsapp/send-image
Authorization: Bearer <token>
Content-Type: application/json

{
  "phoneNumber": "+919876543210",
  "imageUrl": "https://example.com/image.jpg",
  "caption": "Check out this image!"
}
```

**Supported Formats:**
- JPEG, PNG
- Max size: 5MB
- Can use URL or media ID

### Send Document

```http
POST /api/whatsapp/send-document
Authorization: Bearer <token>
Content-Type: application/json

{
  "phoneNumber": "+919876543210",
  "documentUrl": "https://example.com/document.pdf",
  "filename": "Invoice_2024.pdf",
  "caption": "Here's your invoice"
}
```

**Supported Formats:**
- PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX
- Max size: 100MB

### Send Video

```http
POST /api/whatsapp/send-video
Authorization: Bearer <token>
Content-Type: application/json

{
  "phoneNumber": "+919876543210",
  "videoUrl": "https://example.com/video.mp4",
  "caption": "Product demo video"
}
```

**Supported Formats:**
- MP4, 3GP
- Max size: 16MB
- H.264 video codec, AAC audio codec

### Send Audio

```http
POST /api/whatsapp/send-audio
Authorization: Bearer <token>
Content-Type: application/json

{
  "phoneNumber": "+919876543210",
  "audioUrl": "https://example.com/audio.mp3"
}
```

**Supported Formats:**
- AAC, MP3, AMR, OGG (OPUS codec)
- Max size: 16MB

---

## Template Messages with Media

### Enhanced Template Support

WhatsApp templates can now include media in headers (images, documents, videos).

```http
POST /api/whatsapp/send-template
Authorization: Bearer <token>
Content-Type: application/json

{
  "phoneNumber": "+919876543210",
  "templateName": "order_confirmation",
  "languageCode": "en",
  "components": {
    "header": {
      "type": "image",
      "mediaUrl": "https://example.com/order-image.jpg"
    },
    "body": [
      {"text": "John Doe"},
      {"text": "12345"}
    ]
  }
}
```

**Header Types Supported:**
- `text`: Plain text header
- `image`: Image header
- `document`: Document header
- `video`: Video header

**Example with Text Header:**
```json
{
  "header": {
    "type": "text",
    "text": "Order Confirmation"
  }
}
```

**Example with Document Header:**
```json
{
  "header": {
    "type": "document",
    "mediaUrl": "https://example.com/invoice.pdf"
  }
}
```

---

## Docker Configuration

### Environment Variables (Backward Compatibility)

The system supports both tenant-specific settings and environment variables. Environment variables serve as fallback when tenant settings are not configured.

**.env file:**
```env
# WhatsApp API Configuration (Fallback)
WHATSAPP_TOKEN=your_whatsapp_business_api_token
WHATSAPP_PHONE_ID=your_whatsapp_phone_number_id
WHATSAPP_WEBHOOK_VERIFY_TOKEN=your_webhook_token

# OpenAI API Configuration (Fallback)
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
WHATSAPP_AI_TEMPERATURE=0.7
ENABLE_AI_FEATURE=true
```

### Docker Compose

No changes required to `docker-compose.yml` or `docker-compose.prod.yml`. The environment variables are automatically passed to the containers.

### Priority Order

1. **Tenant-specific settings** (from database) - Highest priority
2. **Environment variables** - Fallback

This ensures:
- Multi-tenant deployments can have different API keys per tenant
- Single-tenant deployments can continue using environment variables
- Easy migration from environment variables to tenant settings

---

## API Reference

### WhatsApp Service Methods

All WhatsApp service methods now accept an optional `tenantConfig` parameter:

```javascript
// Send text message
await whatsappService.sendMessage(
  phoneNumber,
  message,
  tenantConfig  // Optional
);

// Send image
await whatsappService.sendImage(
  phoneNumber,
  imageUrl,
  caption,
  tenantConfig  // Optional
);

// Send document
await whatsappService.sendDocument(
  phoneNumber,
  documentUrl,
  filename,
  caption,
  tenantConfig  // Optional
);

// Send video
await whatsappService.sendVideo(
  phoneNumber,
  videoUrl,
  caption,
  tenantConfig  // Optional
);

// Send audio
await whatsappService.sendAudio(
  phoneNumber,
  audioUrl,
  tenantConfig  // Optional
);

// Send template message
await whatsappService.sendTemplateMessage(
  phoneNumber,
  templateName,
  languageCode,
  components,
  tenantConfig  // Optional
);

// Check configuration
whatsappService.isConfigured(tenantConfig);  // Optional
```

### OpenAI Service Methods

All OpenAI service methods now accept an optional `tenantConfig` parameter:

```javascript
// Generate response
await openaiService.generateResponse(
  conversationHistory,
  userMessage,
  tenantConfig  // Optional
);

// Process WhatsApp message
await openaiService.processWhatsAppMessage(
  conversationId,
  userMessage,
  userId,
  tenantConfig  // Optional
);

// Check if enabled
openaiService.isEnabled(tenantConfig);  // Optional
```

### Tenant Config Structure

```javascript
// WhatsApp Config
{
  token: "your_whatsapp_api_token",
  phoneId: "your_phone_id",
  webhookVerifyToken: "your_webhook_token"  // Optional
}

// OpenAI Config
{
  apiKey: "sk-...",
  model: "gpt-4o-mini",  // Optional, default: gpt-4o-mini
  temperature: 0.7,      // Optional, default: 0.7
  enabled: true          // Optional, default: true
}
```

---

## Usage Examples

### Example 1: Sending an Image with Caption

```javascript
const response = await fetch('/api/whatsapp/send-image', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    phoneNumber: '+919876543210',
    imageUrl: 'https://example.com/product.jpg',
    caption: 'Check out our new product!'
  })
});

const result = await response.json();
console.log(result.messageId);  // WhatsApp message ID
```

### Example 2: Updating Tenant Settings

```javascript
// Update WhatsApp settings
const response = await fetch('/api/settings/whatsapp', {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    token: 'EAAxxxxx...',
    phoneId: '1234567890',
    webhookVerifyToken: 'my_secure_token'
  })
});

const result = await response.json();
console.log(result.message);  // "WhatsApp settings updated successfully"
```

### Example 3: Sending Template with Image Header

```javascript
const response = await fetch('/api/whatsapp/send-template', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    phoneNumber: '+919876543210',
    templateName: 'order_confirmation',
    languageCode: 'en',
    components: {
      header: {
        type: 'image',
        mediaUrl: 'https://example.com/order.jpg'
      },
      body: [
        { text: 'John Doe' },      // {{1}} in template
        { text: 'ORD-12345' }      // {{2}} in template
      ]
    }
  })
});
```

---

## Security Considerations

1. **API Key Storage**: Tenant-specific API keys are stored in the database in the `settings` JSON field
2. **Admin Access**: Only users with ADMIN role can update API settings
3. **Masked Display**: API keys are masked when retrieved (showing only first/last 4 characters)
4. **Validation**: Settings are validated before saving
5. **Test Endpoints**: Use test endpoints to verify credentials before saving

---

## Migration Guide

### Migrating from Environment Variables to Tenant Settings

For existing deployments using environment variables:

1. Keep existing environment variables as fallback
2. Use settings API to configure tenant-specific credentials
3. Tenant settings will take precedence over environment variables
4. Gradually migrate tenants to use their own API keys

### Testing the Migration

```bash
# 1. Check current status (using env variables)
curl -X GET http://localhost:3001/api/whatsapp/status \
  -H "Authorization: Bearer $TOKEN"

# 2. Update tenant settings
curl -X PUT http://localhost:3001/api/settings/whatsapp \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "new_token",
    "phoneId": "new_phone_id"
  }'

# 3. Verify status (now using tenant settings)
curl -X GET http://localhost:3001/api/whatsapp/status \
  -H "Authorization: Bearer $TOKEN"
```

---

## Troubleshooting

### WhatsApp Not Configured

**Issue**: Getting "WhatsApp is not configured" error

**Solutions**:
1. Check tenant settings: `GET /api/settings/api-config`
2. Verify environment variables are set
3. Test credentials: `POST /api/settings/test-whatsapp`
4. Check user role (must be ADMIN to update settings)

### Media Not Sending

**Issue**: Media messages failing

**Solutions**:
1. Verify media URL is publicly accessible
2. Check file size limits (images: 5MB, videos: 16MB, documents: 100MB)
3. Ensure correct media format
4. Check WhatsApp API credentials

### AI Not Responding

**Issue**: AI responses not generating

**Solutions**:
1. Check OpenAI settings: `GET /api/settings/api-config`
2. Test OpenAI key: `POST /api/settings/test-openai`
3. Verify AI is enabled for conversation
4. Check OpenAI API quota/limits

---

## Support

For issues or questions:
- Check logs: `docker-compose logs backend`
- Review error messages in API responses
- Verify API credentials are valid
- Ensure all required fields are provided

---

## Version History

### v2.0.0 (2025-01-XX)
- Added multi-tenant API configuration support
- Implemented WhatsApp media sending (images, documents, videos, audio)
- Enhanced template messages with media support
- Backward compatibility with environment variables
- New settings management API
