# Manual Links & UTM Tracking - Complete Guide

## 🚀 Quick Setup

Run this command from the project root:

```bash
./setup-manual-links.sh
```

Or manually:

```bash
# Install dependencies (includes qrcode package)
docker-compose exec bharat-crm-backend npm install

# Run migrations
docker-compose exec bharat-crm-backend npx prisma migrate deploy

# Generate Prisma client
docker-compose exec bharat-crm-backend npx prisma generate

# Restart backend
docker-compose restart bharat-crm-backend
```

---

## 📚 Features Overview

### 1. Manual Short Links
Create trackable short links without associating them with a campaign. Perfect for:
- Social media posts
- YouTube video descriptions
- QR codes on printed materials
- Email signatures
- Any standalone marketing content

### 2. UTM Parameter Tracking
Automatically add UTM parameters to your links for Google Analytics tracking:
- `utm_source` - Traffic source (facebook, google, newsletter)
- `utm_medium` - Marketing medium (social, email, cpc)
- `utm_campaign` - Campaign name
- `utm_term` - Paid keywords
- `utm_content` - Ad variation identifier

### 3. QR Code Generation
Generate QR codes for any short link on-demand.

### 4. Click Analytics
Track every click with detailed information:
- Total clicks and unique clicks
- Device type (mobile, desktop, tablet)
- Browser and OS
- Geographic location (optional)
- Timestamp

### 5. UTM Templates
Create reusable UTM parameter presets for consistency across campaigns.

---

## 🔧 API Endpoints

### Create a Manual Short Link

```http
POST /api/links/create-short-link
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "url": "https://example.com/product",
  "utmSource": "facebook",
  "utmMedium": "social",
  "utmCampaign": "spring_sale_2024",
  "utmTerm": "shoes",
  "utmContent": "carousel_ad",
  "name": "Spring Sale Facebook Ad"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "abc-123",
    "originalUrl": "https://example.com/product",
    "taggedUrl": "https://example.com/product?utm_source=facebook&utm_medium=social&utm_campaign=spring_sale_2024&utm_term=shoes&utm_content=carousel_ad",
    "shortCode": "a1b2c3d4",
    "shortUrl": "https://neuragg.com/l/a1b2c3d4",
    "utmParams": {
      "utm_source": "facebook",
      "utm_medium": "social",
      "utm_campaign": "spring_sale_2024",
      "utm_term": "shoes",
      "utm_content": "carousel_ad"
    }
  }
}
```

### Get All Manual Links

```http
GET /api/links/manual
Authorization: Bearer YOUR_TOKEN
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "abc-123",
      "originalUrl": "https://example.com",
      "taggedUrl": "https://example.com?utm_source=facebook...",
      "shortCode": "a1b2c3d4",
      "shortUrl": "https://neuragg.com/l/a1b2c3d4",
      "platform": "facebook",
      "linkText": "Spring Sale Ad",
      "utmSource": "facebook",
      "utmMedium": "social",
      "utmCampaign": "spring_sale_2024",
      "totalClicks": 145,
      "uniqueClicks": 89,
      "lastClickedAt": "2024-01-20T10:30:00Z",
      "createdAt": "2024-01-15T08:00:00Z"
    }
  ]
}
```

### Update a Manual Link

```http
PUT /api/links/manual/:linkId
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "url": "https://example.com/new-product",
  "utmSource": "instagram",
  "utmMedium": "social",
  "name": "Updated Link Name"
}
```

### Delete a Manual Link

```http
DELETE /api/links/manual/:linkId
Authorization: Bearer YOUR_TOKEN
```

**Response:**
```json
{
  "success": true,
  "message": "Link deleted successfully"
}
```

### Generate QR Code

```http
GET /api/links/qr/:linkId?size=300
Authorization: Bearer YOUR_TOKEN
```

**Query Parameters:**
- `size` (optional) - QR code size in pixels (default: 300)

**Response:**
```json
{
  "success": true,
  "data": {
    "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
    "shortUrl": "https://neuragg.com/l/a1b2c3d4",
    "linkId": "abc-123"
  }
}
```

The `qrCode` field contains a base64-encoded PNG image that can be directly used in an `<img>` tag:

```html
<img src="data:image/png;base64,..." alt="QR Code" />
```

### Access Short Link (Public Route)

```http
GET /l/:shortCode
```

This endpoint is **public** (no authentication required) and:
1. Finds the link by short code
2. Tracks the click (IP, user agent, device, browser, OS)
3. Updates click statistics
4. Redirects to the tagged URL with UTM parameters

### Get Analytics for Manual Links

```http
GET /api/links/manual-analytics?utmCampaign=spring_sale_2024&utmSource=facebook
Authorization: Bearer YOUR_TOKEN
```

**Query Parameters:**
- `utmCampaign` (required) - Campaign name
- `utmSource` (optional) - Filter by source
- `utmMedium` (optional) - Filter by medium

