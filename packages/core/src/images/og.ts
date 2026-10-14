/**
 * Helpers for Open Graph image generation: template lookup, exclusions and inlining.
 * @module images/og
 */

import { dirname, extname, join, relative, resolve } from 'node:path';
import { isPathWithinDirectory, pathExists, readFileBuffer } from '../core/utils/index.js';
import { matchesGlob } from '../core/utils/glob-patterns.utils.js';
import type { PageModel } from '../types/index.js';

/** Cache of template lookups per directory, cleared at the start of each build. */
const templateCache = new Map<string, string | null>();

/**
 * Clears the Open Graph template lookup cache.
 */
export function clearOgTemplateCache(): void {
  templateCache.clear();
}

/**
 * Finds the Open Graph template for a page: the nearest file named `templateName` in the
 * page's directory or one of its parents, up to the source directory.
 *
 * @param pageSourcePath - Absolute path of the page's Markdown file
 * @param srcDir - Absolute source directory
 * @param templateName - Template file name, such as `og.eta`
 * @returns Absolute path of the template, or null when there is none
 */
export async function findOgTemplatePath(
  pageSourcePath: string,
  srcDir: string,
  templateName: string,
): Promise<string | null> {
  const root = resolve(srcDir);
  let dir = dirname(resolve(pageSourcePath));
  const visited: string[] = [];

  while (isPathWithinDirectory(root, dir)) {
    const cacheKey = `${dir}|${templateName}`;
    if (templateCache.has(cacheKey)) {
      const cached = templateCache.get(cacheKey)!;
      for (const key of visited) templateCache.set(key, cached);
      return cached;
    }
    visited.push(cacheKey);

    const candidate = join(dir, templateName);
    if (await pathExists(candidate)) {
      for (const key of visited) templateCache.set(key, candidate);
      return candidate;
    }
    if (dir === root) break;
    dir = dirname(dir);
  }

  for (const key of visited) templateCache.set(key, null);
  return null;
}

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

/**
 * Replaces local `<img src>` values in Open Graph HTML with data URIs, because the renderer
 * does not fetch files. Root-relative paths resolve from the static directory, relative ones
 * from `baseDir`. Remote URLs and data URIs are left alone.
 *
 * @returns The HTML and the absolute paths of the files that were inlined
 */
export async function inlineLocalImages(
  html: string,
  dirs: { staticDir: string; baseDir: string; srcDir: string },
): Promise<{ html: string; files: string[] }> {
  const files: string[] = [];
  const pattern = /(<img\b[^>]*?\bsrc\s*=\s*)("([^"]*)"|'([^']*)')/gi;
  const replacements: Array<{ match: string; replacement: string }> = [];

  for (const match of html.matchAll(pattern)) {
    const src = (match[3] ?? match[4] ?? '').trim();
    if (!src || /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(src)) continue;

    let path: string;
    try {
      path = decodeURIComponent(src.replace(/[?#].*$/, ''));
    } catch {
      continue;
    }
    const mime = MIME_BY_EXTENSION[extname(path).toLowerCase()];
    if (!mime) continue;

    const filePath = path.startsWith('/')
      ? join(dirs.staticDir, path)
      : resolve(dirs.baseDir, path);
    const root = path.startsWith('/') ? dirs.staticDir : dirs.srcDir;
    if (!isPathWithinDirectory(root, filePath)) continue;

    files.push(filePath.replace(/\\/g, '/'));
    const bytes = await readFileBuffer(filePath);
    if (!bytes) continue;
    const dataUri = `data:${mime};base64,${bytes.toString('base64')}`;
    replacements.push({ match: match[0], replacement: `${match[1]}"${dataUri}"` });
  }

  let result = html;
  for (const { match, replacement } of replacements) {
    result = result.replace(match, replacement);
  }
  return { html: result, files };
}

/**
 * The template path to show in messages, relative to the project.
 */
export function displayTemplatePath(templatePath: string): string {
  return relative(process.cwd(), templatePath).replace(/\\/g, '/') || templatePath;
}
