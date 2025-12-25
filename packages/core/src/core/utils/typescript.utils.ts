/**
 * TypeScript compilation utilities using esbuild.
 * Provides functions for compiling TypeScript files and watching for changes.
 * Supports multiple bundles with per-page targeting.
 * @module core/utils/typescript
 */

import * as esbuild from 'esbuild';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { pathExists } from './fs.utils.js';
import { validateUniqueBundleNames, type CompiledBundleInfo } from './bundle-matching.utils.js';
import type { TypeScriptConfig, BundleConfig } from '../../types/config.js';
import type { Logger } from '../../types/logging.js';
import {
  DEFAULT_TS_SRC_DIR,
  DEFAULT_TS_OUT_DIR,
  DEFAULT_BUNDLES,
  DEFAULT_OUT_DIR,
} from '../../constants.js';

/**
 * Formats bytes into a human-readable string.
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  } else if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`;
  } else {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
}

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
 * Options for TypeScript file watcher.
 * Note: Watcher is always in development mode (no hash, no minify, with sourcemaps).
 */
export interface WatchOptions {
  /** Root directory of the project */
  projectRoot: string;
  /** TypeScript configuration */
  config: TypeScriptConfig;
  /** Output directory (defaults to 'dist') */
  outDir?: string;
  /** Logger instance for output */
  logger: Logger;
  /** Callback invoked when files are recompiled, receives results and compile time in ms */
  onRebuild: (results: CompiledBundleInfo[], compileTimeMs: number) => void;
}

/**
 * Resolved TypeScript config with all defaults applied.
 * @internal
 */
interface ResolvedTypeScriptConfig {
  enabled: boolean;
  srcDir: string;
  outDir: string;
  bundles: BundleConfig[];
  hash: boolean;
  minify: boolean;
  sourceMaps: boolean;
}

/**
 * Resolves TypeScript config with defaults based on mode.
 * @internal
 */
function resolveConfig(
  config: TypeScriptConfig,
  mode: 'development' | 'production',
): ResolvedTypeScriptConfig {
  const isProduction = mode === 'production';

  return {
    enabled: config.enabled,
    srcDir: config.srcDir ?? DEFAULT_TS_SRC_DIR,
    outDir: config.outDir ?? DEFAULT_TS_OUT_DIR,
    bundles: config.bundles ?? [...DEFAULT_BUNDLES],
    // hash/minify: always false in dev (config ignored), configurable in prod (default true)
    hash: isProduction && (config.hash ?? true),
    minify: isProduction && (config.minify ?? true),
    // Source maps: always enabled in dev for debugging, always disabled in prod for security/size
    sourceMaps: !isProduction,
  };
}

/**
 * Detects existing TypeScript bundles in the output directory.
 * Used when skipping TypeScript compilation (e.g., in dev mode where esbuild watcher handles it).
 * Looks for bundles matching the config bundle names in the output directory.
 *
 * @param options - Same options as compileTypeScript
 * @returns Array of detected bundle info
 */
export async function detectExistingBundles(
  options: Omit<CompileOptions, 'logger'>,
): Promise<CompiledBundleInfo[]> {
  const { projectRoot, config, outDir: globalOutDir = DEFAULT_OUT_DIR, mode } = options;
  const resolved = resolveConfig(config, mode);
  const outDir = path.join(projectRoot, globalOutDir, resolved.outDir);

  const results: CompiledBundleInfo[] = [];

  // Check if output directory exists
  if (!(await pathExists(outDir))) {
    return results;
  }

  try {
    const files = await fs.readdir(outDir);

    for (const bundleConfig of resolved.bundles) {
      // In dev mode, bundles use stable names (no hash)
      // In prod mode, bundles have hashes like "bundleName-abc123.js"
      const pattern =
        mode === 'development'
          ? `${bundleConfig.bundleName}.js`
          : new RegExp(`^${bundleConfig.bundleName}-[a-zA-Z0-9]+\\.js$`);

      const matchingFile = files.find((f) =>
        typeof pattern === 'string' ? f === pattern : pattern.test(f),
      );

      if (matchingFile) {
        const bundlePath = path.posix.join('/', resolved.outDir, matchingFile);
        results.push({
          config: bundleConfig,
          filename: matchingFile,
          path: bundlePath,
        });
      }
    }
  } catch {
    // If we can't read the directory, return empty results
  }

  return results;
}

