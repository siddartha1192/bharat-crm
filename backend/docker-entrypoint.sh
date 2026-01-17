#!/bin/sh
set -e

echo "🔄 Starting Bharat CRM Backend..."

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
until npx prisma db execute --stdin <<EOSQL
SELECT 1;
EOSQL
do
  echo "⏳ Database is unavailable - sleeping..."
  sleep 2
done

echo "✅ Database is ready!"

# Run migrations with automatic recovery
echo "🔄 Running Prisma migrations..."
if ! npx prisma migrate deploy 2>&1 | tee /tmp/migrate.log; then
  # Check if it's a failed migration error
  if grep -q "migrate found failed migrations" /tmp/migrate.log; then
    echo "⚠️  Found failed migration, attempting automatic recovery..."

    # Extract the failed migration name
    FAILED_MIGRATION=$(grep "migration started at" /tmp/migrate.log | sed -n 's/.*The `\([^`]*\)` migration.*/\1/p')

    if [ -n "$FAILED_MIGRATION" ]; then
      echo "🔄 Marking migration '$FAILED_MIGRATION' as rolled back..."
      npx prisma migrate resolve --rolled-back "$FAILED_MIGRATION"

      echo "🔄 Retrying migration deployment..."
      npx prisma migrate deploy
      echo "✅ Migrations recovered and deployed!"
    else
      echo "❌ Could not identify failed migration. Manual intervention required."
      exit 1
    fi
  else
    echo "❌ Migration deployment failed with unknown error."
    cat /tmp/migrate.log
    exit 1
  fi
else
  echo "✅ Migrations complete!"
fi

# Generate Prisma Client (in case schema changed)
echo "🔄 Generating Prisma Client..."
npx prisma generate

echo "✅ Prisma Client generated!"

# Start the application
echo "🚀 Starting server..."
exec node server.js
