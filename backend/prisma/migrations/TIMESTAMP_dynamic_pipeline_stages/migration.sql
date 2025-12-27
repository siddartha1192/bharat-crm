-- Migration: Dynamic Pipeline Stages System
-- Description: Makes pipeline stages the single source of truth for all stage management

-- Step 1: Add stageType enum to categorize stages
CREATE TYPE "StageType" AS ENUM ('LEAD', 'DEAL', 'BOTH');

-- Step 2: Modify PipelineStage table
ALTER TABLE "PipelineStage"
  ADD COLUMN "stageType" "StageType" NOT NULL DEFAULT 'BOTH',
  ADD COLUMN "isSystemDefault" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "description" TEXT;

-- Remove userId from PipelineStage (stages are tenant-level, not user-level)
-- First, drop the existing unique constraint
ALTER TABLE "PipelineStage" DROP CONSTRAINT IF EXISTS "PipelineStage_userId_slug_key";

-- Update existing pipeline stages to be tenant-level (remove userId)
UPDATE "PipelineStage" SET "userId" = NULL;

-- Drop the foreign key and userId column
ALTER TABLE "PipelineStage" DROP CONSTRAINT IF EXISTS "PipelineStage_userId_fkey";
ALTER TABLE "PipelineStage" DROP COLUMN "userId";

-- Add new unique constraint for tenant-level stages
ALTER TABLE "PipelineStage" ADD CONSTRAINT "PipelineStage_tenantId_slug_key" UNIQUE ("tenantId", "slug");

-- Step 3: Add stageId to Lead table (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Lead' AND column_name = 'stageId'
  ) THEN
    ALTER TABLE "Lead" ADD COLUMN "stageId" TEXT;
  END IF;
END $$;

-- Step 4: Create default "New Lead" stage for each tenant
INSERT INTO "PipelineStage" ("id", "name", "slug", "color", "order", "isDefault", "isSystemDefault", "isActive", "tenantId", "stageType", "description", "createdAt", "updatedAt")
SELECT
  gen_random_uuid(),
  'New Lead',
  'new-lead',
  'blue',
  1,
  true,
  true,
  true,
  t."id",
  'LEAD'::"StageType",
  'Default stage for new leads',
  NOW(),
  NOW()
FROM "Tenant" t
WHERE NOT EXISTS (
  SELECT 1 FROM "PipelineStage" ps
  WHERE ps."tenantId" = t."id"
    AND ps."slug" = 'new-lead'
    AND ps."isSystemDefault" = true
);

-- Step 5: Migrate existing leads to use stageId
-- Map old status values to new stages (create if needed)
DO $$
DECLARE
  tenant_record RECORD;
  status_record RECORD;
  stage_id TEXT;
  stage_mapping JSONB := '{
    "new": {"name": "New Lead", "slug": "new-lead", "color": "blue", "order": 1},
    "contacted": {"name": "Contacted", "slug": "contacted", "color": "cyan", "order": 2},
    "qualified": {"name": "Qualified", "slug": "qualified", "color": "green", "order": 3},
    "proposal": {"name": "Proposal", "slug": "proposal", "color": "amber", "order": 4},
    "negotiation": {"name": "Negotiation", "slug": "negotiation", "color": "orange", "order": 5},
    "won": {"name": "Won", "slug": "won", "color": "emerald", "order": 6},
    "lost": {"name": "Lost", "slug": "lost", "color": "red", "order": 7}
  }'::JSONB;
