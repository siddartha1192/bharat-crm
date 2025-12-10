const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedPipelineStages() {
  console.log('🌱 Seeding default pipeline stages...');

  const defaultStages = [
    { name: 'Lead', slug: 'lead', color: 'blue', order: 1 },
    { name: 'Qualified', slug: 'qualified', color: 'cyan', order: 2 },
    { name: 'Proposal', slug: 'proposal', color: 'amber', order: 3 },
    { name: 'Negotiation', slug: 'negotiation', color: 'orange', order: 4 },
    { name: 'Closed Won', slug: 'closed-won', color: 'green', order: 5 },
    { name: 'Closed Lost', slug: 'closed-lost', color: 'red', order: 6 },
  ];

  try {
    for (const stage of defaultStages) {
      // Check if stage already exists
      const existing = await prisma.pipelineStage.findFirst({
        where: {
          isDefault: true,
          userId: null,
          slug: stage.slug
        }
      });

      if (existing) {
        console.log(`✓ Default stage "${stage.name}" already exists`);
        continue;
      }

      // Create default stage
      await prisma.pipelineStage.create({
        data: {
          ...stage,
          isDefault: true,
          isActive: true,
          userId: null // System-wide default
        }
      });
      console.log(`✓ Created default stage: ${stage.name}`);
    }

    console.log('✅ Default pipeline stages seeded successfully!');
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
