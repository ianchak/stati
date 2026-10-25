/**
 * Google News sitemap tests
 */

import { describe, it, expect, vi } from 'vitest';
import {
  generateNewsSitemap,
  generateNewsSitemapXml,
  resolveNewsSitemapFilename,
  validateSitemapConfig,
} from '../../src/seo/news-sitemap.js';
import { ConfigValidationError } from '../../src/config/errors.js';
import type { PageModel } from '../../src/types/content.js';
import type { StatiConfig } from '../../src/types/config.js';
import type { NewsSitemapConfig } from '../../src/types/sitemap.js';
import type { Logger } from '../../src/types/logging.js';

const NOW = new Date('2026-10-25T12:00:00Z');
const HOUR = 60 * 60 * 1000;

const config = (site: Partial<StatiConfig['site']> = {}): StatiConfig =>
  ({
    site: { title: 'Stati News', baseUrl: 'https://example.com', ...site },
  }) as StatiConfig;

/** A page published `hoursAgo` hours before NOW */
const article = (
  url: string,
  hoursAgo: number | undefined,
  frontMatter: Record<string, unknown> = {},
  extra: Partial<PageModel> = {},
): PageModel =>
  ({
    slug: url.slice(1),
    url,
    sourcePath: `/site${url}.md`,
    content: '',
    frontMatter: { title: `Title of ${url}`, ...frontMatter },
    ...(hoursAgo !== undefined && { publishedAt: new Date(NOW.getTime() - hoursAgo * HOUR) }),
    ...extra,
  }) as PageModel;

const news = (overrides: Partial<NewsSitemapConfig> = {}): NewsSitemapConfig => ({
  include: ['/news/*/*'],
  ...overrides,
});

const urls = (xml: string) => [...xml.matchAll(/<loc>([^<]*)<\/loc>/g)].map((match) => match[1]);

function createLogger() {
  return { warning: vi.fn() } as unknown as Logger & { warning: ReturnType<typeof vi.fn> };
}

