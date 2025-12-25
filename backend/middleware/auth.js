const authService = require('../services/auth');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Authentication middleware - verifies JWT token
 */
async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = authService.verifyToken(token);

    // Check if session is still active
    const session = await prisma.session.findFirst({
      where: {
        token,
        isActive: true,
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            isActive: true,
            company: true,
            departmentId: true,
            teamId: true,
            tenantId: true,
          },
        },
      },
    });

    if (!session) {
      return res.status(401).json({ error: 'Session expired or invalid' });
    }

    if (!session.user.isActive) {
      return res.status(403).json({ error: 'Account is deactivated' });
    }

    // Attach user to request
    req.user = session.user;
    req.session = session;

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Role-based access control middleware
 * @param {string[]} allowedRoles - Array of allowed roles
 */
function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        required: allowedRoles,
        current: req.user.role,
      });
    }

    next();
  };
}

/**
 * Check if user owns the resource or has admin/manager role
 */
function authorizeOwnerOrAdmin(userIdField = 'userId') {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Admins and Managers can access any resource
    if (['ADMIN', 'MANAGER'].includes(req.user.role)) {
      return next();
    }

    // Check if user owns the resource
    const resourceUserId = req.body[userIdField] || req.params[userIdField] || req.query[userIdField];

    if (resourceUserId && resourceUserId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    next();
  };
}

/**
 * Check if user is in the same team (for team-based access)
 */
function authorizeSameTeam() {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Admins and Managers can access any team data
    if (['ADMIN', 'MANAGER'].includes(req.user.role)) {
      return next();
    }

    // Check if target user is in the same team
    const targetUserId = req.params.userId || req.query.userId;

    if (targetUserId) {
      const targetUser = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: { teamId: true },
      });

      if (targetUser && targetUser.teamId !== req.user.teamId) {
        return res.status(403).json({ error: 'Access denied - different team' });
      }
    }

    next();
  };
}

/**
 * Optional authentication - attaches user if token is provided but doesn't fail if not
 */
async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);
    const decoded = authService.verifyToken(token);

    const session = await prisma.session.findFirst({
      where: {
        token,
        isActive: true,
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            isActive: true,
            company: true,
          },
        },
      },
    });

    if (session && session.user.isActive) {
      req.user = session.user;
      req.session = session;
    }

    next();
  } catch (error) {
    // Ignore errors in optional auth
    next();
  }
}

module.exports = {
  authenticate,
  authorize,
  authorizeOwnerOrAdmin,
  authorizeSameTeam,
  optionalAuth,
};
