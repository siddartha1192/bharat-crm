const axios = require('axios');

class WhatsAppService {
  constructor() {
    this.token = process.env.WHATSAPP_TOKEN;
    this.phoneId = process.env.WHATSAPP_PHONE_ID;
    this.baseUrl = 'https://graph.facebook.com/v18.0';
  }

  /**
   * Send a WhatsApp message
   * @param {string} to - Recipient phone number (with country code, no spaces)
   * @param {string} message - Message text to send
   * @returns {Promise} - API response
   */
  async sendMessage(to, message) {
    try {
      if (!this.token || !this.phoneId) {
        throw new Error('WhatsApp API credentials not configured. Please set WHATSAPP_TOKEN and WHATSAPP_PHONE_ID in .env');
      }

      // Clean phone number (remove spaces, dashes, etc)
      const cleanedNumber = to.replace(/\D/g, '');

      const response = await axios.post(
        `${this.baseUrl}/${this.phoneId}/messages`,
        {
          messaging_product: 'whatsapp',
          to: cleanedNumber,
          type: 'text',
          text: { body: message }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.token}`,
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
   * Send a template message
   * @param {string} to - Recipient phone number
   * @param {string} templateName - Name of the approved template
   * @param {Array} parameters - Template parameters
   * @returns {Promise} - API response
   */
  async sendTemplateMessage(to, templateName, parameters = []) {
    try {
      if (!this.token || !this.phoneId) {
        throw new Error('WhatsApp API credentials not configured');
      }

      const cleanedNumber = to.replace(/\D/g, '');

      const response = await axios.post(
        `${this.baseUrl}/${this.phoneId}/messages`,
        {
          messaging_product: 'whatsapp',
          to: cleanedNumber,
          type: 'template',
          template: {
            name: templateName,
            language: { code: 'en' },
            components: parameters.length > 0 ? [
              {
                type: 'body',
                parameters: parameters.map(param => ({
                  type: 'text',
                  text: param
                }))
              }
            ] : []
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.token}`,
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
   * Check if WhatsApp is configured
   * @returns {boolean}
   */
  isConfigured() {
    return !!(this.token && this.phoneId);
  }
}

module.exports = new WhatsAppService();
