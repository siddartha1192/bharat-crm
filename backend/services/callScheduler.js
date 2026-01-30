/**
 * Call Scheduler Service
 * Runs every 30 seconds to process pending calls from the queue
 * Ensures non-blocking call processing
 */

const cron = require('node-cron');
const callQueueService = require('./callQueueService');
const moment = require('moment-timezone');

const prisma = require('../lib/prisma');

let io = null; // Socket.io instance for real-time updates

/**
 * Initialize the call scheduler
 * @param {SocketIO} socketIO - Socket.io instance
 */
function initialize(socketIO) {
  io = socketIO;
  console.log('📞 Call Scheduler initialized');
}

/**
 * Check if current time is within business hours
 * @param {Object} settings - CallSettings
 * @returns {boolean} Is within business hours
 */
function isWithinBusinessHours(settings) {
  if (!settings.enableBusinessHours) {
    return true; // Always allow if business hours not enabled
  }

  if (!settings.businessHoursStart || !settings.businessHoursEnd || !settings.businessDays) {
    return true; // Allow if not configured
  }

  const now = moment().tz(settings.timezone);
  const dayOfWeek = now.format('ddd').toLowerCase(); // 'mon', 'tue', etc.

  // Check if today is a business day
  const businessDays = Array.isArray(settings.businessDays)
    ? settings.businessDays
    : settings.businessDays.value || [];

  if (!businessDays.includes(dayOfWeek)) {
    return false;
  }

  // Check if current time is within business hours
  const currentTime = now.format('HH:mm');
  return currentTime >= settings.businessHoursStart && currentTime <= settings.businessHoursEnd;
}

/**
 * Process pending calls for a tenant
 * @param {Object} tenant - Tenant with callSettings
 * @param {Object} settings - CallSettings
 * @returns {Promise<void>}
 */
async function processTenantQueue(tenant, settings) {
  try {
    // Check business hours
    if (!isWithinBusinessHours(settings)) {
      console.log(`[CALL SCHEDULER] Outside business hours for tenant: ${tenant.name}`);
      return;
    }

    // Check concurrent call limit
    const activeCalls = await prisma.callLog.count({
      where: {
        tenantId: tenant.id,
        twilioStatus: { in: ['queued', 'ringing', 'in-progress'] }
      }
    });

    if (activeCalls >= settings.maxConcurrentCalls) {
      console.log(`[CALL SCHEDULER] Max concurrent calls reached for tenant: ${tenant.name} (${activeCalls}/${settings.maxConcurrentCalls})`);
      return;
    }

    // Calculate how many calls we can process
    const availableSlots = settings.maxConcurrentCalls - activeCalls;

    // Get pending calls (due now or overdue)
    const pendingCalls = await prisma.callQueue.findMany({
      where: {
        tenantId: tenant.id,
        status: 'pending',
        OR: [
          { scheduledFor: null },
          { scheduledFor: { lte: new Date() } },
          {
            nextRetryAt: { lte: new Date() }
          }
        ]
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'asc' }
      ],
      take: availableSlots
    });

    if (pendingCalls.length === 0) {
      return; // No calls to process
    }

    console.log(`[CALL SCHEDULER] Processing ${pendingCalls.length} calls for tenant: ${tenant.name}`);

    // Process each call
    for (const queueItem of pendingCalls) {
      try {
        const result = await callQueueService.processQueueItem(queueItem.id);

        // Emit real-time update to tenant users
        if (io) {
          io.to(`tenant:${tenant.id}`).emit('call:initiated', {
            callLog: result.callLog,
            queueItem
          });
        }
      } catch (error) {
        console.error(`[CALL SCHEDULER] Error processing queue item ${queueItem.id}:`, error.message);

        // Emit error to tenant users
        if (io) {
          io.to(`tenant:${tenant.id}`).emit('call:error', {
            queueItemId: queueItem.id,
            error: error.message
          });
        }
      }
    }
  } catch (error) {
    console.error(`[CALL SCHEDULER] Error processing tenant queue for ${tenant.name}:`, error);
  }
}

/**
 * Main scheduler function
 * Runs every 30 seconds
 */
const scheduledTask = cron.schedule('*/30 * * * * *', async () => {
  try {
    // Get all tenants with call settings and pending calls
    const tenants = await prisma.tenant.findMany({
      where: {
        callSettings: {
          isNot: null
        },
        callQueue: {
          some: {
            status: 'pending',
            OR: [
              { scheduledFor: null },
              { scheduledFor: { lte: new Date() } },
              { nextRetryAt: { lte: new Date() } }
            ]
          }
        }
      },
      include: {
        callSettings: true
      }
    });

    if (tenants.length === 0) {
      return; // No tenants with pending calls
    }

    console.log(`[CALL SCHEDULER] Found ${tenants.length} tenants with pending calls`);

    // Process each tenant's queue
    for (const tenant of tenants) {
      await processTenantQueue(tenant, tenant.callSettings);
    }
  } catch (error) {
    console.error('[CALL SCHEDULER] Error in scheduled task:', error);
  }
});

/**
 * Start the scheduler
 */
function start() {
  scheduledTask.start();
  console.log('✅ Call Scheduler started - checking every 30 seconds');
}

/**
 * Stop the scheduler
 */
function stop() {
  scheduledTask.stop();
  console.log('⏹️  Call Scheduler stopped');
}

/**
 * Clean up old queue items
 * Runs daily at midnight
 */
const cleanupTask = cron.schedule('0 0 * * *', async () => {
  try {
    console.log('[CALL SCHEDULER] Running queue cleanup...');
    const deleted = await callQueueService.cleanupOldQueueItems(30);
    console.log(`[CALL SCHEDULER] Cleaned up ${deleted} old queue items`);
  } catch (error) {
    console.error('[CALL SCHEDULER] Error in cleanup task:', error);
  }
});

/**
 * Start the cleanup task
 */
function startCleanup() {
  cleanupTask.start();
  console.log('✅ Call Queue cleanup task started - runs daily at midnight');
}

/**
 * Stop the cleanup task
 */
function stopCleanup() {
  cleanupTask.stop();
  console.log('⏹️  Call Queue cleanup task stopped');
}

module.exports = {
  initialize,
  start,
  stop,
  startCleanup,
  stopCleanup,
  scheduledTask,
  cleanupTask
};
