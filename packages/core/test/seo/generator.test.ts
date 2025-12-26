import { describe, it, expect, vi } from 'vitest';
import {
  generateSEOMetadata,
  generateSEO,
  generateOpenGraphTags,
  generateTwitterCardTags,
} from '../../src/seo/generator.js';
import { SEOTagType } from '../../src/types/seo.js';
import type { SEOContext } from '../../src/types/seo.js';
import type { PageModel, StatiConfig } from '../../src/types/index.js';
import type { Logger } from '../../src/types/logging.js';

// Helper function to create a minimal page model for testing
function createMockPage(overrides: Partial<PageModel> = {}): PageModel {
  return {
    id: 'test-page',
    type: 'page',
    url: '/test-page',
    filePath: '/path/to/test-page.md',
    content: '',
    html: '',
    frontMatter: {
      title: 'Test Page',
      description: 'A test page description',
      ...overrides.frontMatter,
    },
    ...overrides,
  } as PageModel;
}

// Helper function to create a minimal config for testing
function createMockConfig(overrides: Partial<StatiConfig> = {}): StatiConfig {
  return {
    site: {
      title: 'Test Site',
      baseUrl: 'https://example.com',
      ...overrides.site,
    },
    ...overrides,
  } as StatiConfig;
}

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

describe('SEO Generator - generateSEOMetadata', () => {
  it('should generate basic title tag', () => {
    const page = createMockPage();
    const config = createMockConfig();
    const ctx: SEOContext = {
      logger: createMockLogger(),
      page,
      config,
      siteUrl: 'https://example.com',
    };

    const result = generateSEOMetadata(ctx);
    expect(result).toContain('<title>Test Page</title>');
  });

  it('should use SEO title over page title', () => {
    const page = createMockPage({
      frontMatter: {
        title: 'Page Title',
        seo: {
          title: 'SEO Title',
        },
      },
    });
    const config = createMockConfig();
    const ctx: SEOContext = {
      logger: createMockLogger(),
      page,
      config,
      siteUrl: 'https://example.com',
    };

    const result = generateSEOMetadata(ctx);
    expect(result).toContain('<title>SEO Title</title>');
    expect(result).not.toContain('<title>Page Title</title>');
  });

  it('should generate description meta tag', () => {
    const page = createMockPage();
    const config = createMockConfig();
    const ctx: SEOContext = {
      logger: createMockLogger(),
      page,
      config,
      siteUrl: 'https://example.com',
    };

    const result = generateSEOMetadata(ctx);
    expect(result).toContain('<meta name="description" content="A test page description">');
  });

  it('should fall back to site description when page has no description', () => {
    const page = createMockPage({
      frontMatter: {
        title: 'Page Without Description',
      },
    });
    const config = createMockConfig({
      site: {
        title: 'Test Site',
        baseUrl: 'https://example.com',
        description: 'Default site description for all pages',
      },
    });
    const ctx: SEOContext = {
      logger: createMockLogger(),
      page,
      config,
      siteUrl: 'https://example.com',
    };

    const result = generateSEOMetadata(ctx);
    expect(result).toContain(
      '<meta name="description" content="Default site description for all pages">',
    );
  });

  it('should generate keywords from tags array', () => {
    const page = createMockPage({
      frontMatter: {
        tags: ['javascript', 'typescript', 'testing'],
      },
    });
    const config = createMockConfig();
    const ctx: SEOContext = {
      logger: createMockLogger(),
      page,
      config,
      siteUrl: 'https://example.com',
    };

    const result = generateSEOMetadata(ctx);
    expect(result).toContain('<meta name="keywords" content="javascript, typescript, testing">');
  });

  it('should generate canonical link with default URL', () => {
    const page = createMockPage({ url: '/test-page' });
    const config = createMockConfig();
    const ctx: SEOContext = {
      logger: createMockLogger(),
      page,
      config,
      siteUrl: 'https://example.com',
    };

    const result = generateSEOMetadata(ctx);
    expect(result).toContain('<link rel="canonical" href="https://example.com/test-page">');
  });

  it('should use custom canonical URL when provided', () => {
    const page = createMockPage({
      frontMatter: {
        seo: {
          canonical: 'https://custom.com/page',
        },
      },
    });
    const config = createMockConfig();
    const ctx: SEOContext = {
      logger: createMockLogger(),
      page,
      config,
      siteUrl: 'https://example.com',
    };

    const result = generateSEOMetadata(ctx);
    expect(result).toContain('<link rel="canonical" href="https://custom.com/page">');
  });

  it('should handle undefined page.url gracefully in canonical link', () => {
    const page = createMockPage({});
    // Intentionally set url to undefined to simulate missing URL
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (page as any).url = undefined;
    const config = createMockConfig();
    const ctx: SEOContext = {
      logger: createMockLogger(),
      page,
      config,
      siteUrl: 'https://example.com',
    };

    const result = generateSEOMetadata(ctx);
    expect(result).toContain('<link rel="canonical" href="https://example.com/">');
    expect(result).not.toContain('undefined');
  });

  it('should generate robots meta tag with noindex', () => {
    const page = createMockPage({
      frontMatter: {
        seo: {
          noindex: true,
        },
      },
    });
    const config = createMockConfig();
    const ctx: SEOContext = {
      logger: createMockLogger(),
      page,
      config,
      siteUrl: 'https://example.com',
    };

    const result = generateSEOMetadata(ctx);
    expect(result).toContain('<meta name="robots" content="noindex">');
  });

  it('should generate author meta tag from string', () => {
    const page = createMockPage({
      frontMatter: {
        seo: {
          author: 'John Doe',
        },
      },
    });
    const config = createMockConfig();
    const ctx: SEOContext = {
      logger: createMockLogger(),
      page,
      config,
      siteUrl: 'https://example.com',
    };

    const result = generateSEOMetadata(ctx);
    expect(result).toContain('<meta name="author" content="John Doe">');
  });

  it('should generate author meta tag from object', () => {
    const page = createMockPage({
      frontMatter: {
        seo: {
          author: {
            name: 'Jane Smith',
            email: 'jane@example.com',
          },
        },
      },
    });
    const config = createMockConfig();
    const ctx: SEOContext = {
      logger: createMockLogger(),
      page,
      config,
      siteUrl: 'https://example.com',
    };

    const result = generateSEOMetadata(ctx);
    expect(result).toContain('<meta name="author" content="Jane Smith">');
  });

  it('should use default author from config', () => {
    const page = createMockPage();
    const config = createMockConfig({
      seo: {
        defaultAuthor: {
          name: 'Site Author',
        },
      },
    });
    const ctx: SEOContext = {
      logger: createMockLogger(),
      page,
      config,
      siteUrl: 'https://example.com',
    };

    const result = generateSEOMetadata(ctx);
    expect(result).toContain('<meta name="author" content="Site Author">');
  });

  it('should generate structured data script tag', () => {
    const page = createMockPage({
      frontMatter: {
        seo: {
          structuredData: {
            '@type': 'Article',
            headline: 'Test Article',
          },
        },
      },
    });
    const config = createMockConfig();
    const ctx: SEOContext = {
      logger: createMockLogger(),
      page,
      config,
      siteUrl: 'https://example.com',
    };

    const result = generateSEOMetadata(ctx);
    expect(result).toContain('<script type="application/ld+json">');
    expect(result).toContain('"@type":"Article"');
    expect(result).toContain('"headline":"Test Article"');
  });

  it('should escape HTML in structured data', () => {
    const page = createMockPage({
      frontMatter: {
        seo: {
          structuredData: {
            name: '<script>alert("xss")</script>',
          },
        },
      },
    });
    const config = createMockConfig();
    const ctx: SEOContext = {
      logger: createMockLogger(),
      page,
      config,
      siteUrl: 'https://example.com',
    };

    const result = generateSEOMetadata(ctx);
    expect(result).toContain('&lt;script&gt;');
    expect(result).not.toContain('<script>alert');
  });

  it('should log validation errors as warnings instead of throwing', () => {
    const mockWarning = vi.fn();
    const page = createMockPage({
      frontMatter: {
        seo: {
          canonical: 'invalid-url',
        },
      },
    });
    const config = createMockConfig();
    const ctx: SEOContext = {
      logger: createMockLogger({ warning: mockWarning }),
      page,
      config,
      siteUrl: 'https://example.com',
    };

    // Should not throw, but should log warnings
    expect(() => generateSEOMetadata(ctx)).not.toThrow();
    expect(mockWarning).toHaveBeenCalled();
    expect(mockWarning).toHaveBeenCalledWith(expect.stringContaining('SEO validation failed'));
  });

  it('should log warnings in debug mode', () => {
    const mockWarning = vi.fn();
    const page = createMockPage({
      frontMatter: {
        seo: {
          title: 'Hi', // Too short
        },
      },
    });
    const config = createMockConfig({
      seo: {
        debug: true,
      },
    });
    const ctx: SEOContext = {
      page,
      config,
      siteUrl: 'https://example.com',
      logger: createMockLogger({ warning: mockWarning }),
    };

    generateSEOMetadata(ctx);
    expect(mockWarning).toHaveBeenCalled();
    expect(mockWarning).toHaveBeenCalledWith(expect.stringContaining('SEO warnings'));
  });

  it('should not log warnings when debug is disabled', () => {
    const mockWarning = vi.fn();
    const page = createMockPage({
      frontMatter: {
        seo: {
          title: 'Hi', // Too short
        },
      },
    });
    const config = createMockConfig({
      seo: {
        debug: false,
      },
    });
    const ctx: SEOContext = {
      page,
      config,
      siteUrl: 'https://example.com',
      logger: createMockLogger({ warning: mockWarning }),
    };

    generateSEOMetadata(ctx);
    expect(mockWarning).not.toHaveBeenCalled();
  });
});

