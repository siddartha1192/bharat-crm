const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// GET all contacts
router.get('/', async (req, res) => {
  try {
    const { type, assignedTo } = req.query;
    const where = {};

    if (type && type !== 'all') where.type = type;
    if (assignedTo) where.assignedTo = assignedTo;

    const contacts = await prisma.contact.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    res.json(contacts);
  } catch (error) {
    console.error('Error fetching contacts:', error);
    res.status(500).json({ error: 'Failed to fetch contacts' });
  }
});

// GET single contact by ID
router.get('/:id', async (req, res) => {
  try {
    const contact = await prisma.contact.findUnique({
      where: { id: req.params.id }
    });

    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    res.json(contact);
  } catch (error) {
    console.error('Error fetching contact:', error);
    res.status(500).json({ error: 'Failed to fetch contact' });
  }
});

// POST create new contact
router.post('/', async (req, res) => {
  try {
    const contact = await prisma.contact.create({
      data: req.body
    });

    res.status(201).json(contact);
  } catch (error) {
    console.error('Error creating contact:', error);
    res.status(500).json({ error: 'Failed to create contact' });
  }
});

// PUT update contact
router.put('/:id', async (req, res) => {
  try {
    const contact = await prisma.contact.update({
      where: { id: req.params.id },
      data: req.body
    });

    res.json(contact);
  } catch (error) {
    console.error('Error updating contact:', error);
    res.status(500).json({ error: 'Failed to update contact' });
  }
});

// DELETE contact
router.delete('/:id', async (req, res) => {
  try {
    await prisma.contact.delete({
      where: { id: req.params.id }
    });

    res.json({ message: 'Contact deleted successfully' });
  } catch (error) {
    console.error('Error deleting contact:', error);
    res.status(500).json({ error: 'Failed to delete contact' });
  }
});

// GET contact stats
router.get('/stats/summary', async (req, res) => {
  try {
    const [total, customers, prospects, totalValue] = await Promise.all([
      prisma.contact.count(),
      prisma.contact.count({ where: { type: 'customer' } }),
      prisma.contact.count({ where: { type: 'prospect' } }),
      prisma.contact.aggregate({ _sum: { lifetimeValue: true } })
    ]);

    res.json({
      total,
      customers,
      prospects,
      totalValue: totalValue._sum.lifetimeValue || 0
    });
  } catch (error) {
    console.error('Error fetching contact stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

module.exports = router;
