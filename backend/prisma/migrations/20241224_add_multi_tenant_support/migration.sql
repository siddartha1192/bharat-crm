-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'TRIAL', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SubscriptionPlan" AS ENUM ('FREE', 'BASIC', 'PROFESSIONAL', 'ENTERPRISE');

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "domain" TEXT,
    "status" "TenantStatus" NOT NULL DEFAULT 'TRIAL',
    "plan" "SubscriptionPlan" NOT NULL DEFAULT 'FREE',
    "subscriptionStart" TIMESTAMP(3),
    "subscriptionEnd" TIMESTAMP(3),
    "maxUsers" INTEGER NOT NULL DEFAULT 5,
    "settings" JSONB,
    "contactEmail" TEXT NOT NULL,
    "contactPhone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantInvitation" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'AGENT',
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "tenantId" TEXT NOT NULL,
    "invitedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantInvitation_pkey" PRIMARY KEY ("id")
);

-- AlterTable: Add tenantId to User
ALTER TABLE "User" DROP CONSTRAINT "User_email_key";
ALTER TABLE "User" ADD COLUMN "tenantId" TEXT;

-- AlterTable: Add tenantId to all other tables
ALTER TABLE "Department" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "Team" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "Lead" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "Contact" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "Invoice" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "PipelineStage" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "Deal" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "Task" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "WhatsAppConversation" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "WhatsAppMessage" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "CalendarEvent" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "EmailLog" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "AutomationRule" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "Document" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "SalesForecast" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "VectorDataUpload" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "RevenueGoal" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "AIConversation" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "AIMessage" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "Campaign" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "CampaignRecipient" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "CampaignLog" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "Form" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "FormSubmission" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "LandingPage" ADD COLUMN "tenantId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");
CREATE UNIQUE INDEX "Tenant_domain_key" ON "Tenant"("domain");
CREATE INDEX "Tenant_slug_idx" ON "Tenant"("slug");
CREATE INDEX "Tenant_status_idx" ON "Tenant"("status");

-- CreateIndex
CREATE UNIQUE INDEX "TenantInvitation_token_key" ON "TenantInvitation"("token");
CREATE UNIQUE INDEX "TenantInvitation_tenantId_email_key" ON "TenantInvitation"("tenantId", "email");
CREATE INDEX "TenantInvitation_tenantId_idx" ON "TenantInvitation"("tenantId");
CREATE INDEX "TenantInvitation_token_idx" ON "TenantInvitation"("token");
CREATE INDEX "TenantInvitation_email_idx" ON "TenantInvitation"("email");

-- CreateIndex: Add tenantId indexes
CREATE UNIQUE INDEX "User_email_tenantId_key" ON "User"("email", "tenantId");
CREATE INDEX "User_tenantId_idx" ON "User"("tenantId");
CREATE INDEX "Department_tenantId_idx" ON "Department"("tenantId");
CREATE INDEX "Team_tenantId_idx" ON "Team"("tenantId");
CREATE INDEX "Lead_tenantId_idx" ON "Lead"("tenantId");
CREATE INDEX "Contact_tenantId_idx" ON "Contact"("tenantId");
CREATE INDEX "Invoice_tenantId_idx" ON "Invoice"("tenantId");
CREATE INDEX "PipelineStage_tenantId_idx" ON "PipelineStage"("tenantId");
CREATE INDEX "Deal_tenantId_idx" ON "Deal"("tenantId");
CREATE INDEX "Task_tenantId_idx" ON "Task"("tenantId");
CREATE INDEX "WhatsAppConversation_tenantId_idx" ON "WhatsAppConversation"("tenantId");
CREATE INDEX "WhatsAppMessage_tenantId_idx" ON "WhatsAppMessage"("tenantId");
CREATE INDEX "CalendarEvent_tenantId_idx" ON "CalendarEvent"("tenantId");
CREATE INDEX "EmailLog_tenantId_idx" ON "EmailLog"("tenantId");
CREATE INDEX "AutomationRule_tenantId_idx" ON "AutomationRule"("tenantId");
CREATE INDEX "Document_tenantId_idx" ON "Document"("tenantId");
CREATE INDEX "SalesForecast_tenantId_idx" ON "SalesForecast"("tenantId");
CREATE INDEX "VectorDataUpload_tenantId_idx" ON "VectorDataUpload"("tenantId");
CREATE INDEX "RevenueGoal_tenantId_idx" ON "RevenueGoal"("tenantId");
CREATE INDEX "AIConversation_tenantId_idx" ON "AIConversation"("tenantId");
CREATE INDEX "AIMessage_tenantId_idx" ON "AIMessage"("tenantId");
CREATE INDEX "Campaign_tenantId_idx" ON "Campaign"("tenantId");
CREATE INDEX "CampaignRecipient_tenantId_idx" ON "CampaignRecipient"("tenantId");
CREATE INDEX "CampaignLog_tenantId_idx" ON "CampaignLog"("tenantId");
CREATE INDEX "Form_tenantId_idx" ON "Form"("tenantId");
CREATE INDEX "FormSubmission_tenantId_idx" ON "FormSubmission"("tenantId");
CREATE INDEX "LandingPage_tenantId_idx" ON "LandingPage"("tenantId");

-- AddForeignKey
ALTER TABLE "TenantInvitation" ADD CONSTRAINT "TenantInvitation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
