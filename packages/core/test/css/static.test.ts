/**
 * Tests for the hashed copies of the static directory's stylesheets.
 * @module css/static.test
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { StaticStylesheets } from '../../src/css/static.js';
import { hashStylesheet } from '../../src/css/stylesheet.js';

describe('StaticStylesheets', () => {
  let dir: string;
  let staticDir: string;
  let outDir: string;

  async function write(path: string, content: string): Promise<void> {
    await mkdir(join(path, '..'), { recursive: true });
    await writeFile(path, content);
  }

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'stati-static-css-'));
    staticDir = join(dir, 'public');
    outDir = join(dir, 'dist');
    await write(join(staticDir, 'styles.css'), 'body{background:url(img/bg.png)}');
    await write(join(staticDir, 'css', 'print.css'), '@import "base.css";');
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('writes a hashed copy with rebased references the first time a path is asked for', async () => {
    const stylesheets = new StaticStylesheets(staticDir, outDir);
    const expected = hashStylesheet('@import "base.css";', '/css/print.css');

    const path = await stylesheets.resolve('/css/print.css');

    expect(path).toBe(expected.path);
    expect(path).toMatch(/^\/_assets\/css\/print-[0-9A-F]{8}\.css$/);
    expect(await readFile(join(outDir, ...path!.split('/')), 'utf-8')).toBe(
      '@import "/css/base.css";',
    );
    expect(await stylesheets.resolve('/css/print.css')).toBe(path);
  });

  it('lists the stylesheets it hashed', async () => {
    const stylesheets = new StaticStylesheets(staticDir, outDir);
    await stylesheets.resolve('/styles.css');
    await stylesheets.resolve('/missing.css');

    expect([...(await stylesheets.hashed()).keys()]).toEqual(['/styles.css']);
  });

  it('skips paths that are not hashable .css files in the static directory', async () => {
    await mkdir(join(staticDir, 'folder.css'));
    await write(join(staticDir, 'notes.txt'), 'text');
    const stylesheets = new StaticStylesheets(staticDir, outDir, '/styles.css');

    for (const path of ['/missing.css', '/folder.css', '/notes.txt', '/styles.css', '/../x.css']) {
      expect(await stylesheets.resolve(path)).toBeUndefined();
    }
    expect((await stylesheets.hashed()).size).toBe(0);
  });

  it('rejects a stylesheet that references the path it skips, and writes no copy', async () => {
    await write(join(staticDir, 'css', 'print.css'), '@import url(../styles.css) print;');
    const stylesheets = new StaticStylesheets(staticDir, outDir, '/styles.css');

    await expect(stylesheets.resolve('/css/print.css')).rejects.toThrow(
      '/css/print.css in the static directory references /styles.css, the Tailwind CSS output.',
    );
    await expect(stylesheets.resolve('/css/print.css')).rejects.toThrow();
    expect(await readdir(outDir).catch(() => [])).toEqual([]);
  });
});
