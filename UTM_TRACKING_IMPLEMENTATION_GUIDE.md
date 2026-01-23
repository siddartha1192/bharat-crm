# UTM Tracking System - Implementation & Testing Guide

**Version:** 1.0
**Date:** 2026-01-23
**Status:** Complete ✅

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Implementation Summary](#implementation-summary)
3. [Database Setup](#database-setup)
4. [Testing Guide](#testing-guide)
5. [Usage Examples](#usage-examples)
6. [API Reference](#api-reference)
7. [Frontend Integration](#frontend-integration)
8. [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

This implementation adds comprehensive UTM parameter tagging and link tracking to the Bharat CRM campaign system. It enables detailed analytics for email campaigns, WhatsApp campaigns, and external platforms like YouTube and social media.

### Key Features

- ✅ Automatic UTM parameter injection for all campaign links
- ✅ Short link generation with redirect tracking
- ✅ Click analytics with device, browser, and OS detection
- ✅ Platform-specific UTM configuration (email, WhatsApp, YouTube, social)
- ✅ Real-time analytics dashboard
- ✅ Standalone UTM URL generator tool
- ✅ Multi-tenant data isolation
- ✅ Comprehensive API endpoints

---

## 🏗️ Implementation Summary

### Files Created

#### Backend Files
1. **`/backend/prisma/migrations/add_utm_tracking_system.sql`**
   - Database migration for UTM tables
   - Creates: `campaign_links`, `campaign_clicks`, `utm_templates`
   - Adds UTM fields to `Campaign` and `CampaignRecipient` models

2. **`/backend/services/utm.js`**
   - Core UTM service with 20+ methods
   - Handles URL parsing, UTM injection, click tracking
   - Device/browser/OS detection
   - Analytics aggregation

3. **`/backend/routes/links.js`**
   - Public link redirect endpoint: `/l/:shortCode`
   - Analytics API: `/api/links/analytics/:campaignId`
   - UTM template management endpoints
   - URL generator endpoint

4. **`/backend/tests/utm.test.js`**
   - Comprehensive unit tests
   - 25+ test cases covering all major functions

#### Frontend Files
1. **`/src/components/settings/UtmConfigSection.tsx`**
   - UTM configuration UI component
   - Platform-specific override tabs
   - Live URL preview
   - Integration-ready for campaign dialog

2. **`/src/components/settings/CampaignAnalytics.tsx`**
   - Full analytics dashboard
   - Interactive charts (device, browser, OS, timeline)
   - Link performance table
   - CSV export functionality

3. **`/src/components/settings/UtmGenerator.tsx`**
   - Standalone UTM URL generator
   - Platform presets (YouTube, Instagram, Facebook, etc.)
   - QR code generation
   - Saved URLs management

4. **`/src/types/campaign.ts`**
   - Updated TypeScript interfaces
   - New types: `CampaignLink`, `CampaignClick`, `UtmTemplate`, `LinkAnalytics`

#### Modified Files
1. **`/backend/services/campaign.js`**
   - Integrated UTM processing in `sendToRecipient()`
   - Processes email HTML and WhatsApp text for UTM tags
   - Handles media captions with UTM links

2. **`/backend/server.js`**
   - Registered link routes
   - Added `/l/:shortCode` public endpoint

3. **`/backend/prisma/schema.prisma`**
   - Added UTM fields to `Campaign` model
   - Added click tracking to `CampaignRecipient`
   - New models: `CampaignLink`, `CampaignClick`, `UtmTemplate`

---

## 🗄️ Database Setup

### Step 1: Run Migration

```bash
cd /home/user/bharat-crm/backend

# Apply the migration
psql -U your_username -d your_database -f prisma/migrations/add_utm_tracking_system.sql

# Or use Prisma
npx prisma migrate deploy
```

### Step 2: Verify Tables

```sql
-- Check if tables were created
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('campaign_links', 'campaign_clicks', 'utm_templates');

-- Verify Campaign table has new columns
SELECT column_name FROM information_schema.columns
WHERE table_name = 'Campaign'
AND column_name LIKE 'utm%';
```

### Step 3: Generate Prisma Client

```bash
npx prisma generate
```

---

## 🧪 Testing Guide

### Unit Tests

```bash
cd backend

# Run UTM service tests
npm test tests/utm.test.js

# Run all tests
npm test
```

### Manual Testing Checklist

#### 1. Database Migration ✓
- [ ] Tables created: `campaign_links`, `campaign_clicks`, `utm_templates`
- [ ] Campaign table has UTM fields
- [ ] CampaignRecipient has click tracking fields
- [ ] Indexes created correctly
- [ ] Foreign key constraints working

#### 2. Link Redirect Functionality ✓
- [ ] Create a test campaign with UTM enabled
- [ ] Send test email/WhatsApp with links
- [ ] Verify short link redirect works
- [ ] Check click is tracked in database
- [ ] Verify device/browser detection

#### 3. UTM Parameter Injection ✓
```javascript
// Test email campaign
const campaign = {
  name: 'Test Campaign',
  channel: 'email',
  htmlContent: '<a href="https://example.com">Click</a>',
  autoTagLinks: true,
  utmSource: 'test_crm',
  utmMedium: 'email',
  utmCampaign: 'test_jan_2026'
};

// After processing, link should be:
// https://example.com?utm_source=test_crm&utm_medium=email&utm_campaign=test_jan_2026
```

#### 4. Analytics API ✓
```bash
# Get campaign analytics
curl -X GET "http://localhost:3001/api/links/analytics/:campaignId" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected response:
{
  "success": true,
  "data": {
    "links": [...],
    "summary": {
      "totalLinks": 5,
      "totalClicks": 127,
      "totalUniqueClicks": 89,
      "averageClicksPerLink": "25.40"
    }
  }
}
```

#### 5. Platform-Specific Configuration ✓
```javascript
// Test platform-specific UTM
const campaign = {
  name: 'Multi-Platform Campaign',
  channel: 'email',
  utmSource: 'default_source',
  platformUtmConfig: {
    email: { utm_source: 'newsletter', utm_medium: 'email_blast' },
    whatsapp: { utm_source: 'whatsapp_crm', utm_medium: 'broadcast' },
    youtube: { utm_source: 'youtube', utm_medium: 'video_description' }
  }
};
```

#### 6. Short Link Generation ✓
- [ ] Enable `useShortLinks: true` in campaign
- [ ] Verify short codes are generated (8 characters)
- [ ] Test redirect from `/l/:shortCode`
- [ ] Verify original URL is preserved
- [ ] Check uniqueness of short codes

---

## 📚 Usage Examples

### Example 1: Email Campaign with UTM Tracking

```javascript
// Create campaign via API
POST /api/campaigns

{
  "name": "Spring Sale 2026",
  "description": "Promotional email for spring collection",
  "channel": "email",
  "subject": "🌸 Spring Sale - 50% Off!",
  "htmlContent": "<h1>Spring Sale</h1><p>Shop now: <a href=\"https://store.com/spring\">Visit Store</a></p>",
  "targetType": "all",

  // UTM Configuration
  "autoTagLinks": true,
  "trackClicks": true,
  "useShortLinks": true,
  "utmSource": "bharat_crm",
  "utmMedium": "email",
  "utmCampaign": "spring_sale_2026",
  "utmContent": "promo_email"
}

// Result: Link becomes
// https://crm.com/l/a3f8d9e2 → redirects to
// https://store.com/spring?utm_source=bharat_crm&utm_medium=email&utm_campaign=spring_sale_2026&utm_content=promo_email
```

### Example 2: WhatsApp Campaign

```javascript
POST /api/campaigns

{
  "name": "Flash Sale WhatsApp",
  "channel": "whatsapp",
  "textContent": "Hi {{name}}! Flash sale today! Shop here: https://store.com/sale",
  "whatsappMessageType": "text",
  "targetType": "leads",

  "autoTagLinks": true,
  "utmSource": "whatsapp_crm",
  "utmMedium": "whatsapp",
  "utmCampaign": "flash_sale_jan26"
}

// Result: Message sent as
// "Hi John! Flash sale today! Shop here: https://store.com/sale?utm_source=whatsapp_crm&utm_medium=whatsapp&utm_campaign=flash_sale_jan26"
```

### Example 3: YouTube URL Generator

```javascript
// Using the UTM Generator component
// Generate URL for YouTube video description

Input:
- Base URL: https://mystore.com/products
- Platform: YouTube
- UTM Campaign: product_review_2026
- UTM Content: video_description

Output:
https://mystore.com/products?utm_source=youtube&utm_medium=video&utm_campaign=product_review_2026&utm_content=video_description

// Use this in YouTube video description
// Track clicks in Google Analytics
```

### Example 4: Platform-Specific Configuration

```javascript
POST /api/campaigns

{
  "name": "Multi-Platform Launch",
  "channel": "email",
  "autoTagLinks": true,

  // Default UTM (used for email)
  "utmSource": "product_launch",
  "utmMedium": "email",
  "utmCampaign": "new_product_jan_2026",

  // Platform-specific overrides
  "platformUtmConfig": {
    "whatsapp": {
      "utm_source": "product_launch_whatsapp",
      "utm_medium": "whatsapp_broadcast",
      "utm_content": "direct_message"
    },
    "youtube": {
      "utm_source": "youtube_launch",
      "utm_medium": "video",
      "utm_content": "product_demo"
    }
  }
}
```

---

## 📡 API Reference

### Link Redirect

```http
GET /l/:shortCode
```

**Public endpoint (no authentication required)**

Redirects to the original UTM-tagged URL and tracks the click.

**Response:** HTTP 302 redirect

---

### Get Campaign Analytics

```http
GET /api/links/analytics/:campaignId
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "links": [
      {
        "linkId": "link-123",
        "originalUrl": "https://example.com",
        "taggedUrl": "https://example.com?utm_source=...",
        "shortUrl": "https://crm.com/l/abc123",
        "platform": "email",
        "totalClicks": 45,
        "uniqueClicks": 32,
        "clicksByDevice": { "mobile": 25, "desktop": 20 },
        "clicksByBrowser": { "chrome": 30, "safari": 15 },
        "clickTimeline": { "2026-01-23T10:00:00": 12, ... }
      }
    ],
    "summary": {
      "totalLinks": 3,
      "totalClicks": 127,
      "totalUniqueClicks": 89,
      "averageClicksPerLink": "42.33",
      "topPerformingLink": {
        "url": "https://example.com/top",
        "clicks": 67
      }
    }
  }
}
```

---

### Get Link Clicks

```http
GET /api/links/:linkId/clicks?limit=100&offset=0
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "clicks": [
      {
        "id": "click-123",
        "linkId": "link-123",
        "recipientId": "recipient-456",
        "ipAddress": "192.168.1.1",
        "device": "mobile",
        "browser": "chrome",
        "os": "android",
        "country": "US",
        "clickedAt": "2026-01-23T10:15:30Z"
      }
    ],
    "pagination": {
      "total": 250,
      "limit": 100,
      "offset": 0,
      "hasMore": true
    }
  }
}
```

---

### UTM Template Management

#### List Templates
```http
GET /api/utm-templates?platform=email
Authorization: Bearer <token>
```

#### Create Template
```http
POST /api/utm-templates
Authorization: Bearer <token>

{
  "name": "Email Default Template",
  "utmSource": "bharat_crm",
  "utmMedium": "email",
  "utmCampaign": "{{campaign_name}}",
  "platform": "email",
  "isDefault": true
}
```

---

### Generate UTM URL

```http
POST /api/utm/generate
Authorization: Bearer <token>

{
  "url": "https://example.com",
  "utmSource": "newsletter",
  "utmMedium": "email",
  "utmCampaign": "jan_2026"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "originalUrl": "https://example.com",
    "taggedUrl": "https://example.com?utm_source=newsletter&utm_medium=email&utm_campaign=jan_2026",
    "utmParams": {
      "utm_source": "newsletter",
      "utm_medium": "email",
      "utm_campaign": "jan_2026"
    }
  }
}
```

---

## 🎨 Frontend Integration

### Integrating UTM Config in Campaign Dialog

```tsx
// In CampaignDialog.tsx
import { UtmConfigSection } from './UtmConfigSection';

// Add new step for UTM configuration
{step === 4 && (
  <UtmConfigSection
    campaign={formData}
    onChange={(updates) => setFormData({ ...formData, ...updates })}
  />
)}
```

### Displaying Analytics

```tsx
// In CampaignDetailView.tsx
import { CampaignAnalytics } from './CampaignAnalytics';

<CampaignAnalytics
  campaignId={campaign.id}
  campaign={campaign}
/>
```

### Using UTM Generator

```tsx
// Create a new page or add to settings
import { UtmGenerator } from '@/components/settings/UtmGenerator';

<UtmGenerator />
```

---

## 🐛 Troubleshooting

### Issue: Links not being tagged with UTM parameters

**Check:**
1. Campaign has `autoTagLinks: true`
2. UTM source, medium, and campaign are set
3. Links are valid HTTP/HTTPS URLs
4. Links don't already have UTM parameters

**Debug:**
```javascript
console.log('[Campaign] Processing links:', {
  autoTagLinks: campaign.autoTagLinks,
  utmSource: campaign.utmSource,
  utmMedium: campaign.utmMedium,
  utmCampaign: campaign.utmCampaign
});
```

---

### Issue: Short links not redirecting

**Check:**
1. Route is registered in `server.js`
2. Short code exists in `campaign_links` table
3. No firewall blocking `/l/*` path
4. Database connection is working

**Debug:**
```bash
# Check if link exists
SELECT * FROM campaign_links WHERE "shortCode" = 'your_code';

# Test endpoint directly
curl -I http://localhost:3001/l/your_code
```

---

### Issue: Analytics not showing clicks

**Check:**
1. Click tracking is enabled (`trackClicks: true`)
2. Clicks are being recorded in `campaign_clicks` table
3. API endpoint is accessible
4. User has permission to view campaign

**Debug:**
```sql
-- Check clicks for campaign
SELECT COUNT(*) FROM campaign_clicks WHERE "campaignId" = 'your_campaign_id';

-- Check recent clicks
SELECT * FROM campaign_clicks
WHERE "campaignId" = 'your_campaign_id'
ORDER BY "clickedAt" DESC
LIMIT 10;
```

---

### Issue: Platform-specific UTM not applying

**Check:**
1. `platformUtmConfig` is a valid JSON object
2. Platform key matches exactly (lowercase)
3. Fields use correct property names (`utm_source`, not `utmSource`)

**Example:**
```javascript
// ❌ Wrong
platformUtmConfig: {
  Email: {  // Should be lowercase
    utmSource: 'test'  // Should be utm_source
  }
}

// ✅ Correct
platformUtmConfig: {
  email: {
    utm_source: 'test'
  }
}
```

---

## 📊 Performance Considerations

### Database Indexing
All tables have proper indexes for:
- `tenantId` + `campaignId` (most common query)
- `shortCode` (unique, for fast redirects)
- `clickedAt` (for timeline queries)

### Caching Recommendations
- Cache campaign UTM configuration
- Cache short code → URL mappings (Redis)
- Aggregate analytics hourly instead of real-time

### Scaling
- Click tracking is fire-and-forget (doesn't block redirects)
- Use job queue for click processing if volume is high
- Consider CDN for short link redirects

---

## ✅ Deployment Checklist

- [ ] Run database migration
- [ ] Generate Prisma client
- [ ] Deploy backend with new routes
- [ ] Deploy frontend with new components
- [ ] Test link redirect functionality
- [ ] Verify analytics data collection
- [ ] Configure monitoring for `/l/:shortCode` endpoint
- [ ] Set up alerts for failed click tracking
- [ ] Update documentation
- [ ] Train team on new features

---

## 🎓 Training Users

### For Marketing Team
1. **Creating Tracked Campaigns**
   - Enable "Auto-tag links" when creating campaigns
   - Configure UTM parameters (source, medium, campaign)
   - Use platform-specific overrides for multi-channel campaigns

2. **Viewing Analytics**
   - Access Campaign Analytics dashboard
   - Export data to CSV for reporting
   - Track performance across devices and platforms

3. **YouTube & Social Links**
   - Use UTM Generator tool in Settings
   - Select platform preset (YouTube, Instagram, etc.)
   - Generate QR codes for print materials

### For Developers
1. **API Integration**
   - Use link analytics API for custom dashboards
   - Implement click tracking for custom links
   - Create UTM templates for reusability

2. **Customization**
   - Extend UtmService for custom tracking logic
   - Add new platform presets
   - Implement custom analytics aggregations

---

## 📈 Success Metrics

Track these KPIs to measure UTM tracking effectiveness:

1. **Campaign Performance**
   - Total clicks per campaign
   - Click-through rate (CTR)
   - Platform comparison (email vs WhatsApp vs social)

2. **Link Performance**
   - Most clicked links
   - Link position effectiveness
   - Short link adoption rate

3. **Audience Insights**
   - Device breakdown (mobile vs desktop)
   - Browser usage
   - Geographic distribution

4. **ROI Tracking**
   - Conversion rate by UTM source
   - Revenue attribution by campaign
   - Cost per click (if running paid campaigns)

---

## 🔐 Security Notes

1. **Short Links**: Public endpoint, no authentication
2. **Analytics**: Requires authentication and tenant isolation
3. **Click Tracking**: IP addresses collected (GDPR compliance needed)
4. **Data Retention**: Consider implementing click data retention policy

---

## 📝 License & Credits

Implemented for Bharat CRM
Date: January 23, 2026
Version: 1.0.0

---

**End of Implementation Guide**
