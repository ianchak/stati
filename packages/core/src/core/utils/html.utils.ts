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

/** Characters XML 1.0 does not allow in a document, which copy-pasted text can hold */
// eslint-disable-next-line no-control-regex
const INVALID_XML_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g;

/**
 * Removes the characters XML 1.0 does not allow anywhere in a document, not even as
 * character references or inside CDATA, such as form feeds and other control characters.
 * @param text - Text to clean
 * @returns The text without those characters
 */
export function removeInvalidXmlChars(text: string): string {
  return text.replace(INVALID_XML_CHARS, '');
}

/** A tag name after `<` or `</`: a letter, then anything up to whitespace, `/` or `>` */
const HTML_TAG_NAME = /[A-Za-z][^\t\n\f\r />]*/y;

/** Whitespace as HTML reads it between attributes */
const HTML_WHITESPACE = /[\t\n\f\r ]/;

/** Elements whose contents browsers read as text or keep inert, so tags in them aren't markup */
const HTML_TEXT_ELEMENTS = new Set(['script', 'style', 'template', 'textarea', 'title']);

/** An attribute of a tag: its name in lowercase, its value, and where the value is in the tag */
export interface TagAttribute {
  name: string;
  value: string;
  /** Where the value starts in the tag, after an opening quote */
  start: number;
  /** Where the value ends in the tag, before a closing quote */
  end: number;
}

/** A tag of a page: its name in lowercase, where it starts and ends, and its attributes */
export interface HtmlTag {
  name: string;
  start: number;
  end: number;
  attributes: TagAttribute[];
  /** Whether it is a closing tag, such as `</head>`, which has no attributes */
  closing: boolean;
}

/**
 * The index of the `>` that ends a tag, scanning from `from`, or -1 when the tag never closes.
 * A `>` in a quoted attribute value doesn't end the tag.
 */
function findTagEnd(html: string, from: number): number {
  let i = from;
  while (i < html.length) {
    const char = html.charAt(i);
    if (char === '>') {
      return i;
    }
    i++;
    if (char === '=') {
      while (i < html.length && HTML_WHITESPACE.test(html.charAt(i))) {
        i++;
      }
      const quote = html.charAt(i);
      if (quote === '"' || quote === "'") {
        const close = html.indexOf(quote, i + 1);
        if (close === -1) {
          return -1;
        }
        i = close + 1;
      }
    }
  }
  return -1;
}

/** The attributes of a tag, read as browsers read them: quoted, unquoted or without a value */
function parseAttributes(tag: string): TagAttribute[] {
  const attributes: TagAttribute[] = [];
  const isSpace = (at: number) => HTML_WHITESPACE.test(tag.charAt(at));
  const isNameEnd = (at: number) => isSpace(at) || '/>='.includes(tag.charAt(at));
  // Past '<' and the tag name
  let i = 1;
  while (i < tag.length && !isSpace(i) && !'/>'.includes(tag.charAt(i))) {
    i++;
  }
  while (i < tag.length) {
    while (i < tag.length && (isSpace(i) || tag.charAt(i) === '/')) {
      i++;
    }
    if (i >= tag.length || tag.charAt(i) === '>') {
      break;
    }
    // A name runs to whitespace, '/', '>' or '='; a '=' it starts with is part of it
    const nameStart = i++;
    while (i < tag.length && !isNameEnd(i)) {
      i++;
    }
    const name = tag.slice(nameStart, i).toLowerCase();
    while (i < tag.length && isSpace(i)) {
      i++;
    }
    if (tag.charAt(i) !== '=') {
      attributes.push({ name, value: '', start: i, end: i });
      continue;
    }
    i++;
    while (i < tag.length && isSpace(i)) {
      i++;
    }
    const quote = tag.charAt(i);
    if (quote === '"' || quote === "'") {
      const close = tag.indexOf(quote, i + 1);
      const end = close === -1 ? tag.length : close;
      attributes.push({ name, value: tag.slice(i + 1, end), start: i + 1, end });
      i = end + 1;
    } else {
      const start = i;
      while (i < tag.length && !isSpace(i) && tag.charAt(i) !== '>') {
        i++;
      }
      attributes.push({ name, value: tag.slice(start, i), start, end: i });
    }
  }
  return attributes;
}

/**
 * The first attribute of a tag with this name, as browsers use it
 *
 * @param attributes - The tag's attributes
 * @param name - The attribute name, in lowercase
 */
