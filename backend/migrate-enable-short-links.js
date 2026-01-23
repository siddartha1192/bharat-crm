/**
 * Migration Script: Enable Short Links for Click Tracking
 *
 * This script updates existing campaigns to enable short links (useShortLinks = true)
 * for campaigns that have click tracking enabled but short links disabled.
 *
 * Without short links, click tracking doesn't work because there's no redirect
 * through the /l/:shortCode endpoint to record clicks.
 *
 * This migration ensures that all campaigns with trackClicks=true also have
 * useShortLinks=true so that analytics work correctly.
 *
 * Usage: node migrate-enable-short-links.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrate() {
  console.log('🔄 Starting migration to enable short links for click tracking...\n');

  try {
    // Find campaigns with click tracking enabled but short links disabled
    const campaignsToUpdate = await prisma.campaign.findMany({
      where: {
        trackClicks: true,
        useShortLinks: false
      },
      select: {
        id: true,
        name: true,
        channel: true,
        trackClicks: true,
        useShortLinks: true,
        autoTagLinks: true
      }
    });

    console.log(`Found ${campaignsToUpdate.length} campaigns with click tracking enabled but short links disabled.\n`);

    if (campaignsToUpdate.length === 0) {
      console.log('✅ No campaigns need to be updated. All campaigns with click tracking already have short links enabled.');
      return;
    }

    console.log('Campaigns to update:');
    campaignsToUpdate.forEach((campaign, index) => {
      console.log(`${index + 1}. [${campaign.channel}] ${campaign.name} (ID: ${campaign.id})`);
      console.log(`   - Current: trackClicks=${campaign.trackClicks}, useShortLinks=${campaign.useShortLinks}, autoTagLinks=${campaign.autoTagLinks}`);
    });

    console.log('\n⚠️  This will update the above campaigns to enable short links (useShortLinks = true)');
    console.log('⚠️  Note: This only affects FUTURE messages sent from these campaigns.');
    console.log('⚠️  Past messages that were already sent cannot be retroactively tracked.\n');

    // Update campaigns to enable short links
    const result = await prisma.campaign.updateMany({
      where: {
        trackClicks: true,
        useShortLinks: false
      },
      data: {
        useShortLinks: true
      }
    });

    console.log(`✅ Successfully updated ${result.count} campaigns to enable short links.\n`);

    // Also ensure autoTagLinks is enabled for these campaigns
    const autoTagResult = await prisma.campaign.updateMany({
      where: {
        trackClicks: true,
        autoTagLinks: false
      },
      data: {
        autoTagLinks: true
      }
    });

    if (autoTagResult.count > 0) {
      console.log(`✅ Also enabled auto-tagging for ${autoTagResult.count} campaigns that had it disabled.\n`);
    }

    console.log('Migration complete! 🎉');
    console.log('\nWhat happens next:');
    console.log('1. New messages sent from these campaigns will use short links');
    console.log('2. Clicks on these short links will be tracked in the analytics');
    console.log('3. You can view click analytics in the Campaign Analytics dashboard');
    console.log('\nNote: Messages already sent before this migration cannot be tracked retroactively.');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration
migrate()
  .then(() => {
    console.log('\n✅ Migration script completed successfully.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration script failed:', error);
    process.exit(1);
  });
