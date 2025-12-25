const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const { getVisibilityFilter, validateAssignment } = require('../middleware/assignment');
const { tenantContext, getTenantFilter, autoInjectTenantId } = require('../middleware/tenant');
const prisma = new PrismaClient();

// Apply authentication to all routes
router.use(authenticate);
router.use(tenantContext);

// GET all tasks (with role-based visibility, pagination, and advanced filtering)
router.get('/', async (req, res) => {
  try {
    const {
      status,
      priority,
      assignedTo,
      tags,
      search,
      page = '1',
      limit = '100',
      sortBy = 'dueDate',
      sortOrder = 'asc'
    } = req.query;

    // Get role-based visibility filter
    const visibilityFilter = await getVisibilityFilter(req.user);

    // Build where clause
    const where = getTenantFilter(req, { ...visibilityFilter });

    // Apply filters
    if (status && status !== 'all') where.status = status;
    if (priority && priority !== 'all') where.priority = priority;
    if (assignedTo && assignedTo !== 'all') where.assignedTo = assignedTo;

    // Tags filter (multiple tags support)
    if (tags) {
      const tagArray = tags.split(',').map(t => t.trim());
      where.tags = { hasSome: tagArray };
    }

    // Search across multiple fields
    if (search && search.trim()) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Sorting
    const orderBy = {};
    orderBy[sortBy] = sortOrder;

    // Execute query with pagination
    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        orderBy,
        skip,
        take: limitNum,
      }),
      prisma.task.count({ where })
    ]);

    // Return paginated response
    res.json({
      data: tasks,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
        hasMore: skip + tasks.length < total,
      }
    });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// GET single task by ID (with role-based visibility)
router.get('/:id', async (req, res) => {
  try {
    // Get role-based visibility filter
    const visibilityFilter = await getVisibilityFilter(req.user);

    const task = await prisma.task.findFirst({
      where: getTenantFilter(req, {
        id: req.params.id,
        ...visibilityFilter
      })
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json(task);
  } catch (error) {
    console.error('Error fetching task:', error);
    res.status(500).json({ error: 'Failed to fetch task' });
  }
});

// POST create new task
router.post('/', validateAssignment, async (req, res) => {
  try {
    const userId = req.user.id;

    // Remove auto-generated fields AND old 'assignee' field (frontend might still send it)
    const { id, createdAt, updatedAt, assignee, ...taskData } = req.body;

    // Auto-assign to creator if not specified
    const assignedTo = taskData.assignedTo || req.user.name;
    const createdBy = userId;

    // Ensure required fields have defaults
    const data = {
      ...taskData,
      assignedTo,
      createdBy,
      userId,
      description: taskData.description || '',
      tags: taskData.tags || [],
    };

    const task = await prisma.task.create({
      data
    });

    res.status(201).json(task);
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: 'Failed to create task', message: error.message });
  }
});

// PUT update task
router.put('/:id', async (req, res) => {
  try {
    // Get role-based visibility filter
    const visibilityFilter = await getVisibilityFilter(req.user);

    // First verify the task is visible to the user
    const existingTask = await prisma.task.findFirst({
      where: getTenantFilter(req, {
        id: req.params.id,
        ...visibilityFilter
      })
    });

    if (!existingTask) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Remove auto-generated fields AND old 'assignee' field (frontend might still send it)
    const { id, createdAt, updatedAt, assignee, ...taskData } = req.body;

    // Only validate assignment if assignedTo is being changed
    if (taskData.assignedTo && taskData.assignedTo !== existingTask.assignedTo) {
      const { canAssignToByName } = require('../middleware/assignment');
      const canAssign = await canAssignToByName(req.user, taskData.assignedTo);

      if (!canAssign) {
        return res.status(403).json({
          error: 'Forbidden',
          message: `You do not have permission to assign to ${taskData.assignedTo}`
        });
      }
    }

    const task = await prisma.task.update({
      where: { id: req.params.id },
      data: taskData
    });

    res.json(task);
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'Failed to update task', message: error.message });
  }
});

// DELETE task
router.delete('/:id', async (req, res) => {
  try {
    // Get role-based visibility filter
    const visibilityFilter = await getVisibilityFilter(req.user);

    // First verify the task is visible to the user
    const existingTask = await prisma.task.findFirst({
      where: getTenantFilter(req, {
        id: req.params.id,
        ...visibilityFilter
      })
    });

    if (!existingTask) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Check if user has permission to delete (only creator, assignedTo, or admin/manager)
    if (req.user.role !== 'ADMIN' &&
        req.user.role !== 'MANAGER' &&
        existingTask.createdBy !== req.user.id &&
        existingTask.assignedTo !== req.user.name) {
      return res.status(403).json({ error: 'You do not have permission to delete this task' });
    }

    await prisma.task.delete({
      where: { id: req.params.id }
    });

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

module.exports = router;
