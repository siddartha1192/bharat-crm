/**
 * Campaign Routes - API endpoints for campaign management
 */

const express = require('express');
const router = express.Router();
const campaignService = require('../services/campaign');
const { authenticate } = require('../middleware/auth');
const { tenantContext, getTenantFilter, autoInjectTenantId } = require('../middleware/tenant');
const prisma = require('../lib/prisma');

// All routes require authentication
router.use(authenticate);
router.use(tenantContext);

/**
 * GET /api/campaigns
 * Get all campaigns for the authenticated user
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const filters = {
      status: req.query.status,
      channel: req.query.channel,
      search: req.query.search,
    };

    const campaigns = await campaignService.getCampaigns(userId, filters);

    res.json({
      success: true,
      campaigns,
    });
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch campaigns',
    });
  }
});

/**
 * POST /api/campaigns
 * Create a new campaign
 */
router.post('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const campaignData = req.body;

    // Validation
    if (!campaignData.name || !campaignData.channel) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: name, channel',
      });
    }

    if (!['email', 'whatsapp'].includes(campaignData.channel)) {
      return res.status(400).json({
        success: false,
        message: 'Channel must be either "email" or "whatsapp"',
      });
    }

    // Email campaigns require subject and textContent
    if (campaignData.channel === 'email') {
      if (!campaignData.subject) {
        return res.status(400).json({
          success: false,
          message: 'Subject is required for email campaigns',
        });
      }
      if (!campaignData.textContent) {
        return res.status(400).json({
          success: false,
          message: 'Message content is required for email campaigns',
        });
      }
    }

    // WhatsApp campaigns validation
    if (campaignData.channel === 'whatsapp') {
      const messageType = campaignData.whatsappMessageType || 'text';

      if (messageType === 'text' && !campaignData.textContent) {
        return res.status(400).json({
          success: false,
          message: 'Message content is required for WhatsApp text messages',
        });
      }

      if (messageType === 'media') {
        if (!campaignData.whatsappMediaType) {
          return res.status(400).json({
            success: false,
            message: 'Media type is required for WhatsApp media messages',
          });
        }
        if (!campaignData.whatsappMediaUrl) {
          return res.status(400).json({
            success: false,
            message: 'Media URL is required for WhatsApp media messages',
          });
        }
      }

      if (messageType === 'template') {
        if (!campaignData.whatsappTemplateName) {
          return res.status(400).json({
            success: false,
            message: 'Template name is required for WhatsApp template messages',
          });
        }
      }
    }

    const campaign = await campaignService.createCampaign(userId, campaignData, req.tenant.id);

    res.status(201).json({
      success: true,
      campaign,
      message: 'Campaign created successfully',
    });
  } catch (error) {
    console.error('Error creating campaign:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create campaign',
    });
  }
});

/**
 * GET /api/campaigns/:id
 * Get campaign by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const campaignId = req.params.id;

    const campaign = await campaignService.getCampaignById(campaignId, userId);

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found',
      });
    }

    res.json({
      success: true,
      campaign,
    });
  } catch (error) {
    console.error('Error fetching campaign:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch campaign',
    });
  }
});

/**
 * PUT /api/campaigns/:id
 * Update campaign
 */
router.put('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const campaignId = req.params.id;
    const updates = req.body;

    // Prevent updating certain fields
    delete updates.id;
    delete updates.userId;
    delete updates.createdAt;
    delete updates.sentCount;
    delete updates.failedCount;
    delete updates.totalRecipients;

    const campaign = await campaignService.updateCampaign(campaignId, userId, updates);

    res.json({
      success: true,
      campaign,
      message: 'Campaign updated successfully',
    });
  } catch (error) {
    console.error('Error updating campaign:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update campaign',
    });
  }
});

/**
 * DELETE /api/campaigns/:id
 * Delete campaign
 */
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const campaignId = req.params.id;

    await campaignService.deleteCampaign(campaignId, userId);

    res.json({
      success: true,
      message: 'Campaign deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting campaign:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete campaign',
    });
  }
});

