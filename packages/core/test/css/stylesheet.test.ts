/**
 * Tests for the stylesheet a build links: its paths, the links in pages, and the files earlier
 * builds left behind.
 * @module css/stylesheet.test
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import {
  autoInjectStylesheets,
  createStylesheetPlan,
  getHashedStylesheetPattern,
  getRenderStylesheetPath,
  getStaleStylesheetPaths,
  getStylesheetFingerprint,
  linksStylesheet,
  rebaseRelativeUrls,
  relinkStylesheet,
  removeStaleStylesheets,
  type StylesheetPlan,
} from '../../src/css/stylesheet.js';

const root = resolve('/project');
const outDir = join(root, 'dist');
const tailwind = { input: 'src/styles.css', output: 'dist/styles.css' };

function plan(overrides: Partial<StylesheetPlan> = {}): StylesheetPlan {
  return { ...createStylesheetPlan(tailwind, undefined, outDir, false, root), ...overrides };
}

describe('createStylesheetPlan', () => {
  it("names the output's path on the site and applies the production defaults", () => {
    expect(createStylesheetPlan(tailwind, undefined, outDir, false, root)).toEqual({
      inputFile: join(root, 'src', 'styles.css'),
      outputFile: join(root, 'dist', 'styles.css'),
      path: '/styles.css',
      name: 'styles',
      hash: true,
      minify: true,
      autoInject: true,
    });
  });

  it('keeps the name in development and applies the css settings', () => {
    expect(createStylesheetPlan(tailwind, { autoInject: false }, outDir, true, root)).toMatchObject(
      {
        hash: false,
        minify: false,
        autoInject: false,
      },
    );
  });

  it('uses forward slashes for an output in a subfolder', () => {
    const nested = createStylesheetPlan(
      { input: 'src/styles.css', output: join('dist', 'css', 'site.css') },
      undefined,
      outDir,
      false,
      root,
    );
    expect(nested).toMatchObject({ path: '/css/site.css', name: 'site' });
  });

  it('rejects an output outside the output directory', () => {
    expect(() =>
      createStylesheetPlan(
        { ...tailwind, output: 'public/styles.css' },
        undefined,
        outDir,
        false,
        root,
      ),
    ).toThrow(
      '--tailwind-output must be a file in the output directory, such as dist/styles.css (got public/styles.css).',
    );
    expect(() =>
      createStylesheetPlan({ ...tailwind, output: 'dist' }, undefined, outDir, false, root),
    ).toThrow('--tailwind-output must be a file in the output directory');
    expect(() =>
      createStylesheetPlan(
        { ...tailwind, output: 'dist-other/styles.css' },
        undefined,
        outDir,
        false,
        root,
      ),
    ).toThrow('--tailwind-output must be a file in the output directory');
  });

  it('rejects an output that is not a .css file', () => {
    expect(() =>
      createStylesheetPlan(
        { ...tailwind, output: 'dist/styles.scss' },
        undefined,
        outDir,
        false,
        root,
      ),
    ).toThrow('--tailwind-output must be a .css file (got dist/styles.scss).');
  });

  it('rejects a path an HTML attribute cannot hold as it is', () => {
    expect(() =>
      createStylesheetPlan(
        { ...tailwind, output: 'dist/my styles.css' },
        undefined,
        outDir,
        false,
        root,
      ),
    ).toThrow('--tailwind-output can hold only letters, digits, -, _, . and / in its path');
    expect(() =>
      createStylesheetPlan({ ...tailwind, output: 'dist/"x".css' }, undefined, outDir, false, root),
    ).toThrow('--tailwind-output can hold only');
  });
});

describe('getRenderStylesheetPath', () => {
  it('is the output path when the build does not hash', () => {
    expect(getRenderStylesheetPath(plan({ hash: false }))).toBe('/styles.css');
  });

  it('is a name made up for each hashed build, which no hashed file has', () => {
    const first = getRenderStylesheetPath(plan());
    const second = getRenderStylesheetPath(plan());

    expect(first).toMatch(/^\/_assets\/styles-pending-[0-9a-f]{16}\.css$/);
    expect(second).not.toBe(first);
    expect(first).not.toMatch(/^\/_assets\/styles-[0-9A-F]{8}\.css$/);
  });
});

describe('getHashedStylesheetPattern', () => {
  it('shows how a hashed build names the stylesheet', () => {
    expect(getHashedStylesheetPattern(plan())).toBe('/_assets/styles-[hash].css');
  });
});

describe('rebaseRelativeUrls', () => {
  it("resolves relative references against the stylesheet's own path", () => {
    const css =
      '@font-face{src:url(fonts/inter.woff2) format("woff2"),url("./fonts/inter.woff")}' +
      ".hero{background:url('../img/bg.svg?v=2#top')}";

    expect(rebaseRelativeUrls(css, '/css/site.css')).toBe(
      '@font-face{src:url(/css/fonts/inter.woff2) format("woff2"),url("/css/fonts/inter.woff")}' +
        ".hero{background:url('/img/bg.svg?v=2#top')}",
    );
    expect(rebaseRelativeUrls('a{b:url(../x.png)}', '/styles.css')).toBe('a{b:url(/x.png)}');
  });

  it('leaves root-relative, absolute, data, fragment, empty and escaped references alone', () => {
    const css =
      'a{b:url(/fonts/a.woff2);c:url(https://cdn.example/x.png);d:url(//cdn.example/y.png);' +
      'e:url("data:image/svg+xml;utf8,<svg/>");f:url(#mask);g:url();h:url("a\\"b.png")}';

    expect(rebaseRelativeUrls(css, '/styles.css')).toBe(css);
  });

  it('leaves the url() inside a data URI with escaped quotes alone', () => {
    const css =
      'a{b:url("data:image/svg+xml,<svg fill=\\"url(%23g)\\"/>")}' +
      "c{d:url('data:image/svg+xml,<svg fill=\\'url(%23g)\\'/>')}" +
      'e{f:url(img\\(1\\).png)}';

    expect(rebaseRelativeUrls(css, '/styles.css')).toBe(css);
    expect(rebaseRelativeUrls(`${css}g{h:url(x.png)}`, '/css/site.css')).toBe(
      `${css}g{h:url(/css/x.png)}`,
    );
  });
});

describe('getStylesheetFingerprint', () => {
  it('holds the settings, not the file name', () => {
    expect(getStylesheetFingerprint(plan())).toEqual({
      path: '/styles.css',
      hash: true,
      autoInject: true,
    });
  });
});

describe('linksStylesheet', () => {
  it('finds a <link> to the path in either quote style and attribute order', () => {
    expect(linksStylesheet('<link rel="stylesheet" href="/styles.css">', '/styles.css')).toBe(true);
    expect(linksStylesheet("<LINK href='/styles.css' rel='stylesheet' />", '/styles.css')).toBe(
      true,
    );
  });

  it('finds an unquoted href, and one with a query or a fragment', () => {
    expect(linksStylesheet('<link rel=stylesheet href=/styles.css>', '/styles.css')).toBe(true);
    expect(linksStylesheet('<link rel="stylesheet" href="/styles.css?v=2">', '/styles.css')).toBe(
      true,
    );
    expect(linksStylesheet('<link href="/styles.css#print" rel="stylesheet">', '/styles.css')).toBe(
      true,
    );
  });

  it("finds a link under the site's own origin, not another one", () => {
    const site = 'https://Example.com/';
    const linked = (href: string) =>
      linksStylesheet(`<link rel="stylesheet" href="${href}">`, '/styles.css', site);

    expect(linked('https://example.com/styles.css')).toBe(true);
    expect(linked('//example.com/styles.css')).toBe(true);
    expect(linked('https://cdn.example/styles.css')).toBe(false);
    expect(linked('https://example.com.evil/styles.css')).toBe(false);
    expect(
      linksStylesheet(
        '<link rel="stylesheet" href="https://example.com/styles.css">',
        '/styles.css',
      ),
    ).toBe(false);
  });

  it('ignores other paths, other tags and escaped markup', () => {
    expect(linksStylesheet('<link rel="stylesheet" href="/styles.css.map">', '/styles.css')).toBe(
      false,
    );
    expect(linksStylesheet('<a href="/styles.css">CSS</a>', '/styles.css')).toBe(false);
    expect(linksStylesheet('<link data-href="/styles.css">', '/styles.css')).toBe(false);
    expect(
      linksStylesheet('<code>&lt;link href=&quot;/styles.css&quot;&gt;</code>', '/styles.css'),
    ).toBe(false);
  });

  it('counts only links that apply the stylesheet', () => {
    const linked = (attributes: string) =>
      linksStylesheet(`<link ${attributes} href="/styles.css">`, '/styles.css');

    expect(linked('rel="preload" as="style"')).toBe(false);
    expect(linked('rel="alternate stylesheet" title="Dark"')).toBe(false);
    expect(linked('data-rel="stylesheet"')).toBe(false);
    expect(linked('')).toBe(false);
    expect(linked('rel="STYLESHEET"')).toBe(true);
    expect(linked("rel=' stylesheet  noopener '")).toBe(true);
  });
});

describe('autoInjectStylesheets', () => {
  const html = '<html><head><title>T</title></head><body></body></html>';

  it('adds the link before </head>', () => {
    expect(autoInjectStylesheets(html, ['/_assets/styles-[hash].css'])).toBe(
      '<html><head><title>T</title>    <link rel="stylesheet" href="/_assets/styles-[hash].css">\n</head><body></body></html>',
    );
  });

  it('leaves a page that links the path already, or has no </head>', () => {
    const linked = html.replace('</head>', '<link href="/styles.css" rel="stylesheet"></head>');
    expect(autoInjectStylesheets(linked, ['/styles.css'])).toBe(linked);
    const absolute = html.replace(
      '</head>',
      '<link href="https://example.com/styles.css" rel="stylesheet"></head>',
    );
    expect(autoInjectStylesheets(absolute, ['/styles.css'], 'https://example.com')).toBe(absolute);
    expect(autoInjectStylesheets('<p>fragment</p>', ['/styles.css'])).toBe('<p>fragment</p>');
    expect(autoInjectStylesheets(html, [])).toBe(html);
  });

  it('adds the link to a page that only preloads the path', () => {
    const preloaded = html.replace(
      '</head>',
      '<link rel="preload" href="/styles.css" as="style"></head>',
    );
    expect(autoInjectStylesheets(preloaded, ['/styles.css'])).toBe(
      preloaded.replace('</head>', '    <link rel="stylesheet" href="/styles.css">\n</head>'),
    );
  });
});

describe('stylesheet files', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'stati-stylesheet-'));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  describe('relinkStylesheet', () => {
    it('rewrites every mention of each earlier path in the pages that have one', async () => {
      const from = '/_assets/styles-0A1B2C3D.css';
      const linked = `<link rel="stylesheet" href="${from}"><link rel="preload" href="${from}">`;
      await writeFile(join(dir, 'a.html'), linked);
      await writeFile(join(dir, 'b.html'), '<p>no stylesheet</p>');
      await writeFile(
        join(dir, 'c.html'),
        '<link rel="stylesheet" href="/_assets/styles-DEADBEEF.css">',
      );

      const count = await relinkStylesheet(
        [join(dir, 'a.html'), join(dir, 'b.html'), join(dir, 'c.html'), join(dir, 'missing.html')],
        [from, '/_assets/styles-DEADBEEF.css'],
        '/_assets/styles-E77989ED.css',
      );

      expect(count).toBe(2);
      expect(await readFile(join(dir, 'a.html'), 'utf-8')).toBe(
        '<link rel="stylesheet" href="/_assets/styles-E77989ED.css"><link rel="preload" href="/_assets/styles-E77989ED.css">',
      );
      expect(await readFile(join(dir, 'b.html'), 'utf-8')).toBe('<p>no stylesheet</p>');
      expect(await readFile(join(dir, 'c.html'), 'utf-8')).toBe(
        '<link rel="stylesheet" href="/_assets/styles-E77989ED.css">',
      );
    });

    it('reads no page without an earlier path', async () => {
      await writeFile(join(dir, 'a.html'), 'href="/new.css"');

      expect(await relinkStylesheet([join(dir, 'a.html')], [], '/new.css')).toBe(0);
      expect(await relinkStylesheet([join(dir, 'a.html')], ['/new.css', ''], '/new.css')).toBe(0);
      expect(await readFile(join(dir, 'a.html'), 'utf-8')).toBe('href="/new.css"');
    });

    it('handles more pages than it reads at once', async () => {
      const files = await Promise.all(
        Array.from({ length: 70 }, async (_, i) => {
          const file = join(dir, `page-${i}.html`);
          await writeFile(file, 'href="/old.css"');
          return file;
        }),
      );

      expect(await relinkStylesheet(files, ['/old.css'], '/new.css')).toBe(70);
      expect(await readFile(files[69]!, 'utf-8')).toBe('href="/new.css"');
    });
  });

  describe('getStaleStylesheetPaths', () => {
    const current = '/_assets/styles-E77989ED.css';

    async function assets(...names: string[]): Promise<void> {
      await mkdir(join(dir, '_assets'), { recursive: true });
      for (const name of names) {
        await writeFile(join(dir, '_assets', name), '');
      }
    }

    it('lists the recorded name and every other hashed copy, never the current one', async () => {
      await assets('styles-DEADBEEF.css', 'styles-E77989ED.css', 'site-0A1B2C3D.css');

      const stale = await getStaleStylesheetPaths(
        plan(),
        dir,
        '/_assets/styles-0A1B2C3D.css',
        current,
      );

      expect(stale.sort()).toEqual([
        '/_assets/styles-0A1B2C3D.css',
        '/_assets/styles-DEADBEEF.css',
      ]);
    });

    it('ignores a recorded path that is not a hashed copy of this stylesheet', async () => {
      for (const recorded of ['', '/styles.css', '/_assets/site-0A1B2C3D.css', current]) {
        expect(await getStaleStylesheetPaths(plan(), dir, recorded, current)).toEqual([]);
      }
    });
  });

  describe('removeStaleStylesheets', () => {
    async function files(...paths: string[]): Promise<void> {
      for (const path of paths) {
        await mkdir(join(dir, path, '..'), { recursive: true });
        await writeFile(join(dir, path), '');
      }
    }

    it("deletes earlier hashed copies, never the current file or the dev server's output", async () => {
      await files(
        '_assets/styles-0A1B2C3D.css',
        '_assets/styles-DEADBEEF.css',
        '_assets/styles-E77989ED.css',
        'styles.css',
      );

      const removed = await removeStaleStylesheets(dir, 'styles', '/_assets/styles-E77989ED.css');

      expect(removed.sort()).toEqual([
        '_assets/styles-0A1B2C3D.css',
        '_assets/styles-DEADBEEF.css',
      ]);
      expect(await readdir(join(dir, '_assets'))).toEqual(['styles-E77989ED.css']);
      expect(await readdir(dir)).toContain('styles.css');
    });

    it('only touches files named after this stylesheet', async () => {
      await files(
        '_assets/main-0A1B2C3D.js',
        '_assets/site-0A1B2C3D.css',
        '_assets/styles-notes.css',
        '_assets/styles-0a1b2c3d.css',
        '_assets/styles-E77989ED.css',
      );
      await mkdir(join(dir, '_assets', 'styles-ABCDEF12.css'));

      expect(await removeStaleStylesheets(dir, 'styles', '/_assets/styles-E77989ED.css')).toEqual(
        [],
      );
      expect((await readdir(join(dir, '_assets'))).sort()).toEqual([
        'main-0A1B2C3D.js',
        'site-0A1B2C3D.css',
        'styles-0a1b2c3d.css',
        'styles-ABCDEF12.css',
        'styles-E77989ED.css',
        'styles-notes.css',
      ]);
    });

    it('keeps the output under its own name when the build does not hash', async () => {
      await files('_assets/styles-0A1B2C3D.css', 'styles.css');

      expect(await removeStaleStylesheets(dir, 'styles', '/styles.css')).toEqual([
        '_assets/styles-0A1B2C3D.css',
      ]);
      expect(await readdir(dir)).toContain('styles.css');
    });

    it('deletes every hashed copy of a stylesheet the build no longer builds', async () => {
      await files('_assets/styles-0A1B2C3D.css', '_assets/styles-DEADBEEF.css');

      expect((await removeStaleStylesheets(dir, 'styles')).sort()).toEqual([
        '_assets/styles-0A1B2C3D.css',
        '_assets/styles-DEADBEEF.css',
      ]);
    });

    it('is fine without an _assets folder', async () => {
      expect(await removeStaleStylesheets(dir, 'styles', '/styles.css')).toEqual([]);
    });
  });
});
