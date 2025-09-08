import { Eta } from 'eta';
import { join, dirname, relative, basename } from 'path';
import fse from 'fs-extra';
const { pathExists } = fse;
import glob from 'fast-glob';
import type { StatiConfig, PageModel, NavNode, CollectionData } from '../types.js';

/**
 * Determines if the given page is an index page for a collection.
 * An index page is one whose URL matches a directory path that contains other pages.
 *
 * @param page - The page to check
 * @param allPages - All pages in the site
 * @returns True if the page is a collection index page
 */
function isCollectionIndexPage(page: PageModel, allPages: PageModel[]): boolean {
  // Root index page is always a collection index
  if (page.url === '/') {
    return true;
  }

  // Check if this page's URL is a directory path that contains other pages
  const pageUrlAsDir = page.url.endsWith('/') ? page.url : page.url + '/';

  return allPages.some(
    (otherPage) => otherPage.url !== page.url && otherPage.url.startsWith(pageUrlAsDir),
  );
}

/**
 * Gets the collection path for a given page URL.
 * For index pages, returns the page's URL. For child pages, returns the parent directory.
 *
 * @param pageUrl - The page URL
 * @returns The collection path
 */
function getCollectionPathForPage(pageUrl: string): string {
  if (pageUrl === '/') {
    return '/';
  }

  const pathParts = pageUrl.split('/').filter(Boolean);

  if (pathParts.length <= 1) {
    return '/';
  }

  return '/' + pathParts.slice(0, -1).join('/');
}

/**
 * Groups pages by their tags for aggregation purposes.
 *
 * @param pages - Pages to group
 * @returns Object mapping tag names to arrays of pages
 */
function groupPagesByTags(pages: PageModel[]): Record<string, PageModel[]> {
  const pagesByTag: Record<string, PageModel[]> = {};

  for (const page of pages) {
    const tags = page.frontMatter.tags;
    if (Array.isArray(tags)) {
      for (const tag of tags) {
        if (typeof tag === 'string') {
          if (!pagesByTag[tag]) {
            pagesByTag[tag] = [];
          }
          pagesByTag[tag].push(page);
        }
      }
    }
  }

  return pagesByTag;
}

/**
 * Sorts pages by publishedAt date (most recent first), falling back to alphabetical by title.
 *
 * @param pages - Pages to sort
 * @returns Sorted array of pages
 */
function sortPagesByDate(pages: PageModel[]): PageModel[] {
  return pages.sort((a, b) => {
    // Sort by publishedAt (newest first)
    if (a.publishedAt && b.publishedAt) {
      return b.publishedAt.getTime() - a.publishedAt.getTime();
    }
    if (a.publishedAt && !b.publishedAt) return -1;
    if (!a.publishedAt && b.publishedAt) return 1;

    // Fallback to title
    const titleA = a.frontMatter.title || basename(a.url) || 'Untitled';
    const titleB = b.frontMatter.title || basename(b.url) || 'Untitled';
    return titleA.localeCompare(titleB);
  });
}

/**
 * Builds collection aggregation data for index pages.
 * Provides all the data needed for index pages to list and organize their collection's content.
 *
 * @param currentPage - The current page being rendered (must be an index page)
 * @param allPages - All pages in the site
 * @returns Collection data for template rendering
 */
function buildCollectionData(currentPage: PageModel, allPages: PageModel[]): CollectionData {
  const collectionPath = currentPage.url === '/' ? '/' : currentPage.url;
  const collectionName = collectionPath === '/' ? 'Home' : basename(collectionPath);

  // Find all pages that belong to this collection
  const collectionPages = allPages.filter((page) => {
    if (page.url === currentPage.url) {
      return false; // Don't include the index page itself
    }

    if (collectionPath === '/') {
      // For root collection, include pages that are direct children of root
      const pageCollectionPath = getCollectionPathForPage(page.url);
      return pageCollectionPath === '/';
    } else {
      // For other collections, include pages that start with the collection path
      const pageUrlAsDir = collectionPath.endsWith('/') ? collectionPath : collectionPath + '/';
      return page.url.startsWith(pageUrlAsDir);
    }
  });

  // Find direct children (one level down)
  const children = collectionPages.filter((page) => {
    const relativePath = page.url.substring(collectionPath.length);
    const cleanPath = relativePath.startsWith('/') ? relativePath.substring(1) : relativePath;
    return !cleanPath.includes('/'); // No further slashes means direct child
  });

  // Sort pages by date for recent posts
  const recentPages = sortPagesByDate([...collectionPages]);

  // Group by tags
  const pagesByTag = groupPagesByTags(collectionPages);

  return {
    pages: collectionPages,
    children,
    recentPages,
    pagesByTag,
    metadata: {
      totalPages: collectionPages.length,
      hasChildren: children.length > 0,
      collectionPath,
      collectionName,
    },
  };
}

/**
 * Discovers partials in the hierarchy for a given page path.
 * Scans all parent directories for folders starting with underscore.
 *
 * @param pagePath - The path to the page (relative to srcDir)
 * @param config - Stati configuration
 * @returns Object mapping partial names to their file paths
 */
