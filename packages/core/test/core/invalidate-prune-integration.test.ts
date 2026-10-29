import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadConfig } from '../../src/config/loader.js';
import { setEnv } from '../../src/env.js';
import { invalidate } from '../../src/core/invalidate.js';
import { createSiteFixture, page, type SiteFixture } from './site-fixture.js';

vi.mock('../../src/config/loader.js', () => ({
  loadConfig: vi.fn(),
}));

const LAYOUT = '<html><body><%~ stati.content %></body></html>';

const sorted = (urls: string[]) => [...urls].sort();

describe('pruning after the cache is invalidated', () => {
  let site: SiteFixture;

  beforeEach(async () => {
    setEnv('production');
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    site = await createSiteFixture(vi.mocked(loadConfig));
    await site.write('site/layout.eta', LAYOUT);
    await site.write('site/index.md', page({ title: 'Home' }, '# Home'));
    await site.write('site/about.md', page({ title: 'About', tags: ['info'] }, '# About'));
    await site.write('site/blog/first.md', page({ title: 'First', tags: ['news'] }, 'Body'));
    await site.write('site/blog/second.md', page({ title: 'Second', tags: ['news'] }, 'Body'));
  });

  afterEach(async () => {
    setEnv('development');
    await site.cleanup();
  });

  it('removes a deleted page after the whole cache is invalidated', async () => {
    await site.build();

    await invalidate();
    await site.remove('site/about.md');
    const second = await site.build();

    expect(await site.exists('dist/about.html')).toBe(false);
    expect(second.info).toContain('Removed 1 page that no longer exists');
    expect(Object.keys((await site.manifest()).entries)).not.toContain('/about.html');
  });

  it('removes a deleted page after a query invalidated it', async () => {
    await site.build();

    const result = await invalidate('path:/about');
    expect(result.invalidatedPaths).toEqual(['/about.html']);
    await site.remove('site/about.md');
    await site.build();

    expect(await site.exists('dist/about.html')).toBe(false);
    expect(await site.exists('dist/index.html')).toBe(true);
  });

  it('removes a page deleted after another page was invalidated', async () => {
    await site.build();

    await invalidate('tag:news');
    await site.remove('site/blog/second.md');
    await site.build();

    expect(await site.exists('dist/blog/second.html')).toBe(false);
    expect(await site.exists('dist/blog/first.html')).toBe(true);
  });

  it('removes the later pages of a listing that shrinks after an invalidation', async () => {
    await site.write('site/blog/index.md', page({ title: 'Blog', paginate: { size: 2 } }));
    await site.write(
      'site/blog/index.eta',
      '<html><body><%= stati.pagination.pageNumber %></body></html>',
    );
    for (const n of [3, 4, 5]) {
      await site.write(`site/blog/post-${n}.md`, page({ title: `Post ${n}` }, 'Body'));
    }
    await site.build();
    expect(await site.exists('dist/blog/page/3.html')).toBe(true);

    await invalidate();
    await site.remove('site/blog/post-4.md');
    await site.remove('site/blog/post-5.md');
    await site.build();

    expect(await site.exists('dist/blog/page/2.html')).toBe(true);
    expect(await site.exists('dist/blog/page/3.html')).toBe(false);
    expect(await site.exists('dist/blog.html')).toBe(true);
  });

  it('still renders every invalidated page again', async () => {
    await site.build();

    await invalidate('tag:news');
    const second = await site.build();

    expect(sorted(second.rendered)).toEqual(['/blog/first', '/blog/second']);
    expect(sorted(second.cached)).toEqual(['/', '/about']);
  });

  it('caches the pages again once they are rendered after an invalidation', async () => {
    await site.build();
    await invalidate();
    await site.build();

    const third = await site.build();

    expect(third.rendered).toEqual([]);
    expect(third.cached).toHaveLength(4);
  });

  it('invalidates a page that was invalidated before', async () => {
    await site.build();
    await invalidate('path:/about');

    const result = await invalidate('path:/about');

    expect(result.invalidatedPaths).toEqual(['/about.html']);
  });

  it('removes a deleted page whose cache entry fails validation', async () => {
    await site.build();
    const manifest = await site.manifest();
    await site.saveManifest({
      ...manifest,
      entries: { ...manifest.entries, '/about.html': { deps: 5 } as never },
    });

    await site.remove('site/about.md');
    await site.build();

    expect(await site.exists('dist/about.html')).toBe(false);
    expect(await site.exists('dist/index.html')).toBe(true);
  });

  it('renders a page whose cache entry fails validation again', async () => {
    await site.build();
    const manifest = await site.manifest();
    await site.saveManifest({
      ...manifest,
      entries: { ...manifest.entries, '/about.html': { deps: 5 } as never },
    });

    const second = await site.build();

    expect(second.rendered).toEqual(['/about']);
  });
});
