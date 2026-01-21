/**
 * Web Search Service - DuckDuckGo Integration
 * Provides web search capabilities for the AI Assistant
 * Enterprise-grade implementation with robust error handling
 */

const axios = require('axios');

class WebSearchService {
  constructor() {
    this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    this.timeout = 15000; // 15 seconds
    this.maxRetries = 2;
  }

  /**
   * Search DuckDuckGo with improved reliability
   * @param {string} query - Search query
   * @param {number} maxResults - Maximum number of results (default: 5)
   * @returns {Promise<Array>} - Array of search results
   */
  async searchDuckDuckGo(query, maxResults = 5) {
    console.log(`🔍 Web Search: "${query}" (max: ${maxResults} results)`);

    try {
      // Try primary HTML search first (more reliable than Instant Answer API)
      const results = await this.searchDuckDuckGoHTML(query, maxResults);

      if (results && results.length > 0 && results[0].source !== 'Error') {
        console.log(`✅ Web Search Success: ${results.length} results found`);
        return results;
      }

      // Fallback to Instant Answer API
      console.log(`⚠️  HTML search returned no results, trying Instant Answer API...`);
      return await this.searchInstantAnswer(query, maxResults);

    } catch (error) {
      console.error('❌ Web Search Error:', error.message);
      return this.createErrorResponse(error);
    }
  }

  /**
   * Search using DuckDuckGo HTML (more reliable for general queries)
   * @param {string} query - Search query
   * @param {number} maxResults - Maximum number of results
   * @returns {Promise<Array>} - Array of search results
   */
  async searchDuckDuckGoHTML(query, maxResults = 5) {
    let lastError = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`  🌐 Attempt ${attempt}/${this.maxRetries}: HTML Search`);

        const response = await axios.post('https://html.duckduckgo.com/html/',
          `q=${encodeURIComponent(query)}&s=0&kl=us-en`,
          {
            headers: {
              'User-Agent': this.userAgent,
              'Content-Type': 'application/x-www-form-urlencoded',
              'Accept': 'text/html',
              'Accept-Language': 'en-US,en;q=0.9',
              'Referer': 'https://duckduckgo.com/',
            },
            timeout: this.timeout,
          }
        );

        if (!response.data || response.data.length < 100) {
          throw new Error('Empty or invalid response from DuckDuckGo');
        }

        const results = this.parseHTMLResults(response.data, maxResults);

        if (results && results.length > 0) {
          console.log(`  ✓ Found ${results.length} results`);
          return results;
        }

        console.log(`  ⚠️  No results found in HTML response`);

