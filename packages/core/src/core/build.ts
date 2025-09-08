import fse from 'fs-extra';
const { ensureDir, writeFile, copy, remove, pathExists, stat, readdir } = fse;
import { join, dirname } from 'path';
import { loadConfig } from '../config/loader.js';
import { loadContent } from './content.js';
import { createMarkdownProcessor, renderMarkdown } from './markdown.js';
import { createTemplateEngine, renderPage } from './templates.js';
import { buildNavigation } from './navigation.js';
import type { BuildContext, BuildStats } from '../types.js';

/**
 * Options for customizing the build process.
 *
 * @example
 * ```typescript
 * const options: BuildOptions = {
 *   force: true,        // Force rebuild of all pages
 *   clean: true,        // Clean output directory before build
 *   configPath: './custom.config.js',  // Custom config file path
 *   includeDrafts: true // Include draft pages in build
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
 * Counts the number of files in a directory recursively.
 * Used for build statistics.
 *
 * @param dirPath - Path to the directory
 * @returns Total number of files
 */
async function countFilesInDirectory(dirPath: string): Promise<number> {
  if (!(await pathExists(dirPath))) {
    return 0;
  }

  let fileCount = 0;
  const items = await readdir(dirPath, { withFileTypes: true });

  for (const item of items) {
    const itemPath = join(dirPath, item.name);
    if (item.isDirectory()) {
      fileCount += await countFilesInDirectory(itemPath);
    } else {
      fileCount++;
    }
  }

  return fileCount;
}

/**
 * Formats build statistics for display.
 *
 * @param stats - Build statistics to format
 * @returns Formatted statistics string
 */
function formatBuildStats(stats: BuildStats): string {
  const sizeKB = (stats.outputSizeBytes / 1024).toFixed(1);
  const timeSeconds = (stats.buildTimeMs / 1000).toFixed(2);

  let output = `📊 Build Statistics:
  ⏱️  Build time: ${timeSeconds}s
  📄 Pages built: ${stats.totalPages}
  📦 Assets copied: ${stats.assetsCount}
  💾 Output size: ${sizeKB} KB`;

  if (stats.cacheHits !== undefined && stats.cacheMisses !== undefined) {
    const totalCacheRequests = stats.cacheHits + stats.cacheMisses;
    const hitRate =
      totalCacheRequests > 0 ? ((stats.cacheHits / totalCacheRequests) * 100).toFixed(1) : '0';
    output += `
  🎯 Cache hits: ${stats.cacheHits}/${totalCacheRequests} (${hitRate}%)`;
  }

  return output;
}

/**
 * Builds the static site by processing content files and generating HTML pages.
 * This is the main entry point for Stati's build process.
 *
 * @param options - Build configuration options
 *
 * @example
 * ```typescript
 * import { build } from 'stati';
 *
 * // Basic build
 * await build();
 *
 * // Build with options
 * await build({
 *   clean: true,
 *   force: true,
 *   configPath: './custom.config.js'
 * });
 * ```
 *
 * @throws {Error} When configuration loading fails
 * @throws {Error} When content processing fails
 * @throws {Error} When template rendering fails
 */
export async function build(options: BuildOptions = {}): Promise<BuildStats> {
  const buildStartTime = Date.now();
  console.log('🏗️  Building site...');

  // Load configuration
  const config = await loadConfig(options.configPath ? dirname(options.configPath) : process.cwd());
  const outDir = join(process.cwd(), config.outDir!);

  // Create .stati cache directory
  const cacheDir = join(process.cwd(), '.stati');
  await ensureDir(cacheDir);

  // Clean output directory if requested
  if (options.clean) {
    console.log('🧹 Cleaning output directory...');
    await remove(outDir);
  }

  await ensureDir(outDir);

  // Load all content
  const pages = await loadContent(config, options.includeDrafts);
  console.log(`📄 Found ${pages.length} pages`);

  // Build navigation from pages
  const navigation = buildNavigation(pages);
  console.log(`🧭 Built navigation with ${navigation.length} top-level items`);

  // Create processors
  const md = await createMarkdownProcessor(config);
  const eta = createTemplateEngine(config);

  // Build context
  const buildContext: BuildContext = { config, pages };

  // Run beforeAll hook
  if (config.hooks?.beforeAll) {
    await config.hooks.beforeAll(buildContext);
  }

  // Render each page
  for (const page of pages) {
    console.log(`  Building ${page.url}`);

    // Run beforeRender hook
    if (config.hooks?.beforeRender) {
      await config.hooks.beforeRender({ page, config });
    }

    // Render markdown to HTML
    const htmlContent = renderMarkdown(page.content, md);

    // Render with template
    const finalHtml = await renderPage(page, htmlContent, config, eta, navigation, pages);

    // Determine output path - fix the logic here
    let outputPath: string;
    if (page.url === '/') {
      outputPath = join(outDir, 'index.html');
    } else if (page.url.endsWith('/')) {
      outputPath = join(outDir, page.url, 'index.html');
    } else {
      outputPath = join(outDir, `${page.url}.html`);
    }

    // Ensure directory exists and write file
    await ensureDir(dirname(outputPath));
    await writeFile(outputPath, finalHtml, 'utf-8');

    // Run afterRender hook
    if (config.hooks?.afterRender) {
      await config.hooks.afterRender({ page, config });
    }
  }

  // Copy static assets and count them
  let assetsCount = 0;
  const staticDir = join(process.cwd(), config.staticDir!);
  if (await pathExists(staticDir)) {
    await copy(staticDir, outDir, { overwrite: true });
    assetsCount = await countFilesInDirectory(staticDir);
    console.log(`📦 Copied ${assetsCount} static assets`);
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
    // Cache stats would be populated here when caching is implemented
    cacheHits: 0,
    cacheMisses: 0,
  };

  console.log('✅ Build complete!');
  console.log(formatBuildStats(buildStats));

  return buildStats;
}
