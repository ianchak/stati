import { ensureDir, writeFile, copy, remove, pathExists } from 'fs-extra';
import { join, dirname } from 'path';
import { loadConfig } from '../config/loader.js';
import { loadContent } from './content.js';
import { createMarkdownProcessor, renderMarkdown } from './markdown.js';
import { createTemplateEngine, renderPage } from './templates.js';
import type { BuildContext } from '../types.js';

/**
 * Options for customizing the build process.
 *
 * @example
 * ```typescript
 * const options: BuildOptions = {
 *   force: true,        // Force rebuild of all pages
 *   clean: true,        // Clean output directory before build
 *   configPath: './custom.config.js'  // Custom config file path
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
export async function build(options: BuildOptions = {}): Promise<void> {
  console.log('🏗️  Building site...');

  // Load configuration
  const config = await loadConfig(options.configPath ? dirname(options.configPath) : process.cwd());
  const outDir = join(process.cwd(), config.outDir!);

  // Clean output directory if requested
  if (options.clean) {
    console.log('🧹 Cleaning output directory...');
    await remove(outDir);
  }

  await ensureDir(outDir);

  // Load all content
  const pages = await loadContent(config);
  console.log(`📄 Found ${pages.length} pages`);

  // Create processors
  const md = createMarkdownProcessor(config);
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
    const finalHtml = await renderPage(page, htmlContent, config, eta);

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

  // Copy static assets
  const staticDir = join(process.cwd(), config.staticDir!);
  if (await pathExists(staticDir)) {
    await copy(staticDir, outDir, { overwrite: true });
    console.log('📦 Copied static assets');
  }

  // Run afterAll hook
  if (config.hooks?.afterAll) {
    await config.hooks.afterAll(buildContext);
  }

  console.log('✅ Build complete!');
}
