const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { tenantContext, getTenantFilter, autoInjectTenantId } = require('../middleware/tenant');
const salesForecastService = require('../services/salesForecast');

// Apply authentication and tenant context to all routes
router.use(authenticate);
router.use(tenantContext);

/**
 * Get sales forecast for a specific period
 * GET /api/forecast/calculate
 * Query params: period, startDate, endDate, userId (optional)
 */
router.get('/calculate', async (req, res) => {
  try {
    const { period = 'monthly', startDate, endDate, userId } = req.query;

    // Parse dates
    const start = startDate ? new Date(startDate) : new Date(new Date().setDate(1)); // First day of current month
    const end = endDate ? new Date(endDate) : new Date(); // Today

    // ADMIN and MANAGER see organization-wide data by default, AGENT sees their own
    let targetUserId;
    if (req.user.role === 'ADMIN' || req.user.role === 'MANAGER') {
      targetUserId = userId || null; // null = organization-wide
    } else {
      targetUserId = req.user.id; // AGENT sees only their own
    }

    const forecast = await salesForecastService.calculateForecast(
      targetUserId,
      req.tenant.id,
      period,
      start,
      end
    );

    res.json(forecast);
  } catch (error) {
    console.error('Error calculating forecast:', error);
    res.status(500).json({ error: 'Failed to calculate forecast' });
  }
});

/**
 * Save forecast to database
 * POST /api/forecast/save
 */
router.post('/save', async (req, res) => {
  try {
    const { forecastData } = req.body;

    const savedForecast = await salesForecastService.saveForecast(
      req.user.id,
      req.tenant.id,
      forecastData
    );

    res.json(savedForecast);
  } catch (error) {
    console.error('Error saving forecast:', error);
    res.status(500).json({ error: 'Failed to save forecast' });
  }
});

/**
 * Get historical forecasts
 * GET /api/forecast/history
 * Query params: period, limit
 */
router.get('/history', async (req, res) => {
  try {
    const { period = 'monthly', limit = 10, userId } = req.query;

    // ADMIN and MANAGER see organization-wide data by default, AGENT sees their own
    let targetUserId;
    if (req.user.role === 'ADMIN' || req.user.role === 'MANAGER') {
      targetUserId = userId || null; // null = organization-wide
    } else {
      targetUserId = req.user.id; // AGENT sees only their own
    }

    const forecasts = await salesForecastService.getForecasts(
      targetUserId,
      req.tenant.id,
      period,
      parseInt(limit)
    );

    res.json(forecasts);
  } catch (error) {
    console.error('Error fetching forecast history:', error);
    res.status(500).json({ error: 'Failed to fetch forecast history' });
  }
});

/**
 * Get trend data for charts
 * GET /api/forecast/trends
 * Query params: period, months
 */
router.get('/trends', async (req, res) => {
  try {
    const { period = 'monthly', months = 6, userId } = req.query;

    // ADMIN and MANAGER see organization-wide data by default, AGENT sees their own
    let targetUserId;
    if (req.user.role === 'ADMIN' || req.user.role === 'MANAGER') {
      targetUserId = userId || null; // null = organization-wide
    } else {
      targetUserId = req.user.id; // AGENT sees only their own
    }

    const trends = await salesForecastService.getTrendData(
      targetUserId,
      req.tenant.id,
      period,
      parseInt(months)
    );

    res.json(trends);
  } catch (error) {
    console.error('Error fetching trend data:', error);
    res.status(500).json({ error: 'Failed to fetch trend data' });
  }
});

/**
 * Get pipeline health metrics
 * GET /api/forecast/pipeline-health
 */
