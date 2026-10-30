/**
 * @fileoverview SEO functionality exports
 * Barrel file for all Stati SEO functionality including metadata generation,
 * sitemaps, robots.txt, and auto-injection.
 */

// SEO metadata generation
export {
  generateSEOMetadata,
  generateSEO,
  generateOpenGraphTags,
  generateTwitterCardTags,
  generatedOgImageTags,
  resolveGeneratedImagePlaceholders,
} from './generator.js';

// Site-wide defaults: og:locale, Twitter handles and article metadata
export {
  applySEODefaults,
  refreshSEODefaults,
  resolveSEODefaults,
  isArticlePage,
  toOpenGraphLocale,
  toTwitterHandle,
  validateSEOConfig,
} from './defaults.js';

// Sitemap generation
export {
  generateSitemap,
  generateSitemapEntry,
  generateSitemapXml,
  generateSitemapIndexXml,
} from './sitemap.js';

// Google News sitemap
export {
  generateNewsSitemap,
  generateNewsSitemapXml,
  resolveNewsSitemapFilename,
  validateSitemapConfig,
} from './news-sitemap.js';

// Robots.txt generation
export { generateRobotsTxt, generateRobotsTxtFromConfig } from './robots.js';

// Auto-injection
export { autoInjectSEO, shouldAutoInject } from './auto-inject.js';
export type { AutoInjectOptions } from './auto-inject.js';

// SEO utilities
export {
  generateRobotsContent,
  validateSEOMetadata,
  detectExistingSEOTags,
} from './utils/index.js';

// Escaping and URL helpers, shared with the rest of Stati and public through this barrel
export {
  escapeHtml,
  normalizeUrlPath,
  resolveAbsoluteUrl,
  isValidUrl,
} from '../core/utils/index.js';
