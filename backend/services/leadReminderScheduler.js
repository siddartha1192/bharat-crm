/**
 * Lead Reminder Scheduler
 * Runs every hour to check for uncontacted leads and send reminders
 */

const cron = require('node-cron');
const leadReminderService = require('./leadReminderService');

let reminderTask = null;

/**
 * Cron job that runs every hour
 * Checks for uncontacted leads and sends reminders
 */
function createScheduledTask() {
  // Run every hour (at minute 0)
  return cron.schedule('0 * * * *', async () => {
    try {
      console.log('\n⏰ [LEAD REMINDER SCHEDULER] Running hourly check...');
      await leadReminderService.checkAndSendReminders();
    } catch (error) {
      console.error('[LEAD REMINDER SCHEDULER] Error in scheduled task:', error);
    }
  });
}

/**
 * Start the scheduler
 */
function start() {
  if (reminderTask) {
    console.log('⚠️  Lead Reminder Scheduler is already running');
    return;
  }

  reminderTask = createScheduledTask();
  reminderTask.start();
  console.log('✅ Lead Reminder Scheduler started - checking every hour');
}

/**
 * Stop the scheduler
 */
function stop() {
  if (reminderTask) {
    reminderTask.stop();
    reminderTask = null;
    console.log('⏹️  Lead Reminder Scheduler stopped');
  }
}

/**
 * Check if scheduler is running
 */
function isRunning() {
  return reminderTask !== null;
}

module.exports = {
  start,
  stop,
  isRunning,
};
