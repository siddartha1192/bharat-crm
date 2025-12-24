/**
 * Migration Script: Convert Single-Tenant to Multi-Tenant
 *
 * This script migrates existing data to the multi-tenant schema by:
 * 1. Creating a default tenant for existing users
 * 2. Assigning all existing users to the default tenant
 * 3. Updating all existing data with the tenantId
 *
 * Usage: node scripts/migrate-to-multi-tenant.js
 */

const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

async function migrateToMultiTenant() {
  console.log('🚀 Starting multi-tenant migration...\n');

  try {
    // Step 1: Check if migration is needed
    const existingTenants = await prisma.tenant.count();
    if (existingTenants > 0) {
      console.log('⚠️  Tenants already exist. Migration may have been run before.');
      const proceed = process.env.FORCE_MIGRATE === 'true';
      if (!proceed) {
        console.log('Aborting. Set FORCE_MIGRATE=true to proceed anyway.');
        return;
      }
    }

    // Step 2: Create default tenant
    console.log('📦 Creating default tenant...');
    const defaultTenant = await prisma.tenant.create({
      data: {
        name: 'Default Organization',
        slug: `default-${crypto.randomBytes(3).toString('hex')}`,
        contactEmail: process.env.DEFAULT_TENANT_EMAIL || 'admin@example.com',
        status: 'ACTIVE',
        plan: 'ENTERPRISE',
        maxUsers: 1000,
        subscriptionStart: new Date(),
        subscriptionEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        settings: {
          branding: {
            primaryColor: '#3b82f6',
            logoUrl: null
          },
          features: {
            whatsapp: true,
            email: true,
            ai: true,
            calendar: true
          },
          migrated: true,
          migratedAt: new Date().toISOString()
        }
      }
    });
    console.log(`✓ Default tenant created: ${defaultTenant.name} (${defaultTenant.id})\n`);

    // Step 3: Get all users without tenantId
    console.log('👥 Finding users to migrate...');
    const usersToMigrate = await prisma.user.findMany({
      where: {
        tenantId: null
      }
    });
    console.log(`Found ${usersToMigrate.length} users to migrate\n`);

    if (usersToMigrate.length === 0) {
      console.log('✓ No users need migration\n');
    } else {
      // Step 4: Update all users with default tenantId
      console.log('🔄 Assigning users to default tenant...');
      const userUpdate = await prisma.user.updateMany({
        where: {
          tenantId: null
        },
        data: {
          tenantId: defaultTenant.id
        }
      });
      console.log(`✓ Updated ${userUpdate.count} users\n`);
    }

    // Step 5: Update all data models with tenantId
    const modelsToUpdate = [
      { name: 'Department', model: prisma.department },
      { name: 'Team', model: prisma.team },
      { name: 'Lead', model: prisma.lead },
      { name: 'Contact', model: prisma.contact },
      { name: 'Invoice', model: prisma.invoice },
      { name: 'PipelineStage', model: prisma.pipelineStage },
      { name: 'Deal', model: prisma.deal },
      { name: 'Task', model: prisma.task },
      { name: 'WhatsAppConversation', model: prisma.whatsAppConversation },
      { name: 'WhatsAppMessage', model: prisma.whatsAppMessage },
      { name: 'CalendarEvent', model: prisma.calendarEvent },
      { name: 'EmailLog', model: prisma.emailLog },
      { name: 'AutomationRule', model: prisma.automationRule },
      { name: 'Document', model: prisma.document },
      { name: 'SalesForecast', model: prisma.salesForecast },
      { name: 'VectorDataUpload', model: prisma.vectorDataUpload },
      { name: 'RevenueGoal', model: prisma.revenueGoal },
      { name: 'AIConversation', model: prisma.aIConversation },
      { name: 'AIMessage', model: prisma.aIMessage },
      { name: 'Campaign', model: prisma.campaign },
      { name: 'CampaignRecipient', model: prisma.campaignRecipient },
      { name: 'CampaignLog', model: prisma.campaignLog },
      { name: 'Form', model: prisma.form },
      { name: 'FormSubmission', model: prisma.formSubmission },
      { name: 'LandingPage', model: prisma.landingPage }
    ];

    console.log('📊 Updating data models with tenant context...\n');

    for (const { name, model } of modelsToUpdate) {
      try {
        const updateResult = await model.updateMany({
          where: {
            tenantId: null
          },
          data: {
            tenantId: defaultTenant.id
          }
        });

        console.log(`  ✓ ${name}: ${updateResult.count} records updated`);
      } catch (error) {
        console.log(`  ⚠️  ${name}: ${error.message}`);
      }
    }

    // Step 6: Summary
    console.log('\n✅ Migration completed successfully!\n');
    console.log('Summary:');
    console.log(`  - Default Tenant ID: ${defaultTenant.id}`);
    console.log(`  - Default Tenant Name: ${defaultTenant.name}`);
    console.log(`  - Users Migrated: ${usersToMigrate.length}`);
    console.log('\n📝 Next steps:');
    console.log('  1. Update your frontend to include tenant context');
    console.log('  2. Test all functionality with the multi-tenant setup');
    console.log('  3. Update the default tenant details via API or database');
    console.log('  4. Create new tenants for different organizations\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration
migrateToMultiTenant()
  .then(() => {
    console.log('Migration script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration script failed:', error);
    process.exit(1);
  });
