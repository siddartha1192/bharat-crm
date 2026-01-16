const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { tenantAdminAuth } = require('../middleware/tenantAdmin');
const path = require('path');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const prisma = new PrismaClient();

// Apply tenant admin authentication to all routes
router.use(tenantAdminAuth);

/**
 * Serve Tenant Admin Dashboard HTML
 * GET /tenant-admin
 */
router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/tenantAdmin.html'));
});

/**
 * Get all tenants with stats
 * GET /tenant-admin/api/tenants
 */
router.get('/api/tenants', async (req, res) => {
  try {
    const tenants = await prisma.tenant.findMany({
      include: {
        _count: {
          select: {
            users: true,
          }
        },
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      tenants: tenants.map(tenant => ({
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        domain: tenant.domain,
        plan: tenant.plan,
        status: tenant.status,
        maxUsers: tenant.maxUsers,
        subscriptionStart: tenant.subscriptionStart,
        subscriptionEnd: tenant.subscriptionEnd,
        settings: tenant.settings,
        createdAt: tenant.createdAt,
        updatedAt: tenant.updatedAt,
        stats: {
          userCount: tenant._count.users,
        },
        users: tenant.users
      }))
    });
  } catch (error) {
    console.error('Error fetching tenants:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tenants'
    });
  }
});

/**
 * Get single tenant details
 * GET /tenant-admin/api/tenants/:id
 */
router.get('/api/tenants/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const tenant = await prisma.tenant.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
            createdAt: true,
            company: true,
            department: {
              select: { id: true, name: true }
            },
            team: {
              select: { id: true, name: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        },
        _count: {
          select: {
            users: true,
          }
        }
      }
    });

    if (!tenant) {
      return res.status(404).json({
        success: false,
        error: 'Tenant not found'
      });
    }

    res.json({
      success: true,
      tenant: {
        ...tenant,
        stats: tenant._count
      }
    });
  } catch (error) {
    console.error('Error fetching tenant:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tenant details'
    });
  }
});

/**
 * Update tenant
 * PUT /tenant-admin/api/tenants/:id
 */
router.put('/api/tenants/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, domain, plan, status, maxUsers, settings, subscriptionStart, subscriptionEnd } = req.body;

    // Determine maxUsers based on plan if plan is being updated and maxUsers not explicitly set
    let finalMaxUsers = maxUsers;
    if (plan && maxUsers === undefined) {
      const planLimits = {
        'FREE': 5,
        'STANDARD': 25,
        'PROFESSIONAL': 100,
        'ENTERPRISE': 500
      };
      finalMaxUsers = planLimits[plan] || 5;
    }

    const tenant = await prisma.tenant.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(domain !== undefined && { domain }),
        ...(plan && { plan }),
        ...(status && { status }),
        ...(finalMaxUsers !== undefined && { maxUsers: finalMaxUsers }),
        ...(settings && { settings }),
        ...(subscriptionStart && { subscriptionStart: new Date(subscriptionStart) }),
        ...(subscriptionEnd && { subscriptionEnd: new Date(subscriptionEnd) }),
      }
    });

    res.json({
      success: true,
      tenant
    });
  } catch (error) {
    console.error('Error updating tenant:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update tenant'
    });
  }
});

/**
 * Update user role and status
 * PUT /tenant-admin/api/users/:userId
 */
router.put('/api/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { role, isActive } = req.body;

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(role && { role }),
        ...(isActive !== undefined && { isActive }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        tenantId: true,
        tenant: {
          select: {
            name: true
          }
        }
      }
    });

    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user'
    });
  }
});

/**
 * Get system statistics
 * GET /tenant-admin/api/stats
 */
router.get('/api/stats', async (req, res) => {
  try {
    const [
      totalTenants,
      activeTenants,
      totalUsers,
      activeUsers,
      totalContacts,
      totalLeads,
      totalDeals,
    ] = await Promise.all([
      prisma.tenant.count(),
      prisma.tenant.count({ where: { status: 'ACTIVE' } }),
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.contact.count(),
      prisma.lead.count(),
      prisma.deal.count(),
    ]);

    res.json({
      success: true,
      stats: {
        tenants: {
          total: totalTenants,
          active: activeTenants,
          inactive: totalTenants - activeTenants
        },
        users: {
          total: totalUsers,
          active: activeUsers,
          inactive: totalUsers - activeUsers
        },
        data: {
          contacts: totalContacts,
          leads: totalLeads,
          deals: totalDeals
        }
      }
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics'
    });
  }
});

