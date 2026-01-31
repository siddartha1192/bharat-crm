/**
 * =============================================================================
 * BHARAT CRM - WORKER SERVER
 * =============================================================================
 *
 * This worker server handles all background jobs:
 *   - Campaign email/WhatsApp sending
 *   - Lead reminder scheduling
 *   - Call queue processing
 *   - Trial expiration checking
 *   - Vector database operations
 *
 * It uses Redis for:
 *   - Distributed locking (prevent duplicate job execution)
 *   - Socket.IO adapter (broadcast events to app servers)
 *   - Job queue management
 *
 * =============================================================================
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const { createClient } = require('redis');
const cron = require('node-cron');

// Services
const campaignService = require('./services/campaign');
const leadReminderService = require('./services/leadReminderService');
const callScheduler = require('./services/callScheduler');
const { checkExpiredTrials } = require('./services/trialExpiration');
const vectorDBService = require('./services/ai/vectorDB.service');

// Configuration
const PORT = process.env.PORT || 3002;
const REDIS_URL = process.env.REDIS_URL || 'redis://redis:6379';
const QDRANT_URL = process.env.QDRANT_URL || 'http://localhost:6333';

// =============================================================================
// EXPRESS SETUP
// =============================================================================

const app = express();
const server = http.createServer(app);

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {
        redis: redisConnected ? 'connected' : 'disconnected',
        qdrant: await checkQdrantHealth(),
        database: await checkDatabaseHealth(),
      },
      jobs: {
        campaign: campaignJobRunning,
        leadReminder: leadReminderJobRunning,
        callScheduler: callSchedulerJobRunning,
      },
    };
    res.json(health);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error.message,
    });
  }
});

// Metrics endpoint
app.get('/metrics', (req, res) => {
  res.json({
    jobsProcessed: {
      campaigns: jobMetrics.campaigns,
      reminders: jobMetrics.reminders,
      calls: jobMetrics.calls,
    },
    lastRun: {
      campaign: jobMetrics.lastCampaignRun,
      reminder: jobMetrics.lastReminderRun,
      call: jobMetrics.lastCallRun,
    },
    uptime: process.uptime(),
  });
});

// =============================================================================
// REDIS SETUP
// =============================================================================

let redisConnected = false;
let pubClient, subClient, lockClient;

async function setupRedis() {
  console.log('[Worker] Connecting to Redis...');

  pubClient = createClient({ url: REDIS_URL });
  subClient = pubClient.duplicate();
  lockClient = pubClient.duplicate();

  pubClient.on('error', (err) => console.error('[Redis] Pub client error:', err));
  subClient.on('error', (err) => console.error('[Redis] Sub client error:', err));
  lockClient.on('error', (err) => console.error('[Redis] Lock client error:', err));

  await Promise.all([
    pubClient.connect(),
    subClient.connect(),
    lockClient.connect(),
  ]);

  redisConnected = true;
  console.log('[Worker] Redis connected successfully');
}

// =============================================================================
// SOCKET.IO SETUP (for broadcasting to app servers)
// =============================================================================

let io;

async function setupSocketIO() {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || '*',
      methods: ['GET', 'POST'],
    },
  });

  // Use Redis adapter for cross-server communication
  io.adapter(createAdapter(pubClient, subClient));

  console.log('[Worker] Socket.IO configured with Redis adapter');
}

// =============================================================================
// DISTRIBUTED LOCKING
// =============================================================================

const LOCK_TTL = 60000; // 60 seconds

async function acquireLock(lockName) {
  const lockKey = `lock:${lockName}`;
  const lockValue = `worker:${Date.now()}`;

  try {
    const result = await lockClient.set(lockKey, lockValue, {
      NX: true, // Only set if not exists
      PX: LOCK_TTL, // Expire after TTL
    });

    return result === 'OK';
  } catch (error) {
    console.error(`[Lock] Failed to acquire lock ${lockName}:`, error);
    return false;
  }
}

async function releaseLock(lockName) {
  const lockKey = `lock:${lockName}`;
  try {
    await lockClient.del(lockKey);
  } catch (error) {
    console.error(`[Lock] Failed to release lock ${lockName}:`, error);
  }
}

// =============================================================================
// JOB METRICS
// =============================================================================

let campaignJobRunning = false;
let leadReminderJobRunning = false;
let callSchedulerJobRunning = false;

const jobMetrics = {
  campaigns: 0,
  reminders: 0,
  calls: 0,
  lastCampaignRun: null,
  lastReminderRun: null,
  lastCallRun: null,
};

// =============================================================================
// SCHEDULED JOBS
// =============================================================================

/**
 * Campaign Processor
 * Runs every minute to process scheduled campaigns
 */
function startCampaignScheduler() {
  cron.schedule('* * * * *', async () => {
    // Try to acquire lock
    const hasLock = await acquireLock('campaign-scheduler');
    if (!hasLock) {
      console.log('[Campaign] Another worker has the lock, skipping...');
      return;
    }

    try {
      campaignJobRunning = true;
      console.log('[Campaign] Processing scheduled campaigns...');

      await campaignService.processScheduledCampaigns(io);

      jobMetrics.campaigns++;
      jobMetrics.lastCampaignRun = new Date().toISOString();
      console.log('[Campaign] Processing complete');
    } catch (error) {
      console.error('[Campaign] Error processing campaigns:', error);
    } finally {
      campaignJobRunning = false;
      await releaseLock('campaign-scheduler');
    }
  });

  console.log('[Worker] Campaign scheduler started (every minute)');
}

/**
 * Lead Reminder Processor
 * Runs every hour to send lead follow-up reminders
 */
