import {
  ensureDir,
  writeFile,
  remove,
  pathExists,
  stat,
  readdir,
  copyFile,
  resolveOutDir,
  resolveStaticDir,
  resolveCacheDir,
  enableInventoryTracking,
  disableInventoryTracking,
  clearInventory,
  writeTailwindClassInventory,
  getInventorySize,
  isTailwindUsed,
  loadPreviousInventory,
  compileTypeScript,
  detectExistingBundles,
  removeStaleBundleFiles,
  formatBytes,
  isVirtualPage,
  resolveSrcDir,
  getBasePath,
} from './utils/index.js';
import type { CompiledBundleInfo } from './utils/index.js';
import { join, dirname, relative, resolve, posix } from 'node:path';
import { URL } from 'node:url';
import { performance } from 'node:perf_hooks';
import { loadConfig } from '../config/loader.js';
import { validateDirectoryLayout } from '../config/directories.js';
import { loadContent } from './content.js';
import { expandPages } from './expand.js';
import { createMarkdownProcessor } from './markdown.js';
import { createTemplateEngine } from './templates.js';
import { loadTemplateIndex } from './template-index.js';
import { buildNavigation } from './navigation.js';
import { getPageOutput, prepareRenderSession, renderPages } from './render-pages.js';
import {
  loadCacheManifest,
  saveCacheManifest,
  pruneOrphanedPages,
  withBuildLock,
  computeNavigationHash,
  clearFileHashCache,
} from './isg/index.js';
import {
  generateSitemap,
  generateNewsSitemap,
  resolveNewsSitemapFilename,
  generateRobotsTxtFromConfig,
} from '../seo/index.js';
import { generateRSSFeeds, validateRSSConfig } from '../rss/index.js';
import { removeStaleSearchIndexes } from '../search/index.js';
import type { TailwindBuildOptions } from '../css/index.js';
import { StylesheetRuntime } from '../css/runtime.js';
import { getEnv, isDevelopment } from '../env.js';
import { DEFAULT_OUT_DIR } from '../constants.js';
import type {
  BuildStats,
  Logger,
  StatiConfig,
  CacheManifest,
  PageModel,
  NavNode,
} from '../types/index.js';
import type { MarkdownIt } from 'markdown-it';
import { ImageRuntime } from '../images/runtime.js';
import type { SettleResult } from '../images/runtime.js';
import type { MetricRecorder, BuildMetrics } from '../metrics/index.js';
import { createMetricRecorder, noopMetricRecorder } from '../metrics/index.js';

/**
 * Options for metrics collection during builds.
 */
export interface MetricsOptions {
  /** Enable metrics collection */
  enabled?: boolean;
  /** Include per-page timing details */
  detailed?: boolean;
}

/**
 * Options for customizing the build process.
 *
 * @remarks
 * The `| undefined` on optional properties is intentional due to
 * `exactOptionalPropertyTypes: true` in tsconfig.json, allowing callers
 * to explicitly pass `undefined` values.
 *
 * @example
 * ```typescript
 * const options: BuildOptions = {
 *   force: true,        // Force rebuild of all pages
 *   clean: true,        // Clean output directory before build
 *   configPath: './custom.config.js',  // Custom config file path
 *   includeDrafts: true, // Include draft pages in build
 *   version: '1.0.0',   // Version to display in build messages
 *   metrics: { enabled: true, detailed: true }  // Enable metrics collection
 * };
 * ```
 */
export interface BuildOptions {
  /** Force rebuild of all pages, ignoring cache */
  force?: boolean | undefined;
  /** Clean the output directory before building */
  clean?: boolean | undefined;
  /** Path to a custom configuration file */
  configPath?: string | undefined;
  /** Include draft pages in the build */
  includeDrafts?: boolean | undefined;
  /** Custom logger for build output */
  logger?: Logger | undefined;
  /** CLI version for metrics */
  cliVersion?: string | undefined;
  /** Core version for metrics */
  coreVersion?: string | undefined;
  /** Metrics collection options */
  metrics?: MetricsOptions | undefined;
  /** Skip updating cache entries after render (dev mode optimization) */
  skipCacheUpdate?: boolean | undefined;
  /** Skip saving cache manifest at end of build (dev mode optimization when caller already saved it) */
  skipManifestSave?: boolean | undefined;
  /** Skip copying static assets (dev mode optimization for template-only changes) */
  skipAssetCopy?: boolean | undefined;
  /**
   * The Tailwind CSS input and output (`--tailwind-input` and `--tailwind-output`). Pages get
   * the stylesheet's path in `stati.assets.stylesheetPaths` and, unless `css.autoInject` is
   * false, a `<link>` to it. Production builds run Tailwind after the last page renders and
   * write `_assets/[name]-[hash].css`; development builds link the output as it is, which the
   * dev server's Tailwind watcher writes.
   */
  tailwind?: TailwindBuildOptions | undefined;
}

