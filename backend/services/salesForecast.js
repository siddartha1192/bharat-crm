const prisma = require('../lib/prisma');

/**
 * Sales Forecasting Service
 * Provides enterprise-grade sales forecasting analytics
 */

/**
 * Calculate sales forecast for a given period
 * @param {String} userId - User ID (optional, null for organization-wide)
 * @param {String} tenantId - Tenant ID (required for multi-tenant isolation)
 * @param {String} period - 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'
 * @param {Date} startDate - Start date for forecast period
 * @param {Date} endDate - End date for forecast period
 */
async function calculateForecast(userId, tenantId, period, startDate, endDate) {
  try {
    // Build filter based on tenantId, userId and date range
    const filter = {
      tenantId,
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

    // Find "won" and "lost" stages dynamically using the tenantId parameter
    let wonStageIds = [];
    let lostStageIds = [];
    let stageWarnings = [];

    // Use explicit stage mapping (isWonStage, isLostStage) for accurate conversion rate calculations
    const wonStages = await prisma.pipelineStage.findMany({
      where: {
        tenantId,
        isWonStage: true,
        isActive: true,
      },
      select: { id: true, name: true, slug: true },
    });

    const lostStages = await prisma.pipelineStage.findMany({
      where: {
        tenantId,
        isLostStage: true,
        isActive: true,
      },
      select: { id: true, name: true, slug: true },
    });

    // FALLBACK: If no stages are explicitly marked, use slug-based detection
    let wonStagesFallback = [];
    let lostStagesFallback = [];

    if (wonStages.length === 0) {
      wonStagesFallback = await prisma.pipelineStage.findMany({
        where: {
          tenantId,
          slug: { contains: 'won' },
          isActive: true,
        },
        select: { id: true, name: true, slug: true },
      });
    }

    if (lostStages.length === 0) {
      lostStagesFallback = await prisma.pipelineStage.findMany({
        where: {
          tenantId,
          slug: { contains: 'lost' },
          isActive: true,
        },
        select: { id: true, name: true, slug: true },
      });
    }

    const finalWonStages = wonStages.length > 0 ? wonStages : wonStagesFallback;
    const finalLostStages = lostStages.length > 0 ? lostStages : lostStagesFallback;

    wonStageIds = finalWonStages.map(s => s.id);
    lostStageIds = finalLostStages.map(s => s.id);

    // STRICT VALIDATION: Warn user if critical stages are missing
    if (wonStageIds.length === 0) {
      stageWarnings.push('⚠️  No "won" stage configured. Please go to Pipeline Settings and mark a stage as "Won Stage" (e.g., "Closed Won") for accurate revenue forecasting.');
    }
    if (lostStageIds.length === 0) {
      stageWarnings.push('⚠️  No "lost" stage configured. Please go to Pipeline Settings and mark a stage as "Lost Stage" (e.g., "Closed Lost") for accurate conversion rate tracking.');
    }

    // Log detected stages for transparency
    if (wonStageIds.length > 0) {
      const detectionMethod = wonStages.length > 0 ? 'isWonStage flag' : 'slug pattern';
      console.log(`✅ Using won stages for conversion rate (${detectionMethod}): ${finalWonStages.map(s => s.name).join(', ')}`);
    }
    if (lostStageIds.length > 0) {
      const detectionMethod = lostStages.length > 0 ? 'isLostStage flag' : 'slug pattern';
      console.log(`✅ Using lost stages for conversion rate (${detectionMethod}): ${finalLostStages.map(s => s.name).join(', ')}`);
    }

    // Calculate metrics with DYNAMIC stage detection (works with any custom stages)
    const wonDeals = deals.filter(d => wonStageIds.includes(d.stageId));
    const lostDeals = deals.filter(d => lostStageIds.includes(d.stageId));
    const activeDeals = deals.filter(d => !wonStageIds.includes(d.stageId) && !lostStageIds.includes(d.stageId));

    // CORRECT FORMULA: Conversion rate = Won DEALS / Total LEADS
    // This matches the Reports page calculation
    // Measures: "How many leads converted into won deals?"

    // DEBUG: Log calculation details
    console.log('\n📊 CONVERSION RATE CALCULATION DEBUG:');
    console.log(`Total leads in period: ${leads.length}`);
    console.log(`Total deals in period: ${deals.length}`);
    console.log(`Won deals: ${wonDeals.length}`);
    console.log(`Won stage IDs: [${wonStageIds.join(', ')}]`);
    console.log(`Conversion rate: ${wonDeals.length}/${leads.length} = ${leads.length > 0 ? ((wonDeals.length / leads.length) * 100).toFixed(2) : 0}%\n`);

    // Won revenue = actual closed revenue in this period
    const wonRevenue = wonDeals.reduce((sum, deal) => sum + deal.value, 0);

    // Pipeline value = total value of active deals
    const pipelineValue = activeDeals.reduce((sum, deal) => sum + deal.value, 0);

    // Weighted value = expected revenue from active deals (probability-adjusted)
    const weightedValue = activeDeals.reduce((sum, deal) => sum + (deal.value * deal.probability / 100), 0);

    // Conversion rate = won DEALS / total LEADS (matches Reports page)
    // This measures lead-to-deal conversion: "How many leads became won deals?"
    const conversionRate = leads.length > 0
      ? (wonDeals.length / leads.length) * 100
      : 0;

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
      tenantId,
      createdAt: {
        gte: previousStartDate,
        lte: previousEndDate
      }
    };
    if (userId) {
      previousFilter.userId = userId;
    }

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
          tenantId,
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
      wonCount: wonDeals.length,               // Count of won DEALS (for conversion rate calculation)
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
async function saveForecast(userId, tenantId, forecastData) {
  try {
    return await prisma.salesForecast.create({
      data: {
        userId: userId || null,
        tenantId,
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
async function getForecasts(userId, tenantId, period, limit = 10) {
  try {
    const filter = { tenantId, forecastPeriod: period };
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
async function getTrendData(userId, tenantId, period, months = 6) {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const filter = {
      tenantId,
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
    const wonStages = await prisma.pipelineStage.findMany({
      where: {
        tenantId,
        slug: { contains: 'won' },
        isActive: true,
      },
      select: { id: true },
    });
    wonStageIds = wonStages.map(s => s.id);

    // Also get actual revenue data (using dynamic won stages)
    const actualDeals = wonStageIds.length > 0 ? await prisma.deal.groupBy({
      by: ['createdAt'],
      where: {
        tenantId,
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
async function getPipelineHealth(userId, tenantId) {
  try {
    const filter = { tenantId };
    if (userId) {
      filter.userId = userId;
    }

    // Get tenant's closed stages dynamically
    let closedStageIds = [];
    const closedStages = await prisma.pipelineStage.findMany({
      where: {
        tenantId,
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
async function saveRevenueGoal(userId, tenantId, goalData) {
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
          tenantId,
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
async function getRevenueGoals(userId, tenantId, period = null) {
  try {
    const filter = { tenantId, userId: userId || null };
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
async function getActiveRevenueGoal(userId, tenantId, period = 'monthly') {
  try {
    const now = new Date();

    return await prisma.revenueGoal.findFirst({
      where: {
        tenantId,
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
async function deleteRevenueGoal(goalId, userId, tenantId) {
  try {
    return await prisma.revenueGoal.delete({
      where: {
        id: goalId,
        userId: userId || null,
        tenantId
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
