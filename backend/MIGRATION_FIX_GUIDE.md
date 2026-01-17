# Migration Fix Guide

## Problem
The migration `20260117_add_demo_scheduling_automation` failed during application. This guide will help you resolve it.

## Error Message
```
migrate found failed migrations in the target database
The `20260117_add_demo_scheduling_automation` migration started at 2026-01-17 04:40:21.860978 UTC failed
```

## Solution Options

### Option 1: Automatic Fix (Recommended)

This is the quickest and safest method using Prisma's built-in migration resolution.

**Step 1: Stop your backend container**
```bash
docker-compose down
```

**Step 2: Access backend container or run locally**
```bash
cd /home/user/bharat-crm/backend
```

**Step 3: Run the fix script**
```bash
chmod +x fix-migration.sh
./fix-migration.sh
```

OR run the commands manually:
```bash
# Mark failed migration as rolled back
npx prisma migrate resolve --rolled-back "20260117_add_demo_scheduling_automation"

# Apply migrations again
npx prisma migrate deploy
```

**Step 4: Restart your backend**
```bash
cd /home/user/bharat-crm
docker-compose up -d
```

### Option 2: Manual SQL Fix (If Option 1 Fails)

If the automatic fix doesn't work, you can manually apply the SQL.

**Step 1: Access PostgreSQL**
```bash
docker exec -it bharat-crm-postgres psql -U postgres -d bharat_crm
```

**Step 2: Run the manual fix SQL**
```sql
\i /path/to/fix-migration-manual.sql
```

OR copy the SQL from `fix-migration-manual.sql` and paste it into the psql prompt.

**Step 3: Verify the migration**
```sql
-- Check if columns were added to CallLog
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'CallLog'
AND column_name LIKE 'meeting%';

-- Check if columns were added to CallSettings
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'CallSettings'
AND column_name LIKE 'demoScheduling%';

-- Exit psql
\q
```

**Step 4: Mark migration as resolved**
```bash
cd /home/user/bharat-crm/backend
npx prisma migrate resolve --applied "20260117_add_demo_scheduling_automation"
```

**Step 5: Restart your backend**
```bash
cd /home/user/bharat-crm
docker-compose up -d
```

### Option 3: Nuclear Option (Clean Slate)

If both options above fail, you can reset and reapply all migrations.

⚠️ **WARNING**: This will drop all data in your database!

**Only use this in development environments!**

```bash
cd /home/user/bharat-crm/backend

# Reset database (drops all data!)
npx prisma migrate reset --force

# This will:
# 1. Drop the database
# 2. Create a new database
# 3. Apply all migrations
# 4. Run seed script (if any)
```

## Verification

After fixing the migration, verify it worked:

### 1. Check Migration Status
```bash
cd /home/user/bharat-crm/backend
npx prisma migrate status
```

Expected output:
```
Database schema is up to date!
```

### 2. Check Database Schema
```bash
docker exec -it bharat-crm-postgres psql -U postgres -d bharat_crm -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'CallLog' AND column_name LIKE 'meeting%';"
```

Expected output should show all 14 new columns:
```
meetingExtracted
hasMeetingRequest
meetingAgreed
meetingType
meetingProposedDate
meetingProposedTime
meetingDateTimeText
meetingDuration
meetingPreferences
meetingNotes
meetingConfidence
meetingReasonDeclined
meetingCalendarEventId
meetingExtractionCost
```

### 3. Test the Application
```bash
# Check backend logs
docker logs bharat-crm-backend --tail 50

# Should not show any migration errors
```

## Common Issues & Solutions

### Issue: "Column already exists"
**Cause**: Migration partially applied before failing
**Solution**: Use Option 2 (Manual SQL Fix) which drops existing columns first

### Issue: "Cannot find Prisma Schema"
**Cause**: Running command from wrong directory
**Solution**: Always run `npx prisma` commands from `/home/user/bharat-crm/backend`

### Issue: "Database connection failed"
**Cause**: PostgreSQL not running or wrong connection string
**Solution**:
```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Check connection string in .env
cat backend/.env | grep DATABASE_URL
```

### Issue: "Migration table locked"
**Cause**: Another migration process is running
**Solution**:
```bash
# Stop all backend processes
docker-compose down

# Wait 10 seconds
sleep 10

# Start again
docker-compose up -d
```

## Prevention

To avoid migration failures in the future:

1. **Always backup database before migrations** (production):
   ```bash
   pg_dump -U postgres bharat_crm > backup_$(date +%Y%m%d).sql
   ```

2. **Test migrations in development first**

3. **Use `--create-only` flag when creating migrations**:
   ```bash
   npx prisma migrate dev --create-only --name my_migration
   # Review the SQL file
   # Then apply with: npx prisma migrate dev
   ```

4. **Never interrupt a running migration**

## Need Help?

If none of these solutions work, provide the following information:

1. Output of `npx prisma migrate status`
2. Output of `docker logs bharat-crm-backend --tail 100`
3. Output of `docker logs bharat-crm-postgres --tail 100`
4. Current database schema for CallLog and CallSettings tables

---

**Created**: 2026-01-17
**For migration**: `20260117_add_demo_scheduling_automation`
