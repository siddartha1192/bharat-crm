/**
 * Call Management Routes
 * Handles all calling-related endpoints
 */

const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { authenticate } = require('../middleware/auth');
const { tenantContext } = require('../middleware/tenant');

const callQueueService = require('../services/callQueueService');
const callService = require('../services/callService');
const twilioService = require('../services/twilio');

const prisma = new PrismaClient();

// Configure multer for document uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/call-scripts');
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'script-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.txt', '.pdf', '.doc', '.docx', '.md'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Allowed: txt, pdf, doc, docx, md'));
    }
  }
});

// Apply authentication and tenant context to all routes EXCEPT webhooks
router.use((req, res, next) => {
  // Skip auth for webhook endpoints (called by Twilio servers)
  if (req.path.startsWith('/webhook/')) {
    return next();
  }
  authenticate(req, res, next);
});

router.use((req, res, next) => {
  // Skip tenant context for webhook endpoints
  if (req.path.startsWith('/webhook/')) {
    return next();
  }
  tenantContext(req, res, next);
});

// ==========================================
// CALL INITIATION
// ==========================================

/**
 * POST /api/calls/initiate
 * Initiate a manual call (adds to queue)
 */
router.post('/initiate', async (req, res) => {
  try {
    const {
      leadId,
      contactId,
      phoneNumber,
      phoneCountryCode = '+91',
      callType = 'ai',
      callScriptId,
      priority = 7,
      scheduledFor
    } = req.body;

    const tenantId = req.user.tenantId;
    const userId = req.user.id;

    // Validate input
    if (!phoneNumber && !leadId && !contactId) {
      return res.status(400).json({
        error: 'Either phoneNumber, leadId, or contactId is required'
      });
    }

    // If lead/contact ID provided, get phone number
    let targetPhone = phoneNumber;
    if (!targetPhone && leadId) {
      const lead = await prisma.lead.findUnique({
        where: { id: leadId },
        select: { phone: true, phoneCountryCode: true }
      });
      targetPhone = lead.phone;
    } else if (!targetPhone && contactId) {
      const contact = await prisma.contact.findUnique({
        where: { id: contactId },
        select: { phone: true, phoneCountryCode: true }
      });
      targetPhone = contact.phone;
    }

    // Queue the call
    const queueItem = await callQueueService.queueCall({
      tenantId,
      leadId,
      contactId,
      phoneNumber: targetPhone,
      phoneCountryCode,
      callType,
      callScriptId,
      triggerType: 'manual',
      priority,
      scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
      createdById: userId
    });

    res.json({
      success: true,
      message: 'Call queued successfully',
      queueItem: {
        id: queueItem.id,
        status: queueItem.status,
        phoneNumber: queueItem.phoneNumber,
        scheduledFor: queueItem.scheduledFor,
        priority: queueItem.priority
      }
    });
  } catch (error) {
    console.error('[CALLS API] Error initiating call:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// CALL LOGS
// ==========================================

/**
 * GET /api/calls/logs
 * Get call logs with filters
 */
router.get('/logs', async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const {
      leadId,
      contactId,
      callType,
      callOutcome,
      startDate,
      endDate,
      page = 1,
      limit = 50
    } = req.query;

    const result = await callService.getCallLogs({
      tenantId,
      leadId,
      contactId,
      callType,
      callOutcome,
      startDate,
      endDate,
      page: parseInt(page),
      limit: parseInt(limit)
    });

    res.json(result);
  } catch (error) {
    console.error('[CALLS API] Error fetching call logs:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/calls/logs/:id
 * Get single call log details
 */
router.get('/logs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;

    const callLog = await prisma.callLog.findFirst({
      where: {
        id,
        tenantId
      },
      include: {
        lead: {
          select: { id: true, name: true, company: true, email: true, phone: true }
        },
        contact: {
          select: { id: true, name: true, company: true, email: true, phone: true }
        },
        callScript: {
          select: { id: true, name: true, scriptType: true }
        },
        createdBy: {
          select: { id: true, name: true, email: true }
        },
        automationRule: {
          select: { id: true, name: true, type: true }
        }
      }
    });

    if (!callLog) {
      return res.status(404).json({ error: 'Call log not found' });
    }

    res.json({ callLog });
  } catch (error) {
    console.error('[CALLS API] Error fetching call log:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/calls/logs/:id/cancel
 * Cancel an in-progress call
 */
router.post('/logs/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;

    const callLog = await callService.cancelCall(id, tenantId);

    res.json({
      success: true,
      message: 'Call cancelled successfully',
      callLog
    });
  } catch (error) {
    console.error('[CALLS API] Error cancelling call:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/calls/logs/:id/generate-summary
 * Generate AI summary for a call
 */
router.post('/logs/:id/generate-summary', async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;

    // Verify ownership
    const callLog = await prisma.callLog.findFirst({
      where: { id, tenantId }
    });

    if (!callLog) {
      return res.status(404).json({ error: 'Call log not found' });
    }

    const updatedCallLog = await callService.generateCallSummary(id);

    res.json({
      success: true,
      summary: updatedCallLog.summary,
      callLog: updatedCallLog
    });
  } catch (error) {
    console.error('[CALLS API] Error generating summary:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// CALL QUEUE
// ==========================================

/**
 * GET /api/calls/queue
 * Get call queue status and items
 */
router.get('/queue', async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const {
      status,
      leadId,
      callType,
      page = 1,
      limit = 50
    } = req.query;

    const [queueItems, queueStatus] = await Promise.all([
      callQueueService.getQueueItems({
        tenantId,
        status,
        leadId,
        callType,
        page: parseInt(page),
        limit: parseInt(limit)
      }),
      callQueueService.getQueueStatus(tenantId)
    ]);

    res.json({
      ...queueItems,
      status: queueStatus
    });
  } catch (error) {
    console.error('[CALLS API] Error fetching queue:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/calls/queue/:id/retry
 * Retry a failed queue item
 */
router.post('/queue/:id/retry', async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;

    // Verify ownership
    const queueItem = await prisma.callQueue.findFirst({
      where: { id, tenantId }
    });

    if (!queueItem) {
      return res.status(404).json({ error: 'Queue item not found' });
    }

    const updatedItem = await callQueueService.retryQueueItem(id);

    res.json({
      success: true,
      message: 'Call queued for retry',
      queueItem: updatedItem
    });
  } catch (error) {
    console.error('[CALLS API] Error retrying queue item:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/calls/queue/:id
 * Cancel a queued call
 */
router.delete('/queue/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;

    const updatedItem = await callQueueService.cancelQueueItem(id, tenantId);

    res.json({
      success: true,
      message: 'Call cancelled',
      queueItem: updatedItem
    });
  } catch (error) {
    console.error('[CALLS API] Error cancelling queue item:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// CALL SETTINGS
// ==========================================

/**
 * GET /api/calls/settings
 * Get call settings for tenant
 */
router.get('/settings', async (req, res) => {
  try {
    const tenantId = req.user.tenantId;

    let settings = await prisma.callSettings.findUnique({
      where: { tenantId }
    });

    // Create default settings if none exist
    if (!settings) {
      settings = await prisma.callSettings.create({
        data: {
          tenantId,
          maxConcurrentCalls: 5,
          callTimeout: 300,
          enableRecording: true,
          enableTranscription: true,
          autoCallOnLeadCreate: false,
          autoCallOnStageChange: false,
          autoCallDelaySeconds: 60,
          enableBusinessHours: true,
          businessHoursStart: '09:00',
          businessHoursEnd: '17:00',
          businessDays: ['mon', 'tue', 'wed', 'thu', 'fri'],
          timezone: 'Asia/Kolkata'
        }
      });
    }

    // Don't send sensitive credentials to frontend
    const sanitizedSettings = {
      ...settings,
      twilioAccountSid: settings.twilioAccountSid ? '***' + settings.twilioAccountSid.slice(-4) : null,
      twilioAuthToken: settings.twilioAuthToken ? '***' : null,
      openaiApiKey: settings.openaiApiKey ? '***' + settings.openaiApiKey.slice(-4) : null
    };

    res.json({ settings: sanitizedSettings });
  } catch (error) {
    console.error('[CALLS API] Error fetching settings:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/calls/settings
 * Update call settings
 */
router.put('/settings', async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const updateData = req.body;

    // Remove fields that shouldn't be updated directly
    delete updateData.id;
    delete updateData.tenantId;
    delete updateData.createdAt;
    delete updateData.updatedAt;

    const settings = await prisma.callSettings.upsert({
      where: { tenantId },
      update: updateData,
      create: {
        ...updateData,
        tenantId
      }
    });

    res.json({
      success: true,
      message: 'Settings updated successfully',
      settings
    });
  } catch (error) {
    console.error('[CALLS API] Error updating settings:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// CALL SCRIPTS
// ==========================================

/**
 * GET /api/calls/scripts
 * Get all call scripts for tenant
 */
router.get('/scripts', async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { scriptType, isActive } = req.query;

    const where = { tenantId };
    if (scriptType) where.scriptType = scriptType;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const scripts = await prisma.callScript.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: [
        { isDefault: 'desc' },
        { usageCount: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    res.json({ scripts });
  } catch (error) {
    console.error('[CALLS API] Error fetching scripts:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/calls/scripts
 * Create a new call script
 */
router.post('/scripts', upload.single('document'), async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const userId = req.user.id;

    const {
      name,
      description,
      scriptType = 'ai',
      aiGreeting,
      aiObjective,
      aiInstructions,
      aiPersonality = 'professional',
      manualScript,
      isDefault = false
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Script name is required' });
    }

    const scriptData = {
      name,
      description,
      scriptType,
      aiGreeting,
      aiObjective,
      aiInstructions,
      aiPersonality,
      manualScript,
      isActive: true,
      isDefault: isDefault === 'true',
      tenantId,
      userId
    };

    // Handle document upload
    if (req.file) {
      scriptData.documentFileName = req.file.originalname;
      scriptData.documentFilePath = req.file.path;
      scriptData.documentFileSize = req.file.size;
      scriptData.documentMimeType = req.file.mimetype;
    }

    // If setting as default, unset other defaults
    if (scriptData.isDefault) {
      await prisma.callScript.updateMany({
        where: { tenantId, isDefault: true },
        data: { isDefault: false }
      });
    }

    const script = await prisma.callScript.create({
      data: scriptData
    });

    res.json({
      success: true,
      message: 'Call script created successfully',
      script
    });
  } catch (error) {
    console.error('[CALLS API] Error creating script:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/calls/scripts/:id
 * Get single call script
 */
router.get('/scripts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;

    const script = await prisma.callScript.findFirst({
      where: { id, tenantId },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    if (!script) {
      return res.status(404).json({ error: 'Script not found' });
    }

    res.json({ script });
  } catch (error) {
    console.error('[CALLS API] Error fetching script:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/calls/scripts/:id
 * Update a call script
 */
router.put('/scripts/:id', upload.single('document'), async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;

    const script = await prisma.callScript.findFirst({
      where: { id, tenantId }
    });

    if (!script) {
      return res.status(404).json({ error: 'Script not found' });
    }

    const updateData = { ...req.body };
    delete updateData.id;
    delete updateData.tenantId;
    delete updateData.userId;

    // Handle document upload
    if (req.file) {
      updateData.documentFileName = req.file.originalname;
      updateData.documentFilePath = req.file.path;
      updateData.documentFileSize = req.file.size;
      updateData.documentMimeType = req.file.mimetype;

      // Delete old document if exists
      if (script.documentFilePath) {
        try {
          await fs.unlink(script.documentFilePath);
        } catch (err) {
          console.warn('Could not delete old document:', err);
        }
      }
    }

    // If setting as default, unset other defaults
    if (updateData.isDefault === true || updateData.isDefault === 'true') {
      await prisma.callScript.updateMany({
        where: { tenantId, isDefault: true, id: { not: id } },
        data: { isDefault: false }
      });
    }

    const updatedScript = await prisma.callScript.update({
      where: { id },
      data: updateData
    });

    res.json({
      success: true,
      message: 'Script updated successfully',
      script: updatedScript
    });
  } catch (error) {
    console.error('[CALLS API] Error updating script:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/calls/scripts/:id
 * Delete a call script
 */
router.delete('/scripts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;

    const script = await prisma.callScript.findFirst({
      where: { id, tenantId }
    });

    if (!script) {
      return res.status(404).json({ error: 'Script not found' });
    }

    // Delete document file if exists
    if (script.documentFilePath) {
      try {
        await fs.unlink(script.documentFilePath);
      } catch (err) {
        console.warn('Could not delete document file:', err);
      }
    }

    await prisma.callScript.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Script deleted successfully'
    });
  } catch (error) {
    console.error('[CALLS API] Error deleting script:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// TWILIO WEBHOOKS
// ==========================================

/**
 * POST /api/calls/webhook/twiml
 * Generate TwiML for call
 * Called by Twilio when call is answered
 */
router.post('/webhook/twiml', async (req, res) => {
  try {
    const { leadId, callType = 'ai' } = req.query;

    console.log('[WEBHOOK] TwiML requested:', { leadId, callType });

    if (callType === 'ai') {
      let lead = null;
      let script = null;
      let enableRecording = true;

      if (leadId) {
        lead = await prisma.lead.findUnique({
          where: { id: leadId }
        });

        // Get default script and settings for tenant
        if (lead) {
          const settings = await prisma.callSettings.findUnique({
            where: { tenantId: lead.tenantId }
          });

          if (settings) {
            enableRecording = settings.enableRecording !== false;

            if (settings.defaultCallScriptId) {
              script = await prisma.callScript.findUnique({
                where: { id: settings.defaultCallScriptId }
              });
            }
          }
        }
      }

      const twiml = twilioService.generateAICallTwiML(leadId, lead, script, enableRecording);
      res.type('text/xml');
      res.send(twiml);
    } else {
      // Manual call
      const twiml = twilioService.generateManualCallTwiML('Thank you for calling. Please hold.');
      res.type('text/xml');
      res.send(twiml);
    }
  } catch (error) {
    console.error('[WEBHOOK] Error generating TwiML:', error);
    res.status(500).send('<Response><Say>An error occurred</Say></Response>');
  }
});

/**
 * POST /api/calls/webhook/status
 * Handle call status updates from Twilio
 */
router.post('/webhook/status', async (req, res) => {
  try {
    const statusData = req.body;
    console.log('[WEBHOOK] Status update:', JSON.stringify(statusData, null, 2));

    // Validate CallSid exists
    if (!statusData.CallSid) {
      console.error('[WEBHOOK] Missing CallSid in status data');
      return res.sendStatus(400);
    }

    // Validate webhook (optional - enable in production)
    // const signature = req.headers['x-twilio-signature'];
    // const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
    // const isValid = twilioService.validateWebhookSignature(signature, url, req.body, authToken);
    // if (!isValid) return res.status(403).send('Invalid signature');

    await callService.updateCallStatus(statusData.CallSid, statusData);

    // Get call log with tenant info for real-time updates
    const callLog = await prisma.callLog.findUnique({
      where: { twilioCallSid: statusData.CallSid }
    });

    if (callLog) {
      // Emit real-time update via Socket.io
      const io = req.app.get('io');
      if (io) {
        io.to(`tenant:${callLog.tenantId}`).emit('call:status_update', {
          callLogId: callLog.id,
          status: statusData.CallStatus,
          duration: statusData.CallDuration
        });
      }
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('[WEBHOOK] Error handling status:', error);
    res.sendStatus(500);
  }
});

/**
 * POST /api/calls/webhook/recording
 * Handle recording completion from Twilio
 */
router.post('/webhook/recording', async (req, res) => {
  try {
    const recordingData = req.body;
    console.log('[WEBHOOK] Recording completed:', JSON.stringify(recordingData, null, 2));

    // Validate CallSid exists
    if (!recordingData.CallSid) {
      console.error('[WEBHOOK] Missing CallSid in recording data');
      return res.sendStatus(400);
    }

    await callService.handleRecordingComplete(recordingData.CallSid, recordingData);

    res.sendStatus(200);
  } catch (error) {
    console.error('[WEBHOOK] Error handling recording:', error);
    res.sendStatus(500);
  }
});

/**
 * POST /api/calls/webhook/transcription
 * Handle transcription from Twilio
 */
router.post('/webhook/transcription', async (req, res) => {
  try {
    const { CallSid, TranscriptionText } = req.body;
    console.log('[WEBHOOK] Transcription received for:', CallSid);

    if (TranscriptionText) {
      await callService.handleTranscription(CallSid, TranscriptionText);
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('[WEBHOOK] Error handling transcription:', error);
    res.sendStatus(500);
  }
});

/**
 * POST /api/calls/webhook/ai-conversation
 * Handle AI conversation during call
 * Called by Twilio when user speaks during Gather
 */
router.post('/webhook/ai-conversation', async (req, res) => {
  try {
    const { leadId } = req.query;
    const { SpeechResult, CallSid, Confidence } = req.body;

    console.log('[WEBHOOK] AI Conversation:', {
      leadId,
      CallSid,
      speech: SpeechResult,
      confidence: Confidence
    });

    // Validate speech result
    if (!SpeechResult || !CallSid) {
      console.warn('[WEBHOOK] No speech detected or missing CallSid');
      const twiml = twilioService.generateAIConversationTwiML(
        leadId,
        'I didn\'t catch that. Could you please repeat?',
        true
      );
      res.type('text/xml');
      return res.send(twiml);
    }

    // Get call log and lead info
    const callLog = await prisma.callLog.findUnique({
      where: { twilioCallSid: CallSid },
      include: {
        lead: true,
        callScript: true
      }
    });

    if (!callLog) {
      console.error('[WEBHOOK] Call log not found for CallSid:', CallSid);
      const twiml = twilioService.generateAIConversationTwiML(
        leadId,
        'Thank you for your time. Goodbye.',
        false
      );
      res.type('text/xml');
      return res.send(twiml);
    }

    // Get tenant's OpenAI API key
    const settings = await prisma.callSettings.findUnique({
      where: { tenantId: callLog.tenantId }
    });

    if (!settings?.openaiApiKey) {
      console.error('[WEBHOOK] OpenAI API key not configured for tenant:', callLog.tenantId);
      const twiml = twilioService.generateAIConversationTwiML(
        leadId,
        'Thank you for calling. Someone will follow up with you soon. Goodbye.',
        false
      );
      res.type('text/xml');
      return res.send(twiml);
    }

    // Get or initialize conversation history from call metadata
    let conversationHistory = [];
    if (callLog.metadata && callLog.metadata.conversationHistory) {
      conversationHistory = callLog.metadata.conversationHistory;
    }

    // Add user's speech to history
    conversationHistory.push({
      role: 'user',
      content: SpeechResult
    });

    // Generate AI response using OpenAI
    const openaiService = require('../services/openai');
    const aiResult = await openaiService.generateCallResponse(
      conversationHistory,
      SpeechResult,
      callLog.callScript,
      callLog.lead,
      settings.openaiApiKey
    );

    // Add AI response to history
    conversationHistory.push({
      role: 'assistant',
      content: aiResult.response
    });

    // Update call log with conversation history and transcript
    const transcriptEntry = `[${new Date().toISOString()}]\nUser: ${SpeechResult}\nAI: ${aiResult.response}\n\n`;
    await prisma.callLog.update({
      where: { id: callLog.id },
      data: {
        transcript: (callLog.transcript || '') + transcriptEntry,
        metadata: {
          ...callLog.metadata,
          conversationHistory,
          totalTokens: (callLog.metadata?.totalTokens || 0) + aiResult.tokensUsed
        }
      }
    });

    // Generate TwiML response with AI's answer
    const twiml = twilioService.generateAIConversationTwiML(
      leadId,
      aiResult.response,
      aiResult.shouldContinue
    );

    res.type('text/xml');
    res.send(twiml);
  } catch (error) {
    console.error('[WEBHOOK] Error in AI conversation:', error);

    // Fallback TwiML
    const twiml = twilioService.generateAIConversationTwiML(
      req.query.leadId,
      'I apologize, I\'m having technical difficulties. Thank you for your time. Goodbye.',
      false
    );

    res.type('text/xml');
    res.send(twiml);
  }
});

/**
 * POST /api/calls/webhook/recording-complete
 * Handle recording completion action
 */
router.post('/webhook/recording-complete', async (req, res) => {
  try {
    console.log('[WEBHOOK] Recording action complete:', req.body);

    // Generate TwiML to end call gracefully
    const VoiceResponse = require('twilio').twiml.VoiceResponse;
    const response = new VoiceResponse();
    response.say('Thank you for your time. Goodbye.');
    response.hangup();

    res.type('text/xml');
    res.send(response.toString());
  } catch (error) {
    console.error('[WEBHOOK] Error handling recording complete:', error);
    res.status(500).send('<Response><Hangup/></Response>');
  }
});

// ==========================================
// DEBUG ENDPOINTS
// ==========================================

/**
 * POST /api/calls/debug/cleanup-stuck-calls
 * Cleanup stuck active calls that are blocking the queue
 */
router.post('/debug/cleanup-stuck-calls', async (req, res) => {
  try {
    const tenantId = req.user.tenantId;

    // Find stuck calls (active for more than 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const stuckCalls = await prisma.callLog.findMany({
      where: {
        tenantId,
        twilioStatus: { in: ['queued', 'ringing', 'in-progress'] },
        createdAt: { lt: fiveMinutesAgo }
      }
    });

    console.log(`[CLEANUP] Found ${stuckCalls.length} stuck calls for tenant: ${tenantId}`);

    // Update stuck calls to failed
    const result = await prisma.callLog.updateMany({
      where: {
        tenantId,
        twilioStatus: { in: ['queued', 'ringing', 'in-progress'] },
        createdAt: { lt: fiveMinutesAgo }
      },
      data: {
        twilioStatus: 'failed',
        callOutcome: 'failed',
        endedAt: new Date(),
        updatedAt: new Date()
      }
    });

    // Get updated active calls count
    const activeCalls = await prisma.callLog.count({
      where: {
        tenantId,
        twilioStatus: { in: ['queued', 'ringing', 'in-progress'] }
      }
    });

    res.json({
      success: true,
      message: `Cleaned up ${result.count} stuck calls`,
      stuckCallsFound: stuckCalls.length,
      callsUpdated: result.count,
      remainingActiveCalls: activeCalls,
      stuckCalls: stuckCalls.map(call => ({
        id: call.id,
        phoneNumber: call.phoneNumber,
        twilioStatus: call.twilioStatus,
        createdAt: call.createdAt,
        age: Math.round((Date.now() - call.createdAt.getTime()) / 1000 / 60) + ' minutes'
      }))
    });
  } catch (error) {
    console.error('[CLEANUP] Error cleaning up stuck calls:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/calls/debug/queue-status
 * Debug endpoint to check queue processing status
 */
router.get('/debug/queue-status', async (req, res) => {
  try {
    const tenantId = req.user.tenantId;

    // Get call settings
    const settings = await prisma.callSettings.findUnique({
      where: { tenantId }
    });

    // Get pending calls
    const pendingCalls = await prisma.callQueue.findMany({
      where: {
        tenantId,
        status: 'pending'
      },
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        lead: { select: { name: true, phone: true } }
      }
    });

    // Get active calls
    const activeCalls = await prisma.callLog.count({
      where: {
        tenantId,
        twilioStatus: { in: ['queued', 'ringing', 'in-progress'] }
      }
    });

    // Check business hours
    const moment = require('moment-timezone');
    const now = moment().tz(settings?.timezone || 'Asia/Kolkata');
    const dayOfWeek = now.format('ddd').toLowerCase();
    const currentTime = now.format('HH:mm');

    const businessDays = Array.isArray(settings?.businessDays)
      ? settings.businessDays
      : (settings?.businessDays?.value || []);

    const isBusinessDay = businessDays.includes(dayOfWeek);
    const isBusinessHours = settings?.enableBusinessHours
      ? (currentTime >= settings.businessHoursStart && currentTime <= settings.businessHoursEnd)
      : true;

    res.json({
      settings: {
        configured: !!settings,
        twilioConfigured: !!(settings?.twilioAccountSid && settings?.twilioAuthToken),
        openaiConfigured: !!settings?.openaiApiKey,
        maxConcurrentCalls: settings?.maxConcurrentCalls || 0,
        enableBusinessHours: settings?.enableBusinessHours || false,
        businessHoursStart: settings?.businessHoursStart,
        businessHoursEnd: settings?.businessHoursEnd,
        businessDays: businessDays,
        timezone: settings?.timezone || 'Asia/Kolkata'
      },
      currentTime: {
        timestamp: now.format(),
        dayOfWeek,
        time: currentTime,
        isBusinessDay,
        isBusinessHours,
        canProcessCalls: !settings?.enableBusinessHours || (isBusinessDay && isBusinessHours)
      },
      queue: {
        pendingCount: pendingCalls.length,
        activeCalls,
        availableSlots: Math.max(0, (settings?.maxConcurrentCalls || 5) - activeCalls),
        pendingCalls: pendingCalls.map(call => ({
          id: call.id,
          leadName: call.lead?.name,
          phone: call.phoneNumber,
          createdAt: call.createdAt,
          scheduledFor: call.scheduledFor,
          attempts: call.attempts,
          errorMessage: call.errorMessage
        }))
      },
      recommendation: !settings?.twilioConfigured
        ? 'Configure Twilio credentials in Call Settings'
        : (!settings?.enableBusinessHours || (isBusinessDay && isBusinessHours))
          ? activeCalls >= (settings?.maxConcurrentCalls || 5)
            ? 'Max concurrent calls reached. Wait for calls to complete.'
            : pendingCalls.length > 0
              ? 'Scheduler should process calls in next 30 seconds'
              : 'No pending calls to process'
          : 'Outside business hours. Calls will process during business hours.'
    });
  } catch (error) {
    console.error('[CALLS API] Error in debug endpoint:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// ANALYTICS & STATS
// ==========================================

/**
 * GET /api/calls/stats
 * Get call analytics for tenant
 */
router.get('/stats', async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { startDate, endDate } = req.query;

    const where = { tenantId };
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [
      totalCalls,
      answeredCalls,
      missedCalls,
      averageDuration,
      callsByOutcome,
      callsByType
    ] = await Promise.all([
      prisma.callLog.count({ where }),
      prisma.callLog.count({
        where: { ...where, callOutcome: 'answered' }
      }),
      prisma.callLog.count({
        where: { ...where, callOutcome: { in: ['no-answer', 'busy', 'failed'] } }
      }),
      prisma.callLog.aggregate({
        where: { ...where, duration: { not: null } },
        _avg: { duration: true }
      }),
      prisma.callLog.groupBy({
        by: ['callOutcome'],
        where,
        _count: true
      }),
      prisma.callLog.groupBy({
        by: ['callType'],
        where,
        _count: true
      })
    ]);

    res.json({
      totalCalls,
      answeredCalls,
      missedCalls,
      answerRate: totalCalls > 0 ? (answeredCalls / totalCalls * 100).toFixed(2) : 0,
      averageDuration: Math.round(averageDuration._avg.duration || 0),
      callsByOutcome,
      callsByType
    });
  } catch (error) {
    console.error('[CALLS API] Error fetching stats:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
