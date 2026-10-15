/**
 * SEO processing type definitions
 */

import type { PageModel } from './content.js';
import type { StatiConfig } from './config.js';
import type { Logger } from './logging.js';
import type { GeneratedOgImage } from './images.js';

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
  /** Logger for debug output */
  logger: Logger;
  /** Set of tag types to exclude from generation (blacklist mode) */
  exclude?: Set<SEOTagType>;
  /** Set of tag types to include in generation (whitelist mode) */
  include?: Set<SEOTagType>;
  /** Open Graph image generated for the page, used when front matter sets none */
  generatedImage?: GeneratedOgImage | undefined;
  /**
   * The page's image is generated but not known yet, as when a partial calls
   * `stati.generateSEO()` before the image exists: emit placeholders that rendering
   * replaces once it is known.
   */
  deferGeneratedImage?: boolean | undefined;
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
