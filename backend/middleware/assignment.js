const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Get visibility filter for entities based on user role
 * @param {Object} user - User object with role, id, departmentId, teamId, tenantId
 * @returns {Object} Prisma where clause for filtering entities
 */
async function getVisibilityFilter(user) {
  const { role, id: userId, departmentId, teamId, tenantId } = user;

  switch (role) {
    case 'ADMIN':
      // Admins see everything in their tenant - no additional filter
      return {};

    case 'MANAGER':
      // Managers see items in their department/team (within their tenant only)
      if (departmentId) {
        const departmentUsers = await prisma.user.findMany({
          where: {
            departmentId,
            tenantId  // CRITICAL: Filter by tenant
          },
          select: { id: true, name: true }
        });

        const userIds = departmentUsers.map(u => u.id);
        const userNames = departmentUsers.map(u => u.name);

        return {
          OR: [
            { userId: { in: userIds } },
            { assignedTo: { in: userNames } },
            { createdBy: { in: userIds } }
          ]
        };
      } else if (teamId) {
        const teamUsers = await prisma.user.findMany({
          where: {
            teamId,
            tenantId  // CRITICAL: Filter by tenant
          },
          select: { id: true, name: true }
        });

        const userIds = teamUsers.map(u => u.id);
        const userNames = teamUsers.map(u => u.name);

        return {
          OR: [
            { userId: { in: userIds } },
            { assignedTo: { in: userNames } },
            { createdBy: { in: userIds } }
          ]
        };
      }
      // Fallback: manager with no department/team sees only their own items
      return {
        OR: [
          { userId: userId },
          { assignedTo: user.name },
          { createdBy: userId }
        ]
      };

    case 'AGENT':
      // Agents see only items assigned to them or created by them
      return {
        OR: [
          { assignedTo: user.name },
          { createdBy: userId },
          { userId: userId }
        ]
      };

    case 'VIEWER':
      // Viewers see team's items in read-only mode (within their tenant only)
      if (teamId) {
        const teamUsers = await prisma.user.findMany({
          where: {
            teamId,
            tenantId  // CRITICAL: Filter by tenant
          },
          select: { id: true }
        });

        const userIds = teamUsers.map(u => u.id);

        return { userId: { in: userIds } };
      }
      // Fallback: viewer with no team sees only their own items
      return { userId: userId };

    default:
      // Default: only see own items
      return { userId: userId };
  }
}

/**
 * Check if user can assign/reassign to a specific target user
 * @param {Object} currentUser - Current user making the assignment
 * @param {String} targetUserId - User ID to assign to
 * @returns {Boolean} - Whether assignment is allowed
 */
async function canAssignTo(currentUser, targetUserId) {
  const { role, id: userId, departmentId, teamId } = currentUser;

  // Admins can assign to anyone
  if (role === 'ADMIN') {
    return true;
  }

  // Users can always assign to themselves
  if (userId === targetUserId) {
    return true;
  }

  // Managers can assign to users in their department/team
  if (role === 'MANAGER') {
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { departmentId: true, teamId: true }
    });

    if (!targetUser) {
      return false;
    }

    // Check if target user is in same department or team
    if (departmentId && targetUser.departmentId === departmentId) {
      return true;
    }

    if (teamId && targetUser.teamId === teamId) {
      return true;
    }

    return false;
  }

  // Agents and viewers cannot assign to others
  return false;
}

/**
 * Check if user can assign by name (for backward compatibility with assignedTo field)
 * @param {Object} currentUser - Current user making the assignment
 * @param {String} targetUserName - User name to assign to
 * @returns {Boolean} - Whether assignment is allowed
 */
async function canAssignToByName(currentUser, targetUserName) {
  const { role, name: userName, departmentId, teamId } = currentUser;

  // Admins can assign to anyone
  if (role === 'ADMIN') {
    return true;
  }

  // Users can always assign to themselves
  if (userName === targetUserName) {
    return true;
  }

  // Managers can assign to users in their department/team
  if (role === 'MANAGER') {
    const targetUser = await prisma.user.findFirst({
      where: { name: targetUserName },
      select: { departmentId: true, teamId: true }
    });

    if (!targetUser) {
      return false;
    }

    // Check if target user is in same department or team
    if (departmentId && targetUser.departmentId === departmentId) {
      return true;
    }

    if (teamId && targetUser.teamId === teamId) {
      return true;
    }

    return false;
  }

  // Agents and viewers cannot assign to others
  return false;
}

/**
 * Get list of users that current user can assign to
 * @param {Object} currentUser - Current user
 * @returns {Array} - List of users that can be assigned to
 */
async function getAssignableUsers(currentUser) {
  const { role, id: userId, departmentId, teamId } = currentUser;

  // Admins can assign to anyone
  if (role === 'ADMIN') {
    return await prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true, email: true, role: true }
    });
  }

  // Managers can assign to users in their department/team
  if (role === 'MANAGER') {
    const where = { isActive: true };

    if (departmentId) {
      where.departmentId = departmentId;
    } else if (teamId) {
      where.teamId = teamId;
    } else {
      // Manager with no department/team can only assign to self
      where.id = userId;
    }

    return await prisma.user.findMany({
      where,
      select: { id: true, name: true, email: true, role: true }
    });
  }

  // Agents and viewers can only assign to themselves
  const currentUserData = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true }
  });

  return currentUserData ? [currentUserData] : [];
}

/**
 * Middleware to validate assignment permissions
 */
async function validateAssignment(req, res, next) {
  try {
    const { assignedTo } = req.body;
    const currentUser = req.user;

    // If no assignment is being made, continue
    if (!assignedTo) {
      return next();
    }

    // Check if user can assign to the target
    const canAssign = await canAssignToByName(currentUser, assignedTo);

    if (!canAssign) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `You do not have permission to assign to ${assignedTo}`
      });
    }

    next();
  } catch (error) {
    console.error('Error in validateAssignment middleware:', error);
    res.status(500).json({ error: 'Failed to validate assignment' });
  }
}

module.exports = {
  getVisibilityFilter,
  canAssignTo,
  canAssignToByName,
  getAssignableUsers,
  validateAssignment
};