BEGIN
  -- For each tenant
  FOR tenant_record IN SELECT DISTINCT "tenantId" FROM "Lead"
  LOOP
    -- For each unique status in leads for this tenant
    FOR status_record IN
      SELECT DISTINCT "status"
      FROM "Lead"
      WHERE "tenantId" = tenant_record."tenantId"
        AND "status" IS NOT NULL
        AND "status" != ''
    LOOP
      -- Check if stage exists for this status
      SELECT "id" INTO stage_id
      FROM "PipelineStage"
      WHERE "tenantId" = tenant_record."tenantId"
        AND "slug" = COALESCE(
          stage_mapping->status_record."status"->>'slug',
          lower(regexp_replace(status_record."status", '[^a-zA-Z0-9]+', '-', 'g'))
        )
      LIMIT 1;

      -- If stage doesn't exist, create it
      IF stage_id IS NULL THEN
        INSERT INTO "PipelineStage" (
          "id", "name", "slug", "color", "order", "isDefault", "isSystemDefault",
          "isActive", "tenantId", "stageType", "createdAt", "updatedAt"
        )
        VALUES (
          gen_random_uuid(),
          COALESCE(stage_mapping->status_record."status"->>'name', initcap(status_record."status")),
          COALESCE(
            stage_mapping->status_record."status"->>'slug',
            lower(regexp_replace(status_record."status", '[^a-zA-Z0-9]+', '-', 'g'))
          ),
          COALESCE(stage_mapping->status_record."status"->>'color', 'gray'),
          COALESCE((stage_mapping->status_record."status"->>'order')::INT, 99),
          false,
          false,
          true,
          tenant_record."tenantId",
          'LEAD'::"StageType",
          NOW(),
          NOW()
        )
        RETURNING "id" INTO stage_id;
      END IF;

      -- Update leads to use stageId
      UPDATE "Lead"
      SET "stageId" = stage_id
      WHERE "tenantId" = tenant_record."tenantId"
        AND "status" = status_record."status"
        AND "stageId" IS NULL;
    END LOOP;
  END LOOP;
END $$;

-- Step 6: Ensure stageId foreign key exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'Lead_stageId_fkey'
  ) THEN
    ALTER TABLE "Lead"
      ADD CONSTRAINT "Lead_stageId_fkey"
      FOREIGN KEY ("stageId")
      REFERENCES "PipelineStage"("id")
      ON DELETE RESTRICT
      ON UPDATE CASCADE;
  END IF;
END $$;

-- Step 7: Make stageId NOT NULL for Lead (after migration)
-- First set default for any NULL values
UPDATE "Lead"
SET "stageId" = (
  SELECT "id" FROM "PipelineStage"
  WHERE "PipelineStage"."tenantId" = "Lead"."tenantId"
    AND "PipelineStage"."isSystemDefault" = true
    AND "PipelineStage"."stageType" IN ('LEAD', 'BOTH')
  LIMIT 1
)
WHERE "stageId" IS NULL;

-- Now make it NOT NULL
ALTER TABLE "Lead" ALTER COLUMN "stageId" SET NOT NULL;

-- Step 8: Update Deal stageId to be NOT NULL and properly linked
UPDATE "Deal"
SET "stageId" = (
  SELECT "id" FROM "PipelineStage"
  WHERE "PipelineStage"."tenantId" = "Deal"."tenantId"
    AND "PipelineStage"."slug" = "Deal"."stage"
  LIMIT 1
)
WHERE "stageId" IS NULL AND "stage" IS NOT NULL;

-- If still NULL, use system default or first available stage
UPDATE "Deal"
SET "stageId" = (
  SELECT "id" FROM "PipelineStage"
  WHERE "PipelineStage"."tenantId" = "Deal"."tenantId"
    AND "PipelineStage"."stageType" IN ('DEAL', 'BOTH')
  ORDER BY "order" ASC
  LIMIT 1
)
WHERE "stageId" IS NULL;

-- Make Deal.stageId NOT NULL
ALTER TABLE "Deal" ALTER COLUMN "stageId" SET NOT NULL;

-- Step 9: Create indexes for performance
CREATE INDEX IF NOT EXISTS "PipelineStage_tenantId_stageType_idx" ON "PipelineStage"("tenantId", "stageType");
CREATE INDEX IF NOT EXISTS "PipelineStage_isSystemDefault_idx" ON "PipelineStage"("isSystemDefault");
CREATE INDEX IF NOT EXISTS "Lead_stageId_idx" ON "Lead"("stageId");
CREATE INDEX IF NOT EXISTS "Deal_stageId_idx" ON "Deal"("stageId");

-- Step 10: Add comments for documentation
COMMENT ON COLUMN "PipelineStage"."stageType" IS 'Defines whether stage is for leads, deals, or both';
COMMENT ON COLUMN "PipelineStage"."isSystemDefault" IS 'True for the default "New Lead" stage created per tenant';
COMMENT ON COLUMN "Lead"."stageId" IS 'Foreign key to PipelineStage - single source of truth for lead stages';
COMMENT ON COLUMN "Deal"."stageId" IS 'Foreign key to PipelineStage - single source of truth for deal stages';
