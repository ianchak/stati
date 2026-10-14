/**
 * Converts the HTML an Open Graph template renders into the element tree Satori reads.
 * @module og/html
 */

/** An element in Satori's React-like tree. */
export interface SatoriElement {
  type: string;
  props: {
    style?: Record<string, string>;
    children?: SatoriChild | SatoriChild[];
    [attribute: string]: unknown;
  };
}

/** A child: an element or text. */
export type SatoriChild = SatoriElement | string;

const VOID_ELEMENTS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'source',
  'track',
  'wbr',
]);

/** Elements whose content is not text to render. */
const SKIPPED_ELEMENTS = new Set(['script', 'style', 'template', 'noscript']);

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  ensp: ' ',
  emsp: ' ',
  thinsp: ' ',
  ndash: '–',
  mdash: '—',
  hellip: '…',
  lsquo: '‘',
  rsquo: '’',
  sbquo: '‚',
  ldquo: '“',
  rdquo: '”',
  bdquo: '„',
  laquo: '«',
  raquo: '»',
  middot: '·',
  bull: '•',
  copy: '©',
  reg: '®',
  trade: '™',
  times: '×',
  divide: '÷',
  deg: '°',
  euro: '€',
  pound: '£',
  yen: '¥',
  cent: '¢',
  sect: '§',
  para: '¶',
  shy: '­',
  larr: '←',
  rarr: '→',
  uarr: '↑',
  darr: '↓',
};

/**
 * Decodes HTML character references: named ones in common use, decimal and hexadecimal.
 */
export function decodeEntities(text: string): string {
  return text.replace(
    /&(#[xX][0-9a-fA-F]+|#\d+|[a-zA-Z][a-zA-Z0-9]*);/g,
    (match, entity: string) => {
      if (entity.startsWith('#')) {
        const code =
          entity[1] === 'x' || entity[1] === 'X'
            ? parseInt(entity.slice(2), 16)
            : parseInt(entity.slice(1), 10);
        return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : match;
      }
      return NAMED_ENTITIES[entity] ?? match;
    },
  );
}

/**
 * Splits a style attribute into declarations, ignoring semicolons inside parentheses or
 * quotes, as in `url(data:image/png;base64,...)`.
 */
function splitDeclarations(style: string): string[] {
  const declarations: string[] = [];
  let depth = 0;
  let quote: string | null = null;
  let start = 0;
  for (let i = 0; i < style.length; i++) {
    const char = style[i];
    if (quote) {
      if (char === quote) quote = null;
    } else if (char === '"' || char === "'") {
      quote = char;
    } else if (char === '(') {
      depth++;
    } else if (char === ')') {
      depth = Math.max(0, depth - 1);
    } else if (char === ';' && depth === 0) {
      declarations.push(style.slice(start, i));
      start = i + 1;
    }
  }
  declarations.push(style.slice(start));
  return declarations;
}

/**
 * Converts a CSS property or hyphenated attribute name to camelCase, with vendor prefixes in
 * React's form (`-webkit-line-clamp` becomes `WebkitLineClamp`).
 */
export function toCamelCase(name: string): string {
  return name
    .replace(
      /^-(webkit|moz|o)-/,
      (_match, vendor: string) => `${vendor[0]!.toUpperCase()}${vendor.slice(1)}-`,
    )
    .replace(/^-ms-/, 'ms-')
    .replace(/-([a-z])/g, (_match, letter: string) => letter.toUpperCase());
}

/**
 * Parses an inline style attribute into a style object.
 */
export function parseStyle(style: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const declaration of splitDeclarations(style)) {
    const colon = declaration.indexOf(':');
    if (colon <= 0) continue;
    const property = declaration.slice(0, colon).trim().toLowerCase();
    const value = declaration.slice(colon + 1).trim();
    if (property && value) {
      result[toCamelCase(property)] = value;
    }
  }
  return result;
}

