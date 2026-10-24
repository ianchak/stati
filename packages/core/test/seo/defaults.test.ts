import { describe, it, expect, vi } from 'vitest';
import {
  applySEODefaults,
  isArticlePage,
  refreshSEODefaults,
  resolveSEODefaults,
  toOpenGraphLocale,
  toTwitterHandle,
  validateSEOConfig,
} from '../../src/seo/defaults.js';
import { ConfigValidationError } from '../../src/config/errors.js';
import type {
  AuthorConfig,
  Logger,
  PageModel,
  SEOMetadata,
  StatiConfig,
} from '../../src/types/index.js';

function createPage(overrides: Partial<PageModel> = {}): PageModel {
  return {
    slug: '/blog/post',
    url: '/blog/post',
    sourcePath: '/site/blog/post.md',
    content: '',
    frontMatter: {},
    ...overrides,
  };
}

function createConfig(
  seo: StatiConfig['seo'] = {},
  site: Partial<StatiConfig['site']> = {},
): StatiConfig {
  return {
    site: { title: 'Test Site', baseUrl: 'https://example.com', ...site },
    seo,
  };
}

function createLogger(): Logger {
  return {
    info: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
    status: vi.fn(),
    building: vi.fn(),
    processing: vi.fn(),
    stats: vi.fn(),
  };
}

const ARTICLE_CONFIG = createConfig({
  defaultAuthor: { name: 'Ada', url: 'https://example.com/about', twitter: '@ada' },
  articles: { include: ['/blog/**'], exclude: ['/blog/drafts/**'] },
});

const POST = createPage({
  publishedAt: new Date('2026-01-01T00:00:00Z'),
  frontMatter: { title: 'Post', tags: ['css', 'html'], updated: '2026-02-01' },
});

describe('toOpenGraphLocale', () => {
  it.each([
    ['en-US', 'en_US'],
    ['pt-br', 'pt_BR'],
    ['zh-Hant-TW', 'zh_TW'],
    ['EN-gb', 'en_GB'],
    ['fr_FR', 'fr_FR'],
    ['de-DE-u-co-phonebk', 'de_DE'],
    ['zh-yue-HK', 'zh_HK'],
  ])('converts %s to %s', (locale, expected) => {
    expect(toOpenGraphLocale(locale)).toBe(expected);
  });

  it.each(['en', 'zh-Hant', 'es-419', 'en-u-ca-gregory', '', 'english-US', 'x-klingon'])(
    'has no Open Graph form for %j',
    (locale) => {
      expect(toOpenGraphLocale(locale)).toBeUndefined();
    },
  );
});

describe('toTwitterHandle', () => {
  it.each([
    ['ada', '@ada'],
    ['@ada', '@ada'],
    ['  @@ada ', '@ada'],
  ])('normalizes %j to %j', (value, expected) => {
    expect(toTwitterHandle(value)).toBe(expected);
  });

  it.each(['', '@', '   ', undefined, 42])('has no handle for %j', (value) => {
    expect(toTwitterHandle(value)).toBeUndefined();
  });
});

describe('isArticlePage', () => {
  it('matches pages by URL, exclude first', () => {
    expect(isArticlePage(createPage({ url: '/blog/post' }), ARTICLE_CONFIG)).toBe(true);
    expect(isArticlePage(createPage({ url: '/blog/2026/post' }), ARTICLE_CONFIG)).toBe(true);
    expect(isArticlePage(createPage({ url: '/blog' }), ARTICLE_CONFIG)).toBe(false);
    expect(isArticlePage(createPage({ url: '/about' }), ARTICLE_CONFIG)).toBe(false);
    expect(isArticlePage(createPage({ url: '/blog/drafts/idea' }), ARTICLE_CONFIG)).toBe(false);
  });

  it('never matches generated pages or the pages of a paginated listing', () => {
    const generated = createPage({
      url: '/blog/tags/css',
      generated: { key: 'css', label: 'css', template: 'blog/tags/[tag].md', items: [] },
    });
    const pagination = { totalPages: 2, items: [], urls: ['/blog/list', '/blog/list/page/2'] };
    const firstPage = createPage({
      url: '/blog/list',
      pagination: { ...pagination, pageNumber: 1 },
    });
    const laterPage = createPage({
      url: '/blog/list/page/2',
      pagination: { ...pagination, pageNumber: 2 },
    });

    expect(isArticlePage(generated, ARTICLE_CONFIG)).toBe(false);
    expect(isArticlePage(firstPage, ARTICLE_CONFIG)).toBe(false);
    expect(isArticlePage(laterPage, ARTICLE_CONFIG)).toBe(false);
  });

  it('matches nothing without seo.articles', () => {
    expect(isArticlePage(POST, createConfig())).toBe(false);
  });
});

