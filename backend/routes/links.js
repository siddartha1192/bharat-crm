/**
 * Link Redirect and Click Tracking Routes
 * Handles short link redirects, click analytics, and UTM template management
 *
 * @module routes/links
 */

const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const utmService = require('../services/utm');
const { authenticate } = require('../middleware/auth');
const { tenantContext } = require('../middleware/tenant');

/**
 * PUBLIC ROUTE: Redirect short link and track click
 * GET /l/:shortCode
 *
 * This endpoint is public (no auth required) to allow link clicks from emails/WhatsApp
 */
router.get('/l/:shortCode', async (req, res) => {
  try {
    const { shortCode } = req.params;

    console.log(`[Link Redirect] Short code: ${shortCode}`);

    // Find link by short code
    const link = await prisma.campaignLink.findUnique({
      where: { shortCode },
      include: {
        campaign: {
          select: { id: true, name: true, tenantId: true }
        }
      }
    });

    if (!link) {
      console.log(`[Link Redirect] Link not found for code: ${shortCode}`);
      return res.status(404).send('Link not found');
    }

    // Extract tracking information
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];
    const referrer = req.headers['referer'] || req.headers['referrer'];

    console.log(`[Link Redirect] Tracking click for link ${link.id}, IP: ${ipAddress}`);

    // Track click asynchronously (fire and forget - don't block redirect)
    utmService.trackClick({
      tenantId: link.tenantId,
      linkId: link.id,
      campaignId: link.campaignId,
      recipientId: null, // Can be enhanced with recipient tracking via URL param
      ipAddress,
      userAgent,
      referrer
    }).catch(err => {
      console.error('[Link Redirect] Click tracking error:', err.message);
    });

    // Redirect to tagged URL
    console.log(`[Link Redirect] Redirecting to: ${link.taggedUrl}`);
    return res.redirect(302, link.taggedUrl);
  } catch (error) {
    console.error('[Link Redirect] Error:', error);
    return res.status(500).send('Internal server error');
  }
});

/**
 * Get link analytics for a specific campaign
 * GET /api/links/analytics/:campaignId
 * Requires authentication and tenant context
 */
