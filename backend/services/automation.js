const { PrismaClient } = require('@prisma/client');
const emailService = require('./email');
const whatsappService = require('./whatsapp');
const EmailTemplateService = require('./emailTemplate');
const callQueueService = require('./callQueueService');
const prisma = new PrismaClient();

/**
 * Automation Service
 * Handles automated workflows and triggers
 */

/**
 * Default email templates
 */
const DEFAULT_TEMPLATES = {
  lead_created: {
    subject: 'Welcome! We received your inquiry',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Thank You for Reaching Out! 🎉</h1>
          </div>
          <div class="content">
            <p>Hi {{name}},</p>
            <p>Thank you for your interest in our services. We've received your inquiry and our team is already reviewing your request.</p>
            <p><strong>Here's what happens next:</strong></p>
            <ul>
              <li>Our team will review your requirements</li>
              <li>We'll reach out to you within 24 hours</li>
              <li>We'll schedule a call to discuss your needs in detail</li>
            </ul>
            <p>In the meantime, feel free to explore our resources or contact us directly if you have any questions.</p>
            <a href="#" class="button">Visit Our Website</a>
            <p>Best regards,<br>The Team</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 Bharat CRM. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
  },
  stage_change: {
    subject: 'Update on your inquiry - {{stage}}',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .status-badge { display: inline-block; padding: 8px 16px; background: #4caf50; color: white; border-radius: 20px; font-weight: bold; }
          .timeline { margin: 20px 0; }
          .timeline-item { padding: 10px 0; border-left: 3px solid #667eea; padding-left: 20px; margin-left: 10px; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Status Update 📊</h1>
          </div>
          <div class="content">
            <p>Hi {{name}},</p>
            <p>We wanted to keep you updated on the progress of your inquiry.</p>
            <p><span class="status-badge">{{toStage}}</span></p>
            <p>Your request has moved to <strong>{{toStage}}</strong> stage. This means we're making great progress!</p>
            <div class="timeline">
              <h3>Your Journey:</h3>
              <div class="timeline-item">
                <strong>Previous:</strong> {{fromStage}}
              </div>
              <div class="timeline-item">
                <strong>Current:</strong> {{toStage}}
              </div>
            </div>
            <p>Our team will continue to work on your request and keep you informed every step of the way.</p>
            <p>If you have any questions or concerns, please don't hesitate to reach out to us.</p>
            <p>Best regards,<br>The Team</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 Bharat CRM. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
  }
};

/**
 * Default WhatsApp templates
 */
const DEFAULT_WHATSAPP_TEMPLATES = {
  lead_created: `Hi {{name}}! 👋

Thank you for your interest in our services! We've received your inquiry and our team is reviewing it.

*What happens next:*
✅ Our team will review your requirements
✅ We'll reach out within 24 hours
✅ We'll schedule a call to discuss details

Feel free to reach out if you have any questions!

Best regards,
*The Team*`,

  stage_change: `Hi {{name}}! 📊

We wanted to update you on your inquiry progress.

*Status Update:*
Previous: {{fromStage}}
Current: *{{toStage}}*

We're making great progress! Our team will continue working on your request and keep you informed.

If you have any questions, feel free to ask!

Best regards,
*The Team*`
};

/**
 * Replace template variables
 */
function replaceTemplateVariables(template, variables) {
  let result = template;
  Object.keys(variables).forEach(key => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, variables[key] || '');
  });
  return result;
}

/**
 * Trigger automation rules based on event
 * @param {String} event - Event type (e.g., 'lead.created', 'lead.stage_changed')
 * @param {Object} data - Event data
 * @param {Object} user - User who triggered the event
 */
