/**
 * SEO metadata generation module
 * Generates meta tags, Open Graph tags, Twitter Cards, and structured data
 */

import type { SEOContext } from '../types/seo.js';
import type { PageModel } from '../types/content.js';
import type { StatiConfig, SiteConfig } from '../types/config.js';
import type { Logger } from '../types/logging.js';
import { SEOTagType } from '../types/seo.js';
import {
  escapeHtml,
  validateSEOMetadata,
  generateRobotsContent,
  resolveAbsoluteUrl,
} from './utils/index.js';
import { sanitizeStructuredData } from './utils/escape-and-validation.utils.js';

/**
 * Generate complete SEO metadata for a page.
 * Supports both whitelist (include) and blacklist (exclude) modes for selective tag generation.
 *
 * Note: Validation errors are logged as warnings rather than throwing to allow builds to
 * continue with degraded SEO. This prevents a single SEO issue from blocking the entire build.
 *
 * @param ctx - SEO context containing page, config, siteUrl, and optional include/exclude sets
 * @returns HTML string containing all generated SEO tags
 *
 * @example
 * ```typescript
 * const seoTags = generateSEOMetadata({
 *   page,
 *   config,
 *   siteUrl: 'https://example.com',
 *   exclude: new Set([SEOTagType.Twitter]) // Skip Twitter tags
 * });
 * ```
 */
export function generateSEOMetadata(ctx: SEOContext): string {
  const { page, config, siteUrl, exclude, include, logger } = ctx;
  const seo = page.frontMatter.seo || {};

  // Validate SEO metadata
  const validation = validateSEOMetadata(seo, page.url);

  // Log validation errors as warnings instead of throwing
  // This allows builds to continue even with SEO issues
  if (!validation.valid) {
    logger.warning(`SEO validation failed for ${page.url}:`);
    validation.errors.forEach((error) => {
      logger.warning(`  - ${error}`);
    });
    if (config.seo?.debug) {
      logger.warning('Build will continue, but SEO metadata may be incomplete or invalid.');
    }
  }

  // Log warnings if any and debug is enabled
  if (validation.warnings.length > 0 && config.seo?.debug) {
    logger.warning(`SEO warnings for ${page.url}:`);
    validation.warnings.forEach((warning) => {
      logger.warning(`  - ${warning}`);
    });
  }

  const meta: string[] = [];

  /**
   * Helper function to determine if a specific tag type should be generated.
   *
   * Three modes:
   * 1. Whitelist mode (include set provided): Only generate tags in the include set
   * 2. Blacklist mode (exclude set provided): Generate all tags except those in exclude set
   * 3. Default mode (neither provided): Generate all tags
   *
   * @param tagType - The SEO tag type to check
   * @returns True if the tag should be generated
   */
  const shouldGenerate = (tagType: SEOTagType): boolean => {
    // Whitelist mode: only generate explicitly included tags
    if (include) {
      return include.has(tagType);
    }

    // Blacklist mode: generate unless explicitly excluded
    if (exclude) {
      return !exclude.has(tagType);
    }

    // Default: generate all tags
    return true;
  };

  // Title tag
  if (shouldGenerate(SEOTagType.Title)) {
    const title = seo.title || page.frontMatter.title || config.site.title;
    meta.push(`<title>${escapeHtml(title)}</title>`);
  }

  // Description meta tag
  if (shouldGenerate(SEOTagType.Description)) {
    const description = seo.description || page.frontMatter.description || config.site.description;
    if (description) {
      meta.push(`<meta name="description" content="${escapeHtml(description)}">`);
    }
  }

  // Keywords meta tag
  if (shouldGenerate(SEOTagType.Keywords)) {
    const keywords = seo.keywords || page.frontMatter.tags;
    if (keywords && keywords.length > 0) {
      const keywordsArray = Array.isArray(keywords) ? keywords : [keywords];
      meta.push(`<meta name="keywords" content="${keywordsArray.map(escapeHtml).join(', ')}">`);
    }
  }

  // Canonical link
  if (shouldGenerate(SEOTagType.Canonical)) {
    const canonical = seo.canonical || resolveAbsoluteUrl(page.url || '/', siteUrl);
    meta.push(`<link rel="canonical" href="${escapeHtml(canonical)}">`);
  }

  // Robots meta tag
  if (shouldGenerate(SEOTagType.Robots)) {
    const robotsContent = generateRobotsContent(seo);
    if (robotsContent) {
      meta.push(`<meta name="robots" content="${robotsContent}">`);
    }
  }

  // Author meta tag
  if (shouldGenerate(SEOTagType.Author)) {
    const author = seo.author || config.seo?.defaultAuthor;
    if (author) {
      const authorName = typeof author === 'string' ? author : author.name;
      meta.push(`<meta name="author" content="${escapeHtml(authorName)}">`);
    }
  }

  // Open Graph tags
  if (shouldGenerate(SEOTagType.OpenGraph)) {
    meta.push(...generateOpenGraphTags(ctx));
  }

  // Twitter Card tags
  if (shouldGenerate(SEOTagType.Twitter)) {
    meta.push(...generateTwitterCardTags(ctx));
  }

  // JSON-LD Structured Data
  if (shouldGenerate(SEOTagType.StructuredData) && seo.structuredData) {
    const sanitized = sanitizeStructuredData(seo.structuredData, logger);
    meta.push(`<script type="application/ld+json">${JSON.stringify(sanitized)}</script>`);
  }

  return meta.join('\n    ');
}

