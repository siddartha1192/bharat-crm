/**
 * UTM Service Unit Tests
 * Tests for URL parsing, UTM parameter injection, and click tracking
 */

const utmService = require('../services/utm');

describe('UTM Service', () => {
  describe('buildUtmParameters', () => {
    test('should build default UTM parameters', () => {
      const campaign = {
        name: 'Spring Sale 2026',
        channel: 'email',
        utmSource: null,
        utmMedium: null,
        utmCampaign: null
      };

      const params = utmService.buildUtmParameters(campaign, 'email');

      expect(params.utm_source).toBe('bharat_crm');
      expect(params.utm_medium).toBe('email');
      expect(params.utm_campaign).toBe('spring_sale_2026');
    });

    test('should use campaign-level UTM parameters', () => {
      const campaign = {
        name: 'Spring Sale',
        channel: 'email',
        utmSource: 'custom_source',
        utmMedium: 'custom_medium',
        utmCampaign: 'custom_campaign',
        utmTerm: 'test_term',
        utmContent: 'test_content'
      };

      const params = utmService.buildUtmParameters(campaign);

      expect(params.utm_source).toBe('custom_source');
      expect(params.utm_medium).toBe('custom_medium');
      expect(params.utm_campaign).toBe('custom_campaign');
      expect(params.utm_term).toBe('test_term');
      expect(params.utm_content).toBe('test_content');
    });

    test('should apply platform-specific overrides', () => {
      const campaign = {
        name: 'Test Campaign',
        channel: 'email',
        utmSource: 'default_source',
        utmMedium: 'default_medium',
        platformUtmConfig: {
          whatsapp: {
            utm_source: 'whatsapp_source',
            utm_medium: 'whatsapp_broadcast'
          }
        }
      };

      const params = utmService.buildUtmParameters(campaign, 'whatsapp');

      expect(params.utm_source).toBe('whatsapp_source');
      expect(params.utm_medium).toBe('whatsapp_broadcast');
    });

    test('should apply manual overrides', () => {
      const campaign = {
        name: 'Test',
        channel: 'email',
        utmSource: 'campaign_source'
      };

      const params = utmService.buildUtmParameters(campaign, 'email', {
        utm_source: 'override_source',
        utm_content: 'manual_content'
      });

      expect(params.utm_source).toBe('override_source');
      expect(params.utm_content).toBe('manual_content');
    });
  });

  describe('sanitizeCampaignName', () => {
    test('should convert to lowercase and replace spaces', () => {
      const result = utmService.sanitizeCampaignName('Spring Sale 2026');
      expect(result).toBe('spring_sale_2026');
    });

    test('should remove special characters', () => {
      const result = utmService.sanitizeCampaignName('Test@Campaign#123!');
      expect(result).toBe('test_campaign_123');
    });

    test('should remove leading and trailing underscores', () => {
      const result = utmService.sanitizeCampaignName('  Test Campaign  ');
      expect(result).toBe('test_campaign');
    });
  });

  describe('extractUrls', () => {
    test('should extract URLs from HTML content', () => {
      const html = '<a href="https://example.com">Click here</a>';
      const urls = utmService.extractUrls(html, 'html');

      expect(urls).toHaveLength(1);
      expect(urls[0].url).toBe('https://example.com');
      expect(urls[0].text).toBe('Click here');
    });

    test('should extract multiple URLs from HTML', () => {
      const html = `
        <a href="https://example.com/page1">Link 1</a>
        <a href="https://example.com/page2">Link 2</a>
      `;
      const urls = utmService.extractUrls(html, 'html');

      expect(urls.length).toBeGreaterThanOrEqual(2);
      expect(urls.map(u => u.url)).toContain('https://example.com/page1');
      expect(urls.map(u => u.url)).toContain('https://example.com/page2');
    });

    test('should extract URLs from plain text', () => {
      const text = 'Check out https://example.com and visit https://test.com';
      const urls = utmService.extractUrls(text, 'text');

      expect(urls.length).toBeGreaterThanOrEqual(2);
      expect(urls.map(u => u.url)).toContain('https://example.com');
      expect(urls.map(u => u.url)).toContain('https://test.com');
    });

    test('should return empty array for content without URLs', () => {
      const text = 'This is plain text without any links';
      const urls = utmService.extractUrls(text, 'text');

      expect(urls).toHaveLength(0);
    });
  });

  describe('addUtmToUrl', () => {
    test('should add UTM parameters to URL', () => {
      const url = 'https://example.com/page';
      const utmParams = {
        utm_source: 'test',
        utm_medium: 'email',
        utm_campaign: 'campaign'
      };

      const result = utmService.addUtmToUrl(url, utmParams);

      expect(result).toContain('utm_source=test');
      expect(result).toContain('utm_medium=email');
      expect(result).toContain('utm_campaign=campaign');
    });

    test('should preserve existing query parameters', () => {
      const url = 'https://example.com/page?existing=param';
      const utmParams = {
        utm_source: 'test'
      };

      const result = utmService.addUtmToUrl(url, utmParams);

      expect(result).toContain('existing=param');
      expect(result).toContain('utm_source=test');
    });

    test('should skip URLs that already have UTM parameters', () => {
      const url = 'https://example.com/page?utm_source=existing';
      const utmParams = {
        utm_source: 'new'
      };

      const result = utmService.addUtmToUrl(url, utmParams);

      // Should return original URL unchanged
      expect(result).toBe(url);
    });

    test('should handle invalid URLs gracefully', () => {
      const url = 'not-a-valid-url';
      const utmParams = {
        utm_source: 'test'
      };

      const result = utmService.addUtmToUrl(url, utmParams);

      // Should return original string
      expect(result).toBe(url);
    });

    test('should skip non-HTTP URLs', () => {
      const url = 'mailto:test@example.com';
      const utmParams = {
        utm_source: 'test'
      };

      const result = utmService.addUtmToUrl(url, utmParams);

      // Should return original URL unchanged
      expect(result).toBe(url);
    });
  });

  describe('parseUserAgent', () => {
    test('should detect mobile devices', () => {
      const ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)';
      const result = utmService.parseUserAgent(ua);

      expect(result.device).toBe('mobile');
      expect(result.os).toBe('ios');
    });

    test('should detect desktop devices', () => {
      const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)';
      const result = utmService.parseUserAgent(ua);

      expect(result.device).toBe('desktop');
      expect(result.os).toContain('windows');
    });

    test('should detect Chrome browser', () => {
      const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
      const result = utmService.parseUserAgent(ua);

      expect(result.browser).toBe('chrome');
    });

    test('should detect Firefox browser', () => {
      const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0';
      const result = utmService.parseUserAgent(ua);

      expect(result.browser).toBe('firefox');
    });

    test('should detect Safari browser', () => {
      const ua = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15';
      const result = utmService.parseUserAgent(ua);

      expect(result.browser).toBe('safari');
    });

    test('should detect Android OS', () => {
      const ua = 'Mozilla/5.0 (Linux; Android 11; SM-G998B) AppleWebKit/537.36';
      const result = utmService.parseUserAgent(ua);

      expect(result.os).toBe('android');
    });

    test('should handle null user agent', () => {
      const result = utmService.parseUserAgent(null);

      expect(result.device).toBe('unknown');
      expect(result.browser).toBe('unknown');
      expect(result.os).toBe('unknown');
    });
  });

  describe('generateShortCode', () => {
    test('should generate 8-character code', () => {
      const code = utmService.generateShortCode();

      expect(code).toHaveLength(8);
      expect(/^[a-f0-9]{8}$/.test(code)).toBe(true);
    });

    test('should generate unique codes', () => {
      const codes = new Set();
      for (let i = 0; i < 100; i++) {
        codes.add(utmService.generateShortCode());
      }

      // All codes should be unique
      expect(codes.size).toBe(100);
    });
  });

  describe('isSystemShortLink', () => {
    test('should detect system short links', () => {
      const shortLink = 'http://localhost:3000/l/abc12345';
      const result = utmService.isSystemShortLink(shortLink);

      expect(result).toBe(true);
    });

    test('should detect short links with custom base URL', () => {
      process.env.APP_URL = 'https://myapp.com';
      const shortLink = 'https://myapp.com/l/xyz67890';
      const result = utmService.isSystemShortLink(shortLink);

      expect(result).toBe(true);
      delete process.env.APP_URL;
    });

    test('should not detect regular URLs as short links', () => {
      const regularUrl = 'https://example.com/page';
      const result = utmService.isSystemShortLink(regularUrl);

      expect(result).toBe(false);
    });

    test('should not detect other short link services', () => {
      const otherShortLink = 'https://bit.ly/abc123';
      const result = utmService.isSystemShortLink(otherShortLink);

      expect(result).toBe(false);
    });
  });

  describe('aggregateByField', () => {
    test('should aggregate clicks by device', () => {
      const clicks = [
        { device: 'mobile' },
        { device: 'mobile' },
        { device: 'desktop' },
        { device: 'tablet' }
      ];

      const result = utmService.aggregateByField(clicks, 'device');

      expect(result).toEqual({
        mobile: 2,
        desktop: 1,
        tablet: 1
      });
    });

    test('should handle unknown values', () => {
      const clicks = [
        { device: 'mobile' },
        { device: null },
        { device: undefined }
      ];

      const result = utmService.aggregateByField(clicks, 'device');

      expect(result.mobile).toBe(1);
      expect(result.unknown).toBe(2);
    });
  });

  describe('generateTimeline', () => {
    test('should group clicks by hour', () => {
      const clicks = [
        { clickedAt: '2026-01-23T10:15:00Z' },
        { clickedAt: '2026-01-23T10:45:00Z' },
        { clickedAt: '2026-01-23T11:30:00Z' }
      ];

      const result = utmService.generateTimeline(clicks);

      expect(result['2026-01-23T10:00:00']).toBe(2);
      expect(result['2026-01-23T11:00:00']).toBe(1);
    });
  });

  describe('escapeRegExp', () => {
    test('should escape special regex characters', () => {
      const input = 'https://example.com/page?param=value';
      const result = utmService.escapeRegExp(input);

      expect(result).toBe('https://example\\.com/page\\?param=value');
    });

    test('should escape all special characters', () => {
      const input = '.*+?^${}()|[]\\';
      const result = utmService.escapeRegExp(input);

      expect(result).toBe('\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\');
    });
  });
});

