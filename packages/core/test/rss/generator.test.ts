/**
 * RSS feed generation tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { generateRSSFeed, generateRSSFeeds } from '../../src/rss/generator.js';
import type { PageModel } from '../../src/types/content.js';
import type { StatiConfig } from '../../src/types/config.js';
import type { RSSFeedConfig } from '../../src/types/rss.js';

describe('RSS Feed Generation', () => {
  let baseConfig: StatiConfig;
  let baseFeedConfig: RSSFeedConfig;
  let samplePages: PageModel[];

  beforeEach(() => {
    baseConfig = {
      site: {
        title: 'Test Site',
        baseUrl: 'https://example.com',
      },
    } as StatiConfig;

    baseFeedConfig = {
      filename: 'feed.xml',
      title: 'Test Feed',
      description: 'A test RSS feed',
    };

    samplePages = [
      {
        slug: 'post-1',
        url: '/blog/post-1',
        content: '<p>First post content</p>',
        frontMatter: {
          title: 'First Post',
          description: 'Description of first post',
          publishedAt: '2025-01-15',
          tags: ['tech', 'programming'],
        },
        sourcePath: 'site/blog/post-1.md',
      },
      {
        slug: 'post-2',
        url: '/blog/post-2',
        content: '<p>Second post content</p>',
        frontMatter: {
          title: 'Second Post',
          description: 'Description of second post',
          date: '2025-02-20',
          tags: ['design'],
        },
        sourcePath: 'site/blog/post-2.md',
      },
      {
        slug: 'about',
        url: '/about',
        content: '<p>About page content</p>',
        frontMatter: {
          title: 'About Us',
          description: 'About our site',
        },
        sourcePath: 'site/about.md',
      },
    ] as PageModel[];
  });

  describe('generateRSSFeed', () => {
    it('should generate basic RSS feed with all pages', () => {
      const result = generateRSSFeed(samplePages, baseConfig, baseFeedConfig);

      expect(result.filename).toBe('feed.xml');
      expect(result.itemCount).toBe(3);
      expect(result.xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(result.xml).toContain('<rss version="2.0">');
      expect(result.xml).toContain('<title>Test Feed</title>');
      expect(result.xml).toContain('<description>A test RSS feed</description>');
      expect(result.xml).toContain('<link>https://example.com</link>');
    });

    it('should include page items with correct structure', () => {
      const result = generateRSSFeed(samplePages, baseConfig, baseFeedConfig);

      expect(result.xml).toContain('<item>');
      expect(result.xml).toContain('<title>First Post</title>');
      expect(result.xml).toContain('<description>Description of first post</description>');
      expect(result.xml).toContain('<link>https://example.com/blog/post-1</link>');
      expect(result.xml).toContain(
        '<guid isPermaLink="true">https://example.com/blog/post-1</guid>',
      );
    });

    it('should format publication dates correctly (RFC 822)', () => {
      const result = generateRSSFeed(samplePages, baseConfig, baseFeedConfig);

      // Should contain pubDate in RFC 822 format
      expect(result.xml).toMatch(/<pubDate>[A-Za-z]{3}, \d{2} [A-Za-z]{3} \d{4}/);
    });

    it('should include categories from tags', () => {
      const result = generateRSSFeed(samplePages, baseConfig, baseFeedConfig);

      expect(result.xml).toContain('<category>tech</category>');
      expect(result.xml).toContain('<category>programming</category>');
      expect(result.xml).toContain('<category>design</category>');
    });

    it('should filter pages by contentPatterns', () => {
      baseFeedConfig.contentPatterns = ['site/blog/**'];

      const result = generateRSSFeed(samplePages, baseConfig, baseFeedConfig);

      expect(result.itemCount).toBe(2); // Only blog posts
      expect(result.xml).toContain('First Post');
      expect(result.xml).toContain('Second Post');
      expect(result.xml).not.toContain('About Us');
    });

    it('should exclude pages by excludePatterns', () => {
      baseFeedConfig.excludePatterns = ['**/about.md'];

      const result = generateRSSFeed(samplePages, baseConfig, baseFeedConfig);

      expect(result.itemCount).toBe(2); // All except about
      expect(result.xml).not.toContain('About Us');
    });

    it('should respect maxItems limit', () => {
      baseFeedConfig.maxItems = 1;

      const result = generateRSSFeed(samplePages, baseConfig, baseFeedConfig);

      expect(result.itemCount).toBe(1);
    });

    it('should sort by date descending by default', () => {
      const result = generateRSSFeed(samplePages, baseConfig, baseFeedConfig);

      // Second post (Feb 20) should come before First post (Jan 15)
      const xmlString = result.xml;
      const secondPostIndex = xmlString.indexOf('Second Post');
      const firstPostIndex = xmlString.indexOf('First Post');

      expect(secondPostIndex).toBeLessThan(firstPostIndex);
    });

    it('should sort by date ascending when specified', () => {
      baseFeedConfig.sortBy = 'date-asc';

      const result = generateRSSFeed(samplePages, baseConfig, baseFeedConfig);

      // First post (Jan 15) should come before Second post (Feb 20)
      const xmlString = result.xml;
      const firstPostIndex = xmlString.indexOf('First Post');
      const secondPostIndex = xmlString.indexOf('Second Post');

      expect(firstPostIndex).toBeLessThan(secondPostIndex);
    });

    it('should sort by title when specified', () => {
      baseFeedConfig.sortBy = 'title-asc';

      const result = generateRSSFeed(samplePages, baseConfig, baseFeedConfig);

      // "About Us" should come first alphabetically
      const xmlString = result.xml;
      const items = xmlString.match(/<title>([^<]+)<\/title>/g) || [];
      const pageTitles = items.slice(1); // Skip feed title

      expect(pageTitles[0]).toContain('About Us');
    });

    it('should include full content when includeContent is true', () => {
      baseFeedConfig.itemMapping = {
        includeContent: true,
      };

      const result = generateRSSFeed(samplePages, baseConfig, baseFeedConfig);

      expect(result.xml).toContain('<![CDATA[<p>First post content</p>]]>');
    });

    it('should use custom field mapping for title', () => {
      samplePages[0]!.frontMatter.customTitle = 'Custom Title';
      baseFeedConfig.itemMapping = {
        title: 'customTitle',
      };

      const result = generateRSSFeed(samplePages, baseConfig, baseFeedConfig);

      expect(result.xml).toContain('<title>Custom Title</title>');
    });

    it('should use custom field mapping function for description', () => {
      baseFeedConfig.itemMapping = {
        description: (page) => `Custom: ${page.frontMatter.title}`,
      };

      const result = generateRSSFeed(samplePages, baseConfig, baseFeedConfig);

      expect(result.xml).toContain('<description>Custom: First Post</description>');
    });

    it('should include optional feed metadata', () => {
      baseFeedConfig.language = 'en-US';
      baseFeedConfig.copyright = 'Copyright 2025';
      baseFeedConfig.category = 'Technology';
      baseFeedConfig.ttl = 60;

      const result = generateRSSFeed(samplePages, baseConfig, baseFeedConfig);

      expect(result.xml).toContain('<language>en-US</language>');
      expect(result.xml).toContain('<copyright>Copyright 2025</copyright>');
      expect(result.xml).toContain('<category>Technology</category>');
      expect(result.xml).toContain('<ttl>60</ttl>');
    });

    it('should include feed image when provided', () => {
      baseFeedConfig.image = {
        url: 'https://example.com/logo.png',
        title: 'Site Logo',
        link: 'https://example.com',
        width: 144,
        height: 400,
      };

      const result = generateRSSFeed(samplePages, baseConfig, baseFeedConfig);

      expect(result.xml).toContain('<image>');
      expect(result.xml).toContain('<url>https://example.com/logo.png</url>');
      expect(result.xml).toContain('<width>144</width>');
      expect(result.xml).toContain('<height>400</height>');
    });

    it('should apply custom filter function', () => {
      baseFeedConfig.filter = (page) => page.frontMatter.tags?.includes('tech') || false;

      const result = generateRSSFeed(samplePages, baseConfig, baseFeedConfig);

      expect(result.itemCount).toBe(1); // Only First Post has 'tech' tag
      expect(result.xml).toContain('First Post');
      expect(result.xml).not.toContain('Second Post');
    });

    it('should escape XML special characters', () => {
      samplePages[0]!.frontMatter.title = 'Test & <Special> "Characters"';

      const result = generateRSSFeed(samplePages, baseConfig, baseFeedConfig);

      expect(result.xml).toContain('&amp;');
      expect(result.xml).toContain('&lt;');
      expect(result.xml).toContain('&gt;');
      expect(result.xml).toContain('&quot;');
    });

    it('should use custom link function', () => {
      baseFeedConfig.itemMapping = {
        link: (page, config) => `${config.site.baseUrl}/custom${page.url}`,
      };

      const result = generateRSSFeed(samplePages, baseConfig, baseFeedConfig);

      expect(result.xml).toContain('<link>https://example.com/custom/blog/post-1</link>');
    });

    it('should include custom namespaces', () => {
      baseFeedConfig.namespaces = {
        content: 'http://purl.org/rss/1.0/modules/content/',
      };

      const result = generateRSSFeed(samplePages, baseConfig, baseFeedConfig);

      expect(result.xml).toContain('xmlns:content="http://purl.org/rss/1.0/modules/content/"');
    });

    it('should add custom item elements', () => {
      baseFeedConfig.customItemElements = (page) => ({
        'custom:field': page.frontMatter.title,
      });

      const result = generateRSSFeed(samplePages, baseConfig, baseFeedConfig);

      expect(result.xml).toContain('<custom:field>First Post</custom:field>');
    });

    it('should handle pages without dates', () => {
      const pagesWithoutDates = [
        {
          slug: 'no-date',
          url: '/no-date',
          content: '<p>Content</p>',
          frontMatter: {
            title: 'No Date Page',
          },
          sourcePath: 'site/no-date.md',
        },
      ] as PageModel[];

      const result = generateRSSFeed(pagesWithoutDates, baseConfig, baseFeedConfig);

      expect(result.itemCount).toBe(1);
      expect(result.xml).toContain('No Date Page');
      // pubDate should not be present for this item
      const itemSection = result.xml.substring(result.xml.indexOf('<item>'));
      const firstItemEnd = itemSection.indexOf('</item>');
      const firstItem = itemSection.substring(0, firstItemEnd);
      expect(firstItem).not.toContain('<pubDate>');
    });

    it('should generate valid XML structure', () => {
      const result = generateRSSFeed(samplePages, baseConfig, baseFeedConfig);

      // Basic XML structure validation
      expect(result.xml).toMatch(/^<\?xml version="1\.0" encoding="UTF-8"\?>/);
      expect(result.xml).toContain('<rss version="2.0">');
      expect(result.xml).toContain('</rss>');
      expect(result.xml).toContain('<channel>');
      expect(result.xml).toContain('</channel>');

      // Count opening and closing tags to ensure they match
      const openingItems = (result.xml.match(/<item>/g) || []).length;
      const closingItems = (result.xml.match(/<\/item>/g) || []).length;
      expect(openingItems).toBe(closingItems);
    });
  });

  describe('generateRSSFeeds', () => {
    it('should return empty array when RSS is disabled', () => {
      baseConfig.rss = {
        enabled: false,
        feeds: [baseFeedConfig],
      };

      const results = generateRSSFeeds(samplePages, baseConfig);

      expect(results).toEqual([]);
    });

    it('should return empty array when RSS config is not provided', () => {
      const results = generateRSSFeeds(samplePages, baseConfig);

      expect(results).toEqual([]);
    });

    it('should generate single feed', () => {
      baseConfig.rss = {
        enabled: true,
        feeds: [baseFeedConfig],
      };

      const results = generateRSSFeeds(samplePages, baseConfig);

      expect(results).toHaveLength(1);
      expect(results[0]!.filename).toBe('feed.xml');
      expect(results[0]!.itemCount).toBe(3);
    });

    it('should generate multiple feeds with different configurations', () => {
      const blogFeedConfig: RSSFeedConfig = {
        filename: 'blog.xml',
        title: 'Blog Feed',
        description: 'Blog posts only',
        contentPatterns: ['site/blog/**'],
      };

      baseConfig.rss = {
        enabled: true,
        feeds: [baseFeedConfig, blogFeedConfig],
      };

      const results = generateRSSFeeds(samplePages, baseConfig);

      expect(results).toHaveLength(2);

      // First feed should have all pages
      expect(results[0]!.filename).toBe('feed.xml');
      expect(results[0]!.itemCount).toBe(3);

      // Second feed should have only blog posts
      expect(results[1]!.filename).toBe('blog.xml');
      expect(results[1]!.itemCount).toBe(2);
    });
  });
});
