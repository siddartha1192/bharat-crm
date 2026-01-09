/**
 * Twilio Integration Service
 * Handles voice calls via Twilio API
 */

const twilio = require('twilio');
const { VoiceResponse } = twilio.twiml;

class TwilioService {
  /**
   * Create Twilio client
   */
  createClient(accountSid, authToken) {
    // Trim whitespace from credentials
    const cleanSid = accountSid?.trim();
    const cleanToken = authToken?.trim();

    if (!cleanSid || !cleanToken) {
      throw new Error('Twilio credentials not configured');
    }

    console.log('[TWILIO] Creating client with Account SID:', cleanSid.substring(0, 8) + '...');
    return twilio(cleanSid, cleanToken);
  }

  /**
   * Make an outbound call
   * @param {Object} settings - Call settings
   * @param {string} phoneNumber - Destination phone number
   * @param {string} leadId - Lead ID (optional)
   * @param {string} callType - 'ai' | 'manual'
   * @returns {Promise<Object>} Call details
   */
  async makeCall(settings, phoneNumber, leadId = null, callType = 'ai') {
    try {
      // Log credential info (masked)
      console.log('[TWILIO] Using Account SID:', settings.twilioAccountSid?.substring(0, 8) + '...');
      console.log('[TWILIO] Auth Token length:', settings.twilioAuthToken?.length || 0);

      const client = this.createClient(
        settings.twilioAccountSid,
        settings.twilioAuthToken
      );

      const baseUrl = process.env.APP_URL || 'http://localhost:3001';
      const webhookUrl = `${baseUrl}/api/calls/webhook/twiml?leadId=${leadId}&callType=${callType}`;
      const statusCallbackUrl = `${baseUrl}/api/calls/webhook/status`;

      const callOptions = {
        to: phoneNumber,
        from: settings.twilioPhoneNumber,
        url: webhookUrl,
        statusCallback: statusCallbackUrl,
        statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
        timeout: settings.callTimeout || 60,
        machineDetection: 'Enable', // Detect voicemail
        asyncAmd: 'true', // Async answering machine detection
      };

      // Add recording if enabled
      if (settings.enableRecording) {
        callOptions.record = true;
        callOptions.recordingStatusCallback = `${baseUrl}/api/calls/webhook/recording`;
        callOptions.recordingStatusCallbackEvent = ['completed'];
      }

      console.log('[TWILIO] Initiating call:', {
        to: phoneNumber,
        from: settings.twilioPhoneNumber,
        leadId,
        callType
      });

      const call = await client.calls.create(callOptions);

      return {
        callSid: call.sid,
        status: call.status,
        to: call.to,
        from: call.from,
        direction: call.direction,
      };
    } catch (error) {
      console.error('[TWILIO] Error making call:', error);
      throw error;
    }
  }

  /**
   * Generate TwiML for AI call
   * @param {string} leadId - Lead ID
   * @param {Object} lead - Lead data
   * @param {Object} script - Call script
   * @param {boolean} enableRecording - Whether to record the call
   * @returns {string} TwiML response
   */
  generateAICallTwiML(leadId, lead, script, enableRecording = true) {
    const response = new VoiceResponse();
    const baseUrl = process.env.APP_URL || 'http://localhost:3001';

    // Recording is handled via Twilio API call parameters, not TwiML Record verb
    // This allows interactive Gather to work properly

    // Start with a greeting, then gather speech input
    const greeting = script?.aiGreeting || `Hello ${lead?.name || 'there'}, this is a call from our team. How can I help you today?`;

    // Create gather for speech input - the greeting will be said before listening
    const gather = response.gather({
      input: 'speech',
      timeout: 5, // Wait 5 seconds for user to start speaking after greeting
      speechTimeout: 'auto', // Auto-detect when user stops speaking
      action: `${baseUrl}/api/calls/webhook/ai-conversation?leadId=${leadId}`,
      method: 'POST',
      language: 'en-IN',
      hints: 'product, price, demo, meeting, interested, yes, no, hello' // Help Twilio recognize common words
    });

    // Say the greeting INSIDE the gather - this plays before waiting for speech
    gather.say(
      {
        voice: 'alice',
        language: 'en-IN'
      },
      greeting
    );

    // If user doesn't say anything after gather timeout, this will execute
    response.say(
      {
        voice: 'alice',
        language: 'en-IN'
      },
      'I didn\'t catch that. Thank you for your time. Goodbye.'
    );

    response.hangup();

    return response.toString();
  }

