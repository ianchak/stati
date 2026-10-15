import { join, dirname, posix } from 'node:path';
import { pathExists } from './fs.utils.js';
import type { StatiConfig, PageModel } from '../../types/index.js';
import { LAYOUT_TEMPLATE } from '../../constants.js';
import { resolveSrcDir } from './paths.utils.js';

/**
 * Shared template discovery utilities.
 * Extracted from templates.ts and isg/deps.ts to eliminate duplication.
 */

/**
 * Whether a page was created by Stati rather than loaded from a Markdown file: a page expanded
 * from a `[param].md` template, or page 2 or later of a paginated listing.
 *
 * Virtual pages are never collection members, never make a folder a collection, and are left
 * out of navigation, search and RSS unless they opt in.
 *
 * @param page - The page to check
 * @returns True for generated pages and for pagination pages after the first
 */
export function isVirtualPage(page: PageModel): boolean {
  return page.generated !== undefined || (page.pagination?.pageNumber ?? 1) > 1;
}

/**
 * Maps each directory prefix (ending in `/`) found in page URLs to the URL that contains it,
 * or to `null` when two or more different URLs contain it.
 */
type DirectoryPrefixIndex = Map<string, string | null>;

/**
 * Lookups computed once per page list.
 */
interface PageListIndex {
  /** Directory prefixes of the URLs of pages loaded from Markdown files */
  prefixes: DirectoryPrefixIndex;
  /** Every page by URL; the first page wins when two share a URL */
  byUrl: Map<string, PageModel>;
}

/**
 * Directory prefix index per page list, so a build computes it once instead of
 * scanning every page for every page.
 *
 * The index is a snapshot of the page URLs taken at the first lookup for a given array,
 * and every later lookup for that array reuses it. In a build the first lookup happens
 * in the render loop, after the `beforeAll` hook, so URL changes made there are included.
 * Changes made to the same array or its pages after that are not seen; a fresh build
 * loads a new array and gets a new snapshot. Taking one snapshot keeps rendering and
 * ISG dependency tracking in agreement for the whole build.
 */
const pageListCache = new WeakMap<PageModel[], PageListIndex>();

function getPageListIndex(allPages: PageModel[]): PageListIndex {
  const cached = pageListCache.get(allPages);
  if (cached) {
    return cached;
  }

  const prefixes: DirectoryPrefixIndex = new Map();
  const byUrl = new Map<string, PageModel>();
  for (const page of allPages) {
    if (!byUrl.has(page.url)) {
      byUrl.set(page.url, page);
    }
    // Generated and pagination pages don't turn the folders they live in into collections
    if (isVirtualPage(page)) {
      continue;
    }
    const { url } = page;
    // Every prefix ending at a '/' is a directory this URL lives in (or is, for trailing-slash URLs)
    for (let i = url.indexOf('/'); i !== -1; i = url.indexOf('/', i + 1)) {
      const prefix = url.slice(0, i + 1);
      const existing = prefixes.get(prefix);
      if (existing === undefined) {
        prefixes.set(prefix, url);
      } else if (existing !== null && existing !== url) {
        prefixes.set(prefix, null);
      }
    }
  }

  const index = { prefixes, byUrl };
  pageListCache.set(allPages, index);
  return index;
}

/**
 * Finds the first page of a paginated listing, which later pages render like.
 *
 * @param page - A page with `pagination`
 * @param allPages - All pages in the site
 * @returns The listing's first page, or undefined when it is not in the list
 */
export function getFirstPaginationPage(
  page: PageModel,
  allPages: PageModel[],
): PageModel | undefined {
  const firstUrl = page.pagination?.urls[0];
  if (firstUrl === undefined || firstUrl === page.url) {
    return undefined;
  }
  return getPageListIndex(allPages).byUrl.get(firstUrl);
}

/**
 * Determines if the given page is a collection index page.
 * A collection index page is one whose URL matches a directory path that contains other pages.
 * Generated pages never are; pagination pages after the first are when their first page is.
 *
 * Rendering and ISG dependency tracking must both call this with the same page list,
 * otherwise they can pick different layouts for the same page.
 *
 * Page URLs are read once per `allPages` array, at the first call; see
 * `pageListCache` for when changes to the pages are picked up.
 *
 * @param page - The page to check
 * @param allPages - All pages in the site (treated as unchanging after the first call)
 * @returns True if the page is a collection index page
 */
