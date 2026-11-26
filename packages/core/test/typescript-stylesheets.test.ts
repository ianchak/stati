/**
 * Tests for the stylesheets esbuild writes for CSS that TypeScript bundles import: what
 * compiling, detecting and watching a bundle report about them.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { join } from 'node:path';
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import * as esbuild from 'esbuild';
import type { BuildContext } from 'esbuild';
import {
  compileTypeScript,
  createTypeScriptWatcher,
  detectExistingBundles,
  type TypeScriptRebuild,
} from '../src/core/utils/typescript.utils.js';
import { remove } from '../src/core/utils/fs.utils.js';
import type { TypeScriptConfig } from '../src/types/config.js';
import type { Logger } from '../src/types/logging.js';

// The real fs helpers, with remove replaceable per test
vi.mock('../src/core/utils/fs.utils.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/core/utils/fs.utils.js')>();
  return { ...actual, remove: vi.fn(actual.remove) };
});

// The real esbuild, with build replaceable per test
vi.mock('esbuild', async (importOriginal) => {
  const actual = await importOriginal<typeof import('esbuild')>();
  return { ...actual, build: vi.fn(actual.build) };
});

describe('bundle stylesheets', () => {
  let projectDir: string;
  let assetsDir: string;
  let contexts: BuildContext[];
  let logger: Logger;

  const config: TypeScriptConfig = {
    enabled: true,
    bundles: [
      { entryPoint: 'main.ts', bundleName: 'main' },
      { entryPoint: 'blog.ts', bundleName: 'blog', include: ['/blog/**'] },
    ],
  };

  const write = (file: string, content: string) =>
    writeFileSync(join(projectDir, 'src', file), content);

  beforeEach(() => {
    projectDir = join(
      tmpdir(),
      `stati-ts-css-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    assetsDir = join(projectDir, 'dist', '_assets');
    mkdirSync(join(projectDir, 'src'), { recursive: true });
    write('main.ts', 'console.log("main");');
    write('blog.ts', "import './blog.css';\nconsole.log('blog');");
    write('blog.css', 'body { color: red; }');
    contexts = [];
    logger = {
      info: vi.fn(),
      success: vi.fn(),
      warning: vi.fn(),
      error: vi.fn(),
      file: vi.fn(),
    } as unknown as Logger;
  });

  afterEach(async () => {
    await Promise.all(contexts.map((context) => context.dispose()));
    rmSync(projectDir, { recursive: true, force: true });
  });

  describe('compileTypeScript', () => {
    it("reports the hashed stylesheet of a bundle's CSS in production, and none without CSS", async () => {
      const [main, blog] = await compileTypeScript({
        projectRoot: projectDir,
        config,
        outDir: 'dist',
        mode: 'production',
        logger,
      });

      expect(main!.stylesheetPath).toBeUndefined();
      expect(blog!.stylesheetPath).toMatch(/^\/_assets\/blog-[A-Z0-9]{8}\.css$/);
      const file = join(projectDir, 'dist', blog!.stylesheetPath!);
      expect(readFileSync(file, 'utf-8')).toContain('color:');
      expect(logger.file).toHaveBeenCalledWith('compiled', blog!.stylesheetPath!.slice(9));
    });

    it('gives the stylesheet a new name when only the CSS changes', async () => {
      const compile = () =>
        compileTypeScript({
          projectRoot: projectDir,
          config,
          outDir: 'dist',
          mode: 'production',
          logger,
        });
      const [, before] = await compile();
      write('blog.css', 'body { color: blue; }');
      const [, after] = await compile();

      // esbuild keeps the script's name, so the stylesheet's is what changes the pages
      expect(after!.path).toBe(before!.path);
      expect(after!.stylesheetPath).not.toBe(before!.stylesheetPath);
    });

    it('falls back to the bundle name without a metafile, with no size or stylesheet', async () => {
      vi.mocked(esbuild.build).mockResolvedValueOnce({
        errors: [],
        warnings: [],
        outputFiles: undefined,
        metafile: undefined,
        mangleCache: undefined,
      });

      const [main] = await compileTypeScript({
        projectRoot: projectDir,
        config: { enabled: true, bundles: [{ entryPoint: 'main.ts', bundleName: 'main' }] },
        outDir: 'dist',
        mode: 'production',
        logger,
      });

      expect(main).toEqual({
        config: { entryPoint: 'main.ts', bundleName: 'main' },
        filename: 'main.js',
        path: '/_assets/main.js',
      });
    });

    it('uses the stable name in development', async () => {
      const [, blog] = await compileTypeScript({
        projectRoot: projectDir,
        config,
        outDir: 'dist',
        mode: 'development',
        logger,
      });

      expect(blog!.stylesheetPath).toBe('/_assets/blog.css');
      expect(existsSync(join(assetsDir, 'blog.css'))).toBe(true);
    });
  });

  describe('detectExistingBundles', () => {
    it("finds a bundle's stylesheet in development by its stable name", async () => {
      mkdirSync(assetsDir, { recursive: true });
      for (const file of ['main.js', 'blog.js', 'blog.css']) {
        writeFileSync(join(assetsDir, file), '');
      }

      const bundles = await detectExistingBundles({
        projectRoot: projectDir,
        config,
        outDir: 'dist',
        mode: 'development',
      });

      expect(bundles.map((bundle) => bundle.stylesheetPath)).toEqual([
        undefined,
        '/_assets/blog.css',
      ]);
    });

    it('leaves the stylesheet to compiling in production', async () => {
      mkdirSync(assetsDir, { recursive: true });
      for (const file of ['blog-ABCDEFGH.js', 'blog.css', 'blog-ABCDEFGH.css']) {
        writeFileSync(join(assetsDir, file), '');
      }

      const bundles = await detectExistingBundles({
        projectRoot: projectDir,
        config,
        outDir: 'dist',
        mode: 'production',
      });

      expect(bundles).toHaveLength(1);
      expect(bundles[0]!.stylesheetPath).toBeUndefined();
    });
  });

  describe('createTypeScriptWatcher', () => {
    async function watch(onRebuild: (...args: unknown[]) => void) {
      contexts = await createTypeScriptWatcher({
        projectRoot: projectDir,
        config: { enabled: true, bundles: [{ entryPoint: 'blog.ts', bundleName: 'blog' }] },
        outDir: 'dist',
        logger,
        onRebuild,
        awaitInitialBuild: true,
      });
    }

    it('says when a bundle starts or stops importing CSS, and deletes the stylesheet it stopped using', async () => {
      write('blog.ts', 'console.log("no css");');
      // Left by an earlier session in which the bundle imported CSS
      mkdirSync(assetsDir, { recursive: true });
      writeFileSync(join(assetsDir, 'blog.css'), 'stale');
      writeFileSync(join(assetsDir, 'blog.css.map'), 'stale');
      const onRebuild = vi.fn();
      await watch(onRebuild);

      // The initial build removes it, so the first page render doesn't link it
      expect(existsSync(join(assetsDir, 'blog.css'))).toBe(false);
      expect(existsSync(join(assetsDir, 'blog.css.map'))).toBe(false);

      write('blog.ts', "import './blog.css';\nconsole.log('css');");
      await vi.waitFor(() => expect(onRebuild).toHaveBeenCalledTimes(1), { timeout: 5000 });
      const added = onRebuild.mock.calls[0]![2] as TypeScriptRebuild;
      expect(added.stylesheetChanged).toBe(true);
      expect(added.bundle.stylesheetPath).toBe('/_assets/blog.css');
      expect(added.entryPath).toBe(join(projectDir, 'src', 'blog.ts'));

      write('blog.css', 'body { color: blue; }');
      await vi.waitFor(() => expect(onRebuild).toHaveBeenCalledTimes(2), { timeout: 5000 });
      // Same stable name: pages only reload
      expect((onRebuild.mock.calls[1]![2] as TypeScriptRebuild).stylesheetChanged).toBe(false);

      write('blog.ts', 'console.log("no css again");');
      await vi.waitFor(() => expect(onRebuild).toHaveBeenCalledTimes(3), { timeout: 5000 });
      const removed = onRebuild.mock.calls[2]![2] as TypeScriptRebuild;
      expect(removed.stylesheetChanged).toBe(true);
      expect(removed.bundle.stylesheetPath).toBeUndefined();
      expect(existsSync(join(assetsDir, 'blog.css'))).toBe(false);
    });

    it('treats the first successful build after a failed start as a change', async () => {
      write('blog.ts', 'const broken: number = {;');
      const onRebuild = vi.fn();
      await watch(onRebuild);

      write('blog.ts', "import './blog.css';\nconsole.log('fixed');");
      await vi.waitFor(() => expect(onRebuild).toHaveBeenCalledTimes(1), { timeout: 5000 });

      expect((onRebuild.mock.calls[0]![2] as TypeScriptRebuild).stylesheetChanged).toBe(true);
    });

    it('warns when the stylesheet it stopped using cannot be deleted', async () => {
      write('blog.ts', 'console.log("no css");');
      vi.mocked(remove).mockRejectedValueOnce(new Error('EBUSY: resource busy'));

      await watch(vi.fn());

      expect(logger.warning).toHaveBeenCalledWith(
        expect.stringContaining('which pages go on linking: EBUSY: resource busy'),
      );
    });
  });
});
