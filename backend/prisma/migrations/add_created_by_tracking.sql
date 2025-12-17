-- Add createdBy field to all entities for tracking who created them
-- This enables enterprise-grade assignment and visibility management

-- Add createdBy to Lead
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "createdBy" TEXT;
CREATE INDEX IF NOT EXISTS "Lead_createdBy_idx" ON "Lead"("createdBy");

-- Backfill createdBy with userId for existing leads
UPDATE "Lead" SET "createdBy" = "userId" WHERE "createdBy" IS NULL;

-- Add createdBy to Contact
ALTER TABLE "Contact" ADD COLUMN IF NOT EXISTS "createdBy" TEXT;
CREATE INDEX IF NOT EXISTS "Contact_createdBy_idx" ON "Contact"("createdBy");

-- Backfill createdBy with userId for existing contacts
UPDATE "Contact" SET "createdBy" = "userId" WHERE "createdBy" IS NULL;

-- Add createdBy to Deal
ALTER TABLE "Deal" ADD COLUMN IF NOT EXISTS "createdBy" TEXT;
CREATE INDEX IF NOT EXISTS "Deal_createdBy_idx" ON "Deal"("createdBy");

-- Backfill createdBy with userId for existing deals
UPDATE "Deal" SET "createdBy" = "userId" WHERE "createdBy" IS NULL;

-- Add createdBy to Task
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "createdBy" TEXT;
CREATE INDEX IF NOT EXISTS "Task_createdBy_idx" ON "Task"("createdBy");

-- Backfill createdBy with userId for existing tasks
UPDATE "Task" SET "createdBy" = "userId" WHERE "createdBy" IS NULL;
