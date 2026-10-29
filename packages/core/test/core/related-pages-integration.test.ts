import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadConfig } from '../../src/config/loader.js';
import { setEnv } from '../../src/env.js';
import { createSiteFixture, page, type SiteFixture } from './site-fixture.js';

vi.mock('../../src/config/loader.js', () => ({
  loadConfig: vi.fn(),
}));

/**
 * Posts with `related: true` list related posts through stati.collection.related(); the others
 * never read the collection.
 */
const LAYOUT = '<html><body><%~ stati.content %></body></html>';
const POST_LAYOUT = `<html><body><%~ stati.content %><% if (stati.page.related) {
  const related = stati.collection.related(stati.page.url, { limit: 2, by: stati.page.by ?? 'tags' }); %>
<ul><% for (const post of related) { %><li><%= post.frontMatter.title %></li><% } %></ul><% } %></body></html>`;

const sorted = (urls: string[]) => [...urls].sort();

describe('stati.collection.related() with ISG', () => {
  let site: SiteFixture;

  const writePost = (name: string, tags: string[], extra: Record<string, unknown> = {}) =>
    site.write(
      `site/blog/${name}.md`,
      page({ title: name, tags, publishedAt: '2026-01-01', ...extra }, 'Body'),
    );

  beforeEach(async () => {
    setEnv('production');
    site = await createSiteFixture(vi.mocked(loadConfig));
    await site.write('site/layout.eta', LAYOUT);
    await site.write('site/blog/layout.eta', POST_LAYOUT);
    await site.write('site/index.md', page({ title: 'Home' }, '# Home'));
    await site.write('site/blog/index.md', page({ title: 'Blog' }));
    await writePost('alpha', ['css', 'html'], { related: true });
    await writePost('beta', ['css']);
    await writePost('gamma', ['rust']);
  });

  afterEach(async () => {
    setEnv('development');
    await site.cleanup();
  });

  it('renders the related posts and records the collection read', async () => {
    await site.build();

    expect(await site.read('dist/blog/alpha.html')).toContain('<ul><li>beta</li></ul>');
    const { entries } = await site.manifest();
    expect(entries['/blog/alpha.html']).toMatchObject({ readsCollection: true });
    expect(entries['/blog/beta.html']).toMatchObject({ readsCollection: false });
  });

  it('rebuilds the page when another post gains a shared tag', async () => {
    await site.build();

    await writePost('gamma', ['rust', 'html']);
    const second = await site.build();

    expect(sorted(second.rendered)).toEqual(['/blog/alpha', '/blog/gamma']);
    expect(await site.read('dist/blog/alpha.html')).toMatch(/<li>beta<\/li><li>gamma<\/li>/);
  });

  it('rebuilds the page when a post is added', async () => {
    await site.build();

    await writePost('delta', ['html']);
    const second = await site.build();

    expect(sorted(second.rendered)).toEqual(['/blog/alpha', '/blog/delta']);
    expect(await site.read('dist/blog/alpha.html')).toContain('<li>delta</li>');
  });

  it('does not rebuild the page when an unrelated post changes its body', async () => {
    await site.build();

    await site.write(
      'site/blog/gamma.md',
      page({ title: 'gamma', tags: ['rust'], publishedAt: '2026-01-01' }, 'New body'),
    );

    expect((await site.build()).rendered).toEqual(['/blog/gamma']);
  });

  it('lists draft posts only in builds that include drafts', async () => {
    await writePost('draft', ['css'], { draft: true });

    await site.build();
    expect(await site.read('dist/blog/alpha.html')).not.toContain('draft');

    await site.build({ includeDrafts: true, force: true });
    expect(await site.read('dist/blog/alpha.html')).toContain('<li>draft</li>');
  });

  it('rebuilds on a change to the compared field only when it is a summary field', async () => {
    const config = (summaryFields?: string[]) => async () => ({
      srcDir: 'site',
      outDir: 'dist',
      staticDir: 'public',
      site: { title: 'Fixture', baseUrl: 'https://example.com' },
      ...(summaryFields && { collections: { summaryFields } }),
    });
    const categorize = async (category: string) => {
      await writePost('alpha', ['css'], { related: true, by: 'category', category: 'news' });
      await writePost('beta', ['css'], { category });
    };

    vi.mocked(loadConfig).mockImplementation(config(['title', 'category']));
    await categorize('sport');
    await site.build();
    expect(await site.read('dist/blog/alpha.html')).not.toContain('<li>beta</li>');

    await categorize('news');
    expect(sorted((await site.build()).rendered)).toContain('/blog/alpha');
    expect(await site.read('dist/blog/alpha.html')).toContain('<li>beta</li>');

    // Without the field in the summary, the page keeps its output until it is rebuilt
    vi.mocked(loadConfig).mockImplementation(config());
    await site.build({ force: true });
    await categorize('sport');
    expect(sorted((await site.build()).rendered)).not.toContain('/blog/alpha');
  });
});
