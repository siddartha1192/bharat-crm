# Database Reset Guide

This guide provides multiple options to clean your database and start fresh.

## ⚠️ IMPORTANT WARNING

**ALL OPTIONS BELOW WILL DELETE ALL YOUR DATA!**

- All leads, contacts, deals will be deleted
- All automation rules will be deleted
- All users and tenants will be deleted
- All WhatsApp conversations will be deleted
- All vector database uploads will be deleted

**Make a backup first if you need to preserve any data!**

---

## Option 1: Prisma Migrate Reset (Easiest & Recommended)

This is the safest and easiest method for development environments.

```bash
cd backend

# Reset database (will prompt for confirmation)
npx prisma migrate reset

# Or skip the seed step
npx prisma migrate reset --skip-seed
```

**What it does:**
1. Drops all tables
2. Re-creates all tables from migrations
3. Applies all migrations in order
4. Regenerates Prisma Client
5. Runs seed script (if not skipped)

**Pros:**
- Safest approach
- Handles everything automatically
- Preserves migration history
- Works with any database state

**Cons:**
- Requires database to be running
- Deletes all data

---

## Option 2: Clean & Migrate Script (Preserves Database)

This truncates all tables but keeps the database itself intact.

```bash
cd backend

# Run the clean script
node clean-and-migrate.js
```

**What it does:**
1. Truncates all tables (DELETE data, KEEP structure)
2. Clears migration history
3. Re-applies all migrations
4. Leaves database intact

**Pros:**
- Faster than dropping/recreating database
- Preserves database users and permissions
- Good for shared database environments

**Cons:**
- Requires database to be running
- Deletes all data

---

## Option 3: Drop & Recreate Database (Fresh Start)

This completely removes and recreates the database.

```bash
cd backend

# Run the reset script (requires PostgreSQL CLI tools)
./reset-database.sh
```

**What it does:**
1. Drops the entire database
2. Creates a fresh empty database
3. Runs all Prisma migrations
4. Generates Prisma Client

**Pros:**
- Completely fresh start
- Fixes any database corruption
- Removes all tables, indexes, etc.

**Cons:**
- Requires `psql` CLI tool installed
- Requires database server to be running
- May need to update database credentials in script

---

## Option 4: Manual Database Drop (PostgreSQL)

If you prefer to do it manually:

```bash
# Connect to PostgreSQL
psql -h localhost -U username -d postgres

# Drop the database
DROP DATABASE IF EXISTS bharat_crm;

# Create fresh database
CREATE DATABASE bharat_crm;

# Exit psql
\q

# Apply migrations
cd backend
npx prisma migrate deploy

# Generate Prisma Client
npx prisma generate
```

---

## Option 5: Use Prisma db push (Force Schema Sync)

This bypasses migrations and forces the schema to match exactly.

```bash
cd backend

# Force schema to match without migrations
npx prisma db push --force-reset

# This will:
# - Drop all tables
# - Create tables from schema.prisma
# - Skip migration history
```

**Pros:**
- Fast and simple
- Bypasses migration issues
- Good for development

**Cons:**
- Loses migration history
- Not recommended for production
- May cause schema drift

---

## After Reset - Next Steps

Once you've reset the database:

1. **Start the backend server:**
   ```bash
   cd backend
   npm start
   ```

2. **Create your first admin user:**
   - Go to http://localhost:8080
   - Sign up with email/password
   - First user becomes admin automatically

3. **Apply WhatsApp automation migration:**
   ```bash
   cd backend
   node apply-whatsapp-automation-migration.js
   ```

4. **Import knowledge base:**
   - Go to Settings → Vector Database
   - Click "Run Ingest" to import product documentation
   - Wait for completion message

5. **Set up WhatsApp Business API:**
   - Update `.env` with your WhatsApp credentials
   - Test WhatsApp connection in Settings

6. **Create automation rules:**
   - Go to Settings → Automation Rules
   - Create rules for lead_created, stage_change, etc.
   - Test with sample leads

---

## Troubleshooting

### Error: Can't reach database server

**Solution:** Start your PostgreSQL database first

```bash
# If using Docker
docker-compose up -d postgres

# If using systemd
sudo systemctl start postgresql

# Check if running
pg_isready
```

### Error: Database does not exist

**Solution:** Create it manually

```bash
psql -h localhost -U username -d postgres -c "CREATE DATABASE bharat_crm;"
```

### Error: Migration failed

**Solution:** Use Option 5 (db push) instead

```bash
npx prisma db push --force-reset
```

### Error: Permission denied

**Solution:** Make sure scripts are executable

```bash
chmod +x reset-database.sh
```

### Error: Prisma version mismatch

**Solution:** Use specific Prisma version

```bash
npx prisma@5.9.1 migrate reset
```

---

## Backup Before Reset (Optional)

If you want to save your data before resetting:

```bash
# Backup database
pg_dump -h localhost -U username bharat_crm > backup_$(date +%Y%m%d).sql

# Later, restore if needed:
psql -h localhost -U username bharat_crm < backup_20241229.sql
```

---

## Quick Reference

| Method | Speed | Data Loss | Migration History | Recommended For |
|--------|-------|-----------|-------------------|-----------------|
| Option 1: Prisma Reset | Medium | Yes | Preserved | Development ✅ |
| Option 2: Clean Script | Fast | Yes | Reset | Development |
| Option 3: Drop/Create | Medium | Yes | Preserved | Fresh start |
| Option 4: Manual Drop | Medium | Yes | Preserved | Advanced users |
| Option 5: db push | Fast | Yes | Lost | Quick fixes |

---

**Recommendation:** Use **Option 1 (Prisma Migrate Reset)** for most cases. It's the safest and most reliable.

```bash
cd backend
npx prisma migrate reset
```
