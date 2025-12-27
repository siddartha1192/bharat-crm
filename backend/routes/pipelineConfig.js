const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const { tenantContext } = require('../middleware/tenant');
const prisma = new PrismaClient();

// Apply authentication to all routes
router.use(authenticate);
router.use(tenantContext);

/**
 * GET pipeline stage configuration
 * Returns which stages are marked as won/lost/new for forecasts and AI
 */
router.get('/config', async (req, res) => {
  try {
    const tenantId = req.tenant.id;

    // Get all stages for this tenant
    const stages = await prisma.pipelineStage.findMany({
      where: {
        tenantId,
        isActive: true
      },
      orderBy: { order: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        color: true,
        stageType: true,
        isSystemDefault: true
      }
    });

    // Auto-detect won/lost/new stages based on slug patterns
    const wonStages = stages.filter(s => s.slug.includes('won'));
    const lostStages = stages.filter(s => s.slug.includes('lost'));
    const newStages = stages.filter(s => s.isSystemDefault || s.slug.includes('new') || s.slug.includes('lead'));

    res.json({
      stages,
      autoDetected: {
        wonStages: wonStages.map(s => ({ id: s.id, name: s.name })),
        lostStages: lostStages.map(s => ({ id: s.id, name: s.name })),
        newStages: newStages.map(s => ({ id: s.id, name: s.name }))
      },
      message: wonStages.length === 0 || lostStages.length === 0
        ? 'Please create stages with "won" and "lost" in their names for proper forecasting'
        : null
    });
  } catch (error) {
    console.error('Error fetching pipeline config:', error);
    res.status(500).json({ error: 'Failed to fetch pipeline configuration' });
  }
});

/**
 * GET validation - check if tenant has required stages
 */
router.get('/validate', async (req, res) => {
  try {
    const tenantId = req.tenant.id;

    const stages = await prisma.pipelineStage.findMany({
      where: {
        tenantId,
        isActive: true
      }
    });

    const hasWonStage = stages.some(s => s.slug.includes('won'));
    const hasLostStage = stages.some(s => s.slug.includes('lost'));
    const hasLeadStage = stages.some(s => s.stageType === 'LEAD' || s.stageType === 'BOTH');

    const errors = [];
    const warnings = [];

    if (stages.length === 0) {
      errors.push('No pipeline stages found. Please create at least one stage to start using the CRM.');
    }

    if (!hasLeadStage) {
      errors.push('No lead stages found. Please create a stage with stageType="LEAD" or "BOTH".');
    }

    if (!hasWonStage) {
      warnings.push('No "won" stage detected. Create a stage with "won" in the name for accurate forecasting.');
    }

    if (!hasLostStage) {
      warnings.push('No "lost" stage detected. Create a stage with "lost" in the name for accurate forecasting.');
    }

    res.json({
      valid: errors.length === 0,
      canCreateLeads: stages.length > 0 && hasLeadStage,
      canCreateDeals: stages.length > 0,
      errors,
      warnings,
      stageCount: stages.length
    });
  } catch (error) {
    console.error('Error validating pipeline:', error);
    res.status(500).json({ error: 'Failed to validate pipeline' });
  }
});

module.exports = router;
