-- AlterTable CallLog - Add demo scheduling fields
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

-- AlterTable CallSettings - Add demo scheduling automation settings
ALTER TABLE "CallSettings"
ADD COLUMN "enableDemoScheduling" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "demoSchedulingAutoBook" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "demoSchedulingMinConfidence" INTEGER NOT NULL DEFAULT 70,
ADD COLUMN "demoSchedulingCalendarId" TEXT,
ADD COLUMN "demoSchedulingNotifyUser" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "demoSchedulingNotifyLead" BOOLEAN NOT NULL DEFAULT true;
