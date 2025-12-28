-- Add WhatsApp media and template support to Campaign table
-- This enables campaigns to send media (images, documents, videos, audio) and template messages via WhatsApp

-- Add WhatsApp message type field
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "whatsappMessageType" TEXT;

-- Add WhatsApp media fields
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "whatsappMediaType" TEXT;
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "whatsappMediaUrl" TEXT;
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "whatsappCaption" TEXT;

-- Add WhatsApp template fields
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "whatsappTemplateName" TEXT;
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "whatsappTemplateLanguage" TEXT;
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "whatsappTemplateParams" JSONB;

-- Add comments for documentation
COMMENT ON COLUMN "Campaign"."whatsappMessageType" IS 'Type of WhatsApp message: text, media, or template';
COMMENT ON COLUMN "Campaign"."whatsappMediaType" IS 'Type of media: image, document, video, or audio';
COMMENT ON COLUMN "Campaign"."whatsappMediaUrl" IS 'URL to the media file (must be publicly accessible)';
COMMENT ON COLUMN "Campaign"."whatsappCaption" IS 'Caption for media messages';
COMMENT ON COLUMN "Campaign"."whatsappTemplateName" IS 'Name of the approved WhatsApp template';
COMMENT ON COLUMN "Campaign"."whatsappTemplateLanguage" IS 'Language code for the template (e.g., en, es, fr)';
COMMENT ON COLUMN "Campaign"."whatsappTemplateParams" IS 'Array of parameters for template variables';