describe('SEO Generator - Selective Generation (include mode)', () => {
  it('should generate only title when included', () => {
    const page = createMockPage();
    const config = createMockConfig();
    const ctx: SEOContext = {
      logger: createMockLogger(),
      page,
      config,
      siteUrl: 'https://example.com',
      include: new Set([SEOTagType.Title]),
    };

    const result = generateSEOMetadata(ctx);
    expect(result).toContain('<title>');
    expect(result).not.toContain('<meta name="description"');
    expect(result).not.toContain('<link rel="canonical"');
  });

  it('should generate only description when included', () => {
    const page = createMockPage();
    const config = createMockConfig();
    const ctx: SEOContext = {
      logger: createMockLogger(),
      page,
      config,
      siteUrl: 'https://example.com',
      include: new Set([SEOTagType.Description]),
    };

    const result = generateSEOMetadata(ctx);
    expect(result).not.toContain('<title>');
    expect(result).toContain('<meta name="description"');
    expect(result).not.toContain('<link rel="canonical"');
  });

  it('should generate multiple tags when included', () => {
    const page = createMockPage();
    const config = createMockConfig();
    const ctx: SEOContext = {
      logger: createMockLogger(),
      page,
      config,
      siteUrl: 'https://example.com',
      include: new Set([SEOTagType.Title, SEOTagType.Description, SEOTagType.Canonical]),
    };

    const result = generateSEOMetadata(ctx);
    expect(result).toContain('<title>');
    expect(result).toContain('<meta name="description"');
    expect(result).toContain('<link rel="canonical"');
    expect(result).not.toContain('<meta name="keywords"');
  });

  it('should generate only OpenGraph tags when included', () => {
    const page = createMockPage({
      frontMatter: {
        seo: {
          openGraph: {
            title: 'OG Title',
          },
        },
      },
    });
    const config = createMockConfig();
    const ctx: SEOContext = {
      logger: createMockLogger(),
      page,
      config,
      siteUrl: 'https://example.com',
      include: new Set([SEOTagType.OpenGraph]),
    };

    const result = generateSEOMetadata(ctx);
    expect(result).not.toContain('<title>');
    expect(result).toContain('<meta property="og:title"');
  });

  it('should generate only Twitter tags when included', () => {
    const page = createMockPage({
      frontMatter: {
        seo: {
          twitter: {
            card: 'summary',
          },
        },
      },
    });
    const config = createMockConfig();
    const ctx: SEOContext = {
      logger: createMockLogger(),
      page,
      config,
      siteUrl: 'https://example.com',
      include: new Set([SEOTagType.Twitter]),
    };

    const result = generateSEOMetadata(ctx);
    expect(result).not.toContain('<title>');
    expect(result).toContain('<meta name="twitter:card"');
  });
});

