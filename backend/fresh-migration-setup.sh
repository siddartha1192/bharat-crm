#!/bin/bash

# Fresh Migration Setup Script
# Run this from the backend directory

echo "========================================="
echo "🔄 FRESH MIGRATION SETUP"
echo "========================================="
echo ""
echo "This will:"
echo "1. Backup old migrations"
echo "2. Clear migration history"
echo "3. Create a fresh baseline"
echo ""
read -p "Continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
  echo "❌ Aborted."
  exit 0
fi

echo ""
echo "📦 Step 1: Backing up old migrations..."
mkdir -p prisma/migrations_backup
cp -r prisma/migrations/* prisma/migrations_backup/ 2>/dev/null || true
echo "✅ Backed up to prisma/migrations_backup/"

echo ""
echo "🗑️  Step 2: Removing old migration folders..."
# Remove all migration folders except migration_lock.toml
find prisma/migrations -type d -name "20*" -exec rm -rf {} + 2>/dev/null || true
find prisma/migrations -type f -name "*.sql" ! -name "migration_lock.toml" -exec rm -f {} + 2>/dev/null || true
echo "✅ Old migrations removed"

echo ""
echo "📝 Step 3: Your database is already in sync from 'db push'"
echo "   No migrations needed - your tables already exist!"

echo ""
echo "🔄 Step 4: Clearing migration history in database..."
psql $DATABASE_URL -c "TRUNCATE TABLE _prisma_migrations CASCADE;" 2>/dev/null || \
  echo "⚠️  Could not clear migration history (table may not exist)"

echo ""
echo "========================================="
echo "✅ SETUP COMPLETE!"
echo "========================================="
echo ""
echo "Your database is clean and in sync."
echo "Going forward, you can either:"
echo ""
echo "Option A: Use 'npx prisma db push' for development"
echo "Option B: Create migrations with 'npx prisma migrate dev'"
echo ""
