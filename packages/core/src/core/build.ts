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
  autoInjectBundle,
} from './utils/index.js';
import type { CompileResult } from './utils/index.js';
import { join, dirname, relative, posix } from 'node:path';
import { loadConfig } from '../config/loader.js';
import { loadContent } from './content.js';
import { createMarkdownProcessor, renderMarkdown } from './markdown.js';
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
import { getEnv } from '../env.js';
import { DEFAULT_TS_OUT_DIR } from '../constants.js';
import type {
  BuildContext,
  BuildStats,
  Logger,
  StatiConfig,
  CacheManifest,
  PageModel,
  NavNode,
  StatiAssets,
} from '../types/index.js';

/**
 * Options for customizing the build process.
 *
 * @example
 * ```typescript
 * const options: BuildOptions = {
 *   force: true,        // Force rebuild of all pages
 *   clean: true,        // Clean output directory before build
 *   configPath: './custom.config.js',  // Custom config file path
 *   includeDrafts: true, // Include draft pages in build
 *   version: '1.0.0'    // Version to display in build messages
 * };
 * ```
 */
export interface BuildOptions {
  /** Force rebuild of all pages, ignoring cache */
  force?: boolean;
  /** Clean the output directory before building */
  clean?: boolean;
  /** Path to a custom configuration file */
  configPath?: string;
  /** Include draft pages in the build */
  includeDrafts?: boolean;
  /** Custom logger for build output */
  logger?: Logger;
  /** Version information to display in build messages */
  version?: string;
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
): Promise<number> {
  let filesCopied = 0;

  if (!(await pathExists(sourceDir))) {
    return 0;
  }

  const items = await readdir(sourceDir, { withFileTypes: true });

  for (const item of items) {
    const sourcePath = join(sourceDir, item.name);
    const destPath = join(destDir, basePath, item.name);
    const relativePath = posix.normalize(posix.join(basePath, item.name));

    if (item.isDirectory()) {
      // Recursively copy directories
      await ensureDir(destPath);
      filesCopied += await copyStaticAssetsWithLogging(sourcePath, destPath, logger, relativePath);
    } else {
      // Copy individual files
      await ensureDir(dirname(destPath));
      await copyFile(sourcePath, destPath);
      if (logger.file) {
        logger.file('copy', relativePath);
      } else {
        logger.processing(`📄 ${relativePath}`);
      }
      filesCopied++;
    }
  }

  return filesCopied;
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
 * @returns Promise resolving to build statistics
 * @throws {Error} When configuration is invalid
 * @throws {Error} When template rendering fails
 * @throws {Error} When build lock cannot be acquired
 *
 * @example
 * ```typescript
 * const stats = await build({
 *   force: true,
 *   clean: true,
 *   includeDrafts: false
 * });
 * console.log(`Built ${stats.pageCount} pages in ${stats.buildTime}ms`);
 * ```
 */
export async function build(options: BuildOptions = {}): Promise<BuildStats> {
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
  md: import('markdown-it').default;
  eta: ReturnType<typeof createTemplateEngine>;
  navigationHash: string;
}> {
  // Load all content
  const pages = await loadContent(config, options.includeDrafts);
  logger.info(`📄 Found ${pages.length} pages`);

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
 * Processes pages with ISG caching logic.
 */
async function processPagesWithCache(
  pages: PageModel[],
  manifest: CacheManifest,
  config: StatiConfig,
  outDir: string,
  md: import('markdown-it').default,
  eta: ReturnType<typeof createTemplateEngine>,
  navigation: NavNode[],
  buildTime: Date,
  options: BuildOptions,
  logger: Logger,
  assets?: StatiAssets,
): Promise<{ cacheHits: number; cacheMisses: number }> {
  let cacheHits = 0;
  let cacheMisses = 0;

  // Build context
  const buildContext: BuildContext = { config, pages };

  // Run beforeAll hook
  if (config.hooks?.beforeAll) {
    await config.hooks.beforeAll(buildContext);
  }

  // Render each page with tree-based progress tracking and ISG
  if (logger.step) {
    logger.step(2, 3, 'Rendering pages');
  }

  // Initialize rendering tree
  if (logger.startRenderingTree) {
    logger.startRenderingTree('Page Rendering Process');
  }

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    if (!page) continue; // Safety check

    const pageId = `page-${i}`;

    // Add page to rendering tree
    if (logger.addTreeNode) {
      logger.addTreeNode('root', pageId, page.url, 'running', { url: page.url });
    } else {
      logger.processing(`Checking ${page.url}`);
    }

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
      if (logger.updateTreeNode) {
        logger.updateTreeNode(pageId, 'cached', { cacheHit: true, url: page.url });
      } else {
        logger.processing(`📋 Cached ${page.url}`);
      }
      continue;
    }

    // Cache miss - need to rebuild
    cacheMisses++;
    const startTime = Date.now();

    // Add rendering substeps to tree
    const markdownId = `${pageId}-markdown`;
    const templateId = `${pageId}-template`;

    if (logger.addTreeNode) {
      logger.addTreeNode(pageId, markdownId, 'Processing Markdown', 'running');
      logger.addTreeNode(pageId, templateId, 'Applying Template', 'pending');
    }

    // Run beforeRender hook
    if (config.hooks?.beforeRender) {
      await config.hooks.beforeRender({ page, config });
    }

    // Render markdown to HTML
    const htmlContent = renderMarkdown(page.content, md);

    if (logger.updateTreeNode) {
      logger.updateTreeNode(markdownId, 'completed');
      logger.updateTreeNode(templateId, 'running');
    }

    // Render with template
    let finalHtml = await renderPage(page, htmlContent, config, eta, navigation, pages, assets);

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

    // Auto-inject TypeScript bundle script tag if available
    if (assets?.bundlePath) {
      finalHtml = autoInjectBundle(finalHtml, assets.bundlePath);
    }

    const renderTime = Date.now() - startTime;

    if (logger.updateTreeNode) {
      logger.updateTreeNode(templateId, 'completed');
      logger.updateTreeNode(pageId, 'completed', {
        timing: renderTime,
        url: page.url,
      });
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

    // Run afterRender hook
    if (config.hooks?.afterRender) {
      await config.hooks.afterRender({ page, config });
    }
  }

  // Display final rendering tree and clear it
  if (logger.showRenderingTree) {
    logger.showRenderingTree();
    if (logger.clearRenderingTree) {
      logger.clearRenderingTree();
    }
  }

  return { cacheHits, cacheMisses };
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
  const assetsCount = await copyStaticAssetsWithLogging(staticDir, outDir, logger);
  logger.info(`Copied ${assetsCount} static assets`);

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
async function buildInternal(options: BuildOptions = {}): Promise<BuildStats> {
  const buildStartTime = Date.now();
  const logger = options.logger || defaultLogger;

  logger.building('Building your site...');

  // Load configuration
  const { config, outDir, cacheDir } = await loadAndValidateConfig(options);

  // Initialize cache stats
  let cacheHits = 0;
  let cacheMisses = 0;

  // Clean output directory and cache if requested
  if (options.clean) {
    logger.info('Cleaning output directory and ISG cache...');
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
      logger.info(`📦 Loaded ${loadedCount} classes from previous build for Tailwind scanner`);
    } else {
      // No previous inventory found - write an empty placeholder file
      // This ensures Tailwind has a file to scan even on first build
      // It will be populated with actual classes after template rendering
      await writeTailwindClassInventory(cacheDir);
      logger.info(
        `📦 Created inventory file for Tailwind scanner (will be populated after rendering)`,
      );
    }
  }

  // Load cache manifest for ISG (after potential clean operation)
  const { manifest } = await setupCacheAndManifest(cacheDir);

  // Load content and build navigation
  if (logger.step) {
    console.log(); // Add spacing before content loading
  }
  const { pages, navigation, md, eta, navigationHash } = await loadContentAndBuildNavigation(
    config,
    options,
    logger,
  );

  // Store navigation hash in manifest for change detection in dev server
  manifest.navigationHash = navigationHash;

  // Compile TypeScript if enabled
  let tsResult: CompileResult | undefined;
  let assets: StatiAssets | undefined;

  if (config.typescript?.enabled) {
    tsResult = await compileTypeScript({
      projectRoot: process.cwd(),
      config: config.typescript,
      outDir: config.outDir || 'dist',
      mode: getEnv() === 'development' ? 'development' : 'production',
      logger,
    });

    if (tsResult?.bundleFilename) {
      const assetsDir = config.typescript.outDir || DEFAULT_TS_OUT_DIR;
      assets = {
        bundleName: tsResult.bundleFilename,
        bundlePath: posix.join('/', assetsDir, tsResult.bundleFilename),
      };
    }
  }

  // Process pages with ISG caching logic
  if (logger.step) {
    console.log(); // Add spacing before page processing
  }
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
    assets,
  );
  cacheHits = pageProcessingResult.cacheHits;
  cacheMisses = pageProcessingResult.cacheMisses;

  // Write Tailwind class inventory after all templates have been rendered (if Tailwind is used)
  if (hasTailwind) {
    const inventorySize = getInventorySize();
    if (inventorySize > 0) {
      await writeTailwindClassInventory(cacheDir);
      logger.info(`📝 Generated Tailwind class inventory (${inventorySize} classes tracked)`);
    }

    // Disable inventory tracking after build
    disableInventoryTracking();
  }

  // Save updated cache manifest
  await saveCacheManifest(cacheDir, manifest);

  // Copy static assets and count them
  let assetsCount = 0;
  assetsCount = await copyStaticAssets(config, outDir, logger);

  // Get current environment
  const currentEnv = getEnv();

  // Generate sitemap if enabled (only in production mode)
  if (config.sitemap?.enabled && currentEnv === 'production') {
    if (logger.step) {
      console.log(); // Add spacing before sitemap generation
    }
    logger.info('Generating sitemap...');

    const sitemapResult = generateSitemap(pages, config, config.sitemap);
    await writeFile(join(outDir, 'sitemap.xml'), sitemapResult.xml);

    // Write additional sitemap files if split
    if (sitemapResult.sitemaps) {
      for (const { filename, xml } of sitemapResult.sitemaps) {
        await writeFile(join(outDir, filename), xml);
      }
      logger.success(
        `Generated sitemap index with ${sitemapResult.sitemaps.length} sitemaps (${sitemapResult.entryCount} entries)`,
      );
    } else {
      logger.success(`Generated sitemap with ${sitemapResult.entryCount} entries`);
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

    logger.success('Generated robots.txt');
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
    await config.hooks.afterAll({ config, pages });
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

  return buildStats;
}
