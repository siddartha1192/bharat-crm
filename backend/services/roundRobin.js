const prisma = require('../lib/prisma');

/**
 * Enterprise Round-Robin Lead Assignment Service
 * Handles intelligent lead distribution across agents
 */
class RoundRobinService {
  /**
   * Get the next agent for lead assignment using round-robin logic
   * @param {string} tenantId - Tenant ID
   * @param {string} creatorId - ID of user creating the lead (for fallback)
   * @param {string} creatorName - Name of user creating the lead (for fallback)
   * @returns {Promise<{userId: string, userName: string, reason: string}>}
   */
  async getNextAgent(tenantId, creatorId, creatorName) {
    try {
      // Get round-robin configuration
      const config = await prisma.roundRobinConfig.findUnique({
        where: { tenantId },
      });

      // If round-robin is disabled or not configured, use fallback
      if (!config || !config.isEnabled) {
        return {
          userId: creatorId,
          userName: creatorName,
          reason: 'round_robin_disabled',
        };
      }

      // Get eligible agents based on configuration
      const eligibleAgents = await this.getEligibleAgents(config, tenantId);

      // If no eligible agents, use fallback
      if (eligibleAgents.length === 0) {
        return await this.getFallbackAgent(config, creatorId, creatorName, tenantId);
      }

      // Check working hours
      if (config.workingHours && !this.isWithinWorkingHours(config.workingHours, config.timezone)) {
        return await this.getFallbackAgent(config, creatorId, creatorName, tenantId);
      }

      // Filter agents by capacity limits
      const availableAgents = await this.filterByCapacity(eligibleAgents, config, tenantId);

      // If no agents available after capacity check, use fallback
      if (availableAgents.length === 0) {
        return await this.getFallbackAgent(config, creatorId, creatorName, tenantId);
      }

      // Get or initialize round-robin state
      let state = await prisma.roundRobinState.findUnique({
        where: { tenantId },
      });

      // If state doesn't exist or user pool changed, initialize it
      const currentUserPool = availableAgents.map(a => a.id);
      const shouldResetState = !state ||
                               JSON.stringify(state.userPool.sort()) !== JSON.stringify(currentUserPool.sort());

      if (shouldResetState) {
        state = await this.initializeState(tenantId, availableAgents);
      }

      // Find next agent in rotation
      const lastAssignedIndex = state.userPool.indexOf(state.lastAssignedUserId);
      const nextIndex = (lastAssignedIndex + 1) % state.userPool.length;
      const nextUserId = state.userPool[nextIndex];
      const nextAgent = availableAgents.find(a => a.id === nextUserId);

      if (!nextAgent) {
        // Agent not found in current pool, reset and try again
        state = await this.initializeState(tenantId, availableAgents);
        const firstAgent = availableAgents[0];

        // Update state
        await this.updateState(tenantId, firstAgent.id, firstAgent.name, state.userPool);

        return {
          userId: firstAgent.id,
          userName: firstAgent.name,
          reason: 'round_robin',
        };
      }

      // Update state with new assignment
      await this.updateState(tenantId, nextAgent.id, nextAgent.name, state.userPool);

      return {
        userId: nextAgent.id,
        userName: nextAgent.name,
        reason: 'round_robin',
      };
    } catch (error) {
      console.error('Error in getNextAgent:', error);
      // On error, fall back to creator
      return {
        userId: creatorId,
        userName: creatorName,
        reason: 'error_fallback',
      };
    }
  }

  /**
   * Get eligible agents based on configuration
   * @param {Object} config - Round-robin configuration
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} List of eligible users
   */
  async getEligibleAgents(config, tenantId) {
    const where = {
      tenantId,
      isActive: config.skipInactiveUsers ? true : undefined,
    };

    // Build query based on assignment scope
    if (config.assignmentScope === 'team' && config.teamId) {
      where.teamId = config.teamId;
    } else if (config.assignmentScope === 'department' && config.departmentId) {
      where.departmentId = config.departmentId;
    } else if (config.assignmentScope === 'custom' && config.customUserIds.length > 0) {
      where.id = { in: config.customUserIds };
    }

    // Only assign to AGENTs and MANAGERs (not ADMIN or VIEWER)
    where.role = { in: ['AGENT', 'MANAGER'] };

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return users;
  }

