/**
 * Search index auto-injection utilities.
 * @module search/auto-inject
 */

import { injectBeforeHeadClose } from '../core/index.js';
import { SEARCH_INDEX_META_NAME } from './constants.js';

/**
 * Injects a meta tag with the search index path into HTML.
 * The meta tag allows client-side JavaScript to discover the search index location.
 *
 * @param html - Rendered HTML content
 * @param searchIndexPath - Path to the search index file (e.g., '/search-index-a1b2c3d4.json')
 * @returns HTML with injected search meta tag
 *
 * @example
 * ```typescript
 * const html = '<html><head><title>Page</title></head><body>Content</body></html>';
 * const enhanced = autoInjectSearchMeta(html, '/search-index-abc123.json');
 * // Returns HTML with <meta name="stati:search-index" content="/search-index-abc123.json">
 * ```
 */
export function autoInjectSearchMeta(html: string, searchIndexPath: string): string {
  // Check if meta tag already exists
  if (html.includes(`name="${SEARCH_INDEX_META_NAME}"`)) {
    return html;
  }

  // Create the meta tag
  const metaTag = `<meta name="${SEARCH_INDEX_META_NAME}" content="${searchIndexPath}">`;

  // Inject before </head>
  return injectBeforeHeadClose(html, metaTag);
}