/**
 * Delete user (soft delete - set inactive)
 * DELETE /tenant-admin/api/users/:userId
 */
router.delete('/api/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await prisma.user.update({
      where: { id: userId },
      data: { isActive: false }
    });

    res.json({
      success: true,
      message: 'User deactivated successfully',
      user
    });
  } catch (error) {
    console.error('Error deactivating user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to deactivate user'
    });
  }
});

/**
 * Create new tenant with admin user
 * POST /tenant-admin/api/tenants
 * Body: { name, domain, plan, maxUsers, contactEmail, adminName, adminEmail, adminPassword }
 */
router.post('/api/tenants', async (req, res) => {
  try {
    const {
      name,
      domain,
      plan,
      maxUsers,
      contactEmail,
      adminName,
      adminEmail,
      adminPassword
    } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Tenant name is required'
      });
    }

    if (!contactEmail) {
      return res.status(400).json({
        success: false,
        error: 'Contact email is required'
      });
    }

    if (!adminName || !adminEmail || !adminPassword) {
      return res.status(400).json({
        success: false,
        error: 'Admin user details (name, email, password) are required to create a tenant'
      });
    }

    // Check if user with admin email already exists
    const existingUser = await prisma.user.findFirst({
      where: { email: adminEmail }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: `A user with email ${adminEmail} already exists in another organization`
      });
    }

    // Generate slug from name with random suffix for uniqueness
    const randomSuffix = crypto.randomBytes(3).toString('hex');
    const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${randomSuffix}`;

    // Create tenant and admin user in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create tenant
      const tenant = await tx.tenant.create({
        data: {
          name,
          slug,
          domain: domain || null,
          plan: plan || 'FREE',
          status: 'ACTIVE',
          maxUsers: maxUsers || 10,
          contactEmail,
          subscriptionStart: new Date(),
          subscriptionEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days trial
          settings: {
            branding: {
              primaryColor: '#3b82f6',
              logoUrl: null
            },
            features: {
              whatsapp: true,
              email: true,
              ai: true,
              calendar: true
            }
          }
        }
      });

      // Hash admin password
      const hashedPassword = await bcrypt.hash(adminPassword, 10);

      // Create admin user
      const adminUser = await tx.user.create({
        data: {
          email: adminEmail,
          password: hashedPassword,
          name: adminName,
          company: tenant.name,
          role: 'ADMIN',
          tenantId: tenant.id,
          isActive: true
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true
        }
      });

      return { tenant, adminUser };
    });

    res.json({
      success: true,
      tenant: result.tenant,
      adminUser: result.adminUser,
      message: `Tenant "${name}" created successfully with admin user "${adminEmail}"`
    });
  } catch (error) {
    console.error('Error creating tenant:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create tenant',
      message: error.message
    });
  }
});

/**
 * Get all newsletter subscribers
 * GET /tenant-admin/api/subscribers
 */
router.get('/api/subscribers', async (req, res) => {
  try {
    const subscribers = await prisma.newsletterSubscription.findMany({
      orderBy: { subscribedAt: 'desc' }
    });

    res.json({
      success: true,
      subscribers: subscribers.map(sub => ({
        id: sub.id,
        email: sub.email,
        name: sub.name,
        isActive: sub.isActive,
        subscribedAt: sub.subscribedAt,
        unsubscribedAt: sub.unsubscribedAt,
        source: sub.source
      }))
    });
  } catch (error) {
    console.error('Error fetching subscribers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch subscribers'
    });
  }
});

/**
 * Get all users across all tenants
 * GET /tenant-admin/api/users
 */
router.get('/api/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        tenant: {
          select: {
            name: true,
            plan: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      users: users.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
        tenantName: user.tenant.name,
        tenantPlan: user.tenant.plan
      }))
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch users'
    });
  }
});

module.exports = router;
