const express = require('express');
const router = express.Router();
const roundRobinService = require('../services/roundRobin');
const { authenticate } = require('../middleware/auth');
const { tenantContext } = require('../middleware/tenant');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Apply authentication and tenant context to all routes
router.use(authenticate);
router.use(tenantContext);

/**
 * GET /api/round-robin/config
 * Get round-robin configuration for tenant
 */
router.get('/config', async (req, res) => {
  try {
    const config = await roundRobinService.getConfig(req.tenant.id);

    if (!config) {
      // Return default configuration if none exists
      return res.json({
        isEnabled: false,
        assignmentScope: 'all',
        teamId: null,
        departmentId: null,
        customUserIds: [],
        workingHours: null,
        timezone: 'UTC',
        maxLeadsPerDay: null,
        maxLeadsPerWeek: null,
        fallbackToCreator: true,
        fallbackUserId: null,
        skipInactiveUsers: true,
        skipFullAgents: true,
      });
    }

    res.json(config);
  } catch (error) {
    console.error('Error fetching round-robin config:', error);
    res.status(500).json({ error: 'Failed to fetch configuration' });
  }
});

/**
 * POST /api/round-robin/config
 * Save or update round-robin configuration
 */
router.post('/config', async (req, res) => {
  try {
    // Only ADMIN and MANAGER can configure round-robin
    if (req.user.role !== 'ADMIN' && req.user.role !== 'MANAGER') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const configData = {
      isEnabled: req.body.isEnabled ?? false,
      assignmentScope: req.body.assignmentScope || 'all',
      teamId: req.body.teamId || null,
      departmentId: req.body.departmentId || null,
      customUserIds: req.body.customUserIds || [],
      workingHours: req.body.workingHours || null,
      timezone: req.body.timezone || 'UTC',
      maxLeadsPerDay: req.body.maxLeadsPerDay || null,
      maxLeadsPerWeek: req.body.maxLeadsPerWeek || null,
      fallbackToCreator: req.body.fallbackToCreator ?? true,
      fallbackUserId: req.body.fallbackUserId || null,
      skipInactiveUsers: req.body.skipInactiveUsers ?? true,
      skipFullAgents: req.body.skipFullAgents ?? true,
    };

    const config = await roundRobinService.saveConfig(req.tenant.id, configData);

    res.json({
      message: 'Round-robin configuration saved successfully',
      config,
    });
  } catch (error) {
    console.error('Error saving round-robin config:', error);
    res.status(500).json({ error: 'Failed to save configuration' });
  }
});

/**
 * GET /api/round-robin/state
 * Get current round-robin state (last assigned agent, rotation info)
 */
router.get('/state', async (req, res) => {
  try {
    const state = await roundRobinService.getState(req.tenant.id);

    if (!state) {
      return res.json({
        initialized: false,
        message: 'Round-robin not initialized yet',
      });
    }

    // Get user details for the user pool
    const users = await prisma.user.findMany({
      where: {
        id: { in: state.userPool },
        tenantId: req.tenant.id,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    res.json({
      initialized: true,
      lastAssignedUserId: state.lastAssignedUserId,
      lastAssignedUserName: state.lastAssignedUserName,
      lastAssignedAt: state.lastAssignedAt,
      assignmentCount: state.assignmentCount,
      rotationCycle: state.rotationCycle,
      userPool: users,
    });
  } catch (error) {
    console.error('Error fetching round-robin state:', error);
    res.status(500).json({ error: 'Failed to fetch state' });
  }
});

/**
 * POST /api/round-robin/reset
 * Reset round-robin rotation
 */
router.post('/reset', async (req, res) => {
  try {
    // Only ADMIN and MANAGER can reset rotation
    if (req.user.role !== 'ADMIN' && req.user.role !== 'MANAGER') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const state = await roundRobinService.resetRotation(req.tenant.id);

    res.json({
      message: 'Round-robin rotation reset successfully',
      state,
    });
  } catch (error) {
    console.error('Error resetting round-robin:', error);
    res.status(500).json({ error: error.message || 'Failed to reset rotation' });
  }
});

/**
 * GET /api/round-robin/statistics
 * Get round-robin assignment statistics
 */
router.get('/statistics', async (req, res) => {
  try {
    const { startDate, endDate, period = '30d' } = req.query;

    let start, end;
    if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
    } else {
      // Default to last 30 days
      end = new Date();
      start = new Date();
      const days = period === '7d' ? 7 : period === '90d' ? 90 : 30;
      start.setDate(start.getDate() - days);
    }

    const stats = await roundRobinService.getStatistics(req.tenant.id, start, end);

    res.json({
      period: { start, end },
      statistics: stats,
    });
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

/**
 * POST /api/round-robin/preview
 * Preview next agent assignment without actually assigning
 */
router.post('/preview', async (req, res) => {
  try {
    const nextAgent = await roundRobinService.getNextAgent(
      req.tenant.id,
      req.user.id,
      req.user.name
    );

    res.json({
      nextAgent,
      message: 'This is a preview only. No assignment was made.',
    });
  } catch (error) {
    console.error('Error previewing next agent:', error);
    res.status(500).json({ error: 'Failed to preview next agent' });
  }
});

/**
 * GET /api/round-robin/eligible-agents
 * Get list of eligible agents based on current configuration
 */
router.get('/eligible-agents', async (req, res) => {
  try {
    const config = await roundRobinService.getConfig(req.tenant.id);

    if (!config) {
      return res.json({ agents: [] });
    }

    const eligibleAgents = await roundRobinService.getEligibleAgents(config, req.tenant.id);
    const availableAgents = await roundRobinService.filterByCapacity(eligibleAgents, config, req.tenant.id);

    res.json({
      total: eligibleAgents.length,
      available: availableAgents.length,
      agents: availableAgents,
      fullAgents: eligibleAgents.filter(a => !availableAgents.find(av => av.id === a.id)),
    });
  } catch (error) {
    console.error('Error fetching eligible agents:', error);
    res.status(500).json({ error: 'Failed to fetch eligible agents' });
  }
});

/**
 * GET /api/round-robin/assignments
 * Get recent round-robin assignments with pagination
 */
router.get('/assignments', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const [assignments, total] = await Promise.all([
      prisma.roundRobinAssignment.findMany({
        where: { tenantId: req.tenant.id },
        orderBy: { assignedAt: 'desc' },
        take: limit,
        skip,
        include: {
          // Note: Lead relation not defined in schema, would need to add if needed
        },
      }),
      prisma.roundRobinAssignment.count({
        where: { tenantId: req.tenant.id },
      }),
    ]);

    res.json({
      assignments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching assignments:', error);
    res.status(500).json({ error: 'Failed to fetch assignments' });
  }
});

module.exports = router;
