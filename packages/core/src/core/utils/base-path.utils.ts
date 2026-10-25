/**
 * Base path helpers for sites served from a subfolder of a host.
 * @module core/utils/base-path
 */

import { URL } from 'node:url';

/** A URL with a scheme (`https://`, `mailto:`), which a base path never applies to */
const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:/i;

/** The last `site.baseUrl` read and its base path: a build asks for it for every page and link */
let lastBaseUrl: { input: string; basePath: string } | undefined;

/**
 * The path of `site.baseUrl`, which is where the site is served from: `'/demos/blog'` for
 * `'https://stati.build/demos/blog/'`. A `baseUrl` without a path, or one that is not an
 * absolute http(s) URL, gives `''`, which means the site is served from the root.
 *
 * @param baseUrl - The site's base URL (`site.baseUrl`)
 * @returns The base path without a trailing slash, or `''`
 *
 * @example
 * ```typescript
 * getBasePath('https://example.com');        // ''
 * getBasePath('https://example.com/');       // ''
 * getBasePath('https://example.com/docs/');  // '/docs'
 * ```
 */
export function getBasePath(baseUrl: string | undefined): string {
  if (!baseUrl) {
    return '';
  }
  if (lastBaseUrl?.input === baseUrl) {
    return lastBaseUrl.basePath;
  }
  const basePath = parseBasePath(baseUrl);
  lastBaseUrl = { input: baseUrl, basePath };
  return basePath;
}

function parseBasePath(baseUrl: string): string {
  let url: URL;
  try {
    url = new URL(baseUrl);
  } catch {
    return '';
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return '';
  }
  // Empty segments are dropped, so '//docs//' is '/docs'
  const segments = url.pathname.split('/').filter((segment) => segment !== '');
  return segments.length > 0 ? `/${segments.join('/')}` : '';
}

/**
 * Whether a value is a path from the site root: it starts with one `/`, which a base path
 * goes in front of. Absolute and protocol-relative URLs, `#hash` and `?query` values and
 * relative paths are not.
 */
function isRootPath(path: string): boolean {
  return path.startsWith('/') && !path.startsWith('//') && !HAS_SCHEME.test(path);
}

/**
 * Whether a path is the base path or inside it.
 */
function isInsideBasePath(path: string, basePath: string): boolean {
  if (!path.startsWith(basePath)) {
    return false;
  }
  const next = path.charAt(basePath.length);
  return next === '' || next === '/' || next === '?' || next === '#';
}

/**
 * Puts the base path in front of a path from the site root, whatever the path starts with:
 * the way for Stati to turn a site path it knows into the URL the browser requests. Values
 * that are not paths from the root are returned unchanged.
 *
 * @param path - A path from the site root, such as `/posts/hello` or `/`
 * @param basePath - The base path from {@link getBasePath}
 */
export function addBasePath(path: string, basePath: string): string {
  return basePath !== '' && isRootPath(path) ? `${basePath}${path}` : path;
}

/**
 * Adds the base path to a site-relative path, as `stati.url()` does. Absolute and
 * protocol-relative URLs, `#hash` and `?query`-only values, relative paths and paths that
 * already start with the base path are returned unchanged, so applying it twice is safe.
 * Without a base path every value is returned unchanged.
 *
 * @param path - A path from the site root, such as `/posts/hello` or `/`
 * @param basePath - The base path from {@link getBasePath}
 * @returns The path as the browser should request it
 *
 * @example
 * ```typescript
 * withBasePath('/posts/hello', '/docs'); // '/docs/posts/hello'
 * withBasePath('/', '/docs');            // '/docs/'
 * withBasePath('/docs/posts', '/docs');  // '/docs/posts'
 * withBasePath('#top', '/docs');         // '#top'
 * ```
 */
export function withBasePath(path: string, basePath: string): string {
  return isInsideBasePath(path, basePath) ? path : addBasePath(path, basePath);
}

/**
 * Removes the base path from a path, giving the path from the site root. Returns undefined
 * for a path outside the base path. Without a base path, the path is returned as it is.
 *
 * @param path - A root-absolute path, such as `/docs/posts/hello`
 * @param basePath - The base path from {@link getBasePath}
 * @returns The site-relative path (`/posts/hello`, `/` for the base path itself), or undefined
 */
export function stripBasePath(path: string, basePath: string): string | undefined {
  if (basePath === '') {
    return path;
  }
  if (path === basePath) {
    return '/';
  }
  return path.startsWith(`${basePath}/`) ? path.slice(basePath.length) : undefined;
}
