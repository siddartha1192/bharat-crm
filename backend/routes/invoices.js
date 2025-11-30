const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Helper function to transform invoice for frontend
const transformInvoiceForFrontend = (invoice) => {
  const { customerGST, companyGST, ...rest } = invoice;
  return {
    ...rest,
    customerGSTIN: customerGST,
    companyGSTIN: companyGST,
  };
};

// GET all invoices
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    const userId = req.headers['x-user-id'];

    if (!userId) {
      return res.status(401).json({ error: 'User ID is required' });
    }

    const where = { userId };

    if (status && status !== 'all') where.status = status;

    const invoices = await prisma.invoice.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    // Transform invoices for frontend
    const transformedInvoices = invoices.map(transformInvoiceForFrontend);
    res.json(transformedInvoices);
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

// GET single invoice by ID
router.get('/:id', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];

    if (!userId) {
      return res.status(401).json({ error: 'User ID is required' });
    }

    const invoice = await prisma.invoice.findFirst({
      where: {
        id: req.params.id,
        userId
      }
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Transform invoice for frontend
    const transformedInvoice = transformInvoiceForFrontend(invoice);
    res.json(transformedInvoice);
  } catch (error) {
    console.error('Error fetching invoice:', error);
    res.status(500).json({ error: 'Failed to fetch invoice' });
  }
});

// POST create new invoice
router.post('/', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];

    if (!userId) {
      return res.status(401).json({ error: 'User ID is required' });
    }

    // Remove auto-generated fields and transform data
    const {
      id,
      createdAt,
      updatedAt,
      customerId,
      customerPincode,
      companyPincode,
      issueDate,
      termsAndConditions,
      customerGSTIN,
      companyGSTIN,
      ...invoiceData
    } = req.body;

    // Prepare data with proper field mapping and defaults
    const data = {
      ...invoiceData,
      userId,
      customerGST: customerGSTIN || '',
      companyGST: companyGSTIN || '',
      customerPhone: invoiceData.customerPhone || '',
      companyPAN: invoiceData.companyPAN || '',
      notes: invoiceData.notes || '',
      totalDiscount: invoiceData.totalDiscount || 0,
      cgst: invoiceData.cgst || 0,
      sgst: invoiceData.sgst || 0,
      igst: invoiceData.igst || 0,
      roundOff: invoiceData.roundOff || 0,
      totalTax: invoiceData.totalTax || (invoiceData.cgst || 0) + (invoiceData.sgst || 0) + (invoiceData.igst || 0),
      // Convert string dates to DateTime if needed
      dueDate: invoiceData.dueDate ? new Date(invoiceData.dueDate) : new Date(),
      paymentDate: invoiceData.paymentDate ? new Date(invoiceData.paymentDate) : null,
    };

    const invoice = await prisma.invoice.create({
      data
    });

    // Transform invoice for frontend
    const transformedInvoice = transformInvoiceForFrontend(invoice);
    res.status(201).json(transformedInvoice);
  } catch (error) {
    console.error('Error creating invoice:', error);
    res.status(500).json({ error: 'Failed to create invoice', message: error.message });
  }
});

// PUT update invoice
router.put('/:id', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];

    if (!userId) {
      return res.status(401).json({ error: 'User ID is required' });
    }

    // First verify the invoice belongs to the user
    const existingInvoice = await prisma.invoice.findFirst({
      where: {
        id: req.params.id,
        userId
      }
    });

    if (!existingInvoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Remove auto-generated fields and transform data
    const {
      id,
      createdAt,
      updatedAt,
      customerId,
      customerPincode,
      companyPincode,
      issueDate,
      termsAndConditions,
      customerGSTIN,
      companyGSTIN,
      ...invoiceData
    } = req.body;

    // Prepare data with proper field mapping
    const data = {
      ...invoiceData,
    };

    // Map GSTIN fields if provided
    if (customerGSTIN !== undefined) data.customerGST = customerGSTIN;
    if (companyGSTIN !== undefined) data.companyGST = companyGSTIN;

    // Convert date strings to DateTime if provided
    if (invoiceData.dueDate) data.dueDate = new Date(invoiceData.dueDate);
    if (invoiceData.paymentDate) data.paymentDate = new Date(invoiceData.paymentDate);

    const invoice = await prisma.invoice.update({
      where: { id: req.params.id },
      data
    });

    // Transform invoice for frontend
    const transformedInvoice = transformInvoiceForFrontend(invoice);
    res.json(transformedInvoice);
  } catch (error) {
    console.error('Error updating invoice:', error);
    res.status(500).json({ error: 'Failed to update invoice', message: error.message });
  }
});

// DELETE invoice
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];

    if (!userId) {
      return res.status(401).json({ error: 'User ID is required' });
    }

    // First verify the invoice belongs to the user
    const existingInvoice = await prisma.invoice.findFirst({
      where: {
        id: req.params.id,
        userId
      }
    });

    if (!existingInvoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

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
    const userId = req.headers['x-user-id'];

    if (!userId) {
      return res.status(401).json({ error: 'User ID is required' });
    }

    const [total, paid, pending, overdue] = await Promise.all([
      prisma.invoice.count({ where: { userId } }),
      prisma.invoice.aggregate({
        where: { userId, status: 'paid' },
        _sum: { total: true }
      }),
      prisma.invoice.aggregate({
        where: { userId, status: 'sent' },
        _sum: { total: true }
      }),
      prisma.invoice.aggregate({
        where: { userId, status: 'overdue' },
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
