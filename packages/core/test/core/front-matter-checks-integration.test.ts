/**
 * Front matter Stati checks or reads in a real build: invalid ISG overrides stop it before a
 * page is written, values YAML reads as text are not misread, and a page's cache entry takes
 * its publish date from the page as it is now.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadConfig } from '../../src/config/loader.js';
import { setEnv } from '../../src/env.js';
import type { StatiConfig } from '../../src/types/index.js';
import { createSiteFixture, page, type SiteFixture } from './site-fixture.js';

vi.mock('../../src/config/loader.js', () => ({
  loadConfig: vi.fn(),
}));

const LAYOUT = '<html><body><%~ stati.content %></body></html>';

describe('front matter checks in a build', () => {
  let site: SiteFixture;

  async function start(config: Partial<StatiConfig> = {}): Promise<void> {
    site = await createSiteFixture(vi.mocked(loadConfig), {
      sitemap: { enabled: true },
      robots: { enabled: true },
      ...config,
    });
    await site.write('site/layout.eta', LAYOUT);
    await site.write('site/index.md', page({ title: 'Home' }, 'Home'));
    await site.write('site/a.md', page({ title: 'A' }, 'First version'));
  }

  beforeEach(() => {
    setEnv('production');
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(async () => {
    setEnv('development');
    await site.cleanup();
  });

  it('stops at an invalid ttlSeconds before writing a page, the sitemap or robots.txt', async () => {
    await start();
    await site.write('site/z.md', page({ title: 'Z', ttlSeconds: 3600.5 }));

    await expect(site.build()).rejects.toThrow('Invalid ttlSeconds in front-matter of');

    expect(await site.exists('dist/a.html')).toBe(false);
    expect(await site.exists('dist/index.html')).toBe(false);
    expect(await site.exists('dist/sitemap.xml')).toBe(false);
    expect(await site.exists('dist/robots.txt')).toBe(false);
  });

  it('leaves the output of the last build when a page gets an invalid tag', async () => {
    await start();
    await site.build();
    await site.write('site/a.md', page({ title: 'A', tags: [{ a: 1 }] }, 'Second version'));

    await expect(site.build()).rejects.toThrow('Invalid tag at index 0 in front-matter of');

    expect(await site.read('dist/a.html')).toContain('First version');
    expect(await site.exists('dist/sitemap.xml')).toBe(true);
  });

  it('stops at an invalid override a beforeAll hook sets, before writing a page', async () => {
    await start({
      hooks: {
        beforeAll: ({ pages }) => {
          const a = pages.find((entry) => entry.url === '/a')!;
          a.frontMatter = {
            ...a.frontMatter,
            maxAgeCapDays: '30',
          } as unknown as typeof a.frontMatter;
        },
      },
    });

    await expect(site.build()).rejects.toThrow('Invalid maxAgeCapDays in front-matter of');

    expect(await site.exists('dist/a.html')).toBe(false);
    expect(await site.exists('dist/index.html')).toBe(false);
  });

  it('leaves what a beforeAll hook sets unchecked when ISG is off', async () => {
    await start({
      isg: { enabled: false },
      hooks: {
        beforeAll: ({ pages }) => {
          const a = pages.find((entry) => entry.url === '/a')!;
          a.frontMatter = { ...a.frontMatter, ttlSeconds: 1.5 };
        },
      },
    });

    expect((await site.build()).rendered).toContain('/a');
  });

  it('builds a page with invalid ISG overrides when ISG is off', async () => {
    await start({ isg: { enabled: false } });
    await site.write('site/z.md', page({ title: 'Z', ttlSeconds: 3600.5, maxAgeCapDays: 0 }, 'Z'));

    const { rendered } = await site.build();

    expect(rendered).toContain('/z');
    expect(await site.read('dist/z.html')).toContain('Z');
    expect(await site.exists('dist/sitemap.xml')).toBe(true);
  });

  it('reads a single tag as a list of one', async () => {
    await start();
    await site.write('site/blog/post.md', '---\ntitle: Post\ntags: news\n---\nPost\n');

    await site.build();

    expect((await site.manifest()).entries['/blog/post.html']?.tags).toEqual(['news']);
  });

  it('builds a page whose draft is text, and leaves out a draft', async () => {
    await start();
    await site.write('site/no.md', '---\ntitle: No\ndraft: no\n---\nNo\n');
    await site.write('site/wip.md', '---\ntitle: Wip\ndraft: true\n---\nWip\n');

    const { rendered } = await site.build();

    expect(rendered).toContain('/no');
    expect(rendered).not.toContain('/wip');
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringMatching(/^Ignoring "draft" in .*no\.md: "no" is not true or false/),
    );
  });

  it('rebuilds a page by its TTL once its date is removed, instead of keeping it frozen', async () => {
    await start({ isg: { enabled: true, ttlSeconds: 60, maxAgeCapDays: 30 } });
    await site.write('site/old.md', '---\ntitle: Old\ndate: 2020-01-01\n---\nOld\n');
    await site.build();
    expect((await site.manifest()).entries['/old.html']?.publishedAt).toBe(
      '2020-01-01T00:00:00.000Z',
    );

    await site.write('site/old.md', '---\ntitle: Old\n---\nOld\n');
    expect((await site.build()).rendered).toContain('/old');
    const manifest = await site.manifest();
    expect(manifest.entries['/old.html']).not.toHaveProperty('publishedAt');

    // Two minutes later its TTL has run out; a page frozen by the old date would stay cached
    manifest.entries['/old.html'] = {
      ...manifest.entries['/old.html']!,
      renderedAt: new Date(Date.now() - 120_000).toISOString(),
    };
    await site.saveManifest(manifest);
    expect((await site.build()).rendered).toEqual(['/old']);
  });
});
