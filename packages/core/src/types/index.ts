/**
 * Centralized exports for all type definitions
 * This file provides a single entry point for importing types
 */

// ISG types
export type { AgingRule, ISGConfig, CacheEntry, CacheManifest } from './isg.js';

// Configuration types
export type {
  SiteConfig,
  StatiConfig,
  BuildContext,
  PageContext,
  BuildHooks,
  BuildStats,
  SEOConfig,
  RobotsTxtConfig,
} from './config.js';

// Content types
export type {
  FrontMatter,
  PageModel,
  CollectionData,
  TemplateContext,
  SEOMetadata,
  SitemapMetadata,
  RobotsConfig,
  OpenGraphConfig,
  OpenGraphImage,
  OpenGraphArticle,
  TwitterCardConfig,
  AuthorConfig,
} from './content.js';

// SEO types
export type { SEOContext, SEOValidationResult } from './seo.js';
export { SEOTagType } from './seo.js';

// Sitemap types
export type {
  ChangeFrequency,
  SitemapEntry,
  SitemapConfig,
  SitemapGenerationResult,
} from './sitemap.js';

// Navigation types
export type { NavNode } from './navigation.js';

// Logging types
export type { Logger } from './logging.js';
