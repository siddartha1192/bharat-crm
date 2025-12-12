-- Add email field to Deal table
-- This field will be synced with the Lead's email field

-- Step 1: Add email column (nullable first to allow existing records)
ALTER TABLE "Deal" ADD COLUMN "email" TEXT;

-- Step 2: Update existing deals with email from their related lead
UPDATE "Deal"
SET "email" = "Lead"."email"
FROM "Lead"
WHERE "Lead"."dealId" = "Deal"."id";

-- Step 3: Set default email for deals without a related lead (if any)
UPDATE "Deal"
SET "email" = 'noemail@example.com'
WHERE "email" IS NULL;

-- Step 4: Make email NOT NULL now that all records have values
ALTER TABLE "Deal" ALTER COLUMN "email" SET NOT NULL;
