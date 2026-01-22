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

      // Add recording if enabled (respects script-level override)
      if (settings.enableRecording) {
        callOptions.record = true;
        callOptions.recordingStatusCallback = `${baseUrl}/api/calls/webhook/recording`;
        callOptions.recordingStatusCallbackEvent = ['completed'];

        // Add transcription if enabled (respects script-level override)
        if (settings.enableTranscription) {
          callOptions.recordingStatusCallbackMethod = 'POST';
          callOptions.transcribe = true;
          callOptions.transcribeCallback = `${baseUrl}/api/calls/webhook/transcription`;
        }
      }

      console.log('[TWILIO] Call recording settings:', {
        recording: settings.enableRecording || false,
        transcription: settings.enableTranscription || false
      });

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
   * Replace placeholders in text with actual lead data
   * @param {string} text - Text with placeholders
   * @param {Object} lead - Lead data
   * @param {Object} script - Call script
   * @returns {string} Text with replaced placeholders
   */
  replacePlaceholders(text, lead, script) {
    if (!text) return text;

    let result = text;

    // Replace lead-specific placeholders
    if (lead) {
      result = result.replace(/\{name\}/gi, lead.name || 'there');
      result = result.replace(/\{company\}/gi, lead.company || 'your company');
      result = result.replace(/\{email\}/gi, lead.email || '');
      result = result.replace(/\{phone\}/gi, lead.phone || '');
    }

    // Replace script-specific placeholders
    if (script) {
      result = result.replace(/\{companyName\}/gi, script.companyName || 'our company');
      result = result.replace(/\{productName\}/gi, script.productName || 'our solution');
      result = result.replace(/\{productDescription\}/gi, script.productDescription || 'business solutions');
    }

    return result;
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

    // Start with a greeting that introduces the product and purpose
    // Use customizable company/product name from script
    const companyName = script?.companyName || 'our company';
    const productName = script?.productName || 'our solution';
    const productDesc = script?.productDescription || 'business solutions';

    const defaultGreeting = `Hello ${lead?.name || 'there'}, this is a call from ${companyName}. We're reaching out because you showed interest in ${productDesc}. I'd love to give you a quick overview of how ${productName} can help your business. Do you have a couple of minutes?`;

    // Get greeting from script and replace placeholders
    let greeting = script?.aiGreeting || defaultGreeting;
    greeting = this.replacePlaceholders(greeting, lead, script);

    // Create gather for speech input - the greeting will be said before listening
    const gather = response.gather({
      input: 'speech',
      timeout: 8, // Increased from 5 to 8 seconds for better user response time
      speechTimeout: 'auto', // Auto-detect when user stops speaking
      action: `${baseUrl}/api/calls/webhook/ai-conversation?leadId=${leadId}&timeoutCount=0`,
      method: 'POST',
      language: 'en-IN',
      hints: 'product, price, demo, meeting, interested, yes, no, hello, okay, sure, features, benefits' // Help Twilio recognize common words
    });

    // Say the greeting INSIDE the gather - this plays before waiting for speech
    gather.say(
      {
        voice: 'alice',
        language: 'en-IN'
      },
      greeting
    );

    // If user doesn't say anything after gather timeout, give them another chance
    response.say(
      {
        voice: 'alice',
        language: 'en-IN'
      },
      'Are you still there? Please say yes if you can hear me.'
    );

    // Redirect to retry with timeout tracking
    response.redirect(`${baseUrl}/api/calls/webhook/ai-conversation?leadId=${leadId}&retry=true&timeoutCount=1`);

    return response.toString();
  }

  /**
   * Generate TwiML for AI conversation response
   * @param {string} leadId - Lead ID
   * @param {string} aiResponse - AI-generated response text
   * @param {boolean} continueConversation - Whether to continue gathering input
   * @param {number} timeoutCount - Number of timeouts that have occurred (for progressive fallback)
   * @returns {string} TwiML response
   */
  generateAIConversationTwiML(leadId, aiResponse, continueConversation = true, timeoutCount = 0) {
    const response = new VoiceResponse();
    const baseUrl = process.env.APP_URL || 'http://localhost:3001';

    if (continueConversation) {
      // Create gather that first says AI response, then waits for user input
      const gather = response.gather({
        input: 'speech',
        timeout: 8, // Increased from 5 to 8 seconds for better user response time
        speechTimeout: 'auto', // Auto-detect when user stops speaking
        action: `${baseUrl}/api/calls/webhook/ai-conversation?leadId=${leadId}&timeoutCount=${timeoutCount}`,
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

      // Progressive fallback based on timeout count
      if (timeoutCount === 0) {
        // First timeout - check if user is still there
        response.say(
          {
            voice: 'alice',
            language: 'en-IN'
          },
          'Are you still there? Please say yes if you can hear me.'
        );
        // Redirect back to conversation with increased timeout count
        response.redirect(`${baseUrl}/api/calls/webhook/ai-conversation?leadId=${leadId}&retry=true&timeoutCount=1`);
      } else if (timeoutCount === 1) {
        // Second timeout - offer to call back
        response.say(
          {
            voice: 'alice',
            language: 'en-IN'
          },
          'I haven\'t heard from you. This might not be a good time. Would you like me to call back later? Please say yes or no.'
        );
        // Give one more chance
        response.redirect(`${baseUrl}/api/calls/webhook/ai-conversation?leadId=${leadId}&retry=true&timeoutCount=2`);
      } else {
        // After 2-3 timeouts, end gracefully
        response.say(
          {
            voice: 'alice',
            language: 'en-IN'
          },
          'It seems like this might not be a good time. I\'ll have someone follow up with you. Have a great day!'
        );
        response.hangup();
      }
    } else {
      // End conversation - just say final message and hangup
      response.say(
        {
          voice: 'alice',
          language: 'en-IN'
        },
        aiResponse
      );
      response.hangup();
    }

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
