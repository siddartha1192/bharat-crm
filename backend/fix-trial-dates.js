const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Script to fix trial subscription dates for FREE plan tenants
 * - Sets subscriptionStart to createdAt if not set
 * - Sets subscriptionEnd to 25 days from subscriptionStart if not set
 */
async function fixTrialDates() {
  try {
    console.log('🔍 Finding FREE plan tenants that need date fixes...\n');

    // Find all FREE tenants
    const freeTenants = await prisma.tenant.findMany({
      where: {
        plan: 'FREE'
      },
      select: {
        id: true,
        name: true,
        subscriptionStart: true,
        subscriptionEnd: true,
        createdAt: true
      }
    });

    console.log(`Found ${freeTenants.length} FREE plan tenants\n`);

    let updated = 0;
    let skipped = 0;

    for (const tenant of freeTenants) {
      const needsUpdate = !tenant.subscriptionEnd || !tenant.subscriptionStart;

      if (!needsUpdate) {
        console.log(`✓ Skipped: ${tenant.name} (dates already set)`);
        skipped++;
        continue;
      }

      // Calculate subscription dates
      const subscriptionStart = tenant.subscriptionStart || tenant.createdAt;
      const subscriptionEnd = new Date(subscriptionStart.getTime() + 25 * 24 * 60 * 60 * 1000); // 25 days

      // Update tenant
      await prisma.tenant.update({
        where: { id: tenant.id },
        data: {
          subscriptionStart: subscriptionStart,
          subscriptionEnd: subscriptionEnd
        }
      });

      console.log(`✅ Updated: ${tenant.name}`);
      console.log(`   Start: ${subscriptionStart.toISOString()}`);
      console.log(`   End: ${subscriptionEnd.toISOString()}`);
      console.log(`   Days remaining: ${Math.ceil((subscriptionEnd - new Date()) / (1000 * 60 * 60 * 24))}\n`);
      updated++;
    }

    console.log(`\n📊 Summary:`);
    console.log(`   Total tenants: ${freeTenants.length}`);
    console.log(`   Updated: ${updated}`);
    console.log(`   Skipped: ${skipped}`);
    console.log('\n✨ Trial dates fixed successfully!');

  } catch (error) {
    console.error('❌ Error fixing trial dates:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
fixTrialDates();
