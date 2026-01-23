/**
 * UTM Tagging and Link Tracking Service
 * Handles URL parsing, UTM parameter injection, link shortening, and click tracking
 *
 * @module services/utm
 */

const { URL } = require('url');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

class UtmService {
  /**
   * Build UTM parameters for a campaign
   * @param {Object} campaign - Campaign object
   * @param {String} platform - Platform: 'email' | 'whatsapp' | 'youtube' | 'social'
   * @param {Object} overrides - Manual UTM overrides
   * @param {Object} recipient - Optional recipient data for personalized tracking
   * @returns {Object} UTM parameters
   */
  buildUtmParameters(campaign, platform = 'email', overrides = {}, recipient = null) {
    // Start with campaign-level defaults
    const utmParams = {
      utm_source: campaign.utmSource || 'bharat_crm',
      utm_medium: campaign.utmMedium || platform,
      utm_campaign: campaign.utmCampaign || this.sanitizeCampaignName(campaign.name),
      utm_term: campaign.utmTerm || undefined,
      utm_content: campaign.utmContent || undefined
    };

    // Add recipient tracking for retargeting and ROI attribution
    if (recipient) {
      // Add recipient email/phone to utm_term for retargeting
      if (recipient.recipientEmail) {
        utmParams.utm_id = Buffer.from(recipient.recipientEmail).toString('base64').substring(0, 20);
        // Also add email hash for privacy-conscious tracking
        utmParams.utm_term = recipient.recipientEmail;
      } else if (recipient.recipientPhone) {
        utmParams.utm_id = Buffer.from(recipient.recipientPhone).toString('base64').substring(0, 20);
        utmParams.utm_term = recipient.recipientPhone;
      }

      // Enhance utm_content with recipient type and ID
      if (!overrides.utm_content) {
        utmParams.utm_content = `${platform}_${recipient.recipientType || 'contact'}_${recipient.id}`;
      }
    }

    // Apply platform-specific overrides from campaign config
    if (campaign.platformUtmConfig && campaign.platformUtmConfig[platform]) {
      Object.assign(utmParams, campaign.platformUtmConfig[platform]);
    }

    // Apply manual overrides
    Object.assign(utmParams, overrides);

    // Remove undefined values
    Object.keys(utmParams).forEach(key => {
      if (utmParams[key] === undefined || utmParams[key] === null) {
        delete utmParams[key];
      }
    });

    return utmParams;
  }

  /**
   * Sanitize campaign name for use in UTM parameters
   * @param {String} name - Campaign name
   * @returns {String} Sanitized name
   */
  sanitizeCampaignName(name) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  /**
   * Extract all URLs from content (HTML or plain text)
   * @param {String} content - Email HTML or WhatsApp text
   * @param {String} contentType - 'html' | 'text'
   * @returns {Array} Array of found URLs with metadata
   */
  extractUrls(content, contentType = 'html') {
    const urls = [];

    if (contentType === 'html') {
      // Extract from href attributes with anchor text
      const hrefRegex = /<a\s+(?:[^>]*?\s+)?href=["']([^"']+)["'][^>]*>([^<]*)<\/a>/gi;
      let match;
      while ((match = hrefRegex.exec(content)) !== null) {
        urls.push({
          url: match[1],
          text: match[2].trim(),
          type: 'link',
          position: this.detectLinkPosition(content, match.index)
        });
      }

      // Also extract standalone href attributes (for buttons, etc.)
      const standaloneHrefRegex = /href=["']([^"']+)["']/gi;
      while ((match = standaloneHrefRegex.exec(content)) !== null) {
        // Check if not already captured
        if (!urls.find(u => u.url === match[1])) {
          urls.push({
            url: match[1],
            text: '',
            type: 'link',
            position: this.detectLinkPosition(content, match.index)
          });
        }
      }
    } else {
      // Extract plain URLs from text (for WhatsApp)
      const urlRegex = /(https?:\/\/[^\s]+)/gi;
      let match;
      while ((match = urlRegex.exec(content)) !== null) {
        urls.push({
          url: match[1],
          text: '',
          type: 'link',
          position: 'body'
        });
      }
    }

    return urls;
  }

