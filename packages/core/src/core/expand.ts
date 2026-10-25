import { basename, join, relative, sep } from 'node:path';
import type {
  FrontMatter,
  GeneratedPageData,
  GeneratedPageEntry,
  Logger,
  PageModel,
  PaginationData,
  StatiConfig,
} from '../types/index.js';
import { getPageOutputFile, isPageUrlInsideOutput, resolveSrcDir, slugify } from './utils/index.js';
import { findCollectionPath, getCollections, resolveCollectionPath } from './collections.js';

/**
 * File name of a template that expands into one page per key, such as `[tag].md`.
 */
const TEMPLATE_FILE_PATTERN = /^\[([^\]]*)\]\.md$/;

/**
 * Valid template parameter names: `[tag].md`, `[author].md`, `[release_year].md`.
 */
const PARAM_NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_-]*$/;

/**
 * Valid `paginate.path` values: one URL segment.
 */
const PAGINATION_PATH_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;

/** URL segment before the page number when `paginate.path` is not set */
export const DEFAULT_PAGINATION_PATH = 'page';

/**
 * Resolved pagination settings.
 */
interface PaginationSettings {
  size: number;
  path: string;
}

/**
 * A key a template expands into, with the pages it lists.
 */
interface KeyGroup {
  key: string;
  label: string;
  items: PageModel[];
}

/**
 * Returns the parameter name of a `[param].md` template, or undefined for other pages.
 *
 * @param page - A loaded page
 * @returns The name between the brackets
 */
export function getTemplateParam(page: PageModel): string | undefined {
  return TEMPLATE_FILE_PATTERN.exec(basename(page.sourcePath))?.[1];
}

/**
 * Replaces `{param}` with the label in a string. `{{param}}` produces the literal `{param}`,
 * and placeholders of other names are left as they are.
 *
 * @param text - The string to fill in
 * @param param - The template's parameter name, such as `tag`
 * @param label - The value, such as `CSS`
 * @returns The string with its placeholders replaced
 *
 * @example
 * ```typescript
 * replacePlaceholders('Posts tagged {tag}', 'tag', 'CSS'); // 'Posts tagged CSS'
 * replacePlaceholders('Use {{tag}} in titles', 'tag', 'CSS'); // 'Use {tag} in titles'
 * replacePlaceholders('{author} on {tag}', 'tag', 'CSS'); // '{author} on CSS'
 * ```
 */
export function replacePlaceholders(text: string, param: string, label: string): string {
  const name = param.replace(/[.*+?^${}()|[\]\\-]/g, '\\$&');
  return text.replace(new RegExp(`\\{\\{${name}\\}\\}|\\{${name}\\}`, 'g'), (match) =>
    match.startsWith('{{') ? `{${param}}` : label,
  );
}

/**
 * Deep-copies a value from front matter (YAML data: strings, numbers, booleans, dates, lists
 * and mappings), passing every string inside it through `mapString`.
 */
function copyValue(value: unknown, mapString: (text: string) => string = (text) => text): unknown {
  if (typeof value === 'string') {
    return mapString(value);
  }
  if (Array.isArray(value)) {
    return value.map((item) => copyValue(item, mapString));
  }
  if (value instanceof Date) {
    return new Date(value.getTime());
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, copyValue(item, mapString)]),
    );
  }
  return value;
}

/**
 * Copies a template's front matter for one generated page, with `{param}` placeholders filled
 * in. `generate` and `permalink` are copied as they are: they configure the template, and
 * `permalink` takes the key through `[param]` instead.
 *
 * @param frontMatter - The template's front matter
 * @param param - The template's parameter name
 * @param label - The value for the page
 * @returns The page's front matter
 */
export function substituteFrontMatter(
  frontMatter: FrontMatter,
  param: string,
  label: string,
): FrontMatter {
  const result: FrontMatter = {};
  for (const [key, value] of Object.entries(frontMatter)) {
    result[key] =
      key === 'generate' || key === 'permalink'
        ? copyValue(value)
        : copyValue(value, (text) => replacePlaceholders(text, param, label));
  }
  return result;
}

/**
 * URL of page `pageNumber` of a listing whose first page is `baseUrl`. Later pages follow the
 * first page's trailing-slash style: `/blog` → `/blog/page/2`, `/blog/` → `/blog/page/2/`,
 * `/` → `/page/2`.
 *
 * @param baseUrl - URL of the first page
 * @param path - URL segment before the page number
 * @param pageNumber - Page number, starting at 1
 * @returns The page URL
 */
