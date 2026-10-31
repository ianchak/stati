/**
 * Navigation related type definitions
 */

/**
 * Navigation node representing a page or collection in the site hierarchy.
 * Provides structured navigation data for templates.
 *
 * @example
 * ```typescript
 * const navNode: NavNode = {
 *   title: 'Blog',
 *   url: '/blog',
 *   path: '/blog',
 *   order: 1,
 *   children: [
 *     {
 *       title: 'My First Post',
 *       url: '/blog/my-first-post',
 *       path: '/blog/my-first-post',
 *       order: 1,
 *       publishedAt: new Date('2024-01-01')
 *     }
 *   ]
 * };
 * ```
 */
export interface NavNode {
  /** Display title for the navigation item */
  title: string;
  /** URL path for the navigation item */
  url: string;
  /** File system path (for organizing hierarchy) */
  path: string;
  /** Numeric order for sorting */
  order?: number;
  /** Publication date for sorting */
  publishedAt?: Date;
  /** Child navigation nodes (for collections/directories) */
  children?: NavNode[];
  /** Whether this node represents a collection/directory */
  isCollection?: boolean;
}

/**
 * Navigation helpers and tree, available to templates as `stati.nav`. Paths are matched against
 * a node's `path` or `url`; the optional paths default to the current page.
 */
export interface NavigationHelpers {
  /** The full navigation tree */
  tree: NavNode[];
  /** Gets the full navigation tree */
  getTree: () => NavNode[];
  /** Finds a navigation node by path or URL */
  findNode: (path: string) => NavNode | undefined;
  /** Gets the children of a navigation node */
  getChildren: (path: string) => NavNode[];
  /** Gets the parent of a navigation node */
  getParent: (path?: string) => NavNode | undefined;
  /** Gets the siblings of a navigation node */
  getSiblings: (path?: string, includeSelf?: boolean) => NavNode[];
  /** Gets a subtree starting from a specific path */
  getSubtree: (path: string) => NavNode[];
  /** Gets the breadcrumb trail for a path */
  getBreadcrumbs: (path?: string) => NavNode[];
  /** Gets the current page's navigation node */
  getCurrentNode: () => NavNode | undefined;
}
