/**
 * =============================================================================
 * CONVERSATION STORAGE SERVICE - Database-based (Stateless Architecture)
 * =============================================================================
 *
 * This service stores WhatsApp conversation messages in the database instead of
 * the local filesystem, enabling stateless horizontal scaling.
 *
 * Migration from file-based to database storage:
 * - Old: JSON files in ./conversations/{userId}/{phone}.json
 * - New: ConversationHistory table in PostgreSQL
 *
 * =============================================================================
 */

const prisma = require('../lib/prisma');

class ConversationStorageService {
  constructor() {
    // Virtual base directory for backwards compatibility
    this.baseDir = 'conversations';
  }

  /**
   * Get the virtual file path for a conversation (backwards compatibility)
   * Note: No actual files are created - this is for the WhatsAppConversation.filePath field
   */
  getFilePath(userId, contactPhone) {
    const cleanPhone = this.normalizePhone(contactPhone);
    return `${this.baseDir}/${userId}/${cleanPhone}.json`;
  }

  /**
   * Normalize phone number for consistent storage
   */
  normalizePhone(phone) {
    return phone.replace(/[^\d+]/g, '');
  }

  /**
   * Load conversation messages from database
   */
  async loadConversation(userId, contactPhone, tenantId = null) {
    try {
      const cleanPhone = this.normalizePhone(contactPhone);

      // Try to get tenantId from user if not provided
      if (!tenantId) {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { tenantId: true }
        });
        tenantId = user?.tenantId;
      }

      const record = await prisma.conversationHistory.findUnique({
        where: {
          userId_contactPhone: { userId, contactPhone: cleanPhone }
        }
      });

      if (record) {
        return {
          contactPhone: cleanPhone,
          messages: record.messages || [],
          messageCount: record.messageCount,
          createdAt: record.createdAt.toISOString(),
          updatedAt: record.updatedAt.toISOString()
        };
      }

      // Return empty conversation if not found
      return {
        contactPhone: cleanPhone,
        messages: [],
        messageCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('[ConversationStorage] Error loading conversation:', error);
      // Return empty conversation on error
      return {
        contactPhone: this.normalizePhone(contactPhone),
        messages: [],
        messageCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }
  }

  /**
   * Save a message to the conversation in database
   */
  async saveMessage(userId, contactPhone, message, tenantId = null) {
    try {
      const cleanPhone = this.normalizePhone(contactPhone);

      // Get tenantId from user if not provided
      if (!tenantId) {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { tenantId: true }
        });
        tenantId = user?.tenantId;

        if (!tenantId) {
          console.error('[ConversationStorage] Could not find tenantId for user:', userId);
          return null;
        }
      }

      // Format message for storage
      const formattedMessage = {
        id: message.id,
        message: message.message,
        sender: message.sender,
        senderName: message.senderName,
        status: message.status || 'sent',
        messageType: message.messageType || 'text',
        metadata: message.metadata || {},
        timestamp: message.createdAt || new Date().toISOString()
      };

      // Upsert conversation with new message
      const result = await prisma.conversationHistory.upsert({
        where: {
          userId_contactPhone: { userId, contactPhone: cleanPhone }
        },
        create: {
          userId,
          contactPhone: cleanPhone,
          tenantId,
          messages: [formattedMessage],
          messageCount: 1
        },
        update: {
          messages: {
            push: formattedMessage
          },
          messageCount: {
            increment: 1
          }
        }
      });

      return this.getFilePath(userId, contactPhone);
    } catch (error) {
      console.error('[ConversationStorage] Error saving message:', error);
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
      console.error('[ConversationStorage] Error getting messages:', error);
      return [];
    }
  }

  /**
   * Delete a conversation from database
   */
  async deleteConversation(userId, contactPhone) {
    try {
      const cleanPhone = this.normalizePhone(contactPhone);

      await prisma.conversationHistory.delete({
        where: {
          userId_contactPhone: { userId, contactPhone: cleanPhone }
        }
      }).catch(() => {
        // Ignore if doesn't exist
      });

      return true;
    } catch (error) {
      console.error('[ConversationStorage] Error deleting conversation:', error);
      return true; // Return true even on error to maintain compatibility
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
      console.error('[ConversationStorage] Error getting conversation stats:', error);
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
        m.message?.toLowerCase().includes(lowerSearch) ||
        m.senderName?.toLowerCase().includes(lowerSearch)
      );
    } catch (error) {
      console.error('[ConversationStorage] Error searching messages:', error);
      return [];
    }
  }

  /**
   * Clear all messages in a conversation (keep the record)
   */
  async clearConversation(userId, contactPhone) {
    try {
      const cleanPhone = this.normalizePhone(contactPhone);

      await prisma.conversationHistory.update({
        where: {
          userId_contactPhone: { userId, contactPhone: cleanPhone }
        },
        data: {
          messages: [],
          messageCount: 0
        }
      }).catch(() => {
        // Ignore if doesn't exist
      });

      return true;
    } catch (error) {
      console.error('[ConversationStorage] Error clearing conversation:', error);
      return false;
    }
  }
}

module.exports = new ConversationStorageService();
