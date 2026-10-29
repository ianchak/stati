import type { PageModel, RelatedPagesOptions } from '../types/index.js';

/** Pages `related()` returns when `limit` is not set. */
export const DEFAULT_RELATED_LIMIT = 3;

/** Front matter field `related()` compares when `by` is not set. */
export const DEFAULT_RELATED_FIELD = 'tags';

/**
 * Drops the trailing slash of a page URL, so `/blog/post` and `/blog/post/` name the same page.
 */
function normalizeUrl(url: string): string {
  return url.length > 1 && url.endsWith('/') ? url.slice(0, -1) : url;
}

/**
 * The folder URL of a page: `/news/world/story` lives in `/news/world`, and a top-level page
 * in the root folder (`''`).
 */
function folderOf(url: string): string {
  const path = normalizeUrl(url);
  return path.slice(0, path.lastIndexOf('/'));
}

/**
 * The values of a front matter field, lower-cased, without blanks or duplicates. The field may
 * hold a list or a single value; only text and numbers count.
 */
function valuesOf(page: PageModel, field: string): Set<string> {
  const raw = page.frontMatter[field];
  const values = new Set<string>();
  for (const entry of Array.isArray(raw) ? raw : [raw]) {
    if (typeof entry === 'string' || typeof entry === 'number') {
      const value = String(entry).trim().toLowerCase();
      if (value) {
        values.add(value);
      }
    }
  }
  return values;
}

/** The URL an `exclude` entry names: a URL string, or a page. Anything else names nothing. */
function excludedUrl(entry: unknown): string | undefined {
  if (typeof entry === 'string') {
    return normalizeUrl(entry);
  }
  const url = (entry as { url?: unknown } | null | undefined)?.url;
  return typeof url === 'string' ? normalizeUrl(url) : undefined;
}

/**
 * Checks the options of a `related()` call. A wrong type throws, so the page that made the
 * call shows up in the render error instead of getting a quiet empty list.
 */
function resolveOptions(options: RelatedPagesOptions): {
  limit: number;
  by: string;
  exclude: Set<string>;
  sameFolderBonus: number;
} {
  const { limit = DEFAULT_RELATED_LIMIT, by = DEFAULT_RELATED_FIELD, exclude = [] } = options;
  const { sameFolderBonus = 0 } = options;

  if (!Number.isInteger(limit) || limit < 0) {
    throw new TypeError(`related(): limit must be a whole number of at least 0, got ${limit}`);
  }
  if (typeof by !== 'string' || !by) {
    throw new TypeError('related(): by must be the name of a front matter field');
  }
  if (!Array.isArray(exclude)) {
    throw new TypeError('related(): exclude must be an array of page URLs or pages');
  }
  if (
    typeof sameFolderBonus !== 'number' ||
    !Number.isFinite(sameFolderBonus) ||
    sameFolderBonus < 0
  ) {
    throw new TypeError(
      `related(): sameFolderBonus must be a number of at least 0, got ${sameFolderBonus}`,
    );
  }

  const skipped = new Set<string>();
  for (const entry of exclude) {
    const url = excludedUrl(entry);
    if (url !== undefined) {
      skipped.add(url);
    }
  }
  return { limit, by, exclude: skipped, sameFolderBonus };
}

/**
 * Picks the pages of a collection most related to one of its pages.
 *
 * A page scores one point for each value of the `by` field (case-insensitive, `tags` by
 * default) that it shares with the page, plus `sameFolderBonus` when it sits in the same
 * folder. Pages that share no value are left out, whatever their bonus, and so are the page
 * itself and the pages in `exclude`. Higher scores come first; pages with the same score keep
 * the order of `pages`, so passing them newest first breaks ties newest first.
 *
 * @param pages - The collection's pages, newest first
 * @param url - URL of the page to find related pages for
 * @param options - Limit, field, exclusions and folder bonus
 * @returns Up to `limit` pages; empty when `url` is not in `pages` or the page has no values
 */
export function findRelatedPages(
  pages: readonly PageModel[],
  url: string,
  options: RelatedPagesOptions = {},
): PageModel[] {
  const { limit, by, exclude, sameFolderBonus } = resolveOptions(options);

  const target = normalizeUrl(String(url));
  const current = pages.find((page) => normalizeUrl(page.url) === target);
  if (!current) {
    return [];
  }
  const own = valuesOf(current, by);
  if (own.size === 0) {
    return [];
  }
  const folder = folderOf(current.url);

  const scored: { page: PageModel; score: number }[] = [];
  for (const page of pages) {
    const pageUrl = normalizeUrl(page.url);
    if (pageUrl === target || exclude.has(pageUrl)) {
      continue;
    }
    let shared = 0;
    for (const value of valuesOf(page, by)) {
      if (own.has(value)) {
        shared++;
      }
    }
    if (shared > 0) {
      const bonus = sameFolderBonus > 0 && folderOf(page.url) === folder ? sameFolderBonus : 0;
      scored.push({ page, score: shared + bonus });
    }
  }

  // Array.prototype.sort is stable, so equal scores stay in the order of `pages`
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ page }) => page);
}