async function discoverPartials(
  pagePath: string,
  config: StatiConfig,
): Promise<Record<string, string>> {
  const srcDir = join(process.cwd(), config.srcDir!);
  const partials: Record<string, string> = {};

  // Get the directory of the current page
  const pageDir = dirname(pagePath);
  const pathSegments = pageDir === '.' ? [] : pageDir.split('/');

  // Scan from root to current directory
  const dirsToScan = [''];
  for (let i = 0; i < pathSegments.length; i++) {
    dirsToScan.push(pathSegments.slice(0, i + 1).join('/'));
  }

  for (const dir of dirsToScan) {
    const searchDir = dir ? join(srcDir, dir) : srcDir;

    // Find all underscore folders in this directory level
    const underscoreFolders = await glob('_*/', {
      cwd: searchDir,
      onlyDirectories: true,
    });

    // Scan each underscore folder for .eta files
    for (const folder of underscoreFolders) {
      const folderPath = join(searchDir, folder);
      const etaFiles = await glob('**/*.eta', {
        cwd: folderPath,
        absolute: false,
      });

      for (const etaFile of etaFiles) {
        const partialName = basename(etaFile, '.eta');
        const fullPath = join(folderPath, etaFile);
        const relativePath = relative(srcDir, fullPath);

        // Store the relative path from srcDir for Eta to find it
        partials[partialName] = relativePath;
      }
    }
  }

  return partials;
}

/**
 * Discovers the appropriate layout file for a given page path.
 * Implements the hierarchical layout.eta convention by searching
 * from the page's directory up to the root.
 *
 * @param pagePath - The path to the page (relative to srcDir)
 * @param config - Stati configuration
 * @param explicitLayout - Layout specified in front matter (takes precedence)
 * @param isIndexPage - Whether this is an aggregation/index page (enables index.eta lookup)
 * @returns The layout file path or null if none found
 */
async function discoverLayout(
  pagePath: string,
  config: StatiConfig,
  explicitLayout?: string,
  isIndexPage?: boolean,
): Promise<string | null> {
  const srcDir = join(process.cwd(), config.srcDir!);

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
        return relativePath.replace(/\\/g, '/'); // Normalize to forward slashes
      }
    }

    // Then check for layout.eta as fallback
    const layoutPath = dir ? join(srcDir, dir, 'layout.eta') : join(srcDir, 'layout.eta');
    if (await pathExists(layoutPath)) {
      // Return relative path with forward slashes for Eta
      const relativePath = dir ? `${dir}/layout.eta` : 'layout.eta';
      return relativePath.replace(/\\/g, '/'); // Normalize to forward slashes
    }
  }

  return null;
}

export function createTemplateEngine(config: StatiConfig): Eta {
  const templateDir = join(process.cwd(), config.srcDir!);

  const eta = new Eta({
    views: templateDir,
    cache: process.env.NODE_ENV === 'production',
  });

  return eta;
}

export async function renderPage(
  page: PageModel,
  body: string,
  config: StatiConfig,
  eta: Eta,
  navigation?: NavNode[],
  allPages?: PageModel[],
): Promise<string> {
  // Discover partials for this page's directory hierarchy
  const srcDir = join(process.cwd(), config.srcDir!);
  const relativePath = relative(srcDir, page.sourcePath);
  const partials = await discoverPartials(relativePath, config);

  // Build collection data if this is an index page and all pages are provided
  let collectionData: CollectionData | undefined;
  const isIndexPage = allPages && isCollectionIndexPage(page, allPages);
  if (isIndexPage) {
    collectionData = buildCollectionData(page, allPages);
  }

  // Discover the appropriate layout using hierarchical layout.eta convention
  // Pass isIndexPage flag to enable index.eta lookup for aggregation pages
  const layoutPath = await discoverLayout(
    relativePath,
    config,
    page.frontMatter.layout,
    isIndexPage,
  );

  const context = {
    site: config.site,
    page: {
      ...page.frontMatter,
      path: page.url,
      content: body,
    },
    content: body,
    navigation: navigation || [],
    partials, // Add discovered partials to template context
    collection: collectionData, // Add collection data for index pages
    // Add custom filters to context
    ...(config.eta?.filters || {}),
  };

  try {
    if (!layoutPath) {
      console.warn('No layout template found, using fallback');
      return createFallbackHtml(page, body);
    }

    return await eta.renderAsync(layoutPath, context);
  } catch (error) {
    console.error(`Error rendering layout ${layoutPath || 'unknown'}:`, error);
    return createFallbackHtml(page, body);
  }
}

function createFallbackHtml(page: PageModel, body: string): string {
  const title = page.frontMatter.title || 'Untitled';
  const description = page.frontMatter.description || '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  ${description ? `<meta name="description" content="${escapeHtml(description)}">` : ''}
</head>
<body>
  <main>
    ${body}
  </main>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]!);
}
