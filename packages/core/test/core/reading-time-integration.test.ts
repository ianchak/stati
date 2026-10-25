import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadConfig } from '../../src/config/loader.js';
import { setEnv } from '../../src/env.js';
import type { StatiConfig } from '../../src/types/index.js';
import { createSiteFixture, page, type SiteFixture } from './site-fixture.js';

vi.mock('../../src/config/loader.js', () => ({
  loadConfig: vi.fn(),
}));

/** Ten words a minute, so that a few words more or less move the reading time. */
const SPEED = { wordsPerMinute: 10 };

const LAYOUT =
  '<html><body><p class="stats"><%= stati.page.wordCount %> words, <%= stati.page.readingTime %> min</p><%~ stati.content %></body></html>';
const BLOG_INDEX_LAYOUT = `<html><body><ul><% for (const post of stati.collection.recentPages) { %>
<li><%= post.frontMatter.title %>: <%= post.wordCount %> words, <%= post.readingTime %> min</li><% } %></ul></body></html>`;

const words = (count: number) => Array.from({ length: count }, (_, i) => `w${i}`).join(' ');
const post = (title: string, count: number) =>
  page({ title, publishedAt: '2026-01-01' }, words(count));

describe('word count and reading time', () => {
  let site: SiteFixture;

  /** Starts a site with a blog of two posts of 20 words, which read in 2 minutes. */
  async function start(config: Partial<StatiConfig> = {}): Promise<void> {
    site = await createSiteFixture(vi.mocked(loadConfig), {
      readingTime: SPEED,
      ...config,
    });
    await site.write('site/layout.eta', LAYOUT);
    await site.write('site/blog/index.eta', BLOG_INDEX_LAYOUT);
    await site.write('site/index.md', page({ title: 'Home' }, 'Just a few words here'));
    await site.write('site/blog/index.md', page({ title: 'Blog' }));
    await site.write('site/blog/first.md', post('First', 20));
    await site.write('site/blog/second.md', post('Second', 20));
  }

  beforeEach(() => {
    setEnv('production');
  });

  afterEach(async () => {
    setEnv('development');
    await site.cleanup();
  });

  it('gives templates the values on stati.page and on collection items', async () => {
    await start();
    await site.build();

    expect(await site.read('dist/blog/first.html')).toContain('20 words, 2 min');
    expect(await site.read('dist/index.html')).toContain('5 words, 1 min');
    const listing = await site.read('dist/blog.html');
    expect(listing).toContain('First: 20 words, 2 min');
    expect(listing).toContain('Second: 20 words, 2 min');
  });

  it('counts the body without front matter, code blocks and HTML tags', async () => {
    await start();
    await site.write(
      'site/blog/first.md',
      page(
        { title: 'A front matter title that is not counted', tags: ['not', 'counted'] },
        'One <em>two</em> three\n\n```js\nconst not = counted;\n```\n\nfour',
      ),
    );
    await site.build();

    expect(await site.read('dist/blog/first.html')).toContain('4 words, 1 min');
  });

  it('reads the values in the beforeAll hook, on every page', async () => {
    const seen: Array<[string, number | undefined, number | undefined]> = [];
    await start({
      hooks: {
        beforeAll: ({ pages }) => {
          for (const entry of pages) {
            seen.push([entry.url, entry.wordCount, entry.readingTime]);
          }
        },
      },
    });
    await site.build();

    expect(seen).toContainEqual(['/blog/first', 20, 2]);
    expect(seen).toContainEqual(['/', 5, 1]);
  });

  it('counts pages that a beforeAll hook adds', async () => {
    await start({
      hooks: {
        beforeAll: ({ pages }) => {
          const home = pages.find((entry) => entry.url === '/')!;
          pages.push({
            slug: '/added',
            url: '/added',
            sourcePath: home.sourcePath.replace('index.md', 'added.md'),
            frontMatter: { title: 'Added' },
            content: words(30),
          });
        },
      },
    });
    await site.build();

    expect(await site.read('dist/added.html')).toContain('30 words, 3 min');
  });

  it('uses 230 words a minute when wordsPerMinute is not set', async () => {
    await start({ readingTime: {} });
    await site.write('site/blog/first.md', post('First', 345));
    await site.build();

    expect(await site.read('dist/blog/first.html')).toContain('345 words, 2 min');
  });

  it('overwrites front matter of the same name and says so', async () => {
    await start();
    await site.write(
      'site/blog/first.md',
      page({ title: 'First', readingTime: 99, wordCount: 5000 }, words(20)),
    );
    const build = await site.build();

    expect(await site.read('dist/blog/first.html')).toContain('20 words, 2 min');
    expect(build.warnings).toContainEqual(
      expect.stringContaining('reserved keys that will be overwritten: wordCount, readingTime'),
    );
  });

  describe('listings', () => {
    const fields = ['title', 'description', 'tags', 'draft', 'readingTime'];

    it('rebuilds a listing that shows the reading time when the minutes change', async () => {
      await start({ collections: { summaryFields: fields } });
      await site.build();

      // 20 to 30 words: 2 minutes to 3
      await site.write('site/blog/second.md', post('Second', 30));
      const second = await site.build();

      expect([...second.rendered].sort()).toEqual(['/blog', '/blog/second']);
      expect(await site.read('dist/blog.html')).toContain('Second: 30 words, 3 min');
    });

    it('leaves the listing cached when the minutes stay the same', async () => {
      await start({ collections: { summaryFields: fields } });
      await site.build();

      // 20 to 24 words: still 2 minutes
      await site.write('site/blog/second.md', post('Second', 24));
      const second = await site.build();

      expect(second.rendered).toEqual(['/blog/second']);
      expect(second.cached).toContain('/blog');
    });

    it('rebuilds a listing that names wordCount when the count changes', async () => {
      await start({ collections: { summaryFields: ['title', 'wordCount'] } });
      await site.build();

      await site.write('site/blog/second.md', post('Second', 24));
      const second = await site.build();

      expect([...second.rendered].sort()).toEqual(['/blog', '/blog/second']);
      expect(await site.read('dist/blog.html')).toContain('Second: 24 words, 2 min');
    });

    it('does not rebuild a listing that does not name the field', async () => {
      await start();
      await site.build();

      await site.write('site/blog/second.md', post('Second', 30));
      const second = await site.build();

      expect(second.rendered).toEqual(['/blog/second']);
    });
  });

  describe('wordsPerMinute', () => {
    it('rebuilds the pages whose reading time a new speed changes', async () => {
      await start({ collections: { summaryFields: ['title', 'readingTime'] } });
      await site.write('site/blog/first.md', post('First', 20));
      await site.write('site/blog/second.md', post('Second', 4));
      await site.build();

      // First: 2 minutes at 10 a minute, 1 at 20. Second: 1 minute either way.
      const config = {
        srcDir: 'site',
        outDir: 'dist',
        staticDir: 'public',
        site: { title: 'Fixture', baseUrl: 'https://example.com' },
        isg: { enabled: true, ttlSeconds: 3600 },
        collections: { summaryFields: ['title', 'readingTime'] },
        readingTime: { wordsPerMinute: 20 },
      } satisfies StatiConfig;
      vi.mocked(loadConfig).mockImplementation(async () => config);
      const second = await site.build();

      expect([...second.rendered].sort()).toEqual(['/blog', '/blog/first']);
      expect(await site.read('dist/blog/first.html')).toContain('20 words, 1 min');
    });
  });
});
