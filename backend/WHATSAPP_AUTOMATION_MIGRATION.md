# WhatsApp Automation Migration Guide

## Overview

This migration adds WhatsApp support to the AutomationRule table, enabling:
- WhatsApp-only automation rules
- Email-only automation rules (existing)
- Combined Email + WhatsApp campaigns (new)

## Migration Files Created

1. **Migration SQL**: `prisma/migrations/20251229000000_add_whatsapp_to_automation_rules/migration.sql`
2. **Migration Script**: `apply-whatsapp-automation-migration.js`

## How to Apply the Migration

### Option 1: Using the Migration Script (Recommended)

When the backend server and database are running:

```bash
cd backend
node apply-whatsapp-automation-migration.js
```

This script will:
- Apply the migration SQL
- Verify the columns were added
- Show table structure
- Display existing automation rule count

### Option 2: Using Prisma Migrate (Alternative)

If you prefer using Prisma's migration system:

```bash
cd backend

# Mark the migration as applied (since we created it manually)
npx prisma migrate resolve --applied 20251229000000_add_whatsapp_to_automation_rules

# Or run all pending migrations
npx prisma migrate deploy
```

### Option 3: Manual SQL Execution

Connect to your PostgreSQL database and run:

```sql
-- Add WhatsApp message template field
ALTER TABLE "AutomationRule" ADD COLUMN IF NOT EXISTS "whatsappMessage" TEXT;

-- Add WhatsApp Business template name field
ALTER TABLE "AutomationRule" ADD COLUMN IF NOT EXISTS "whatsappTemplate" TEXT;

-- Add comments
COMMENT ON COLUMN "AutomationRule"."whatsappMessage" IS 'WhatsApp message template with variable placeholders (e.g., {{name}}, {{company}})';
COMMENT ON COLUMN "AutomationRule"."whatsappTemplate" IS 'Optional: WhatsApp Business approved template name for template messages';
```

## Troubleshooting

### Issue: Prisma Version Mismatch

If you see errors about Prisma 7.x configuration:

```
Error: The datasource property `url` is no longer supported in schema files
```

**Solution**: Use the migration script instead of `prisma migrate dev`, as it works with any Prisma version.

### Issue: Database Not Running

If you see:

```
Error: P1001: Can't reach database server at `localhost:5432`
```

**Solution**: Start your PostgreSQL database first:

```bash
# If using Docker
docker-compose up -d postgres

# If using systemd
sudo systemctl start postgresql
```

### Issue: Migration Already Applied

If columns already exist, the migration uses `IF NOT EXISTS` so it's safe to run multiple times.

## Verification

After applying the migration, verify it worked:

```bash
# Connect to PostgreSQL
psql -h localhost -U username -d bharat_crm

# Check table structure
\d "AutomationRule"

# You should see:
# - whatsappMessage | text | nullable
# - whatsappTemplate | text | nullable
```

## What's New

### Database Schema

**AutomationRule table** now has:

- `whatsappMessage` (TEXT, nullable): WhatsApp message template with variables like {{name}}, {{company}}, {{fromStage}}, {{toStage}}
- `whatsappTemplate` (TEXT, nullable): Optional WhatsApp Business approved template name

### Backend API

**New endpoint**: `GET /api/automation/whatsapp-templates`
- Returns default WhatsApp message templates for lead_created and stage_change events

**Updated logic** in `services/automation.js`:
- `executeWhatsAppAction()`: Sends WhatsApp messages via WhatsApp service
- Support for `actionType`: 'send_email', 'send_whatsapp', or 'send_both'
- Template variable replacement for WhatsApp messages
- Smart phone number detection (whatsapp field → phone fallback)

### Frontend UI

**AutomationSettings component** (`src/components/settings/AutomationSettings.tsx`):
- Action type selector with Email, WhatsApp, and Both options
- Conditional rendering of email/WhatsApp fields
- WhatsApp message editor with template loading
- Visual channel indicators (blue Mail icon, green MessageSquare icon)
- Formatting guides for WhatsApp markdown

## Features Enabled

Once migration is applied, you can:

1. **Create WhatsApp-only automation rules**:
   - Trigger: Lead created, Stage changed, etc.
   - Action: Send WhatsApp message
   - Uses default or custom WhatsApp templates

2. **Create Email-only automation rules** (existing):
   - Trigger: Lead created, Stage changed
   - Action: Send Email
   - Uses default or custom email templates

3. **Create multi-channel campaigns**:
   - Trigger: Any automation event
   - Action: Send Both Email & WhatsApp
   - Sends both messages in parallel
   - Continues even if one channel fails

## Template Variables

Both email and WhatsApp templates support these variables:

- `{{name}}`: Contact name
- `{{company}}`: Company name
- `{{email}}`: Contact email
- `{{phone}}`: Contact phone number
- `{{fromStage}}`: Previous stage (for stage_change events)
- `{{toStage}}`: New stage (for stage_change events)
- `{{message}}`: Custom message

## Next Steps

After applying the migration:

1. **Test the functionality**:
   ```bash
   # Create a test automation rule with WhatsApp action
   # Trigger it by creating a lead
   # Verify WhatsApp message is sent
   ```

2. **Set up WhatsApp Business API** (if not done):
   - Get credentials from Meta Business Suite
   - Update `.env` with WHATSAPP_TOKEN and WHATSAPP_PHONE_ID

3. **Create default automation rules**:
   - Lead created → WhatsApp welcome message
   - Stage changed → WhatsApp status update

## Support

If you encounter issues:

1. Check backend logs: `tail -f logs/backend.log`
2. Verify database connection in `.env`
3. Test WhatsApp service: `node test-whatsapp.js`
4. Review automation execution logs in the backend console

---

**Migration created**: 2025-12-29
**Schema version**: Compatible with Prisma 5.9.1+
**Database**: PostgreSQL
