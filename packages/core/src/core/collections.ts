import { basename } from 'node:path';
import type {
  PageModel,
  CollectionData,
  PaginationData,
  GeneratedPageData,
  StatiConfig,
} from '../types/index.js';
import {
  getCollectionPathForPage,
  getFirstPaginationPage,
  isCollectionIndexPage,
  isVirtualPage,
} from './utils/index.js';
import { computeContentHash } from './isg/hash.js';
import { MARKDOWN_EXTENSION } from '../constants.js';

/**
 * Front matter fields of the collection summary when `collections.summaryFields` is not set.
 */
export const DEFAULT_SUMMARY_FIELDS: readonly string[] = ['title', 'description', 'tags', 'draft'];

/**
 * The collections of a page list.
 */
export interface CollectionIndex {
  /** Collection data by the URL of its index page */
  byPath: Map<string, CollectionData>;
}

/**
 * What a render read from data shared between pages. Filled in while the page renders.
 */
export interface PageReads {
  /** The page read `stati.collection` */
  collection: boolean;
  /** The page read the navigation tree (`stati.nav` or `stati.page.navNode`) */
  nav: boolean;
}

/**
 * Collections per page list, computed at the first lookup for an array and reused after that.
 * Like the directory prefix index in `isCollectionIndexPage`, the result is a snapshot: in a
 * build the first lookup happens in the render loop, after the `beforeAll` hook.
 */
const collectionCache = new WeakMap<PageModel[], CollectionIndex>();

/**
 * Returns the collections of a page list, computing them once per array.
 *
 * @param allPages - All pages of the build
 * @returns The collections by index page URL
 */
export function getCollections(allPages: PageModel[]): CollectionIndex {
  const cached = collectionCache.get(allPages);
  if (cached) {
    return cached;
  }
  const index = buildCollections(allPages);
  collectionCache.set(allPages, index);
  return index;
}

/**
 * Computes every collection of a page list in one pass.
 *
 * A collection belongs to a collection index page (see `isCollectionIndexPage`), or to a page
 * loaded from an `index.md`, whose collection is empty while its folder holds no pages. The
 * root collection holds the top-level pages; any other collection holds every page below its
 * folder, at any depth. The index page itself, generated pages and pagination pages are
 * never members.
 *
 * @param allPages - All pages of the build
 * @returns The collections by index page URL
 */
export function buildCollections(allPages: PageModel[]): CollectionIndex {
  const pages = allPages.filter((page) => !isVirtualPage(page));

  const members = new Map<string, PageModel[]>();
  for (const page of pages) {
    if (
      !members.has(page.url) &&
      (isFolderIndexPage(page) || isCollectionIndexPage(page, allPages))
    ) {
      members.set(page.url, []);
    }
  }

  for (const page of pages) {
    for (const path of collectionsContaining(page.url, (path) => members.has(path))) {
      members.get(path)!.push(page);
    }
  }

  const byPath = new Map<string, CollectionData>();
  for (const [path, collectionPages] of members) {
    byPath.set(path, createCollectionData(path, collectionPages));
  }
  return { byPath };
}

/**
 * Whether a page was loaded from a folder's `index.md`. The folder is a collection even before
 * it holds any pages, so an empty blog lists no posts instead of reading another collection.
 */
function isFolderIndexPage(page: PageModel): boolean {
  return basename(page.sourcePath, MARKDOWN_EXTENSION) === 'index';
}

/**
 * Lists the collections a URL belongs to, outermost first.
 *
 * @param url - A page URL
 * @param isCollection - Whether a URL is a collection index page
 * @returns Index page URLs
 */
function collectionsContaining(url: string, isCollection: (path: string) => boolean): string[] {
  const found: string[] = [];
  // Every folder the URL lives in, from the outermost: /blog/2024/recap is in /blog/ and /blog/2024/
  for (let i = url.indexOf('/', 1); i !== -1; i = url.indexOf('/', i + 1)) {
    const folder = url.slice(0, i + 1);
    // A folder's index page is usually /blog, or /blog/ with a trailing-slash permalink
    for (const path of [folder.slice(0, -1), folder]) {
      if (path !== url && isCollection(path)) {
        found.push(path);
      }
    }
  }
  // The root collection is shallow: only pages whose parent is the root belong to it
  if (url !== '/' && isCollection('/') && getCollectionPathForPage(url) === '/') {
    found.push('/');
  }
  return found;
}

/**
 * Builds the collection data of one index page from its members.
 */