describe('SEO Generator - Selective Generation (exclude mode)', () => {
  it('should exclude title when specified', () => {
    const page = createMockPage();
    const config = createMockConfig();
    const ctx: SEOContext = {
      logger: createMockLogger(),
      page,
      config,
      siteUrl: 'https://example.com',
      exclude: new Set([SEOTagType.Title]),
    };

    const result = generateSEOMetadata(ctx);
    expect(result).not.toContain('<title>');
    expect(result).toContain('<meta name="description"');
    expect(result).toContain('<link rel="canonical"');
  });

  it('should exclude OpenGraph when specified', () => {
    const page = createMockPage({
      frontMatter: {
        seo: {
          openGraph: {
            title: 'OG Title',
          },
        },
      },
    });
    const config = createMockConfig();
    const ctx: SEOContext = {
      logger: createMockLogger(),
      page,
      config,
      siteUrl: 'https://example.com',
      exclude: new Set([SEOTagType.OpenGraph]),
    };

    const result = generateSEOMetadata(ctx);
    expect(result).toContain('<title>');
    expect(result).not.toContain('<meta property="og:');
  });

  it('should exclude multiple tag types when specified', () => {
    const page = createMockPage();
    const config = createMockConfig();
    const ctx: SEOContext = {
      logger: createMockLogger(),
      page,
      config,
      siteUrl: 'https://example.com',
      exclude: new Set([SEOTagType.Title, SEOTagType.Description, SEOTagType.OpenGraph]),
    };

    const result = generateSEOMetadata(ctx);
    expect(result).not.toContain('<title>');
    expect(result).not.toContain('<meta name="description"');
    expect(result).not.toContain('<meta property="og:');
    expect(result).toContain('<link rel="canonical"');
  });
});