  /**
   * Detect link position in content (header, body, footer, cta)
   * @param {String} content - Full content
   * @param {Number} index - Position of link in content
   * @returns {String} Position identifier
   */
  detectLinkPosition(content, index) {
    const contentLength = content.length;
    const relativePosition = index / contentLength;

    // Simple heuristic based on position
    if (relativePosition < 0.2) return 'header';
    if (relativePosition > 0.8) return 'footer';

    // Check for CTA keywords nearby
    const surroundingText = content.substring(
      Math.max(0, index - 100),
      Math.min(contentLength, index + 100)
    ).toLowerCase();

    if (surroundingText.includes('click here') ||
        surroundingText.includes('shop now') ||
        surroundingText.includes('buy now') ||
        surroundingText.includes('get started') ||
        surroundingText.includes('sign up') ||
        surroundingText.includes('learn more')) {
      return 'cta';
    }

    return 'body';
  }

  /**
   * Add UTM parameters to a URL
   * @param {String} url - Original URL
   * @param {Object} utmParams - UTM parameters object
   * @returns {String} URL with UTM parameters
   */
  addUtmToUrl(url, utmParams) {
    try {
      // Validate input
      if (!url || typeof url !== 'string') {
        throw new Error('URL must be a non-empty string');
      }

      // Skip if already has UTM parameters (avoid double-tagging)
      if (url.includes('utm_source=') || url.includes('utm_medium=')) {
        console.log(`[UTM Service] Skipping already tagged URL: ${url}`);
        return url;
      }

      // Skip non-http URLs (mailto:, tel:, etc.)
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        console.log(`[UTM Service] Skipping non-HTTP URL: ${url}`);
        return url;
      }

      // Parse URL
      const urlObj = new URL(url);

      // Count how many UTM parameters will be added
      let addedCount = 0;

      // Add each UTM parameter to query string
      Object.keys(utmParams).forEach(key => {
        if (utmParams[key] && typeof utmParams[key] === 'string' && utmParams[key].trim()) {
          urlObj.searchParams.set(key, utmParams[key].trim());
          addedCount++;
        }
      });

      const finalUrl = urlObj.toString();

      if (addedCount === 0) {
        console.log(`[UTM Service] No UTM parameters added to URL: ${url}`);
      } else {
        console.log(`[UTM Service] Added ${addedCount} UTM parameters to URL`);
      }

      return finalUrl;
    } catch (error) {
      console.error('[UTM Service] Error adding UTM to URL:', {
        url,
        error: error.message,
        stack: error.stack
      });
      throw new Error(`Failed to add UTM parameters: ${error.message}`);
    }
  }

  /**
   * Generate unique short code for link
   * @returns {String} 8-character alphanumeric code
   */
  generateShortCode() {
    return crypto.randomBytes(4).toString('hex');
  }

  /**
   * Create tracking link record in database
   * @param {Object} params - Link creation parameters
   * @returns {Object} Created CampaignLink
   */
  async createTrackingLink(params) {
    const {
      tenantId,
      campaignId,
      originalUrl,
      taggedUrl,
      utmParams,
      platform,
      linkText = '',
      linkPosition = 'body',
      useShortLink = false
    } = params;

    // Check if link already exists for this campaign
    const existingLink = await prisma.campaignLink.findFirst({
      where: {
        tenantId,
        campaignId,
        originalUrl
      }
    });

    if (existingLink) {
      return existingLink;
    }

    const linkData = {
      tenantId,
      campaignId,
      originalUrl,
      taggedUrl,
      platform,
      linkText,
      linkPosition,
      utmSource: utmParams.utm_source,
      utmMedium: utmParams.utm_medium,
      utmCampaign: utmParams.utm_campaign,
      utmTerm: utmParams.utm_term,
      utmContent: utmParams.utm_content
    };

    // Generate short link if requested
    if (useShortLink) {
      let shortCode;
      let attempts = 0;
      const maxAttempts = 5;

      // Ensure unique short code
      while (attempts < maxAttempts) {
        shortCode = this.generateShortCode();
        const existing = await prisma.campaignLink.findUnique({
          where: { shortCode }
        });

        if (!existing) break;
        attempts++;
      }

      if (attempts >= maxAttempts) {
        throw new Error('Failed to generate unique short code');
      }

      const baseUrl = process.env.APP_URL || 'http://localhost:3000';
      linkData.shortCode = shortCode;
      linkData.shortUrl = `${baseUrl}/l/${shortCode}`;
    }

    return await prisma.campaignLink.create({
      data: linkData
    });
  }

  /**
   * Process campaign content and tag all links with UTM parameters
   * @param {Object} params - Processing parameters
   * @returns {Object} { processedContent, links }
   */
  async processContent(params) {
    const {
      tenantId,
      campaignId,
      content,
      contentType = 'html',
      platform = 'email',
      utmParams,
      useShortLinks = false,
      recipientId = null  // Add recipient tracking
    } = params;

    if (!content) {
      return { processedContent: '', links: [] };
    }

    let processedContent = content;
    const createdLinks = [];

    // Extract all URLs
    const extractedUrls = this.extractUrls(content, contentType);

    if (extractedUrls.length === 0) {
      return { processedContent, links: [] };
    }

    console.log(`Found ${extractedUrls.length} URLs to process in campaign ${campaignId}`);

    // Process each unique URL
    for (const urlInfo of extractedUrls) {
      const { url: originalUrl, text, position } = urlInfo;

      try {
        // Add UTM parameters
        const taggedUrl = this.addUtmToUrl(originalUrl, utmParams);

        // Create tracking link
        const link = await this.createTrackingLink({
          tenantId,
          campaignId,
          originalUrl,
          taggedUrl,
          utmParams,
          platform,
          linkText: text,
          linkPosition: position,
          useShortLink: useShortLinks
        });

        createdLinks.push(link);

        // Replace in content with recipient tracking
        let finalUrl = useShortLinks && link.shortUrl ? link.shortUrl : taggedUrl;

        // Add recipient tracking parameter for attribution
        if (recipientId && useShortLinks && link.shortUrl) {
          finalUrl = `${link.shortUrl}?r=${recipientId}`;
        }

        // Use a more precise replacement to avoid replacing partial matches
        const escapedOriginal = this.escapeRegExp(originalUrl);
        const regex = new RegExp(`(href=["'])${escapedOriginal}(["'])`, 'g');

        if (contentType === 'html') {
          processedContent = processedContent.replace(regex, `$1${finalUrl}$2`);
        } else {
          // For text content, replace the URL directly
          processedContent = processedContent.replace(
            new RegExp(escapedOriginal, 'g'),
            finalUrl
          );
        }
      } catch (error) {
        console.error(`Error processing URL ${originalUrl}:`, error.message);
        // Continue with other URLs even if one fails
      }
    }

    return {
      processedContent,
      links: createdLinks
    };
  }

  /**
   * Track a link click
   * @param {Object} params - Click tracking parameters
   * @returns {Object} Created CampaignClick
   */
  async trackClick(params) {
    const {
      tenantId,
      linkId,
      campaignId,
      recipientId = null,
      ipAddress,
      userAgent,
      referrer
    } = params;

    try {
      // Get link details
      const link = await prisma.campaignLink.findUnique({
        where: { id: linkId }
      });

      if (!link) {
        throw new Error('Link not found');
      }

      // Parse user agent for device/browser/OS
      const deviceInfo = this.parseUserAgent(userAgent);

      // Get recipient info if available
      let recipientEmail = null;
      let recipientPhone = null;
      let recipientType = null;

      if (recipientId) {
        const recipient = await prisma.campaignRecipient.findUnique({
          where: { id: recipientId }
        });

        if (recipient) {
          recipientEmail = recipient.recipientEmail;
          recipientPhone = recipient.recipientPhone;
          recipientType = recipient.recipientType;
        }
      }

      // Check if this is a unique click (first time from this IP address for this link)
      const existingClick = await prisma.campaignClick.findFirst({
        where: {
          linkId,
          ipAddress,
          tenantId
        }
      });

      const isUniqueClick = !existingClick;

      // Create click record
      const click = await prisma.campaignClick.create({
        data: {
          tenantId,
          campaignId,
          linkId,
          recipientId,
          recipientType,
          recipientEmail,
          recipientPhone,
          ipAddress,
          userAgent,
          referrer,
          device: deviceInfo.device,
          browser: deviceInfo.browser,
          os: deviceInfo.os,
          utmSource: link.utmSource,
          utmMedium: link.utmMedium,
          utmCampaign: link.utmCampaign,
          utmTerm: link.utmTerm,
          utmContent: link.utmContent
        }
      });

      // Update link statistics
      const updateData = {
        totalClicks: { increment: 1 },
        lastClickedAt: new Date()
      };

      // If this is a unique click, increment uniqueClicks counter
      if (isUniqueClick) {
        updateData.uniqueClicks = { increment: 1 };
      }

      await prisma.campaignLink.update({
        where: { id: linkId },
        data: updateData
      });

      // Update recipient statistics if applicable
      if (recipientId) {
        const recipient = await prisma.campaignRecipient.findUnique({
          where: { id: recipientId },
          select: { firstClickedAt: true }
        });

        const updateData = {
          clickedCount: { increment: 1 },
          lastClickedAt: new Date()
        };

        // Only set firstClickedAt if it's not already set
        if (!recipient.firstClickedAt) {
          updateData.firstClickedAt = new Date();
        }

        await prisma.campaignRecipient.update({
          where: { id: recipientId },
          data: updateData
        });
      }

      return click;
    } catch (error) {
      console.error('Error tracking click:', error);
      throw error;
    }
  }

  /**
   * Parse user agent string to extract device, browser, and OS info
   * @param {String} userAgent - User agent string
   * @returns {Object} { device, browser, os }
   */
  parseUserAgent(userAgent) {
    if (!userAgent) {
      return { device: 'unknown', browser: 'unknown', os: 'unknown' };
    }

    const ua = userAgent.toLowerCase();

    // Device detection
    let device = 'desktop';
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(userAgent)) {
      device = 'tablet';
    } else if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(userAgent)) {
      device = 'mobile';
    }

    // Browser detection
    let browser = 'unknown';
    if (ua.includes('edg/')) browser = 'edge';
    else if (ua.includes('chrome') && !ua.includes('edg')) browser = 'chrome';
    else if (ua.includes('firefox')) browser = 'firefox';
    else if (ua.includes('safari') && !ua.includes('chrome')) browser = 'safari';
    else if (ua.includes('opera') || ua.includes('opr/')) browser = 'opera';
    else if (ua.includes('msie') || ua.includes('trident')) browser = 'ie';

    // OS detection
    let os = 'unknown';
    if (ua.includes('windows nt 10')) os = 'windows_10';
    else if (ua.includes('windows nt 6.3')) os = 'windows_8.1';
    else if (ua.includes('windows nt 6.2')) os = 'windows_8';
    else if (ua.includes('windows nt 6.1')) os = 'windows_7';
    else if (ua.includes('windows')) os = 'windows';
    else if (ua.includes('mac os x')) os = 'macos';
    else if (ua.includes('linux')) os = 'linux';
    else if (ua.includes('android')) os = 'android';
    else if (ua.includes('ios') || ua.includes('iphone') || ua.includes('ipad')) os = 'ios';

    return { device, browser, os };
  }

  /**
   * Escape special regex characters
   * @param {String} string - String to escape
   * @returns {String} Escaped string
   */
  escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Get link analytics for a campaign
   * @param {String} tenantId - Tenant ID
   * @param {String} campaignId - Campaign ID
   * @returns {Object} Analytics data
   */
  async getLinkAnalytics(tenantId, campaignId) {
    const links = await prisma.campaignLink.findMany({
      where: {
        tenantId,
        campaignId
      },
      include: {
        clicks: {
          select: {
            ipAddress: true,
            device: true,
            browser: true,
            os: true,
            clickedAt: true,
            country: true,
            city: true
          }
        }
      },
      orderBy: { totalClicks: 'desc' }
    });

    const analytics = links.map(link => {
      const clicks = link.clicks || [];

      // Calculate unique clicks from actual click data (distinct IP addresses)
      const uniqueIPs = new Set(clicks.map(click => click.ipAddress).filter(Boolean));
      const calculatedUniqueClicks = uniqueIPs.size;

      return {
        linkId: link.id,
        originalUrl: link.originalUrl,
        taggedUrl: link.taggedUrl,
        shortUrl: link.shortUrl,
        platform: link.platform,
        linkText: link.linkText,
        linkPosition: link.linkPosition,
        totalClicks: link.totalClicks,
        uniqueClicks: calculatedUniqueClicks, // Use calculated value instead of stored value
        lastClickedAt: link.lastClickedAt,
        utmParams: {
          source: link.utmSource,
          medium: link.utmMedium,
          campaign: link.utmCampaign,
          term: link.utmTerm,
          content: link.utmContent
        },
        clicksByDevice: this.aggregateByField(clicks, 'device'),
        clicksByBrowser: this.aggregateByField(clicks, 'browser'),
        clicksByOS: this.aggregateByField(clicks, 'os'),
        clicksByLocation: this.aggregateLocation(clicks),
        clickTimeline: this.generateTimeline(clicks)
      };
    });

    return {
      links: analytics,
      summary: this.generateSummary(analytics)
    };
  }

  /**
   * Aggregate clicks by a specific field
   * @param {Array} clicks - Array of click objects
   * @param {String} field - Field name to aggregate by
   * @returns {Object} Aggregated counts
   */
  aggregateByField(clicks, field) {
    const counts = {};
    clicks.forEach(click => {
      const value = click[field] || 'unknown';
      counts[value] = (counts[value] || 0) + 1;
    });
    return counts;
  }

  /**
   * Aggregate clicks by location
   * @param {Array} clicks - Array of click objects
   * @returns {Object} Location aggregation
   */
  aggregateLocation(clicks) {
    const locations = {};
    clicks.forEach(click => {
      if (click.country) {
        const key = click.city ? `${click.city}, ${click.country}` : click.country;
        locations[key] = (locations[key] || 0) + 1;
      }
    });
    return locations;
  }

  /**
   * Generate click timeline (hourly buckets)
   * @param {Array} clicks - Array of click objects
   * @returns {Object} Timeline data
   */
  generateTimeline(clicks) {
    const timeline = {};
    clicks.forEach(click => {
      const hour = new Date(click.clickedAt).toISOString().slice(0, 13) + ':00:00';
      timeline[hour] = (timeline[hour] || 0) + 1;
    });
    return timeline;
  }

  /**
   * Generate summary statistics
   * @param {Array} analytics - Analytics array
   * @returns {Object} Summary statistics
   */
  generateSummary(analytics) {
    const totalLinks = analytics.length;
    const totalClicks = analytics.reduce((sum, link) => sum + link.totalClicks, 0);
    const totalUniqueClicks = analytics.reduce((sum, link) => sum + link.uniqueClicks, 0);

    const topLink = analytics.length > 0 ? analytics[0] : null;

    return {
      totalLinks,
      totalClicks,
      totalUniqueClicks,
      averageClicksPerLink: totalLinks > 0 ? (totalClicks / totalLinks).toFixed(2) : 0,
      topPerformingLink: topLink ? {
        url: topLink.originalUrl,
        clicks: topLink.totalClicks
      } : null
    };
  }
}

module.exports = new UtmService();
