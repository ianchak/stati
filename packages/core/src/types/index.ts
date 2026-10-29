/**
 * Centralized exports for all type definitions
 * This file provides a single entry point for importing types
 */

// ISG types
export type { AgingRule, ISGConfig, CacheEntry, CacheManifest, TemplateLookup } from './isg.js';

// Configuration types
export type {
  SiteConfig,
  StatiConfig,
  StatiHelpers,
  BuildContext,
  PageContext,
  BuildHooks,
  BuildStats,
  SEOConfig,
  SEOTwitterConfig,
  SEOArticlesConfig,
  RobotsTxtConfig,
  TypeScriptConfig,
  CSSConfig,
  BundleConfig,
  CollectionsConfig,
  ReadingTimeConfig,
  GeneratedPageEntry,
} from './config.js';

// Markdown types: the markdown-it instance that markdown.configure receives
export type { MarkdownIt } from 'markdown-it';

// Content types
export type {
  FrontMatter,
  PageModel,
  CollectionData,
  RelatedPagesOptions,
  PaginationData,
  GeneratedPageData,
  PaginateOptions,
  GenerateOptions,
  TemplateContext,
  TemplateIncludeFunction,
  TemplateLayoutFunction,
  SEOMetadata,
  SitemapMetadata,
  RobotsConfig,
  OpenGraphConfig,
  OpenGraphImage,
  OpenGraphArticle,
  TwitterCardConfig,
  AuthorConfig,
  StatiAssets,
  TocEntry,
} from './content.js';

// SEO types
export type { SEOContext, SEOValidationResult } from './seo.js';
export { SEOTagType } from './seo.js';

// Sitemap types
export type {
  ChangeFrequency,
  SitemapEntry,
  SitemapConfig,
  NewsSitemapConfig,
  NewsSitemapGenerationResult,
  SitemapGenerationResult,
} from './sitemap.js';

// RSS types
export type { RSSConfig, RSSFeedConfig, RSSGenerationResult } from './rss.js';

// Search types
export type { SearchConfig, SearchDocument, SearchIndex, SearchIndexMetadata } from './search.js';

// Navigation types
export type { NavNode } from './navigation.js';

// Image types
export type {
  ImagesConfig,
  ResponsiveImagesConfig,
  OgImagesConfig,
  OgImageFontConfig,
  ImagesQualityConfig,
  ImageVariantFormat,
  ImageOutputFormat,
  ImageSourceFormat,
  ImageProvider,
  VariantRequest,
  VariantOutput,
  OgImageRequest,
  OgFont,
  OgDefaults,
  GeneratedOgImage,
} from './images.js';

// Logging types
export type { Logger } from './logging.js';
