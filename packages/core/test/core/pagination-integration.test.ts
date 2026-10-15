import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadConfig } from '../../src/config/loader.js';
import { setEnv } from '../../src/env.js';
import { createSiteFixture, page, type SiteFixture } from './site-fixture.js';

vi.mock('../../src/config/loader.js', () => ({
  loadConfig: vi.fn(),
}));

const LAYOUT = '<html><body><%~ stati.content %></body></html>';
/** Lists this page's slice, its position and the numbered links */
const LISTING_LAYOUT = `<html><body><% const p = stati.pagination; %>
<p>Page <%= p.pageNumber %> of <%= p.totalPages %></p>
<ul><% for (const post of p.items) { %><li><%= post.frontMatter.title %></li><% } %></ul>
<p>prev=<%= p.prevUrl ?? '-' %> next=<%= p.nextUrl ?? '-' %> urls=<%= p.urls.join(',') %></p>
</body></html>`;

const sorted = (urls: string[]) => [...urls].sort();

/** Writes posts numbered from 1, newest last */
async function writePosts(site: SiteFixture, count: number, start = 1): Promise<void> {
  for (let i = start; i < start + count; i++) {
    const day = String(i).padStart(2, '0');
    await site.write(
      `site/blog/post-${i}.md`,
      page({ title: `Post ${i}`, publishedAt: `2026-01-${day}` }, `Body ${i}`),
    );
  }
}