  /**
   * Generate TwiML for AI conversation response
   * @param {string} leadId - Lead ID
   * @param {string} aiResponse - AI-generated response text
   * @param {boolean} continueConversation - Whether to continue gathering input
   * @returns {string} TwiML response
   */
  generateAIConversationTwiML(leadId, aiResponse, continueConversation = true) {
    const response = new VoiceResponse();
    const baseUrl = process.env.APP_URL || 'http://localhost:3001';

    if (continueConversation) {
      // Create gather that first says AI response, then waits for user input
      const gather = response.gather({
        input: 'speech',
        timeout: 5, // Wait 5 seconds for user to start speaking
        speechTimeout: 'auto', // Auto-detect when user stops speaking
        action: `${baseUrl}/api/calls/webhook/ai-conversation?leadId=${leadId}`,
        method: 'POST',
        language: 'en-IN',
        hints: 'product, price, demo, meeting, interested, yes, no, hello, thanks, okay'
      });

      // Say AI response INSIDE the gather, then it will wait for user speech
      gather.say(
        {
          voice: 'alice',
          language: 'en-IN'
        },
        aiResponse
      );

      // If user doesn't respond after timeout
      response.say(
        {
          voice: 'alice',
          language: 'en-IN'
        },
        'Thank you for your time. Goodbye.'
      );
    } else {
      // End conversation - just say final message and hangup
      response.say(
        {
          voice: 'alice',
          language: 'en-IN'
        },
        aiResponse
      );
    }

    response.hangup();

    return response.toString();
  }

  /**
   * Generate TwiML for manual call
   * @param {string} script - Manual script text
   * @returns {string} TwiML response
   */
  generateManualCallTwiML(script) {
    const response = new VoiceResponse();

    if (script) {
      response.say(
        {
          voice: 'alice',
          language: 'en-IN'
        },
        script
      );
    } else {
      response.say(
        {
          voice: 'alice',
          language: 'en-IN'
        },
        'This is a call from our team. Please wait while we connect you.'
      );
    }

    // Pause to allow manual conversation
    response.pause({ length: 300 });

    return response.toString();
  }

  /**
   * Get call details
   * @param {string} accountSid - Twilio Account SID
   * @param {string} authToken - Twilio Auth Token
   * @param {string} callSid - Call SID
   * @returns {Promise<Object>} Call details
   */
  async getCallDetails(accountSid, authToken, callSid) {
    try {
      const client = this.createClient(accountSid, authToken);
      const call = await client.calls(callSid).fetch();

      return {
        callSid: call.sid,
        status: call.status,
        duration: call.duration,
        startTime: call.startTime,
        endTime: call.endTime,
        answeredBy: call.answeredBy,
        to: call.to,
        from: call.from,
        direction: call.direction,
      };
    } catch (error) {
      console.error('[TWILIO] Error fetching call details:', error);
      throw error;
    }
  }

  /**
   * Get recording details
   * @param {string} accountSid - Twilio Account SID
   * @param {string} authToken - Twilio Auth Token
   * @param {string} recordingSid - Recording SID
   * @returns {Promise<Object>} Recording details
   */
  async getRecording(accountSid, authToken, recordingSid) {
    try {
      const client = this.createClient(accountSid, authToken);
      const recording = await client.recordings(recordingSid).fetch();

      return {
        recordingSid: recording.sid,
        duration: recording.duration,
        url: `https://api.twilio.com${recording.uri.replace('.json', '.mp3')}`,
        status: recording.status,
      };
    } catch (error) {
      console.error('[TWILIO] Error fetching recording:', error);
      throw error;
    }
  }

  /**
   * Validate Twilio webhook signature
   * @param {string} signature - X-Twilio-Signature header
   * @param {string} url - Full webhook URL
   * @param {Object} params - Request body parameters
   * @param {string} authToken - Twilio Auth Token
   * @returns {boolean} Is valid
   */
  validateWebhookSignature(signature, url, params, authToken) {
    try {
      return twilio.validateRequest(authToken, signature, url, params);
    } catch (error) {
      console.error('[TWILIO] Error validating webhook:', error);
      return false;
    }
  }

  /**
   * Cancel/hangup a call
   * @param {string} accountSid - Twilio Account SID
   * @param {string} authToken - Twilio Auth Token
   * @param {string} callSid - Call SID
   * @returns {Promise<Object>} Updated call
   */
  async cancelCall(accountSid, authToken, callSid) {
    try {
      const client = this.createClient(accountSid, authToken);
      const call = await client.calls(callSid).update({ status: 'canceled' });
      return call;
    } catch (error) {
      console.error('[TWILIO] Error canceling call:', error);
      throw error;
    }
  }
}

module.exports = new TwilioService();
