/**
 * Content related type definitions
 */

/**
 * TypeScript bundle asset information.
 * Available when TypeScript compilation is enabled.
 * Contains paths to all bundles matched for the current page.
 *
 * @example
 * ```typescript
 * // In Eta templates, access via stati.assets
 * // Auto-injection handles most cases, but manual control is available:
 * <% for (const path of stati.assets.bundlePaths) { %>
 * <script type="module" src="<%= path %>"></script>
 * <% } %>
 * ```
 */
export interface StatiAssets {
  /**
   * Array of all bundle paths matched for this page.
   * Paths are in config order: ['/_assets/core-abc.js', '/_assets/docs-def.js']
   * Always an array, empty [] if no TypeScript enabled or no bundles match.
   */
  bundlePaths: string[];

  /**
   * Path to the search index file (e.g., '/search-index-a1b2c3d4.json').
   * Available when search index generation is enabled.
   * Use this path in client-side JavaScript to fetch the search index.
   */
  searchIndexPath?: string;
}

/**
 * Table of contents entry extracted from page headings.
 * Used for building navigation within a page.
 *
 * @example
 * ```typescript
 * const tocEntry: TocEntry = {
 *   id: 'getting-started',
 *   text: 'Getting Started',
 *   level: 2
 * };
 * ```
 */
export interface TocEntry {
  /** Anchor ID for the heading (used in href="#id") */
  id: string;
  /** Plain text content of the heading */
  text: string;
  /** Heading level (2-6) */
  level: number;
}

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
  /** Publication date (alias for publishedAt) */
  date?: string;
  /** Last updated date as ISO string */
  updated?: string;
  /** Custom cache TTL in seconds (overrides global ISG settings) */
  ttlSeconds?: number;
  /** Custom max age cap in days (overrides global ISG settings) */
  maxAgeCapDays?: number;
  /** Whether the page is a draft (excludes from build) */
  draft?: boolean;
  /** SEO configuration for the page */
  seo?: SEOMetadata;
  /** Sitemap configuration for the page */
  sitemap?: SitemapMetadata;
  /** Additional custom properties */
  [key: string]: unknown;
}

/**
 * SEO metadata configuration for a page.
 * Provides comprehensive control over meta tags, Open Graph, Twitter Cards, and structured data.
 *
 * @example
 * ```typescript
 * const seo: SEOMetadata = {
 *   title: 'Custom SEO Title',
 *   description: 'A compelling description for search engines',
 *   keywords: ['seo', 'static-site', 'performance'],
 *   canonical: 'https://example.com/canonical-url',
 *   openGraph: {
 *     type: 'article',
 *     image: { url: '/og-image.jpg', alt: 'Article preview' }
 *   }
 * };
 * ```
 */
export interface SEOMetadata {
  /** Override page title for SEO */
  title?: string;
  /** Meta description (150-160 chars recommended) */
  description?: string;
  /** Keywords for the page */
  keywords?: string[];
  /** Canonical URL */
  canonical?: string;
  /** Robots meta directives */
  robots?: string | RobotsConfig;
  /** Open Graph configuration */
  openGraph?: OpenGraphConfig;
  /** Twitter Card configuration */
  twitter?: TwitterCardConfig;
  /** JSON-LD structured data (will be sanitized and validated) */
  structuredData?: Record<string, unknown>;
  /** Author override for this page */
  author?: string | AuthorConfig;
  /** No-index flag */
  noindex?: boolean;
  /** Priority for sitemap (0.0-1.0) */
  priority?: number;
  /** Change frequency for sitemap */
  changeFreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
}

/**
 * Sitemap metadata configuration for a page.
 * Controls how the page appears in the XML sitemap.
 */
export interface SitemapMetadata {
  /** Exclude this page from the sitemap */
  exclude?: boolean;
  /** Last modification date (ISO string or Date) */
  lastmod?: string | Date;
  /** Change frequency hint */
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  /** Priority of this URL relative to others (0.0-1.0) */
  priority?: number;
}

/**
 * Robots meta tag configuration.
 * Controls how search engines crawl and index the page.
 */
