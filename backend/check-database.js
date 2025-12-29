/**
 * Check Database Tables
 *
 * This script shows what tables actually exist in your database
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkTables() {
  try {
    console.log('\n========================================');
    console.log('📊 DATABASE TABLE CHECK');
    console.log('========================================\n');

    // Get all tables
    const tables = await prisma.$queryRaw`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `;

    console.log(`Found ${tables.length} tables in your database:\n`);

    tables.forEach((table, index) => {
      console.log(`${index + 1}. ${table.tablename}`);
    });

    console.log('\n');

    // Check specifically for User table
    const userTableExists = tables.some(t => t.tablename === 'User');

    if (userTableExists) {
      console.log('✅ User table EXISTS in database');

      // Count users
      const userCount = await prisma.user.count();
      console.log(`   → Contains ${userCount} users\n`);
    } else {
      console.log('❌ User table DOES NOT EXIST in database\n');
    }

    // Check migration history
    const migrationTableExists = tables.some(t => t.tablename === '_prisma_migrations');

    if (migrationTableExists) {
      const migrations = await prisma.$queryRaw`
        SELECT migration_name, finished_at, applied_steps_count
        FROM "_prisma_migrations"
        ORDER BY finished_at;
      `;

      console.log(`📋 Migration History (${migrations.length} migrations applied):\n`);
      migrations.forEach((m, index) => {
        console.log(`${index + 1}. ${m.migration_name}`);
      });
    } else {
      console.log('⚠️  No migration history found (_prisma_migrations table does not exist)');
      console.log('   This means migrations have never been run on this database.\n');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkTables();
