/**
 * Action Handler Service
 * Processes structured actions from AI responses
 */

const { PrismaClient } = require('@prisma/client');
const aiConfig = require('../../config/ai.config');
const googleCalendarService = require('../googleCalendar.js');
const automationService = require('../automation');

const prisma = new PrismaClient();

class ActionHandlerService {
  /**
   * Execute actions from AI response
   * @param {Array} actions - Array of action objects from AI
   * @param {Object} context - Additional context (userId, conversationId, etc.)
   * @returns {Array} Results of executed actions
   */
  async executeActions(actions, context) {
    if (!actions || !Array.isArray(actions)) {
      return [];
    }

    // Check if user has permission to execute actions (only ADMIN role)
    const user = await prisma.user.findUnique({
      where: { id: context.userId },
      select: { role: true, name: true }
    });

    if (!user) {
      console.log(`⚠️ User ${context.userId} not found. Cannot execute actions.`);
      return [{
        action: 'permission_check',
        success: false,
        error: 'User not found'
      }];
    }

    const results = [];

    for (const action of actions) {
      if (action.type === 'none') {
        continue;
      }

      console.log(`\n⚡ Executing action: ${action.type}`);
      console.log(`   User: ${user.name} (${user.role})`);
      console.log(`   Contact ID: ${context.contactId || 'Unknown contact'}`);
      console.log(`   Is Known Contact: ${context.isKnownContact}`);
      console.log(`   Confidence: ${action.confidence || 'N/A'}`);
      console.log(`   Data:`, JSON.stringify(action.data, null, 2));

      // CONTACT RESTRICTION: Only known contacts can create actions
      if (!context.isKnownContact) {
        console.log(`🚫 ACTION DENIED: Contact not found in CRM`);
        console.log(`   Only contacts saved in the CRM can create appointments, tasks, and leads`);
        console.log(`   Unknown contacts can only receive information from vector database`);

        results.push({
          action: action.type,
          success: false,
          error: `Sorry, I can only create appointments, tasks, and leads for registered contacts. Please contact the admin to add you to the CRM system first.`,
        });
        continue;  // Skip to next action
      }

      // ROLE-BASED RESTRICTION: VIEWER role cannot execute actions
      if (user.role === 'VIEWER') {
        console.log(`🚫 PERMISSION DENIED: User role '${user.role}' is not authorized to execute actions via WhatsApp`);
        console.log(`   VIEWER role users can only view information, not create appointments, tasks, or leads from WhatsApp`);
        console.log(`   Allowed roles: ADMIN, MANAGER, AGENT`);

        results.push({
          action: action.type,
          success: false,
          error: `Permission denied. Viewer role cannot execute actions via WhatsApp. Please contact an admin, manager, or agent.`,
        });
        continue;  // Skip to next action
      }

      try {
        let result;

        switch (action.type) {
          case 'create_appointment':
            result = await this.createAppointment(action.data, context);
            break;

          case 'create_task':
            result = await this.createTask(action.data, context);
            break;

          case 'create_lead':
            result = await this.createLead(action.data, context);
            break;

          default:
            console.log(`⚠️ Unknown action type: ${action.type}`);
            result = { success: false, error: 'Unknown action type' };
        }

        results.push({
          action: action.type,
          success: result.success,
          data: result.data,
          error: result.error,
        });

        console.log(`   ${result.success ? '✅' : '❌'} Result:`, result);
      } catch (error) {
        console.error(`   ❌ Error executing ${action.type}:`, error);
        results.push({
          action: action.type,
          success: false,
          error: error.message,
        });
      }
    }

    return results;
  }

