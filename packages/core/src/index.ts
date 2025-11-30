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
  BundleConfig,
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

// RSS types
export type { RSSConfig, RSSFeedConfig, RSSGenerationResult } from './types/index.js';

// Re-export core functionality from barrel
export type {
  BuildOptions,
  DevServerOptions,
  PreviewServerOptions,
  InvalidationResult,
} from './core/index.js';
export { build, createDevServer, createPreviewServer, invalidate } from './core/index.js';

// Re-export SEO functionality from barrel
export type { AutoInjectOptions } from './seo/index.js';
export {
  generateSEOMetadata,
  generateSEO,
  generateOpenGraphTags,
  generateTwitterCardTags,
  generateSitemap,
  generateSitemapEntry,
  generateSitemapXml,
  generateSitemapIndexXml,
  generateRobotsTxt,
  generateRobotsTxtFromConfig,
  escapeHtml,
  generateRobotsContent,
  validateSEOMetadata,
  detectExistingSEOTags,
  normalizeUrlPath,
  resolveAbsoluteUrl,
  isValidUrl,
  autoInjectSEO,
  shouldAutoInject,
} from './seo/index.js';

// Re-export RSS functionality
export type { RSSValidationResult } from './rss/index.js';
export {
  generateRSSFeed,
  generateRSSFeeds,
  validateRSSConfig,
  validateRSSFeedConfig,
} from './rss/index.js';

// Re-export config and env utilities
export { loadConfig } from './config/loader.js';
export { setEnv, getEnv } from './env.js';

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
