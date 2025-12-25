/**
 * Campaign Service - Email and WhatsApp Campaign Automation
 * Handles campaign creation, scheduling, execution, and tracking
 */

const { PrismaClient } = require('@prisma/client');
const emailService = require('./email');
const whatsappService = require('./whatsapp');

const prisma = new PrismaClient();

// Configuration
const CAMPAIGN_CONFIG = {
  MAX_RECIPIENTS: 10000,
  BATCH_SIZE: 100,
  WHATSAPP_RATE_LIMIT_DELAY: 2000, // 2 seconds between WhatsApp messages
  EMAIL_BATCH_DELAY: 1000, // 1 second between email batches
};

class CampaignService {
  /**
   * Create a new campaign
   */
  async createCampaign(userId, campaignData, tenantId) {
    try {
      const campaign = await prisma.campaign.create({
        data: {
          userId,
          tenantId,
          name: campaignData.name,
          description: campaignData.description || null,
          channel: campaignData.channel, // 'email' | 'whatsapp'
          status: 'draft',
          subject: campaignData.subject || null,
          htmlContent: campaignData.htmlContent || null,
          textContent: campaignData.textContent,
          scheduledAt: campaignData.scheduledAt || null,
          targetType: campaignData.targetType,
          targetFilters: campaignData.targetFilters || null,
        },
      });

      // Build initial recipient list based on targetType filters
      // This allows users to see and manage recipients before starting the campaign
      if (campaignData.targetType && campaignData.targetType !== 'custom') {
        try {
          const recipients = await this.buildRecipientList(campaign);

          if (recipients.length > 0) {
            // Create recipient records
            await prisma.campaignRecipient.createMany({
              data: recipients.map(r => ({
                campaignId: campaign.id,
                ...r,
              })),
            });

            // Update campaign with recipient count
            await prisma.campaign.update({
              where: { id: campaign.id },
              data: {
                totalRecipients: recipients.length,
              },
            });

            console.log(`Created campaign with ${recipients.length} recipients`);
          }
        } catch (recipientError) {
          console.error('Error building initial recipient list:', recipientError);
          // Continue even if recipient building fails
        }
      }

      // Log campaign creation
      await this.logCampaignAction(campaign.id, 'created', `Campaign "${campaign.name}" created`, {
        channel: campaign.channel,
        targetType: campaign.targetType,
      });

      return campaign;
    } catch (error) {
      console.error('Error creating campaign:', error);
      throw new Error('Failed to create campaign');
    }
  }

  /**
   * Update campaign
   */
  async updateCampaign(campaignId, userId, updates) {
    try {
      // Verify ownership
      const campaign = await this.getCampaignById(campaignId, userId);
      if (!campaign) {
        throw new Error('Campaign not found');
      }

      // Prevent updating running campaigns
      if (campaign.status === 'running') {
        throw new Error('Cannot update a running campaign');
      }

      const updatedCampaign = await prisma.campaign.update({
        where: { id: campaignId },
        data: {
          ...updates,
          updatedAt: new Date(),
        },
      });

      return updatedCampaign;
    } catch (error) {
      console.error('Error updating campaign:', error);
      throw error;
    }
  }

  /**
   * Delete campaign
   */
  async deleteCampaign(campaignId, userId) {
    try {
      // Verify ownership
      const campaign = await this.getCampaignById(campaignId, userId);
      if (!campaign) {
        throw new Error('Campaign not found');
      }

      // Prevent deleting running campaigns
      if (campaign.status === 'running') {
        throw new Error('Cannot delete a running campaign. Pause it first.');
      }

      await prisma.campaign.delete({
        where: { id: campaignId },
      });

      return { success: true };
    } catch (error) {
      console.error('Error deleting campaign:', error);
      throw error;
    }
  }

  /**
   * Get campaigns for a user with optional filters
   */
  async getCampaigns(userId, filters = {}) {
    try {
      const where = { userId };

      if (filters.status) {
        where.status = filters.status;
      }

      if (filters.channel) {
        where.channel = filters.channel;
      }

      if (filters.search) {
        where.OR = [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } },
        ];
      }

