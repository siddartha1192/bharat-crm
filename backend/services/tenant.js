const crypto = require('crypto');

const prisma = require('../lib/prisma');

/**
 * Tenant Provisioning Service
 * Handles creation, management, and isolation of multi-tenant organizations
 */

/**
 * Generate a URL-safe slug from tenant name
 * @param {string} name - Tenant name
 * @returns {string} - URL-safe slug
 */
function generateSlug(name) {
  const baseSlug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  // Add random suffix to ensure uniqueness
  const randomSuffix = crypto.randomBytes(3).toString('hex');
  return `${baseSlug}-${randomSuffix}`;
}

/**
 * Create a new tenant with initial setup
 * @param {Object} tenantData - Tenant creation data
 * @param {string} tenantData.name - Company/Organization name
 * @param {string} tenantData.contactEmail - Primary contact email
 * @param {string} [tenantData.contactPhone] - Contact phone number
 * @param {string} [tenantData.domain] - Custom domain
 * @param {string} [tenantData.plan='FREE'] - Subscription plan
 * @returns {Promise<Object>} - Created tenant
 */
async function createTenant(tenantData) {
  try {
    // Check if tenant with same name already exists
    const existingTenant = await prisma.tenant.findFirst({
      where: {
        name: {
          equals: tenantData.name,
          mode: 'insensitive' // Case-insensitive comparison
        }
      }
    });

    if (existingTenant) {
      throw new Error('A tenant with this name already exists. Please choose a different name.');
    }

    const slug = generateSlug(tenantData.name);

    // Create tenant
    const tenant = await prisma.tenant.create({
      data: {
        name: tenantData.name,
        slug,
        domain: tenantData.domain || null,
        contactEmail: tenantData.contactEmail,
        contactPhone: tenantData.contactPhone || null,
        plan: tenantData.plan || 'FREE',
        status: 'TRIAL',
        maxUsers: tenantData.plan === 'FREE' ? 5 : tenantData.plan === 'STANDARD' ? 25 : tenantData.plan === 'PROFESSIONAL' ? 100 : 500,
        subscriptionStart: new Date(),
        subscriptionEnd: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000), // 25 days trial
        settings: tenantData.settings || {
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

    console.log(`✓ Tenant created: ${tenant.name} (${tenant.id})`);
    return tenant;
  } catch (error) {
    console.error('Error creating tenant:', error);
    throw new Error(`Failed to create tenant: ${error.message}`);
  }
}

/**
 * Get tenant by ID
 * @param {string} tenantId - Tenant ID
 * @returns {Promise<Object|null>} - Tenant object or null
 */
async function getTenantById(tenantId) {
  return await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: {
      users: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true
        }
      }
    }
  });
}

/**
 * Get tenant by slug
 * @param {string} slug - Tenant slug
 * @returns {Promise<Object|null>} - Tenant object or null
 */
async function getTenantBySlug(slug) {
  return await prisma.tenant.findUnique({
    where: { slug }
  });
}

/**
 * Get tenant by domain
 * @param {string} domain - Custom domain
 * @returns {Promise<Object|null>} - Tenant object or null
 */
async function getTenantByDomain(domain) {
  return await prisma.tenant.findUnique({
    where: { domain }
  });
}

/**
 * Update tenant settings
 * @param {string} tenantId - Tenant ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} - Updated tenant
 */
async function updateTenant(tenantId, updates) {
  return await prisma.tenant.update({
    where: { id: tenantId },
    data: updates
  });
}

/**
 * Suspend a tenant (prevent access but keep data)
 * @param {string} tenantId - Tenant ID
 * @param {string} reason - Reason for suspension
 * @returns {Promise<Object>} - Updated tenant
 */
async function suspendTenant(tenantId, reason) {
  return await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      status: 'SUSPENDED',
      settings: {
        ...((await getTenantById(tenantId)).settings || {}),
        suspensionReason: reason,
        suspendedAt: new Date().toISOString()
      }
    }
  });
}

/**
 * Activate a suspended tenant
 * @param {string} tenantId - Tenant ID
 * @returns {Promise<Object>} - Updated tenant
 */
async function activateTenant(tenantId) {
  const tenant = await getTenantById(tenantId);
  const settings = { ...(tenant.settings || {}) };
  delete settings.suspensionReason;
  delete settings.suspendedAt;

  return await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      status: 'ACTIVE',
      settings
    }
  });
}

