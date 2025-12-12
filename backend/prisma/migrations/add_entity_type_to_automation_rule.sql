-- Migration: Add entityType field to AutomationRule table
-- This allows automations to be specific to either leads or deals

-- Add entityType column with default value 'lead' for backward compatibility
ALTER TABLE "AutomationRule" ADD COLUMN "entityType" TEXT NOT NULL DEFAULT 'lead';

-- Add comment explaining the column
COMMENT ON COLUMN "AutomationRule"."entityType" IS 'Entity type this automation applies to: lead or deal';