const TOKEN =
  /<!--[\s\S]*?-->|<![^>]*>|<\/\s*([a-zA-Z][\w:-]*)\s*>|<([a-zA-Z][\w:-]*)((?:\s+[^\s"'>/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?)*)\s*(\/?)>|[^<]+|</g;
const ATTRIBUTE = /([^\s"'>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

function parseAttributes(source: string): Record<string, unknown> {
  const props: Record<string, unknown> = {};
  for (const match of source.matchAll(ATTRIBUTE)) {
    const name = match[1]!;
    const value = decodeEntities(match[2] ?? match[3] ?? match[4] ?? '');
    const lower = name.toLowerCase();
    if (lower === 'style') {
      props.style = parseStyle(value);
    } else if (lower === 'class') {
      // Satori has no class selectors; classes are ignored
    } else if (lower.startsWith('data-') || lower.startsWith('aria-')) {
      props[lower] = value;
    } else if ((lower === 'width' || lower === 'height') && /^\d+(\.\d+)?$/.test(value)) {
      props[lower] = Number(value);
    } else {
      props[name.includes('-') ? toCamelCase(name) : name] = value;
    }
  }
  return props;
}

interface BuildNode {
  type: string;
  props: Record<string, unknown>;
  children: Array<BuildNode | string>;
}

function finalize(node: BuildNode): SatoriElement {
  const children: SatoriChild[] = [];
  node.children.forEach((child, index) => {
    if (typeof child !== 'string') {
      children.push(finalize(child));
      return;
    }
    // Collapse whitespace as HTML layout does, keeping non-breaking spaces
    let text = child.replace(/[ \t\n\r\f]+/g, ' ');
    if (index === 0) text = text.replace(/^ /, '');
    if (index === node.children.length - 1) text = text.replace(/ $/, '');
    if (text) children.push(text);
  });

  const props: SatoriElement['props'] = { ...node.props };
  if (children.length === 1) {
    props.children = children[0]!;
  } else if (children.length > 1) {
    props.children = children;
  }
  return { type: node.type, props };
}

/**
 * Parses template HTML into Satori's element tree.
 * Whitespace-only text between elements is dropped (Satori would count it as children),
 * character references are decoded, `style` attributes become style objects and `class`
 * attributes are ignored.
 *
 * @param html - Rendered template HTML
 * @returns The root element; several top-level elements are wrapped in a full-size flex box
 */
export function htmlToSatori(html: string): SatoriElement {
  const root: BuildNode = { type: 'div', props: {}, children: [] };
  const stack: BuildNode[] = [root];
  const top = () => stack[stack.length - 1]!;
  let skipUntil: string | null = null;

  for (const match of html.matchAll(TOKEN)) {
    const [token, closeName, openName, attributes, selfClosing] = match;

    if (skipUntil) {
      if (closeName?.toLowerCase() === skipUntil) skipUntil = null;
      continue;
    }

    if (closeName) {
      // Close the nearest open element with this name, and any left open inside it
      const name = closeName.toLowerCase();
      for (let i = stack.length - 1; i > 0; i--) {
        if (stack[i]!.type.toLowerCase() === name) {
          stack.length = i;
          break;
        }
      }
      continue;
    }

    if (openName) {
      const lower = openName.toLowerCase();
      if (SKIPPED_ELEMENTS.has(lower)) {
        if (!selfClosing) skipUntil = lower;
        continue;
      }
      // HTML element names are case-insensitive; SVG ones such as linearGradient are not
      const type = /[A-Z]/.test(openName) && openName !== openName.toUpperCase() ? openName : lower;
      const node: BuildNode = { type, props: parseAttributes(attributes ?? ''), children: [] };
      top().children.push(node);
      if (!selfClosing && !VOID_ELEMENTS.has(lower)) {
        stack.push(node);
      }
      continue;
    }

    if (token.startsWith('<!') || token.startsWith('<!--')) {
      continue;
    }

    // Whitespace-only text between elements would count as children in Satori's layout
    const text = decodeEntities(token);
    if (/[^ \t\n\r\f]/.test(text)) {
      top().children.push(text);
    }
  }

  const elements = root.children.filter((child): child is BuildNode => typeof child !== 'string');
  if (elements.length === 1 && root.children.length === 1) {
    return finalize(elements[0]!);
  }
  root.props.style = { display: 'flex', width: '100%', height: '100%' };
  return finalize(root);
}
