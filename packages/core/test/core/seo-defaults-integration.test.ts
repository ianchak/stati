import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadConfig } from '../../src/config/loader.js';
import { setEnv } from '../../src/env.js';
import type { StatiConfig } from '../../src/types/index.js';
import { createSiteFixture, page, type SiteFixture } from './site-fixture.js';

vi.mock('../../src/config/loader.js', () => ({
  loadConfig: vi.fn(),
}));

/** Prints what the page's own front matter holds for SEO after Stati filled in its defaults */
const LAYOUT = `<html><head><title><%= stati.page.title %></title></head><body>
<p>type=<%= stati.page.seo?.openGraph?.type ?? 'none' %></p><%~ stati.content %></body></html>`;

const sorted = (urls: string[]) => [...urls].sort();

const config = (seo: StatiConfig['seo'] = {}, defaultLocale = 'en-US'): StatiConfig => ({
  srcDir: 'site',
  outDir: 'dist',
  staticDir: 'public',
  site: { title: 'Fixture', baseUrl: 'https://example.com', defaultLocale },
  isg: { enabled: true, ttlSeconds: 3600 },
  seo: {
    defaultAuthor: { name: 'Ada', url: 'https://example.com/about', twitter: 'ada' },
    twitter: { site: '@example' },
    articles: { include: ['/blog/**'] },
    ...seo,
  },
});

/** The content of each meta tag with this property or name, in order */
function meta(html: string, key: string): string[] {
  const pattern = new RegExp(`<meta (?:property|name)="${key}" content="([^"]*)">`, 'g');
  return [...html.matchAll(pattern)].map((match) => match[1] ?? '');
}

