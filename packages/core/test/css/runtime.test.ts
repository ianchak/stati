/**
 * Tests for the per-build stylesheet runtime: the path pages render with, their links, the
 * pages a production build holds until Tailwind has run, the relinking of cached pages and the
 * hashed copies earlier builds left behind. A stand-in CLI replaces Tailwind.
 * @module css/runtime.test
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { StylesheetRuntime, writeDeferredPages, STAGED_PAGES_DIR } from '../../src/css/runtime.js';
import { hashStylesheet } from '../../src/css/stylesheet.js';
import { createMetricRecorder } from '../../src/metrics/index.js';
import type { CacheManifest, Logger, PageModel, StatiConfig } from '../../src/types/index.js';

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

/** Copies the input to the output, and fails like Tailwind on an input holding FAIL */
const FAKE_CLI = `const fs = require('node:fs');
const path = require('node:path');
const args = process.argv.slice(2);
const input = fs.readFileSync(args[args.indexOf('-i') + 1], 'utf8');
if (input.includes('FAIL')) {
  process.stderr.write('Error: Cannot apply unknown utility class "nope"\\n');
  process.exit(1);
}
const output = args[args.indexOf('-o') + 1];
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, input);
`;

const tailwind = { input: 'src/styles.css', output: 'dist/styles.css' };

function page(url: string): PageModel {
  return { slug: url, url, sourcePath: `/site${url}.md`, frontMatter: {}, content: '' };
}

