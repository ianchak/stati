/**
 * Helpers for Open Graph image generation: exclusions and inlining. Core finds a page's
 * template through the template index, nearest folder first.
 * @module images/og
 */

import { extname, join, relative, resolve } from 'node:path';
import { isPathWithinDirectory, readFileBuffer } from '../core/utils/index.js';
import { matchesGlob } from '../core/utils/glob-patterns.utils.js';
import type { PageModel } from '../types/index.js';

/**
 * Whether a page gets no generated Open Graph image: it sets its own image in front matter
 * (`seo.openGraph.image`, or `false` to have none) or matches an `exclude` pattern.
 */
export function isOgImageExcluded(page: PageModel, exclude: readonly string[]): boolean {
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
  dirs: { staticDir: string; baseDir: string; srcDir: string },
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

    let filePath = generatedSource?.(path);
    if (!filePath) {
      filePath = path.startsWith('/') ? join(dirs.staticDir, path) : resolve(dirs.baseDir, path);
      const root = path.startsWith('/') ? dirs.staticDir : dirs.srcDir;
      if (!isPathWithinDirectory(root, filePath)) continue;
    }
    const mime = MIME_BY_EXTENSION[extname(filePath).toLowerCase()];
    if (!mime) continue;

    files.push(filePath.replace(/\\/g, '/'));
    const bytes = await readFileBuffer(filePath);
    if (!bytes) continue;
    const dataUri = `data:${mime};base64,${bytes.toString('base64')}`;
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
