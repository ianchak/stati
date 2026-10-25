import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadConfig } from '../../src/config/loader.js';
import { setEnv } from '../../src/env.js';
import { createSiteFixture, type SiteFixture } from './site-fixture.js';

vi.mock('../../src/config/loader.js', () => ({
  loadConfig: vi.fn(),
}));

const LAYOUT = `<html><head><title><%= stati.page.title %></title></head><body>
<ul><% for (const page of stati.collection.recentPages) { %><li><%= page.frontMatter.title %></li><% } %></ul>
<%~ stati.content %></body></html>`;

/** The content of the meta tag with this property or name, in order */
function meta(html: string, key: string): string[] {
  const pattern = new RegExp(`<meta (?:property|name)="${key}" content="([^"]*)">`, 'g');
  return [...html.matchAll(pattern)].map((match) => match[1] ?? '');
}

describe('front matter values that YAML reads as numbers, dates or booleans', () => {
  let site: SiteFixture;

  beforeEach(async () => {
    setEnv('production');
    site = await createSiteFixture(vi.mocked(loadConfig));
  });

  afterEach(async () => {
    setEnv('development');
    await site.cleanup();
  });

  it('builds a page whose title, description and tags are numbers', async () => {
    await site.write('site/layout.eta', LAYOUT);
    await site.write(
      'site/index.md',
      '---\ntitle: 1984\ndescription: 42\ntags: [2024, news]\n---\nBody\n',
    );

    await site.build();

    const html = await site.read('dist/index.html');
    expect(html).toContain('<title>1984</title>');
    expect(meta(html, 'description')).toEqual(['42']);
    expect(meta(html, 'keywords')).toEqual(['2024, news']);
    expect(meta(html, 'og:title')).toEqual(['1984']);
  });

  it('builds a page whose title is an unquoted YAML date', async () => {
    await site.write('site/layout.eta', LAYOUT);
    await site.write('site/index.md', '---\ntitle: 2024-01-01\n---\nBody\n');

    await site.build();

    expect(await site.read('dist/index.html')).toContain('<title>2024-01-01</title>');
  });

  it('builds a page whose title is a boolean', async () => {
    await site.write('site/layout.eta', LAYOUT);
    await site.write('site/index.md', '---\ntitle: true\n---\nBody\n');

    await site.build();

    expect(await site.read('dist/index.html')).toContain('<title>true</title>');
  });

  it('builds a page with SEO title, description and keywords that are not text', async () => {
    await site.write('site/layout.eta', LAYOUT);
    await site.write(
      'site/index.md',
      '---\ntitle: Home\nseo:\n  title: 7\n  description: 8\n  keywords: [1, 2]\n---\nBody\n',
    );

    await site.build();

    const html = await site.read('dist/index.html');
    expect(meta(html, 'og:title')).toEqual(['7']);
    expect(meta(html, 'description')).toEqual(['8']);
    expect(meta(html, 'keywords')).toEqual(['1, 2']);
  });

  it('drops null tags and warns with the file name', async () => {
    await site.write('site/layout.eta', LAYOUT);
    await site.write('site/index.md', '---\ntitle: Home\ntags: [null, news]\n---\nBody\n');

    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await site.build();

    expect(meta(await site.read('dist/index.html'), 'keywords')).toEqual(['news']);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]?.[0]).toMatch(/"tags" of .*index.md/);
  });

  it('falls back to the built-in layout for a numeric title and description', async () => {
    await site.write('site/index.md', '---\ntitle: 1984\ndescription: 42\n---\nBody\n');

    await site.build();

    const html = await site.read('dist/index.html');
    expect(html).toContain('<title>1984</title>');
    expect(html).toContain('<meta name="description" content="42">');
  });

  it('sorts a collection whose titles are numbers and text', async () => {
    await site.write('site/layout.eta', LAYOUT);
    await site.write('site/blog/index.md', '---\ntitle: Blog\n---\n');
    await site.write('site/blog/a.md', '---\ntitle: 1984\n---\n');
    await site.write('site/blog/b.md', '---\ntitle: Alpha\n---\n');
    await site.write('site/blog/c.md', '---\ntitle: 2024-01-01\n---\n');
    await site.write('site/blog/d.md', '---\ntitle: 42\n---\n');

    await site.build();

    const html = await site.read('dist/blog.html');
    const titles = [...html.matchAll(/<li>([^<]*)<\/li>/g)].map((match) => match[1]);
    // recentPages sorts undated pages by title, as text
    expect(titles).toEqual(['1984', '2024-01-01', '42', 'Alpha']);
  });

  it('sorts and builds with seo.autoInject off', async () => {
    const withoutSeo = await createSiteFixture(vi.mocked(loadConfig), {
      seo: { autoInject: false },
    });
    try {
      await withoutSeo.write('site/layout.eta', LAYOUT);
      await withoutSeo.write('site/blog/index.md', '---\ntitle: Blog\n---\n');
      await withoutSeo.write('site/blog/a.md', '---\ntitle: 1984\n---\n');
      await withoutSeo.write('site/blog/b.md', '---\ntitle: Alpha\n---\n');
      await withoutSeo.write('site/blog/c.md', '---\ntitle: 42\n---\n');

      await withoutSeo.build();

      expect(await withoutSeo.read('dist/blog/a.html')).toContain('<title>1984</title>');
    } finally {
      await withoutSeo.cleanup();
    }
  });
});