/**
 * Generate Open Graph protocol meta tags.
 * Implements fallback chains for all OG properties to ensure complete metadata.
 *
 * @param ctx - SEO context containing page, config, and siteUrl
 * @returns Array of Open Graph meta tag strings
 *
 * @example
 * ```typescript
 * const ogTags = generateOpenGraphTags(ctx);
 * // Returns: ['<meta property="og:title" content="...">', ...]
 * ```
 */
export function generateOpenGraphTags(ctx: SEOContext): string[] {
  const { page, config, siteUrl } = ctx;
  const seo = page.frontMatter.seo || {};
  const og = seo.openGraph || {};
  const tags: string[] = [];

  // Basic OG tags with fallback chain
  const ogTitle = og.title || seo.title || page.frontMatter.title || config.site.title;
  const ogDescription =
    og.description || seo.description || page.frontMatter.description || config.site.description;
  const ogUrl = og.url || seo.canonical || resolveAbsoluteUrl(page.url || '/', siteUrl);
  const ogType = og.type || 'website';
  const ogSiteName = og.siteName || config.site.title;

  tags.push(`<meta property="og:title" content="${escapeHtml(ogTitle)}">`);
  if (ogDescription) {
    tags.push(`<meta property="og:description" content="${escapeHtml(ogDescription)}">`);
  }
  tags.push(`<meta property="og:url" content="${escapeHtml(ogUrl)}">`);
  tags.push(`<meta property="og:type" content="${escapeHtml(ogType)}">`);
  tags.push(`<meta property="og:site_name" content="${escapeHtml(ogSiteName)}">`);

  // OG Image
  if (og.image) {
    const image = typeof og.image === 'string' ? { url: og.image } : og.image;
    const imageUrl = image.url.startsWith('/') ? `${siteUrl}${image.url}` : image.url;

    tags.push(`<meta property="og:image" content="${escapeHtml(imageUrl)}">`);
    if (image.alt) {
      tags.push(`<meta property="og:image:alt" content="${escapeHtml(image.alt)}">`);
    }
    if (image.width) {
      tags.push(`<meta property="og:image:width" content="${image.width}">`);
    }
    if (image.height) {
      tags.push(`<meta property="og:image:height" content="${image.height}">`);
    }
  }

  // OG Locale
  if (og.locale || config.site.defaultLocale) {
    const locale = og.locale || config.site.defaultLocale;
    if (locale) {
      tags.push(`<meta property="og:locale" content="${escapeHtml(locale)}">`);
    }
  }

  // OG Article metadata (only for article type)
  if (og.article && ogType === 'article') {
    const article = og.article;
    if (article.publishedTime) {
      tags.push(
        `<meta property="article:published_time" content="${escapeHtml(article.publishedTime)}">`,
      );
    }
    if (article.modifiedTime) {
      tags.push(
        `<meta property="article:modified_time" content="${escapeHtml(article.modifiedTime)}">`,
      );
    }
    if (article.author) {
      tags.push(`<meta property="article:author" content="${escapeHtml(article.author)}">`);
    }
    if (article.section) {
      tags.push(`<meta property="article:section" content="${escapeHtml(article.section)}">`);
    }
    if (article.tags && article.tags.length > 0) {
      article.tags.forEach((tag) => {
        tags.push(`<meta property="article:tag" content="${escapeHtml(tag)}">`);
      });
    }
  }

  return tags;
}

