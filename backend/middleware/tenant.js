const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Tenant Isolation Middleware
 * Ensures all database queries are automatically filtered by tenant
 */

/**
 * Middleware to extract and validate tenant context from JWT
 * Must be used AFTER authentication middleware
 */
async function tenantContext(req, res, next) {
  try {
    // Ensure user is authenticated
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Extract tenantId from JWT payload
    const { tenantId } = req.user;

    if (!tenantId) {
      return res.status(403).json({ error: 'No tenant context found' });
    }

    // Verify tenant exists and is active
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId }
    });

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    if (tenant.status === 'SUSPENDED') {
      return res.status(403).json({
        error: 'Account suspended',
        message: 'Your organization account has been suspended. Please contact support.'
      });
    }

    if (tenant.status === 'CANCELLED') {
      return res.status(403).json({
        error: 'Account cancelled',
        message: 'Your organization account has been cancelled.'
      });
    }

    // Check if subscription is expired
    if (tenant.subscriptionEnd && new Date() > tenant.subscriptionEnd) {
      return res.status(402).json({
        error: 'Subscription expired',
        message: 'Your subscription has expired. Please renew to continue.'
      });
    }

    // Attach tenant to request object
    req.tenant = tenant;

    next();
  } catch (error) {
    console.error('Tenant context error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get tenant-filtered query conditions
 * Use this helper to add tenant filtering to Prisma queries
 * @param {Object} req - Express request object with tenant context
 * @param {Object} where - Additional where conditions
 * @returns {Object} - Combined where conditions with tenant filter
 */
function getTenantFilter(req, where = {}) {
  if (!req.tenant) {
    throw new Error('Tenant context not found. Ensure tenantContext middleware is applied.');
  }

  return {
    ...where,
    tenantId: req.tenant.id
  };
}

/**
 * Middleware to automatically add tenantId to create/update operations
 * Use this for routes that create new records
 */
function autoInjectTenantId(req, res, next) {
  try {
    if (!req.tenant) {
      return res.status(403).json({ error: 'Tenant context required' });
    }

    // Auto-inject tenantId into request body
    if (req.body && typeof req.body === 'object') {
      req.body.tenantId = req.tenant.id;
    }

    next();
  } catch (error) {
    console.error('Auto inject tenant ID error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Verify that a record belongs to the current tenant
 * @param {string} model - Prisma model name (e.g., 'lead', 'contact')
 * @param {string} recordId - Record ID to check
 * @param {string} tenantId - Current tenant ID
 * @returns {Promise<boolean>} - True if record belongs to tenant
 */
async function verifyTenantOwnership(model, recordId, tenantId) {
  try {
    const record = await prisma[model].findUnique({
      where: { id: recordId },
      select: { tenantId: true }
    });

    if (!record) {
      return false;
    }

    return record.tenantId === tenantId;
  } catch (error) {
    console.error('Verify tenant ownership error:', error);
    return false;
  }
}

/**
 * Middleware to verify record ownership before allowing access
 * Use this for routes that access/modify specific records
 * @param {string} model - Prisma model name
 * @param {string} paramName - Request parameter name containing record ID (default: 'id')
 */
function ensureTenantOwnership(model, paramName = 'id') {
  return async (req, res, next) => {
    try {
      const recordId = req.params[paramName];

      if (!recordId) {
        return res.status(400).json({ error: `${paramName} parameter required` });
      }

      const isOwner = await verifyTenantOwnership(model, recordId, req.tenant.id);

      if (!isOwner) {
        return res.status(404).json({ error: 'Record not found' });
      }

      next();
    } catch (error) {
      console.error('Ensure tenant ownership error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
}

/**
 * Create a Prisma client extension for automatic tenant filtering
 * This can be used to automatically inject tenantId into all queries
 * @param {string} tenantId - Tenant ID to filter by
 * @returns {PrismaClient} - Extended Prisma client with tenant filtering
 */
function createTenantPrismaClient(tenantId) {
  return prisma.$extends({
    query: {
      $allModels: {
        async findMany({ args, query }) {
          args.where = { ...args.where, tenantId };
          return query(args);
        },
        async findFirst({ args, query }) {
          args.where = { ...args.where, tenantId };
          return query(args);
        },
        async findUnique({ args, query, model }) {
          // For models with tenantId, add it to the query
          const modelHasTenantId = model !== 'Tenant' && model !== 'Session' && model !== 'ActivityLog';
          if (modelHasTenantId) {
            args.where = { ...args.where, tenantId };
          }
          return query(args);
        },
        async create({ args, query }) {
          args.data = { ...args.data, tenantId };
          return query(args);
        },
        async createMany({ args, query }) {
          if (Array.isArray(args.data)) {
            args.data = args.data.map(item => ({ ...item, tenantId }));
          } else {
            args.data = { ...args.data, tenantId };
          }
          return query(args);
        },
        async update({ args, query }) {
          args.where = { ...args.where, tenantId };
          return query(args);
        },
        async updateMany({ args, query }) {
          args.where = { ...args.where, tenantId };
          return query(args);
        },
        async delete({ args, query }) {
          args.where = { ...args.where, tenantId };
          return query(args);
        },
        async deleteMany({ args, query }) {
          args.where = { ...args.where, tenantId };
          return query(args);
        },
        async count({ args, query }) {
          args.where = { ...args.where, tenantId };
          return query(args);
        }
      }
    }
  });
}

module.exports = {
  tenantContext,
  getTenantFilter,
  autoInjectTenantId,
  verifyTenantOwnership,
  ensureTenantOwnership,
  createTenantPrismaClient
};