/**
 * GET /api/campaigns/:id/stats
 * Get campaign statistics
 */
router.get('/:id/stats', async (req, res) => {
  try {
    const userId = req.user.id;
    const campaignId = req.params.id;

    const stats = await campaignService.getCampaignStats(campaignId, userId);

    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error('Error fetching campaign stats:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch campaign statistics',
    });
  }
});

/**
 * GET /api/campaigns/:id/recipients
 * Get campaign recipients with pagination
 */
router.get('/:id/recipients', async (req, res) => {
  try {
    const userId = req.user.id;
    const campaignId = req.params.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const status = req.query.status;

    const result = await campaignService.getCampaignRecipients(campaignId, userId, {
      page,
      limit,
      status,
    });

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Error fetching campaign recipients:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch campaign recipients',
    });
  }
});

/**
 * POST /api/campaigns/:id/recipients
 * Add a single recipient to campaign
 */
router.post('/:id/recipients', async (req, res) => {
  try {
    const userId = req.user.id;
    const campaignId = req.params.id;
    const recipientData = req.body;

    // Validate required fields
    if (!recipientData.recipientName) {
      return res.status(400).json({
        success: false,
        message: 'recipientName is required',
      });
    }

    const result = await campaignService.addRecipient(campaignId, userId, recipientData);

    res.json({
      success: true,
      recipient: result,
      message: 'Recipient added successfully',
    });
  } catch (error) {
    console.error('Error adding recipient:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to add recipient',
    });
  }
});

/**
 * DELETE /api/campaigns/:id/recipients/:recipientId
 * Remove a recipient from campaign
 */
router.delete('/:id/recipients/:recipientId', async (req, res) => {
  try {
    const userId = req.user.id;
    const campaignId = req.params.id;
    const recipientId = req.params.recipientId;

    await campaignService.removeRecipient(campaignId, userId, recipientId);

    res.json({
      success: true,
      message: 'Recipient removed successfully',
    });
  } catch (error) {
    console.error('Error removing recipient:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to remove recipient',
    });
  }
});

/**
 * GET /api/campaigns/:id/logs
 * Get campaign logs
 */
router.get('/:id/logs', async (req, res) => {
  try {
    const userId = req.user.id;
    const campaignId = req.params.id;

    const logs = await campaignService.getCampaignLogs(campaignId, userId);

    res.json({
      success: true,
      logs,
    });
  } catch (error) {
    console.error('Error fetching campaign logs:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch campaign logs',
    });
  }
});

/**
 * POST /api/campaigns/:id/schedule
 * Schedule campaign for future execution
 */
router.post('/:id/schedule', async (req, res) => {
  try {
    const userId = req.user.id;
    const campaignId = req.params.id;
    const { scheduledAt } = req.body;

    if (!scheduledAt) {
      return res.status(400).json({
        success: false,
        message: 'scheduledAt is required',
      });
    }

    const scheduledDate = new Date(scheduledAt);
    const now = new Date();

    if (scheduledDate <= now) {
      return res.status(400).json({
        success: false,
        message: 'Scheduled time must be in the future',
      });
    }

    const campaign = await campaignService.scheduleCampaign(campaignId, userId, scheduledAt);

    res.json({
      success: true,
      campaign,
      message: `Campaign scheduled for ${scheduledDate.toLocaleString()}`,
    });
  } catch (error) {
    console.error('Error scheduling campaign:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to schedule campaign',
    });
  }
});

/**
 * POST /api/campaigns/:id/start
 * Start campaign immediately
 */
router.post('/:id/start', async (req, res) => {
  try {
    const userId = req.user.id;
    const campaignId = req.params.id;
    const io = req.app.get('io'); // Get Socket.io instance

    const result = await campaignService.startCampaign(campaignId, userId, io);

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Error starting campaign:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to start campaign',
    });
  }
});

