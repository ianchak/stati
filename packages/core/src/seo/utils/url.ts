/**
 * URL resolution and normalization utilities for SEO module
 * @module seo/utils/url
 */

import { URL } from 'node:url';

/**
 * Normalizes a path to ensure it starts with /
 * @param path - Path to normalize
 * @returns Normalized path starting with /
 *
 * @example
 * ```typescript
 * normalizeUrlPath('about'); // '/about'
 * normalizeUrlPath('/about'); // '/about'
 * ```
 */
export function normalizeUrlPath(path: string): string {
  return path.startsWith('/') ? path : `/${path}`;
}

/**
 * Resolves a relative or absolute URL to a full absolute URL
 * @param url - Relative or absolute URL
 * @param baseUrl - Base site URL
 * @returns Absolute URL
 *
 * @example
 * ```typescript
 * resolveAbsoluteUrl('/about', 'https://example.com');
 * // Returns: 'https://example.com/about'
 *
 * resolveAbsoluteUrl('https://other.com/page', 'https://example.com');
 * // Returns: 'https://other.com/page'
 * ```
 */
export function resolveAbsoluteUrl(url: string, baseUrl: string): string {
  // Already absolute
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  // Ensure baseUrl doesn't end with /
  const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

  // Ensure url starts with /
  const path = normalizeUrlPath(url);

  return `${cleanBaseUrl}${path}`;
}

/**
 * Validates a URL string
 * @param url - URL to validate
 * @returns true if valid URL with http/https protocol
 *
 * @example
 * ```typescript
 * isValidUrl('https://example.com'); // true
 * isValidUrl('not-a-url'); // false
 * isValidUrl('ftp://example.com'); // false (only http/https)
 * ```
 */
export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}
