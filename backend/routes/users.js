const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware to verify JWT token
const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({ error: 'Invalid token' });
  }
};

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
        updatedAt: true,
        lastLogin: true
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
        updatedAt: true,
        lastLogin: true
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

module.exports = router;
