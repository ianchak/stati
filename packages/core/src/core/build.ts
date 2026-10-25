import {
  ensureDir,
  readFile,
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
  autoInjectBundles,
  getBundlePathsForPage,
  formatBytes,
  isVirtualPage,
  isNotFoundPage,
  getPageOutputFile,
  isPathWithinDirectory,
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
import {
  createSummaryHasher,
  resolveCollectionPath,
  resolveSummaryFields,
  type PageReads,
} from './collections.js';
import { createMarkdownProcessor, renderMarkdown, extractToc } from './markdown.js';
import { createTemplateEngine, renderPage } from './templates.js';
import { loadTemplateIndex, type TemplateIndex } from './template-index.js';
import { buildNavigation } from './navigation.js';
import { BasePathLinkReport } from './base-path-links.js';
import {
  loadCacheManifest,
  saveCacheManifest,
  shouldRebuildPage,
  createCacheEntry,
  updateCacheEntry,
  hasRecordedReads,
  pruneOrphanedPages,
  withBuildLock,
  computeNavigationHash,
  computeContentHash,
  clearFileHashCache,
} from './isg/index.js';
import {
  generateSitemap,
  generateRobotsTxtFromConfig,
  autoInjectSEO,
  applySEODefaults,
  refreshSEODefaults,
  type AutoInjectOptions,
} from '../seo/index.js';
import { generateRSSFeeds, validateRSSConfig } from '../rss/index.js';
import {
  computeSearchIndexFilename,
  generateSearchIndex,
  writeSearchIndex,
  removeStaleSearchIndexes,
  autoInjectSearchMeta,
  isGeneratedPageExcludedFromSearch,
} from '../search/index.js';
import {
  createStylesheetPlan,
  checkStylesheetSources,
  getStylesheetFingerprint,
  getRenderStylesheetPath,
  buildStylesheet,
  getStaleStylesheetPaths,
  relinkStylesheets,
  removeStaleStylesheets,
  autoInjectStylesheets,
  getLinkedStylesheetPaths,
  linksStylesheetWithIntegrity,
  rewriteStylesheetLinks,
  resolveCSSConfig,
  StaticStylesheets,
  isHashableStylesheetPath,
  type BuiltStylesheet,
  type StylesheetPlan,
  type TailwindBuildOptions,
} from '../css/index.js';
import { getEnv, isDevelopment } from '../env.js';
import { CSS_OUT_DIR, DEFAULT_OUT_DIR, MAX_DEFERRED_PAGES_LENGTH } from '../constants.js';
import type {
  BuildContext,
  BuildStats,
  Logger,
  StatiConfig,
  CacheManifest,
  CacheEntry,
  PageModel,
  NavNode,
  StatiAssets,
  TocEntry,
} from '../types/index.js';
import type { MarkdownIt } from 'markdown-it';
import { ImageRuntime } from '../images/runtime.js';
import type { SettleResult } from '../images/runtime.js';
import type { RenderedAssets } from './isg/index.js';
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
 * The stylesheet pages link while they render: the build's plan and the path they carry,
 * which a hashed production build replaces once Tailwind has run.
 */
interface RenderStylesheet {
  plan: StylesheetPlan;
  path: string;
  /** Where a production build keeps the rendered pages it can't hold in memory until then */
  stagingDir: string;
}

/** The folder in the cache directory for pages a production build holds past its memory limit */
const STAGED_PAGES_DIR = 'pending-pages';

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

  // In dev mode, bypass file-based build lock (dev server handles concurrency via isBuildingRef
  // and dev server lock prevents multiple dev servers in the same directory)
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
  /** The search index file the pages link to (only when search is enabled) */
  searchIndexFilename: string | undefined;
  /** Rendered pages a production build writes once Tailwind has built the stylesheet */
  deferredPages: DeferredPage[];
  /** The output files of the pages this build rendered, written or held */
  renderedFiles: string[];
  /** Stylesheet paths rendered pages link that the static directory has no file for */
  unhashedLinks: string[];
}

/**
 * A rendered page and the file it goes to. Its HTML is in memory, or past the memory limit in
 * a staged file in the cache directory, so the output directory keeps the previous build's
 * page until the stylesheet is built.
 */
type DeferredPage =
  { outputPath: string; content: string } | { outputPath: string; stagedFile: string };

