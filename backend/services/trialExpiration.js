const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Check for expired FREE trial tenants and deactivate them
 */
async function checkExpiredTrials() {
  try {
    const now = new Date();

    // Find all FREE plan tenants with expired subscriptions that are still active
    const expiredTenants = await prisma.tenant.findMany({
      where: {
        plan: 'FREE',
        status: {
          in: ['ACTIVE', 'TRIAL']
        },
        subscriptionEnd: {
          lte: now  // subscription end date is less than or equal to now
        }
      },
      include: {
        users: {
          where: {
            isActive: true
          }
        }
      }
    });

    if (expiredTenants.length === 0) {
      console.log('[Trial Expiration] No expired trials found');
      return {
        success: true,
        processed: 0,
        tenants: []
      };
    }

    console.log(`[Trial Expiration] Found ${expiredTenants.length} expired trial(s)`);

    const results = [];

    // Process each expired tenant
    for (const tenant of expiredTenants) {
      try {
        // Deactivate the tenant
        await prisma.tenant.update({
          where: { id: tenant.id },
          data: {
            status: 'SUSPENDED'
          }
        });

        // Deactivate all users in the tenant
        if (tenant.users.length > 0) {
          await prisma.user.updateMany({
            where: {
              tenantId: tenant.id,
              isActive: true
            },
            data: {
              isActive: false
            }
          });
        }

        console.log(`[Trial Expiration] Deactivated tenant: ${tenant.name} (${tenant.id})`);
        console.log(`[Trial Expiration] Deactivated ${tenant.users.length} user(s) for tenant: ${tenant.name}`);

        results.push({
          tenantId: tenant.id,
          tenantName: tenant.name,
          usersDeactivated: tenant.users.length,
          subscriptionEnd: tenant.subscriptionEnd,
          success: true
        });

        // TODO: Send email notification to tenant admin about trial expiration
        // TODO: Send email notification to system admin about expired trial

      } catch (error) {
        console.error(`[Trial Expiration] Error processing tenant ${tenant.id}:`, error);
        results.push({
          tenantId: tenant.id,
          tenantName: tenant.name,
          success: false,
          error: error.message
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`[Trial Expiration] Successfully processed ${successCount}/${expiredTenants.length} tenant(s)`);

    return {
      success: true,
      processed: successCount,
      total: expiredTenants.length,
      tenants: results
    };

  } catch (error) {
    console.error('[Trial Expiration] Error checking expired trials:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Run the trial expiration check (can be called manually or via cron)
 */
async function runTrialExpirationCheck() {
  console.log('[Trial Expiration] Starting trial expiration check...');
  const result = await checkExpiredTrials();
  console.log('[Trial Expiration] Check completed:', result);
  return result;
}

// If running directly (node services/trialExpiration.js)
if (require.main === module) {
  runTrialExpirationCheck()
    .then(() => {
      console.log('[Trial Expiration] Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('[Trial Expiration] Script failed:', error);
      process.exit(1);
    });
}

module.exports = {
  checkExpiredTrials,
  runTrialExpirationCheck
};
