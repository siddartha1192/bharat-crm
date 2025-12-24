#!/bin/bash

echo "🚀 Quick Start Database Setup"
echo "=============================="
echo ""

# Check if Docker is available
if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found."
    echo ""
    echo "Please install Docker or start PostgreSQL manually:"
    echo "  - Install Docker: https://docs.docker.com/get-docker/"
    echo "  - Or install PostgreSQL: https://www.postgresql.org/download/"
    exit 1
fi

echo "✅ Docker found!"
echo ""

# Start PostgreSQL container
echo "Starting PostgreSQL container..."
docker compose up -d postgres

echo ""
echo "⏳ Waiting for database to be ready (15 seconds)..."
sleep 15

# Apply migration
echo ""
echo "📝 Applying migration..."
cd backend
node apply-forms-migration.js

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Setup complete!"
    echo ""
    echo "Next steps:"
    echo "1. Start backend: cd backend && npm start"
    echo "2. Start frontend: npm run dev"
    echo "3. Visit: http://localhost:5173/forms"
else
    echo ""
    echo "⚠️  Migration had issues. The database might not be ready yet."
    echo "Try running manually: cd backend && node apply-forms-migration.js"
fi
