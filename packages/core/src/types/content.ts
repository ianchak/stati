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
   * Paths of the stylesheets Stati builds, such as ['/_assets/styles-A1B2C3D4.css'] in
   * production and ['/styles.css'] in development. Always an array, empty [] when
   * `--tailwind-input` and `--tailwind-output` are not given. A production build learns the
   * hash after every page has rendered and writes it into each page then, so print the path
   * as it is rather than changing it.
   */
  stylesheetPaths: string[];

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
  /**
   * Publication date. A quoted YAML value is a string; an unquoted one
   * (`publishedAt: 2024-01-01`) is parsed into a `Date`.
   */
  publishedAt?: string | Date;
  /** Publication date, used when `publishedAt` and `published` are absent or invalid */
  date?: string | Date;
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
  /**
   * URL of the collection index page this page reads as `stati.collection`, such as `/posts`.
   * Without it, an index page reads its own collection and other pages the nearest collection
   * they belong to.
   */
  collection?: string;
  /**
   * Splits the page's collection (`stati.collection.recentPages`) into pages of this size.
   * Page 1 keeps the page's URL; later pages get `<url>/page/2` and so on.
   */
  paginate?: number | PaginateOptions;
  /** Expansion of a `[param].md` template into one page per key */
  generate?: GenerateOptions;
  /** Includes a `[param].md` template's pages, or the site's 404 page, in the navigation tree */
  nav?: boolean;
  /** Includes a `[param].md` template's pages, or the site's 404 page, in the search index */
  search?: boolean;
  /** Additional custom properties */
  [key: string]: unknown;
}

/**
 * Pagination settings from front matter (`paginate`).
 *
 * @example
 * ```yaml
 * paginate:
 *   size: 10      # items per page
 *   path: page    # optional, default 'page' → /blog/page/2
 * ```
 */
export interface PaginateOptions {
  /** Items per page */
  size: number;
  /** URL segment before the page number (default `'page'`) */
  path?: string;
}

/**
 * Settings of a `[param].md` template (`generate` in its front matter).
 *
 * @example
 * ```yaml
 * # site/blog/tags/[tag].md
 * generate:
 *   from: tags             # one page per tag in the collection
 *   paginate: { size: 10 }  # optional
 * ```
 */
export interface GenerateOptions {
  /**
   * Front matter field whose values become the keys, read from the pages of the template's
   * collection. Works with string fields (`author`) and lists of strings (`tags`).
   */
  from?: string;
  /** Splits each generated page's items into pages of this size */
  paginate?: number | PaginateOptions;
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
  /** Exclude this page from the sitemap; `false` keeps the 404 page or a noindex page in it */
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
  /** Open Graph image (URL string or full image object), or `false` for none, not even a generated one */
  image?: string | OpenGraphImage | false;
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
  /** Author's website or profile URL, printed as `article:author` on article pages */
  url?: string;
  /** Author's Twitter/X handle, with or without `@`, printed as `twitter:creator` */
  twitter?: string;
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
  /** Publication date, from the first valid of `publishedAt`, `published`, `date`, `createdAt` */
  publishedAt?: Date;
  /**
   * Position of the page in a paginated listing. Set on every page of a listing with
   * `paginate`, including the first one. Templates read it as `stati.pagination`.
   */
  pagination?: PaginationData;
  /**
   * Set on pages expanded from a `[param].md` template or a `collections.generate` entry.
   * Templates read it as `stati.generated`.
   */
  generated?: GeneratedPageData;
}

/**
 * One page of a paginated listing, available to templates as `stati.pagination`.
 *
 * @example
 * ```typescript
 * const pagination: PaginationData = {
 *   pageNumber: 2,
 *   totalPages: 7,
 *   items: [], // this page's slice of the listing
 *   prevUrl: '/blog',
 *   nextUrl: '/blog/page/3',
 *   urls: ['/blog', '/blog/page/2', '/blog/page/3'],
 * };
 * ```
 */
export interface PaginationData {
  /** Number of this page, starting at 1 */
  pageNumber: number;
  /** Number of pages in the listing; at least 1, even when there are no items */
  totalPages: number;
  /** The pages listed on this page: a slice of `recentPages`, or of `stati.generated.items` */
  items: PageModel[];
  /** URL of the previous page; absent on the first page */
  prevUrl?: string;
  /** URL of the next page; absent on the last page */
  nextUrl?: string;
  /** URL of every page of the listing, in order; `urls[0]` is the first page */
  urls: string[];
}

/**
 * Data of a page expanded from a `[param].md` template, available to templates as
 * `stati.generated`.
 *
 * @example
 * ```typescript
 * // site/blog/tags/[tag].md, for the tag "CSS"
 * const generated: GeneratedPageData = {
 *   key: 'css',
 *   label: 'CSS',
 *   items: [], // pages tagged "CSS", newest first
 *   template: 'blog/tags/[tag].md',
 * };
 * ```
 */
