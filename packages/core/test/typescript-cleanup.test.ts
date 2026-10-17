/**
 * Tests for deleting bundle files earlier builds left in the bundle output directory.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { join } from 'node:path';
import { mkdirSync, writeFileSync, rmSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { compileTypeScript, removeStaleBundleFiles } from '../src/core/utils/typescript.utils.js';
import { readdir } from '../src/core/utils/fs.utils.js';
import type { TypeScriptConfig } from '../src/types/config.js';
import type { Logger } from '../src/types/logging.js';

// The real fs helpers, with readdir replaceable per test
vi.mock('../src/core/utils/fs.utils.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/core/utils/fs.utils.js')>();
  return { ...actual, readdir: vi.fn(actual.readdir) };
});

describe('removeStaleBundleFiles', () => {
  let projectDir: string;
  let assetsDir: string;
  const logger = {
    info: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
  } as unknown as Logger;

  const compile = (config: TypeScriptConfig) =>
    compileTypeScript({
      projectRoot: projectDir,
      config,
      outDir: 'dist',
      mode: 'production',
      logger,
    });

  beforeEach(() => {
    projectDir = join(
      tmpdir(),
      `stati-ts-cleanup-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    assetsDir = join(projectDir, 'dist', '_assets');
    mkdirSync(join(projectDir, 'src'), { recursive: true });
    mkdirSync(assetsDir, { recursive: true });
    writeFileSync(join(projectDir, 'src', 'main.ts'), 'console.log("main");');
    writeFileSync(join(projectDir, 'src', 'extra.ts'), 'console.log("extra");');
  });

  afterEach(() => {
    rmSync(projectDir, { recursive: true, force: true });
  });

  it('leaves earlier files in place while compiling, for pages not yet rewritten', async () => {
    writeFileSync(join(assetsDir, 'main-ABCDEFGH.js'), 'stale');

    const compiled = await compile({
      enabled: true,
      bundles: [{ entryPoint: 'main.ts', bundleName: 'main' }],
    });

    expect(readdirSync(assetsDir).sort()).toEqual(
      [compiled[0]!.filename, 'main-ABCDEFGH.js'].sort(),
    );
  });

  it('keeps every bundle this build wrote, including names that extend another bundle', async () => {
    // Unhashed production names: main.js, and main-extra.js, which looks like a main- file
    for (const file of ['main.js.map', 'main-ABCDEFGH.js', 'main-extra.js.map']) {
      writeFileSync(join(assetsDir, file), 'stale');
    }
    const config: TypeScriptConfig = {
      enabled: true,
      hash: false,
      bundles: [
        { entryPoint: 'main.ts', bundleName: 'main' },
        { entryPoint: 'extra.ts', bundleName: 'main-extra' },
      ],
    };

    const compiled = await compile(config);
    await removeStaleBundleFiles({ projectRoot: projectDir, config, outDir: 'dist', compiled });

    expect(readdirSync(assetsDir).sort()).toEqual(['main-extra.js', 'main.js']);
  });

  it('does nothing when no bundle compiled', async () => {
    writeFileSync(join(assetsDir, 'main-ABCDEFGH.js'), 'stale');

    await removeStaleBundleFiles({
      projectRoot: projectDir,
      config: { enabled: true },
      outDir: 'dist',
      compiled: [],
    });

    expect(readdirSync(assetsDir)).toEqual(['main-ABCDEFGH.js']);
  });

  it('leaves files in place when the bundle directory cannot be listed', async () => {
    writeFileSync(join(assetsDir, 'main-ABCDEFGH.js'), 'stale');
    const config: TypeScriptConfig = {
      enabled: true,
      bundles: [{ entryPoint: 'main.ts', bundleName: 'main' }],
    };
    const compiled = await compile(config);
    vi.mocked(readdir).mockRejectedValueOnce(new Error('EPERM: operation not permitted'));

    await removeStaleBundleFiles({ projectRoot: projectDir, config, outDir: 'dist', compiled });

    // The stale file stays for the next build to delete
    expect(readdir).toHaveBeenCalledWith(assetsDir, { withFileTypes: true });
    expect(readdirSync(assetsDir).sort()).toEqual(
      [compiled[0]!.filename, 'main-ABCDEFGH.js'].sort(),
    );
  });
});
