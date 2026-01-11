-- Add sync tracking fields to CalendarEvent
ALTER TABLE "CalendarEvent" ADD COLUMN IF NOT EXISTS "syncStatus" TEXT DEFAULT 'local_only';
ALTER TABLE "CalendarEvent" ADD COLUMN IF NOT EXISTS "lastSyncError" TEXT;

-- Add webhook tracking fields to User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "calendarWebhookChannelId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "calendarWebhookResourceId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "calendarWebhookExpiration" TIMESTAMP(3);

-- Create index for sync status queries
CREATE INDEX IF NOT EXISTS "CalendarEvent_syncStatus_idx" ON "CalendarEvent"("syncStatus");

COMMENT ON COLUMN "CalendarEvent"."syncStatus" IS 'Sync status: local_only, synced, error';
COMMENT ON COLUMN "CalendarEvent"."lastSyncError" IS 'Last error message if sync failed';
COMMENT ON COLUMN "User"."calendarWebhookChannelId" IS 'Google Calendar watch channel ID';
COMMENT ON COLUMN "User"."calendarWebhookResourceId" IS 'Google Calendar watch resource ID';
COMMENT ON COLUMN "User"."calendarWebhookExpiration" IS 'When the calendar watch expires';
