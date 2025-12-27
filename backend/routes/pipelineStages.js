const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middleware/auth');
const { tenantContext, getTenantFilter, autoInjectTenantId } = require('../middleware/tenant');
const prisma = new PrismaClient();

// Apply authentication to all routes
router.use(authenticate);
router.use(tenantContext);

// GET all active pipeline stages for current tenant
router.get('/', async (req, res) => {
  try {
    const tenantId = req.tenant.id;

    // Get all active stages for this tenant
    const stages = await prisma.pipelineStage.findMany({
      where: {
        tenantId,
        isActive: true
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
    const tenantId = req.tenant.id;
    const { id } = req.params;

    const stage = await prisma.pipelineStage.findFirst({
      where: {
        id,
        tenantId
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
    const tenantId = req.tenant.id;
    const { name, slug, color, order, stageType, description } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    // Auto-generate slug from name if not provided
    const finalSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    // Check if slug already exists for this tenant
    const existing = await prisma.pipelineStage.findUnique({
      where: {
        tenantId_slug: {
          tenantId,
          slug: finalSlug
        }
      }
    });

    if (existing) {
      return res.status(400).json({
        error: 'A stage with this name already exists. Please choose a different name.'
      });
    }

    // If no order provided, put it at the end
    let stageOrder = order;
    if (stageOrder === undefined || stageOrder === null) {
      const lastStage = await prisma.pipelineStage.findFirst({
        where: { tenantId },
        orderBy: { order: 'desc' }
      });
      stageOrder = lastStage ? lastStage.order + 1 : 1;
    }

    const stage = await prisma.pipelineStage.create({
      data: {
        name,
        slug: finalSlug,
        color: color || 'blue',
        order: stageOrder,
        stageType: stageType || 'BOTH',
        description: description || null,
        isDefault: false,
        isSystemDefault: false,
        isActive: true,
        tenantId
      }
    });

    console.log(`✨ Created new pipeline stage: ${stage.name} for tenant ${tenantId}`);
    res.status(201).json(stage);
  } catch (error) {
    console.error('Error creating pipeline stage:', error);
    res.status(500).json({
      error: 'Failed to create pipeline stage',
      message: error.message
    });
  }
});

// PUT update/rename pipeline stage
router.put('/:id', async (req, res) => {
  try {
    const tenantId = req.tenant.id;
    const { id } = req.params;
    const { name, color, order, isActive, stageType, description } = req.body;

    // Find the stage
    const existingStage = await prisma.pipelineStage.findFirst({
      where: {
        id,
        tenantId
      }
    });

    if (!existingStage) {
      return res.status(404).json({
        error: 'Pipeline stage not found'
      });
    }

    // Only admins can modify system default stages
    if (existingStage.isSystemDefault && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        error: 'Only administrators can modify system default stages'
      });
    }

    const data = {};

    // Update name and auto-generate new slug if name changed
    if (name !== undefined && name !== existingStage.name) {
      const newSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

      // Check if new slug conflicts with existing stages
      const conflicting = await prisma.pipelineStage.findFirst({
        where: {
          tenantId,
          slug: newSlug,
          id: { not: id }
        }
      });

      if (conflicting) {
        return res.status(400).json({
          error: 'A stage with this name already exists. Please choose a different name.'
        });
      }

      data.name = name;
      data.slug = newSlug;

      console.log(`📝 Renaming stage from "${existingStage.name}" to "${name}"`);
    }

    if (color !== undefined) data.color = color;
    if (order !== undefined) data.order = order;
    if (isActive !== undefined) data.isActive = isActive;
    if (stageType !== undefined) data.stageType = stageType;
    if (description !== undefined) data.description = description;

    // Update the stage
    const stage = await prisma.pipelineStage.update({
      where: { id },
      data
    });

    // Count affected leads and deals
    const [leadsCount, dealsCount] = await Promise.all([
      prisma.lead.count({ where: { stageId: id } }),
      prisma.deal.count({ where: { stageId: id } })
    ]);

    console.log(`✅ Updated stage "${stage.name}" - affects ${leadsCount} leads and ${dealsCount} deals`);

    res.json({
      ...stage,
      _affected: {
        leads: leadsCount,
        deals: dealsCount
      }
    });
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
    const tenantId = req.tenant.id;
    const { id } = req.params;

    // Find the stage
    const existingStage = await prisma.pipelineStage.findFirst({
      where: {
        id,
        tenantId
      }
    });

    if (!existingStage) {
      return res.status(404).json({
        error: 'Pipeline stage not found'
      });
    }

    // Cannot delete system default stages
    if (existingStage.isSystemDefault) {
      return res.status(403).json({
        error: 'Cannot delete system default stages'
      });
    }

    // Check if any leads or deals are using this stage
    const [leadsCount, dealsCount] = await Promise.all([
      prisma.lead.count({ where: { stageId: id } }),
      prisma.deal.count({ where: { stageId: id } })
    ]);

    const totalCount = leadsCount + dealsCount;

    if (totalCount > 0) {
      return res.status(400).json({
        error: `Cannot delete stage "${existingStage.name}" because it has ${leadsCount} lead${leadsCount !== 1 ? 's' : ''} and ${dealsCount} deal${dealsCount !== 1 ? 's' : ''}. Please move them to another stage first.`,
        details: {
          leads: leadsCount,
          deals: dealsCount
        }
      });
    }

    // Soft delete
    await prisma.pipelineStage.update({
      where: { id },
      data: { isActive: false }
    });

    console.log(`🗑️  Deleted pipeline stage: ${existingStage.name}`);
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
    const tenantId = req.tenant.id;
    const { stageOrders } = req.body; // Array of { id, order }

    if (!Array.isArray(stageOrders)) {
      return res.status(400).json({ error: 'stageOrders must be an array' });
    }

    // Verify all stages belong to this tenant
    const stageIds = stageOrders.map(s => s.id);
    const stages = await prisma.pipelineStage.findMany({
      where: {
        id: { in: stageIds },
        tenantId
      }
    });

    if (stages.length !== stageIds.length) {
      return res.status(403).json({
        error: 'Some stages do not belong to your tenant'
      });
    }

    // Update all stages in transaction
    await prisma.$transaction(
      stageOrders.map(({ id, order }) =>
        prisma.pipelineStage.update({
          where: { id },
          data: { order }
        })
      )
    );

    console.log(`🔄 Reordered ${stageOrders.length} pipeline stages`);
    res.json({ message: 'Pipeline stages reordered successfully' });
  } catch (error) {
    console.error('Error reordering pipeline stages:', error);
    res.status(500).json({
      error: 'Failed to reorder pipeline stages',
      message: error.message
    });
  }
});

module.exports = router;