/**
 * Extended build result including optional metrics.
 */
export interface BuildResult extends BuildStats {
  /** Build metrics (only present when metrics enabled) */
  buildMetrics?: BuildMetrics;
}

/**
 * Recursively calculates the total size of a directory in bytes.
 * Used for build statistics.
 *
 * @param dirPath - Path to the directory
 * @returns Total size in bytes
 */
async function getDirectorySize(dirPath: string): Promise<number> {
  if (!(await pathExists(dirPath))) {
    return 0;
  }

  let totalSize = 0;
  const items = await readdir(dirPath, { withFileTypes: true });

  for (const item of items) {
    const itemPath = join(dirPath, item.name);
    if (item.isDirectory()) {
      totalSize += await getDirectorySize(itemPath);
    } else {
      const stats = await stat(itemPath);
      totalSize += stats.size;
    }
  }

  return totalSize;
}

/**
 * Recursively copies static assets from source to destination directory
 * while logging each file being copied.
 *
 * @param sourceDir - Source directory containing static assets
 * @param destDir - Destination directory to copy assets to
 * @param logger - Logger instance for output
 * @param basePath - Base path for relative path calculation (for recursion)
 * @returns Total number of files copied
 */
async function copyStaticAssetsWithLogging(
  sourceDir: string,
  destDir: string,
  logger: Logger,
  basePath = '',
  skipFile?: string,
): Promise<{ count: number; totalBytes: number }> {
  let filesCopied = 0;
  let totalBytes = 0;

  if (!(await pathExists(sourceDir))) {
    return { count: 0, totalBytes: 0 };
  }

  const items = await readdir(sourceDir, { withFileTypes: true });

  for (const item of items) {
    const sourcePath = join(sourceDir, item.name);
    const destPath = join(destDir, basePath, item.name);
    const relativePath = posix.normalize(posix.join(basePath, item.name));

    if (item.isDirectory()) {
      // Recursively copy directories
      await ensureDir(destPath);
      const result = await copyStaticAssetsWithLogging(sourcePath, destPath, logger, '', skipFile);
      filesCopied += result.count;
      totalBytes += result.totalBytes;
    } else if (skipFile !== undefined && resolve(destPath) === skipFile) {
      continue;
    } else {
      // Copy individual files
      await ensureDir(dirname(destPath));
      await copyFile(sourcePath, destPath);
      const fileStats = await stat(sourcePath);
      if (logger.file) {
        logger.file('copy', relativePath, fileStats.size);
      } else {
        logger.processing(`• ${relativePath}`);
      }
      filesCopied++;
      totalBytes += fileStats.size;
    }
  }

  return { count: filesCopied, totalBytes };
}

/**
 * Default console logger implementation.
 */
const defaultLogger: Logger = {
  info: (message: string) => console.log(message),
  success: (message: string) => console.log(message),
  warning: (message: string) => console.warn(message),
  error: (message: string) => console.error(message),
  status: (message: string) => console.log(message),
  building: (message: string) => console.log(message),
  processing: (message: string) => console.log(message),
  stats: (message: string) => console.log(message),
};

