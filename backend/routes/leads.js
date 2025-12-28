const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const { tenantContext, getTenantFilter, autoInjectTenantId } = require('../middleware/tenant');
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

// Helper function: Get default lead stage for tenant
async function getDefaultLeadStage(tenantId) {
  const defaultStage = await prisma.pipelineStage.findFirst({
    where: {
      tenantId,
      isSystemDefault: true,
      stageType: { in: ['LEAD', 'BOTH'] }
    }
  });

  if (!defaultStage) {
    // Fallback: get any active lead stage
    const anyStage = await prisma.pipelineStage.findFirst({
      where: {
        tenantId,
        isActive: true,
        stageType: { in: ['LEAD', 'BOTH'] }
      },
      orderBy: { order: 'asc' }
    });

    if (!anyStage) {
      throw new Error('No lead stages found for tenant. Please create pipeline stages first.');
    }

    return anyStage;
  }

  return defaultStage;
}

// Apply authentication and tenant context to all lead routes
router.use(authenticate);
router.use(tenantContext);

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

    // Build where clause with tenant filtering
    const where = getTenantFilter(req, { ...visibilityFilter });

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

// POST create new lead (manual deal creation via separate endpoint)
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

    // Get default stage for lead (or use provided stageId)
    const defaultLeadStage = await getDefaultLeadStage(req.tenant.id);
    const leadStageId = leadData.stageId || defaultLeadStage.id;

    // Create the Lead only (no automatic deal creation)
    const lead = await prisma.lead.create({
      data: {
        ...leadData,
        assignedTo,
        createdBy,
        userId,
        tenantId: req.tenant.id,
        stageId: leadStageId,
        status: leadData.status || 'new' // Keep for backward compatibility
      }
    });

    console.log(`Lead created: ${lead.id} - Use /api/leads/${lead.id}/create-deal to manually convert to deal`);

    // Trigger automation for lead creation
    try {
      await automationService.triggerAutomation('lead.created', {
        id: lead.id,
        name: lead.name,
        email: lead.email,
        company: lead.company,
        status: lead.status,
        entityType: 'Lead'
      }, req.user);
    } catch (automationError) {
      console.error('Error triggering lead creation automation:', automationError);
      // Don't fail the request if automation fails
    }

    res.status(201).json(lead);
  } catch (error) {
    console.error('Error creating lead:', error);
    res.status(500).json({ error: 'Failed to create lead', message: error.message });
  }
});