async function triggerAutomation(event, data, user) {
  try {
    // Determine entity type from data or event
    const entityType = data.entityType?.toLowerCase() ||
                       (event.includes('deal') ? 'deal' : 'lead');

    // Find all active automation rules for this event and entity type
    const rules = await prisma.automationRule.findMany({
      where: {
        triggerEvent: event,
        isEnabled: true,
        entityType: entityType
      }
    });

    console.log(`Found ${rules.length} automation rules for event: ${event} (entityType: ${entityType})`);

    // Execute each rule
    for (const rule of rules) {
      try {
        // For stage change events, check if fromStage and toStage match
        // These are stored as direct fields on the rule, not in triggerConditions
        if (event.includes('stage_changed')) {
          // Skip if fromStage is specified but doesn't match
          if (rule.fromStage && rule.fromStage !== data.fromStage) {
            console.log(`⏭️  Skipping rule "${rule.name}": fromStage "${rule.fromStage}" doesn't match "${data.fromStage}"`);
            continue;
          }
          // Skip if toStage is specified but doesn't match
          if (rule.toStage && rule.toStage !== data.toStage) {
            console.log(`⏭️  Skipping rule "${rule.name}": toStage "${rule.toStage}" doesn't match "${data.toStage}"`);
            continue;
          }
          console.log(`✅ Rule "${rule.name}" matches stage change: ${data.fromStage} → ${data.toStage}`);
        }

        // Execute action based on actionType
        switch (rule.actionType) {
          case 'send_email':
            await executeEmailAction(rule, data, user);
            break;
          case 'send_whatsapp':
            await executeWhatsAppAction(rule, data, user);
            break;
          case 'send_both':
            // Send both email and WhatsApp
            await Promise.all([
              executeEmailAction(rule, data, user),
              executeWhatsAppAction(rule, data, user)
            ]);
            break;
          case 'create_task':
            await executeTaskAction(rule, data, user);
            break;
          case 'assign_lead':
            await executeAssignAction(rule, data, user);
            break;
          case 'make_call':
            await executeCallAction(rule, data, user);
            break;
          default:
            console.log(`Unknown action type: ${rule.actionType}`);
        }

        console.log(`Executed automation rule: ${rule.name}`);
      } catch (error) {
        console.error(`Error executing rule ${rule.name}:`, error);
      }
    }
  } catch (error) {
    console.error('Error triggering automation:', error);
    throw error;
  }
}

/**
 * Execute email action
 * Now uses centralized template system with fallback to custom/default templates
 */
async function executeEmailAction(rule, data, user) {
  try {
    console.log('🔍 Executing email action with data:', JSON.stringify(data, null, 2));
    console.log('🔍 Rule type:', rule.type);

    let emailSubject, emailHtml, templateId;

    // Prepare template variables
    const variables = {
      leadName: data.name || '',
      name: data.name || '',
      company: data.company || '',
      email: data.email || '',
      phone: data.phone || '',
      source: data.source || '',
      stage: data.toStage || data.status || '',
      fromStage: data.fromStage || '',
      toStage: data.toStage || '',
      message: data.message || '',
      assignedTo: user?.name || '',
      changedBy: user?.name || '',
    };

    console.log('🔍 Template variables:', JSON.stringify(variables, null, 2));

    // Priority 1: Try centralized template system
    try {
      const rendered = await EmailTemplateService.renderTemplateByType(
        rule.type,
        user.tenantId,
        variables
      );

      emailSubject = rendered.subject;
      emailHtml = rendered.htmlBody;
      templateId = rendered.templateId;

      console.log('✅ Using centralized template system');
    } catch (templateError) {
      console.log('⚠️  Centralized template not found, using fallback:', templateError.message);

      // Priority 2: Use custom template from automation rule
      const hasCustomSubject = rule.emailSubject && rule.emailSubject.trim() !== '';
      const hasCustomTemplate = rule.emailTemplate && rule.emailTemplate.trim() !== '';

      emailSubject = hasCustomSubject
        ? rule.emailSubject.trim()
        : (DEFAULT_TEMPLATES[rule.type]?.subject || 'Notification');

      let emailTemplate = hasCustomTemplate
        ? rule.emailTemplate.trim()
        : (DEFAULT_TEMPLATES[rule.type]?.html || '<p>{{message}}</p>');

      console.log('🔍 Using fallback template');
      console.log('🔍 Template before replacement:', emailTemplate.substring(0, 200));

      // Replace variables in subject and template
      emailSubject = replaceTemplateVariables(emailSubject, variables);
      emailHtml = replaceTemplateVariables(emailTemplate, variables);

      console.log('🔍 Template after replacement:', emailHtml.substring(0, 200));
    }

    // Send email
    if (data.email) {
      await emailService.sendEmail({
        to: [data.email],
        subject: emailSubject,
        text: emailHtml, // Plain text version (using HTML as fallback)
        html: emailHtml, // HTML version
        userId: user.id,
        entityType: data.entityType || 'Lead',
        entityId: data.id
      });

      // Track template usage if centralized template was used
      if (templateId) {
        await EmailTemplateService.trackUsage(templateId, false);
      }

      console.log(`✅ Sent automation email to ${data.email}`);
    }
  } catch (error) {
    console.error('❌ Error executing email action:', error);
    throw error;
  }
}

/**
 * Execute WhatsApp action
 */
