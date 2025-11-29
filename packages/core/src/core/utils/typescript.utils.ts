/**
 * TypeScript compilation utilities using esbuild.
 * Provides functions for compiling TypeScript files and watching for changes.
 * @module core/utils/typescript
 */

import * as esbuild from 'esbuild';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { pathExists } from './fs.utils.js';
import type { TypeScriptConfig } from '../../types/config.js';
import type { Logger } from '../../types/logging.js';
import {
  DEFAULT_TS_SRC_DIR,
  DEFAULT_TS_OUT_DIR,
  DEFAULT_TS_ENTRY_POINT,
  DEFAULT_TS_BUNDLE_NAME,
} from '../../constants.js';

/**
 * Options for TypeScript compilation.
 */
export interface CompileOptions {
  /** Root directory of the project */
  projectRoot: string;
  /** TypeScript configuration */
  config: TypeScriptConfig;
  /** Output directory (defaults to 'dist') */
  outDir?: string;
  /** Compilation mode */
  mode: 'development' | 'production';
  /** Logger instance for output */
  logger: Logger;
}

/**
 * Result of TypeScript compilation.
 */
export interface CompileResult {
  /** The generated bundle filename (e.g., 'bundle-a1b2c3d4.js'), or undefined if compilation was skipped */
  bundleFilename?: string;
}

/**
 * Options for TypeScript file watcher.
 */
export interface WatchOptions extends CompileOptions {
  /** Callback invoked when files are recompiled */
  onRebuild: () => void;
}

/**
 * Resolves TypeScript config with defaults based on mode.
 * @internal
 */
/**
 * Resolved TypeScript config with all defaults applied.
 */
interface ResolvedTypeScriptConfig extends Required<TypeScriptConfig> {
  sourceMaps: boolean;
}

function resolveConfig(
  config: TypeScriptConfig,
  mode: 'development' | 'production',
): ResolvedTypeScriptConfig {
  return {
    enabled: config.enabled,
    srcDir: config.srcDir ?? DEFAULT_TS_SRC_DIR,
    outDir: config.outDir ?? DEFAULT_TS_OUT_DIR,
    entryPoint: config.entryPoint ?? DEFAULT_TS_ENTRY_POINT,
    bundleName: config.bundleName ?? DEFAULT_TS_BUNDLE_NAME,
    hash: config.hash ?? mode === 'production', // No hash in dev for stable filenames
    minify: config.minify ?? mode === 'production',
    // Source maps: always enabled in dev for debugging, always disabled in prod for security/size
    sourceMaps: mode === 'development',
  };
}

/**
 * Compile TypeScript files using esbuild.
 * Returns the generated bundle filename for template injection.
 *
 * @param options - Compilation options
 * @returns The compilation result with bundle filename
 *
 * @example
 * ```typescript
 * const result = await compileTypeScript({
 *   projectRoot: process.cwd(),
 *   config: { enabled: true },
 *   mode: 'production',
 *   logger: console,
 * });
 * console.log(result.bundleFilename); // 'bundle-a1b2c3d4.js'
 * ```
 */