describe('SEO Generator - generateOpenGraphTags', () => {
  it('should generate basic OG tags with fallbacks', () => {
    const page = createMockPage();
    const config = createMockConfig();
    const ctx: SEOContext = {
      logger: createMockLogger(),
      page,
      config,
      siteUrl: 'https://example.com',
    };

    const tags = generateOpenGraphTags(ctx);
    expect(tags.some((t) => t.includes('og:title'))).toBe(true);
    expect(tags.some((t) => t.includes('og:description'))).toBe(true);
    expect(tags.some((t) => t.includes('og:url'))).toBe(true);
    expect(tags.some((t) => t.includes('og:type'))).toBe(true);
    expect(tags.some((t) => t.includes('og:site_name'))).toBe(true);
  });

  it('should handle undefined page.url gracefully in og:url', () => {
    const page = createMockPage({});
    // Intentionally set url to undefined to simulate missing URL
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (page as any).url = undefined;
    const config = createMockConfig();
    const ctx: SEOContext = {
      logger: createMockLogger(),
      page,
      config,
      siteUrl: 'https://example.com',
    };

    const tags = generateOpenGraphTags(ctx);
    const ogUrlTag = tags.find((t) => t.includes('og:url'));
    expect(ogUrlTag).toBeDefined();
    expect(ogUrlTag).toContain('https://example.com/');
    expect(ogUrlTag).not.toContain('undefined');
  });

  it('should use OG-specific title when provided', () => {
    const page = createMockPage({
      frontMatter: {
        title: 'Page Title',
        seo: {
          openGraph: {
            title: 'OG Title',
          },
        },
      },
    });
    const config = createMockConfig();
    const ctx: SEOContext = {
      logger: createMockLogger(),
      page,
      config,
      siteUrl: 'https://example.com',
    };

    const tags = generateOpenGraphTags(ctx);
    expect(tags.join('\n')).toContain('og:title" content="OG Title"');
    expect(tags.join('\n')).not.toContain('og:title" content="Page Title"');
  });

  it('should fall back to site description when page has no description', () => {
    const page = createMockPage({
      frontMatter: {
        title: 'Page Without Description',
      },
    });
    const config = createMockConfig({
      site: {
        title: 'Test Site',
        baseUrl: 'https://example.com',
        description: 'Default site description for Open Graph',
      },
    });
    const ctx: SEOContext = {
      logger: createMockLogger(),
      page,
      config,
      siteUrl: 'https://example.com',
    };

    const tags = generateOpenGraphTags(ctx);
    expect(tags.join('\n')).toContain(
      'og:description" content="Default site description for Open Graph"',
    );
  });

  it('should generate OG image with URL', () => {
    const page = createMockPage({
      frontMatter: {
        seo: {
          openGraph: {
            image: 'https://example.com/image.jpg',
          },
        },
      },
    });
    const config = createMockConfig();
    const ctx: SEOContext = {
      logger: createMockLogger(),
      page,
      config,
      siteUrl: 'https://example.com',
    };

    const tags = generateOpenGraphTags(ctx);
    expect(tags.join('\n')).toContain('og:image" content="https://example.com/image.jpg"');
  });

  it('should convert relative image URL to absolute', () => {
    const page = createMockPage({
      frontMatter: {
        seo: {
          openGraph: {
            image: '/images/og.jpg',
          },
        },
      },
    });
    const config = createMockConfig();
    const ctx: SEOContext = {
      logger: createMockLogger(),
      page,
      config,
      siteUrl: 'https://example.com',
    };

    const tags = generateOpenGraphTags(ctx);
    expect(tags.join('\n')).toContain('og:image" content="https://example.com/images/og.jpg"');
  });

  it('should generate OG image with dimensions and alt', () => {
    const page = createMockPage({
      frontMatter: {
        seo: {
          openGraph: {
            image: {
              url: 'https://example.com/image.jpg',
              alt: 'Image description',
              width: 1200,
              height: 630,
            },
          },
        },
      },
    });
    const config = createMockConfig();
    const ctx: SEOContext = {
      logger: createMockLogger(),
      page,
      config,
      siteUrl: 'https://example.com',
    };

    const tags = generateOpenGraphTags(ctx);
    const joined = tags.join('\n');
    expect(joined).toContain('og:image" content="https://example.com/image.jpg"');
    expect(joined).toContain('og:image:alt" content="Image description"');
    expect(joined).toContain('og:image:width" content="1200"');
    expect(joined).toContain('og:image:height" content="630"');
  });

  it('should generate OG locale', () => {
    const page = createMockPage({
      frontMatter: {
        seo: {
          openGraph: {
            locale: 'en_US',
          },
        },
      },
    });
    const config = createMockConfig();
    const ctx: SEOContext = {
      logger: createMockLogger(),
      page,
      config,
      siteUrl: 'https://example.com',
    };

    const tags = generateOpenGraphTags(ctx);
    expect(tags.join('\n')).toContain('og:locale" content="en_US"');
  });

  it('should use default locale from config', () => {
    const page = createMockPage();
    const config = createMockConfig({
      site: {
        title: 'Test Site',
        baseUrl: 'https://example.com',
        defaultLocale: 'fr_FR',
      },
    });
    const ctx: SEOContext = {
      logger: createMockLogger(),
      page,
      config,
      siteUrl: 'https://example.com',
    };

    const tags = generateOpenGraphTags(ctx);
    expect(tags.join('\n')).toContain('og:locale" content="fr_FR"');
  });

  it('should generate article metadata when type is article', () => {
    const page = createMockPage({
      frontMatter: {
        seo: {
          openGraph: {
            type: 'article',
            article: {
              publishedTime: '2025-01-01T00:00:00Z',
              modifiedTime: '2025-01-02T00:00:00Z',
              author: 'John Doe',
              section: 'Technology',
              tags: ['javascript', 'testing'],
            },
          },
        },
      },
    });
    const config = createMockConfig();
    const ctx: SEOContext = {
      logger: createMockLogger(),
      page,
      config,
      siteUrl: 'https://example.com',
    };

    const tags = generateOpenGraphTags(ctx);
    const joined = tags.join('\n');
    expect(joined).toContain('article:published_time" content="2025-01-01T00:00:00Z"');
    expect(joined).toContain('article:modified_time" content="2025-01-02T00:00:00Z"');
    expect(joined).toContain('article:author" content="John Doe"');
    expect(joined).toContain('article:section" content="Technology"');
    expect(joined).toContain('article:tag" content="javascript"');
    expect(joined).toContain('article:tag" content="testing"');
  });

  it('should not generate article metadata when type is not article', () => {
    const page = createMockPage({
      frontMatter: {
        seo: {
          openGraph: {
            type: 'website',
            article: {
              publishedTime: '2025-01-01T00:00:00Z',
            },
          },
        },
      },
    });
    const config = createMockConfig();
    const ctx: SEOContext = {
      logger: createMockLogger(),
      page,
      config,
      siteUrl: 'https://example.com',
    };

    const tags = generateOpenGraphTags(ctx);
    expect(tags.join('\n')).not.toContain('article:published_time');
  });
});