function createCollectionData(
  collectionPath: string,
  collectionPages: PageModel[],
): CollectionData {
  // Direct children are one level below the index page
  const children = collectionPages.filter((page) => {
    const relativePath = page.url.substring(collectionPath.length);
    const cleanPath = relativePath.startsWith('/') ? relativePath.substring(1) : relativePath;
    return !cleanPath.includes('/');
  });

  return {
    pages: collectionPages,
    children,
    recentPages: sortPagesByDate([...collectionPages]),
    pagesByTag: groupPagesByTags(collectionPages),
    metadata: {
      totalPages: collectionPages.length,
      hasChildren: children.length > 0,
      collectionPath,
      collectionName: collectionPath === '/' ? 'Home' : basename(collectionPath),
    },
  };
}

/**
 * Groups pages by their tags.
 *
 * @param pages - Pages to group
 * @returns Object mapping tag names to arrays of pages
 */
function groupPagesByTags(pages: PageModel[]): Record<string, PageModel[]> {
  // No prototype, so tags such as `constructor` or `__proto__` are keys like any other
  const pagesByTag: Record<string, PageModel[]> = Object.create(null);

  for (const page of pages) {
    const tags = page.frontMatter.tags;
    if (Array.isArray(tags)) {
      for (const tag of tags) {
        if (typeof tag === 'string') {
          (pagesByTag[tag] ??= []).push(page);
        }
      }
    }
  }

  return pagesByTag;
}

/**
 * Sorts pages by publishedAt date (most recent first), falling back to alphabetical by title.
 *
 * @param pages - Pages to sort, in place
 * @returns The sorted array
 */
export function sortPagesByDate(pages: PageModel[]): PageModel[] {
  return pages.sort((a, b) => {
    // Sort by publishedAt (newest first)
    if (a.publishedAt && b.publishedAt) {
      return b.publishedAt.getTime() - a.publishedAt.getTime();
    }
    if (a.publishedAt && !b.publishedAt) return -1;
    if (!a.publishedAt && b.publishedAt) return 1;

    // Fallback to title
    // String(): pages that hooks add may carry a title that is not text
    const titleA = String(a.frontMatter.title || basename(a.url) || 'Untitled');
    const titleB = String(b.frontMatter.title || basename(b.url) || 'Untitled');
    return titleA.localeCompare(titleB);
  });
}

/**
 * Finds the collection a `collection` front matter value names. Accepts the index page URL
 * with or without a leading or trailing slash: `posts`, `/posts` and `/posts/` all name the
 * collection of `site/posts/index.md`.
 *
 * @param index - The collections of the build
 * @param value - The front matter value
 * @returns The index page URL, or undefined when the value names no collection
 */
export function findCollectionPath(index: CollectionIndex, value: unknown): string | undefined {
  if (typeof value !== 'string' || !value.trim()) {
    return undefined;
  }
  const trimmed = value.trim();
  const url = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  if (index.byPath.has(url)) {
    return url;
  }
  if (url === '/') {
    return undefined;
  }
  const alternate = url.endsWith('/') ? url.slice(0, -1) : `${url}/`;
  return index.byPath.has(alternate) ? alternate : undefined;
}

/**
 * Finds the collection a page reads as `stati.collection`:
 *
 * 1. The collection its `collection` front matter field names, when that collection exists.
 * 2. Its own collection, when the page is a collection index page or an `index.md`, even
 *    when that collection is empty.
 * 3. Otherwise the nearest collection with pages that the page belongs to: `/blog/post` reads
 *    `/blog`, and a top-level page reads the root collection.
 *
 * Pagination pages after the first read the collection of the first page. Generated pages
 * read only the collection their template names; expansion sets it in their front matter.
 *
 * @param page - The page
 * @param allPages - All pages of the build
 * @returns The index page URL of the collection, or undefined when the page has none
 */
export function resolveCollectionPath(page: PageModel, allPages: PageModel[]): string | undefined {
  const index = getCollections(allPages);

  const named = findCollectionPath(index, page.frontMatter.collection);
  if (named !== undefined) {
    return named;
  }
  if (page.generated) {
    return undefined;
  }
  if ((page.pagination?.pageNumber ?? 1) > 1) {
    const first = getFirstPaginationPage(page, allPages);
    return first && !isVirtualPage(first) ? resolveCollectionPath(first, allPages) : undefined;
  }
  if (index.byPath.has(page.url)) {
    return page.url;
  }
  // A page always has pages in the collections it belongs to; only a [param].md template can
  // sit in an empty one, and site/blog/tags/[tag].md reads /blog even with a tags/index.md
  return collectionsContaining(
    page.url,
    (path) => (index.byPath.get(path)?.pages.length ?? 0) > 0,
  ).at(-1);
}

/**
 * Returns the front matter fields of the collection summary.
 *
 * @param config - Stati configuration
 * @returns `collections.summaryFields`, or the default fields
 */
export function resolveSummaryFields(config: StatiConfig): readonly string[] {
  const fields = config.collections?.summaryFields;
  if (!Array.isArray(fields)) {
    return DEFAULT_SUMMARY_FIELDS;
  }
  return fields.filter((field): field is string => typeof field === 'string' && field !== '');
}

