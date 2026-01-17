-- Manual migration fix script
-- Run this if the automatic fix script doesn't work
-- This will clean up any partially applied columns and reapply them

-- First, try to drop the columns if they exist (ignore errors if they don't exist)
DO $$
BEGIN
    -- Drop CallLog columns if they exist
    ALTER TABLE "CallLog" DROP COLUMN IF EXISTS "meetingExtracted";
    ALTER TABLE "CallLog" DROP COLUMN IF EXISTS "hasMeetingRequest";
    ALTER TABLE "CallLog" DROP COLUMN IF EXISTS "meetingAgreed";
    ALTER TABLE "CallLog" DROP COLUMN IF EXISTS "meetingType";
    ALTER TABLE "CallLog" DROP COLUMN IF EXISTS "meetingProposedDate";
    ALTER TABLE "CallLog" DROP COLUMN IF EXISTS "meetingProposedTime";
    ALTER TABLE "CallLog" DROP COLUMN IF EXISTS "meetingDateTimeText";
    ALTER TABLE "CallLog" DROP COLUMN IF EXISTS "meetingDuration";
    ALTER TABLE "CallLog" DROP COLUMN IF EXISTS "meetingPreferences";
    ALTER TABLE "CallLog" DROP COLUMN IF EXISTS "meetingNotes";
    ALTER TABLE "CallLog" DROP COLUMN IF EXISTS "meetingConfidence";
    ALTER TABLE "CallLog" DROP COLUMN IF EXISTS "meetingReasonDeclined";
    ALTER TABLE "CallLog" DROP COLUMN IF EXISTS "meetingCalendarEventId";
    ALTER TABLE "CallLog" DROP COLUMN IF EXISTS "meetingExtractionCost";

    -- Drop CallSettings columns if they exist
    ALTER TABLE "CallSettings" DROP COLUMN IF EXISTS "enableDemoScheduling";
    ALTER TABLE "CallSettings" DROP COLUMN IF EXISTS "demoSchedulingAutoBook";
    ALTER TABLE "CallSettings" DROP COLUMN IF EXISTS "demoSchedulingMinConfidence";
    ALTER TABLE "CallSettings" DROP COLUMN IF EXISTS "demoSchedulingCalendarId";
    ALTER TABLE "CallSettings" DROP COLUMN IF EXISTS "demoSchedulingNotifyUser";
    ALTER TABLE "CallSettings" DROP COLUMN IF EXISTS "demoSchedulingNotifyLead";
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Some columns may not exist, continuing...';
END $$;

-- Now add all the columns fresh
-- CallLog columns
ALTER TABLE "CallLog"
ADD COLUMN "meetingExtracted" BOOLEAN DEFAULT false,
ADD COLUMN "hasMeetingRequest" BOOLEAN DEFAULT false,
ADD COLUMN "meetingAgreed" BOOLEAN DEFAULT false,
ADD COLUMN "meetingType" TEXT,
ADD COLUMN "meetingProposedDate" TIMESTAMP(3),
ADD COLUMN "meetingProposedTime" TEXT,
ADD COLUMN "meetingDateTimeText" TEXT,
ADD COLUMN "meetingDuration" INTEGER,
ADD COLUMN "meetingPreferences" TEXT,
ADD COLUMN "meetingNotes" TEXT,
ADD COLUMN "meetingConfidence" INTEGER,
ADD COLUMN "meetingReasonDeclined" TEXT,
ADD COLUMN "meetingCalendarEventId" TEXT,
ADD COLUMN "meetingExtractionCost" DOUBLE PRECISION;

-- CallSettings columns
ALTER TABLE "CallSettings"
ADD COLUMN "enableDemoScheduling" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "demoSchedulingAutoBook" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "demoSchedulingMinConfidence" INTEGER NOT NULL DEFAULT 70,
ADD COLUMN "demoSchedulingCalendarId" TEXT,
ADD COLUMN "demoSchedulingNotifyUser" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "demoSchedulingNotifyLead" BOOLEAN NOT NULL DEFAULT true;

-- Mark migration as applied
INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
VALUES (
    gen_random_uuid(),
    '',
    NOW(),
    '20260117_add_demo_scheduling_automation',
    NULL,
    NULL,
    NOW(),
    1
)
ON CONFLICT (migration_name) DO UPDATE
SET finished_at = NOW(),
    rolled_back_at = NULL,
    applied_steps_count = 1;
