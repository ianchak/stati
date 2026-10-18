import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadConfig } from '../../src/config/loader.js';
import { setEnv } from '../../src/env.js';
import { createSiteFixture, page, type SiteFixture } from './site-fixture.js';

vi.mock('../../src/config/loader.js', () => ({
  loadConfig: vi.fn(),
}));

/**
 * The blog index lists every post. Posts with `pager: true` link to their neighbours through
 * stati.collection; other posts never read it.
 */
const LAYOUT = '<html><body><%~ stati.content %></body></html>';
const BLOG_INDEX_LAYOUT = `<html><body><ul><% for (const post of stati.collection.recentPages) { %>
<li><%= post.frontMatter.title %>: <%= post.frontMatter.description %></li><% } %></ul></body></html>`;
const POST_LAYOUT = `<html><body><%~ stati.content %><% if (stati.page.pager && stati.collection) {
  const posts = stati.collection.recentPages;
  const i = posts.findIndex((post) => post.url === stati.page.url); %>
<nav><%= posts[i - 1]?.frontMatter.title ?? 'none' %> | <%= posts[i + 1]?.frontMatter.title ?? 'none' %></nav><% } %></body></html>`;

const sorted = (urls: string[]) => [...urls].sort();

describe('collection-aware ISG', () => {
  let site: SiteFixture;

  beforeEach(async () => {
    setEnv('production');
    site = await createSiteFixture(vi.mocked(loadConfig));
    await site.write('site/layout.eta', LAYOUT);
    await site.write('site/blog/index.eta', BLOG_INDEX_LAYOUT);
    await site.write('site/blog/layout.eta', POST_LAYOUT);
    await site.write('site/index.md', page({ title: 'Home' }, '# Home'));
    await site.write('site/about.md', page({ title: 'About' }, '# About'));
    await site.write('site/blog/index.md', page({ title: 'Blog' }));
    await site.write(
      'site/blog/first.md',
      page({ title: 'First', description: 'one', publishedAt: '2026-01-01', pager: true }, 'Body'),
    );
    await site.write(
      'site/blog/second.md',
      page({ title: 'Second', description: 'two', publishedAt: '2026-02-01' }, 'Body'),
    );
    await site.write(
      'site/blog/third.md',
      page(
        { title: 'Third', description: 'three', publishedAt: '2026-03-01', pager: true },
        'Body',
      ),
    );
  });

  afterEach(async () => {
    setEnv('development');
    await site.cleanup();
  });

  it('rebuilds only the edited post when its body changes', async () => {
    expect((await site.build()).rendered).toHaveLength(6);

    await site.write(
      'site/blog/second.md',
      page({ title: 'Second', description: 'two', publishedAt: '2026-02-01' }, 'New body'),
    );
    const second = await site.build();

    expect(second.rendered).toEqual(['/blog/second']);
    expect(second.cached).toHaveLength(5);
  });

  it('rebuilds the post and every page that lists it when its title changes', async () => {
    await site.build();

    await site.write(
      'site/blog/second.md',
      page({ title: 'Renamed', description: 'two', publishedAt: '2026-02-01' }, 'Body'),
    );
    const second = await site.build();

    // The index lists it, first and third link to it; the home and about pages don't read /blog
    expect(sorted(second.rendered)).toEqual([
      '/blog',
      '/blog/first',
      '/blog/second',
      '/blog/third',
    ]);
    expect(await site.read('dist/blog.html')).toContain('Renamed: two');
    expect(await site.read('dist/blog/first.html')).toContain('Renamed | none');
  });

  it('rebuilds the listing when a description changes', async () => {
    await site.build();

    await site.write(
      'site/blog/second.md',
      page({ title: 'Second', description: 'edited', publishedAt: '2026-02-01' }, 'Body'),
    );
    const second = await site.build();

    expect(sorted(second.rendered)).toEqual([
      '/blog',
      '/blog/first',
      '/blog/second',
      '/blog/third',
    ]);
    expect(await site.read('dist/blog.html')).toContain('Second: edited');
  });

  it('does not rebuild listings for front matter outside the summary fields', async () => {
    await site.build();

    await site.write(
      'site/blog/second.md',
      page(
        { title: 'Second', description: 'two', publishedAt: '2026-02-01', mood: 'happy' },
        'Body',
      ),
    );

    expect((await site.build()).rendered).toEqual(['/blog/second']);
  });

  it('rebuilds listings for configured summary fields', async () => {
    vi.mocked(loadConfig).mockImplementation(async () => ({
      srcDir: 'site',
      outDir: 'dist',
      staticDir: 'public',
      site: { title: 'Fixture', baseUrl: 'https://example.com' },
      collections: { summaryFields: ['title', 'mood'] },
    }));
    await site.build();

    await site.write(
      'site/blog/second.md',
      page(
        { title: 'Second', description: 'two', publishedAt: '2026-02-01', mood: 'happy' },
        'Body',
      ),
    );

    expect(sorted((await site.build()).rendered)).toEqual([
      '/blog',
      '/blog/first',
      '/blog/second',
      '/blog/third',
    ]);
  });

  describe('with a date in front matter', () => {
    // Unquoted, so YAML reads it as a Date
    const second = (updated: string) =>
      `---\ntitle: Second\ndescription: two\npublishedAt: '2026-02-01'\nupdated: ${updated}\n---\nBody\n`;

    it('rebuilds the post when the date changes', async () => {
      await site.write('site/blog/second.md', second('2026-02-05'));
      await site.build();

      await site.write('site/blog/second.md', second('2026-02-06'));

      expect((await site.build()).rendered).toEqual(['/blog/second']);
    });

    it('rebuilds the listings when the date is a summary field', async () => {
      vi.mocked(loadConfig).mockImplementation(async () => ({
        srcDir: 'site',
        outDir: 'dist',
        staticDir: 'public',
        site: { title: 'Fixture', baseUrl: 'https://example.com' },
        collections: { summaryFields: ['title', 'updated'] },
      }));
      await site.write('site/blog/second.md', second('2026-02-05'));
      await site.build();

      await site.write('site/blog/second.md', second('2026-02-06'));

      expect(sorted((await site.build()).rendered)).toEqual([
        '/blog',
        '/blog/first',
        '/blog/second',
        '/blog/third',
      ]);
    });
  });

  it('rebuilds the new post and the pages that list its collection when a post is added', async () => {
    await site.build();

    await site.write(
      'site/blog/fourth.md',
      page({ title: 'Fourth', description: 'four', publishedAt: '2026-04-01' }, 'Body'),
    );
    const second = await site.build();

    expect(sorted(second.rendered)).toEqual([
      '/blog',
      '/blog/first',
      '/blog/fourth',
      '/blog/third',
    ]);
    expect(await site.read('dist/blog.html')).toContain('Fourth: four');
    expect(await site.read('dist/blog/third.html')).toContain('Fourth | Second');
  });

  it('removes a deleted post and rebuilds the pages that listed it', async () => {
    await site.build();
    expect(await site.exists('dist/blog/second.html')).toBe(true);

    await site.remove('site/blog/second.md');
    const second = await site.build();

    expect(sorted(second.rendered)).toEqual(['/blog', '/blog/first', '/blog/third']);
    expect(await site.exists('dist/blog/second.html')).toBe(false);
    expect((await site.manifest()).entries['/blog/second.html']).toBeUndefined();
    expect(second.info).toContain('Removed 1 page that no longer exists');
    expect(await site.read('dist/blog.html')).not.toContain('Second');
  });

  it('removes folders a deleted page leaves empty, and nothing the manifest does not record', async () => {
    await site.write('site/notes/only.md', page({ title: 'Only' }));
    await site.build();
    await site.write('dist/extra.html', 'from another tool');
    await site.write('dist/blog/keep.txt', 'kept');

    await site.remove('site/notes/only.md');
    await site.remove('site/blog/second.md');
    await site.build();

    expect(await site.exists('dist/notes')).toBe(false);
    expect(await site.exists('dist/blog/second.html')).toBe(false);
    expect(await site.read('dist/extra.html')).toBe('from another tool');
    expect(await site.read('dist/blog/keep.txt')).toBe('kept');
  });

  it('copies a static file that replaces a deleted page after removing the page', async () => {
    await site.build();

    await site.remove('site/about.md');
    await site.write('public/about.html', 'static about');
    await site.build();

    expect(await site.read('dist/about.html')).toBe('static about');
  });

  it('records what each page read', async () => {
    await site.build();
    const { entries } = await site.manifest();

    expect(entries['/blog.html']).toMatchObject({ readsCollection: true, readsNav: false });
    expect(entries['/blog/first.html']).toMatchObject({ readsCollection: true, readsNav: false });
    expect(entries['/blog/second.html']).toMatchObject({ readsCollection: false, readsNav: false });
    expect(entries['/about.html']).toMatchObject({ readsCollection: false, readsNav: false });
  });

  it('rebuilds pages from an older cache once to record what they read, then caches them', async () => {
    await site.build();
    const manifest = await site.manifest();
    for (const entry of Object.values(manifest.entries)) {
      delete entry.readsCollection;
      delete entry.readsNav;
    }
    await site.saveManifest(manifest);

    expect((await site.build()).rendered).toHaveLength(6);
    expect((await site.build()).rendered).toEqual([]);
  });

  it('rebuilds posts when their folder gains an index page', async () => {
    await site.remove('site/blog/index.md');
    await site.build();
    expect(await site.read('dist/blog/first.html')).not.toContain('<nav>');

    // Without /blog the post can't read a collection; adding the index page gives it one
    await site.write('site/blog/index.md', page({ title: 'Blog' }));
    const second = await site.build();

    expect(sorted(second.rendered)).toEqual([
      '/blog',
      '/blog/first',
      '/blog/second',
      '/blog/third',
    ]);
    expect(await site.read('dist/blog/first.html')).toContain('Second | none');
  });
});

