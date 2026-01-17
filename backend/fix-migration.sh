#!/bin/bash

# Script to resolve failed Prisma migration
# This script will mark the failed migration as rolled back and reapply it

echo "🔧 Resolving failed migration..."
echo ""

# Step 1: Mark the failed migration as rolled back
echo "📋 Step 1: Marking failed migration as rolled back..."
npx prisma migrate resolve --rolled-back "20260117_add_demo_scheduling_automation"

if [ $? -eq 0 ]; then
    echo "✅ Migration marked as rolled back"
else
    echo "❌ Failed to mark migration as rolled back"
    exit 1
fi

echo ""

# Step 2: Apply migrations
echo "📋 Step 2: Applying migrations..."
npx prisma migrate deploy

if [ $? -eq 0 ]; then
    echo "✅ Migrations applied successfully"
else
    echo "❌ Failed to apply migrations"
    exit 1
fi

echo ""
echo "🎉 Migration resolved successfully!"
echo ""
echo "Next steps:"
echo "1. Restart your backend server"
echo "2. Test the demo scheduling feature"
