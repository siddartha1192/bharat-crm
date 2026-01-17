const OpenAI = require('openai');
// Using console for logging
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Enterprise AI Service for extracting demo/meeting scheduling from call transcripts
 * This is a PROFESSIONAL/ENTERPRISE feature only
 */
class DemoSchedulingAIService {
  constructor() {
    this.openai = null;
    this.initialized = false;
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
          openaiModel: true,
        },
      });

      const apiKey = settings?.openaiApiKey || process.env.OPENAI_API_KEY;

      if (!apiKey) {
        console.warn('OpenAI API key not configured for demo scheduling');
        return false;
      }

      this.openai = new OpenAI({ apiKey });
      this.model = settings?.openaiModel || 'gpt-4o-mini';
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
- Extract timezone if mentioned (IST, PST, etc.)

Return ONLY valid JSON, no additional text.`;
  }

  /**
   * Convert extracted meeting info into calendar event format
   *
   * @param {Object} meetingInfo - Extracted meeting information
   * @param {Object} leadData - Lead information
   * @param {Object} callData - Call log information
   * @returns {Object} Calendar event data
   */
  formatAsCalendarEvent(meetingInfo, leadData, callData) {
    try {
      // Determine start time
      let startDateTime;

      if (meetingInfo.proposedDateTime) {
        startDateTime = new Date(meetingInfo.proposedDateTime);
      } else if (meetingInfo.proposedDate && meetingInfo.proposedTime) {
        startDateTime = new Date(`${meetingInfo.proposedDate}T${meetingInfo.proposedTime}`);
      } else if (meetingInfo.proposedDate) {
        // Default to 10 AM if only date provided
        startDateTime = new Date(`${meetingInfo.proposedDate}T10:00:00`);
      } else {
        // No date specified - schedule for tomorrow at 10 AM
        startDateTime = new Date();
        startDateTime.setDate(startDateTime.getDate() + 1);
        startDateTime.setHours(10, 0, 0, 0);
      }

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
