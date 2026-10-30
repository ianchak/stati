/**
 * HTML manipulation utilities.
 * @module core/utils/html
 */

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
 * @param value - The text to escape; other values, such as the number a front matter title of
 *   `1984` is to YAML, are written out as text first, and `null` and `undefined` become ''
 * @returns HTML-safe string with special characters escaped
 *
 * @example
 * ```typescript
 * escapeHtml('<script>alert("xss")</script>');
 * // Returns: '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
 * ```
 */
export function escapeHtml(value: unknown): string {
  const text = value === null || value === undefined ? '' : String(value);

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
  // Every character the pattern matches has an entry
  const result = text.replace(/[&<>"']/g, (char) => htmlEscapes[char]!);

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
 * Finds the position to inject content before </head>.
 * Performs a case-insensitive search for the closing head tag.
 *
 * @param html - HTML content
 * @returns Position index or -1 if not found
 *
 * @example
 * ```typescript
 * const html = '<html><head><title>Test</title></head><body></body></html>';
 * const pos = findHeadClosePosition(html);
 * // pos is the index just before </head>
 * ```
 */
export function findHeadClosePosition(html: string): number {
  // Case-insensitive search for </head>
  const match = html.match(/<\/head>/i);
  return match ? (match.index ?? -1) : -1;
}

/**
 * Injects content before the </head> tag with proper indentation.
 *
 * @param html - HTML content
 * @param content - Content to inject
 * @param indent - Indentation string (default: 4 spaces)
 * @returns HTML with injected content, or original HTML if </head> not found
 *
 * @example
 * ```typescript
 * const html = '<html><head><title>Test</title></head><body></body></html>';
 * const result = injectBeforeHeadClose(html, '<meta name="test" content="value">');
 * ```
 */
export function injectBeforeHeadClose(
  html: string,
  content: string,
  indent: string = '    ',
): string {
  const headClosePos = findHeadClosePosition(html);

  if (headClosePos === -1) {
    return html;
  }

  const before = html.substring(0, headClosePos);
  const after = html.substring(headClosePos);

  return `${before}${indent}${content}\n${after}`;
}
