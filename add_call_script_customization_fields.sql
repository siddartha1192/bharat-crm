-- Add customization fields to CallScript table for tenant-specific AI tuning
-- This allows each tenant to customize company name, product info, features, and benefits

ALTER TABLE "CallScript" ADD COLUMN "companyName" TEXT;
ALTER TABLE "CallScript" ADD COLUMN "productName" TEXT;
ALTER TABLE "CallScript" ADD COLUMN "productDescription" TEXT;
ALTER TABLE "CallScript" ADD COLUMN "keyFeatures" JSONB;
ALTER TABLE "CallScript" ADD COLUMN "keyBenefits" JSONB;
ALTER TABLE "CallScript" ADD COLUMN "targetAudience" TEXT;
ALTER TABLE "CallScript" ADD COLUMN "valueProposition" TEXT;

-- Add helpful comment
COMMENT ON COLUMN "CallScript"."companyName" IS 'Company name for AI to use (e.g., "Bharat CRM", "TechBobbles")';
COMMENT ON COLUMN "CallScript"."productName" IS 'Product or service name';
COMMENT ON COLUMN "CallScript"."productDescription" IS 'Brief description of product/service';
COMMENT ON COLUMN "CallScript"."keyFeatures" IS 'Array of key features to highlight: ["Feature 1", "Feature 2", ...]';
COMMENT ON COLUMN "CallScript"."keyBenefits" IS 'Array of key benefits: ["Benefit 1", "Benefit 2", ...]';
COMMENT ON COLUMN "CallScript"."targetAudience" IS 'Who is this for? Helps AI tailor messaging';
COMMENT ON COLUMN "CallScript"."valueProposition" IS 'Main selling point or unique value proposition';