        if (attempt < this.maxRetries) {
          await this.sleep(1000 * attempt); // Exponential backoff
        }

      } catch (error) {
        lastError = error;
        console.log(`  ✗ Attempt ${attempt} failed: ${error.message}`);

        if (attempt < this.maxRetries) {
          await this.sleep(1000 * attempt);
        }
      }
    }

    // All retries failed
    throw lastError || new Error('Failed to fetch search results');
  }

  /**
   * Fallback: Search using DuckDuckGo Instant Answer API
   * @param {string} query - Search query
   * @param {number} maxResults - Maximum number of results
   * @returns {Promise<Array>} - Array of search results
   */
  async searchInstantAnswer(query, maxResults = 5) {
    try {
      console.log(`  🔷 Instant Answer API Search`);

      const response = await axios.get('https://api.duckduckgo.com/', {
        params: {
          q: query,
          format: 'json',
          no_html: 1,
          skip_disambig: 1,
        },
        headers: {
          'User-Agent': this.userAgent,
        },
        timeout: this.timeout,
      });

      if (!response.data) {
        throw new Error('Empty response from Instant Answer API');
      }

      const data = response.data;
      const results = [];

      // Add abstract if available
      if (data.Abstract && data.Abstract.length > 0) {
        results.push({
          title: data.Heading || 'Information',
          snippet: data.Abstract,
          url: data.AbstractURL || '',
          source: data.AbstractSource || 'DuckDuckGo',
        });
      }

      // Add related topics
      if (data.RelatedTopics && Array.isArray(data.RelatedTopics)) {
        for (const topic of data.RelatedTopics) {
          if (results.length >= maxResults) break;

          // Handle nested topics
          if (topic.Topics && Array.isArray(topic.Topics)) {
            for (const subTopic of topic.Topics) {
              if (results.length >= maxResults) break;
              if (subTopic.Text && subTopic.FirstURL) {
                results.push({
                  title: subTopic.Text.split(' - ')[0] || 'Information',
                  snippet: subTopic.Text,
                  url: subTopic.FirstURL,
                  source: 'DuckDuckGo',
                });
              }
            }
          } else if (topic.Text && topic.FirstURL) {
            results.push({
              title: topic.Text.split(' - ')[0] || 'Information',
              snippet: topic.Text,
              url: topic.FirstURL,
              source: 'DuckDuckGo',
            });
          }
        }
      }

      console.log(`  ✓ Instant Answer API: ${results.length} results`);
      return results.slice(0, maxResults);

    } catch (error) {
      console.error('  ✗ Instant Answer API failed:', error.message);
      throw error;
    }
  }

  /**
   * Parse HTML search results with improved regex
   * @param {string} html - HTML content
   * @param {number} maxResults - Maximum number of results
   * @returns {Array} - Parsed search results
   */
  parseHTMLResults(html, maxResults = 5) {
    const results = [];

    try {
      // Multiple parsing strategies for robustness

      // Strategy 1: Extract result containers
      const resultDivRegex = /<div class="result[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi;
      const resultMatches = html.match(resultDivRegex) || [];

      for (const resultHtml of resultMatches) {
        if (results.length >= maxResults) break;

        try {
          // Extract title and URL
          const titleMatch = resultHtml.match(/<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([^<]+)</i);

          // Extract snippet - try multiple patterns
          let snippetMatch = resultHtml.match(/<a[^>]+class="result__snippet"[^>]*>([^<]+)</i);
          if (!snippetMatch) {
            snippetMatch = resultHtml.match(/class="result__snippet[^"]*"[^>]*>([^<]+)/i);
          }

          if (titleMatch) {
            const url = this.decodeHtmlEntities(titleMatch[1]);
            const title = this.decodeHtmlEntities(titleMatch[2]);
            const snippet = snippetMatch ? this.decodeHtmlEntities(snippetMatch[1]) : title;

            // Filter out invalid results
            if (url && url.length > 10 && title && title.length > 2) {
              results.push({
                title: title.trim(),
                snippet: snippet.trim(),
                url: url,
                source: this.extractDomain(url),
              });
            }
          }
        } catch (e) {
          console.log(`    ⚠️  Failed to parse individual result: ${e.message}`);
          continue;
        }
      }

      // Strategy 2: If Strategy 1 failed, try simpler pattern
      if (results.length === 0) {
        const simplePattern = /href="(https?:\/\/[^"]+)"[^>]*>([^<]+)<\/a>/gi;
        const matches = [...html.matchAll(simplePattern)];

        for (const match of matches) {
          if (results.length >= maxResults) break;

          const url = this.decodeHtmlEntities(match[1]);
          const title = this.decodeHtmlEntities(match[2]);

          if (url && title && url.length > 10 && title.length > 5) {
            results.push({
              title: title.trim(),
              snippet: title.trim(),
              url: url,
              source: this.extractDomain(url),
            });
          }
        }
      }

    } catch (error) {
      console.error('  ✗ HTML parsing error:', error.message);
    }

    return results;
  }

  /**
   * Extract domain from URL for source attribution
   * @param {string} url - Full URL
   * @returns {string} - Domain name
   */
  extractDomain(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace('www.', '');
    } catch {
      return 'Web';
    }
  }

  /**
   * Decode HTML entities
   * @param {string} text - Text with HTML entities
   * @returns {string} - Decoded text
   */
  decodeHtmlEntities(text) {
    if (!text) return '';
    return text
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/&#x27;/g, "'")
      .replace(/&#x2F;/g, '/')
      .replace(/<[^>]+>/g, '') // Remove any remaining HTML tags
      .trim();
  }

  /**
   * Create error response for LLM consumption
   * @param {Error} error - Error object
   * @returns {Array} - Error formatted as search results
   */
  createErrorResponse(error) {
    const errorMessage = error.message || 'Unknown error';

    console.error(`❌ Creating error response: ${errorMessage}`);

    return [{
      title: '⚠️ Web Search Currently Unavailable',
      snippet: `I couldn't perform a web search at the moment. This could be due to network issues or rate limiting. Error: ${errorMessage}. Please try asking about information from the CRM database instead, or try the web search again in a moment.`,
      url: '',
      source: 'System',
      isError: true,
    }];
  }

  /**
   * Format search results for LLM consumption
   * Returns clean, structured format optimized for AI processing
   * @param {Array} results - Search results
   * @returns {string} - Formatted results for LLM
   */
  formatResults(results) {
    if (!results || results.length === 0) {
      return 'No web search results found. The query may be too specific or web search may be temporarily unavailable.';
    }

    // Check if this is an error response
    if (results[0]?.isError) {
      return results[0].snippet;
    }

    let formatted = `WEB SEARCH RESULTS (${results.length} found):\n\n`;

    results.forEach((result, index) => {
      formatted += `[${index + 1}] ${result.title}\n`;
      formatted += `${result.snippet}\n`;
      if (result.url) {
        formatted += `Source: ${result.source} (${result.url})\n`;
      }
      formatted += '\n';
    });

    formatted += '\nNote: Use this web information to answer the user\'s question. Cite sources when appropriate.';

    return formatted;
  }

  /**
   * Sleep utility for retry backoff
   * @param {number} ms - Milliseconds to sleep
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = new WebSearchService();
