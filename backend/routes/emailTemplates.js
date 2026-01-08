const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { authenticate } = require('../middleware/auth');
const EmailTemplateService = require('../services/emailTemplate');
const emailService = require('../services/email');

/**
 * Email Template Management Routes
 * Enterprise-level CRUD operations with versioning, preview, and testing
 */

// ==========================================
// GET ALL TEMPLATES
// ==========================================

/**
 * GET /api/email-templates
 * Get all templates for the tenant
 * Query params: type (optional), isActive (optional)
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { type, isActive } = req.query;
    const { tenantId, role } = req.user;

    // Only admins can view templates
    if (role !== 'ADMIN') {
      return res.status(403).json({ error: 'Only admins can manage email templates' });
    }

    const where = { tenantId };

    if (type) {
      where.type = type;
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const templates = await prisma.emailTemplate.findMany({
      where,
      include: {
        createdByUser: {
          select: { id: true, name: true, email: true },
        },
        lastEditedByUser: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: [
        { isDefault: 'desc' },
        { type: 'asc' },
        { updatedAt: 'desc' },
      ],
    });

    res.json(templates);
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// ==========================================
// GET TEMPLATE BY ID
// ==========================================

/**
 * GET /api/email-templates/:id
 * Get specific template with version history
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { tenantId, role } = req.user;

    if (role !== 'ADMIN') {
      return res.status(403).json({ error: 'Only admins can manage email templates' });
    }

    const template = await prisma.emailTemplate.findFirst({
      where: { id, tenantId },
      include: {
        createdByUser: {
          select: { id: true, name: true, email: true },
        },
        lastEditedByUser: {
          select: { id: true, name: true, email: true },
        },
        versions: {
          orderBy: { version: 'desc' },
          take: 10, // Last 10 versions
          include: {
            changedByUser: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json(template);
  } catch (error) {
    console.error('Error fetching template:', error);
    res.status(500).json({ error: 'Failed to fetch template' });
  }
});

// ==========================================
// CREATE TEMPLATE
// ==========================================

/**
 * POST /api/email-templates
 * Create a new email template
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const { name, description, type, subject, htmlBody, variables, isActive } = req.body;
    const { tenantId, id: userId, role } = req.user;

    if (role !== 'ADMIN') {
      return res.status(403).json({ error: 'Only admins can manage email templates' });
    }

    // Validate required fields
    if (!name || !type || !subject || !htmlBody) {
      return res.status(400).json({ error: 'Name, type, subject, and htmlBody are required' });
    }

    // Validate template type
    const validTypes = ['password_reset', 'reminder', 'invoice', 'new_user', 'form_embed', 'lead_created', 'stage_change', 'custom'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: `Invalid template type. Must be one of: ${validTypes.join(', ')}` });
    }

    const template = await prisma.emailTemplate.create({
      data: {
        name,
        description,
        type,
        subject,
        htmlBody,
        variables: variables || EmailTemplateService.getAvailableVariablesByType(type),
        isActive: isActive !== undefined ? isActive : true,
        isDefault: false,
        tenantId,
        createdBy: userId,
        version: 1,
      },
      include: {
        createdByUser: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Create initial version
    await prisma.emailTemplateVersion.create({
      data: {
        templateId: template.id,
        version: 1,
        subject,
        htmlBody,
        changedBy: userId,
        tenantId,
        changeNotes: 'Initial version',
      },
    });

    res.status(201).json(template);
  } catch (error) {
    console.error('Error creating template:', error);

    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'A default template of this type already exists' });
    }

    res.status(500).json({ error: 'Failed to create template' });
  }
});

// ==========================================
// UPDATE TEMPLATE
// ==========================================

/**
 * PUT /api/email-templates/:id
 * Update an existing template (creates new version)
 */
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, subject, htmlBody, variables, isActive, changeNotes } = req.body;
    const { tenantId, id: userId, role } = req.user;

    if (role !== 'ADMIN') {
      return res.status(403).json({ error: 'Only admins can manage email templates' });
    }

    // Check if template exists and belongs to tenant
    const existingTemplate = await prisma.emailTemplate.findFirst({
      where: { id, tenantId },
    });

    if (!existingTemplate) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Prepare update data
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (variables !== undefined) updateData.variables = variables;

    // Check if content changed (subject or htmlBody)
    const contentChanged = (subject && subject !== existingTemplate.subject) ||
                          (htmlBody && htmlBody !== existingTemplate.htmlBody);

    if (contentChanged) {
      if (subject) updateData.subject = subject;
      if (htmlBody) updateData.htmlBody = htmlBody;

      // Create version and update template
      const template = await EmailTemplateService.createVersion(
        id,
        updateData,
        userId,
        tenantId,
        changeNotes || 'Template updated'
      );

      return res.json(template);
    } else {
      // Only metadata changed, no need for versioning
      const template = await prisma.emailTemplate.update({
        where: { id },
        data: {
          ...updateData,
          lastEditedBy: userId,
        },
        include: {
          createdByUser: {
            select: { id: true, name: true, email: true },
          },
          lastEditedByUser: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      return res.json(template);
    }
  } catch (error) {
    console.error('Error updating template:', error);
    res.status(500).json({ error: 'Failed to update template' });
  }
});

