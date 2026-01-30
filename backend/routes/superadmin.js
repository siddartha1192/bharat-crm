const express = require('express');
const router = express.Router();
const tenantService = require('../services/tenant');
const authService = require('../services/auth');
const { authenticate } = require('../middleware/auth');

const prisma = require('../lib/prisma');

/**
 * Middleware to check if user is super admin
 * Super admin is defined as ADMIN role in a designated super admin tenant
 * OR check environment variable for super admin email
 */
const requireSuperAdmin = async (req, res, next) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Check if user email matches super admin email from env
    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
    if (superAdminEmail && user.email === superAdminEmail) {
      req.isSuperAdmin = true;
      return next();
    }

    // Or check if user has ADMIN role and belongs to super admin tenant
    // You can mark a tenant as super admin tenant in database
    const userRecord = await prisma.user.findUnique({
      where: { id: user.id },
      include: { tenant: true }
    });

    if (userRecord.role === 'ADMIN' && userRecord.tenant.slug === process.env.SUPER_ADMIN_TENANT_SLUG) {
      req.isSuperAdmin = true;
      return next();
    }

    return res.status(403).json({
      error: 'Super admin access required',
      code: 'SUPER_ADMIN_REQUIRED'
    });
  } catch (error) {
    console.error('Super admin check error:', error);
    return res.status(500).json({ error: 'Failed to verify admin access' });
  }
};

// Apply authentication to all super admin routes
router.use(authenticate);
router.use(requireSuperAdmin);

/**
 * GET /api/superadmin/tenants
 * List all tenants in the system
 */
router.get('/tenants', async (req, res) => {
  try {
    const { page = 1, limit = 50, search, status } = req.query;

    const where = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { contactEmail: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } }
      ];
    }
    if (status) {
      where.status = status;
    }

    const [tenants, total] = await Promise.all([
      prisma.tenant.findMany({
        where,
        include: {
          _count: {
            select: {
              users: true,
              leads: true,
              deals: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: parseInt(limit)
      }),
      prisma.tenant.count({ where })
    ]);

    res.json({
      tenants,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching tenants:', error);
    res.status(500).json({ error: 'Failed to fetch tenants' });
  }
});

/**
 * GET /api/superadmin/tenants/:id
 * Get specific tenant details
 */
router.get('/tenants/:id', async (req, res) => {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: req.params.id },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
            createdAt: true
          }
        },
        _count: {
          select: {
            leads: true,
            contacts: true,
            deals: true,
            invoices: true
          }
        }
      }
    });

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    res.json(tenant);
  } catch (error) {
    console.error('Error fetching tenant:', error);
    res.status(500).json({ error: 'Failed to fetch tenant' });
  }
});

/**
 * POST /api/superadmin/tenants
 * Create new tenant with admin user
 */
router.post('/tenants', async (req, res) => {
  try {
    const {
      name,
      contactEmail,
      contactPhone,
      domain,
      plan = 'FREE',
      adminName,
      adminEmail,
      adminPassword
    } = req.body;

    // Validate required fields
    if (!name || !contactEmail) {
      return res.status(400).json({ error: 'Tenant name and contact email are required' });
    }

    if (!adminName || !adminEmail || !adminPassword) {
      return res.status(400).json({ error: 'Admin user details (name, email, password) are required' });
    }

    // Create tenant
    const tenant = await tenantService.createTenant({
      name,
      contactEmail,
      contactPhone,
      domain,
      plan
    });

    // Create admin user for the tenant
    const hashedPassword = await authService.hashPassword(adminPassword);
    const adminUser = await prisma.user.create({
      data: {
        email: adminEmail,
        password: hashedPassword,
        name: adminName,
        company: tenant.name,
        role: 'ADMIN',
        tenantId: tenant.id,
        isActive: true
      }
    });

    // Log activity
    await authService.logActivity(
      req.user.id,
      'TENANT_CREATED',
      'Tenant',
      tenant.id,
      `Super admin created tenant: ${tenant.name} with admin user: ${adminEmail}`
    );

    res.status(201).json({
      tenant,
      adminUser: {
        id: adminUser.id,
        email: adminUser.email,
        name: adminUser.name,
        role: adminUser.role
      },
      message: 'Tenant created successfully'
    });
  } catch (error) {
    console.error('Error creating tenant:', error);
    res.status(400).json({ error: error.message || 'Failed to create tenant' });
  }
});

