const logger = require('./logger');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const demoSchedulingAI = require('./ai/demoSchedulingAI.service');
const googleCalendarService = require('./googleCalendar');

/**
 * Service for automating demo scheduling from AI call transcripts
 * Integrates AI extraction with calendar booking
 * PROFESSIONAL/ENTERPRISE feature only
 */
class DemoSchedulingAutomationService {
  /**
   * Process a completed call for demo scheduling
   * This is the main entry point called after a call completes
   *
   * @param {string} callLogId - The call log ID
   * @param {string} userId - The user who made the call
   * @param {string} tenantId - The tenant ID
   * @returns {Promise<Object>} Processing result
   */
  async processCallForDemoScheduling(callLogId, userId, tenantId) {
    try {
      logger.info(`Processing call ${callLogId} for demo scheduling`);

      // 1. Check if feature is enabled and user has access
      const accessCheck = await this.checkFeatureAccess(tenantId);
      if (!accessCheck.enabled) {
        logger.info(`Demo scheduling not enabled for tenant ${tenantId}: ${accessCheck.reason}`);
        return {
          success: false,
          skipped: true,
          reason: accessCheck.reason,
        };
      }

      // 2. Get call log with all related data
      const callLog = await this.getCallLogWithRelations(callLogId, tenantId);
      if (!callLog) {
        throw new Error(`Call log ${callLogId} not found`);
      }

      // 3. Validate call is suitable for processing
      const validation = await this.validateCallForProcessing(callLog);
      if (!validation.valid) {
        logger.info(`Call ${callLogId} not suitable for demo scheduling: ${validation.reason}`);
        return {
          success: false,
          skipped: true,
          reason: validation.reason,
        };
      }

      // 4. Initialize AI service
      await demoSchedulingAI.initialize(tenantId);

      // 5. Extract meeting information from transcript
      const meetingInfo = await demoSchedulingAI.extractMeetingFromTranscript(
        callLog.transcript,
        {
          leadName: callLog.lead?.name,
          leadEmail: callLog.lead?.email,
          leadPhone: callLog.phoneNumber,
          callDate: callLog.createdAt,
        }
      );

      logger.info(`Meeting extraction completed`, {
        callLogId,
        hasMeeting: meetingInfo.hasMeetingRequest,
        agreed: meetingInfo.agreed,
        confidence: meetingInfo.confidence,
      });

      // 6. Save extraction results to call log
      await this.saveMeetingExtractionToCallLog(callLogId, meetingInfo);

      // 7. If meeting was agreed and confidence is high enough, book calendar event
      const callSettings = accessCheck.settings;
      const shouldAutoBook = meetingInfo.agreed &&
                           meetingInfo.hasMeetingRequest &&
                           meetingInfo.confidence >= callSettings.demoSchedulingMinConfidence &&
                           callSettings.demoSchedulingAutoBook;

      let calendarEvent = null;
      if (shouldAutoBook) {
        logger.info(`Auto-booking calendar event for call ${callLogId}`);
        calendarEvent = await this.createCalendarEvent(
          meetingInfo,
          callLog,
          userId,
          tenantId,
          callSettings
        );
      } else {
        logger.info(`Not auto-booking: agreed=${meetingInfo.agreed}, confidence=${meetingInfo.confidence}, threshold=${callSettings.demoSchedulingMinConfidence}`);
      }

      // 8. Send notifications if configured
      if (calendarEvent && callSettings.demoSchedulingNotifyUser) {
        await this.sendNotifications(callLog, meetingInfo, calendarEvent, userId, tenantId);
      }

      return {
        success: true,
        meetingInfo,
        calendarEvent,
        autoBooked: !!calendarEvent,
      };
    } catch (error) {
      logger.error(`Error processing call ${callLogId} for demo scheduling:`, error);
      throw error;
    }
  }

