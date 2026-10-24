/**
 * Builds that run Tailwind CSS for the stylesheet (`--tailwind-input`, `--tailwind-output`):
 * the hashed production file, the link on every page, cached pages relinked when the CSS
 * changes, and the files earlier builds left behind. A stand-in CLI replaces Tailwind.
 * @module core/stylesheet-integration.test
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { loadConfig } from '../../src/config/loader.js';
import { setEnv } from '../../src/env.js';
import type { StatiConfig } from '../../src/types/index.js';
import { createSiteFixture, page, type SiteFixture } from './site-fixture.js';

vi.mock('../../src/config/loader.js', () => ({
  loadConfig: vi.fn(),
}));

// A test can lower the HTML a hashed build holds in memory until Tailwind has run
const limits = vi.hoisted(() => ({ deferredPagesLength: undefined as number | undefined }));
vi.mock('../../src/constants.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/constants.js')>();
  return {
    ...actual,
    get MAX_DEFERRED_PAGES_LENGTH() {
      return limits.deferredPagesLength ?? actual.MAX_DEFERRED_PAGES_LENGTH;
    },
  };
});

/**
 * Stands in for the Tailwind CSS CLI: copies the input to the output, marking --minify, fails
 * like Tailwind on an input holding FAIL, and records every run in tailwind-runs.log.
 */
const FAKE_CLI = `const fs = require('node:fs');
const path = require('node:path');
const args = process.argv.slice(2);
fs.appendFileSync(path.join(process.cwd(), 'tailwind-runs.log'), JSON.stringify(args) + '\\n');
const input = fs.readFileSync(args[args.indexOf('-i') + 1], 'utf8');
if (input.includes('FAIL')) {
  process.stderr.write('\\u001b[31mError: Cannot apply unknown utility class "nope"\\u001b[39m\\n');
  process.exit(1);
}
const output = args[args.indexOf('-o') + 1];
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, (args.includes('--minify') ? '/*min*/' : '') + input);
process.stderr.write('≈ tailwindcss v4.0.0\\n\\nDone in 3ms\\n');
`;

const tailwind = { input: 'src/styles.css', output: 'dist/styles.css' };

const LAYOUT =
  '<!DOCTYPE html><html><head><title><%= stati.page.title %></title></head><body><%~ stati.content %></body></html>';

/** The file name Stati gives the CSS the stand-in CLI writes for an input */
function hashedName(input: string, minify = true): string {
  const css = `${minify ? '/*min*/' : ''}${input}`;
  return `styles-${createHash('sha256').update(css).digest('hex').slice(0, 8).toUpperCase()}.css`;
}

function stylesheetLinks(html: string): string[] {
  return [...html.matchAll(/<link rel="stylesheet" href="([^"]+)">/g)].map((match) => match[1]!);
}

