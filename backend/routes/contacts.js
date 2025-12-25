const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const { tenantContext, getTenantFilter, autoInjectTenantId } = require('../middleware/tenant');
const { getVisibilityFilter, validateAssignment } = require('../middleware/assignment');
const prisma = new PrismaClient();

// Apply authentication and tenant context to all routes
router.use(authenticate);
router.use(tenantContext);

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

// GET all contacts (with role-based visibility, pagination, and advanced filtering)
router.get('/', async (req, res) => {
  try {
    const {
      type,
      assignedTo,
      tags,
      search,
      page = '1',
      limit = '100',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Get role-based visibility filter
    const visibilityFilter = await getVisibilityFilter(req.user);

    // Build where clause with tenant filtering
    const where = getTenantFilter(req, { ...visibilityFilter });

    // Apply filters
    if (type && type !== 'all') where.type = type;
    if (assignedTo && assignedTo !== 'all') where.assignedTo = assignedTo;

    // Tags filter (multiple tags support)
    if (tags) {
      const tagArray = tags.split(',').map(t => t.trim());
      where.tags = { hasSome: tagArray };
    }

    // Search across multiple fields
    if (search && search.trim()) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { whatsapp: { contains: search } },
        { jobTitle: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Sorting
    const orderBy = {};
    orderBy[sortBy] = sortOrder;

    // Execute query with pagination
    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        orderBy,
        skip,
        take: limitNum,
      }),
      prisma.contact.count({ where })
    ]);

    // Transform contacts to match frontend format
    const transformedContacts = contacts.map(transformContactForFrontend);

    // Return paginated response
    res.json({
      data: transformedContacts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
        hasMore: skip + contacts.length < total,
      }
    });
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
      tenantId: req.tenant.id,
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

    // Only validate assignment if assignedTo is being changed
    if (contactData.assignedTo && contactData.assignedTo !== existingContact.assignedTo) {
      const { canAssignToByName } = require('../middleware/assignment');
      const canAssign = await canAssignToByName(req.user, contactData.assignedTo);

      if (!canAssign) {
        return res.status(403).json({
          error: 'Forbidden',
          message: `You do not have permission to assign to ${contactData.assignedTo}`
        });
      }
    }

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
