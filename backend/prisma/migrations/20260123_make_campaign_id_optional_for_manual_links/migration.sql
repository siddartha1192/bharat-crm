-- AlterTable
-- Make campaignId nullable to support manual links (links without campaigns)
ALTER TABLE "campaign_links" ALTER COLUMN "campaignId" DROP NOT NULL;