**Response:**
```json
{
  "success": true,
  "data": {
    "utmCampaign": "spring_sale_2024",
    "links": [...],
    "clicks": 450,
    "formSubmissions": 23,
    "leadsCreated": 15,
    "conversionRate": "5.11",
    "recentConversions": [...]
  }
}
```

---

## 🎨 UTM Templates

### What are UTM Templates?

UTM Templates are reusable presets that make link creation faster and ensure consistency across your marketing campaigns.

### Use Cases

1. **Channel Templates** - Create templates for email, social media, paid ads
2. **Platform-Specific** - Facebook, LinkedIn, Google Ads presets
3. **Team Consistency** - Ensure everyone uses the same UTM structure
4. **Quick Creation** - Auto-fill UTM fields when creating links

### Create a UTM Template

```http
POST /api/utm-templates
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "name": "Facebook Ads Template",
  "description": "Standard UTM structure for Facebook advertising",
  "utmSource": "facebook",
  "utmMedium": "cpc",
  "utmCampaign": null,
  "platform": "facebook",
  "isDefault": true
}
```

**Fields:**
- `name` (required) - Template name
- `description` (optional) - Template description
- `utmSource`, `utmMedium`, `utmCampaign`, `utmTerm`, `utmContent` - UTM values (can be null)
- `platform` (optional) - Platform identifier
- `isDefault` (optional) - Set as default for this platform

### Get All Templates

```http
GET /api/utm-templates?platform=facebook
Authorization: Bearer YOUR_TOKEN
```

### Update a Template

```http
PUT /api/utm-templates/:id
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "name": "Updated Template Name",
  "utmSource": "facebook",
  "utmMedium": "social"
}
```

### Delete a Template

```http
DELETE /api/utm-templates/:id
Authorization: Bearer YOUR_TOKEN
```

### How to Use Templates

1. **Create Template:**
   ```json
   {
     "name": "Instagram Stories",
     "utmSource": "instagram",
     "utmMedium": "stories",
     "platform": "instagram",
     "isDefault": true
   }
   ```

2. **When creating a link**, the frontend can:
   - Fetch templates: `GET /api/utm-templates?platform=instagram`
   - Show default template or let user select
   - Pre-fill UTM fields with template values
   - User only needs to fill in campaign name

3. **Result:** Consistent tracking across all Instagram stories links

---

## 🔍 Common Issues & Solutions

### Issue: Short links return 404

**Causes:**
1. Prisma client not regenerated after schema changes
2. Database migrations not applied
3. Backend container not restarted

**Solution:**
```bash
./setup-manual-links.sh
```

Or manually:
```bash
docker-compose exec bharat-crm-backend npx prisma generate
docker-compose restart bharat-crm-backend
```

### Issue: Delete returns 404

**Causes:**
1. Wrong endpoint URL
2. Link doesn't exist or doesn't belong to tenant
3. Routes not loaded

**Solution:**
1. Verify endpoint: `DELETE /api/links/manual/:linkId` (not `/api/links/:linkId`)
2. Check link exists and belongs to your tenant
3. Restart backend: `docker-compose restart bharat-crm-backend`

### Issue: QR code endpoint fails

**Causes:**
1. `qrcode` npm package not installed
2. Backend not restarted after package installation

**Solution:**
```bash
docker-compose exec bharat-crm-backend npm install
docker-compose restart bharat-crm-backend
```

### Issue: Analytics not updating

**Causes:**
1. `campaignId` field in `CampaignClick` model still required
2. Database migration not applied

**Solution:**
```bash
docker-compose exec bharat-crm-backend npx prisma migrate deploy
docker-compose restart bharat-crm-backend
```

### Issue: URL has backslashes instead of forward slashes

**Cause:**
Windows path copy-paste error

**Solution:**
The backend now automatically sanitizes URLs, converting backslashes to forward slashes. No action needed.

---

## 📊 Database Schema

### CampaignLink Model

```prisma
model CampaignLink {
  id            String    @id @default(uuid())
  tenantId      String
  campaignId    String?   // ✅ OPTIONAL - allows manual links
  campaign      Campaign? @relation(...)

  originalUrl   String    @db.Text
  taggedUrl     String    @db.Text
  shortCode     String?   @unique
  shortUrl      String?   @db.Text

  utmSource     String?
  utmMedium     String?
  utmCampaign   String?
  utmTerm       String?
  utmContent    String?

  platform      String?
  linkText      String?   @db.Text

  totalClicks   Int       @default(0)
  uniqueClicks  Int       @default(0)
  lastClickedAt DateTime?

  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  clicks        CampaignClick[]

  @@index([tenantId, campaignId])
  @@index([shortCode])
  @@map("campaign_links")
}
```

### CampaignClick Model

