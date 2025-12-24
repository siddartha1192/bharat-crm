#!/bin/bash

echo "🔄 Applying Forms and Landing Pages Migration..."
echo ""

# Check if database is accessible
if ! command -v psql &> /dev/null; then
    echo "❌ psql command not found. Please install PostgreSQL client."
    echo ""
    echo "📝 Manual steps:"
    echo "1. Connect to your PostgreSQL database"
    echo "2. Run the SQL file: backend/prisma/migrations/add_forms_and_landing_pages.sql"
    exit 1
fi

# Load DATABASE_URL from .env
if [ -f backend/.env ]; then
    export $(cat backend/.env | grep DATABASE_URL | xargs)
fi

if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL not found in backend/.env"
    exit 1
fi

# Apply migration
echo "Applying migration to database..."
psql "$DATABASE_URL" -f backend/prisma/migrations/add_forms_and_landing_pages.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migration applied successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Restart your backend server"
    echo "2. Navigate to /forms or /landing-pages in the app"
else
    echo ""
    echo "❌ Migration failed. Please check the error above."
fi
