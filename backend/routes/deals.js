const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const automationService = require('../services/automation');
const { getVisibilityFilter, validateAssignment } = require('../middleware/assignment');
const { tenantContext, getTenantFilter, autoInjectTenantId } = require('../middleware/tenant');
const prisma = new PrismaClient();

// Helper function: Map deal stage to lead status
function mapDealStageToLeadStatus(dealStage) {
  const stageMapping = {
    'lead': 'contacted',
    'qualified': 'qualified',
    'proposal': 'proposal',
    'negotiation': 'negotiation',
    'closed-won': 'won',
    'closed-lost': 'lost'
  };
  return stageMapping[dealStage] || 'contacted';
}

// Apply authentication to all routes
router.use(authenticate);
router.use(tenantContext);

// GET all deals (with role-based visibility, pagination, and advanced filtering)
router.get('/', async (req, res) => {
  try {
    const {
      stage,
      assignedTo,
      search,
      page,
      limit,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Get role-based visibility filter
    const visibilityFilter = await getVisibilityFilter(req.user);

    // Build where clause
    const where = getTenantFilter(req, { ...visibilityFilter });

    // Apply filters
    if (stage && stage !== 'all') where.stage = stage;
    if (assignedTo && assignedTo !== 'all') where.assignedTo = assignedTo;

    // Search across multiple fields
    if (search && search.trim()) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } },
        { contactName: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Check if pagination is requested
    if (page && limit) {
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;

      // Sorting
      const orderBy = {};
      orderBy[sortBy] = sortOrder;

      // Execute query with pagination
      const [deals, total] = await Promise.all([
        prisma.deal.findMany({
          where,
          orderBy,
          skip,
          take: limitNum,
        }),
        prisma.deal.count({ where })
      ]);

      // Return paginated response
      return res.json({
        data: deals,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
          hasMore: skip + deals.length < total,
        }
      });
    }

    // Non-paginated response (backward compatibility)
    const deals = await prisma.deal.findMany({
      where,
      orderBy: { [sortBy]: sortOrder }
    });

    res.json(deals);
  } catch (error) {
    console.error('Error fetching deals:', error);
    res.status(500).json({ error: 'Failed to fetch deals' });
  }
});

// GET single deal by ID (with role-based visibility)
router.get('/:id', async (req, res) => {
  try {
    // Get role-based visibility filter
    const visibilityFilter = await getVisibilityFilter(req.user);

    const deal = await prisma.deal.findFirst({
      where: getTenantFilter(req, {
        id: req.params.id,
        ...visibilityFilter
      })
    });

    if (!deal) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    res.json(deal);
  } catch (error) {
    console.error('Error fetching deal:', error);
    res.status(500).json({ error: 'Failed to fetch deal' });
  }
});

// POST create new deal
router.post('/', validateAssignment, async (req, res) => {
  try {
    const userId = req.user.id;

    // Remove fields that shouldn't be sent to Prisma
    const { id, createdAt, updatedAt, nextAction, source, ...dealData } = req.body;

    // Auto-assign to creator if not specified
    const assignedTo = dealData.assignedTo || req.user.name;
    const createdBy = userId;

    // Auto-assign default stage if not provided (NEW: Dynamic pipeline stages)
    let stageId = dealData.stageId;
    if (!stageId) {
      const defaultStage = await prisma.pipelineStage.findFirst({
        where: {
          tenantId: req.tenant.id,
          stageType: { in: ['DEAL', 'BOTH'] },
          isActive: true
        },
        orderBy: { order: 'asc' }
      });

      if (!defaultStage) {
        return res.status(400).json({
          error: 'No deal stages found. Please create pipeline stages first.'
        });
      }

      stageId = defaultStage.id;
      // Set stage field for backward compatibility
      if (!dealData.stage) {
        dealData.stage = defaultStage.slug;
      }
    }

    // Ensure required fields have defaults
    const data = {
      ...dealData,
      stageId, // NEW: Required field
      assignedTo,
      createdBy,
      userId,
      tenantId: req.tenant.id,
      notes: dealData.notes || '',
      tags: dealData.tags || [],
    };

    const deal = await prisma.deal.create({
      data
    });

    res.status(201).json(deal);
  } catch (error) {
    console.error('Error creating deal:', error);
    res.status(500).json({ error: 'Failed to create deal', message: error.message });
  }
});