export function isCollectionIndexPage(page: PageModel, allPages: PageModel[]): boolean {
  if (page.generated) {
    return false;
  }

  // Later pages of a listing render with the layout of its first page
  if ((page.pagination?.pageNumber ?? 1) > 1) {
    const first = getFirstPaginationPage(page, allPages);
    return first !== undefined && !isVirtualPage(first) && isCollectionIndexPage(first, allPages);
  }

  // Root index page is always a collection index
  if (page.url === '/') {
    return true;
  }

  // The page is an index when a different page's URL lives under this page's URL as a directory
  const pageUrlAsDir = page.url.endsWith('/') ? page.url : page.url + '/';
  const containingUrl = getPageListIndex(allPages).prefixes.get(pageUrlAsDir);
  return containingUrl === null || (containingUrl !== undefined && containingUrl !== page.url);
}

/**
 * Discovers layout files by searching up the directory hierarchy.
 * Supports both explicit layout specification and automatic discovery.
 *
 * @param pagePath - The path to the page (relative to srcDir)
 * @param config - Stati configuration
 * @param explicitLayout - Explicit layout name from front-matter
 * @param isIndexPage - Whether this is an aggregation/index page (enables index.eta lookup)
 * @returns The layout file path (relative to srcDir) or null if none found
 */
export async function discoverLayout(
  pagePath: string,
  config: StatiConfig,
  explicitLayout?: string,
  isIndexPage?: boolean,
): Promise<string | null> {
  // Early return if required config values are missing
  if (!config.srcDir) {
    return null;
  }

  const srcDir = resolveSrcDir(config);

  // If explicit layout is specified, use it
  if (explicitLayout) {
    const layoutPath = join(srcDir, `${explicitLayout}.eta`);
    if (await pathExists(layoutPath)) {
      return `${explicitLayout}.eta`;
    }
  }

  // Get the directory of the current page
  const pageDir = dirname(pagePath);
  const pathSegments = pageDir === '.' ? [] : pageDir.split(/[/\\]/); // Handle both separators

  // Search for layout.eta from current directory up to root
  const dirsToSearch = [];

  // Add current directory if not root
  if (pathSegments.length > 0) {
    for (let i = pathSegments.length; i > 0; i--) {
      dirsToSearch.push(pathSegments.slice(0, i).join('/'));
    }
  }

  // Add root directory
  dirsToSearch.push('');

  for (const dir of dirsToSearch) {
    // For index pages, first check for index.eta in each directory
    if (isIndexPage) {
      const indexLayoutPath = dir ? join(srcDir, dir, 'index.eta') : join(srcDir, 'index.eta');
      if (await pathExists(indexLayoutPath)) {
        // Return relative path with forward slashes for Eta
        const relativePath = dir ? `${dir}/index.eta` : 'index.eta';
        return posix.normalize(relativePath);
      }
    }

    // Then check for layout.eta as fallback
    const layoutPath = dir ? join(srcDir, dir, LAYOUT_TEMPLATE) : join(srcDir, LAYOUT_TEMPLATE);
    if (await pathExists(layoutPath)) {
      // Return relative path with forward slashes for Eta
      const relativePath = dir ? `${dir}/${LAYOUT_TEMPLATE}` : LAYOUT_TEMPLATE;
      return posix.normalize(relativePath);
    }
  }

  return null;
}

/**
 * Gets the collection path for a given page URL.
 * For index pages, returns the page's URL. For child pages, returns the parent directory.
 *
 * @param pageUrl - The page URL
 * @returns The collection path
 */
export function getCollectionPathForPage(pageUrl: string): string {
  if (pageUrl === '/') {
    return '/';
  }

  // If it's an index page (ends with /), return the URL as-is
  if (pageUrl.endsWith('/')) {
    return pageUrl;
  }

  // For non-index pages, return the parent directory
  const lastSlashIndex = pageUrl.lastIndexOf('/');
  if (lastSlashIndex === -1) {
    return '/';
  }

  const parentPath = pageUrl.substring(0, lastSlashIndex + 1);
  return parentPath === '' ? '/' : parentPath;
}
