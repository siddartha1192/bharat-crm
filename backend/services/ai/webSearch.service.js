/**
 * Web Search Service - DuckDuckGo Integration
 * Provides web search capabilities for the AI Assistant
 */

const axios = require('axios');

class WebSearchService {
  /**
   * Search DuckDuckGo
   * @param {string} query - Search query
   * @param {number} maxResults - Maximum number of results (default: 5)
   * @returns {Promise<Array>} - Array of search results
   */
  async searchDuckDuckGo(query, maxResults = 5) {
    try {
      console.log(`🔍 Searching DuckDuckGo for: "${query}"`);

      // Use DuckDuckGo Instant Answer API (free, no API key required)
      const response = await axios.get('https://api.duckduckgo.com/', {
        params: {
          q: query,
          format: 'json',
          no_html: 1,
          skip_disambig: 1,
        },
        timeout: 10000, // 10 second timeout
      });

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

      // If we have no results, try HTML scraping API as fallback
      if (results.length === 0) {
        return await this.searchDuckDuckGoHTML(query, maxResults);
      }

      console.log(`✅ Found ${results.length} results from DuckDuckGo`);
      return results.slice(0, maxResults);
    } catch (error) {
      console.error('Error searching DuckDuckGo:', error.message);

      // Return a helpful error message
      return [{
        title: 'Search Error',
        snippet: `Unable to perform web search: ${error.message}. Please try rephrasing your query or try again later.`,
        url: '',
        source: 'Error',
      }];
    }
  }

  /**
   * Fallback HTML search for DuckDuckGo
   * @param {string} query - Search query
   * @param {number} maxResults - Maximum number of results
   * @returns {Promise<Array>} - Array of search results
   */
  async searchDuckDuckGoHTML(query, maxResults = 5) {
    try {
      console.log(`🔍 Using HTML search for: "${query}"`);

      // Use DuckDuckGo HTML search
      const response = await axios.get('https://html.duckduckgo.com/html/', {
        params: {
          q: query,
        },
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
        timeout: 10000,
      });

      const html = response.data;
      const results = [];

      // Basic HTML parsing (for better parsing, consider using cheerio library)
      // Extract search results using regex
      const resultRegex = /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>[\s\S]*?<a[^>]+class="result__snippet"[^>]*>([^<]+)</g;

      let match;
      while ((match = resultRegex.exec(html)) !== null && results.length < maxResults) {
        results.push({
          title: this.decodeHtmlEntities(match[2].trim()),
          snippet: this.decodeHtmlEntities(match[3].trim()),
          url: this.decodeHtmlEntities(match[1]),
          source: 'DuckDuckGo',
        });
      }

      console.log(`✅ Found ${results.length} results from DuckDuckGo HTML`);
      return results;
    } catch (error) {
      console.error('Error in HTML search:', error.message);
      return [{
        title: 'Search Unavailable',
        snippet: 'Web search is currently unavailable. This could be due to network issues or rate limiting.',
        url: '',
        source: 'Error',
      }];
    }
  }

  /**
   * Decode HTML entities
   * @param {string} text - Text with HTML entities
   * @returns {string} - Decoded text
   */
  decodeHtmlEntities(text) {
    return text
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ');
  }

  /**
   * Format search results for AI consumption
   * @param {Array} results - Search results
   * @returns {string} - Formatted results
   */
  formatResults(results) {
    if (!results || results.length === 0) {
      return 'No search results found.';
    }

    let formatted = `Found ${results.length} result(s):\n\n`;

    results.forEach((result, index) => {
      formatted += `${index + 1}. **${result.title}**\n`;
      formatted += `   ${result.snippet}\n`;
      if (result.url) {
        formatted += `   Source: ${result.url}\n`;
      }
      formatted += '\n';
    });

    return formatted;
  }
}

module.exports = new WebSearchService();
