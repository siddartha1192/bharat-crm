/**
 * Action Handler Service
 * Processes structured actions from AI responses
 */

const { PrismaClient } = require('@prisma/client');
const aiConfig = require('../../config/ai.config');
const googleCalendarService = require('../googleCalendar.js');
const automationService = require('../automation');
const roundRobinService = require('../roundRobin');

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

    // DEDUPLICATION: Only process the FIRST valid action (ignore duplicates)
    // This prevents issues where AI might return multiple similar actions
    const validActions = actions.filter(a => a.type && a.type !== 'none');
    const actionsToProcess = validActions.length > 0 ? [validActions[0]] : [];

    if (validActions.length > 1) {
      console.log(`⚠️ AI returned ${validActions.length} actions, only processing first one: ${validActions[0].type}`);
      console.log(`   Ignored actions: ${validActions.slice(1).map(a => a.type).join(', ')}`);
    }

    if (actionsToProcess.length === 0) {
      console.log(`ℹ️ No actions to execute (all are 'none' type)`);
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

    for (const action of actionsToProcess) {
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

      console.log(`   📅 [Appointment] Raw data from AI: date="${data.date}", time="${data.time}"`);

      // Parse date and time
      const appointmentDateTime = this.parseDateTime(data.date, data.time);
      const startTime = appointmentDateTime;
      const endTime = new Date(appointmentDateTime.getTime() + 60 * 60 * 1000);

      console.log(`   📅 [Appointment] Parsed datetime: ${appointmentDateTime.toISOString()} (UTC)`);
      console.log(`   📅 [Appointment] This represents IST: ${appointmentDateTime.toISOString().replace('Z', '')} + 5:30`);

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
          calendarTokenExpiry: true,
        },
      });

      if (!ownerUser) {
        return { success: false, error: 'User not found' };
      }

      // Get tenant for OAuth client configuration
      const tenant = await prisma.tenant.findUnique({
        where: { id: ownerUser.tenantId },
        select: {
          id: true,
          settings: true,
        },
      });

      let googleEventId = null;

      // Sync to Google Calendar if user has it connected
      if (ownerUser.calendarAccessToken && ownerUser.calendarRefreshToken) {
        try {
          console.log('   🔄 Syncing to Google Calendar...');
          const auth = await googleCalendarService.getAuthenticatedClient(
            ownerUser,
            tenant
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

      // Parse due date if provided, otherwise default to 7 days from now (IST)
      // All dates are handled in IST, independent of server timezone
      let dueDate;
      if (data.dueDate) {
        // If dueDate is provided, parse it in IST context
        dueDate = this.parseDateTime(data.dueDate, null);
      } else if (data.date || data.time) {
        // Try to parse from date/time fields (in IST)
        dueDate = this.parseDateTime(data.date, data.time);
      } else {
        // Default: 7 days from now at 10 AM IST (server-timezone independent)
        dueDate = this.getISTDatePlusDays(7, 10);
        console.log('   ℹ️ No due date specified, defaulting to 7 days from now (10 AM IST)');
      }

      // Determine assignedTo name (from AI data or default to owner)
      const assignedToName = data.assignedTo || data.assignee || ownerUser.name || ownerUser.email;

      // Build description with WhatsApp source info
      let taskDescription = data.description || '';
      if (context.contactPhone) {
        const sourceInfo = `\n\n---\n📱 Source: WhatsApp chat from ${context.contactPhone}`;
        taskDescription = taskDescription + sourceInfo;
      }

      // Create task
      const task = await prisma.task.create({
        data: {
          title: data.title,
          description: taskDescription,
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
      if (!data.name || !data.email || !data.phone) {
        const missing = [];
        if (!data.name) missing.push('name');
        if (!data.email) missing.push('email');
        if (!data.phone) missing.push('phone');
        return { success: false, error: `Missing required fields: ${missing.join(', ')}` };
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

      // Determine assignment using round-robin if enabled, otherwise assign to owner
      let assignedToName = ownerUser.name || ownerUser.email;
      let assignedToUserId = ownerUser.id;
      let assignmentReason = 'whatsapp_owner';

      // Check for round-robin assignment
      try {
        const nextAgent = await roundRobinService.getNextAgent(ownerUser.tenantId, ownerUser.id, ownerUser.name);
        assignedToName = nextAgent.userName;
        assignedToUserId = nextAgent.userId;
        assignmentReason = nextAgent.reason;
      } catch (error) {
        console.error('Error getting next agent from round-robin:', error);
        // Fall back to owner (already set above)
      }

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

      // Log round-robin assignment if applicable
      if (assignmentReason && assignmentReason !== 'whatsapp_owner') {
        try {
          const state = await roundRobinService.getState(ownerUser.tenantId);
          await roundRobinService.logAssignment(
            ownerUser.tenantId,
            lead.id,
            assignedToUserId,
            assignedToName,
            assignmentReason,
            state?.rotationCycle || 0
          );
          console.log(`   ✅ Round-robin assignment logged: ${assignedToName} (${assignmentReason})`);
        } catch (logError) {
          console.error('   ⚠️ Error logging round-robin assignment:', logError);
          // Don't fail the request if logging fails
        }
      }

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
   * IST TIMEZONE CONSTANTS (Server-Independent)
   * IST = UTC + 5:30
   */
  static IST_OFFSET_HOURS = 5;
  static IST_OFFSET_MINUTES = 30;
  static IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000; // 5:30 in milliseconds = 19800000

  /**
   * Get current date/time in Indian Standard Time (IST - UTC+5:30)
   * IMPORTANT: This is completely independent of server timezone
   * Works correctly regardless of where the server is hosted
   * @returns {Object} { date: Date, year, month, day, hours, minutes, seconds, formatted }
   */
  getISTNow() {
    // Get current UTC timestamp (this is always correct regardless of server timezone)
    const nowUTC = new Date();

    // Calculate IST components directly from UTC
    // IST = UTC + 5:30
    const istTime = new Date(nowUTC.getTime() + ActionHandlerService.IST_OFFSET_MS);

    // Extract IST components using UTC methods (since we already added the offset)
    const year = istTime.getUTCFullYear();
    const month = istTime.getUTCMonth();
    const day = istTime.getUTCDate();
    const hours = istTime.getUTCHours();
    const minutes = istTime.getUTCMinutes();
    const seconds = istTime.getUTCSeconds();
    const dayOfWeek = istTime.getUTCDay();

    // Format for logging
    const formatted = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')} ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')} IST`;

    console.log(`   🇮🇳 Current IST (server-independent): ${formatted}`);
    console.log(`   🌐 Server UTC time: ${nowUTC.toISOString()}`);

    return {
      date: istTime,
      year,
      month,
      day,
      hours,
      minutes,
      seconds,
      dayOfWeek,
      formatted,
      utcDate: nowUTC
    };
  }

  /**
   * Create a Date object representing a specific IST time
   * The returned Date, when stored in DB, will represent the correct IST moment
   * @param {number} year - Year
   * @param {number} month - Month (0-11)
   * @param {number} day - Day of month
   * @param {number} hours - Hours (0-23) in IST
   * @param {number} minutes - Minutes (0-59)
   * @returns {Date} Date object representing the IST time
   */
  createISTDate(year, month, day, hours = 10, minutes = 0) {
    // Create a date with the given components as if they were UTC
    const dateAsUTC = Date.UTC(year, month, day, hours, minutes, 0, 0);

    // Subtract IST offset to convert IST -> UTC for storage
    // Because: IST time - 5:30 = UTC time
    const utcTimestamp = dateAsUTC - ActionHandlerService.IST_OFFSET_MS;

    const result = new Date(utcTimestamp);

    console.log(`   🇮🇳 Created IST date: ${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')} ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} IST`);
    console.log(`   🌐 Stored as UTC: ${result.toISOString()}`);

    return result;
  }

  /**
   * Parse date and time string into Date object (assumes IST input)
   * IMPORTANT: Completely server-timezone independent
   * User input is assumed to be in IST, output is stored correctly for IST
   */
  parseDateTime(dateStr, timeStr) {
    // Get current IST time (server-independent)
    const istNow = this.getISTNow();

    console.log(`   🕐 Parsing date/time (assuming IST): dateStr="${dateStr}", timeStr="${timeStr}"`);

    // Start with current IST date components
    let targetYear = istNow.year;
    let targetMonth = istNow.month;
    let targetDay = istNow.day;
    let targetHours = 10; // Default 10 AM IST
    let targetMinutes = 0;

    // Handle relative dates (based on IST)
    if (dateStr) {
      const lowerDateStr = dateStr.toLowerCase().trim();

      if (lowerDateStr === 'today') {
        // Already set to today's IST date
      } else if (lowerDateStr === 'tomorrow') {
        // Add one day
        const tomorrow = new Date(Date.UTC(targetYear, targetMonth, targetDay + 1));
        targetYear = tomorrow.getUTCFullYear();
        targetMonth = tomorrow.getUTCMonth();
        targetDay = tomorrow.getUTCDate();
      } else if (lowerDateStr.startsWith('next')) {
        // "next monday", "next week" etc. - add 7 days
        const nextWeek = new Date(Date.UTC(targetYear, targetMonth, targetDay + 7));
        targetYear = nextWeek.getUTCFullYear();
        targetMonth = nextWeek.getUTCMonth();
        targetDay = nextWeek.getUTCDate();
      } else {
        // Try to parse the date string (e.g., "2026-01-30", "January 30, 2026")
        // For ISO format dates, extract from string to be server-timezone independent
        const isoDateMatch = lowerDateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
        if (isoDateMatch) {
          // ISO format - extract directly from string
          targetYear = parseInt(isoDateMatch[1]);
          targetMonth = parseInt(isoDateMatch[2]) - 1; // 0-indexed
          targetDay = parseInt(isoDateMatch[3]);
        } else {
          // Natural language date - use Date parser as fallback
          const parsed = new Date(dateStr);
          if (!isNaN(parsed.getTime())) {
            // For natural language dates, use local methods
            // This might have timezone issues but is unavoidable for free-form text
            targetYear = parsed.getFullYear();
            targetMonth = parsed.getMonth();
            targetDay = parsed.getDate();
          }
        }
      }
    }

    // Parse time (user specifies IST time)
    if (timeStr) {
      const timeMatch = timeStr.match(/([0-9]{1,2}):?([0-9]{2})?\s*(AM|PM|am|pm)?/i);
      if (timeMatch) {
        let hours = parseInt(timeMatch[1]);
        const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
        const meridiem = timeMatch[3] ? timeMatch[3].toUpperCase() : null;

        // Convert 12-hour to 24-hour format
        if (meridiem === 'PM' && hours < 12) hours += 12;
        if (meridiem === 'AM' && hours === 12) hours = 0;

        targetHours = hours;
        targetMinutes = minutes;
      }
    }

    // Create the IST date (will be stored as correct UTC)
    const result = this.createISTDate(targetYear, targetMonth, targetDay, targetHours, targetMinutes);

    return result;
  }

  /**
   * Get IST date N days from now
   * @param {number} days - Number of days to add
   * @param {number} defaultHour - Default hour in IST (0-23)
   * @returns {Date} Date object representing the IST time
   */
  getISTDatePlusDays(days, defaultHour = 10) {
    const istNow = this.getISTNow();
    const futureDate = new Date(Date.UTC(istNow.year, istNow.month, istNow.day + days));

    return this.createISTDate(
      futureDate.getUTCFullYear(),
      futureDate.getUTCMonth(),
      futureDate.getUTCDate(),
      defaultHour,
      0
    );
  }
}

// Export singleton instance
module.exports = new ActionHandlerService();
