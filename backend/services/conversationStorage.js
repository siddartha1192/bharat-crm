const fs = require('fs').promises;
const path = require('path');

class ConversationStorageService {
  constructor() {
    this.baseDir = path.join(__dirname, '..', 'conversations');
  }

  /**
   * Ensure the conversations directory and user subdirectory exist
   */
  async ensureDirectory(userId) {
    const userDir = path.join(this.baseDir, userId);
    await fs.mkdir(userDir, { recursive: true });
    return userDir;
  }

  /**
   * Get the file path for a conversation
   */
  getFilePath(userId, contactPhone) {
    // Clean phone number for filename (remove special chars except +)
    const cleanPhone = contactPhone.replace(/[^\d+]/g, '');
    return path.join(this.baseDir, userId, `${cleanPhone}.json`);
  }

  /**
   * Load conversation messages from file
   */
  async loadConversation(userId, contactPhone) {
    try {
      const filePath = this.getFilePath(userId, contactPhone);
      const data = await fs.readFile(filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      if (error.code === 'ENOENT') {
        // File doesn't exist, return empty conversation
        return {
          contactPhone,
          messages: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      }
      throw error;
    }
  }

  /**
   * Save a message to the conversation file
   */
  async saveMessage(userId, contactPhone, message) {
    try {
      // Ensure directory exists
      await this.ensureDirectory(userId);

      // Load existing conversation
      const conversation = await this.loadConversation(userId, contactPhone);

      // Add new message
      conversation.messages.push({
        id: message.id,
        message: message.message,
        sender: message.sender,
        senderName: message.senderName,
        status: message.status || 'sent',
        messageType: message.messageType || 'text',
        metadata: message.metadata || {},
        timestamp: message.createdAt || new Date().toISOString()
      });

      // Update conversation metadata
      conversation.updatedAt = new Date().toISOString();
      conversation.messageCount = conversation.messages.length;

      // Save to file
      const filePath = this.getFilePath(userId, contactPhone);
      await fs.writeFile(filePath, JSON.stringify(conversation, null, 2), 'utf8');

      return filePath;
    } catch (error) {
      console.error('Error saving message to file:', error);
      throw error;
    }
  }

  /**
   * Get all messages from a conversation
   */
  async getMessages(userId, contactPhone, limit = 100, offset = 0) {
    try {
      const conversation = await this.loadConversation(userId, contactPhone);
      const messages = conversation.messages || [];

      // Return messages in reverse chronological order (newest first)
      const sorted = messages.sort((a, b) =>
        new Date(b.timestamp) - new Date(a.timestamp)
      );

      // Apply pagination
      return sorted.slice(offset, offset + limit);
    } catch (error) {
      console.error('Error getting messages:', error);
      throw error;
    }
  }

  /**
   * Delete a conversation file
   */
  async deleteConversation(userId, contactPhone) {
    try {
      const filePath = this.getFilePath(userId, contactPhone);
      await fs.unlink(filePath);
      return true;
    } catch (error) {
      if (error.code === 'ENOENT') {
        // File doesn't exist, consider it deleted
        return true;
      }
      throw error;
    }
  }

  /**
   * Get conversation statistics
   */
  async getConversationStats(userId, contactPhone) {
    try {
      const conversation = await this.loadConversation(userId, contactPhone);
      const messages = conversation.messages || [];

      return {
        totalMessages: messages.length,
        userMessages: messages.filter(m => m.sender === 'user').length,
        contactMessages: messages.filter(m => m.sender === 'contact').length,
        firstMessageAt: messages[0]?.timestamp,
        lastMessageAt: messages[messages.length - 1]?.timestamp
      };
    } catch (error) {
      console.error('Error getting conversation stats:', error);
      return {
        totalMessages: 0,
        userMessages: 0,
        contactMessages: 0
      };
    }
  }

  /**
   * Search messages in a conversation
   */
  async searchMessages(userId, contactPhone, searchTerm) {
    try {
      const conversation = await this.loadConversation(userId, contactPhone);
      const messages = conversation.messages || [];

      const lowerSearch = searchTerm.toLowerCase();
      return messages.filter(m =>
        m.message.toLowerCase().includes(lowerSearch) ||
        m.senderName.toLowerCase().includes(lowerSearch)
      );
    } catch (error) {
      console.error('Error searching messages:', error);
      return [];
    }
  }
}

module.exports = new ConversationStorageService();