describe('resolveSEODefaults', () => {
  it('fills in the locale, handles and article metadata', () => {
    const config = createConfig(
      { ...ARTICLE_CONFIG.seo, twitter: { site: 'example' } },
      { defaultLocale: 'en-US' },
    );

    expect(resolveSEODefaults(POST, config)).toEqual({
      openGraph: {
        locale: 'en_US',
        type: 'article',
        article: {
          publishedTime: '2026-01-01T00:00:00.000Z',
          modifiedTime: '2026-02-01T00:00:00.000Z',
          tags: ['css', 'html'],
          author: 'https://example.com/about',
        },
      },
      twitter: { site: '@example', creator: '@ada' },
    });
  });

  it('reads an unquoted YAML date in updated', () => {
    // YAML parses an unquoted date into a Date, whatever the FrontMatter type says
    const updated = new Date('2026-03-01T12:00:00Z') as unknown as string;
    const page = createPage({ frontMatter: { updated } });
    expect(resolveSEODefaults(page, ARTICLE_CONFIG)?.openGraph?.article?.modifiedTime).toBe(
      '2026-03-01T12:00:00.000Z',
    );
  });

  it('fills in article values one by one, keeping the ones front matter sets', () => {
    const page = createPage({
      ...POST,
      frontMatter: {
        ...POST.frontMatter,
        seo: { openGraph: { article: { section: 'CSS', tags: ['layout'] } } },
      },
    });

    expect(resolveSEODefaults(page, ARTICLE_CONFIG)?.openGraph?.article).toEqual({
      section: 'CSS',
      tags: ['layout'],
      publishedTime: '2026-01-01T00:00:00.000Z',
      modifiedTime: '2026-02-01T00:00:00.000Z',
      author: 'https://example.com/about',
    });
  });

  it('keeps every value front matter sets', () => {
    const seo = {
      openGraph: { locale: 'de-DE', type: 'article', article: { publishedTime: '2020' } },
      twitter: { creator: '@me', site: '@mysite' },
    };
    const page = createPage({ ...POST, frontMatter: { ...POST.frontMatter, seo } });
    const config = createConfig(
      { ...ARTICLE_CONFIG.seo, twitter: { site: '@example' } },
      { defaultLocale: 'en-US' },
    );

    const resolved = resolveSEODefaults(page, config);
    expect(resolved?.openGraph?.locale).toBe('de-DE');
    expect(resolved?.openGraph?.article?.publishedTime).toBe('2020');
    expect(resolved?.twitter).toEqual({ creator: '@me', site: '@mysite' });
  });

  it('fills in no article values on a matching page that sets another type', () => {
    const page = createPage({
      ...POST,
      frontMatter: { ...POST.frontMatter, seo: { openGraph: { type: 'website' } } },
    });

    expect(resolveSEODefaults(page, ARTICLE_CONFIG)?.openGraph).toEqual({ type: 'website' });
  });

  it("uses the page's own author for the handle and article:author", () => {
    const resolve = (author: string | AuthorConfig) =>
      resolveSEODefaults(
        createPage({ ...POST, frontMatter: { ...POST.frontMatter, seo: { author } } }),
        ARTICLE_CONFIG,
      );

    const guest = resolve({ name: 'Guest', url: 'https://guest.dev', twitter: 'guest' });
    expect(guest?.twitter?.creator).toBe('@guest');
    expect(guest?.openGraph?.article?.author).toBe('https://guest.dev');

    const named = resolve('Guest');
    expect(named?.twitter).toBeUndefined();
    expect(named?.openGraph?.article?.author).toBeUndefined();
  });

  it('returns the front matter value itself when there is nothing to fill in', () => {
    const seo = { title: 'Custom' };
    const page = createPage({ url: '/about', frontMatter: { seo } });
    const config = createConfig({ articles: { include: ['/blog/*'] } }, { defaultLocale: 'en' });

    expect(resolveSEODefaults(page, config)).toBe(seo);
    expect(resolveSEODefaults(createPage({ url: '/about' }), createConfig())).toBeUndefined();
  });

  it('copies the objects it fills in, so resolving again gives the same result', () => {
    const shared = { openGraph: { siteName: 'Shared' } };
    const page = createPage({ ...POST, frontMatter: { ...POST.frontMatter, seo: shared } });

    const resolved = resolveSEODefaults(page, ARTICLE_CONFIG);
    expect(shared).toEqual({ openGraph: { siteName: 'Shared' } });
    expect(resolved?.openGraph?.siteName).toBe('Shared');

    const again = resolveSEODefaults(
      { ...page, frontMatter: { ...page.frontMatter, seo: resolved as SEOMetadata } },
      ARTICLE_CONFIG,
    );
    expect(again).toBe(resolved);
  });

  it('leaves a seo value that is not an object to validation', () => {
    const page = createPage({ frontMatter: { seo: 'oops' as never } });
    expect(resolveSEODefaults(page, ARTICLE_CONFIG)).toBe('oops');
  });

  it('leaves openGraph, article and twitter values that are not objects as they are', () => {
    const seo = { openGraph: 'og', twitter: 'tw' } as unknown as SEOMetadata;
    const page = createPage({ ...POST, frontMatter: { ...POST.frontMatter, seo } });
    expect(resolveSEODefaults(page, ARTICLE_CONFIG)).toBe(seo);

    const article = { openGraph: { article: 'a' } } as unknown as SEOMetadata;
    const withArticle = createPage({ ...POST, frontMatter: { ...POST.frontMatter, seo: article } });
    expect(resolveSEODefaults(withArticle, ARTICLE_CONFIG)?.openGraph).toEqual({
      article: 'a',
      type: 'article',
    });
  });

  describe('the 404 page', () => {
    const notFound = (url: string, seo?: SEOMetadata) =>
      createPage({ url, frontMatter: seo ? { seo } : {} });

    it('fills in noindex on the page at /404 or /404/', () => {
      expect(resolveSEODefaults(notFound('/404'), createConfig())).toEqual({ noindex: true });
      expect(resolveSEODefaults(notFound('/404/'), createConfig())).toEqual({ noindex: true });
      expect(resolveSEODefaults(notFound('/404', { title: 'Lost' }), createConfig())).toEqual({
        title: 'Lost',
        noindex: true,
      });
    });

    it('keeps a noindex value, or a robots value that says whether to index', () => {
      for (const seo of [
        { noindex: false },
        { noindex: true },
        { robots: 'index, follow' },
        { robots: 'NOINDEX' },
        { robots: 'all' },
        { robots: 'noarchive none' },
        { robots: { index: true } },
        { robots: { index: false, follow: false } },
      ] as SEOMetadata[]) {
        expect(resolveSEODefaults(notFound('/404', seo), createConfig()), JSON.stringify(seo)).toBe(
          seo,
        );
      }
    });

    it('fills in noindex next to robots values that leave indexing open', () => {
      for (const robots of [
        'nofollow',
        'max-image-preview:none',
        'max-image-preview: none',
        { follow: false },
        {},
      ]) {
        expect(resolveSEODefaults(notFound('/404', { robots }), createConfig())).toEqual({
          robots,
          noindex: true,
        });
      }
    });

    it('fills in nothing on a page named 404 in a subfolder', () => {
      expect(resolveSEODefaults(notFound('/docs/404'), createConfig())).toBeUndefined();
    });

    it('gives the same result when resolving again', () => {
      const resolved = resolveSEODefaults(notFound('/404'), createConfig());
      expect(resolveSEODefaults(notFound('/404', resolved), createConfig())).toBe(resolved);
    });
  });
});

