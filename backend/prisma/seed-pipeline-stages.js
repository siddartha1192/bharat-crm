const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedPipelineStages() {
  console.log('🌱 Seeding default pipeline stages for all tenants...');

  const defaultStages = [
    { name: 'Lead', slug: 'lead', color: 'blue', order: 1 },
    { name: 'Qualified', slug: 'qualified', color: 'cyan', order: 2 },
    { name: 'Proposal', slug: 'proposal', color: 'amber', order: 3 },
    { name: 'Negotiation', slug: 'negotiation', color: 'orange', order: 4 },
    { name: 'Closed Won', slug: 'closed-won', color: 'green', order: 5 },
    { name: 'Closed Lost', slug: 'closed-lost', color: 'red', order: 6 },
  ];

  try {
    // Get all tenants
    const tenants = await prisma.tenant.findMany({
      select: { id: true, name: true }
    });

    if (tenants.length === 0) {
      console.log('⚠️  No tenants found. Please create a tenant first.');
      return;
    }

    console.log(`Found ${tenants.length} tenant(s)`);

    // Create default stages for each tenant
    for (const tenant of tenants) {
      console.log(`\n📋 Creating stages for tenant: ${tenant.name}`);

      for (const stage of defaultStages) {
        // Check if stage already exists for this tenant
        const existing = await prisma.pipelineStage.findFirst({
          where: {
            tenantId: tenant.id,
            slug: stage.slug,
            userId: null // System default for tenant
          }
        });

        if (existing) {
          console.log(`  ✓ Stage "${stage.name}" already exists`);
          continue;
        }

        // Create default stage for this tenant
        await prisma.pipelineStage.create({
          data: {
            ...stage,
            isDefault: true,
            isActive: true,
            userId: null, // System default for this tenant
            tenantId: tenant.id
          }
        });
        console.log(`  ✓ Created stage: ${stage.name}`);
      }
    }

    console.log('\n✅ Default pipeline stages seeded successfully for all tenants!');
  } catch (error) {
    console.error('❌ Error seeding pipeline stages:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed function if this file is executed directly
if (require.main === module) {
  seedPipelineStages()
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { seedPipelineStages };
