/**
 * The stylesheet Stati builds with Tailwind CSS: the path pages link in each mode, the hashed
 * production file, the rewrite of pages that link an earlier name, and the files earlier
 * builds left in the output directory.
 * @module css/stylesheet
 */

import { createHash } from 'node:crypto';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import {
  copyFile,
  ensureDir,
  lstat,
  pathExists,
  readdir,
  readFile,
  readFileBuffer,
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

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Hashed files: name-HASH.css, with 8 hexadecimal characters in uppercase like a bundle's */
function hashedFilePattern(name: string): RegExp {
  return new RegExp(`^${escapeRegExp(name)}-[0-9A-F]{8}\\.css$`);
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
 * once every page has rendered, so until then pages carry the name the previous build linked,
 * whose file is still on disk, and {@link relinkStylesheet} gives them the new one. A build
 * without a previous name renders a placeholder.
 *
 * @param plan - The build's stylesheet
 * @param linked - The path the previous production build linked (`CacheManifest.stylesheets`)
 */
export function getRenderStylesheetPath(plan: StylesheetPlan, linked: string | undefined): string {
  if (!plan.hash) {
    return plan.path;
  }
  const folder = `/${CSS_OUT_DIR}/`;
  if (
    linked?.startsWith(folder) &&
    hashedFilePattern(plan.name).test(linked.slice(folder.length))
  ) {
    return linked;
  }
  return `${folder}${plan.name}-[hash].css`;
}

/**
 * Runs Tailwind CSS for a production build, once the class inventory is complete. A hashed
 * build has Tailwind write a temporary file in the cache directory and copies it to
 * `_assets/name-HASH.css`, named after its content; otherwise Tailwind writes the output file.
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
    const css = await readFileBuffer(tempFile);
    if (css === null) {
      throw new Error(`Tailwind CSS finished without writing ${tempFile}`);
    }

    const hash = createHash('sha256').update(css).digest('hex').slice(0, 8).toUpperCase();
    const filename = `${plan.name}-${hash}.css`;
    const file = join(outDir, CSS_OUT_DIR, filename);
    await ensureDir(dirname(file));
    await copyFile(tempFile, file);
    return { path: `/${CSS_OUT_DIR}/${filename}`, file, sizeInBytes: css.length };
  } finally {
    await remove(tempFile);
  }
}

/**
 * Gives every page that links one stylesheet path the other: in a hashed build, the pages that
 * rendered with the previous name or the placeholder, and those kept from earlier builds,
 * which carry the previous name too. Each page is read once and written only when it holds
 * the path. The path holds no characters HTML escapes, so it is the same in every attribute.
 *
 * @param files - The pages' output files
 * @param from - The path the pages carry
 * @param to - The path they get
 * @returns How many pages were rewritten
 */
export async function relinkStylesheet(
  files: readonly string[],
  from: string,
  to: string,
): Promise<number> {
  let rewritten = 0;
  for (let i = 0; i < files.length; i += RELINK_BATCH_SIZE) {
    const results = await Promise.all(
      files.slice(i, i + RELINK_BATCH_SIZE).map(async (file) => {
        const html = await readFile(file);
        if (html === null || !html.includes(from)) {
          return false;
        }
        await writeFile(file, html.split(from).join(to), 'utf-8');
        return true;
      }),
    );
    rewritten += results.filter(Boolean).length;
  }
  return rewritten;
}

/**
 * Deletes the stylesheets earlier builds wrote under other names: hashed files from builds
 * whose CSS differed and, in a hashed build, the output under its own name that the dev
 * server's Tailwind watcher writes, which production pages never link. Only files named after
 * this stylesheet are deleted, never the current one.
 *
 * The build calls this after every page links the current file: until then, pages from the
 * previous build still load the old one.
 *
 * @param plan - The build's stylesheet
 * @param outDir - The output directory, absolute
 * @param current - The stylesheet this build wrote
 * @returns The deleted files, relative to the output directory
 */
export async function removeStaleStylesheets(
  plan: StylesheetPlan,
  outDir: string,
  current: BuiltStylesheet,
): Promise<string[]> {
  const dir = join(outDir, CSS_OUT_DIR);
  const pattern = hashedFilePattern(plan.name);
  const currentName = basename(current.file);

  // Files only: remove() deletes folders with their contents, and links are left alone
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  const stale = entries
    .filter((entry) => entry.isFile() && entry.name !== currentName && pattern.test(entry.name))
    .map((entry) => join(dir, entry.name));

  if (plan.hash) {
    const output = await lstat(plan.outputFile).catch(() => null);
    if (output?.isFile()) {
      stale.push(plan.outputFile);
    }
  }

  await Promise.all(stale.map((file) => remove(file)));
  return stale.map((file) => relative(outDir, file).replace(/\\/g, '/'));
}

/**
 * Whether the HTML has a `<link>` whose `href` is the path.
 *
 * @param html - The page's HTML
 * @param path - The stylesheet path
 */
export function linksStylesheet(html: string, path: string): boolean {
  return new RegExp(`<link\\b[^>]*\\shref=["']${escapeRegExp(path)}["'][^>]*>`, 'i').test(html);
}

/**
 * Adds a `<link rel="stylesheet">` before `</head>` for each path the page does not link yet,
 * like the bundles' script tags. A page without `</head>` is left alone.
 *
 * @param html - The rendered page
 * @param paths - The stylesheet paths (`stati.assets.stylesheetPaths`)
 * @returns The page with the links
 */
export function autoInjectStylesheets(html: string, paths: readonly string[]): string {
  const missing = paths.filter((path) => !linksStylesheet(html, path));
  if (missing.length === 0) {
    return html;
  }
  const links = missing.map((path) => `<link rel="stylesheet" href="${path}">`);
  return injectBeforeHeadClose(html, links.join('\n    '));
}