async function executeWhatsAppAction(rule, data, user) {
  try {
    console.log('🔍 Executing WhatsApp action with data:', JSON.stringify(data, null, 2));
    console.log('🔍 Rule type:', rule.type);

    // Get tenant-specific WhatsApp configuration
    let whatsappConfig = null;
    if (user.tenantId) {
      const tenant = await prisma.tenant.findUnique({
        where: { id: user.tenantId },
        select: { settings: true }
      });
      whatsappConfig = tenant?.settings?.whatsapp || null;
    }

    // Check if WhatsApp is configured for this tenant
    if (!whatsappService.isConfigured(whatsappConfig)) {
      console.log('⚠️ WhatsApp is not configured for this tenant, skipping WhatsApp action');
      return;
    }

    // Get WhatsApp message template (use custom or default)
    const hasCustomMessage = rule.whatsappMessage && rule.whatsappMessage.trim() !== '';

    let whatsappMessage = hasCustomMessage
      ? rule.whatsappMessage.trim()
      : (DEFAULT_WHATSAPP_TEMPLATES[rule.type] || 'Hi {{name}}, thank you for your inquiry!');

    // Prepare template variables
    const variables = {
      name: data.name || '',
      company: data.company || '',
      email: data.email || '',
      phone: data.phone || data.whatsapp || '',
      stage: data.toStage || data.status || '',
      fromStage: data.fromStage || '',
      toStage: data.toStage || '',
      message: data.message || ''
    };

    console.log('🔍 Template variables:', JSON.stringify(variables, null, 2));

    // Replace variables in message
    const finalMessage = replaceTemplateVariables(whatsappMessage, variables);

    console.log('🔍 Final WhatsApp message:', finalMessage);

    // Determine recipient number - prioritize whatsapp field, fallback to phone
    const recipientNumber = data.whatsapp || data.phone;

    // Send WhatsApp message with tenant-specific configuration
    if (recipientNumber) {
      await whatsappService.sendMessage(
        recipientNumber,
        finalMessage,
        whatsappConfig
      );

      console.log(`✅ Sent automation WhatsApp message to ${recipientNumber}`);
    } else {
      console.log('⚠️ No WhatsApp/phone number available, skipping WhatsApp action');
    }
  } catch (error) {
    console.error('Error executing WhatsApp action:', error);
    // Don't throw - log error but continue with other automation rules
    console.log('⚠️ WhatsApp action failed, but continuing with other automations');
  }
}

/**
 * Execute task creation action
 */
async function executeTaskAction(rule, data, user) {
  try {
    const actionConfig = rule.actionConfig || {};

    await prisma.task.create({
      data: {
        title: actionConfig.title || `Follow up: ${data.name}`,
        description: actionConfig.description || `Automated task for ${data.name}`,
        priority: actionConfig.priority || 'medium',
        status: 'todo',
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
        assignedTo: data.assignedTo || user.name,
        createdBy: user.id,
        userId: user.id,
        tenantId: user.tenantId,
        tags: actionConfig.tags || []
      }
    });

    console.log(`Created automation task for ${data.name}`);
  } catch (error) {
    console.error('Error executing task action:', error);
    throw error;
  }
}

/**
 * Execute lead assignment action
 */
async function executeAssignAction(rule, data, user) {
  try {
    const actionConfig = rule.actionConfig || {};

    if (data.id && actionConfig.assignTo) {
      await prisma.lead.update({
        where: { id: data.id },
        data: {
          assignedTo: actionConfig.assignTo
        }
      });

      console.log(`Assigned lead ${data.id} to ${actionConfig.assignTo}`);
    }
  } catch (error) {
    console.error('Error executing assign action:', error);
    throw error;
  }
}

/**
 * Create or update automation rule
 */
async function saveAutomationRule(userId, ruleData, tenantId) {
  try {
    // Helper to convert empty strings to null
    const sanitizeField = (value) => {
      if (typeof value === 'string') {
        const trimmed = value.trim();
        return trimmed === '' ? null : trimmed;
      }
      return value || null;
    };

    const cleanData = {
      name: ruleData.name,
      type: ruleData.type,
      isEnabled: ruleData.isEnabled !== undefined ? ruleData.isEnabled : true,
      triggerEvent: ruleData.triggerEvent,
      triggerConditions: ruleData.triggerConditions || null,
      actionType: ruleData.actionType,
      actionConfig: ruleData.actionConfig || {},
      emailSubject: sanitizeField(ruleData.emailSubject),
      emailTemplate: sanitizeField(ruleData.emailTemplate),
      whatsappMessage: sanitizeField(ruleData.whatsappMessage),
      whatsappTemplate: sanitizeField(ruleData.whatsappTemplate),
      fromStage: sanitizeField(ruleData.fromStage),
      toStage: sanitizeField(ruleData.toStage),
      entityType: ruleData.entityType || 'lead'
    };

    if (ruleData.id) {
      // Update existing rule
      return await prisma.automationRule.update({
        where: { id: ruleData.id },
        data: cleanData
      });
    } else {
      // Create new rule
      return await prisma.automationRule.create({
        data: {
          userId,
          tenantId,
          ...cleanData
        }
      });
    }
  } catch (error) {
    console.error('Error saving automation rule:', error);
    throw error;
  }
}

