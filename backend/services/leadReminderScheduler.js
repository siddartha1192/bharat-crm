/**
 * Lead Reminder Scheduler
 * Runs periodically to check for uncontacted leads and send reminders
 * Interval is configurable via reminder settings
 */

const cron = require('node-cron');
const leadReminderService = require('./leadReminderService');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

let reminderTask = null;
let currentInterval = null;

/**
 * Get scheduler interval from global settings (first tenant with reminder enabled)
 * Default to 60 minutes if not configured
 */
async function getSchedulerInterval() {
  try {
    // Get first tenant with reminders enabled
    const tenant = await prisma.tenant.findFirst({
      where: {
        settings: {
          path: ['leadReminders', 'enabled'],
          equals: true
        }
      },
      select: { settings: true }
    });

    const schedulerInterval = tenant?.settings?.leadReminders?.schedulerIntervalMinutes || 60;
    return Math.max(1, Math.min(1440, schedulerInterval)); // Clamp between 1 min and 24 hours
  } catch (error) {
    console.error('Error getting scheduler interval:', error);
    return 60; // Default to 1 hour
  }
}

/**
 * Convert minutes to cron expression
 * @param {number} minutes - Interval in minutes
 * @returns {string} - Cron expression
 */
function minutesToCronExpression(minutes) {
  if (minutes === 60) {
    return '0 * * * *'; // Every hour at minute 0
  } else if (minutes < 60) {
    return `*/${minutes} * * * *`; // Every X minutes
  } else {
    const hours = Math.floor(minutes / 60);
    return `0 */${hours} * * *`; // Every X hours
  }
}

/**
 * Create scheduled task with given interval
 */
function createScheduledTask(intervalMinutes) {
  const cronExpression = minutesToCronExpression(intervalMinutes);
  console.log(`   Creating scheduler with interval: ${intervalMinutes} minutes (cron: ${cronExpression})`);

  return cron.schedule(cronExpression, async () => {
    try {
      console.log(`\n⏰ [LEAD REMINDER SCHEDULER] Running check (interval: ${intervalMinutes} min)...`);
      await leadReminderService.checkAndSendReminders();
    } catch (error) {
      console.error('[LEAD REMINDER SCHEDULER] Error in scheduled task:', error);
    }
  });
}

/**
 * Start the scheduler with current configuration
 */
async function start() {
  if (reminderTask) {
    console.log('⚠️  Lead Reminder Scheduler is already running');
    return;
  }

  const intervalMinutes = await getSchedulerInterval();
  currentInterval = intervalMinutes;

  reminderTask = createScheduledTask(intervalMinutes);
  reminderTask.start();
  console.log(`✅ Lead Reminder Scheduler started - checking every ${intervalMinutes} minutes`);
}

/**
 * Stop the scheduler
 */
function stop() {
  if (reminderTask) {
    reminderTask.stop();
    reminderTask = null;
    currentInterval = null;
    console.log('⏹️  Lead Reminder Scheduler stopped');
  }
}

/**
 * Restart the scheduler (used when configuration changes)
 */
async function restart() {
  console.log('🔄 Restarting Lead Reminder Scheduler...');
  stop();
  await start();
}

/**
 * Check if scheduler is running
 */
function isRunning() {
  return reminderTask !== null;
}

/**
 * Get current interval
 */
function getCurrentInterval() {
  return currentInterval;
}

module.exports = {
  start,
  stop,
  restart,
  isRunning,
  getCurrentInterval,
};