/**
 * Compile a single bundle using esbuild.
 * @internal
 */
async function compileSingleBundle(
  bundleConfig: BundleConfig,
  resolvedConfig: ResolvedTypeScriptConfig,
  projectRoot: string,
  globalOutDir: string,
  logger: Logger,
): Promise<CompiledBundleInfo | null> {
  const entryPath = path.join(projectRoot, resolvedConfig.srcDir, bundleConfig.entryPoint);
  const outDir = path.join(projectRoot, globalOutDir, resolvedConfig.outDir);

  // Validate entry point exists
  if (!(await pathExists(entryPath))) {
    logger.warning(
      `TypeScript entry point not found: ${entryPath} (bundle: ${bundleConfig.bundleName})`,
    );
    return null;
  }

  try {
    const result = await esbuild.build({
      entryPoints: [entryPath],
      bundle: true,
      outdir: outDir,
      entryNames: resolvedConfig.hash
        ? `${bundleConfig.bundleName}-[hash]`
        : bundleConfig.bundleName,
      minify: resolvedConfig.minify,
      sourcemap: resolvedConfig.sourceMaps,
      target: 'es2022',
      format: 'esm',
      platform: 'browser',
      logLevel: 'silent',
      metafile: true,
    });

    // Extract the generated filename for this bundle
    const outputs = Object.keys(result.metafile?.outputs ?? {});
    const bundleFile = outputs.find((f) => f.endsWith('.js'));
    const bundleFilename = bundleFile ? path.basename(bundleFile) : `${bundleConfig.bundleName}.js`;

    // Get the bundle size from metafile
    const bundleSize = bundleFile ? result.metafile?.outputs[bundleFile]?.bytes : undefined;

    // Construct the path relative to site root
    const bundlePath = path.posix.join('/', resolvedConfig.outDir, bundleFilename);

    const bundleInfo: CompiledBundleInfo = {
      config: bundleConfig,
      filename: bundleFilename,
      path: bundlePath,
    };

    if (bundleSize !== undefined) {
      bundleInfo.sizeInBytes = bundleSize;
    }

    return bundleInfo;
  } catch (error) {
    if (error instanceof Error) {
      logger.error(`Bundle '${bundleConfig.bundleName}' compilation failed: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Compile TypeScript files using esbuild.
 * Supports multiple bundles with parallel compilation.
 *
 * @param options - Compilation options
 * @returns Array of compilation results for each bundle
 *
 * @example
 * ```typescript
 * const results = await compileTypeScript({
 *   projectRoot: process.cwd(),
 *   config: {
 *     enabled: true,
 *     bundles: [
 *       { entryPoint: 'core.ts', bundleName: 'core' },
 *       { entryPoint: 'docs.ts', bundleName: 'docs', include: ['/docs/**'] }
 *     ]
 *   },
 *   mode: 'production',
 *   logger: console,
 * });
 * console.log(results[0].bundlePath); // '/_assets/core-a1b2c3d4.js'
 * ```
 */
export async function compileTypeScript(options: CompileOptions): Promise<CompiledBundleInfo[]> {
  const { projectRoot, config, mode, logger, outDir: globalOutDir } = options;
  const resolved = resolveConfig(config, mode);
  const outputDir = globalOutDir || DEFAULT_OUT_DIR;

  // Handle empty bundles array
  if (resolved.bundles.length === 0) {
    logger.warning(
      'TypeScript is enabled but no bundles are configured. Add bundles to your stati.config.ts or disable TypeScript.',
    );
    return [];
  }

  // Validate unique bundle names early - fail fast with clear error message
  validateUniqueBundleNames(resolved.bundles);

  logger.info('');
  logger.info(
    `Compiling TypeScript (${resolved.bundles.length} bundle${resolved.bundles.length > 1 ? 's' : ''})...`,
  );

  // Compile all bundles in parallel
  const compilationPromises = resolved.bundles.map((bundleConfig) =>
    compileSingleBundle(bundleConfig, resolved, projectRoot, outputDir, logger),
  );

  const results = await Promise.all(compilationPromises);

  // Filter out null results (skipped bundles) and collect successful ones
  const successfulResults = results.filter((r): r is CompiledBundleInfo => r !== null);

  if (successfulResults.length > 0) {
    // Log each bundle on its own line
    for (const r of successfulResults) {
      if (logger.file) {
        logger.file('compiled', r.filename, r.sizeInBytes);
      }
    }

    // Calculate and display total
    const totalBytes = successfulResults.reduce((sum, r) => sum + (r.sizeInBytes ?? 0), 0);
    const totalSuffix = totalBytes > 0 ? ` (${formatBytes(totalBytes)} total)` : '';
    logger.success(
      `Compiled ${successfulResults.length} TypeScript bundle${successfulResults.length > 1 ? 's' : ''}${totalSuffix}`,
    );
  } else if (resolved.bundles.length > 0) {
    logger.warning('No TypeScript bundles were compiled (all entry points missing).');
  }

  return successfulResults;
}

/**
 * Create an esbuild watch context for development.
 * Watches for TypeScript file changes and recompiles automatically.
 * Supports multiple bundles with selective recompilation.
 *
 * @param options - Watch options including rebuild callback
 * @returns Array of esbuild build contexts for cleanup
 *
 * @example
 * ```typescript
 * const watchers = await createTypeScriptWatcher({
 *   projectRoot: process.cwd(),
 *   config: { enabled: true },
 *   logger: console,
 *   onRebuild: (results, compileTimeMs) => console.log(`Rebuilt ${results.length} bundles in ${compileTimeMs}ms`),
 * });
 *
 * // Later, cleanup:
 * await Promise.all(watchers.map(w => w.dispose()));
 * ```
 */
export async function createTypeScriptWatcher(
  options: WatchOptions,
): Promise<esbuild.BuildContext[]> {
  const { projectRoot, config, logger, onRebuild, outDir: globalOutDir } = options;
  const resolved = resolveConfig(config, 'development');
  const outputDir = globalOutDir || DEFAULT_OUT_DIR;
  const outDir = path.join(projectRoot, outputDir, resolved.outDir);

  const contexts: esbuild.BuildContext[] = [];
  const latestResults: Map<string, CompiledBundleInfo> = new Map();

  for (const bundleConfig of resolved.bundles) {
    const entryPath = path.join(projectRoot, resolved.srcDir, bundleConfig.entryPoint);

    // Validate entry point exists
    if (!(await pathExists(entryPath))) {
      logger.warning(
        `TypeScript entry point not found: ${entryPath} (bundle: ${bundleConfig.bundleName})`,
      );
      continue;
    }

    // Track whether this is the initial build triggered by context.watch()
    // We skip notifications for the initial build since files were just compiled
    // by compileTypeScript() during the initial build phase
    let isInitialBuild = true;

    const context = await esbuild.context({
      entryPoints: [entryPath],
      bundle: true,
      outdir: outDir,
      entryNames: bundleConfig.bundleName, // Stable filename in dev mode (no hash)
      minify: false, // Dev mode: never minify for fast rebuilds
      sourcemap: true, // Dev mode: always enable for debugging
      target: 'es2022',
      format: 'esm',
      platform: 'browser',
      logLevel: 'silent',
      metafile: true,
      plugins: [
        {
          name: 'stati-rebuild-notify',
          setup(build) {
            let startTime: number;
            build.onStart(() => {
              startTime = Date.now();
            });
            build.onEnd((result) => {
              const compileTime = Date.now() - startTime;
              if (result.errors.length > 0) {
                result.errors.forEach((err) => {
                  logger.error(`TypeScript error in '${bundleConfig.bundleName}': ${err.text}`);
                });
              } else {
                // Extract the generated filename
                const outputs = Object.keys(result.metafile?.outputs ?? {});
                const bundleFile = outputs.find((f) => f.endsWith('.js'));
                const bundleFilename = bundleFile
                  ? path.basename(bundleFile)
                  : `${bundleConfig.bundleName}.js`;
                const bundlePath = path.posix.join('/', resolved.outDir, bundleFilename);

                const bundleResult: CompiledBundleInfo = {
                  config: bundleConfig,
                  filename: bundleFilename,
                  path: bundlePath,
                };

                latestResults.set(bundleConfig.bundleName, bundleResult);

                // Skip notifications for the initial build triggered by context.watch()
                // since files were already compiled during performInitialBuild()
                if (isInitialBuild) {
                  isInitialBuild = false;
                  return;
                }

                logger.info(`TypeScript '${bundleConfig.bundleName}' recompiled.`);

                // Notify with all current results and compile time
                onRebuild(Array.from(latestResults.values()), compileTime);
              }
            });
          },
        },
      ],
    });

    // Start watching
    await context.watch();
    contexts.push(context);
  }

  if (contexts.length > 0) {
    logger.info(
      `Watching TypeScript files in ${resolved.srcDir}/ (${contexts.length} bundle${contexts.length > 1 ? 's' : ''})`,
    );
  }

  return contexts;
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

/**
 * Validates a bundle path for safety against XSS attacks.
 * Only allows safe ASCII characters: alphanumeric, hyphens, underscores, dots, and forward slashes.
 * Must start with / and end with .js, no encoded characters or unicode allowed.
 *
 * @param bundlePath - The bundle path to validate
 * @returns true if the path is safe, false otherwise
 *
 * @internal
 */
export function isValidBundlePath(bundlePath: string): boolean {
  // Reject non-string or empty paths
  if (typeof bundlePath !== 'string' || bundlePath.length === 0) {
    return false;
  }

  // Reject paths with null bytes (can bypass security checks)
  if (bundlePath.includes('\0')) {
    return false;
  }

  // Reject paths with control characters or non-ASCII characters
  // Check that all characters are in printable ASCII range (32-126)
  for (let i = 0; i < bundlePath.length; i++) {
    const charCode = bundlePath.charCodeAt(i);
    if (charCode < 32 || charCode > 126) {
      return false;
    }
  }

  // Reject URL-encoded characters (e.g., %20, %3C) and unicode escapes (e.g., \u003C)
  if (/%[0-9a-fA-F]{2}/.test(bundlePath) || /\\u[0-9a-fA-F]{4}/.test(bundlePath)) {
    return false;
  }
  // Reject HTML entities (e.g., &lt; &#60; &#x3C;)
  if (/&#?[a-zA-Z0-9]+;/.test(bundlePath)) {
    return false;
  }

  // Reject path traversal attempts
  if (bundlePath.includes('..') || bundlePath.includes('//')) {
    return false;
  }

  // Validate against strict safe pattern
  const safePathPattern = /^\/[a-zA-Z0-9_\-./]+\.js$/;
  return safePathPattern.test(bundlePath);
}

/**
 * Checks if a bundle script tag is already present in the HTML.
 *
 * @param html - The HTML content to check
 * @param bundlePath - The bundle path to look for
 * @returns true if the bundle is already included, false otherwise
 *
 * @internal
 */
function isBundleAlreadyIncluded(html: string, bundlePath: string): boolean {
  const escapedPath = bundlePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const scriptTagPattern = new RegExp(`<script[^>]*\\ssrc=["']${escapedPath}["'][^>]*>`, 'i');
  return scriptTagPattern.test(html);
}

/**
 * Auto-inject TypeScript bundle script tags into HTML before </body>.
 * Similar to SEO auto-injection, this adds script tags automatically
 * so users don't need to modify their templates.
 * Supports multiple bundles - injects all matched bundles in order.
 *
 * @param html - Rendered HTML content
 * @param bundlePaths - Array of paths to compiled bundles (e.g., ['/_assets/core.js', '/_assets/docs.js'])
 * @returns HTML with injected script tags
 *
 * @example
 * ```typescript
 * const html = '<html><body>Content</body></html>';
 * const enhanced = autoInjectBundles(html, ['/_assets/core.js', '/_assets/docs.js']);
 * // Returns HTML with both script tags injected before </body>
 * ```
 */
export function autoInjectBundles(html: string, bundlePaths: string[]): string {
  if (!bundlePaths || bundlePaths.length === 0) {
    return html;
  }

  // Filter paths: must be valid and not already included in HTML
  const validPaths = bundlePaths.filter(
    (bundlePath) => isValidBundlePath(bundlePath) && !isBundleAlreadyIncluded(html, bundlePath),
  );

  if (validPaths.length === 0) {
    return html;
  }

  // Find </body> tag (case-insensitive)
  const bodyCloseMatch = html.match(/<\/body>/i);
  if (!bodyCloseMatch || bodyCloseMatch.index === undefined) {
    return html;
  }

  const bodyClosePos = bodyCloseMatch.index;
  const before = html.substring(0, bodyClosePos);
  const after = html.substring(bodyClosePos);

  // Inject all script tags before </body>
  const scriptTags = validPaths
    .map((bundlePath) => `<script type="module" src="${bundlePath}"></script>`)
    .join('\n');

  return `${before}${scriptTags}\n${after}`;
}
