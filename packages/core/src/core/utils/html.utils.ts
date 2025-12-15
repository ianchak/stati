/**
 * HTML manipulation utilities.
 * @module core/utils/html
 */

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