// ==========================================
// DELETE TEMPLATE
// ==========================================

/**
 * DELETE /api/email-templates/:id
 * Delete a template (cannot delete default templates)
 */
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { tenantId, role } = req.user;

    if (role !== 'ADMIN') {
      return res.status(403).json({ error: 'Only admins can manage email templates' });
    }

    const template = await prisma.emailTemplate.findFirst({
      where: { id, tenantId },
    });

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    if (template.isDefault) {
      return res.status(400).json({ error: 'Cannot delete default templates' });
    }

    await prisma.emailTemplate.delete({
      where: { id },
    });

    res.json({ message: 'Template deleted successfully' });
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

// ==========================================
// PREVIEW TEMPLATE
// ==========================================

/**
 * POST /api/email-templates/preview
 * Preview template with sample data
 */
router.post('/preview', authenticate, async (req, res) => {
  try {
    const { subject, htmlBody, type, variables } = req.body;
    const { role } = req.user;

    if (role !== 'ADMIN') {
      return res.status(403).json({ error: 'Only admins can preview templates' });
    }

    if (!subject || !htmlBody) {
      return res.status(400).json({ error: 'Subject and htmlBody are required' });
    }

    let preview;
    if (variables) {
      // Use provided variables
      preview = {
        subject: EmailTemplateService.renderTemplate(subject, variables),
        htmlBody: EmailTemplateService.renderTemplate(htmlBody, variables),
      };
    } else {
      // Use sample data based on type
      preview = EmailTemplateService.previewTemplate(subject, htmlBody, type || 'custom');
    }

    res.json(preview);
  } catch (error) {
    console.error('Error previewing template:', error);
    res.status(500).json({ error: 'Failed to preview template' });
  }
});

// ==========================================
// SEND TEST EMAIL
// ==========================================

/**
 * POST /api/email-templates/:id/test
 * Send a test email using the template
 */
router.post('/:id/test', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { testEmail, variables } = req.body;
    const { tenantId, id: userId, role, email: userEmail } = req.user;

    if (role !== 'ADMIN') {
      return res.status(403).json({ error: 'Only admins can send test emails' });
    }

    const template = await prisma.emailTemplate.findFirst({
      where: { id, tenantId },
    });

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Use test email or user's email
    const recipientEmail = testEmail || userEmail;

    // Render template with provided variables or sample data
    const renderVariables = variables ||
      EmailTemplateService.getAvailableVariablesByType(template.type)
        .reduce((acc, v) => ({ ...acc, [v.name]: v.example }), {});

    const renderedSubject = EmailTemplateService.renderTemplate(template.subject, renderVariables);
    const renderedHtmlBody = EmailTemplateService.renderTemplate(template.htmlBody, renderVariables);

    // Send test email
    await emailService.sendEmail({
      to: [recipientEmail],
      subject: `[TEST] ${renderedSubject}`,
      body: renderedHtmlBody,
      htmlBody: renderedHtmlBody,
      userId,
      tenantId,
      entityType: 'EmailTemplate',
      entityId: id,
    });

    // Track test usage
    await EmailTemplateService.trackUsage(id, true);

    res.json({ message: 'Test email sent successfully', to: recipientEmail });
  } catch (error) {
    console.error('Error sending test email:', error);
    res.status(500).json({ error: 'Failed to send test email' });
  }
});

// ==========================================
// GET TEMPLATE TYPES
// ==========================================

/**
 * GET /api/email-templates/types
 * Get all available template types with descriptions
 */