  /**
   * Filter agents by capacity limits (max leads per day/week)
   * @param {Array} agents - List of agents
   * @param {Object} config - Round-robin configuration
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Filtered list of agents
   */
  async filterByCapacity(agents, config, tenantId) {
    if (!config.skipFullAgents || (!config.maxLeadsPerDay && !config.maxLeadsPerWeek)) {
      return agents; // No capacity filtering needed
    }

    const now = new Date();
    const availableAgents = [];

    for (const agent of agents) {
      let isAvailable = true;

      // Check daily limit
      if (config.maxLeadsPerDay) {
        const startOfDay = new Date(now);
        startOfDay.setHours(0, 0, 0, 0);

        const dailyCount = await prisma.roundRobinAssignment.count({
          where: {
            tenantId,
            userId: agent.id,
            assignedAt: { gte: startOfDay },
          },
        });

        if (dailyCount >= config.maxLeadsPerDay) {
          isAvailable = false;
        }
      }

      // Check weekly limit
      if (config.maxLeadsPerWeek && isAvailable) {
        const startOfWeek = new Date(now);
        const dayOfWeek = startOfWeek.getDay();
        const diff = startOfWeek.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust to Monday
        startOfWeek.setDate(diff);
        startOfWeek.setHours(0, 0, 0, 0);

        const weeklyCount = await prisma.roundRobinAssignment.count({
          where: {
            tenantId,
            userId: agent.id,
            assignedAt: { gte: startOfWeek },
          },
        });

        if (weeklyCount >= config.maxLeadsPerWeek) {
          isAvailable = false;
        }
      }

      if (isAvailable) {
        availableAgents.push(agent);
      }
    }

    return availableAgents;
  }

  /**
   * Check if current time is within working hours
   * @param {Object} workingHours - Working hours configuration
   * @param {string} timezone - Timezone string
   * @returns {boolean} True if within working hours
   */
  isWithinWorkingHours(workingHours, timezone) {
    try {
      const now = new Date();
      const options = { timeZone: timezone, hour12: false };
      const timeStr = now.toLocaleTimeString('en-US', options);
      const [hours, minutes] = timeStr.split(':').map(Number);
      const currentMinutes = hours * 60 + minutes;

      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const currentDay = dayNames[now.getDay()];

      const dayConfig = workingHours[currentDay];
      if (!dayConfig || !dayConfig.enabled) {
        return false; // Not a working day
      }

      const [startHour, startMinute] = dayConfig.start.split(':').map(Number);
      const [endHour, endMinute] = dayConfig.end.split(':').map(Number);
      const startMinutes = startHour * 60 + startMinute;
      const endMinutes = endHour * 60 + endMinute;

      return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    } catch (error) {
      console.error('Error checking working hours:', error);
      return true; // On error, assume within working hours
    }
  }

  /**
   * Get fallback agent when no agents are available
   * @param {Object} config - Round-robin configuration
   * @param {string} creatorId - Creator user ID
   * @param {string} creatorName - Creator user name
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Fallback agent info
   */
  async getFallbackAgent(config, creatorId, creatorName, tenantId) {
    // If specific fallback user is configured
    if (config.fallbackUserId) {
      const fallbackUser = await prisma.user.findFirst({
        where: {
          id: config.fallbackUserId,
          tenantId,
          isActive: true,
        },
        select: { id: true, name: true },
      });

      if (fallbackUser) {
        return {
          userId: fallbackUser.id,
          userName: fallbackUser.name,
          reason: 'fallback_user',
        };
      }
    }

    // If fallback to creator is enabled (default)
    if (config.fallbackToCreator) {
      return {
        userId: creatorId,
        userName: creatorName,
        reason: 'fallback_creator',
      };
    }

    // Last resort - return creator anyway
    return {
      userId: creatorId,
      userName: creatorName,
      reason: 'no_agents_available',
    };
  }

  /**
   * Initialize round-robin state
   * @param {string} tenantId - Tenant ID
   * @param {Array} agents - List of agents
   * @returns {Promise<Object>} Created state
   */
  async initializeState(tenantId, agents) {
    const userPool = agents.map(a => a.id);
    const firstAgent = agents[0];

    const state = await prisma.roundRobinState.upsert({
      where: { tenantId },
      create: {
        tenantId,
        lastAssignedUserId: firstAgent.id,
        lastAssignedUserName: firstAgent.name,
        userPool,
        assignmentCount: 0,
        rotationCycle: 1,
      },
      update: {
        userPool,
        rotationCycle: { increment: 1 },
      },
    });

    return state;
  }

