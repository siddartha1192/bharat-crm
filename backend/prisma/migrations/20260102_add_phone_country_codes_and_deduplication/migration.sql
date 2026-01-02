-- AlterTable Lead - Add phone country code and normalization fields
ALTER TABLE "Lead" ADD COLUMN "phoneCountryCode" TEXT NOT NULL DEFAULT '+91';
ALTER TABLE "Lead" ADD COLUMN "phoneNormalized" TEXT;
ALTER TABLE "Lead" ADD COLUMN "whatsappCountryCode" TEXT;
ALTER TABLE "Lead" ADD COLUMN "whatsappNormalized" TEXT;

-- Create indexes for normalized phone fields in Lead
CREATE INDEX "Lead_phoneNormalized_idx" ON "Lead"("phoneNormalized");
CREATE INDEX "Lead_whatsappNormalized_idx" ON "Lead"("whatsappNormalized");

-- AlterTable Contact - Add phone country code and normalization fields
ALTER TABLE "Contact" ADD COLUMN "phoneCountryCode" TEXT NOT NULL DEFAULT '+91';
ALTER TABLE "Contact" ADD COLUMN "phoneNormalized" TEXT;
ALTER TABLE "Contact" ADD COLUMN "alternatePhoneCountryCode" TEXT;
ALTER TABLE "Contact" ADD COLUMN "alternatePhoneNormalized" TEXT;
ALTER TABLE "Contact" ADD COLUMN "whatsappCountryCode" TEXT;
ALTER TABLE "Contact" ADD COLUMN "whatsappNormalized" TEXT;

-- Create indexes for normalized phone fields in Contact
CREATE INDEX "Contact_phoneNormalized_idx" ON "Contact"("phoneNormalized");
CREATE INDEX "Contact_whatsappNormalized_idx" ON "Contact"("whatsappNormalized");

-- AlterTable WhatsAppConversation - Add phone country code and normalized fields
ALTER TABLE "WhatsAppConversation" ADD COLUMN "contactPhoneCountryCode" TEXT NOT NULL DEFAULT '+91';
ALTER TABLE "WhatsAppConversation" ADD COLUMN "contactPhoneNormalized" TEXT;

-- Drop old unique constraint on WhatsAppConversation
ALTER TABLE "WhatsAppConversation" DROP CONSTRAINT "WhatsAppConversation_userId_contactPhone_key";

-- Update contactPhoneNormalized with existing contactPhone values (temporary, will be properly normalized later)
UPDATE "WhatsAppConversation" SET "contactPhoneNormalized" = "contactPhone" WHERE "contactPhoneNormalized" IS NULL;

-- Make contactPhoneNormalized NOT NULL after populating
ALTER TABLE "WhatsAppConversation" ALTER COLUMN "contactPhoneNormalized" SET NOT NULL;

-- Create new unique constraint on normalized phone
CREATE UNIQUE INDEX "WhatsAppConversation_userId_contactPhoneNormalized_key" ON "WhatsAppConversation"("userId", "contactPhoneNormalized");

-- Create index for contactPhoneNormalized
CREATE INDEX "WhatsAppConversation_contactPhoneNormalized_idx" ON "WhatsAppConversation"("contactPhoneNormalized");

-- AlterTable WhatsAppMessage - Add whatsappMessageId field for deduplication
ALTER TABLE "WhatsAppMessage" ADD COLUMN "whatsappMessageId" TEXT;

-- Create unique constraint on whatsappMessageId and conversationId (not tenantId!)
-- This allows same message to appear in multiple conversations within same tenant
CREATE UNIQUE INDEX "WhatsAppMessage_whatsappMessageId_conversationId_key" ON "WhatsAppMessage"("whatsappMessageId", "conversationId") WHERE "whatsappMessageId" IS NOT NULL;

-- Create index for whatsappMessageId
CREATE INDEX "WhatsAppMessage_whatsappMessageId_idx" ON "WhatsAppMessage"("whatsappMessageId");