export function getPaginationUrl(baseUrl: string, path: string, pageNumber: number): string {
  if (pageNumber <= 1) {
    return baseUrl;
  }
  if (baseUrl === '/') {
    return `/${path}/${pageNumber}`;
  }
  return baseUrl.endsWith('/')
    ? `${baseUrl}${path}/${pageNumber}/`
    : `${baseUrl}/${path}/${pageNumber}`;
}

/**
 * Builds the pagination data of every page of a listing.
 *
 * @param baseUrl - URL of the first page
 * @param items - Everything the listing shows, in order
 * @param settings - Page size and URL segment
 * @returns One entry per page; there is always at least one
 */
export function paginateItems(
  baseUrl: string,
  items: readonly PageModel[],
  settings: PaginationSettings,
): PaginationData[] {
  const totalPages = Math.max(1, Math.ceil(items.length / settings.size));
  const urls = Array.from({ length: totalPages }, (_, i) =>
    getPaginationUrl(baseUrl, settings.path, i + 1),
  );
  return urls.map((_, i) => ({
    pageNumber: i + 1,
    totalPages,
    items: items.slice(i * settings.size, (i + 1) * settings.size),
    ...(i > 0 && { prevUrl: urls[i - 1]! }),
    ...(i < totalPages - 1 && { nextUrl: urls[i + 1]! }),
    // One array for the whole listing, not one per page; templates get their own copy
    urls,
  }));
}

/**
 * Reads `paginate` settings from front matter.
 *
 * @param value - `paginate` or `generate.paginate`: a size, or `{ size, path }`
 * @param warn - Reports an invalid value
 * @returns The settings, or undefined when the value is absent or invalid
 */
function parsePaginate(
  value: unknown,
  warn: (message: string) => void,
): PaginationSettings | undefined {
  if (value === undefined || value === null || value === false) {
    return undefined;
  }
  const options = typeof value === 'number' ? { size: value } : value;
  if (!options || typeof options !== 'object' || Array.isArray(options)) {
    warn('paginate must be a page size or { size, path }; the page is not paginated');
    return undefined;
  }
  const { size, path } = options as { size?: unknown; path?: unknown };
  if (typeof size !== 'number' || !Number.isInteger(size) || size < 1) {
    warn('paginate.size must be a whole number of at least 1; the page is not paginated');
    return undefined;
  }
  if (path === undefined) {
    return { size, path: DEFAULT_PAGINATION_PATH };
  }
  if (typeof path !== 'string' || !PAGINATION_PATH_PATTERN.test(path)) {
    warn(
      `paginate.path must be a single URL segment such as "page"; using "${DEFAULT_PAGINATION_PATH}"`,
    );
    return { size, path: DEFAULT_PAGINATION_PATH };
  }
  return { size, path };
}

/**
 * Groups the pages of a collection by the values of a front matter field. Values are slugified
 * into keys; values that slugify to the same key share one group, under the first value seen.
 *
 * @param pages - Collection pages, newest first
 * @param field - Front matter field holding a string, a number, or a list of them
 * @param onEmptyKey - Reports a value that slugifies to nothing
 * @param onCollision - Reports a value merged into the group of another value
 * @returns The groups, sorted by key
 */
function groupByField(
  pages: readonly PageModel[],
  field: string,
  onEmptyKey: (label: string) => void,
  onCollision: (key: string, kept: string, merged: string) => void,
): KeyGroup[] {
  const groups = new Map<string, KeyGroup>();

  for (const page of pages) {
    const value = page.frontMatter[field];
    const values = Array.isArray(value) ? value : [value];
    const pageKeys = new Set<string>();

    for (const raw of values) {
      if (typeof raw !== 'string' && !(typeof raw === 'number' && Number.isFinite(raw))) {
        continue;
      }
      const label = String(raw).trim();
      if (!label) {
        continue;
      }
      const key = slugify(label);
      if (!key) {
        onEmptyKey(label);
        continue;
      }

      let group = groups.get(key);
      if (!group) {
        group = { key, label, items: [] };
        groups.set(key, group);
      } else if (group.label !== label) {
        onCollision(key, group.label, label);
      }
      // A page that lists two values with the same key appears once
      if (!pageKeys.has(key)) {
        pageKeys.add(key);
        group.items.push(page);
      }
    }
  }

  return [...groups.values()].sort((a, b) => a.key.localeCompare(b.key));
}