describe('navigation-aware ISG', () => {
  let site: SiteFixture;

  beforeEach(async () => {
    setEnv('production');
    site = await createSiteFixture(vi.mocked(loadConfig));
    await site.write('site/layout.eta', LAYOUT);
    await site.write(
      'site/docs/layout.eta',
      `<html><body><ul><% for (const node of stati.nav.getChildren('/docs')) { %><li><%= node.title %></li><% } %></ul><%~ stati.content %></body></html>`,
    );
    await site.write('site/index.md', page({ title: 'Home' }));
    await site.write('site/docs/index.md', page({ title: 'Docs', layout: '/layout' }));
    await site.write('site/docs/intro.md', page({ title: 'Intro', order: 1 }));
    await site.write('site/docs/setup.md', page({ title: 'Setup', order: 2 }));
  });

  afterEach(async () => {
    setEnv('development');
    await site.cleanup();
  });

  it('rebuilds the pages that render navigation when it changes, in stati build', async () => {
    await site.build();

    await site.write('site/docs/setup.md', page({ title: 'Installation', order: 2 }));
    const second = await site.build();

    expect(sorted(second.rendered)).toEqual(['/docs/intro', '/docs/setup']);
    expect(await site.read('dist/docs/intro.html')).toContain('<li>Installation</li>');
    expect((await site.manifest()).entries['/docs/intro.html']).toMatchObject({ readsNav: true });
  });

  it('counts stati.page.navNode as a navigation read', async () => {
    await site.write(
      'site/layout.eta',
      '<html><body><%= stati.page.navNode?.title %><%~ stati.content %></body></html>',
    );
    await site.build();

    expect((await site.manifest()).entries['/index.html']).toMatchObject({ readsNav: true });
  });
});
