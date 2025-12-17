const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const { getVisibilityFilter, validateAssignment } = require('../middleware/assignment');
const prisma = new PrismaClient();

// Apply authentication to all routes
router.use(authenticate);

// Helper function to transform contact data
const transformContactForFrontend = (contact) => {
  const { addressStreet, addressCity, addressState, addressPincode, addressCountry, ...rest } = contact;
  return {
    ...rest,
    address: {
      street: addressStreet,
      city: addressCity,
      state: addressState,
      pincode: addressPincode,
      country: addressCountry,
    }
  };
};

// GET all contacts (with role-based visibility)
router.get('/', async (req, res) => {
  try {
    const { type, assignedTo } = req.query;

    // Get role-based visibility filter
    const visibilityFilter = await getVisibilityFilter(req.user);

    // Build where clause
    const where = { ...visibilityFilter };

    if (type && type !== 'all') where.type = type;
    if (assignedTo) where.assignedTo = assignedTo;

    const contacts = await prisma.contact.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    // Transform contacts to match frontend format
    const transformedContacts = contacts.map(transformContactForFrontend);
    res.json(transformedContacts);
  } catch (error) {
    console.error('Error fetching contacts:', error);
    res.status(500).json({ error: 'Failed to fetch contacts' });
  }
});

// GET single contact by ID (with role-based visibility)
router.get('/:id', async (req, res) => {
  try {
    // Get role-based visibility filter
    const visibilityFilter = await getVisibilityFilter(req.user);

    const contact = await prisma.contact.findFirst({
      where: {
        id: req.params.id,
        ...visibilityFilter
      }
    });

    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    // Transform contact to match frontend format
    const transformedContact = transformContactForFrontend(contact);
    res.json(transformedContact);
  } catch (error) {
    console.error('Error fetching contact:', error);
    res.status(500).json({ error: 'Failed to fetch contact' });
  }
});

// POST create new contact
router.post('/', validateAssignment, async (req, res) => {
  try {
    const userId = req.user.id;

    // Remove auto-generated fields and transform address
    const { id, createdAt, updatedAt, address, ...contactData } = req.body;

    // Auto-assign to creator if not specified
    const assignedTo = contactData.assignedTo || req.user.name;
    const createdBy = userId;

    // Transform nested address to flat fields
    const data = {
      ...contactData,
      assignedTo,
      createdBy,
      userId,
      addressStreet: address?.street || '',
      addressCity: address?.city || '',
      addressState: address?.state || '',
      addressPincode: address?.pincode || '',
      addressCountry: address?.country || 'India',
      notes: contactData.notes || '',
      tags: contactData.tags || [],
      lifetimeValue: contactData.lifetimeValue || 0,
    };

    const contact = await prisma.contact.create({
      data
    });

    // Transform contact to match frontend format
    const transformedContact = transformContactForFrontend(contact);
    res.status(201).json(transformedContact);
  } catch (error) {
    console.error('Error creating contact:', error);
    res.status(500).json({ error: 'Failed to create contact', message: error.message });
  }
});

// PUT update contact
router.put('/:id', validateAssignment, async (req, res) => {
  try {
    // Get role-based visibility filter
    const visibilityFilter = await getVisibilityFilter(req.user);

    // First verify the contact is visible to the user
    const existingContact = await prisma.contact.findFirst({
      where: {
        id: req.params.id,
        ...visibilityFilter
      }
    });

    if (!existingContact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    // Remove auto-generated fields and transform address
    const { id, createdAt, updatedAt, address, ...contactData } = req.body;

    // Transform nested address to flat fields if address is provided
    const data = { ...contactData };
    if (address) {
      data.addressStreet = address.street || '';
      data.addressCity = address.city || '';
      data.addressState = address.state || '';
      data.addressPincode = address.pincode || '';
      data.addressCountry = address.country || 'India';
    }

    const contact = await prisma.contact.update({
      where: { id: req.params.id },
      data
    });

    // Transform contact to match frontend format
    const transformedContact = transformContactForFrontend(contact);
    res.json(transformedContact);
  } catch (error) {
    console.error('Error updating contact:', error);
    res.status(500).json({ error: 'Failed to update contact', message: error.message });
  }
});

// DELETE contact
router.delete('/:id', async (req, res) => {
  try {
    // Get role-based visibility filter
    const visibilityFilter = await getVisibilityFilter(req.user);

    // First verify the contact is visible to the user
    const existingContact = await prisma.contact.findFirst({
      where: {
        id: req.params.id,
        ...visibilityFilter
      }
    });

    if (!existingContact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    // Check if user has permission to delete (only creator, assignee, or admin/manager)
    if (req.user.role !== 'ADMIN' &&
        req.user.role !== 'MANAGER' &&
        existingContact.createdBy !== req.user.id &&
        existingContact.assignedTo !== req.user.name) {
      return res.status(403).json({ error: 'You do not have permission to delete this contact' });
    }

    await prisma.contact.delete({
      where: { id: req.params.id }
    });

    res.json({ message: 'Contact deleted successfully' });
  } catch (error) {
    console.error('Error deleting contact:', error);
    res.status(500).json({ error: 'Failed to delete contact' });
  }
});

// GET contact stats (with role-based visibility)
router.get('/stats/summary', async (req, res) => {
  try {
    // Get role-based visibility filter
    const visibilityFilter = await getVisibilityFilter(req.user);

    const [total, customers, prospects, totalValue] = await Promise.all([
      prisma.contact.count({ where: visibilityFilter }),
      prisma.contact.count({ where: { ...visibilityFilter, type: 'customer' } }),
      prisma.contact.count({ where: { ...visibilityFilter, type: 'prospect' } }),
      prisma.contact.aggregate({
        where: visibilityFilter,
        _sum: { lifetimeValue: true }
      })
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
