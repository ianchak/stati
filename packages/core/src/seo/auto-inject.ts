/**
 * Automatic SEO tag injection utilities
 * @module seo/auto-inject
 */

import type { PageModel } from '../types/content.js';
import type { StatiConfig } from '../types/config.js';
import type { SEOContext } from '../types/seo.js';
import { detectExistingSEOTags } from './utils.js';
import { generateSEOMetadata } from './generator.js';

/**
 * Options for auto-injection
 */
export interface AutoInjectOptions {
  /** Page model with frontmatter and metadata */
  page: PageModel;
  /** Site configuration */
  config: StatiConfig;
  /** Site base URL */
  siteUrl: string;
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Finds the position to inject SEO tags (before </head>)
 * @param html - HTML content
 * @returns Position index or -1 if not found
 */
function findHeadClosePosition(html: string): number {
  // Case-insensitive search for </head>
  const match = html.match(/<\/head>/i);
  return match ? (match.index ?? -1) : -1;
}

/**
 * Automatically injects SEO metadata into HTML if not already present
 * @param html - Rendered HTML content
 * @param options - Auto-injection options
 * @returns HTML with injected SEO tags
 *
 * @example
 * ```typescript
 * const html = '<html><head><title>Page</title></head><body>Content</body></html>';
 * const enhanced = autoInjectSEO(html, {
 *   page: pageModel,
 *   config: statiConfig,
 *   siteUrl: 'https://example.com'
 * });
 * // Returns HTML with additional SEO meta tags injected
 * ```
 */
export function autoInjectSEO(html: string, options: AutoInjectOptions): string {
  const { page, config, siteUrl, debug } = options;

  // Check if auto-injection is enabled (default: true)
  const autoInjectEnabled = config.seo?.autoInject !== false;

  if (!autoInjectEnabled) {
    if (debug || config.seo?.debug) {
      console.warn(`[SEO Auto-Inject] Skipped for ${page.url} (disabled in config)`);
    }
    return html;
  }

  // Detect existing SEO tags in the HTML
  const existingTags = detectExistingSEOTags(html);

  if (debug || config.seo?.debug) {
    console.warn(`[SEO Auto-Inject] Existing tags in ${page.url}:`, Array.from(existingTags));
  }

  // Build context with optional exclude parameter
  const context: SEOContext = {
    page,
    config,
    siteUrl,
  };

  // Only add exclude if we have existing tags
  if (existingTags.size > 0) {
    context.exclude = existingTags;
  }

  // Generate SEO metadata excluding existing tags
  const seoMetadata = generateSEOMetadata(context);

  // If no SEO metadata was generated (all tags exist), return original HTML
  if (!seoMetadata || seoMetadata.trim().length === 0) {
    if (debug || config.seo?.debug) {
      console.warn(`[SEO Auto-Inject] No tags to inject for ${page.url} (all exist)`);
    }
    return html;
  }

  // Find position to inject (before </head>)
  const headClosePos = findHeadClosePosition(html);

  if (headClosePos === -1) {
    if (debug || config.seo?.debug) {
      console.warn(`[SEO Auto-Inject] No </head> tag found in ${page.url}, skipping injection`);
    }
    return html;
  }

  // Inject SEO metadata before </head>
  const before = html.substring(0, headClosePos);
  const after = html.substring(headClosePos);

  // Add proper indentation (2 spaces) and newline
  const injected = `${before}  ${seoMetadata}\n${after}`;

  if (debug || config.seo?.debug) {
    console.warn(
      `[SEO Auto-Inject] Injected ${existingTags.size === 0 ? 'all' : 'missing'} SEO tags into ${page.url}`,
    );
  }

  return injected;
}

/**
 * Checks if auto-injection is enabled for a page
 * @param config - Site configuration
 * @param _page - Page model (reserved for future page-level overrides)
 * @returns true if auto-injection should run
 */
export function shouldAutoInject(config: StatiConfig, _page: PageModel): boolean {
  // Check global config
  const globalEnabled = config.seo?.autoInject !== false;

  // Check page-level override (if we add this feature in the future)
  // const pageOverride = page.frontMatter.seo?.autoInject;
  // if (pageOverride !== undefined) {
  //   return pageOverride;
  // }

  return globalEnabled;
}
