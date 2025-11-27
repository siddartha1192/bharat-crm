const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// GET all deals
router.get('/', async (req, res) => {
  try {
    const { stage } = req.query;
    const where = {};

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
    const deal = await prisma.deal.findUnique({
      where: { id: req.params.id }
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
    // Remove fields that shouldn't be sent to Prisma
    const { id, createdAt, updatedAt, nextAction, source, ...dealData } = req.body;

    // Ensure required fields have defaults
    const data = {
      ...dealData,
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

// PUT update deal
router.put('/:id', async (req, res) => {
  try {
    // Remove fields that shouldn't be updated
    const { id, createdAt, updatedAt, nextAction, source, ...dealData } = req.body;

    const deal = await prisma.deal.update({
      where: { id: req.params.id },
      data: dealData
    });

    res.json(deal);
  } catch (error) {
    console.error('Error updating deal:', error);
    res.status(500).json({ error: 'Failed to update deal', message: error.message });
  }
});

// DELETE deal
router.delete('/:id', async (req, res) => {
  try {
    await prisma.deal.delete({
      where: { id: req.params.id }
    });

    res.json({ message: 'Deal deleted successfully' });
  } catch (error) {
    console.error('Error deleting deal:', error);
    res.status(500).json({ error: 'Failed to delete deal' });
  }
});

module.exports = router;
