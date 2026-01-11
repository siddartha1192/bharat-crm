/**
 * Call Service
 * High-level service for managing calls (AI and manual)
 * Integrates with Twilio, Prisma, and Call Queue
 */

const { PrismaClient } = require('@prisma/client');
const twilioService = require('./twilio');
const { normalizePhoneNumber } = require('../utils/phoneNormalization');

const prisma = new PrismaClient();

class CallService {
  /**
   * Initiate a call from queue item
   * @param {Object} queueItem - CallQueue item with all necessary data
   * @returns {Promise<Object>} CallLog entry
   */
  async initiateCall(queueItem) {
    try {
      console.log(`[CALL SERVICE] Initiating call for queue item:`, queueItem.id);

      // Get tenant's call settings
      const settings = await prisma.callSettings.findUnique({
        where: { tenantId: queueItem.tenantId }
      });

      if (!settings || !settings.twilioAccountSid || !settings.twilioAuthToken) {
        throw new Error('Twilio not configured for this tenant');
      }

      // Get lead or contact data
      let targetEntity = null;
      if (queueItem.leadId) {
        targetEntity = await prisma.lead.findUnique({
          where: { id: queueItem.leadId }
        });
      } else if (queueItem.contactId) {
        targetEntity = await prisma.contact.findUnique({
          where: { id: queueItem.contactId }
        });
      }

      // Get call script if specified
      let callScript = null;
      if (queueItem.callScriptId) {
        callScript = await prisma.callScript.findUnique({
          where: { id: queueItem.callScriptId }
        });
      } else if (settings.defaultCallScriptId) {
        callScript = await prisma.callScript.findUnique({
          where: { id: settings.defaultCallScriptId }
        });
      }

      // Normalize phone number to E.164 format for Twilio
      const phoneNormalization = normalizePhoneNumber(
        queueItem.phoneNumber,
        queueItem.phoneCountryCode || '+91'
      );

      if (!phoneNormalization.isValid) {
        throw new Error(`Invalid phone number: ${phoneNormalization.error}`);
      }

      const normalizedPhone = phoneNormalization.normalized;
      console.log(`[CALL SERVICE] Normalized phone: ${queueItem.phoneNumber} -> ${normalizedPhone}`);

      // Make the call via Twilio
      const twilioCall = await twilioService.makeCall(
        settings,
        normalizedPhone,
        queueItem.leadId || queueItem.contactId,
        queueItem.callType
      );

      // Create CallLog entry
      const callLog = await prisma.callLog.create({
        data: {
          tenantId: queueItem.tenantId,
          leadId: queueItem.leadId,
          contactId: queueItem.contactId,
          phoneNumber: normalizedPhone, // Store normalized phone number
          phoneCountryCode: queueItem.phoneCountryCode,
          direction: 'outbound',
          callType: queueItem.callType,
          twilioCallSid: twilioCall.callSid,
          twilioStatus: twilioCall.status,
          callScriptId: callScript?.id,
          triggerType: queueItem.triggerType,
          automationRuleId: queueItem.automationRuleId,
          callOutcome: 'initiated',
          createdById: queueItem.createdById,
        }
      });

      // Update lead's call tracking
      if (queueItem.leadId) {
        await prisma.lead.update({
          where: { id: queueItem.leadId },
          data: {
            lastCalledAt: new Date(),
            callCount: { increment: 1 }
          }
        });
      }

      // Update script usage
      if (callScript) {
        await prisma.callScript.update({
          where: { id: callScript.id },
          data: {
            usageCount: { increment: 1 },
            lastUsedAt: new Date()
          }
        });
      }

      console.log(`[CALL SERVICE] Call initiated successfully:`, callLog.id);

      return callLog;
    } catch (error) {
      console.error('[CALL SERVICE] Error initiating call:', error);
      throw error;
    }
  }

