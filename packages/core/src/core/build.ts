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
  autoInjectBundles,
  getBundlePathsForPage,
  formatBytes,
} from './utils/index.js';
import type { CompiledBundleInfo } from './utils/index.js';
import { join, dirname, relative, posix } from 'node:path';
import { performance } from 'node:perf_hooks';
import { loadConfig } from '../config/loader.js';
import { loadContent } from './content.js';
import { createMarkdownProcessor, renderMarkdown, extractToc } from './markdown.js';
import { createTemplateEngine, renderPage } from './templates.js';
import { buildNavigation } from './navigation.js';
import {
  loadCacheManifest,
  saveCacheManifest,
  shouldRebuildPage,
  createCacheEntry,
  updateCacheEntry,
  withBuildLock,
  computeNavigationHash,
} from './isg/index.js';
import {
  generateSitemap,
  generateRobotsTxtFromConfig,
  autoInjectSEO,
  type AutoInjectOptions,
} from '../seo/index.js';
import { generateRSSFeeds, validateRSSConfig } from '../rss/index.js';
import {
  computeSearchIndexFilename,
  generateSearchIndex,
  writeSearchIndex,
  autoInjectSearchMeta,
} from '../search/index.js';
import { getEnv } from '../env.js';
import { DEFAULT_OUT_DIR } from '../constants.js';
import type {
  BuildContext,
  BuildStats,
  Logger,
  StatiConfig,
  CacheManifest,
  PageModel,
  NavNode,
  StatiAssets,
  TocEntry,
  SearchIndexMetadata,
} from '../types/index.js';
import type MarkdownIt from 'markdown-it';
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
      const result = await copyStaticAssetsWithLogging(sourcePath, destPath, logger);
      filesCopied += result.count;
      totalBytes += result.totalBytes;
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

  // Ensure cache directory exists before acquiring build lock
  await ensureDir(cacheDir);

  // Use build lock to prevent concurrent builds, with force option to override
  return await withBuildLock(cacheDir, () => buildInternal(options), {
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
 * Loads content and builds navigation.
 */
async function loadContentAndBuildNavigation(
  config: StatiConfig,
  options: BuildOptions,
  logger: Logger,
): Promise<{
  pages: PageModel[];
  navigation: NavNode[];
  md: MarkdownIt;
  eta: ReturnType<typeof createTemplateEngine>;
  navigationHash: string;
}> {
  // Load all content
  const pages = await loadContent(config, options.includeDrafts);
  logger.info(`▸ Found ${pages.length} pages`);

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

  return { pages, navigation, md, eta, navigationHash };
}

/**
 * Searchable page data collected during build for search index generation.
 */
interface SearchablePageData {
  page: PageModel;
  toc: TocEntry[];
  markdownContent: string;
}

/**
 * Result from processing pages with caching.
 */
interface ProcessPagesResult {
  cacheHits: number;
  cacheMisses: number;
  /** Searchable page data for search indexing (only populated when search is enabled) */
  searchablePages: SearchablePageData[];
}

/**
 * Processes pages with ISG caching logic.
 */
async function processPagesWithCache(
  pages: PageModel[],
  manifest: CacheManifest,
  config: StatiConfig,
  outDir: string,
  md: MarkdownIt,
  eta: ReturnType<typeof createTemplateEngine>,
  navigation: NavNode[],
  buildTime: Date,
  options: BuildOptions,
  logger: Logger,
  compiledBundles: CompiledBundleInfo[],
  recorder: MetricRecorder = noopMetricRecorder,
  searchIndexFilename?: string,
): Promise<ProcessPagesResult> {
  let cacheHits = 0;
  let cacheMisses = 0;
  const searchablePages: SearchablePageData[] = [];

  // Build context
  const buildContext: BuildContext = { config, pages };

  // Run beforeAll hook
  if (config.hooks?.beforeAll) {
    const endHookBeforeAll = recorder.startSpan('hookBeforeAllMs');
    await config.hooks.beforeAll(buildContext);
    endHookBeforeAll();
  }

  // Render each page with progress tracking and ISG
  if (logger.step) {
    logger.step(2, 3, 'Rendering pages');
    console.log(); // Add spacing after step header
  }

  // Initialize progress tracking
  if (logger.startProgress) {
    logger.startProgress(pages.length);
  }

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    if (!page) continue; // Safety check

    // Determine output path
    let outputPath: string;
    if (page.url === '/') {
      outputPath = join(outDir, 'index.html');
    } else if (page.url.endsWith('/')) {
      outputPath = join(outDir, page.url, 'index.html');
    } else {
      outputPath = join(outDir, `${page.url}.html`);
    }

    // Get cache key (use output path relative to outDir)
    const relativePath = relative(outDir, outputPath).replace(/\\/g, '/');
    const cacheKey = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
    const existingEntry = manifest.entries[cacheKey];

    // Check if we should rebuild this page (considering ISG logic)
    const shouldRebuild =
      options.force || (await shouldRebuildPage(page, existingEntry, config, buildTime));

    if (!shouldRebuild) {
      // Cache hit - skip rendering
      cacheHits++;
      if (logger.updateProgress) {
        logger.updateProgress('cached', page.url);
      }
      // Record page timing for cached pages (0ms render time)
      recorder.recordPageTiming(page.url, 0, true);

      // Collect searchable page data for cached pages if search is enabled
      // Extract TOC without full HTML rendering for efficiency
      if (config.search?.enabled === true) {
        const tocEnabled = config.markdown?.toc !== false;
        const toc = tocEnabled ? extractToc(page.content, md) : [];
        searchablePages.push({ page, toc, markdownContent: page.content });
      }
      continue;
    }

    // Cache miss - need to rebuild
    cacheMisses++;
    const startTime = performance.now();

    // Run beforeRender hook
    if (config.hooks?.beforeRender) {
      const hookStart = performance.now();
      await config.hooks.beforeRender({ page, config });
      recorder.addToPhase('hookBeforeRenderTotalMs', performance.now() - hookStart);
    }

    // Render markdown to HTML with TOC extraction
    const tocEnabled = config.markdown?.toc !== false;
    const { html: htmlContent, toc } = renderMarkdown(page.content, md, tocEnabled);

    // Compute matched bundle paths for this page
    const bundlePaths = getBundlePathsForPage(page.url, compiledBundles);

    // Build assets object with bundle paths and search index path
    const assets: StatiAssets = {
      bundlePaths,
      ...(config.search?.enabled === true &&
        searchIndexFilename && {
          searchIndexPath: `/${searchIndexFilename}`,
        }),
    };

    // Render with template
    const renderResult = await renderPage(
      page,
      htmlContent,
      config,
      eta,
      navigation,
      pages,
      assets,
      toc,
      logger,
    );
    let finalHtml = renderResult.html;

    // Record templates loaded for this page
    recorder.increment('templatesLoaded', renderResult.templatesLoaded);

    // Auto-inject SEO tags if enabled
    if (config.seo?.autoInject !== false) {
      const injectOptions: AutoInjectOptions = {
        page,
        config,
        siteUrl: config.site.baseUrl,
        logger,
      };

      if (config.seo?.debug !== undefined) {
        injectOptions.debug = config.seo.debug;
      }

      finalHtml = autoInjectSEO(finalHtml, injectOptions);
    }

    // Auto-inject search index meta tag if enabled (default: true)
    if (
      config.search?.enabled === true &&
      searchIndexFilename &&
      config.search?.autoInjectMetaTag !== false
    ) {
      finalHtml = autoInjectSearchMeta(finalHtml, `/${searchIndexFilename}`);
    }

    // Auto-inject TypeScript bundle script tags if available and autoInject is enabled (default: true)
    if (config.typescript?.autoInject !== false && assets.bundlePaths.length > 0) {
      finalHtml = autoInjectBundles(finalHtml, assets.bundlePaths);
    }

    const renderTime = Math.round(performance.now() - startTime);

    // Record page timing for rendered pages (includes template count)
    recorder.recordPageTiming(page.url, renderTime, false, renderResult.templatesLoaded);

    if (logger.updateProgress) {
      logger.updateProgress('rendered', page.url, renderTime);
    }

    // Ensure directory exists and write file
    await ensureDir(dirname(outputPath));
    await writeFile(outputPath, finalHtml, 'utf-8');

    // Update cache manifest
    if (existingEntry) {
      manifest.entries[cacheKey] = await updateCacheEntry(existingEntry, page, config, buildTime);
    } else {
      manifest.entries[cacheKey] = await createCacheEntry(page, config, buildTime);
    }

    // Collect searchable page data if search is enabled
    // Uses TOC entries and markdown content instead of parsing rendered HTML
    if (config.search?.enabled === true) {
      searchablePages.push({ page, toc, markdownContent: page.content });
    }

    // Run afterRender hook
    if (config.hooks?.afterRender) {
      const hookStart = performance.now();
      await config.hooks.afterRender({ page, config });
      recorder.addToPhase('hookAfterRenderTotalMs', performance.now() - hookStart);
    }
  }

  // Display final progress summary
  if (logger.endProgress) {
    logger.endProgress();
    if (logger.showRenderingSummary) {
      logger.showRenderingSummary();
    }
  }

  return { cacheHits, cacheMisses, searchablePages };
}

/**
 * Copies static assets and returns the count.
 */
async function copyStaticAssets(
  config: StatiConfig,
  outDir: string,
  logger: Logger,
): Promise<number> {
  const staticDir = resolveStaticDir(config);
  if (!(await pathExists(staticDir))) {
    return 0;
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
): Promise<BuildStats> {
  const buildEndTime = Date.now();
  const buildStats: BuildStats = {
    totalPages: pages.length,
    assetsCount,
    buildTimeMs: buildEndTime - buildStartTime,
    outputSizeBytes: await getDirectorySize(outDir),
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

  logger.building('▸ Started building your site...');

  // Load configuration (instrumented)
  const endConfigSpan = recorder.startSpan('configLoadMs');
  const { config, outDir, cacheDir } = await loadAndValidateConfig(options);
  endConfigSpan();

  // Initialize cache stats
  let cacheHits = 0;
  let cacheMisses = 0;

  // Clean output directory and cache if requested
  if (options.clean) {
    logger.info('▸ Cleaning output directory and ISG cache...');
    await remove(outDir);
    await remove(cacheDir);
  }

  await ensureDir(outDir);

  // Enable Tailwind class inventory tracking only if Tailwind is detected
  const hasTailwind = await isTailwindUsed();
  if (hasTailwind) {
    enableInventoryTracking();
    clearInventory(); // Clear any previous inventory

    // Try to load from existing inventory file
    const loadedCount = await loadPreviousInventory(cacheDir);
    if (loadedCount > 0) {
      // Write the initial inventory file immediately so Tailwind can scan it
      // This is critical for dev server where Tailwind starts watching before template rendering
      await writeTailwindClassInventory(cacheDir);
      logger.info(`▸ Loaded ${loadedCount} classes from previous build for Tailwind scanner`);
    } else {
      // No previous inventory found - write an empty placeholder file
      // This ensures Tailwind has a file to scan even on first build
      // It will be populated with actual classes after template rendering
      await writeTailwindClassInventory(cacheDir);
      logger.info(
        `▸ Created inventory file for Tailwind scanner (will be populated after rendering)`,
      );
    }
  }

  // Load cache manifest for ISG (after potential clean operation)
  const endManifestLoadSpan = recorder.startSpan('cacheManifestLoadMs');
  const { manifest } = await setupCacheAndManifest(cacheDir);
  endManifestLoadSpan();

  // Load content and build navigation
  if (logger.step) {
    console.log(); // Add spacing before content loading
  }
  const endContentSpan = recorder.startSpan('contentDiscoveryMs');
  const { pages, navigation, md, eta, navigationHash } = await loadContentAndBuildNavigation(
    config,
    options,
    logger,
  );
  endContentSpan();

  // Record content discovery counts.
  // Both totalPages and markdownFilesProcessed are incremented by pages.length
  // because loadContent() only processes *.md files, so all pages are markdown files.
  recorder.increment('totalPages', pages.length);
  recorder.increment('markdownFilesProcessed', pages.length);

  // Store navigation hash in manifest for change detection in dev server
  manifest.navigationHash = navigationHash;

  // Compile TypeScript if enabled
  let compiledBundles: CompiledBundleInfo[] = [];

  if (config.typescript?.enabled) {
    const endTsSpan = recorder.startSpan('typescriptCompileMs');
    compiledBundles = await compileTypeScript({
      projectRoot: process.cwd(),
      config: config.typescript,
      outDir: config.outDir || DEFAULT_OUT_DIR,
      mode: getEnv() === 'production' ? 'production' : 'development',
      logger,
    });
    endTsSpan();
  }

  // Pre-compute search index filename if search is enabled
  let searchIndexFilename: string | undefined;
  if (config.search?.enabled) {
    searchIndexFilename = computeSearchIndexFilename(config.search, buildStartTime.toString());
  }

  // Process pages with ISG caching logic
  if (logger.step) {
    console.log(); // Add spacing before page processing
  }
  const endPageRenderSpan = recorder.startSpan('pageRenderingMs');
  const buildTime = new Date();
  const pageProcessingResult = await processPagesWithCache(
    pages,
    manifest,
    config,
    outDir,
    md,
    eta,
    navigation,
    buildTime,
    options,
    logger,
    compiledBundles,
    recorder,
    searchIndexFilename,
  );
  endPageRenderSpan();
  cacheHits = pageProcessingResult.cacheHits;
  cacheMisses = pageProcessingResult.cacheMisses;
  const searchablePages = pageProcessingResult.searchablePages;

  // Generate search index if enabled
  // Uses markdown content and TOC entries
  let searchIndexMetadata: SearchIndexMetadata | undefined;
  if (config.search?.enabled && searchablePages.length > 0 && searchIndexFilename) {
    logger.info('');
    logger.info(`Generating search index to ${searchIndexFilename}`);

    const endSearchIndexSpan = recorder.startSpan('searchIndexGenerationMs');
    const searchIndex = generateSearchIndex(searchablePages, config.search);
    searchIndexMetadata = await writeSearchIndex(searchIndex, outDir, searchIndexFilename);
    endSearchIndexSpan();

    logger.success(`Generated search index with ${searchIndexMetadata.documentCount} documents`);
  }

  // Record page rendering counts
  recorder.increment('renderedPages', cacheMisses);
  recorder.increment('cachedPages', cacheHits);

  // Write Tailwind class inventory after all templates have been rendered (if Tailwind is used)
  if (hasTailwind) {
    const inventorySize = getInventorySize();
    if (inventorySize > 0) {
      await writeTailwindClassInventory(cacheDir);
      logger.info('');
      logger.info(`▸ Generated Tailwind class inventory (${inventorySize} classes tracked)`);
    }

    // Disable inventory tracking after build
    disableInventoryTracking();
  }

  // Save updated cache manifest
  const endManifestSaveSpan = recorder.startSpan('cacheManifestSaveMs');
  await saveCacheManifest(cacheDir, manifest);
  endManifestSaveSpan();

  // Copy static assets and count them
  const endAssetSpan = recorder.startSpan('assetCopyMs');
  let assetsCount = 0;
  assetsCount = await copyStaticAssets(config, outDir, logger);
  endAssetSpan();
  recorder.increment('assetsCopied', assetsCount);

  // Get current environment
  const currentEnv = getEnv();

  // Generate sitemap if enabled (only in production mode)
  if (config.sitemap?.enabled && currentEnv === 'production') {
    if (logger.step) {
      console.log(); // Add spacing before sitemap generation
    }
    logger.info('Generating sitemap...');

    const endSitemapSpan = recorder.startSpan('sitemapGenerationMs');
    const sitemapResult = generateSitemap(pages, config, config.sitemap);
    await writeFile(join(outDir, 'sitemap.xml'), sitemapResult.xml);
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
  }

  // Generate robots.txt if enabled (only in production mode)
  if (config.robots?.enabled && currentEnv === 'production') {
    if (logger.step) {
      console.log(); // Add spacing before robots.txt generation
    }
    logger.info('Generating robots.txt...');

    const robotsContent = generateRobotsTxtFromConfig(config.robots, config.site.baseUrl);
    await writeFile(join(outDir, 'robots.txt'), robotsContent);
    const robotsSizeBytes = Buffer.byteLength(robotsContent, 'utf8');

    logger.success(`Generated robots.txt (${robotsSizeBytes} bytes)`);
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
            logger.info('No RSS feeds generated (no matching pages found)');
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

  // Calculate build statistics
  const buildStats = await generateBuildStats(
    pages,
    assetsCount,
    buildStartTime,
    outDir,
    cacheHits,
    cacheMisses,
    logger,
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
