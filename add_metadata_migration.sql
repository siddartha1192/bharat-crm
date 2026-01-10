-- Add metadata column to CallLog table for storing conversation history
ALTER TABLE "CallLog" ADD COLUMN "metadata" JSONB;
