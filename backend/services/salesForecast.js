const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Sales Forecasting Service
 * Provides enterprise-grade sales forecasting analytics
 */

/**
 * Calculate sales forecast for a given period
 * @param {String} userId - User ID (optional, null for organization-wide)
 * @param {String} period - 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'
 * @param {Date} startDate - Start date for forecast period
 * @param {Date} endDate - End date for forecast period
 */
async function calculateForecast(userId, period, startDate, endDate) {
  try {
    // Build filter based on userId and date range
    const filter = {
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    };

    if (userId) {
      filter.userId = userId;
    }

    // Get all deals in the period
    const deals = await prisma.deal.findMany({
      where: filter,
      include: {
        pipelineStage: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    // Get all leads in the period
    const leads = await prisma.lead.findMany({
      where: filter
    });

    // Calculate metrics
    const wonDeals = deals.filter(d => d.stage === 'won');
    const lostDeals = deals.filter(d => d.stage === 'lost');
    const activeDeals = deals.filter(d => d.stage !== 'won' && d.stage !== 'lost');

    const wonRevenue = wonDeals.reduce((sum, deal) => sum + deal.value, 0);
    const pipelineValue = activeDeals.reduce((sum, deal) => sum + deal.value, 0);
    const weightedValue = activeDeals.reduce((sum, deal) => sum + (deal.value * deal.probability / 100), 0);

    const totalDeals = wonDeals.length + lostDeals.length;
    const conversionRate = totalDeals > 0 ? (wonDeals.length / totalDeals) * 100 : 0;

    // Calculate stage breakdown
    const stageBreakdown = {};
    deals.forEach(deal => {
      if (!stageBreakdown[deal.stage]) {
        stageBreakdown[deal.stage] = {
          count: 0,
          value: 0,
          probability: 0
        };
      }
      stageBreakdown[deal.stage].count += 1;
      stageBreakdown[deal.stage].value += deal.value;
      stageBreakdown[deal.stage].probability += deal.probability;
    });

    // Average probability per stage
    Object.keys(stageBreakdown).forEach(stage => {
      stageBreakdown[stage].probability =
        stageBreakdown[stage].count > 0
          ? stageBreakdown[stage].probability / stageBreakdown[stage].count
          : 0;
    });

    // Calculate user breakdown
    const userBreakdown = {};
    deals.forEach(deal => {
      if (!userBreakdown[deal.userId]) {
        userBreakdown[deal.userId] = {
          userName: deal.user.name,
          userEmail: deal.user.email,
          revenue: 0,
          deals: 0,
          leads: 0
        };
      }
      userBreakdown[deal.userId].deals += 1;
      if (deal.stage === 'won') {
        userBreakdown[deal.userId].revenue += deal.value;
      }
    });

    leads.forEach(lead => {
      if (userBreakdown[lead.userId]) {
        userBreakdown[lead.userId].leads += 1;
      }
    });

    // Get previous period data for comparison
    const periodDuration = endDate - startDate;
    const previousStartDate = new Date(startDate.getTime() - periodDuration);
    const previousEndDate = new Date(startDate);

    const previousFilter = {
      ...filter,
      createdAt: {
        gte: previousStartDate,
        lte: previousEndDate
      }
    };

    const previousWonDeals = await prisma.deal.findMany({
      where: {
        ...previousFilter,
        stage: 'won'
      }
    });

    const previousPeriodRevenue = previousWonDeals.reduce((sum, deal) => sum + deal.value, 0);
    const growthRate = previousPeriodRevenue > 0
      ? ((wonRevenue - previousPeriodRevenue) / previousPeriodRevenue) * 100
      : 0;

    return {
      forecastDate: new Date(),
      forecastPeriod: period,
      expectedRevenue: wonRevenue + weightedValue,
      pipelineValue,
      weightedValue,
      leadCount: leads.length,
      dealCount: deals.length,
      wonCount: wonDeals.length,
      lostCount: lostDeals.length,
      conversionRate,
      stageBreakdown,
      userBreakdown,
      previousPeriodRevenue,
      growthRate,
      wonRevenue
    };
  } catch (error) {
    console.error('Error calculating forecast:', error);
    throw error;
  }
}

/**
 * Save forecast to database
 */
async function saveForecast(userId, forecastData) {
  try {
    return await prisma.salesForecast.create({
      data: {
        userId: userId || null,
        forecastDate: forecastData.forecastDate,
        forecastPeriod: forecastData.forecastPeriod,
        expectedRevenue: forecastData.expectedRevenue,
        pipelineValue: forecastData.pipelineValue,
        weightedValue: forecastData.weightedValue,
        leadCount: forecastData.leadCount,
        dealCount: forecastData.dealCount,
        wonCount: forecastData.wonCount,
        lostCount: forecastData.lostCount,
        conversionRate: forecastData.conversionRate,
        stageBreakdown: forecastData.stageBreakdown,
        userBreakdown: forecastData.userBreakdown,
        previousPeriodRevenue: forecastData.previousPeriodRevenue,
        growthRate: forecastData.growthRate
      }
    });
  } catch (error) {
    console.error('Error saving forecast:', error);
    throw error;
  }
}

/**
 * Get historical forecasts
 */
async function getForecasts(userId, period, limit = 10) {
  try {
    const filter = { forecastPeriod: period };
    if (userId) {
      filter.userId = userId;
    }

    return await prisma.salesForecast.findMany({
      where: filter,
      orderBy: { forecastDate: 'desc' },
      take: limit
    });
  } catch (error) {
    console.error('Error fetching forecasts:', error);
    throw error;
  }
}

/**
 * Get trend data for charts
 */
async function getTrendData(userId, period, months = 6) {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const filter = {
      forecastDate: {
        gte: startDate,
        lte: endDate
      },
      forecastPeriod: period
    };

    if (userId) {
      filter.userId = userId;
    }

    const forecasts = await prisma.salesForecast.findMany({
      where: filter,
      orderBy: { forecastDate: 'asc' }
    });

    // Also get actual revenue data
    const actualDeals = await prisma.deal.groupBy({
      by: ['createdAt'],
      where: {
        stage: 'won',
        createdAt: {
          gte: startDate,
          lte: endDate
        },
        ...(userId ? { userId } : {})
      },
      _sum: {
        value: true
      }
    });

    return {
      forecasts,
      actualRevenue: actualDeals
    };
  } catch (error) {
    console.error('Error fetching trend data:', error);
    throw error;
  }
}

/**
 * Get pipeline health metrics
 */
async function getPipelineHealth(userId) {
  try {
    const filter = userId ? { userId } : {};

    // Get all active deals
    const deals = await prisma.deal.findMany({
      where: {
        ...filter,
        stage: {
          notIn: ['won', 'lost']
        }
      },
      include: {
        pipelineStage: true
      }
    });

    // Calculate metrics
    const totalValue = deals.reduce((sum, deal) => sum + deal.value, 0);
    const averageDealSize = deals.length > 0 ? totalValue / deals.length : 0;
    const averageProbability = deals.length > 0
      ? deals.reduce((sum, deal) => sum + deal.probability, 0) / deals.length
      : 0;

    // Stage distribution
    const stageDistribution = {};
    deals.forEach(deal => {
      if (!stageDistribution[deal.stage]) {
        stageDistribution[deal.stage] = { count: 0, value: 0 };
      }
      stageDistribution[deal.stage].count += 1;
      stageDistribution[deal.stage].value += deal.value;
    });

    // Aging analysis (deals older than 30, 60, 90 days)
    const now = new Date();
    const aging = {
      '0-30': 0,
      '31-60': 0,
      '61-90': 0,
      '90+': 0
    };

    deals.forEach(deal => {
      const daysSinceCreated = Math.floor((now - deal.createdAt) / (1000 * 60 * 60 * 24));
      if (daysSinceCreated <= 30) aging['0-30'] += 1;
      else if (daysSinceCreated <= 60) aging['31-60'] += 1;
      else if (daysSinceCreated <= 90) aging['61-90'] += 1;
      else aging['90+'] += 1;
    });

    return {
      totalDeals: deals.length,
      totalValue,
      averageDealSize,
      averageProbability,
      stageDistribution,
      aging
    };
  } catch (error) {
    console.error('Error fetching pipeline health:', error);
    throw error;
  }
}

module.exports = {
  calculateForecast,
  saveForecast,
  getForecasts,
  getTrendData,
  getPipelineHealth
};
