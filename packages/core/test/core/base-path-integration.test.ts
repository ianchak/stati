/**
 * Builds of a site served from a subfolder: the base path comes from `site.baseUrl`, and every
 * root-relative URL Stati emits starts with it, while files stay at the root of the output.
 * @module core/base-path-integration.test
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { loadConfig } from '../../src/config/loader.js';
import { setEnv } from '../../src/env.js';
import type { StatiConfig } from '../../src/types/index.js';
import { createSiteFixture, page, type SiteFixture } from './site-fixture.js';

vi.mock('../../src/config/loader.js', () => ({
  loadConfig: vi.fn(),
}));

/** Stands in for the Tailwind CSS CLI: copies the input to the output */
const FAKE_CLI = `const fs = require('node:fs');
const path = require('node:path');
const args = process.argv.slice(2);
const input = fs.readFileSync(args[args.indexOf('-i') + 1], 'utf8');
const output = args[args.indexOf('-o') + 1];
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, input);
process.stderr.write('Done in 3ms\\n');
`;

const LAYOUT = `<!DOCTYPE html><html><head><title><%= stati.page.title %></title></head><body>
<nav>
<a href="<%= stati.url('/') %>">Home</a>
<a href="<%= stati.url(stati.page.url) %>">Here</a>
<a href="<%= stati.url(stati.url('/about')) %>">About</a>
<a href="<%= stati.url('https://other.test/x') %>">Other</a>
<a href="<%= stati.url('#top') %>">Top</a>
</nav>
<%~ stati.content %></body></html>`;

