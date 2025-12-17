-- Add phone field to Deal table for proper lead-deal sync
-- This ensures phone numbers are properly synced between leads and deals

-- Add phone column to Deal table with default empty string
ALTER TABLE "Deal" ADD COLUMN IF NOT EXISTS "phone" TEXT NOT NULL DEFAULT '';

-- Update existing deals with phone from linked leads
UPDATE "Deal" d
SET "phone" = l."phone"
FROM "Lead" l
WHERE l."dealId" = d."id"
AND d."phone" = '';

-- Create index on phone for faster queries
CREATE INDEX IF NOT EXISTS "Deal_phone_idx" ON "Deal"("phone");
