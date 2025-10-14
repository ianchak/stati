/**
 * RSS feed generation tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { generateRSSFeed, generateRSSFeeds } from '../../src/rss/generator.js';
import type { PageModel } from '../../src/types/content.js';
import type { StatiConfig } from '../../src/types/config.js';
import type { RSSFeedConfig } from '../../src/types/rss.js';
import type { Logger } from '../../src/types/logging.js';

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

    it('should use logger when field mapping function throws error', () => {
      const mockLogger: Logger = {
        info: vi.fn(),
        success: vi.fn(),
        warning: vi.fn(),
        error: vi.fn(),
        building: vi.fn(),
        processing: vi.fn(),
        stats: vi.fn(),
      };

      baseFeedConfig.itemMapping = {
        title: () => {
          throw new Error('Field mapping error');
        },
      };

      const result = generateRSSFeed(samplePages, baseConfig, baseFeedConfig, mockLogger);

      // Should complete without throwing
      expect(result.itemCount).toBe(3);

      // Should have called logger.warning for each failed mapping
      expect(mockLogger.warning).toHaveBeenCalled();
      expect(mockLogger.warning).toHaveBeenCalledWith(
        expect.stringContaining('Field mapping function failed'),
      );
      expect(mockLogger.warning).toHaveBeenCalledWith(
        expect.stringContaining('Field mapping error'),
      );
    });

    it('should not throw when logger is not provided and mapping fails', () => {
      baseFeedConfig.itemMapping = {
        description: () => {
          throw new Error('Mapping error');
        },
      };

      // Should not throw even without logger
      expect(() => {
        generateRSSFeed(samplePages, baseConfig, baseFeedConfig);
      }).not.toThrow();
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

  describe('Edge Cases and Additional Coverage', () => {
    it('should handle pages with null or undefined frontMatter properties', () => {
      const edgePages = [
        {
          slug: 'edge-case',
          url: '/edge',
          content: '<p>Content</p>',
          frontMatter: null as unknown as PageModel['frontMatter'],
          sourcePath: 'site/edge.md',
        },
      ] as PageModel[];

      const result = generateRSSFeed(edgePages, baseConfig, baseFeedConfig);

      expect(result.itemCount).toBe(1);
      expect(result.xml).toContain('<item>');
    });

    it('should handle custom sort function', () => {
      baseFeedConfig.sortBy = 'custom';
      baseFeedConfig.sortFn = (a, b) => {
        // Sort by title length
        const titleA = a.frontMatter.title || '';
        const titleB = b.frontMatter.title || '';
        return titleA.length - titleB.length;
      };

      const result = generateRSSFeed(samplePages, baseConfig, baseFeedConfig);

      expect(result.itemCount).toBe(3);
      // "About Us" (8 chars) should come before "First Post" (10 chars)
      const aboutIndex = result.xml.indexOf('About Us');
      const firstPostIndex = result.xml.indexOf('First Post');
      expect(aboutIndex).toBeLessThan(firstPostIndex);
    });

    it('should handle invalid date strings gracefully', () => {
      const pagesWithInvalidDates: PageModel[] = [
        {
          slug: 'invalid-date',
          url: '/invalid',
          content: '<p>Content</p>',
          frontMatter: {
            title: 'Invalid Date',
            publishedAt: 'not-a-valid-date',
          },
          sourcePath: 'site/invalid.md',
        },
      ] as PageModel[];

      const result = generateRSSFeed(pagesWithInvalidDates, baseConfig, baseFeedConfig);

      expect(result.itemCount).toBe(1);
      // Should not include pubDate for invalid dates
      const itemSection = result.xml.substring(result.xml.indexOf('<item>'));
      expect(itemSection).not.toContain('<pubDate>');
    });

    it('should handle Date objects in frontMatter', () => {
      const pagesWithDateObjects = [
        {
          slug: 'date-object',
          url: '/date-obj',
          content: '<p>Content</p>',
          frontMatter: {
            title: 'Date Object Page',
            date: new Date('2025-03-15T10:00:00Z') as unknown as string,
          },
          sourcePath: 'site/date-obj.md',
        },
      ] as PageModel[];

      const result = generateRSSFeed(pagesWithDateObjects, baseConfig, baseFeedConfig);

      expect(result.itemCount).toBe(1);
      expect(result.xml).toContain('<pubDate>');
      expect(result.xml).toMatch(/<pubDate>[A-Za-z]{3}, 15 [A-Za-z]{3} 2025/);
    });

    it('should handle enclosure function', () => {
      baseFeedConfig.enclosure = (page) => {
        if (page.slug === 'post-1') {
          return {
            url: 'https://example.com/media/audio.mp3',
            length: 12345678,
            type: 'audio/mpeg',
          };
        }
        return undefined;
      };

      const result = generateRSSFeed(samplePages, baseConfig, baseFeedConfig);

      expect(result.xml).toContain('<enclosure');
      expect(result.xml).toContain('url="https://example.com/media/audio.mp3"');
      expect(result.xml).toContain('length="12345678"');
      expect(result.xml).toContain('type="audio/mpeg"');
    });

    it('should skip enclosure when function returns undefined', () => {
      baseFeedConfig.enclosure = () => undefined;

      const result = generateRSSFeed(samplePages, baseConfig, baseFeedConfig);

      expect(result.xml).not.toContain('<enclosure');
    });

    it('should handle custom guid function', () => {
      baseFeedConfig.itemMapping = {
        guid: (page, config) => `${config.site.baseUrl}/guid/${page.slug}`,
      };

      const result = generateRSSFeed(samplePages, baseConfig, baseFeedConfig);

      expect(result.xml).toContain(
        '<guid isPermaLink="true">https://example.com/guid/post-1</guid>',
      );
    });

    it('should handle author field', () => {
      samplePages[0]!.frontMatter.author = 'John Doe';

      baseFeedConfig.itemMapping = {
        author: 'author',
      };

      const result = generateRSSFeed(samplePages, baseConfig, baseFeedConfig);

      expect(result.xml).toContain('<author>John Doe</author>');
    });

    it('should handle category as string instead of array', () => {
      const pageWithSingleCategory = [
        {
          slug: 'single-cat',
          url: '/single',
          content: '<p>Content</p>',
          frontMatter: {
            title: 'Single Category',
            tags: 'single-tag' as unknown as string[],
          },
          sourcePath: 'site/single.md',
        },
      ] as PageModel[];

      const result = generateRSSFeed(pageWithSingleCategory, baseConfig, baseFeedConfig);

      expect(result.xml).toContain('<category>single-tag</category>');
    });

    it('should skip categories when undefined or null', () => {
      const pageWithoutCategories: PageModel[] = [
        {
          slug: 'no-cats',
          url: '/no-cats',
          content: '<p>Content</p>',
          frontMatter: {
            title: 'No Categories',
          },
          sourcePath: 'site/no-cats.md',
        },
      ] as PageModel[];

      const result = generateRSSFeed(pageWithoutCategories, baseConfig, baseFeedConfig);

      const itemSection = result.xml.substring(result.xml.indexOf('<item>'));
      const firstItemEnd = itemSection.indexOf('</item>');
      const firstItem = itemSection.substring(0, firstItemEnd);
      expect(firstItem).not.toContain('<category>');
    });

    it('should handle custom item elements with undefined/null values', () => {
      baseFeedConfig.customItemElements = (_page) => ({
        'custom:defined': 'value',
        'custom:undefined': undefined,
      });

      const result = generateRSSFeed(samplePages, baseConfig, baseFeedConfig);

      expect(result.xml).toContain('<custom:defined>value</custom:defined>');
      expect(result.xml).not.toContain('<custom:undefined>');
    });

    it('should handle image without optional width/height', () => {
      baseFeedConfig.image = {
        url: 'https://example.com/logo.png',
        title: 'Logo',
        link: 'https://example.com',
      };

      const result = generateRSSFeed(samplePages, baseConfig, baseFeedConfig);

      expect(result.xml).toContain('<image>');
      expect(result.xml).toContain('<url>https://example.com/logo.png</url>');
      expect(result.xml).not.toContain('<width>');
      expect(result.xml).not.toContain('<height>');
    });

    it('should handle managingEditor and webMaster fields', () => {
      baseFeedConfig.managingEditor = 'editor@example.com (Editor Name)';
      baseFeedConfig.webMaster = 'webmaster@example.com (Webmaster Name)';

      const result = generateRSSFeed(samplePages, baseConfig, baseFeedConfig);

      expect(result.xml).toContain(
        '<managingEditor>editor@example.com (Editor Name)</managingEditor>',
      );
      expect(result.xml).toContain('<webMaster>webmaster@example.com (Webmaster Name)</webMaster>');
    });

    it('should calculate correct size in bytes', () => {
      const result = generateRSSFeed(samplePages, baseConfig, baseFeedConfig);

      // Size should match actual XML byte length
      const actualSize = Buffer.byteLength(result.xml, 'utf8');
      expect(result.sizeInBytes).toBe(actualSize);
    });

    it('should handle pages with both publishedAt and date fields', () => {
      const pageWithBothDates: PageModel[] = [
        {
          slug: 'both-dates',
          url: '/both',
          content: '<p>Content</p>',
          frontMatter: {
            title: 'Both Dates',
            publishedAt: '2025-03-20',
            date: '2025-01-10',
          },
          sourcePath: 'site/both.md',
        },
      ] as PageModel[];

      const result = generateRSSFeed(pageWithBothDates, baseConfig, baseFeedConfig);

      // Should use publishedAt over date
      expect(result.xml).toContain('<pubDate>');
      expect(result.xml).toMatch(/<pubDate>.*20 Mar 2025/);
    });

    it('should handle title-desc sorting', () => {
      baseFeedConfig.sortBy = 'title-desc';

      const result = generateRSSFeed(samplePages, baseConfig, baseFeedConfig);

      expect(result.itemCount).toBe(3);
      // "Second Post" should come before "First Post" (descending alphabetical)
      const secondIndex = result.xml.indexOf('Second Post');
      const firstIndex = result.xml.indexOf('First Post');
      expect(secondIndex).toBeLessThan(firstIndex);
    });

    it('should handle title-asc sorting', () => {
      baseFeedConfig.sortBy = 'title-asc';

      const result = generateRSSFeed(samplePages, baseConfig, baseFeedConfig);

      expect(result.itemCount).toBe(3);
      // "About Us" should come first alphabetically
      const aboutIndex = result.xml.indexOf('About Us');
      const firstPostIndex = result.xml.indexOf('First Post');
      expect(aboutIndex).toBeLessThan(firstPostIndex);
    });

    it('should filter and exclude patterns', () => {
      baseFeedConfig.contentPatterns = ['site/**'];
      baseFeedConfig.excludePatterns = ['**/about.md'];

      const result = generateRSSFeed(samplePages, baseConfig, baseFeedConfig);

      expect(result.itemCount).toBe(2);
      expect(result.xml).not.toContain('About Us');
    });

    it('should use custom link from config', () => {
      baseFeedConfig.link = 'https://custom-link.com/feed';

      const result = generateRSSFeed(samplePages, baseConfig, baseFeedConfig);

      expect(result.xml).toContain('<link>https://custom-link.com/feed</link>');
    });
  });
});
