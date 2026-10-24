/**
 * Hashed stylesheets: the one Stati builds with Tailwind CSS and the static directory's
 * stylesheets pages link. The path pages link in each mode, the hashed production files, the
 * links production pages get to them, the rewrite of pages that link an earlier name, and the
 * files earlier builds left in the output directory.
 * @module css/stylesheet
 */

import { createHash, randomBytes } from 'node:crypto';
import { basename, dirname, isAbsolute, join, posix, relative, resolve, sep } from 'node:path';
import { URL } from 'node:url';
import {
  ensureDir,
  pathExists,
  readdir,
  readFile,
  remove,
  stat,
  writeFile,
} from '../core/utils/fs.utils.js';
import { injectBeforeHeadClose } from '../core/utils/html.utils.js';
import { CSS_OUT_DIR } from '../constants.js';
import type { CSSConfig } from '../types/index.js';
import { resolveCSSConfig } from './config.js';
import { findTailwindCli, runTailwindCLI } from './tailwind.js';

/**
 * The Tailwind CSS files `--tailwind-input` and `--tailwind-output` name, relative to the
 * project root.
 */
export interface TailwindBuildOptions {
  /** Tailwind's input stylesheet, such as 'src/styles.css' */
  input: string;
  /**
   * The stylesheet in development, inside the output directory, such as 'dist/styles.css'.
   * Production builds write `_assets/styles-[hash].css` instead, unless `css.hash` is false.
   */
  output: string;
}

/** A build's stylesheet: its files, the path it has on the site, and the `css` settings */
export interface StylesheetPlan {
  /** Tailwind's input, absolute */
  inputFile: string;
  /**
   * The output under its own name, absolute. The dev server's Tailwind watcher writes it, and
   * so does a production build with `css.hash: false`.
   */
  outputFile: string;
  /** The output's path on the site, such as '/styles.css' */
  path: string;
  /** The file name without `.css`, which names the hashed files, such as 'styles' */
  name: string;
  /** Whether this build names the file after its content */
  hash: boolean;
  /** Whether this build minifies it */
  minify: boolean;
  /** Whether pages get a `<link>` to it */
  autoInject: boolean;
}

/** The stylesheet a production build wrote */
export interface BuiltStylesheet {
  /** The path pages link, such as '/_assets/styles-A1B2C3D4.css' */
  path: string;
  /** The file, absolute */
  file: string;
  /** The file's size */
  sizeInBytes: number;
}

/** A path HTML can carry in an attribute as it is */
const SAFE_PATH = /^\/[A-Za-z0-9_\-./]+$/;

/** Pages read at once while their stylesheet link is rewritten */
const RELINK_BATCH_SIZE = 32;

/**
 * The CSS tokens that can hold a reference, scanned left to right: a comment, the `@import`
 * keyword, a `url()` with a double-quoted, single-quoted or unquoted reference, and a string,
 * whose closing quote the last group holds. Escapes are matched too, so a quoted data URI with
 * escaped quotes is one token and the scan doesn't stop at a `url()` inside it. A comment or
 * string left open runs to the end of the stylesheet, as in CSS, so the scan stays linear.
 */
const CSS_TOKEN = new RegExp(
  [
    String.raw`\/\*[\s\S]*?(?:\*\/|$)`,
    String.raw`(@import)(?![\w-])`,
    // An unquoted reference's hex escape can end with a space, which is part of the escape
    String.raw`url\(\s*(?:"((?:[^"\\]|\\[\s\S])*)"|'((?:[^'\\]|\\[\s\S])*)'|((?:[^\s"'()\\]|\\(?:[0-9a-f]{1,6}(?:\r\n|[ \t\r\n\f])?|[\s\S]))+))\s*\)`,
    String.raw`(["'])((?:(?!\5)[^\\]|\\[\s\S])*)(\5|$)`,
  ].join('|'),
  'gi',
);

/** Whitespace as CSS reads it */
const CSS_WHITESPACE_ONLY = /^[ \t\r\n\f]*$/;

