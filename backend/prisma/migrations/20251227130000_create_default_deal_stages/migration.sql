-- Migration: Create Essential Default Deal Stages for All Tenants
-- Description: Ensures every tenant has three critical stages: Lead, Closed Won, Closed Lost
-- These stages are required for proper reporting and deal conversion tracking

-- Step 1: Create "Lead" stage for all tenants (if not exists)
INSERT INTO "PipelineStage" ("id", "name", "slug", "color", "order", "isDefault", "isSystemDefault", "isActive", "tenantId", "stageType", "description", "isNewLeadStage", "isWonStage", "isLostStage", "createdAt", "updatedAt")
SELECT
  gen_random_uuid(),
  'Lead',
  'lead',
  'blue',
  1,
  true,
  true,
  true,
  t."id",
  'DEAL'::"StageType",
  'Default stage for new deals and opportunities',
  true,  -- Mark as new lead stage for conversion tracking
  false,
  false,
  NOW(),
  NOW()
FROM "Tenant" t
WHERE NOT EXISTS (
  SELECT 1 FROM "PipelineStage" ps
  WHERE ps."tenantId" = t."id"
    AND ps."slug" = 'lead'
    AND ps."isSystemDefault" = true
);

-- Step 2: Create "Closed Won" stage for all tenants (if not exists)
INSERT INTO "PipelineStage" ("id", "name", "slug", "color", "order", "isDefault", "isSystemDefault", "isActive", "tenantId", "stageType", "description", "isNewLeadStage", "isWonStage", "isLostStage", "createdAt", "updatedAt")
SELECT
  gen_random_uuid(),
  'Closed Won',
  'closed-won',
  'emerald',
  100,  -- High order number so it appears at the end
  true,
  true,
  true,
  t."id",
  'DEAL'::"StageType",
  'Deal successfully closed and won',
  false,
  true,  -- Mark as won stage for conversion rate calculations
  false,
  NOW(),
  NOW()
FROM "Tenant" t
WHERE NOT EXISTS (
  SELECT 1 FROM "PipelineStage" ps
  WHERE ps."tenantId" = t."id"
    AND ps."slug" = 'closed-won'
    AND ps."isSystemDefault" = true
);

-- Step 3: Create "Closed Lost" stage for all tenants (if not exists)
INSERT INTO "PipelineStage" ("id", "name", "slug", "color", "order", "isDefault", "isSystemDefault", "isActive", "tenantId", "stageType", "description", "isNewLeadStage", "isWonStage", "isLostStage", "createdAt", "updatedAt")
SELECT
  gen_random_uuid(),
  'Closed Lost',
  'closed-lost',
  'red',
  101,  -- High order number so it appears at the end
  true,
  true,
  true,
  t."id",
  'DEAL'::"StageType",
  'Deal lost or rejected',
  false,
  false,
  true,  -- Mark as lost stage for conversion rate calculations
  NOW(),
  NOW()
FROM "Tenant" t
WHERE NOT EXISTS (
  SELECT 1 FROM "PipelineStage" ps
  WHERE ps."tenantId" = t."id"
    AND ps."slug" = 'closed-lost'
    AND ps."isSystemDefault" = true
);

-- Step 4: Log the created stages
DO $$
DECLARE
  tenant_count INTEGER;
BEGIN
  SELECT COUNT(DISTINCT "tenantId") INTO tenant_count FROM "PipelineStage"
  WHERE "slug" IN ('lead', 'closed-won', 'closed-lost') AND "isSystemDefault" = true;

  RAISE NOTICE 'Created default deal stages (Lead, Closed Won, Closed Lost) for % tenants', tenant_count;
END $$;