describe('refreshSEODefaults', () => {
  const config = createConfig(
    { ...ARTICLE_CONFIG.seo, twitter: { site: '@example' } },
    {
      defaultLocale: 'en-US',
    },
  );
  const applied = () => {
    const page = createPage({ ...POST, frontMatter: { ...POST.frontMatter } });
    applySEODefaults([page], config, createLogger());
    return page;
  };

  it('fills in values from what a beforeRender hook changed', () => {
    const page = applied();
    page.frontMatter.seo!.author = { name: 'Guest', url: 'https://guest.dev', twitter: '@guest' };
    page.frontMatter.tags = ['guest'];

    refreshSEODefaults(page, config);

    expect(page.frontMatter.seo?.twitter).toEqual({ site: '@example', creator: '@guest' });
    expect(page.frontMatter.seo?.openGraph?.article).toEqual({
      publishedTime: '2026-01-01T00:00:00.000Z',
      modifiedTime: '2026-02-01T00:00:00.000Z',
      tags: ['guest'],
      author: 'https://guest.dev',
    });
  });

  it('keeps values a beforeRender hook set', () => {
    const page = applied();
    page.frontMatter.seo!.twitter!.creator = '@hook';
    page.frontMatter.seo!.openGraph!.type = 'website';
    page.frontMatter.seo!.author = 'Guest';

    refreshSEODefaults(page, config);

    expect(page.frontMatter.seo?.twitter?.creator).toBe('@hook');
    expect(page.frontMatter.seo?.openGraph?.type).toBe('website');
  });

  it('removes values whose source a beforeRender hook removed', () => {
    const page = applied();
    page.frontMatter.seo!.author = 'Guest';
    page.url = '/about';

    refreshSEODefaults(page, config);

    expect(page.frontMatter.seo?.twitter).toEqual({ site: '@example' });
    expect(page.frontMatter.seo?.openGraph).toEqual({ locale: 'en_US' });
  });

  it('gives the same values when a beforeRender hook changed nothing', () => {
    const page = applied();
    const before: unknown = JSON.parse(JSON.stringify(page.frontMatter.seo));

    refreshSEODefaults(page, config);

    expect(page.frontMatter.seo).toEqual(before);
  });

  it('fills in defaults on a page that had none before the hook', () => {
    const page = createPage({ url: '/about', frontMatter: {} });
    applySEODefaults([page], createConfig(), createLogger());
    page.frontMatter.seo = { author: { name: 'Guest', twitter: 'guest' } };

    refreshSEODefaults(page, createConfig());

    expect(page.frontMatter.seo?.twitter?.creator).toBe('@guest');
  });

  it("removes the 404 page's noindex when a beforeRender hook moves the page", () => {
    const page = createPage({ url: '/404', frontMatter: {} });
    applySEODefaults([page], createConfig(), createLogger());
    expect(page.frontMatter.seo).toEqual({ noindex: true });
    page.url = '/not-found';

    refreshSEODefaults(page, createConfig());

    expect(page.frontMatter.seo).toEqual({});
  });

  it("keeps the 404 page's robots values a beforeRender hook set", () => {
    const pages = [0, 1, 2, 3].map(() => createPage({ url: '/404', frontMatter: {} }));
    applySEODefaults(pages, createConfig(), createLogger());
    const [indexed, robotsIndex, nofollow, both] = pages as [
      PageModel,
      PageModel,
      PageModel,
      PageModel,
    ];
    indexed.frontMatter.seo!.noindex = false;
    robotsIndex.frontMatter.seo!.robots = 'index, follow';
    nofollow.frontMatter.seo!.robots = 'nofollow';
    both.frontMatter.seo!.noindex = true;
    both.frontMatter.seo!.robots = 'nofollow';

    for (const page of pages) {
      refreshSEODefaults(page, createConfig());
    }

    expect(indexed.frontMatter.seo).toEqual({ noindex: false });
    expect(robotsIndex.frontMatter.seo).toEqual({ robots: 'index, follow' });
    // nofollow says nothing about indexing, so the page stays noindex
    expect(nofollow.frontMatter.seo).toEqual({ noindex: true, robots: 'nofollow' });
    expect(both.frontMatter.seo).toEqual({ noindex: true, robots: 'nofollow' });
  });
});

