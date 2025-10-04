/**
 * SEO utility functions for HTML escaping, validation, and tag detection
 */

import { URL } from 'node:url';
import type { SEOMetadata, RobotsConfig } from '../types/content.js';
import type { SEOValidationResult, SEOTagType } from '../types/seo.js';
import { SEOTagType as SEOTagTypeEnum } from '../types/seo.js';

/**
 * HTML escape cache for performance optimization.
 * Stores up to 1000 frequently used strings to avoid repeated escaping.
 */
const escapeHtmlCache = new Map<string, string>();
const ESCAPE_CACHE_MAX_SIZE = 1000;

/**
 * Escape HTML entities to prevent XSS attacks.
 * Uses memoization for performance with frequently repeated strings.
 *
 * Implements LRU-style cache eviction: when the cache is full, it's cleared
 * and the new entry is added. This prevents unbounded memory growth while
 * still providing caching benefits for repeated strings.
 *
 * @param text - The text to escape
 * @returns HTML-safe string with special characters escaped
 *
 * @example
 * ```typescript
 * escapeHtml('<script>alert("xss")</script>');
 * // Returns: '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
 * ```
 */
export function escapeHtml(text: string): string {
  // Check cache
  const cached = escapeHtmlCache.get(text);
  if (cached !== undefined) {
    return cached;
  }

  // Compute result
  const htmlEscapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  const result = text.replace(/[&<>"']/g, (char) => htmlEscapes[char] || char);

  // Store in cache with size limit
  if (escapeHtmlCache.size < ESCAPE_CACHE_MAX_SIZE) {
    escapeHtmlCache.set(text, result);
  } else {
    // Clear cache when full (prevents unbounded growth)
    // This is a simple LRU-style eviction strategy
    escapeHtmlCache.clear();
    escapeHtmlCache.set(text, result);
  }

  return result;
}

/**
 * Sanitize structured data to prevent XSS attacks and ensure safe JSON-LD output.
 * Recursively processes objects and arrays, escaping string values and enforcing depth limits.
 *
 * @param data - The data to sanitize
 * @param depth - Current recursion depth (internal use)
 * @param maxDepth - Maximum allowed recursion depth (default: 50)
 * @returns Sanitized data safe for JSON-LD output
 *
 * @example
 * ```typescript
 * const data = {
 *   name: '<script>alert("xss")</script>',
 *   nested: { value: 'test' }
 * };
 * sanitizeStructuredData(data);
 * // Returns: { name: '&lt;script&gt;...', nested: { value: 'test' } }
 * ```
 */
export function sanitizeStructuredData(
  data: unknown,
  depth: number = 0,
  maxDepth: number = 50,
): unknown {
  // Prevent stack overflow from deeply nested objects
  if (depth > maxDepth) {
    console.warn(`Structured data exceeds maximum nesting depth of ${maxDepth}, truncating`);
    return '[Object: max depth exceeded]';
  }

  // Handle primitives
  if (typeof data === 'string') {
    return escapeHtml(data);
  }
  if (typeof data !== 'object' || data === null) {
    return data;
  }

  // Handle arrays
  if (Array.isArray(data)) {
    return data.map((item) => sanitizeStructuredData(item, depth + 1, maxDepth));
  }

  // Handle objects
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    sanitized[key] = sanitizeStructuredData(value, depth + 1, maxDepth);
  }
  return sanitized;
}

/**
 * Generate robots meta tag content from SEO metadata and robots configuration.
 * Combines noindex flag and robots directives into a comma-separated string.
 *
 * @param seo - SEO metadata containing robots configuration
 * @returns Comma-separated robots directives, or empty string if none
 *
 * @example
 * ```typescript
 * generateRobotsContent({ noindex: true, robots: { follow: false } });
 * // Returns: 'noindex, nofollow'
 * ```
 */
export function generateRobotsContent(seo: SEOMetadata): string {
  const directives: string[] = [];

  // Collect directives from noindex flag
  if (seo.noindex) {
    directives.push('noindex');
  }

  // Handle robots config
  if (typeof seo.robots === 'string') {
    // If string doesn't include noindex but flag is set, prepend it
    if (seo.noindex && !seo.robots.includes('noindex')) {
      return `noindex, ${seo.robots}`;
    }
    return seo.robots;
  } else if (seo.robots) {
    const robots = seo.robots as RobotsConfig;

    // Only add if not already added via noindex flag
    if (robots.index === false && !directives.includes('noindex')) {
      directives.push('noindex');
    }
    if (robots.follow === false) {
      directives.push('nofollow');
    }
    if (robots.archive === false) {
      directives.push('noarchive');
    }
    if (robots.snippet === false) {
      directives.push('nosnippet');
    }
    if (robots.imageindex === false) {
      directives.push('noimageindex');
    }
    if (robots.translate === false) {
      directives.push('notranslate');
    }
    if (robots.maxSnippet !== undefined) {
      directives.push(`max-snippet:${robots.maxSnippet}`);
    }
    if (robots.maxImagePreview) {
      directives.push(`max-image-preview:${robots.maxImagePreview}`);
    }
    if (robots.maxVideoPreview !== undefined) {
      directives.push(`max-video-preview:${robots.maxVideoPreview}`);
    }
  }

  return directives.length > 0 ? directives.join(', ') : '';
}

/**
 * Validate URL format (http or https only).
 *
 * @param url - The URL to validate
 * @returns True if the URL is valid
 */
function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Validate SEO metadata before processing.
 * Checks for common issues like invalid URLs, improper lengths, and malformed data.
 *
 * @param seo - SEO metadata to validate
 * @param _pageUrl - URL of the page being validated (for context in error messages)
 * @returns Validation result with valid flag, errors, and warnings
 *
 * @example
 * ```typescript
 * const result = validateSEOMetadata({
 *   title: 'My Page',
 *   canonical: 'invalid-url'
 * }, '/my-page');
 * // Returns: { valid: false, errors: ['Invalid canonical URL...'], warnings: [] }
 * ```
 */
export function validateSEOMetadata(seo: SEOMetadata, _pageUrl: string): SEOValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate title length
  if (seo.title) {
    if (seo.title.length < 5) {
      warnings.push(`Title is only ${seo.title.length} characters (recommended: 50-60)`);
    } else if (seo.title.length > 70) {
      warnings.push(`Title is ${seo.title.length} characters (recommended: 50-60)`);
    }
  }

  // Validate description length
  if (seo.description) {
    if (seo.description.length < 50) {
      warnings.push(
        `Description is only ${seo.description.length} characters (recommended: 150-160)`,
      );
    } else if (seo.description.length > 160) {
      warnings.push(`Description is ${seo.description.length} characters (recommended: 150-160)`);
    }
  }

  // Validate canonical URL
  if (seo.canonical && !isValidUrl(seo.canonical)) {
    errors.push(`Invalid canonical URL: ${seo.canonical}`);
  }

  // Validate Open Graph image URL and dimensions
  if (seo.openGraph?.image) {
    const imageUrl =
      typeof seo.openGraph.image === 'string' ? seo.openGraph.image : seo.openGraph.image.url;

    if (!isValidUrl(imageUrl) && !imageUrl.startsWith('/')) {
      warnings.push(`Open Graph image URL may be invalid: ${imageUrl}`);
    }

    // Validate image dimensions if provided
    if (typeof seo.openGraph.image !== 'string') {
      const { width, height } = seo.openGraph.image;
      if (width !== undefined && (!Number.isInteger(width) || width <= 0)) {
        errors.push(`Open Graph image width must be a positive integer (got ${width})`);
      }
      if (height !== undefined && (!Number.isInteger(height) || height <= 0)) {
        errors.push(`Open Graph image height must be a positive integer (got ${height})`);
      }
    }
  }

  // Validate Twitter image URL
  if (seo.twitter?.image && !isValidUrl(seo.twitter.image) && !seo.twitter.image.startsWith('/')) {
    warnings.push(`Twitter Card image URL may be invalid: ${seo.twitter.image}`);
  }

  // Validate structured data size
  if (seo.structuredData) {
    const jsonSize = JSON.stringify(seo.structuredData).length;
    const maxSize = 100 * 1024; // 100KB limit
    if (jsonSize > maxSize) {
      warnings.push(`Structured data is ${(jsonSize / 1024).toFixed(2)}KB (recommended: <100KB)`);
    }
  }

  // Validate priority value
  if (seo.priority !== undefined) {
    if (typeof seo.priority !== 'number' || seo.priority < 0 || seo.priority > 1) {
      errors.push('Priority must be a number between 0.0 and 1.0');
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Detect existing SEO tags in HTML to avoid duplication during auto-injection.
 * Uses enhanced regex patterns to handle multi-line attributes and edge cases.
 *
 * Returns a Set of SEOTagType enum values indicating which tag types are already present.
 * This allows for granular control: only missing tags will be generated.
 *
 * @param html - The HTML content to scan
 * @returns Set of SEOTagType enum values for existing tags
 *
 * @example
 * ```typescript
 * const html = '<head><title>My Page</title><meta name="description" content="..."></head>';
 * const existing = detectExistingSEOTags(html);
 * // Returns: Set { SEOTagType.Title, SEOTagType.Description }
 * ```
 */
export function detectExistingSEOTags(html: string): Set<SEOTagType> {
  const existingTags = new Set<SEOTagType>();

  // Extract just the <head> section for more efficient parsing
  const headMatch = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
  if (!headMatch) {
    console.warn('No <head> tag found in HTML, SEO auto-injection may not work correctly');
    return existingTags;
  }

  const headContent = headMatch[1];

  // More robust regex patterns that handle multi-line attributes and edge cases
  const patterns: Array<{ regex: RegExp; type: SEOTagType }> = [
    { regex: /<title\s*>/i, type: SEOTagTypeEnum.Title },
    {
      regex: /<meta\s+[^>]*name\s*=\s*["']description["'][^>]*>/i,
      type: SEOTagTypeEnum.Description,
    },
    { regex: /<meta\s+[^>]*name\s*=\s*["']keywords["'][^>]*>/i, type: SEOTagTypeEnum.Keywords },
    { regex: /<meta\s+[^>]*name\s*=\s*["']author["'][^>]*>/i, type: SEOTagTypeEnum.Author },
    { regex: /<meta\s+[^>]*name\s*=\s*["']robots["'][^>]*>/i, type: SEOTagTypeEnum.Robots },
    { regex: /<link\s+[^>]*rel\s*=\s*["']canonical["'][^>]*>/i, type: SEOTagTypeEnum.Canonical },
    { regex: /<meta\s+[^>]*property\s*=\s*["']og:/i, type: SEOTagTypeEnum.OpenGraph },
    { regex: /<meta\s+[^>]*name\s*=\s*["']twitter:/i, type: SEOTagTypeEnum.Twitter },
    {
      regex: /<script\s+[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>/i,
      type: SEOTagTypeEnum.StructuredData,
    },
  ];

  // Check all patterns in a single pass
  for (const { regex, type } of patterns) {
    if (headContent && regex.test(headContent)) {
      existingTags.add(type);
    }
  }

  return existingTags;
}
