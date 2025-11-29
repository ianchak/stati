import { basename } from 'node:path';
import type { PageModel, NavNode } from '../types/index.js';

/**
 * Builds a hierarchical navigation structure from pages.
 * Groups pages by directory structure and sorts them appropriately.
 *
 * @param pages - Array of page models to build navigation from
 * @returns Array of top-level navigation nodes
 *
 * @example
 * ```typescript
 * const pages = [
 *   { url: '/blog/post-1', frontMatter: { title: 'Post 1', order: 2 } },
 *   { url: '/blog/post-2', frontMatter: { title: 'Post 2', order: 1 } },
 *   { url: '/about', frontMatter: { title: 'About' } }
 * ];
 * const nav = buildNavigation(pages);
 * // Results in hierarchical structure with sorted blog posts
 * ```
 */
export function buildNavigation(pages: PageModel[]): NavNode[] {
  // Group pages by their collection (directory)
  const collections = new Map<string, PageModel[]>();

  for (const page of pages) {
    const collectionPath = getCollectionPath(page.url);

    if (!collections.has(collectionPath)) {
      collections.set(collectionPath, []);
    }
    collections.get(collectionPath)!.push(page);
  }

  const navNodes: NavNode[] = [];

  // Process root-level pages
  if (collections.has('/')) {
    const rootPages = collections.get('/')!.filter((page) => {
      // Don't include pages that are index pages for other collections
      const potentialCollectionPath = page.url;
      return !collections.has(potentialCollectionPath) || page.url === '/';
    });

    for (const page of rootPages) {
      navNodes.push(createNavNodeFromPage(page));
    }
  }

  // Process collection directories
  for (const [collectionPath, collectionPages] of collections) {
    if (collectionPath !== '/') {
      // Find the index page for this collection (if it exists)
      const indexPage = pages.find((p) => p.url === collectionPath);

      // Create collection node
      const collectionNode = createCollectionNode(collectionPath, collectionPages, indexPage);
      navNodes.push(collectionNode);
    }
  }

  return sortNavigationNodes(navNodes);
}

/**
 * Determines which collection a page belongs to based on its URL
 */
function getCollectionPath(url: string): string {
  const pathParts = url.split('/').filter(Boolean);

  if (pathParts.length <= 1) {
    // Root level: / or /about
    return '/';
  } else {
    // Collection level: /blog/post-1 -> belongs to /blog
    return '/' + pathParts.slice(0, -1).join('/');
  }
}

/**
 * Sorts pages within a single collection.
 * Primary sort: order field (ascending)
 * Secondary sort: publishedAt date (descending, newest first)
 * Tertiary sort: title (ascending)
 *
 * @param pages - Pages to sort
 * @returns Sorted array of pages
 */
function sortPagesInCollection(pages: PageModel[]): PageModel[] {
  return pages.sort((a, b) => {
    // Primary sort by order field
    const orderA =
      typeof a.frontMatter.order === 'number' ? a.frontMatter.order : Number.MAX_SAFE_INTEGER;
    const orderB =
      typeof b.frontMatter.order === 'number' ? b.frontMatter.order : Number.MAX_SAFE_INTEGER;

    if (orderA !== orderB) {
      return orderA - orderB;
    }

    // Secondary sort by publishedAt (newest first)
    if (a.publishedAt && b.publishedAt) {
      return b.publishedAt.getTime() - a.publishedAt.getTime();
    }
    if (a.publishedAt && !b.publishedAt) return -1;
    if (!a.publishedAt && b.publishedAt) return 1;

    // Tertiary sort by title
    const titleA = a.frontMatter.title || basename(a.url);
    const titleB = b.frontMatter.title || basename(b.url);
    return titleA.localeCompare(titleB);
  });
}

/**
 * Sorts navigation nodes by order, then by title
 */
function sortNavigationNodes(nodes: NavNode[]): NavNode[] {
  return nodes.sort((a, b) => {
    // Primary sort by order
    const orderA = typeof a.order === 'number' ? a.order : Number.MAX_SAFE_INTEGER;
    const orderB = typeof b.order === 'number' ? b.order : Number.MAX_SAFE_INTEGER;

    if (orderA !== orderB) {
      return orderA - orderB;
    }

    // Secondary sort by title
    return a.title.localeCompare(b.title);
  });
}

/**
 * Creates a navigation node from a single page.
 *
 * @param page - Page model to convert
 * @returns Navigation node
 */
function createNavNodeFromPage(page: PageModel): NavNode {
  const navNode: NavNode = {
    title: page.frontMatter.title || basename(page.url) || 'Untitled',
    url: page.url,
    path: page.url,
    isCollection: false,
  };

  // Only add order if it's a number
  if (typeof page.frontMatter.order === 'number') {
    navNode.order = page.frontMatter.order;
  }

  // Only add publishedAt if it exists
  if (page.publishedAt) {
    navNode.publishedAt = page.publishedAt;
  }

  return navNode;
}

/**
 * Creates a collection navigation node with child pages.
 *
 * @param collectionPath - Path of the collection
 * @param pages - Pages in the collection
 * @param indexPage - Optional index page for the collection
 * @returns Navigation node representing the collection
 */
function createCollectionNode(
  collectionPath: string,
  pages: PageModel[],
  indexPage?: PageModel,
): NavNode {
  const collectionName = basename(collectionPath);

  // Use index page data if available, otherwise derive from collection
  const title = indexPage?.frontMatter.title || capitalizeFirst(collectionName);
  const url = indexPage?.url || collectionPath;
  const order = indexPage?.frontMatter.order;
  const publishedAt = indexPage?.publishedAt;

  const children = sortPagesInCollection(pages).map((page) => createNavNodeFromPage(page));

  const navNode: NavNode = {
    title,
    url,
    path: collectionPath,
    isCollection: true,
  };

  // Only add order if it's a number
  if (typeof order === 'number') {
    navNode.order = order;
  }

  // Only add publishedAt if it exists
  if (publishedAt) {
    navNode.publishedAt = publishedAt;
  }

  // Only add children if there are any
  if (children.length > 0) {
    navNode.children = children;
  }

  return navNode;
}

/**
 * Capitalizes the first letter of a string.
 *
 * @param str - String to capitalize
 * @returns Capitalized string
 */
function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
