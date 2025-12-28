const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { tenantContext } = require('../middleware/tenant');
const leadReminderService = require('../services/leadReminderService');
const leadReminderScheduler = require('../services/leadReminderScheduler');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Apply authentication and tenant context to all routes
router.use(authenticate);
router.use(tenantContext);

/**
 * Get lead reminder configuration
 */
router.get('/config', async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const config = await leadReminderService.getConfig(tenantId);

    res.json({
      success: true,
      config
    });
  } catch (error) {
    console.error('Error getting reminder config:', error);
    res.status(500).json({
      error: 'Failed to get reminder configuration',
      message: error.message
    });
  }
});

/**
 * Update lead reminder configuration
 * Only ADMIN users can update configuration
 */
router.put('/config', async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const userId = req.user.id;

    // Check if user is ADMIN
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });

    if (user.role !== 'ADMIN') {
      return res.status(403).json({
        error: 'Permission denied',
        message: 'Only admin users can update reminder configuration'
      });
    }

    const { enabled, checkIntervalHours, recipientUserIds, sendWhatsApp, sendEmail } = req.body;

    // Build config object from provided fields
    const configUpdate = {};
    if (typeof enabled !== 'undefined') configUpdate.enabled = enabled;
    if (checkIntervalHours) configUpdate.checkIntervalHours = checkIntervalHours;
    if (recipientUserIds) configUpdate.recipientUserIds = recipientUserIds;
    if (typeof sendWhatsApp !== 'undefined') configUpdate.sendWhatsApp = sendWhatsApp;
    if (typeof sendEmail !== 'undefined') configUpdate.sendEmail = sendEmail;

    const updatedConfig = await leadReminderService.updateConfig(tenantId, configUpdate);

    res.json({
      success: true,
      message: 'Reminder configuration updated successfully',
      config: updatedConfig
    });
  } catch (error) {
    console.error('Error updating reminder config:', error);
    res.status(500).json({
      error: 'Failed to update reminder configuration',
      message: error.message
    });
  }
});

/**
 * Get list of users that can be assigned as reminder recipients
 */
router.get('/users', async (req, res) => {
  try {
    const tenantId = req.user.tenantId;

    const users = await prisma.user.findMany({
      where: {
        tenantId,
        isActive: true
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      },
      orderBy: {
        name: 'asc'
      }
    });

    res.json({
      success: true,
      users
    });
  } catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({
      error: 'Failed to get users',
      message: error.message
    });
  }
});

/**
 * Trigger reminder check manually (for testing)
 * Only ADMIN users can trigger manual checks
 */
router.post('/check-now', async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const userId = req.user.id;

    // Check if user is ADMIN
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });

    if (user.role !== 'ADMIN') {
      return res.status(403).json({
        error: 'Permission denied',
        message: 'Only admin users can trigger manual reminder checks'
      });
    }

    console.log(`\n🔔 Manual reminder check triggered by user ${userId} for tenant ${tenantId}`);

    const results = await leadReminderService.checkAndSendReminders(tenantId);

    res.json({
      success: true,
      message: 'Reminder check completed',
      results
    });
  } catch (error) {
    console.error('Error in manual reminder check:', error);
    res.status(500).json({
      error: 'Failed to check for reminders',
      message: error.message
    });
  }
});

/**
 * Get scheduler status
 */
router.get('/status', async (req, res) => {
  try {
    const isRunning = leadReminderScheduler.isRunning();
    const config = await leadReminderService.getConfig(req.user.tenantId);

    res.json({
      success: true,
      scheduler: {
        running: isRunning,
        checkInterval: 'Every hour'
      },
      config: {
        enabled: config.enabled,
        checkIntervalHours: config.checkIntervalHours,
        recipientsConfigured: config.recipientUserIds?.length || 0
      }
    });
  } catch (error) {
    console.error('Error getting reminder status:', error);
    res.status(500).json({
      error: 'Failed to get reminder status',
      message: error.message
    });
  }
});

module.exports = router;
