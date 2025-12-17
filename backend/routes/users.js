const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const emailService = require('../services/email');

const prisma = new PrismaClient();

// Middleware to check if user has specific permission
const hasPermission = (requiredRole) => {
  return async (req, res, next) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { role: true, isActive: true }
      });

      if (!user || !user.isActive) {
        return res.status(403).json({ error: 'User not found or inactive' });
      }

      // Role hierarchy: ADMIN > MANAGER > AGENT > VIEWER
      const roleHierarchy = {
        'VIEWER': 1,
        'AGENT': 2,
        'MANAGER': 3,
        'ADMIN': 4
      };

      if (roleHierarchy[user.role] < roleHierarchy[requiredRole]) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({ error: 'Permission check failed' });
    }
  };
};

// GET /api/users - Get all users (requires at least MANAGER role)
router.get('/', authenticate, hasPermission('MANAGER'), async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// GET /api/users/:id - Get user by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    // Users can view their own profile, or need MANAGER role to view others
    if (id !== req.user.id) {
      const currentUser = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { role: true }
      });

      const roleHierarchy = {
        'VIEWER': 1,
        'AGENT': 2,
        'MANAGER': 3,
        'ADMIN': 4
      };

      if (roleHierarchy[currentUser.role] < roleHierarchy['MANAGER']) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// POST /api/users - Create new user (ADMIN only)
router.post('/', authenticate, hasPermission('ADMIN'), async (req, res) => {
  try {
    const { name, email, role } = req.body;
    const adminId = req.user.id;

    // Validate required fields
    if (!name || !email || !role) {
      return res.status(400).json({ error: 'Name, email, and role are required' });
    }

    // Validate role
    const validRoles = ['ADMIN', 'MANAGER', 'AGENT', 'VIEWER'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be one of: ADMIN, MANAGER, AGENT, VIEWER' });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Create user without password (they'll set it via forgot password)
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        role,
        isActive: true,
        password: null, // No password initially
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });

    // Send welcome email with instructions
    try {
      await sendWelcomeEmail(email, name, role, adminId);
      console.log(`✅ Welcome email sent to ${email}`);
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
      // Don't fail the user creation if email fails
    }

    res.status(201).json({
      message: 'User created successfully. Welcome email sent with instructions.',
      user: newUser
    });
  } catch (error) {
    console.error('Error creating user:', error);

    // Handle unique constraint violation for email
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Email already in use' });
    }

    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Helper function to send welcome email