export interface RobotsConfig {
  /** Allow search engines to index this page */
  index?: boolean;
  /** Allow search engines to follow links on this page */
  follow?: boolean;
  /** Allow search engines to show cached version */
  archive?: boolean;
  /** Allow search engines to show snippets */
  snippet?: boolean;
  /** Allow search engines to index images */
  imageindex?: boolean;
  /** Allow search engines to translate this page */
  translate?: boolean;
  /** Maximum snippet length in characters */
  maxSnippet?: number;
  /** Maximum image preview size */
  maxImagePreview?: 'none' | 'standard' | 'large';
  /** Maximum video preview length in seconds */
  maxVideoPreview?: number;
}

/**
 * Open Graph protocol configuration.
 * Used by social media platforms for rich previews.
 *
 * @see https://ogp.me/
 */
export interface OpenGraphConfig {
  /** Open Graph title */
  title?: string;
  /** Open Graph type (e.g., 'website', 'article') */
  type?: string;
  /** Open Graph description */
  description?: string;
  /** Open Graph image (URL string or full image object) */
  image?: string | OpenGraphImage;
  /** Open Graph URL */
  url?: string;
  /** Site name */
  siteName?: string;
  /** Locale (e.g., 'en_US') */
  locale?: string;
  /** Article-specific metadata */
  article?: OpenGraphArticle;
}

/**
 * Open Graph image configuration.
 */
export interface OpenGraphImage {
  /** Image URL */
  url: string;
  /** Image alt text */
  alt?: string;
  /** Image width in pixels */
  width?: number;
  /** Image height in pixels */
  height?: number;
}

/**
 * Open Graph article metadata.
 * Used for article-type Open Graph content.
 */
export interface OpenGraphArticle {
  /** Publication timestamp */
  publishedTime?: string;
  /** Last modification timestamp */
  modifiedTime?: string;
  /** Article author */
  author?: string;
  /** Article section/category */
  section?: string;
  /** Article tags */
  tags?: string[];
}

/**
 * Twitter Card configuration.
 * Controls how content appears when shared on Twitter.
 *
 * @see https://developer.twitter.com/en/docs/twitter-for-websites/cards/overview/abouts-cards
 */
export interface TwitterCardConfig {
  /** Twitter card type */
  card?: 'summary' | 'summary_large_image' | 'app' | 'player';
  /** @username of website */
  site?: string;
  /** @username of content creator */
  creator?: string;
  /** Title for the card */
  title?: string;
  /** Description for the card */
  description?: string;
  /** Image URL for the card */
  image?: string;
  /** Image alt text */
  imageAlt?: string;
}

/**
 * Author configuration.
 * Represents content author information.
 */
export interface AuthorConfig {
  /** Author's full name */
  name: string;
  /** Author's email address */
  email?: string;
  /** Author's website or profile URL */
  url?: string;
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
 *   content: '# Hello world!\n\nThis is my first post.',
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
  /** Raw markdown content (before rendering) */
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
    url: string;
    content: string;
    navNode?: import('./navigation.js').NavNode; // Current page's navigation node
    [key: string]: unknown; // Frontmatter fields
  };
  /** Rendered markdown content */
  content: string;
  /** Navigation helpers and tree */
  nav: {
    /** The full navigation tree */
    tree: import('./navigation.js').NavNode[];
    /** Gets the full navigation tree */
    getTree: () => import('./navigation.js').NavNode[];
    /** Finds a navigation node by path or URL */
    findNode: (path: string) => import('./navigation.js').NavNode | undefined;
    /** Gets the children of a navigation node */
    getChildren: (path: string) => import('./navigation.js').NavNode[];
    /** Gets the parent of a navigation node */
    getParent: (path?: string) => import('./navigation.js').NavNode | undefined;
    /** Gets the siblings of a navigation node */
    getSiblings: (path?: string, includeSelf?: boolean) => import('./navigation.js').NavNode[];
    /** Gets a subtree starting from a specific path */
    getSubtree: (path: string) => import('./navigation.js').NavNode[];
    /** Gets the breadcrumb trail for a path */
    getBreadcrumbs: (path?: string) => import('./navigation.js').NavNode[];
    /** Gets the current page's navigation node */
    getCurrentNode: () => import('./navigation.js').NavNode | undefined;
  };
  /** Discovered partials from underscore folders in hierarchy */
  partials: Record<string, string>;
  /** Collection data (available on index pages and child pages showing parent collection) */
  collection?: CollectionData;
  /** TypeScript bundle assets (available when typescript.enabled is true) */
  assets?: StatiAssets;
  /** Additional properties that may be added dynamically (e.g., custom filters, helpers) */
  [key: string]: unknown;
}
