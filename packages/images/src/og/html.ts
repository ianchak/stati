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

/** HTML whitespace. */
const SPACE = new Set([' ', '\t', '\n', '\r', '\f']);

/** Characters that end a tag or attribute name. */
const NAME_END = new Set([...SPACE, '/', '>']);

type Attribute = [name: string, value: string];

/** A piece of HTML: text, a start tag or an end tag. */
type Token =
  | { kind: 'text'; text: string }
  | { kind: 'start'; name: string; attributes: Attribute[]; selfClosing: boolean }
  | { kind: 'end'; name: string };

interface Tag {
  name: string;
  attributes: Attribute[];
  selfClosing: boolean;
  /** Index after the closing `>` */
  end: number;
}

function isAsciiLetter(char: string | undefined): boolean {
  return char !== undefined && ((char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z'));
}

/**
 * Reads a tag's name and attributes, starting at the name, as the HTML tokenizer does:
 * quoted values may contain `>`, and a `/` outside an unquoted value only counts before `>`.
 *
 * @returns The tag, or null when the input ends inside it
 */
function readTag(html: string, from: number): Tag | null {
  let i = from;
  while (i < html.length && !NAME_END.has(html[i]!)) i++;
  const name = html.slice(from, i);
  const attributes: Attribute[] = [];

  while (i < html.length) {
    const char = html[i]!;
    if (char === '>') {
      return { name, attributes, selfClosing: false, end: i + 1 };
    }
    if (char === '/' && html[i + 1] === '>') {
      return { name, attributes, selfClosing: true, end: i + 2 };
    }
    if (SPACE.has(char) || char === '/') {
      i++;
      continue;
    }

    // A name runs to whitespace, `/`, `>` or `=`, except that it may start with `=`
    const nameStart = i;
    i++;
    while (i < html.length && !NAME_END.has(html[i]!) && html[i] !== '=') i++;
    const attributeName = html.slice(nameStart, i);
    while (i < html.length && SPACE.has(html[i]!)) i++;

    let value = '';
    if (html[i] === '=') {
      i++;
      while (i < html.length && SPACE.has(html[i]!)) i++;
      const quote = html[i];
      if (quote === '"' || quote === "'") {
        const close = html.indexOf(quote, i + 1);
        if (close === -1) return null;
        value = html.slice(i + 1, close);
        i = close + 1;
      } else {
        const valueStart = i;
        while (i < html.length && !SPACE.has(html[i]!) && html[i] !== '>') i++;
        value = html.slice(valueStart, i);
      }
    }
    attributes.push([attributeName, value]);
  }
  return null;
}

/**
 * Splits HTML into text, start tags and end tags, dropping comments, doctypes and other
 * declarations. It reads each character once, so no input makes it slow. Like an HTML
 * parser, it stops at a comment or tag that is never closed.
 */
function* tokenize(html: string): Generator<Token> {
  let i = 0;
  while (i < html.length) {
    const open = html.indexOf('<', i);
    if (open === -1) {
      yield { kind: 'text', text: html.slice(i) };
      return;
    }
    if (open > i) {
      yield { kind: 'text', text: html.slice(i, open) };
    }

    const next = html[open + 1];
    if (html.startsWith('<!--', open)) {
      // Searching from the dashes also ends `<!-->` and `<!--->`, as browsers do
      const close = html.indexOf('-->', open + 2);
      if (close === -1) return;
      i = close + 3;
    } else if (next === '!' || next === '?' || (next === '/' && !isAsciiLetter(html[open + 2]))) {
      const close = html.indexOf('>', open + 2);
      if (close === -1) return;
      i = close + 1;
    } else if (next === '/' || isAsciiLetter(next)) {
      const isEnd = next === '/';
      const tag = readTag(html, isEnd ? open + 2 : open + 1);
      if (!tag) return;
      const { name, attributes, selfClosing } = tag;
      yield isEnd ? { kind: 'end', name } : { kind: 'start', name, attributes, selfClosing };
      i = tag.end;
    } else {
      // A `<` that starts no tag is text
      yield { kind: 'text', text: '<' };
      i = open + 1;
    }
  }
}

function parseAttributes(attributes: Attribute[]): Record<string, unknown> {
  const props: Record<string, unknown> = {};
  for (const [name, rawValue] of attributes) {
    const value = decodeEntities(rawValue);
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

  for (const token of tokenize(html)) {
    if (skipUntil) {
      if (token.kind === 'end' && token.name.toLowerCase() === skipUntil) skipUntil = null;
      continue;
    }

    if (token.kind === 'end') {
      // Close the nearest open element with this name, and any left open inside it
      const name = token.name.toLowerCase();
      for (let i = stack.length - 1; i > 0; i--) {
        if (stack[i]!.type.toLowerCase() === name) {
          stack.length = i;
          break;
        }
      }
      continue;
    }

    if (token.kind === 'start') {
      const { name, attributes, selfClosing } = token;
      const lower = name.toLowerCase();
      if (SKIPPED_ELEMENTS.has(lower)) {
        if (!selfClosing) skipUntil = lower;
        continue;
      }
      // HTML element names are case-insensitive; SVG ones such as linearGradient are not
      const type = /[A-Z]/.test(name) && name !== name.toUpperCase() ? name : lower;
      const node: BuildNode = { type, props: parseAttributes(attributes), children: [] };
      top().children.push(node);
      if (!selfClosing && !VOID_ELEMENTS.has(lower)) {
        stack.push(node);
      }
      continue;
    }

    // Text split by a comment or a stray `<` stays one child. Whitespace-only text between
    // elements is dropped, because it would count as a child in Satori's layout.
    const text = decodeEntities(token.text);
    const siblings = top().children;
    const last = siblings[siblings.length - 1];
    if (typeof last === 'string') {
      siblings[siblings.length - 1] = last + text;
    } else if (/[^ \t\n\r\f]/.test(text)) {
      siblings.push(text);
    }
  }

  const elements = root.children.filter((child): child is BuildNode => typeof child !== 'string');
  if (elements.length === 1 && root.children.length === 1) {
    return finalize(elements[0]!);
  }
  root.props.style = { display: 'flex', width: '100%', height: '100%' };
  return finalize(root);
}
