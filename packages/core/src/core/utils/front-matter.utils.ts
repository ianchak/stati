/**
 * Front matter: the block between `---` lines at the start of a Markdown file, in YAML.
 * @module core/utils/front-matter
 */

import { relative } from 'node:path';
import { load, FAILSAFE_SCHEMA, YAMLException } from 'js-yaml';

/**
 * A Markdown file split into its front matter and its body.
 */
export interface ParsedFrontMatter {
  /** The front matter's keys and values; empty when the file has none */
  data: Record<string, unknown>;
  /** The Markdown after the front matter */
  content: string;
}

/**
 * Thrown for front matter that cannot be read: invalid YAML, YAML that is not a set of
 * `key: value` lines, or a language other than YAML after the opening `---`.
 */
export class FrontMatterError extends Error {
  /**
   * @param message - What is wrong, with the file and the line
   * @param filePath - The Markdown file
   * @param line - The line of the problem in the file, 1-based
   * @param column - The column of the problem, 1-based
   */
  constructor(
    message: string,
    public readonly filePath: string,
    public readonly line?: number,
    public readonly column?: number,
  ) {
    super(message);
    this.name = 'FrontMatterError';
  }
}

const DELIMITER = '---';
/** The closing delimiter: the first line that starts with `---` */
const CLOSING_DELIMITER = `\n${DELIMITER}`;
/** Comment lines, which alone leave the front matter empty */
const COMMENT_LINES = /^\s*#[^\n]+/gm;
/** A `key: value` line whose unquoted value contains `: `, which YAML reads as a nested key */
const UNQUOTED_COLON_VALUE = /^\s*([^\s:#'"][^:]*):\s+([^\s'"[{|>&*!#].*?:(?:\s.*)?)$/;

/**
 * Splits a Markdown file into its front matter and its body.
 *
 * Front matter starts with `---` as the file's first line, `---yaml` included, and ends at the
 * next line that starts with `---`; without one, the whole file is front matter. A file that
 * starts with `----` or any other text has none. A byte order mark is dropped. The fields Stati
 * reads as text (`title`, `description`, `tags`, `seo.title`, `seo.description`, `seo.keywords`)
 * come back as text even when YAML reads them as a number, a boolean or a date.
 *
 * @param source - The file's text
 * @param filePath - The file, for error messages and warnings
 * @param onWarning - Called with a message for each part of the front matter that is ignored
 * @returns The front matter as an object, and the Markdown after it
 * @throws {FrontMatterError} When the front matter is not valid YAML, is YAML of another shape
 *   than `key: value` lines, or names another language after `---`
 *
 * @example
 * ```typescript
 * parseFrontMatter('---\ntitle: Home\n---\n# Welcome', 'site/index.md');
 * // { data: { title: 'Home' }, content: '# Welcome' }
 * ```
 */
export function parseFrontMatter(
  source: string,
  filePath: string,
  onWarning?: (message: string) => void,
): ParsedFrontMatter {
  const text = source.charCodeAt(0) === 0xfeff ? source.slice(1) : source;
  if (!text.startsWith(DELIMITER) || text.charAt(DELIMITER.length) === '-') {
    return { data: {}, content: text };
  }

  // The rest of the opening line can name the language, as in ---yaml
  let rest = text.slice(DELIMITER.length);
  const openingLineEnd = rest.search(/\r?\n/);
  const language = (openingLineEnd === -1 ? rest : rest.slice(0, openingLineEnd)).trim();
  if (language !== '') {
    rest = rest.slice(openingLineEnd === -1 ? rest.length : openingLineEnd);
  }

  const closeIndex = rest.indexOf(CLOSING_DELIMITER);
  const block = closeIndex === -1 ? rest : rest.slice(0, closeIndex);
  let content = '';
  if (closeIndex !== -1) {
    content = rest.slice(closeIndex + CLOSING_DELIMITER.length);
    if (content.startsWith('\r')) content = content.slice(1);
    if (content.startsWith('\n')) content = content.slice(1);
  }

  if (block.replace(COMMENT_LINES, '').trim() === '') {
    return { data: {}, content };
  }
  try {
    return { data: parseBlock(block, language.toLowerCase(), filePath, onWarning), content };
  } catch (error) {
    // Without a closing line the whole file is front matter: most likely the --- is a
    // horizontal rule, or the closing line is missing
    if (closeIndex === -1 && error instanceof FrontMatterError) {
      throw new FrontMatterError(
        `Invalid front matter in ${displayPath(filePath)}: the file starts with a --- line, which starts front matter, and no later --- line ends it. Add the closing --- line, or start the file with *** for a horizontal rule.`,
        filePath,
        1,
      );
    }
    throw error;
  }
}

/**
 * Parses the text between the delimiters. Its first line is the file's first line.
 */
function parseBlock(
  block: string,
  language: string,
  filePath: string,
  onWarning?: (message: string) => void,
): Record<string, unknown> {
  const where = `Invalid front matter in ${displayPath(filePath)}`;
  let data: unknown;
  if (language === '' || language === 'yaml' || language === 'yml') {
    try {
      data = load(block);
    } catch (error) {
      throw describeYamlError(error, block, filePath, where);
    }
  } else if (language === 'json') {
    try {
      data = JSON.parse(block);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new FrontMatterError(`${where}: ${reason}.`, filePath);
    }
  } else {
    throw new FrontMatterError(
      `${where} at line 1: Stati reads front matter in YAML, not ${language}. Remove "${language}" after the opening ---.`,
      filePath,
      1,
    );
  }

  if (!isMapping(data)) {
    throw new FrontMatterError(
      `${where}: front matter must be "key: value" lines, such as "title: My page", not ${describeData(data)}.`,
      filePath,
    );
  }
  normalizeTextFields(
    data,
    () => {
      if (language === 'json') return undefined;
      try {
        return load(block, { schema: FAILSAFE_SCHEMA });
      } catch {
        // Tags such as !!int are unknown to the schema; the parsed values are the fallback
        return undefined;
      }
    },
    (field) => onWarning?.(`Ignoring empty entry in "${field}" of ${displayPath(filePath)}`),
  );
  return data;
}

function describeYamlError(
  error: unknown,
  block: string,
  filePath: string,
  where: string,
): FrontMatterError {
  if (!(error instanceof YAMLException)) {
    const reason = error instanceof Error ? error.message : String(error);
    return new FrontMatterError(`${where}: ${reason}.`, filePath);
  }
  // The block starts on the file's first line, so its line numbers are the file's
  const line = error.mark.line + 1;
  const column = error.mark.column + 1;
  const offending = UNQUOTED_COLON_VALUE.exec(block.split(/\r?\n/)[error.mark.line] ?? '');
  const hint = offending
    ? ` Quote a value that contains a colon, such as ${offending[1]}: ${JSON.stringify(offending[2]!.trim())}.`
    : '';
  return new FrontMatterError(
    `${where} at line ${line}, column ${column}: ${error.reason}.${hint}`,
    filePath,
    line,
    column,
  );
}

/** A scalar YAML reads as something other than text: a number, a boolean or a date */
function isNonTextScalar(value: unknown): boolean {
  return typeof value === 'number' || typeof value === 'boolean' || value instanceof Date;
}

/** The text of a scalar when the YAML source is not at hand: a date as `2024-01-01` or ISO 8601 */
function toText(value: unknown): string {
  if (value instanceof Date) {
    const iso = value.toISOString();
    return iso.endsWith('T00:00:00.000Z') ? iso.slice(0, 10) : iso;
  }
  return String(value);
}

/** The front matter fields Stati reads as text, as paths from the front matter's top */
const TEXT_FIELDS: readonly (readonly string[])[] = [
  ['title'],
  ['description'],
  ['tags'],
  ['seo', 'title'],
  ['seo', 'description'],
  ['seo', 'keywords'],
];
/** The text fields that hold a list of texts */
const TEXT_LIST_FIELDS = new Set(['tags', 'keywords']);

/**
 * Turns the front matter fields Stati reads as text into text, in place: `title`,
 * `description`, `tags`, `seo.title`, `seo.description` and `seo.keywords`. YAML reads
 * `title: 1984`, `tags: [2024]` and `title: 2024-01-01` as a number, a list with a number and a
 * date, and everything that escapes or compares these fields needs strings. The text is what was
 * written (`1.10` stays `1.10`), read from `readText`, which parses the same YAML with every
 * scalar left as text. `null` entries in `tags` and `seo.keywords` (`tags: [~]`) are dropped.
 *
 * @param data - Parsed front matter
 * @param readText - Parses the YAML again with every scalar as text; undefined when that fails
 *   or the front matter is not YAML. Called at most once, and only when a field needs it.
 * @param onEmpty - Called with the field for each `null` entry dropped from a list
 */
function normalizeTextFields(
  data: Record<string, unknown>,
  readText: () => unknown,
  onEmpty: (field: string) => void,
): void {
  let written: { value: unknown } | undefined;
  /** The text written at a path, or undefined when the source has none there */
  const textAt = (path: readonly (string | number)[]): string | undefined => {
    written ??= { value: readText() };
    let value = written.value;
    for (const key of path) {
      if (typeof value !== 'object' || value === null) return undefined;
      value = (value as Record<string | number, unknown>)[key];
    }
    return typeof value === 'string' ? value : undefined;
  };

  for (const path of TEXT_FIELDS) {
    const holder = path.length === 1 ? data : data[path[0]!];
    const key = path[path.length - 1]!;
    if (!isMapping(holder) || !(key in holder)) continue;

    const value = holder[key];
    if (Array.isArray(value) && TEXT_LIST_FIELDS.has(key)) {
      const entries: unknown[] = [];
      value.forEach((entry, index) => {
        if (entry === null || entry === undefined) {
          onEmpty(path.join('.'));
        } else {
          entries.push(
            isNonTextScalar(entry) ? (textAt([...path, index]) ?? toText(entry)) : entry,
          );
        }
      });
      holder[key] = entries;
    } else if (isNonTextScalar(value) && key !== 'tags') {
      // A single tags value is not a list, and is left as it is: consumers read tags as a list
      holder[key] = textAt(path) ?? toText(value);
    }
  }
}

/** Whether a parsed value is a YAML mapping, which js-yaml loads as a plain object */
function isMapping(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' && value !== null && Object.getPrototypeOf(value) === Object.prototype
  );
}

function describeData(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (Array.isArray(value)) return 'a list';
  if (value instanceof Date) return 'a date';
  if (typeof value === 'string') return `the text ${JSON.stringify(value)}`;
  if (typeof value === 'object') return 'binary data';
  return `the ${typeof value} ${String(value)}`;
}

/** A file for messages: its path from the project directory */
function displayPath(filePath: string): string {
  return relative(process.cwd(), filePath).replace(/\\/g, '/') || filePath;
}
