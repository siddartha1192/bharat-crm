-- AlterTable: Add recording and transcription controls to CallScript
-- This allows each script to have its own recording/transcription settings

ALTER TABLE "CallScript" ADD COLUMN "enableRecording" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "CallScript" ADD COLUMN "enableTranscription" BOOLEAN NOT NULL DEFAULT true;

-- Add comments for documentation
COMMENT ON COLUMN "CallScript"."enableRecording" IS 'Enable call recording for calls using this script';
COMMENT ON COLUMN "CallScript"."enableTranscription" IS 'Enable call transcription for calls using this script';