/** A CSS escape: up to six hexadecimal digits and one optional whitespace, or any character */
const CSS_ESCAPE = /\\(?:([0-9a-f]{1,6})(?:\r\n|[ \t\r\n\f])?|([\s\S]))/gi;

/** References that don't depend on where the stylesheet is: a scheme, the site root, a fragment */
const LOCATION_INDEPENDENT_URL = /^(?:[a-z][a-z0-9+.-]*:|\/|#)/i;

/** A tag name after `<` or `</`: a letter, then anything up to whitespace, `/` or `>` */
const HTML_TAG_NAME = /[A-Za-z][^\t\n\f\r />]*/y;

/** Whitespace as HTML reads it between attributes */
const HTML_WHITESPACE = /[\t\n\f\r ]/;

/** Elements whose contents browsers read as text or keep inert, so tags in them aren't markup */
const HTML_TEXT_ELEMENTS = new Set(['script', 'style', 'template', 'textarea', 'title']);

/** Origin for resolving paths with `URL`, never printed */
const URL_BASE = 'http://stati.invalid';

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Hashed files: name-HASH.css, with 8 hexadecimal characters in uppercase like a bundle's */
function hashedFilePattern(name: string): RegExp {
  return new RegExp(`^${escapeRegExp(name)}-[0-9A-F]{8}\\.css$`);
}

/**
 * The folder hashed copies of a stylesheet go to, as a site path: `_assets/` with the
 * stylesheet's own folder inside it, so '/css/site.css' and '/site.css' never share a name.
 */
function hashedFolder(path: string): string {
  const folder = posix.dirname(path);
  return `/${CSS_OUT_DIR}${folder === '/' ? '' : folder}/`;
}

/** Whether a site path is a hashed copy of the stylesheet at this path */
function isHashedStylesheetPath(hashed: string, path: string): boolean {
  const folder = hashedFolder(path);
  return (
    hashed.startsWith(folder) &&
    hashedFilePattern(posix.basename(path, '.css')).test(hashed.slice(folder.length))
  );
}

/**
 * Whether a stylesheet path can be hashed and linked as it is: a .css path from the site root
 * whose characters HTML carries in an attribute unchanged.
 */
export function isHashableStylesheetPath(path: string): boolean {
  return (
    path.endsWith('.css') && SAFE_PATH.test(path) && !path.includes('..') && !path.includes('//')
  );
}

/**
 * Names a stylesheet after its content: rebases its relative references for `_assets/`, then
 * takes 8 characters of the result's SHA-256.
 *
 * @param css - The stylesheet
 * @param path - Its path under its own name, such as '/css/site.css'
 * @returns The CSS to write and its hashed path, such as '/_assets/css/site-A1B2C3D4.css'
 */
export function hashStylesheet(css: string, path: string): { css: string; path: string } {
  const rebased = rebaseRelativeUrls(css, path);
  const hash = createHash('sha256').update(rebased).digest('hex').slice(0, 8).toUpperCase();
  return {
    css: rebased,
    path: `${hashedFolder(path)}${posix.basename(path, '.css')}-${hash}.css`,
  };
}

/**
 * Works out the stylesheet a build links from the Tailwind files and the `css` settings.
 * Production hashes and minifies it unless `css` turns that off; development never does.
 *
 * @param tailwind - The Tailwind input and output
 * @param css - The `css` config block
 * @param outDir - The output directory, absolute
 * @param development - Whether this is a development build
 * @param projectRoot - The folder the Tailwind paths are relative to
 * @throws {Error} When the output is not a .css file inside the output directory, or its path
 *   holds characters other than letters, digits, `-`, `_`, `.` and `/`
 */
export function createStylesheetPlan(
  tailwind: TailwindBuildOptions,
  css: CSSConfig | undefined,
  outDir: string,
  development: boolean,
  projectRoot: string = process.cwd(),
): StylesheetPlan {
  const outputFile = resolve(projectRoot, tailwind.output);
  const relativeOutput = relative(outDir, outputFile);
  if (
    relativeOutput === '' ||
    relativeOutput === '..' ||
    relativeOutput.startsWith(`..${sep}`) ||
    isAbsolute(relativeOutput)
  ) {
    const example = join(relative(projectRoot, outDir) || '.', 'styles.css').replace(/\\/g, '/');
    throw new Error(
      `--tailwind-output must be a file in the output directory, such as ${example} (got ${tailwind.output}).`,
    );
  }

  const path = `/${relativeOutput.replace(/\\/g, '/')}`;
  if (!path.endsWith('.css')) {
    throw new Error(`--tailwind-output must be a .css file (got ${tailwind.output}).`);
  }
  if (!isHashableStylesheetPath(path)) {
    throw new Error(
      `--tailwind-output can hold only letters, digits, -, _, . and / in its path (got ${tailwind.output}).`,
    );
  }

  const { hash, minify, autoInject } = resolveCSSConfig(css, development);
  return {
    inputFile: resolve(projectRoot, tailwind.input),
    outputFile,
    path,
    name: basename(path, '.css'),
    hash,
    minify,
    autoInject,
  };
}

/**
 * Checks, before any page renders, what running Tailwind needs: the input file and an
 * installed Tailwind CSS CLI.
 *
 * @param plan - The build's stylesheet
 * @param projectRoot - The folder the CLI is looked up from
 * @throws {Error} When the input is missing or Tailwind CSS is not installed
 */
export async function checkStylesheetSources(
  plan: StylesheetPlan,
  projectRoot: string = process.cwd(),
): Promise<void> {
  if (!(await pathExists(plan.inputFile))) {
    throw new Error(
      `Tailwind CSS input not found: ${relative(projectRoot, plan.inputFile).replace(/\\/g, '/')}`,
    );
  }
  if (!(await findTailwindCli(projectRoot))) {
    throw new Error(
      'Tailwind CSS is not installed. Install it with:\n  npm install -D tailwindcss @tailwindcss/cli',
    );
  }
}

/**
 * The settings that decide a page's stylesheet link, for its cache hash. A hashed build's
 * file name is not among them: it is known only after the pages render, and
 * {@link relinkStylesheets} writes it into cached pages as well.
 */
export function getStylesheetFingerprint(plan: StylesheetPlan): {
  path: string;
  hash: boolean;
  autoInject: boolean;
} {
  return { path: plan.path, hash: plan.hash, autoInject: plan.autoInject };
}

/**
 * The stylesheet path pages render with. Development builds, and production builds with
 * `css.hash: false`, link the output under its own name. A hashed build learns the name only
 * once every page has rendered, so pages render with a name made up for this build, which no
 * page content can hold, and the build swaps in the final name as it writes them.
 *
 * @param plan - The build's stylesheet
 */
export function getRenderStylesheetPath(plan: StylesheetPlan): string {
  if (!plan.hash) {
    return plan.path;
  }
  return `/${CSS_OUT_DIR}/${plan.name}-pending-${randomBytes(8).toString('hex')}.css`;
}

/** The text a CSS string or unquoted `url()` holds, with its escapes decoded */
function unescapeCss(text: string): string {
  return text.replace(CSS_ESCAPE, (_escape, hex: string | undefined, char: string | undefined) => {
    if (hex === undefined) {
      // An escaped line break continues a string
      return /[\r\n\f]/.test(char ?? '') ? '' : (char ?? '');
    }
    const code = parseInt(hex, 16);
    const valid = code > 0 && code <= 0x10ffff && (code < 0xd800 || code > 0xdfff);
    return valid ? String.fromCodePoint(code) : '�';
  });
}

/** Escapes a URL for a CSS string in these quotes, or for an unquoted `url()` without them */
function escapeCss(url: string, quote: string): string {
  return url.replace(quote === '' ? /[\\()'"]/g : quote === '"' ? /[\\"]/g : /[\\']/g, '\\$&');
}

/**
 * Passes each reference in the stylesheet's `url()`s and `@import` strings, with its escapes
 * decoded, to `replace`, and writes what it returns in its place, escaped for the reference's
 * quotes. Comments and other strings, such as a `content` value, aren't references.
 *
 * @param css - The stylesheet
 * @param replace - Gives a reference's new URL, or undefined to leave it as it is
 * @returns The stylesheet with the references replaced
 */
function replaceCssReferences(css: string, replace: (url: string) => string | undefined): string {
  const rebase = (reference: string, quote: string): string | undefined => {
    const url = replace(unescapeCss(reference));
    return url === undefined ? undefined : escapeCss(url, quote);
  };

  // Where the last `@import`, and any comments after it, ended: a string that follows with only
  // whitespace between is what it imports
  let importEnd = -1;
  return css.replace(
    CSS_TOKEN,
    (
      token,
      keyword: string | undefined,
      urlDouble: string | undefined,
      urlSingle: string | undefined,
      urlBare: string | undefined,
      quote: string | undefined,
      text: string | undefined,
      closingQuote: string | undefined,
      offset: number,
    ) => {
      const followsImport =
        importEnd !== -1 && CSS_WHITESPACE_ONLY.test(css.slice(importEnd, offset));
      importEnd = -1;
      if (keyword !== undefined || (followsImport && token.startsWith('/*'))) {
        importEnd = offset + token.length;
        return token;
      }
      if (quote !== undefined) {
        // A string: an import's when it is closed and follows @import, else left as it is
        const rebased = followsImport && closingQuote ? rebase(text ?? '', quote) : undefined;
        return rebased === undefined ? token : `${quote}${rebased}${quote}`;
      }
      const reference = urlDouble ?? urlSingle ?? urlBare;
      if (reference === undefined) {
        // A comment
        return token;
      }
      const urlQuote = urlDouble !== undefined ? '"' : urlSingle !== undefined ? "'" : '';
      const rebased = rebase(reference, urlQuote);
      return rebased === undefined ? token : `url(${urlQuote}${rebased}${urlQuote})`;
    },
  );
}

/**
 * Rewrites the relative references in the stylesheet's `url()`s and `@import` strings to paths
 * from the site root, resolved against the path the stylesheet has under its own name. A
 * hashed copy served from `_assets/` then loads the same fonts, images and imported
 * stylesheets. A reference with escapes is decoded, rebased and escaped again; comments and
 * other strings, such as a `content` value, stay as they are.
 *
 * @param css - The stylesheet
 * @param path - Its path under its own name, such as '/styles.css'
 * @returns The stylesheet with root-relative references
 */
export function rebaseRelativeUrls(css: string, path: string): string {
  const base = new URL(path, URL_BASE);
  return replaceCssReferences(css, (url) => {
    if (url === '' || LOCATION_INDEPENDENT_URL.test(url)) {
      return undefined;
    }
    const { pathname, search, hash } = new URL(url, base);
    return `${pathname}${search}${hash}`;
  });
}

/**
 * The paths on the site that the stylesheet's `url()`s and `@import` strings reference, from
 * the site root, resolved against its own path, without a query or fragment. References with
 * a scheme, to another host, or to a fragment only are left out.
 *
 * @param css - The stylesheet
 * @param path - Its path under its own name, such as '/css/site.css'
 */
export function getStylesheetReferences(css: string, path: string): string[] {
  const base = new URL(path, URL_BASE);
  const paths = new Set<string>();
  replaceCssReferences(css, (url) => {
    if (url !== '' && !/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(url)) {
      paths.add(new URL(url, base).pathname);
    }
    return undefined;
  });
  return [...paths];
}

/**
 * Runs Tailwind CSS for a production build, once the class inventory is complete. A hashed
 * build has Tailwind write a temporary file in the cache directory, rebases its relative
 * `url()`s and writes it as `_assets/name-HASH.css`, named after its content; otherwise
 * Tailwind writes the output file.
 *
 * @param plan - The build's stylesheet
 * @param outDir - The output directory, absolute
 * @param cacheDir - The cache directory, for the temporary file
 * @param projectRoot - The folder Tailwind runs in
 * @returns The stylesheet's path and file
 * @throws {Error} When Tailwind CSS fails
 */
export async function buildStylesheet(
  plan: StylesheetPlan,
  outDir: string,
  cacheDir: string,
  projectRoot: string = process.cwd(),
): Promise<BuiltStylesheet> {
  const { inputFile: input, minify } = plan;

  if (!plan.hash) {
    await ensureDir(dirname(plan.outputFile));
    await runTailwindCLI({ projectRoot, input, output: plan.outputFile, minify });
    const { size } = await stat(plan.outputFile);
    return { path: plan.path, file: plan.outputFile, sizeInBytes: size };
  }

  const tempFile = join(cacheDir, `tailwind-${plan.name}.css`);
  await ensureDir(cacheDir);
  try {
    await runTailwindCLI({ projectRoot, input, output: tempFile, minify });
    const compiled = await readFile(tempFile);
    if (compiled === null) {
      throw new Error(`Tailwind CSS finished without writing ${tempFile}`);
    }

    const { css, path } = hashStylesheet(compiled, plan.path);
    const file = join(outDir, ...path.split('/'));
    await ensureDir(dirname(file));
    await writeFile(file, css, 'utf-8');
    return { path, file, sizeInBytes: Buffer.byteLength(css) };
  } finally {
    await remove(tempFile);
  }
}

/** The hashed copies of the stylesheet at this path in the output directory, as site paths */
async function findHashedStylesheets(outDir: string, path: string): Promise<string[]> {
  const folder = hashedFolder(path);
  const pattern = hashedFilePattern(posix.basename(path, '.css'));
  // Files only: remove() deletes folders with their contents, and links are left alone
  const entries = await readdir(join(outDir, ...folder.split('/')), { withFileTypes: true }).catch(
    () => [],
  );
  return entries
    .filter((entry) => entry.isFile() && pattern.test(entry.name))
    .map((entry) => `${folder}${entry.name}`);
}

/**
 * The hashed names of a stylesheet that pages kept from earlier builds can link, other than
 * the one this build links: the one the last build recorded, and every other hashed copy
 * still in the output directory. A build that stops after giving pages a new name, but before
 * it saves the cache manifest, leaves pages linking a copy the manifest doesn't record.
 *
 * @param outDir - The output directory, absolute
 * @param path - The stylesheet's path under its own name, such as '/styles.css'
 * @param recorded - The path the last build recorded (`CacheManifest.stylesheets`)
 * @param current - The path this build links
 */
export async function getStaleStylesheetPaths(
  outDir: string,
  path: string,
  recorded: string | undefined,
  current: string,
): Promise<string[]> {
  const paths = new Set(await findHashedStylesheets(outDir, path));
  if (recorded !== undefined && isHashedStylesheetPath(recorded, path)) {
    paths.add(recorded);
  }
  paths.delete(current);
  return [...paths];
}

/**
 * Gives pages that link earlier stylesheet paths the current ones: in a hashed build, the
 * pages kept from earlier builds. Only their stylesheet `<link>` tags on the site change, as
 * {@link rewriteStylesheetLinks} changes them; page text, scripts and other sites' URLs stay
 * as they are. Each page is read once and written only when a link changed.
 *
 * @param pages - The pages' output files and URLs, which relative links resolve against
 * @param replacements - Each earlier path the pages can link, and the path it becomes
 * @param siteUrl - The site's base URL (`site.baseUrl`), whose origin a link can carry
 * @returns How many pages were rewritten
 */
export async function relinkStylesheets(
  pages: ReadonlyArray<{ file: string; url: string }>,
  replacements: ReadonlyMap<string, string>,
  siteUrl?: string,
): Promise<number> {
  const targets = new Map([...replacements].filter(([from, to]) => from !== '' && from !== to));
  if (targets.size === 0) {
    return 0;
  }

  let rewritten = 0;
  for (let i = 0; i < pages.length; i += RELINK_BATCH_SIZE) {
    const results = await Promise.all(
      pages.slice(i, i + RELINK_BATCH_SIZE).map(async ({ file, url }) => {
        const html = await readFile(file);
        if (html === null) {
          return false;
        }
        const relinked = rewriteStylesheetLinks(html, targets, url, siteUrl);
        if (relinked === html) {
          return false;
        }
        await writeFile(file, relinked, 'utf-8');
        return true;
      }),
    );
    rewritten += results.filter(Boolean).length;
  }
  return rewritten;
}

/**
 * Deletes the hashed copies of a stylesheet earlier builds wrote, never the current one: once
 * every page links the current file, or every copy when the build no longer hashes the
 * stylesheet, such as after a change of `--tailwind-output` or the static file's removal. The
 * stylesheet under its own name stays: the dev server's Tailwind watcher writes it, the dev
 * server watches it for live reload only when it exists as the server starts, and the static
 * copy writes a stylesheet from the static directory.
 *
 * @param outDir - The output directory, absolute
 * @param path - The stylesheet's path under its own name, such as '/styles.css'
 * @param current - The path this build links, which stays
 * @returns The deleted files, relative to the output directory
 */
export async function removeStaleStylesheets(
  outDir: string,
  path: string,
  current?: string,
): Promise<string[]> {
  const stale = (await findHashedStylesheets(outDir, path)).filter((file) => file !== current);
  await Promise.all(stale.map((file) => remove(join(outDir, ...file.split('/')))));
  return stale.map((file) => file.slice(1));
}

/** The site's origin, such as 'https://example.com', or undefined without a valid base URL */
function getSiteOrigin(siteUrl: string | undefined): string | undefined {
  if (!siteUrl) {
    return undefined;
  }
  try {
    const { origin } = new URL(siteUrl);
    return origin === 'null' ? undefined : origin.toLowerCase();
  } catch {
    return undefined;
  }
}

/** An `href` on the site: the site's origin it carries, its path, and its query or fragment */
interface SiteHref {
  /** The site's origin as the `href` spells it, such as 'https://example.com', or '' */
  origin: string;
  /** The path from the site root, such as '/css/site.css' */
  path: string;
  /** The query and fragment, such as '?v=2', or '' */
  suffix: string;
}

/**
 * Splits an `href` into the site's origin, the path and the query or fragment. A relative
 * `href` resolves against the page's URL. Another origin, a scheme such as `data:`, and a
 * relative `href` without the page's URL give undefined.
 */
function parseSiteHref(
  href: string,
  siteOrigin: string | undefined,
  pageUrl: string | undefined,
): SiteHref | undefined {
  const suffixStart = href.search(/[?#]/);
  const suffix = suffixStart === -1 ? '' : href.slice(suffixStart);
  let path = suffixStart === -1 ? href : href.slice(0, suffixStart);
  let origin = '';
  if (siteOrigin) {
    const lower = path.toLowerCase();
    const host = siteOrigin.slice(siteOrigin.indexOf('//'));
    for (const prefix of [siteOrigin, host]) {
      if (lower.startsWith(`${prefix}/`)) {
        origin = path.slice(0, prefix.length);
        path = path.slice(prefix.length);
        break;
      }
    }
  }
  if (path === '' || path.startsWith('//') || /^[a-z][a-z0-9+.-]*:/i.test(path)) {
    return undefined;
  }
  if (!path.startsWith('/') && pageUrl === undefined) {
    return undefined;
  }
  // Resolves a relative path and dot segments as a browser does
  const { pathname } = new URL(path, new URL(pageUrl ?? '/', URL_BASE));
  return { origin, path: pathname, suffix };
}

/** An attribute of a tag: its name in lowercase, its value, and where the value is in the tag */
interface TagAttribute {
  name: string;
  value: string;
  /** Where the value starts in the tag, after an opening quote */
  start: number;
  /** Where the value ends in the tag, before a closing quote */
  end: number;
}

/** A `<link>` tag of a page: where it starts and ends, and its attributes */
interface LinkTag {
  start: number;
  end: number;
  attributes: TagAttribute[];
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

/** The first attribute with this name, as browsers use it */
function getAttribute(attributes: readonly TagAttribute[], name: string): TagAttribute | undefined {
  return attributes.find((attribute) => attribute.name === name);
}

function getRelTokens(attributes: readonly TagAttribute[]): string[] {
  return (getAttribute(attributes, 'rel')?.value ?? '').toLowerCase().split(/\s+/);
}

/**
 * Whether a `<link>` tag applies a stylesheet: its `rel` holds `stylesheet` and not `alternate`,
 * which browsers don't apply until the reader picks it. A preload only fetches the file.
 */
function isStylesheetLink(attributes: readonly TagAttribute[]): boolean {
  const tokens = getRelTokens(attributes);
  return tokens.includes('stylesheet') && !tokens.includes('alternate');
}

/**
 * Whether a `<link>` tag loads a stylesheet: it applies it, offers it as an alternate, or
 * preloads it (`rel="preload" as="style"`).
 */
function loadsStylesheet(attributes: readonly TagAttribute[]): boolean {
  const tokens = getRelTokens(attributes);
  return (
    tokens.includes('stylesheet') ||
    (tokens.includes('preload') && getAttribute(attributes, 'as')?.value.toLowerCase() === 'style')
  );
}

/**
 * Whether production points a `<link>` tag at a hashed name: one that loads a stylesheet,
 * without an `integrity` digest, which only the file under its own name matches.
 */
function isHashableLink(attributes: readonly TagAttribute[]): boolean {
  return loadsStylesheet(attributes) && getAttribute(attributes, 'integrity') === undefined;
}

/**
 * The `<link>` tags of a page that are markup: every tag is read with its quoted attribute
 * values, so a `>` or a `<link>` in one is text, and tags in a comment, or in a script, style,
 * template, textarea or title, aren't markup. A tag, comment or element left open runs to the
 * end of the page, as browsers read it. One pass over the page, whatever it holds.
 */
function findLinkTags(html: string): LinkTag[] {
  const tags: LinkTag[] = [];
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
        if (!closing && name === 'link') {
          tags.push({ start: i, end: next, attributes: parseAttributes(html.slice(i, next)) });
        } else if (!closing && HTML_TEXT_ELEMENTS.has(name)) {
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
  return tags;
}

/**
 * Whether the HTML has a `<link rel="stylesheet">` whose `href` is the path: quoted or not,
 * with a query or a fragment, under the site's own origin, or relative to the page.
 *
 * @param html - The page's HTML
 * @param path - The stylesheet path
 * @param siteUrl - The site's base URL (`site.baseUrl`), whose origin a link can carry
 * @param pageUrl - The page's URL, which relative links resolve against
 */
export function linksStylesheet(
  html: string,
  path: string,
  siteUrl?: string,
  pageUrl?: string,
): boolean {
  const origin = getSiteOrigin(siteUrl);
  return findLinkTags(html).some(({ attributes }) => {
    const href = isStylesheetLink(attributes) ? getAttribute(attributes, 'href') : undefined;
    return href !== undefined && parseSiteHref(href.value, origin, pageUrl)?.path === path;
  });
}

/**
 * The stylesheet paths of a page's `<link>` tags that production points at hashed names, from
 * the site root: those that apply, offer or preload a stylesheet on the site, without an
 * `integrity` digest.
 *
 * @param html - The page's HTML
 * @param pageUrl - The page's URL, which relative links resolve against
 * @param siteUrl - The site's base URL (`site.baseUrl`), whose origin a link can carry
 */
export function getLinkedStylesheetPaths(
  html: string,
  pageUrl: string,
  siteUrl?: string,
): string[] {
  const origin = getSiteOrigin(siteUrl);
  const paths = new Set<string>();
  for (const { attributes } of findLinkTags(html)) {
    const href = isHashableLink(attributes) ? getAttribute(attributes, 'href') : undefined;
    const path = href && parseSiteHref(href.value, origin, pageUrl)?.path;
    if (path !== undefined) {
      paths.add(path);
    }
  }
  return [...paths];
}

/**
 * Whether a page's `<link>` tag that loads the stylesheet at this path, on the site, has an
 * `integrity` digest: production keeps such a link's path.
 *
 * @param html - The page's HTML
 * @param path - The stylesheet path, such as '/styles.css'
 * @param pageUrl - The page's URL, which relative links resolve against
 * @param siteUrl - The site's base URL (`site.baseUrl`), whose origin a link can carry
 */
export function linksStylesheetWithIntegrity(
  html: string,
  path: string,
  pageUrl: string,
  siteUrl?: string,
): boolean {
  // Most pages have no digest, and need no scan
  if (!/integrity/i.test(html)) {
    return false;
  }
  const origin = getSiteOrigin(siteUrl);
  return findLinkTags(html).some(({ attributes }) => {
    const href = getAttribute(attributes, 'href');
    return (
      href !== undefined &&
      loadsStylesheet(attributes) &&
      getAttribute(attributes, 'integrity') !== undefined &&
      parseSiteHref(href.value, origin, pageUrl)?.path === path
    );
  });
}

/**
 * Points the `<link>` tags that load a stylesheet at another path: production gives each
 * stylesheet's links its hashed name. The `href` keeps its quotes, the site's origin and its
 * query or fragment; a relative one becomes a path from the site root. A link with an
 * `integrity` digest keeps its path, which the digest was taken from.
 *
 * @param html - The page's HTML
 * @param targets - Each stylesheet path and the path its links get
 * @param pageUrl - The page's URL, which relative links resolve against
 * @param siteUrl - The site's base URL (`site.baseUrl`), whose origin a link can carry
 * @returns The page with the links rewritten
 */
export function rewriteStylesheetLinks(
  html: string,
  targets: ReadonlyMap<string, string>,
  pageUrl: string,
  siteUrl?: string,
): string {
  if (targets.size === 0) {
    return html;
  }
  const origin = getSiteOrigin(siteUrl);
  let rewritten = '';
  let copied = 0;
  for (const { start, attributes } of findLinkTags(html)) {
    const href = isHashableLink(attributes) ? getAttribute(attributes, 'href') : undefined;
    const parts = href && parseSiteHref(href.value, origin, pageUrl);
    const target = parts && targets.get(parts.path);
    if (href && parts && target !== undefined) {
      rewritten += `${html.slice(copied, start + href.start)}${parts.origin}${target}${parts.suffix}`;
      copied = start + href.end;
    }
  }
  return rewritten + html.slice(copied);
}

/**
 * Adds a `<link rel="stylesheet">` before `</head>` for each path the page does not link yet,
 * like the bundles' script tags. A page without `</head>` is left alone.
 *
 * @param html - The rendered page
 * @param paths - The stylesheet paths (`stati.assets.stylesheetPaths`)
 * @param siteUrl - The site's base URL (`site.baseUrl`), whose origin a link can carry
 * @param pageUrl - The page's URL, which relative links resolve against
 * @returns The page with the links
 */
export function autoInjectStylesheets(
  html: string,
  paths: readonly string[],
  siteUrl?: string,
  pageUrl?: string,
): string {
  const missing = paths.filter((path) => !linksStylesheet(html, path, siteUrl, pageUrl));
  if (missing.length === 0) {
    return html;
  }
  const links = missing.map((path) => `<link rel="stylesheet" href="${path}">`);
  return injectBeforeHeadClose(html, links.join('\n    '));
}
