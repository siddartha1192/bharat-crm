/**
 * Clean Database and Apply All Migrations
 *
 * This script provides a safer alternative to dropping the database.
 * It deletes all data but preserves the database structure, then re-applies migrations.
 *
 * Usage: node clean-and-migrate.js
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');

const prisma = new PrismaClient();

async function cleanDatabase() {
  try {
    console.log('\n========================================');
    console.log('🧹 DATABASE CLEAN & MIGRATE');
    console.log('========================================\n');

    console.log('⚠️  WARNING: This will DELETE ALL DATA!\n');

    // Step 1: Get all table names
    console.log('📋 Step 1: Fetching all tables...');
    const tables = await prisma.$queryRaw`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      AND tablename != '_prisma_migrations';
    `;

    console.log(`   Found ${tables.length} tables\n`);

    // Step 2: Disable foreign key checks and truncate all tables
    console.log('🗑️  Step 2: Truncating all tables...');

    for (const { tablename } of tables) {
      try {
        await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${tablename}" CASCADE;`);
        console.log(`   ✅ Truncated: ${tablename}`);
      } catch (error) {
        console.log(`   ⚠️  Skipped: ${tablename} (${error.message})`);
      }
    }

    console.log('\n✅ All tables truncated\n');

    // Step 3: Reset migration history
    console.log('🔄 Step 3: Resetting migration history...');
    await prisma.$executeRaw`TRUNCATE TABLE "_prisma_migrations" CASCADE;`;
    console.log('✅ Migration history cleared\n');

    await prisma.$disconnect();

    // Step 4: Re-run migrations
    console.log('📦 Step 4: Re-applying all migrations...');
    console.log('');

    execSync('npx prisma migrate deploy', {
      stdio: 'inherit',
      cwd: __dirname
    });

    console.log('\n');
    console.log('========================================');
    console.log('✅ DATABASE CLEANED & MIGRATED!');
    console.log('========================================\n');

    console.log('Your database is now clean with all migrations applied.');
    console.log('You can start the backend server and create fresh data.\n');

  } catch (error) {
    console.error('\n❌ Error during database clean:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run the cleanup
cleanDatabase();