/**
 * Builds the Stati site with ISG support.
 * Processes all pages and assets, with smart caching for incremental builds.
 *
 * Uses build locking to prevent concurrent builds from corrupting cache.
 * The manifest tracks build dependencies and cache entries for efficient rebuilds.
 * Pages are only rebuilt if their content, templates, or dependencies have changed.
 *
 * Build process:
 * 1. Load configuration and content
 * 2. Check cache manifest for existing entries
 * 3. Process each page (rebuild only if needed)
 * 4. Copy static assets
 * 5. Update cache manifest
 *
 * @param options - Build configuration options
 * @returns Promise resolving to build result with statistics and optional metrics
 * @throws {Error} When configuration is invalid
 * @throws {Error} When template rendering fails
 * @throws {Error} When build lock cannot be acquired
 *
 * @example
 * ```typescript
 * const result = await build({
 *   force: true,
 *   clean: true,
 *   includeDrafts: false,
 *   metrics: { enabled: true }
 * });
 * console.log(`Built ${result.totalPages} pages in ${result.buildTimeMs}ms`);
 * if (result.buildMetrics) {
 *   console.log(`Cache hit rate: ${result.buildMetrics.isg.cacheHitRate}`);
 * }
 * ```
 */
export async function build(options: BuildOptions = {}): Promise<BuildResult> {
  const cacheDir = resolveCacheDir();

  // Clear per-build caches at the start of each build
  // This prevents stale data from previous builds and ensures consistent state
  clearFileHashCache();

  // Ensure cache directory exists before acquiring build lock
  await ensureDir(cacheDir);

  // In dev mode, bypass file-based build lock (the dev server's rebuild queue runs one build at a
  // time, and the dev server lock prevents multiple dev servers in the same directory)
  if (isDevelopment()) {
    return buildInternal(options);
  }

  // Use build lock to prevent concurrent builds, with force option to override
  return withBuildLock(cacheDir, () => buildInternal(options), {
    force: Boolean(options.force || options.clean), // Allow force if user explicitly requests it
    timeout: 60000, // 1 minute timeout
  });
}

/**
 * Loads and validates configuration, returning config and output directory.
 */
async function loadAndValidateConfig(options: BuildOptions): Promise<{
  config: StatiConfig;
  outDir: string;
  cacheDir: string;
}> {
  // Load configuration
  const config = await loadConfig(options.configPath ? dirname(options.configPath) : process.cwd());
  const outDir = resolveOutDir(config);
  const cacheDir = resolveCacheDir();

  // Create .stati cache directory
  await ensureDir(cacheDir);

  return { config, outDir, cacheDir };
}

/**
 * Sets up cache manifest and initializes cache statistics.
 */
async function setupCacheAndManifest(cacheDir: string): Promise<{
  manifest: CacheManifest;
}> {
  // Load cache manifest for ISG
  let cacheManifest = await loadCacheManifest(cacheDir);

  // If no cache manifest exists, create an empty one
  if (!cacheManifest) {
    cacheManifest = {
      entries: {},
    };
  }

  // At this point cacheManifest is guaranteed to be non-null
  const manifest = cacheManifest;

  return { manifest };
}

/**
 * Loads content, expands generated and paginated pages, and builds navigation.
 */
async function loadContentAndBuildNavigation(
  config: StatiConfig,
  options: BuildOptions,
  logger: Logger,
): Promise<{
  pages: PageModel[];
  markdownFiles: number;
  navigation: NavNode[];
  md: MarkdownIt;
  eta: ReturnType<typeof createTemplateEngine>;
  navigationHash: string;
}> {
  // Load all content, then replace [param].md templates with their pages and add the
  // pages of paginated listings. Navigation, SEO, sitemap and search see the result.
  const loaded = await loadContent(config, options.includeDrafts);
  const pages = await expandPages(loaded, config, logger);
  const virtualCount = pages.filter((page) => isVirtualPage(page)).length;
  logger.status(`Found ${pages.length - virtualCount} pages`);
  if (virtualCount > 0) {
    logger.status(`Generated ${virtualCount} more from templates and pagination`);
  }

  // Build navigation from pages
  if (logger.step) {
    console.log(); // Add spacing before navigation step
    logger.step(1, 3, 'Building navigation');
  }
  const navigation = buildNavigation(pages);
  logger.info(`Built navigation with ${navigation.length} top-level items`);

  // Display navigation tree if the logger supports it
  if (logger.navigationTree) {
    logger.navigationTree(navigation);
  }

  // Compute navigation hash for change detection in dev server
  const navigationHash = computeNavigationHash(navigation);

  // Create processors
  const md = await createMarkdownProcessor(config);
  const eta = createTemplateEngine(config);

  return { pages, markdownFiles: loaded.length, navigation, md, eta, navigationHash };
}

