const OpenAI = require('openai');
// Using console for logging
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * IST Timezone Constants (Server-Independent)
 * IST = UTC + 5:30
 */
const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000; // 5:30 in milliseconds = 19800000

/**
 * Enterprise AI Service for extracting demo/meeting scheduling from call transcripts
 * This is a PROFESSIONAL/ENTERPRISE feature only
 * All dates/times are handled in IST (Indian Standard Time) independent of server timezone
 */
class DemoSchedulingAIService {
  constructor() {
    this.openai = null;
    this.initialized = false;
  }

  /**
   * Get current date/time in IST (server-timezone independent)
   * @returns {Object} IST date components
   */
  getISTNow() {
    const nowUTC = new Date();
    const istTime = new Date(nowUTC.getTime() + IST_OFFSET_MS);

    return {
      date: istTime,
      year: istTime.getUTCFullYear(),
      month: istTime.getUTCMonth(),
      day: istTime.getUTCDate(),
      hours: istTime.getUTCHours(),
      minutes: istTime.getUTCMinutes(),
      formatted: `${istTime.getUTCFullYear()}-${String(istTime.getUTCMonth() + 1).padStart(2, '0')}-${String(istTime.getUTCDate()).padStart(2, '0')} ${String(istTime.getUTCHours()).padStart(2, '0')}:${String(istTime.getUTCMinutes()).padStart(2, '0')} IST`
    };
  }

  /**
   * Create a Date object for specific IST time (server-timezone independent)
   * @param {number} year
   * @param {number} month (0-11)
   * @param {number} day
   * @param {number} hours (0-23) in IST
   * @param {number} minutes
   * @returns {Date} Date object representing the IST time as UTC
   */
  createISTDate(year, month, day, hours = 10, minutes = 0) {
    // Create as if UTC, then subtract IST offset to get correct UTC time
    const dateAsUTC = Date.UTC(year, month, day, hours, minutes, 0, 0);
    const utcTimestamp = dateAsUTC - IST_OFFSET_MS;
    return new Date(utcTimestamp);
  }

  /**
   * Get IST date N days from now
   * @param {number} days
   * @param {number} defaultHour in IST (0-23)
   * @returns {Date}
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

  /**
   * Initialize OpenAI client with tenant-specific or global API key
   */
  async initialize(tenantId) {
    try {
      if (this.initialized) return true;

      // Get tenant settings for API key
      const settings = await prisma.callSettings.findUnique({
        where: { tenantId },
        select: {
          openaiApiKey: true,
        },
      });

      const apiKey = settings?.openaiApiKey || process.env.OPENAI_API_KEY;

      if (!apiKey) {
        console.warn('OpenAI API key not configured for demo scheduling');
        return false;
      }

      this.openai = new OpenAI({ apiKey });
      // Use chat model for transcript analysis (NOT the realtime model used for voice calls)
      this.model = process.env.DEMO_SCHEDULING_MODEL || 'gpt-4o-mini';
      this.initialized = true;

      console.info('Demo Scheduling AI Service initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize Demo Scheduling AI Service:', error);
      return false;
    }
  }

  /**
   * Extract demo/meeting scheduling information from call transcript
   *
   * @param {string} transcript - The full call transcript
   * @param {Object} callContext - Additional context about the call
   * @returns {Promise<Object>} Extracted meeting information
   */
  async extractMeetingFromTranscript(transcript, callContext = {}) {
    try {
      if (!this.initialized) {
        throw new Error('DemoSchedulingAI not initialized');
      }

      if (!transcript || transcript.trim().length === 0) {
        console.warn('Empty transcript provided for meeting extraction');
        return {
          hasMeetingRequest: false,
          agreed: false,
          reason: 'Empty transcript',
        };
      }

      const prompt = this.buildExtractionPrompt(transcript, callContext);

      console.info('Extracting meeting info from transcript using GPT-4o-mini');

      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: `You are an expert AI assistant that analyzes sales call transcripts to extract meeting/demo scheduling information.

Your job is to:
1. Determine if a demo or meeting was requested during the call
2. Identify if the lead agreed to the demo/meeting
3. Extract the date and time if mentioned
4. Extract any preferences or notes about the meeting
5. Understand various date/time formats (relative like "tomorrow", "next Monday", absolute dates, etc.)

Return structured JSON data ONLY. Be conservative - only mark as agreed if there's clear consent.`,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.2, // Low temperature for more deterministic extraction
        response_format: { type: 'json_object' },
      });

      const result = JSON.parse(completion.choices[0].message.content);

      // Add metadata
      result.extractedAt = new Date().toISOString();
      result.tokensUsed = completion.usage?.total_tokens || 0;
      result.model = this.model;

      console.info('Meeting extraction completed', {
        hasMeeting: result.hasMeetingRequest,
        agreed: result.agreed,
        tokensUsed: result.tokensUsed,
      });

