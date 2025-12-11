const { PrismaClient } = require('@prisma/client');
const emailService = require('./email');
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
    // Find all active automation rules for this event
    const rules = await prisma.automationRule.findMany({
      where: {
        triggerEvent: event,
        isEnabled: true
      }
    });

    console.log(`Found ${rules.length} automation rules for event: ${event}`);

    // Execute each rule
    for (const rule of rules) {
      try {
        // Check if conditions match
        if (rule.triggerConditions) {
          const conditions = rule.triggerConditions;

          // For stage change events, check if fromStage and toStage match
          if (event.includes('stage_changed')) {
            if (conditions.fromStage && conditions.fromStage !== data.fromStage) {
              continue;
            }
            if (conditions.toStage && conditions.toStage !== data.toStage) {
              continue;
            }
          }
        }

        // Execute action based on actionType
        switch (rule.actionType) {
          case 'send_email':
            await executeEmailAction(rule, data, user);
            break;
          case 'create_task':
            await executeTaskAction(rule, data, user);
            break;
          case 'assign_lead':
            await executeAssignAction(rule, data, user);
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
 */
async function executeEmailAction(rule, data, user) {
  try {
    // Get email template (use custom or default)
    let emailSubject = rule.emailSubject || DEFAULT_TEMPLATES[rule.type]?.subject || 'Notification';
    let emailTemplate = rule.emailTemplate || DEFAULT_TEMPLATES[rule.type]?.html || '<p>{{message}}</p>';

    // Prepare template variables
    const variables = {
      name: data.name || '',
      company: data.company || '',
      email: data.email || '',
      stage: data.toStage || data.status || '',
      fromStage: data.fromStage || '',
      toStage: data.toStage || '',
      message: data.message || ''
    };

    // Replace variables in subject and template
    emailSubject = replaceTemplateVariables(emailSubject, variables);
    const emailHtml = replaceTemplateVariables(emailTemplate, variables);

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

      console.log(`Sent automation email to ${data.email}`);
    }
  } catch (error) {
    console.error('Error executing email action:', error);
    throw error;
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
        assignee: data.assignedTo || user.id,
        userId: user.id,
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
async function saveAutomationRule(userId, ruleData) {
  try {
    if (ruleData.id) {
      // Update existing rule
      return await prisma.automationRule.update({
        where: { id: ruleData.id },
        data: {
          name: ruleData.name,
          type: ruleData.type,
          isEnabled: ruleData.isEnabled !== undefined ? ruleData.isEnabled : true,
          triggerEvent: ruleData.triggerEvent,
          triggerConditions: ruleData.triggerConditions || null,
          actionType: ruleData.actionType,
          actionConfig: ruleData.actionConfig || {},
          emailSubject: ruleData.emailSubject || null,
          emailTemplate: ruleData.emailTemplate || null,
          fromStage: ruleData.fromStage || null,
          toStage: ruleData.toStage || null
        }
      });
    } else {
      // Create new rule
      return await prisma.automationRule.create({
        data: {
          userId,
          name: ruleData.name,
          type: ruleData.type,
          isEnabled: ruleData.isEnabled !== undefined ? ruleData.isEnabled : true,
          triggerEvent: ruleData.triggerEvent,
          triggerConditions: ruleData.triggerConditions || null,
          actionType: ruleData.actionType,
          actionConfig: ruleData.actionConfig || {},
          emailSubject: ruleData.emailSubject || null,
          emailTemplate: ruleData.emailTemplate || null,
          fromStage: ruleData.fromStage || null,
          toStage: ruleData.toStage || null
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

module.exports = {
  triggerAutomation,
  saveAutomationRule,
  getAutomationRules,
  deleteAutomationRule,
  toggleAutomationRule,
  DEFAULT_TEMPLATES
};