```prisma
model CampaignClick {
  id        String   @id @default(uuid())
  tenantId  String
  campaignId String?  // ✅ OPTIONAL - allows manual link tracking
  campaign   Campaign? @relation(...)

  linkId    String
  link      CampaignLink @relation(...)

  ipAddress String?
  userAgent String?
  device    String?  // "desktop" | "mobile" | "tablet"
  browser   String?  // "chrome" | "firefox" | "safari"
  os        String?  // "windows" | "macos" | "ios" | "android"

  country   String?
  region    String?
  city      String?

  referrer    String? @db.Text
  utmSource   String?
  utmMedium   String?
  utmCampaign String?
  utmTerm     String?
  utmContent  String?

  clickedAt DateTime @default(now())

  @@index([tenantId, campaignId])
  @@index([linkId])
  @@index([clickedAt])
  @@map("campaign_clicks")
}
```

---

## 🎯 Best Practices

### 1. UTM Naming Conventions

Use consistent, lowercase naming:
```
utm_source: facebook (not Facebook or fb)
utm_medium: social (not Social or social_media)
utm_campaign: spring_sale_2024 (not Spring Sale 2024)
```

### 2. Link Organization

Group links by campaign using consistent `utmCampaign` values:
```
utmCampaign: "spring_sale_2024"
Links:
  - Facebook Ad 1: utm_content=carousel
  - Facebook Ad 2: utm_content=single_image
  - Instagram Story: utm_content=story_1
```

### 3. Template Strategy

Create templates for each marketing channel:
- Email Marketing Template
- Facebook Ads Template
- Instagram Stories Template
- LinkedIn Posts Template
- Google Ads Template

### 4. Security

- Short link redirects are public (no auth)
- All other endpoints require authentication
- Links are tenant-isolated
- Only link owner can edit/delete

---

## 📈 Analytics Integration

### Google Analytics

Links automatically include UTM parameters. In Google Analytics:

1. **Acquisition > Campaigns > All Campaigns**
   - See performance by `utm_campaign`

2. **Acquisition > All Traffic > Source/Medium**
   - See performance by `utm_source` / `utm_medium`

3. **Custom Reports**
   - Filter by specific UTM parameters
   - Track conversions by campaign

### Internal Analytics

Use the Manual Analytics endpoint:

```http
GET /api/links/manual-analytics?utmCampaign=spring_sale_2024
```

Gets:
- Total clicks across all links
- Form submissions attributed to campaign
- Leads created from campaign
- Conversion rate
- Recent conversions with lead details

---

## 🔗 Example Workflows

### Workflow 1: Social Media Campaign

1. **Create Template:**
   ```json
   POST /api/utm-templates
   {
     "name": "Instagram 2024",
     "utmSource": "instagram",
     "utmMedium": "social"
   }
   ```

2. **Create Link:**
   ```json
   POST /api/links/create-short-link
   {
     "url": "https://example.com/product",
     "utmSource": "instagram",
     "utmMedium": "social",
     "utmCampaign": "summer_collection",
     "name": "Summer Collection Post"
   }
   ```

3. **Generate QR Code:**
   ```http
   GET /api/links/qr/{linkId}?size=500
   ```

4. **Post to Instagram:**
   - Use short URL in bio: `neuragg.com/l/abc123`
   - Or use QR code in story/post

5. **Track Performance:**
   ```http
   GET /api/links/manual-analytics?utmCampaign=summer_collection
   ```

### Workflow 2: YouTube Video Description

1. **Create Link:**
   ```json
   POST /api/links/create-short-link
   {
     "url": "https://example.com",
     "utmSource": "youtube",
     "utmMedium": "video",
     "utmCampaign": "tutorial_series",
     "utmContent": "episode_1",
     "name": "Tutorial Ep1 Description Link"
   }
   ```

2. **Add to Video Description:**
   ```
   🔗 Get the tool: neuragg.com/l/xyz789
   ```

3. **Track Clicks:**
   - View click count in dashboard
   - See device breakdown (mobile vs desktop)
   - Track conversions

---

## 🛠️ Troubleshooting Commands

```bash
# Check if backend is running
docker-compose ps

# View backend logs
docker-compose logs -f bharat-crm-backend

# Check database connection
docker-compose exec bharat-crm-backend npx prisma db execute --stdin <<< "SELECT 1;"

# List all migrations
docker-compose exec bharat-crm-backend npx prisma migrate status

# Force regenerate Prisma client
docker-compose exec bharat-crm-backend npx prisma generate --force

# Restart backend
docker-compose restart bharat-crm-backend

# Full reset (if needed)
docker-compose down
docker-compose up -d
```

---

## ✅ Testing Checklist

After setup, test each feature:

- [ ] Create a manual short link
- [ ] Verify tagged URL has UTM parameters
- [ ] Click the short link and verify redirect
- [ ] Check click count incremented
- [ ] Update a manual link
- [ ] Delete a manual link
- [ ] Generate QR code
- [ ] Create UTM template
- [ ] Fetch UTM templates
- [ ] View manual link analytics

---

## 📞 Support

If you encounter issues:

1. Check this README for solutions
2. Run `./setup-manual-links.sh`
3. Check backend logs: `docker-compose logs -f bharat-crm-backend`
4. Verify migrations: `docker-compose exec bharat-crm-backend npx prisma migrate status`

---

**Last Updated:** January 23, 2026
**Version:** 1.0.0
