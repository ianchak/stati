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