describe('stylesheet builds with Tailwind CSS', () => {
  let site: SiteFixture;

  async function createSite(config: Partial<StatiConfig> = {}): Promise<void> {
    site = await createSiteFixture(vi.mocked(loadConfig), config);
    await site.write(
      'node_modules/@tailwindcss/cli/package.json',
      JSON.stringify({ name: '@tailwindcss/cli', bin: { tailwindcss: './cli.cjs' } }),
    );
    await site.write('node_modules/@tailwindcss/cli/cli.cjs', FAKE_CLI);
    await site.write('src/styles.css', 'body { color: black; }');
    await site.write('site/layout.eta', LAYOUT);
    await site.write('site/index.md', page({ title: 'Home' }, '# Home'));
    await site.write('site/about.md', page({ title: 'About' }, '# About'));
  }

  async function tailwindRuns(): Promise<string[][]> {
    if (!(await site.exists('tailwind-runs.log'))) {
      return [];
    }
    const log = await site.read('tailwind-runs.log');
    return log
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line) as string[]);
  }

  async function assetFiles(): Promise<string[]> {
    return (await readdir(join(site.dir, 'dist', '_assets')).catch(() => [])).sort();
  }

  beforeEach(() => {
    setEnv('production');
  });

  afterEach(async () => {
    setEnv('development');
    limits.deferredPagesLength = undefined;
    await site.cleanup();
  });

  describe('production', () => {
    it('writes a hashed stylesheet once the pages have rendered and links it on every page', async () => {
      await createSite();
      const name = hashedName('body { color: black; }');

      const { rendered, warnings, info } = await site.build({ tailwind });

      expect(rendered.sort()).toEqual(['/', '/about']);
      // Written once, after Tailwind has named the stylesheet
      expect(info.some((message) => message.startsWith('Linked'))).toBe(false);
      expect(await assetFiles()).toEqual([name]);
      for (const file of ['dist/index.html', 'dist/about.html']) {
        const html = await site.read(file);
        expect(stylesheetLinks(html)).toEqual([`/_assets/${name}`]);
        expect(html).not.toContain('[hash]');
      }
      expect((await site.manifest()).stylesheets).toEqual({ '/styles.css': `/_assets/${name}` });
      expect(await tailwindRuns()).toEqual([
        [
          '-i',
          join(site.dir, 'src', 'styles.css'),
          '-o',
          join(site.dir, '.stati', 'tailwind-styles.css'),
          '--minify',
        ],
      ]);
      expect(await site.exists('.stati/tailwind-styles.css')).toBe(false);
      expect(warnings).toEqual([]);
    });

    it('keeps cached pages and the file name when the CSS has not changed', async () => {
      await createSite();
      await site.build({ tailwind });
      const html = await site.read('dist/about.html');

      const { rendered, cached, info } = await site.build({ tailwind });

      expect(rendered).toEqual([]);
      expect(cached.sort()).toEqual(['/', '/about']);
      expect(await site.read('dist/about.html')).toBe(html);
      expect(info.some((message) => message.startsWith('Linked'))).toBe(false);
      expect(await assetFiles()).toEqual([hashedName('body { color: black; }')]);
    });

    it('links the new name on cached pages when the CSS changes and deletes the old file', async () => {
      await createSite();
      await site.build({ tailwind });
      await site.write('src/styles.css', 'body { color: navy; }');
      const name = hashedName('body { color: navy; }');

      const { rendered, info } = await site.build({ tailwind });

      expect(rendered).toEqual([]);
      expect(info).toContain(`Linked 2 pages to /_assets/${name}`);
      expect(stylesheetLinks(await site.read('dist/index.html'))).toEqual([`/_assets/${name}`]);
      expect(stylesheetLinks(await site.read('dist/about.html'))).toEqual([`/_assets/${name}`]);
      expect(await assetFiles()).toEqual([name]);
      expect((await site.manifest()).stylesheets).toEqual({ '/styles.css': `/_assets/${name}` });
    });

    it('leaves the previous pages and stylesheet in place when Tailwind fails', async () => {
      await createSite();
      await site.build({ tailwind });
      const previous = hashedName('body { color: black; }');
      await site.write('site/about.md', page({ title: 'About' }, '# About us'));
      await site.write('src/styles.css', 'FAIL');

      await expect(site.build({ tailwind })).rejects.toThrow(
        'Tailwind CSS exited with code 1:\nError: Cannot apply unknown utility class "nope"',
      );

      // The page rendered again is not written without the stylesheet it links
      const about = await site.read('dist/about.html');
      expect(about).not.toContain('About us');
      expect(stylesheetLinks(about)).toEqual([`/_assets/${previous}`]);
      expect(await assetFiles()).toEqual([previous]);

      // The next build after the fix writes the page and links every page to the new file
      await site.write('src/styles.css', 'body { color: teal; }');
      const name = hashedName('body { color: teal; }');
      await site.build({ tailwind });
      expect(await site.read('dist/about.html')).toContain('About us');
      expect(stylesheetLinks(await site.read('dist/about.html'))).toEqual([`/_assets/${name}`]);
      expect(stylesheetLinks(await site.read('dist/index.html'))).toEqual([`/_assets/${name}`]);
      expect(await assetFiles()).toEqual([name]);
    });

    it('checks the input before any page renders', async () => {
      await createSite();
      await site.remove('src/styles.css');

      await expect(site.build({ tailwind })).rejects.toThrow(
        'Tailwind CSS input not found: src/styles.css',
      );
      expect(await site.exists('dist/index.html')).toBe(false);
    });

    it('fails before rendering when Tailwind CSS is not installed', async () => {
      await createSite();
      await site.remove('node_modules/@tailwindcss/cli/package.json');

      await expect(site.build({ tailwind })).rejects.toThrow('Tailwind CSS is not installed');
      expect(await site.exists('dist/index.html')).toBe(false);
    });

    it('rejects an output outside the output directory', async () => {
      await createSite();

      await expect(
        site.build({ tailwind: { input: 'src/styles.css', output: 'public/styles.css' } }),
      ).rejects.toThrow(
        '--tailwind-output must be a file in the output directory, such as dist/styles.css (got public/styles.css).',
      );
    });

    it("keeps the dev server's output, which the next dev server start watches", async () => {
      await createSite();
      await site.write('dist/styles.css', '/* written by the dev server watcher */');

      await site.build({ tailwind });

      expect(await site.read('dist/styles.css')).toBe('/* written by the dev server watcher */');
    });

    it('keeps pages past the memory limit in the cache directory until Tailwind has run', async () => {
      await createSite();
      limits.deferredPagesLength = 0;
      const name = hashedName('body { color: black; }');

      const { info } = await site.build({ tailwind });

      expect(info.some((message) => message.startsWith('Linked'))).toBe(false);
      expect(stylesheetLinks(await site.read('dist/index.html'))).toEqual([`/_assets/${name}`]);
      expect(stylesheetLinks(await site.read('dist/about.html'))).toEqual([`/_assets/${name}`]);
      expect(await site.exists('.stati/pending-pages')).toBe(false);
    });

    it('leaves the previous pages past the memory limit in place when Tailwind fails', async () => {
      await createSite();
      await site.build({ tailwind });
      const previous = hashedName('body { color: black; }');
      limits.deferredPagesLength = 0;
      await site.write('site/about.md', page({ title: 'About' }, '# About us'));
      await site.write('src/styles.css', 'FAIL');

      await expect(site.build({ tailwind })).rejects.toThrow('Tailwind CSS exited with code 1');

      const about = await site.read('dist/about.html');
      expect(about).not.toContain('About us');
      expect(stylesheetLinks(about)).toEqual([`/_assets/${previous}`]);
      expect(await site.exists('.stati/pending-pages')).toBe(false);
    });

    it("leaves the stylesheet's name in page text alone", async () => {
      await createSite();
      await site.write(
        'site/index.md',
        page(
          { title: 'Home' },
          'The build writes `/_assets/styles-[hash].css`, such as `/_assets/styles-A1B2C3D4.css`.',
        ),
      );
      await site.build({ tailwind });
      await site.write('src/styles.css', 'body { color: navy; }');

      // The second build relinks the cached page
      await site.build({ tailwind });

      const html = await site.read('dist/index.html');
      expect(html).toContain('<code>/_assets/styles-[hash].css</code>');
      expect(html).toContain('<code>/_assets/styles-A1B2C3D4.css</code>');
      expect(stylesheetLinks(html)).toEqual([`/_assets/${hashedName('body { color: navy; }')}`]);
    });

    it('relinks cached pages after a build that stopped before saving the cache manifest', async () => {
      await createSite();
      await site.build({ tailwind });
      const manifestAfterFirst = await site.manifest();
      await site.write('src/styles.css', 'body { color: navy; }');
      await site.build({ tailwind });
      // The second build gave the pages its name, then stopped before saving the manifest
      await site.saveManifest(manifestAfterFirst);

      // Back to the first build's CSS, the name the manifest records
      await site.write('src/styles.css', 'body { color: black; }');
      const name = hashedName('body { color: black; }');
      const { rendered, info } = await site.build({ tailwind });

      expect(rendered).toEqual([]);
      expect(info).toContain(`Linked 2 pages to /_assets/${name}`);
      expect(stylesheetLinks(await site.read('dist/index.html'))).toEqual([`/_assets/${name}`]);
      expect(stylesheetLinks(await site.read('dist/about.html'))).toEqual([`/_assets/${name}`]);
      expect(await assetFiles()).toEqual([name]);
    });

    it('rebases relative url() references for the stylesheet in _assets/', async () => {
      await createSite({ css: { minify: false } });
      await site.write(
        'src/styles.css',
        '@font-face { src: url(fonts/inter.woff2); } .hero { background: url("/img/bg.svg"); }',
      );

      await site.build({ tailwind });

      const [file] = await assetFiles();
      expect(await site.read(`dist/_assets/${file}`)).toBe(
        '@font-face { src: url(/fonts/inter.woff2); } .hero { background: url("/img/bg.svg"); }',
      );
    });

    it('gives each page its own stylesheetPaths', async () => {
      await createSite();
      await site.write('site/about.md', page({ title: 'About', layout: 'print' }, '# About'));
      await site.write(
        'site/print.eta',
        "<% stati.assets.stylesheetPaths.push('/print.css') %>" + LAYOUT,
      );
      const name = hashedName('body { color: black; }');

      await site.build({ tailwind });

      expect(stylesheetLinks(await site.read('dist/about.html'))).toEqual([
        `/_assets/${name}`,
        '/print.css',
      ]);
      expect(stylesheetLinks(await site.read('dist/index.html'))).toEqual([`/_assets/${name}`]);
    });

    it('deletes the hashed stylesheet once a build no longer builds it', async () => {
      await createSite();
      await site.build({ tailwind });
      expect(await assetFiles()).toHaveLength(1);

      const { rendered } = await site.build();

      expect(rendered.sort()).toEqual(['/', '/about']);
      expect(stylesheetLinks(await site.read('dist/index.html'))).toEqual([]);
      expect(await assetFiles()).toEqual([]);
    });

    it('deletes the hashed copies of the previous output name', async () => {
      await createSite();
      await site.build({ tailwind });

      await site.build({ tailwind: { input: 'src/styles.css', output: 'dist/main.css' } });

      const files = await assetFiles();
      expect(files).toHaveLength(1);
      expect(files[0]).toMatch(/^main-[0-9A-F]{8}\.css$/);
    });

    it('writes the pages it renders once and relinks only cached ones when the CSS changes', async () => {
      await createSite();
      await site.build({ tailwind });
      await site.write('site/about.md', page({ title: 'About' }, '# About us'));
      await site.write('src/styles.css', 'body { color: navy; }');
      const name = hashedName('body { color: navy; }');

      const { rendered, info } = await site.build({ tailwind });

      expect(rendered).toEqual(['/about']);
      expect(info).toContain(`Linked 1 page to /_assets/${name}`);
      expect(await site.read('dist/about.html')).toContain('About us');
      expect(stylesheetLinks(await site.read('dist/about.html'))).toEqual([`/_assets/${name}`]);
      expect(stylesheetLinks(await site.read('dist/index.html'))).toEqual([`/_assets/${name}`]);
    });

    it('warns about pages that still link the development path', async () => {
      await createSite();
      await site.write(
        'site/layout.eta',
        LAYOUT.replace('</head>', '<link rel="stylesheet" href="/styles.css"></head>'),
      );

      const { warnings } = await site.build({ tailwind });

      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toMatch(
        /^Pages \/(about)? and 1 more link \/styles\.css, which production builds do not write: they name the stylesheet \/_assets\/styles-\[hash\]\.css\. Stati links that file itself/,
      );
    });

    it('warns about a development link that is unquoted or under the site URL', async () => {
      await createSite();
      await site.write(
        'site/layout.eta',
        LAYOUT.replace('</head>', '<link rel=stylesheet href=/styles.css></head>'),
      );
      await site.write(
        'site/plain.eta',
        LAYOUT.replace(
          '</head>',
          '<link rel="stylesheet" href="https://example.com/styles.css?v=2"></head>',
        ),
      );
      await site.write('site/about.md', page({ title: 'About', layout: 'plain' }, '# About'));

      const { warnings } = await site.build({ tailwind });

      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toMatch(/^Pages \/(about)? and 1 more link \/styles\.css/);
    });

    it('with css.hash false writes and links the output under its own name', async () => {
      await createSite({ css: { hash: false, minify: false } });
      await site.write('dist/_assets/styles-0A1B2C3D.css', '/* an earlier hashed build */');

      await site.build({ tailwind });

      expect(await site.read('dist/styles.css')).toBe('body { color: black; }');
      expect(stylesheetLinks(await site.read('dist/index.html'))).toEqual(['/styles.css']);
      expect(await assetFiles()).toEqual([]);
      expect((await tailwindRuns())[0]).not.toContain('--minify');
    });

    it('with css.hash false keeps the Tailwind output over a static file at its path', async () => {
      await createSite({ css: { hash: false, minify: false } });
      await site.write('public/styles.css', '/* source the static copy would ship */');

      const { warnings } = await site.build({ tailwind });

      expect(await site.read('dist/styles.css')).toBe('body { color: black; }');
      expect(warnings).toEqual([
        'public/styles.css is not copied: Tailwind CSS writes dist/styles.css. Delete one of them.',
      ]);
    });

    it('with css.autoInject false leaves the link to templates, which print the final path', async () => {
      await createSite({ css: { autoInject: false } });
      await site.write(
        'site/layout.eta',
        LAYOUT.replace(
          '</head>',
          '<% for (const href of stati.assets.stylesheetPaths) { %><link rel="preload" as="style" href="<%= href %>"><% } %></head>',
        ),
      );
      const name = hashedName('body { color: black; }');

      await site.build({ tailwind });

      const html = await site.read('dist/index.html');
      expect(stylesheetLinks(html)).toEqual([]);
      expect(html).toContain(`<link rel="preload" as="style" href="/_assets/${name}">`);
    });

    it('renders cached pages again when the stylesheet is first linked', async () => {
      await createSite();
      await site.build();
      expect(stylesheetLinks(await site.read('dist/index.html'))).toEqual([]);

      const { rendered } = await site.build({ tailwind });

      expect(rendered.sort()).toEqual(['/', '/about']);
      expect(stylesheetLinks(await site.read('dist/index.html'))).toHaveLength(1);
    });

    it('gives templates an empty stylesheetPaths without Tailwind', async () => {
      await createSite();
      await site.write(
        'site/layout.eta',
        LAYOUT.replace(
          '</body>',
          '<p id="paths"><%= JSON.stringify(stati.assets.stylesheetPaths) %></p></body>',
        ),
      );

      await site.build();

      expect(await site.read('dist/index.html')).toContain('<p id="paths">[]</p>');
      expect(await tailwindRuns()).toEqual([]);
      expect((await site.manifest()).stylesheets).toBeUndefined();
    });
  });

  describe('development', () => {
    it("links the watcher's output under its own name without running Tailwind", async () => {
      await createSite();
      setEnv('development');

      await site.build({ tailwind });

      expect(stylesheetLinks(await site.read('dist/index.html'))).toEqual(['/styles.css']);
      expect(await tailwindRuns()).toEqual([]);
      expect((await site.manifest()).stylesheets).toBeUndefined();
    });

    it('does not add a second link to a page that links the output itself', async () => {
      await createSite();
      setEnv('development');
      await site.write(
        'site/layout.eta',
        LAYOUT.replace('</head>', '<link rel="stylesheet" href="/styles.css"></head>'),
      );

      await site.build({ tailwind });

      expect(stylesheetLinks(await site.read('dist/index.html'))).toEqual(['/styles.css']);
    });
  });
});