describe('site-wide SEO defaults', () => {
  let site: SiteFixture;

  beforeEach(async () => {
    setEnv('production');
    site = await createSiteFixture(vi.mocked(loadConfig), config());
    await site.write('site/layout.eta', LAYOUT);
    await site.write('site/index.md', page({ title: 'Home' }));
    await site.write('site/about.md', page({ title: 'About' }));
    await site.write('site/blog/index.md', page({ title: 'Blog', paginate: 1 }));
    await site.write(
      'site/blog/first.md',
      page({
        title: 'First',
        publishedAt: '2026-01-01',
        updated: '2026-01-15',
        tags: ['CSS', 'HTML'],
      }),
    );
    await site.write(
      'site/blog/second.md',
      page({
        title: 'Second',
        publishedAt: '2026-02-01',
        tags: ['CSS'],
        seo: {
          author: { name: 'Guest', twitter: '@guest' },
          openGraph: { locale: 'de_DE', article: { section: 'Layout' } },
        },
      }),
    );
    await site.write(
      'site/blog/tags/[tag].md',
      page({ title: 'Tagged {tag}', generate: { from: 'tags' } }),
    );
  });

  afterEach(async () => {
    setEnv('development');
    await site.cleanup();
  });

  it('prints og:locale and the Twitter handles on every page', async () => {
    const { rendered } = await site.build();
    expect(sorted(rendered)).toEqual([
      '/',
      '/about',
      '/blog',
      '/blog/first',
      '/blog/page/2',
      '/blog/second',
      '/blog/tags/css',
      '/blog/tags/html',
    ]);

    for (const file of ['index', 'about', 'blog', 'blog/page/2', 'blog/tags/css']) {
      const html = await site.read(`dist/${file}.html`);
      expect(meta(html, 'og:locale')).toEqual(['en_US']);
      expect(meta(html, 'twitter:creator')).toEqual(['@ada']);
      expect(meta(html, 'twitter:site')).toEqual(['@example']);
    }
  });

  it('prints article metadata on matching posts only', async () => {
    await site.build();

    const first = await site.read('dist/blog/first.html');
    expect(meta(first, 'og:type')).toEqual(['article']);
    expect(meta(first, 'article:published_time')).toEqual(['2026-01-01T00:00:00.000Z']);
    expect(meta(first, 'article:modified_time')).toEqual(['2026-01-15T00:00:00.000Z']);
    expect(meta(first, 'article:tag')).toEqual(['CSS', 'HTML']);
    expect(meta(first, 'article:author')).toEqual(['https://example.com/about']);
    // Templates read the same values
    expect(first).toContain('<p>type=article</p>');

    // The listing, its later page and generated pages match /blog/** or are its index
    for (const file of ['index', 'about', 'blog', 'blog/page/2', 'blog/tags/css']) {
      const html = await site.read(`dist/${file}.html`);
      expect(meta(html, 'og:type')).toEqual(['website']);
      expect(html).not.toContain('article:');
      expect(html).toContain('<p>type=none</p>');
    }
  });

  it('lets front matter override each value', async () => {
    await site.build();

    const second = await site.read('dist/blog/second.html');
    expect(meta(second, 'og:locale')).toEqual(['de_DE']);
    expect(meta(second, 'twitter:creator')).toEqual(['@guest']);
    expect(meta(second, 'article:section')).toEqual(['Layout']);
    expect(meta(second, 'article:published_time')).toEqual(['2026-02-01T00:00:00.000Z']);
    expect(meta(second, 'article:tag')).toEqual(['CSS']);
    // The guest author has no URL, and the default author's is not theirs
    expect(meta(second, 'article:author')).toEqual([]);
  });

  it('keeps what a beforeAll hook writes', async () => {
    vi.mocked(loadConfig).mockResolvedValue({
      ...config(),
      hooks: {
        beforeAll: ({ pages }) => {
          for (const entry of pages) {
            entry.frontMatter.seo = { twitter: { creator: '@hook' } };
          }
        },
      },
    });
    await site.build();

    expect(meta(await site.read('dist/about.html'), 'twitter:creator')).toEqual(['@hook']);
  });

  it('fills in values from what a beforeRender hook changes', async () => {
    vi.mocked(loadConfig).mockResolvedValue({
      ...config(),
      hooks: {
        beforeRender: ({ page: entry }) => {
          if (entry.url === '/blog/first') {
            entry.frontMatter.seo = {
              ...entry.frontMatter.seo,
              author: { name: 'Guest', url: 'https://guest.dev', twitter: '@guest' },
            };
          }
        },
      },
    });
    await site.build();

    const first = await site.read('dist/blog/first.html');
    expect(meta(first, 'twitter:creator')).toEqual(['@guest']);
    expect(meta(first, 'article:author')).toEqual(['https://guest.dev']);
    expect(meta(first, 'article:tag')).toEqual(['CSS', 'HTML']);
    expect(meta(await site.read('dist/about.html'), 'twitter:creator')).toEqual(['@ada']);

    // A hook that leaves SEO alone does not stop pages from being cached
    const { rendered } = await site.build();
    expect(sorted(rendered)).toEqual(['/blog/first']);
  });

  it('prints no twitter:creator without a handle', async () => {
    vi.mocked(loadConfig).mockResolvedValue(
      config({ defaultAuthor: { name: 'Ada', url: 'https://example.com/about' } }),
    );
    await site.build();

    const about = await site.read('dist/about.html');
    expect(meta(about, 'twitter:creator')).toEqual([]);
    expect(meta(about, 'author')).toEqual(['Ada']);
  });

  it.each<[string, StatiConfig, string[]]>([
    [
      'the default author handle',
      config({
        defaultAuthor: { name: 'Ada', url: 'https://example.com/about', twitter: '@ada_new' },
      }),
      // /blog/second names its own author
      ['/', '/about', '/blog', '/blog/first', '/blog/page/2', '/blog/tags/css', '/blog/tags/html'],
    ],
    [
      'the article patterns',
      config({ articles: { include: ['/blog/**'], exclude: ['/blog/second'] } }),
      ['/blog/second'],
    ],
    [
      'the default locale',
      config({}, 'en-GB'),
      // /blog/second sets its own locale
      ['/', '/about', '/blog', '/blog/first', '/blog/page/2', '/blog/tags/css', '/blog/tags/html'],
    ],
  ])('rebuilds the pages a change to %s changes', async (_, changed, expected) => {
    await site.build();
    expect((await site.build()).rendered).toEqual([]);

    vi.mocked(loadConfig).mockResolvedValue(changed);
    const { rendered } = await site.build();

    expect(sorted(rendered)).toEqual(expected);
  });

  it('rebuilds every page that prints twitter:site when it changes', async () => {
    await site.build();

    vi.mocked(loadConfig).mockResolvedValue(config({ twitter: { site: 'other' } }));
    const { rendered, cached } = await site.build();

    expect(cached).toEqual([]);
    expect(rendered).toHaveLength(8);
    expect(meta(await site.read('dist/about.html'), 'twitter:site')).toEqual(['@other']);
  });
});
