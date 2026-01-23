-- AlterTable
-- Make campaignId nullable in CampaignClick to support manual link tracking
ALTER TABLE "campaign_clicks" ALTER COLUMN "campaignId" DROP NOT NULL;