/**
 * Turns the pages loaded from Markdown into the pages of a build:
 *
 * - Each `[param].md` template is removed and replaced by one page per key: per value of
 *   `generate.from` in its collection, and per `collections.generate` entry that names it.
 *   A template that produces no keys produces no output.
 * - Every page with `paginate`, and every generated page whose template has
 *   `generate.paginate`, gets one more page per additional slice of its items.
 *
 * Generated and pagination pages are virtual: they are never collection members and are left
 * out of navigation, search and RSS unless they opt in. A virtual page whose URL or output
 * file is already taken is skipped with a warning.
 *
 * @param loaded - Pages loaded from Markdown files
 * @param config - Stati configuration
 * @param logger - Logger for warnings
 * @returns The pages to build: loaded pages without templates, then virtual pages
 */
export async function expandPages(
  loaded: PageModel[],
  config: StatiConfig,
  logger: Logger,
): Promise<PageModel[]> {
  // Source-relative path of a page, such as blog/tags/[tag].md, for template paths and warnings
  let srcDir: string | undefined;
  const label = (page: PageModel) =>
    relative((srcDir ??= resolveSrcDir(config)), page.sourcePath).replace(/\\/g, '/');

  const reported = new Set<string>();
  const warnOnce = (message: string) => {
    if (!reported.has(message)) {
      reported.add(message);
      logger.warning(message);
    }
  };

  const templates: Array<{ page: PageModel; param: string; path: string }> = [];
  const pages: PageModel[] = [];
  for (const page of loaded) {
    if (!isPageUrlInsideOutput(page.url)) {
      warnOnce(
        `${label(page)}: the URL ${page.url} has a ".." segment, which leads out of the output directory; the file is skipped`,
      );
      continue;
    }
    const param = getTemplateParam(page);
    if (param === undefined) {
      pages.push(page);
    } else if (!PARAM_NAME_PATTERN.test(param)) {
      warnOnce(
        `${label(page)}: "${param}" is not a valid template parameter (use letters, digits, - and _, such as [tag].md); the file is skipped`,
      );
    } else {
      templates.push({ page, param, path: label(page) });
    }
  }

  const collections = getCollections(pages);

  // Front matter that only works elsewhere, or names a collection that doesn't exist
  for (const page of pages) {
    const { collection, generate } = page.frontMatter;
    if (collection !== undefined && findCollectionPath(collections, collection) === undefined) {
      warnOnce(
        `${label(page)}: collection "${String(collection)}" is not the URL of a collection index page; the page reads its default collection`,
      );
    }
    if (generate !== undefined) {
      warnOnce(
        `${label(page)}: generate only works in a [param].md template, such as site/blog/tags/[tag].md`,
      );
    }
  }

  // Output files taken so far, with the URL that writes each. A later page that would write
  // one is skipped: /tags/ and /tags/index both write tags/index.html.
  const outputFileOf = (url: string) => join(sep, getPageOutputFile(url)).replace(/\\/g, '/');
  const taken = new Map<string, string>();
  for (const page of pages) {
    const file = outputFileOf(page.url);
    if (!taken.has(file)) {
      taken.set(file, page.url);
    }
  }
  const claim = (url: string, what: string): boolean => {
    const file = outputFileOf(url);
    const owner = taken.get(file);
    if (owner === url) {
      warnOnce(`${what} would use the URL ${url}, which another page already has; it is skipped`);
      return false;
    }
    if (owner !== undefined) {
      warnOnce(
        `${what} would use the URL ${url}, which writes the same file as ${owner} (${file.slice(1)}); it is skipped`,
      );
      return false;
    }
    taken.set(file, url);
    return true;
  };

  // Pages from collections.generate, grouped by the template they name
  const entriesByTemplate = new Map<string, GeneratedPageEntry[]>();
  for (const entry of await runGenerateHook(config, pages, logger)) {
    const template = normalizeTemplatePath(entry.template);
    const known = templates.some((candidate) => candidate.path === template);
    if (typeof entry.url !== 'string' || !entry.url.startsWith('/')) {
      warnOnce(
        `collections.generate: entry with url ${JSON.stringify(entry.url)} needs a URL starting with "/"; it is skipped`,
      );
    } else if (!isPageUrlInsideOutput(entry.url)) {
      warnOnce(
        `collections.generate: the URL ${entry.url} has a ".." segment, which leads out of the output directory; it is skipped`,
      );
    } else if (!known) {
      warnOnce(
        `collections.generate: ${entry.url} names the template ${JSON.stringify(entry.template)}, which is not a [param].md file in the source directory; it is skipped`,
      );
    } else {
      const list = entriesByTemplate.get(template) ?? [];
      list.push(entry);
      entriesByTemplate.set(template, list);
    }
  }

  const generatedPages: PageModel[] = [];
  for (const { page: template, param, path } of templates) {
    const fm = template.frontMatter;
    const generate =
      fm.generate && typeof fm.generate === 'object' && !Array.isArray(fm.generate)
        ? fm.generate
        : undefined;
    const from = typeof generate?.from === 'string' ? generate.from.trim() : '';
    const entries = entriesByTemplate.get(path) ?? [];

    if (fm.generate !== undefined && !generate) {
      warnOnce(`${path}: generate must be a mapping such as { from: tags }`);
    }
    if (fm.paginate !== undefined) {
      warnOnce(`${path}: use generate.paginate to split generated pages; paginate is ignored here`);
    }
    if (!from && entries.length === 0) {
      warnOnce(
        `${path}: set generate.from (such as "from: tags") or return pages for it from collections.generate; it generates no pages`,
      );
      continue;
    }

    // The template reads the collection its front matter names, or the one its folder is in
    const collectionPath = resolveCollectionPath({ ...template, url: template.slug }, pages);
    const pageUrl = createUrlBuilder(template, param, () =>
      warnOnce(
        `${path}: permalink must contain [${param}] to give each page its own URL; it is ignored`,
      ),
    );

    const groups: Array<KeyGroup & { url: string; data?: Record<string, unknown> }> = [];
    if (from) {
      const collection =
        collectionPath !== undefined ? collections.byPath.get(collectionPath) : undefined;
      if (!collection) {
        warnOnce(
          `${path}: generate.from needs a collection, but the template is in none; set collection in its front matter, such as "collection: /blog"`,
        );
      } else {
        const found = groupByField(
          collection.recentPages,
          from,
          (value) =>
            warnOnce(
              `${path}: "${value}" has no Latin letters or digits to use in a URL; it gets no page`,
            ),
          (key, kept, merged) =>
            warnOnce(
              `${path}: "${merged}" and "${kept}" both become the key "${key}"; their pages are listed together under "${kept}"`,
            ),
        );
        for (const group of found) {
          groups.push({ ...group, url: pageUrl(group.key) });
        }
      }
    }
    for (const entry of entries) {
      const key = typeof entry.key === 'string' && entry.key ? entry.key : lastSegment(entry.url);
      groups.push({
        key,
        label: typeof entry.label === 'string' && entry.label ? entry.label : key,
        items: Array.isArray(entry.items) ? entry.items : [],
        url: entry.url,
        ...(entry.data !== undefined && { data: entry.data }),
      });
    }

    const paginate = parsePaginate(generate?.paginate, (message) =>
      warnOnce(`${path}: generate.${message}`),
    );

    for (const group of groups) {
      if (!claim(group.url, `${path} for "${group.label}"`)) {
        continue;
      }
      const generated: GeneratedPageData = {
        key: group.key,
        label: group.label,
        items: group.items,
        template: path,
        ...(group.data !== undefined && { data: group.data }),
      };
      const frontMatter = substituteFrontMatter(fm, param, group.label);
      if (collectionPath !== undefined) {
        frontMatter.collection = collectionPath;
      }
      const page: PageModel = {
        // The template's slug with the key in place of [param]: /tags/[tag] → /tags/css
        slug: `${template.slug.slice(0, template.slug.lastIndexOf('/') + 1)}${group.key}`,
        url: group.url,
        sourcePath: template.sourcePath,
        frontMatter,
        content: template.content,
        ...(template.publishedAt && { publishedAt: template.publishedAt }),
        generated,
      };
      generatedPages.push(page);
      if (paginate) {
        generatedPages.push(...paginatePage(page, group.items, paginate, claim, path));
      }
    }
  }

  // Listings with paginate: index pages, or pages with a collection in their front matter
  const paginationPages: PageModel[] = [];
  for (const page of pages) {
    if (page.frontMatter.paginate === undefined) {
      continue;
    }
    const where = label(page);
    const settings = parsePaginate(page.frontMatter.paginate, (message) =>
      warnOnce(`${where}: ${message}`),
    );
    if (!settings) {
      continue;
    }
    const collectionPath = resolveCollectionPath(page, pages);
    const collection =
      collectionPath !== undefined ? collections.byPath.get(collectionPath) : undefined;
    if (!collection) {
      warnOnce(`${where}: paginate needs a collection, but the page has none; it is not paginated`);
      continue;
    }
    paginationPages.push(
      ...paginatePage(page, collection.recentPages, settings, claim, where, collectionPath),
    );
  }

  return [...pages, ...paginationPages, ...generatedPages];
}

