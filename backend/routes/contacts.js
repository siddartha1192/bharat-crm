const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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

// GET all contacts
router.get('/', async (req, res) => {
  try {
    const { type, assignedTo } = req.query;
    const userId = req.headers['x-user-id'];

    if (!userId) {
      return res.status(401).json({ error: 'User ID is required' });
    }

    const where = { userId };

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

// GET single contact by ID
router.get('/:id', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];

    if (!userId) {
      return res.status(401).json({ error: 'User ID is required' });
    }

    const contact = await prisma.contact.findFirst({
      where: {
        id: req.params.id,
        userId
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
router.post('/', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];

    if (!userId) {
      return res.status(401).json({ error: 'User ID is required' });
    }

    // Remove auto-generated fields and transform address
    const { id, createdAt, updatedAt, address, ...contactData } = req.body;

    // Transform nested address to flat fields
    const data = {
      ...contactData,
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
router.put('/:id', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];

    if (!userId) {
      return res.status(401).json({ error: 'User ID is required' });
    }

    // First verify the contact belongs to the user
    const existingContact = await prisma.contact.findFirst({
      where: {
        id: req.params.id,
        userId
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
    const userId = req.headers['x-user-id'];

    if (!userId) {
      return res.status(401).json({ error: 'User ID is required' });
    }

    // First verify the contact belongs to the user
    const existingContact = await prisma.contact.findFirst({
      where: {
        id: req.params.id,
        userId
      }
    });

    if (!existingContact) {
      return res.status(404).json({ error: 'Contact not found' });
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

// GET contact stats
router.get('/stats/summary', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];

    if (!userId) {
      return res.status(401).json({ error: 'User ID is required' });
    }

    const [total, customers, prospects, totalValue] = await Promise.all([
      prisma.contact.count({ where: { userId } }),
      prisma.contact.count({ where: { userId, type: 'customer' } }),
      prisma.contact.count({ where: { userId, type: 'prospect' } }),
      prisma.contact.aggregate({
        where: { userId },
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