/** Pages written at once */
const WRITE_BATCH_SIZE = 32;

/**
 * Writes held pages in batches, with one stylesheet path swapped for another.
 */
async function writeDeferredPages(
  pages: readonly DeferredPage[],
  from: string,
  to: string,
): Promise<void> {
  await Promise.all([...new Set(pages.map((page) => dirname(page.outputPath)))].map(ensureDir));
  for (let i = 0; i < pages.length; i += WRITE_BATCH_SIZE) {
    await Promise.all(
      pages.slice(i, i + WRITE_BATCH_SIZE).map(async (page) => {
        const content = 'content' in page ? page.content : await readFile(page.stagedFile);
        if (content === null) {
          throw new Error(
            `A rendered page is missing from the cache directory: ${page.outputPath}`,
          );
        }
        await writeFile(
          page.outputPath,
          from === to ? content : content.split(from).join(to),
          'utf-8',
        );
      }),
    );
  }
}

/**
 * Generates the search index from the page models and writes it before any page renders,
 * returning the file name pages link to. Every page links to the index, and the name is part
 * of each page's cache hash, so a production build names a hashed file after the index
 * content: a build that leaves the indexed text alone keeps the name and its cached pages.
 * Development keeps one name, so a content edit does not re-render every page. Writing the
 * index first means it is not held in memory while the pages render.
 *
 * @returns The index file name, or undefined when search is disabled
 */
async function writeSearchIndexBeforeRendering(
  pages: PageModel[],
  config: StatiConfig,
  md: MarkdownIt,
  outDir: string,
  logger: Logger,
  recorder: MetricRecorder,
): Promise<string | undefined> {
  if (config.search?.enabled !== true) {
    return undefined;
  }
  const isDevMode = isDevelopment();

  const endSearchIndexSpan = recorder.startSpan('searchIndexGenerationMs');
  // TOC entries and markdown content, the same data a render produces, without rendering.
  // Sorted by URL, so the index content, and with it the name, changes only when pages do.
  const tocEnabled = config.markdown?.toc !== false;
  const byUrl = (a: PageModel, b: PageModel) =>
    a.url.localeCompare(b.url) || a.sourcePath.localeCompare(b.sourcePath);
  const searchablePages: SearchablePageData[] = pages
    .filter((page) => !isGeneratedPageExcludedFromSearch(page))
    .sort(byUrl)
    .map((page) => ({
      page,
      toc: tocEnabled ? extractToc(page.content, md) : [],
      markdownContent: page.content,
    }));
  const index = generateSearchIndex(searchablePages, config.search);

  // A production hash covers the documents and schema version, not generatedAt, which
  // changes on every build; serializing them is skipped when the name has no hash
  const hashInput = isDevMode
    ? 'dev'
    : config.search.hashFilename !== false
      ? JSON.stringify({ version: index.version, documents: index.documents })
      : undefined;
  const filename = computeSearchIndexFilename(config.search, hashInput);
  endSearchIndexSpan();

  // Pages still link to the name when nothing is searchable, but no file is written
  if (searchablePages.length === 0) {
    return filename;
  }

  logger.info('');
  logger.info(`Generating search index to ${filename}`);
  const writeStart = performance.now();
  // In dev mode, skip write if content hasn't changed (template-only changes)
  const metadata = await writeSearchIndex(index, outDir, filename, isDevMode);
  recorder.recordPhase('searchIndexWriteMs', performance.now() - writeStart);
  logger.success(`Generated search index with ${metadata.documentCount} documents`);

  return filename;
}

/**
 * Output file and ISG cache key of a page.
 *
 * @throws Error when the page's file would not be inside the output directory
 */
function getPageOutput(page: PageModel, outDir: string): { outputPath: string; cacheKey: string } {
  const outputPath = join(outDir, getPageOutputFile(page.url));

  // Loading and expanding skip such pages; this catches a hook that changed a page's URL
  if (!isPathWithinDirectory(outDir, outputPath)) {
    throw new Error(
      `The page ${page.url} (${page.sourcePath}) would be written outside the output directory: ${outputPath}. Remove the ".." segments from its URL.`,
    );
  }

  // Cache key is the output path relative to outDir
  const relativePath = relative(outDir, outputPath).replace(/\\/g, '/');
  const cacheKey = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
  return { outputPath, cacheKey };
}

