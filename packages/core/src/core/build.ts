import { ensureDir, writeFile, remove, pathExists, stat, readdir, copyFile } from './utils/fs.js';
import { join, dirname, relative } from 'path';
import { posix } from 'path';
import { loadConfig } from '../config/loader.js';
import { loadContent } from './content.js';
import { createMarkdownProcessor, renderMarkdown } from './markdown.js';
import { createTemplateEngine, renderPage } from './templates.js';
import { buildNavigation } from './navigation.js';
import { loadCacheManifest, saveCacheManifest } from './isg/manifest.js';
import { shouldRebuildPage, createCacheEntry, updateCacheEntry } from './isg/builder.js';
import { withBuildLock } from './isg/build-lock.js';
import type { BuildContext, BuildStats, Logger } from '../types.js';
import { resolveOutDir, resolveStaticDir, resolveCacheDir } from './utils/paths.js';

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
 * Formats build statistics for display with prettier output.
 *
 * @param stats - Build statistics to format
 * @returns Formatted statistics string
 */
function formatBuildStats(stats: BuildStats): string {
  const sizeKB = (stats.outputSizeBytes / 1024).toFixed(1);
  const timeSeconds = (stats.buildTimeMs / 1000).toFixed(2);

  let output =
    `Build Statistics:
┌─────────────────────────────────────────┐
│  Build time: ${timeSeconds}s`.padEnd(41) + '│';
  output += `\n│  📄 Pages built: ${stats.totalPages}`.padEnd(42) + '│';
  output += `\n│  📦 Assets copied: ${stats.assetsCount}`.padEnd(42) + '│';
  output += `\n│  Output size: ${sizeKB} KB`.padEnd(42) + '│';

  if (stats.cacheHits !== undefined && stats.cacheMisses !== undefined) {
    const totalCacheRequests = stats.cacheHits + stats.cacheMisses;
    const hitRate =
      totalCacheRequests > 0 ? ((stats.cacheHits / totalCacheRequests) * 100).toFixed(1) : '0';
    output +=
      `\n│  Cache hits: ${stats.cacheHits}/${totalCacheRequests} (${hitRate}%)`.padEnd(42) + '│';
  }

  output += '\n└─────────────────────────────────────────┘';

  return output;
}

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
 * Internal build implementation without locking.
 * Separated for cleaner error handling and testing.
 */
async function buildInternal(options: BuildOptions = {}): Promise<BuildStats> {
  const buildStartTime = Date.now();
  const logger = options.logger || defaultLogger;

  logger.building('Building your site...');
  console.log(); // Add spacing after build start

  // Load configuration
  const config = await loadConfig(options.configPath ? dirname(options.configPath) : process.cwd());
  const outDir = resolveOutDir(config);

  // Create .stati cache directory
  const cacheDir = resolveCacheDir();
  await ensureDir(cacheDir);

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

  // Initialize cache stats
  let cacheHits = 0;
  let cacheMisses = 0;

  // Clean output directory if requested
  if (options.clean) {
    logger.info('Cleaning output directory...');
    await remove(outDir);
  }

  await ensureDir(outDir);

  // Load all content
  const pages = await loadContent(config, options.includeDrafts);
  logger.info(`📄 Found ${pages.length} pages`);

  // Build navigation from pages
  console.log(); // Add spacing before navigation step
  if (logger.step) {
    logger.step(1, 3, 'Building navigation');
  }
  const navigation = buildNavigation(pages);
  logger.info(`Built navigation with ${navigation.length} top-level items`);

  // Display navigation tree if the logger supports it
  if (logger.navigationTree) {
    logger.navigationTree(navigation);
  } // Create processors
  const md = await createMarkdownProcessor(config);
  const eta = createTemplateEngine(config);

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

  const buildTime = new Date();

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
    const finalHtml = await renderPage(page, htmlContent, config, eta, navigation, pages);

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
    console.log(); // Add spacing
    logger.showRenderingTree();
    if (logger.clearRenderingTree) {
      logger.clearRenderingTree();
    }
  }

  // Save updated cache manifest
  await saveCacheManifest(cacheDir, manifest);

  // Copy static assets and count them
  let assetsCount = 0;
  const staticDir = resolveStaticDir(config);
  if (await pathExists(staticDir)) {
    console.log(); // Add spacing before asset copying
    if (logger.step) {
      logger.step(3, 3, 'Copying static assets');
    }
    logger.info(`Copying static assets from ${config.staticDir}`);
    assetsCount = await copyStaticAssetsWithLogging(staticDir, outDir, logger);
    logger.info(`Copied ${assetsCount} static assets`);
  }

  // Run afterAll hook
  if (config.hooks?.afterAll) {
    await config.hooks.afterAll(buildContext);
  }

  // Calculate build statistics
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

  console.log(); // Add spacing before statistics
  // Use table format if available, otherwise fall back to formatted string
  if (logger.statsTable) {
    logger.statsTable(buildStats);
  } else {
    logger.stats(formatBuildStats(buildStats));
  }

  return buildStats;
}