// POST manually create a deal from a lead
router.post('/:id/create-deal', validateAssignment, async (req, res) => {
  try {
    const leadId = req.params.id;

    // Get role-based visibility filter
    const visibilityFilter = await getVisibilityFilter(req.user);

    // Verify lead exists and is visible to user
    const lead = await prisma.lead.findFirst({
      where: {
        id: leadId,
        ...visibilityFilter
      }
    });

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    // Check if lead already has a deal
    if (lead.dealId) {
      return res.status(400).json({
        error: 'Deal already exists',
        message: 'This lead already has an associated deal',
        dealId: lead.dealId
      });
    }

    // Use transaction to create deal and link to lead
    const result = await prisma.$transaction(async (tx) => {
      // Get lead stage
      const leadStage = await tx.pipelineStage.findUnique({
        where: { id: lead.stageId }
      });

      // Find suitable deal stage
      let dealStageId;
      if (leadStage && leadStage.stageType === 'BOTH') {
        // Use same stage if it works for both
        dealStageId = lead.stageId;
      } else {
        // Find first available deal stage
        const dealStage = await tx.pipelineStage.findFirst({
          where: {
            tenantId: req.tenant.id,
            stageType: { in: ['DEAL', 'BOTH'] },
            isActive: true
          },
          orderBy: { order: 'asc' }
        });
        dealStageId = dealStage?.id || lead.stageId; // Fallback to lead stage
      }

      // Create the Deal
      const deal = await tx.deal.create({
        data: {
          title: `${lead.company} - ${lead.name}`,
          company: lead.company,
          contactName: lead.name,
          email: lead.email,
          phone: lead.phone || '',
          value: lead.estimatedValue || 0,
          stage: mapLeadStatusToDealStage(lead.status || 'new'),
          stageId: dealStageId,
          probability: lead.priority === 'urgent' ? 80 : lead.priority === 'high' ? 60 : lead.priority === 'medium' ? 40 : 20,
          expectedCloseDate: lead.nextFollowUpAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          assignedTo: lead.assignedTo,
          createdBy: req.user.id,
          notes: lead.notes || '',
          tags: lead.tags || [],
          userId: lead.userId,
          tenantId: req.tenant.id
        }
      });

      // Link deal to lead
      const updatedLead = await tx.lead.update({
        where: { id: leadId },
        data: { dealId: deal.id }
      });

      return { deal, lead: updatedLead };
    });

    console.log(`Deal created manually from lead: Lead ${leadId} -> Deal ${result.deal.id}`);

    res.status(201).json({
      message: 'Deal created successfully from lead',
      deal: result.deal,
      lead: result.lead
    });
  } catch (error) {
    console.error('Error creating deal from lead:', error);
    res.status(500).json({ error: 'Failed to create deal', message: error.message });
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

        // Sync stageId if changed (NEW: Dynamic pipeline stages)
        if (updateData.stageId) {
          const pipelineStage = await tx.pipelineStage.findUnique({
            where: { id: updateData.stageId }
          });

          if (pipelineStage) {
            dealUpdateData.stageId = pipelineStage.id;
            // Keep old stage field in sync for backward compatibility
            dealUpdateData.stage = pipelineStage.slug;
          }
        }

        // Also sync status field for backward compatibility
        if (updateData.status) {
          // Find matching stage by slug
          const matchingStage = await tx.pipelineStage.findFirst({
            where: {
              tenantId: req.tenant.id,
              slug: updateData.status.toLowerCase().replace(/\s+/g, '-')
            }
          });

          if (matchingStage) {
            updateData.stageId = matchingStage.id;
            dealUpdateData.stageId = matchingStage.id;
            dealUpdateData.stage = matchingStage.slug;
          } else {
            // Fallback to old mapping
            dealUpdateData.stage = mapLeadStatusToDealStage(updateData.status);
          }
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

    // Trigger automation for stage change (using stageId for dynamic stages)
    if (updateData.stageId && updateData.stageId !== existingLead.stageId) {
      try {
        // Fetch stage details for better context
        const [fromStage, toStage] = await Promise.all([
          existingLead.stageId ? prisma.pipelineStage.findUnique({ where: { id: existingLead.stageId } }) : null,
          prisma.pipelineStage.findUnique({ where: { id: updateData.stageId } })
        ]);

        await automationService.triggerAutomation('lead.stage_changed', {
          id: result.id,
          name: result.name,
          email: result.email,
          company: result.company,
          fromStage: fromStage?.name || existingLead.status,
          toStage: toStage?.name || updateData.status,
          fromStageId: existingLead.stageId,
          toStageId: updateData.stageId,
          entityType: 'Lead'
        }, req.user);
      } catch (automationError) {
        console.error('Error triggering lead stage change automation:', automationError);
        // Don't fail the request if automation fails
      }
    } else if (updateData.status && updateData.status !== existingLead.status) {
      // Fallback for backward compatibility when only status is provided
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

    // CRITICAL: Add tenant filtering to prevent cross-tenant data leaks
    const where = getTenantFilter(req, visibilityFilter);

    // Get stage IDs for filtering (dynamic pipeline stages)
    const [newLeadStage, qualifiedStage] = await Promise.all([
      prisma.pipelineStage.findFirst({
        where: {
          tenantId: req.tenant.id,
          OR: [
            { isSystemDefault: true },
            { slug: 'new-lead' },
            { slug: 'new' }
          ]
        }
      }),
      prisma.pipelineStage.findFirst({
        where: {
          tenantId: req.tenant.id,
          slug: { in: ['qualified', 'qualification'] }
        }
      })
    ]);

    const [total, newLeads, qualified, totalValue] = await Promise.all([
      prisma.lead.count({ where }),
      newLeadStage ? prisma.lead.count({ where: { ...where, stageId: newLeadStage.id } }) : 0,
      qualifiedStage ? prisma.lead.count({ where: { ...where, stageId: qualifiedStage.id } }) : 0,
      prisma.lead.aggregate({
        where,
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
          tenantId: req.tenant.id,
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
          const rawSource = leadData.source || leadData.Source || '';
          // Valid sources: 'web-form', 'whatsapp', 'call', 'email', 'referral', 'social-media', 'missed-call'
          const validSources = ['web-form', 'whatsapp', 'call', 'email', 'referral', 'social-media', 'missed-call'];
          const normalizedSource = rawSource.toLowerCase().replace(/[\s_]/g, '-');
          const source = validSources.includes(normalizedSource) ? normalizedSource : 'referral'; // Default to 'referral' for imported leads

          const lead = {
            name: leadData.name || leadData.Name || leadData.contact_name || '',
            email: leadData.email || leadData.Email || '',
            phone: leadData.phone || leadData.Phone || leadData.mobile || '',
            company: leadData.company || leadData.Company || '',
            status: leadData.status || leadData.Status || 'new',
            source: source,
            priority: leadData.priority || leadData.Priority || 'medium',
            notes: leadData.notes || leadData.Notes || '',
            estimatedValue: parseFloat(leadData.estimated_value || leadData.EstimatedValue || leadData.value || 0) || 0,
            assignedTo: leadData.assigned_to || leadData.assignedTo || req.user.name,
            tags: leadData.tags ? (typeof leadData.tags === 'string' ? leadData.tags.split(',').map(t => t.trim()).filter(Boolean) : []) : [],
            userId
          };

          // Validate required fields
          if (!lead.name || lead.name.trim() === '') {
            results.failed++;
            results.errors.push(`Row ${i + 1}: Missing required field 'name'`);
            continue;
          }

          // Ensure company has a default value if empty
          if (!lead.company || lead.company.trim() === '') {
            lead.company = 'No company';
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

          // Get default stage or map from status
          // Default to "lead" stage if no status provided
          const leadStatus = lead.status || 'lead';
          let leadStageId;

          // Try to find stage by slug
          const matchingStage = await prisma.pipelineStage.findFirst({
            where: {
              tenantId: req.tenant.id,
              slug: leadStatus.toLowerCase().replace(/\s+/g, '-')
            }
          });
          leadStageId = matchingStage?.id;

          // Fallback to system default if no match found
          if (!leadStageId) {
            const defaultStage = await prisma.pipelineStage.findFirst({
              where: {
                tenantId: req.tenant.id,
                isSystemDefault: true
              }
            });
            leadStageId = defaultStage?.id;
          }

          // Create the Lead only (no automatic deal creation during import)
          await prisma.lead.create({
            data: {
              name: lead.name,
              email: lead.email,
              phone: lead.phone,
              company: lead.company,
              status: leadStatus, // Default to "lead" if not provided
              stageId: leadStageId,
              source: lead.source,
              priority: lead.priority || 'medium',
              notes: lead.notes,
              estimatedValue: lead.estimatedValue,
              assignedTo: lead.assignedTo,
              createdBy: userId,
              tags: lead.tags,
              userId: lead.userId,
              tenantId: req.tenant.id
            }
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
