-- Create Invoice Template Tables
-- This migration adds support for customizable invoice HTML templates

-- Create InvoiceTemplate table
CREATE TABLE IF NOT EXISTS "InvoiceTemplate" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "htmlTemplate" TEXT NOT NULL,
  "variables" JSONB,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "version" INTEGER NOT NULL DEFAULT 1,
  "usageCount" INTEGER NOT NULL DEFAULT 0,
  "lastUsedAt" TIMESTAMP(3),
  "lastPreviewAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "tenantId" TEXT NOT NULL,
  "createdBy" TEXT NOT NULL,
  "lastEditedBy" TEXT,
  CONSTRAINT "InvoiceTemplate_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "InvoiceTemplate_lastEditedBy_fkey" FOREIGN KEY ("lastEditedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Create InvoiceTemplateVersion table
CREATE TABLE IF NOT EXISTS "InvoiceTemplateVersion" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "templateId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "changeNotes" TEXT,
  "htmlTemplate" TEXT NOT NULL,
  "changedBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "tenantId" TEXT NOT NULL,
  CONSTRAINT "InvoiceTemplateVersion_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "InvoiceTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "InvoiceTemplateVersion_changedBy_fkey" FOREIGN KEY ("changedBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create unique constraint for default template per tenant
CREATE UNIQUE INDEX IF NOT EXISTS "InvoiceTemplate_tenantId_isDefault_key" ON "InvoiceTemplate"("tenantId", "isDefault") WHERE "isDefault" = true;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "InvoiceTemplate_tenantId_idx" ON "InvoiceTemplate"("tenantId");
CREATE INDEX IF NOT EXISTS "InvoiceTemplate_isActive_idx" ON "InvoiceTemplate"("isActive");
CREATE INDEX IF NOT EXISTS "InvoiceTemplate_isDefault_idx" ON "InvoiceTemplate"("isDefault");
CREATE INDEX IF NOT EXISTS "InvoiceTemplate_createdBy_idx" ON "InvoiceTemplate"("createdBy");

CREATE INDEX IF NOT EXISTS "InvoiceTemplateVersion_templateId_idx" ON "InvoiceTemplateVersion"("templateId");
CREATE INDEX IF NOT EXISTS "InvoiceTemplateVersion_version_idx" ON "InvoiceTemplateVersion"("version");
CREATE INDEX IF NOT EXISTS "InvoiceTemplateVersion_tenantId_idx" ON "InvoiceTemplateVersion"("tenantId");
CREATE INDEX IF NOT EXISTS "InvoiceTemplateVersion_createdAt_idx" ON "InvoiceTemplateVersion"("createdAt");