  /**
   * Check if demo scheduling feature is enabled and accessible
   */
  async checkFeatureAccess(tenantId) {
    try {
      // Check subscription plan
      const planAccess = await demoSchedulingAI.validateFeatureAccess(tenantId);
      if (!planAccess.hasAccess) {
        return {
          enabled: false,
          reason: planAccess.reason,
        };
      }

      // Check if feature is enabled in settings
      const settings = await prisma.callSettings.findUnique({
        where: { tenantId },
      });

      if (!settings || !settings.enableDemoScheduling) {
        return {
          enabled: false,
          reason: 'Demo scheduling feature is not enabled in Call Settings',
        };
      }

      return {
        enabled: true,
        settings,
        plan: planAccess.plan,
      };
    } catch (error) {
      logger.error('Error checking feature access:', error);
      return {
        enabled: false,
        reason: 'Error checking feature access',
      };
    }
  }

  /**
   * Get call log with all related data
   */
  async getCallLogWithRelations(callLogId, tenantId) {
    return await prisma.callLog.findFirst({
      where: {
        id: callLogId,
        tenantId,
      },
      include: {
        lead: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            company: true,
            stage: true,
          },
        },
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            company: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            calendarAccessToken: true,
            calendarRefreshToken: true,
          },
        },
      },
    });
  }

  /**
   * Validate if call is suitable for demo scheduling processing
   */
  async validateCallForProcessing(callLog) {
    // Must have transcript
    if (!callLog.transcript || callLog.transcript.trim().length === 0) {
      return {
        valid: false,
        reason: 'No transcript available',
      };
    }

    // Must be completed successfully
    if (callLog.callOutcome !== 'completed' && callLog.callOutcome !== 'answered') {
      return {
        valid: false,
        reason: `Call outcome is ${callLog.callOutcome}`,
      };
    }

    // Should have a lead associated
    if (!callLog.leadId && !callLog.contactId) {
      return {
        valid: false,
        reason: 'No lead or contact associated with call',
      };
    }

    // Don't process if already processed
    if (callLog.meetingExtracted) {
      return {
        valid: false,
        reason: 'Meeting already extracted from this call',
      };
    }

    return { valid: true };
  }

  /**
   * Save meeting extraction results to call log
   */
  async saveMeetingExtractionToCallLog(callLogId, meetingInfo) {
    try {
      const updateData = {
        meetingExtracted: true,
        hasMeetingRequest: meetingInfo.hasMeetingRequest,
        meetingAgreed: meetingInfo.agreed,
        meetingType: meetingInfo.meetingType,
        meetingDateTimeText: meetingInfo.dateTimeText,
        meetingDuration: meetingInfo.duration,
        meetingPreferences: meetingInfo.leadPreferences,
        meetingNotes: meetingInfo.notes,
        meetingConfidence: meetingInfo.confidence,
        meetingReasonDeclined: meetingInfo.reasonForDecline,
        meetingExtractionCost: demoSchedulingAI.calculateExtractionCost(
          meetingInfo.tokensUsed,
          meetingInfo.model
        ),
      };

      // Parse and save date/time if available
      if (meetingInfo.proposedDateTime) {
        updateData.meetingProposedDate = new Date(meetingInfo.proposedDateTime);
      } else if (meetingInfo.proposedDate) {
        updateData.meetingProposedDate = new Date(meetingInfo.proposedDate);
      }

      if (meetingInfo.proposedTime) {
        updateData.meetingProposedTime = meetingInfo.proposedTime;
      }

      await prisma.callLog.update({
        where: { id: callLogId },
        data: updateData,
      });

      logger.info(`Saved meeting extraction results to call log ${callLogId}`);
    } catch (error) {
      logger.error('Error saving meeting extraction to call log:', error);
      throw error;
    }
  }

  /**
   * Create calendar event for the scheduled meeting
   */
  async createCalendarEvent(meetingInfo, callLog, userId, tenantId, callSettings) {
    try {
      // Get user's calendar credentials
      const user = callLog.createdBy;
      if (!user.calendarAccessToken) {
        logger.warn(`User ${userId} does not have calendar connected`);
        return null;
      }

      // Prepare lead data
      const leadData = callLog.lead || {
        id: callLog.contactId,
        name: callLog.contact ? `${callLog.contact.firstName} ${callLog.contact.lastName}` : 'Unknown',
        email: callLog.contact?.email,
        phone: callLog.contact?.phone,
        company: callLog.contact?.company,
      };

      // Format as calendar event
      const eventData = demoSchedulingAI.formatAsCalendarEvent(
        meetingInfo,
        leadData,
        callLog
      );

      // Create event in Google Calendar
      logger.info(`Creating Google Calendar event for meeting`);

      const calendarEvent = await googleCalendarService.createEvent(
        userId,
        tenantId,
        {
          summary: eventData.summary,
          description: eventData.description,
          start: {
            dateTime: eventData.startDateTime,
            timeZone: callSettings.timezone || 'Asia/Kolkata',
          },
          end: {
            dateTime: eventData.endDateTime,
            timeZone: callSettings.timezone || 'Asia/Kolkata',
          },
          attendees: eventData.attendees,
          location: eventData.location,
          reminders: eventData.reminders,
          // Only send invite if configured
          sendUpdates: callSettings.demoSchedulingNotifyLead ? 'all' : 'none',
        },
        callSettings.demoSchedulingCalendarId // Use specified calendar or null for primary
      );

      // Update call log with calendar event ID
      await prisma.callLog.update({
        where: { id: callLog.id },
        data: { meetingCalendarEventId: calendarEvent.id },
      });

      logger.info(`Calendar event created successfully`, {
        eventId: calendarEvent.id,
        callLogId: callLog.id,
      });

      return calendarEvent;
    } catch (error) {
      logger.error('Error creating calendar event:', error);
      // Don't throw - log error but continue
      return null;
    }
  }

  /**
   * Send notifications about the scheduled meeting
   */
  async sendNotifications(callLog, meetingInfo, calendarEvent, userId, tenantId) {
    try {
      // TODO: Implement notification system
      // Options:
      // 1. In-app notification
      // 2. Email notification to user
      // 3. WhatsApp notification to user
      // 4. Task creation for follow-up

      logger.info(`Notifications would be sent here`, {
        callLogId: callLog.id,
        userId,
        meetingType: meetingInfo.meetingType,
      });

      // For now, just log
      // Future: Integrate with notification service
    } catch (error) {
      logger.error('Error sending notifications:', error);
      // Don't throw - notifications are not critical
    }
  }

  /**
   * Manual trigger for extracting meeting from a specific call
   * (For testing or re-processing)
   */
  async manualExtractMeeting(callLogId, userId, tenantId) {
    try {
      // First, reset the extraction flag
      await prisma.callLog.update({
        where: { id: callLogId },
        data: { meetingExtracted: false },
      });

      // Then process normally
      return await this.processCallForDemoScheduling(callLogId, userId, tenantId);
    } catch (error) {
      logger.error('Error in manual meeting extraction:', error);
      throw error;
    }
  }

  /**
   * Get statistics about demo scheduling automation
   */
  async getStatistics(tenantId, startDate, endDate) {
    try {
      const where = {
        tenantId,
        meetingExtracted: true,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      };

      const [total, withMeetingRequest, agreed, autoBooked] = await Promise.all([
        prisma.callLog.count({ where }),
        prisma.callLog.count({ where: { ...where, hasMeetingRequest: true } }),
        prisma.callLog.count({ where: { ...where, meetingAgreed: true } }),
        prisma.callLog.count({
          where: {
            ...where,
            meetingCalendarEventId: { not: null },
          },
        }),
      ]);

      const totalCost = await prisma.callLog.aggregate({
        where,
        _sum: { meetingExtractionCost: true },
      });

      return {
        total,
        withMeetingRequest,
        agreed,
        autoBooked,
        conversionRate: total > 0 ? ((agreed / total) * 100).toFixed(2) : 0,
        autoBookRate: agreed > 0 ? ((autoBooked / agreed) * 100).toFixed(2) : 0,
        totalCost: totalCost._sum.meetingExtractionCost || 0,
      };
    } catch (error) {
      logger.error('Error getting demo scheduling statistics:', error);
      throw error;
    }
  }
}

module.exports = new DemoSchedulingAutomationService();
