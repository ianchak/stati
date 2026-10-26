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
        status: vi.fn(),
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

    it('should leave out generated and pagination pages', () => {
      baseConfig.rss = {
        enabled: true,
        feeds: [{ ...baseFeedConfig, contentPatterns: ['site/blog/**'] }],
      };
      const tagPage = {
        slug: '/blog/tags/tech',
        url: '/blog/tags/tech',
        content: '',
        frontMatter: { title: 'Tagged tech', publishedAt: '2025-03-01' },
        sourcePath: 'site/blog/tags/[tag].md',
        generated: { key: 'tech', label: 'tech', items: [], template: 'blog/tags/[tag].md' },
      } as PageModel;
      const pageTwo = {
        ...samplePages[0]!,
        url: '/blog/page/2',
        pagination: { pageNumber: 2, totalPages: 2, items: [], urls: ['/blog', '/blog/page/2'] },
      } as PageModel;

      const results = generateRSSFeeds([...samplePages, tagPage, pageTwo], baseConfig);

      expect(results[0]!.itemCount).toBe(2);
      expect(results[0]!.xml).not.toContain('/blog/tags/tech');
      expect(results[0]!.xml).not.toContain('/blog/page/2');
    });

    it('should leave out the 404 page but keep a page named 404 in a subfolder', () => {
      baseConfig.rss = { enabled: true, feeds: [baseFeedConfig] };
      const notFound = (url: string, sourcePath: string) =>
        ({
          slug: url,
          url,
          content: '<p>Not here</p>',
          frontMatter: { title: 'Page not found' },
          sourcePath,
        }) as PageModel;

      const results = generateRSSFeeds(
        [
          ...samplePages,
          notFound('/404', 'site/404.md'),
          notFound('/404/', 'site/404/index.md'),
          notFound('/blog/404', 'site/blog/404.md'),
        ],
        baseConfig,
      );

      expect(results[0]!.itemCount).toBe(4);
      expect(results[0]!.xml).not.toContain('https://example.com/404<');
      expect(results[0]!.xml).not.toContain('https://example.com/404/<');
      expect(results[0]!.xml).toContain('https://example.com/blog/404<');
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

    it('should fall back to date when publishedAt is invalid', () => {
      const pages = [
        {
          slug: 'fallback',
          url: '/fallback',
          content: '<p>Content</p>',
          frontMatter: { title: 'Fallback', publishedAt: 'soon', date: '2025-03-15' },
          sourcePath: 'site/fallback.md',
        },
      ] as PageModel[];

      const result = generateRSSFeed(pages, baseConfig, baseFeedConfig);

      expect(result.xml).toMatch(/<pubDate>[A-Za-z]{3}, 15 Mar 2025/);
    });

    it('should read pubDate from a custom string mapping only', () => {
      baseFeedConfig.itemMapping = { pubDate: 'releasedOn' };
      const pages = [
        {
          slug: 'mapped',
          url: '/mapped',
          content: '<p>Content</p>',
          frontMatter: { title: 'Mapped', publishedAt: '2025-01-01', releasedOn: '2025-04-02' },
          sourcePath: 'site/mapped.md',
        },
        {
          slug: 'bad-mapped',
          url: '/bad-mapped',
          content: '<p>Content</p>',
          frontMatter: { title: 'Bad Mapped', publishedAt: '2025-01-01', releasedOn: 'soon' },
          sourcePath: 'site/bad-mapped.md',
        },
      ] as PageModel[];

      const result = generateRSSFeed(pages, baseConfig, baseFeedConfig);
      const pubDates = result.xml
        .split('<item>')
        .slice(1)
        .map((item) => item.match(/<pubDate>([^<]+)<\/pubDate>/)?.[1]);

      expect(pubDates[0]).toMatch(/02 Apr 2025/);
      // An invalid mapped value omits pubDate instead of falling back to publishedAt
      expect(pubDates[1]).toBeUndefined();
    });

    it('should read published and createdAt for pubDate and sorting', () => {
      const pages = [
        {
          slug: 'created',
          url: '/created',
          content: '<p>Content</p>',
          frontMatter: { title: 'Created', createdAt: '2025-01-10' },
          sourcePath: 'site/created.md',
        },
        {
          slug: 'published',
          url: '/published',
          content: '<p>Content</p>',
          frontMatter: { title: 'Published', published: new Date('2025-02-20') },
          sourcePath: 'site/published.md',
        },
        {
          slug: 'undated',
          url: '/undated',
          content: '<p>Content</p>',
          frontMatter: { title: 'Undated' },
          sourcePath: 'site/undated.md',
        },
      ] as PageModel[];

      const result = generateRSSFeed(pages, baseConfig, baseFeedConfig);
      const titles = [...result.xml.matchAll(/<item>\s*<title>([^<]+)<\/title>/g)].map(
        (match) => match[1],
      );

      expect(titles).toEqual(['Published', 'Created', 'Undated']);
      expect(result.xml).toMatch(/<pubDate>[A-Za-z]{3}, 20 Feb 2025/);
      expect(result.xml).toMatch(/<pubDate>[A-Za-z]{3}, 10 Jan 2025/);
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

    it('should sort by title when a title is a number', () => {
      baseFeedConfig.sortBy = 'title-asc';
      const numeric = {
        ...samplePages[0]!,
        url: '/numeric',
        frontMatter: { ...samplePages[0]!.frontMatter, title: 1984 },
      } as unknown as PageModel;

      const result = generateRSSFeed([numeric, ...samplePages], baseConfig, baseFeedConfig);

      expect(result.itemCount).toBe(4);
      expect(result.xml.indexOf('<title>1984</title>')).toBeLessThan(
        result.xml.indexOf('About Us'),
      );
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

  describe('failing callbacks and front matter', () => {
    let logger: Logger;

    beforeEach(() => {
      logger = {
        info: vi.fn(),
        success: vi.fn(),
        warning: vi.fn(),
        error: vi.fn(),
        status: vi.fn(),
        building: vi.fn(),
        processing: vi.fn(),
        stats: vi.fn(),
      };
    });

    function item(xml: string, title: string): string {
      const items = xml.split('<item>').slice(1);
      return items.find((candidate) => candidate.includes(`<title>${title}</title>`)) ?? '';
    }

    it('should skip an item whose link callback throws and name the page', () => {
      baseFeedConfig.itemMapping = {
        link: (page) => {
          if (page.slug === 'post-2') throw new Error('link boom');
          return `https://example.com${page.url}`;
        },
      };

      const result = generateRSSFeed(samplePages, baseConfig, baseFeedConfig, logger);

      expect(result.itemCount).toBe(2);
      expect(result.xml).toContain('First Post');
      expect(result.xml).not.toContain('Second Post');
      expect(logger.warning).toHaveBeenCalledWith(expect.stringContaining('post-2'));
      expect(logger.warning).toHaveBeenCalledWith(expect.stringContaining('link boom'));
    });

    it('should warn and skip an item whose link callback returns undefined', () => {
      baseFeedConfig.itemMapping = {
        link: (page) =>
          (page.slug === 'about' ? undefined : `https://example.com${page.url}`) as string,
      };

      const result = generateRSSFeed(samplePages, baseConfig, baseFeedConfig, logger);

      expect(result.itemCount).toBe(2);
      expect(logger.warning).toHaveBeenCalledWith(
        expect.stringContaining('returned no URL for page about'),
      );
    });

    it('should skip an item whose link callback returns no URL', () => {
      baseFeedConfig.itemMapping = {
        link: (page) => (page.slug === 'about' ? '' : `https://example.com${page.url}`),
      };

      const result = generateRSSFeed(samplePages, baseConfig, baseFeedConfig, logger);

      expect(result.itemCount).toBe(2);
      expect(result.xml).not.toContain('About Us');
      expect(logger.warning).toHaveBeenCalledWith(expect.stringContaining('about'));
    });

    it('should leave out only the field when a guid callback throws', () => {
      baseFeedConfig.itemMapping = {
        guid: () => {
          throw new Error('guid boom');
        },
      };

      const result = generateRSSFeed(samplePages, baseConfig, baseFeedConfig, logger);

      expect(result.itemCount).toBe(3);
      expect(result.xml).not.toContain('<guid');
      expect(logger.warning).toHaveBeenCalledWith(expect.stringContaining('guid boom'));
    });

    it('should use the link when a guid callback returns nothing', () => {
      baseFeedConfig.itemMapping = { guid: () => '' };

      const result = generateRSSFeed(samplePages, baseConfig, baseFeedConfig, logger);

      expect(result.xml).toContain(
        '<guid isPermaLink="true">https://example.com/blog/post-1</guid>',
      );
    });

    it('should leave out only the enclosure when the enclosure callback throws', () => {
      baseFeedConfig.enclosure = (page) => {
        if (page.slug === 'post-1') throw new Error('enclosure boom');
        return { url: 'https://example.com/a.mp3', length: 10, type: 'audio/mpeg' };
      };

      const result = generateRSSFeed(samplePages, baseConfig, baseFeedConfig, logger);

      expect(result.itemCount).toBe(3);
      expect(item(result.xml, 'First Post')).not.toContain('<enclosure');
      expect(item(result.xml, 'Second Post')).toContain('<enclosure');
      expect(logger.warning).toHaveBeenCalledWith(expect.stringContaining('post-1'));
    });

    it('should skip an enclosure without a URL', () => {
      baseFeedConfig.enclosure = () =>
        ({ length: 10, type: 'audio/mpeg' }) as unknown as {
          url: string;
          length: number;
          type: string;
        };

      const result = generateRSSFeed(samplePages, baseConfig, baseFeedConfig, logger);

      expect(result.xml).not.toContain('<enclosure');
      expect(logger.warning).toHaveBeenCalledWith(expect.stringContaining('enclosure'));
    });

    it('should leave out only the extra elements when customItemElements throws', () => {
      baseFeedConfig.customItemElements = () => {
        throw new Error('elements boom');
      };

      const result = generateRSSFeed(samplePages, baseConfig, baseFeedConfig, logger);

      expect(result.itemCount).toBe(3);
      expect(logger.warning).toHaveBeenCalledWith(expect.stringContaining('elements boom'));
    });

    it('should ignore customItemElements that return something other than an object', () => {
      baseFeedConfig.customItemElements = () => null as unknown as Record<string, string>;

      const result = generateRSSFeed(samplePages, baseConfig, baseFeedConfig, logger);

      expect(result.itemCount).toBe(3);
    });

    it('should fall back to a console logger when none is passed', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      baseFeedConfig.itemMapping = {
        link: () => {
          throw new Error('link boom');
        },
      };

      const result = generateRSSFeed(samplePages, baseConfig, baseFeedConfig);

      expect(result.itemCount).toBe(0);
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('link boom'));
      warn.mockRestore();
    });

    it('should skip custom elements whose names are not valid XML names', () => {
      baseFeedConfig.customItemElements = () => ({
        'my tag': 'a',
        '1st': 'b',
        xmlThing: 'c',
        'a:b:c': 'd',
        'dc:creator': 'ok',
        valid_name: 'fine',
        étiquette: 'accent',
        記事: 'article',
        'dc:étiquette': 'prefixed',
      });

      const result = generateRSSFeed(samplePages, baseConfig, baseFeedConfig, logger);

      expect(result.xml).not.toContain('my tag');
      expect(result.xml).not.toContain('<1st>');
      expect(result.xml).not.toContain('xmlThing');
      expect(result.xml).not.toContain('a:b:c');
      expect(result.xml).toContain('<dc:creator>ok</dc:creator>');
      expect(result.xml).toContain('<valid_name>fine</valid_name>');
      expect(result.xml).toContain('<étiquette>accent</étiquette>');
      expect(result.xml).toContain('<記事>article</記事>');
      expect(result.xml).toContain('<dc:étiquette>prefixed</dc:étiquette>');
      // One warning per bad name, not one per item
      const warned = vi.mocked(logger.warning).mock.calls.filter(([m]) => m.includes('my tag'));
      expect(warned).toHaveLength(1);
    });

    it('should write author objects as email (name)', () => {
      const pages = [
        {
          ...samplePages[0]!,
          frontMatter: { title: 'Both', author: { name: 'Bob', email: 'bob@example.com' } },
        },
        { ...samplePages[1]!, frontMatter: { title: 'Name', author: { name: 'Ann' } } },
        { ...samplePages[2]!, frontMatter: { title: 'Mail', author: { email: 'cy@example.com' } } },
      ] as PageModel[];

      const result = generateRSSFeed(pages, baseConfig, baseFeedConfig, logger);

      expect(item(result.xml, 'Both')).toContain('<author>bob@example.com (Bob)</author>');
      expect(item(result.xml, 'Name')).toContain('<author>Ann</author>');
      expect(item(result.xml, 'Mail')).toContain('<author>cy@example.com</author>');
    });

    it('should leave out an author that is neither text nor an author object', () => {
      const pages = [
        { ...samplePages[0]!, frontMatter: { title: 'Flag', author: true } },
        { ...samplePages[1]!, frontMatter: { title: 'Empty', author: {} } },
        { ...samplePages[2]!, frontMatter: { title: 'Blank', author: '  ' } },
      ] as unknown as PageModel[];

      const result = generateRSSFeed(pages, baseConfig, baseFeedConfig, logger);

      expect(result.xml).not.toContain('<author>');
      expect(logger.warning).toHaveBeenCalledWith(expect.stringContaining('author'));
    });

    it('should join a list of authors and keep numeric authors', () => {
      const pages = [
        {
          ...samplePages[0]!,
          frontMatter: {
            title: 'List',
            author: ['Bob', { name: 'Ann', email: 'ann@example.com' }, ''],
          },
        },
        { ...samplePages[1]!, frontMatter: { title: 'Number', author: 42 } },
        { ...samplePages[2]!, frontMatter: { title: 'Empty list', author: [] } },
      ] as unknown as PageModel[];

      const result = generateRSSFeed(pages, baseConfig, baseFeedConfig, logger);

      expect(item(result.xml, 'List')).toContain('<author>Bob, ann@example.com (Ann)</author>');
      expect(item(result.xml, 'Number')).toContain('<author>42</author>');
      expect(item(result.xml, 'Empty list')).not.toContain('<author>');
    });

    it('should trim an author string', () => {
      const pages = [
        { ...samplePages[0]!, frontMatter: { title: 'Text', author: ' Bob ' } },
      ] as PageModel[];

      const result = generateRSSFeed(pages, baseConfig, baseFeedConfig, logger);

      expect(result.xml).toContain('<author>Bob</author>');
    });

    it('should mark a guid that is not an absolute URL as not a permalink', () => {
      baseFeedConfig.itemMapping = { guid: (page) => `urn:post:${page.slug}` };

      const result = generateRSSFeed(samplePages, baseConfig, baseFeedConfig, logger);

      expect(result.xml).toContain('<guid isPermaLink="false">urn:post:post-1</guid>');
      expect(result.xml).not.toContain('isPermaLink="true"');
    });

    it('should keep isPermaLink true for an absolute guid URL', () => {
      baseFeedConfig.itemMapping = { guid: (page) => `https://other.example/${page.slug}` };

      const result = generateRSSFeed(samplePages, baseConfig, baseFeedConfig, logger);

      expect(result.xml).toContain('<guid isPermaLink="true">https://other.example/post-1</guid>');
    });

    it('should write length 0 for an enclosure without a length', () => {
      baseFeedConfig.enclosure = () =>
        ({ url: 'https://example.com/a.mp3', type: 'audio/mpeg' }) as unknown as {
          url: string;
          length: number;
          type: string;
        };

      const result = generateRSSFeed(samplePages, baseConfig, baseFeedConfig, logger);

      expect(result.xml).toContain('length="0"');
      expect(result.xml).not.toContain('undefined');
    });

    it('should make relative links, enclosure URLs and feed URLs absolute', () => {
      baseFeedConfig.link = '/blog';
      baseFeedConfig.image = { url: './logo.png', title: 'Logo', link: '/' };
      baseFeedConfig.itemMapping = { link: (page) => `${page.url}/` };
      baseFeedConfig.enclosure = () => ({ url: '/media/a.mp3', length: 5, type: 'audio/mpeg' });

      const result = generateRSSFeed(samplePages, baseConfig, baseFeedConfig, logger);

      expect(result.xml).toContain('<link>https://example.com/blog</link>');
      expect(result.xml).toContain('<url>https://example.com/logo.png</url>');
      expect(result.xml).toContain('<link>https://example.com/</link>');
      expect(result.xml).toContain('<link>https://example.com/blog/post-1/</link>');
      expect(result.xml).toContain('<enclosure url="https://example.com/media/a.mp3"');
    });

    it('should leave absolute and protocol-relative URLs alone', () => {
      baseFeedConfig.link = '//cdn.example.com/feed';
      baseFeedConfig.enclosure = () => ({
        url: 'https://cdn.example.com/a.mp3',
        length: 5,
        type: 'audio/mpeg',
      });

      const result = generateRSSFeed(samplePages, baseConfig, baseFeedConfig, logger);

      expect(result.xml).toContain('<link>//cdn.example.com/feed</link>');
      expect(result.xml).toContain('url="https://cdn.example.com/a.mp3"');
    });

    it('should resolve relative URLs against a baseUrl that has a path', () => {
      baseConfig = {
        ...baseConfig,
        site: { ...baseConfig.site, baseUrl: 'https://example.com/docs/' },
      };
      baseFeedConfig.link = 'blog';

      const result = generateRSSFeed(samplePages, baseConfig, baseFeedConfig, logger);

      expect(result.xml).toContain('<link>https://example.com/docs/blog</link>');
      expect(result.xml).toContain('<link>https://example.com/docs/blog/post-1</link>');
    });

    describe('generateRSSFeeds', () => {
      it('should generate the other feeds when one feed fails', () => {
        baseConfig.rss = {
          enabled: true,
          feeds: [
            { ...baseFeedConfig, filename: 'a.xml' },
            {
              ...baseFeedConfig,
              filename: 'b.xml',
              filter: () => {
                throw new Error('filter boom');
              },
            },
            { ...baseFeedConfig, filename: 'c.xml' },
          ],
        };

        const results = generateRSSFeeds(samplePages, baseConfig, logger);

        expect(results.map((result) => result.filename)).toEqual(['a.xml', 'c.xml']);
        expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('b.xml'));
        expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('filter boom'));
      });

      it('should keep every feed when one feed has a throwing link callback', () => {
        baseConfig.rss = {
          enabled: true,
          feeds: [
            { ...baseFeedConfig, filename: 'a.xml' },
            {
              ...baseFeedConfig,
              filename: 'b.xml',
              itemMapping: {
                link: (page) => {
                  if (page.slug === 'post-1') throw new Error('boom');
                  return `https://example.com${page.url}`;
                },
              },
            },
          ],
        };

        const results = generateRSSFeeds(samplePages, baseConfig, logger);

        expect(results.map((result) => [result.filename, result.itemCount])).toEqual([
          ['a.xml', 3],
          ['b.xml', 2],
        ]);
      });

      it('should report a failing feed with a console logger when none is passed', () => {
        const error = vi.spyOn(console, 'error').mockImplementation(() => {});
        baseConfig.rss = {
          enabled: true,
          feeds: [
            {
              ...baseFeedConfig,
              filter: () => {
                throw 'not an error object';
              },
            },
          ],
        };

        const results = generateRSSFeeds(samplePages, baseConfig);

        expect(results).toEqual([]);
        expect(error).toHaveBeenCalledWith(expect.stringContaining('not an error object'));
        error.mockRestore();
      });
    });
  });
});