/**
 * Hashes a value for the render inputs, or returns a value that never matches when it
 * cannot be serialized, so the page rebuilds instead of keeping stale output.
 */
function hashableData(value: unknown): unknown {
  try {
    JSON.stringify(value);
    return value ?? null;
  } catch {
    return `unserializable:${Date.now()}:${Math.random()}`;
  }
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
  imageRuntime: ImageRuntime | null = null,
  navigationHash: string = computeNavigationHash(navigation),
  templateIndex?: TemplateIndex,
  stylesheet: RenderStylesheet | null = null,
  staticStylesheets: StaticStylesheets | null = null,
): Promise<ProcessPagesResult> {
  let cacheHits = 0;
  let cacheMisses = 0;

  // Every .eta file under the source directory, read once for all pages
  const index = templateIndex ?? (await loadTemplateIndex(resolveSrcDir(config)));

  // Build context
  const buildContext: BuildContext = { config, pages };

  // Run beforeAll hook
  if (config.hooks?.beforeAll) {
    const endHookBeforeAll = recorder.startSpan('hookBeforeAllMs');
    await config.hooks.beforeAll(buildContext);
    endHookBeforeAll();
  }

  // Site-wide SEO defaults go into front matter, which each page's cache hash covers, so
  // changing one rebuilds the pages it changes. After beforeAll, whose values win.
  applySEODefaults(pages, config, logger);

  // Collection summaries, hashed after beforeAll because the hook can change front matter
  const summaries = createSummaryHasher(pages, resolveSummaryFields(config));

  // Generated after beforeAll for the same reason; pages render with its file name
  const searchIndexFilename = await writeSearchIndexBeforeRendering(
    pages,
    config,
    md,
    outDir,
    logger,
    recorder,
  );

  // The pages of a listing share one array of page URLs, hashed once for all of them
  const urlListHashes = new WeakMap<readonly string[], string>();
  const hashUrlList = (urls: readonly string[]): string => {
    let hash = urlListHashes.get(urls);
    if (hash === undefined) {
      hash = computeContentHash('', { urls });
      urlListHashes.set(urls, hash);
    }
    return hash;
  };

  // Render each page with progress tracking and ISG
  if (logger.step) {
    logger.step(2, 3, 'Rendering pages');
    console.log(); // Add spacing after step header
  }

  // Initialize progress tracking
  if (logger.startProgress) {
    logger.startProgress(pages.length);
  }

  // The path the site is served from, which every root-relative URL core emits starts with
  const basePath = getBasePath(config.site.baseUrl);
  const basePathLinks = new BasePathLinkReport(basePath);

  // Track timing for shouldRebuildPage
  let totalShouldRebuildTime = 0;
  let totalMarkdownTime = 0;
  let totalRenderTime = 0;
  let totalPostRenderTime = 0;
  let totalFileWriteTime = 0;
  let totalCacheEntryTime = 0;

  // Batch pending writes for parallel execution (dev mode optimization)
  const isDevMode = isDevelopment();
  const pendingWrites: Array<{ outputPath: string; content: string }> = [];
  const pendingCacheUpdates: Array<{
    cacheKey: string;
    page: PageModel;
    existingEntry: CacheEntry | undefined;
    renderInputsHash: string;
    renderedAssets: RenderedAssets | undefined;
  }> = [];

  // Image settings that change generated HTML, part of every page's render inputs
  const imageFingerprint = imageRuntime?.fingerprint();

  // Every page links the same stylesheet. Its settings go into the render inputs, but not a
  // hashed build's file name: that is known only after the pages render, and the build writes
  // it into cached pages too.
  const stylesheetPaths = stylesheet ? [stylesheet.path] : [];
  const stylesheetFingerprint = stylesheet ? getStylesheetFingerprint(stylesheet.plan) : undefined;
  // A hashed production build points every link to a stylesheet it hashes at the hashed name:
  // a link to the Tailwind output's path at the name this build gives it, and a link to a
  // stylesheet in the static directory at its hashed copy
  const tailwindTargets = new Map<string, string>(
    stylesheet?.plan.hash ? [[stylesheet.plan.path, stylesheet.path]] : [],
  );
  // The names links get, which a page that links them already needs no copy for
  const hashedNames = new Set(tailwindTargets.values());
  // Stylesheet paths pages link that the static directory has no file for, such as one added
  // later; the build records them, so pages kept from now on link its copy once it exists
  const unhashedLinks = new Set<string>();
  const linkHashedStylesheets = async (html: string, pageUrl: string): Promise<string> => {
    const targets = new Map(tailwindTargets);
    for (const path of getLinkedStylesheetPaths(html, pageUrl, config.site.baseUrl)) {
      if (targets.has(path) || hashedNames.has(path)) {
        continue;
      }
      const copy = await staticStylesheets?.resolve(path);
      if (copy !== undefined) {
        targets.set(path, copy);
        hashedNames.add(copy);
      } else if (isHashableStylesheetPath(path)) {
        unhashedLinks.add(path);
      }
    }
    return rewriteStylesheetLinks(html, targets, pageUrl, config.site.baseUrl);
  };
  const renderedFiles: string[] = [];
  // A production build runs Tailwind after rendering: it keeps the pages it renders until then,
  // so a Tailwind error leaves the previous build's pages in place, hashed or not, and a hashed
  // build writes each page once with the stylesheet's final name
  const deferWrites = !isDevMode && stylesheet !== null;
  const deferredPages: DeferredPage[] = [];
  let deferredLength = 0;

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    if (!page) continue; // Safety check

    // Determine output path and cache key
    const { outputPath, cacheKey } = getPageOutput(page, outDir);
    const existingEntry = manifest.entries[cacheKey];

    const bundlePaths = getBundlePathsForPage(page.url, compiledBundles);
    const searchIndexPath =
      config.search?.enabled === true && searchIndexFilename
        ? `/${searchIndexFilename}`
        : undefined;
    const assets: StatiAssets = {
      bundlePaths,
      // A copy per page, like bundlePaths, so a template that changes it changes only its page
      stylesheetPaths: [...stylesheetPaths],
      ...(searchIndexPath && { searchIndexPath }),
    };

    // Collection the page sees as stati.collection; a page whose collection appears,
    // disappears or changes rebuilds even when it never read it
    const collectionPath = resolveCollectionPath(page, pages);
    const staticRenderInputs = {
      bundlePaths,
      ...(searchIndexPath && { searchIndexPath }),
      // Omitted without a base path, so the hash matches builds from before Stati supported one
      ...(basePath && { basePath }),
      bundleAutoInject: config.typescript?.autoInject !== false,
      searchAutoInject: config.search?.autoInjectMetaTag !== false,
      // Omitted without a stylesheet, so the hash matches builds from before Stati linked one
      ...(stylesheetFingerprint && { stylesheet: stylesheetFingerprint }),
      // Production links hashed stylesheets, which development doesn't
      ...(staticStylesheets && { hashedStylesheets: true }),
      // Omitted with images: false, so the hash matches builds without the image pipeline
      ...(imageFingerprint && { images: imageFingerprint }),
      // The 404 page gets no Open Graph image and a noindex robots tag, so a copy cached
      // before Stati treated it that way is rebuilt
      ...(isNotFoundPage(page) && { notFoundPage: true }),
      collection: collectionPath ?? null,
      // A listing page depends on its own slice and on the page count, which every page
      // shows in its numbered links
      ...(page.pagination && {
        pagination: {
          pageNumber: page.pagination.pageNumber,
          totalPages: page.pagination.totalPages,
          urls: hashUrlList(page.pagination.urls),
          items: summaries.pages(page.pagination.items),
        },
      }),
      // A generated page depends on its own items only, not on the whole collection
      ...(page.generated && {
        generated: {
          key: page.generated.key,
          label: page.generated.label,
          template: page.generated.template,
          items: summaries.pages(page.generated.items),
          data: hashableData(page.generated.data),
        },
      }),
    };
    // The data a render read: the collection summary and the navigation tree
    const renderInputsHashFor = (reads: PageReads | undefined) =>
      computeContentHash('', {
        ...staticRenderInputs,
        ...(reads?.collection && {
          collectionSummary:
            collectionPath !== undefined ? summaries.collection(collectionPath) : 'none',
        }),
        ...(reads?.nav && { navigation: navigationHash }),
      });

    // Entries written before Stati recorded what pages read are rebuilt once to record it
    const readsKnown = existingEntry !== undefined && hasRecordedReads(existingEntry);
    const renderInputsHash = renderInputsHashFor(
      readsKnown
        ? { collection: existingEntry.readsCollection!, nav: existingEntry.readsNav! }
        : undefined,
    );

    // Check if we should rebuild this page (considering ISG logic)
    const shouldRebuildStart = performance.now();
    const shouldRebuild =
      options.force ||
      config.isg?.enabled === false ||
      !(await pathExists(outputPath)) ||
      (existingEntry !== undefined && !readsKnown) ||
      // A cached page whose generated images are gone is rebuilt to regenerate them
      (imageRuntime !== null && !imageRuntime.outputsExist(existingEntry?.images)) ||
      (await shouldRebuildPage(
        page,
        existingEntry,
        config,
        pages,
        buildTime,
        renderInputsHash,
        index,
      ));
    const shouldRebuildTime = performance.now() - shouldRebuildStart;
    totalShouldRebuildTime += shouldRebuildTime;

    if (!shouldRebuild) {
      // Cache hit - skip rendering
      cacheHits++;
      if (logger.updateProgress) {
        logger.updateProgress('cached', page.url);
      }
      // Record page timing for cached pages (0ms render time)
      recorder.recordPageTiming(page.url, 0, true);
      continue;
    }

    // Cache miss - need to rebuild
    cacheMisses++;
    const startTime = performance.now();

    // Run beforeRender hook
    if (config.hooks?.beforeRender) {
      const hookStart = performance.now();
      await config.hooks.beforeRender({ page, config });
      // The hook can change what the SEO defaults come from, such as the page's author
      refreshSEODefaults(page, config);
      recorder.addToPhase('hookBeforeRenderTotalMs', performance.now() - hookStart);
    }

    // Image state for this page: markup, dependencies and generated files
    const pageImages = imageRuntime?.createPageContext(page);

    // Render markdown to HTML with TOC extraction
    const markdownStart = performance.now();
    const tocEnabled = config.markdown?.toc !== false;
    const { html: htmlContent, toc } = renderMarkdown(page.content, md, tocEnabled, {
      images: pageImages,
      ...(basePath && { basePath }),
    });
    totalMarkdownTime += performance.now() - markdownStart;

    // Render with template
    const renderPageStart = performance.now();
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
      { images: pageImages, templateIndex: index },
    );
    const renderPageTime = performance.now() - renderPageStart;
    totalRenderTime += renderPageTime;
    const postRenderStart = performance.now();
    let finalHtml = renderResult.html;

    // Record the templates this page used and how often templates rendered
    recorder.increment('templatesLoaded', renderResult.templatesLoaded);
    recorder.increment('templateRenders', renderResult.templateRenders);
    recorder.increment('includeCacheHits', renderResult.includeCacheHits);

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
      if (renderResult.ogImage) {
        injectOptions.generatedImage = renderResult.ogImage;
      }

      finalHtml = autoInjectSEO(finalHtml, injectOptions);
    }

    // Auto-inject search index meta tag if enabled (default: true)
    if (
      config.search?.enabled === true &&
      searchIndexFilename &&
      config.search?.autoInjectMetaTag !== false
    ) {
      finalHtml = autoInjectSearchMeta(finalHtml, `${basePath}/${searchIndexFilename}`);
    }

    // A hashed build writes the Tailwind stylesheet under its hashed name only, so a link that
    // keeps the stylesheet's own path for its integrity digest would load nothing
    if (
      stylesheet?.plan.hash &&
      linksStylesheetWithIntegrity(finalHtml, stylesheet.plan.path, page.url, config.site.baseUrl)
    ) {
      throw new Error(
        `The page ${page.url} links ${stylesheet.plan.path} with an integrity attribute. A hashed build writes the Tailwind stylesheet only as /${CSS_OUT_DIR}/${stylesheet.plan.name}-[hash].css, which the link can't load. Remove the integrity attribute, or set css.hash to false.`,
      );
    }

    // Link the hashed stylesheets, then add the Tailwind stylesheet's link if enabled (default:
    // true) where the page doesn't have one. A path a template added to stylesheetPaths can be
    // a stylesheet from the static directory, so an added link is pointed at its copy too.
    if (staticStylesheets) {
      finalHtml = await linkHashedStylesheets(finalHtml, page.url);
    }
    if (stylesheet?.plan.autoInject) {
      const linked = autoInjectStylesheets(
        finalHtml,
        assets.stylesheetPaths,
        config.site.baseUrl,
        page.url,
      );
      finalHtml =
        staticStylesheets && linked !== finalHtml
          ? await linkHashedStylesheets(linked, page.url)
          : linked;
    }

    // Auto-inject TypeScript bundle script tags if available and autoInject is enabled (default: true)
    if (config.typescript?.autoInject !== false && assets.bundlePaths.length > 0) {
      finalHtml = autoInjectBundles(finalHtml, assets.bundlePaths, basePath);
    }

    // A root-relative link without the base path breaks when the site is served from it
    basePathLinks.add(page.url, finalHtml);

    // Start the image jobs the final HTML needs and record its image files for the cache,
    // along with what the render read, which decides the hash it is stored under
    const committedImages =
      pageImages && imageRuntime
        ? imageRuntime.commitPage(pageImages, finalHtml, { outputPath, cacheKey })
        : undefined;
    const renderedAssets: RenderedAssets = {
      assetDeps: committedImages?.assetDeps ?? [],
      images: committedImages?.images ?? [],
      reads: renderResult.reads,
      templates: renderResult.templates,
      templateLookups: renderResult.templateLookups,
    };
    const renderedInputsHash = renderInputsHashFor(renderResult.reads);
    totalPostRenderTime += performance.now() - postRenderStart;

    const renderTime = performance.now() - startTime;

    // Record page timing for rendered pages (includes template count)
    recorder.recordPageTiming(
      page.url,
      renderTime,
      false,
      renderResult.templatesLoaded,
      renderResult.templateRenders,
    );

    if (logger.updateProgress) {
      logger.updateProgress('rendered', page.url, Math.round(renderTime));
    }
    renderedFiles.push(outputPath);

    // In dev mode, batch writes for parallel execution to avoid Windows filesystem slowdown
    if (isDevMode) {
      pendingWrites.push({ outputPath, content: finalHtml });
      pendingCacheUpdates.push({
        cacheKey,
        page,
        existingEntry,
        renderInputsHash: renderedInputsHash,
        renderedAssets,
      });
    } else if (deferWrites && stylesheet) {
      // Written after Tailwind has run, with the stylesheet's final name
      if (deferredLength + finalHtml.length <= MAX_DEFERRED_PAGES_LENGTH) {
        deferredPages.push({ outputPath, content: finalHtml });
        deferredLength += finalHtml.length;
      } else {
        const fileWriteStart = performance.now();
        const stagedFile = join(stylesheet.stagingDir, `${deferredPages.length}.html`);
        await ensureDir(stylesheet.stagingDir);
        await writeFile(stagedFile, finalHtml, 'utf-8');
        deferredPages.push({ outputPath, stagedFile });
        totalFileWriteTime += performance.now() - fileWriteStart;
      }
    } else {
      // Production mode: write immediately
      const fileWriteStart = performance.now();
      await ensureDir(dirname(outputPath));
      await writeFile(outputPath, finalHtml, 'utf-8');
      totalFileWriteTime += performance.now() - fileWriteStart;
    }

    // Production mode: update the cache manifest now; dev mode does it after the batched writes
    if (!isDevMode) {
      if (!options.skipCacheUpdate) {
        const cacheEntryStart = performance.now();
        manifest.entries[cacheKey] = existingEntry
          ? await updateCacheEntry(
              existingEntry,
              page,
              config,
              buildTime,
              renderedInputsHash,
              renderedAssets,
            )
          : await createCacheEntry(page, config, buildTime, renderedInputsHash, renderedAssets);
        totalCacheEntryTime += performance.now() - cacheEntryStart;
      }
    }

    // Run afterRender hook
    if (config.hooks?.afterRender) {
      const hookStart = performance.now();
      await config.hooks.afterRender({ page, config });
      recorder.addToPhase('hookAfterRenderTotalMs', performance.now() - hookStart);
    }
  }

  // In dev mode, execute batched writes in parallel
  if (isDevMode && pendingWrites.length > 0) {
    const fileWriteStart = performance.now();

    // Ensure all directories exist first
    const uniqueDirs = [...new Set(pendingWrites.map((w) => dirname(w.outputPath)))];
    await Promise.all(uniqueDirs.map((dir) => ensureDir(dir)));

    // Write all files in parallel
    await Promise.all(pendingWrites.map((w) => writeFile(w.outputPath, w.content, 'utf-8')));
    totalFileWriteTime = performance.now() - fileWriteStart;

    // Update cache entries sequentially, from the templates each render recorded
    if (!options.skipCacheUpdate) {
      const cacheEntryStart = performance.now();
      for (const {
        cacheKey,
        page,
        existingEntry,
        renderInputsHash,
        renderedAssets,
      } of pendingCacheUpdates) {
        manifest.entries[cacheKey] = existingEntry
          ? await updateCacheEntry(
              existingEntry,
              page,
              config,
              buildTime,
              renderInputsHash,
              renderedAssets,
            )
          : await createCacheEntry(page, config, buildTime, renderInputsHash, renderedAssets);
      }
      totalCacheEntryTime = performance.now() - cacheEntryStart;
    }
  }

  basePathLinks.report(logger);

  // Record detailed phase timings in metrics
  recorder.recordPhase('shouldRebuildTotalMs', totalShouldRebuildTime);
  recorder.recordPhase('markdownRenderTotalMs', totalMarkdownTime);
  recorder.recordPhase('renderPageTotalMs', totalRenderTime);
  recorder.recordPhase('postRenderTotalMs', totalPostRenderTime);
  recorder.recordPhase('fileWriteTotalMs', totalFileWriteTime);
  recorder.recordPhase('cacheEntryTotalMs', totalCacheEntryTime);

  // Display final progress summary
  if (logger.endProgress) {
    logger.endProgress();
    if (logger.showRenderingSummary) {
      logger.showRenderingSummary();
    }
  }

  return {
    cacheHits,
    cacheMisses,
    searchIndexFilename,
    deferredPages,
    renderedFiles,
    unhashedLinks: [...unhashedLinks],
  };
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

  // The stylesheet Stati builds with Tailwind. A production build checks the input and the
  // Tailwind CLI now, so a missing one fails before any page renders.
  const stylesheetPlan = options.tailwind
    ? createStylesheetPlan(options.tailwind, config.css, outDir, isDevelopment())
    : null;
  if (stylesheetPlan && !isDevelopment()) {
    await checkStylesheetSources(stylesheetPlan);
  }

  // Clean output directory and cache if requested
  if (options.clean) {
    logger.status('Cleaning output directory and ISG cache...');
    // Programmatic callers can hand build() a config that skipped loadConfig's checks
    validateDirectoryLayout(config);
    await remove(outDir);
    await remove(cacheDir);
  }

  await ensureDir(outDir);

  // Production links the static directory's stylesheets under hashed names, unless css.hash
  // is false. The Tailwind output's path is Tailwind's, so a static file there isn't one.
  const staticStylesheets = resolveCSSConfig(config.css, isDevelopment()).hash
    ? new StaticStylesheets(resolveStaticDir(config), outDir, stylesheetPlan?.path)
    : null;

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
  const hasTailwind = stylesheetPlan !== null || (await isTailwindUsed());
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

  // The stylesheet paths the last production build linked, which pages kept from it carry
  const previousStylesheets = manifest.stylesheets ?? {};

  // The stylesheet path pages render with: in a hashed build, a name made up for this build
  const renderStylesheet: RenderStylesheet | null = stylesheetPlan && {
    plan: stylesheetPlan,
    path: getRenderStylesheetPath(stylesheetPlan),
    stagingDir: join(cacheDir, STAGED_PAGES_DIR),
  };
  if (renderStylesheet && !isDevelopment()) {
    // Pages a build that stopped before writing them left behind
    await remove(renderStylesheet.stagingDir);
  }

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
    imageRuntime,
    navigationHash,
    templateIndex,
    renderStylesheet,
    staticStylesheets,
  );
  endPageRenderSpan();
  const {
    cacheHits,
    cacheMisses,
    searchIndexFilename,
    deferredPages,
    renderedFiles,
    unhashedLinks,
  } = pageProcessingResult;

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

  // Run Tailwind now that the inventory lists every class the pages use, then write the pages
  // this build rendered, which it held until now, with the stylesheet's name. Before stale
  // pages are removed and image failures patched, which read the written pages.
  let builtStylesheet: BuiltStylesheet | null = null;
  if (renderStylesheet && !isDevMode) {
    const { plan, stagingDir } = renderStylesheet;
    const endStylesheetSpan = recorder.startSpan('tailwindBuildMs');
    logger.info('');
    logger.info('Building CSS with Tailwind CSS...');
    try {
      builtStylesheet = await buildStylesheet(plan, outDir, cacheDir);
      if (logger.file) {
        logger.file(
          'compiled',
          relative(outDir, builtStylesheet.file).replace(/\\/g, '/'),
          builtStylesheet.sizeInBytes,
        );
      }

      const fileWriteStart = performance.now();
      await writeDeferredPages(deferredPages, renderStylesheet.path, builtStylesheet.path);
      recorder.addToPhase('fileWriteTotalMs', performance.now() - fileWriteStart);
    } finally {
      await remove(stagingDir);
    }
    // Let go of the held HTML
    deferredPages.length = 0;
    endStylesheetSpan();
    logger.success(`Built ${builtStylesheet.path} (${formatBytes(builtStylesheet.sizeInBytes)})`);
  }

  // The name every stylesheet this build links gets: the Tailwind output and the static
  // stylesheets the rendered pages link, a hashed name each, and a path pages link that the
  // static directory has no file for, its own. Pages kept from earlier builds carry the names
  // those builds gave, so the stylesheets only they link are looked up again: a changed file
  // gets a new name, a removed one its own path back, and one added since its copy. The kept
  // pages link the new names from here on; nothing is rendered again for them.
  if (staticStylesheets) {
    const rendered = new Set(renderedFiles);
    const cachedPages = pages
      .map((page) => ({ file: getPageOutput(page, outDir).outputPath, url: page.url }))
      .filter(({ file }) => !rendered.has(file));

    const current = await staticStylesheets.hashed();
    if (renderStylesheet?.plan.hash && builtStylesheet) {
      current.set(renderStylesheet.plan.path, builtStylesheet.path);
    }
    for (const path of unhashedLinks) {
      if (!current.has(path)) {
        current.set(path, path);
      }
    }
    // Every page rendered again links only what this build found
    if (cachedPages.length > 0) {
      for (const path of Object.keys(previousStylesheets)) {
        if (!current.has(path)) {
          current.set(path, (await staticStylesheets.resolve(path)) ?? path);
        }
      }
    }

    const replacements = new Map<string, string>();
    for (const path of new Set([...Object.keys(previousStylesheets), ...current.keys()])) {
      const target = current.get(path) ?? path;
      const recorded = previousStylesheets[path];
      for (const stale of await getStaleStylesheetPaths(outDir, path, recorded, target)) {
        replacements.set(stale, target);
      }
      // Linked under its own path while the static directory had no file for it
      if (recorded === path && target !== path) {
        replacements.set(path, target);
      }
    }
    const relinked = await relinkStylesheets(cachedPages, replacements, config.site.baseUrl);
    if (relinked > 0) {
      logger.info(
        `Updated the stylesheet links of ${relinked} cached page${relinked === 1 ? '' : 's'}`,
      );
    }

    for (const [path, name] of current) {
      if (path !== renderStylesheet?.plan.path && name !== path) {
        logger.info(`Linked ${path} as ${name}`);
      }
    }
    if (current.size > 0) {
      manifest.stylesheets = Object.fromEntries(current);
    } else {
      delete manifest.stylesheets;
    }
  } else if (!isDevMode) {
    delete manifest.stylesheets;
  }

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
    // Hashed copies other than the ones this build links. A stylesheet this build doesn't
    // hash, after a change of --tailwind-output, without the flags or with css.hash false,
    // loses every copy: its pages linked the new name above or were rendered again.
    const currentStylesheets = manifest.stylesheets ?? {};
    const stylesheetPaths = new Set([
      ...Object.keys(previousStylesheets),
      ...Object.keys(currentStylesheets),
      ...(renderStylesheet ? [renderStylesheet.plan.path] : []),
    ]);
    for (const path of stylesheetPaths) {
      await removeStaleStylesheets(outDir, path, currentStylesheets[path]);
    }
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
    assetsCount = await copyStaticAssets(config, outDir, logger, stylesheetPlan?.outputFile);
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
