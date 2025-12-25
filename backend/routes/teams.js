const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { tenantContext, getTenantFilter, autoInjectTenantId } = require('../middleware/tenant');
const { PrismaClient } = require('@prisma/client');
const authService = require('../services/auth');

const prisma = new PrismaClient();

// Apply authentication and tenant context to all routes
router.use(authenticate);
router.use(tenantContext);

/**
 * Get all departments
 * GET /api/teams/departments
 */
router.get('/departments', async (req, res) => {
  try {
    const { includeInactive = 'false' } = req.query;

    const where = {};
    if (includeInactive === 'false') {
      where.isActive = true;
    }

    const departments = await prisma.department.findMany({
      where,
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        teams: {
          where: { isActive: true },
          include: {
            users: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    res.json({ departments });
  } catch (error) {
    console.error('Get departments error:', error);
    res.status(500).json({ error: 'Failed to get departments' });
  }
});

/**
 * Create department (Admin/Manager only)
 * POST /api/teams/departments
 */
router.post('/departments', authorize('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const { name, description, managerId } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Department name is required' });
    }

    const department = await prisma.department.create({
      data: {
        name,
        description,
        managerId,
        tenantId: req.tenant.id,
        isActive: true,
      },
      include: {
        users: true,
        teams: true,
      },
    });

    // Log activity
    await authService.logActivity(
      req.user.id,
      'CREATE',
      'Department',
      department.id,
      `Created department: ${name}`
    );

    res.status(201).json({ department });
  } catch (error) {
    console.error('Create department error:', error);
    res.status(500).json({ error: 'Failed to create department' });
  }
});

/**
 * Update department (Admin/Manager only)
 * PUT /api/teams/departments/:id
 */
router.put('/departments/:id', authorize('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, managerId, isActive } = req.body;

    const department = await prisma.department.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(managerId !== undefined && { managerId }),
        ...(isActive !== undefined && { isActive }),
      },
      include: {
        users: true,
        teams: true,
      },
    });

    // Log activity
    await authService.logActivity(
      req.user.id,
      'UPDATE',
      'Department',
      department.id,
      `Updated department: ${department.name}`
    );

    res.json({ department });
  } catch (error) {
    console.error('Update department error:', error);
    res.status(500).json({ error: 'Failed to update department' });
  }
});

/**
 * Delete department (Admin only)
 * DELETE /api/teams/departments/:id
 */
router.delete('/departments/:id', authorize('ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;

    const department = await prisma.department.findUnique({
      where: { id },
    });

    if (!department) {
      return res.status(404).json({ error: 'Department not found' });
    }

    await prisma.department.delete({
      where: { id },
    });

    // Log activity
    await authService.logActivity(
      req.user.id,
      'DELETE',
      'Department',
      id,
      `Deleted department: ${department.name}`
    );

    res.json({ message: 'Department deleted successfully' });
  } catch (error) {
    console.error('Delete department error:', error);
    res.status(500).json({ error: 'Failed to delete department' });
  }
});

/**
 * Get all teams
 * GET /api/teams
 */
router.get('/', async (req, res) => {
  try {
    const { departmentId, includeInactive = 'false' } = req.query;

    const where = {};
    if (departmentId) where.departmentId = departmentId;
    if (includeInactive === 'false') where.isActive = true;

    const teams = await prisma.team.findMany({
      where,
      include: {
        department: {
          select: {
            id: true,
            name: true,
          },
        },
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    res.json({ teams });
  } catch (error) {
    console.error('Get teams error:', error);
    res.status(500).json({ error: 'Failed to get teams' });
  }
});

/**
 * Create team (Admin/Manager only)
 * POST /api/teams
 */
router.post('/', authorize('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const { name, description, departmentId, managerId } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Team name is required' });
    }

    const team = await prisma.team.create({
      data: {
        name,
        description,
        departmentId,
        managerId,
        tenantId: req.tenant.id,
        isActive: true,
      },
      include: {
        department: true,
        users: true,
      },
    });

    // Log activity
    await authService.logActivity(
      req.user.id,
      'CREATE',
      'Team',
      team.id,
      `Created team: ${name}`
    );

    res.status(201).json({ team });
  } catch (error) {
    console.error('Create team error:', error);
    res.status(500).json({ error: 'Failed to create team' });
  }
});

/**
 * Update team (Admin/Manager only)
 * PUT /api/teams/:id
 */
router.put('/:id', authorize('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, departmentId, managerId, isActive } = req.body;

    const team = await prisma.team.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(departmentId !== undefined && { departmentId }),
        ...(managerId !== undefined && { managerId }),
        ...(isActive !== undefined && { isActive }),
      },
      include: {
        department: true,
        users: true,
      },
    });

    // Log activity
    await authService.logActivity(
      req.user.id,
      'UPDATE',
      'Team',
      team.id,
      `Updated team: ${team.name}`
    );

    res.json({ team });
  } catch (error) {
    console.error('Update team error:', error);
    res.status(500).json({ error: 'Failed to update team' });
  }
});

/**
 * Delete team (Admin only)
 * DELETE /api/teams/:id
 */
router.delete('/:id', authorize('ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;

    const team = await prisma.team.findUnique({
      where: { id },
    });

    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    await prisma.team.delete({
      where: { id },
    });

    // Log activity
    await authService.logActivity(
      req.user.id,
      'DELETE',
      'Team',
      id,
      `Deleted team: ${team.name}`
    );

    res.json({ message: 'Team deleted successfully' });
  } catch (error) {
    console.error('Delete team error:', error);
    res.status(500).json({ error: 'Failed to delete team' });
  }
});

/**
 * Assign user to team (Admin/Manager only)
 * POST /api/teams/:teamId/users/:userId
 */
router.post('/:teamId/users/:userId', authorize('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const { teamId, userId } = req.params;

    const user = await prisma.user.update({
      where: { id: userId },
      data: { teamId },
      include: {
        team: true,
        department: true,
      },
    });

    // Log activity
    await authService.logActivity(
      req.user.id,
      'UPDATE',
      'User',
      userId,
      `Assigned user ${user.name} to team`
    );

    res.json({ user });
  } catch (error) {
    console.error('Assign user to team error:', error);
    res.status(500).json({ error: 'Failed to assign user to team' });
  }
});

/**
 * Remove user from team (Admin/Manager only)
 * DELETE /api/teams/:teamId/users/:userId
 */
router.delete('/:teamId/users/:userId', authorize('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await prisma.user.update({
      where: { id: userId },
      data: { teamId: null },
      include: {
        team: true,
        department: true,
      },
    });

    // Log activity
    await authService.logActivity(
      req.user.id,
      'UPDATE',
      'User',
      userId,
      `Removed user ${user.name} from team`
    );

    res.json({ user });
  } catch (error) {
    console.error('Remove user from team error:', error);
    res.status(500).json({ error: 'Failed to remove user from team' });
  }
});

/**
 * Get team members
 * GET /api/teams/:id/users
 */
router.get('/:id/users', async (req, res) => {
  try {
    const { id } = req.params;

    const users = await prisma.user.findMany({
      where: {
        teamId: id,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    res.json({ users });
  } catch (error) {
    console.error('Get team members error:', error);
    res.status(500).json({ error: 'Failed to get team members' });
  }
});

module.exports = router;
