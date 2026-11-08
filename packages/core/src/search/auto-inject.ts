/**
 * Search index auto-injection utilities.
 * @module search/auto-inject
 */

import { findHtmlTags, getAttribute, injectBeforeHeadClose } from '../core/utils/html.utils.js';
import { SEARCH_INDEX_META_NAME } from './constants.js';

const META_TAG = new Set(['meta']);

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
  // A page that has the meta tag keeps it; one in a comment or a script doesn't count
  const hasMetaTag = findHtmlTags(html, META_TAG).some(
    ({ attributes }) =>
      getAttribute(attributes, 'name')?.value.toLowerCase() === SEARCH_INDEX_META_NAME,
  );
  if (hasMetaTag) {
    return html;
  }

  // Create the meta tag
  const metaTag = `<meta name="${SEARCH_INDEX_META_NAME}" content="${searchIndexPath}">`;

  // Inject before </head>
  return injectBeforeHeadClose(html, metaTag);
}
