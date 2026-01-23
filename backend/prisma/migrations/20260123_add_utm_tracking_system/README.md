# Migration: Add UTM Tracking System

This migration adds comprehensive UTM tagging and link tracking capabilities to the Bharat CRM platform.

## Changes:

1. **Campaign Table**: Added UTM configuration fields
   - utmSource, utmMedium, utmCampaign, utmTerm, utmContent
   - platformUtmConfig (JSON) for platform-specific overrides
   - autoTagLinks, trackClicks, useShortLinks flags

2. **CampaignRecipient Table**: Added click tracking fields
   - clickedCount, firstClickedAt, lastClickedAt

3. **New Tables**:
   - `campaign_links`: Tracks all links in campaigns with UTM parameters
   - `campaign_clicks`: Records individual click events with device/location data
   - `utm_templates`: Reusable UTM parameter templates

## Features Enabled:

- Automatic UTM tagging of links in email and WhatsApp campaigns
- Platform-specific UTM parameters (email, WhatsApp, YouTube, social media)
- Short link generation for tracking
- Click analytics with device/browser/OS detection
- Conversion funnel tracking (sent → clicks → leads)
- Manual short link creation for external platforms

## Related Files:

- Backend: `services/utm.js`, `routes/links.js`
- Frontend: `components/settings/UtmConfigSection.tsx`, `components/settings/CampaignAnalytics.tsx`
