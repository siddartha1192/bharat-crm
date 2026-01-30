const prisma = require('../lib/prisma');

/**
 * Render an invoice template by replacing {{variables}} with actual values
 * Supports basic conditionals: {{#if variable}}content{{/if}}
 */
function renderTemplate(htmlTemplate, variables) {
  let rendered = htmlTemplate;

  // First, handle conditionals {{#if variable}}...{{/if}}
  const conditionalRegex = /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g;
  rendered = rendered.replace(conditionalRegex, (match, varName, content) => {
    const value = variables[varName];
    // Show content if variable exists and is not empty/null/undefined/false
    if (value && value !== '' && value !== 'null' && value !== 'undefined') {
      return content;
    }
    return '';
  });

  // Then replace all {{variable}} placeholders
  const variableRegex = /\{\{(\w+)\}\}/g;
  rendered = rendered.replace(variableRegex, (match, varName) => {
    const value = variables[varName];
    if (value === null || value === undefined) {
      return '';
    }
    return String(value);
  });

  return rendered;
}

/**
 * Get the active invoice template for a tenant
 * Returns default template if no custom template is set
 */
async function getTemplateByTenant(tenantId) {
  try {
    // Try to find active default template for this tenant
    let template = await prisma.invoiceTemplate.findFirst({
      where: {
        tenantId,
        isActive: true,
        isDefault: true
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    // If no default, get any active template
    if (!template) {
      template = await prisma.invoiceTemplate.findFirst({
        where: {
          tenantId,
          isActive: true
        },
        orderBy: {
          updatedAt: 'desc'
        }
      });
    }

    return template;
  } catch (error) {
    console.error('Error fetching invoice template:', error);
    return null;
  }
}

/**
 * Render an invoice template for a tenant with given invoice data
 */
async function renderInvoiceTemplate(tenantId, invoiceData) {
  try {
    const template = await getTemplateByTenant(tenantId);

    if (!template) {
      throw new Error('No active invoice template found for tenant');
    }

    // Track usage
    await prisma.invoiceTemplate.update({
      where: { id: template.id },
      data: {
        usageCount: { increment: 1 },
        lastUsedAt: new Date()
      }
    });

    return renderTemplate(template.htmlTemplate, invoiceData);
  } catch (error) {
    console.error('Error rendering invoice template:', error);
    throw error;
  }
}

/**
 * Preview a template with sample data
 */
async function previewTemplate(htmlTemplate, sampleData) {
  try {
    return renderTemplate(htmlTemplate, sampleData);
  } catch (error) {
    console.error('Error previewing template:', error);
    throw error;
  }
}

/**
 * Create a version snapshot when template is updated
 */
async function createVersion(templateId, updateData, userId, tenantId, changeNotes = '') {
  try {
    // Get current template to save as version
    const currentTemplate = await prisma.invoiceTemplate.findUnique({
      where: { id: templateId }
    });

    if (!currentTemplate) {
      throw new Error('Template not found');
    }

    // Create version record
    await prisma.invoiceTemplateVersion.create({
      data: {
        templateId,
        version: currentTemplate.version,
        changeNotes,
        htmlTemplate: currentTemplate.htmlTemplate,
        changedBy: userId,
        tenantId
      }
    });

    // Update template with new data and increment version
    const updatedTemplate = await prisma.invoiceTemplate.update({
      where: { id: templateId },
      data: {
        ...updateData,
        version: { increment: 1 },
        lastEditedBy: userId,
        updatedAt: new Date()
      }
    });

    return updatedTemplate;
  } catch (error) {
    console.error('Error creating template version:', error);
    throw error;
  }
}

/**
 * Get version history for a template
 */
async function getVersionHistory(templateId, tenantId) {
  try {
    const versions = await prisma.invoiceTemplateVersion.findMany({
      where: {
        templateId,
        tenantId
      },
      include: {
        changedByUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        version: 'desc'
      }
    });

    return versions;
  } catch (error) {
    console.error('Error fetching version history:', error);
    throw error;
  }
}

/**
 * Format invoice line items as HTML table rows
 */
function formatLineItemsHTML(lineItems) {
  if (!lineItems || lineItems.length === 0) {
    return '<tr><td colspan="8" style="text-align: center; color: #999;">No items</td></tr>';
  }

  return lineItems.map((item, index) => `
    <tr>
      <td class="text-center">${index + 1}</td>
      <td>${item.description || ''}</td>
      <td>${item.hsnSac || ''}</td>
      <td class="text-center">${item.quantity || 0} ${item.unit || ''}</td>
      <td class="text-right">₹${Number(item.rate || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      <td class="text-right">${item.taxRate || 0}%</td>
      <td class="text-right">₹${Number(item.discount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      <td class="text-right">₹${Number(item.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
    </tr>
  `).join('');
}

/**
 * Prepare invoice data for template rendering
 */
function prepareInvoiceData(invoice) {
  // Format dates
  const formatDate = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  // Format numbers
  const formatNumber = (num) => {
    return Number(num || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  // Determine status class for CSS
  const statusMap = {
    'Draft': 'draft',
    'Sent': 'sent',
    'Paid': 'paid',
    'Overdue': 'overdue',
    'Cancelled': 'cancelled'
  };

  return {
    invoiceNumber: invoice.invoiceNumber || '',
    invoiceDate: formatDate(invoice.createdAt),
    dueDate: formatDate(invoice.dueDate),
    status: invoice.status || 'Draft',
    statusClass: statusMap[invoice.status] || 'draft',

    companyName: invoice.companyName || 'Your Company',
    companyAddress: invoice.companyAddress || '',
    companyGSTIN: invoice.companyGST || '',
    companyPAN: invoice.companyPAN || '',

    customerName: invoice.customerName || '',
    customerAddress: invoice.customerAddress || '',
    customerEmail: invoice.customerEmail || '',
    customerPhone: invoice.customerPhone || '',
    customerGSTIN: invoice.customerGST || '',

    lineItems: formatLineItemsHTML(invoice.lineItems),

    subtotal: formatNumber(invoice.subtotal),
    totalDiscount: invoice.totalDiscount > 0 ? formatNumber(invoice.totalDiscount) : null,
    cgst: invoice.cgst > 0 ? formatNumber(invoice.cgst) : null,
    sgst: invoice.sgst > 0 ? formatNumber(invoice.sgst) : null,
    igst: invoice.igst > 0 ? formatNumber(invoice.igst) : null,
    totalTax: formatNumber(invoice.totalTax),
    roundOff: invoice.roundOff ? formatNumber(invoice.roundOff) : null,
    total: formatNumber(invoice.total),

    paymentMethod: invoice.paymentMethod || null,
    paymentDate: invoice.paymentDate ? formatDate(invoice.paymentDate) : null,
    notes: invoice.notes || null
  };
}

module.exports = {
  renderTemplate,
  getTemplateByTenant,
  renderInvoiceTemplate,
  previewTemplate,
  createVersion,
  getVersionHistory,
  formatLineItemsHTML,
  prepareInvoiceData
};