describe('SEO Generator - generateTwitterCardTags', () => {
  it('should generate basic Twitter Card tags', () => {
    const page = createMockPage();
    const config = createMockConfig();
    const ctx: SEOContext = {
      logger: createMockLogger(),
      page,
      config,
      siteUrl: 'https://example.com',
    };

    const tags = generateTwitterCardTags(ctx);
    expect(tags.some((t) => t.includes('twitter:card'))).toBe(true);
    expect(tags.some((t) => t.includes('twitter:title'))).toBe(true);
    expect(tags.some((t) => t.includes('twitter:description'))).toBe(true);
  });

  it('should use default card type', () => {
    const page = createMockPage();
    const config = createMockConfig();
    const ctx: SEOContext = {
      logger: createMockLogger(),
      page,
      config,
      siteUrl: 'https://example.com',
    };

    const tags = generateTwitterCardTags(ctx);
    expect(tags.join('\n')).toContain('twitter:card" content="summary_large_image"');
  });

  it('should fall back to site description when page has no description', () => {
    const page = createMockPage({
      frontMatter: {
        title: 'Page Without Description',
      },
    });
    const config = createMockConfig({
      site: {
        title: 'Test Site',
        baseUrl: 'https://example.com',
        description: 'Default site description for Twitter Cards',
      },
    });
    const ctx: SEOContext = {
      logger: createMockLogger(),
      page,
      config,
      siteUrl: 'https://example.com',
    };

    const tags = generateTwitterCardTags(ctx);
    expect(tags.join('\n')).toContain(
      'twitter:description" content="Default site description for Twitter Cards"',
    );
  });

  it('should use custom card type', () => {
    const page = createMockPage({
      frontMatter: {
        seo: {
          twitter: {
            card: 'summary',
          },
        },
      },
    });
    const config = createMockConfig();
    const ctx: SEOContext = {
      logger: createMockLogger(),
      page,
      config,
      siteUrl: 'https://example.com',
    };

    const tags = generateTwitterCardTags(ctx);
    expect(tags.join('\n')).toContain('twitter:card" content="summary"');
  });

  it('should generate Twitter site handle', () => {
    const page = createMockPage({
      frontMatter: {
        seo: {
          twitter: {
            site: '@example',
          },
        },
      },
    });
    const config = createMockConfig();
    const ctx: SEOContext = {
      logger: createMockLogger(),
      page,
      config,
      siteUrl: 'https://example.com',
    };

    const tags = generateTwitterCardTags(ctx);
    expect(tags.join('\n')).toContain('twitter:site" content="@example"');
  });

  it('should generate Twitter creator from twitter config', () => {
    const page = createMockPage({
      frontMatter: {
        seo: {
          twitter: {
            creator: '@johndoe',
          },
        },
      },
    });
    const config = createMockConfig();
    const ctx: SEOContext = {
      logger: createMockLogger(),
      page,
      config,
      siteUrl: 'https://example.com',
    };

    const tags = generateTwitterCardTags(ctx);
    expect(tags.join('\n')).toContain('twitter:creator" content="@johndoe"');
  });

  it('should fallback to SEO author for creator', () => {
    const page = createMockPage({
      frontMatter: {
        seo: {
          author: 'John Doe',
        },
      },
    });
    const config = createMockConfig();
    const ctx: SEOContext = {
      logger: createMockLogger(),
      page,
      config,
      siteUrl: 'https://example.com',
    };

    const tags = generateTwitterCardTags(ctx);
    expect(tags.join('\n')).toContain('twitter:creator" content="John Doe"');
  });

  it('should fallback to default author for creator', () => {
    const page = createMockPage();
    const config = createMockConfig({
      seo: {
        defaultAuthor: {
          name: 'Site Author',
        },
      },
    });
    const ctx: SEOContext = {
      logger: createMockLogger(),
      page,
      config,
      siteUrl: 'https://example.com',
    };

    const tags = generateTwitterCardTags(ctx);
    expect(tags.join('\n')).toContain('twitter:creator" content="Site Author"');
  });

  it('should use Twitter-specific title and description', () => {
    const page = createMockPage({
      frontMatter: {
        title: 'Page Title',
        seo: {
          twitter: {
            title: 'Twitter Title',
            description: 'Twitter Description',
          },
        },
      },
    });
    const config = createMockConfig();
    const ctx: SEOContext = {
      logger: createMockLogger(),
      page,
      config,
      siteUrl: 'https://example.com',
    };

    const tags = generateTwitterCardTags(ctx);
    const joined = tags.join('\n');
    expect(joined).toContain('twitter:title" content="Twitter Title"');
    expect(joined).toContain('twitter:description" content="Twitter Description"');
  });

  it('should generate Twitter image', () => {
    const page = createMockPage({
      frontMatter: {
        seo: {
          twitter: {
            image: 'https://example.com/twitter.jpg',
          },
        },
      },
    });
    const config = createMockConfig();
    const ctx: SEOContext = {
      logger: createMockLogger(),
      page,
      config,
      siteUrl: 'https://example.com',
    };

    const tags = generateTwitterCardTags(ctx);
    expect(tags.join('\n')).toContain('twitter:image" content="https://example.com/twitter.jpg"');
  });

  it('should convert relative Twitter image to absolute', () => {
    const page = createMockPage({
      frontMatter: {
        seo: {
          twitter: {
            image: '/images/twitter.jpg',
          },
        },
      },
    });
    const config = createMockConfig();
    const ctx: SEOContext = {
      logger: createMockLogger(),
      page,
      config,
      siteUrl: 'https://example.com',
    };

    const tags = generateTwitterCardTags(ctx);
    expect(tags.join('\n')).toContain(
      'twitter:image" content="https://example.com/images/twitter.jpg"',
    );
  });

  it('should fallback to OG image for Twitter image', () => {
    const page = createMockPage({
      frontMatter: {
        seo: {
          openGraph: {
            image: 'https://example.com/og.jpg',
          },
        },
      },
    });
    const config = createMockConfig();
    const ctx: SEOContext = {
      logger: createMockLogger(),
      page,
      config,
      siteUrl: 'https://example.com',
    };

    const tags = generateTwitterCardTags(ctx);
    expect(tags.join('\n')).toContain('twitter:image" content="https://example.com/og.jpg"');
  });

  it('should generate Twitter image alt text', () => {
    const page = createMockPage({
      frontMatter: {
        seo: {
          twitter: {
            image: 'https://example.com/twitter.jpg',
            imageAlt: 'Twitter image description',
          },
        },
      },
    });
    const config = createMockConfig();
    const ctx: SEOContext = {
      logger: createMockLogger(),
      page,
      config,
      siteUrl: 'https://example.com',
    };

    const tags = generateTwitterCardTags(ctx);
    expect(tags.join('\n')).toContain('twitter:image:alt" content="Twitter image description"');
  });
});

