-- Add phone normalization fields to Deal table
-- This migration adds phoneCountryCode and phoneNormalized fields to support
-- normalized phone numbers from leads when creating deals

-- Add phoneCountryCode column (default +91 for India)
ALTER TABLE "Deal" ADD COLUMN IF NOT EXISTS "phoneCountryCode" TEXT NOT NULL DEFAULT '+91';

-- Add phoneNormalized column for E.164 format
ALTER TABLE "Deal" ADD COLUMN IF NOT EXISTS "phoneNormalized" TEXT;

-- Copy phoneCountryCode and phoneNormalized from linked leads
UPDATE "Deal" d
SET
  "phoneCountryCode" = l."phoneCountryCode",
  "phoneNormalized" = l."phoneNormalized"
FROM "Lead" l
WHERE l."dealId" = d."id"
  AND d."phoneCountryCode" = '+91' -- Only update defaults
  AND l."phoneNormalized" IS NOT NULL;

-- Create index on phoneNormalized for faster lookups
CREATE INDEX IF NOT EXISTS "Deal_phoneNormalized_idx" ON "Deal"("phoneNormalized");

-- Create index on phoneCountryCode for filtering
CREATE INDEX IF NOT EXISTS "Deal_phoneCountryCode_idx" ON "Deal"("phoneCountryCode");
