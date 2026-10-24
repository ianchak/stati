/**
 * The stylesheet Stati builds with Tailwind CSS: the path pages link in each mode, the hashed
 * production file, the rewrite of pages that link an earlier name, and the files earlier
 * builds left in the output directory.
 * @module css/stylesheet
 */

import { createHash, randomBytes } from 'node:crypto';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
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

/** A CSS `url()` with a double-quoted, single-quoted or unquoted reference, without escapes */
const CSS_URL = /url\(\s*(?:"([^"\\]*)"|'([^'\\]*)'|([^\s"'()\\]+))\s*\)/gi;

/** References that don't depend on where the stylesheet is: a scheme, the site root, a fragment */
const LOCATION_INDEPENDENT_URL = /^(?:[a-z][a-z0-9+.-]*:|\/|#)/i;

/** The `href` of a `<link>` tag, quoted or not */
const LINK_HREF = /\shref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/i;

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Hashed files: name-HASH.css, with 8 hexadecimal characters in uppercase like a bundle's */
function hashedFilePattern(name: string): RegExp {
  return new RegExp(`^${escapeRegExp(name)}-[0-9A-F]{8}\\.css$`);
}

/** Whether a path on the site is a hashed copy of the stylesheet with this name */
function isHashedStylesheetPath(path: string, name: string): boolean {
  const folder = `/${CSS_OUT_DIR}/`;
  return path.startsWith(folder) && hashedFilePattern(name).test(path.slice(folder.length));
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
  if (!SAFE_PATH.test(path) || path.includes('..') || path.includes('//')) {
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
 * {@link relinkStylesheet} writes it into cached pages as well.
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

/** How a hashed build names the stylesheet, for messages: '/_assets/styles-[hash].css' */
export function getHashedStylesheetPattern(plan: StylesheetPlan): string {
  return `/${CSS_OUT_DIR}/${plan.name}-[hash].css`;
}

/**
 * Rewrites the relative references in the stylesheet's `url()`s to paths from the site root,
 * resolved against the path the stylesheet has under its own name. A hashed copy served from
 * `_assets/` then loads the same fonts and images. References with escapes stay as they are.
 *
 * @param css - The stylesheet
 * @param path - Its path under its own name, such as '/styles.css'
 * @returns The stylesheet with root-relative references
 */
export function rebaseRelativeUrls(css: string, path: string): string {
  const base = new URL(path, 'http://stati.invalid');
  return css.replace(
    CSS_URL,
    (match, double: string | undefined, single: string | undefined, bare: string | undefined) => {
      const reference = double ?? single ?? bare ?? '';
      if (reference === '' || LOCATION_INDEPENDENT_URL.test(reference)) {
        return match;
      }
      const { pathname, search, hash } = new URL(reference, base);
      const quote = double !== undefined ? '"' : single !== undefined ? "'" : '';
      return `url(${quote}${pathname}${search}${hash}${quote})`;
    },
  );
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

    const css = rebaseRelativeUrls(compiled, plan.path);
    const hash = createHash('sha256').update(css).digest('hex').slice(0, 8).toUpperCase();
    const filename = `${plan.name}-${hash}.css`;
    const file = join(outDir, CSS_OUT_DIR, filename);
    await ensureDir(dirname(file));
    await writeFile(file, css, 'utf-8');
    return { path: `/${CSS_OUT_DIR}/${filename}`, file, sizeInBytes: Buffer.byteLength(css) };
  } finally {
    await remove(tempFile);
  }
}

/** The hashed copies of the stylesheet with this name in the output directory, as site paths */
async function findHashedStylesheets(outDir: string, name: string): Promise<string[]> {
  const pattern = hashedFilePattern(name);
  // Files only: remove() deletes folders with their contents, and links are left alone
  const entries = await readdir(join(outDir, CSS_OUT_DIR), { withFileTypes: true }).catch(() => []);
  return entries
    .filter((entry) => entry.isFile() && pattern.test(entry.name))
    .map((entry) => `/${CSS_OUT_DIR}/${entry.name}`);
}

/**
 * The hashed names that pages kept from earlier builds can link, other than this build's:
 * the one the last build recorded, and every other hashed copy of the stylesheet still in the
 * output directory. A build that stops after giving pages a new name, but before it saves the
 * cache manifest, leaves pages linking a copy the manifest doesn't record.
 *
 * @param plan - The build's stylesheet
 * @param outDir - The output directory, absolute
 * @param recorded - The path the last build recorded (`CacheManifest.stylesheets`)
 * @param current - The path this build links
 */
export async function getStaleStylesheetPaths(
  plan: StylesheetPlan,
  outDir: string,
  recorded: string | undefined,
  current: string,
): Promise<string[]> {
  const paths = new Set(await findHashedStylesheets(outDir, plan.name));
  if (recorded !== undefined && isHashedStylesheetPath(recorded, plan.name)) {
    paths.add(recorded);
  }
  paths.delete(current);
  return [...paths];
}

/**
 * Gives pages that link earlier stylesheet paths the current one: in a hashed build, the
 * pages kept from earlier builds. Each page is read once and written only when it holds one
 * of the paths. The paths carry a content hash, which page text doesn't hold, and no
 * characters HTML escapes, so each is the same in every attribute.
 *
 * @param files - The pages' output files
 * @param from - The paths the pages can carry
 * @param to - The path they get
 * @returns How many pages were rewritten
 */
export async function relinkStylesheet(
  files: readonly string[],
  from: readonly string[],
  to: string,
): Promise<number> {
  const stale = from.filter((path) => path !== '' && path !== to);
  if (stale.length === 0) {
    return 0;
  }

  let rewritten = 0;
  for (let i = 0; i < files.length; i += RELINK_BATCH_SIZE) {
    const results = await Promise.all(
      files.slice(i, i + RELINK_BATCH_SIZE).map(async (file) => {
        const html = await readFile(file);
        if (html === null) {
          return false;
        }
        const relinked = stale.reduce((text, path) => text.split(path).join(to), html);
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
 * Deletes the hashed copies of a stylesheet earlier builds wrote, never the current one: of
 * this build's stylesheet once every page links the current file, and of one the build no
 * longer builds, after a change of `--tailwind-output` or a build without the flags. The
 * output under its own name stays: the dev server's Tailwind watcher writes it, and the dev
 * server watches it for live reload only when it exists as the server starts.
 *
 * @param outDir - The output directory, absolute
 * @param name - The stylesheet's name, such as 'styles' for '/styles.css'
 * @param current - The path this build links, which stays
 * @returns The deleted files, relative to the output directory
 */
export async function removeStaleStylesheets(
  outDir: string,
  name: string,
  current?: string,
): Promise<string[]> {
  const stale = (await findHashedStylesheets(outDir, name)).filter((path) => path !== current);
  await Promise.all(stale.map((path) => remove(join(outDir, ...path.split('/')))));
  return stale.map((path) => path.slice(1));
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

/** The path an `href` points at on the site, without the site's origin, a query or a fragment */
function getHrefPath(href: string, origin: string | undefined): string {
  let path = href;
  if (origin) {
    const lower = href.toLowerCase();
    const host = origin.slice(origin.indexOf('//'));
    if (lower.startsWith(origin)) {
      path = href.slice(origin.length);
    } else if (lower.startsWith(host)) {
      path = href.slice(host.length);
    }
  }
  return path.replace(/[?#][\s\S]*$/, '');
}

/**
 * Whether the HTML has a `<link>` whose `href` is the path: quoted or not, with a query or a
 * fragment, or under the site's own origin.
 *
 * @param html - The page's HTML
 * @param path - The stylesheet path
 * @param siteUrl - The site's base URL (`site.baseUrl`), whose origin a link can carry
 */
export function linksStylesheet(html: string, path: string, siteUrl?: string): boolean {
  const origin = getSiteOrigin(siteUrl);
  for (const [tag] of html.matchAll(/<link\b[^>]*>/gi)) {
    const match = LINK_HREF.exec(tag);
    const href = match?.[1] ?? match?.[2] ?? match?.[3];
    if (href !== undefined && getHrefPath(href, origin) === path) {
      return true;
    }
  }
  return false;
}

/**
 * Adds a `<link rel="stylesheet">` before `</head>` for each path the page does not link yet,
 * like the bundles' script tags. A page without `</head>` is left alone.
 *
 * @param html - The rendered page
 * @param paths - The stylesheet paths (`stati.assets.stylesheetPaths`)
 * @param siteUrl - The site's base URL (`site.baseUrl`), whose origin a link can carry
 * @returns The page with the links
 */
export function autoInjectStylesheets(
  html: string,
  paths: readonly string[],
  siteUrl?: string,
): string {
  const missing = paths.filter((path) => !linksStylesheet(html, path, siteUrl));
  if (missing.length === 0) {
    return html;
  }
  const links = missing.map((path) => `<link rel="stylesheet" href="${path}">`);
  return injectBeforeHeadClose(html, links.join('\n    '));
}
