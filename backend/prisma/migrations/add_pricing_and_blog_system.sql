-- Update SubscriptionPlan enum: BASIC -> STANDARD
-- Note: This requires careful handling. PostgreSQL enum modification:
-- 1. Add new enum value if it doesn't exist
-- 2. Update existing data
-- 3. Remove old enum value

-- Add STANDARD if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'STANDARD' AND enumtypid = 'SubscriptionPlan'::regtype) THEN
        ALTER TYPE "SubscriptionPlan" ADD VALUE 'STANDARD';
    END IF;
END$$;

-- Update any existing BASIC plans to STANDARD
UPDATE "Tenant" SET "plan" = 'STANDARD' WHERE "plan" = 'BASIC';

-- Note: Removing BASIC from enum requires more complex migration
-- For now, both BASIC and STANDARD will coexist in the enum
-- To fully remove BASIC, a manual migration would be needed

-- CreateTable: NewsletterSubscription
CREATE TABLE "NewsletterSubscription" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "subscribedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unsubscribedAt" TIMESTAMP(3),
    "unsubscribeToken" TEXT NOT NULL,
    "source" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "referrer" TEXT,
    "preferences" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NewsletterSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable: BlogPost
CREATE TABLE "BlogPost" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "featuredImage" TEXT,
    "featuredImageAlt" TEXT,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "category" TEXT NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" TEXT NOT NULL DEFAULT 'draft',
    "publishedAt" TIMESTAMP(3),
    "scheduledFor" TIMESTAMP(3),
    "author" TEXT NOT NULL DEFAULT 'Bharat CRM Team',
    "authorEmail" TEXT,
    "authorBio" TEXT,
    "authorImage" TEXT,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "readTime" INTEGER,
    "relatedFeature" TEXT,
    "emailSentToSubscribers" BOOLEAN NOT NULL DEFAULT false,
    "emailSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlogPost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscription_email_key" ON "NewsletterSubscription"("email");
CREATE UNIQUE INDEX "NewsletterSubscription_unsubscribeToken_key" ON "NewsletterSubscription"("unsubscribeToken");
CREATE INDEX "NewsletterSubscription_email_idx" ON "NewsletterSubscription"("email");
CREATE INDEX "NewsletterSubscription_isActive_idx" ON "NewsletterSubscription"("isActive");
CREATE INDEX "NewsletterSubscription_subscribedAt_idx" ON "NewsletterSubscription"("subscribedAt");

CREATE UNIQUE INDEX "BlogPost_slug_key" ON "BlogPost"("slug");
CREATE INDEX "BlogPost_slug_idx" ON "BlogPost"("slug");
CREATE INDEX "BlogPost_status_idx" ON "BlogPost"("status");
CREATE INDEX "BlogPost_publishedAt_idx" ON "BlogPost"("publishedAt");
CREATE INDEX "BlogPost_category_idx" ON "BlogPost"("category");
CREATE INDEX "BlogPost_relatedFeature_idx" ON "BlogPost"("relatedFeature");