export function getAttribute(
  attributes: readonly TagAttribute[],
  name: string,
): TagAttribute | undefined {
  return attributes.find((attribute) => attribute.name === name);
}

/** Options for {@link findHtmlTags} */
export interface FindHtmlTagsOptions {
  /** Find the closing tags of the named elements too, such as `</head>` */
  closing?: boolean;
}

/**
 * The tags of a page that are markup, in order, as {@link findHtmlTags} finds them. A generator,
 * so a caller looking for the first tag of a kind stops the scan there.
 */
function* scanHtmlTags(
  html: string,
  names: ReadonlySet<string>,
  findClosing: boolean,
): Generator<HtmlTag> {
  const tagName = new RegExp(HTML_TAG_NAME.source, 'y');
  // The closing tag of an element whose contents are text, found from where the scan is
  const findClose = (element: string, from: number): number => {
    const closeTag = new RegExp(`</${element}(?=[\\t\\n\\f\\r />])`, 'gi');
    closeTag.lastIndex = from;
    return closeTag.exec(html)?.index ?? -1;
  };

  let i = html.indexOf('<');
  while (i !== -1) {
    let next = i + 1;
    if (html.startsWith('<!--', i)) {
      const close = html.indexOf('-->', i + 4);
      if (close === -1) {
        break;
      }
      next = close + 3;
    } else if (html.charAt(i + 1) === '!' || html.charAt(i + 1) === '?') {
      // A doctype, or markup browsers read as a comment
      const close = html.indexOf('>', i + 2);
      if (close === -1) {
        break;
      }
      next = close + 1;
    } else {
      const closing = html.charAt(i + 1) === '/';
      tagName.lastIndex = i + (closing ? 2 : 1);
      const name = tagName.exec(html)?.[0].toLowerCase();
      // A '<' without a tag name is text
      if (name !== undefined) {
        const end = findTagEnd(html, tagName.lastIndex);
        if (end === -1) {
          break;
        }
        next = end + 1;
        if (names.has(name) && (!closing || findClosing)) {
          yield {
            name,
            start: i,
            end: next,
            attributes: closing ? [] : parseAttributes(html.slice(i, next)),
            closing,
          };
        }
        if (!closing && HTML_TEXT_ELEMENTS.has(name)) {
          const close = findClose(name, next);
          if (close === -1) {
            break;
          }
          next = close;
        }
      }
    }
    i = html.indexOf('<', next);
  }
}

/**
 * The tags of a page, named in `names` (lowercase), that are markup: every tag is read with its
 * quoted attribute values, so a `>` or a `<link>` in one is text, and tags in a comment, or in a
 * script, style, template, textarea or title, aren't markup. A tag, comment or element left open
 * runs to the end of the page, as browsers read it. One pass over the page, whatever it holds.
 *
 * @param html - The page's HTML
 * @param names - The tag names to find, in lowercase, such as `link` or `a`
 * @param options - `closing: true` finds the closing tags of those elements too
 */
export function findHtmlTags(
  html: string,
  names: ReadonlySet<string>,
  options: FindHtmlTagsOptions = {},
): HtmlTag[] {
  return [...scanHtmlTags(html, names, options.closing === true)];
}

const HEAD_AND_BODY = new Set(['head', 'body']);
const BODY = new Set(['body']);

/**
 * Finds where content goes before `</head>`: the first closing head tag that is markup. A
 * `</head>` in a comment, or in a script, style, template, textarea or title, is text, and one
 * after the `<body>` tag (or `</body>`) is not the head's, as when a page without a head has a
 * raw `</head>` in its content.
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
  // Most fragments have no closing head tag, and need no scan
  if (!/<\/head/i.test(html)) {
    return -1;
  }
  for (const tag of scanHtmlTags(html, HEAD_AND_BODY, true)) {
    if (tag.name === 'head') {
      if (tag.closing) {
        return tag.start;
      }
    } else {
      return -1;
    }
  }
  return -1;
}

/**
 * Finds where content goes before `</body>`: the last closing body tag that is markup, so a
 * `</body>` in a comment or a script doesn't count, nor does a raw one in the page's content
 * before the layout's own.
 *
 * @param html - HTML content
 * @returns Position index or -1 if not found
 */
export function findBodyClosePosition(html: string): number {
  if (!/<\/body/i.test(html)) {
    return -1;
  }
  let position = -1;
  for (const tag of scanHtmlTags(html, BODY, true)) {
    if (tag.closing) {
      position = tag.start;
    }
  }
  return position;
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
