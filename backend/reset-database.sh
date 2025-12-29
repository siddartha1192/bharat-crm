#!/bin/bash

# Database Reset Script
# This script drops and recreates the database from scratch

echo "========================================="
echo "DATABASE RESET SCRIPT"
echo "========================================="
echo ""
echo "⚠️  WARNING: This will DELETE ALL DATA!"
echo ""
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
  echo "❌ Aborted."
  exit 0
fi

# Load environment variables
source .env 2>/dev/null || true

# Extract database details from DATABASE_URL
# Format: postgresql://username:password@localhost:5432/bharat_crm
DB_NAME="bharat_crm"
DB_USER="username"
DB_PASS="password"
DB_HOST="localhost"
DB_PORT="5432"

echo ""
echo "📋 Database Details:"
echo "   Host: $DB_HOST:$DB_PORT"
echo "   Database: $DB_NAME"
echo "   User: $DB_USER"
echo ""

# Step 1: Drop the database
echo "🗑️  Step 1: Dropping database '$DB_NAME'..."
PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "DROP DATABASE IF EXISTS $DB_NAME;"

if [ $? -eq 0 ]; then
  echo "✅ Database dropped successfully"
else
  echo "❌ Failed to drop database"
  exit 1
fi

# Step 2: Create fresh database
echo ""
echo "🔨 Step 2: Creating fresh database '$DB_NAME'..."
PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "CREATE DATABASE $DB_NAME;"

if [ $? -eq 0 ]; then
  echo "✅ Database created successfully"
else
  echo "❌ Failed to create database"
  exit 1
fi

# Step 3: Run Prisma migrations
echo ""
echo "📦 Step 3: Running Prisma migrations..."
npx prisma migrate deploy

if [ $? -eq 0 ]; then
  echo "✅ Migrations applied successfully"
else
  echo "❌ Failed to apply migrations"
  exit 1
fi

# Step 4: Generate Prisma Client
echo ""
echo "🔧 Step 4: Generating Prisma Client..."
npx prisma generate

if [ $? -eq 0 ]; then
  echo "✅ Prisma Client generated"
else
  echo "❌ Failed to generate Prisma Client"
  exit 1
fi

echo ""
echo "========================================="
echo "✅ DATABASE RESET COMPLETE!"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Start your backend server: npm start"
echo "2. Create your first user/tenant"
echo "3. Begin using the application"
echo ""
