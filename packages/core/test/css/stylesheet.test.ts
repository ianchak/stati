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
  getRenderStylesheetPath,
  getStylesheetFingerprint,
  linksStylesheet,
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
    expect(getRenderStylesheetPath(plan({ hash: false }), '/_assets/styles-0A1B2C3D.css')).toBe(
      '/styles.css',
    );
  });

  it('is the name the last build linked, while its file is still on disk', () => {
    expect(getRenderStylesheetPath(plan(), '/_assets/styles-0A1B2C3D.css')).toBe(
      '/_assets/styles-0A1B2C3D.css',
    );
  });

  it('is a placeholder without a previous hashed name of this stylesheet', () => {
    expect(getRenderStylesheetPath(plan(), undefined)).toBe('/_assets/styles-[hash].css');
    expect(getRenderStylesheetPath(plan(), '/styles.css')).toBe('/_assets/styles-[hash].css');
    expect(getRenderStylesheetPath(plan(), '/_assets/site-0A1B2C3D.css')).toBe(
      '/_assets/styles-[hash].css',
    );
    expect(getRenderStylesheetPath(plan(), '/_assets/styles-0a1b2c3d.css')).toBe(
      '/_assets/styles-[hash].css',
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

  it('ignores other paths, other tags and escaped markup', () => {
    expect(linksStylesheet('<link rel="stylesheet" href="/styles.css.map">', '/styles.css')).toBe(
      false,
    );
    expect(linksStylesheet('<a href="/styles.css">CSS</a>', '/styles.css')).toBe(false);
    expect(
      linksStylesheet('<code>&lt;link href=&quot;/styles.css&quot;&gt;</code>', '/styles.css'),
    ).toBe(false);
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
    expect(autoInjectStylesheets('<p>fragment</p>', ['/styles.css'])).toBe('<p>fragment</p>');
    expect(autoInjectStylesheets(html, [])).toBe(html);
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
    it('rewrites every mention of the path in the pages that have it', async () => {
      const from = '/_assets/styles-[hash].css';
      const linked = `<link rel="stylesheet" href="${from}"><link rel="preload" href="${from}">`;
      await writeFile(join(dir, 'a.html'), linked);
      await writeFile(join(dir, 'b.html'), '<p>no stylesheet</p>');

      const count = await relinkStylesheet(
        [join(dir, 'a.html'), join(dir, 'b.html'), join(dir, 'missing.html')],
        from,
        '/_assets/styles-0A1B2C3D.css',
      );

      expect(count).toBe(1);
      expect(await readFile(join(dir, 'a.html'), 'utf-8')).toBe(
        '<link rel="stylesheet" href="/_assets/styles-0A1B2C3D.css"><link rel="preload" href="/_assets/styles-0A1B2C3D.css">',
      );
      expect(await readFile(join(dir, 'b.html'), 'utf-8')).toBe('<p>no stylesheet</p>');
    });

    it('handles more pages than it reads at once', async () => {
      const files = await Promise.all(
        Array.from({ length: 70 }, async (_, i) => {
          const file = join(dir, `page-${i}.html`);
          await writeFile(file, 'href="/old.css"');
          return file;
        }),
      );

      expect(await relinkStylesheet(files, '/old.css', '/new.css')).toBe(70);
      expect(await readFile(files[69]!, 'utf-8')).toBe('href="/new.css"');
    });
  });

  describe('removeStaleStylesheets', () => {
    async function files(...paths: string[]): Promise<void> {
      for (const path of paths) {
        await mkdir(join(dir, path, '..'), { recursive: true });
        await writeFile(join(dir, path), '');
      }
    }

    /** The stylesheet of a build whose output directory is `dir` */
    function stalePlan(overrides: Partial<StylesheetPlan> = {}): StylesheetPlan {
      return {
        inputFile: join(dir, '..', 'src', 'styles.css'),
        outputFile: join(dir, 'styles.css'),
        path: '/styles.css',
        name: 'styles',
        hash: true,
        minify: true,
        autoInject: true,
        ...overrides,
      };
    }

    it("deletes earlier hashed copies, never the current file or the dev server's output", async () => {
      await files(
        '_assets/styles-0A1B2C3D.css',
        '_assets/styles-DEADBEEF.css',
        '_assets/styles-E77989ED.css',
        'styles.css',
      );
      const current = {
        path: '/_assets/styles-E77989ED.css',
        file: join(dir, '_assets', 'styles-E77989ED.css'),
        sizeInBytes: 0,
      };

      const removed = await removeStaleStylesheets(stalePlan(), dir, current);

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
      const current = {
        path: '/_assets/styles-E77989ED.css',
        file: join(dir, '_assets', 'styles-E77989ED.css'),
        sizeInBytes: 0,
      };

      expect(await removeStaleStylesheets(stalePlan(), dir, current)).toEqual([]);
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
      const current = { path: '/styles.css', file: join(dir, 'styles.css'), sizeInBytes: 0 };

      expect(await removeStaleStylesheets(stalePlan({ hash: false }), dir, current)).toEqual([
        '_assets/styles-0A1B2C3D.css',
      ]);
      expect(await readdir(dir)).toContain('styles.css');
    });

    it('is fine without an _assets folder', async () => {
      const current = { path: '/styles.css', file: join(dir, 'styles.css'), sizeInBytes: 0 };
      expect(await removeStaleStylesheets(stalePlan({ hash: false }), dir, current)).toEqual([]);
    });
  });
});