  /**
   * Create appointment via internal calendar API
   */
  async createAppointment(data, context) {
    try {
      if (!data.date || !data.time) {
        return { success: false, error: 'Date and time are required' };
      }

      // Parse date and time
      const appointmentDateTime = this.parseDateTime(data.date, data.time);
      const startTime = appointmentDateTime;
      const endTime = new Date(appointmentDateTime.getTime() + 60 * 60 * 1000);

      const title = `CRM Demo/Consultation - ${data.name || 'WhatsApp Lead'}`;
      const description = `
Appointment Details:
- Name: ${data.name || 'Not provided'}
- Email: ${data.email || 'Not provided'}
- Phone: ${data.phone || context.contactPhone || 'Not provided'}
- Company: ${data.company || 'Not provided'}
- Source: WhatsApp AI Assistant

Notes: ${data.notes || 'None'}
      `.trim();

      const attendees = [];
      if (data.email) {
        attendees.push(data.email);
      }

      // Get user from context with Google Calendar tokens
      const ownerUser = await prisma.user.findFirst({
        where: { id: context.userId },
        select: {
          id: true,
          tenantId: true,
          calendarAccessToken: true,
          calendarRefreshToken: true,
        },
      });

      if (!ownerUser) {
        return { success: false, error: 'User not found' };
      }

      let googleEventId = null;

      // Sync to Google Calendar if user has it connected
      if (ownerUser.calendarAccessToken && ownerUser.calendarRefreshToken) {
        try {
          console.log('   🔄 Syncing to Google Calendar...');
          const auth = await googleCalendarService.getAuthenticatedClient(
            ownerUser.calendarAccessToken,
            ownerUser.calendarRefreshToken
          );

          const googleEvent = await googleCalendarService.createEvent(auth, {
            title,
            description,
            startTime,
            endTime,
            location: 'WhatsApp/Online',
            attendees,
            isAllDay: false,
            syncWithGoogle: true,
          });

          googleEventId = googleEvent.id;
          console.log('   ✅ Synced to Google Calendar:', googleEventId);
        } catch (error) {
          console.error('   ⚠️ Failed to sync to Google Calendar:', error.message);
          // Continue creating in database even if Google sync fails
        }
      } else {
        console.log('   ℹ️ Google Calendar not connected, skipping sync');
      }

      // Create event in database
      const event = await prisma.calendarEvent.create({
        data: {
          userId: ownerUser.id,
          tenantId: ownerUser.tenantId,
          title,
          description,
          startTime,
          endTime,
          location: 'WhatsApp/Online',
          attendees,
          isAllDay: false,
          color: 'green', // Green for AI-created appointments
          googleEventId, // Store Google Calendar event ID for sync
        },
      });

      return {
        success: true,
        data: {
          eventId: event.id,
          title: event.title,
          startTime: event.startTime,
          endTime: event.endTime,
          syncedToGoogle: !!googleEventId, // Indicates if synced to Google Calendar
          googleEventId,
        },
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Create task
   */
  async createTask(data, context) {
    try {
      if (!data.title) {
        return { success: false, error: 'Task title is required' };
      }

      // Get user from context
      const ownerUser = await prisma.user.findFirst({
        where: { id: context.userId },
        select: {
          id: true,
          tenantId: true,
          name: true,
          email: true,
        },
      });

      if (!ownerUser) {
        return { success: false, error: 'User not found' };
      }

      // Parse due date if provided, otherwise default to 7 days from now
      let dueDate;
      if (data.dueDate) {
        dueDate = new Date(data.dueDate);
      } else if (data.date || data.time) {
        // Try to parse from date/time fields
        dueDate = this.parseDateTime(data.date, data.time);
      } else {
        // Default: 7 days from now
        dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 7);
        console.log('   ℹ️ No due date specified, defaulting to 7 days from now:', dueDate.toISOString());
      }

      // Determine assignedTo name (from AI data or default to owner)
      const assignedToName = data.assignedTo || data.assignee || ownerUser.name || ownerUser.email;

      // Create task
      const task = await prisma.task.create({
        data: {
          title: data.title,
          description: data.description || '',
          priority: data.priority || 'medium',
          status: 'todo',
          dueDate,
          user: {
            connect: { id: ownerUser.id }
          },
          tenantId: ownerUser.tenantId,
          assignedTo: assignedToName,
          createdBy: ownerUser.id,
          tags: data.tags || [],
        },
      });

      return {
        success: true,
        data: {
          taskId: task.id,
          title: task.title,
          priority: task.priority,
          dueDate: task.dueDate,
        },
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Create lead
   */
  async createLead(data, context) {
    try {
      if (!data.name || !data.email) {
        return { success: false, error: 'Name and email are required' };
      }

      // Get user from context
      const ownerUser = await prisma.user.findFirst({
        where: { id: context.userId },
        select: {
          id: true,
          tenantId: true,
          name: true,
          email: true,
        },
      });

      if (!ownerUser) {
        return { success: false, error: 'User not found' };
      }

      // Helper function: Map lead status to deal stage
      const mapLeadStatusToDealStage = (leadStatus) => {
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
      };

      const assignedToName = ownerUser.name || ownerUser.email;
      const status = 'new';
      const priority = data.priority || 'medium';
      const estimatedValue = parseFloat(data.estimatedValue) || 0;
      const company = data.company || '';

      // Get default lead stage - try multiple strategies
      let defaultStage = await prisma.pipelineStage.findFirst({
        where: {
          tenantId: ownerUser.tenantId,
          isSystemDefault: true,
          stageType: { in: ['LEAD', 'BOTH'] }
        }
      });

      // If no system default LEAD stage, try to find any active LEAD/BOTH stage
      if (!defaultStage) {
        defaultStage = await prisma.pipelineStage.findFirst({
          where: {
            tenantId: ownerUser.tenantId,
            isActive: true,
            stageType: { in: ['LEAD', 'BOTH'] }
          },
          orderBy: { order: 'asc' }
        });
      }

      // If still no stage found, look for the "lead" slug stage (which might be DEAL type)
      if (!defaultStage) {
        defaultStage = await prisma.pipelineStage.findFirst({
          where: {
            tenantId: ownerUser.tenantId,
            slug: 'lead',
            isActive: true
          }
        });
      }

      if (!defaultStage) {
        return { success: false, error: 'No lead stage found for tenant. Please create a pipeline stage for leads.' };
      }

      // ✅ Prioritize user-provided data over context data
      // If user mentions a phone/whatsapp number in their message, use that instead of the sender's number
      const leadPhone = data.phone || context.contactPhone || '';
      const leadWhatsapp = data.whatsapp || data.phone || context.contactPhone || '';

      // Create the Lead only (no automatic deal creation)
      const lead = await prisma.lead.create({
        data: {
          name: data.name,
          email: data.email,
          phone: leadPhone,
          whatsapp: leadWhatsapp,
          company: company,
          source: 'whatsapp', // WhatsApp AI-created leads
          status: status,
          stageId: defaultStage.id,
          priority: priority,
          estimatedValue: estimatedValue,
          assignedTo: assignedToName,
          createdBy: ownerUser.id,
          notes: data.notes || 'Lead captured via WhatsApp AI Assistant',
          tags: [],
          userId: ownerUser.id,
          tenantId: ownerUser.tenantId
        }
      });

      console.log(`   ✅ Lead created: ${lead.id} - Use manual conversion to create deal`);

      // Trigger automation for lead creation (to send email notifications)
      try {
        await automationService.triggerAutomation('lead.created', {
          id: lead.id,
          name: lead.name,
          email: lead.email,
          company: lead.company,
          status: lead.status,
          entityType: 'Lead'
        }, ownerUser);
        console.log('   ✅ Lead creation automation triggered');
      } catch (automationError) {
        console.error('   ⚠️ Error triggering lead creation automation:', automationError);
        // Don't fail the lead creation if automation fails
      }

      return {
        success: true,
        data: {
          leadId: lead.id,
          name: lead.name,
          email: lead.email,
          status: lead.status,
        },
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Parse date and time string into Date object
   */
  parseDateTime(dateStr, timeStr) {
    const now = new Date();
    let targetDate = new Date();

    // Handle relative dates
    if (dateStr && dateStr.toLowerCase() === 'today') {
      targetDate = new Date();
    } else if (dateStr && dateStr.toLowerCase() === 'tomorrow') {
      targetDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    } else if (dateStr && dateStr.toLowerCase().startsWith('next')) {
      // "next monday", "next week" etc.
      targetDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    } else if (dateStr) {
      // Try to parse the date string
      targetDate = new Date(dateStr);
    }

    // Parse time
    if (timeStr) {
      const timeMatch = timeStr.match(/([0-9]{1,2}):?([0-9]{2})?\s*(AM|PM|am|pm)?/i);
      if (timeMatch) {
        let hours = parseInt(timeMatch[1]);
        const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
        const meridiem = timeMatch[3] ? timeMatch[3].toUpperCase() : null;

        if (meridiem === 'PM' && hours < 12) hours += 12;
        if (meridiem === 'AM' && hours === 12) hours = 0;

        targetDate.setHours(hours, minutes, 0, 0);
      }
    } else {
      // Default to 10 AM if no time specified
      targetDate.setHours(10, 0, 0, 0);
    }

    return targetDate;
  }
}

// Export singleton instance
module.exports = new ActionHandlerService();
