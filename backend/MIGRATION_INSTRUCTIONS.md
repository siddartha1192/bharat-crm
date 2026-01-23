# UTM Tracking System Migration Instructions

## Overview

This migration adds comprehensive UTM tracking capabilities to Bharat CRM, including:
- Automatic UTM tagging for email and WhatsApp campaigns
- Platform-specific UTM parameters
- Click tracking and analytics
- Short link generation
- Conversion funnel tracking
- Manual link creation for external platforms (YouTube, social media, etc.)

## Database Changes

The migration will:
1. Add UTM configuration fields to the `Campaign` table
2. Add click tracking fields to the `CampaignRecipient` table
3. Create three new tables: `campaign_links`, `campaign_clicks`, `utm_templates`
4. Add appropriate indexes and foreign key constraints

## How to Apply the Migration

### Option 1: Using the Migration Script (Recommended)

```bash
cd backend
bash apply-utm-migration.sh
```

This script will:
- Verify database connection
- Apply the migration
- Regenerate the Prisma Client
- Provide status updates

### Option 2: Docker Compose Environment

If you're running in Docker Compose:

```bash
# Stop the backend service
docker-compose stop backend

# Run the migration
docker-compose exec postgres psql -U <username> -d bharat_crm -f /app/prisma/migrations/20260123_add_utm_tracking_system/migration.sql

# Or use Prisma migrate
docker-compose exec backend npx prisma migrate deploy

# Restart the backend
docker-compose up -d backend
```

### Option 3: Manual Prisma Migration

```bash
cd backend

# Apply migrations
npx prisma migrate deploy

# Regenerate Prisma Client
npx prisma generate

# Restart your backend server
```

### Option 4: Direct Database SQL (Advanced)

If you prefer to apply the SQL directly:

```bash
cd backend
psql -h localhost -U <username> -d bharat_crm < prisma/migrations/20260123_add_utm_tracking_system/migration.sql

# Then regenerate Prisma Client
npx prisma generate
```

## Verification

After applying the migration, verify it worked:

```bash
# Check migration status
npx prisma migrate status

# You should see "20260123_add_utm_tracking_system" as applied
```

You can also check the database directly:

```sql
-- Verify new columns in Campaign table
\d "Campaign"

-- Verify new tables exist
\dt campaign_*
\dt utm_*
```

## Troubleshooting

### Error: "column Campaign.utmSource does not exist"

This means the migration hasn't been applied yet. Follow the steps above.

### Error: "Can't reach database server"

1. Verify your database is running
2. Check `DATABASE_URL` in your `.env` file
3. Ensure the database accepts connections from your host

### Error: "Permission denied"

The database user needs permissions to:
- ALTER TABLE
- CREATE TABLE
- CREATE INDEX

Grant necessary permissions:

```sql
GRANT ALL PRIVILEGES ON DATABASE bharat_crm TO <username>;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO <username>;
```

### Migration Already Applied

If you get an error that tables already exist, the migration may have been partially applied. You can:

1. Check what exists:
   ```sql
   SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'campaign_%';
   ```

2. Apply remaining changes manually or rollback and reapply

## After Migration

1. **Restart your backend server** to load the new Prisma Client
2. **Access campaign settings** to configure UTM parameters
3. **Test the features**:
   - Create a campaign with UTM tagging enabled
   - Send a test email
   - Click the links
   - View analytics at `/api/links/analytics/:campaignId`

## New API Endpoints

After migration, these endpoints will be available:

- `GET /l/:shortCode` - Public redirect endpoint for short links
- `GET /api/links/analytics/:campaignId` - Campaign link analytics
- `GET /api/links/conversion-funnel/:campaignId` - Conversion funnel data
- `POST /api/links/create-short-link` - Manual short link creation
- `GET /api/links/manual-analytics` - Analytics for manual links

## Frontend Components

New React components have been added:

- `UtmConfigSection.tsx` - UTM configuration in campaign settings
- `CampaignAnalytics.tsx` - Analytics dashboard
- `UtmGenerator.tsx` - Standalone URL generator for external platforms

## Need Help?

If you encounter issues:

1. Check backend logs for detailed error messages
2. Verify database connectivity
3. Ensure Prisma Client is regenerated after migration
4. Check the migration file at: `prisma/migrations/20260123_add_utm_tracking_system/migration.sql`

## Rollback (If Needed)

To rollback this migration:

```sql
-- Remove tables
DROP TABLE IF EXISTS "campaign_clicks" CASCADE;
DROP TABLE IF EXISTS "campaign_links" CASCADE;
DROP TABLE IF EXISTS "utm_templates" CASCADE;

-- Remove columns from Campaign
ALTER TABLE "Campaign"
  DROP COLUMN IF EXISTS "utmSource",
  DROP COLUMN IF EXISTS "utmMedium",
  DROP COLUMN IF EXISTS "utmCampaign",
  DROP COLUMN IF EXISTS "utmTerm",
  DROP COLUMN IF EXISTS "utmContent",
  DROP COLUMN IF EXISTS "platformUtmConfig",
  DROP COLUMN IF EXISTS "autoTagLinks",
  DROP COLUMN IF EXISTS "trackClicks",
  DROP COLUMN IF EXISTS "useShortLinks";

-- Remove columns from CampaignRecipient
ALTER TABLE "CampaignRecipient"
  DROP COLUMN IF EXISTS "clickedCount",
  DROP COLUMN IF EXISTS "firstClickedAt",
  DROP COLUMN IF EXISTS "lastClickedAt";
```

Then regenerate Prisma Client: `npx prisma generate`