describe('StylesheetRuntime', () => {
  let dir: string;
  let outDir: string;
  let cacheDir: string;
  let logger: Logger;

  async function write(path: string, content: string): Promise<void> {
    const file = join(dir, path);
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, content);
  }

  async function read(path: string): Promise<string> {
    return readFile(join(dir, path), 'utf-8');
  }

  async function installTailwind(): Promise<void> {
    await write(
      'node_modules/@tailwindcss/cli/package.json',
      JSON.stringify({ name: '@tailwindcss/cli', bin: { tailwindcss: './cli.cjs' } }),
    );
    await write('node_modules/@tailwindcss/cli/cli.cjs', FAKE_CLI);
    await write('src/styles.css', 'body{color:black}');
  }

  function configWith(overrides: Partial<StatiConfig> = {}): StatiConfig {
    return {
      staticDir: 'public',
      site: { title: 'Test', baseUrl: 'https://example.com' },
      ...overrides,
    };
  }

  function create(
    options: { development?: boolean; withTailwind?: boolean; config?: Partial<StatiConfig> } = {},
    recorder = createMetricRecorder({ enabled: true }),
  ): Promise<StylesheetRuntime> {
    return StylesheetRuntime.create(configWith(options.config), {
      tailwind: options.withTailwind ? tailwind : undefined,
      outDir,
      cacheDir,
      logger,
      recorder,
      development: options.development ?? false,
      projectRoot: dir,
    });
  }

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'stati-css-runtime-'));
    outDir = join(dir, 'dist');
    cacheDir = join(dir, '.stati');
    vi.spyOn(process, 'cwd').mockReturnValue(dir);
    logger = {
      info: vi.fn(),
      success: vi.fn(),
      warning: vi.fn(),
      error: vi.fn(),
      status: vi.fn(),
      building: vi.fn(),
      processing: vi.fn(),
      stats: vi.fn(),
      file: vi.fn(),
    };
  });

  afterEach(async () => {
    limits.deferredPagesLength = undefined;
    vi.restoreAllMocks();
    await rm(dir, { recursive: true, force: true });
  });

  describe('development', () => {
    it('links nothing and leaves the recorded stylesheets alone without Tailwind', async () => {
      const runtime = await create({ development: true });
      const html = '<html><head><link rel="stylesheet" href="/styles.css"></head></html>';
      const manifest: CacheManifest = { entries: {}, stylesheets: { '/a.css': '/a.css' } };

      expect(runtime.plan).toBeNull();
      expect(runtime.renderPath).toBeUndefined();
      expect(runtime.holdsPages).toBe(false);
      expect(runtime.fingerprint()).toEqual({});
      expect(runtime.stylesheetPaths()).toEqual([]);
      expect(await runtime.linkPage(html, '/', [])).toBe(html);

      await runtime.finalize(manifest, [page('/')], []);
      expect(manifest.stylesheets).toEqual({ '/a.css': '/a.css' });
    });

    it('links the Tailwind output under its own name without checking or running Tailwind', async () => {
      const runtime = await create({ development: true, withTailwind: true });
      const manifest: CacheManifest = { entries: {} };

      expect(runtime.renderPath).toBe('/styles.css');
      expect(runtime.holdsPages).toBe(false);
      expect(runtime.fingerprint()).toEqual({
        stylesheet: { path: '/styles.css', hash: false, autoInject: true },
      });
      const paths = runtime.stylesheetPaths();
      expect(paths).toEqual(['/styles.css']);
      // A page that changes its paths changes only its own
      expect(runtime.stylesheetPaths()).not.toBe(paths);
      expect(await runtime.linkPage('<head></head>', '/', paths)).toContain(
        '<link rel="stylesheet" href="/styles.css">',
      );

      await runtime.finalize(manifest, [page('/')], []);
      expect(manifest).toEqual({ entries: {} });
      expect(logger.info).not.toHaveBeenCalledWith('Building CSS with Tailwind CSS...');
    });

    it('adds no link with css.autoInject false', async () => {
      const runtime = await create({
        development: true,
        withTailwind: true,
        config: { css: { autoInject: false } },
      });

      expect(await runtime.linkPage('<head></head>', '/', ['/styles.css'])).toBe('<head></head>');
    });
  });

  describe('production', () => {
    it('checks the Tailwind input and CLI before any page renders', async () => {
      await expect(create({ withTailwind: true })).rejects.toThrow(
        'Tailwind CSS input not found: src/styles.css',
      );

      await write('src/styles.css', 'body{}');
      await expect(create({ withTailwind: true })).rejects.toThrow('Tailwind CSS is not installed');
    });

    it('deletes the pages a build that stopped left in the cache directory', async () => {
      await installTailwind();
      await write(`.stati/${STAGED_PAGES_DIR}/0.html`, '<p>stale</p>');

      const runtime = await create({ withTailwind: true });

      expect(existsSync(join(cacheDir, STAGED_PAGES_DIR))).toBe(false);
      expect(runtime.holdsPages).toBe(true);
      expect(runtime.renderPath).toMatch(/^\/_assets\/styles-pending-[0-9a-f]{16}\.css$/);
      expect(runtime.fingerprint()).toEqual({
        stylesheet: { path: '/styles.css', hash: true, autoInject: true },
        hashedStylesheets: true,
      });
    });

    it('points links to static stylesheets at hashed copies and records every linked path', async () => {
      await write('public/styles.css', 'body{}');
      const copy = hashStylesheet('body{}', '/styles.css').path;
      const runtime = await create();
      const html =
        '<head><link rel="stylesheet" href="/styles.css"><link rel="stylesheet" href="/later.css"><link rel="stylesheet" href="/theme"></head>';
      const manifest: CacheManifest = { entries: {} };

      expect(runtime.fingerprint()).toEqual({ hashedStylesheets: true });
      expect(await runtime.linkPage(html, '/', [])).toBe(
        `<head><link rel="stylesheet" href="${copy}"><link rel="stylesheet" href="/later.css"><link rel="stylesheet" href="/theme"></head>`,
      );
      // A page that links the copy already needs no copy of its own
      expect(await runtime.linkPage(`<link rel="stylesheet" href="${copy}">`, '/', [])).toBe(
        `<link rel="stylesheet" href="${copy}">`,
      );

      await runtime.finalize(manifest, [page('/')], [join(outDir, 'index.html')]);
      expect(manifest.stylesheets).toEqual({ '/styles.css': copy, '/later.css': '/later.css' });
      expect(logger.info).toHaveBeenCalledWith(`Linked /styles.css as ${copy}`);
      expect(logger.info).not.toHaveBeenCalledWith('Linked /later.css as /later.css');
    });

    it('relinks cached pages to the names this build gives and deletes the earlier copies', async () => {
      await write('public/styles.css', 'body{color:red}');
      await write('public/late.css', 'p{}');
      const copy = hashStylesheet('body{color:red}', '/styles.css').path;
      const lateCopy = hashStylesheet('p{}', '/late.css').path;
      await write('dist/_assets/styles-0000AAAA.css', 'body{}');
      await write(
        'dist/about.html',
        '<head><link rel="stylesheet" href="/_assets/styles-0000AAAA.css"><link rel="stylesheet" href="/late.css"></head>',
      );
      const manifest: CacheManifest = {
        entries: {},
        stylesheets: { '/styles.css': '/_assets/styles-0000AAAA.css', '/late.css': '/late.css' },
      };
      const runtime = await create();

      await runtime.finalize(manifest, [page('/about')], []);

      expect(await read('dist/about.html')).toBe(
        `<head><link rel="stylesheet" href="${copy}"><link rel="stylesheet" href="${lateCopy}"></head>`,
      );
      expect(logger.info).toHaveBeenCalledWith('Updated the stylesheet links of 1 cached page');
      expect(manifest.stylesheets).toEqual({ '/styles.css': copy, '/late.css': lateCopy });

      await runtime.removeStale(manifest);
      expect((await readdir(join(outDir, '_assets'))).sort()).toEqual(
        [copy, lateCopy].map((path) => path.slice('/_assets/'.length)).sort(),
      );
    });

    it('counts the cached pages it relinks', async () => {
      await write('public/styles.css', 'body{}');
      const copy = hashStylesheet('body{}', '/styles.css').path;
      const linked = '<link rel="stylesheet" href="/_assets/styles-0000AAAA.css">';
      await write('dist/_assets/styles-0000AAAA.css', 'old');
      await write('dist/a.html', linked);
      await write('dist/b.html', linked);
      const manifest: CacheManifest = {
        entries: {},
        stylesheets: { '/styles.css': '/_assets/styles-0000AAAA.css' },
      };
      const runtime = await create();

      await runtime.finalize(manifest, [page('/a'), page('/b')], []);

      expect(logger.info).toHaveBeenCalledWith('Updated the stylesheet links of 2 cached pages');
      expect(await read('dist/b.html')).toBe(`<link rel="stylesheet" href="${copy}">`);
    });

    it('gives a stylesheet gone from the static directory its own path back', async () => {
      await write('dist/_assets/gone-0000AAAA.css', 'old');
      await write('dist/about.html', '<link rel="stylesheet" href="/_assets/gone-0000AAAA.css">');
      const manifest: CacheManifest = {
        entries: {},
        stylesheets: { '/gone.css': '/_assets/gone-0000AAAA.css' },
      };
      const runtime = await create();

      await runtime.finalize(manifest, [page('/about')], []);

      expect(await read('dist/about.html')).toBe('<link rel="stylesheet" href="/gone.css">');
      expect(manifest.stylesheets).toEqual({ '/gone.css': '/gone.css' });
    });

    it('records no stylesheets when pages link none', async () => {
      const manifest: CacheManifest = { entries: {}, stylesheets: { '/a.css': '/a.css' } };
      const runtime = await create();

      // Every page rendered again, so the earlier paths are not looked up
      await runtime.finalize(manifest, [page('/')], [join(outDir, 'index.html')]);

      expect(manifest.stylesheets).toBeUndefined();
    });

    it('drops the recorded stylesheets and deletes their copies with css.hash false', async () => {
      await write('dist/_assets/styles-0000AAAA.css', 'old');
      const manifest: CacheManifest = {
        entries: {},
        stylesheets: { '/styles.css': '/_assets/styles-0000AAAA.css' },
      };
      const runtime = await create({ config: { css: { hash: false } } });
      const html = '<link rel="stylesheet" href="/styles.css">';

      expect(runtime.fingerprint()).toEqual({});
      expect(await runtime.linkPage(html, '/', [])).toBe(html);
      await runtime.finalize(manifest, [page('/')], []);
      expect(manifest.stylesheets).toBeUndefined();

      await runtime.removeStale(manifest);
      expect(await readdir(join(outDir, '_assets'))).toEqual([]);
    });

    it('stops on a link to the Tailwind output with an integrity digest', async () => {
      await installTailwind();
      const runtime = await create({ withTailwind: true });

      await expect(
        runtime.linkPage(
          '<link rel="stylesheet" href="/styles.css" integrity="sha384-abc">',
          '/docs/',
          [],
        ),
      ).rejects.toThrow(
        'The page /docs/ links /styles.css with an integrity attribute. A hashed build writes the Tailwind stylesheet only as /_assets/styles-[hash].css',
      );
    });

    it('points an added link to a static stylesheet at its copy', async () => {
      await installTailwind();
      await write('public/extra.css', 'p{}');
      const copy = hashStylesheet('p{}', '/extra.css').path;
      const runtime = await create({ withTailwind: true });
      const paths = [...runtime.stylesheetPaths(), '/extra.css'];

      const html = await runtime.linkPage(
        '<head><link rel="stylesheet" href="/styles.css"></head>',
        '/',
        paths,
      );

      expect([...html.matchAll(/href="([^"]+)"/g)].map((match) => match[1])).toEqual([
        runtime.renderPath,
        copy,
      ]);
    });

    it('holds pages until Tailwind has built the stylesheet, past the memory limit in the cache directory', async () => {
      await installTailwind();
      limits.deferredPagesLength = 120;
      const recorder = createMetricRecorder({ enabled: true });
      const runtime = await create({ withTailwind: true }, recorder);
      const renderPath = runtime.renderPath!;
      const html = (title: string) =>
        `<head><link rel="stylesheet" href="${renderPath}"></head><h1>${title}</h1>`;

      await runtime.hold(join(outDir, 'index.html'), html('Home'));
      await runtime.hold(join(outDir, 'docs', 'index.html'), html('Docs'));

      expect(existsSync(outDir)).toBe(false);
      expect(await readdir(join(cacheDir, STAGED_PAGES_DIR))).toEqual(['1.html']);

      const manifest: CacheManifest = { entries: {} };
      await runtime.finalize(
        manifest,
        [page('/'), page('/docs/')],
        [join(outDir, 'index.html'), join(outDir, 'docs', 'index.html')],
      );

      const name = hashStylesheet('body{color:black}', '/styles.css').path;
      expect(await read('dist/index.html')).toBe(
        `<head><link rel="stylesheet" href="${name}"></head><h1>Home</h1>`,
      );
      expect(await read('dist/docs/index.html')).toBe(
        `<head><link rel="stylesheet" href="${name}"></head><h1>Docs</h1>`,
      );
      expect(existsSync(join(cacheDir, STAGED_PAGES_DIR))).toBe(false);
      expect(manifest.stylesheets).toEqual({ '/styles.css': name });
      expect(logger.file).toHaveBeenCalledWith('compiled', name.slice(1), expect.any(Number));
      expect(logger.success).toHaveBeenCalledWith(expect.stringMatching(`^Built ${name} \\(`));
      const { phases } = recorder.finalize();
      expect(phases.tailwindBuildMs).toBeGreaterThanOrEqual(0);
      expect(phases.fileWriteTotalMs).toBeGreaterThanOrEqual(0);
    });

    it('writes no page and clears the cache directory when Tailwind fails', async () => {
      await installTailwind();
      await write('src/styles.css', 'FAIL');
      limits.deferredPagesLength = 0;
      const runtime = await create({ withTailwind: true });

      await runtime.hold(join(outDir, 'index.html'), '<p>new</p>');
      await expect(runtime.finalize({ entries: {} }, [page('/')], [])).rejects.toThrow(
        'Tailwind CSS exited with code 1',
      );

      expect(existsSync(join(outDir, 'index.html'))).toBe(false);
      expect(existsSync(join(cacheDir, STAGED_PAGES_DIR))).toBe(false);
    });

    it('writes the stylesheet under its own name with css.hash false', async () => {
      await installTailwind();
      const runtime = await create({ withTailwind: true, config: { css: { hash: false } } });
      delete (logger as Partial<Logger>).file;

      await runtime.hold(join(outDir, 'index.html'), '<link rel="stylesheet" href="/styles.css">');
      const manifest: CacheManifest = { entries: {} };
      await runtime.finalize(manifest, [page('/')], [join(outDir, 'index.html')]);

      expect(await read('dist/styles.css')).toBe('body{color:black}');
      expect(await read('dist/index.html')).toBe('<link rel="stylesheet" href="/styles.css">');
      expect(manifest.stylesheets).toBeUndefined();
    });
  });
});

describe('writeDeferredPages', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'stati-deferred-pages-'));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('writes the pages as they are when the stylesheet path stays the same', async () => {
    await writeDeferredPages(
      [{ outputPath: join(dir, 'a', 'index.html'), content: '/styles.css' }],
      '/styles.css',
      '/styles.css',
    );

    expect(await readFile(join(dir, 'a', 'index.html'), 'utf-8')).toBe('/styles.css');
  });

  it('fails when a staged page is gone from the cache directory', async () => {
    const outputPath = join(dir, 'index.html');

    await expect(
      writeDeferredPages([{ outputPath, stagedFile: join(dir, 'missing.html') }], '/a', '/b'),
    ).rejects.toThrow(`A rendered page is missing from the cache directory: ${outputPath}`);
  });
});