function startLeadReminderScheduler() {
  const interval = process.env.LEAD_REMINDER_INTERVAL || 60;

  cron.schedule(`*/${interval} * * * *`, async () => {
    const hasLock = await acquireLock('lead-reminder-scheduler');
    if (!hasLock) {
      console.log('[LeadReminder] Another worker has the lock, skipping...');
      return;
    }

    try {
      leadReminderJobRunning = true;
      console.log('[LeadReminder] Checking for reminders...');

      await leadReminderService.checkAndSendReminders();

      jobMetrics.reminders++;
      jobMetrics.lastReminderRun = new Date().toISOString();
      console.log('[LeadReminder] Check complete');
    } catch (error) {
      console.error('[LeadReminder] Error processing reminders:', error);
    } finally {
      leadReminderJobRunning = false;
      await releaseLock('lead-reminder-scheduler');
    }
  });

  console.log(`[Worker] Lead reminder scheduler started (every ${interval} minutes)`);
}

/**
 * Call Queue Processor
 * Runs every 30 seconds to process scheduled calls
 */
function startCallScheduler() {
  const interval = process.env.CALL_SCHEDULER_INTERVAL || 30;

  cron.schedule(`*/${interval} * * * * *`, async () => {
    const hasLock = await acquireLock('call-scheduler');
    if (!hasLock) {
      return; // Silent skip for frequent job
    }

    try {
      callSchedulerJobRunning = true;
      await callScheduler.processCallQueue(io);
      jobMetrics.calls++;
      jobMetrics.lastCallRun = new Date().toISOString();
    } catch (error) {
      console.error('[CallScheduler] Error processing calls:', error);
    } finally {
      callSchedulerJobRunning = false;
      await releaseLock('call-scheduler');
    }
  });

  // Daily cleanup at midnight
  cron.schedule('0 0 * * *', async () => {
    const hasLock = await acquireLock('call-cleanup');
    if (!hasLock) return;

    try {
      console.log('[CallScheduler] Running daily cleanup...');
      await callScheduler.cleanupOldCalls();
    } catch (error) {
      console.error('[CallScheduler] Cleanup error:', error);
    } finally {
      await releaseLock('call-cleanup');
    }
  });

  console.log(`[Worker] Call scheduler started (every ${interval} seconds)`);
}

/**
 * Trial Expiration Checker
 * Runs every hour to check and suspend expired trials
 */
function startTrialExpirationChecker() {
  cron.schedule('0 * * * *', async () => {
    const hasLock = await acquireLock('trial-expiration');
    if (!hasLock) {
      console.log('[TrialExpiration] Another worker has the lock, skipping...');
      return;
    }

    try {
      console.log('[TrialExpiration] Checking for expired trials...');
      await checkExpiredTrials();
      console.log('[TrialExpiration] Check complete');
    } catch (error) {
      console.error('[TrialExpiration] Error:', error);
    } finally {
      await releaseLock('trial-expiration');
    }
  });

  console.log('[Worker] Trial expiration checker started (hourly)');
}

// =============================================================================
// HEALTH CHECKS
// =============================================================================

async function checkQdrantHealth() {
  try {
    // Use configured QDRANT_URL for multi-VPS compatibility
    const healthUrl = QDRANT_URL.replace(/\/$/, '') + '/health';
    const response = await fetch(healthUrl);
    return response.ok ? 'healthy' : 'unhealthy';
  } catch {
    return 'unavailable';
  }
}

async function checkDatabaseHealth() {
  try {
    const prisma = require('./lib/prisma');
    await prisma.$queryRaw`SELECT 1`;
    return 'connected';
  } catch {
    return 'disconnected';
  }
}

// =============================================================================
// STARTUP
// =============================================================================

async function start() {
  console.log('='.repeat(60));
  console.log('BHARAT CRM WORKER SERVER');
  console.log('='.repeat(60));

  try {
    // Connect to Redis
    await setupRedis();

    // Setup Socket.IO with Redis adapter
    await setupSocketIO();

    // Wait for Qdrant to be ready
    console.log('[Worker] Waiting for Qdrant...');
    let qdrantReady = false;
    for (let i = 0; i < 30; i++) {
      const health = await checkQdrantHealth();
      if (health === 'healthy') {
        qdrantReady = true;
        break;
      }
      await new Promise((r) => setTimeout(r, 2000));
    }

    if (!qdrantReady) {
      console.warn('[Worker] Qdrant not ready, continuing without vector DB...');
    } else {
      // Initialize vector DB service
      await vectorDBService.initialize();
      console.log('[Worker] Vector DB service initialized');
    }

    // Start scheduled jobs
    startCampaignScheduler();
    startLeadReminderScheduler();
    startCallScheduler();
    startTrialExpirationChecker();

    // Run initial checks
    console.log('[Worker] Running initial trial expiration check...');
    await checkExpiredTrials();

    // Start HTTP server
    server.listen(PORT, () => {
      console.log('='.repeat(60));
      console.log(`Worker server running on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
      console.log(`Metrics: http://localhost:${PORT}/metrics`);
      console.log('='.repeat(60));
    });
  } catch (error) {
    console.error('[Worker] Failed to start:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[Worker] Received SIGTERM, shutting down gracefully...');

  // Stop accepting new jobs
  cron.getTasks().forEach((task) => task.stop());

  // Wait for running jobs to complete
  await new Promise((r) => setTimeout(r, 5000));

  // Close Redis connections
  if (pubClient) await pubClient.quit();
  if (subClient) await subClient.quit();
  if (lockClient) await lockClient.quit();

  process.exit(0);
});

start();
