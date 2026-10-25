/**
 * Builds of a site with `sitemap.news`: the Google News sitemap is a separate file in
 * production builds, and robots.txt lists it next to sitemap.xml.
 * @module core/news-sitemap-integration.test
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadConfig } from '../../src/config/loader.js';
import { setEnv } from '../../src/env.js';
import type { StatiConfig } from '../../src/types/index.js';
import { createSiteFixture, page, type SiteFixture } from './site-fixture.js';

vi.mock('../../src/config/loader.js', () => ({
  loadConfig: vi.fn(),
}));

const LAYOUT = `<html><head><title><%= stati.page.title %></title></head><body><%~ stati.content %></body></html>`;

const ago = (hours: number) => new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

const locs = (xml: string) => [...xml.matchAll(/<loc>([^<]*)<\/loc>/g)].map((match) => match[1]);

describe('the Google News sitemap', () => {
  let site: SiteFixture;

  async function createSite(config: Partial<StatiConfig> = {}): Promise<void> {
    setEnv('production');
    site = await createSiteFixture(vi.mocked(loadConfig), {
      site: { title: 'Daily Fixture', baseUrl: 'https://example.com', defaultLocale: 'de-AT' },
      sitemap: { enabled: true, news: { include: ['/news/*/*'] } },
      robots: { enabled: true, sitemap: true },
      ...config,
    });
    await site.write('site/layout.eta', LAYOUT);
    await site.write('site/index.md', page({ title: 'Home' }, '# Home'));
    await site.write(
      'site/news/world/fresh.md',
      page({ title: 'Fresh & "new"', publishedAt: ago(3) }, 'Fresh.'),
    );
    await site.write(
      'site/news/world/stale.md',
      page({ title: 'Stale', publishedAt: ago(24 * 5) }, 'Old.'),
    );
    await site.write(
      'site/news/world/draft.md',
      page({ title: 'Draft', publishedAt: ago(2), draft: true }, 'Draft.'),
    );
    await site.write('site/news/world/index.md', page({ title: 'World' }, 'Section.'));
  }

  afterEach(async () => {
    setEnv('development');
    await site.cleanup();
  });

  it('is written next to sitemap.xml and robots.txt lists it', async () => {
    await createSite();

    await site.build({ includeDrafts: true });

    const news = await site.read('dist/news-sitemap.xml');
    expect(news).toContain('xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"');
    expect(locs(news)).toEqual(['https://example.com/news/world/fresh']);
    expect(news).toContain('<news:title>Fresh &amp; &quot;new&quot;</news:title>');
    expect(news).toContain('<news:name>Daily Fixture</news:name>');
    expect(news).toContain('<news:language>de</news:language>');
    expect(news).toMatch(
      /<news:publication_date>\d{4}-\d\d-\d\dT[\d:.]+Z<\/news:publication_date>/,
    );

    // sitemap.xml lists the pages as before, without the news namespace
    const sitemap = await site.read('dist/sitemap.xml');
    expect(sitemap).not.toContain('news:');
    expect(locs(sitemap)).toContain('https://example.com/news/world/stale');

    const robots = await site.read('dist/robots.txt');
    expect(robots).toContain('Sitemap: https://example.com/sitemap.xml\n');
    expect(robots).toContain('Sitemap: https://example.com/news-sitemap.xml\n');
  });

  it('writes nothing without sitemap.news', async () => {
    await createSite({ sitemap: { enabled: true } });

    await site.build();

    expect(await site.exists('dist/news-sitemap.xml')).toBe(false);
    const robots = await site.read('dist/robots.txt');
    expect(robots).toContain('Sitemap: https://example.com/sitemap.xml');
    expect(robots).not.toContain('news-sitemap');
  });

  it('is not written when the sitemap is disabled, and robots.txt does not list it', async () => {
    await createSite({ sitemap: { enabled: false, news: { include: ['/news/*/*'] } } });

    await site.build();

    expect(await site.exists('dist/news-sitemap.xml')).toBe(false);
    expect(await site.read('dist/robots.txt')).not.toContain('news-sitemap');
  });

  it('is not written in development builds', async () => {
    await createSite();
    setEnv('development');

    await site.build();

    expect(await site.exists('dist/news-sitemap.xml')).toBe(false);
    expect(await site.exists('dist/sitemap.xml')).toBe(false);
  });

  it('writes a valid empty urlset when no article is recent', async () => {
    await createSite();
    await site.remove('site/news/world/fresh.md');
    await site.remove('site/news/world/draft.md');

    await site.build();

    const news = await site.read('dist/news-sitemap.xml');
    expect(news).toContain('<urlset');
    expect(news).toContain('</urlset>');
    expect(news).not.toContain('<url>');
  });

  it('uses the options and the base path of site.baseUrl', async () => {
    await createSite({
      site: { title: 'Daily Fixture', baseUrl: 'https://example.com/paper' },
      sitemap: {
        enabled: true,
        news: {
          include: ['/news/**'],
          publicationName: 'The Paper',
          language: 'hu',
          maxAgeDays: 10,
          filename: 'latest.xml',
        },
      },
    });

    await site.build();

    expect(await site.exists('dist/news-sitemap.xml')).toBe(false);
    const news = await site.read('dist/latest.xml');
    expect(locs(news)).toEqual([
      'https://example.com/paper/news/world/fresh',
      'https://example.com/paper/news/world/stale',
    ]);
    expect(news).toContain('<news:name>The Paper</news:name>');
    expect(news).toContain('<news:language>hu</news:language>');
    expect(await site.read('dist/robots.txt')).toContain(
      'Sitemap: https://example.com/paper/latest.xml\n',
    );
  });

  it('is listed once when robots.customLines already has it', async () => {
    await createSite({
      robots: {
        enabled: true,
        sitemap: true,
        customLines: ['Sitemap: https://example.com/news-sitemap.xml'],
      },
    });

    await site.build();

    const robots = await site.read('dist/robots.txt');
    expect(robots.match(/news-sitemap\.xml/g)).toHaveLength(1);
  });

  it('is not listed when robots.sitemap is an explicit URL or off', async () => {
    await createSite({
      robots: { enabled: true, sitemap: 'https://example.com/sitemap.xml' },
    });

    await site.build();

    expect(await site.exists('dist/news-sitemap.xml')).toBe(true);
    expect(await site.read('dist/robots.txt')).not.toContain('news-sitemap');
  });

  it('warns about an article without a title', async () => {
    await createSite();
    await site.write('site/news/world/untitled.md', page({ publishedAt: ago(1) }, 'No title.'));

    const { warnings } = await site.build();

    expect(warnings.some((message) => message.includes('/news/world/untitled'))).toBe(true);
  });
});
