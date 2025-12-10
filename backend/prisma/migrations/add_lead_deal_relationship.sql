-- Migration: Add Lead-Deal Relationship
-- This migration adds a bi-directional relationship between Lead and Deal
-- When a Lead is created, a Deal is automatically created in the pipeline

-- Add dealId column to Lead table
ALTER TABLE "Lead" ADD COLUMN "dealId" TEXT;

-- Add unique constraint on dealId
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_dealId_key" UNIQUE ("dealId");

-- Add foreign key constraint
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_dealId_fkey"
  FOREIGN KEY ("dealId") REFERENCES "Deal"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Create index on dealId for faster lookups
CREATE INDEX "Lead_dealId_idx" ON "Lead"("dealId");

-- Note: The "Lead" backref in Deal model is automatically handled by Prisma
-- No changes needed to Deal table structure
