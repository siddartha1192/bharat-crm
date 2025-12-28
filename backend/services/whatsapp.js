const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

class WhatsAppService {
  constructor() {
    // Default credentials from environment variables (backward compatibility)
    this.defaultToken = process.env.WHATSAPP_TOKEN;
    this.defaultPhoneId = process.env.WHATSAPP_PHONE_ID;
    this.baseUrl = 'https://graph.facebook.com/v18.0';
  }

  /**
   * Get credentials (tenant-specific or default from env)
   * @param {Object} tenantConfig - Optional tenant-specific WhatsApp configuration
   * @returns {Object} - { token, phoneId }
   */
  getCredentials(tenantConfig = null) {
    if (tenantConfig && tenantConfig.token && tenantConfig.phoneId) {
      return {
        token: tenantConfig.token,
        phoneId: tenantConfig.phoneId
      };
    }
    return {
      token: this.defaultToken,
      phoneId: this.defaultPhoneId
    };
  }

  /**
   * Send a WhatsApp text message
   * @param {string} to - Recipient phone number (with country code, no spaces)
   * @param {string} message - Message text to send
   * @param {Object} tenantConfig - Optional tenant-specific WhatsApp configuration
   * @returns {Promise} - API response
   */
  async sendMessage(to, message, tenantConfig = null) {
    try {
      const { token, phoneId } = this.getCredentials(tenantConfig);

      if (!token || !phoneId) {
        throw new Error('WhatsApp API credentials not configured. Please configure in Settings or set WHATSAPP_TOKEN and WHATSAPP_PHONE_ID in .env');
      }

      // Clean phone number (remove spaces, dashes, etc)
      const cleanedNumber = to.replace(/\D/g, '');

      const response = await axios.post(
        `${this.baseUrl}/${phoneId}/messages`,
        {
          messaging_product: 'whatsapp',
          to: cleanedNumber,
          type: 'text',
          text: { body: message }
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log(`✅ WhatsApp message sent to ${cleanedNumber}`);
      return {
        success: true,
        messageId: response.data.messages?.[0]?.id,
        data: response.data
      };
    } catch (error) {
      console.error('❌ WhatsApp error:', error.response?.data || error.message);
      throw new Error(
        error.response?.data?.error?.message ||
        'Failed to send WhatsApp message'
      );
    }
  }

  /**
   * Upload media to WhatsApp (required before sending media messages)
   * @param {string} mediaPath - Path to media file or URL
   * @param {string} mediaType - Type of media (image, document, audio, video)
   * @param {Object} tenantConfig - Optional tenant-specific WhatsApp configuration
   * @returns {Promise} - Media ID from WhatsApp
   */
  async uploadMedia(mediaPath, mediaType, tenantConfig = null) {
    try {
      const { token, phoneId } = this.getCredentials(tenantConfig);

      if (!token || !phoneId) {
        throw new Error('WhatsApp API credentials not configured');
      }

      // If mediaPath is a URL, return it directly (WhatsApp supports URLs)
      if (mediaPath.startsWith('http://') || mediaPath.startsWith('https://')) {
        return { mediaId: null, mediaUrl: mediaPath, isUrl: true };
      }

      // Upload file to WhatsApp
      const form = new FormData();
      form.append('file', fs.createReadStream(mediaPath));
      form.append('messaging_product', 'whatsapp');
      form.append('type', mediaType);

      const response = await axios.post(
        `${this.baseUrl}/${phoneId}/media`,
        form,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            ...form.getHeaders()
          }
        }
      );

      console.log(`✅ Media uploaded to WhatsApp: ${response.data.id}`);
      return {
        mediaId: response.data.id,
        mediaUrl: null,
        isUrl: false
      };
    } catch (error) {
      console.error('❌ WhatsApp media upload error:', error.response?.data || error.message);
      throw new Error(
        error.response?.data?.error?.message ||
        'Failed to upload media to WhatsApp'
      );
    }
  }