/**
 * Hashes what a listing shows of a list of pages: each page's URL, publish date and summary
 * fields, in list order. The Markdown body only counts when `fields` includes `content`.
 *
 * @param pages - The listed pages
 * @param fields - Front matter fields to include
 * @returns A `sha256-…` hash
 */
export function computePagesSummaryHash(
  pages: readonly PageModel[],
  fields: readonly string[],
): string {
  return computeContentHash('', {
    fields: [...fields],
    pages: pages.map((page) => [
      page.url,
      toIsoDate(page.publishedAt),
      ...fields.map((field) => summaryFieldValue(page, field)),
    ]),
  });
}

/**
 * The value of a summary field. `content`, `wordCount` and `readingTime` are properties of the
 * page itself; any other field is front matter.
 */
function summaryFieldValue(page: PageModel, field: string): unknown {
  switch (field) {
    case 'content':
      return page.content;
    // A front matter value of the same name counts too: listings that show it, as a hook or
    // an author wrote it, still rebuild when it changes
    case 'wordCount':
      return [page.wordCount ?? null, page.frontMatter.wordCount ?? null];
    case 'readingTime':
      return [page.readingTime ?? null, page.frontMatter.readingTime ?? null];
    default:
      return page.frontMatter[field] ?? null;
  }
}

function toIsoDate(date: Date | undefined): string | null {
  return date instanceof Date && !Number.isNaN(date.getTime()) ? date.toISOString() : null;
}

/**
 * Collection summary hashes for one build, computed at most once per collection.
 */
export interface SummaryHasher {
  /** Summary hash of a collection, or `'none'` when there is no such collection */
  collection(path: string): string;
  /** Summary hash of a list of pages */
  pages(pages: readonly PageModel[]): string;
}

/**
 * Creates the summary hasher of a build. Call it after the `beforeAll` hook, which can change
 * the front matter the summaries include.
 *
 * @param allPages - All pages of the build
 * @param fields - Summary fields
 * @returns The hasher
 */
export function createSummaryHasher(
  allPages: PageModel[],
  fields: readonly string[],
): SummaryHasher {
  const memo = new Map<string, string>();
  return {
    collection(path) {
      let hash = memo.get(path);
      if (hash === undefined) {
        const data = getCollections(allPages).byPath.get(path);
        hash = data ? computePagesSummaryHash(data.pages, fields) : 'none';
        memo.set(path, hash);
      }
      return hash;
    },
    pages: (pages) => computePagesSummaryHash(pages, fields),
  };
}

const COLLECTION_KEYS = ['pages', 'children', 'recentPages', 'pagesByTag', 'metadata'] as const;

/**
 * Wraps collection data for one render. Reading any of its properties sets `reads.collection`,
 * so the cache knows the page depends on the collection. Arrays and objects are copied on
 * first read, so a template that sorts or changes them cannot affect other pages, which share
 * the collection data within a build.
 *
 * The properties are accessors on a plain object, not a Proxy, so spreading the template
 * context (as callable partials do) passes the view along without reading it.
 *
 * @param data - The shared collection data
 * @param reads - The render's read flags
 * @returns The view for `stati.collection`
 */
export function createCollectionView(data: CollectionData, reads: PageReads): CollectionData {
  const view = {} as CollectionData;
  for (const key of COLLECTION_KEYS) {
    let value: unknown;
    let copied = false;
    Object.defineProperty(view, key, {
      enumerable: true,
      configurable: true,
      get() {
        reads.collection = true;
        if (!copied) {
          value = copyCollectionValue(data[key]);
          copied = true;
        }
        return value;
      },
      set(next: unknown) {
        reads.collection = true;
        value = next;
        copied = true;
      },
    });
  }
  return view;
}

function copyCollectionValue(value: object): object {
  if (Array.isArray(value)) {
    return [...value];
  }
  const copy = Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [key, Array.isArray(entry) ? [...entry] : entry]),
  );
  // pagesByTag has no prototype, and neither has its copy, so any tag stays a plain key
  return Object.setPrototypeOf(copy, Object.getPrototypeOf(value));
}

/**
 * Copies a page's pagination data for `stati.pagination`, so a template that changes the
 * lists cannot change what the cache hashes.
 *
 * @param data - The page's pagination data
 * @returns A copy with its own arrays
 */
export function copyPaginationData(data: PaginationData): PaginationData {
  return { ...data, items: [...data.items], urls: [...data.urls] };
}

/**
 * Copies a page's generated data for `stati.generated`.
 *
 * @param data - The page's generated data
 * @returns A copy with its own items array
 */
export function copyGeneratedData(data: GeneratedPageData): GeneratedPageData {
  return { ...data, items: [...data.items] };
}
