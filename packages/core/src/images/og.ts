/**
 * Helpers for Open Graph image generation: exclusions and inlining. Core finds a page's
 * template through the template index, nearest folder first.
 * @module images/og
 */

import { extname, join, relative, resolve } from 'node:path';
import {
  decodeBasePath,
  isNotFoundPage,
  isPathWithinDirectory,
  readFileBuffer,
  stripBasePath,
} from '../core/utils/index.js';
import { matchesGlob } from '../core/utils/glob-patterns.utils.js';
import type { PageModel } from '../types/index.js';

/**
 * Whether a page gets no generated Open Graph image: it is the site's 404 page, sets its own
 * image in front matter (`seo.openGraph.image`, or `false` to have none) or matches an
 * `exclude` pattern.
 */
export function isOgImageExcluded(page: PageModel, exclude: readonly string[]): boolean {
  if (isNotFoundPage(page)) {
    return true;
  }
  const seo = page.frontMatter.seo as { openGraph?: { image?: unknown } } | undefined;
  const image = seo?.openGraph?.image;
  if (image !== undefined && image !== null && image !== '') {
    return true;
  }
  return exclude.some((pattern) => matchesGlob(page.url, pattern));
}

/**
 * File name stem for a page's Open Graph image, from its URL.
 * The root page is `index`; `/blog/hello/` becomes `blog-hello`.
 */
export function ogImageSlug(url: string): string {
  const slug = url
    .split('/')
    .filter(Boolean)
    .join('-')
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
  return slug || 'index';
}

const MIME_BY_EXTENSION: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.svg': 'image/svg+xml',
};

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
};

/**
 * Decodes the character references in an attribute value: the ones Eta's escaping writes,
 * and numeric ones.
 */
function decodeHtmlEntities(text: string): string {
  return text.replace(
    /&(#[xX][0-9a-fA-F]+|#\d+|amp|lt|gt|quot|apos);/g,
    (match, entity: string) => {
      if (!entity.startsWith('#')) return NAMED_ENTITIES[entity]!;
      const code =
        entity[1] === 'x' || entity[1] === 'X'
          ? parseInt(entity.slice(2), 16)
          : parseInt(entity.slice(1), 10);
      return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : match;
    },
  );
}

/** A file an Open Graph template's image points at, and its type */
interface LocalImage {
  filePath: string;
  mime: string;
}

/**
 * The file a local image path names: the source of an image Stati generates, a file in the
 * static directory for a root-relative path, or one next to the template for a relative path.
 * Returns undefined for a path outside those directories or of a type that is not an image.
 */
function locateLocalImage(
  path: string,
  dirs: { staticDir: string; baseDir: string; srcDir: string },
  generatedSource: ((path: string) => string | undefined) | undefined,
): LocalImage | undefined {
  let filePath = generatedSource?.(path);
  if (!filePath) {
    filePath = path.startsWith('/') ? join(dirs.staticDir, path) : resolve(dirs.baseDir, path);
    const root = path.startsWith('/') ? dirs.staticDir : dirs.srcDir;
    if (!isPathWithinDirectory(root, filePath)) return undefined;
  }
  const mime = MIME_BY_EXTENSION[extname(filePath).toLowerCase()];
  return mime ? { filePath, mime } : undefined;
}

/**
 * Replaces local `<img src>` values in Open Graph HTML with data URIs, because the renderer
 * does not fetch files. Root-relative paths resolve from the static directory, relative ones
 * from `baseDir`. Remote URLs and data URIs are left alone.
 *
 * @param generatedSource - Finds the source of an image Stati generates (`/_img/...`), such as
 *   a responsive variant from `stati.image()`. Cards inline the source, because generated
 *   files may not exist yet.
 * @returns The HTML and the absolute paths of the files that were inlined
 */
export async function inlineLocalImages(
  html: string,
  dirs: { staticDir: string; baseDir: string; srcDir: string; basePath?: string },
  generatedSource?: (path: string) => string | undefined,
): Promise<{ html: string; files: string[] }> {
  const files: string[] = [];
  // `[^<>]` keeps each match inside one tag, so unclosed tags can't make the search quadratic
  const pattern = /(<img\b[^<>]*?\bsrc\s*=\s*)("([^"]*)"|'([^']*)')/gi;
  const replacements: Array<{ match: string; replacement: string }> = [];

  for (const match of html.matchAll(pattern)) {
    // The value is HTML-escaped: `a&amp;b.png` names the file `a&b.png`
    const src = decodeHtmlEntities(match[3] ?? match[4] ?? '').trim();
    if (!src || /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(src)) continue;

    let path: string;
    try {
      path = decodeURIComponent(src.replace(/[?#].*$/, ''));
    } catch {
      continue;
    }

    // A path with the base path in front of it, such as from `stati.url()` or `stati.image()`,
    // names the file without it; a file that really sits under a folder named like the base
    // path is found as written
    const stripped = dirs.basePath ? stripBasePath(path, decodeBasePath(dirs.basePath)) : undefined;
    const candidates = stripped === undefined ? [path] : [stripped, path];

    // Every file looked at is a dependency of the card, also one that does not exist yet:
    // adding it later changes the image the card draws
    let found: (LocalImage & { bytes: Buffer }) | undefined;
    for (const candidate of candidates) {
      const located = locateLocalImage(candidate, dirs, generatedSource);
      if (!located) continue;
      files.push(located.filePath.replace(/\\/g, '/'));
      const bytes = await readFileBuffer(located.filePath);
      if (bytes) {
        found = { ...located, bytes };
        break;
      }
    }
    if (!found) continue;
    const dataUri = `data:${found.mime};base64,${found.bytes.toString('base64')}`;
    replacements.push({ match: match[0], replacement: `${match[1]}"${dataUri}"` });
  }

  let result = html;
  for (const { match, replacement } of replacements) {
    // A function, so `$&` and the like in the tag's other attributes stay literal
    result = result.replace(match, () => replacement);
  }
  return { html: result, files };
}

/**
 * The template path to show in messages, relative to the project.
 */
export function displayTemplatePath(templatePath: string): string {
  return relative(process.cwd(), templatePath).replace(/\\/g, '/') || templatePath;
}
