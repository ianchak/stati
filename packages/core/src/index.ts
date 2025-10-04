/**
 * @fileoverview @stati/core - Core engine for Stati static site generator
 *
 * @example
 * ```typescript
 * import { build, loadConfig, defineConfig } from '@stati/core';
 *
 * // Define configuration with TypeScript support
 * export default defineConfig({
 *   site: {
 *     title: 'My Site',
 *     baseUrl: 'https://example.com',
 *   },
 *   // ... other config options
 * });
 *
 * // Load configuration and build site
 * const config = await loadConfig();
 * await build({ clean: true });
 * ```
 */

export type {
  StatiConfig,
  PageModel,
  FrontMatter,
  BuildContext,
  PageContext,
  BuildHooks,
  NavNode,
  ISGConfig,
  AgingRule,
  BuildStats,
} from './types/index.js';

// SEO and Sitemap types
export type {
  SEOMetadata,
  SEOConfig,
  SEOContext,
  SEOValidationResult,
  SEOTagType,
  RobotsConfig,
  OpenGraphConfig,
  OpenGraphImage,
  OpenGraphArticle,
  TwitterCardConfig,
  AuthorConfig,
} from './types/index.js';

export type {
  SitemapConfig,
  SitemapEntry,
  SitemapGenerationResult,
  ChangeFrequency,
} from './types/index.js';

export type { BuildOptions } from './core/build.js';
export type { DevServerOptions } from './core/dev.js';
export type { PreviewServerOptions } from './core/preview.js';
export type { InvalidationResult } from './core/invalidate.js';

export { build } from './core/build.js';
export { createDevServer } from './core/dev.js';
export { createPreviewServer } from './core/preview.js';
export { loadConfig } from './config/loader.js';
export { invalidate } from './core/invalidate.js';
export { setEnv, getEnv } from './env.js';

// SEO and Sitemap functions
export {
  generateSEOMetadata,
  generateSEO,
  generateOpenGraphTags,
  generateTwitterCardTags,
} from './seo/generator.js';
export {
  generateSitemap,
  generateSitemapEntry,
  generateSitemapXml,
  generateSitemapIndexXml,
} from './seo/sitemap.js';
export { generateRobotsTxt, generateRobotsTxtFromConfig } from './seo/robots.js';
export {
  escapeHtml,
  sanitizeStructuredData,
  generateRobotsContent,
  validateSEOMetadata,
  detectExistingSEOTags,
} from './seo/utils.js';
export { autoInjectSEO, shouldAutoInject } from './seo/auto-inject.js';

// Import for implementation use
import type { StatiConfig } from './types/index.js';

/**
 * Helper function for defining Stati configuration with TypeScript IntelliSense.
 * Provides type checking and autocompletion for configuration options.
 *
 * @param config - The Stati configuration object
 * @returns The same configuration object with proper typing
 *
 * @example
 * ```typescript
 * import { defineConfig } from '@stati/core';
 *
 * export default defineConfig({
 *   site: {
 *     title: 'My Blog',
 *     baseUrl: 'https://myblog.com',
 *   },
 *   srcDir: 'content',
 *   outDir: 'public',
 *   isg: {
 *     enabled: true,
 *     ttlSeconds: 3600,
 *   },
 *   hooks: {
 *     beforeAll: async (ctx) => {
 *       console.log(`Building ${ctx.pages.length} pages`);
 *     },
 *   },
 * });
 * ```
 */
export function defineConfig(config: StatiConfig): StatiConfig {
  return config;
}
