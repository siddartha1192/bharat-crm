#!/bin/bash
# =============================================================================
# BHARAT CRM - WORKER SERVER ENTRYPOINT
# =============================================================================

set -e

echo "========================================"
echo "Starting Bharat CRM Worker Server"
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

# Wait for PostgreSQL
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
# Initialize Qdrant storage
# -----------------------------------------------------------------------------

echo "Initializing Qdrant storage..."
mkdir -p /qdrant/storage
chown -R nodejs:nodejs /qdrant/storage 2>/dev/null || true

# -----------------------------------------------------------------------------
# Verify environment
# -----------------------------------------------------------------------------

echo "Verifying worker environment..."
required_vars=(
    "DATABASE_URL"
    "JWT_SECRET"
    "REDIS_URL"
    "OPENAI_API_KEY"
)

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "ERROR: Required environment variable $var is not set"
        exit 1
    fi
done

echo "Environment verified!"

# -----------------------------------------------------------------------------
# Start services via supervisor
# -----------------------------------------------------------------------------

echo "========================================"
echo "Starting Worker Services:"
echo "  - Node.js Worker (port ${PORT:-3002})"
echo "  - Qdrant Vector DB (port 6333)"
echo "========================================"

exec "$@"