/**
 * Check if tenant can add more users
 * @param {string} tenantId - Tenant ID
 * @returns {Promise<boolean>} - True if can add users
 */
async function canAddUser(tenantId) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: {
      _count: {
        select: { users: true }
      }
    }
  });

  return tenant._count.users < tenant.maxUsers;
}

/**
 * Get tenant statistics
 * @param {string} tenantId - Tenant ID
 * @returns {Promise<Object>} - Tenant statistics
 */
async function getTenantStats(tenantId, userId = null) {
  // If userId is provided, filter by user; otherwise show tenant-wide stats
  const whereClause = userId
    ? { tenantId, userId }
    : { tenantId };

  const [
    userCount,
    leadCount,
    contactCount,
    dealCount,
    activeUsers
  ] = await Promise.all([
    prisma.user.count({ where: { tenantId } }),
    prisma.lead.count({ where: whereClause }),
    prisma.contact.count({ where: whereClause }),
    prisma.deal.count({ where: whereClause }),
    prisma.user.count({ where: { tenantId, isActive: true } })
  ]);

  return {
    users: {
      total: userCount,
      active: activeUsers
    },
    data: {
      leads: leadCount,
      contacts: contactCount,
      deals: dealCount
    }
  };
}

/**
 * Create tenant invitation
 * @param {string} tenantId - Tenant ID
 * @param {string} email - Invitee email
 * @param {string} role - User role
 * @param {string} invitedBy - User ID of inviter
 * @returns {Promise<Object>} - Created invitation
 */
async function createInvitation(tenantId, email, role, invitedBy) {
  // Check if user limit reached
  if (!(await canAddUser(tenantId))) {
    throw new Error('User limit reached for this tenant');
  }

  // Check if user already exists
  const existingUser = await prisma.user.findFirst({
    where: { email, tenantId }
  });

  if (existingUser) {
    throw new Error('User already exists in this tenant');
  }

  // Check for existing active invitation
  const existingInvitation = await prisma.tenantInvitation.findFirst({
    where: {
      tenantId,
      email,
      isActive: true
    }
  });

  if (existingInvitation) {
    throw new Error('Active invitation already exists for this email');
  }

  // Generate secure token
  const token = crypto.randomBytes(32).toString('hex');

  // Create invitation (expires in 7 days)
  return await prisma.tenantInvitation.create({
    data: {
      tenantId,
      email,
      role,
      token,
      invitedBy,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    }
  });
}

/**
 * Get invitation by token
 * @param {string} token - Invitation token
 * @returns {Promise<Object|null>} - Invitation object or null
 */
async function getInvitationByToken(token) {
  return await prisma.tenantInvitation.findUnique({
    where: { token },
    include: { tenant: true }
  });
}

/**
 * Accept tenant invitation
 * @param {string} token - Invitation token
 * @returns {Promise<Object>} - Updated invitation
 */
async function acceptInvitation(token) {
  const invitation = await getInvitationByToken(token);

  if (!invitation) {
    throw new Error('Invitation not found');
  }

  if (!invitation.isActive) {
    throw new Error('Invitation is no longer active');
  }

  if (invitation.acceptedAt) {
    throw new Error('Invitation already accepted');
  }

  if (new Date() > invitation.expiresAt) {
    throw new Error('Invitation has expired');
  }

  return await prisma.tenantInvitation.update({
    where: { id: invitation.id },
    data: {
      acceptedAt: new Date(),
      isActive: false
    }
  });
}

/**
 * Revoke invitation
 * @param {string} invitationId - Invitation ID
 * @returns {Promise<Object>} - Updated invitation
 */
async function revokeInvitation(invitationId) {
  return await prisma.tenantInvitation.update({
    where: { id: invitationId },
    data: { isActive: false }
  });
}

/**
 * List all invitations for a tenant
 * @param {string} tenantId - Tenant ID
 * @returns {Promise<Array>} - List of invitations
 */
async function listInvitations(tenantId) {
  return await prisma.tenantInvitation.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' }
  });
}

module.exports = {
  createTenant,
  getTenantById,
  getTenantBySlug,
  getTenantByDomain,
  updateTenant,
  suspendTenant,
  activateTenant,
  canAddUser,
  getTenantStats,
  createInvitation,
  getInvitationByToken,
  acceptInvitation,
  revokeInvitation,
  listInvitations
};
