-- Add WhatsApp support to AutomationRule table
-- This enables automation rules to send WhatsApp messages and supports multi-channel campaigns (Email + WhatsApp)

-- Add WhatsApp message template field
ALTER TABLE "AutomationRule" ADD COLUMN IF NOT EXISTS "whatsappMessage" TEXT;

-- Add WhatsApp Business template name field (optional, for approved templates)
ALTER TABLE "AutomationRule" ADD COLUMN IF NOT EXISTS "whatsappTemplate" TEXT;

-- Add comments for documentation
COMMENT ON COLUMN "AutomationRule"."whatsappMessage" IS 'WhatsApp message template with variable placeholders (e.g., {{name}}, {{company}})';
COMMENT ON COLUMN "AutomationRule"."whatsappTemplate" IS 'Optional: WhatsApp Business approved template name for template messages';