// Integration test for processContent (mocked Prisma)
describe('UTM Service Integration', () => {
  test('should process HTML content with UTM tagging', async () => {
    const html = '<a href="https://example.com">Click here</a>';
    const utmParams = {
      utm_source: 'test',
      utm_medium: 'email',
      utm_campaign: 'test_campaign'
    };

    // Mock Prisma to avoid database calls
    const mockPrisma = {
      campaignLink: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({
          id: 'link-123',
          originalUrl: 'https://example.com',
          taggedUrl: 'https://example.com?utm_source=test&utm_medium=email&utm_campaign=test_campaign',
          shortCode: null,
          shortUrl: null
        })
      }
    };

    // Temporarily replace prisma
    const originalPrisma = require('../lib/prisma');
    jest.mock('../lib/prisma', () => mockPrisma);

    const result = await utmService.processContent({
      tenantId: 'tenant-123',
      campaignId: 'campaign-123',
      content: html,
      contentType: 'html',
      platform: 'email',
      utmParams,
      useShortLinks: false
    });

    expect(result.processedContent).toContain('utm_source=test');
    expect(result.processedContent).toContain('utm_medium=email');
    expect(result.processedContent).toContain('utm_campaign=test_campaign');
  });
});

console.log('✅ UTM Service tests completed');