      const campaigns = await prisma.campaign.findMany({
        where,
        include: {
          _count: {
            select: {
              recipients: true,
              logs: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return campaigns;
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      throw new Error('Failed to fetch campaigns');
    }
  }

  /**
   * Get campaign by ID
   */
  async getCampaignById(campaignId, userId) {
    try {
      const campaign = await prisma.campaign.findFirst({
        where: {
          id: campaignId,
          userId,
        },
        include: {
          _count: {
            select: {
              recipients: true,
            },
          },
        },
      });

      return campaign;
    } catch (error) {
      console.error('Error fetching campaign:', error);
      throw new Error('Failed to fetch campaign');
    }
  }

  /**
   * Get campaign statistics
   */
  async getCampaignStats(campaignId, userId) {
    try {
      const campaign = await this.getCampaignById(campaignId, userId);
      if (!campaign) {
        throw new Error('Campaign not found');
      }

      const recipients = await prisma.campaignRecipient.groupBy({
        by: ['status'],
        where: { campaignId },
        _count: true,
      });

      const stats = {
        total: campaign.totalRecipients,
        sent: campaign.sentCount,
        failed: campaign.failedCount,
        delivered: campaign.deliveredCount,
        opened: campaign.openedCount,
        byStatus: recipients.reduce((acc, r) => {
          acc[r.status] = r._count;
          return acc;
        }, {}),
      };

      return stats;
    } catch (error) {
      console.error('Error fetching campaign stats:', error);
      throw error;
    }
  }

  /**
   * Get campaign recipients with pagination
   */
  async getCampaignRecipients(campaignId, userId, { page = 1, limit = 50, status }) {
    try {
      // Verify ownership
      const campaign = await this.getCampaignById(campaignId, userId);
      if (!campaign) {
        throw new Error('Campaign not found');
      }

      const where = { campaignId };
      if (status) {
        where.status = status;
      }

      const [recipients, total] = await Promise.all([
        prisma.campaignRecipient.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.campaignRecipient.count({ where }),
      ]);

      return {
        recipients,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error('Error fetching campaign recipients:', error);
      throw error;
    }
  }

  /**
   * Add a single recipient to campaign
   */
  async addRecipient(campaignId, userId, recipientData) {
    try {
      // Verify ownership
      const campaign = await this.getCampaignById(campaignId, userId);
      if (!campaign) {
        throw new Error('Campaign not found');
      }

      // Prevent adding to non-draft campaigns
      if (campaign.status !== 'draft') {
        throw new Error('Can only add recipients to draft campaigns');
      }

      // Create recipient record
      const recipient = await prisma.campaignRecipient.create({
        data: {
          campaignId,
          tenantId: campaign.tenantId,
          ...recipientData,
          status: 'pending',
        },
      });

      // Update campaign total recipients count
      await prisma.campaign.update({
        where: { id: campaignId },
        data: {
          totalRecipients: { increment: 1 },
        },
      });

      await this.logCampaignAction(
        campaignId,
        'recipient_added',
        `Added recipient: ${recipientData.recipientName}`,
        { recipientId: recipient.id }
      );

      return recipient;
    } catch (error) {
      console.error('Error adding recipient:', error);
      throw error;
    }
  }

  /**
   * Remove a recipient from campaign
   */
  async removeRecipient(campaignId, userId, recipientId) {
    try {
      // Verify ownership
      const campaign = await this.getCampaignById(campaignId, userId);
      if (!campaign) {
        throw new Error('Campaign not found');
      }

      // Prevent removing from non-draft campaigns
      if (campaign.status !== 'draft') {
        throw new Error('Can only remove recipients from draft campaigns');
      }

      // Verify recipient belongs to this campaign
      const recipient = await prisma.campaignRecipient.findFirst({
        where: {
          id: recipientId,
          campaignId,
        },
      });

      if (!recipient) {
        throw new Error('Recipient not found in this campaign');
      }

      // Delete recipient
      await prisma.campaignRecipient.delete({
        where: { id: recipientId },
      });

      // Update campaign total recipients count
      await prisma.campaign.update({
        where: { id: campaignId },
        data: {
          totalRecipients: { decrement: 1 },
        },
      });

      await this.logCampaignAction(
        campaignId,
        'recipient_removed',
        `Removed recipient: ${recipient.recipientName}`,
        { recipientId }
      );

      return { success: true };
    } catch (error) {
      console.error('Error removing recipient:', error);
      throw error;
    }
  }

  /**
   * Build recipient list based on campaign filters
   */
  async buildRecipientList(campaign) {
    try {
      let recipients = [];
      const { targetType, targetFilters, channel } = campaign;

      // Build query based on target type
      const where = {};

      if (targetType === 'leads') {
        // Apply filters for leads
        if (targetFilters) {
          if (targetFilters.status) {
            where.status = { in: targetFilters.status };
          }
          if (targetFilters.priority) {
            where.priority = { in: targetFilters.priority };
          }
          if (targetFilters.tags) {
            where.tags = { hasSome: targetFilters.tags };
          }
          if (targetFilters.assignedTo) {
            where.assignedTo = targetFilters.assignedTo;
          }
          if (targetFilters.createdAfter) {
            where.createdAt = { gte: new Date(targetFilters.createdAfter) };
          }
        }

        const leads = await prisma.lead.findMany({
          where: { ...where, userId: campaign.userId },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            whatsapp: true,
            company: true,
          },
          take: CAMPAIGN_CONFIG.MAX_RECIPIENTS,
        });

        recipients = leads.map(lead => ({
          recipientType: 'lead',
          recipientId: lead.id,
          recipientName: lead.name,
          recipientEmail: channel === 'email' ? lead.email : null,
          recipientPhone: channel === 'whatsapp' ? (lead.whatsapp || lead.phone) : null,
        }));
      } else if (targetType === 'contacts') {
        // Apply filters for contacts
        if (targetFilters) {
          if (targetFilters.type) {
            where.type = { in: targetFilters.type };
          }
          if (targetFilters.tags) {
            where.tags = { hasSome: targetFilters.tags };
          }
          if (targetFilters.assignedTo) {
            where.assignedTo = targetFilters.assignedTo;
          }
        }

        const contacts = await prisma.contact.findMany({
          where: { ...where, userId: campaign.userId },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            whatsapp: true,
            company: true,
          },
          take: CAMPAIGN_CONFIG.MAX_RECIPIENTS,
        });

        recipients = contacts.map(contact => ({
          recipientType: 'contact',
          recipientId: contact.id,
          recipientName: contact.name,
          recipientEmail: channel === 'email' ? contact.email : null,
          recipientPhone: channel === 'whatsapp' ? (contact.whatsapp || contact.phone) : null,
        }));
      } else if (targetType === 'all') {
        // Get both leads and contacts
        const [leads, contacts] = await Promise.all([
          prisma.lead.findMany({
            where: { userId: campaign.userId },
            select: { id: true, name: true, email: true, phone: true, whatsapp: true },
            take: CAMPAIGN_CONFIG.MAX_RECIPIENTS / 2,
          }),
          prisma.contact.findMany({
            where: { userId: campaign.userId },
            select: { id: true, name: true, email: true, phone: true, whatsapp: true },
            take: CAMPAIGN_CONFIG.MAX_RECIPIENTS / 2,
          }),
        ]);

        const leadRecipients = leads.map(lead => ({
          recipientType: 'lead',
          recipientId: lead.id,
          recipientName: lead.name,
          recipientEmail: channel === 'email' ? lead.email : null,
          recipientPhone: channel === 'whatsapp' ? (lead.whatsapp || lead.phone) : null,
        }));

        const contactRecipients = contacts.map(contact => ({
          recipientType: 'contact',
          recipientId: contact.id,
          recipientName: contact.name,
          recipientEmail: channel === 'email' ? contact.email : null,
          recipientPhone: channel === 'whatsapp' ? (contact.whatsapp || contact.phone) : null,
        }));

        recipients = [...leadRecipients, ...contactRecipients];
      } else if (targetType === 'tags') {
        // Get both leads and contacts filtered by tags
        if (targetFilters && targetFilters.tags && targetFilters.tags.length > 0) {
          const [leads, contacts] = await Promise.all([
            prisma.lead.findMany({
              where: {
                userId: campaign.userId,
                tags: { hasSome: targetFilters.tags },
              },
              select: { id: true, name: true, email: true, phone: true, whatsapp: true, company: true },
              take: CAMPAIGN_CONFIG.MAX_RECIPIENTS / 2,
            }),
            prisma.contact.findMany({
              where: {
                userId: campaign.userId,
                tags: { hasSome: targetFilters.tags },
              },
              select: { id: true, name: true, email: true, phone: true, whatsapp: true, company: true },
              take: CAMPAIGN_CONFIG.MAX_RECIPIENTS / 2,
            }),
          ]);

          const leadRecipients = leads.map(lead => ({
            recipientType: 'lead',
            recipientId: lead.id,
            recipientName: lead.name,
            recipientEmail: channel === 'email' ? lead.email : null,
            recipientPhone: channel === 'whatsapp' ? (lead.whatsapp || lead.phone) : null,
          }));

          const contactRecipients = contacts.map(contact => ({
            recipientType: 'contact',
            recipientId: contact.id,
            recipientName: contact.name,
            recipientEmail: channel === 'email' ? contact.email : null,
            recipientPhone: channel === 'whatsapp' ? (contact.whatsapp || contact.phone) : null,
          }));

          recipients = [...leadRecipients, ...contactRecipients];
        }
      } else if (targetType === 'custom') {
        // Manual entry of emails or phone numbers
        if (targetFilters && targetFilters.customList) {
          const customList = targetFilters.customList;

          if (channel === 'email' && customList.emails) {
            recipients = customList.emails.map((email, index) => ({
              recipientType: 'custom',
              recipientId: `custom-${index}`,
              recipientName: email.split('@')[0], // Use email prefix as name
              recipientEmail: email.trim(),
              recipientPhone: null,
            }));
          } else if (channel === 'whatsapp' && customList.phones) {
            recipients = customList.phones.map((phone, index) => ({
              recipientType: 'custom',
              recipientId: `custom-${index}`,
              recipientName: phone, // Use phone as name
              recipientEmail: null,
              recipientPhone: phone.trim(),
            }));
          }
        }
      }

      // Filter out recipients without valid contact info
      recipients = recipients.filter(r => {
        if (channel === 'email') {
          return r.recipientEmail && r.recipientEmail.includes('@');
        } else if (channel === 'whatsapp') {
          return r.recipientPhone && r.recipientPhone.length > 5;
        }
        return false;
      });

      return recipients;
    } catch (error) {
      console.error('Error building recipient list:', error);
      throw error;
    }
  }

  /**
   * Schedule campaign
   */
  async scheduleCampaign(campaignId, userId, scheduledAt) {
    try {
      const campaign = await this.getCampaignById(campaignId, userId);
      if (!campaign) {
        throw new Error('Campaign not found');
      }

      if (campaign.status !== 'draft') {
        throw new Error('Only draft campaigns can be scheduled');
      }

      // Check if recipients already exist
      const existingCount = await prisma.campaignRecipient.count({
        where: { campaignId }
      });

      let totalRecipients = existingCount;

      // Only build and create recipients if none exist
      if (existingCount === 0) {
        const recipients = await this.buildRecipientList(campaign);

        if (recipients.length === 0) {
          throw new Error('No valid recipients found for this campaign');
        }

        // Create recipient records
        await prisma.campaignRecipient.createMany({
          data: recipients.map(r => ({
            campaignId,
            ...r,
          })),
        });

        totalRecipients = recipients.length;
      }

      if (totalRecipients === 0) {
        throw new Error('No valid recipients found for this campaign');
      }

      // Update campaign
      const updatedCampaign = await prisma.campaign.update({
        where: { id: campaignId },
        data: {
          scheduledAt: new Date(scheduledAt),
          status: 'scheduled',
          totalRecipients,
        },
      });

      await this.logCampaignAction(
        campaignId,
        'scheduled',
        `Campaign scheduled for ${new Date(scheduledAt).toLocaleString()}`,
        { recipientCount: totalRecipients }
      );

      return updatedCampaign;
    } catch (error) {
      console.error('Error scheduling campaign:', error);
      throw error;
    }
  }

  /**
   * Start campaign immediately
   */
  async startCampaign(campaignId, userId, io) {
    try {
      const campaign = await this.getCampaignById(campaignId, userId);
      if (!campaign) {
        throw new Error('Campaign not found');
      }

      if (campaign.status === 'running') {
        throw new Error('Campaign is already running');
      }

      // If draft, check if recipients exist, if not build recipient list
      if (campaign.status === 'draft') {
        const existingCount = await prisma.campaignRecipient.count({
          where: { campaignId }
        });

        // Only build and create recipients if none exist
        if (existingCount === 0) {
          const recipients = await this.buildRecipientList(campaign);

          if (recipients.length === 0) {
            throw new Error('No valid recipients found for this campaign');
          }

          await prisma.campaignRecipient.createMany({
            data: recipients.map(r => ({
              campaignId,
              ...r,
            })),
          });

          await prisma.campaign.update({
            where: { id: campaignId },
            data: {
              totalRecipients: recipients.length,
            },
          });
        } else if (existingCount === 0) {
          throw new Error('No valid recipients found for this campaign');
        }
      }

      // Update status to running
      await prisma.campaign.update({
        where: { id: campaignId },
        data: { status: 'running' },
      });

      await this.logCampaignAction(campaignId, 'started', 'Campaign execution started');

      // Execute campaign in background
      this.executeCampaign(campaignId, userId, io).catch(err => {
        console.error(`Campaign ${campaignId} execution failed:`, err);
      });

      return { success: true, message: 'Campaign started' };
    } catch (error) {
      console.error('Error starting campaign:', error);
      throw error;
    }
  }

  /**
   * Execute campaign - send messages to all recipients
   */
  async executeCampaign(campaignId, userId, io) {
    try {
      console.log(`[CAMPAIGN] ${campaignId}: Starting execution`);

      const campaign = await this.getCampaignById(campaignId, userId);
      if (!campaign) {
        throw new Error('Campaign not found');
      }

      // Get all pending recipients
      const recipients = await prisma.campaignRecipient.findMany({
        where: {
          campaignId,
          status: 'pending',
        },
      });

      console.log(`[CAMPAIGN] ${campaignId}: Processing ${recipients.length} recipients`);

      let sentCount = 0;
      let failedCount = 0;

      // Process in batches
      for (let i = 0; i < recipients.length; i += CAMPAIGN_CONFIG.BATCH_SIZE) {
        const batch = recipients.slice(i, i + CAMPAIGN_CONFIG.BATCH_SIZE);

        for (const recipient of batch) {
          try {
            await this.sendToRecipient(campaign, recipient);
            sentCount++;

            // Broadcast progress via Socket.io
            if (io) {
              io.to(`user:${userId}`).emit('campaign:progress', {
                campaignId,
                sentCount,
                totalRecipients: campaign.totalRecipients,
                failedCount,
                status: 'running',
              });
            }

            // Rate limiting for WhatsApp
            if (campaign.channel === 'whatsapp') {
              await this.delay(CAMPAIGN_CONFIG.WHATSAPP_RATE_LIMIT_DELAY);
            }
          } catch (error) {
            failedCount++;
            console.error(`[CAMPAIGN] ${campaignId}: Failed to send to ${recipient.recipientName}:`, error.message);
          }
        }

        // Delay between batches for emails
        if (campaign.channel === 'email' && i + CAMPAIGN_CONFIG.BATCH_SIZE < recipients.length) {
          await this.delay(CAMPAIGN_CONFIG.EMAIL_BATCH_DELAY);
        }
      }

      // Update campaign as completed
      await prisma.campaign.update({
        where: { id: campaignId },
        data: {
          status: 'completed',
          completedAt: new Date(),
          sentCount,
          failedCount,
        },
      });

      await this.logCampaignAction(
        campaignId,
        'completed',
        `Campaign completed: ${sentCount} sent, ${failedCount} failed`
      );

      console.log(`[CAMPAIGN] ${campaignId}: Completed - ${sentCount} sent, ${failedCount} failed`);

      // Broadcast completion
      if (io) {
        io.to(`user:${userId}`).emit('campaign:completed', {
          campaignId,
          stats: { sentCount, failedCount, totalRecipients: campaign.totalRecipients },
        });
      }
    } catch (error) {
      console.error(`[CAMPAIGN] ${campaignId}: Execution failed:`, error);

      await prisma.campaign.update({
        where: { id: campaignId },
        data: { status: 'failed' },
      });

      await this.logCampaignAction(campaignId, 'failed', `Campaign failed: ${error.message}`);

      if (io) {
        io.to(`user:${userId}`).emit('campaign:failed', {
          campaignId,
          error: error.message,
        });
      }

      throw error;
    }
  }

  /**
   * Send message to a single recipient
   */
  async sendToRecipient(campaign, recipient) {
    try {
      // Replace template variables
      const content = this.replaceTemplateVariables(campaign.textContent, {
        name: recipient.recipientName,
        email: recipient.recipientEmail,
        phone: recipient.recipientPhone,
      });

      let messageId = null;
      let success = false;

      if (campaign.channel === 'email') {
        const subject = this.replaceTemplateVariables(campaign.subject || 'Message from Bharat CRM', {
          name: recipient.recipientName,
        });

        const htmlContent = campaign.htmlContent
          ? this.replaceTemplateVariables(campaign.htmlContent, {
              name: recipient.recipientName,
              email: recipient.recipientEmail,
            })
          : null;

        const result = await emailService.sendEmail({
          to: recipient.recipientEmail,
          subject,
          text: content,
          html: htmlContent,
          userId: campaign.userId,
        });

        messageId = result.messageId;
        success = result.success;
      } else if (campaign.channel === 'whatsapp') {
        if (!whatsappService.isConfigured()) {
          throw new Error('WhatsApp service is not configured');
        }

        const result = await whatsappService.sendMessage(recipient.recipientPhone, content);
        messageId = result.messageId;
        success = true;
      }

      // Update recipient status
      await prisma.campaignRecipient.update({
        where: { id: recipient.id },
        data: {
          status: success ? 'sent' : 'failed',
          sentAt: new Date(),
          messageId,
        },
      });

      return { success, messageId };
    } catch (error) {
      // Update recipient as failed
      await prisma.campaignRecipient.update({
        where: { id: recipient.id },
        data: {
          status: 'failed',
          failedAt: new Date(),
          errorMessage: error.message,
        },
      });

      throw error;
    }
  }

  /**
   * Pause campaign
   */
  async pauseCampaign(campaignId, userId) {
    try {
      const campaign = await this.getCampaignById(campaignId, userId);
      if (!campaign) {
        throw new Error('Campaign not found');
      }

      if (campaign.status !== 'running') {
        throw new Error('Only running campaigns can be paused');
      }

      await prisma.campaign.update({
        where: { id: campaignId },
        data: { status: 'paused' },
      });

      await this.logCampaignAction(campaignId, 'paused', 'Campaign paused by user');

      return { success: true };
    } catch (error) {
      console.error('Error pausing campaign:', error);
      throw error;
    }
  }

  /**
   * Resume paused campaign
   */
  async resumeCampaign(campaignId, userId, io) {
    try {
      const campaign = await this.getCampaignById(campaignId, userId);
      if (!campaign) {
        throw new Error('Campaign not found');
      }

      if (campaign.status !== 'paused') {
        throw new Error('Only paused campaigns can be resumed');
      }

      await prisma.campaign.update({
        where: { id: campaignId },
        data: { status: 'running' },
      });

      await this.logCampaignAction(campaignId, 'resumed', 'Campaign resumed by user');

      // Continue execution
      this.executeCampaign(campaignId, userId, io).catch(err => {
        console.error(`Campaign ${campaignId} execution failed:`, err);
      });

      return { success: true };
    } catch (error) {
      console.error('Error resuming campaign:', error);
      throw error;
    }
  }

  /**
   * Process scheduled campaigns (called by cron job)
   */
  async processScheduledCampaigns(io) {
    try {
      const now = new Date();

      const scheduledCampaigns = await prisma.campaign.findMany({
        where: {
          status: 'scheduled',
          scheduledAt: {
            lte: now,
          },
        },
      });

      console.log(`[CAMPAIGN SCHEDULER] Found ${scheduledCampaigns.length} campaigns to execute`);

      for (const campaign of scheduledCampaigns) {
        try {
          console.log(`[CAMPAIGN SCHEDULER] Starting campaign ${campaign.id}: ${campaign.name}`);

          await prisma.campaign.update({
            where: { id: campaign.id },
            data: { status: 'running' },
          });

          // Execute in background
          this.executeCampaign(campaign.id, campaign.userId, io).catch(err => {
            console.error(`[CAMPAIGN SCHEDULER] Campaign ${campaign.id} failed:`, err);
          });
        } catch (error) {
          console.error(`[CAMPAIGN SCHEDULER] Error starting campaign ${campaign.id}:`, error);
        }
      }
    } catch (error) {
      console.error('[CAMPAIGN SCHEDULER] Error processing scheduled campaigns:', error);
    }
  }

  /**
   * Send test message to current user
   */
  async sendTestMessage(campaignId, userId, testRecipient) {
    try {
      const campaign = await this.getCampaignById(campaignId, userId);
      if (!campaign) {
        throw new Error('Campaign not found');
      }

      // Create temporary recipient
      const tempRecipient = {
        id: 'test',
        recipientName: testRecipient.name,
        recipientEmail: campaign.channel === 'email' ? testRecipient.email : null,
        recipientPhone: campaign.channel === 'whatsapp' ? testRecipient.phone : null,
      };

      const content = this.replaceTemplateVariables(campaign.textContent, {
        name: tempRecipient.recipientName,
        email: tempRecipient.recipientEmail,
        phone: tempRecipient.recipientPhone,
      });

      if (campaign.channel === 'email') {
        const subject = this.replaceTemplateVariables(
          campaign.subject || 'Test - Message from Bharat CRM',
          { name: tempRecipient.recipientName }
        );

        const htmlContent = campaign.htmlContent
          ? this.replaceTemplateVariables(campaign.htmlContent, {
              name: tempRecipient.recipientName,
              email: tempRecipient.recipientEmail,
            })
          : null;

        await emailService.sendEmail({
          to: tempRecipient.recipientEmail,
          subject: `[TEST] ${subject}`,
          text: content,
          html: htmlContent,
          userId,
        });
      } else if (campaign.channel === 'whatsapp') {
        if (!whatsappService.isConfigured()) {
          throw new Error('WhatsApp service is not configured');
        }

        await whatsappService.sendMessage(tempRecipient.recipientPhone, `[TEST] ${content}`);
      }

      return { success: true, message: 'Test message sent successfully' };
    } catch (error) {
      console.error('Error sending test message:', error);
      throw error;
    }
  }

  /**
   * Log campaign action
   */
  async logCampaignAction(campaignId, action, message, metadata = null) {
    try {
      // Get campaign to retrieve tenantId
      const campaign = await prisma.campaign.findUnique({
        where: { id: campaignId },
        select: { tenantId: true }
      });

      if (!campaign) {
        console.error('Campaign not found for logging');
        return;
      }

      await prisma.campaignLog.create({
        data: {
          campaignId,
          tenantId: campaign.tenantId,
          action,
          message,
          metadata,
        },
      });
    } catch (error) {
      console.error('Error logging campaign action:', error);
      // Don't throw - logging shouldn't break campaign
    }
  }

  /**
   * Get campaign logs
   */
  async getCampaignLogs(campaignId, userId) {
    try {
      // Verify ownership
      const campaign = await this.getCampaignById(campaignId, userId);
      if (!campaign) {
        throw new Error('Campaign not found');
      }

      const logs = await prisma.campaignLog.findMany({
        where: { campaignId },
        orderBy: { createdAt: 'desc' },
      });

      return logs;
    } catch (error) {
      console.error('Error fetching campaign logs:', error);
      throw error;
    }
  }

  /**
   * Replace template variables in content
   */
  replaceTemplateVariables(content, variables) {
    if (!content) return content;

    let result = content;

    // Replace each variable
    Object.keys(variables).forEach(key => {
      const value = variables[key] || '';
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, value);
    });

    return result;
  }

  /**
   * Delay helper
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = new CampaignService();
