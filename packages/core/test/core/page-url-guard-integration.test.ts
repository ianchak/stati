import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadConfig } from '../../src/config/loader.js';
import { setEnv } from '../../src/env.js';
import type { StatiConfig } from '../../src/types/index.js';
import { createSiteFixture, page, type SiteFixture } from './site-fixture.js';

vi.mock('../../src/config/loader.js', () => ({
  loadConfig: vi.fn(),
}));

const LAYOUT =
  '<html><head><title><%= stati.page.title %></title></head><body><%~ stati.content %></body></html>';

const baseConfig = (extra: Partial<StatiConfig> = {}): StatiConfig => ({
  srcDir: 'site',
  outDir: 'dist',
  staticDir: 'public',
  site: { title: 'Fixture', baseUrl: 'https://example.com' },
  ...extra,
});

describe('page URLs that leave the output directory', () => {
  let site: SiteFixture;

  beforeEach(async () => {
    setEnv('production');
    site = await createSiteFixture(vi.mocked(loadConfig));
    await site.write('site/layout.eta', LAYOUT);
    await site.write('site/index.md', page({ title: 'Home' }));
  });

  afterEach(async () => {
    setEnv('development');
    await site.cleanup();
  });

  it.each([
    ['a permalink starting with ..', '/../escaped', 'escaped.html'],
    ['a permalink with .. in the middle', '/a/../../escaped', 'escaped.html'],
    ['a permalink with a trailing slash', '/../escaped/', 'escaped/index.html'],
    ['a permalink that is only ..', '/..', 'dist/...html'],
    ['a permalink written with backslashes', '/..\\escaped', 'escaped.html'],
    ['a permalink without a leading slash', '../escaped', 'escaped.html'],
  ])('skips a page with %s and warns', async (_name, permalink, escapedFile) => {
    await site.write('site/esc.md', page({ title: 'Esc', permalink }));
    const { warnings, rendered } = await site.build();

    expect(await site.exists(escapedFile)).toBe(false);
    expect(rendered).toEqual(['/']);
    expect(warnings).toContainEqual(expect.stringContaining('esc.md'));
    expect(warnings).toContainEqual(expect.stringContaining(permalink));
    expect(await site.read('dist/index.html')).toContain('<title>Home</title>');
  });

  it('keeps writing pages whose permalink only looks like a parent folder', async () => {
    await site.write('site/dots.md', page({ title: 'Dots', permalink: '/a/..b/c..d' }));
    await site.write('site/dir.md', page({ title: 'Dir', permalink: '/docs/v1.2/' }));
    const { warnings } = await site.build();

    expect(warnings).toEqual([]);
    expect(await site.read('dist/a/..b/c..d.html')).toContain('<title>Dots</title>');
    expect(await site.read('dist/docs/v1.2/index.html')).toContain('<title>Dir</title>');
  });

  it('skips a generated page whose collections.generate URL leaves the output directory', async () => {
    await site.write('site/authors/[author].md', page({ title: 'Posts by {author}' }));
    vi.mocked(loadConfig).mockImplementation(async () =>
      baseConfig({
        collections: {
          generate: () => [
            { url: '/a/../../b', template: 'authors/[author].md', label: 'Escaping' },
            { url: '/authors/ada', template: 'authors/[author].md', label: 'Ada' },
          ],
        },
      }),
    );
    const { warnings, rendered } = await site.build();

    expect(await site.exists('b.html')).toBe(false);
    expect(rendered).toContain('/authors/ada');
    expect(rendered).not.toContain('/a/../../b');
    expect(warnings).toContainEqual(expect.stringContaining('collections.generate'));
    expect(warnings).toContainEqual(expect.stringContaining('/a/../../b'));
  });

  it('skips the pages of a [param].md template whose permalink leaves the output directory', async () => {
    await site.write('site/blog/first.md', page({ title: 'First', tags: ['CSS'] }));
    await site.write('site/blog/index.md', page({ title: 'Blog' }));
    await site.write(
      'site/blog/tags/[tag].md',
      page({ title: 'Tagged {tag}', permalink: '/../tags/[tag]', generate: { from: 'tags' } }),
    );
    const { warnings } = await site.build();

    expect(await site.exists('tags/css.html')).toBe(false);
    expect(warnings).toContainEqual(expect.stringContaining('[tag].md'));
  });

  it('refuses to write a page that a beforeAll hook moves outside the output directory', async () => {
    vi.mocked(loadConfig).mockImplementation(async () =>
      baseConfig({
        hooks: {
          beforeAll: ({ pages }) => {
            pages[0]!.url = '/../hooked';
          },
        },
      }),
    );

    await expect(site.build()).rejects.toThrow(/outside the output directory/);
    expect(await site.exists('hooked.html')).toBe(false);
  });
});