  /**
   * Update round-robin state after assignment
   * @param {string} tenantId - Tenant ID
   * @param {string} userId - Assigned user ID
   * @param {string} userName - Assigned user name
   * @param {Array} userPool - Current user pool
   * @returns {Promise<Object>} Updated state
   */
  async updateState(tenantId, userId, userName, userPool) {
    const state = await prisma.roundRobinState.update({
      where: { tenantId },
      data: {
        lastAssignedUserId: userId,
        lastAssignedUserName: userName,
        lastAssignedAt: new Date(),
        assignmentCount: { increment: 1 },
        userPool,
      },
    });

    return state;
  }

  /**
   * Log round-robin assignment for audit trail
   * @param {string} tenantId - Tenant ID
   * @param {string} leadId - Lead ID
   * @param {string} userId - Assigned user ID
   * @param {string} userName - Assigned user name
   * @param {string} reason - Assignment reason
   * @param {number} rotationCycle - Current rotation cycle
   * @returns {Promise<Object>} Created log entry
   */
  async logAssignment(tenantId, leadId, userId, userName, reason, rotationCycle = 0) {
    const log = await prisma.roundRobinAssignment.create({
      data: {
        tenantId,
        leadId,
        userId,
        userName,
        assignmentReason: reason,
        rotationCycle,
      },
    });

    return log;
  }

  /**
   * Get round-robin configuration for tenant
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Configuration or null
   */
  async getConfig(tenantId) {
    const config = await prisma.roundRobinConfig.findUnique({
      where: { tenantId },
    });

    return config;
  }

  /**
   * Get round-robin state for tenant
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} State or null
   */
  async getState(tenantId) {
    const state = await prisma.roundRobinState.findUnique({
      where: { tenantId },
    });

    return state;
  }

  /**
   * Get round-robin statistics
   * @param {string} tenantId - Tenant ID
   * @param {Date} startDate - Start date for stats
   * @param {Date} endDate - End date for stats
   * @returns {Promise<Object>} Statistics
   */
  async getStatistics(tenantId, startDate, endDate) {
    const assignments = await prisma.roundRobinAssignment.findMany({
      where: {
        tenantId,
        assignedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    // Group by user
    const byUser = assignments.reduce((acc, assignment) => {
      if (!acc[assignment.userId]) {
        acc[assignment.userId] = {
          userId: assignment.userId,
          userName: assignment.userName,
          count: 0,
          reasons: {},
        };
      }
      acc[assignment.userId].count++;
      acc[assignment.userId].reasons[assignment.assignmentReason] =
        (acc[assignment.userId].reasons[assignment.assignmentReason] || 0) + 1;
      return acc;
    }, {});

    // Group by reason
    const byReason = assignments.reduce((acc, assignment) => {
      acc[assignment.assignmentReason] = (acc[assignment.assignmentReason] || 0) + 1;
      return acc;
    }, {});

    return {
      total: assignments.length,
      byUser: Object.values(byUser),
      byReason,
    };
  }

  /**
   * Reset round-robin rotation
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Reset state
   */
  async resetRotation(tenantId) {
    const config = await this.getConfig(tenantId);
    if (!config) {
      throw new Error('Round-robin configuration not found');
    }

    const eligibleAgents = await this.getEligibleAgents(config, tenantId);
    if (eligibleAgents.length === 0) {
      throw new Error('No eligible agents found');
    }

    const state = await this.initializeState(tenantId, eligibleAgents);
    return state;
  }

  /**
   * Save or update round-robin configuration
   * @param {string} tenantId - Tenant ID
   * @param {Object} configData - Configuration data
   * @returns {Promise<Object>} Saved configuration
   */
  async saveConfig(tenantId, configData) {
    const config = await prisma.roundRobinConfig.upsert({
      where: { tenantId },
      create: {
        tenantId,
        ...configData,
      },
      update: configData,
    });

    // If config is enabled and user pool changed, reset state
    if (config.isEnabled) {
      try {
        await this.resetRotation(tenantId);
      } catch (error) {
        console.error('Error resetting rotation:', error);
      }
    }

    return config;
  }

  /**
   * Delete round-robin configuration
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<void>}
   */
  async deleteConfig(tenantId) {
    await prisma.roundRobinConfig.delete({
      where: { tenantId },
    });

    // Also delete state
    await prisma.roundRobinState.deleteMany({
      where: { tenantId },
    });
  }
}

module.exports = new RoundRobinService();
