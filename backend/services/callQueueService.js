/**
 * Call Queue Service
 * Manages the non-blocking call queue
 * Ensures calls don't block the main application flow
 */

const callService = require('./callService');

const prisma = require('../lib/prisma');

class CallQueueService {
  /**
   * Add a call to the queue
   * This is non-blocking and returns immediately
   * @param {Object} data - Call queue data
   * @returns {Promise<Object>} CallQueue entry
   */
  async queueCall(data) {
    try {
      const {
        tenantId,
        leadId,
        contactId,
        phoneNumber,
        phoneCountryCode = '+91',
        callType = 'ai',
        callScriptId = null,
        triggerType,
        triggerData = null,
        automationRuleId = null,
        priority = 5,
        scheduledFor = null,
        maxAttempts = 3,
        createdById,
        metadata = null
      } = data;

      // Validate required fields
      if (!tenantId || !phoneNumber || !triggerType || !createdById) {
        throw new Error('Missing required fields for queue call');
      }

      // Check if there's already a pending call for this number
      const existingCall = await prisma.callQueue.findFirst({
        where: {
          tenantId,
          phoneNumber,
          status: { in: ['pending', 'processing'] }
        }
      });

      if (existingCall) {
        console.log(`[CALL QUEUE] Call already queued for ${phoneNumber}`);
        return existingCall;
      }

      // Create queue entry
      const queueItem = await prisma.callQueue.create({
        data: {
          tenantId,
          leadId,
          contactId,
          phoneNumber,
          phoneCountryCode,
          status: 'pending',
          priority,
          callType,
          callScriptId,
          triggerType,
          triggerData,
          automationRuleId,
          maxAttempts,
          scheduledFor,
          metadata,
          createdById
        }
      });

      console.log(`[CALL QUEUE] Call queued successfully:`, {
        id: queueItem.id,
        phoneNumber: queueItem.phoneNumber,
        leadId: queueItem.leadId,
        triggerType: queueItem.triggerType,
        scheduledFor: queueItem.scheduledFor
      });

      return queueItem;
    } catch (error) {
      console.error('[CALL QUEUE] Error queueing call:', error);
      throw error;
    }
  }

  /**
   * Process a single queue item
   * @param {string} queueItemId - CallQueue ID
   * @returns {Promise<Object>} Processing result
   */
  async processQueueItem(queueItemId) {
    try {
      // Get queue item with full details
      const queueItem = await prisma.callQueue.findUnique({
        where: { id: queueItemId },
        include: {
          lead: true,
          contact: true
        }
      });

      if (!queueItem) {
        throw new Error('Queue item not found');
      }

      if (queueItem.status !== 'pending') {
        throw new Error('Queue item is not pending');
      }

      // Mark as processing
      await prisma.callQueue.update({
        where: { id: queueItemId },
        data: {
          status: 'processing',
          lastAttemptAt: new Date(),
          attempts: { increment: 1 }
        }
      });

      console.log(`[CALL QUEUE] Processing queue item:`, queueItemId);

      // Initiate the call
      const callLog = await callService.initiateCall(queueItem);

      // Mark as completed and link to call log
      await prisma.callQueue.update({
        where: { id: queueItemId },
        data: {
          status: 'completed',
          callLogId: callLog.id
        }
      });

      console.log(`[CALL QUEUE] Successfully processed:`, queueItemId);

      return {
        success: true,
        callLog
      };
    } catch (error) {
      console.error('[CALL QUEUE] Error processing queue item:', error);

      // Get current queue item to check retry logic
      const queueItem = await prisma.callQueue.findUnique({
        where: { id: queueItemId }
      });

      if (queueItem) {
        const shouldRetry = queueItem.attempts < queueItem.maxAttempts;

        const updateData = {
          errorMessage: error.message
        };

        if (shouldRetry) {
          // Calculate next retry time with exponential backoff
          const backoffMinutes = Math.pow(2, queueItem.attempts) * 2; // 2, 4, 8 minutes
          updateData.status = 'pending';
          updateData.nextRetryAt = new Date(Date.now() + backoffMinutes * 60 * 1000);
          console.log(`[CALL QUEUE] Will retry in ${backoffMinutes} minutes`);
        } else {
          updateData.status = 'failed';
          console.log(`[CALL QUEUE] Max attempts reached, marking as failed`);
        }

        await prisma.callQueue.update({
          where: { id: queueItemId },
          data: updateData
        });
      }

      throw error;
    }
  }

