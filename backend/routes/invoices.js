const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// GET all invoices
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    const where = {};

    if (status && status !== 'all') where.status = status;

    const invoices = await prisma.invoice.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    res.json(invoices);
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

// GET single invoice by ID
router.get('/:id', async (req, res) => {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: req.params.id }
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    res.json(invoice);
  } catch (error) {
    console.error('Error fetching invoice:', error);
    res.status(500).json({ error: 'Failed to fetch invoice' });
  }
});

// POST create new invoice
router.post('/', async (req, res) => {
  try {
    const invoice = await prisma.invoice.create({
      data: req.body
    });

    res.status(201).json(invoice);
  } catch (error) {
    console.error('Error creating invoice:', error);
    res.status(500).json({ error: 'Failed to create invoice' });
  }
});

// PUT update invoice
router.put('/:id', async (req, res) => {
  try {
    const invoice = await prisma.invoice.update({
      where: { id: req.params.id },
      data: req.body
    });

    res.json(invoice);
  } catch (error) {
    console.error('Error updating invoice:', error);
    res.status(500).json({ error: 'Failed to update invoice' });
  }
});

// DELETE invoice
router.delete('/:id', async (req, res) => {
  try {
    await prisma.invoice.delete({
      where: { id: req.params.id }
    });

    res.json({ message: 'Invoice deleted successfully' });
  } catch (error) {
    console.error('Error deleting invoice:', error);
    res.status(500).json({ error: 'Failed to delete invoice' });
  }
});

// GET invoice stats
router.get('/stats/summary', async (req, res) => {
  try {
    const [total, paid, pending, overdue] = await Promise.all([
      prisma.invoice.count(),
      prisma.invoice.aggregate({
        where: { status: 'paid' },
        _sum: { total: true }
      }),
      prisma.invoice.aggregate({
        where: { status: 'sent' },
        _sum: { total: true }
      }),
      prisma.invoice.aggregate({
        where: { status: 'overdue' },
        _sum: { total: true }
      })
    ]);

    res.json({
      totalInvoices: total,
      paidAmount: paid._sum.total || 0,
      pendingAmount: pending._sum.total || 0,
      overdueAmount: overdue._sum.total || 0
    });
  } catch (error) {
    console.error('Error fetching invoice stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

module.exports = router;
