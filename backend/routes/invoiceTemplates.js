const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { authenticate, authorize } = require('../middleware/auth');
const { tenantContext } = require('../middleware/tenant');
const invoiceTemplateService = require('../services/invoiceTemplate');

// Apply authentication and tenant context to all routes
router.use(authenticate);
router.use(tenantContext);

/**
 * GET /invoice-templates
 * List all invoice templates for tenant (ADMIN/MANAGER only)
 */
router.get('/', authorize('MANAGER', 'ADMIN'), async (req, res) => {
  try {
    const templates = await prisma.invoiceTemplate.findMany({
      where: {
        tenantId: req.tenant.id
      },
      include: {
        createdByUser: {
          select: { id: true, name: true, email: true }
        },
        lastEditedByUser: {
          select: { id: true, name: true, email: true }
        },
        _count: {
          select: { versions: true }
        }
      },
      orderBy: [
        { isDefault: 'desc' },
        { updatedAt: 'desc' }
      ]
    });

    res.json(templates);
  } catch (error) {
    console.error('Error fetching invoice templates:', error);
    res.status(500).json({ error: 'Failed to fetch invoice templates' });
  }
});

/**
 * GET /invoice-templates/:id
 * Get specific template with version history
 */
router.get('/:id', authorize('MANAGER', 'ADMIN'), async (req, res) => {
  try {
    const template = await prisma.invoiceTemplate.findFirst({
      where: {
        id: req.params.id,
        tenantId: req.tenant.id
      },
      include: {
        createdByUser: {
          select: { id: true, name: true, email: true }
        },
        lastEditedByUser: {
          select: { id: true, name: true, email: true }
        },
        versions: {
          include: {
            changedByUser: {
              select: { id: true, name: true, email: true }
            }
          },
          orderBy: { version: 'desc' },
          take: 10 // Last 10 versions
        }
      }
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

/**
 * POST /invoice-templates
 * Create new invoice template
 */
router.post('/', authorize('MANAGER', 'ADMIN'), async (req, res) => {
  try {
    const { name, description, htmlTemplate, variables, isDefault } = req.body;

    if (!name || !htmlTemplate) {
      return res.status(400).json({ error: 'Name and HTML template are required' });
    }

    // If setting as default, unset other defaults first
    if (isDefault) {
      await prisma.invoiceTemplate.updateMany({
        where: {
          tenantId: req.tenant.id,
          isDefault: true
        },
        data: {
          isDefault: false
        }
      });
    }

    const template = await prisma.invoiceTemplate.create({
      data: {
        name,
        description,
        htmlTemplate,
        variables: variables || [],
        isDefault: isDefault || false,
        isActive: true,
        tenantId: req.tenant.id,
        createdBy: req.user.id
      },
      include: {
        createdByUser: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    res.status(201).json(template);
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({ error: 'Failed to create template', message: error.message });
  }
});

/**
 * PUT /invoice-templates/:id
 * Update invoice template (creates version)
 */
router.put('/:id', authorize('MANAGER', 'ADMIN'), async (req, res) => {
  try {
    const { name, description, htmlTemplate, variables, isActive, isDefault, changeNotes } = req.body;

    // Verify template exists and belongs to tenant
    const existingTemplate = await prisma.invoiceTemplate.findFirst({
      where: {
        id: req.params.id,
        tenantId: req.tenant.id
      }
    });

    if (!existingTemplate) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // If setting as default, unset other defaults first
    if (isDefault && !existingTemplate.isDefault) {
      await prisma.invoiceTemplate.updateMany({
        where: {
          tenantId: req.tenant.id,
          isDefault: true,
          id: { not: req.params.id }
        },
        data: {
          isDefault: false
        }
      });
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (htmlTemplate !== undefined) updateData.htmlTemplate = htmlTemplate;
    if (variables !== undefined) updateData.variables = variables;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (isDefault !== undefined) updateData.isDefault = isDefault;

    // Create version and update template
    const updatedTemplate = await invoiceTemplateService.createVersion(
      req.params.id,
      updateData,
      req.user.id,
      req.tenant.id,
      changeNotes || 'Template updated'
    );

    // Fetch updated template with relations
    const template = await prisma.invoiceTemplate.findUnique({
      where: { id: updatedTemplate.id },
      include: {
        createdByUser: {
          select: { id: true, name: true, email: true }
        },
        lastEditedByUser: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    res.json(template);
  } catch (error) {
    console.error('Error updating template:', error);
    res.status(500).json({ error: 'Failed to update template', message: error.message });
  }
});

/**
 * DELETE /invoice-templates/:id
 * Delete invoice template (cannot delete default)
 */
router.delete('/:id', authorize('ADMIN'), async (req, res) => {
  try {
    const template = await prisma.invoiceTemplate.findFirst({
      where: {
        id: req.params.id,
        tenantId: req.tenant.id
      }
    });

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    if (template.isDefault) {
      return res.status(400).json({ error: 'Cannot delete default template. Set another template as default first.' });
    }

    await prisma.invoiceTemplate.delete({
      where: { id: req.params.id }
    });

    res.json({ message: 'Template deleted successfully' });
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

/**
 * POST /invoice-templates/preview
 * Preview template with sample data
 */
router.post('/preview', authorize('MANAGER', 'ADMIN'), async (req, res) => {
  try {
    const { htmlTemplate, sampleData } = req.body;

    if (!htmlTemplate) {
      return res.status(400).json({ error: 'HTML template is required' });
    }

    // Use sample data if provided, otherwise use default sample
    const data = sampleData || {
      invoiceNumber: 'INV-2024-001',
      invoiceDate: '15 Jan 2024',
      dueDate: '30 Jan 2024',
      status: 'Paid',
      statusClass: 'paid',
      companyName: 'Bharat CRM Solutions Pvt Ltd',
      companyAddress: '123 Business Park, Andheri East, Mumbai - 400069, Maharashtra, India',
      companyGSTIN: '27AABCU9603R1ZM',
      companyPAN: 'AABCU9603R',
      customerName: 'ABC Corporation',
      customerAddress: '456 Client Street, Connaught Place, New Delhi - 110001, Delhi, India',
      customerEmail: 'contact@abc.com',
      customerPhone: '+91 98765 43210',
      customerGSTIN: '07AABCU9603R1ZM',
      lineItems: `
        <tr>
          <td class="text-center">1</td>
          <td>Web Development Services</td>
          <td>998314</td>
          <td class="text-center">1 Month</td>
          <td class="text-right">₹50,000.00</td>
          <td class="text-right">18%</td>
          <td class="text-right">₹0.00</td>
          <td class="text-right">₹50,000.00</td>
        </tr>
        <tr>
          <td class="text-center">2</td>
          <td>Hosting & Maintenance</td>
          <td>998315</td>
          <td class="text-center">1 Month</td>
          <td class="text-right">₹10,000.00</td>
          <td class="text-right">18%</td>
          <td class="text-right">₹0.00</td>
          <td class="text-right">₹10,000.00</td>
        </tr>
      `,
      subtotal: '60,000.00',
      totalDiscount: null,
      cgst: '5,400.00',
      sgst: '5,400.00',
      igst: null,
      totalTax: '10,800.00',
      roundOff: '0.00',
      total: '70,800.00',
      paymentMethod: 'Bank Transfer',
      paymentDate: '20 Jan 2024',
      notes: 'Payment due within 15 days. Late payments subject to 18% annual interest.'
    };

    const rendered = await invoiceTemplateService.previewTemplate(htmlTemplate, data);

    res.json({ html: rendered });
  } catch (error) {
    console.error('Error previewing template:', error);
    res.status(500).json({ error: 'Failed to preview template', message: error.message });
  }
});

/**
 * POST /invoice-templates/:id/duplicate
 * Duplicate a template
 */
router.post('/:id/duplicate', authorize('MANAGER', 'ADMIN'), async (req, res) => {
  try {
    const template = await prisma.invoiceTemplate.findFirst({
      where: {
        id: req.params.id,
        tenantId: req.tenant.id
      }
    });

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const duplicate = await prisma.invoiceTemplate.create({
      data: {
        name: `${template.name} (Copy)`,
        description: template.description,
        htmlTemplate: template.htmlTemplate,
        variables: template.variables,
        isActive: false, // Duplicates start as inactive
        isDefault: false,
        tenantId: req.tenant.id,
        createdBy: req.user.id
      },
      include: {
        createdByUser: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    res.status(201).json(duplicate);
  } catch (error) {
    console.error('Error duplicating template:', error);
    res.status(500).json({ error: 'Failed to duplicate template' });
  }
});

/**
 * GET /invoice-templates/:id/versions
 * Get version history for a template
 */
router.get('/:id/versions', authorize('MANAGER', 'ADMIN'), async (req, res) => {
  try {
    const versions = await invoiceTemplateService.getVersionHistory(
      req.params.id,
      req.tenant.id
    );

    res.json(versions);
  } catch (error) {
    console.error('Error fetching version history:', error);
    res.status(500).json({ error: 'Failed to fetch version history' });
  }
});

/**
 * GET /invoice-templates/meta/variables
 * Get available template variables
 */
router.get('/meta/variables', authorize('MANAGER', 'ADMIN'), (req, res) => {
  const variables = [
    { name: 'invoiceNumber', description: 'Invoice number', example: 'INV-2024-001', required: true },
    { name: 'invoiceDate', description: 'Invoice creation date', example: '15 Jan 2024', required: true },
    { name: 'dueDate', description: 'Payment due date', example: '30 Jan 2024', required: true },
    { name: 'status', description: 'Invoice status text', example: 'Paid', required: true },
    { name: 'statusClass', description: 'CSS class for status badge', example: 'paid', required: true },
    { name: 'companyName', description: 'Company name', example: 'Your Company', required: true },
    { name: 'companyAddress', description: 'Company address', example: '123 Business Park', required: true },
    { name: 'companyGSTIN', description: 'Company GSTIN', example: '27AABCU9603R1ZM', required: false },
    { name: 'companyPAN', description: 'Company PAN', example: 'AABCU9603R', required: false },
    { name: 'customerName', description: 'Customer name', example: 'ABC Corp', required: true },
    { name: 'customerAddress', description: 'Customer address', example: '456 Client St', required: true },
    { name: 'customerEmail', description: 'Customer email', example: 'contact@abc.com', required: false },
    { name: 'customerPhone', description: 'Customer phone', example: '+91 98765 43210', required: false },
    { name: 'customerGSTIN', description: 'Customer GSTIN', example: '07AABCU9603R1ZM', required: false },
    { name: 'lineItems', description: 'Invoice line items HTML rows', example: '<tr>...</tr>', required: true },
    { name: 'subtotal', description: 'Subtotal amount', example: '10,000.00', required: true },
    { name: 'totalDiscount', description: 'Total discount', example: '500.00', required: false },
    { name: 'cgst', description: 'CGST amount', example: '900.00', required: false },
    { name: 'sgst', description: 'SGST amount', example: '900.00', required: false },
    { name: 'igst', description: 'IGST amount', example: '1,800.00', required: false },
    { name: 'totalTax', description: 'Total tax', example: '1,800.00', required: true },
    { name: 'roundOff', description: 'Round off amount', example: '0.00', required: false },
    { name: 'total', description: 'Final total', example: '11,300.00', required: true },
    { name: 'paymentMethod', description: 'Payment method', example: 'Bank Transfer', required: false },
    { name: 'paymentDate', description: 'Payment date', example: '20 Jan 2024', required: false },
    { name: 'notes', description: 'Additional notes', example: 'Payment due in 15 days', required: false },
  ];

  res.json({ variables });
});

module.exports = router;
