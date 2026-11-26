/**
 * Maps an image `src` as written in Markdown or a template to a file on disk.
 * @module images/resolve
 */

import { dirname, extname, join, resolve } from 'node:path';
import { isPathWithinDirectory } from '../core/utils/index.js';

/**
 * Extensions Stati reads dimensions from. Other files next to a page, such as SVG, are
 * published as they are; under the static directory they are left as authored.
 */
const SUPPORTED_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif']);

/** Source files Stati renders itself, never published by an image that points at them. */
const SOURCE_EXTENSIONS = new Set(['.md', '.eta']);

/** Suffix that opts a single image out of sizing and transforming. */
const RAW_SUFFIX = '?raw';

/**
 * Where an image's `src` points.
 * - `skip`: leave the image alone (remote, outside the site, a Markdown or Eta source file, or
 *   under the static directory and either opted out or in a format Stati does not size);
 *   `src` is the value to emit, with any `?raw` suffix removed.
 * - `static`: a file under the static directory, served at its own URL.
 * - `colocated`: a file under the source directory, next to the page that uses it.
 * - `asset`: a file under the source directory that Stati publishes without sizing or
 *   transforming it: a format it does not size, such as SVG, or one marked `?raw`.
 */
export type ResolvedImageSource =
  | { kind: 'skip'; src: string }
  | { kind: 'static'; src: string; filePath: string }
  | { kind: 'colocated'; src: string; filePath: string }
  | { kind: 'asset'; src: string; filePath: string };

/**
 * Paths needed to resolve an image for one page.
 */
export interface ImageResolveContext {
  /** Absolute path of the Markdown file being rendered */
  pageSourcePath: string;
  /** Absolute source directory */
  srcDir: string;
  /** Absolute static assets directory */
  staticDir: string;
}

/**
 * Resolves an image `src`.
 * Root-relative paths (`/images/hero.jpg`) resolve from the static directory; relative
 * paths (`./hero.jpg`) resolve next to the page's Markdown file. The source directory is
 * not published, so a relative path inside it is never left as authored: Stati sizes and
 * copies the formats it reads, and copies any other file as it is.
 *
 * @param rawSrc - The `src` as authored
 * @param context - The page and site directories
 * @returns Where the image lives, or `skip` when it should be left as authored
 */
export function resolveImageSource(
  rawSrc: string,
  context: ImageResolveContext,
): ResolvedImageSource {
  const trimmed = rawSrc.trim();
  if (!trimmed) return { kind: 'skip', src: rawSrc };

  const raw = trimmed.endsWith(RAW_SUFFIX);
  const src = raw ? trimmed.slice(0, -RAW_SUFFIX.length) : trimmed;

  // Remote URLs, protocol-relative URLs and data URIs
  if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(src)) {
    return { kind: 'skip', src };
  }

  let path: string;
  try {
    path = decodeURIComponent(src.replace(/[?#].*$/, ''));
  } catch {
    return { kind: 'skip', src };
  }
  // A bare query or fragment points at the page itself
  if (!path) {
    return { kind: 'skip', src };
  }

  const extension = extname(path).toLowerCase();
  const sized = !raw && SUPPORTED_EXTENSIONS.has(extension);

  if (path.startsWith('/')) {
    const filePath = join(context.staticDir, path);
    return sized && isPathWithinDirectory(context.staticDir, filePath)
      ? { kind: 'static', src, filePath }
      : { kind: 'skip', src };
  }

  const filePath = resolve(dirname(context.pageSourcePath), path);
  if (!isPathWithinDirectory(context.srcDir, filePath) || SOURCE_EXTENSIONS.has(extension)) {
    return { kind: 'skip', src };
  }
  return { kind: sized ? 'colocated' : 'asset', src, filePath };
}
