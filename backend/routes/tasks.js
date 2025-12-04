const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const prisma = new PrismaClient();

// Apply authentication to all routes
router.use(authenticate);

// GET all tasks
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    const userId = req.user.id;

    const where = { userId };

    if (status && status !== 'all') where.status = status;

    const tasks = await prisma.task.findMany({
      where,
      orderBy: { dueDate: 'asc' }
    });

    res.json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// GET single task by ID
router.get('/:id', async (req, res) => {
  try {
    const userId = req.user.id;

    const task = await prisma.task.findFirst({
      where: {
        id: req.params.id,
        userId
      }
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
router.post('/', async (req, res) => {
  try {
    const userId = req.user.id;

    // Remove auto-generated fields
    const { id, createdAt, updatedAt, ...taskData } = req.body;

    // Ensure required fields have defaults
    const data = {
      ...taskData,
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
    const userId = req.user.id;

    // First verify the task belongs to the user
    const existingTask = await prisma.task.findFirst({
      where: {
        id: req.params.id,
        userId
      }
    });

    if (!existingTask) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Remove auto-generated fields
    const { id, createdAt, updatedAt, ...taskData } = req.body;

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
    const userId = req.user.id;

    // First verify the task belongs to the user
    const existingTask = await prisma.task.findFirst({
      where: {
        id: req.params.id,
        userId
      }
    });

    if (!existingTask) {
      return res.status(404).json({ error: 'Task not found' });
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
