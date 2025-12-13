const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const prisma = new PrismaClient();

// Apply authentication to all routes
router.use(authenticate);

// Global search endpoint
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const { q } = req.query;

    if (!q || q.trim().length < 2) {
      return res.json({ results: [] });
    }

    const searchQuery = q.trim();
    const results = [];

    // Search Contacts
    const contacts = await prisma.contact.findMany({
      where: {
        userId,
        OR: [
          { name: { contains: searchQuery, mode: 'insensitive' } },
          { company: { contains: searchQuery, mode: 'insensitive' } },
          { email: { contains: searchQuery, mode: 'insensitive' } },
          { phone: { contains: searchQuery } },
          { designation: { contains: searchQuery, mode: 'insensitive' } },
        ],
      },
      take: 5,
    });

    contacts.forEach((contact) => {
      results.push({
        id: contact.id,
        type: 'contact',
        title: contact.name,
        subtitle: `${contact.company} · ${contact.designation}`,
        metadata: contact.email,
      });
    });

    // Search Leads
    const leads = await prisma.lead.findMany({
      where: {
        userId,
        OR: [
          { name: { contains: searchQuery, mode: 'insensitive' } },
          { company: { contains: searchQuery, mode: 'insensitive' } },
          { email: { contains: searchQuery, mode: 'insensitive' } },
          { phone: { contains: searchQuery } },
        ],
      },
      take: 5,
    });

    leads.forEach((lead) => {
      results.push({
        id: lead.id,
        type: 'lead',
        title: lead.name,
        subtitle: `${lead.company} · ${lead.status}`,
        metadata: `₹${lead.estimatedValue.toLocaleString()} · ${lead.priority} priority`,
      });
    });

    // Search Tasks
    const tasks = await prisma.task.findMany({
      where: {
        userId,
        OR: [
          { title: { contains: searchQuery, mode: 'insensitive' } },
          { description: { contains: searchQuery, mode: 'insensitive' } },
        ],
      },
      take: 5,
    });

    tasks.forEach((task) => {
      results.push({
        id: task.id,
        type: 'task',
        title: task.title,
        subtitle: task.description.substring(0, 100),
        metadata: `${task.status} · ${task.priority} priority · Due: ${new Date(task.dueDate).toLocaleDateString()}`,
      });
    });

    // Search Deals
    const deals = await prisma.deal.findMany({
      where: {
        userId,
        OR: [
          { title: { contains: searchQuery, mode: 'insensitive' } },
          { company: { contains: searchQuery, mode: 'insensitive' } },
          { contactName: { contains: searchQuery, mode: 'insensitive' } },
        ],
      },
      take: 5,
    });

    deals.forEach((deal) => {
      results.push({
        id: deal.id,
        type: 'deal',
        title: deal.title,
        subtitle: `${deal.company} · ${deal.stage}`,
        metadata: `₹${deal.value.toLocaleString()} · ${deal.probability}% probability`,
      });
    });

    // Search Invoices
    const invoices = await prisma.invoice.findMany({
      where: {
        userId,
        OR: [
          { invoiceNumber: { contains: searchQuery, mode: 'insensitive' } },
          { customerName: { contains: searchQuery, mode: 'insensitive' } },
          { customerEmail: { contains: searchQuery, mode: 'insensitive' } },
        ],
      },
      take: 5,
    });

    invoices.forEach((invoice) => {
      results.push({
        id: invoice.id,
        type: 'invoice',
        title: invoice.invoiceNumber,
        subtitle: `${invoice.customerName} · ${invoice.status}`,
        metadata: `₹${invoice.total.toLocaleString()} · Due: ${new Date(invoice.dueDate).toLocaleDateString()}`,
      });
    });

    // Search Calendar Events
    const events = await prisma.calendarEvent.findMany({
      where: {
        userId,
        OR: [
          { title: { contains: searchQuery, mode: 'insensitive' } },
          { description: { contains: searchQuery, mode: 'insensitive' } },
          { location: { contains: searchQuery, mode: 'insensitive' } },
        ],
      },
      take: 5,
    });

    events.forEach((event) => {
      results.push({
        id: event.id,
        type: 'event',
        title: event.title,
        subtitle: event.description || 'No description',
        metadata: `${new Date(event.startTime).toLocaleString()} ${event.location ? '· ' + event.location : ''}`,
      });
    });

    // Sort results by relevance (you can implement more sophisticated sorting)
    // For now, just return them

    res.json({ results, total: results.length });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed', message: error.message });
  }
});

module.exports = router;
