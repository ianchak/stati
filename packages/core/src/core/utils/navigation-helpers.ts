import type { NavNode, PageModel } from '../../types/index.js';

/**
 * Navigation helper utilities for template context.
 * Provides methods for querying and traversing the navigation tree.
 */

/**
 * Finds a navigation node by its path or URL.
 *
 * @param tree - Navigation tree to search
 * @param path - Path or URL to find
 * @returns The found node or undefined
 */
export function findNode(tree: NavNode[], path: string): NavNode | undefined {
  for (const node of tree) {
    // Check current node
    if (node.path === path || node.url === path) {
      return node;
    }

    // Recursively search children
    if (node.children && node.children.length > 0) {
      const found = findNode(node.children, path);
      if (found) {
        return found;
      }
    }
  }

  return undefined;
}

/**
 * Gets the children of a specific navigation node by path.
 *
 * @param tree - Navigation tree to search
 * @param path - Path of the parent node
 * @returns Array of child nodes or empty array if not found or no children
 */
export function getChildren(tree: NavNode[], path: string): NavNode[] {
  const node = findNode(tree, path);
  return node?.children || [];
}

/**
 * Gets the parent node of a specific path.
 *
 * @param tree - Navigation tree to search
 * @param path - Path to find parent for
 * @returns The parent node or undefined
 */
export function getParent(tree: NavNode[], path: string): NavNode | undefined {
  return findParentNode(tree, path, null);
}

/**
 * Helper function to find parent node recursively.
 *
 * @param nodes - Current nodes to search
 * @param targetPath - Path we're looking for
 * @param parent - Current parent node
 * @returns The parent node or undefined
 */
function findParentNode(
  nodes: NavNode[],
  targetPath: string,
  parent: NavNode | null,
): NavNode | undefined {
  for (const node of nodes) {
    // Check if this node is the target
    if (node.path === targetPath || node.url === targetPath) {
      return parent || undefined;
    }

    // Recursively search children with this node as parent
    if (node.children && node.children.length > 0) {
      const found = findParentNode(node.children, targetPath, node);
      if (found !== undefined) {
        return found;
      }
    }
  }

  return undefined;
}

/**
 * Gets the siblings of a specific path (nodes at the same level).
 *
 * @param tree - Navigation tree to search
 * @param path - Path to find siblings for
 * @param includeSelf - Whether to include the node itself in the results
 * @returns Array of sibling nodes or empty array
 */
export function getSiblings(tree: NavNode[], path: string, includeSelf = false): NavNode[] {
  const parent = getParent(tree, path);

  // If no parent, check if the node is at root level
  if (!parent) {
    // Node might be at root level
    const isAtRoot = tree.some((node) => node.path === path || node.url === path);
    if (isAtRoot) {
      return includeSelf ? tree : tree.filter((node) => node.path !== path && node.url !== path);
    }
    return [];
  }

  const siblings = parent.children || [];
  return includeSelf
    ? siblings
    : siblings.filter((node) => node.path !== path && node.url !== path);
}

/**
 * Gets a subtree starting from a specific path.
 *
 * @param tree - Navigation tree to search
 * @param path - Root path for the subtree
 * @returns The subtree as an array (single node with its children) or empty array
 */
export function getSubtree(tree: NavNode[], path: string): NavNode[] {
  const node = findNode(tree, path);
  return node ? [node] : [];
}

/**
 * Gets the breadcrumb trail from root to a specific path.
 *
 * @param tree - Navigation tree to search
 * @param path - Path to get breadcrumbs for
 * @returns Array of nodes from root to the target path
 */
export function getBreadcrumbs(tree: NavNode[], path: string): NavNode[] {
  const trail: NavNode[] = [];
  findBreadcrumbTrail(tree, path, trail);
  return trail;
}

/**
 * Helper function to build breadcrumb trail recursively.
 *
 * @param nodes - Current nodes to search
 * @param targetPath - Path we're looking for
 * @param trail - Current breadcrumb trail
 * @returns True if the target was found in this branch
 */
function findBreadcrumbTrail(nodes: NavNode[], targetPath: string, trail: NavNode[]): boolean {
  for (const node of nodes) {
    // Add current node to trail
    trail.push(node);

    // Check if this is the target
    if (node.path === targetPath || node.url === targetPath) {
      return true;
    }

    // Check children
    if (node.children && node.children.length > 0) {
      if (findBreadcrumbTrail(node.children, targetPath, trail)) {
        return true;
      }
    }

    // This branch didn't contain the target, remove this node from trail
    trail.pop();
  }

  return false;
}

/**
 * Finds the current page's navigation node.
 *
 * @param tree - Navigation tree to search
 * @param currentPage - Current page model
 * @returns The navigation node for the current page or undefined
 */
export function getCurrentNode(tree: NavNode[], currentPage: PageModel): NavNode | undefined {
  return findNode(tree, currentPage.url);
}

/**
 * Creates a navigation helpers object for template context.
 *
 * @param tree - The full navigation tree
 * @param currentPage - The current page being rendered
 * @returns Object with navigation helper methods
 */
export function createNavigationHelpers(tree: NavNode[], currentPage: PageModel) {
  return {
    /**
     * The full navigation tree.
     * Use stati.nav.tree to access the global navigation.
     */
    tree,

    /**
     * Gets the full navigation tree.
     * @returns The complete navigation tree
     */
    getTree: () => tree,

    /**
     * Finds a navigation node by path or URL.
     * @param path - The path or URL to find
     * @returns The found node or undefined
     */
    findNode: (path: string) => findNode(tree, path),

    /**
     * Gets the children of a navigation node.
     * @param path - The path of the parent node
     * @returns Array of child navigation nodes
     */
    getChildren: (path: string) => getChildren(tree, path),

    /**
     * Gets the parent of a navigation node.
     * @param path - The path to find the parent for (defaults to current page)
     * @returns The parent node or undefined
     */
    getParent: (path?: string) => getParent(tree, path || currentPage.url),

    /**
     * Gets the siblings of a navigation node.
     * @param path - The path to find siblings for (defaults to current page)
     * @param includeSelf - Whether to include the node itself
     * @returns Array of sibling nodes
     */
    getSiblings: (path?: string, includeSelf = false) =>
      getSiblings(tree, path || currentPage.url, includeSelf),

    /**
     * Gets a subtree starting from a specific path.
     * @param path - The root path for the subtree
     * @returns Array containing the subtree
     */
    getSubtree: (path: string) => getSubtree(tree, path),

    /**
     * Gets the breadcrumb trail for a path.
     * @param path - The path to get breadcrumbs for (defaults to current page)
     * @returns Array of nodes from root to the target
     */
    getBreadcrumbs: (path?: string) => getBreadcrumbs(tree, path || currentPage.url),

    /**
     * Gets the current page's navigation node.
     * @returns The navigation node for the current page or undefined
     */
    getCurrentNode: () => getCurrentNode(tree, currentPage),
  };
}
