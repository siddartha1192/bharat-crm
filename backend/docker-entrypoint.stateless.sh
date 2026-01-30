#!/bin/bash
# =============================================================================
# BHARAT CRM - STATELESS APP SERVER ENTRYPOINT
# =============================================================================

set -e

echo "========================================"
echo "Starting Bharat CRM App Server"
echo "Instance: ${APP_INSTANCE_ID:-app}"
echo "========================================"

# -----------------------------------------------------------------------------
# Wait for dependencies
# -----------------------------------------------------------------------------

# Wait for Redis
echo "Waiting for Redis..."
echo "Redis URL: ${REDIS_URL:-redis://redis:6379}"

until node -e "
const { createClient } = require('redis');
const client = createClient({ url: process.env.REDIS_URL || 'redis://redis:6379' });
client.on('error', () => process.exit(1));
client.connect()
  .then(() => client.ping())
  .then(() => { console.log('Redis PONG'); client.quit(); process.exit(0); })
  .catch(() => process.exit(1));
" 2>/dev/null; do
    echo "Redis is unavailable - sleeping"
    sleep 2
done
echo "Redis is up!"

# Wait for PostgreSQL (DigitalOcean Managed DB)
echo "Waiting for PostgreSQL..."
until node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.\$connect()
  .then(() => { console.log('Connected'); process.exit(0); })
  .catch(() => process.exit(1));
" 2>/dev/null; do
    echo "PostgreSQL is unavailable - sleeping"
    sleep 3
done
echo "PostgreSQL is up!"

# -----------------------------------------------------------------------------
# Run database migrations (only on first app instance)
# -----------------------------------------------------------------------------

if [ "${APP_INSTANCE_ID}" = "app-1" ]; then
    echo "Running database migrations..."
    npx prisma migrate deploy
    echo "Migrations complete!"
fi

# -----------------------------------------------------------------------------
# Verify environment
# -----------------------------------------------------------------------------

echo "Verifying environment..."
required_vars=(
    "DATABASE_URL"
    "JWT_SECRET"
    "REDIS_URL"
)

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "ERROR: Required environment variable $var is not set"
        exit 1
    fi
done

echo "Environment verified!"

# -----------------------------------------------------------------------------
# Start application
# -----------------------------------------------------------------------------

echo "========================================"
echo "Starting Express server on port ${PORT:-3001}"
echo "Worker mode: ${IS_WORKER:-false}"
echo "========================================"

exec "$@"
