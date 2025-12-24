const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const automationService = require('../services/automation');
const { getVisibilityFilter, validateAssignment } = require('../middleware/assignment');
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

// GET all leads (with role-based visibility, pagination, and advanced filtering)
router.get('/', async (req, res) => {
  try {
    const {
      status,
      assignedTo,
      priority,
      tags,
      search,
      page = '1',
      limit = '100',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Get role-based visibility filter
    const visibilityFilter = await getVisibilityFilter(req.user);

    // Build where clause
    const where = { ...visibilityFilter };

    // Apply filters
    if (status && status !== 'all') where.status = status;
    if (assignedTo && assignedTo !== 'all') where.assignedTo = assignedTo;
    if (priority && priority !== 'all') where.priority = priority;

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
    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        orderBy,
        skip,
        take: limitNum,
      }),
      prisma.lead.count({ where })
    ]);

    // Return paginated response
    res.json({
      data: leads,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
        hasMore: skip + leads.length < total,
      }
    });
  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

// GET single lead by ID (with role-based visibility)
router.get('/:id', async (req, res) => {
  try {
    // Get role-based visibility filter
    const visibilityFilter = await getVisibilityFilter(req.user);

    const lead = await prisma.lead.findFirst({
      where: {
        id: req.params.id,
        ...visibilityFilter
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
router.post('/', validateAssignment, async (req, res) => {
  try {
    const userId = req.user.id;
    const leadData = req.body;

    // Auto-assign to creator if not specified
    const assignedTo = leadData.assignedTo || req.user.name;
    const createdBy = userId;

    // Check for duplicates based on email to prevent duplicate entries
    if (leadData.email) {
      const existingLead = await prisma.lead.findFirst({
        where: {
          userId,
          email: leadData.email
        }
      });

      if (existingLead) {
        return res.status(400).json({
          error: 'Duplicate lead',
          message: `A lead with email '${leadData.email}' already exists`
        });
      }
    }

    // Use transaction to ensure both Lead and Deal are created together
    const result = await prisma.$transaction(async (tx) => {
      // Create the Deal first in the pipeline
      const deal = await tx.deal.create({
        data: {
          title: `${leadData.company} - ${leadData.name}`,
          company: leadData.company,
          contactName: leadData.name,
          email: leadData.email,
          phone: leadData.phone || '',
          value: leadData.estimatedValue || 0,
          stage: mapLeadStatusToDealStage(leadData.status || 'new'),
          probability: leadData.priority === 'urgent' ? 80 : leadData.priority === 'high' ? 60 : leadData.priority === 'medium' ? 40 : 20,
          expectedCloseDate: leadData.nextFollowUpAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          assignedTo,
          createdBy,
          notes: leadData.notes || '',
          tags: leadData.tags || [],
          userId
        }
      });

      // Create the Lead and link it to the Deal
      const lead = await tx.lead.create({
        data: {
          ...leadData,
          assignedTo,
          createdBy,
          userId,
          dealId: deal.id
        }
      });

      return { lead, deal };
    });

    console.log(`Lead created with auto-generated Deal: Lead ${result.lead.id} -> Deal ${result.deal.id}`);

    // Trigger automation for lead creation
    try {
      await automationService.triggerAutomation('lead.created', {
        id: result.lead.id,
        name: result.lead.name,
        email: result.lead.email,
        company: result.lead.company,
        status: result.lead.status,
        entityType: 'Lead'
      }, req.user);
    } catch (automationError) {
      console.error('Error triggering lead creation automation:', automationError);
      // Don't fail the request if automation fails
    }

    res.status(201).json(result.lead);
  } catch (error) {
    console.error('Error creating lead:', error);
    res.status(500).json({ error: 'Failed to create lead', message: error.message });
  }
});

// PUT update lead (syncs with Deal if linked)
router.put('/:id', async (req, res) => {
  try {
    const updateData = req.body;

    // Get role-based visibility filter
    const visibilityFilter = await getVisibilityFilter(req.user);

    // First verify the lead is visible to the user
    const existingLead = await prisma.lead.findFirst({
      where: {
        id: req.params.id,
        ...visibilityFilter
      }
    });

    if (!existingLead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    // Only validate assignment if assignedTo is being changed
    if (updateData.assignedTo && updateData.assignedTo !== existingLead.assignedTo) {
      const { canAssignToByName } = require('../middleware/assignment');
      const canAssign = await canAssignToByName(req.user, updateData.assignedTo);

      if (!canAssign) {
        return res.status(403).json({
          error: 'Forbidden',
          message: `You do not have permission to assign to ${updateData.assignedTo}`
        });
      }
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
        if (updateData.email) dealUpdateData.email = updateData.email;
        if (updateData.phone !== undefined) dealUpdateData.phone = updateData.phone;
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

    // Trigger automation for status change
    if (updateData.status && updateData.status !== existingLead.status) {
      try {
        await automationService.triggerAutomation('lead.stage_changed', {
          id: result.id,
          name: result.name,
          email: result.email,
          company: result.company,
          fromStage: existingLead.status,
          toStage: updateData.status,
          entityType: 'Lead'
        }, req.user);
      } catch (automationError) {
        console.error('Error triggering lead status change automation:', automationError);
        // Don't fail the request if automation fails
      }
    }

    res.json(result);
  } catch (error) {
    console.error('Error updating lead:', error);
    res.status(500).json({ error: 'Failed to update lead', message: error.message });
  }
});

// DELETE lead (also deletes linked deal)
router.delete('/:id', async (req, res) => {
  try {
    // Get role-based visibility filter
    const visibilityFilter = await getVisibilityFilter(req.user);

    // First verify the lead is visible to the user
    const existingLead = await prisma.lead.findFirst({
      where: {
        id: req.params.id,
        ...visibilityFilter
      }
    });

    if (!existingLead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    // Check if user has permission to delete (only creator, assignee, or admin/manager)
    if (req.user.role !== 'ADMIN' &&
        req.user.role !== 'MANAGER' &&
        existingLead.createdBy !== req.user.id &&
        existingLead.assignedTo !== req.user.name) {
      return res.status(403).json({ error: 'You do not have permission to delete this lead' });
    }

    console.log('🗑️ Deleting lead:', req.params.id);

    // Use transaction to delete both lead and linked deal
    await prisma.$transaction(async (tx) => {
      // If lead has a linked deal, delete it first
      if (existingLead.dealId) {
        console.log('🗑️ Found linked deal:', existingLead.dealId, '- deleting it too');
        await tx.deal.delete({
          where: { id: existingLead.dealId }
        });
      }

      // Delete the lead
      await tx.lead.delete({
        where: { id: req.params.id }
      });
    });

    console.log('✅ Lead and linked deal deleted successfully');
    res.json({ message: 'Lead deleted successfully' });
  } catch (error) {
    console.error('Error deleting lead:', error);
    res.status(500).json({ error: 'Failed to delete lead' });
  }
});

// GET lead stats (with role-based visibility)
router.get('/stats/summary', async (req, res) => {
  try {
    // Get role-based visibility filter
    const visibilityFilter = await getVisibilityFilter(req.user);

    const [total, newLeads, qualified, totalValue] = await Promise.all([
      prisma.lead.count({ where: visibilityFilter }),
      prisma.lead.count({ where: { ...visibilityFilter, status: 'new' } }),
      prisma.lead.count({ where: { ...visibilityFilter, status: 'qualified' } }),
      prisma.lead.aggregate({
        where: visibilityFilter,
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

/**
 * Get documents for a specific lead
 * GET /api/leads/:id/documents
 */
router.get('/:id/documents', async (req, res) => {
  try {
    const leadId = req.params.id;

    // Get role-based visibility filter
    const visibilityFilter = await getVisibilityFilter(req.user);

    // Verify lead is visible to user
    const lead = await prisma.lead.findFirst({
      where: { id: leadId, ...visibilityFilter }
    });

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    // Get all documents for this lead
    const documents = await prisma.document.findMany({
      where: {
        entityType: 'Lead',
        entityId: leadId
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Add formatted file sizes
    const { formatFileSize } = require('../middleware/upload');
    const documentsWithSize = documents.map(doc => ({
      ...doc,
      formattedSize: formatFileSize(doc.fileSize)
    }));

    res.json(documentsWithSize);
  } catch (error) {
    console.error('Error fetching lead documents:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

/**
 * Upload document to a specific lead
 * POST /api/leads/:id/documents/upload
 */
router.post('/:id/documents/upload', async (req, res) => {
  const { uploadDocument } = require('../middleware/upload');
  const leadId = req.params.id;

  // Use multer middleware
  uploadDocument.single('file')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
      // Get role-based visibility filter
      const visibilityFilter = await getVisibilityFilter(req.user);

      // Verify lead is visible to user
      const lead = await prisma.lead.findFirst({
        where: { id: leadId, ...visibilityFilter }
      });

      if (!lead) {
        // Delete uploaded file
        const { deleteFile } = require('../middleware/upload');
        deleteFile(req.file.path);
        return res.status(404).json({ error: 'Lead not found' });
      }

      const { description, tags } = req.body;

      // Create document record
      const document = await prisma.document.create({
        data: {
          fileName: req.file.originalname,
          fileSize: req.file.size,
          mimeType: req.file.mimetype,
          filePath: req.file.path,
          entityType: 'Lead',
          entityId: leadId,
          description: description || null,
          uploadedBy: userId,
          userId,
          tags: tags ? (Array.isArray(tags) ? tags : JSON.parse(tags)) : []
        }
      });

      const { formatFileSize } = require('../middleware/upload');
      res.json({
        message: 'Document uploaded successfully',
        document: {
          ...document,
          formattedSize: formatFileSize(document.fileSize)
        }
      });
    } catch (error) {
      console.error('Error uploading document to lead:', error);

      // Delete uploaded file if database operation failed
      if (req.file) {
        const { deleteFile } = require('../middleware/upload');
        deleteFile(req.file.path);
      }

      res.status(500).json({ error: 'Failed to upload document' });
    }
  });
});

/**
 * Delete document from a specific lead
 * DELETE /api/leads/:id/documents/:docId
 */
router.delete('/:id/documents/:docId', async (req, res) => {
  try {
    const { id: leadId, docId } = req.params;

    // Get role-based visibility filter
    const visibilityFilter = await getVisibilityFilter(req.user);

    // Verify lead is visible to user
    const lead = await prisma.lead.findFirst({
      where: { id: leadId, ...visibilityFilter }
    });

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    // Get document
    const document = await prisma.document.findFirst({
      where: {
        id: docId,
        entityType: 'Lead',
        entityId: leadId
      }
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Check permission
    if (document.userId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Not authorized to delete this document' });
    }

    // Delete file from filesystem
    const { deleteFile } = require('../middleware/upload');
    deleteFile(document.filePath);

    // Delete document record
    await prisma.document.delete({
      where: { id: docId }
    });

    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Error deleting document from lead:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

/**
 * Bulk import leads from CSV
 * POST /api/leads/import
 */
router.post('/import', async (req, res) => {
  const { uploadVectorData } = require('../middleware/upload');
  const csvParser = require('csv-parser');
  const fs = require('fs');
  const stream = require('stream');

  // Use multer middleware for single file upload
  uploadVectorData.single('file')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const userId = req.user.id;
    const results = {
      total: 0,
      successful: 0,
      failed: 0,
      errors: []
    };

    try {
      const leads = [];

      // Parse CSV file
      await new Promise((resolve, reject) => {
        fs.createReadStream(req.file.path)
          .pipe(csvParser())
          .on('data', (row) => {
            leads.push(row);
          })
          .on('end', resolve)
          .on('error', reject);
      });

      results.total = leads.length;

      // Import leads one by one
      for (let i = 0; i < leads.length; i++) {
        const leadData = leads[i];

        try {
          // Map CSV columns to lead fields (flexible mapping)
          const lead = {
            name: leadData.name || leadData.Name || leadData.contact_name || '',
            email: leadData.email || leadData.Email || '',
            phone: leadData.phone || leadData.Phone || leadData.mobile || '',
            company: leadData.company || leadData.Company || '',
            status: leadData.status || leadData.Status || 'new',
            source: leadData.source || leadData.Source || 'import',
            priority: leadData.priority || leadData.Priority || 'medium',
            notes: leadData.notes || leadData.Notes || '',
            estimatedValue: parseFloat(leadData.estimated_value || leadData.EstimatedValue || leadData.value || 0),
            assignedTo: leadData.assigned_to || leadData.assignedTo || req.user.name,
            tags: leadData.tags ? (typeof leadData.tags === 'string' ? leadData.tags.split(',').map(t => t.trim()) : []) : [],
            userId
          };

          // Validate required fields
          if (!lead.name) {
            results.failed++;
            results.errors.push(`Row ${i + 1}: Missing required field 'name'`);
            continue;
          }

          // Check for duplicates based on email (skip if email matches existing lead)
          if (lead.email) {
            const existingLead = await prisma.lead.findFirst({
              where: {
                userId,
                email: lead.email
              }
            });

            if (existingLead) {
              results.failed++;
              results.errors.push(`Row ${i + 1}: Duplicate email '${lead.email}' - lead already exists`);
              continue;
            }
          }

          // Create lead and associated deal in transaction (properly linked)
          await prisma.$transaction(async (tx) => {
            // Create the Deal first
            const deal = await tx.deal.create({
              data: {
                title: `${lead.company} - ${lead.name}`,
                company: lead.company,
                contactName: lead.name,
                email: lead.email,
                phone: lead.phone || '',
                value: lead.estimatedValue,
                stage: mapLeadStatusToDealStage(lead.status),
                probability: lead.status === 'qualified' ? 60 : lead.status === 'proposal' ? 70 : 20,
                expectedCloseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                assignedTo: lead.assignedTo,
                createdBy: userId,
                notes: lead.notes,
                tags: lead.tags,
                userId: lead.userId
              }
            });

            // Create the Lead and link it to the Deal
            await tx.lead.create({
              data: {
                name: lead.name,
                email: lead.email,
                phone: lead.phone,
                company: lead.company,
                status: lead.status,
                source: lead.source,
                priority: lead.priority || 'medium',
                notes: lead.notes,
                estimatedValue: lead.estimatedValue,
                assignedTo: lead.assignedTo,
                createdBy: userId,
                tags: lead.tags,
                userId: lead.userId,
                dealId: deal.id  // Link to the created deal
              }
            });
          });

          results.successful++;
        } catch (error) {
          results.failed++;
          results.errors.push(`Row ${i + 1}: ${error.message}`);
          console.error(`Error importing lead row ${i + 1}:`, error);
        }
      }

      // Delete uploaded file
      fs.unlinkSync(req.file.path);

      res.json({
        message: `Imported ${results.successful} out of ${results.total} leads`,
        results
      });
    } catch (error) {
      console.error('Error importing leads:', error);

      // Delete uploaded file on error
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      res.status(500).json({ error: 'Failed to import leads', message: error.message });
    }
  });
});

module.exports = router;
