const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const prisma = new PrismaClient();

// Helper function: Map lead status to deal stage
function mapLeadStatusToDealStage(leadStatus) {
  const statusMapping = {
    'new': 'lead',
    'contacted': 'lead',
    'qualified': 'qualified',
    'proposal': 'proposal',
    'negotiation': 'negotiation',
    'won': 'closed-won',
    'lost': 'closed-lost'
  };
  return statusMapping[leadStatus] || 'lead';
}

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

// Apply authentication to all lead routes
router.use(authenticate);

// GET all leads
router.get('/', async (req, res) => {
  try {
    const { status, assignedTo } = req.query;
    const userId = req.user.id;

    const where = { userId };

    if (status && status !== 'all') where.status = status;
    if (assignedTo) where.assignedTo = assignedTo;

    const leads = await prisma.lead.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    res.json(leads);
  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

// GET single lead by ID
router.get('/:id', async (req, res) => {
  try {
    const userId = req.user.id;

    const lead = await prisma.lead.findFirst({
      where: {
        id: req.params.id,
        userId
      }
    });

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    res.json(lead);
  } catch (error) {
    console.error('Error fetching lead:', error);
    res.status(500).json({ error: 'Failed to fetch lead' });
  }
});

// POST create new lead (automatically creates Deal in pipeline)
router.post('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const leadData = req.body;

    // Use transaction to ensure both Lead and Deal are created together
    const result = await prisma.$transaction(async (tx) => {
      // Create the Deal first in the pipeline
      const deal = await tx.deal.create({
        data: {
          title: `${leadData.company} - ${leadData.name}`,
          company: leadData.company,
          contactName: leadData.name,
          value: leadData.estimatedValue || 0,
          stage: mapLeadStatusToDealStage(leadData.status || 'new'),
          probability: leadData.priority === 'urgent' ? 80 : leadData.priority === 'high' ? 60 : leadData.priority === 'medium' ? 40 : 20,
          expectedCloseDate: leadData.nextFollowUpAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          assignedTo: leadData.assignedTo || req.user.name || 'Unassigned',
          notes: leadData.notes || '',
          tags: leadData.tags || [],
          userId
        }
      });

      // Create the Lead and link it to the Deal
      const lead = await tx.lead.create({
        data: {
          ...leadData,
          userId,
          dealId: deal.id
        }
      });

      return { lead, deal };
    });

    console.log(`Lead created with auto-generated Deal: Lead ${result.lead.id} -> Deal ${result.deal.id}`);
    res.status(201).json(result.lead);
  } catch (error) {
    console.error('Error creating lead:', error);
    res.status(500).json({ error: 'Failed to create lead', message: error.message });
  }
});

// PUT update lead (syncs with Deal if linked)
router.put('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const updateData = req.body;

    // First verify the lead belongs to the user
    const existingLead = await prisma.lead.findFirst({
      where: {
        id: req.params.id,
        userId
      }
    });

    if (!existingLead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    // Update Lead and sync with Deal in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update the Lead
      const lead = await tx.lead.update({
        where: { id: req.params.id },
        data: updateData
      });

      // If Lead has a linked Deal, update it too
      if (lead.dealId) {
        const dealUpdateData = {};

        // Sync status/stage if changed
        if (updateData.status) {
          dealUpdateData.stage = mapLeadStatusToDealStage(updateData.status);
        }

        // Sync other fields
        if (updateData.name) dealUpdateData.contactName = updateData.name;
        if (updateData.company) dealUpdateData.company = updateData.company;
        if (updateData.estimatedValue !== undefined) dealUpdateData.value = updateData.estimatedValue;
        if (updateData.notes) dealUpdateData.notes = updateData.notes;
        if (updateData.tags) dealUpdateData.tags = updateData.tags;
        if (updateData.assignedTo) dealUpdateData.assignedTo = updateData.assignedTo;

        // Update Deal title if name or company changed
        if (updateData.name || updateData.company) {
          dealUpdateData.title = `${lead.company} - ${lead.name}`;
        }

        // Update the linked Deal if there are changes
        if (Object.keys(dealUpdateData).length > 0) {
          await tx.deal.update({
            where: { id: lead.dealId },
            data: dealUpdateData
          });
          console.log(`Synced Deal ${lead.dealId} with Lead ${lead.id} updates`);
        }
      }

      return lead;
    });

    res.json(result);
  } catch (error) {
    console.error('Error updating lead:', error);
    res.status(500).json({ error: 'Failed to update lead', message: error.message });
  }
});

// DELETE lead
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user.id;

    // First verify the lead belongs to the user
    const existingLead = await prisma.lead.findFirst({
      where: {
        id: req.params.id,
        userId
      }
    });

    if (!existingLead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    await prisma.lead.delete({
      where: { id: req.params.id }
    });

    res.json({ message: 'Lead deleted successfully' });
  } catch (error) {
    console.error('Error deleting lead:', error);
    res.status(500).json({ error: 'Failed to delete lead' });
  }
});

// GET lead stats
router.get('/stats/summary', async (req, res) => {
  try {
    const userId = req.user.id;

    const [total, newLeads, qualified, totalValue] = await Promise.all([
      prisma.lead.count({ where: { userId } }),
      prisma.lead.count({ where: { userId, status: 'new' } }),
      prisma.lead.count({ where: { userId, status: 'qualified' } }),
      prisma.lead.aggregate({
        where: { userId },
        _sum: { estimatedValue: true }
      })
    ]);

    res.json({
      total,
      new: newLeads,
      qualified,
      totalValue: totalValue._sum.estimatedValue || 0
    });
  } catch (error) {
    console.error('Error fetching lead stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

module.exports = router;
