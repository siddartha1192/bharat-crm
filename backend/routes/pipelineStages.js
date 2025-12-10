const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middleware/auth');
const prisma = new PrismaClient();

// Apply authentication to all routes
router.use(authenticate);

// GET all active pipeline stages for current user
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user's custom stages and default stages
    const stages = await prisma.pipelineStage.findMany({
      where: {
        isActive: true,
        OR: [
          { userId }, // User's custom stages
          { isDefault: true, userId: null } // System default stages
        ]
      },
      orderBy: { order: 'asc' }
    });

    res.json(stages);
  } catch (error) {
    console.error('Error fetching pipeline stages:', error);
    res.status(500).json({ error: 'Failed to fetch pipeline stages' });
  }
});

// GET single pipeline stage
router.get('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const stage = await prisma.pipelineStage.findFirst({
      where: {
        id,
        OR: [
          { userId },
          { isDefault: true, userId: null }
        ]
      }
    });

    if (!stage) {
      return res.status(404).json({ error: 'Pipeline stage not found' });
    }

    res.json(stage);
  } catch (error) {
    console.error('Error fetching pipeline stage:', error);
    res.status(500).json({ error: 'Failed to fetch pipeline stage' });
  }
});

// POST create new custom pipeline stage
router.post('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, slug, color, order } = req.body;

    // Validate required fields
    if (!name || !slug) {
      return res.status(400).json({ error: 'Name and slug are required' });
    }

    // Check if slug already exists for this user
    const existing = await prisma.pipelineStage.findUnique({
      where: {
        userId_slug: {
          userId,
          slug
        }
      }
    });

    if (existing) {
      return res.status(400).json({
        error: 'A stage with this slug already exists'
      });
    }

    // If no order provided, put it at the end
    let stageOrder = order;
    if (stageOrder === undefined || stageOrder === null) {
      const lastStage = await prisma.pipelineStage.findFirst({
        where: {
          OR: [{ userId }, { isDefault: true, userId: null }]
        },
        orderBy: { order: 'desc' }
      });
      stageOrder = lastStage ? lastStage.order + 1 : 1;
    }

    const stage = await prisma.pipelineStage.create({
      data: {
        name,
        slug,
        color: color || 'blue',
        order: stageOrder,
        isDefault: false,
        userId
      }
    });

    res.status(201).json(stage);
  } catch (error) {
    console.error('Error creating pipeline stage:', error);
    res.status(500).json({
      error: 'Failed to create pipeline stage',
      message: error.message
    });
  }
});

// PUT update pipeline stage
router.put('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { name, color, order, isActive } = req.body;

    // Find the stage
    const existingStage = await prisma.pipelineStage.findFirst({
      where: {
        id,
        userId // Can only update own custom stages
      }
    });

    if (!existingStage) {
      return res.status(404).json({
        error: 'Pipeline stage not found or cannot be modified'
      });
    }

    // Cannot modify default stages
    if (existingStage.isDefault) {
      return res.status(403).json({
        error: 'Cannot modify default pipeline stages'
      });
    }

    const data = {};
    if (name !== undefined) data.name = name;
    if (color !== undefined) data.color = color;
    if (order !== undefined) data.order = order;
    if (isActive !== undefined) data.isActive = isActive;

    const stage = await prisma.pipelineStage.update({
      where: { id },
      data
    });

    res.json(stage);
  } catch (error) {
    console.error('Error updating pipeline stage:', error);
    res.status(500).json({
      error: 'Failed to update pipeline stage',
      message: error.message
    });
  }
});

// DELETE pipeline stage (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Find the stage
    const existingStage = await prisma.pipelineStage.findFirst({
      where: {
        id,
        userId
      }
    });

    if (!existingStage) {
      return res.status(404).json({
        error: 'Pipeline stage not found or cannot be deleted'
      });
    }

    // Cannot delete default stages
    if (existingStage.isDefault) {
      return res.status(403).json({
        error: 'Cannot delete default pipeline stages'
      });
    }

    // Check if any deals are using this stage
    const dealsCount = await prisma.deal.count({
      where: {
        OR: [
          { stageId: id },
          { stage: existingStage.slug }
        ],
        userId
      }
    });

    if (dealsCount > 0) {
      return res.status(400).json({
        error: `Cannot delete stage "${existingStage.name}" because it has ${dealsCount} active deal${dealsCount > 1 ? 's' : ''}. Please move these deals to another stage first.`
      });
    }

    // Soft delete
    await prisma.pipelineStage.update({
      where: { id },
      data: { isActive: false }
    });

    res.status(200).json({ message: 'Pipeline stage deleted successfully' });
  } catch (error) {
    console.error('Error deleting pipeline stage:', error);
    res.status(500).json({
      error: 'Failed to delete pipeline stage',
      message: error.message
    });
  }
});

// POST reorder pipeline stages
router.post('/reorder', async (req, res) => {
  try {
    const userId = req.user.id;
    const { stageOrders } = req.body; // Array of { id, order }

    if (!Array.isArray(stageOrders)) {
      return res.status(400).json({ error: 'stageOrders must be an array' });
    }

    // Update all stages in transaction
    await prisma.$transaction(
      stageOrders.map(({ id, order }) =>
        prisma.pipelineStage.updateMany({
          where: {
            id,
            userId // Can only reorder own custom stages
          },
          data: { order }
        })
      )
    );

    res.json({ message: 'Pipeline stages reordered successfully' });
  } catch (error) {
    console.error('Error reordering pipeline stages:', error);
    res.status(500).json({
      error: 'Failed to reorder pipeline stages',
      message: error.message
    });
  }
});

// POST initialize default stages for new user
router.post('/initialize-defaults', async (req, res) => {
  try {
    const userId = req.user.id;

    // Check if user already has default stages
    const existing = await prisma.pipelineStage.findFirst({
      where: { userId }
    });

    if (existing) {
      return res.status(400).json({
        error: 'User already has pipeline stages initialized'
      });
    }

    // Get system default stages
    const defaultStages = await prisma.pipelineStage.findMany({
      where: {
        isDefault: true,
        userId: null
      },
      orderBy: { order: 'asc' }
    });

    if (defaultStages.length === 0) {
      return res.status(404).json({
        error: 'No default pipeline stages found in system'
      });
    }

    res.json({
      message: 'Default pipeline stages are available for use',
      stages: defaultStages
    });
  } catch (error) {
    console.error('Error initializing default stages:', error);
    res.status(500).json({
      error: 'Failed to initialize default stages',
      message: error.message
    });
  }
});

module.exports = router;