  /**
   * Update call status from Twilio webhook
   * @param {string} callSid - Twilio Call SID
   * @param {Object} statusData - Status webhook data
   * @returns {Promise<Object>} Updated CallLog
   */
  async updateCallStatus(callSid, statusData) {
    try {
      // Validate callSid
      if (!callSid) {
        console.error('[CALL SERVICE] Missing callSid in updateCallStatus');
        return null;
      }

      const callLog = await prisma.callLog.findUnique({
        where: { twilioCallSid: callSid }
      });

      if (!callLog) {
        console.warn(`[CALL SERVICE] CallLog not found for SID: ${callSid}`);
        return null;
      }

      const updateData = {
        twilioStatus: statusData.CallStatus,
        updatedAt: new Date(),
      };

      // Update duration if available
      if (statusData.CallDuration) {
        updateData.duration = parseInt(statusData.CallDuration);
      }

      // Update timestamps based on status
      if (statusData.CallStatus === 'ringing' && !callLog.startedAt) {
        updateData.startedAt = new Date();
      }

      if (statusData.CallStatus === 'in-progress' && !callLog.answeredAt) {
        updateData.answeredAt = new Date();
      }

      if (['completed', 'failed', 'busy', 'no-answer', 'canceled'].includes(statusData.CallStatus)) {
        updateData.endedAt = new Date();

        // Set call outcome
        if (statusData.CallStatus === 'completed') {
          updateData.callOutcome = statusData.AnsweredBy === 'machine_start' ? 'voicemail' : 'answered';
        } else {
          updateData.callOutcome = statusData.CallStatus;
        }
      }

      // Store error information
      if (statusData.ErrorCode) {
        updateData.twilioErrorCode = statusData.ErrorCode;
        updateData.twilioErrorMessage = statusData.ErrorMessage || 'Unknown error';
      }

      const updatedCallLog = await prisma.callLog.update({
        where: { id: callLog.id },
        data: updateData
      });

      console.log(`[CALL SERVICE] Updated call status:`, {
        id: updatedCallLog.id,
        status: updatedCallLog.twilioStatus,
        outcome: updatedCallLog.callOutcome
      });

      return updatedCallLog;
    } catch (error) {
      console.error('[CALL SERVICE] Error updating call status:', error);
      throw error;
    }
  }

  /**
   * Handle call recording completion
   * @param {string} callSid - Twilio Call SID
   * @param {Object} recordingData - Recording webhook data
   * @returns {Promise<Object>} Updated CallLog
   */
  async handleRecordingComplete(callSid, recordingData) {
    try {
      // Validate callSid
      if (!callSid) {
        console.error('[CALL SERVICE] Missing callSid in handleRecordingComplete');
        return null;
      }

      const callLog = await prisma.callLog.findUnique({
        where: { twilioCallSid: callSid }
      });

      if (!callLog) {
        console.warn(`[CALL SERVICE] CallLog not found for recording SID: ${callSid}`);
        return null;
      }

      const recordingUrl = `https://api.twilio.com${recordingData.RecordingUrl.replace('.json', '.mp3')}`;

      const updatedCallLog = await prisma.callLog.update({
        where: { id: callLog.id },
        data: {
          recordingUrl,
          recordingSid: recordingData.RecordingSid,
          recordingDuration: parseInt(recordingData.RecordingDuration),
        }
      });

      console.log(`[CALL SERVICE] Recording saved for call:`, updatedCallLog.id);

      return updatedCallLog;
    } catch (error) {
      console.error('[CALL SERVICE] Error handling recording:', error);
      throw error;
    }
  }

  /**
   * Handle call transcription
   * @param {string} callSid - Twilio Call SID
   * @param {string} transcriptionText - Transcription text
   * @returns {Promise<Object>} Updated CallLog
   */
  async handleTranscription(callSid, transcriptionText) {
    try {
      const callLog = await prisma.callLog.findUnique({
        where: { twilioCallSid: callSid }
      });

      if (!callLog) {
        console.warn(`[CALL SERVICE] CallLog not found for transcription: ${callSid}`);
        return null;
      }

      // Basic sentiment analysis (can be enhanced with OpenAI)
      const sentiment = this.analyzeSentiment(transcriptionText);

      const updatedCallLog = await prisma.callLog.update({
        where: { id: callLog.id },
        data: {
          transcript: transcriptionText,
          sentiment,
        }
      });

      console.log(`[CALL SERVICE] Transcription saved for call:`, updatedCallLog.id);

      return updatedCallLog;
    } catch (error) {
      console.error('[CALL SERVICE] Error handling transcription:', error);
      throw error;
    }
  }

  /**
   * Generate call summary using AI
   * @param {string} callLogId - CallLog ID
   * @returns {Promise<Object>} Updated CallLog with summary
   */
  async generateCallSummary(callLogId) {
    try {
      const callLog = await prisma.callLog.findUnique({
        where: { id: callLogId },
        include: {
          lead: true,
          contact: true
        }
      });

      if (!callLog || !callLog.transcript) {
        throw new Error('CallLog or transcript not found');
      }

      // Get tenant's OpenAI settings
      const settings = await prisma.callSettings.findUnique({
        where: { tenantId: callLog.tenantId }
      });

      if (!settings || !settings.openaiApiKey) {
        console.warn('[CALL SERVICE] OpenAI not configured, skipping summary');
        return callLog;
      }

      // Generate summary using OpenAI
      const OpenAI = require('openai');
      const openai = new OpenAI({ apiKey: settings.openaiApiKey });

      // Realtime models (gpt-4o-realtime-*) are for voice/streaming, not chat completions
      // Fallback to gpt-4o-mini for chat completions
      let modelToUse = settings.openaiModel || 'gpt-4o-mini';
      if (modelToUse.includes('realtime')) {
        console.log(`[CALL SERVICE] Detected realtime model (${modelToUse}), falling back to gpt-4o-mini for chat completion`);
        modelToUse = 'gpt-4o-mini';
      }

      const completion = await openai.chat.completions.create({
        model: modelToUse,
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that summarizes sales call transcripts. Provide a concise summary highlighting key points, customer concerns, next steps, and overall sentiment.'
          },
          {
            role: 'user',
            content: `Summarize this call transcript:\n\n${callLog.transcript}`
          }
        ],
        temperature: 0.5,
        max_tokens: 300
      });

