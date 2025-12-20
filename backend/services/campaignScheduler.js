/**
 * Campaign Scheduler Service
 * Runs every minute to check for scheduled campaigns and execute them
 */

const cron = require('node-cron');
const campaignService = require('./campaign');

let io = null; // Will be set from server.js

/**
 * Initialize the campaign scheduler
 * @param {SocketIO} socketIO - Socket.io instance for real-time updates
 */
function initialize(socketIO) {
  io = socketIO;
  console.log('🕐 Campaign Scheduler initialized');
}

/**
 * Cron job that runs every minute
 * Checks for scheduled campaigns that are ready to execute
 */
const scheduledTask = cron.schedule('* * * * *', async () => {
  try {
    await campaignService.processScheduledCampaigns(io);
  } catch (error) {
    console.error('[CAMPAIGN SCHEDULER] Error in scheduled task:', error);
  }
});

/**
 * Start the scheduler
 */
function start() {
  scheduledTask.start();
  console.log('✅ Campaign Scheduler started - checking every minute');
}

/**
 * Stop the scheduler
 */
function stop() {
  scheduledTask.stop();
  console.log('⏹️  Campaign Scheduler stopped');
}

module.exports = {
  initialize,
  start,
  stop,
  scheduledTask,
};