// PUT update deal (syncs with Lead if linked)
router.put('/:id', async (req, res) => {
  try {
    const updateData = req.body;

    console.log('📝 Updating deal:', req.params.id);
    console.log('📊 Update data:', JSON.stringify(updateData, null, 2));

    // Validate required fields if provided
    if (updateData.title !== undefined && !updateData.title.trim()) {
      return res.status(400).json({ error: 'Deal title cannot be empty' });
    }

    // Get role-based visibility filter
    const visibilityFilter = await getVisibilityFilter(req.user);

    // First verify the deal is visible to the user
    const existingDeal = await prisma.deal.findFirst({
      where: getTenantFilter(req, {
        id: req.params.id,
        ...visibilityFilter
      })
    });

    if (!existingDeal) {
      console.log('❌ Deal not found or not visible to user:', req.user.id, 'dealId:', req.params.id);
      return res.status(404).json({ error: 'Deal not found' });
    }

    // Only validate assignment if assignedTo is being changed
    if (updateData.assignedTo && updateData.assignedTo !== existingDeal.assignedTo) {
      const { canAssignToByName } = require('../middleware/assignment');
      const canAssign = await canAssignToByName(req.user, updateData.assignedTo);

      if (!canAssign) {
        return res.status(403).json({
          error: 'Forbidden',
          message: `You do not have permission to assign to ${updateData.assignedTo}`
        });
      }
    }

    console.log('📌 Existing deal:', {
      id: existingDeal.id,
      title: existingDeal.title,
      stage: existingDeal.stage,
      userId: existingDeal.userId
    });

    // Check if stage is actually changing (store this before filtering fields)
    const isStageChanging = updateData.stage && updateData.stage !== existingDeal.stage;
    const isStageIdChanging = updateData.stageId && updateData.stageId !== existingDeal.stageId;
    console.log('🔍 Stage changing?', isStageChanging, '(from', existingDeal.stage, 'to', updateData.stage, ')');
    console.log('🔍 StageId changing?', isStageIdChanging, '(from', existingDeal.stageId, 'to', updateData.stageId, ')');

    // Remove fields that shouldn't be updated and CRITICAL: prevent userId from being changed
    const { id, createdAt, updatedAt, nextAction, source, userId: _, ...dealData } = updateData;

    // Update Deal and sync with Lead in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update the Deal
      const deal = await tx.deal.update({
        where: { id: req.params.id },
        data: dealData
      });

      console.log('✅ Deal updated to stage:', deal.stage, 'stageId:', deal.stageId);

      // Check if there's a linked Lead (find lead where dealId matches this deal)
      const linkedLead = await tx.lead.findFirst({
        where: { dealId: deal.id }
      });

      if (linkedLead) {
        console.log('🔗 Found linked lead:', linkedLead.id, 'current status:', linkedLead.status, 'stageId:', linkedLead.stageId);
      } else {
        console.log('ℹ️  No linked lead found for deal:', deal.id);
      }

      // If Deal has a linked Lead, sync stageId if it changed
      if (linkedLead && deal.stageId !== linkedLead.stageId) {
        console.log('🔄 Deal stageId changed from', linkedLead.stageId, 'to', deal.stageId, '- syncing to lead');

        const leadUpdateData = {};

        // Get the new stage details
        const pipelineStage = await tx.pipelineStage.findUnique({
          where: { id: deal.stageId }
        });

        if (pipelineStage) {
          leadUpdateData.stageId = pipelineStage.id;
          leadUpdateData.status = pipelineStage.slug;
          console.log('🔄 Syncing lead to stage:', pipelineStage.name, '(', pipelineStage.slug, ')');
        }

        // Sync other fields if provided
        if (updateData.contactName) leadUpdateData.name = updateData.contactName;
        if (updateData.email) leadUpdateData.email = updateData.email;
        if (updateData.phone !== undefined) leadUpdateData.phone = updateData.phone;
        if (updateData.company) leadUpdateData.company = updateData.company;
        if (updateData.value !== undefined) leadUpdateData.estimatedValue = updateData.value;
        if (updateData.notes) leadUpdateData.notes = updateData.notes;
        if (updateData.tags) leadUpdateData.tags = updateData.tags;
        if (updateData.assignedTo) leadUpdateData.assignedTo = updateData.assignedTo;

        // Update the linked Lead
        if (Object.keys(leadUpdateData).length > 0) {
          const updatedLead = await tx.lead.update({
            where: { id: linkedLead.id },
            data: leadUpdateData
          });
          console.log('✅ Synced Lead', linkedLead.id, 'with updates:', JSON.stringify(leadUpdateData, null, 2));
          console.log('✅ Lead final status:', updatedLead.status, 'stageId:', updatedLead.stageId);
        }
      } else if (linkedLead) {
        console.log('ℹ️  Deal stageId unchanged, checking other fields for sync');

        const leadUpdateData = {};

        // Sync other fields even if stage didn't change
        if (updateData.contactName && updateData.contactName !== linkedLead.name)
          leadUpdateData.name = updateData.contactName;
        if (updateData.email && updateData.email !== linkedLead.email)
          leadUpdateData.email = updateData.email;
        if (updateData.phone !== undefined && updateData.phone !== linkedLead.phone)
          leadUpdateData.phone = updateData.phone;
        if (updateData.company && updateData.company !== linkedLead.company)
          leadUpdateData.company = updateData.company;
        if (updateData.value !== undefined && updateData.value !== linkedLead.estimatedValue)
          leadUpdateData.estimatedValue = updateData.value;
        if (updateData.notes && updateData.notes !== linkedLead.notes)
          leadUpdateData.notes = updateData.notes;
        if (updateData.tags && JSON.stringify(updateData.tags) !== JSON.stringify(linkedLead.tags))
          leadUpdateData.tags = updateData.tags;
        if (updateData.assignedTo && updateData.assignedTo !== linkedLead.assignedTo)
          leadUpdateData.assignedTo = updateData.assignedTo;

        // Update the linked Lead if there are changes
        if (Object.keys(leadUpdateData).length > 0) {
          await tx.lead.update({
            where: { id: linkedLead.id },
            data: leadUpdateData
          });
          console.log('✅ Synced other fields to Lead', linkedLead.id, ':', JSON.stringify(leadUpdateData, null, 2));
        } else {
          console.log('ℹ️  No lead updates needed (no changes detected)');
        }
      } else {
        console.log('ℹ️  No linked lead to sync');
      }

      return deal;
    });

    console.log('✅ Deal update transaction completed successfully');

    // Verify sync by fetching the linked lead (for debugging)
    const verifyLead = await prisma.lead.findFirst({
      where: { dealId: result.id },
      select: { id: true, name: true, status: true, company: true }
    });

    if (verifyLead) {
      console.log('🔍 Verification - Linked lead after update:', {
        leadId: verifyLead.id,
        leadName: verifyLead.name,
        leadStatus: verifyLead.status,
        dealStage: result.stage
      });
    } else {
      console.log('⚠️  Verification - No linked lead found for this deal');
    }

    // Trigger automation for stage change
    if (isStageChanging) {
      try {
        console.log('🤖 Triggering automation for deal stage change:', existingDeal.stage, '→', result.stage);

        // Trigger deal-specific automation
        await automationService.triggerAutomation('deal.stage_changed', {
          id: result.id,
          name: result.contactName,
          email: result.email,
          phone: result.phone,
          company: result.company,
          fromStage: existingDeal.stage,
          toStage: result.stage,
          entityType: 'Deal'
        }, req.user);

        console.log('✅ Deal automation triggered successfully');
      } catch (automationError) {
        console.error('❌ Error triggering deal stage change automation:', automationError);
        // Don't fail the request if automation fails
      }
    }

    console.log('✅ Deal update completed successfully');
    console.log('📦 Returning updated deal:', {
      id: result.id,
      title: result.title,
      stage: result.stage,
      userId: result.userId,
      company: result.company
    });

    res.json(result);
  } catch (error) {
    console.error('❌ Error updating deal:', error);
    res.status(500).json({ error: 'Failed to update deal', message: error.message });
  }
});

