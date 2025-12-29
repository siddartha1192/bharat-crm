/**
 * Apply WhatsApp Automation Migration
 *
 * This script adds WhatsApp support to AutomationRule table.
 * Run this after the backend starts to apply the migration.
 *
 * Usage: node apply-whatsapp-automation-migration.js
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function applyMigration() {
  try {
    console.log('🔄 Applying WhatsApp Automation Migration...\n');

    // Read the migration SQL file
    const migrationPath = path.join(
      __dirname,
      'prisma/migrations/20251229000000_add_whatsapp_to_automation_rules/migration.sql'
    );

    if (!fs.existsSync(migrationPath)) {
      console.error('❌ Migration file not found:', migrationPath);
      process.exit(1);
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    console.log('📄 Migration SQL:');
    console.log(migrationSQL);
    console.log('\n');

    // Execute the migration
    console.log('⚙️  Executing migration...');
    await prisma.$executeRawUnsafe(migrationSQL);

    console.log('✅ WhatsApp Automation Migration applied successfully!\n');

    // Verify the columns were added
    const result = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'AutomationRule'
      AND column_name IN ('whatsappMessage', 'whatsappTemplate')
      ORDER BY column_name;
    `;

    console.log('📊 Verification - New columns added:');
    console.table(result);

    // Count existing automation rules
    const ruleCount = await prisma.automationRule.count();
    console.log(`\n📈 Total automation rules in database: ${ruleCount}`);

    console.log('\n✅ Migration completed successfully!');
    console.log('You can now create automation rules with WhatsApp actions.\n');

  } catch (error) {
    console.error('❌ Error applying migration:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
applyMigration();
