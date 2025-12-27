-- Migration: Add Stage Mapping for Conversion Rates
-- Description: Add fields to mark special stages (new lead, won, lost) for accurate conversion rate calculations

-- Step 1: Add stage mapping boolean fields to PipelineStage
ALTER TABLE "PipelineStage"
  ADD COLUMN IF NOT EXISTS "isNewLeadStage" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "isWonStage" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "isLostStage" BOOLEAN NOT NULL DEFAULT false;

-- Step 2: Auto-detect and mark won/lost/new stages based on slug patterns
-- This provides backward compatibility with existing stages

-- Mark won stages (slugs containing 'won')
UPDATE "PipelineStage"
SET "isWonStage" = true
WHERE "slug" ILIKE '%won%'
  AND "isActive" = true
  AND "stageType" IN ('DEAL', 'BOTH');

-- Mark lost stages (slugs containing 'lost')
UPDATE "PipelineStage"
SET "isLostStage" = true
WHERE "slug" ILIKE '%lost%'
  AND "isActive" = true
  AND "stageType" IN ('DEAL', 'BOTH');

-- Mark new lead stages (system default stages or slugs containing 'new')
UPDATE "PipelineStage"
SET "isNewLeadStage" = true
WHERE (
  "isSystemDefault" = true
  OR "slug" ILIKE '%new%'
  OR "slug" ILIKE '%lead%'
)
AND "isActive" = true
AND "stageType" IN ('LEAD', 'BOTH');

-- Step 3: Create indexes for performance
CREATE INDEX IF NOT EXISTS "PipelineStage_isWonStage_idx" ON "PipelineStage"("isWonStage");
CREATE INDEX IF NOT EXISTS "PipelineStage_isLostStage_idx" ON "PipelineStage"("isLostStage");
CREATE INDEX IF NOT EXISTS "PipelineStage_isNewLeadStage_idx" ON "PipelineStage"("isNewLeadStage");

-- Step 4: Add comments for documentation
COMMENT ON COLUMN "PipelineStage"."isNewLeadStage" IS 'True if this is the default stage for new leads (used for conversion rate calculations)';
COMMENT ON COLUMN "PipelineStage"."isWonStage" IS 'True if this is a won/closed-won stage (used for conversion rate calculations)';
COMMENT ON COLUMN "PipelineStage"."isLostStage" IS 'True if this is a lost/closed-lost stage (used for conversion rate calculations)';
