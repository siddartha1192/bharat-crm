const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Email Template Service
 * Enterprise-level template management with variable rendering, versioning, and analytics
 */

class EmailTemplateService {
  /**
   * Render a template with variables
   * @param {string} htmlBody - Template HTML with placeholders
   * @param {object} variables - Key-value pairs for variable substitution
   * @returns {string} - Rendered HTML
   */
  static renderTemplate(htmlBody, variables = {}) {
    if (!htmlBody) return '';

    let rendered = htmlBody;

    // Replace all {{variable}} placeholders
    Object.keys(variables).forEach(key => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      const value = variables[key] !== null && variables[key] !== undefined
        ? variables[key]
        : '';
      rendered = rendered.replace(regex, value);
    });

    // Clean up any unreplaced variables (show empty string)
    rendered = rendered.replace(/{{.*?}}/g, '');

    return rendered;
  }

  /**
   * Get active template by type
   * Falls back to default template if custom template not found
   * @param {string} type - Template type
   * @param {string} tenantId - Tenant ID
   * @returns {object|null} - Template object
   */
  static async getTemplateByType(type, tenantId) {
    try {
      console.log(`\n📧 Getting email template for type: ${type}, tenant: ${tenantId}`);

      // First, try to get custom active template
      let template = await prisma.emailTemplate.findFirst({
        where: {
          type,
          tenantId,
          isActive: true,
          isDefault: false,
        },
        orderBy: {
          updatedAt: 'desc',
        },
      });

      if (template) {
        console.log(`   ✅ Found CUSTOM template: "${template.name}" (ID: ${template.id})`);
        console.log(`      isActive: ${template.isActive}, isDefault: ${template.isDefault}`);
      } else {
        console.log(`   ⚠️ No custom template found, looking for default...`);

        // If no custom template, get default template
        template = await prisma.emailTemplate.findFirst({
          where: {
            type,
            tenantId,
            isActive: true,
            isDefault: true,
          },
        });

        if (template) {
          console.log(`   ✅ Found DEFAULT template: "${template.name}" (ID: ${template.id})`);
          console.log(`      isActive: ${template.isActive}, isDefault: ${template.isDefault}`);
        } else {
          console.log(`   ❌ No template found at all for type: ${type}`);
        }
      }

      return template;
    } catch (error) {
      console.error('Error fetching template:', error);
      return null;
    }
  }

  /**
   * Render template by type with variables
   * @param {string} type - Template type
   * @param {string} tenantId - Tenant ID
   * @param {object} variables - Variables for rendering
   * @returns {object} - { subject, htmlBody, templateId }
   */
  static async renderTemplateByType(type, tenantId, variables = {}) {
    const template = await this.getTemplateByType(type, tenantId);

    if (!template) {
      throw new Error(`No template found for type: ${type}`);
    }

    const renderedSubject = this.renderTemplate(template.subject, variables);
    const renderedHtmlBody = this.renderTemplate(template.htmlBody, variables);

    return {
      subject: renderedSubject,
      htmlBody: renderedHtmlBody,
      templateId: template.id,
    };
  }

  /**
   * Validate template has all required variables
   * @param {object} template - Template object with variables array
   * @param {object} providedVariables - Variables being provided
   * @returns {object} - { valid: boolean, missing: array }
   */
  static validateTemplateVariables(template, providedVariables = {}) {
    if (!template.variables || !Array.isArray(template.variables)) {
      return { valid: true, missing: [] };
    }

    const requiredVars = template.variables.filter(v => v.required);
    const missing = [];

    requiredVars.forEach(variable => {
      if (!providedVariables.hasOwnProperty(variable.name) ||
          providedVariables[variable.name] === null ||
          providedVariables[variable.name] === undefined) {
        missing.push(variable.name);
      }
    });

    return {
      valid: missing.length === 0,
      missing,
    };
  }

  /**
   * Track template usage
   * @param {string} templateId - Template ID
   * @param {boolean} isTest - Whether this was a test email
   */
  static async trackUsage(templateId, isTest = false) {
    try {
      if (isTest) {
        await prisma.emailTemplate.update({
          where: { id: templateId },
          data: {
            testEmailCount: { increment: 1 },
            lastTestedAt: new Date(),
          },
        });
      } else {
        await prisma.emailTemplate.update({
          where: { id: templateId },
          data: {
            usageCount: { increment: 1 },
            lastUsedAt: new Date(),
          },
        });
      }
    } catch (error) {
      console.error('Error tracking template usage:', error);
    }
  }

  /**
   * Create a new template version when updating
   * @param {string} templateId - Template ID
   * @param {object} updates - Updated fields (subject, htmlBody)
   * @param {string} userId - User making the change
   * @param {string} tenantId - Tenant ID
   * @param {string} changeNotes - Description of changes
   */
  static async createVersion(templateId, updates, userId, tenantId, changeNotes = null) {
    const template = await prisma.emailTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      throw new Error('Template not found');
    }

    // Create version snapshot
    await prisma.emailTemplateVersion.create({
      data: {
        templateId,
        version: template.version,
        subject: template.subject,
        htmlBody: template.htmlBody,
        changedBy: userId,
        tenantId,
        changeNotes,
      },
    });

    // Update template with new content and increment version
    return await prisma.emailTemplate.update({
      where: { id: templateId },
      data: {
        ...updates,
        version: { increment: 1 },
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
  }

  /**
   * Get template version history
   * @param {string} templateId - Template ID
   * @returns {array} - Array of template versions
   */
  static async getVersionHistory(templateId) {
    return await prisma.emailTemplateVersion.findMany({
      where: { templateId },
      orderBy: { version: 'desc' },
      include: {
        changedByUser: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  /**
   * Get all available template variables by type
   * Returns documentation for variables available for each template type
   */
  static getAvailableVariablesByType(type) {
    const variablesByType = {
      password_reset: [
        { name: 'userName', description: 'User\'s full name', example: 'John Doe', required: true },
        { name: 'resetLink', description: 'Password reset link', example: 'https://app.example.com/reset?token=...', required: true },
        { name: 'expiryTime', description: 'Link expiry time', example: '1 hour', required: true },
        { name: 'userEmail', description: 'User\'s email address', example: 'john@example.com', required: false },
      ],
      reminder: [
        { name: 'recipientName', description: 'Recipient\'s name (user receiving reminder)', example: 'John Doe', required: true },
        { name: 'leadsCount', description: 'Number of uncontacted leads', example: '4', required: true },
        { name: 'leadsList', description: 'HTML table of leads (name, email, phone)', example: '<table>...</table>', required: true },
        { name: 'leadsListText', description: 'Plain text list of leads', example: '• Lead 1\n• Lead 2', required: false },
        { name: 'checkIntervalHours', description: 'Hours since leads were created', example: '24', required: false },
        { name: 'companyName', description: 'Company name', example: 'Tech Solutions Inc', required: false },
      ],
      invoice: [
        { name: 'customerName', description: 'Customer name', example: 'John Doe', required: true },
        { name: 'invoiceNumber', description: 'Invoice number', example: 'INV-2024-001', required: true },
        { name: 'invoiceDate', description: 'Invoice date', example: 'January 8, 2024', required: true },
        { name: 'dueDate', description: 'Payment due date', example: 'January 22, 2024', required: true },
        { name: 'totalAmount', description: 'Total invoice amount', example: '$1,234.56', required: true },
        { name: 'itemsList', description: 'HTML table of invoice items', example: '<table>...</table>', required: true },
        { name: 'paymentLink', description: 'Payment link', example: 'https://pay.example.com/...', required: false },
        { name: 'companyName', description: 'Your company name', example: 'Bharat CRM', required: false },
      ],
      new_user: [
        { name: 'userName', description: 'New user\'s full name', example: 'John Doe', required: true },
        { name: 'userEmail', description: 'User\'s email', example: 'john@example.com', required: true },
        { name: 'loginUrl', description: 'Login URL', example: 'https://app.example.com/login', required: true },
        { name: 'temporaryPassword', description: 'Temporary password', example: 'TempPass123!', required: false },
        { name: 'companyName', description: 'Company name', example: 'Acme Corp', required: false },
        { name: 'role', description: 'User\'s role', example: 'Sales Agent', required: false },
      ],
      form_embed: [
        { name: 'leadName', description: 'Lead name from form', example: 'Jane Smith', required: true },
        { name: 'leadEmail', description: 'Lead email from form', example: 'jane@example.com', required: false },
        { name: 'leadPhone', description: 'Lead phone from form', example: '+1234567890', required: false },
        { name: 'formName', description: 'Name of the form submitted', example: 'Contact Us Form', required: true },
        { name: 'submissionData', description: 'All form data as HTML', example: '<ul><li>Name: Jane</li>...</ul>', required: false },
        { name: 'leadCompany', description: 'Lead\'s company', example: 'Tech Solutions Inc', required: false },
        { name: 'submissionDate', description: 'When form was submitted', example: 'January 8, 2024 10:30 AM', required: false },
      ],
      lead_created: [
        { name: 'leadName', description: 'Lead\'s full name', example: 'Jane Smith', required: true },
        { name: 'company', description: 'Lead\'s company', example: 'Acme Corp', required: false },
        { name: 'email', description: 'Lead\'s email', example: 'jane@acme.com', required: false },
        { name: 'phone', description: 'Lead\'s phone', example: '+1234567890', required: false },
        { name: 'source', description: 'Lead source', example: 'Website', required: false },
        { name: 'assignedTo', description: 'Assigned user name', example: 'John Doe', required: false },
      ],
      stage_change: [
        { name: 'leadName', description: 'Lead\'s full name', example: 'Jane Smith', required: true },
        { name: 'company', description: 'Lead\'s company', example: 'Acme Corp', required: false },
        { name: 'fromStage', description: 'Previous stage', example: 'Contacted', required: true },
        { name: 'toStage', description: 'New stage', example: 'Qualified', required: true },
        { name: 'assignedTo', description: 'Assigned user name', example: 'John Doe', required: false },
        { name: 'changedBy', description: 'User who changed stage', example: 'Sarah Admin', required: false },
      ],
      custom: [
        { name: 'recipientName', description: 'Recipient\'s name', example: 'John Doe', required: false },
        { name: 'subject', description: 'Email subject', example: 'Important Update', required: false },
        { name: 'message', description: 'Main message content', example: 'Your custom message here', required: false },
      ],
    };

    return variablesByType[type] || [];
  }

  /**
   * Preview template with sample data
   * @param {string} subject - Template subject
   * @param {string} htmlBody - Template HTML
   * @param {string} type - Template type
   * @returns {object} - { subject, htmlBody } with sample data rendered
   */
  static previewTemplate(subject, htmlBody, type) {
    const variables = this.getAvailableVariablesByType(type);
    const sampleData = {};

    // Generate sample data from variable definitions
    variables.forEach(variable => {
      sampleData[variable.name] = variable.example;
    });

    return {
      subject: this.renderTemplate(subject, sampleData),
      htmlBody: this.renderTemplate(htmlBody, sampleData),
    };
  }
}

module.exports = EmailTemplateService;
