import { join, dirname } from 'path';
import { posix } from 'path';
import { pathExists } from './fs.js';
import type { StatiConfig, PageModel } from '../../types/index.js';
import { resolveSrcDir } from './paths.js';

/**
 * Shared template discovery utilities.
 * Extracted from templates.ts and isg/deps.ts to eliminate duplication.
 */

/**
 * Determines if the given page is a collection index page.
 * A collection index page is one whose URL matches a directory path that contains other pages.
 *
 * @param page - The page to check
 * @param allPages - All pages in the site (optional for simplified check)
 * @returns True if the page is a collection index page
 */
export function isCollectionIndexPage(page: PageModel, allPages?: PageModel[]): boolean {
  // Root index page is always a collection index
  if (page.url === '/') {
    return true;
  }

  // If we have all pages, do a proper check
  if (allPages) {
    // Check if this page's URL is a directory path that contains other pages
    const pageUrlAsDir = page.url.endsWith('/') ? page.url : page.url + '/';
    return allPages.some(
      (otherPage) => otherPage.url !== page.url && otherPage.url.startsWith(pageUrlAsDir),
    );
  }

  // Simplified version when we don't have all pages
  // Assume any page ending in /index or at root is a collection page
  return page.url.endsWith('/index') || page.slug === 'index';
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
    const layoutPath = dir ? join(srcDir, dir, 'layout.eta') : join(srcDir, 'layout.eta');
    if (await pathExists(layoutPath)) {
      // Return relative path with forward slashes for Eta
      const relativePath = dir ? `${dir}/layout.eta` : 'layout.eta';
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