/**
 * Generate Twitter Card meta tags.
 * Implements fallback chains to ensure complete card metadata.
 *
 * @param ctx - SEO context containing page, config, and siteUrl
 * @returns Array of Twitter Card meta tag strings
 *
 * @example
 * ```typescript
 * const twitterTags = generateTwitterCardTags(ctx);
 * // Returns: ['<meta name="twitter:card" content="summary_large_image">', ...]
 * ```
 */
export function generateTwitterCardTags(ctx: SEOContext): string[] {
  const { page, config, siteUrl } = ctx;
  const seo = page.frontMatter.seo || {};
  const twitter = seo.twitter || {};
  const tags: string[] = [];

  // Card type
  const card = twitter.card || 'summary_large_image';
  tags.push(`<meta name="twitter:card" content="${card}">`);

  // Twitter site (optional)
  if (twitter.site) {
    tags.push(`<meta name="twitter:site" content="${escapeHtml(twitter.site)}">`);
  }

  // Twitter creator with fallback chain
  if (twitter.creator) {
    tags.push(`<meta name="twitter:creator" content="${escapeHtml(twitter.creator)}">`);
  } else if (seo.author) {
    const authorName = typeof seo.author === 'string' ? seo.author : seo.author.name;
    tags.push(`<meta name="twitter:creator" content="${escapeHtml(authorName)}">`);
  } else if (config.seo?.defaultAuthor) {
    tags.push(
      `<meta name="twitter:creator" content="${escapeHtml(config.seo.defaultAuthor.name)}">`,
    );
  }

  // Title and description with fallback chains
  const twitterTitle = twitter.title || seo.title || page.frontMatter.title || config.site.title;
  const twitterDescription =
    twitter.description ||
    seo.description ||
    page.frontMatter.description ||
    config.site.description;

  tags.push(`<meta name="twitter:title" content="${escapeHtml(twitterTitle)}">`);
  if (twitterDescription) {
    tags.push(`<meta name="twitter:description" content="${escapeHtml(twitterDescription)}">`);
  }

  // Image with fallback to Open Graph image
  const imageUrl =
    twitter.image ||
    (seo.openGraph?.image
      ? typeof seo.openGraph.image === 'string'
        ? seo.openGraph.image
        : seo.openGraph.image.url
      : undefined);

  if (imageUrl) {
    const fullImageUrl = imageUrl.startsWith('/') ? `${siteUrl}${imageUrl}` : imageUrl;
    tags.push(`<meta name="twitter:image" content="${escapeHtml(fullImageUrl)}">`);

    if (twitter.imageAlt) {
      tags.push(`<meta name="twitter:image:alt" content="${escapeHtml(twitter.imageAlt)}">`);
    }
  }

  return tags;
}

/**
 * Template helper function for generating SEO tags in Eta templates.
 * Provides a convenient API for selective SEO tag generation.
 *
 * @param context - Object containing page, config, and optional site
 * @param tags - Optional array of tag types to generate (strings or SEOTagType enums)
 * @returns HTML string containing generated SEO tags
 *
 * @example
 * ```eta
 * <%~ stati.generateSEO(stati) %>
 * <%~ stati.generateSEO(stati, ['title', 'description', 'opengraph']) %>
 * ```
 */
export function generateSEO(
  context: {
    page: PageModel;
    config: StatiConfig;
    site?: SiteConfig;
  },
  tags?: Array<SEOTagType | string>,
): string {
  // Convert tag names to SEOTagType enum values
  let include: Set<SEOTagType> | undefined = undefined;
  if (tags && tags.length > 0) {
    include = new Set<SEOTagType>();
    for (const tag of tags) {
      if (typeof tag === 'string') {
        // Convert string to enum by checking if the string matches any enum value
        // The enum values are lowercase strings like 'title', 'description', etc.
        const enumEntry = Object.entries(SEOTagType).find(([_, value]) => value === tag);
        if (enumEntry) {
          include.add(enumEntry[1] as SEOTagType);
        }
      } else {
        include.add(tag);
      }
    }
  }

  // Extract site URL from config
  const siteUrl = context.config.site?.baseUrl || context.site?.baseUrl || '';

  // Generate SEO metadata with a no-op logger (warnings won't be shown in template context)
  const noOpLogger: Logger = {
    info: () => {},
    success: () => {},
    warning: () => {},
    error: () => {},
    status: () => {},
    building: () => {},
    processing: () => {},
    stats: () => {},
  };

  const seoContext: SEOContext = {
    page: context.page,
    config: context.config,
    siteUrl,
    logger: noOpLogger,
  };

  if (include) {
    seoContext.include = include;
  }

  return generateSEOMetadata(seoContext);
}