/**
 * Sets the first page's pagination data and creates the pages after it.
 *
 * @param page - The first page, which keeps its URL
 * @param items - Everything the listing shows, in order
 * @param settings - Page size and URL segment
 * @param claim - Reserves a URL, or reports that it is taken
 * @param where - Source label for warnings
 * @param collectionPath - Collection the later pages read; generated pages carry their own
 * @returns The pages after the first
 */
function paginatePage(
  page: PageModel,
  items: readonly PageModel[],
  settings: PaginationSettings,
  claim: (url: string, what: string) => boolean,
  where: string,
  collectionPath?: string,
): PageModel[] {
  const [first, ...rest] = paginateItems(page.url, items, settings);
  page.pagination = first!;

  const later: PageModel[] = [];
  for (const pagination of rest) {
    const url = pagination.urls[pagination.pageNumber - 1]!;
    if (!claim(url, `Page ${pagination.pageNumber} of ${where}`)) {
      continue;
    }
    const frontMatter = copyValue(page.frontMatter) as FrontMatter;
    if (collectionPath !== undefined) {
      frontMatter.collection = collectionPath;
    }
    later.push({
      ...page,
      slug: url.length > 1 && url.endsWith('/') ? url.slice(0, -1) : url,
      url,
      frontMatter,
      pagination,
    });
  }
  return later;
}