router.get('/pipeline-health', async (req, res) => {
  try {
    const { userId } = req.query;

    // ADMIN and MANAGER see organization-wide data by default, AGENT sees their own
    let targetUserId;
    if (req.user.role === 'ADMIN' || req.user.role === 'MANAGER') {
      targetUserId = userId || null; // null = organization-wide
    } else {
      targetUserId = req.user.id; // AGENT sees only their own
    }

    const health = await salesForecastService.getPipelineHealth(targetUserId, req.tenant.id);

    res.json(health);
  } catch (error) {
    console.error('Error fetching pipeline health:', error);
    res.status(500).json({ error: 'Failed to fetch pipeline health' });
  }
});

/**
 * Get organization-wide forecast (admin/manager only)
 * GET /api/forecast/organization
 */
router.get('/organization', authorize('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const { period = 'monthly', startDate, endDate } = req.query;

    // Parse dates
    const start = startDate ? new Date(startDate) : new Date(new Date().setDate(1));
    const end = endDate ? new Date(endDate) : new Date();

    // Calculate org-wide forecast (userId = null)
    const forecast = await salesForecastService.calculateForecast(
      null,
      req.tenant.id,
      period,
      start,
      end
    );

    res.json(forecast);
  } catch (error) {
    console.error('Error calculating organization forecast:', error);
    res.status(500).json({ error: 'Failed to calculate organization forecast' });
  }
});

/**
 * Create or update revenue goal
 * POST /api/forecast/revenue-goal
 */
router.post('/revenue-goal', async (req, res) => {
  try {
    const { goalData } = req.body;

    // Only admins and managers can set org-wide goals (userId = null)
    const targetUserId = (!goalData.userId && (req.user.role === 'ADMIN' || req.user.role === 'MANAGER'))
      ? null
      : req.user.id;

    const goal = await salesForecastService.saveRevenueGoal(targetUserId, req.tenant.id, goalData);

    res.json(goal);
  } catch (error) {
    console.error('Error saving revenue goal:', error);
    res.status(500).json({ error: 'Failed to save revenue goal' });
  }
});

/**
 * Get revenue goals
 * GET /api/forecast/revenue-goals
 */
router.get('/revenue-goals', async (req, res) => {
  try {
    const { period, userId } = req.query;

    // ADMIN and MANAGER see organization-wide data by default, AGENT sees their own
    let targetUserId;
    if (req.user.role === 'ADMIN' || req.user.role === 'MANAGER') {
      targetUserId = userId || null; // null = organization-wide
    } else {
      targetUserId = req.user.id; // AGENT sees only their own
    }

    const goals = await salesForecastService.getRevenueGoals(targetUserId, req.tenant.id, period);

    res.json(goals);
  } catch (error) {
    console.error('Error fetching revenue goals:', error);
    res.status(500).json({ error: 'Failed to fetch revenue goals' });
  }
});

/**
 * Get active revenue goal
 * GET /api/forecast/revenue-goal/active
 */
router.get('/revenue-goal/active', async (req, res) => {
  try {
    const { period = 'monthly', userId } = req.query;

    // ADMIN and MANAGER see organization-wide data by default, AGENT sees their own
    let targetUserId;
    if (req.user.role === 'ADMIN' || req.user.role === 'MANAGER') {
      targetUserId = userId || null; // null = organization-wide
    } else {
      targetUserId = req.user.id; // AGENT sees only their own
    }

    const goal = await salesForecastService.getActiveRevenueGoal(targetUserId, req.tenant.id, period);

    res.json(goal);
  } catch (error) {
    console.error('Error fetching active revenue goal:', error);
    res.status(500).json({ error: 'Failed to fetch active revenue goal' });
  }
});

/**
 * Delete revenue goal
 * DELETE /api/forecast/revenue-goal/:id
 */
router.delete('/revenue-goal/:id', async (req, res) => {
  try {
    const goalId = req.params.id;

    await salesForecastService.deleteRevenueGoal(goalId, req.user.id, req.tenant.id);

    res.json({ message: 'Revenue goal deleted successfully' });
  } catch (error) {
    console.error('Error deleting revenue goal:', error);
    res.status(500).json({ error: 'Failed to delete revenue goal' });
  }
});

module.exports = router;
