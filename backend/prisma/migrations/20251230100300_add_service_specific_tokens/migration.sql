-- Migration: Add Service-Specific Tokens for Gmail and Calendar
-- Description: Separates authentication tokens from service tokens for better isolation

-- Step 1: Add Gmail Integration columns to User table
ALTER TABLE "User"
  ADD COLUMN "gmailAccessToken" TEXT,
  ADD COLUMN "gmailRefreshToken" TEXT,
  ADD COLUMN "gmailTokenExpiry" TIMESTAMP(3),
  ADD COLUMN "gmailConnectedAt" TIMESTAMP(3),
  ADD COLUMN "gmailScopes" JSONB;

-- Step 2: Add Calendar Integration columns to User table
ALTER TABLE "User"
  ADD COLUMN "calendarAccessToken" TEXT,
  ADD COLUMN "calendarRefreshToken" TEXT,
  ADD COLUMN "calendarTokenExpiry" TIMESTAMP(3),
  ADD COLUMN "calendarConnectedAt" TIMESTAMP(3),
  ADD COLUMN "calendarScopes" JSONB;

-- Step 3: Migrate existing googleAccessToken to calendarAccessToken (if exists and not null)
-- Assuming existing tokens were primarily used for calendar integration
UPDATE "User"
SET
  "calendarAccessToken" = "googleAccessToken",
  "calendarRefreshToken" = "googleRefreshToken",
  "calendarTokenExpiry" = "googleTokenExpiry",
  "calendarConnectedAt" = NOW()
WHERE "googleAccessToken" IS NOT NULL;

-- Step 4: Drop old google token columns (kept for auth profile only now)
ALTER TABLE "User"
  DROP COLUMN IF EXISTS "googleAccessToken",
  DROP COLUMN IF EXISTS "googleRefreshToken",
  DROP COLUMN IF EXISTS "googleTokenExpiry";

-- Step 5: Add comments for documentation
COMMENT ON COLUMN "User"."gmailAccessToken" IS 'Gmail service access token (for sending/reading emails)';
COMMENT ON COLUMN "User"."gmailRefreshToken" IS 'Gmail service refresh token';
COMMENT ON COLUMN "User"."gmailTokenExpiry" IS 'Gmail token expiration timestamp';
COMMENT ON COLUMN "User"."gmailConnectedAt" IS 'When user connected Gmail integration';
COMMENT ON COLUMN "User"."gmailScopes" IS 'Array of granted Gmail OAuth scopes';
COMMENT ON COLUMN "User"."calendarAccessToken" IS 'Calendar service access token';
COMMENT ON COLUMN "User"."calendarRefreshToken" IS 'Calendar service refresh token';
COMMENT ON COLUMN "User"."calendarTokenExpiry" IS 'Calendar token expiration timestamp';
COMMENT ON COLUMN "User"."calendarConnectedAt" IS 'When user connected Calendar integration';
COMMENT ON COLUMN "User"."calendarScopes" IS 'Array of granted Calendar OAuth scopes';
COMMENT ON COLUMN "User"."googleId" IS 'Google user ID (for authentication/profile only)';
COMMENT ON COLUMN "User"."googleEmail" IS 'Google email (for authentication/profile only)';
COMMENT ON COLUMN "User"."googleProfilePic" IS 'Google profile picture URL (for authentication/profile only)';