      const summary = completion.choices[0].message.content;

      // Update call log with summary
      const updatedCallLog = await prisma.callLog.update({
        where: { id: callLogId },
        data: {
          summary,
          aiTokensUsed: completion.usage.total_tokens,
          aiCost: this.calculateOpenAICost(completion.usage, modelToUse)
        }
      });

      console.log(`[CALL SERVICE] Summary generated for call:`, updatedCallLog.id);

      return updatedCallLog;
    } catch (error) {
      console.error('[CALL SERVICE] Error generating summary:', error);
      throw error;
    }
  }

  /**
   * Get call logs with filters
   * @param {Object} filters - Filter criteria
   * @returns {Promise<Array>} Call logs
   */
  async getCallLogs(filters) {
    try {
      const {
        tenantId,
        leadId,
        contactId,
        callType,
        callOutcome,
        startDate,
        endDate,
        page = 1,
        limit = 50
      } = filters;

      const where = { tenantId };

      if (leadId) where.leadId = leadId;
      if (contactId) where.contactId = contactId;
      if (callType) where.callType = callType;
      if (callOutcome) where.callOutcome = callOutcome;
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate);
        if (endDate) where.createdAt.lte = new Date(endDate);
      }

      const [callLogs, total] = await Promise.all([
        prisma.callLog.findMany({
          where,
          include: {
            lead: {
              select: { id: true, name: true, company: true, email: true }
            },
            contact: {
              select: { id: true, name: true, company: true, email: true }
            },
            callScript: {
              select: { id: true, name: true }
            },
            createdBy: {
              select: { id: true, name: true, email: true }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit
        }),
        prisma.callLog.count({ where })
      ]);

      return {
        callLogs,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('[CALL SERVICE] Error fetching call logs:', error);
      throw error;
    }
  }

  /**
   * Cancel a queued or in-progress call
   * @param {string} callLogId - CallLog ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Updated CallLog
   */
  async cancelCall(callLogId, tenantId) {
    try {
      const callLog = await prisma.callLog.findUnique({
        where: { id: callLogId }
      });

      if (!callLog || callLog.tenantId !== tenantId) {
        throw new Error('Call not found');
      }

      if (!['queued', 'ringing', 'in-progress'].includes(callLog.twilioStatus)) {
        throw new Error('Call cannot be cancelled in current state');
      }

      // Get settings
      const settings = await prisma.callSettings.findUnique({
        where: { tenantId }
      });

      // Cancel via Twilio
      await twilioService.cancelCall(
        settings.twilioAccountSid,
        settings.twilioAuthToken,
        callLog.twilioCallSid
      );

      // Update database
      const updatedCallLog = await prisma.callLog.update({
        where: { id: callLogId },
        data: {
          twilioStatus: 'canceled',
          callOutcome: 'canceled',
          endedAt: new Date()
        }
      });

      return updatedCallLog;
    } catch (error) {
      console.error('[CALL SERVICE] Error canceling call:', error);
      throw error;
    }
  }

  /**
   * Simple sentiment analysis
   * @param {string} text - Text to analyze
   * @returns {string} Sentiment: 'positive' | 'neutral' | 'negative'
   */
  analyzeSentiment(text) {
    const positiveWords = ['great', 'good', 'excellent', 'happy', 'interested', 'yes', 'perfect', 'love'];
    const negativeWords = ['bad', 'no', 'not interested', 'busy', 'never', 'stop', 'remove', 'angry'];

    const lowerText = text.toLowerCase();
    let positiveCount = 0;
    let negativeCount = 0;

    positiveWords.forEach(word => {
      if (lowerText.includes(word)) positiveCount++;
    });

    negativeWords.forEach(word => {
      if (lowerText.includes(word)) negativeCount++;
    });

    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  /**
   * Calculate OpenAI API cost
   * @param {Object} usage - Token usage
   * @param {string} model - Model name
   * @returns {number} Cost in USD
   */
  calculateOpenAICost(usage, model) {
    // Approximate costs per 1000 tokens (as of 2024)
    const prices = {
      'gpt-4o': { input: 0.005, output: 0.015 },
      'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
      'gpt-4o-realtime-preview': { input: 0.06, output: 0.24 }
    };

    const modelPrices = prices[model] || prices['gpt-4o-mini'];
    const inputCost = (usage.prompt_tokens / 1000) * modelPrices.input;
    const outputCost = (usage.completion_tokens / 1000) * modelPrices.output;

    return inputCost + outputCost;
  }
}

module.exports = new CallService();