/**
 * PUT /api/superadmin/tenants/:id
 * Update tenant details
 */
router.put('/tenants/:id', async (req, res) => {
  try {
    const { name, contactEmail, contactPhone, domain, plan, status, settings } = req.body;

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (contactEmail !== undefined) updates.contactEmail = contactEmail;
    if (contactPhone !== undefined) updates.contactPhone = contactPhone;
    if (domain !== undefined) updates.domain = domain;
    if (plan !== undefined) updates.plan = plan;
    if (status !== undefined) updates.status = status;
    if (settings !== undefined) updates.settings = settings;

    const tenant = await prisma.tenant.update({
      where: { id: req.params.id },
      data: updates
    });

    // Log activity
    await authService.logActivity(
      req.user.id,
      'TENANT_UPDATED',
      'Tenant',
      tenant.id,
      `Super admin updated tenant: ${tenant.name}`
    );

    res.json({ tenant, message: 'Tenant updated successfully' });
  } catch (error) {
    console.error('Error updating tenant:', error);
    res.status(400).json({ error: error.message || 'Failed to update tenant' });
  }
});

/**
 * POST /api/superadmin/tenants/:id/suspend
 * Suspend a tenant
 */
router.post('/tenants/:id/suspend', async (req, res) => {
  try {
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ error: 'Suspension reason is required' });
    }

    const tenant = await tenantService.suspendTenant(req.params.id, reason);

    // Log activity
    await authService.logActivity(
      req.user.id,
      'TENANT_SUSPENDED',
      'Tenant',
      tenant.id,
      `Super admin suspended tenant: ${tenant.name}. Reason: ${reason}`
    );

    res.json({ tenant, message: 'Tenant suspended successfully' });
  } catch (error) {
    console.error('Error suspending tenant:', error);
    res.status(500).json({ error: 'Failed to suspend tenant' });
  }
});

/**
 * POST /api/superadmin/tenants/:id/activate
 * Activate a suspended tenant
 */
router.post('/tenants/:id/activate', async (req, res) => {
  try {
    const tenant = await tenantService.activateTenant(req.params.id);

    // Log activity
    await authService.logActivity(
      req.user.id,
      'TENANT_ACTIVATED',
      'Tenant',
      tenant.id,
      `Super admin activated tenant: ${tenant.name}`
    );

    res.json({ tenant, message: 'Tenant activated successfully' });
  } catch (error) {
    console.error('Error activating tenant:', error);
    res.status(500).json({ error: 'Failed to activate tenant' });
  }
});

/**
 * GET /api/superadmin/stats
 * Get platform-wide statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const [
      totalTenants,
      activeTenants,
      suspendedTenants,
      totalUsers,
      activeUsers,
      totalLeads,
      totalDeals,
      totalContacts
    ] = await Promise.all([
      prisma.tenant.count(),
      prisma.tenant.count({ where: { status: 'ACTIVE' } }),
      prisma.tenant.count({ where: { status: 'SUSPENDED' } }),
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.lead.count(),
      prisma.deal.count(),
      prisma.contact.count()
    ]);

    res.json({
      tenants: {
        total: totalTenants,
        active: activeTenants,
        suspended: suspendedTenants,
        trial: await prisma.tenant.count({ where: { status: 'TRIAL' } })
      },
      users: {
        total: totalUsers,
        active: activeUsers
      },
      data: {
        leads: totalLeads,
        deals: totalDeals,
        contacts: totalContacts
      }
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

module.exports = router;
