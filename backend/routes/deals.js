const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const automationService = require('../services/automation');
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

// GET all deals
router.get('/', async (req, res) => {
  try {
    const { stage } = req.query;
    const userId = req.user.id;

    const where = { userId };

    if (stage && stage !== 'all') where.stage = stage;

    const deals = await prisma.deal.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    res.json(deals);
  } catch (error) {
    console.error('Error fetching deals:', error);
    res.status(500).json({ error: 'Failed to fetch deals' });
  }
});

// GET single deal by ID
router.get('/:id', async (req, res) => {
  try {
    const userId = req.user.id;

    const deal = await prisma.deal.findFirst({
      where: {
        id: req.params.id,
        userId
      }
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
router.post('/', async (req, res) => {
  try {
    const userId = req.user.id;

    // Remove fields that shouldn't be sent to Prisma
    const { id, createdAt, updatedAt, nextAction, source, ...dealData } = req.body;

    // Ensure required fields have defaults
    const data = {
      ...dealData,
      userId,
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
    const userId = req.user.id;
    const updateData = req.body;

    console.log('📝 Updating deal:', req.params.id);
    console.log('📊 Update data:', JSON.stringify(updateData, null, 2));

    // Validate required fields if provided
    if (updateData.title !== undefined && !updateData.title.trim()) {
      return res.status(400).json({ error: 'Deal title cannot be empty' });
    }

    // First verify the deal belongs to the user
    const existingDeal = await prisma.deal.findFirst({
      where: {
        id: req.params.id,
        userId
      }
    });

    if (!existingDeal) {
      console.log('❌ Deal not found for user:', userId, 'dealId:', req.params.id);
      return res.status(404).json({ error: 'Deal not found' });
    }

    console.log('📌 Existing deal:', {
      id: existingDeal.id,
      title: existingDeal.title,
      stage: existingDeal.stage,
      userId: existingDeal.userId
    });

    // Check if stage is actually changing (store this before filtering fields)
    const isStageChanging = updateData.stage && updateData.stage !== existingDeal.stage;
    console.log('🔍 Stage changing?', isStageChanging, '(from', existingDeal.stage, 'to', updateData.stage, ')');

    // Remove fields that shouldn't be updated and CRITICAL: prevent userId from being changed
    const { id, createdAt, updatedAt, nextAction, source, userId: _, ...dealData } = updateData;

    // Update Deal and sync with Lead in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update the Deal
      const deal = await tx.deal.update({
        where: { id: req.params.id },
        data: dealData
      });

      console.log('✅ Deal updated to stage:', deal.stage);

      // Check if there's a linked Lead (find lead where dealId matches this deal)
      const linkedLead = await tx.lead.findFirst({
        where: { dealId: deal.id }
      });

      if (linkedLead) {
        console.log('🔗 Found linked lead:', linkedLead.id, 'current status:', linkedLead.status);
      } else {
        console.log('ℹ️  No linked lead found for deal:', deal.id);
      }

      // If Deal has a linked Lead, update it too
      if (linkedLead) {
        const leadUpdateData = {};

        // Sync stage/status if changed
        if (isStageChanging) {
          const newLeadStatus = mapDealStageToLeadStatus(updateData.stage);
          leadUpdateData.status = newLeadStatus;
          console.log('🔄 Syncing lead status from', linkedLead.status, 'to', newLeadStatus);
        }

        // Sync other fields
        if (updateData.contactName) leadUpdateData.name = updateData.contactName;
        if (updateData.email) leadUpdateData.email = updateData.email;
        if (updateData.phone !== undefined) leadUpdateData.phone = updateData.phone;
        if (updateData.company) leadUpdateData.company = updateData.company;
        if (updateData.value !== undefined) leadUpdateData.estimatedValue = updateData.value;
        if (updateData.notes) leadUpdateData.notes = updateData.notes;
        if (updateData.tags) leadUpdateData.tags = updateData.tags;
        if (updateData.assignedTo) leadUpdateData.assignedTo = updateData.assignedTo;

        // Update the linked Lead if there are changes
        if (Object.keys(leadUpdateData).length > 0) {
          const updatedLead = await tx.lead.update({
            where: { id: linkedLead.id },
            data: leadUpdateData
          });
          console.log('✅ Synced Lead', linkedLead.id, 'with updates:', JSON.stringify(leadUpdateData, null, 2));
          console.log('✅ Lead final status:', updatedLead.status);
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
    const userId = req.user.id;

    // First verify the deal belongs to the user
    const existingDeal = await prisma.deal.findFirst({
      where: {
        id: req.params.id,
        userId
      }
    });

    if (!existingDeal) {
      return res.status(404).json({ error: 'Deal not found' });
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