// DELETE deal
router.delete('/:id', async (req, res) => {
  try {
    // Get role-based visibility filter
    const visibilityFilter = await getVisibilityFilter(req.user);

    // First verify the deal is visible to the user
    const existingDeal = await prisma.deal.findFirst({
      where: getTenantFilter(req, {
        id: req.params.id,
        ...visibilityFilter
      })
    });

    if (!existingDeal) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    // Check if user has permission to delete (only creator, assignee, or admin/manager)
    if (req.user.role !== 'ADMIN' &&
        req.user.role !== 'MANAGER' &&
        existingDeal.createdBy !== req.user.id &&
        existingDeal.assignedTo !== req.user.name) {
      return res.status(403).json({ error: 'You do not have permission to delete this deal' });
    }

    console.log('🗑️ Deleting deal:', req.params.id);

    // Use transaction to delete both deal and linked lead
    await prisma.$transaction(async (tx) => {
      // Find the linked lead (if any)
      const linkedLead = await tx.lead.findFirst({
        where: { dealId: req.params.id }
      });

      if (linkedLead) {
        console.log('🗑️ Found linked lead:', linkedLead.id, '- deleting it too');
        // Delete the linked lead first
        await tx.lead.delete({
          where: { id: linkedLead.id }
        });
        console.log('✅ Linked lead deleted');
      } else {
        console.log('ℹ️  No linked lead found for this deal');
      }

      // Delete the deal
      await tx.deal.delete({
        where: { id: req.params.id }
      });
      console.log('✅ Deal deleted');
    });

    res.json({ message: 'Deal and linked lead deleted successfully' });
  } catch (error) {
    console.error('Error deleting deal:', error);
    res.status(500).json({ error: 'Failed to delete deal' });
  }
});

module.exports = router;