/**
 * Copies static assets and returns the count.
 */
async function copyStaticAssets(
  config: StatiConfig,
  outDir: string,
  logger: Logger,
  tailwindOutput?: string,
): Promise<number> {
  const staticDir = resolveStaticDir(config);
  if (!(await pathExists(staticDir))) {
    return 0;
  }

  // The Tailwind output's path belongs to Tailwind in every build, so a static file there is
  // never copied: the dev server's watcher would write over it, and a hashed build would ship
  // a copy that dev never serves
  let skipFile: string | undefined;
  if (tailwindOutput) {
    const outputPath = relative(outDir, tailwindOutput);
    if (await pathExists(join(staticDir, outputPath))) {
      skipFile = resolve(tailwindOutput);
      const shown = (path: string) => relative(process.cwd(), path).replace(/\\/g, '/');
      logger.warning(
        `${shown(join(staticDir, outputPath))} is not copied: --tailwind-output names that path (${shown(tailwindOutput)}). Rename the static file or change --tailwind-output.`,
      );
    }
  }

  if (logger.step) {
    console.log(); // Add spacing before asset copying
    logger.step(3, 3, 'Copying static assets');
  }
  logger.info(`Copying static assets from ${config.staticDir}`);
  const { count: assetsCount, totalBytes } = await copyStaticAssetsWithLogging(
    staticDir,
    outDir,
    logger,
    '',
    skipFile,
  );
  if (assetsCount > 0) {
    const totalSizeStr = formatBytes(totalBytes);
    logger.success(`Copied ${assetsCount} static assets (${totalSizeStr})`);
  } else {
    logger.info(`Copied 0 static assets`);
  }

  return assetsCount;
}

/**
 * Generates build statistics.
 */
async function generateBuildStats(
  pages: PageModel[],
  assetsCount: number,
  buildStartTime: number,
  outDir: string,
  cacheHits: number,
  cacheMisses: number,
  logger: Logger,
  recorder: MetricRecorder = noopMetricRecorder,
): Promise<BuildStats> {
  const buildEndTime = Date.now();

  const outputSizeStart = performance.now();
  const outputSizeBytes = await getDirectorySize(outDir);
  const dirSizeTime = performance.now() - outputSizeStart;
  recorder.recordPhase('getDirectorySizeMs', dirSizeTime);

  const buildStats: BuildStats = {
    totalPages: pages.length,
    assetsCount,
    buildTimeMs: buildEndTime - buildStartTime,
    outputSizeBytes,
    // Include ISG cache statistics
    cacheHits,
    cacheMisses,
  };

  if (logger.statsTable) {
    console.log(); // Add spacing before statistics
    logger.statsTable(buildStats);
    console.log(); // Add spacing after statistics
  }

  return buildStats;
}

/**
 * Internal build implementation without locking.
 * Separated for cleaner error handling and testing.
 */
