/**
 * SEO processing type definitions
 */

import type { PageModel } from './content.js';
import type { StatiConfig } from './config.js';

/**
 * Enum for SEO tag types used in selective generation and detection.
 *
 * Used to control which SEO tags are generated or excluded during rendering.
 *
 * @example
 * ```typescript
 * // Generate only title and description
 * const include = new Set([SEOTagType.Title, SEOTagType.Description]);
 * generateSEOMetadata({ page, config, siteUrl, include });
 * ```
 */
export enum SEOTagType {
  /** HTML <title> tag */
  Title = 'title',
  /** Meta description tag */
  Description = 'description',
  /** Meta keywords tag */
  Keywords = 'keywords',
  /** Meta author tag */
  Author = 'author',
  /** Meta robots tag */
  Robots = 'robots',
  /** Canonical link tag */
  Canonical = 'canonical',
  /** Open Graph meta tags (og:*) */
  OpenGraph = 'opengraph',
  /** Twitter Card meta tags (twitter:*) */
  Twitter = 'twitter',
  /** JSON-LD structured data */
  StructuredData = 'structuredData',
}

/**
 * Context object for SEO metadata generation.
 * Contains all necessary information to generate SEO tags for a page.
 */
export interface SEOContext {
  /** The page to generate SEO metadata for */
  page: PageModel;
  /** Site configuration */
  config: StatiConfig;
  /** Base site URL (e.g., 'https://example.com') */
  siteUrl: string;
  /** Set of tag types to exclude from generation (blacklist mode) */
  exclude?: Set<SEOTagType>;
  /** Set of tag types to include in generation (whitelist mode) */
  include?: Set<SEOTagType>;
}

/**
 * Result of SEO metadata validation.
 * Contains validation status and any errors or warnings.
 */
export interface SEOValidationResult {
  /** Whether the SEO metadata is valid */
  valid: boolean;
  /** Array of validation errors (blocking issues) */
  errors: string[];
  /** Array of validation warnings (non-blocking recommendations) */
  warnings: string[];
}
