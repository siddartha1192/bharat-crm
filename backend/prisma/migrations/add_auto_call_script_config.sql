-- Add auto-call script configuration fields to CallSettings
ALTER TABLE "CallSettings"
ADD COLUMN "autoCallLeadCreateScriptId" TEXT,
ADD COLUMN "autoCallStageChangeScriptId" TEXT,
ADD COLUMN "autoCallStageChangeFromStage" TEXT,
ADD COLUMN "autoCallStageChangeToStage" TEXT;

-- Add comments for documentation
COMMENT ON COLUMN "CallSettings"."autoCallLeadCreateScriptId" IS 'Script to use for lead create auto-calls';
COMMENT ON COLUMN "CallSettings"."autoCallStageChangeScriptId" IS 'Script to use for stage change auto-calls';
COMMENT ON COLUMN "CallSettings"."autoCallStageChangeFromStage" IS 'Only trigger on this source stage (null = any)';
COMMENT ON COLUMN "CallSettings"."autoCallStageChangeToStage" IS 'Only trigger on this destination stage (null = any)';
