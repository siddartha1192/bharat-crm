const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * DEPRECATED: This seed script is no longer needed.
 * Default "New Lead" stage is automatically created via Prisma migration.
 *
 * This file is kept for reference only.
 * Users will create additional stages through the Pipeline Stages UI.
 */
async function seedPipelineStages() {
  console.log('ℹ️  Pipeline stages are now automatically created via migration.');
  console.log('ℹ️  Each tenant gets ONE default "New Lead" stage.');
  console.log('ℹ️  Users can create additional stages through the Pipeline Stages UI.');
  console.log('✅ No seeding needed!');
  return;
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