/**
 * POST /api/campaigns/:id/pause
 * Pause running campaign
 */
router.post('/:id/pause', async (req, res) => {
  try {
    const userId = req.user.id;
    const campaignId = req.params.id;

    const result = await campaignService.pauseCampaign(campaignId, userId);

    res.json({
      success: true,
      ...result,
      message: 'Campaign paused successfully',
    });
  } catch (error) {
    console.error('Error pausing campaign:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to pause campaign',
    });
  }
});

/**
 * POST /api/campaigns/:id/resume
 * Resume paused campaign
 */
router.post('/:id/resume', async (req, res) => {
  try {
    const userId = req.user.id;
    const campaignId = req.params.id;
    const io = req.app.get('io'); // Get Socket.io instance

    const result = await campaignService.resumeCampaign(campaignId, userId, io);

    res.json({
      success: true,
      ...result,
      message: 'Campaign resumed successfully',
    });
  } catch (error) {
    console.error('Error resuming campaign:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to resume campaign',
    });
  }
});

/**
 * POST /api/campaigns/:id/test
 * Send test message to current user
 */
router.post('/:id/test', async (req, res) => {
  try {
    const userId = req.user.id;
    const campaignId = req.params.id;
    const { testRecipient } = req.body;

    if (!testRecipient || !testRecipient.name) {
      return res.status(400).json({
        success: false,
        message: 'Test recipient information is required',
      });
    }

    const result = await campaignService.sendTestMessage(campaignId, userId, testRecipient);

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Error sending test message:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to send test message',
    });
  }
});

/**
 * GET /api/campaigns/templates
 * Get campaign templates
 */
