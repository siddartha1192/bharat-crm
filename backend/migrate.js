// Simple migration script to add entityType column to AutomationRule table
// This script connects directly to PostgreSQL and runs the migration

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Read database URL from .env
require('dotenv').config();

async function runMigration() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('✓ Connected');

    console.log('\nReading migration file...');
    const migrationPath = path.join(__dirname, 'prisma/migrations/add_entity_type_to_automation_rule.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('Migration SQL:');
    console.log(migrationSQL);
    console.log('\nExecuting migration...');

    // Execute the first ALTER TABLE statement
    await client.query('ALTER TABLE "AutomationRule" ADD COLUMN IF NOT EXISTS "entityType" TEXT NOT NULL DEFAULT \'lead\'');
    console.log('✓ Added entityType column');

    // Execute the COMMENT statement
    try {
      await client.query('COMMENT ON COLUMN "AutomationRule"."entityType" IS \'Entity type this automation applies to: lead or deal\'');
      console.log('✓ Added column comment');
    } catch (err) {
      console.log('ℹ Comment not added (this is okay)');
    }

    console.log('\n✅ Migration completed successfully!');

    // Verify the column was added
    const result = await client.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'AutomationRule' AND column_name = 'entityType'
    `);

    if (result.rows.length > 0) {
      console.log('\n✓ Verification: entityType column exists');
      console.log('  Column details:', result.rows[0]);
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n✓ Database connection closed');
  }
}

runMigration();
