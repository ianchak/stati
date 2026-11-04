/**
 * Sitemap generation tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  generateSitemapEntry,
  generateSitemapXml,
  generateSitemapIndexXml,
  generateSitemap,
} from '../../src/seo/sitemap.js';
import type { PageModel } from '../../src/types/content.js';
import type { StatiConfig } from '../../src/types/config.js';
import type { SitemapConfig, SitemapEntry } from '../../src/types/sitemap.js';
import type { Logger } from '../../src/types/logging.js';

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

    it('skips an invalid updated and warns, falling through to a valid date', () => {
      samplePage.frontMatter.date = '2025-01-15';
      samplePage.frontMatter.updated = 'soon';
      const warn = vi.fn();
      const logger = { warning: warn } as unknown as Logger;
      const holder: { entry: SitemapEntry | null } = { entry: null };

      expect(() => {
        holder.entry = generateSitemapEntry(samplePage, baseConfig, baseSitemapConfig, logger);
      }).not.toThrow();

      expect(holder.entry?.lastmod).toBe('2025-01-15');
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn.mock.calls[0]?.[0]).toContain('/test-page');
      expect(warn.mock.calls[0]?.[0]).toContain('updated');
      expect(warn.mock.calls[0]?.[0]).toContain('soon');
    });

    it('should leave lastmod out and warn when sitemap.lastmod is not a valid date', () => {
      samplePage.frontMatter.sitemap = { lastmod: 'next week' };
      const warn = vi.fn();
      const logger = { warning: warn } as unknown as Logger;

      const entry = generateSitemapEntry(samplePage, baseConfig, baseSitemapConfig, logger);
      expect(entry).not.toHaveProperty('lastmod');
      expect(warn.mock.calls[0]?.[0]).toContain('sitemap.lastmod');
    });

    it('should leave lastmod out and warn when date is not a valid date', () => {
      samplePage.frontMatter.date = 'soon';
      const warn = vi.fn();
      const logger = { warning: warn } as unknown as Logger;

      const entry = generateSitemapEntry(samplePage, baseConfig, baseSitemapConfig, logger);
      expect(entry).not.toHaveProperty('lastmod');
      expect(warn).toHaveBeenCalled();
    });

    it('keeps the moment of a date-time with a time zone instead of its UTC date', () => {
      samplePage.frontMatter.updated = '2024-03-04T23:30:00-05:00';

      const entry = generateSitemapEntry(samplePage, baseConfig, baseSitemapConfig);

      expect(entry?.lastmod).toBe('2024-03-05T04:30:00Z');
    });

    it('writes a date-time as UTC, with fractional seconds only when there are any', () => {
      samplePage.frontMatter.updated = '2024-03-04 10:15';
      expect(generateSitemapEntry(samplePage, baseConfig, baseSitemapConfig)?.lastmod).toBe(
        '2024-03-04T10:15:00Z',
      );

      delete samplePage.frontMatter.updated;
      samplePage.frontMatter.date = new Date('2024-03-04T10:15:30.250+02:00');
      expect(generateSitemapEntry(samplePage, baseConfig, baseSitemapConfig)?.lastmod).toBe(
        '2024-03-04T08:15:30.250Z',
      );
    });

    it('writes a date without a time, or at midnight UTC, as YYYY-MM-DD', () => {
      // An unquoted YAML date is a Date at midnight UTC
      samplePage.frontMatter.date = new Date(Date.UTC(2025, 0, 15));
      expect(generateSitemapEntry(samplePage, baseConfig, baseSitemapConfig)?.lastmod).toBe(
        '2025-01-15',
      );

      samplePage.frontMatter.updated = '2025-01-15T00:00:00Z';
      expect(generateSitemapEntry(samplePage, baseConfig, baseSitemapConfig)?.lastmod).toBe(
        '2025-01-15',
      );
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

    it('accepts a changefreq in any letter case', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      samplePage.frontMatter.sitemap = { changefreq: 'Weekly' as any };
      expect(generateSitemapEntry(samplePage, baseConfig, baseSitemapConfig)?.changefreq).toBe(
        'weekly',
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      samplePage.frontMatter.sitemap = { changefreq: 'DAILY' as any };
      expect(generateSitemapEntry(samplePage, baseConfig, baseSitemapConfig)?.changefreq).toBe(
        'daily',
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      samplePage.frontMatter.sitemap = { changefreq: ' Yearly ' as any };
      expect(generateSitemapEntry(samplePage, baseConfig, baseSitemapConfig)?.changefreq).toBe(
        'yearly',
      );
    });

    it('falls back to the default for a changefreq that is not a string', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      samplePage.frontMatter.sitemap = { changefreq: 7 as any };

      const entry = generateSitemapEntry(samplePage, baseConfig, baseSitemapConfig);

      expect(entry?.changefreq).toBe('monthly');
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
      // Single * matches within a path segment (not across slashes)
      // Use ** for matching across subdirectories
      const matchingPage1 = { ...samplePage, url: '/blog/my-post' };
      const matchingPage2 = { ...samplePage, url: '/blog/another' };
      const nonMatchingPage1 = { ...samplePage, url: '/blog/2024/my-post' }; // Has subdirectory
      const nonMatchingPage2 = { ...samplePage, url: '/articles/post' };

      baseSitemapConfig.priorityRules = [{ pattern: '/blog/*', priority: 0.8 }];
      baseSitemapConfig.defaultPriority = 0.5;

      const matchingEntry1 = generateSitemapEntry(matchingPage1, baseConfig, baseSitemapConfig);
      const matchingEntry2 = generateSitemapEntry(matchingPage2, baseConfig, baseSitemapConfig);
      const nonMatchingEntry1 = generateSitemapEntry(
        nonMatchingPage1,
        baseConfig,
        baseSitemapConfig,
      );
      const nonMatchingEntry2 = generateSitemapEntry(
        nonMatchingPage2,
        baseConfig,
        baseSitemapConfig,
      );

      expect(matchingEntry1?.priority).toBe(0.8); // Matches /blog/*
      expect(matchingEntry2?.priority).toBe(0.8); // Matches /blog/*
      expect(nonMatchingEntry1?.priority).toBe(0.5); // Doesn't match (has subdirectory)
      expect(nonMatchingEntry2?.priority).toBe(0.5); // Doesn't match, different path
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

    describe('404 page and noindex pages', () => {
      const entryFor = (url: string, frontMatter: PageModel['frontMatter'] = {}) =>
        generateSitemapEntry({ ...samplePage, url, frontMatter }, baseConfig, baseSitemapConfig);

      it('leaves out the 404 page at /404 and /404/', () => {
        expect(entryFor('/404')).toBeNull();
        expect(entryFor('/404/')).toBeNull();
      });

      it('keeps pages that are not the root 404 page', () => {
        expect(entryFor('/docs/404')?.url).toBe('https://example.com/docs/404');
        expect(entryFor('/4040')?.url).toBe('https://example.com/4040');
        expect(entryFor('/404-errors')?.url).toBe('https://example.com/404-errors');
      });

      it('keeps the 404 page when front matter sets sitemap.exclude: false', () => {
        expect(entryFor('/404', { sitemap: { exclude: false } })?.url).toBe(
          'https://example.com/404',
        );
      });

      it('leaves out pages marked noindex', () => {
        expect(entryFor('/a', { seo: { noindex: true } })).toBeNull();
        expect(entryFor('/a', { seo: { robots: 'noindex, follow' } })).toBeNull();
        expect(entryFor('/a', { seo: { robots: 'NOINDEX,nofollow' } })).toBeNull();
        expect(entryFor('/a', { seo: { robots: 'none' } })).toBeNull();
        expect(entryFor('/a', { seo: { robots: 'noindex nofollow' } })).toBeNull();
        expect(entryFor('/a', { seo: { robots: { index: false } } })).toBeNull();
      });

      it('keeps pages whose robots directives allow indexing', () => {
        expect(entryFor('/a', { seo: { noindex: false } })).not.toBeNull();
        expect(entryFor('/a', { seo: { robots: 'nofollow, noarchive' } })).not.toBeNull();
        expect(entryFor('/a', { seo: { robots: 'max-image-preview:none' } })).not.toBeNull();
        expect(entryFor('/a', { seo: { robots: 'max-image-preview: none' } })).not.toBeNull();
        expect(entryFor('/a', { seo: { robots: { index: true, follow: false } } })).not.toBeNull();
        expect(entryFor('/a', { seo: 'invalid' as never })).not.toBeNull();
      });

      it('keeps a noindex page when front matter sets sitemap.exclude: false', () => {
        expect(
          entryFor('/a', { seo: { noindex: true }, sitemap: { exclude: false } }),
        ).not.toBeNull();
      });

      it('still applies the exclude patterns to a page kept in with sitemap.exclude: false', () => {
        baseSitemapConfig.excludePatterns = ['/404'];
        expect(entryFor('/404', { sitemap: { exclude: false } })).toBeNull();
      });
    });

    // Sitemap patterns match by prefix, unlike search.exclude and the other URL patterns
    describe('pattern rule', () => {
      const entryFor = (url: string) =>
        generateSitemapEntry({ ...samplePage, url }, baseConfig, baseSitemapConfig);

      it('excludePatterns: a pattern without wildcards also leaves out the URLs below it', () => {
        baseSitemapConfig.excludePatterns = ['/blog'];

        expect(entryFor('/blog')).toBeNull();
        expect(entryFor('/blog/post')).toBeNull();
        expect(entryFor('/blogroll')).not.toBeNull();
      });

      it('includePatterns: a pattern without wildcards also keeps the URLs below it', () => {
        baseSitemapConfig.includePatterns = ['/blog'];

        expect(entryFor('/blog/post')).not.toBeNull();
        expect(entryFor('/about')).toBeNull();
      });

      it('priorityRules: a pattern without wildcards also applies to the URLs below it', () => {
        baseSitemapConfig.priorityRules = [{ pattern: '/blog', priority: 0.9 }];

        expect(entryFor('/blog/post')?.priority).toBe(0.9);
        expect(entryFor('/blogroll')?.priority).toBe(0.5);
      });

      it('skips a pattern that is not a valid glob with a warning, instead of throwing', () => {
        baseSitemapConfig.excludePatterns = ['/drafts/[x*', '/private'];
        const warning = vi.fn();
        const logger = { warning } as unknown as Logger;

        const kept = generateSitemapEntry(
          { ...samplePage, url: '/drafts/[x-1' },
          baseConfig,
          baseSitemapConfig,
          logger,
        );
        const left = generateSitemapEntry(
          { ...samplePage, url: '/private/a' },
          baseConfig,
          baseSitemapConfig,
          logger,
        );

        expect(kept).not.toBeNull();
        expect(left).toBeNull();
        expect(warning).toHaveBeenCalledWith(
          'Ignoring invalid pattern "/drafts/[x*" in sitemap.excludePatterns: Unclosed character class at position 8',
        );
      });
    });

    describe('lastmod from the publish date', () => {
      it('uses the page publish date when there is no sitemap.lastmod or updated', () => {
        const entry = generateSitemapEntry(
          {
            ...samplePage,
            frontMatter: { publishedAt: '2025-03-01' },
            publishedAt: new Date('2025-03-01'),
          },
          baseConfig,
          baseSitemapConfig,
        );

        expect(entry?.lastmod).toBe('2025-03-01');
      });

      it('takes the publish date the page was loaded with over a later date field', () => {
        const entry = generateSitemapEntry(
          {
            ...samplePage,
            frontMatter: { publishedAt: '2025-03-01', date: '2025-04-01' },
            publishedAt: new Date('2025-03-01'),
          },
          baseConfig,
          baseSitemapConfig,
        );

        expect(entry?.lastmod).toBe('2025-03-01');
      });

      it('reads the publish date from front matter for a page without publishedAt', () => {
        samplePage.frontMatter.published = '2025-05-01';

        const entry = generateSitemapEntry(samplePage, baseConfig, baseSitemapConfig);

        expect(entry?.lastmod).toBe('2025-05-01');
      });

      it('still prefers updated over the publish date', () => {
        const entry = generateSitemapEntry(
          {
            ...samplePage,
            frontMatter: { updated: '2025-06-01' },
            publishedAt: new Date('2025-03-01'),
          },
          baseConfig,
          baseSitemapConfig,
        );

        expect(entry?.lastmod).toBe('2025-06-01');
      });
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

      // `<` and `>` cannot be in a URI, so they are percent-encoded; `&` is XML-escaped
      expect(xml).toContain('<loc>https://example.com/page?param=value&amp;other=%3Ctest%3E</loc>');
      expect(xml).not.toContain('<test>');
    });

    it('percent-encodes spaces and non-ASCII letters in URLs', () => {
      const xml = generateSitemapXml([
        { url: 'https://example.com/My Post' },
        { url: 'https://example.com/café?q=ü#ő' },
      ]);

      expect(xml).toContain('<loc>https://example.com/My%20Post</loc>');
      expect(xml).toContain('<loc>https://example.com/caf%C3%A9?q=%C3%BC#%C5%91</loc>');
    });

    it('keeps escapes a URL already has, and encodes a % that starts none', () => {
      const xml = generateSitemapXml([
        { url: 'https://example.com/caf%C3%A9' },
        { url: 'https://example.com/100%' },
      ]);

      expect(xml).toContain('<loc>https://example.com/caf%C3%A9</loc>');
      expect(xml).toContain('<loc>https://example.com/100%25</loc>');
    });

    it('writes an internationalized host in its xn-- form', () => {
      const xml = generateSitemapXml([{ url: 'https://bücher.example/über' }]);

      expect(xml).toContain('<loc>https://xn--bcher-kva.example/%C3%BCber</loc>');
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

    it('percent-encodes sitemap URLs under a base path with spaces or non-ASCII letters', () => {
      const xml = generateSitemapIndexXml(['/sitemap-1.xml'], 'https://example.com/my café');

      expect(xml).toContain('<loc>https://example.com/my%20caf%C3%A9/sitemap-1.xml</loc>');
    });
  });

  describe('generateSitemap', () => {
    it('warns once about an invalid pattern, not once per page', () => {
      baseSitemapConfig.excludePatterns = ['/drafts/[x*'];
      baseSitemapConfig.priorityRules = [{ pattern: '/docs/[y?', priority: 0.9 }];
      const warning = vi.fn();
      const logger = { warning } as unknown as Logger;
      const pages = ['/a', '/b', '/c'].map((url) => ({ ...samplePage, url }));

      const result = generateSitemap(pages, baseConfig, baseSitemapConfig, logger);

      expect(result.entryCount).toBe(3);
      expect(warning).toHaveBeenCalledTimes(2);
      expect(warning).toHaveBeenCalledWith(
        expect.stringContaining('"/docs/[y?" in sitemap.priorityRules'),
      );
    });

    it('should generate sitemap for single page', () => {
      const pages = [samplePage];

      const result = generateSitemap(pages, baseConfig, baseSitemapConfig);

      expect(result.entryCount).toBe(1);
      expect(result.xml).toContain('https://example.com/test-page');
      expect(result.sizeInBytes).toBeGreaterThan(0);
    });

    it('percent-encodes page URLs made from file names with spaces or non-ASCII letters', () => {
      const pages = [
        { ...samplePage, url: '/blog/My Post' },
        { ...samplePage, url: '/blog/árvíztűrő' },
      ];

      const result = generateSitemap(pages, baseConfig, baseSitemapConfig);

      expect(result.xml).toContain('<loc>https://example.com/blog/My%20Post</loc>');
      expect(result.xml).toContain(
        '<loc>https://example.com/blog/%C3%A1rv%C3%ADzt%C5%B1r%C5%91</loc>',
      );
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