/**
 * Get all automation rules for a user
 */
async function getAutomationRules(userId) {
  try {
    return await prisma.automationRule.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
  } catch (error) {
    console.error('Error fetching automation rules:', error);
    throw error;
  }
}

/**
 * Delete automation rule
 */
async function deleteAutomationRule(ruleId, userId) {
  try {
    return await prisma.automationRule.delete({
      where: {
        id: ruleId,
        userId
      }
    });
  } catch (error) {
    console.error('Error deleting automation rule:', error);
    throw error;
  }
}

/**
 * Toggle automation rule enabled/disabled
 */
async function toggleAutomationRule(ruleId, userId, isEnabled) {
  try {
    return await prisma.automationRule.update({
      where: {
        id: ruleId,
        userId
      },
      data: {
        isEnabled
      }
    });
  } catch (error) {
    console.error('Error toggling automation rule:', error);
    throw error;
  }
}

/**
 * Execute call action
 * Queues an AI or manual call via the non-blocking queue system
 */
async function executeCallAction(rule, data, user) {
  try {
    console.log('📞 Executing call action for rule:', rule.name);

    // Get call settings for Twilio/OpenAI configuration
    const callSettings = await prisma.callSettings.findUnique({
      where: { tenantId: user.tenantId }
    });

    if (!callSettings) {
      console.log('⚠️  Call settings not configured for tenant, skipping call');
      return;
    }

    // CRITICAL FIX: Removed autoCallOnLeadCreate/autoCallOnStageChange checks
    // Those settings are for simple auto-call features, NOT automation rules
    // If a user created an automation rule with "make_call" action, they want it to execute!
    // The rule being enabled (rule.isEnabled) is the only check needed

    // Determine phone number and entity IDs
    let phoneNumber = data.phone || data.whatsapp;
    let leadId = data.id;
    let contactId = null;

    if (!phoneNumber) {
      console.log('⚠️  No phone number available for call, skipping');
      return;
    }

    // Get call script from rule or use default
    let callScriptId = rule.actionConfig?.callScriptId || callSettings.defaultCallScriptId;

    // Determine call type from rule config
    const callType = rule.actionConfig?.callType || 'ai';

    // Apply delay if configured
    const delaySeconds = rule.actionConfig?.delaySeconds || callSettings.autoCallDelaySeconds || 0;
    const scheduledFor = delaySeconds > 0
      ? new Date(Date.now() + delaySeconds * 1000)
      : null;

    // Queue the call (non-blocking!)
    const queueItem = await callQueueService.queueCall({
      tenantId: user.tenantId,
      leadId,
      contactId,
      phoneNumber,
      phoneCountryCode: data.phoneCountryCode || '+91',
      callType,
      callScriptId,
      triggerType: rule.triggerEvent, // 'lead.created' | 'lead.stage_changed'
      triggerData: {
        ruleName: rule.name,
        fromStage: data.fromStage,
        toStage: data.toStage,
        leadName: data.name,
        company: data.company
      },
      automationRuleId: rule.id,
      priority: rule.actionConfig?.priority || 7, // Higher priority for automation
      scheduledFor,
      maxAttempts: rule.actionConfig?.maxAttempts || 3,
      createdById: user.id,
      metadata: {
        source: 'automation',
        ruleName: rule.name
      }
    });

    console.log('✅ Call queued successfully:', {
      queueItemId: queueItem.id,
      phoneNumber,
      leadId,
      callType,
      scheduledFor
    });

    return queueItem;
  } catch (error) {
    console.error('❌ Error executing call action:', error);
    throw error;
  }
}

module.exports = {
  triggerAutomation,
  saveAutomationRule,
  getAutomationRules,
  deleteAutomationRule,
  toggleAutomationRule,
  DEFAULT_TEMPLATES,
  DEFAULT_WHATSAPP_TEMPLATES
};
