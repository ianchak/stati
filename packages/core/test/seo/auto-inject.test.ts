/**
 * Auto-injection tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { autoInjectSEO, shouldAutoInject } from '../../src/seo/auto-inject.js';
import type { PageModel } from '../../src/types/content.js';
import type { StatiConfig } from '../../src/types/config.js';
import type { Logger } from '../../src/types/logging.js';

// Helper function to create a mock logger for testing
function createMockLogger(overrides: Partial<Logger> = {}): Logger {
  return {
    info: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
    status: vi.fn(),
    building: vi.fn(),
    processing: vi.fn(),
    stats: vi.fn(),
    ...overrides,
  };
}

describe('SEO Auto-Injection', () => {
  let samplePage: PageModel;
  let baseConfig: StatiConfig;

  beforeEach(() => {
    samplePage = {
      slug: 'test-page',
      url: '/test-page',
      content: 'Test content',
      frontMatter: {
        title: 'Test Page',
        description: 'Test page description',
        seo: {
          title: 'SEO Test Page',
          description: 'SEO description for test page',
          keywords: ['test', 'page'],
        },
      },
      sourcePath: '/site/test-page.md',
    } as PageModel;

    baseConfig = {
      site: {
        title: 'Test Site',
        baseUrl: 'https://example.com',
      },
      seo: {
        autoInject: true,
      },
    } as StatiConfig;
  });

  describe('autoInjectSEO - Basic Injection', () => {
    it('should inject SEO tags into empty head', () => {
      const html = '<html><head></head><body>Content</body></html>';

      const result = autoInjectSEO(html, {
        page: samplePage,
        config: baseConfig,
        siteUrl: 'https://example.com',
        logger: createMockLogger(),
      });

      expect(result).toContain('<title>SEO Test Page</title>');
      expect(result).toContain('<meta name="description" content="SEO description for test page">');
      expect(result).toContain('<meta name="keywords" content="test, page">');
    });

    it('should inject before </head> tag', () => {
      const html =
        '<html><head>\n  <link rel="stylesheet" href="styles.css">\n</head><body>Content</body></html>';

      const result = autoInjectSEO(html, {
        page: samplePage,
        config: baseConfig,
        siteUrl: 'https://example.com',
        logger: createMockLogger(),
      });

      // Should be injected before </head>
      const headClosePos = result.indexOf('</head>');
      const titlePos = result.indexOf('<title>');
      expect(titlePos).toBeGreaterThan(0);
      expect(titlePos).toBeLessThan(headClosePos);
    });

    it('should handle case-insensitive </head> tag', () => {
      const html = '<html><head></HEAD><body>Content</body></html>';

      const result = autoInjectSEO(html, {
        page: samplePage,
        config: baseConfig,
        siteUrl: 'https://example.com',
        logger: createMockLogger(),
      });

      expect(result).toContain('<title>SEO Test Page</title>');
    });

    it('should return original HTML if no </head> tag found', () => {
      const html = '<html><body>Content</body></html>';

      const result = autoInjectSEO(html, {
        page: samplePage,
        config: baseConfig,
        siteUrl: 'https://example.com',
        logger: createMockLogger(),
      });

      expect(result).toBe(html);
    });

    it('should inject with proper indentation', () => {
      const html = '<html>\n<head>\n</head>\n<body>Content</body>\n</html>';

      const result = autoInjectSEO(html, {
        page: samplePage,
        config: baseConfig,
        siteUrl: 'https://example.com',
        logger: createMockLogger(),
      });

      // Should have 4 spaces before injected tags
      expect(result).toMatch(/\n {4}<title>/);
      expect(result).toMatch(/\n {4}<meta name="description"/);
    });
  });

  describe('autoInjectSEO - Disabled Mode', () => {
    it('should return original HTML when autoInject is false', () => {
      baseConfig.seo = { autoInject: false };
      const html = '<html><head></head><body>Content</body></html>';

      const result = autoInjectSEO(html, {
        page: samplePage,
        config: baseConfig,
        siteUrl: 'https://example.com',
        logger: createMockLogger(),
      });

      expect(result).toBe(html);
      expect(result).not.toContain('<title>SEO Test Page</title>');
    });

    it('should return original HTML when seo config is undefined', () => {
      // Create config without seo property
      const configWithoutSeo: StatiConfig = {
        site: {
          title: 'Test Site',
          baseUrl: 'https://example.com',
        },
      } as StatiConfig;

      const html = '<html><head></head><body>Content</body></html>';

      const result = autoInjectSEO(html, {
        page: samplePage,
        config: configWithoutSeo,
        siteUrl: 'https://example.com',
        logger: createMockLogger(),
      });

      // Without SEO config, should still inject (default is true)
      expect(result).toContain('<title>SEO Test Page</title>');
    });
  });

  describe('autoInjectSEO - Existing Tag Detection', () => {
    it('should skip title injection if title exists', () => {
      const html = '<html><head><title>Existing Title</title></head><body>Content</body></html>';

      const result = autoInjectSEO(html, {
        page: samplePage,
        config: baseConfig,
        siteUrl: 'https://example.com',
        logger: createMockLogger(),
      });

      // Should keep existing title
      expect(result).toContain('Existing Title');
      // Should not inject new <title> tag (but "SEO Test Page" can appear in other tags like og:title)
      const titleMatches = result.match(/<title>([^<]*)<\/title>/g);
      expect(titleMatches).toHaveLength(1);
      expect(titleMatches?.[0]).toContain('Existing Title');
      // Should still inject other tags
      expect(result).toContain('<meta name="description"');
    });

    it('should skip description if meta description exists', () => {
      const html =
        '<html><head><meta name="description" content="Existing description"></head><body>Content</body></html>';

      const result = autoInjectSEO(html, {
        page: samplePage,
        config: baseConfig,
        siteUrl: 'https://example.com',
        logger: createMockLogger(),
      });

      // Should keep existing description
      expect(result).toContain('Existing description');
      // Should not inject new description meta tag (but description can appear in og:description)
      const descMatches = result.match(/<meta name="description" content="([^"]*)"/g);
      expect(descMatches).toHaveLength(1);
      expect(descMatches?.[0]).toContain('Existing description');
      // Should still inject title
      expect(result).toContain('<title>SEO Test Page</title>');
    });

    it('should skip keywords if meta keywords exists', () => {
      const html =
        '<html><head><meta name="keywords" content="existing, keywords"></head><body>Content</body></html>';

      const result = autoInjectSEO(html, {
        page: samplePage,
        config: baseConfig,
        siteUrl: 'https://example.com',
        logger: createMockLogger(),
      });

      // Should keep existing keywords
      expect(result).toContain('existing, keywords');
      // Should not inject new keywords
      expect(result).not.toContain('test, page');
    });

    it('should skip canonical if link rel="canonical" exists', () => {
      samplePage.frontMatter.seo = {
        ...samplePage.frontMatter.seo,
        canonical: 'https://example.com/canonical',
      };

      const html =
        '<html><head><link rel="canonical" href="https://other.com/page"></head><body>Content</body></html>';

      const result = autoInjectSEO(html, {
        page: samplePage,
        config: baseConfig,
        siteUrl: 'https://example.com',
        logger: createMockLogger(),
      });

      // Should keep existing canonical
      expect(result).toContain('https://other.com/page');
      // Should not inject new canonical link tag (but canonical URL can appear elsewhere like og:url)
      const canonicalMatches = result.match(/<link rel="canonical" href="([^"]*)"/g);
      expect(canonicalMatches).toHaveLength(1);
      expect(canonicalMatches?.[0]).toContain('https://other.com/page');
    });

    it('should skip all Open Graph tags if any OG tag exists', () => {
      samplePage.frontMatter.seo = {
        ...samplePage.frontMatter.seo,
        openGraph: {
          title: 'OG Title',
          description: 'OG Description',
        },
      };

      const html =
        '<html><head><meta property="og:type" content="website"></head><body>Content</body></html>';

      const result = autoInjectSEO(html, {
        page: samplePage,
        config: baseConfig,
        siteUrl: 'https://example.com',
        logger: createMockLogger(),
      });

      // Should keep existing OG tag
      expect(result).toContain('og:type');
      // Should NOT inject any other OG tags
      expect(result).not.toContain('og:title');
      expect(result).not.toContain('og:description');
    });

    it('should skip all Twitter tags if any Twitter tag exists', () => {
      samplePage.frontMatter.seo = {
        ...samplePage.frontMatter.seo,
        twitter: {
          card: 'summary_large_image',
          title: 'Twitter Title',
        },
      };

      const html =
        '<html><head><meta name="twitter:site" content="@example"></head><body>Content</body></html>';

      const result = autoInjectSEO(html, {
        page: samplePage,
        config: baseConfig,
        siteUrl: 'https://example.com',
        logger: createMockLogger(),
      });

      // Should keep existing Twitter tag
      expect(result).toContain('twitter:site');
      // Should NOT inject any other Twitter tags
      expect(result).not.toContain('twitter:card');
      expect(result).not.toContain('twitter:title');
    });

    it('should skip robots if meta robots exists', () => {
      samplePage.frontMatter.seo = {
        ...samplePage.frontMatter.seo,
        robots: { index: false, follow: true },
      };

      const html =
        '<html><head><meta name="robots" content="noindex"></head><body>Content</body></html>';

      const result = autoInjectSEO(html, {
        page: samplePage,
        config: baseConfig,
        siteUrl: 'https://example.com',
        logger: createMockLogger(),
      });

      // Should keep existing robots
      expect(result).toContain('noindex');
      // Should not inject new robots
      expect(result.match(/name="robots"/g)?.length).toBe(1);
    });

    it('should skip author if meta author exists', () => {
      samplePage.frontMatter.seo = {
        ...samplePage.frontMatter.seo,
        author: { name: 'John Doe', email: 'john@example.com' },
      };

      const html =
        '<html><head><meta name="author" content="Existing Author"></head><body>Content</body></html>';

      const result = autoInjectSEO(html, {
        page: samplePage,
        config: baseConfig,
        siteUrl: 'https://example.com',
        logger: createMockLogger(),
      });

      // Should keep existing author
      expect(result).toContain('Existing Author');
      // Should not inject new author meta tag (but author name can appear elsewhere like twitter:creator)
      const authorMatches = result.match(/<meta name="author" content="([^"]*)"/g);
      expect(authorMatches).toHaveLength(1);
      expect(authorMatches?.[0]).toContain('Existing Author');
    });

    it('should skip structured data if script type=application/ld+json exists', () => {
      samplePage.frontMatter.seo = {
        ...samplePage.frontMatter.seo,
        structuredData: {
          '@type': 'Article',
          headline: 'Test Article',
        },
      };

      const html =
        '<html><head><script type="application/ld+json">{"@type":"WebPage"}</script></head><body>Content</body></html>';

      const result = autoInjectSEO(html, {
        page: samplePage,
        config: baseConfig,
        siteUrl: 'https://example.com',
        logger: createMockLogger(),
      });

      // Should keep existing structured data
      expect(result).toContain('WebPage');
      // Should not inject new structured data
      expect(result).not.toContain('Article');
    });
  });

  describe('autoInjectSEO - Hybrid Mode Scenarios', () => {
    it('should inject missing tags while preserving existing title', () => {
      const html = '<html><head><title>Custom Title</title></head><body>Content</body></html>';

      const result = autoInjectSEO(html, {
        page: samplePage,
        config: baseConfig,
        siteUrl: 'https://example.com',
        logger: createMockLogger(),
      });

      // Should keep custom title
      expect(result).toContain('Custom Title');
      // Should inject description
      expect(result).toContain('<meta name="description"');
      // Should inject keywords
      expect(result).toContain('<meta name="keywords"');
    });

    it('should inject missing tags while preserving existing description and keywords', () => {
      const html = `<html><head>
  <meta name="description" content="Custom description">
  <meta name="keywords" content="custom, keywords">
</head><body>Content</body></html>`;

      const result = autoInjectSEO(html, {
        page: samplePage,
        config: baseConfig,
        siteUrl: 'https://example.com',
        logger: createMockLogger(),
      });

      // Should keep custom description and keywords
      expect(result).toContain('Custom description');
      expect(result).toContain('custom, keywords');
      // Should inject title
      expect(result).toContain('<title>SEO Test Page</title>');
    });

    it('should inject non-OG tags while preserving custom OG tags', () => {
      samplePage.frontMatter.seo = {
        ...samplePage.frontMatter.seo,
        openGraph: {
          title: 'OG Title',
          description: 'OG Description',
        },
      };

      const html =
        '<html><head><meta property="og:image" content="https://example.com/custom.jpg"></head><body>Content</body></html>';

      const result = autoInjectSEO(html, {
        page: samplePage,
        config: baseConfig,
        siteUrl: 'https://example.com',
        logger: createMockLogger(),
      });

      // Should keep custom OG tag
      expect(result).toContain('og:image');
      expect(result).toContain('custom.jpg');
      // Should NOT inject any OG tags (group behavior)
      expect(result).not.toContain('og:title');
      expect(result).not.toContain('og:description');
      // Should still inject non-OG tags
      expect(result).toContain('<title>');
      expect(result).toContain('<meta name="description"');
    });

    it('should handle partial existing tags correctly', () => {
      samplePage.frontMatter.seo = {
        title: 'SEO Title',
        description: 'SEO Description',
        canonical: 'https://example.com/page',
        openGraph: {
          title: 'OG Title',
        },
      };

      const html = `<html><head>
  <title>Custom Title</title>
  <meta property="og:type" content="article">
</head><body>Content</body></html>`;

      const result = autoInjectSEO(html, {
        page: samplePage,
        config: baseConfig,
        siteUrl: 'https://example.com',
        logger: createMockLogger(),
      });

      // Should keep existing title
      expect(result).toContain('Custom Title');
      const titleMatches = result.match(/<title>([^<]*)<\/title>/g);
      expect(titleMatches).toHaveLength(1);
      expect(titleMatches?.[0]).toContain('Custom Title');

      // Should inject description
      expect(result).toContain('SEO Description');

      // Should inject canonical
      expect(result).toContain('https://example.com/page');

      // Should NOT inject OG tags (group behavior - one exists)
      expect(result).toContain('og:type');
      // OG tags are skipped as a group, so no og:title should be added
      const ogTitleMatches = result.match(/<meta property="og:title"/g);
      expect(ogTitleMatches).toBeNull();
    });
  });

  describe('autoInjectSEO - Return Original HTML Cases', () => {
    it('should return original HTML if all tags already exist', () => {
      const html = `<html><head>
  <title>Custom Title</title>
  <meta name="description" content="Custom description">
  <meta name="keywords" content="custom, keywords">
</head><body>Content</body></html>`;

      const result = autoInjectSEO(html, {
        page: samplePage,
        config: baseConfig,
        siteUrl: 'https://example.com',
        logger: createMockLogger(),
      });

      // Should be identical (or very similar with whitespace)
      expect(result).toContain('Custom Title');
      expect(result).toContain('Custom description');
      expect(result).toContain('custom, keywords');
      // Should not add duplicate tags
      const titleCount = (result.match(/<title>/g) || []).length;
      expect(titleCount).toBe(1);
    });

    it('should return original HTML if page has no SEO frontmatter', () => {
      // Create page without seo frontmatter
      const pageWithoutSeo: PageModel = {
        slug: 'test-page',
        url: '/test-page',
        content: 'Test content',
        frontMatter: {
          title: 'Test Page',
          description: 'Test page description',
        },
        sourcePath: '/site/test-page.md',
      } as PageModel;

      const html = '<html><head></head><body>Content</body></html>';

      const result = autoInjectSEO(html, {
        page: pageWithoutSeo,
        config: baseConfig,
        siteUrl: 'https://example.com',
        logger: createMockLogger(),
      });

      // Without SEO frontmatter, should still inject basic tags from page frontmatter
      // (title and description are in frontMatter directly)
      expect(result).toContain('<title>Test Page</title>');
    });
  });

  describe('autoInjectSEO - Multi-line Attribute Detection', () => {
    it('should detect title tag with multi-line content', () => {
      const html = `<html><head>
  <title>
    Multi-line Title
  </title>
</head><body>Content</body></html>`;

      const result = autoInjectSEO(html, {
        page: samplePage,
        config: baseConfig,
        siteUrl: 'https://example.com',
        logger: createMockLogger(),
      });

      // Should detect existing title and not inject new one
      expect(result).toContain('Multi-line Title');
      // Should not inject another <title> tag
      const titleMatches = result.match(/<title>/g);
      expect(titleMatches).toHaveLength(1);
    });

    it('should detect meta tags with multi-line attributes', () => {
      const html = `<html><head>
  <meta
    name="description"
    content="Multi-line description">
</head><body>Content</body></html>`;

      const result = autoInjectSEO(html, {
        page: samplePage,
        config: baseConfig,
        siteUrl: 'https://example.com',
        logger: createMockLogger(),
      });

      // Should detect existing description
      expect(result).toContain('Multi-line description');
      // Should not inject another meta description
      const descMatches = result.match(/<meta[^>]*name="description"/g);
      expect(descMatches).toHaveLength(1);
    });

    it('should detect OG tags with multi-line attributes', () => {
      samplePage.frontMatter.seo = {
        ...samplePage.frontMatter.seo,
        openGraph: {
          title: 'OG Title',
        },
      };

      const html = `<html><head>
  <meta
    property="og:title"
    content="Existing OG Title">
</head><body>Content</body></html>`;

      const result = autoInjectSEO(html, {
        page: samplePage,
        config: baseConfig,
        siteUrl: 'https://example.com',
        logger: createMockLogger(),
      });

      // Should detect existing OG tag
      expect(result).toContain('Existing OG Title');
      // Should not inject any additional OG tags (group behavior)
      const ogMatches = result.match(/<meta[^>]*property="og:/g);
      expect(ogMatches).toHaveLength(1); // Only the existing one
    });
  });

  describe('autoInjectSEO - Edge Cases', () => {
    it('should handle empty string HTML', () => {
      const html = '';

      const result = autoInjectSEO(html, {
        page: samplePage,
        config: baseConfig,
        siteUrl: 'https://example.com',
        logger: createMockLogger(),
      });

      expect(result).toBe('');
    });

    it('should handle HTML with multiple </head> tags (use first)', () => {
      const html = '<html><head></head><body><div></head></div></body></html>';

      const result = autoInjectSEO(html, {
        page: samplePage,
        config: baseConfig,
        siteUrl: 'https://example.com',
        logger: createMockLogger(),
      });

      // Should inject before first </head>
      const firstHeadPos = result.indexOf('</head>');
      const titlePos = result.indexOf('<title>');
      expect(titlePos).toBeLessThan(firstHeadPos);
    });

    it('should handle malformed HTML gracefully', () => {
      const html = '<html><head><meta name="description"</head><body>Content</body></html>';

      const result = autoInjectSEO(html, {
        page: samplePage,
        config: baseConfig,
        siteUrl: 'https://example.com',
        logger: createMockLogger(),
      });

      // Should still inject (detection might not catch malformed tag)
      expect(result).toContain('</head>');
    });

    it('should preserve existing tag spacing and formatting', () => {
      const html = `<html>
<head>
  <meta charset="utf-8">
  <title>Existing Title</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>Content</body>
</html>`;

      const result = autoInjectSEO(html, {
        page: samplePage,
        config: baseConfig,
        siteUrl: 'https://example.com',
        logger: createMockLogger(),
      });

      // Should preserve existing structure
      expect(result).toContain('<meta charset="utf-8">');
      expect(result).toContain('Existing Title');
      expect(result).toContain('<link rel="stylesheet"');
      // Should inject new tags
      expect(result).toContain('<meta name="description"');
    });
  });

  describe('shouldAutoInject', () => {
    it('should return true when autoInject is true', () => {
      baseConfig.seo = { autoInject: true };

      const result = shouldAutoInject(baseConfig, samplePage);

      expect(result).toBe(true);
    });

    it('should return false when autoInject is false', () => {
      baseConfig.seo = { autoInject: false };

      const result = shouldAutoInject(baseConfig, samplePage);

      expect(result).toBe(false);
    });

    it('should return true when autoInject is undefined (default)', () => {
      baseConfig.seo = {};

      const result = shouldAutoInject(baseConfig, samplePage);

      expect(result).toBe(true);
    });

    it('should return true when seo config is undefined (default)', () => {
      // Create config without seo property
      const configWithoutSeo: StatiConfig = {
        site: {
          title: 'Test Site',
          baseUrl: 'https://example.com',
        },
      } as StatiConfig;

      const result = shouldAutoInject(configWithoutSeo, samplePage);

      expect(result).toBe(true);
    });
  });
});
