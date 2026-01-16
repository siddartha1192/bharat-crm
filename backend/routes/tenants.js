const express = require('express');
const router = express.Router();
const tenantService = require('../services/tenant');
const { authenticate, authorize } = require('../middleware/auth');
const { tenantContext } = require('../middleware/tenant');

/**
 * Create a new tenant (organization signup)
 * POST /api/tenants
 * DISABLED FOR SECURITY - Only super admins can create tenants via admin portal
 * Public signup is not allowed to prevent tenant sprawl
 */
router.post('/', async (req, res) => {
  return res.status(403).json({
    error: 'Public tenant creation is disabled. Please contact your administrator for access.',
    code: 'TENANT_CREATION_DISABLED'
  });
});

/**
 * Get current tenant information
 * GET /api/tenants/current
 * Requires authentication
 */
router.get('/current', authenticate, tenantContext, async (req, res) => {
  try {
    const tenant = await tenantService.getTenantById(req.tenant.id);

    if (!tenant) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    res.json({ tenant });
  } catch (error) {
    console.error('Get tenant error:', error);
    res.status(500).json({ error: 'Failed to fetch organization' });
  }
});

/**
 * Get tenant by ID
 * GET /api/tenants/:id
 * Requires authentication and ADMIN role
 */
router.get('/:id', authenticate, authorize(['ADMIN']), async (req, res) => {
  try {
    const { id } = req.params;
    const tenant = await tenantService.getTenantById(id);

    if (!tenant) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    res.json({ tenant });
  } catch (error) {
    console.error('Get tenant error:', error);
    res.status(500).json({ error: 'Failed to fetch organization' });
  }
});

/**
 * Update tenant by ID
 * PUT /api/tenants/:id
 * Requires authentication and ADMIN role
 */
router.put('/:id', authenticate, authorize(['ADMIN']), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      contactEmail,
      contactPhone,
      domain,
      settings,
      plan,
      status,
      subscriptionStart,
      subscriptionEnd,
      maxUsers
    } = req.body;

    const updates = {};
    if (name) updates.name = name;
    if (contactEmail) updates.contactEmail = contactEmail;
    if (contactPhone !== undefined) updates.contactPhone = contactPhone;
    if (domain !== undefined) updates.domain = domain;
    if (settings) updates.settings = settings;

    // Subscription management fields (admin can update these)
    if (plan) updates.plan = plan;
    if (status) updates.status = status;
    if (subscriptionStart) updates.subscriptionStart = new Date(subscriptionStart);
    if (subscriptionEnd) updates.subscriptionEnd = new Date(subscriptionEnd);
    if (maxUsers !== undefined) updates.maxUsers = maxUsers;

    const tenant = await tenantService.updateTenant(id, updates);

    res.json({
      tenant,
      message: 'Organization updated successfully'
    });
  } catch (error) {
    console.error('Update tenant error:', error);
    res.status(400).json({ error: error.message || 'Failed to update organization' });
  }
});

/**
 * Update current tenant
 * PUT /api/tenants/current
 * Requires authentication and ADMIN role
 */
router.put('/current', authenticate, tenantContext, authorize(['ADMIN']), async (req, res) => {
  try {
    const {
      name,
      contactEmail,
      contactPhone,
      domain,
      settings,
      plan,
      status,
      subscriptionStart,
      subscriptionEnd,
      maxUsers
    } = req.body;

    const updates = {};
    if (name) updates.name = name;
    if (contactEmail) updates.contactEmail = contactEmail;
    if (contactPhone !== undefined) updates.contactPhone = contactPhone;
    if (domain !== undefined) updates.domain = domain;
    if (settings) updates.settings = settings;

    // Subscription management fields (admin can update these)
    if (plan) updates.plan = plan;
    if (status) updates.status = status;
    if (subscriptionStart) updates.subscriptionStart = new Date(subscriptionStart);
    if (subscriptionEnd) updates.subscriptionEnd = new Date(subscriptionEnd);
    if (maxUsers !== undefined) updates.maxUsers = maxUsers;

    const tenant = await tenantService.updateTenant(req.tenant.id, updates);

    res.json({
      tenant,
      message: 'Organization updated successfully'
    });
  } catch (error) {
    console.error('Update tenant error:', error);
    res.status(400).json({ error: error.message || 'Failed to update organization' });
  }
});

/**
 * Get tenant statistics
 * GET /api/tenants/current/stats
 * Requires authentication
 * ADMIN sees all tenant data, AGENT/MANAGER see only their own data
 */
