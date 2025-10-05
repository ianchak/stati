import { describe, it, expect, vi } from 'vitest';
import {
  escapeHtml,
  generateRobotsContent,
  validateSEOMetadata,
  detectExistingSEOTags,
} from '../../src/seo/utils/index.js';
import { sanitizeStructuredData } from '../../src/seo/utils/escape-and-validation.js';
import { SEOTagType } from '../../src/types/seo.js';
import type { SEOMetadata } from '../../src/types/content.js';
import type { Logger } from '../../src/types/logging.js';

const mockLogger: Logger = {
  info: vi.fn(),
  success: vi.fn(),
  warning: vi.fn(),
  error: vi.fn(),
  building: vi.fn(),
  processing: vi.fn(),
  stats: vi.fn(),
};

describe('SEO Utils - escapeHtml', () => {
  it('should escape all HTML special characters', () => {
    const input = '<script>alert("XSS & stuff")</script>';
    const expected = '&lt;script&gt;alert(&quot;XSS &amp; stuff&quot;)&lt;/script&gt;';
    expect(escapeHtml(input)).toBe(expected);
  });

  it('should escape ampersand', () => {
    expect(escapeHtml('Tom & Jerry')).toBe('Tom &amp; Jerry');
  });

  it('should escape less than', () => {
    expect(escapeHtml('5 < 10')).toBe('5 &lt; 10');
  });

  it('should escape greater than', () => {
    expect(escapeHtml('10 > 5')).toBe('10 &gt; 5');
  });

  it('should escape double quotes', () => {
    expect(escapeHtml('Say "hello"')).toBe('Say &quot;hello&quot;');
  });

  it('should escape single quotes', () => {
    expect(escapeHtml("It's working")).toBe('It&#39;s working');
  });

  it('should return same string if no special characters', () => {
    const input = 'Hello World';
    expect(escapeHtml(input)).toBe(input);
  });

  it('should handle empty string', () => {
    expect(escapeHtml('')).toBe('');
  });

  it('should use cache for repeated strings', () => {
    const input = '<script>alert("test")</script>';
    const first = escapeHtml(input);
    const second = escapeHtml(input);
    expect(first).toBe(second);
    // Both should return the same cached result
    expect(escapeHtml(input)).toBe(first);
  });

  it('should handle cache eviction when limit is reached', () => {
    // Fill cache with 1000+ entries to trigger eviction
    for (let i = 0; i < 1001; i++) {
      escapeHtml(`test-string-${i}`);
    }
    // Cache should still work after eviction
    const result = escapeHtml('<test>');
    expect(result).toBe('&lt;test&gt;');
  });
});

