const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { tenantAdminAuth } = require('../middleware/tenantAdmin');
const path = require('path');

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
            contacts: true,
            leads: true,
            deals: true,
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
        settings: tenant.settings,
        createdAt: tenant.createdAt,
        updatedAt: tenant.updatedAt,
        stats: {
          userCount: tenant._count.users,
          contactCount: tenant._count.contacts,
          leadCount: tenant._count.leads,
          dealCount: tenant._count.deals,
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
            lastLogin: true,
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
            contacts: true,
            leads: true,
            deals: true,
            tasks: true,
            invoices: true,
            campaigns: true,
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
    const { name, domain, plan, status, maxUsers, settings } = req.body;

    const tenant = await prisma.tenant.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(domain && { domain }),
        ...(plan && { plan }),
        ...(status && { status }),
        ...(maxUsers !== undefined && { maxUsers }),
        ...(settings && { settings }),
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
      prisma.tenant.count({ where: { status: 'active' } }),
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
 * Create new tenant
 * POST /tenant-admin/api/tenants
 */
router.post('/api/tenants', async (req, res) => {
  try {
    const { name, domain, plan, maxUsers } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Tenant name is required'
      });
    }

    // Generate slug from name
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    const tenant = await prisma.tenant.create({
      data: {
        name,
        slug,
        domain: domain || null,
        plan: plan || 'free',
        status: 'active',
        maxUsers: maxUsers || 10,
        settings: {}
      }
    });

    res.json({
      success: true,
      tenant
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

module.exports = router;
