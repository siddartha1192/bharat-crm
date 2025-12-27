/**
 * Create Default Pipeline Stages for All Tenants
 * Run this after database reset to ensure all tenants have default stages
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createDefaultStages() {
  try {
    console.log('🚀 Creating default pipeline stages for all tenants...\n');

    // Get all tenants
    const tenants = await prisma.tenant.findMany({
      select: { id: true, name: true }
    });

    if (tenants.length === 0) {
      console.log('⚠️  No tenants found in database!');
      console.log('💡 Create a tenant first, then run this script again.\n');
      process.exit(0);
    }

    console.log(`📊 Found ${tenants.length} tenant(s):\n`);

    let stagesCreated = 0;
    let stagesSkipped = 0;

    for (const tenant of tenants) {
      console.log(`\n🏢 Tenant: ${tenant.name} (${tenant.id})`);

      // Check if default stage already exists
      const existingStage = await prisma.pipelineStage.findFirst({
        where: {
          tenantId: tenant.id,
          isSystemDefault: true,
          slug: 'new-lead'
        }
      });

      if (existingStage) {
        console.log('  ✅ Default "New Lead" stage already exists - skipping');
        stagesSkipped++;
        continue;
      }

      // Create default "New Lead" stage
      const newStage = await prisma.pipelineStage.create({
        data: {
          name: 'New Lead',
          slug: 'new-lead',
          color: 'blue',
          order: 1,
          isDefault: true,
          isSystemDefault: true,
          isActive: true,
          stageType: 'LEAD',
          description: 'Default stage for new leads',
          tenantId: tenant.id
        }
      });

      console.log(`  ✨ Created default stage: ${newStage.name} (${newStage.id})`);
      stagesCreated++;
    }

    console.log('\n' + '='.repeat(60));
    console.log(`✅ Summary:`);
    console.log(`   - Stages created: ${stagesCreated}`);
    console.log(`   - Stages skipped: ${stagesSkipped}`);
    console.log(`   - Total tenants: ${tenants.length}`);
    console.log('='.repeat(60) + '\n');

    console.log('🎉 Done! You can now create leads.\n');

  } catch (error) {
    console.error('❌ Error creating default stages:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createDefaultStages();
