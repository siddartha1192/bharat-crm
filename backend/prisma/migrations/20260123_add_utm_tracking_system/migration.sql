-- Migration: Add UTM Tracking System
-- Date: 2026-01-23
-- Description: Adds comprehensive UTM tagging and link tracking for campaigns

-- 1. Add UTM configuration fields to Campaign table
ALTER TABLE "Campaign"
ADD COLUMN "utmSource" TEXT,
ADD COLUMN "utmMedium" TEXT,
ADD COLUMN "utmCampaign" TEXT,
ADD COLUMN "utmTerm" TEXT,
ADD COLUMN "utmContent" TEXT,
ADD COLUMN "platformUtmConfig" JSONB,
ADD COLUMN "autoTagLinks" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "trackClicks" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "useShortLinks" BOOLEAN NOT NULL DEFAULT false;

-- 2. Add click tracking fields to CampaignRecipient table
ALTER TABLE "CampaignRecipient"
ADD COLUMN "clickedCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "firstClickedAt" TIMESTAMP(3),
ADD COLUMN "lastClickedAt" TIMESTAMP(3);

-- 3. Create CampaignLink table (campaign_links)
CREATE TABLE "campaign_links" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "originalUrl" TEXT NOT NULL,
    "taggedUrl" TEXT NOT NULL,
    "shortCode" TEXT,
    "shortUrl" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "utmTerm" TEXT,
    "utmContent" TEXT,
    "linkText" TEXT,
    "linkPosition" TEXT,
    "platform" TEXT,
    "totalClicks" INTEGER NOT NULL DEFAULT 0,
    "uniqueClicks" INTEGER NOT NULL DEFAULT 0,
    "lastClickedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaign_links_pkey" PRIMARY KEY ("id")
);

-- 4. Create CampaignClick table (campaign_clicks)
CREATE TABLE "campaign_clicks" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "linkId" TEXT NOT NULL,
    "recipientId" TEXT,
    "recipientType" TEXT,
    "recipientEmail" TEXT,
    "recipientPhone" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "device" TEXT,
    "browser" TEXT,
    "os" TEXT,
    "country" TEXT,
    "region" TEXT,
    "city" TEXT,
    "referrer" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "utmTerm" TEXT,
    "utmContent" TEXT,
    "clickedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_clicks_pkey" PRIMARY KEY ("id")
);

-- 5. Create UtmTemplate table (utm_templates)
CREATE TABLE "utm_templates" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "utmTerm" TEXT,
    "utmContent" TEXT,
    "platform" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "utm_templates_pkey" PRIMARY KEY ("id")
);

-- 6. Create indexes for campaign_links
CREATE INDEX "campaign_links_tenantId_campaignId_idx" ON "campaign_links"("tenantId", "campaignId");
CREATE UNIQUE INDEX "campaign_links_shortCode_key" ON "campaign_links"("shortCode");
CREATE INDEX "campaign_links_shortCode_idx" ON "campaign_links"("shortCode");

-- 7. Create indexes for campaign_clicks
CREATE INDEX "campaign_clicks_tenantId_campaignId_idx" ON "campaign_clicks"("tenantId", "campaignId");
CREATE INDEX "campaign_clicks_linkId_idx" ON "campaign_clicks"("linkId");
CREATE INDEX "campaign_clicks_recipientId_idx" ON "campaign_clicks"("recipientId");
CREATE INDEX "campaign_clicks_clickedAt_idx" ON "campaign_clicks"("clickedAt");

-- 8. Create indexes for utm_templates
CREATE INDEX "utm_templates_tenantId_platform_idx" ON "utm_templates"("tenantId", "platform");

-- 9. Add foreign key constraints for campaign_links
ALTER TABLE "campaign_links" ADD CONSTRAINT "campaign_links_campaignId_fkey"
    FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 10. Add foreign key constraints for campaign_clicks
ALTER TABLE "campaign_clicks" ADD CONSTRAINT "campaign_clicks_campaignId_fkey"
    FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "campaign_clicks" ADD CONSTRAINT "campaign_clicks_linkId_fkey"
    FOREIGN KEY ("linkId") REFERENCES "campaign_links"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "campaign_clicks" ADD CONSTRAINT "campaign_clicks_recipientId_fkey"
    FOREIGN KEY ("recipientId") REFERENCES "CampaignRecipient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 11. Create comment documentation
COMMENT ON TABLE "campaign_links" IS 'Tracks all links in campaigns with UTM parameters for click analytics';
COMMENT ON TABLE "campaign_clicks" IS 'Records individual click events on campaign links with device and location data';
COMMENT ON TABLE "utm_templates" IS 'Reusable UTM parameter templates for different platforms and campaign types';