export async function compileTypeScript(options: CompileOptions): Promise<CompileResult> {
  const { projectRoot, config, mode, logger, outDir: globalOutDir } = options;
  const resolved = resolveConfig(config, mode);

  const entryPath = path.join(projectRoot, resolved.srcDir, resolved.entryPoint);
  // Output to configured build output directory (default: dist)
  const outDir = path.join(projectRoot, globalOutDir || 'dist', resolved.outDir);

  // Validate entry point exists
  if (!(await pathExists(entryPath))) {
    logger.warning(`TypeScript entry point not found: ${entryPath}`);
    logger.warning('Skipping TypeScript compilation.');
    return {};
  }

  logger.info('Compiling TypeScript...');

  try {
    const result = await esbuild.build({
      entryPoints: [entryPath],
      bundle: true,
      outdir: outDir,
      entryNames: resolved.hash ? `${resolved.bundleName}-[hash]` : resolved.bundleName,
      minify: resolved.minify,
      sourcemap: resolved.sourceMaps,
      target: 'es2022',
      format: 'esm',
      platform: 'browser',
      logLevel: 'silent',
      metafile: true,
    });

    // Extract the generated filename for template injection
    const outputs = Object.keys(result.metafile?.outputs ?? {});
    const bundleFile = outputs.find((f) => f.endsWith('.js'));
    const bundleFilename = bundleFile ? path.basename(bundleFile) : `${resolved.bundleName}.js`;

    logger.success(`TypeScript compiled: ${bundleFilename}`);

    return { bundleFilename };
  } catch (error) {
    if (error instanceof Error) {
      logger.error(`TypeScript compilation failed: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Create an esbuild watch context for development.
 * Watches for TypeScript file changes and recompiles automatically.
 *
 * @param options - Watch options including rebuild callback
 * @returns The esbuild build context for cleanup
 *
 * @example
 * ```typescript
 * const watcher = await createTypeScriptWatcher({
 *   projectRoot: process.cwd(),
 *   config: { enabled: true },
 *   mode: 'development',
 *   logger: console,
 *   onRebuild: () => console.log('Rebuilt!'),
 * });
 *
 * // Later, cleanup:
 * await watcher.dispose();
 * ```
 */
export async function createTypeScriptWatcher(
  options: WatchOptions,
): Promise<esbuild.BuildContext> {
  const { projectRoot, config, mode, logger, onRebuild, outDir: globalOutDir } = options;
  const resolved = resolveConfig(config, mode);

  const entryPath = path.join(projectRoot, resolved.srcDir, resolved.entryPoint);
  // Output to configured build output directory (default: dist)
  const outDir = path.join(projectRoot, globalOutDir || 'dist', resolved.outDir);

  // Validate entry point exists
  if (!(await pathExists(entryPath))) {
    logger.warning(`TypeScript entry point not found: ${entryPath}`);
    throw new Error(`Entry point not found: ${entryPath}`);
  }

  const context = await esbuild.context({
    entryPoints: [entryPath],
    bundle: true,
    outdir: outDir,
    entryNames: resolved.bundleName, // Stable filename in dev mode (no hash)
    minify: resolved.minify,
    sourcemap: resolved.sourceMaps,
    target: 'es2022',
    format: 'esm',
    platform: 'browser',
    logLevel: 'silent',
    plugins: [
      {
        name: 'stati-rebuild-notify',
        setup(build) {
          build.onEnd((result) => {
            if (result.errors.length > 0) {
              result.errors.forEach((err) => {
                logger.error(`TypeScript error: ${err.text}`);
              });
            } else {
              logger.info('TypeScript recompiled.');
              onRebuild();
            }
          });
        },
      },
    ],
  });

  // Start watching
  await context.watch();
  logger.info(`Watching TypeScript files in ${resolved.srcDir}/`);

  return context;
}

/**
 * Compile stati.config.ts to a temporary JS file for import.
 * Returns the path to the compiled file.
 *
 * @param configPath - Path to the TypeScript config file
 * @returns Path to the compiled JavaScript module
 *
 * @example
 * ```typescript
 * const compiledPath = await compileStatiConfig('/path/to/stati.config.ts');
 * const config = await import(compiledPath);
 * await cleanupCompiledConfig(compiledPath);
 * ```
 */
export async function compileStatiConfig(configPath: string): Promise<string> {
  const outfile = configPath.replace(/\.ts$/, '.compiled.mjs');

  await esbuild.build({
    entryPoints: [configPath],
    bundle: true,
    outfile,
    format: 'esm',
    platform: 'node',
    target: 'node22',
    logLevel: 'silent',
    // Mark @stati/core as external to avoid bundling it
    external: ['@stati/core'],
  });

  return outfile;
}

/**
 * Clean up compiled config file.
 *
 * @param compiledPath - Path to the compiled config file to remove
 */
export async function cleanupCompiledConfig(compiledPath: string): Promise<void> {
  try {
    await fs.unlink(compiledPath);
  } catch {
    // Ignore if file doesn't exist
  }
}
