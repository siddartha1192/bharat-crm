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

    const results = [];

    for (const action of actions) {
      if (action.type === 'none') {
        continue;
      }

      console.log(`\n⚡ Executing action: ${action.type}`);
      console.log(`   Confidence: ${action.confidence || 'N/A'}`);
      console.log(`   Data:`, JSON.stringify(action.data, null, 2));

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

      // Get owner user with Google Calendar tokens
      const ownerUser = await prisma.user.findFirst({
        where: { email: aiConfig.company.ownerEmail },
        select: {
          id: true,
          googleAccessToken: true,
          googleRefreshToken: true,
        },
      });

      if (!ownerUser) {
        return { success: false, error: 'Owner user not found' };
      }

      let googleEventId = null;

      // Sync to Google Calendar if user has it connected
      if (ownerUser.googleAccessToken && ownerUser.googleRefreshToken) {
        try {
          console.log('   🔄 Syncing to Google Calendar...');
          const auth = await googleCalendarService.getAuthenticatedClient(
            ownerUser.googleAccessToken,
            ownerUser.googleRefreshToken
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

      // Get owner user with name
      const ownerUser = await prisma.user.findFirst({
        where: { email: aiConfig.company.ownerEmail },
        select: {
          id: true,
          name: true,
          email: true,
        },
      });

      if (!ownerUser) {
        return { success: false, error: 'Owner user not found' };
      }

      // Parse due date if provided
      let dueDate = null;
      if (data.dueDate) {
        dueDate = new Date(data.dueDate);
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

      // Get owner user ID
      const ownerUser = await prisma.user.findFirst({
        where: { email: aiConfig.company.ownerEmail },
      });

      if (!ownerUser) {
        return { success: false, error: 'Owner user not found' };
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
      const estimatedValue = data.estimatedValue || 0;
      const company = data.company || '';

      // Use transaction to ensure both Lead and Deal are created together
      const result = await prisma.$transaction(async (tx) => {
        // Create the Deal first in the pipeline
        const deal = await tx.deal.create({
          data: {
            title: `${company || 'WhatsApp Lead'} - ${data.name}`,
            company: company,
            contactName: data.name,
            email: data.email,
            phone: data.phone || context.contactPhone || '',
            value: estimatedValue,
            stage: mapLeadStatusToDealStage(status),
            probability: priority === 'urgent' ? 80 : priority === 'high' ? 60 : priority === 'medium' ? 40 : 20,
            expectedCloseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
            assignedTo: assignedToName,
            createdBy: ownerUser.id,
            notes: data.notes || 'Lead captured via WhatsApp AI Assistant',
            tags: [],
            userId: ownerUser.id
          }
        });

        // Create the Lead and link it to the Deal
        const lead = await tx.lead.create({
          data: {
            name: data.name,
            email: data.email,
            phone: data.phone || context.contactPhone || '',
            whatsapp: context.contactPhone || data.phone || '',
            company: company,
            source: 'whatsapp', // WhatsApp AI-created leads
            status: status,
            priority: priority,
            estimatedValue: estimatedValue,
            assignedTo: assignedToName,
            createdBy: ownerUser.id,
            notes: data.notes || 'Lead captured via WhatsApp AI Assistant',
            tags: [],
            userId: ownerUser.id,
            dealId: deal.id // Link lead to deal
          },
        });

        return { lead, deal };
      });

      console.log(`   ✅ Lead created with auto-generated Deal: Lead ${result.lead.id} -> Deal ${result.deal.id}`);

      // Trigger automation for lead creation (to send email notifications)
      try {
        await automationService.triggerAutomation('lead.created', {
          id: result.lead.id,
          name: result.lead.name,
          email: result.lead.email,
          company: result.lead.company,
          status: result.lead.status,
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
          leadId: result.lead.id,
          dealId: result.deal.id,
          name: result.lead.name,
          email: result.lead.email,
          status: result.lead.status,
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