describe('applySEODefaults', () => {
  it('writes the resolved values into front matter', () => {
    const page = createPage({ ...POST, frontMatter: { ...POST.frontMatter } });
    const about = createPage({ url: '/about', frontMatter: { title: 'About' } });

    applySEODefaults([page, about], ARTICLE_CONFIG, createLogger());

    expect(page.frontMatter.seo?.openGraph?.type).toBe('article');
    expect(about.frontMatter.seo).toEqual({ twitter: { creator: '@ada' } });
  });

  it('adds no seo key to pages without defaults', () => {
    const page = createPage({ url: '/about', frontMatter: { title: 'About' } });

    applySEODefaults([page], createConfig(), createLogger());

    expect('seo' in page.frontMatter).toBe(false);
  });

  it('warns under seo.debug when the default locale has no region', () => {
    const logger = createLogger();
    applySEODefaults([], createConfig({ debug: true }, { defaultLocale: 'en' }), logger);
    expect(logger.warning).toHaveBeenCalledWith(
      expect.stringContaining('site.defaultLocale "en" has no region'),
    );

    const quiet = createLogger();
    applySEODefaults([], createConfig({}, { defaultLocale: 'en' }), quiet);
    applySEODefaults([], createConfig({ debug: true }, { defaultLocale: 'en-US' }), quiet);
    expect(quiet.warning).not.toHaveBeenCalled();
  });
});