/**
 * Returns a function that gives the URL of a template's page for a key: the template's URL
 * with `[param]` replaced, or its `permalink` with `[param]` replaced.
 */
function createUrlBuilder(
  template: PageModel,
  param: string,
  onBadPermalink: () => void,
): (key: string) => string {
  const token = `[${param}]`;
  const permalink = template.frontMatter.permalink;
  if (typeof permalink === 'string') {
    if (permalink.includes(token)) {
      return (key) => permalink.split(token).join(key);
    }
    onBadPermalink();
  }
  // The template's file-based URL ends with the token: /blog/tags/[tag]
  const base = template.slug.slice(0, -token.length);
  return (key) => `${base}${key}`;
}

/**
 * Runs `collections.generate`.
 */
async function runGenerateHook(
  config: StatiConfig,
  pages: PageModel[],
  logger: Logger,
): Promise<GeneratedPageEntry[]> {
  const generate = config.collections?.generate;
  if (typeof generate !== 'function') {
    return [];
  }
  let entries: unknown;
  try {
    entries = await generate({ config, pages });
  } catch (error) {
    throw new Error(
      `collections.generate failed: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error },
    );
  }
  if (!Array.isArray(entries)) {
    logger.warning('collections.generate must return an array of pages; its result is ignored');
    return [];
  }
  return entries.filter((entry): entry is GeneratedPageEntry => {
    if (entry && typeof entry === 'object' && typeof entry.template === 'string') {
      return true;
    }
    logger.warning(
      'collections.generate: every entry needs a url and a template; an entry is skipped',
    );
    return false;
  });
}

/**
 * Normalizes a template path from `collections.generate` to the form expansion uses:
 * relative to the source directory, with forward slashes and the `.md` extension.
 */
function normalizeTemplatePath(template: string): string {
  const path = template.replace(/\\/g, '/').replace(/^\.\//, '').replace(/^\/+/, '');
  return path.endsWith('.md') ? path : `${path}.md`;
}

function lastSegment(url: string): string {
  return url.split('/').filter(Boolean).at(-1) ?? '';
}
