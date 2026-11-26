/**
 * TypeScript compilation utilities using esbuild.
 * Provides functions for compiling TypeScript files and watching for changes.
 * Supports multiple bundles with per-page targeting.
 * @module core/utils/typescript
 */

import * as esbuild from 'esbuild';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { pathExists, readdir, remove } from './fs.utils.js';
import { validateUniqueBundleNames, type CompiledBundleInfo } from './bundle-matching.utils.js';
import { findHtmlTags, getAttribute } from './html.utils.js';
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
  /**
   * Callback invoked when files are recompiled, receives results, compile time in ms and the
   * bundle that was recompiled
   */
  onRebuild: (
    results: CompiledBundleInfo[],
    compileTimeMs: number,
    rebuild: TypeScriptRebuild,
  ) => void;
  /**
   * Whether to wait for the initial watch build to finish for all bundles.
   * Useful during dev-server startup to ensure bundle files exist before page rendering.
   */
  awaitInitialBuild?: boolean;
}

/** The bundle a watcher recompiled, passed to {@link WatchOptions.onRebuild} */
export interface TypeScriptRebuild {
  /** The bundle as it is now */
  bundle: CompiledBundleInfo;
  /** Its entry point, absolute */
  entryPath: string;
  /**
   * Whether the bundle started or stopped importing CSS, which changes the stylesheet links
   * of the pages that get it: they need to render again, not only to reload
   */
  stylesheetChanged: boolean;
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
        const bundle: CompiledBundleInfo = {
          config: bundleConfig,
          filename: matchingFile,
          path: bundlePath,
        };
        // The dev server's stylesheet for the CSS the bundle imports, which its watcher deletes
        // once the bundle imports none. Production names it after its content, and compiling
        // the bundle reads the name from esbuild rather than from the files.
        const stylesheet = `${bundleConfig.bundleName}.css`;
        if (mode === 'development' && files.includes(stylesheet)) {
          bundle.stylesheetPath = path.posix.join('/', resolved.outDir, stylesheet);
        }
        results.push(bundle);
      }
    }
  } catch {
    // If we can't read the directory, return empty results
  }

  return results;
}

/**
 * Options for {@link removeStaleBundleFiles}.
 */
export interface RemoveStaleBundlesOptions {
  /** Root directory of the project */
  projectRoot: string;
  /** TypeScript configuration */
  config: TypeScriptConfig;
  /** Output directory (defaults to 'dist') */
  outDir?: string;
  /** The bundles this build compiled */
  compiled: CompiledBundleInfo[];
  /**
   * Site paths of other files this build links from the folder, which stay: the hashed
   * stylesheets (`CacheManifest.stylesheets`), whose names a bundle's can share, such as
   * '/_assets/main-A1B2C3D4.css' for `public/main.css` next to a bundle named `main`
   */
  keep?: Iterable<string>;
}

/**
 * Deletes the files of compiled bundles that earlier builds left in the bundle output
 * directory: hashed copies of the scripts and of the stylesheets of the CSS they import, from
 * builds whose code differed, and the unhashed files and source maps the dev server writes,
 * which production pages never load. Only files named after a bundle compiled in this build
 * are deleted, and never a file this build wrote or links, so other files in the directory
 * stay.
 *
 * The build calls this after every page is written: until then, pages from the previous
 * build still load the old files.
 *
 * @param options - The project, its TypeScript config and output directory, the bundles this
 *   build compiled and the other files it links from the folder
 */
export async function removeStaleBundleFiles(options: RemoveStaleBundlesOptions): Promise<void> {
  const { projectRoot, config, outDir: globalOutDir = DEFAULT_OUT_DIR, compiled } = options;
  if (compiled.length === 0) {
    return;
  }
  const folder = resolveConfig(config, 'production').outDir;
  const outDir = path.join(projectRoot, globalOutDir, folder);
  const keep = new Set(options.keep);
  const current = new Set(
    compiled.flatMap((bundle) => [
      bundle.filename,
      ...(bundle.stylesheetPath ? [path.posix.basename(bundle.stylesheetPath)] : []),
    ]),
  );
  // name.js and name.css, name-HASH.js and name-HASH.css (esbuild's 8-character hash), and
  // their source maps
  const patterns = compiled.map(({ config }) => {
    const name = config.bundleName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`^${name}(?:-[A-Z0-9]{8})?\\.(?:js|css)(?:\\.map)?$`);
  });

  const entries = await readdir(outDir, { withFileTypes: true }).catch(() => []);

  // Files only: remove() deletes folders with their contents, and links are left alone
  const stale = entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter(
      (file) =>
        !current.has(file) &&
        !keep.has(path.posix.join('/', folder, file)) &&
        patterns.some((pattern) => pattern.test(file)),
    );
  await Promise.all(stale.map((file) => remove(path.join(outDir, file))));
}

