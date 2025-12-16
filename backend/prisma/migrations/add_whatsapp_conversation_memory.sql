-- Add conversation memory management to WhatsApp conversations
-- This prevents unbounded growth of WhatsApp messages in database

-- Add summary and messageCount fields to WhatsAppConversation
ALTER TABLE "WhatsAppConversation"
  ADD COLUMN "summary" TEXT,
  ADD COLUMN "messageCount" INTEGER NOT NULL DEFAULT 0;

-- Initialize messageCount for existing conversations
UPDATE "WhatsAppConversation"
SET "messageCount" = (
  SELECT COUNT(*)
  FROM "WhatsAppMessage"
  WHERE "WhatsAppMessage"."conversationId" = "WhatsAppConversation"."id"
);
