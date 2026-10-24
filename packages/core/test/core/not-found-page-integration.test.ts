import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadConfig } from '../../src/config/loader.js';
import { setEnv } from '../../src/env.js';
import type { SearchIndex, StatiConfig } from '../../src/types/index.js';
import { createSiteFixture, page, type SiteFixture } from './site-fixture.js';

vi.mock('../../src/config/loader.js', () => ({
  loadConfig: vi.fn(),
}));

/** Set `recognised` to false to build as a Stati version that treated the 404 page like any other */
const notFoundPages = vi.hoisted(() => ({ recognised: true }));
vi.mock('../../src/core/utils/index.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/core/utils/index.js')>();
  return {
    ...actual,
    isNotFoundPage: (page: Parameters<typeof actual.isNotFoundPage>[0]) =>
      notFoundPages.recognised && actual.isNotFoundPage(page),
  };
});

/** Prints the navigation tree, the page's own node and the noindex value templates read */
const LAYOUT = `<html><head><title><%= stati.page.title %></title></head><body>
<nav><%= JSON.stringify(stati.nav.getTree().flatMap((n) => [n.url, ...(n.children ?? []).map((c) => c.url)])) %></nav>
<p>navNode=<%= stati.page.navNode?.url ?? 'none' %></p>
<p>noindex=<%= stati.page.seo?.noindex ?? 'none' %></p><%~ stati.content %></body></html>`;

const config = (): StatiConfig => ({
  srcDir: 'site',
  outDir: 'dist',
  staticDir: 'public',
  site: { title: 'Fixture', baseUrl: 'https://example.com' },
  isg: { enabled: true, ttlSeconds: 3600 },
  search: { enabled: true, hashFilename: false },
  sitemap: { enabled: true },
  rss: {
    enabled: true,
    feeds: [{ filename: 'feed.xml', title: 'Feed', description: 'All', link: '/' }],
  },
});

const sorted = (urls: string[]) => [...urls].sort();

/** The URLs a page's layout printed as the navigation tree */
function navUrls(html: string): string[] {
  return JSON.parse(html.match(/<nav>(.*)<\/nav>/)?.[1]?.replace(/&quot;/g, '"') ?? '[]');
}

function robots(html: string): string | undefined {
  return html.match(/<meta name="robots" content="([^"]*)">/)?.[1];
}

