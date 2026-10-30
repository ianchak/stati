import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { ExampleManager } from '../src/examples.js';
import { loadConfig } from '../../core/src/config/loader.js';
import { setEnv } from '../../core/src/env.js';
import type { StatiConfig } from '../../core/src/types/index.js';
import { createSiteFixture, page, type SiteFixture } from '../../core/test/core/site-fixture.js';

vi.mock('../../core/src/config/loader.js', () => ({
  loadConfig: vi.fn(),
}));

// The starter configs import defineConfig, which only types the config
vi.mock('@stati/core', () => ({
  defineConfig: (config: StatiConfig) => config,
}));

/**
 * The blog and news starters list related posts and stories with stati.collection.related().
 * Each test copies a starter as create-stati does, swaps its sample posts for posts whose tags
 * and dates decide the lists, and builds it with core.
 */
/** Imports a file of a starter, which is JavaScript and has no types */
const importStarter = <T>(path: string): Promise<T> => import(`../../../examples/${path}`);

describe('related pages in the starters', () => {
  let site: SiteFixture;

  /** Copies a starter into the fixture without its sample posts, and builds with its config */
  const useStarter = async (name: 'blog' | 'news', postsDir: string) => {
    site = await createSiteFixture(vi.mocked(loadConfig));
    await new ExampleManager().copyExample(name, site.dir);
    for (const entry of await readdir(join(site.dir, postsDir), { recursive: true })) {
      if (entry.endsWith('.md') && entry !== 'index.md' && !entry.includes('[')) {
        await rm(join(site.dir, postsDir, entry));
      }
    }
    const { default: config } = await importStarter<{ default: StatiConfig }>(
      `${name}/stati.config.js`,
    );
    vi.mocked(loadConfig).mockResolvedValue(config);
  };

  /** Article URLs linked inside the first match of `container`, in order, once each */
  const linksIn = (html: string, container: RegExp, article: RegExp) => {
    const section = container.exec(html)?.[1] ?? '';
    const urls = [...section.matchAll(/href="([^"]+)"/g)].map((match) => match[1] ?? '');
    return [...new Set(urls.filter((url) => article.test(url)))];
  };

  beforeEach(() => {
    setEnv('production');
  });

  afterEach(async () => {
    setEnv('development');
    await site.cleanup();
  });

  describe('blog', () => {
    const POST = /^\/posts\/[^/]+$/;
    const RELATED = /<section class="listing related"([^]*?)<\/section>/;

    const writePost = (slug: string, publishedAt: string, tags?: string[]) =>
      site.write(
        `site/posts/${slug}.md`,
        page({ title: slug, publishedAt, ...(tags && { tags }) }, 'Body'),
      );

    beforeEach(async () => {
      await useStarter('blog', 'site/posts');
      // Newest first: the target's newer and older neighbours share its tags too
      await writePost('newest', '2026-06-01', ['css']);
      await writePost('newer', '2026-05-01', ['css']);
      await writePost('target', '2026-04-01', ['css', 'html']);
      await writePost('older', '2026-03-01', ['css', 'html']);
      await writePost('both', '2026-02-01', ['CSS', 'html']);
      await writePost('html', '2026-01-01', ['html']);
      await writePost('html-old', '2025-12-01', ['html']);
      await writePost('untagged', '2025-11-01');
    });

    it('lists up to three posts sharing the most tags, without the newer and older posts', async () => {
      await site.build();

      const html = await site.read('dist/posts/target.html');
      expect(linksIn(html, /<nav class="post-pager"([^]*?)<\/nav>/, POST)).toEqual([
        '/posts/newer',
        '/posts/older',
      ]);
      expect(linksIn(html, RELATED, POST)).toEqual(['/posts/both', '/posts/newest', '/posts/html']);
      const { entries } = await site.manifest();
      expect(entries['/posts/target.html']).toMatchObject({ readsCollection: true });
    });

    it('leaves out the list on a post without tags', async () => {
      await site.build();

      expect(await site.read('dist/posts/untagged.html')).not.toMatch(RELATED);
    });

    it('no longer ships its own related posts helper', async () => {
      const { createBlog } = await importStarter<{
        createBlog(options: { site: object }): { helpers: object };
      }>('blog/helpers/blog.js');

      expect(Object.keys(createBlog({ site: {} }).helpers)).toEqual(['formatDate', 'isoDate']);
    });
  });

  describe('news', () => {
    const ARTICLE = /^\/news\/[^/]+\/[^/]+$/;

    const writeArticle = (
      path: string,
      date: string,
      tags: string[],
      extra: Record<string, unknown> = {},
    ) =>
      site.write(
        `site/news/${path}.md`,
        page({ title: path, description: `About ${path}`, date, tags, ...extra }, 'Body'),
      );

    beforeEach(async () => {
      await useStarter('news', 'site/news');
      await writeArticle('technology/lead', '2026-01-10', ['stati', 'ssg'], { lead: true });
      // The newest six fill the top stories and the strip under the nameplate. f2 to f5 are
      // also the lead's "More in Technology" rail, and f2 shares a tag with the lead.
      await writeArticle('world/f1', '2026-02-06', ['stati']);
      await writeArticle('technology/f2', '2026-02-05', ['stati']);
      await writeArticle('technology/f3', '2026-02-04', ['filler']);
      await writeArticle('technology/f4', '2026-02-03', ['filler']);
      await writeArticle('technology/f5', '2026-02-02', ['filler']);
      await writeArticle('technology/f6', '2026-02-01', ['filler']);
      // In the lead's section but sharing no tag with it
      await writeArticle('technology/section-only', '2025-12-10', ['unrelated']);
      await writeArticle('world/other', '2025-12-05', ['stati']);
      await writeArticle('technology/same', '2025-12-01', ['ssg']);
      await writeArticle('business/far', '2025-11-01', ['ssg']);
    });

    it('lists the stories related to the lead on the front page, from its section first', async () => {
      await site.build();

      const html = await site.read('dist/index.html');
      expect(linksIn(html, /<h2 class="lead-headline">([^]*?)<\/h2>/, ARTICLE)).toEqual([
        '/news/technology/lead',
      ]);
      expect(linksIn(html, /<ul class="lead-more"([^]*?)<\/ul>/, ARTICLE)).toEqual([
        '/news/technology/same',
        '/news/world/other',
      ]);
    });

    it('lists related stories under an article, leaving out the section rail', async () => {
      await site.build();

      const html = await site.read('dist/news/technology/lead.html');
      expect(linksIn(html, /<aside class="article-rail"([^]*?)<\/aside>/, ARTICLE)).toEqual(
        expect.arrayContaining([
          '/news/technology/f2',
          '/news/technology/f3',
          '/news/technology/f4',
          '/news/technology/f5',
        ]),
      );
      expect(linksIn(html, /<section class="related"([^]*?)<\/section>/, ARTICLE)).toEqual([
        '/news/technology/same',
        '/news/world/f1',
        '/news/world/other',
      ]);
      const { entries } = await site.manifest();
      expect(entries['/news/technology/lead.html']).toMatchObject({ readsCollection: true });
    });

    it('no longer ships its own related stories helper', async () => {
      const { createNews } = await importStarter<{
        createNews(options: { site: object }): { helpers: object };
      }>('news/helpers/news.js');

      const { helpers } = createNews({ site: { title: 'News', baseUrl: 'https://example.com' } });
      expect(helpers).not.toHaveProperty('related');
      expect(helpers).toHaveProperty('frontPage');
    });
  });
});