/**
 * What a bundle's build wrote, from its metafile: the script, its size, and the stylesheet of
 * the CSS it imports (the JS output's `cssBundle`), if any.
 *
 * @param bundleConfig - The bundle
 * @param metafile - The build's metafile
 * @param folder - The bundle output directory, from the site root (`typescript.outDir`)
 */
function readBundleOutputs(
  bundleConfig: BundleConfig,
  metafile: esbuild.Metafile | undefined,
  folder: string,
): CompiledBundleInfo {
  const outputs = metafile?.outputs ?? {};
  const bundleFile = Object.keys(outputs).find((f) => f.endsWith('.js'));
  const bundleOutput = bundleFile ? outputs[bundleFile] : undefined;
  const filename = bundleFile ? path.basename(bundleFile) : `${bundleConfig.bundleName}.js`;

  const bundleInfo: CompiledBundleInfo = {
    config: bundleConfig,
    filename,
    // The path relative to the site root
    path: path.posix.join('/', folder, filename),
  };
  if (bundleOutput?.bytes !== undefined) {
    bundleInfo.sizeInBytes = bundleOutput.bytes;
  }
  if (bundleOutput?.cssBundle) {
    bundleInfo.stylesheetPath = path.posix.join('/', folder, path.basename(bundleOutput.cssBundle));
  }
  return bundleInfo;
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

    return readBundleOutputs(bundleConfig, result.metafile, resolvedConfig.outDir);
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
        if (r.stylesheetPath) {
          logger.file('compiled', path.posix.basename(r.stylesheetPath));
        }
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
  const {
    projectRoot,
    config,
    logger,
    onRebuild,
    outDir: globalOutDir,
    awaitInitialBuild = false,
  } = options;
  const resolved = resolveConfig(config, 'development');
  const outputDir = globalOutDir || DEFAULT_OUT_DIR;
  const outDir = path.join(projectRoot, outputDir, resolved.outDir);

  const contexts: esbuild.BuildContext[] = [];
  const latestResults: Map<string, CompiledBundleInfo> = new Map();
  const initialBuildPromises: Promise<void>[] = [];

  for (const bundleConfig of resolved.bundles) {
    const entryPath = path.join(projectRoot, resolved.srcDir, bundleConfig.entryPoint);

    // Validate entry point exists
    if (!(await pathExists(entryPath))) {
      logger.warning(
        `TypeScript entry point not found: ${entryPath} (bundle: ${bundleConfig.bundleName})`,
      );
      continue;
    }

    // Track whether this is the initial build triggered by context.watch().
    // We skip reload notifications for this build to avoid a reload storm during startup.
    let isInitialBuild = true;
    let resolveInitialBuild!: () => void;
    const initialBuildPromise = new Promise<void>((resolve) => {
      resolveInitialBuild = resolve;
    });
    initialBuildPromises.push(initialBuildPromise);

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
            build.onEnd(async (result) => {
              const compileTime = Date.now() - startTime;
              if (result.errors.length > 0) {
                result.errors.forEach((err) => {
                  logger.error(`TypeScript error in '${bundleConfig.bundleName}': ${err.text}`);
                });
              } else {
                const bundleResult = readBundleOutputs(
                  bundleConfig,
                  result.metafile,
                  resolved.outDir,
                );
                // esbuild leaves the stylesheet of CSS the bundle no longer imports, which
                // pages would go on linking: dev builds find the bundle's files on disk
                if (!bundleResult.stylesheetPath) {
                  const stylesheet = path.join(outDir, `${bundleConfig.bundleName}.css`);
                  try {
                    await Promise.all([remove(stylesheet), remove(`${stylesheet}.map`)]);
                  } catch (error) {
                    logger.warning(
                      `Could not remove ${stylesheet}, which pages go on linking: ${error instanceof Error ? error.message : String(error)}`,
                    );
                  }
                }
                const previous = latestResults.get(bundleConfig.bundleName);
                latestResults.set(bundleConfig.bundleName, bundleResult);

                // Skip notifications for the initial build triggered by context.watch().
                // This avoids triggering a reload while startup priming is still in progress.
                if (isInitialBuild) {
                  isInitialBuild = false;
                  resolveInitialBuild();
                  return;
                }

                logger.info(`TypeScript '${bundleConfig.bundleName}' recompiled.`);

                // Notify with all current results, compile time and what changed. Before a
                // successful build there's nothing to compare with, and pages render with what
                // is on disk.
                onRebuild(Array.from(latestResults.values()), compileTime, {
                  bundle: bundleResult,
                  entryPath,
                  stylesheetChanged:
                    previous === undefined ||
                    previous.stylesheetPath !== bundleResult.stylesheetPath,
                });
                return;
              }

              if (isInitialBuild) {
                isInitialBuild = false;
                resolveInitialBuild();
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

  if (awaitInitialBuild && initialBuildPromises.length > 0) {
    await Promise.all(initialBuildPromises);
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
 * Files the config imports by relative path are bundled into the output. Packages are not:
 * the compiled file keeps their imports, so Node loads them from the project's `node_modules`
 * exactly as it does for a `.js` config.
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
    // Leave every package import to Node at runtime, as a .js config does. Bundled into ESM
    // output, CommonJS packages that require Node built-ins (fs-extra, for one) fail to load.
    // Only the config's own files, imported by relative path, are bundled and transpiled.
    packages: 'external',
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

const SCRIPT_AND_BODY = new Set(['script', 'body']);

/**
 * Reads, in one pass, what bundle injection needs from a page: the `src` of each `<script>`
 * tag, quoted or not, and where the last `</body>` is (-1 without one). Only tags that are
 * markup count, so a script tag or a `</body>` in a comment or a script is left out.
 *
 * @param html - The HTML content to check
 * @internal
 */
function readBundleTargets(html: string): { sources: Set<string>; bodyClose: number } {
  const sources = new Set<string>();
  let bodyClose = -1;
  for (const { name, start, attributes, closing } of findHtmlTags(html, SCRIPT_AND_BODY, {
    closing: true,
  })) {
    if (name === 'body') {
      if (closing) {
        bodyClose = start;
      }
      continue;
    }
    const src = getAttribute(attributes, 'src');
    if (src !== undefined) {
      sources.add(src.value);
    }
  }
  return { sources, bodyClose };
}

/**
 * Auto-inject TypeScript bundle script tags into HTML before </body>.
 * Similar to SEO auto-injection, this adds script tags automatically
 * so users don't need to modify their templates.
 * Supports multiple bundles - injects all matched bundles in order.
 *
 * @param html - Rendered HTML content
 * @param bundlePaths - Array of paths to compiled bundles (e.g., ['/_assets/core.js', '/_assets/docs.js'])
 * @param basePath - The path the site is served from (see `getBasePath()`), added to each script
 *   URL; a script tag that already has the prefixed URL is not added again
 * @returns HTML with injected script tags
 *
 * @example
 * ```typescript
 * const html = '<html><body>Content</body></html>';
 * const enhanced = autoInjectBundles(html, ['/_assets/core.js', '/_assets/docs.js']);
 * // Returns HTML with both script tags injected before </body>
 * ```
 */
export function autoInjectBundles(
  html: string,
  bundlePaths: string[],
  basePath: string = '',
): string {
  if (!bundlePaths || bundlePaths.length === 0) {
    return html;
  }

  // Filter paths: must be valid and not already included in HTML
  const { sources, bodyClose: bodyClosePos } = readBundleTargets(html);
  const validPaths = bundlePaths.filter(
    (bundlePath) => isValidBundlePath(bundlePath) && !sources.has(`${basePath}${bundlePath}`),
  );

  if (validPaths.length === 0) {
    return html;
  }

  // The last </body> that is markup, not one in a comment or a script
  if (bodyClosePos === -1) {
    return html;
  }

  const before = html.substring(0, bodyClosePos);
  const after = html.substring(bodyClosePos);

  // Inject all script tags before </body>
  const scriptTags = validPaths
    .map((bundlePath) => `<script type="module" src="${basePath}${bundlePath}"></script>`)
    .join('\n');

  return `${before}${scriptTags}\n${after}`;
}
