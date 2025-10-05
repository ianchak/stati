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
} from './generator.js';

// Sitemap generation
export {
  generateSitemap,
  generateSitemapEntry,
  generateSitemapXml,
  generateSitemapIndexXml,
} from './sitemap.js';

// Robots.txt generation
export { generateRobotsTxt, generateRobotsTxtFromConfig } from './robots.js';

// Auto-injection
export { autoInjectSEO, shouldAutoInject } from './auto-inject.js';
export type { AutoInjectOptions } from './auto-inject.js';

// SEO utilities
export {
  escapeHtml,
  generateRobotsContent,
  validateSEOMetadata,
  detectExistingSEOTags,
  normalizeUrlPath,
  resolveAbsoluteUrl,
  isValidUrl,
} from './utils/index.js';