async function buildInternal(options: BuildOptions = {}): Promise<BuildResult> {
  // Date.now() is used for user-facing build duration display (wall-clock time, in milliseconds).
  // Note: Date.now() can be affected by system clock changes and is not monotonic.
  // Internal metrics use performance.now() via the MetricRecorder for higher precision and monotonic timing,
  // which is not affected by system clock adjustments.
  const buildStartTime = Date.now();
  const logger = options.logger || defaultLogger;

  // Create metric recorder (noop if disabled)
  const recorder = createMetricRecorder({
    enabled: options.metrics?.enabled,
    detailed: options.metrics?.detailed,
    command: 'build',
    flags: {
      force: options.force,
      clean: options.clean,
      includeDrafts: options.includeDrafts,
    },
    cliVersion: options.cliVersion,
    coreVersion: options.coreVersion,
  });

  logger.status('Started building your site...');

  // Load configuration (instrumented)
  const endConfigSpan = recorder.startSpan('configLoadMs');
  const { config, outDir, cacheDir } = await loadAndValidateConfig(options);
  endConfigSpan();

  // The stylesheet Stati builds with Tailwind and the static directory's hashed stylesheets. A
  // production build checks the Tailwind input and CLI now, so a missing one fails before any
  // page renders.
  const stylesheets = await StylesheetRuntime.create(config, {
    tailwind: options.tailwind,
    outDir,
    cacheDir,
    logger,
    recorder,
    development: isDevelopment(),
  });

  // Clean output directory and cache if requested
  if (options.clean) {
    logger.status('Cleaning output directory and ISG cache...');
    // Programmatic callers can hand build() a config that skipped loadConfig's checks
    validateDirectoryLayout(config);
    await remove(outDir);
    await remove(cacheDir);
  }

  await ensureDir(outDir);

  // Image pipeline; null with images: false. Fails here, before any page renders, when a
  // feature needs @stati/images and it is missing or incompatible.
  const imageRuntime = await ImageRuntime.create(config, {
    outDir,
    cacheDir,
    logger,
    development: isDevelopment(),
  });

  // Enable Tailwind class inventory tracking only if Tailwind is used
  const tailwindInitStart = performance.now();
  const hasTailwind = stylesheets.plan !== null || (await isTailwindUsed());
  if (hasTailwind) {
    enableInventoryTracking();
    clearInventory(); // Clear any previous inventory

    // Try to load from existing inventory file
    const loadedCount = await loadPreviousInventory(cacheDir);
    if (loadedCount > 0) {
      // Write the initial inventory file immediately so Tailwind can scan it
      // This is critical for dev server where Tailwind starts watching before template rendering
      await writeTailwindClassInventory(cacheDir);
      logger.status(`Loaded ${loadedCount} classes from previous build for Tailwind scanner`);
    } else {
      // No previous inventory found - write an empty placeholder file
      // This ensures Tailwind has a file to scan even on first build
      // It will be populated with actual classes after template rendering
      await writeTailwindClassInventory(cacheDir);
      logger.status(
        `Created inventory file for Tailwind scanner (will be populated after rendering)`,
      );
    }
  }
  const tailwindInitTime = performance.now() - tailwindInitStart;
  recorder.recordPhase('tailwindInitMs', tailwindInitTime);

  // Load cache manifest for ISG (after potential clean operation)
  const endManifestLoadSpan = recorder.startSpan('cacheManifestLoadMs');
  const { manifest } = await setupCacheAndManifest(cacheDir);
  endManifestLoadSpan();

  // Load content and build navigation
  if (logger.step) {
    console.log(); // Add spacing before content loading
  }
  const endContentSpan = recorder.startSpan('contentDiscoveryMs');
  const { pages, markdownFiles, navigation, md, eta, navigationHash } =
    await loadContentAndBuildNavigation(config, options, logger);
  endContentSpan();

  // Record content discovery counts. Pages include the ones generated from [param].md
  // templates and pagination; Markdown files include the templates.
  recorder.increment('totalPages', pages.length);
  recorder.increment('markdownFilesProcessed', markdownFiles);

  // Recorded in the manifest; pages that read the navigation also hash it into their inputs
  manifest.navigationHash = navigationHash;

  // Compile TypeScript if enabled
  // In dev mode, skip compilation since esbuild watcher handles it
  let compiledBundles: CompiledBundleInfo[] = [];
  const isDevMode = isDevelopment();

  if (config.typescript?.enabled && isDevMode) {
    // In dev mode, detect existing bundles compiled by esbuild watcher
    compiledBundles = await detectExistingBundles({
      projectRoot: process.cwd(),
      config: config.typescript,
      outDir: config.outDir || DEFAULT_OUT_DIR,
      mode: 'development',
    });

    // On initial dev startup, watcher output may not exist yet.
    // Compile once so pages can auto-inject bundle scripts immediately.
    if (compiledBundles.length === 0) {
      const endTsSpan = recorder.startSpan('typescriptCompileMs');
      compiledBundles = await compileTypeScript({
        projectRoot: process.cwd(),
        config: config.typescript,
        outDir: config.outDir || DEFAULT_OUT_DIR,
        mode: 'development',
        logger,
      });
      endTsSpan();
    }
  } else if (config.typescript?.enabled) {
    const endTsSpan = recorder.startSpan('typescriptCompileMs');
    compiledBundles = await compileTypeScript({
      projectRoot: process.cwd(),
      config: config.typescript,
      outDir: config.outDir || DEFAULT_OUT_DIR,
      mode: 'production',
      logger,
    });
    endTsSpan();
  }

  // Process pages with ISG caching logic
  if (logger.step) {
    console.log(); // Add spacing before page processing
  }
  // Every template under the source directory, read once per build; a dev server session
  // keeps one between rebuilds and updates it as templates are added and deleted
  const endTemplateIndexSpan = recorder.startSpan('templateIndexMs');
  const templateIndex = await loadTemplateIndex(resolveSrcDir(config));
  endTemplateIndexSpan();
  recorder.increment('templatesIndexed', templateIndex.size);

  const endPageRenderSpan = recorder.startSpan('pageRenderingMs');
  // The beforeAll hook, the SEO defaults and the search index come before the first page renders
  const session = await prepareRenderSession({
    config,
    outDir,
    pages,
    manifest,
    buildTime: new Date(),
    force: Boolean(options.force),
    skipCacheUpdate: Boolean(options.skipCacheUpdate),
    md,
    eta,
    navigation,
    navigationHash,
    templateIndex,
    compiledBundles,
    images: imageRuntime,
    stylesheets,
    recorder,
    logger,
  });
  // Render each page with progress tracking and ISG
  if (logger.step) {
    logger.step(2, 3, 'Rendering pages');
    console.log(); // Add spacing after step header
  }
  const { cacheHits, cacheMisses, renderedFiles } = await renderPages(session);
  endPageRenderSpan();
  const { searchIndexFilename } = session;

  // Write Tailwind class inventory after all templates have been rendered (if Tailwind is used)
  const tailwindStart = performance.now();
  if (hasTailwind) {
    const inventorySize = getInventorySize();
    if (inventorySize > 0) {
      // In dev mode, skip write if inventory size hasn't changed
      const skipIfUnchanged = isDevMode;
      await writeTailwindClassInventory(cacheDir, skipIfUnchanged);
      logger.info('');
      logger.status(`Generated Tailwind class inventory (${inventorySize} classes tracked)`);
    }

    // Disable inventory tracking after build
    disableInventoryTracking();
  }
  const tailwindInventoryTime = performance.now() - tailwindStart;
  recorder.recordPhase('tailwindInventoryMs', tailwindInventoryTime);

  // Run Tailwind and write the pages held for it, then relink cached pages to this build's
  // stylesheet names. Before stale pages are removed and image failures patched, which read
  // the written pages.
  await stylesheets.finalize(manifest, pages, renderedFiles);

  // Remove the output of pages that no longer exist, such as a deleted post or a tag no post
  // uses anymore. Runs before static assets are copied, so a file in the static directory at
  // the same path is copied afterwards.
  const liveCacheKeys = new Set(pages.map((page) => getPageOutput(page, outDir).cacheKey));
  const pruned = await pruneOrphanedPages(manifest, liveCacheKeys, outDir);
  for (const failure of pruned.failed) {
    logger.warning(`Could not remove the stale page ${failure.key}: ${failure.message}`);
  }
  if (pruned.removed.length > 0) {
    const count = pruned.removed.length;
    logger.info(
      count === 1
        ? 'Removed 1 page that no longer exists'
        : `Removed ${count} pages that no longer exist`,
    );
  }

  // Wait for image jobs; pages whose images failed are rewritten to show plain images
  let imageFailures: SettleResult['failures'] = [];
  if (imageRuntime) {
    const endImageSpan = recorder.startSpan('imageSettleMs');
    const settled = await imageRuntime.settle(manifest);
    await imageRuntime.save();
    endImageSpan();
    imageFailures = settled.failures;

    const { generated, cached, failed } = imageRuntime.stats;
    recorder.increment('imagesGenerated', generated);
    recorder.increment('imagesCached', cached);
    recorder.increment('imagesFailed', failed);
    if (generated > 0 || failed > 0) {
      logger.info('');
      logger.info(
        `Images: ${generated} generated, ${cached} reused${failed > 0 ? `, ${failed} failed` : ''}`,
      );
    }
  }

  // Record page rendering counts
  recorder.increment('renderedPages', cacheMisses);
  recorder.increment('cachedPages', cacheHits);

  // Save updated cache manifest (skip if caller already saved it, e.g., dev mode template change)
  const endManifestSaveSpan = recorder.startSpan('cacheManifestSaveMs');
  if (!options.skipManifestSave) {
    await saveCacheManifest(cacheDir, manifest);
  }
  endManifestSaveSpan();

  // In the dev server a failed Open Graph image goes to the error overlay, like a template error
  const ogFailures = imageFailures.filter((failure) => failure.og);
  if (isDevMode && ogFailures.length > 0) {
    throw new Error(
      ogFailures
        .map((failure) => `Open Graph image failed for ${failure.label}: ${failure.message}`)
        .join('\n'),
    );
  }

  // Delete the bundles, stylesheets and search indexes earlier builds wrote under other names,
  // now that every page links to this build's files. Before the static copy, so a file in the
  // static directory with such a name is copied afterwards.
  if (!isDevMode) {
    await stylesheets.removeStale(manifest);
    if (config.typescript?.enabled) {
      await removeStaleBundleFiles({
        projectRoot: process.cwd(),
        config: config.typescript,
        outDir: config.outDir || DEFAULT_OUT_DIR,
        compiled: compiledBundles,
      });
    }
    if (config.search?.enabled && searchIndexFilename) {
      await removeStaleSearchIndexes(outDir, config.search, searchIndexFilename);
    }
  }

  // Copy static assets and count them (skip for template-only changes in dev mode)
  const endAssetSpan = recorder.startSpan('assetCopyMs');
  let assetsCount = 0;
  if (!options.skipAssetCopy) {
    assetsCount = await copyStaticAssets(config, outDir, logger, stylesheets.plan?.outputFile);
  }
  endAssetSpan();
  recorder.increment('assetsCopied', assetsCount);

  // Delete generated images no page of this build uses. Production only: dev builds skip
  // responsive and Open Graph images by default and must not delete them.
  if (imageRuntime && getEnv() === 'production') {
    const liveImages = new Set<string>();
    const liveSources = new Set<string>();
    for (const page of pages) {
      const entry = manifest.entries[getPageOutput(page, outDir).cacheKey];
      entry?.images?.forEach((image) => liveImages.add(image));
      entry?.assetDeps?.forEach((source) => liveSources.add(source));
    }
    const removed = await imageRuntime.prune(liveImages, liveSources);
    if (removed > 0) {
      logger.info(`Removed ${removed} unused generated image${removed === 1 ? '' : 's'}`);
    }
  }

  // Get current environment
  const currentEnv = getEnv();

  // Generate sitemap if enabled (only in production mode)
  if (config.sitemap?.enabled && currentEnv === 'production') {
    if (logger.step) {
      console.log(); // Add spacing before sitemap generation
    }
    logger.info('Generating sitemap...');

    const endSitemapSpan = recorder.startSpan('sitemapGenerationMs');
    const sitemapResult = generateSitemap(pages, config, config.sitemap, logger);
    await writeFile(join(outDir, 'sitemap.xml'), sitemapResult.xml);
    const newsSitemapResult = config.sitemap.news
      ? generateNewsSitemap(pages, config, config.sitemap.news, logger)
      : undefined;
    if (newsSitemapResult) {
      await writeFile(join(outDir, newsSitemapResult.filename), newsSitemapResult.xml);
    }
    endSitemapSpan();

    // Write additional sitemap files if split
    if (sitemapResult.sitemaps) {
      for (const { filename, xml } of sitemapResult.sitemaps) {
        await writeFile(join(outDir, filename), xml);
      }
      logger.success(
        `Generated sitemap index with ${sitemapResult.sitemaps.length} sitemaps (${sitemapResult.entryCount} entries)`,
      );
    } else {
      logger.success(
        `Generated sitemap.xml with ${sitemapResult.entryCount} entries (${(sitemapResult.sizeInBytes / 1024).toFixed(2)} KB)`,
      );
    }
    if (newsSitemapResult) {
      logger.success(
        `Generated ${newsSitemapResult.filename} with ${newsSitemapResult.entryCount} ${newsSitemapResult.entryCount === 1 ? 'article' : 'articles'} (${(newsSitemapResult.sizeInBytes / 1024).toFixed(2)} KB)`,
      );
    }
  }

  // Generate robots.txt if enabled (only in production mode)
  if (config.robots?.enabled && currentEnv === 'production') {
    if (logger.step) {
      console.log(); // Add spacing before robots.txt generation
    }
    logger.info('Generating robots.txt...');

    // The news sitemap is only written next to an enabled sitemap
    const newsSitemap = config.sitemap?.enabled ? config.sitemap.news : undefined;
    const robotsContent = generateRobotsTxtFromConfig(
      config.robots,
      config.site.baseUrl,
      newsSitemap ? [`/${resolveNewsSitemapFilename(newsSitemap)}`] : [],
    );
    await writeFile(join(outDir, 'robots.txt'), robotsContent);
    const robotsSizeBytes = Buffer.byteLength(robotsContent, 'utf8');

    logger.success(`Generated robots.txt (${robotsSizeBytes} bytes)`);

    const robotsBasePath = getBasePath(config.site.baseUrl);
    if (robotsBasePath) {
      logger.info(
        `Crawlers read robots.txt only at a host's root, so they ignore it under ${robotsBasePath}/. Serve it from the root of ${new URL(config.site.baseUrl).host} as well.`,
      );
    }
  }

  // Generate RSS feeds if enabled (only in production mode)
  if (config.rss?.enabled && currentEnv === 'production') {
    if (logger.step) {
      console.log(); // Add spacing before RSS generation
    }
    logger.info('Generating RSS feeds...');

    try {
      // Validate RSS configuration before generating
      const validationResult = validateRSSConfig(config.rss);

      if (!validationResult.valid) {
        logger.error('RSS configuration validation failed:');
        validationResult.errors.forEach((error) => logger.error(`  - ${error}`));
        if (validationResult.warnings.length > 0) {
          validationResult.warnings.forEach((warning) => logger.warning(`  - ${warning}`));
        }
      } else {
        // Log warnings if any
        if (validationResult.warnings.length > 0) {
          validationResult.warnings.forEach((warning) => logger.warning(warning));
        }

        // Validate pages array before generating feeds
        if (pages.length === 0) {
          logger.warning('No pages found to include in RSS feeds');
        } else {
          const rssResults = generateRSSFeeds(pages, config, logger);

          if (rssResults && rssResults.length > 0) {
            for (const result of rssResults) {
              await writeFile(join(outDir, result.filename), result.xml);
              logger.success(
                `Generated ${result.filename} with ${result.itemCount} items (${(result.sizeInBytes / 1024).toFixed(2)} KB)`,
              );
            }
            logger.success(
              `Generated ${rssResults.length} RSS feed${rssResults.length > 1 ? 's' : ''}`,
            );
          } else {
            // Every feed failed; generateRSSFeeds has logged why
            logger.warning('No RSS feeds were generated');
          }
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred during RSS generation';
      logger.error(`Failed to generate RSS feeds: ${errorMessage}`);
      // Don't throw - allow build to continue even if RSS generation fails
    }
  }

  // Run afterAll hook
  if (config.hooks?.afterAll) {
    const endHookAfterAll = recorder.startSpan('hookAfterAllMs');
    await config.hooks.afterAll({ config, pages });
    endHookAfterAll();
  }

  // Generate build statistics (skip in dev mode for performance)
  const buildStats: BuildStats = isDevMode
    ? {
        totalPages: pages.length,
        assetsCount: 0,
        buildTimeMs: Date.now() - buildStartTime,
        outputSizeBytes: 0,
        cacheHits,
        cacheMisses,
      }
    : await generateBuildStats(
        pages,
        assetsCount,
        buildStartTime,
        outDir,
        cacheHits,
        cacheMisses,
        logger,
        recorder,
      );

  // Set ISG metrics
  const totalPages = pages.length;
  const cacheHitRate = totalPages > 0 ? cacheHits / totalPages : 0;
  recorder.setISGMetrics({
    enabled: config.isg?.enabled !== false,
    cacheHitRate,
    manifestEntries: Object.keys(manifest.entries).length,
    invalidatedEntries: cacheMisses,
  });

  // Take final memory snapshot
  recorder.snapshotMemory();

  // Build result with optional metrics
  const result: BuildResult = {
    ...buildStats,
  };

  // Add metrics if enabled
  if (recorder.enabled) {
    result.buildMetrics = recorder.finalize();
  }

  return result;
}