describe('pagination', () => {
  let site: SiteFixture;

  beforeEach(async () => {
    setEnv('production');
    site = await createSiteFixture(vi.mocked(loadConfig));
    await site.write('site/layout.eta', LAYOUT);
    await site.write('site/blog/index.eta', LISTING_LAYOUT);
    await site.write('site/index.md', page({ title: 'Home' }));
    await site.write('site/blog/index.md', page({ title: 'Blog', paginate: { size: 2 } }));
  });

  afterEach(async () => {
    setEnv('development');
    await site.cleanup();
  });

  it('splits the collection into pages, newest first, keeping the index URL for page 1', async () => {
    await writePosts(site, 5);
    const { rendered } = await site.build();

    expect(rendered).toEqual(expect.arrayContaining(['/blog', '/blog/page/2', '/blog/page/3']));
    const first = await site.read('dist/blog.html');
    expect(first).toContain('Page 1 of 3');
    expect(first).toContain('<li>Post 5</li><li>Post 4</li>');
    expect(first).toContain('prev=- next=/blog/page/2 urls=/blog,/blog/page/2,/blog/page/3');

    const second = await site.read('dist/blog/page/2.html');
    expect(second).toContain('Page 2 of 3');
    expect(second).toContain('<li>Post 3</li><li>Post 2</li>');
    expect(second).toContain('prev=/blog next=/blog/page/3');

    const last = await site.read('dist/blog/page/3.html');
    expect(last).toContain('<li>Post 1</li></ul>');
    expect(last).toContain('prev=/blog/page/2 next=-');
  });

  it('makes no extra page for one item or an exact multiple of the size', async () => {
    await writePosts(site, 1);
    await site.build();
    expect(await site.read('dist/blog.html')).toContain('Page 1 of 1');
    expect(await site.exists('dist/blog/page/2.html')).toBe(false);

    await writePosts(site, 3, 2);
    await site.build();
    expect(await site.read('dist/blog.html')).toContain('Page 1 of 2');
    expect(await site.read('dist/blog/page/2.html')).toContain('<li>Post 2</li><li>Post 1</li>');
    expect(await site.exists('dist/blog/page/3.html')).toBe(false);
  });

  it('renders one empty page when the collection is empty', async () => {
    await site.write('site/index.md', page({ title: 'Home', paginate: 3 }));
    await site.write('site/index.eta', LISTING_LAYOUT);
    // The root collection holds top-level pages, including folder index pages such as /blog;
    // a nested page without an index page doesn't count
    await site.remove('site/blog/index.md');
    await writePosts(site, 1);
    await site.build();

    expect(await site.read('dist/index.html')).toContain('Page 1 of 1');
    expect(await site.read('dist/index.html')).toContain('<ul></ul>');
    expect(await site.exists('dist/page/2.html')).toBe(false);
  });

  it('lists no posts, not another collection, once the last post is deleted', async () => {
    // An explicit layout keeps the listing template for an index page without posts
    await site.write(
      'site/blog/index.md',
      page({ title: 'Blog', layout: 'blog/index', paginate: { size: 2 } }),
    );
    await site.write('site/index.md', page({ title: 'Home', collection: '/blog', paginate: 2 }));
    await site.write('site/index.eta', LISTING_LAYOUT);
    await writePosts(site, 3);
    await site.build();

    for (const i of [1, 2, 3]) {
      await site.remove(`site/blog/post-${i}.md`);
    }
    const { warnings } = await site.build();

    // The blog and the home page read the empty blog collection, not the root collection
    for (const file of ['dist/blog.html', 'dist/index.html']) {
      const html = await site.read(file);
      expect(html).toContain('Page 1 of 1');
      expect(html).toContain('<ul></ul>');
    }
    expect(await site.exists('dist/blog/page/2.html')).toBe(false);
    expect(await site.exists('dist/page/2.html')).toBe(false);
    expect(warnings).not.toContainEqual(expect.stringContaining('collection "/blog"'));
  });

  it('rebuilds every listing page when a new post adds a page', async () => {
    await writePosts(site, 4);
    await site.build();

    await writePosts(site, 1, 5);
    const { rendered } = await site.build();

    expect(sorted(rendered)).toEqual(['/blog', '/blog/page/2', '/blog/page/3', '/blog/post-5']);
    expect(await site.read('dist/blog/page/2.html')).toContain('Page 2 of 3');
  });

  it('rebuilds only the listing page that shows an edited post', async () => {
    await writePosts(site, 5);
    await site.build();

    // Post 1 is the oldest, alone on page 3
    await site.write(
      'site/blog/post-1.md',
      page({ title: 'Renamed', publishedAt: '2026-01-01' }, 'Body 1'),
    );
    const { rendered } = await site.build();

    expect(sorted(rendered)).toEqual(['/blog/page/3', '/blog/post-1']);
    expect(await site.read('dist/blog/page/3.html')).toContain('<li>Renamed</li>');
  });

  it('removes pages the listing no longer needs', async () => {
    await writePosts(site, 5);
    await site.build();
    expect(await site.exists('dist/blog/page/3.html')).toBe(true);

    await site.remove('site/blog/post-5.md');
    await site.build();

    expect(await site.exists('dist/blog/page/3.html')).toBe(false);
    expect(await site.read('dist/blog.html')).toContain('Page 1 of 2');
  });

  it('keeps pagination pages out of the collection', async () => {
    await site.write(
      'site/blog/index.eta',
      '<html><body><%= stati.collection.pages.map((p) => p.url).join(",") %></body></html>',
    );
    await writePosts(site, 3);
    await site.build();

    const urls = await site.read('dist/blog/page/2.html');
    expect(urls).toContain('/blog/post-1,/blog/post-2,/blog/post-3');
    expect(urls).not.toContain('/page/');
  });

  it('uses the configured path segment and the index URL trailing slash', async () => {
    await site.write(
      'site/blog/index.md',
      page({ title: 'Blog', permalink: '/blog/', paginate: { size: 2, path: 'p' } }),
    );
    await writePosts(site, 3);
    await site.build();

    expect(await site.read('dist/blog/index.html')).toContain('next=/blog/p/2/');
    expect(await site.read('dist/blog/p/2/index.html')).toContain('Page 2 of 2');
  });

  it('paginates another collection named in front matter', async () => {
    await site.write('site/index.md', page({ title: 'Home', collection: '/blog', paginate: 2 }));
    await site.write('site/index.eta', LISTING_LAYOUT);
    await writePosts(site, 3);
    await site.build();

    expect(await site.read('dist/index.html')).toContain('next=/page/2 urls=/,/page/2');
    expect(await site.read('dist/page/2.html')).toContain('<li>Post 1</li>');
  });

  it('warns about an invalid size and does not paginate', async () => {
    await site.write('site/blog/index.md', page({ title: 'Blog', paginate: { size: 0 } }));
    await site.write('site/blog/index.eta', LAYOUT);
    await writePosts(site, 3);
    const { warnings } = await site.build();

    expect(warnings).toContainEqual(
      expect.stringContaining('paginate.size must be a whole number'),
    );
    expect(await site.exists('dist/blog/page/2.html')).toBe(false);
  });

  it('warns when a page to paginate has no collection', async () => {
    await site.write('site/notes/list.md', page({ title: 'Notes', paginate: 2 }));
    await writePosts(site, 1);
    const { warnings } = await site.build();

    expect(warnings).toContainEqual(
      expect.stringContaining('notes/list.md: paginate needs a collection'),
    );
  });

  it('leaves pagination pages out of navigation, search and RSS, and keeps them in the sitemap', async () => {
    vi.mocked(loadConfig).mockImplementation(async () => ({
      srcDir: 'site',
      outDir: 'dist',
      staticDir: 'public',
      site: { title: 'Fixture', baseUrl: 'https://example.com' },
      search: { enabled: true, hashFilename: false },
      sitemap: { enabled: true },
      rss: {
        enabled: true,
        feeds: [{ filename: 'feed.xml', title: 'Feed', description: 'All', link: '/' }],
      },
    }));
    await site.write(
      'site/layout.eta',
      '<html><body><%= stati.nav.getChildren("/blog").map((n) => n.url).join(",") %></body></html>',
    );
    await writePosts(site, 3);
    await site.build();

    expect(await site.read('dist/index.html')).not.toContain('/page/');
    expect(await site.read('dist/search-index.json')).not.toContain('/blog/page/2');
    expect(await site.read('dist/feed.xml')).not.toContain('/blog/page/2');
    expect(await site.read('dist/sitemap.xml')).toContain('https://example.com/blog/page/2');
  });
});