export interface GeneratedPageData {
  /** The key in the page URL, slugified for keys taken from front matter */
  key: string;
  /** The original value, used for `{param}` placeholders in front matter */
  label: string;
  /** The pages for this key, newest first */
  items: PageModel[];
  /** The template, relative to the source directory, such as `blog/tags/[tag].md` */
  template: string;
  /** Data from the `collections.generate` entry that created the page */
  data?: Record<string, unknown>;
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
 * `stati.include(name, props?, body?)`: renders a template where it is called and returns its
 * HTML. Templates it renders render synchronously, so they cannot use `await`.
 *
 * @example
 * ```eta
 * <%~ stati.include('partials/header') %>
 * <%~ stati.include('partials/card', { title: post.frontMatter.title }) %>
 * <%~ stati.include('partials/callout', { tone: 'warning' }, stati.include('partials/draft-notice')) %>
 * ```
 */
export interface TemplateIncludeFunction {
  /**
   * @param name - The template's path without `.eta`: `partials/header` is looked up from the
   *   page's folder up to the source directory, `/partials/header` is read from the source
   *   directory only, and `./icon` or `../icons/arrow` are relative to the calling template
   * @param props - Values the template reads as `stati.props`
   * @param body - HTML the template prints as `stati.body`
   * @returns The rendered HTML
   */
  (name: string, props?: Record<string, unknown> | null, body?: string | null): string;
  /** Whether `name` resolves to a template for this page, with the same lookup as the call */
  has(name: string): boolean;
}

/**
 * `stati.layout(name, props?)`: wraps the calling template's output in another template once it
 * has rendered. The wrapping template prints that output as `stati.body`.
 *
 * @example
 * ```eta
 * <% stati.layout('base', { bodyClass: 'post' }) %>
 * ```
 */
export interface TemplateLayoutFunction {
  /**
   * @param name - The wrapping template's path without `.eta`, resolved like
   *   {@link TemplateIncludeFunction} names
   * @param props - Values the wrapping template reads as `stati.props`
   * @returns An empty string, so the call can be printed
   */
  (name: string, props?: Record<string, unknown> | null): string;
  /** Whether `name` resolves to a template for this page; the same check as `stati.include.has` */
  has(name: string): boolean;
}

/**
 * Template rendering context, available to every template Stati renders as `stati`.
 * The root holds only Stati's own API; functions from the config's `helpers` are under
 * `stati.helpers`.
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
  /** The page's rendered Markdown */
  content: string;
  /**
   * The HTML this template wraps: the output of the template it wraps in a template named by
   * `stati.layout()`, or the `body` argument (or `undefined`) in a template rendered by
   * `stati.include()`. Absent in the page's own layout and in the Open Graph template, which
   * print `stati.content` instead.
   */
  body?: string | undefined;
  /** Props of the `stati.include()` or `stati.layout()` call that rendered this template */
  props: Record<string, unknown> | undefined;
  /** Renders another template here and returns its HTML */
  include: TemplateIncludeFunction;
  /** Wraps this template's output in another template */
  layout: TemplateLayoutFunction;
  /** The functions registered in the config's `helpers` */
  helpers: import('./config.js').StatiHelpers;
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
  /**
   * Collection data: the page's own collection on index pages, the collection the page belongs
   * to on other pages, or the one named by the `collection` front matter field
   */
  collection?: CollectionData | undefined;
  /** This page's position in a paginated listing (pages with `paginate`) */
  pagination?: PaginationData | undefined;
  /** Key, label and items of a page expanded from a `[param].md` template */
  generated?: GeneratedPageData | undefined;
  /** TypeScript bundle assets (available when typescript.enabled is true) */
  assets?: StatiAssets | undefined;
  /** The Stati version that rendered the page */
  generator: { version: string };
  /** Converts text to the URL slug Stati uses for generated page keys and heading anchors */
  slugify: (text: string) => string;
  /**
   * Builds a space-separated attribute value from strings, numbers, arrays and objects whose
   * truthy keys are kept, like `classnames`
   */
  propValue: (...args: unknown[]) => string;
  /**
   * Renders an image with intrinsic dimensions and lazy loading, plus `srcset` variants when
   * `images.responsive` is on. Synchronous; print it with `<%~ %>`. Relative paths resolve
   * next to the page's Markdown file, root-relative ones from the static directory.
   */
  image: (
    src: string,
    options?: { alt?: string; sizes?: string; priority?: boolean; class?: string; title?: string },
  ) => string;
  /** The page's SEO tags; `tags` limits them to some tag types */
  generateSEO: (tags?: string[]) => string;
  /** Size of the Open Graph image, set only while an Open Graph template renders */
  og?: { width: number; height: number } | undefined;
  /** The page's generated Open Graph image, when `images.og` produced one */
  ogImage?: import('./images.js').GeneratedOgImage | undefined;
}