describe('generateNewsSitemap', () => {
  it('writes the news namespace with publication, date and title for a recent article', () => {
    const pages = [article('/news/world/first', 5)];

    const result = generateNewsSitemap(pages, config(), news(), undefined, NOW);

    expect(result.xml).toBe(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
  <url>
    <loc>https://example.com/news/world/first</loc>
    <news:news>
      <news:publication>
        <news:name>Stati News</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:publication_date>2026-10-25T07:00:00.000Z</news:publication_date>
      <news:title>Title of /news/world/first</news:title>
    </news:news>
  </url>
</urlset>
`);
    expect(result.entryCount).toBe(1);
    expect(result.sizeInBytes).toBe(Buffer.byteLength(result.xml, 'utf8'));
    expect(result.filename).toBe('news-sitemap.xml');
  });

  it('writes dates as ISO 8601 with a time zone', () => {
    const pages = [article('/news/world/first', 1)];

    const { xml } = generateNewsSitemap(pages, config(), news(), undefined, NOW);

    expect(xml).toMatch(
      /<news:publication_date>\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z<\/news:publication_date>/,
    );
  });

  it('escapes titles, publication names and URLs', () => {
    const pages = [article('/news/world/a&b', 1, { title: `Fish & "Chips" <live> it's` })];

    const { xml } = generateNewsSitemap(
      pages,
      config({ baseUrl: 'https://example.com/a?x=1&y=2' }),
      news({ publicationName: 'Tom & Jerry <News>' }),
      undefined,
      NOW,
    );

    expect(xml).toContain(
      '<news:title>Fish &amp; &quot;Chips&quot; &lt;live&gt; it&#39;s</news:title>',
    );
    expect(xml).toContain('<news:name>Tom &amp; Jerry &lt;News&gt;</news:name>');
    expect(xml).toContain('<loc>https://example.com/a?x=1&amp;y=2/news/world/a&amp;b</loc>');
  });

  it('drops characters XML cannot hold', () => {
    const pages = [article('/news/world/first', 1, { title: 'Bell\u0007 and null\u0000 here' })];

    const { xml } = generateNewsSitemap(pages, config(), news(), undefined, NOW);

    expect(xml).toContain('<news:title>Bell and null here</news:title>');
  });

  it('only lists pages that match include', () => {
    const pages = [
      article('/news/world/in', 1),
      article('/news/world', 1),
      article('/blog/post', 1),
      article('/news/world/deep/er', 1),
    ];

    const { xml, entryCount } = generateNewsSitemap(pages, config(), news(), undefined, NOW);

    expect(urls(xml)).toEqual(['https://example.com/news/world/in']);
    expect(entryCount).toBe(1);
  });

  it('matches any of several include patterns', () => {
    const pages = [article('/news/a/one', 1), article('/live/two', 2), article('/blog/three', 3)];

    const { xml } = generateNewsSitemap(
      pages,
      config(),
      news({ include: ['/news/*/*', '/live/*'] }),
      undefined,
      NOW,
    );

    expect(urls(xml)).toEqual(['https://example.com/news/a/one', 'https://example.com/live/two']);
  });

  it('lists nothing for an empty include list', () => {
    const { xml, entryCount } = generateNewsSitemap(
      [article('/news/world/first', 1)],
      config(),
      news({ include: [] }),
      undefined,
      NOW,
    );

    expect(entryCount).toBe(0);
    expect(urls(xml)).toEqual([]);
  });

  describe('freshness', () => {
    it('leaves out articles older than two days by default', () => {
      const pages = [
        article('/news/w/fresh', 47),
        article('/news/w/stale', 49),
        article('/news/w/edge', 48),
      ];

      const { xml } = generateNewsSitemap(pages, config(), news(), undefined, NOW);

      expect(urls(xml)).toEqual([
        'https://example.com/news/w/fresh',
        'https://example.com/news/w/edge',
      ]);
    });

    it('uses maxAgeDays', () => {
      const pages = [article('/news/w/a', 20), article('/news/w/b', 30)];

      const { xml } = generateNewsSitemap(pages, config(), news({ maxAgeDays: 1 }), undefined, NOW);

      expect(urls(xml)).toEqual(['https://example.com/news/w/a']);
    });

    it('accepts a fraction of a day', () => {
      const pages = [article('/news/w/a', 10), article('/news/w/b', 14)];

      const { xml } = generateNewsSitemap(
        pages,
        config(),
        news({ maxAgeDays: 0.5 }),
        undefined,
        NOW,
      );

      expect(urls(xml)).toEqual(['https://example.com/news/w/a']);
    });

    it('counts back from the current time by default', () => {
      vi.useFakeTimers();
      try {
        vi.setSystemTime(NOW);
        const pages = [article('/news/w/fresh', 3), article('/news/w/stale', 100)];

        const { xml } = generateNewsSitemap(pages, config(), news());

        expect(urls(xml)).toEqual(['https://example.com/news/w/fresh']);
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe('leaving pages out', () => {
    it('leaves out drafts', () => {
      const pages = [article('/news/w/draft', 1, { draft: true }), article('/news/w/live', 1)];

      const { xml } = generateNewsSitemap(pages, config(), news(), undefined, NOW);

      expect(urls(xml)).toEqual(['https://example.com/news/w/live']);
    });

    it('leaves out generated pages and later pages of a listing', () => {
      const pages = [
        article('/news/w/generated', 1, {}, { generated: { key: 'k' } } as Partial<PageModel>),
        article('/news/w/page-2', 1, {}, {
          pagination: { pageNumber: 2 },
        } as unknown as Partial<PageModel>),
        article('/news/w/real', 1),
      ];

      const { xml } = generateNewsSitemap(pages, config(), news(), undefined, NOW);

      expect(urls(xml)).toEqual(['https://example.com/news/w/real']);
    });

    it('leaves out pages with sitemap.exclude, noindex pages and the 404 page', () => {
      const pages = [
        article('/news/w/excluded', 1, { sitemap: { exclude: true } }),
        article('/news/w/hidden', 1, { seo: { noindex: true } }),
        article('/news/w/robots', 1, { seo: { robots: 'noindex, follow' } }),
        article('/404', 1),
        article('/news/w/kept', 1),
      ];

      const { xml } = generateNewsSitemap(
        pages,
        config(),
        news({ include: ['/news/*/*', '/404'] }),
        undefined,
        NOW,
      );

      expect(urls(xml)).toEqual(['https://example.com/news/w/kept']);
    });

    it('keeps a noindex page that sets sitemap.exclude to false', () => {
      const pages = [
        article('/news/w/kept', 1, { seo: { noindex: true }, sitemap: { exclude: false } }),
      ];

      const { xml } = generateNewsSitemap(pages, config(), news(), undefined, NOW);

      expect(urls(xml)).toEqual(['https://example.com/news/w/kept']);
    });

    it('warns about an article without a publication date and leaves it out', () => {
      const logger = createLogger();
      const invalid = article('/news/w/invalid', 1);
      invalid.publishedAt = new Date('nope');
      const pages = [article('/news/w/undated', undefined), invalid, article('/news/w/ok', 1)];

      const { xml } = generateNewsSitemap(pages, config(), news(), logger, NOW);

      expect(urls(xml)).toEqual(['https://example.com/news/w/ok']);
      expect(logger.warning).toHaveBeenCalledTimes(2);
      expect(logger.warning).toHaveBeenCalledWith(expect.stringContaining('/news/w/undated'));
      expect(logger.warning).toHaveBeenCalledWith(expect.stringContaining('/news/w/invalid'));
    });

    it('leaves out an undated article without a logger', () => {
      const { xml } = generateNewsSitemap(
        [article('/news/w/undated', undefined)],
        config(),
        news(),
        undefined,
        NOW,
      );

      expect(urls(xml)).toEqual([]);
    });

    it('warns about an article without a title and leaves it out', () => {
      const logger = createLogger();
      const pages = [
        article('/news/w/blank', 1, { title: '   ' }),
        article('/news/w/missing', 1, { title: undefined }),
        article('/news/w/number', 1, { title: 42 }),
        article('/news/w/ok', 1),
      ];

      const { xml } = generateNewsSitemap(pages, config(), news(), logger, NOW);

      expect(urls(xml)).toEqual(['https://example.com/news/w/ok']);
      expect(logger.warning).toHaveBeenCalledTimes(3);
      expect(logger.warning).toHaveBeenCalledWith(expect.stringContaining('/news/w/blank'));
    });

    it('leaves out an untitled article without a logger', () => {
      const { xml } = generateNewsSitemap(
        [article('/news/w/blank', 1, { title: '' })],
        config(),
        news(),
        undefined,
        NOW,
      );

      expect(urls(xml)).toEqual([]);
    });

    it('does not warn about old articles that lack a title', () => {
      const logger = createLogger();

      generateNewsSitemap(
        [article('/news/w/old', 500, { title: '' })],
        config(),
        news(),
        logger,
        NOW,
      );

      expect(logger.warning).not.toHaveBeenCalled();
    });
  });

  describe('order and limit', () => {
    it('lists the newest article first, breaking ties by URL', () => {
      const pages = [
        article('/news/w/old', 40),
        article('/news/w/b', 2),
        article('/news/w/new', 1),
        article('/news/w/a', 2),
      ];

      const { xml } = generateNewsSitemap(pages, config(), news(), undefined, NOW);

      expect(urls(xml)).toEqual([
        'https://example.com/news/w/new',
        'https://example.com/news/w/a',
        'https://example.com/news/w/b',
        'https://example.com/news/w/old',
      ]);
    });

    it('lists at most 1000 articles, keeping the newest, and warns', () => {
      const logger = createLogger();
      const pages = Array.from({ length: 1003 }, (_, index) =>
        article(`/news/w/a${index}`, 1 + index / 1000),
      );

      const { xml, entryCount } = generateNewsSitemap(pages, config(), news(), logger, NOW);

      expect(entryCount).toBe(1000);
      const listed = urls(xml);
      expect(listed).toHaveLength(1000);
      expect(listed[0]).toBe('https://example.com/news/w/a0');
      expect(listed).not.toContain('https://example.com/news/w/a1002');
      expect(logger.warning).toHaveBeenCalledWith(expect.stringContaining('oldest 3'));
    });

    it('does not warn at exactly 1000 articles', () => {
      const logger = createLogger();
      const pages = Array.from({ length: 1000 }, (_, index) => article(`/news/w/a${index}`, 1));

      generateNewsSitemap(pages, config(), news(), logger, NOW);

      expect(logger.warning).not.toHaveBeenCalled();
    });

    it('limits without a logger', () => {
      const pages = Array.from({ length: 1001 }, (_, index) => article(`/news/w/a${index}`, 1));

      const { entryCount } = generateNewsSitemap(pages, config(), news(), undefined, NOW);

      expect(entryCount).toBe(1000);
    });
  });

  it('still writes a valid urlset when there is nothing to list', () => {
    const { xml, entryCount } = generateNewsSitemap([], config(), news(), undefined, NOW);

    expect(entryCount).toBe(0);
    expect(xml).toBe(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
</urlset>
`);
  });

  describe('URLs', () => {
    it('uses site.baseUrl', () => {
      const { xml } = generateNewsSitemap(
        [article('/news/w/first', 1)],
        config({ baseUrl: 'https://news.example.org/' }),
        news(),
        undefined,
        NOW,
      );

      expect(urls(xml)).toEqual(['https://news.example.org/news/w/first']);
    });

    it('keeps the base path of site.baseUrl', () => {
      const { xml } = generateNewsSitemap(
        [article('/news/w/first', 1)],
        config({ baseUrl: 'https://example.com/paper' }),
        news(),
        undefined,
        NOW,
      );

      expect(urls(xml)).toEqual(['https://example.com/paper/news/w/first']);
    });
  });

  describe('publication', () => {
    it('defaults the name to site.title', () => {
      const { xml } = generateNewsSitemap(
        [article('/news/w/first', 1)],
        config({ title: 'The Daily' }),
        news(),
        undefined,
        NOW,
      );

      expect(xml).toContain('<news:name>The Daily</news:name>');
    });

    it('uses publicationName', () => {
      const { xml } = generateNewsSitemap(
        [article('/news/w/first', 1)],
        config(),
        news({ publicationName: ' Evening Edition ' }),
        undefined,
        NOW,
      );

      expect(xml).toContain('<news:name>Evening Edition</news:name>');
    });

    it.each([
      [undefined, 'en'],
      ['en-US', 'en'],
      ['de', 'de'],
      ['pt_BR', 'pt'],
      ['HU-hu', 'hu'],
      ['zh-CN', 'zh-cn'],
      ['zh', 'zh-cn'],
      ['zh-Hans-CN', 'zh-cn'],
      ['zh-TW', 'zh-tw'],
      ['zh-Hant', 'zh-tw'],
      ['zh-HK', 'zh-tw'],
    ])('takes the language from site.defaultLocale %s: %s', (defaultLocale, language) => {
      const { xml } = generateNewsSitemap(
        [article('/news/w/first', 1)],
        config(defaultLocale === undefined ? {} : { defaultLocale }),
        news(),
        undefined,
        NOW,
      );

      expect(xml).toContain(`<news:language>${language}</news:language>`);
    });

    it('falls back to en for an empty locale', () => {
      const { xml } = generateNewsSitemap(
        [article('/news/w/first', 1)],
        config({ defaultLocale: '' }),
        news(),
        undefined,
        NOW,
      );

      expect(xml).toContain('<news:language>en</news:language>');
    });

    it('lowercases an explicit language', () => {
      const { xml } = generateNewsSitemap(
        [article('/news/w/first', 1)],
        config(),
        news({ language: ' ZH-CN ' }),
        undefined,
        NOW,
      );

      expect(xml).toContain('<news:language>zh-cn</news:language>');
    });

    it('prefers language over the locale', () => {
      const { xml } = generateNewsSitemap(
        [article('/news/w/first', 1)],
        config({ defaultLocale: 'de-DE' }),
        news({ language: 'fr' }),
        undefined,
        NOW,
      );

      expect(xml).toContain('<news:language>fr</news:language>');
    });
  });

  it('uses filename for the result', () => {
    const result = generateNewsSitemap(
      [],
      config(),
      news({ filename: 'latest.xml' }),
      undefined,
      NOW,
    );

    expect(result.filename).toBe('latest.xml');
  });
});

describe('resolveNewsSitemapFilename', () => {
  it('defaults to news-sitemap.xml', () => {
    expect(resolveNewsSitemapFilename(news())).toBe('news-sitemap.xml');
  });

  it('returns the configured name', () => {
    expect(resolveNewsSitemapFilename(news({ filename: 'a.xml' }))).toBe('a.xml');
  });
});

describe('generateNewsSitemapXml', () => {
  it('writes every entry with the same publication', () => {
    const xml = generateNewsSitemapXml(
      [
        { url: 'https://example.com/a', title: 'A', publishedAt: new Date('2026-10-25T01:00:00Z') },
        { url: 'https://example.com/b', title: 'B', publishedAt: new Date('2026-10-24T01:00:00Z') },
      ],
      { name: 'Paper', language: 'en' },
    );

    expect(xml.match(/<news:name>Paper<\/news:name>/g)).toHaveLength(2);
    expect(xml.match(/<news:language>en<\/news:language>/g)).toHaveLength(2);
    expect(urls(xml)).toEqual(['https://example.com/a', 'https://example.com/b']);
  });
});

describe('validateSitemapConfig', () => {
  const invalid = (sitemap: unknown, message: string | RegExp) => {
    expect(() => validateSitemapConfig(sitemap)).toThrow(ConfigValidationError);
    expect(() => validateSitemapConfig(sitemap)).toThrow(message);
  };

  it('accepts a missing sitemap, no news and a valid news block', () => {
    expect(() => validateSitemapConfig(undefined)).not.toThrow();
    expect(() => validateSitemapConfig({ enabled: true })).not.toThrow();
    expect(() => validateSitemapConfig({ enabled: true, news: undefined })).not.toThrow();
    expect(() =>
      validateSitemapConfig({
        news: {
          include: ['/news/*/*'],
          publicationName: 'Paper',
          language: 'en',
          maxAgeDays: 2,
          filename: 'news-sitemap.xml',
        },
      }),
    ).not.toThrow();
    expect(() => validateSitemapConfig({ news: { include: [] } })).not.toThrow();
  });

  it('ignores a sitemap value that is not an object', () => {
    expect(() => validateSitemapConfig(true)).not.toThrow();
    expect(() => validateSitemapConfig(null)).not.toThrow();
    expect(() => validateSitemapConfig([])).not.toThrow();
  });

  it('rejects news that is not an object', () => {
    invalid({ news: true }, 'sitemap.news must be an object');
    invalid({ news: null }, 'sitemap.news must be an object');
    invalid({ news: ['/news/*'] }, 'sitemap.news must be an object');
  });

  it('rejects an unknown option', () => {
    invalid({ news: { include: [], exclude: [] } }, 'Unknown option sitemap.news.exclude');
  });

  it('requires include to be an array of strings', () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    invalid({ news: { include: circular } }, 'sitemap.news.include must be an array');
    invalid({ news: {} }, 'sitemap.news.include must be an array');
    invalid({ news: { include: '/news/*' } }, 'sitemap.news.include must be an array');
    invalid({ news: { include: ['/news/*', 3] } }, 'sitemap.news.include must be an array');
  });

  it.each(['publicationName', 'language'])('rejects an invalid %s', (key) => {
    invalid({ news: { include: [], [key]: '' } }, `sitemap.news.${key} must be a non-empty string`);
    invalid(
      { news: { include: [], [key]: '  ' } },
      `sitemap.news.${key} must be a non-empty string`,
    );
    invalid({ news: { include: [], [key]: 5 } }, `sitemap.news.${key} must be a non-empty string`);
  });

  it('rejects a language that is not an ISO 639 code', () => {
    for (const language of ['en-US', 'english', 'e', 'zh-hk', 'de_AT']) {
      invalid({ news: { include: [], language } }, 'sitemap.news.language must be an ISO 639');
    }
    for (const language of ['en', 'DE', 'fil', 'zh-CN', ' zh-tw ']) {
      expect(() => validateSitemapConfig({ news: { include: [], language } })).not.toThrow();
    }
  });

  it('rejects an invalid maxAgeDays', () => {
    for (const maxAgeDays of [0, -1, Number.NaN, Infinity, '2']) {
      invalid({ news: { include: [], maxAgeDays } }, 'sitemap.news.maxAgeDays must be a number');
    }
  });

  it('rejects a filename that is not a plain XML file name', () => {
    for (const filename of ['news.txt', 'news', 'sub/news.xml', 'sub\\news.xml', '.xml', 5]) {
      invalid(
        { news: { include: [], filename } },
        'sitemap.news.filename must be an XML file name',
      );
    }
  });

  it('rejects the file names of the main sitemap, whatever the case', () => {
    for (const filename of ['sitemap.xml', 'sitemap-2.xml', 'Sitemap.XML']) {
      invalid({ news: { include: [], filename } }, `'${filename}' is used by the main sitemap`);
    }
  });
});
