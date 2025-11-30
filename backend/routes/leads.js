const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// GET all leads
router.get('/', async (req, res) => {
  try {
    const { status, assignedTo } = req.query;
    const userId = req.headers['x-user-id'];

    if (!userId) {
      return res.status(401).json({ error: 'User ID is required' });
    }

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
    const userId = req.headers['x-user-id'];

    if (!userId) {
      return res.status(401).json({ error: 'User ID is required' });
    }

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

// POST create new lead
router.post('/', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];

    if (!userId) {
      return res.status(401).json({ error: 'User ID is required' });
    }

    const lead = await prisma.lead.create({
      data: {
        ...req.body,
        userId
      }
    });

    res.status(201).json(lead);
  } catch (error) {
    console.error('Error creating lead:', error);
    res.status(500).json({ error: 'Failed to create lead' });
  }
});

// PUT update lead
router.put('/:id', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];

    if (!userId) {
      return res.status(401).json({ error: 'User ID is required' });
    }

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

    const lead = await prisma.lead.update({
      where: { id: req.params.id },
      data: req.body
    });

    res.json(lead);
  } catch (error) {
    console.error('Error updating lead:', error);
    res.status(500).json({ error: 'Failed to update lead' });
  }
});

// DELETE lead
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];

    if (!userId) {
      return res.status(401).json({ error: 'User ID is required' });
    }

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
    const userId = req.headers['x-user-id'];

    if (!userId) {
      return res.status(401).json({ error: 'User ID is required' });
    }

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
