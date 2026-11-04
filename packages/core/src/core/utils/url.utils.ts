/**
 * URL resolution and normalization utilities, shared by the SEO tags, sitemaps, RSS feeds and
 * images.
 * @module core/utils/url
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
 * Resolves a relative or absolute URL to a full absolute URL. A URL with a scheme is kept, a
 * protocol-relative one (`//cdn.example.com/a.png`) gets the scheme of `baseUrl`, and anything
 * else is a path from the site root, with or without a leading `/` or `./`, that goes behind
 * `baseUrl`, base path included.
 * @param url - Relative or absolute URL
 * @param baseUrl - Base site URL
 * @returns Absolute URL
 *
 * @example
 * ```typescript
 * resolveAbsoluteUrl('/about', 'https://example.com');
 * // Returns: 'https://example.com/about'
 *
 * resolveAbsoluteUrl('./images/a.png', 'https://example.com/docs/');
 * // Returns: 'https://example.com/docs/images/a.png'
 *
 * resolveAbsoluteUrl('https://other.com/page', 'https://example.com');
 * // Returns: 'https://other.com/page'
 * ```
 */
export function resolveAbsoluteUrl(url: string, baseUrl: string): string {
  // Already absolute: any scheme (https:, data:, ...), leave untouched
  if (/^[a-z][a-z\d+.-]*:/i.test(url)) {
    return url;
  }

  // Protocol-relative (//cdn.example.com/og.png): use the site's scheme
  if (url.startsWith('//')) {
    const scheme = baseUrl.startsWith('http://') ? 'http:' : 'https:';
    return `${scheme}${url}`;
  }

  // Ensure baseUrl doesn't end with /
  const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

  // Ensure url starts with /, and a site path written as ./images/a.png reads as images/a.png
  const path = normalizeUrlPath(url.replace(/^\.\//, ''));

  return `${cleanBaseUrl}${path}`;
}

/**
 * Characters a URI cannot hold as written: anything but RFC 3986's unreserved and reserved
 * characters and `%XX` escapes. A `%` that starts no escape matches too, so it becomes `%25`.
 */
const URI_UNSAFE_CHARS = /%(?![0-9A-Fa-f]{2})|[^A-Za-z0-9\-._~:/?#[\]@!$&'()*+,;=%]/gu;

/**
 * Percent-encodes a URL for a sitemap `<loc>`, which must be an ASCII URI: spaces, non-ASCII
 * letters and other characters a URI cannot hold become UTF-8 `%XX` escapes, and an
 * internationalized host becomes its `xn--` form. Existing escapes are kept, so an encoded URL
 * comes back unchanged. The result still needs XML escaping.
 *
 * @param url - Absolute or relative URL
 * @returns The URL with every character outside RFC 3986 percent-encoded
 *
 * @example
 * ```typescript
 * percentEncodeUrl('https://example.com/My Post'); // 'https://example.com/My%20Post'
 * percentEncodeUrl('https://example.com/caf%C3%A9'); // unchanged
 * ```
 */
export function percentEncodeUrl(url: string): string {
  let href = url;
  try {
    href = new URL(url).href;
  } catch {
    // Not an absolute URL: encode it as written
  }
  return href.replace(URI_UNSAFE_CHARS, (char) => {
    try {
      return encodeURIComponent(char);
    } catch {
      // A lone surrogate has no UTF-8 form; write U+FFFD, as URL parsers do
      return '%EF%BF%BD';
    }
  });
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