describe('the 404 page', () => {
  let site: SiteFixture;

  const outputs = async () => {
    const index = JSON.parse(await site.read('dist/search-index.json')) as SearchIndex;
    return {
      sitemap: await site.read('dist/sitemap.xml'),
      feed: await site.read('dist/feed.xml'),
      search: [...new Set(index.documents.map((doc) => doc.url))].sort(),
      nav: navUrls(await site.read('dist/index.html')),
      notFound: await site.read('dist/404.html'),
    };
  };

  beforeEach(async () => {
    setEnv('production');
    site = await createSiteFixture(vi.mocked(loadConfig), config());
    await site.write('site/layout.eta', LAYOUT);
    await site.write('site/index.md', page({ title: 'Home' }, '# Home\n\nWelcome.'));
    await site.write('site/about.md', page({ title: 'About' }, '# About\n\nAbout us.'));
    await site.write('site/404.md', page({ title: 'Page not found' }, '# Lost\n\nNot here.'));
    // A page named 404 below the root is an ordinary page
    await site.write('site/docs/index.md', page({ title: 'Docs' }, '# Docs\n\nRead on.'));
    await site.write('site/docs/404.md', page({ title: 'Docs 404' }, '# Errors\n\nAbout 404s.'));
  });

  afterEach(async () => {
    setEnv('development');
    await site.cleanup();
  });

  it('is left out of the sitemap, search index, feed and navigation, and gets noindex', async () => {
    const { rendered } = await site.build();
    expect(sorted(rendered)).toEqual(['/', '/404', '/about', '/docs', '/docs/404']);

    const { sitemap, feed, search, nav, notFound } = await outputs();
    expect(sitemap).not.toContain('<loc>https://example.com/404</loc>');
    expect(sitemap).toContain('<loc>https://example.com/docs/404</loc>');
    expect(feed).not.toContain('https://example.com/404<');
    expect(feed).toContain('https://example.com/docs/404<');
    expect(search).toEqual(['/about', '/docs', '/docs/404']);
    expect(nav).not.toContain('/404');
    expect(nav).toContain('/docs/404');
    expect(navUrls(notFound)).toEqual(nav);

    expect(notFound).toContain('<p>navNode=none</p>');
    expect(await site.read('dist/docs/404.html')).toContain('<p>navNode=/docs/404</p>');

    expect(robots(notFound)).toBe('noindex');
    // Templates read the same value
    expect(notFound).toContain('<p>noindex=true</p>');
    expect(robots(await site.read('dist/docs/404.html'))).toBeUndefined();
  });

  it('serves every page from the cache on an unchanged rebuild', async () => {
    await site.build();
    const { rendered, cached } = await site.build();
    expect(rendered).toEqual([]);
    expect(cached).toHaveLength(5);
  });

  it('opts back in through front matter', async () => {
    await site.write(
      'site/404.md',
      page(
        {
          title: 'Page not found',
          nav: true,
          search: true,
          sitemap: { exclude: false },
          seo: { noindex: false },
        },
        '# Lost\n\nNot here.',
      ),
    );
    await site.build();

    const { sitemap, feed, search, nav, notFound } = await outputs();
    expect(sitemap).toContain('<loc>https://example.com/404</loc>');
    expect(search).toContain('/404');
    expect(nav).toContain('/404');
    expect(notFound).toContain('<p>navNode=/404</p>');
    expect(robots(notFound)).toBeUndefined();
    // Feeds list content only
    expect(feed).not.toContain('https://example.com/404<');
  });

  it('keeps a robots value that says whether to index the page', async () => {
    await site.write(
      'site/404.md',
      page({ title: 'Page not found', seo: { robots: 'noindex, nofollow' } }, 'Not here.'),
    );
    await site.build();

    const { sitemap, notFound } = await outputs();
    expect(robots(notFound)).toBe('noindex, nofollow');
    expect(notFound).toContain('<p>noindex=none</p>');
    expect(sitemap).not.toContain('<loc>https://example.com/404</loc>');
  });

  it('adds noindex to a robots value that leaves indexing open', async () => {
    await site.write(
      'site/404.md',
      page({ title: 'Page not found', seo: { robots: 'nofollow' } }, 'Not here.'),
    );
    await site.build();

    const { notFound } = await outputs();
    expect(robots(notFound)).toBe('noindex, nofollow');
    expect(notFound).toContain('<p>noindex=true</p>');
  });

  it('rebuilds a 404 page cached by a Stati version that treated it like any other', async () => {
    // Front matter that sets noindex itself and a layout that reads no navigation, so only
    // the page's render inputs tell the two versions apart
    await site.write(
      'site/layout.eta',
      '<html><head></head><body><%~ stati.content %></body></html>',
    );
    await site.write('site/404.md', page({ title: 'Page not found', seo: { noindex: true } }));
    notFoundPages.recognised = false;
    try {
      expect(sorted((await site.build()).rendered)).toEqual([
        '/',
        '/404',
        '/about',
        '/docs',
        '/docs/404',
      ]);
    } finally {
      notFoundPages.recognised = true;
    }

    const upgraded = await site.build();
    expect(upgraded.rendered).toEqual(['/404']);
    expect(upgraded.cached).toHaveLength(4);
    expect((await site.build()).rendered).toEqual([]);
  });

  it('treats the page at /404/ the same way', async () => {
    await site.remove('site/404.md');
    await site.write('site/404/index.md', page({ title: 'Page not found', permalink: '/404/' }));
    await site.build();

    const html = await site.read('dist/404/index.html');
    expect(robots(html)).toBe('noindex');
    const sitemap = await site.read('dist/sitemap.xml');
    expect(sitemap).not.toContain('<loc>https://example.com/404/</loc>');
    expect(navUrls(await site.read('dist/index.html'))).not.toContain('/404/');
  });

  it('leaves other noindex pages out of the sitemap', async () => {
    await site.write('site/about.md', page({ title: 'About', seo: { noindex: true } }));
    await site.build();

    const sitemap = await site.read('dist/sitemap.xml');
    expect(sitemap).not.toContain('<loc>https://example.com/about</loc>');
    expect(sitemap).toContain('<loc>https://example.com/</loc>');
  });
});
