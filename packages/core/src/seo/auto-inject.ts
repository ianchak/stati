/**
 * Automatic SEO tag injection utilities
 * @module seo/auto-inject
 */

import type { PageModel } from '../types/content.js';
import type { StatiConfig } from '../types/config.js';
import type { SEOContext } from '../types/seo.js';
import type { Logger } from '../types/logging.js';
import { detectExistingSEOTags } from './utils/index.js';
import { generateSEOMetadata } from './generator.js';
import { injectBeforeHeadClose } from '../core/index.js';

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
  /** Logger for debug output */
  logger: Logger;
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Helper function to conditionally log debug messages for SEO auto-injection.
 * Checks both the explicit debug flag and the config-level debug setting.
 *
 * @param message - Debug message to log
 * @param options - Object containing debug flag, config, and logger
 */
function logDebug(
  message: string,
  options: { debug: boolean | undefined; config: StatiConfig; logger: Logger },
): void {
  if (options.debug || options.config.seo?.debug) {
    const logMessage = `[SEO Auto-Inject] ${message}`;
    options.logger.warning(logMessage);
  }
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
  const { page, config, siteUrl, debug, logger } = options;

  // Check if auto-injection is enabled (default: true)
  const autoInjectEnabled = config.seo?.autoInject !== false;

  if (!autoInjectEnabled) {
    logDebug(`Skipped for ${page.url} (disabled in config)`, { debug, config, logger });
    return html;
  }

  // Detect existing SEO tags in the HTML
  const existingTags = detectExistingSEOTags(html);

  logDebug(`Existing tags in ${page.url}: ${Array.from(existingTags).join(', ')}`, {
    debug,
    config,
    logger,
  });

  // Build context with optional exclude parameter and logger
  const context: SEOContext = {
    page,
    config,
    siteUrl,
    logger,
  };

  // Only add exclude if we have existing tags
  if (existingTags.size > 0) {
    context.exclude = existingTags;
  }

  // Generate SEO metadata excluding existing tags
  const seoMetadata = generateSEOMetadata(context);

  // If no SEO metadata was generated (all tags exist), return original HTML
  if (!seoMetadata || seoMetadata.trim().length === 0) {
    logDebug(`No tags to inject for ${page.url} (all exist)`, { debug, config, logger });
    return html;
  }

  // Inject SEO metadata before </head>
  const injected = injectBeforeHeadClose(html, seoMetadata);

  // Check if injection was successful (</head> was found)
  if (injected === html) {
    logDebug(`No </head> tag found in ${page.url}, skipping injection`, { debug, config, logger });
    return html;
  }

  logDebug(`Injected ${existingTags.size === 0 ? 'all' : 'missing'} SEO tags into ${page.url}`, {
    debug,
    config,
    logger,
  });

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

  return globalEnabled;
}
