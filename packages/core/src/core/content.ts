import glob from 'fast-glob';
import { readFile, resolveSrcDir } from './utils/index.js';
import matter from 'gray-matter';
import { relative, dirname, basename } from 'path';
import type { PageModel, StatiConfig } from '../types/index.js';
import { MARKDOWN_EXTENSION } from '../constants.js';

/**
 * Loads and parses all content files from the configured source directory.
 *
 * @param config - The STATI configuration object
 * @param includeDrafts - Whether to include draft pages (marked with draft: true)
 * @returns Array of parsed page models
 *
 * @example
 * ```typescript
 * // Load all content including drafts
 * const pages = await loadContent(config, true);
 *
 * // Load only published content
 * const publishedPages = await loadContent(config, false);
 * ```
 */
export async function loadContent(
  config: StatiConfig,
  includeDrafts?: boolean,
): Promise<PageModel[]> {
  const contentDir = resolveSrcDir(config);

  // Exclude folders starting with underscore from content discovery
  const files = await glob('**/*.md', {
    cwd: contentDir,
    absolute: true,
    ignore: ['**/_*/**', '_*/**'],
  });

  const pages: PageModel[] = [];

  for (const file of files) {
    const content = await readFile(file, 'utf-8');
    if (!content) {
      console.warn(`Skipping file ${file}: could not read content`);
      continue;
    }
    const { data: frontMatter, content: markdown } = matter(content);

    // Skip drafts unless explicitly included
    if (frontMatter.draft && !includeDrafts) {
      continue;
    }

    const relativePath = relative(contentDir, file);
    const slug = computeSlug(relativePath);
    const url = computeUrl(slug, frontMatter);

    const page: PageModel = {
      slug,
      url,
      sourcePath: file,
      frontMatter,
      content: markdown,
    };

    if (frontMatter.publishedAt && typeof frontMatter.publishedAt === 'string') {
      page.publishedAt = new Date(frontMatter.publishedAt);
    }

    pages.push(page);
  }

  return pages;
}

function computeSlug(relativePath: string): string {
  const dir = dirname(relativePath);
  const name = basename(relativePath, MARKDOWN_EXTENSION);

  if (name === 'index') {
    return dir === '.' ? '/' : `/${dir}`;
  }

  return dir === '.' ? `/${name}` : `/${dir}/${name}`;
}

function computeUrl(slug: string, frontMatter: Record<string, unknown>): string {
  if (frontMatter.permalink && typeof frontMatter.permalink === 'string') {
    return frontMatter.permalink;
  }

  return slug.replace(/\/index$/, '/');
}
