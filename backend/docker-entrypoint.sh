#!/bin/sh
set -e

echo "🔄 Starting Bharat CRM Backend..."

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
until npx prisma db execute --stdin <<EOF
SELECT 1;
EOF
do
  echo "⏳ Database is unavailable - sleeping..."
  sleep 2
done

echo "✅ Database is ready!"

# Run migrations
echo "🔄 Running Prisma migrations..."
npx prisma migrate deploy

echo "✅ Migrations complete!"

# Generate Prisma Client (in case schema changed)
echo "🔄 Generating Prisma Client..."
npx prisma generate

echo "✅ Prisma Client generated!"

# Start the application
echo "🚀 Starting server..."
exec node server.js