describe('validateSEOConfig', () => {
  it('accepts the new options', () => {
    expect(() =>
      validateSEOConfig({
        defaultAuthor: { name: 'Ada', twitter: '@ada' },
        twitter: { site: '@example' },
        articles: { include: ['/blog/*'], exclude: ['/blog/draft'] },
      }),
    ).not.toThrow();
    expect(() => validateSEOConfig(undefined)).not.toThrow();
  });

  it.each([
    ['a seo value that is not an object', 'yes', 'seo must be an object'],
    [
      'a handle that is not a string',
      { defaultAuthor: { name: 'Ada', twitter: 1 } },
      'seo.defaultAuthor.twitter must be a handle',
    ],
    ['seo.twitter as a string', { twitter: '@example' }, 'seo.twitter must be an object'],
    ['an unknown seo.twitter option', { twitter: { creator: '@x' } }, 'seo.twitter.creator'],
    ['a site handle that is not a string', { twitter: { site: true } }, 'seo.twitter.site'],
    ['seo.articles as an array', { articles: ['/blog/*'] }, 'seo.articles must be an object'],
    ['a missing include', { articles: {} }, 'seo.articles.include must be an array'],
    ['include as a string', { articles: { include: '/blog/*' } }, 'seo.articles.include'],
    [
      'exclude with a number',
      { articles: { include: [], exclude: [1] } },
      'seo.articles.exclude must be an array',
    ],
    ['an unknown seo.articles option', { articles: { include: [], all: true } }, 'all'],
  ])('rejects %s', (_, seo, message) => {
    expect(() => validateSEOConfig(seo)).toThrow(ConfigValidationError);
    expect(() => validateSEOConfig(seo)).toThrow(message);
  });

  it('describes a value JSON cannot represent', () => {
    expect(() => validateSEOConfig({ twitter: { site: 10n } })).toThrow('(got 10)');
  });
});
