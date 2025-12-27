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
        pipelineStage: {
          select: {
            id: true,
            name: true,
            slug: true,
            color: true,
            stageType: true,
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            tenantId: true
          }
        }
      }
    });

    // Get all leads in the period
    const leads = await prisma.lead.findMany({
      where: filter
    });

    // Get tenantId to find closed stages dynamically
    const tenantId = deals.length > 0 ? deals[0].user.tenantId :
                     leads.length > 0 ? (await prisma.user.findUnique({ where: { id: userId }, select: { tenantId: true } }))?.tenantId :
                     null;

    // Find "won" and "lost" stages dynamically
    let wonStageIds = [];
    let lostStageIds = [];
    let stageWarnings = [];

    if (tenantId) {
      const wonStages = await prisma.pipelineStage.findMany({
        where: {
          tenantId,
          slug: { contains: 'won' },
          isActive: true,
        },
        select: { id: true, name: true, slug: true },
      });

      const lostStages = await prisma.pipelineStage.findMany({
        where: {
          tenantId,
          slug: { contains: 'lost' },
          isActive: true,
        },
        select: { id: true, name: true, slug: true },
      });

      wonStageIds = wonStages.map(s => s.id);
      lostStageIds = lostStages.map(s => s.id);

      // STRICT VALIDATION: Warn user if critical stages are missing
      if (wonStageIds.length === 0) {
        stageWarnings.push('⚠️  No "won" stage found. Please create a pipeline stage with "won" in the name (e.g., "Closed Won") for accurate revenue forecasting. Go to Pipeline Settings to add this stage.');
      }
      if (lostStageIds.length === 0) {
        stageWarnings.push('⚠️  No "lost" stage found. Please create a pipeline stage with "lost" in the name (e.g., "Closed Lost") for accurate conversion rate tracking. Go to Pipeline Settings to add this stage.');
      }

      // Log detected stages for transparency
      if (wonStageIds.length > 0) {
        console.log(`✅ Detected won stages: ${wonStages.map(s => s.name).join(', ')}`);
      }
      if (lostStageIds.length > 0) {
        console.log(`✅ Detected lost stages: ${lostStages.map(s => s.name).join(', ')}`);
      }
    }

    // Calculate metrics with DYNAMIC stage detection (works with any custom stages)
    const wonDeals = deals.filter(d => wonStageIds.includes(d.stageId));
    const lostDeals = deals.filter(d => lostStageIds.includes(d.stageId));
    const activeDeals = deals.filter(d => !wonStageIds.includes(d.stageId) && !lostStageIds.includes(d.stageId));

    // Won revenue = actual closed revenue in this period
    const wonRevenue = wonDeals.reduce((sum, deal) => sum + deal.value, 0);

    // Pipeline value = total value of active deals
    const pipelineValue = activeDeals.reduce((sum, deal) => sum + deal.value, 0);

    // Weighted value = expected revenue from active deals (probability-adjusted)
    const weightedValue = activeDeals.reduce((sum, deal) => sum + (deal.value * deal.probability / 100), 0);

    // Conversion rate = won / (won + lost) - only for CLOSED deals
    const closedDeals = wonDeals.length + lostDeals.length;
    const conversionRate = closedDeals > 0 ? (wonDeals.length / closedDeals) * 100 : 0;

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
      if (wonStageIds.includes(deal.stageId)) {
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

    const previousWonDeals = wonStageIds.length > 0 ? await prisma.deal.findMany({
      where: {
        ...previousFilter,
        stageId: { in: wonStageIds }  // DYNAMIC: Use tenant's won stages
      }
    }) : [];

    const previousPeriodRevenue = previousWonDeals.reduce((sum, deal) => sum + deal.value, 0);
    const growthRate = previousPeriodRevenue > 0
      ? ((wonRevenue - previousPeriodRevenue) / previousPeriodRevenue) * 100
      : 0;

    // Get active revenue goal for this period (if exists)
    let revenueGoal = null;
    try {
      const goal = await prisma.revenueGoal.findFirst({
        where: {
          userId: userId || null,
          startDate: { lte: endDate },
          endDate: { gte: startDate }
        }
      });
      if (goal) {
        revenueGoal = {
          target: goal.targetRevenue,
          progress: wonRevenue,
          percentage: (wonRevenue / goal.targetRevenue) * 100,
          remaining: goal.targetRevenue - wonRevenue
        };
      }
    } catch (error) {
      // Revenue goal might not exist yet (table not migrated)
      console.log('Revenue goal not available:', error.message);
    }

    return {
      forecastDate: new Date(),
      forecastPeriod: period,
      // FIXED: Clear naming
      actualRevenue: wonRevenue,              // Revenue already won (closed deals)
      projectedRevenue: weightedValue,         // Expected revenue from active pipeline
      expectedRevenue: wonRevenue + weightedValue,  // Total forecast (actual + projected)
      pipelineValue,                           // Total pipeline value (unweighted)
      weightedValue,                           // Weighted pipeline value
      leadCount: leads.length,
      dealCount: deals.length,
      activeDeals: activeDeals.length,         // NEW: Count of active deals
      wonCount: wonDeals.length,
      lostCount: lostDeals.length,
      conversionRate,
      stageBreakdown,
      userBreakdown,
      previousPeriodRevenue,
      growthRate,
      wonRevenue,                              // Kept for backward compatibility
      revenueGoal,                             // NEW: Revenue goal tracking
      stageWarnings: stageWarnings.length > 0 ? stageWarnings : null  // CRITICAL: Stage configuration warnings
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

    // Get tenant's won stages
    let wonStageIds = [];
    if (userId || forecasts.length > 0) {
      const user = userId ? await prisma.user.findUnique({
        where: { id: userId },
        select: { tenantId: true }
      }) : await prisma.user.findFirst({
        select: { tenantId: true }
      });

      if (user) {
        const wonStages = await prisma.pipelineStage.findMany({
          where: {
            tenantId: user.tenantId,
            slug: { contains: 'won' },
            isActive: true,
          },
          select: { id: true },
        });
        wonStageIds = wonStages.map(s => s.id);
      }
    }

    // Also get actual revenue data (using dynamic won stages)
    const actualDeals = wonStageIds.length > 0 ? await prisma.deal.groupBy({
      by: ['createdAt'],
      where: {
        stageId: { in: wonStageIds },
        createdAt: {
          gte: startDate,
          lte: endDate
        },
        ...(userId ? { userId } : {})
      },
      _sum: {
        value: true
      }
    }) : [];

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

    // Get tenant's closed stages dynamically
    let closedStageIds = [];
    const user = userId ? await prisma.user.findUnique({
      where: { id: userId },
      select: { tenantId: true }
    }) : await prisma.user.findFirst({
      select: { tenantId: true }
    });

    if (user) {
      const closedStages = await prisma.pipelineStage.findMany({
        where: {
          tenantId: user.tenantId,
          OR: [
            { slug: { contains: 'won' } },
            { slug: { contains: 'lost' } },
            { slug: { contains: 'closed' } },
          ],
          isActive: true,
        },
        select: { id: true },
      });
      closedStageIds = closedStages.map(s => s.id);
    }

    // Get all active deals (exclude closed deals dynamically)
    const deals = await prisma.deal.findMany({
      where: {
        ...filter,
        ...(closedStageIds.length > 0 ? { stageId: { notIn: closedStageIds } } : {})
      },
      include: {
        pipelineStage: {
          select: {
            id: true,
            name: true,
            slug: true,
            color: true,
          }
        }
      }
    });

    // Calculate metrics
    const totalValue = deals.reduce((sum, deal) => sum + deal.value, 0);
    const averageDealSize = deals.length > 0 ? totalValue / deals.length : 0;
    const averageProbability = deals.length > 0
      ? deals.reduce((sum, deal) => sum + deal.probability, 0) / deals.length
      : 0;

    // Stage distribution (using pipeline stage name)
    const stageDistribution = {};
    deals.forEach(deal => {
      const stageName = deal.pipelineStage?.name || deal.stage;
      if (!stageDistribution[stageName]) {
        stageDistribution[stageName] = { count: 0, value: 0 };
      }
      stageDistribution[stageName].count += 1;
      stageDistribution[stageName].value += deal.value;
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

/**
 * Create or update revenue goal
 */
async function saveRevenueGoal(userId, goalData) {
  try {
    if (goalData.id) {
      // Update existing goal
      return await prisma.revenueGoal.update({
        where: { id: goalData.id },
        data: {
          period: goalData.period,
          targetRevenue: goalData.targetRevenue,
          startDate: new Date(goalData.startDate),
          endDate: new Date(goalData.endDate),
          description: goalData.description
        }
      });
    } else {
      // Create new goal
      return await prisma.revenueGoal.create({
        data: {
          userId: userId || null,
          period: goalData.period,
          targetRevenue: goalData.targetRevenue,
          startDate: new Date(goalData.startDate),
          endDate: new Date(goalData.endDate),
          description: goalData.description
        }
      });
    }
  } catch (error) {
    console.error('Error saving revenue goal:', error);
    throw error;
  }
}

/**
 * Get revenue goals
 */
async function getRevenueGoals(userId, period = null) {
  try {
    const filter = { userId: userId || null };
    if (period) {
      filter.period = period;
    }

    return await prisma.revenueGoal.findMany({
      where: filter,
      orderBy: { startDate: 'desc' }
    });
  } catch (error) {
    console.error('Error fetching revenue goals:', error);
    throw error;
  }
}

/**
 * Get active revenue goal for current period
 */
async function getActiveRevenueGoal(userId, period = 'monthly') {
  try {
    const now = new Date();

    return await prisma.revenueGoal.findFirst({
      where: {
        userId: userId || null,
        period,
        startDate: { lte: now },
        endDate: { gte: now }
      }
    });
  } catch (error) {
    console.error('Error fetching active revenue goal:', error);
    throw error;
  }
}

/**
 * Delete revenue goal
 */
async function deleteRevenueGoal(goalId, userId) {
  try {
    return await prisma.revenueGoal.delete({
      where: {
        id: goalId,
        userId: userId || null
      }
    });
  } catch (error) {
    console.error('Error deleting revenue goal:', error);
    throw error;
  }
}

module.exports = {
  calculateForecast,
  saveForecast,
  getForecasts,
  getTrendData,
  getPipelineHealth,
  saveRevenueGoal,
  getRevenueGoals,
  getActiveRevenueGoal,
  deleteRevenueGoal
};