  /**
   * Get queue status for a tenant
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Queue statistics
   */
  async getQueueStatus(tenantId) {
    try {
      const [pending, processing, completed, failed, total] = await Promise.all([
        prisma.callQueue.count({
          where: { tenantId, status: 'pending' }
        }),
        prisma.callQueue.count({
          where: { tenantId, status: 'processing' }
        }),
        prisma.callQueue.count({
          where: { tenantId, status: 'completed' }
        }),
        prisma.callQueue.count({
          where: { tenantId, status: 'failed' }
        }),
        prisma.callQueue.count({
          where: { tenantId }
        })
      ]);

      // Get upcoming scheduled calls
      const scheduledCalls = await prisma.callQueue.count({
        where: {
          tenantId,
          status: 'pending',
          scheduledFor: {
            gt: new Date()
          }
        }
      });

      // Get due calls (ready to process)
      const dueCalls = await prisma.callQueue.count({
        where: {
          tenantId,
          status: 'pending',
          OR: [
            { scheduledFor: null },
            { scheduledFor: { lte: new Date() } }
          ]
        }
      });

      return {
        total,
        pending,
        processing,
        completed,
        failed,
        scheduledCalls,
        dueCalls
      };
    } catch (error) {
      console.error('[CALL QUEUE] Error getting queue status:', error);
      throw error;
    }
  }

  /**
   * Retry a failed queue item
   * @param {string} queueItemId - CallQueue ID
   * @returns {Promise<Object>} Updated queue item
   */
  async retryQueueItem(queueItemId) {
    try {
      const queueItem = await prisma.callQueue.findUnique({
        where: { id: queueItemId }
      });

      if (!queueItem) {
        throw new Error('Queue item not found');
      }

      if (queueItem.status !== 'failed') {
        throw new Error('Can only retry failed calls');
      }

      // Reset to pending
      const updatedItem = await prisma.callQueue.update({
        where: { id: queueItemId },
        data: {
          status: 'pending',
          attempts: 0,
          nextRetryAt: null,
          errorMessage: null,
          lastAttemptAt: null
        }
      });

      console.log(`[CALL QUEUE] Queue item reset for retry:`, queueItemId);

      return updatedItem;
    } catch (error) {
      console.error('[CALL QUEUE] Error retrying queue item:', error);
      throw error;
    }
  }

  /**
   * Cancel a queued call
   * @param {string} queueItemId - CallQueue ID
   * @param {string} tenantId - Tenant ID (for security)
   * @returns {Promise<Object>} Updated queue item
   */
  async cancelQueueItem(queueItemId, tenantId) {
    try {
      const queueItem = await prisma.callQueue.findUnique({
        where: { id: queueItemId }
      });

      if (!queueItem || queueItem.tenantId !== tenantId) {
        throw new Error('Queue item not found');
      }

      if (!['pending', 'failed'].includes(queueItem.status)) {
        throw new Error('Can only cancel pending or failed calls');
      }

      const updatedItem = await prisma.callQueue.update({
        where: { id: queueItemId },
        data: {
          status: 'cancelled',
          errorMessage: 'Cancelled by user'
        }
      });

      console.log(`[CALL QUEUE] Queue item cancelled:`, queueItemId);

      return updatedItem;
    } catch (error) {
      console.error('[CALL QUEUE] Error cancelling queue item:', error);
      throw error;
    }
  }

  /**
   * Get queue items with filters
   * @param {Object} filters - Filter criteria
   * @returns {Promise<Object>} Queue items with pagination
   */
  async getQueueItems(filters) {
    try {
      const {
        tenantId,
        status,
        leadId,
        callType,
        page = 1,
        limit = 50
      } = filters;

      const where = { tenantId };

      if (status) where.status = status;
      if (leadId) where.leadId = leadId;
      if (callType) where.callType = callType;

      const [queueItems, total] = await Promise.all([
        prisma.callQueue.findMany({
          where,
          include: {
            lead: {
              select: { id: true, name: true, company: true, phone: true }
            },
            contact: {
              select: { id: true, name: true, company: true, phone: true }
            },
            callLog: {
              select: { id: true, twilioStatus: true, callOutcome: true, duration: true }
            },
            createdBy: {
              select: { id: true, name: true, email: true }
            }
          },
          orderBy: [
            { priority: 'desc' },
            { createdAt: 'asc' }
          ],
          skip: (page - 1) * limit,
          take: limit
        }),
        prisma.callQueue.count({ where })
      ]);

      return {
        queueItems,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('[CALL QUEUE] Error fetching queue items:', error);
      throw error;
    }
  }

  /**
   * Clean up old completed/failed queue items
   * @param {number} daysOld - Delete items older than this many days
   * @returns {Promise<number>} Number of items deleted
   */
  async cleanupOldQueueItems(daysOld = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const result = await prisma.callQueue.deleteMany({
        where: {
          status: { in: ['completed', 'failed', 'cancelled'] },
          updatedAt: { lt: cutoffDate }
        }
      });

      console.log(`[CALL QUEUE] Cleaned up ${result.count} old queue items`);

      return result.count;
    } catch (error) {
      console.error('[CALL QUEUE] Error cleaning up queue items:', error);
      throw error;
    }
  }
}

module.exports = new CallQueueService();
