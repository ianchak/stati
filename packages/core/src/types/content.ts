/**
 * Content related type definitions
 */

/**
 * Front matter metadata extracted from content files.
 * Contains page-specific configuration and metadata in YAML format.
 *
 * @example
 * ```typescript
 * const frontMatter: FrontMatter = {
 *   title: 'Getting Started with Stati',
 *   description: 'A comprehensive guide to static site generation',
 *   tags: ['tutorial', 'documentation'],
 *   layout: 'post',
 *   order: 1,
 *   publishedAt: '2024-01-01',
 *   ttlSeconds: 3600,
 *   draft: false
 * };
 * ```
 */
export interface FrontMatter {
  /** Page title for SEO and display */
  title?: string;
  /** Page description for SEO and meta tags */
  description?: string;
  /** Array of tags for categorization */
  tags?: readonly string[];
  /** Template layout to use for rendering */
  layout?: string;
  /** Numeric order for sorting (useful for navigation) */
  order?: number;
  /** Publication date as ISO string */
  publishedAt?: string;
  /** Custom cache TTL in seconds (overrides global ISG settings) */
  ttlSeconds?: number;
  /** Custom max age cap in days (overrides global ISG settings) */
  maxAgeCapDays?: number;
  /** Whether the page is a draft (excludes from build) */
  draft?: boolean;
  /** Additional custom properties */
  [key: string]: unknown;
}

/**
 * Represents a single page in the static site.
 * Contains all metadata, content, and URL information for a page.
 *
 * @example
 * ```typescript
 * const page: PageModel = {
 *   slug: 'my-first-post',
 *   url: '/blog/my-first-post',
 *   sourcePath: '/content/blog/my-first-post.md',
 *   frontMatter: {
 *     title: 'My First Post',
 *     tags: ['intro', 'blog']
 *   },
 *   content: '<p>Hello world!</p>',
 *   publishedAt: new Date('2024-01-01')
 * };
 * ```
 */
export interface PageModel {
  /** URL-friendly identifier for the page */
  slug: string;
  /** Full URL path for the page */
  url: string;
  /** Absolute path to the source content file */
  sourcePath: string;
  /** Parsed front matter metadata */
  frontMatter: FrontMatter;
  /** Rendered HTML content */
  content: string;
  /** Publication date (parsed from front matter or file stats) */
  publishedAt?: Date;
}

/**
 * Collection aggregation data available to index page templates.
 * Provides access to child pages and collection metadata for content listing.
 */
export interface CollectionData {
  /** All pages in the current collection */
  pages: PageModel[];
  /** Direct child pages of the collection */
  children: PageModel[];
  /** Recent pages sorted by publishedAt (most recent first) */
  recentPages: PageModel[];
  /** Pages grouped by tags for aggregation */
  pagesByTag: Record<string, PageModel[]>;
  /** Collection metadata */
  metadata: {
    /** Total number of pages in collection */
    totalPages: number;
    /** Whether collection has child pages */
    hasChildren: boolean;
    /** Path of the collection */
    collectionPath: string;
    /** Name of the collection (derived from path) */
    collectionName: string;
  };
}

/**
 * Template rendering context passed to Eta layouts.
 * Contains all data available to templates during rendering.
 */
export interface TemplateContext {
  /** Site configuration and metadata */
  site: import('./config.js').SiteConfig;
  /** Current page data including frontmatter and content */
  page: {
    path: string;
    content: string;
    [key: string]: unknown; // Frontmatter fields
  };
  /** Rendered markdown content */
  content: string;
  /** Site navigation tree */
  navigation: import('./navigation.js').NavNode[];
  /** Discovered partials from underscore folders in hierarchy */
  partials: Record<string, string>;
  /** Collection data for index pages (only available on collection index pages) */
  collection?: CollectionData;
}