router.get('/meta/types', authenticate, async (req, res) => {
  try {
    const types = [
      {
        value: 'password_reset',
        label: 'Password Reset',
        description: 'Email sent when user requests password reset',
        icon: '🔐',
      },
      {
        value: 'reminder',
        label: 'Reminder Notification',
        description: 'Email sent for lead reminders and follow-ups',
        icon: '⏰',
      },
      {
        value: 'invoice',
        label: 'Billing Invoice',
        description: 'Email sent with billing invoices',
        icon: '💳',
      },
      {
        value: 'new_user',
        label: 'New User Welcome',
        description: 'Email sent when new user account is created',
        icon: '👋',
      },
      {
        value: 'form_embed',
        label: 'Form Submission',
        description: 'Email sent when lead submits embedded form',
        icon: '📝',
      },
      {
        value: 'lead_created',
        label: 'Lead Created',
        description: 'Automated email when new lead is created',
        icon: '🎯',
      },
      {
        value: 'stage_change',
        label: 'Stage Change',
        description: 'Automated email when lead stage changes',
        icon: '📊',
      },
      {
        value: 'custom',
        label: 'Custom Template',
        description: 'Custom template for manual use',
        icon: '✨',
      },
    ];

    res.json(types);
  } catch (error) {
    console.error('Error fetching template types:', error);
    res.status(500).json({ error: 'Failed to fetch template types' });
  }
});

// ==========================================
// GET AVAILABLE VARIABLES
// ==========================================

/**
 * GET /api/email-templates/variables/:type
 * Get available variables for a template type
 */
router.get('/meta/variables/:type', authenticate, async (req, res) => {
  try {
    const { type } = req.params;
    const variables = EmailTemplateService.getAvailableVariablesByType(type);
    res.json(variables);
  } catch (error) {
    console.error('Error fetching variables:', error);
    res.status(500).json({ error: 'Failed to fetch variables' });
  }
});

// ==========================================
// DUPLICATE TEMPLATE
// ==========================================

/**
 * POST /api/email-templates/:id/duplicate
 * Duplicate an existing template
 */
router.post('/:id/duplicate', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { tenantId, id: userId, role } = req.user;

    if (role !== 'ADMIN') {
      return res.status(403).json({ error: 'Only admins can manage email templates' });
    }

    const sourceTemplate = await prisma.emailTemplate.findFirst({
      where: { id, tenantId },
    });

    if (!sourceTemplate) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Create duplicate
    const duplicate = await prisma.emailTemplate.create({
      data: {
        name: `${sourceTemplate.name} (Copy)`,
        description: sourceTemplate.description,
        type: sourceTemplate.type,
        subject: sourceTemplate.subject,
        htmlBody: sourceTemplate.htmlBody,
        variables: sourceTemplate.variables,
        isActive: false, // Start as inactive
        isDefault: false, // Cannot be default
        tenantId,
        createdBy: userId,
        version: 1,
      },
      include: {
        createdByUser: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Create initial version for duplicate
    await prisma.emailTemplateVersion.create({
      data: {
        templateId: duplicate.id,
        version: 1,
        subject: duplicate.subject,
        htmlBody: duplicate.htmlBody,
        changedBy: userId,
        tenantId,
        changeNotes: `Duplicated from: ${sourceTemplate.name}`,
      },
    });

    res.status(201).json(duplicate);
  } catch (error) {
    console.error('Error duplicating template:', error);
    res.status(500).json({ error: 'Failed to duplicate template' });
  }
});

// ==========================================
// GET TEMPLATE ANALYTICS
// ==========================================

/**
 * GET /api/email-templates/analytics
 * Get template usage analytics
 */
router.get('/meta/analytics', authenticate, async (req, res) => {
  try {
    const { tenantId, role } = req.user;

    if (role !== 'ADMIN') {
      return res.status(403).json({ error: 'Only admins can view analytics' });
    }

    const templates = await prisma.emailTemplate.findMany({
      where: { tenantId },
      select: {
        id: true,
        name: true,
        type: true,
        usageCount: true,
        testEmailCount: true,
        lastUsedAt: true,
        lastTestedAt: true,
        isActive: true,
      },
      orderBy: { usageCount: 'desc' },
    });

    const analytics = {
      totalTemplates: templates.length,
      activeTemplates: templates.filter(t => t.isActive).length,
      totalUsage: templates.reduce((sum, t) => sum + t.usageCount, 0),
      totalTests: templates.reduce((sum, t) => sum + t.testEmailCount, 0),
      mostUsedTemplates: templates.slice(0, 5),
      templatesByType: templates.reduce((acc, t) => {
        acc[t.type] = (acc[t.type] || 0) + 1;
        return acc;
      }, {}),
    };

    res.json(analytics);
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

module.exports = router;