  /**
   * Send an image via WhatsApp
   * @param {string} to - Recipient phone number
   * @param {string} imageUrlOrId - Image URL or WhatsApp media ID
   * @param {string} caption - Optional image caption
   * @param {Object} tenantConfig - Optional tenant-specific WhatsApp configuration
   * @returns {Promise} - API response
   */
  async sendImage(to, imageUrlOrId, caption = '', tenantConfig = null) {
    try {
      const { token, phoneId } = this.getCredentials(tenantConfig);

      if (!token || !phoneId) {
        throw new Error('WhatsApp API credentials not configured');
      }

      const cleanedNumber = to.replace(/\D/g, '');

      // Determine if it's a URL or media ID
      const isUrl = imageUrlOrId.startsWith('http://') || imageUrlOrId.startsWith('https://');

      const imageObject = isUrl
        ? { link: imageUrlOrId }
        : { id: imageUrlOrId };

      if (caption) {
        imageObject.caption = caption;
      }

      const response = await axios.post(
        `${this.baseUrl}/${phoneId}/messages`,
        {
          messaging_product: 'whatsapp',
          to: cleanedNumber,
          type: 'image',
          image: imageObject
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log(`✅ WhatsApp image sent to ${cleanedNumber}`);
      return {
        success: true,
        messageId: response.data.messages?.[0]?.id,
        data: response.data
      };
    } catch (error) {
      console.error('❌ WhatsApp image error:', error.response?.data || error.message);
      throw new Error(
        error.response?.data?.error?.message ||
        'Failed to send WhatsApp image'
      );
    }
  }

  /**
   * Send a document via WhatsApp
   * @param {string} to - Recipient phone number
   * @param {string} documentUrlOrId - Document URL or WhatsApp media ID
   * @param {string} filename - Optional filename
   * @param {string} caption - Optional document caption
   * @param {Object} tenantConfig - Optional tenant-specific WhatsApp configuration
   * @returns {Promise} - API response
   */
  async sendDocument(to, documentUrlOrId, filename = '', caption = '', tenantConfig = null) {
    try {
      const { token, phoneId } = this.getCredentials(tenantConfig);

      if (!token || !phoneId) {
        throw new Error('WhatsApp API credentials not configured');
      }

      const cleanedNumber = to.replace(/\D/g, '');

      // Determine if it's a URL or media ID
      const isUrl = documentUrlOrId.startsWith('http://') || documentUrlOrId.startsWith('https://');

      const documentObject = isUrl
        ? { link: documentUrlOrId }
        : { id: documentUrlOrId };

      if (filename) {
        documentObject.filename = filename;
      }

      if (caption) {
        documentObject.caption = caption;
      }

      const response = await axios.post(
        `${this.baseUrl}/${phoneId}/messages`,
        {
          messaging_product: 'whatsapp',
          to: cleanedNumber,
          type: 'document',
          document: documentObject
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log(`✅ WhatsApp document sent to ${cleanedNumber}`);
      return {
        success: true,
        messageId: response.data.messages?.[0]?.id,
        data: response.data
      };
    } catch (error) {
      console.error('❌ WhatsApp document error:', error.response?.data || error.message);
      throw new Error(
        error.response?.data?.error?.message ||
        'Failed to send WhatsApp document'
      );
    }
  }

  /**
   * Send a video via WhatsApp
   * @param {string} to - Recipient phone number
   * @param {string} videoUrlOrId - Video URL or WhatsApp media ID
   * @param {string} caption - Optional video caption
   * @param {Object} tenantConfig - Optional tenant-specific WhatsApp configuration
   * @returns {Promise} - API response
   */
  async sendVideo(to, videoUrlOrId, caption = '', tenantConfig = null) {
    try {
      const { token, phoneId } = this.getCredentials(tenantConfig);

      if (!token || !phoneId) {
        throw new Error('WhatsApp API credentials not configured');
      }

      const cleanedNumber = to.replace(/\D/g, '');

      // Determine if it's a URL or media ID
      const isUrl = videoUrlOrId.startsWith('http://') || videoUrlOrId.startsWith('https://');

      const videoObject = isUrl
        ? { link: videoUrlOrId }
        : { id: videoUrlOrId };

      if (caption) {
        videoObject.caption = caption;
      }

      const response = await axios.post(
        `${this.baseUrl}/${phoneId}/messages`,
        {
          messaging_product: 'whatsapp',
          to: cleanedNumber,
          type: 'video',
          video: videoObject
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log(`✅ WhatsApp video sent to ${cleanedNumber}`);
      return {
        success: true,
        messageId: response.data.messages?.[0]?.id,
        data: response.data
      };
    } catch (error) {
      console.error('❌ WhatsApp video error:', error.response?.data || error.message);
      throw new Error(
        error.response?.data?.error?.message ||
        'Failed to send WhatsApp video'
      );
    }
  }

  /**
   * Send audio via WhatsApp
   * @param {string} to - Recipient phone number
   * @param {string} audioUrlOrId - Audio URL or WhatsApp media ID
   * @param {Object} tenantConfig - Optional tenant-specific WhatsApp configuration
   * @returns {Promise} - API response
   */
  async sendAudio(to, audioUrlOrId, tenantConfig = null) {
    try {
      const { token, phoneId } = this.getCredentials(tenantConfig);

      if (!token || !phoneId) {
        throw new Error('WhatsApp API credentials not configured');
      }

      const cleanedNumber = to.replace(/\D/g, '');

      // Determine if it's a URL or media ID
      const isUrl = audioUrlOrId.startsWith('http://') || audioUrlOrId.startsWith('https://');

      const audioObject = isUrl
        ? { link: audioUrlOrId }
        : { id: audioUrlOrId };

      const response = await axios.post(
        `${this.baseUrl}/${phoneId}/messages`,
        {
          messaging_product: 'whatsapp',
          to: cleanedNumber,
          type: 'audio',
          audio: audioObject
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log(`✅ WhatsApp audio sent to ${cleanedNumber}`);
      return {
        success: true,
        messageId: response.data.messages?.[0]?.id,
        data: response.data
      };
    } catch (error) {
      console.error('❌ WhatsApp audio error:', error.response?.data || error.message);
      throw new Error(
        error.response?.data?.error?.message ||
        'Failed to send WhatsApp audio'
      );
    }
  }

  /**
   * Send a template message with enhanced support for media
   * @param {string} to - Recipient phone number
   * @param {string} templateName - Name of the approved template
   * @param {string} languageCode - Language code (default: 'en')
   * @param {Object} components - Template components { header, body, buttons }
   * @param {Object} tenantConfig - Optional tenant-specific WhatsApp configuration
   * @returns {Promise} - API response
   *
   * Example components:
   * {
   *   header: { type: 'text', text: 'Hello' } or { type: 'image', mediaId: '123' },
   *   body: [{ type: 'text', text: 'Parameter 1' }],
   *   buttons: [{ type: 'quick_reply', text: 'Button 1' }]
   * }
   */
  async sendTemplateMessage(to, templateName, languageCode = 'en', components = {}, tenantConfig = null) {
    try {
      const { token, phoneId } = this.getCredentials(tenantConfig);

      if (!token || !phoneId) {
        throw new Error('WhatsApp API credentials not configured');
      }

      const cleanedNumber = to.replace(/\D/g, '');

      // Build template components array
      const templateComponents = [];

      // Header component (text, image, document, video)
      if (components.header) {
        const headerParam = {};

        if (components.header.type === 'text') {
          headerParam.type = 'text';
          headerParam.text = components.header.text;
        } else if (['image', 'document', 'video'].includes(components.header.type)) {
          headerParam.type = components.header.type;
          headerParam[components.header.type] = components.header.mediaId
            ? { id: components.header.mediaId }
            : { link: components.header.mediaUrl };
        }

        templateComponents.push({
          type: 'header',
          parameters: [headerParam]
        });
      }

      // Body component (text parameters)
      if (components.body && components.body.length > 0) {
        templateComponents.push({
          type: 'body',
          parameters: components.body.map(param => ({
            type: 'text',
            text: param.text || param
          }))
        });
      }

      // Button component
      if (components.buttons && components.buttons.length > 0) {
        components.buttons.forEach((button, index) => {
          templateComponents.push({
            type: 'button',
            sub_type: button.type || 'quick_reply',
            index: index.toString(),
            parameters: [{
              type: 'payload',
              payload: button.payload || button.text
            }]
          });
        });
      }

      const response = await axios.post(
        `${this.baseUrl}/${phoneId}/messages`,
        {
          messaging_product: 'whatsapp',
          to: cleanedNumber,
          type: 'template',
          template: {
            name: templateName,
            language: { code: languageCode },
            components: templateComponents
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log(`✅ WhatsApp template message sent to ${cleanedNumber}`);
      return {
        success: true,
        messageId: response.data.messages?.[0]?.id,
        data: response.data
      };
    } catch (error) {
      console.error('❌ WhatsApp template error:', error.response?.data || error.message);
      throw new Error(
        error.response?.data?.error?.message ||
        'Failed to send WhatsApp template message'
      );
    }
  }

  /**
   * Check if WhatsApp is configured (with optional tenant config)
   * @param {Object} tenantConfig - Optional tenant-specific WhatsApp configuration
   * @returns {boolean}
   */
  isConfigured(tenantConfig = null) {
    const { token, phoneId } = this.getCredentials(tenantConfig);
    return !!(token && phoneId);
  }
}

module.exports = new WhatsAppService();