describe('SEO Utils - sanitizeStructuredData', () => {
  it('should escape string values', () => {
    const data = { name: '<script>alert("xss")</script>' };
    const result = sanitizeStructuredData(data, mockLogger);
    expect(result).toEqual({
      name: '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;',
    });
  });

  it('should handle nested objects', () => {
    const data = {
      name: 'Test',
      nested: {
        value: '<script>',
        deep: {
          value: 'alert("xss")',
        },
      },
    };
    const result = sanitizeStructuredData(data, mockLogger);
    expect(result).toEqual({
      name: 'Test',
      nested: {
        value: '&lt;script&gt;',
        deep: {
          value: 'alert(&quot;xss&quot;)',
        },
      },
    });
  });

  it('should handle arrays', () => {
    const data = ['<script>', 'safe', { value: 'test<' }];
    const result = sanitizeStructuredData(data, mockLogger);
    expect(result).toEqual(['&lt;script&gt;', 'safe', { value: 'test&lt;' }]);
  });

  it('should preserve numbers', () => {
    const data = { count: 42, price: 19.99 };
    expect(sanitizeStructuredData(data, mockLogger)).toEqual({ count: 42, price: 19.99 });
  });

  it('should preserve booleans', () => {
    const data = { active: true, disabled: false };
    expect(sanitizeStructuredData(data, mockLogger)).toEqual({ active: true, disabled: false });
  });

  it('should preserve null', () => {
    const data = { value: null };
    expect(sanitizeStructuredData(data, mockLogger)).toEqual({ value: null });
  });

  it('should handle depth limit and warn', () => {
    const loggerWarnSpy = vi.spyOn(mockLogger, 'warning');

    // Create deeply nested object beyond max depth
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let deepObj: any = { value: 'test' };
    for (let i = 0; i < 55; i++) {
      deepObj = { nested: deepObj };
    }

    sanitizeStructuredData(deepObj, mockLogger, 0, 50);
    expect(loggerWarnSpy).toHaveBeenCalled();
    expect(loggerWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('exceeds maximum nesting depth'),
    );

    loggerWarnSpy.mockRestore();
  });

  it('should truncate at max depth with custom limit', () => {
    const data = { a: { b: { c: 'deep' } } };
    const loggerWarnSpy = vi.spyOn(mockLogger, 'warning');

    sanitizeStructuredData(data, mockLogger, 0, 2);
    expect(loggerWarnSpy).toHaveBeenCalled();

    loggerWarnSpy.mockRestore();
  });

  it('should not escape safe values', () => {
    const data = { safeString: 'This is safe' };
    const result = sanitizeStructuredData(data, mockLogger);
    expect(result).toEqual(data);
  });

  it('should handle mixed nested structures', () => {
    const data = {
      items: [
        { name: '<script>', id: 1 },
        { name: 'safe', id: 2 },
      ],
      meta: {
        tags: ['<tag1>', '<tag2>'],
      },
    };

    const result = sanitizeStructuredData(data, mockLogger);
    expect(result).toEqual({
      items: [
        { name: '&lt;script&gt;', id: 1 },
        { name: 'safe', id: 2 },
      ],
      meta: {
        tags: ['&lt;tag1&gt;', '&lt;tag2&gt;'],
      },
    });
  });
});

describe('SEO Utils - generateRobotsContent', () => {
  it('should return empty string when no directives', () => {
    const seo: SEOMetadata = {};
    expect(generateRobotsContent(seo)).toBe('');
  });

  it('should handle noindex flag', () => {
    const seo: SEOMetadata = { noindex: true };
    expect(generateRobotsContent(seo)).toBe('noindex');
  });

  it('should handle robots as string', () => {
    const seo: SEOMetadata = { robots: 'noindex, nofollow' };
    expect(generateRobotsContent(seo)).toBe('noindex, nofollow');
  });

  it('should combine noindex flag with robots string', () => {
    const seo: SEOMetadata = {
      noindex: true,
      robots: 'nofollow, noarchive',
    };
    expect(generateRobotsContent(seo)).toBe('noindex, nofollow, noarchive');
  });

  it('should not duplicate noindex when already in robots string', () => {
    const seo: SEOMetadata = {
      noindex: true,
      robots: 'noindex, nofollow',
    };
    expect(generateRobotsContent(seo)).toBe('noindex, nofollow');
  });

  it('should handle robots config with index false', () => {
    const seo: SEOMetadata = {
      robots: { index: false },
    };
    expect(generateRobotsContent(seo)).toBe('noindex');
  });

  it('should handle robots config with follow false', () => {
    const seo: SEOMetadata = {
      robots: { follow: false },
    };
    expect(generateRobotsContent(seo)).toBe('nofollow');
  });

  it('should handle multiple robots directives', () => {
    const seo: SEOMetadata = {
      robots: {
        index: false,
        follow: false,
        archive: false,
        snippet: false,
      },
    };
    expect(generateRobotsContent(seo)).toBe('noindex, nofollow, noarchive, nosnippet');
  });

  it('should handle imageindex directive', () => {
    const seo: SEOMetadata = {
      robots: { imageindex: false },
    };
    expect(generateRobotsContent(seo)).toBe('noimageindex');
  });

  it('should handle translate directive', () => {
    const seo: SEOMetadata = {
      robots: { translate: false },
    };
    expect(generateRobotsContent(seo)).toBe('notranslate');
  });

  it('should handle maxSnippet directive', () => {
    const seo: SEOMetadata = {
      robots: { maxSnippet: 20 },
    };
    expect(generateRobotsContent(seo)).toBe('max-snippet:20');
  });

  it('should handle maxImagePreview directive', () => {
    const seo: SEOMetadata = {
      robots: { maxImagePreview: 'large' },
    };
    expect(generateRobotsContent(seo)).toBe('max-image-preview:large');
  });

  it('should handle maxVideoPreview directive', () => {
    const seo: SEOMetadata = {
      robots: { maxVideoPreview: 30 },
    };
    expect(generateRobotsContent(seo)).toBe('max-video-preview:30');
  });

  it('should handle all directives combined', () => {
    const seo: SEOMetadata = {
      noindex: true,
      robots: {
        follow: false,
        archive: false,
        maxSnippet: 100,
        maxImagePreview: 'standard',
      },
    };
    const result = generateRobotsContent(seo);
    expect(result).toContain('noindex');
    expect(result).toContain('nofollow');
    expect(result).toContain('noarchive');
    expect(result).toContain('max-snippet:100');
    expect(result).toContain('max-image-preview:standard');
  });

  it('should not duplicate noindex when both flag and robots.index=false', () => {
    const seo: SEOMetadata = {
      noindex: true,
      robots: { index: false, follow: false },
    };
    const result = generateRobotsContent(seo);
    // Should only contain one 'noindex'
    expect(result.split('noindex').length - 1).toBe(1);
    expect(result).toBe('noindex, nofollow');
  });
});

