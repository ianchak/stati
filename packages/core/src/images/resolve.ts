/**
 * Maps an image `src` as written in Markdown or a template to a file on disk.
 * @module images/resolve
 */

import { dirname, extname, join, resolve } from 'node:path';
import { isPathWithinDirectory } from '../core/utils/index.js';

/** Extensions Stati reads dimensions from. SVG and anything else are left as authored. */
const SUPPORTED_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif']);

/** Suffix that opts a single image out of processing. */
const RAW_SUFFIX = '?raw';

/**
 * Where an image's `src` points.
 * - `skip`: leave the image alone (remote, SVG, unsupported, opted out or outside the site);
 *   `src` is the value to emit, with any `?raw` suffix removed.
 * - `static`: a file under the static directory, served at its own URL.
 * - `colocated`: a file under the source directory, next to the page that uses it.
 */
export type ResolvedImageSource =
  | { kind: 'skip'; src: string }
  | { kind: 'static'; src: string; filePath: string }
  | { kind: 'colocated'; src: string; filePath: string };

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
 * paths (`./hero.jpg`) resolve next to the page's Markdown file.
 *
 * @param rawSrc - The `src` as authored
 * @param context - The page and site directories
 * @returns Where the image lives, or `skip` when it should be left as authored
 */
export function resolveImageSource(
  rawSrc: string,
  context: ImageResolveContext,
): ResolvedImageSource {
  const src = rawSrc.trim();
  if (!src) return { kind: 'skip', src: rawSrc };

  if (src.endsWith(RAW_SUFFIX)) {
    return { kind: 'skip', src: src.slice(0, -RAW_SUFFIX.length) };
  }

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

  if (!SUPPORTED_EXTENSIONS.has(extname(path).toLowerCase())) {
    return { kind: 'skip', src };
  }

  if (path.startsWith('/')) {
    const filePath = join(context.staticDir, path);
    return isPathWithinDirectory(context.staticDir, filePath)
      ? { kind: 'static', src, filePath }
      : { kind: 'skip', src };
  }

  const filePath = resolve(dirname(context.pageSourcePath), path);
  return isPathWithinDirectory(context.srcDir, filePath)
    ? { kind: 'colocated', src, filePath }
    : { kind: 'skip', src };
}
