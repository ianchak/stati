import { glob } from 'tinyglobby';
import {
  readFile,
  resolveSrcDir,
  getFrontMatterDate,
  parseFrontMatter,
  describeDateValue,
  isDraftPage,
} from './utils/index.js';
import { relative, dirname, basename } from 'node:path';
import type { PageModel, StatiConfig } from '../types/index.js';
import { computeTextStats, resolveWordsPerMinute } from './reading-time.js';
import { validatePageISGOverrides } from './isg/validation.js';
import { MARKDOWN_EXTENSION } from '../constants.js';

/**
 * Loads and parses all content files from the configured source directory.
 *
 * Front matter is checked as each file loads, so a value that stops the build stops it before
 * anything is written: with ISG on, the `tags`, `ttlSeconds` and `maxAgeCapDays` overrides
 * (`validatePageISGOverrides`). A `draft` value other than `true` or `false` is reported, and
 * the page is not a draft.
 *
 * @param config - The STATI configuration object
 * @param includeDrafts - Whether to include draft pages (marked with draft: true)
 * @returns Array of parsed page models
 * @throws {ISGConfigurationError} When ISG is on and a page's `tags`, `ttlSeconds` or
 *   `maxAgeCapDays` is invalid
 * @throws {FrontMatterError} When a file's front matter cannot be read
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

  // Exclude folders starting with underscore from content discovery. Sorted, because the
  // file system lists files in no fixed order, and pages that sort equally in listings and
  // feeds keep the order they were found in.
  const files = (
    await glob('**/*.md', {
      cwd: contentDir,
      absolute: true,
      ignore: ['**/_*/**', '_*/**'],
      expandDirectories: false,
    })
  ).sort();

  const pages: PageModel[] = [];
  const wordsPerMinute = resolveWordsPerMinute(config);
  const isgEnabled = config.isg?.enabled !== false;

  for (const file of files) {
    const content = await readFile(file, 'utf-8');
    if (!content) {
      console.warn(`Skipping file ${file}: could not read content`);
      continue;
    }
    const { data: frontMatter, content: markdown } = parseFrontMatter(content, file, (message) =>
      console.warn(message),
    );

    // YAML reads draft: no and draft: "true" as text, which neither makes a page a draft
    const { draft } = frontMatter;
    if (draft !== undefined && draft !== null && typeof draft !== 'boolean') {
      console.warn(
        `Ignoring "draft" in ${file}: ${describeDateValue(draft)} is not true or false, so the page is not a draft. Write draft: true or draft: false.`,
      );
    }

    // Skip drafts unless explicitly included
    if (isDraftPage({ frontMatter }) && !includeDrafts) {
      continue;
    }

    // Before any page renders, so an invalid value leaves the output as it was
    if (isgEnabled) {
      validatePageISGOverrides(frontMatter, file);
    }

    // POSIX separators, so a page two folders deep gets /a/b/page on Windows too
    const relativePath = relative(contentDir, file).replace(/\\/g, '/');
    const slug = computeSlug(relativePath);
    const url = computeUrl(slug, frontMatter);

    const page: PageModel = {
      slug,
      url,
      sourcePath: file,
      frontMatter,
      content: markdown,
      ...computeTextStats(markdown, wordsPerMinute),
    };

    const publishedAt = getFrontMatterDate(frontMatter, (field, value) => {
      console.warn(`Ignoring invalid date in "${field}" of ${file}: ${describeDateValue(value)}`);
    });
    if (publishedAt) {
      page.publishedAt = publishedAt;
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