router.get('/api/links/analytics/:campaignId', authenticate, tenantContext, async (req, res) => {
  try {
    const { campaignId } = req.params;
    const tenantId = req.tenant.id;

    console.log(`[Analytics] Fetching analytics for campaign ${campaignId}, tenant ${tenantId}`);

    // Verify campaign belongs to tenant
    const campaign = await prisma.campaign.findFirst({
      where: {
        id: campaignId,
        tenantId
      }
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    // Get analytics
    const analytics = await utmService.getLinkAnalytics(tenantId, campaignId);

    return res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('[Analytics] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get detailed click data for a specific link
 * GET /api/links/:linkId/clicks
 */
router.get('/api/links/:linkId/clicks', authenticate, tenantContext, async (req, res) => {
  try {
    const { linkId } = req.params;
    const tenantId = req.tenant.id;
    const { limit = 100, offset = 0 } = req.query;

    // Verify link belongs to tenant
    const link = await prisma.campaignLink.findFirst({
      where: {
        id: linkId,
        tenantId
      }
    });

    if (!link) {
      return res.status(404).json({
        success: false,
        error: 'Link not found'
      });
    }

    // Get clicks
    const clicks = await prisma.campaignClick.findMany({
      where: {
        linkId,
        tenantId
      },
      include: {
        recipient: {
          select: {
            recipientName: true,
            recipientEmail: true,
            recipientPhone: true
          }
        }
      },
      orderBy: { clickedAt: 'desc' },
      take: parseInt(limit),
      skip: parseInt(offset)
    });

    const totalClicks = await prisma.campaignClick.count({
      where: { linkId, tenantId }
    });

    return res.json({
      success: true,
      data: {
        clicks,
        pagination: {
          total: totalClicks,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: (parseInt(offset) + clicks.length) < totalClicks
        }
      }
    });
  } catch (error) {
    console.error('[Link Clicks] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get all campaigns with link tracking
 * GET /api/links/campaigns
 */
router.get('/api/links/campaigns', authenticate, tenantContext, async (req, res) => {
  try {
    const tenantId = req.tenant.id;

    const campaigns = await prisma.campaign.findMany({
      where: {
        tenantId,
        trackClicks: true
      },
      select: {
        id: true,
        name: true,
        channel: true,
        status: true,
        createdAt: true,
        _count: {
          select: {
            links: true,
            clicks: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.json({
      success: true,
      data: campaigns
    });
  } catch (error) {
    console.error('[Campaigns with Tracking] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get complete conversion funnel for a campaign
 * GET /api/links/conversion-funnel/:campaignId
 */
router.get('/api/links/conversion-funnel/:campaignId', authenticate, tenantContext, async (req, res) => {
  try {
    const { campaignId } = req.params;
    const tenantId = req.tenant.id;

    // Get campaign details
    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, tenantId }
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    // Get click statistics
    const clicks = await prisma.campaignClick.count({
      where: { campaignId, tenantId }
    });

    const uniqueClicks = await prisma.campaignClick.groupBy({
      by: ['ipAddress'],
      where: { campaignId, tenantId },
      _count: true
    });

    // Get form submissions that match this campaign's UTM parameters
    const formSubmissions = await prisma.formSubmission.findMany({
      where: {
        tenantId,
        utmCampaign: campaign.utmCampaign,
        utmSource: campaign.utmSource,
        utmMedium: campaign.utmMedium
      },
      include: {
        lead: {
          select: {
            id: true,
            name: true,
            email: true,
            status: true,
            priority: true,
            createdAt: true
          }
        }
      }
    });

    // Count leads created from this campaign
    const leadsCreated = formSubmissions.filter(fs => fs.leadId).length;

    // Calculate conversion metrics
    const ctr = campaign.totalRecipients > 0
      ? ((clicks / campaign.totalRecipients) * 100).toFixed(2)
      : 0;

    const formConversionRate = clicks > 0
      ? ((formSubmissions.length / clicks) * 100).toFixed(2)
      : 0;

    const overallLeadConversion = campaign.totalRecipients > 0
      ? ((leadsCreated / campaign.totalRecipients) * 100).toFixed(2)
      : 0;

    // Get recent conversions (last 10)
    const recentConversions = formSubmissions
      .filter(fs => fs.leadId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 10)
      .map(fs => ({
        submittedAt: fs.createdAt,
        name: fs.name,
        email: fs.email,
        leadId: fs.leadId,
        leadStatus: fs.lead?.status,
        leadPriority: fs.lead?.priority
      }));

    return res.json({
      success: true,
      data: {
        campaign: {
          id: campaign.id,
          name: campaign.name,
          channel: campaign.channel,
          utmCampaign: campaign.utmCampaign
        },
        funnel: {
          sent: campaign.totalRecipients,
          delivered: campaign.sentCount,
          clicks: clicks,
          uniqueClicks: uniqueClicks.length,
          formSubmissions: formSubmissions.length,
          leadsCreated: leadsCreated
        },
        metrics: {
          ctr: parseFloat(ctr),
          formConversionRate: parseFloat(formConversionRate),
          overallLeadConversion: parseFloat(overallLeadConversion)
        },
        recentConversions
      }
    });
  } catch (error) {
    console.error('[Conversion Funnel] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * UTM TEMPLATE MANAGEMENT
 */

/**
 * Get all UTM templates for tenant
 * GET /api/utm-templates
 */
router.get('/api/utm-templates', authenticate, tenantContext, async (req, res) => {
  try {
    const tenantId = req.tenant.id;
    const { platform } = req.query;

    const where = { tenantId, isActive: true };
    if (platform) {
      where.platform = platform;
    }

    const templates = await prisma.utmTemplate.findMany({
      where,
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    return res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    console.error('[UTM Templates] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Create new UTM template
 * POST /api/utm-templates
 */
router.post('/api/utm-templates', authenticate, tenantContext, async (req, res) => {
  try {
    const tenantId = req.tenant.id;
    const {
      name,
      description,
      utmSource,
      utmMedium,
      utmCampaign,
      utmTerm,
      utmContent,
      platform,
      isDefault
    } = req.body;

    // Validation
    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Template name is required'
      });
    }

    // If setting as default, unset other defaults for the same platform
    if (isDefault) {
      await prisma.utmTemplate.updateMany({
        where: {
          tenantId,
          platform: platform || null,
          isDefault: true
        },
        data: {
          isDefault: false
        }
      });
    }

    const template = await prisma.utmTemplate.create({
      data: {
        tenantId,
        name,
        description,
        utmSource,
        utmMedium,
        utmCampaign,
        utmTerm,
        utmContent,
        platform,
        isDefault: isDefault || false
      }
    });

    return res.status(201).json({
      success: true,
      data: template
    });
  } catch (error) {
    console.error('[Create UTM Template] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Update UTM template
 * PUT /api/utm-templates/:id
 */
router.put('/api/utm-templates/:id', authenticate, tenantContext, async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenant.id;
    const {
      name,
      description,
      utmSource,
      utmMedium,
      utmCampaign,
      utmTerm,
      utmContent,
      platform,
      isDefault,
      isActive
    } = req.body;

    // Verify template belongs to tenant
    const existing = await prisma.utmTemplate.findFirst({
      where: { id, tenantId }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    // If setting as default, unset other defaults for the same platform
    if (isDefault && !existing.isDefault) {
      await prisma.utmTemplate.updateMany({
        where: {
          tenantId,
          platform: platform || existing.platform || null,
          isDefault: true,
          id: { not: id }
        },
        data: {
          isDefault: false
        }
      });
    }

    const template = await prisma.utmTemplate.update({
      where: { id },
      data: {
        name,
        description,
        utmSource,
        utmMedium,
        utmCampaign,
        utmTerm,
        utmContent,
        platform,
        isDefault,
        isActive
      }
    });

    return res.json({
      success: true,
      data: template
    });
  } catch (error) {
    console.error('[Update UTM Template] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Delete UTM template
 * DELETE /api/utm-templates/:id
 */
router.delete('/api/utm-templates/:id', authenticate, tenantContext, async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenant.id;

    // Verify template belongs to tenant
    const existing = await prisma.utmTemplate.findFirst({
      where: { id, tenantId }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    await prisma.utmTemplate.delete({
      where: { id }
    });

    return res.json({
      success: true,
      message: 'Template deleted successfully'
    });
  } catch (error) {
    console.error('[Delete UTM Template] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Generate UTM-tagged URL (utility endpoint)
 * POST /api/utm/generate
 */
router.post('/api/utm/generate', authenticate, tenantContext, async (req, res) => {
  try {
    const {
      url,
      utmSource,
      utmMedium,
      utmCampaign,
      utmTerm,
      utmContent
    } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL is required'
      });
    }

    const utmParams = {};
    if (utmSource) utmParams.utm_source = utmSource;
    if (utmMedium) utmParams.utm_medium = utmMedium;
    if (utmCampaign) utmParams.utm_campaign = utmCampaign;
    if (utmTerm) utmParams.utm_term = utmTerm;
    if (utmContent) utmParams.utm_content = utmContent;

    const taggedUrl = utmService.addUtmToUrl(url, utmParams);

    return res.json({
      success: true,
      data: {
        originalUrl: url,
        taggedUrl,
        utmParams
      }
    });
  } catch (error) {
    console.error('[Generate UTM URL] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Create manual short link with tracking (for YouTube, social media, etc.)
 * POST /api/links/create-short-link
 */
router.post('/api/links/create-short-link', authenticate, tenantContext, async (req, res) => {
  try {
    const tenantId = req.tenant.id;
    const {
      url,
      utmSource,
      utmMedium,
      utmCampaign,
      utmTerm,
      utmContent,
      name
    } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL is required'
      });
    }

    // Build UTM parameters
    const utmParams = {};
    if (utmSource) utmParams.utm_source = utmSource;
    if (utmMedium) utmParams.utm_medium = utmMedium;
    if (utmCampaign) utmParams.utm_campaign = utmCampaign;
    if (utmTerm) utmParams.utm_term = utmTerm;
    if (utmContent) utmParams.utm_content = utmContent;

    // Add UTM to URL
    const taggedUrl = utmService.addUtmToUrl(url, utmParams);

    // Generate short code
    const shortCode = utmService.generateShortCode();
    const baseUrl = process.env.APP_URL || 'http://localhost:3000';
    const shortUrl = `${baseUrl}/l/${shortCode}`;

    // Create link record (no campaign association)
    const link = await prisma.campaignLink.create({
      data: {
        tenantId,
        campaignId: null, // Manual link, not tied to campaign
        originalUrl: url,
        taggedUrl,
        shortCode,
        shortUrl,
        platform: utmMedium || 'manual',
        linkText: name || null,
        utmSource,
        utmMedium,
        utmCampaign,
        utmTerm,
        utmContent
      }
    });

    return res.status(201).json({
      success: true,
      data: {
        id: link.id,
        originalUrl: url,
        taggedUrl,
        shortCode,
        shortUrl,
        utmParams
      }
    });
  } catch (error) {
    console.error('[Create Short Link] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get all manual short links for tenant
 * GET /api/links/manual
 */
router.get('/api/links/manual', authenticate, tenantContext, async (req, res) => {
  try {
    const tenantId = req.tenant.id;

    const links = await prisma.campaignLink.findMany({
      where: {
        tenantId,
        campaignId: null // Manual links only
      },
      select: {
        id: true,
        originalUrl: true,
        taggedUrl: true,
        shortCode: true,
        shortUrl: true,
        platform: true,
        linkText: true,
        utmSource: true,
        utmMedium: true,
        utmCampaign: true,
        totalClicks: true,
        uniqueClicks: true,
        lastClickedAt: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.json({
      success: true,
      data: links
    });
  } catch (error) {
    console.error('[Manual Links] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get analytics for manual links (by UTM campaign)
 * GET /api/links/manual-analytics?utmCampaign=xxx
 */
router.get('/api/links/manual-analytics', authenticate, tenantContext, async (req, res) => {
  try {
    const tenantId = req.tenant.id;
    const { utmCampaign, utmSource, utmMedium } = req.query;

    if (!utmCampaign) {
      return res.status(400).json({
        success: false,
        error: 'utmCampaign parameter is required'
      });
    }

    // Get all manual links matching UTM campaign
    const links = await prisma.campaignLink.findMany({
      where: {
        tenantId,
        campaignId: null,
        utmCampaign,
        ...(utmSource && { utmSource }),
        ...(utmMedium && { utmMedium })
      },
      include: {
        clicks: {
          select: {
            device: true,
            browser: true,
            os: true,
            clickedAt: true
          }
        }
      }
    });

    // Get form submissions
    const formSubmissions = await prisma.formSubmission.findMany({
      where: {
        tenantId,
        utmCampaign,
        ...(utmSource && { utmSource }),
        ...(utmMedium && { utmMedium })
      },
      include: {
        lead: {
          select: {
            id: true,
            name: true,
            email: true,
            status: true
          }
        }
      }
    });

    const totalClicks = links.reduce((sum, link) => sum + link.totalClicks, 0);
    const leadsCreated = formSubmissions.filter(fs => fs.leadId).length;

    return res.json({
      success: true,
      data: {
        utmCampaign,
        links,
        clicks: totalClicks,
        formSubmissions: formSubmissions.length,
        leadsCreated,
        conversionRate: totalClicks > 0
          ? ((formSubmissions.length / totalClicks) * 100).toFixed(2)
          : 0,
        recentConversions: formSubmissions
          .filter(fs => fs.leadId)
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 10)
      }
    });
  } catch (error) {
    console.error('[Manual Analytics] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
