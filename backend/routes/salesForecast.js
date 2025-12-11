const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const salesForecastService = require('../services/salesForecast');

/**
 * Get sales forecast for a specific period
 * GET /api/forecast/calculate
 * Query params: period, startDate, endDate, userId (optional)
 */
router.get('/calculate', authenticate, async (req, res) => {
  try {
    const { period = 'monthly', startDate, endDate, userId } = req.query;

    // Parse dates
    const start = startDate ? new Date(startDate) : new Date(new Date().setDate(1)); // First day of current month
    const end = endDate ? new Date(endDate) : new Date(); // Today

    // Only admins and managers can view other users' forecasts
    const targetUserId = userId && (req.user.role === 'ADMIN' || req.user.role === 'MANAGER')
      ? userId
      : req.user.id;

    const forecast = await salesForecastService.calculateForecast(
      targetUserId,
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
router.post('/save', authenticate, async (req, res) => {
  try {
    const { forecastData } = req.body;

    const savedForecast = await salesForecastService.saveForecast(
      req.user.id,
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
router.get('/history', authenticate, async (req, res) => {
  try {
    const { period = 'monthly', limit = 10, userId } = req.query;

    // Only admins and managers can view other users' forecasts
    const targetUserId = userId && (req.user.role === 'ADMIN' || req.user.role === 'MANAGER')
      ? userId
      : req.user.id;

    const forecasts = await salesForecastService.getForecasts(
      targetUserId,
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
router.get('/trends', authenticate, async (req, res) => {
  try {
    const { period = 'monthly', months = 6, userId } = req.query;

    // Only admins and managers can view other users' forecasts
    const targetUserId = userId && (req.user.role === 'ADMIN' || req.user.role === 'MANAGER')
      ? userId
      : req.user.id;

    const trends = await salesForecastService.getTrendData(
      targetUserId,
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
router.get('/pipeline-health', authenticate, async (req, res) => {
  try {
    const { userId } = req.query;

    // Only admins and managers can view other users' pipeline health
    const targetUserId = userId && (req.user.role === 'ADMIN' || req.user.role === 'MANAGER')
      ? userId
      : req.user.id;

    const health = await salesForecastService.getPipelineHealth(targetUserId);

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
router.get('/organization', authenticate, authorize('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const { period = 'monthly', startDate, endDate } = req.query;

    // Parse dates
    const start = startDate ? new Date(startDate) : new Date(new Date().setDate(1));
    const end = endDate ? new Date(endDate) : new Date();

    // Calculate org-wide forecast (userId = null)
    const forecast = await salesForecastService.calculateForecast(
      null,
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

module.exports = router;
