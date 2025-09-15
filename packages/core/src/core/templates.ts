import { Eta } from 'eta';
import { join, dirname, relative, basename, posix } from 'path';
import glob from 'fast-glob';
import type { StatiConfig, PageModel, NavNode, CollectionData } from '../types/index.js';
import { TEMPLATE_EXTENSION } from '../constants.js';
import {
  isCollectionIndexPage,
  discoverLayout,
  getCollectionPathForPage,
} from './utils/template-discovery.js';
import { resolveSrcDir } from './utils/paths.js';

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
  const srcDir = resolveSrcDir(config);
  const partials: Record<string, string> = {};

  // Get the directory of the current page
  const pageDir = dirname(pagePath);
  const pathSegments = pageDir === '.' ? [] : pageDir.split('/');

  // Scan from root to current directory (least specific first)
  // This allows more specific partials to override less specific ones
  const dirsToScan = [];
  if (pathSegments.length > 0) {
    // Add root directory first, then parent directories, then current
    dirsToScan.push(''); // Root directory first
    // Add directories from root to current
    for (let i = 1; i <= pathSegments.length; i++) {
      dirsToScan.push(pathSegments.slice(0, i).join('/'));
    }
  } else {
    dirsToScan.push(''); // Root directory only
  }

  for (const dir of dirsToScan) {
    const searchDir = dir ? join(srcDir, dir) : srcDir;

    // Find all underscore folders in this directory level
    const globPattern = join(searchDir, '_*/').replace(/\\/g, '/');
    const underscoreFolders = await glob(globPattern, {
      absolute: true,
      onlyDirectories: true,
    });

    // Scan each underscore folder for .eta files
    for (const folderPath of underscoreFolders) {
      const etaFiles = await glob('**/*.eta', {
        cwd: folderPath,
        absolute: false,
      });

      for (const etaFile of etaFiles) {
        const partialName = basename(etaFile, TEMPLATE_EXTENSION);
        const fullPath = join(folderPath, etaFile);

        // Use posix.relative for consistent forward slash paths across platforms
        const normalizedSrcDir = posix.normalize(srcDir.replace(/\\/g, '/'));
        const normalizedFullPath = posix.normalize(fullPath.replace(/\\/g, '/'));
        const relativePath = posix.relative(normalizedSrcDir, normalizedFullPath);
        partials[partialName] = relativePath;
      }
    }
  }

  return partials;
}

export function createTemplateEngine(config: StatiConfig): Eta {
  const templateDir = resolveSrcDir(config);

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
  const srcDir = resolveSrcDir(config);
  const relativePath = relative(srcDir, page.sourcePath);
  const partialPaths = await discoverPartials(relativePath, config);

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

  // Create base context for partial rendering
  const baseContext = {
    site: config.site,
    page: {
      ...page.frontMatter,
      path: page.url,
      url: page.url, // Add url property for compatibility
      content: body,
    },
    content: body,
    navigation: navigation || [],
    collection: collectionData, // Add collection data for index pages
    // Add custom filters to context
    ...(config.eta?.filters || {}),
  };

  // Render partials and store their content
  const renderedPartials: Record<string, string> = {};
  for (const [partialName, partialPath] of Object.entries(partialPaths)) {
    try {
      const renderedContent = await eta.renderAsync(partialPath, baseContext);
      renderedPartials[partialName] = renderedContent;
    } catch (error) {
      console.warn(`Warning: Failed to render partial ${partialName} at ${partialPath}:`, error);
      renderedPartials[partialName] = `<!-- Error rendering partial: ${partialName} -->`;
    }
  }

  const context = {
    ...baseContext,
    partials: renderedPartials, // Add rendered partials to template context
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