      return result;
    } catch (error) {
      console.error('Error extracting meeting from transcript:', error);
      throw error;
    }
  }

  /**
   * Build the extraction prompt with context
   */
  buildExtractionPrompt(transcript, callContext) {
    const currentDateTime = new Date().toISOString();
    const { leadName, leadEmail, leadPhone, callDate } = callContext;

    return `Analyze this sales call transcript and extract meeting/demo scheduling information.

**Call Context:**
- Call Date: ${callDate || currentDateTime}
- Lead Name: ${leadName || 'Unknown'}
- Lead Contact: ${leadEmail || leadPhone || 'Unknown'}

**Transcript:**
${transcript}

**Instructions:**
Extract the following information and return as JSON:

{
  "hasMeetingRequest": boolean,  // Was a demo/meeting/appointment requested?
  "agreed": boolean,              // Did the lead explicitly agree to the meeting?
  "meetingType": string,          // "demo", "meeting", "call", "appointment", or null
  "proposedDate": string,         // ISO date string if mentioned (YYYY-MM-DD), or null
  "proposedTime": string,         // Time if mentioned (HH:MM format, 24-hour), or null
  "proposedDateTime": string,     // Full ISO datetime if both date and time mentioned
  "dateTimeText": string,         // Original text mentioning the date/time
  "duration": number,             // Expected duration in minutes if mentioned, or null
  "leadPreferences": string,      // Any preferences mentioned (morning/afternoon/timezone/etc)
  "notes": string,                // Additional relevant notes about the scheduling
  "confidence": number,           // Confidence score 0-100 for the extraction
  "reasonForDecline": string      // If declined, why? (null if agreed or not mentioned)
}

**Important:**
- Only set "agreed" to true if there's explicit consent ("Yes", "Sure", "That works", etc.)
- Parse relative dates like "tomorrow", "next week", "Monday" based on call date
- If no specific date/time mentioned but agreed, set agreed=true with null date/time
- Be conservative with "agreed" - uncertain means false
- **TIMEZONE: Assume all times are in IST (Indian Standard Time) unless explicitly stated otherwise**
- When returning proposedTime, use 24-hour format (HH:MM)
- When returning proposedDate, use ISO format (YYYY-MM-DD)

Return ONLY valid JSON, no additional text.`;
  }

  /**
   * Convert extracted meeting info into calendar event format
   * All times are in IST (Indian Standard Time) - server-timezone independent
   *
   * @param {Object} meetingInfo - Extracted meeting information
   * @param {Object} leadData - Lead information
   * @param {Object} callData - Call log information
   * @returns {Object} Calendar event data
   */
  formatAsCalendarEvent(meetingInfo, leadData, callData) {
    try {
      // Determine start time (all times treated as IST)
      let startDateTime;

      console.log(`   🇮🇳 Formatting calendar event in IST (server-independent)`);

      if (meetingInfo.proposedDateTime) {
        // Parse the proposed datetime - assume it's in IST
        const parsed = new Date(meetingInfo.proposedDateTime);
        if (!isNaN(parsed.getTime())) {
          // The AI returned an ISO string - treat the time as IST
          // Extract components and create proper IST date
          const year = parsed.getFullYear();
          const month = parsed.getMonth();
          const day = parsed.getDate();
          const hours = parsed.getHours();
          const minutes = parsed.getMinutes();
          startDateTime = this.createISTDate(year, month, day, hours, minutes);
          console.log(`   🕐 Parsed proposedDateTime: ${meetingInfo.proposedDateTime} -> IST ${hours}:${String(minutes).padStart(2, '0')}`);
        } else {
          startDateTime = this.getISTDatePlusDays(1, 10); // Default tomorrow 10 AM IST
        }
      } else if (meetingInfo.proposedDate && meetingInfo.proposedTime) {
        // Parse date and time separately (both in IST)
        const dateParts = meetingInfo.proposedDate.split('-');
        const timeParts = meetingInfo.proposedTime.split(':');
        const year = parseInt(dateParts[0]);
        const month = parseInt(dateParts[1]) - 1; // 0-indexed
        const day = parseInt(dateParts[2]);
        const hours = parseInt(timeParts[0]);
        const minutes = parseInt(timeParts[1]) || 0;
        startDateTime = this.createISTDate(year, month, day, hours, minutes);
        console.log(`   🕐 Parsed date+time: ${meetingInfo.proposedDate} ${meetingInfo.proposedTime} IST`);
      } else if (meetingInfo.proposedDate) {
        // Only date provided - default to 10 AM IST
        const dateParts = meetingInfo.proposedDate.split('-');
        const year = parseInt(dateParts[0]);
        const month = parseInt(dateParts[1]) - 1;
        const day = parseInt(dateParts[2]);
        startDateTime = this.createISTDate(year, month, day, 10, 0);
        console.log(`   🕐 Parsed date only: ${meetingInfo.proposedDate}, defaulting to 10 AM IST`);
      } else {
        // No date specified - schedule for tomorrow at 10 AM IST (server-independent)
        startDateTime = this.getISTDatePlusDays(1, 10);
        console.log(`   🕐 No date specified, defaulting to tomorrow 10 AM IST`);
      }

      console.log(`   🌐 Calendar event start time (UTC): ${startDateTime.toISOString()}`);

      // Determine duration (default 30 minutes for demo, 60 for meeting)
      const duration = meetingInfo.duration ||
                      (meetingInfo.meetingType === 'demo' ? 30 : 60);

      // Calculate end time
      const endDateTime = new Date(startDateTime);
      endDateTime.setMinutes(endDateTime.getMinutes() + duration);

      // Build event title
      const meetingTypeText = meetingInfo.meetingType || 'Meeting';
      const title = `${meetingTypeText.charAt(0).toUpperCase() + meetingTypeText.slice(1)} - ${leadData.name || 'Lead'}`;

      // Build description
      const description = this.buildEventDescription(meetingInfo, leadData, callData);

      return {
        summary: title,
        description,
        startDateTime: startDateTime.toISOString(),
        endDateTime: endDateTime.toISOString(),
        attendees: this.buildAttendeeList(leadData),
        location: meetingInfo.meetingType === 'demo' ? 'Online Demo' : '',
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 }, // 1 day before
            { method: 'popup', minutes: 30 },       // 30 minutes before
          ],
        },
        metadata: {
          source: 'ai-call-automation',
          callLogId: callData.id,
          leadId: leadData.id,
          extractionConfidence: meetingInfo.confidence,
          extractedDateTime: meetingInfo.dateTimeText,
        },
      };
    } catch (error) {
      console.error('Error formatting calendar event:', error);
      throw error;
    }
  }

  /**
   * Build event description with call context
   */
  buildEventDescription(meetingInfo, leadData, callData) {
    const lines = [];

    lines.push(`🤖 Automatically scheduled from AI call on ${new Date(callData.createdAt).toLocaleDateString()}`);
    lines.push('');

    lines.push('**Lead Information:**');
    lines.push(`- Name: ${leadData.name || 'N/A'}`);
    if (leadData.email) lines.push(`- Email: ${leadData.email}`);
    if (leadData.phone) lines.push(`- Phone: ${leadData.phone}`);
    if (leadData.company) lines.push(`- Company: ${leadData.company}`);
    lines.push('');

    if (meetingInfo.notes) {
      lines.push('**Meeting Notes:**');
      lines.push(meetingInfo.notes);
      lines.push('');
    }

    if (meetingInfo.leadPreferences) {
      lines.push('**Lead Preferences:**');
      lines.push(meetingInfo.leadPreferences);
      lines.push('');
    }

    if (callData.summary) {
      lines.push('**Call Summary:**');
      lines.push(callData.summary);
      lines.push('');
    }

    lines.push('---');
    lines.push(`Call Log ID: ${callData.id}`);
    lines.push(`Extraction Confidence: ${meetingInfo.confidence}%`);

    return lines.join('\n');
  }

  /**
   * Build attendee list for calendar event
   */
  buildAttendeeList(leadData) {
    const attendees = [];

    if (leadData.email) {
      attendees.push({
        email: leadData.email,
        displayName: leadData.name || leadData.email,
        responseStatus: 'needsAction',
      });
    }

    return attendees;
  }

  /**
   * Calculate cost for the AI extraction
   */
  calculateExtractionCost(tokensUsed, model = 'gpt-4o-mini') {
    const pricing = {
      'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
      'gpt-4o': { input: 0.005, output: 0.015 },
    };

    const rates = pricing[model] || pricing['gpt-4o-mini'];

    // Rough estimate: 60% input, 40% output tokens
    const inputTokens = Math.floor(tokensUsed * 0.6);
    const outputTokens = Math.floor(tokensUsed * 0.4);

    const cost = (inputTokens / 1000 * rates.input) + (outputTokens / 1000 * rates.output);

    return parseFloat(cost.toFixed(6));
  }

  /**
   * Validate that tenant has access to this feature
   */
  async validateFeatureAccess(tenantId) {
    try {
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { plan: true, status: true },
      });

      if (!tenant) {
        return { hasAccess: false, reason: 'Tenant not found' };
      }

      if (tenant.status !== 'ACTIVE' && tenant.status !== 'TRIAL') {
        return { hasAccess: false, reason: 'Subscription not active' };
      }

      // Only PROFESSIONAL and ENTERPRISE plans have access
      const allowedPlans = ['PROFESSIONAL', 'ENTERPRISE', 'FREE']; // FREE for trial

      if (!allowedPlans.includes(tenant.plan)) {
        return {
          hasAccess: false,
          reason: 'This feature requires Professional or Enterprise plan',
          currentPlan: tenant.plan,
        };
      }

      return { hasAccess: true, plan: tenant.plan };
    } catch (error) {
      console.error('Error validating feature access:', error);
      return { hasAccess: false, reason: 'Error checking subscription' };
    }
  }
}

// Export singleton instance
module.exports = new DemoSchedulingAIService();
