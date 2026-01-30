/**
 * =============================================================================
 * PRISMA CLIENT SINGLETON
 * =============================================================================
 *
 * This module ensures a single PrismaClient instance is used across the
 * application, preventing connection pool exhaustion in production.
 *
 * Usage:
 *   const prisma = require('./lib/prisma');
 *   // or
 *   const prisma = require('../lib/prisma');
 *
 * =============================================================================
 */

const { PrismaClient } = require('@prisma/client');

// Prevent multiple instances of Prisma Client in development
const globalForPrisma = global;

const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development'
      ? ['query', 'error', 'warn']
      : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

module.exports = prisma;