describe('sites served from a base path', () => {
  let site: SiteFixture;

  async function createSite(baseUrl: string, config: Partial<StatiConfig> = {}): Promise<void> {
    site = await createSiteFixture(vi.mocked(loadConfig), {
      site: { title: 'Fixture', baseUrl },
      ...config,
    });
    await site.write('site/layout.eta', LAYOUT);
    await site.write('site/index.md', page({ title: 'Home' }, '# Home'));
    await site.write('site/about.md', page({ title: 'About' }, '# About'));
  }

  function setBaseUrl(baseUrl: string): void {
    const config = vi.mocked(loadConfig).getMockImplementation()!;
    vi.mocked(loadConfig).mockImplementation(async (...args) => ({
      ...(await config(...args)),
      site: { title: 'Fixture', baseUrl },
    }));
  }

  beforeEach(() => {
    setEnv('production');
  });

  afterEach(async () => {
    setEnv('development');
    await site.cleanup();
  });

  describe('stati.url() and Markdown', () => {
    it('adds the base path to site paths and leaves other URLs alone', async () => {
      await createSite('https://example.com/sub/');

      const { warnings } = await site.build();

      const about = await site.read('dist/about.html');
      expect(about).toContain('<a href="/sub/">Home</a>');
      expect(about).toContain('<a href="/sub/about">Here</a>');
      // Applying it twice changes nothing
      expect(about).toContain('<a href="/sub/about">About</a>');
      expect(about).toContain('<a href="https://other.test/x">Other</a>');
      expect(about).toContain('<a href="#top">Top</a>');
      expect(warnings).toEqual([]);
    });

    it('turns a value that is not a string into text, and nothing into an empty string', async () => {
      await createSite('https://example.com/sub');
      await site.write(
        'site/layout.eta',
        '<html><body><i><%= stati.url(undefined) %></i><i><%= stati.url(null) %></i><i><%= stati.url(42) %></i></body></html>',
      );

      await site.build();

      expect(await site.read('dist/about.html')).toContain('<i></i><i></i><i>42</i>');
    });

    it('writes the page files at the root of the output', async () => {
      await createSite('https://example.com/demos/blog');

      await site.build();

      expect(await site.exists('dist/index.html')).toBe(true);
      expect(await site.exists('dist/about.html')).toBe(true);
      expect(await site.exists('dist/demos')).toBe(false);
      expect(await site.read('dist/about.html')).toContain('<a href="/demos/blog/about">Here</a>');
    });

    it('adds the base path to root-absolute links in Markdown only', async () => {
      await createSite('https://example.com/sub');
      await site.write(
        'site/index.md',
        page(
          { title: 'Home' },
          [
            '[About](/about) [Deep](/blog/post?x=1#y) [Home](/) [Abs](https://x.test/a)',
            '[Proto](//cdn.test/a) [Hash](#x) [Mail](mailto:a@b.test) [Rel](./rel) [Ref][r]',
            '<https://auto.test/a> ![Pic](/pic.svg) ![Rel](./rel.svg)',
            '',
            '[r]: /ref',
          ].join('\n'),
        ),
      );

      await site.build();

      const home = await site.read('dist/index.html');
      expect(home).toContain('<a href="/sub/about">About</a>');
      expect(home).toContain('<a href="/sub/blog/post?x=1#y">Deep</a>');
      expect(home).toContain('<a href="/sub/">Home</a>');
      expect(home).toContain('<a href="https://x.test/a">Abs</a>');
      expect(home).toContain('<a href="//cdn.test/a">Proto</a>');
      expect(home).toContain('<a href="#x">Hash</a>');
      expect(home).toContain('<a href="mailto:a@b.test">Mail</a>');
      expect(home).toContain('<a href="./rel">Rel</a>');
      expect(home).toContain('<a href="/sub/ref">Ref</a>');
      expect(home).toContain('<a href="https://auto.test/a">https://auto.test/a</a>');
      expect(home).toContain('<img src="/sub/pic.svg" alt="Pic">');
      expect(home).toContain('<img src="./rel.svg" alt="Rel">');
    });

    it('prefixes a link to a section named like the base path', async () => {
      await createSite('https://example.com/blog');
      await site.write('site/index.md', page({ title: 'Home' }, '[Post](/blog/post)'));

      await site.build();

      expect(await site.read('dist/index.html')).toContain('<a href="/blog/blog/post">Post</a>');
    });
  });

  describe('without a base path', () => {
    it.each(['https://example.com', 'https://example.com/'])(
      'builds %s exactly as before',
      async (baseUrl) => {
        await createSite(baseUrl);
        await site.write('site/index.md', page({ title: 'Home' }, '[About](/about)'));
        await site.write(
          'site/layout.eta',
          `<html><body><a href="/hard-coded">x</a><a href="<%= stati.url('/about') %>">y</a><%~ stati.content %></body></html>`,
        );

        const { warnings } = await site.build();

        const home = await site.read('dist/index.html');
        expect(home).toContain('<a href="/hard-coded">x</a><a href="/about">y</a>');
        expect(home).toContain('<a href="/about">About</a>');
        expect(warnings).toEqual([]);
      },
    );

    it('gives pages the same cache hash with or without a trailing slash, and another one under a path', async () => {
      await createSite('https://example.com');
      await site.build();
      const root = (await site.manifest()).entries['/index.html']!.inputsHash;

      setBaseUrl('https://example.com/');
      const { cached } = await site.build();
      expect(cached.sort()).toEqual(['/', '/about']);
      expect((await site.manifest()).entries['/index.html']!.inputsHash).toBe(root);

      setBaseUrl('https://example.com/sub');
      const { rendered } = await site.build();
      expect(rendered.sort()).toEqual(['/', '/about']);
      expect((await site.manifest()).entries['/index.html']!.inputsHash).not.toBe(root);
    });
  });

  describe('ISG', () => {
    it('keeps cached pages while the base path stays and rebuilds all of them when it changes', async () => {
      await createSite('https://example.com/sub');
      await site.build();

      const second = await site.build();
      expect(second.rendered).toEqual([]);
      expect(second.cached.sort()).toEqual(['/', '/about']);

      setBaseUrl('https://example.com/other');
      const third = await site.build();
      expect(third.rendered.sort()).toEqual(['/', '/about']);
      expect(await site.read('dist/about.html')).toContain('<a href="/other/about">Here</a>');

      setBaseUrl('https://example.com');
      const fourth = await site.build();
      expect(fourth.rendered.sort()).toEqual(['/', '/about']);
      expect(await site.read('dist/about.html')).toContain('<a href="/about">Here</a>');
    });
  });

  describe('missed links', () => {
    beforeEach(async () => {
      await createSite('https://example.com/sub');
      await site.write(
        'site/layout.eta',
        [
          '<!DOCTYPE html><html><head><title>x</title>',
          '<link rel="icon" href="/favicon.svg">',
          '<!-- <a href="/commented"> --><script>var s = \'<a href="/script">\';</script>',
          '</head><body>',
          '<a href="/about">About</a> <a href="/sub/ok">Ok</a> <a href="/sub">Root</a>',
          '<a href="//cdn.test/x">Proto</a> <a href="#top">Top</a> <a href="?page=2">Query</a>',
          '<img src="/logo.png" alt=""><a href="about">Relative</a>',
          '<%~ stati.content %></body></html>',
        ].join('\n'),
      );
    });

    it('warns once per link with the attribute and the first page', async () => {
      const { warnings } = await site.build();

      expect(
        warnings.map((message) => message.replace(/^\S+ and 1 more/, '<page> and 1 more')).sort(),
      ).toEqual([
        '<page> and 1 more page(s): href="/about" does not start with the base path /sub, so it breaks when the site is served from there. Use stati.url("/about").',
        '<page> and 1 more page(s): href="/favicon.svg" does not start with the base path /sub, so it breaks when the site is served from there. Use stati.url("/favicon.svg").',
        '<page> and 1 more page(s): src="/logo.png" does not start with the base path /sub, so it breaks when the site is served from there. Use stati.url("/logo.png").',
      ]);
    });

    it('stays quiet without a base path', async () => {
      setBaseUrl('https://example.com');

      const { warnings } = await site.build();

      expect(warnings).toEqual([]);
    });

    it('stays quiet when templates use stati.url()', async () => {
      await site.write(
        'site/layout.eta',
        '<html><head></head><body><a href="<%= stati.url(\'/about\') %>">About</a><link rel="icon" href="<%= stati.url(\'/favicon.svg\') %>"></body></html>',
      );

      const { warnings } = await site.build();

      expect(warnings).toEqual([]);
    });
  });

  describe('search index', () => {
    it('points the meta tag at the index under the base path and writes it at the root', async () => {
      await createSite('https://example.com/sub', { search: { enabled: true } });

      await site.build();

      const html = await site.read('dist/index.html');
      const index = html.match(/<meta name="stati:search-index" content="([^"]+)">/)?.[1];
      expect(index).toMatch(/^\/sub\/search-index-[0-9a-f]+\.json$/);
      expect(await site.exists(`dist${index!.slice('/sub'.length)}`)).toBe(true);
    });

    /** The index file name the home page's meta tag points at, without the base path */
    async function indexFile(basePath: string): Promise<string> {
      const html = await site.read('dist/index.html');
      const content = html.match(/<meta name="stati:search-index" content="([^"]+)">/)![1]!;
      return content.slice(basePath.length + 1);
    }

    async function readIndex(
      file: string,
    ): Promise<{ basePath: string; documents: { url: string }[] }> {
      return JSON.parse(await site.read(`dist/${file}`));
    }

    it('records the base path in the index and keeps each url relative to the site root', async () => {
      await createSite('https://example.com/sub/', { search: { enabled: true } });

      await site.build();

      const index = await readIndex(await indexFile('/sub'));
      expect(index.basePath).toBe('/sub');
      expect(index.documents.map((doc) => doc.url)).toEqual(['/about']);
    });

    it('records an empty base path for a baseUrl without a path', async () => {
      await createSite('https://example.com/', { search: { enabled: true } });

      await site.build();

      const index = await readIndex(await indexFile(''));
      expect(index.basePath).toBe('');
      expect(index.documents.map((doc) => doc.url)).toEqual(['/about']);
    });

    it('names the file after the base path as well as the indexed content', async () => {
      await createSite('https://example.com/sub', { search: { enabled: true } });
      await site.build();
      const sub = await indexFile('/sub');

      await site.build();
      expect(await indexFile('/sub')).toBe(sub);

      setBaseUrl('https://example.com/other');
      await site.build();
      const other = await indexFile('/other');
      expect(other).not.toBe(sub);
      expect((await readIndex(other)).basePath).toBe('/other');
      // The file of the earlier base path is removed with the other stale indexes
      expect(await site.exists(`dist/${sub}`)).toBe(false);
    });

    it('keeps the site path in stati.assets.searchIndexPath', async () => {
      await createSite('https://example.com/sub', {
        search: { enabled: true, autoInjectMetaTag: false },
      });
      await site.write(
        'site/layout.eta',
        '<html><head></head><body><i><%= stati.assets.searchIndexPath %></i><b><%= stati.url(stati.assets.searchIndexPath) %></b></body></html>',
      );

      await site.build();

      const html = await site.read('dist/index.html');
      const plain = html.match(/<i>([^<]+)<\/i>/)![1]!;
      expect(plain).toMatch(/^\/search-index-[0-9a-f]+\.json$/);
      expect(html).toContain(`<b>/sub${plain}</b>`);
    });
  });

  describe('sitemap, robots and feeds', () => {
    it('lists absolute URLs under the base path, and notes that robots.txt needs the root', async () => {
      await createSite('https://example.com/sub', {
        sitemap: { enabled: true },
        robots: { enabled: true, sitemap: true, allow: ['/'] },
      });

      const { info } = await site.build();

      expect(await site.read('dist/sitemap.xml')).toContain(
        '<loc>https://example.com/sub/about</loc>',
      );
      expect(await site.read('dist/robots.txt')).toContain(
        'Sitemap: https://example.com/sub/sitemap.xml',
      );
      expect(info).toContain(
        "Crawlers read robots.txt only at a host's root, so they ignore it under /sub/. Serve it from the root of example.com as well.",
      );
    });

    it('adds no note to a site at the root', async () => {
      await createSite('https://example.com', { robots: { enabled: true, allow: ['/'] } });

      const { info } = await site.build();

      expect(info.filter((message) => message.includes('robots.txt'))).toEqual([
        'Generating robots.txt...',
      ]);
    });

    it('lists feed links under the base path', async () => {
      await createSite('https://example.com/sub', {
        rss: {
          enabled: true,
          feeds: [
            {
              filename: 'feed.xml',
              title: 'Feed',
              description: 'Feed',
              contentPatterns: ['**/*.md'],
            },
          ],
        },
      });

      await site.build();

      expect(await site.read('dist/feed.xml')).toContain(
        '<link>https://example.com/sub/about</link>',
      );
    });
  });

  describe('stylesheets', () => {
    const files = async () =>
      (await readdir(join(site.dir, 'dist', '_assets')).catch(() => [])).sort();

    it('links the hashed copy of a static stylesheet under the base path', async () => {
      await createSite('https://example.com/sub');
      await site.write('public/styles.css', 'body { color: black; }');
      await site.write(
        'site/layout.eta',
        '<html><head><link rel="stylesheet" href="<%= stati.url(\'/styles.css\') %>"></head><body></body></html>',
      );

      const { warnings } = await site.build();

      const [name] = await files();
      expect(name).toMatch(/^styles-[0-9A-F]{8}\.css$/);
      expect(await site.read('dist/about.html')).toContain(
        `<link rel="stylesheet" href="/sub/_assets/${name}">`,
      );
      expect(warnings).toEqual([]);

      // The cached pages link the new copy when the CSS changes
      await site.write('public/styles.css', 'body { color: navy; }');
      const second = await site.build();
      expect(second.rendered).toEqual([]);
      const [renamed] = await files();
      expect(renamed).not.toBe(name);
      expect(await site.read('dist/about.html')).toContain(
        `<link rel="stylesheet" href="/sub/_assets/${renamed}">`,
      );
    });

    it('loads the files a hashed copy references from the base path', async () => {
      await createSite('https://example.com/sub');
      await site.write('public/styles.css', 'body { background: url(img/bg.png); }');
      await site.write(
        'site/layout.eta',
        '<html><head><link rel="stylesheet" href="<%= stati.url(\'/styles.css\') %>"></head><body></body></html>',
      );

      await site.build();

      const [name] = await files();
      expect(await site.read(`dist/_assets/${name}`)).toBe(
        'body { background: url(/sub/img/bg.png); }',
      );
      // The file under its own name keeps its relative references
      expect(await site.read('dist/styles.css')).toBe('body { background: url(img/bg.png); }');
    });

    it('rewrites links that carry the site origin and the base path', async () => {
      await createSite('https://example.com/sub');
      await site.write('public/styles.css', 'body { color: black; }');
      await site.write(
        'site/layout.eta',
        '<html><head><link rel="stylesheet" href="https://example.com/sub/styles.css?v=1"></head><body></body></html>',
      );

      await site.build();

      const [name] = await files();
      expect(await site.read('dist/about.html')).toContain(
        `<link rel="stylesheet" href="https://example.com/sub/_assets/${name}?v=1">`,
      );
    });

    it('does not take a link outside the base path for the site stylesheet', async () => {
      await createSite('https://example.com/sub');
      await site.write('public/styles.css', 'body { color: black; }');
      await site.write(
        'site/layout.eta',
        '<html><head><link rel="stylesheet" href="/styles.css"></head><body></body></html>',
      );

      const { warnings } = await site.build();

      expect(await site.read('dist/about.html')).toContain(
        '<link rel="stylesheet" href="/styles.css">',
      );
      expect(warnings.some((message) => message.includes('href="/styles.css"'))).toBe(true);
    });

    describe('with Tailwind CSS', () => {
      const tailwind = { input: 'src/styles.css', output: 'dist/styles.css' };

      beforeEach(async () => {
        await createSite('https://example.com/sub');
        await site.write(
          'node_modules/@tailwindcss/cli/package.json',
          JSON.stringify({ name: '@tailwindcss/cli', bin: { tailwindcss: './cli.cjs' } }),
        );
        await site.write('node_modules/@tailwindcss/cli/cli.cjs', FAKE_CLI);
        await site.write('src/styles.css', 'body { color: black; }');
      });

      it('adds the hashed stylesheet link under the base path to every page', async () => {
        const { warnings } = await site.build({ tailwind });

        const [name] = await files();
        expect(name).toMatch(/^styles-[0-9A-F]{8}\.css$/);
        for (const file of ['dist/index.html', 'dist/about.html']) {
          const html = await site.read(file);
          expect(html).toContain(`<link rel="stylesheet" href="/sub/_assets/${name}">`);
          expect(html).not.toContain('pending');
        }
        expect(warnings).toEqual([]);
        expect((await site.manifest()).stylesheets).toEqual({ '/styles.css': `/_assets/${name}` });
      });

      it('rebases the references of the Tailwind stylesheet onto the base path', async () => {
        await site.write('src/styles.css', '@font-face { src: url(../fonts/inter.woff2); }');

        await site.build({ tailwind });

        const [name] = await files();
        expect(await site.read(`dist/_assets/${name}`)).toBe(
          '@font-face { src: url(/sub/fonts/inter.woff2); }',
        );
      });

      it('links the stylesheet under a base URL the beforeAll hook sets', async () => {
        const config = vi.mocked(loadConfig).getMockImplementation()!;
        vi.mocked(loadConfig).mockImplementation(async (...args) => ({
          ...(await config(...args)),
          site: { title: 'Fixture', baseUrl: 'https://example.com' },
          hooks: {
            beforeAll: ({ config: built }) => {
              built.site = { ...built.site, baseUrl: 'https://example.com/sub' };
            },
          },
        }));

        const { warnings } = await site.build({ tailwind });

        const [name] = await files();
        for (const file of ['dist/index.html', 'dist/about.html']) {
          expect(await site.read(file)).toContain(
            `<link rel="stylesheet" href="/sub/_assets/${name}">`,
          );
        }
        expect(warnings).toEqual([]);
      });

      it('links the new name on cached pages when the CSS changes', async () => {
        await site.build({ tailwind });
        await site.write('src/styles.css', 'body { color: navy; }');

        const { rendered } = await site.build({ tailwind });

        expect(rendered).toEqual([]);
        const [name] = await files();
        expect(await files()).toHaveLength(1);
        expect(await site.read('dist/about.html')).toContain(
          `<link rel="stylesheet" href="/sub/_assets/${name}">`,
        );
      });

      it('points a link the template writes with stati.url() at the hashed name', async () => {
        await site.write(
          'site/layout.eta',
          '<html><head><link rel="stylesheet" href="<%= stati.url(stati.assets.stylesheetPaths[0]) %>"></head><body></body></html>',
        );

        const { warnings } = await site.build({ tailwind });

        const [name] = await files();
        const html = await site.read('dist/about.html');
        expect(html).toContain(`<link rel="stylesheet" href="/sub/_assets/${name}">`);
        expect(html.match(/rel="stylesheet"/g)).toHaveLength(1);
        expect(warnings).toEqual([]);
      });
    });
  });
});