router.get('/templates/list', async (req, res) => {
  try {
    // Pre-defined campaign templates
    const templates = [
      {
        id: 'welcome_email',
        name: 'Welcome Email',
        channel: 'email',
        subject: 'Welcome {{name}}! Let\'s get started',
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #2563eb;">Welcome {{name}}!</h1>
            <p>Thank you for choosing Bharat CRM. We're excited to have you on board.</p>
            <p>If you have any questions, feel free to reach out to us.</p>
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 14px;">Best regards,<br>Bharat CRM Team</p>
            </div>
          </div>
        `,
        textContent: 'Welcome {{name}}! Thank you for choosing Bharat CRM.',
        targetType: 'leads',
      },
      {
        id: 'product_announcement',
        name: 'Product Announcement',
        channel: 'email',
        subject: 'Exciting New Features - {{name}}',
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #2563eb;">New Features Available!</h1>
            <p>Hi {{name}},</p>
            <p>We're thrilled to announce new features that will help you grow your business.</p>
            <ul>
              <li>Feature 1</li>
              <li>Feature 2</li>
              <li>Feature 3</li>
            </ul>
            <p>Check them out today!</p>
          </div>
        `,
        textContent: 'Hi {{name}}, we have exciting new features for you!',
        targetType: 'contacts',
      },
      {
        id: 'whatsapp_followup',
        name: 'WhatsApp Follow-up',
        channel: 'whatsapp',
        textContent: 'Hi {{name}}, just following up on our previous conversation. Let me know if you have any questions!',
        targetType: 'leads',
      },
      {
        id: 'event_invitation',
        name: 'Event Invitation',
        channel: 'email',
        subject: 'You\'re Invited: Exclusive Event for {{name}}',
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #2563eb;">You're Invited!</h1>
            <p>Dear {{name}},</p>
            <p>We're hosting an exclusive event and would love to have you join us.</p>
            <p><strong>Date:</strong> [Event Date]<br>
            <strong>Time:</strong> [Event Time]<br>
            <strong>Location:</strong> [Event Location]</p>
            <p>RSVP by [Date]</p>
          </div>
        `,
        textContent: 'Hi {{name}}, you\'re invited to our exclusive event!',
        targetType: 'contacts',
      },
    ];

    res.json({
      success: true,
      templates,
    });
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch templates',
    });
  }
});

/**
 * POST /api/campaigns/preview
 * Preview campaign with sample data
 */
router.post('/preview', async (req, res) => {
  try {
    const { content, htmlContent, sampleData } = req.body;

    const previewData = {
      name: sampleData?.name || 'John Doe',
      email: sampleData?.email || 'john@example.com',
      phone: sampleData?.phone || '+919876543210',
      company: sampleData?.company || 'Example Corp',
    };

    const previewText = campaignService.replaceTemplateVariables(content, previewData);
    const previewHtml = htmlContent
      ? campaignService.replaceTemplateVariables(htmlContent, previewData)
      : null;

    res.json({
      success: true,
      preview: {
        text: previewText,
        html: previewHtml,
      },
    });
  } catch (error) {
    console.error('Error generating preview:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate preview',
    });
  }
});

/**
 * POST /api/campaigns/estimate-recipients
 * Estimate recipient count based on targeting filters
 */
router.post('/estimate-recipients', async (req, res) => {
  try {
    const userId = req.user.id;
    const { channel, targetType, targetFilters } = req.body;

    if (!channel || !targetType) {
      return res.status(400).json({
        success: false,
        message: 'channel and targetType are required',
      });
    }

    // Create a temporary campaign object for recipient list building
    const tempCampaign = {
      userId,
      channel,
      targetType,
      targetFilters: targetFilters || {},
    };

    // Build recipient list to get count
    const recipients = await campaignService.buildRecipientList(tempCampaign);

    res.json({
      success: true,
      count: recipients.length,
      details: {
        channel,
        targetType,
        filters: targetFilters,
      },
    });
  } catch (error) {
    console.error('Error estimating recipients:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to estimate recipients',
      count: 0,
    });
  }
});

/**
 * GET /api/campaigns/:id/recipients-analytics
 * Get campaign recipients with engagement analytics for retargeting
 */
router.get('/:id/recipients-analytics', async (req, res) => {
  try {
    const userId = req.user.id;
    const campaignId = req.params.id;
    const tenantId = req.tenant?.id;

    // Verify campaign belongs to user
    const campaign = await prisma.campaign.findFirst({
      where: {
        id: campaignId,
        userId,
        ...(tenantId && { tenantId })
      }
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    // Get recipients with click and conversion data
    const recipients = await prisma.campaignRecipient.findMany({
      where: {
        campaignId,
        ...(tenantId && { tenantId })
      },
      select: {
        id: true,
        recipientName: true,
        recipientEmail: true,
        recipientPhone: true,
        recipientType: true,
        clickedCount: true,
        lastClickedAt: true,
        firstClickedAt: true,
        status: true
      },
      orderBy: {
        clickedCount: 'desc'
      }
    });

    // Check for conversions (form submissions matching this campaign's UTM params)
    const conversions = await prisma.formSubmission.findMany({
      where: {
        tenantId: tenantId || campaign.tenantId,
        utmCampaign: campaign.utmCampaign,
        utmSource: campaign.utmSource,
        utmMedium: campaign.utmMedium,
        leadId: { not: null }
      },
      select: {
        email: true,
        phone: true
      }
    });

    // Create a set of converted emails/phones for quick lookup
    const convertedContacts = new Set([
      ...conversions.map(c => c.email).filter(Boolean),
      ...conversions.map(c => c.phone).filter(Boolean)
    ]);

    // Enrich recipients with conversion status
    const enrichedRecipients = recipients.map(recipient => ({
      ...recipient,
      hasConverted: convertedContacts.has(recipient.recipientEmail) ||
                    convertedContacts.has(recipient.recipientPhone)
    }));

    res.json({
      success: true,
      data: enrichedRecipients
    });
  } catch (error) {
    console.error('Error fetching recipients analytics:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch recipients analytics'
    });
  }
});

module.exports = router;