describe('SEO Utils - validateSEOMetadata', () => {
  it('should return valid for empty SEO metadata', () => {
    const seo: SEOMetadata = {};
    const result = validateSEOMetadata(seo, '/test');
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  it('should warn on short title', () => {
    const seo: SEOMetadata = { title: 'Hi' };
    const result = validateSEOMetadata(seo, '/test');
    expect(result.valid).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain('Title is only 2 characters');
  });

  it('should warn on long title', () => {
    const seo: SEOMetadata = {
      title: 'This is a very long title that exceeds the recommended length for SEO purposes',
    };
    const result = validateSEOMetadata(seo, '/test');
    expect(result.valid).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain('characters (recommended: 50-60)');
  });

  it('should not warn on good title length', () => {
    const seo: SEOMetadata = { title: 'This is a good title length for SEO' };
    const result = validateSEOMetadata(seo, '/test');
    expect(result.warnings.filter((w) => w.includes('Title'))).toEqual([]);
  });

  it('should warn on short description', () => {
    const seo: SEOMetadata = { description: 'Too short' };
    const result = validateSEOMetadata(seo, '/test');
    expect(result.valid).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain('Description is only');
  });

  it('should warn on long description', () => {
    const seo: SEOMetadata = {
      description:
        'This is a very long description that exceeds the recommended maximum length for meta descriptions which should ideally be between 150 and 160 characters for optimal display',
    };
    const result = validateSEOMetadata(seo, '/test');
    expect(result.valid).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain('Description is');
  });

  it('should not warn on good description length', () => {
    const seo: SEOMetadata = {
      description:
        'This is a good description length that falls within the recommended range for SEO meta descriptions and should display nicely in search results.',
    };
    const result = validateSEOMetadata(seo, '/test');
    expect(result.warnings.filter((w) => w.includes('Description'))).toEqual([]);
  });

  it('should error on invalid canonical URL', () => {
    const seo: SEOMetadata = { canonical: 'not-a-valid-url' };
    const result = validateSEOMetadata(seo, '/test');
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('Invalid canonical URL');
  });

  it('should accept valid canonical URL', () => {
    const seo: SEOMetadata = { canonical: 'https://example.com/page' };
    const result = validateSEOMetadata(seo, '/test');
    expect(result.errors.filter((e) => e.includes('canonical'))).toEqual([]);
  });

  it('should warn on potentially invalid OG image URL', () => {
    const seo: SEOMetadata = {
      openGraph: {
        image: 'invalid-url',
      },
    };
    const result = validateSEOMetadata(seo, '/test');
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain('Open Graph image URL may be invalid');
  });

  it('should accept relative OG image URL', () => {
    const seo: SEOMetadata = {
      openGraph: {
        image: '/images/og-image.jpg',
      },
    };
    const result = validateSEOMetadata(seo, '/test');
    expect(result.warnings.filter((w) => w.includes('Open Graph'))).toEqual([]);
  });

  it('should accept absolute OG image URL', () => {
    const seo: SEOMetadata = {
      openGraph: {
        image: 'https://example.com/og-image.jpg',
      },
    };
    const result = validateSEOMetadata(seo, '/test');
    expect(result.warnings.filter((w) => w.includes('Open Graph'))).toEqual([]);
  });

  it('should error on invalid OG image width', () => {
    const seo: SEOMetadata = {
      openGraph: {
        image: {
          url: 'https://example.com/image.jpg',
          width: -100,
        },
      },
    };
    const result = validateSEOMetadata(seo, '/test');
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('width must be a positive integer');
  });

  it('should error on invalid OG image height', () => {
    const seo: SEOMetadata = {
      openGraph: {
        image: {
          url: 'https://example.com/image.jpg',
          height: 0,
        },
      },
    };
    const result = validateSEOMetadata(seo, '/test');
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('height must be a positive integer');
  });

  it('should accept valid OG image dimensions', () => {
    const seo: SEOMetadata = {
      openGraph: {
        image: {
          url: 'https://example.com/image.jpg',
          width: 1200,
          height: 630,
        },
      },
    };
    const result = validateSEOMetadata(seo, '/test');
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('should warn on potentially invalid Twitter image URL', () => {
    const seo: SEOMetadata = {
      twitter: {
        image: 'invalid-url',
      },
    };
    const result = validateSEOMetadata(seo, '/test');
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain('Twitter Card image URL may be invalid');
  });

  it('should warn on large structured data', () => {
    const largeData = { items: new Array(10000).fill({ name: 'test', value: 'data' }) };
    const seo: SEOMetadata = {
      structuredData: largeData,
    };
    const result = validateSEOMetadata(seo, '/test');
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings.some((w) => w.includes('Structured data is'))).toBe(true);
  });

  it('should error on invalid priority value (negative)', () => {
    const seo: SEOMetadata = { priority: -0.5 };
    const result = validateSEOMetadata(seo, '/test');
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('Priority must be a number between 0.0 and 1.0');
  });

  it('should error on invalid priority value (>1)', () => {
    const seo: SEOMetadata = { priority: 1.5 };
    const result = validateSEOMetadata(seo, '/test');
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('Priority must be a number between 0.0 and 1.0');
  });

  it('should accept valid priority value', () => {
    const seo: SEOMetadata = { priority: 0.8 };
    const result = validateSEOMetadata(seo, '/test');
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('should collect multiple errors and warnings', () => {
    const seo: SEOMetadata = {
      title: 'Hi',
      canonical: 'invalid',
      priority: 2,
      openGraph: {
        image: {
          url: 'https://example.com/image.jpg',
          width: -100,
        },
      },
    };
    const result = validateSEOMetadata(seo, '/test');
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(1);
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});

describe('SEO Utils - detectExistingSEOTags', () => {
  it('should detect title tag', () => {
    const html = '<html><head><title>My Page</title></head><body></body></html>';
    const tags = detectExistingSEOTags(html);
    expect(tags.has(SEOTagType.Title)).toBe(true);
  });

  it('should detect description meta tag', () => {
    const html =
      '<html><head><meta name="description" content="Test description"></head><body></body></html>';
    const tags = detectExistingSEOTags(html);
    expect(tags.has(SEOTagType.Description)).toBe(true);
  });

  it('should detect keywords meta tag', () => {
    const html =
      '<html><head><meta name="keywords" content="test, seo"></head><body></body></html>';
    const tags = detectExistingSEOTags(html);
    expect(tags.has(SEOTagType.Keywords)).toBe(true);
  });

  it('should detect author meta tag', () => {
    const html = '<html><head><meta name="author" content="John Doe"></head><body></body></html>';
    const tags = detectExistingSEOTags(html);
    expect(tags.has(SEOTagType.Author)).toBe(true);
  });

  it('should detect robots meta tag', () => {
    const html =
      '<html><head><meta name="robots" content="noindex, nofollow"></head><body></body></html>';
    const tags = detectExistingSEOTags(html);
    expect(tags.has(SEOTagType.Robots)).toBe(true);
  });

  it('should detect canonical link', () => {
    const html =
      '<html><head><link rel="canonical" href="https://example.com/page"></head><body></body></html>';
    const tags = detectExistingSEOTags(html);
    expect(tags.has(SEOTagType.Canonical)).toBe(true);
  });

  it('should detect Open Graph tags', () => {
    const html = '<html><head><meta property="og:title" content="Test"></head><body></body></html>';
    const tags = detectExistingSEOTags(html);
    expect(tags.has(SEOTagType.OpenGraph)).toBe(true);
  });

  it('should detect Twitter Card tags', () => {
    const html =
      '<html><head><meta name="twitter:card" content="summary"></head><body></body></html>';
    const tags = detectExistingSEOTags(html);
    expect(tags.has(SEOTagType.Twitter)).toBe(true);
  });

  it('should detect structured data', () => {
    const html =
      '<html><head><script type="application/ld+json">{"@type":"WebPage"}</script></head><body></body></html>';
    const tags = detectExistingSEOTags(html);
    expect(tags.has(SEOTagType.StructuredData)).toBe(true);
  });

  it('should detect multiple tags', () => {
    const html = `
      <html>
        <head>
          <title>My Page</title>
          <meta name="description" content="Test">
          <meta property="og:title" content="OG Title">
          <link rel="canonical" href="https://example.com">
        </head>
        <body></body>
      </html>
    `;
    const tags = detectExistingSEOTags(html);
    expect(tags.has(SEOTagType.Title)).toBe(true);
    expect(tags.has(SEOTagType.Description)).toBe(true);
    expect(tags.has(SEOTagType.OpenGraph)).toBe(true);
    expect(tags.has(SEOTagType.Canonical)).toBe(true);
  });

  it('should handle multi-line attributes', () => {
    const html = `
      <html>
        <head>
          <meta
            name="description"
            content="Test description with
            line breaks"
          >
        </head>
        <body></body>
      </html>
    `;
    const tags = detectExistingSEOTags(html);
    expect(tags.has(SEOTagType.Description)).toBe(true);
  });

  it('should handle different quote styles', () => {
    const html = `
      <html>
        <head>
          <meta name='description' content='Single quotes'>
          <meta name="keywords" content="Double quotes">
        </head>
        <body></body>
      </html>
    `;
    const tags = detectExistingSEOTags(html);
    expect(tags.has(SEOTagType.Description)).toBe(true);
    expect(tags.has(SEOTagType.Keywords)).toBe(true);
  });

  it('should handle extra spacing in attributes', () => {
    const html = `
      <html>
        <head>
          <meta   name  =  "description"   content  =  "Test"  >
        </head>
        <body></body>
      </html>
    `;
    const tags = detectExistingSEOTags(html);
    expect(tags.has(SEOTagType.Description)).toBe(true);
  });

  it('should return empty set for HTML without head tag', () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const html = '<html><body><p>No head tag</p></body></html>';
    const tags = detectExistingSEOTags(html);
    expect(tags.size).toBe(0);
    expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('No <head> tag found'));
    consoleWarnSpy.mockRestore();
  });

  it('should return empty set for empty HTML', () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const html = '';
    const tags = detectExistingSEOTags(html);
    expect(tags.size).toBe(0);
    consoleWarnSpy.mockRestore();
  });

  it('should only check within head tag', () => {
    const html = `
      <html>
        <head>
          <title>In Head</title>
        </head>
        <body>
          <title>In Body</title>
          <meta name="description" content="In body">
        </body>
      </html>
    `;
    const tags = detectExistingSEOTags(html);
    expect(tags.has(SEOTagType.Title)).toBe(true);
    // Should not double-count tags in body
    expect(tags.size).toBe(1);
  });

  it('should handle case-insensitive matching', () => {
    const html = `
      <html>
        <HEAD>
          <TITLE>Uppercase</TITLE>
          <META NAME="description" CONTENT="Mixed case">
        </HEAD>
        <body></body>
      </html>
    `;
    const tags = detectExistingSEOTags(html);
    expect(tags.has(SEOTagType.Title)).toBe(true);
    expect(tags.has(SEOTagType.Description)).toBe(true);
  });
});
