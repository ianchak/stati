/**
 * Sitemap generation tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateSitemapEntry,
  generateSitemapXml,
  generateSitemapIndexXml,
  generateSitemap,
} from '../../src/seo/sitemap.js';
import type { PageModel } from '../../src/types/content.js';
import type { StatiConfig } from '../../src/types/config.js';
import type { SitemapConfig } from '../../src/types/sitemap.js';

describe('Sitemap Generation', () => {
  let baseConfig: StatiConfig;
  let baseSitemapConfig: SitemapConfig;
  let samplePage: PageModel;

  beforeEach(() => {
    baseConfig = {
      site: {
        title: 'Test Site',
        baseUrl: 'https://example.com',
      },
    } as StatiConfig;

    baseSitemapConfig = {
      enabled: true,
      defaultPriority: 0.5,
      defaultChangeFreq: 'monthly',
    };

    samplePage = {
      slug: 'test-page',
      url: '/test-page',
      content: 'Test content',
      frontMatter: {
        title: 'Test Page',
      },
      sourcePath: '/site/test-page.md',
    } as PageModel;
  });

  describe('generateSitemapEntry', () => {
    it('should generate basic sitemap entry', () => {
      const entry = generateSitemapEntry(samplePage, baseConfig, baseSitemapConfig);

      expect(entry).toMatchObject({
        url: 'https://example.com/test-page',
        priority: 0.5,
        changefreq: 'monthly',
      });
    });

    it('should handle page with date frontmatter', () => {
      samplePage.frontMatter.date = '2025-01-15';

      const entry = generateSitemapEntry(samplePage, baseConfig, baseSitemapConfig);

      expect(entry).toMatchObject({
        url: 'https://example.com/test-page',
        lastmod: '2025-01-15',
      });
    });

    it('should prefer updated over date', () => {
      samplePage.frontMatter.date = '2025-01-15';
      samplePage.frontMatter.updated = '2025-02-20';

      const entry = generateSitemapEntry(samplePage, baseConfig, baseSitemapConfig);

      expect(entry?.lastmod).toBe('2025-02-20');
    });

    it('should prefer sitemap.lastmod over updated and date', () => {
      samplePage.frontMatter.date = '2025-01-15';
      samplePage.frontMatter.updated = '2025-02-20';
      samplePage.frontMatter.sitemap = { lastmod: '2025-03-25' };

      const entry = generateSitemapEntry(samplePage, baseConfig, baseSitemapConfig);

      expect(entry?.lastmod).toBe('2025-03-25');
    });

    it('should exclude page when frontmatter exclude is true', () => {
      samplePage.frontMatter.sitemap = { exclude: true };

      const entry = generateSitemapEntry(samplePage, baseConfig, baseSitemapConfig);

      expect(entry).toBeNull();
    });

    it('should exclude page matching excludePatterns (exact match)', () => {
      baseSitemapConfig.excludePatterns = ['/test-page'];

      const entry = generateSitemapEntry(samplePage, baseConfig, baseSitemapConfig);

      expect(entry).toBeNull();
    });

    it('should exclude page matching excludePatterns (glob)', () => {
      baseSitemapConfig.excludePatterns = ['/test-*'];

      const entry = generateSitemapEntry(samplePage, baseConfig, baseSitemapConfig);

      expect(entry).toBeNull();
    });

    it('should include page matching includePatterns (exact match)', () => {
      baseSitemapConfig.includePatterns = ['/test-page'];

      const entry = generateSitemapEntry(samplePage, baseConfig, baseSitemapConfig);

      expect(entry).not.toBeNull();
    });

    it('should exclude page not matching includePatterns', () => {
      baseSitemapConfig.includePatterns = ['/other-page'];

      const entry = generateSitemapEntry(samplePage, baseConfig, baseSitemapConfig);

      expect(entry).toBeNull();
    });

    it('should include page matching includePatterns (glob)', () => {
      baseSitemapConfig.includePatterns = ['/test-*'];

      const entry = generateSitemapEntry(samplePage, baseConfig, baseSitemapConfig);

      expect(entry).not.toBeNull();
    });

    it('should exclude page when filter function returns false', () => {
      baseSitemapConfig.filter = (page) => page.url !== '/test-page';

      const entry = generateSitemapEntry(samplePage, baseConfig, baseSitemapConfig);

      expect(entry).toBeNull();
    });

    it('should include page when filter function returns true', () => {
      baseSitemapConfig.filter = (page) => page.url === '/test-page';

      const entry = generateSitemapEntry(samplePage, baseConfig, baseSitemapConfig);

      expect(entry).not.toBeNull();
    });

    it('should apply transformUrl when provided', () => {
      baseSitemapConfig.transformUrl = (url) => url.replace('example.com', 'test.org');

      const entry = generateSitemapEntry(samplePage, baseConfig, baseSitemapConfig);

      expect(entry?.url).toBe('https://test.org/test-page');
    });

    it('should apply transformEntry when provided', () => {
      baseSitemapConfig.transformEntry = (entry) => ({
        ...entry,
        priority: 0.9,
      });

      const entry = generateSitemapEntry(samplePage, baseConfig, baseSitemapConfig);

      expect(entry?.priority).toBe(0.9);
    });

    it('should return null when transformEntry returns null', () => {
      baseSitemapConfig.transformEntry = () => null;

      const entry = generateSitemapEntry(samplePage, baseConfig, baseSitemapConfig);

      expect(entry).toBeNull();
    });

    it('should use priority from frontmatter', () => {
      samplePage.frontMatter.sitemap = { priority: 0.8 };

      const entry = generateSitemapEntry(samplePage, baseConfig, baseSitemapConfig);

      expect(entry?.priority).toBe(0.8);
    });

    it('should clamp priority above 1.0 to 1.0', () => {
      samplePage.frontMatter.sitemap = { priority: 1.5 };

      const entry = generateSitemapEntry(samplePage, baseConfig, baseSitemapConfig);

      expect(entry?.priority).toBe(1.0);
    });

    it('should clamp priority below 0.0 to 0.0', () => {
      samplePage.frontMatter.sitemap = { priority: -0.5 };

      const entry = generateSitemapEntry(samplePage, baseConfig, baseSitemapConfig);

      expect(entry?.priority).toBe(0.0);
    });

    it('should use changefreq from frontmatter', () => {
      samplePage.frontMatter.sitemap = { changefreq: 'daily' };

      const entry = generateSitemapEntry(samplePage, baseConfig, baseSitemapConfig);

      expect(entry?.changefreq).toBe('daily');
    });

    it('should validate changefreq and use undefined for invalid values', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      samplePage.frontMatter.sitemap = { changefreq: 'invalid' as any };

      const entry = generateSitemapEntry(samplePage, baseConfig, baseSitemapConfig);

      expect(entry?.changefreq).toBe('monthly'); // Falls back to default
    });

    it('should apply priority rules (exact match)', () => {
      baseSitemapConfig.priorityRules = [
        { pattern: '/test-page', priority: 0.9 },
        { pattern: '/other', priority: 0.3 },
      ];

      const entry = generateSitemapEntry(samplePage, baseConfig, baseSitemapConfig);

      expect(entry?.priority).toBe(0.9);
    });

    it('should apply priority rules (glob match)', () => {
      baseSitemapConfig.priorityRules = [
        { pattern: '/test-*', priority: 0.9 },
        { pattern: '/other-*', priority: 0.3 },
      ];

      const entry = generateSitemapEntry(samplePage, baseConfig, baseSitemapConfig);

      expect(entry?.priority).toBe(0.9);
    });

    it('should use first matching priority rule', () => {
      baseSitemapConfig.priorityRules = [
        { pattern: '/test-*', priority: 0.9 },
        { pattern: '/test-page', priority: 0.3 },
      ];

      const entry = generateSitemapEntry(samplePage, baseConfig, baseSitemapConfig);

      expect(entry?.priority).toBe(0.9); // First match wins
    });

    it('should NOT match root pattern "/" with all URLs using startsWith', () => {
      // This is the critical test for the bug fix
      // "/" should only match "/" exactly, not all URLs that start with "/"
      baseSitemapConfig.priorityRules = [
        { pattern: '/', priority: 1.0 },
        { pattern: '/test-*', priority: 0.5 },
      ];

      const entry = generateSitemapEntry(samplePage, baseConfig, baseSitemapConfig);

      // /test-page should NOT match "/" pattern, should match "/test-*" pattern
      expect(entry?.priority).toBe(0.5);
    });

    it('should match root pattern "/" only for homepage', () => {
      const homePage = { ...samplePage, url: '/' };
      baseSitemapConfig.priorityRules = [
        { pattern: '/', priority: 1.0 },
        { pattern: '/test-*', priority: 0.5 },
      ];

      const entry = generateSitemapEntry(homePage, baseConfig, baseSitemapConfig);

      expect(entry?.priority).toBe(1.0);
    });

    it('should match path prefix patterns with children but not root', () => {
      // Pattern "/api" should match "/api/foo" but not match "/apitest"
      const apiChildPage = { ...samplePage, url: '/api/endpoint' };
      const apiIndexPage = { ...samplePage, url: '/api' };
      const apiUnrelatedPage = { ...samplePage, url: '/apitest' };

      baseSitemapConfig.priorityRules = [{ pattern: '/api', priority: 0.8 }];
      baseSitemapConfig.defaultPriority = 0.5;

      const childEntry = generateSitemapEntry(apiChildPage, baseConfig, baseSitemapConfig);
      const indexEntry = generateSitemapEntry(apiIndexPage, baseConfig, baseSitemapConfig);
      const unrelatedEntry = generateSitemapEntry(apiUnrelatedPage, baseConfig, baseSitemapConfig);

      expect(childEntry?.priority).toBe(0.8); // Should match prefix
      expect(indexEntry?.priority).toBe(0.8); // Should match exact
      expect(unrelatedEntry?.priority).toBe(0.5); // Should NOT match, use default
    });

    it('should handle glob patterns with double asterisk correctly', () => {
      const childPage = { ...samplePage, url: '/docs/guide/intro' };
      const indexPage = { ...samplePage, url: '/docs' };

      baseSitemapConfig.priorityRules = [{ pattern: '/docs/**', priority: 0.9 }];
      baseSitemapConfig.defaultPriority = 0.5;

      const childEntry = generateSitemapEntry(childPage, baseConfig, baseSitemapConfig);
      const indexEntry = generateSitemapEntry(indexPage, baseConfig, baseSitemapConfig);

      expect(childEntry?.priority).toBe(0.9); // Matches glob
      expect(indexEntry?.priority).toBe(0.5); // Does NOT match glob, uses default
    });

    it('should apply different priorities to different sections correctly', () => {
      const pages = [
        { url: '/', expected: 1.0 },
        { url: '/getting-started/install', expected: 0.9 },
        { url: '/getting-started/quick-start', expected: 0.9 },
        { url: '/getting-started', expected: 0.7 }, // Index page doesn't match /*/**
        { url: '/core-concepts/routing', expected: 0.9 },
        { url: '/core-concepts', expected: 0.7 }, // Index page
        { url: '/api/hooks', expected: 0.8 },
        { url: '/api', expected: 0.7 }, // Index page
        { url: '/blog/post-1', expected: 0.7 }, // No matching rule
        { url: '/about', expected: 0.7 }, // No matching rule
      ];

      baseSitemapConfig.priorityRules = [
        { pattern: '/', priority: 1.0 },
        { pattern: '/getting-started/**', priority: 0.9 },
        { pattern: '/core-concepts/**', priority: 0.9 },
        { pattern: '/api/**', priority: 0.8 },
      ];
      baseSitemapConfig.defaultPriority = 0.7;

      pages.forEach(({ url, expected }) => {
        const page = { ...samplePage, url };
        const entry = generateSitemapEntry(page, baseConfig, baseSitemapConfig);
        expect(entry?.priority).toBe(expected);
      });
    });

    it('should handle single asterisk glob patterns', () => {
      // Note: In Stati's implementation, * matches any characters including slashes
      // Use specific patterns or ** for subdirectories
      const matchingPage1 = { ...samplePage, url: '/blog/my-post' };
      const matchingPage2 = { ...samplePage, url: '/blog/2024/my-post' };
      const nonMatchingPage = { ...samplePage, url: '/articles/post' };

      baseSitemapConfig.priorityRules = [{ pattern: '/blog/*', priority: 0.8 }];
      baseSitemapConfig.defaultPriority = 0.5;

      const matchingEntry1 = generateSitemapEntry(matchingPage1, baseConfig, baseSitemapConfig);
      const matchingEntry2 = generateSitemapEntry(matchingPage2, baseConfig, baseSitemapConfig);
      const nonMatchingEntry = generateSitemapEntry(nonMatchingPage, baseConfig, baseSitemapConfig);

      expect(matchingEntry1?.priority).toBe(0.8); // Matches /blog/*
      expect(matchingEntry2?.priority).toBe(0.8); // Also matches (glob * includes /)
      expect(nonMatchingEntry?.priority).toBe(0.5); // Doesn't match, different path
    });

    it('should handle question mark glob patterns', () => {
      const matchingPage = { ...samplePage, url: '/page1' };
      const nonMatchingPage = { ...samplePage, url: '/page12' };

      baseSitemapConfig.priorityRules = [{ pattern: '/page?', priority: 0.8 }];
      baseSitemapConfig.defaultPriority = 0.5;

      const matchingEntry = generateSitemapEntry(matchingPage, baseConfig, baseSitemapConfig);
      const nonMatchingEntry = generateSitemapEntry(nonMatchingPage, baseConfig, baseSitemapConfig);

      expect(matchingEntry?.priority).toBe(0.8); // Matches /page?
      expect(nonMatchingEntry?.priority).toBe(0.5); // Doesn't match, extra character
    });

    it('should handle baseUrl without trailing slash', () => {
      const customConfig = {
        ...baseConfig,
        site: {
          ...baseConfig.site,
          baseUrl: 'https://example.com',
        },
      };

      const entry = generateSitemapEntry(samplePage, customConfig, baseSitemapConfig);

      expect(entry?.url).toBe('https://example.com/test-page');
    });

    it('should handle baseUrl with trailing slash', () => {
      const customConfig = {
        ...baseConfig,
        site: {
          ...baseConfig.site,
          baseUrl: 'https://example.com/',
        },
      };

      const entry = generateSitemapEntry(samplePage, customConfig, baseSitemapConfig);

      expect(entry?.url).toBe('https://example.com/test-page');
    });

    it('should handle page URL without leading slash', () => {
      samplePage.url = 'test-page';

      const entry = generateSitemapEntry(samplePage, baseConfig, baseSitemapConfig);

      expect(entry?.url).toBe('https://example.com/test-page');
    });
  });

  describe('generateSitemapXml', () => {
    it('should generate valid XML for single entry', () => {
      const entries = [
        {
          url: 'https://example.com/page1',
          lastmod: '2025-01-15',
          changefreq: 'monthly' as const,
          priority: 0.8,
        },
      ];

      const xml = generateSitemapXml(entries);

      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
      expect(xml).toContain('<url>');
      expect(xml).toContain('<loc>https://example.com/page1</loc>');
      expect(xml).toContain('<lastmod>2025-01-15</lastmod>');
      expect(xml).toContain('<changefreq>monthly</changefreq>');
      expect(xml).toContain('<priority>0.8</priority>');
      expect(xml).toContain('</url>');
      expect(xml).toContain('</urlset>');
    });

    it('should generate XML for multiple entries', () => {
      const entries = [
        {
          url: 'https://example.com/page1',
          priority: 0.8,
        },
        {
          url: 'https://example.com/page2',
          priority: 0.6,
        },
      ];

      const xml = generateSitemapXml(entries);

      expect(xml).toContain('https://example.com/page1');
      expect(xml).toContain('https://example.com/page2');
      expect(xml.match(/<url>/g)).toHaveLength(2);
    });

    it('should escape XML special characters in URLs', () => {
      const entries = [
        {
          url: 'https://example.com/page?param=value&other=<test>',
        },
      ];

      const xml = generateSitemapXml(entries);

      expect(xml).toContain('&amp;');
      expect(xml).toContain('&lt;');
      expect(xml).toContain('&gt;');
      expect(xml).not.toContain('<test>'); // Should be escaped
    });

    it('should handle entry with only url (minimal)', () => {
      const entries = [
        {
          url: 'https://example.com/page1',
        },
      ];

      const xml = generateSitemapXml(entries);

      expect(xml).toContain('<loc>https://example.com/page1</loc>');
      expect(xml).not.toContain('<lastmod>');
      expect(xml).not.toContain('<changefreq>');
      expect(xml).not.toContain('<priority>');
    });

    it('should format priority with one decimal place', () => {
      const entries = [
        {
          url: 'https://example.com/page1',
          priority: 0.85,
        },
      ];

      const xml = generateSitemapXml(entries);

      expect(xml).toContain('<priority>0.8</priority>'); // Formatted to 1 decimal
    });

    it('should handle empty entries array', () => {
      const xml = generateSitemapXml([]);

      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
      expect(xml).toContain('</urlset>');
      expect(xml).not.toContain('<url>');
    });
  });

  describe('generateSitemapIndexXml', () => {
    it('should generate valid sitemap index XML', () => {
      const sitemapUrls = ['/sitemap-1.xml', '/sitemap-2.xml'];
      const siteUrl = 'https://example.com';

      const xml = generateSitemapIndexXml(sitemapUrls, siteUrl);

      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain('<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
      expect(xml).toContain('<sitemap>');
      expect(xml).toContain('<loc>https://example.com/sitemap-1.xml</loc>');
      expect(xml).toContain('<loc>https://example.com/sitemap-2.xml</loc>');
      expect(xml).toContain('</sitemap>');
      expect(xml).toContain('</sitemapindex>');
    });

    it('should handle relative sitemap URLs', () => {
      const sitemapUrls = ['/sitemap-1.xml'];
      const siteUrl = 'https://example.com';

      const xml = generateSitemapIndexXml(sitemapUrls, siteUrl);

      expect(xml).toContain('https://example.com/sitemap-1.xml');
    });

    it('should handle absolute sitemap URLs', () => {
      const sitemapUrls = ['https://cdn.example.com/sitemap-1.xml'];
      const siteUrl = 'https://example.com';

      const xml = generateSitemapIndexXml(sitemapUrls, siteUrl);

      expect(xml).toContain('https://cdn.example.com/sitemap-1.xml');
    });

    it('should escape XML special characters in sitemap URLs', () => {
      const sitemapUrls = ['/sitemap?version=1&type=main'];
      const siteUrl = 'https://example.com';

      const xml = generateSitemapIndexXml(sitemapUrls, siteUrl);

      expect(xml).toContain('&amp;');
      expect(xml).not.toContain('&type'); // Should be &amp;type
    });
  });

  describe('generateSitemap', () => {
    it('should generate sitemap for single page', () => {
      const pages = [samplePage];

      const result = generateSitemap(pages, baseConfig, baseSitemapConfig);

      expect(result.entryCount).toBe(1);
      expect(result.xml).toContain('https://example.com/test-page');
      expect(result.sizeInBytes).toBeGreaterThan(0);
    });

    it('should generate sitemap for multiple pages', () => {
      const pages = [
        { ...samplePage, url: '/page1' },
        { ...samplePage, url: '/page2' },
        { ...samplePage, url: '/page3' },
      ];

      const result = generateSitemap(pages, baseConfig, baseSitemapConfig);

      expect(result.entryCount).toBe(3);
      expect(result.xml).toContain('page1');
      expect(result.xml).toContain('page2');
      expect(result.xml).toContain('page3');
    });

    it('should filter out excluded pages', () => {
      const pages = [
        { ...samplePage, url: '/page1' },
        {
          ...samplePage,
          url: '/page2',
          frontMatter: { ...samplePage.frontMatter, sitemap: { exclude: true } },
        },
        { ...samplePage, url: '/page3' },
      ];

      const result = generateSitemap(pages, baseConfig, baseSitemapConfig);

      expect(result.entryCount).toBe(2);
      expect(result.xml).toContain('page1');
      expect(result.xml).not.toContain('page2');
      expect(result.xml).toContain('page3');
    });

    it('should handle large number of pages (< 50k)', () => {
      // Create 1000 test pages
      const pages = Array.from({ length: 1000 }, (_, i) => ({
        ...samplePage,
        url: `/page-${i}`,
      }));

      const result = generateSitemap(pages, baseConfig, baseSitemapConfig);

      expect(result.entryCount).toBe(1000);
      expect(result.sitemaps).toBeUndefined(); // Single sitemap
      expect(result.xml).toContain('<?xml version="1.0"');
    });

    it('should split into multiple sitemaps when exceeding 50k entries', () => {
      // Create 60k test pages
      const pages = Array.from({ length: 60000 }, (_, i) => ({
        ...samplePage,
        url: `/page-${i}`,
      }));

      const result = generateSitemap(pages, baseConfig, baseSitemapConfig);

      expect(result.entryCount).toBe(60000);
      expect(result.sitemaps).toBeDefined();
      expect(result.sitemaps?.length).toBe(2); // 50k + 10k
      expect(result.xml).toContain('<sitemapindex'); // Index file
    });

    it('should calculate size correctly', () => {
      const pages = [samplePage];

      const result = generateSitemap(pages, baseConfig, baseSitemapConfig);

      const expectedSize = Buffer.byteLength(result.xml, 'utf8');
      expect(result.sizeInBytes).toBe(expectedSize);
    });

    it('should handle empty pages array', () => {
      const result = generateSitemap([], baseConfig, baseSitemapConfig);

      expect(result.entryCount).toBe(0);
      expect(result.xml).toContain('<?xml version="1.0"');
      expect(result.xml).toContain('</urlset>');
    });

    it('should respect filter function across all pages', () => {
      baseSitemapConfig.filter = (page) => page.url.includes('keep');

      const pages = [
        { ...samplePage, url: '/keep-this' },
        { ...samplePage, url: '/remove-this' },
        { ...samplePage, url: '/keep-that' },
      ];

      const result = generateSitemap(pages, baseConfig, baseSitemapConfig);

      expect(result.entryCount).toBe(2);
      expect(result.xml).toContain('keep-this');
      expect(result.xml).toContain('keep-that');
      expect(result.xml).not.toContain('remove-this');
    });

    it('should respect excludePatterns across all pages', () => {
      baseSitemapConfig.excludePatterns = ['/admin/*', '/draft-*'];

      const pages = [
        { ...samplePage, url: '/page1' },
        { ...samplePage, url: '/admin/dashboard' },
        { ...samplePage, url: '/draft-article' },
        { ...samplePage, url: '/page2' },
      ];

      const result = generateSitemap(pages, baseConfig, baseSitemapConfig);

      expect(result.entryCount).toBe(2);
      expect(result.xml).toContain('page1');
      expect(result.xml).toContain('page2');
      expect(result.xml).not.toContain('admin');
      expect(result.xml).not.toContain('draft');
    });

    it('should respect includePatterns across all pages', () => {
      baseSitemapConfig.includePatterns = ['/blog/*', '/docs/*'];

      const pages = [
        { ...samplePage, url: '/blog/post1' },
        { ...samplePage, url: '/about' },
        { ...samplePage, url: '/docs/guide' },
        { ...samplePage, url: '/contact' },
      ];

      const result = generateSitemap(pages, baseConfig, baseSitemapConfig);

      expect(result.entryCount).toBe(2);
      expect(result.xml).toContain('blog/post1');
      expect(result.xml).toContain('docs/guide');
      expect(result.xml).not.toContain('about');
      expect(result.xml).not.toContain('contact');
    });
  });
});