router.get('/current/stats', authenticate, tenantContext, async (req, res) => {
  try {
    // ADMIN sees tenant-wide stats, others see only their own data
    const userId = req.user.role === 'ADMIN' ? null : req.user.id;
    const stats = await tenantService.getTenantStats(req.tenant.id, userId);
    res.json({ stats });
  } catch (error) {
    console.error('Get tenant stats error:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

/**
 * Create tenant invitation
 * POST /api/tenants/current/invitations
 * Requires authentication and ADMIN role
 */
router.post('/current/invitations', authenticate, tenantContext, authorize(['ADMIN']), async (req, res) => {
  try {
    const { email, role } = req.body;

    if (!email || !role) {
      return res.status(400).json({ error: 'Email and role are required' });
    }

    // Validate role
    const validRoles = ['ADMIN', 'MANAGER', 'AGENT', 'VIEWER'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const invitation = await tenantService.createInvitation(
      req.tenant.id,
      email,
      role,
      req.user.id
    );

    // TODO: Send invitation email with token
    const invitationUrl = `${process.env.FRONTEND_URL || 'http://localhost:8080'}/invite/${invitation.token}`;

    res.status(201).json({
      invitation: {
        ...invitation,
        invitationUrl
      },
      message: 'Invitation created successfully'
    });
  } catch (error) {
    console.error('Create invitation error:', error);
    res.status(400).json({ error: error.message || 'Failed to create invitation' });
  }
});

/**
 * List all invitations for current tenant
 * GET /api/tenants/current/invitations
 * Requires authentication and ADMIN role
 */
router.get('/current/invitations', authenticate, tenantContext, authorize(['ADMIN']), async (req, res) => {
  try {
    const invitations = await tenantService.listInvitations(req.tenant.id);
    res.json({ invitations });
  } catch (error) {
    console.error('List invitations error:', error);
    res.status(500).json({ error: 'Failed to fetch invitations' });
  }
});

/**
 * Revoke an invitation
 * DELETE /api/tenants/current/invitations/:invitationId
 * Requires authentication and ADMIN role
 */
router.delete('/current/invitations/:invitationId', authenticate, tenantContext, authorize(['ADMIN']), async (req, res) => {
  try {
    const { invitationId } = req.params;

    const invitation = await tenantService.revokeInvitation(invitationId);

    res.json({
      invitation,
      message: 'Invitation revoked successfully'
    });
  } catch (error) {
    console.error('Revoke invitation error:', error);
    res.status(400).json({ error: error.message || 'Failed to revoke invitation' });
  }
});

/**
 * Get invitation details by token (public endpoint for accepting invitations)
 * GET /api/tenants/invitations/:token
 * Public endpoint
 */
router.get('/invitations/:token', async (req, res) => {
  try {
    const { token } = req.params;

    const invitation = await tenantService.getInvitationByToken(token);

    if (!invitation) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    if (!invitation.isActive) {
      return res.status(400).json({ error: 'Invitation is no longer active' });
    }

    if (invitation.acceptedAt) {
      return res.status(400).json({ error: 'Invitation has already been accepted' });
    }

    if (new Date() > invitation.expiresAt) {
      return res.status(400).json({ error: 'Invitation has expired' });
    }

    // Return safe invitation details
    res.json({
      invitation: {
        email: invitation.email,
        role: invitation.role,
        tenant: {
          id: invitation.tenant.id,
          name: invitation.tenant.name
        },
        expiresAt: invitation.expiresAt
      }
    });
  } catch (error) {
    console.error('Get invitation error:', error);
    res.status(500).json({ error: 'Failed to fetch invitation' });
  }
});

/**
 * Accept invitation and create user account
 * POST /api/tenants/invitations/:token/accept
 * Public endpoint
 */
router.post('/invitations/:token/accept', async (req, res) => {
  try {
    const { token } = req.params;
    const { name, password } = req.body;

    if (!name || !password) {
      return res.status(400).json({ error: 'Name and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Get and validate invitation
    const invitation = await tenantService.getInvitationByToken(token);

    if (!invitation) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    if (!invitation.isActive || invitation.acceptedAt) {
      return res.status(400).json({ error: 'Invitation is no longer valid' });
    }

    if (new Date() > invitation.expiresAt) {
      return res.status(400).json({ error: 'Invitation has expired' });
    }

    // Accept invitation
    await tenantService.acceptInvitation(token);

    // Create user account (this will be handled in the auth service)
    // Return success - frontend will redirect to complete registration
    res.json({
      message: 'Invitation accepted',
      tenant: {
        id: invitation.tenant.id,
        name: invitation.tenant.name
      },
      role: invitation.role,
      email: invitation.email
    });
  } catch (error) {
    console.error('Accept invitation error:', error);
    res.status(400).json({ error: error.message || 'Failed to accept invitation' });
  }
});

module.exports = router;