async function sendWelcomeEmail(email, name, role, adminId) {
  const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:8080'}/login`;
  const forgotPasswordUrl = `${process.env.FRONTEND_URL || 'http://localhost:8080'}/forgot-password`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .info-box { background: #e0f2fe; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to Bharat CRM!</h1>
          </div>
          <div class="content">
            <p>Hi ${name},</p>
            <p>Your account has been created on Bharat CRM with the role of <strong>${role}</strong>.</p>

            <div class="info-box">
              <strong>📧 Your Login Email:</strong> ${email}
            </div>

            <h3>Getting Started:</h3>
            <ol>
              <li>Click the button below to set your password</li>
              <li>Check your email for the password reset link</li>
              <li>Set your password and login</li>
            </ol>

            <center>
              <a href="${forgotPasswordUrl}" class="button">Set Your Password</a>
            </center>

            <p><strong>Or follow these steps:</strong></p>
            <ol>
              <li>Go to: <a href="${loginUrl}">${loginUrl}</a></li>
              <li>Click "Forgot Password?"</li>
              <li>Enter your email: ${email}</li>
              <li>Follow the instructions in the email</li>
            </ol>

            <p><strong>Your Role: ${role}</strong></p>
            <ul>
              ${getRoleDescriptionHTML(role)}
            </ul>

            <p>If you have any questions, please contact your administrator.</p>

            <div class="footer">
              <p>Bharat CRM - Built for Indian Businesses</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
    Welcome to Bharat CRM!

    Hi ${name},

    Your account has been created on Bharat CRM with the role of ${role}.

    Your Login Email: ${email}

    Getting Started:
    1. Go to: ${forgotPasswordUrl}
    2. Or go to ${loginUrl} and click "Forgot Password?"
    3. Enter your email: ${email}
    4. Follow the instructions in the email to set your password

    Your Role: ${role}
    ${getRoleDescriptionText(role)}

    If you have any questions, please contact your administrator.

    Bharat CRM - Built for Indian Businesses
  `;

  return await emailService.sendEmail({
    to: email,
    subject: 'Welcome to Bharat CRM - Set Your Password',
    text,
    html,
    userId: adminId,
    entityType: 'UserOnboarding',
  });
}

function getRoleDescriptionHTML(role) {
  const descriptions = {
    'ADMIN': '<li>Full system access</li><li>Manage users and settings</li><li>Access all data</li>',
    'MANAGER': '<li>Manage team members</li><li>View team performance</li><li>Access all CRM features</li>',
    'AGENT': '<li>Manage leads and contacts</li><li>Create deals and tasks</li><li>Access assigned data</li>',
    'VIEWER': '<li>View-only access</li><li>See reports and dashboards</li><li>No edit permissions</li>'
  };
  return descriptions[role] || '';
}

function getRoleDescriptionText(role) {
  const descriptions = {
    'ADMIN': '- Full system access\n- Manage users and settings\n- Access all data',
    'MANAGER': '- Manage team members\n- View team performance\n- Access all CRM features',
    'AGENT': '- Manage leads and contacts\n- Create deals and tasks\n- Access assigned data',
    'VIEWER': '- View-only access\n- See reports and dashboards\n- No edit permissions'
  };
  return descriptions[role] || '';
}

// PUT /api/users/:id/role - Update user role (ADMIN only)
router.put('/:id/role', authenticate, hasPermission('ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    // Validate role
    const validRoles = ['ADMIN', 'MANAGER', 'AGENT', 'VIEWER'];
    if (!role || !validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be one of: ADMIN, MANAGER, AGENT, VIEWER' });
    }

    // Prevent users from changing their own role
    if (id === req.user.id) {
      return res.status(403).json({ error: 'You cannot change your own role' });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update role
    const updatedUser = await prisma.user.update({
      where: { id },
      data: { role },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json({
      message: 'User role updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

// PUT /api/users/:id/status - Update user active status (ADMIN only)
router.put('/:id/status', authenticate, hasPermission('ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    // Validate isActive
    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ error: 'isActive must be a boolean' });
    }

    // Prevent users from deactivating their own account
    if (id === req.user.id) {
      return res.status(403).json({ error: 'You cannot deactivate your own account' });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update status
    const updatedUser = await prisma.user.update({
      where: { id },
      data: { isActive },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json({
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      user: updatedUser
    });
  } catch (error) {
    console.error('Error updating user status:', error);
    res.status(500).json({ error: 'Failed to update user status' });
  }
});

// PUT /api/users/:id - Update user profile
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email } = req.body;

    // Users can only update their own profile unless they're ADMIN
    if (id !== req.user.id) {
      const currentUser = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { role: true }
      });

      if (currentUser.role !== 'ADMIN') {
        return res.status(403).json({ error: 'You can only update your own profile' });
      }
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json({
      message: 'User updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Error updating user:', error);

    // Handle unique constraint violation for email
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Email already in use' });
    }

    res.status(500).json({ error: 'Failed to update user' });
  }
});

// DELETE /api/users/:id - Delete user (ADMIN only)
router.delete('/:id', authenticate, hasPermission('ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent users from deleting their own account
    if (id === req.user.id) {
      return res.status(403).json({ error: 'You cannot delete your own account' });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Delete user (this will cascade delete all related records)
    await prisma.user.delete({
      where: { id }
    });

    res.json({
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// GET /api/users/assignable - Get list of users that current user can assign to
router.get('/assignable', authenticate, async (req, res) => {
  try {
    const { getAssignableUsers } = require('../middleware/assignment');

    const assignableUsers = await getAssignableUsers(req.user);

    res.json(assignableUsers);
  } catch (error) {
    console.error('Error fetching assignable users:', error);
    res.status(500).json({ error: 'Failed to fetch assignable users' });
  }
});

module.exports = router;