describe('SEO Generator - generateSEO template helper', () => {
  it('should generate all tags when no include specified', () => {
    const stati = {
      page: createMockPage(),
      config: createMockConfig(),
    };

    const result = generateSEO(stati);
    expect(result).toContain('<title>');
    expect(result).toContain('<meta name="description"');
    expect(result).toContain('<link rel="canonical"');
  });

  it('should accept string array for tag selection', () => {
    const stati = {
      page: createMockPage(),
      config: createMockConfig(),
    };

    const result = generateSEO(stati, ['title', 'description']);
    expect(result).toContain('<title>');
    expect(result).toContain('<meta name="description"');
    expect(result).not.toContain('<link rel="canonical"');
  });

  it('should accept SEOTagType enum values', () => {
    const stati = {
      page: createMockPage(),
      config: createMockConfig(),
    };

    const result = generateSEO(stati, [SEOTagType.Title, SEOTagType.Description]);
    expect(result).toContain('<title>');
    expect(result).toContain('<meta name="description"');
    expect(result).not.toContain('<link rel="canonical"');
  });

  it('should accept mixed string and enum values', () => {
    const stati = {
      page: createMockPage(),
      config: createMockConfig(),
    };

    const result = generateSEO(stati, ['title', SEOTagType.Description]);
    expect(result).toContain('<title>');
    expect(result).toContain('<meta name="description"');
  });

  it('should handle invalid tag names gracefully', () => {
    const stati = {
      page: createMockPage(),
      config: createMockConfig(),
    };

    // Invalid tag name should be ignored
    const result = generateSEO(stati, ['title', 'invalidTag']);
    expect(result).toContain('<title>');
    // Should only have title tag, not all tags
    expect(result).not.toContain('<link rel="canonical"');
  });

  it('should extract siteUrl from config.site.baseUrl', () => {
    const stati = {
      page: createMockPage({ url: '/page' }),
      config: createMockConfig({
        site: {
          title: 'Test Site',
          baseUrl: 'https://example.com',
        },
      }),
    };

    const result = generateSEO(stati, ['canonical']);
    expect(result).toContain('https://example.com/page');
  });

  it('should handle empty siteUrl', () => {
    const stati = {
      page: createMockPage({ url: '/page' }),
      config: {
        site: {
          title: 'Test Site',
          baseUrl: '', // Empty baseUrl to test empty siteUrl
        },
      } as StatiConfig,
    };

    const result = generateSEO(stati, ['canonical']);
    expect(result).toContain('<link rel="canonical" href="/page">');
  });
});
