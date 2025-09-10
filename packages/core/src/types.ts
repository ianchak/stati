import type MarkdownIt from 'markdown-it';

/**
 * Aging rule for Incremental Static Generation (ISG) cache management.
 * Defines how cache TTL changes based on content age.
 *
 * @example
 * ```typescript
 * const rule: AgingRule = {
 *   untilDays: 7,      // Apply this rule for content older than 7 days
 *   ttlSeconds: 86400  // Cache for 24 hours
 * };
 * ```
 */
export interface AgingRule {
  /** Number of days after which this aging rule applies */
  untilDays: number;
  /** Cache time-to-live in seconds for content matching this age */
  ttlSeconds: number;
}

/**
 * Configuration for Incremental Static Generation (ISG) caching.
 * Enables smart caching strategies for static site generation.
 *
 * @example
 * ```typescript
 * const isgConfig: ISGConfig = {
 *   enabled: true,
 *   ttlSeconds: 3600,     // Default 1 hour cache
 *   maxAgeCapDays: 30,    // Max age for aging rules
 *   aging: [
 *     { untilDays: 7, ttlSeconds: 86400 },   // 1 day for week-old content
 *     { untilDays: 30, ttlSeconds: 604800 }  // 1 week for month-old content
 *   ]
 * };
 * ```
 */
export interface ISGConfig {
  /** Whether ISG caching is enabled */
  enabled?: boolean;
  /** Default cache time-to-live in seconds */
  ttlSeconds?: number;
  /** Maximum age in days for applying aging rules */
  maxAgeCapDays?: number;
  /** Array of aging rules for progressive cache extension */
  aging?: AgingRule[];
}

/**
 * Cache entry for a single page in the ISG cache manifest.
 * Contains all information needed to determine if a page needs rebuilding.
 *
 * @example
 * ```typescript
 * const entry: CacheEntry = {
 *   path: '/blog/my-post/index.html',
 *   inputsHash: 'sha256-abc123...',
 *   deps: ['/site/_layouts/post.eta', '/site/_partials/header.eta'],
 *   tags: ['blog', 'tutorial'],
 *   publishedAt: '2024-01-01T00:00:00.000Z',
 *   renderedAt: '2024-01-15T10:30:00.000Z',
 *   ttlSeconds: 21600,
 *   maxAgeCapDays: 365
 * };
 * ```
 */
export interface CacheEntry {
  /** Output path of the rendered page */
  path: string;
  /** Hash of page content and all dependencies */
  inputsHash: string;
  /** Array of file paths this page depends on (templates, partials) */
  deps: string[];
  /** Tags for invalidation and organization */
  tags: string[];
  /** ISO date when content was originally published */
  publishedAt?: string;
  /** ISO date when page was last rendered */
  renderedAt: string;
  /** Effective TTL for this page in seconds */
  ttlSeconds: number;
  /** Maximum age cap for this page in days */
  maxAgeCapDays?: number;
}

/**
 * ISG cache manifest containing all cached page entries.
 * Persisted as JSON in .stati/cache/manifest.json
 *
 * @example
 * ```typescript
 * const manifest: CacheManifest = {
 *   entries: {
 *     '/blog/post-1': { ... },
 *     '/about': { ... }
 *   }
 * };
 * ```
 */
export interface CacheManifest {
  /** Map of page URLs to their cache entries */
  entries: Record<string, CacheEntry>;
}

/**
 * Site-wide configuration settings.
 * Contains global metadata and URL configuration for the static site.
 *
 * @example
 * ```typescript
 * const siteConfig: SiteConfig = {
 *   title: "My Awesome Blog",
 *   baseUrl: "https://myblog.com",
 *   defaultLocale: "en-US"
 * };
 * ```
 */
export interface SiteConfig {
  /** The site's title, used in templates and metadata */
  title: string;
  /** Base URL for the site, used for absolute URL generation */
  baseUrl: string;
  /** Default locale for internationalization (optional) */
  defaultLocale?: string;
}

/**
 * Main configuration interface for Stati static site generator.
 * Defines all options for site generation, including directories, templates, and features.
 *
 * @example
 * ```typescript
 * const config: StatiConfig = {
 *   srcDir: 'site',
 *   outDir: 'dist',
 *   staticDir: 'public',
 *   site: {
 *     title: 'My Blog',
 *     baseUrl: 'https://example.com'
 *   },
 *   markdown: {
 *     configure: (md) => md.use(somePlugin)
 *   }
 * };
 * ```
 */
export interface StatiConfig {
  /** Source directory for content files (default: 'site') */
  srcDir?: string;
  /** Output directory for generated site (default: 'dist') */
  outDir?: string;
  /** Directory for static assets (default: 'public') */
  staticDir?: string;
  /** Site-wide configuration */
  site: SiteConfig;
  /** Markdown processing configuration */
  markdown?: {
    /** Array of plugins to load - each item can be a string (plugin name) or [string, options] tuple */
    plugins?: (string | [string, unknown])[];
    /** Function to configure the MarkdownIt instance */
    configure?: (md: MarkdownIt) => void;
  };
  /** Eta template engine configuration */
  eta?: {
    /** Custom template filters */
    filters?: Record<string, (x: unknown) => unknown>;
  };
  /** Incremental Static Generation configuration */
  isg?: ISGConfig;
  /** Development server configuration */
  dev?: {
    /** Port for development server (default: 3000) */
    port?: number;
    /** Host for development server (default: 'localhost') */
    host?: string;
    /** Whether to open browser automatically (default: false) */
    open?: boolean;
  };
  /** Build lifecycle hooks */
  hooks?: BuildHooks;
}

/**
 * Build context passed to build lifecycle hooks.
 * Contains the full configuration and all loaded pages.
 *
 * @example
 * ```typescript
 * const buildHook = async (ctx: BuildContext) => {
 *   console.log(`Building ${ctx.pages.length} pages`);
 *   console.log(`Output directory: ${ctx.config.outDir}`);
 * };
 * ```
 */
export interface BuildContext {
  /** The resolved Stati configuration */
  config: StatiConfig;
  /** Array of all loaded page models */
  pages: PageModel[];
}

/**
 * Page context passed to page-specific lifecycle hooks.
 * Contains the current page being processed and site configuration.
 *
 * @example
 * ```typescript
 * const pageHook = async (ctx: PageContext) => {
 *   console.log(`Rendering page: ${ctx.page.slug}`);
 *   // Modify page content or metadata
 *   ctx.page.frontMatter.customField = 'processed';
 * };
 * ```
 */
export interface PageContext {
  /** The page model being processed */
  page: PageModel;
  /** The resolved Stati configuration */
  config: StatiConfig;
}

/**
 * Build lifecycle hooks for customizing the site generation process.
 * Allows developers to inject custom logic at various stages of the build.
 *
 * @example
 * ```typescript
 * const hooks: BuildHooks = {
 *   beforeAll: async (ctx) => {
 *     console.log('Starting build...');
 *   },
 *   beforeRender: async (ctx) => {
 *     // Add custom data to page context
 *     ctx.page.frontMatter.buildTime = new Date().toISOString();
 *   },
 *   afterAll: async (ctx) => {
 *     console.log(`Build complete! Generated ${ctx.pages.length} pages.`);
 *   }
 * };
 * ```
 */
export interface BuildHooks {
  /** Called before starting the build process */
  beforeAll?: (ctx: BuildContext) => Promise<void> | void;
  /** Called after completing the build process */
  afterAll?: (ctx: BuildContext) => Promise<void> | void;
  /** Called before rendering each individual page */
  /** Called before rendering each individual page */
  beforeRender?: (ctx: PageContext) => Promise<void> | void;
  /** Called after rendering each individual page */
  afterRender?: (ctx: PageContext) => Promise<void> | void;
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
  site: SiteConfig;
  /** Current page data including frontmatter and content */
  page: {
    path: string;
    content: string;
    [key: string]: unknown; // Frontmatter fields
  };
  /** Rendered markdown content */
  content: string;
  /** Site navigation tree */
  navigation: NavNode[];
  /** Discovered partials from underscore folders in hierarchy */
  partials: Record<string, string>;
  /** Collection data for index pages (only available on collection index pages) */
  collection?: CollectionData;
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
 * Logger interface for customizing build output.
 * Provides different log levels and formatting options for prettier CLI output.
 *
 * @example
 * ```typescript
 * const customLogger: Logger = {
 *   info: (msg) => console.log(chalk.blue('ℹ️  ' + msg)),
 *   success: (msg) => console.log(chalk.green('✅ ' + msg)),
 *   warning: (msg) => console.warn(chalk.yellow('⚠️  ' + msg)),
 *   error: (msg) => console.error(chalk.red('❌ ' + msg)),
 *   building: (msg) => console.log(chalk.cyan('🏗️  ' + msg)),
 *   processing: (msg) => console.log(chalk.gray('  ' + msg)),
 *   stats: (msg) => console.log(chalk.cyan('📊 ' + msg)),
 *   header: (msg) => console.log(boxedMessage(msg)),
 *   step: (step, total, msg) => console.log(`[${step}/${total}] ${msg}`),
 *   progress: (current, total, msg) => console.log(progressBar(current, total) + ' ' + msg),
 *   file: (op, path) => console.log(`  📄 ${op} ${path}`),
 *   url: (label, url) => console.log(`  🔗 ${label}: ${url}`),
 *   timing: (op, duration) => console.log(`  ⏱️  ${op} completed in ${duration}ms`),
 *   divider: (title) => console.log('─'.repeat(50) + ' ' + title)
 * };
 * ```
 */
export interface Logger {
  /** Log informational messages */
  info: (message: string) => void;
  /** Log success messages */
  success: (message: string) => void;
  /** Log warning messages */
  warning: (message: string) => void;
  /** Log error messages */
  error: (message: string) => void;
  /** Log build progress messages */
  building: (message: string) => void;
  /** Log file processing messages */
  processing: (message: string) => void;
  /** Log statistics and metrics */
  stats: (message: string) => void;
  /** Display a header message in a box (optional) */
  header?: (message: string) => void;
  /** Display a step indicator (optional) */
  step?: (step: number, total: number, message: string) => void;
  /** Display progress with a bar (optional) */
  progress?: (current: number, total: number, message: string) => void;
  /** Log file operations (optional) */
  file?: (operation: string, path: string) => void;
  /** Log URLs with proper styling (optional) */
  url?: (label: string, url: string) => void;
  /** Log timing information (optional) */
  timing?: (operation: string, duration: number) => void;
  /** Display a section divider (optional) */
  divider?: (title?: string) => void;
  /** Start a spinner for long operations (optional) */
  startSpinner?: (text: string, type?: 'building' | 'processing' | 'copying') => unknown;
  /** Stop a spinner with success (optional) */
  succeedSpinner?: (spinner: unknown, text?: string) => void;
  /** Stop a spinner with failure (optional) */
  failSpinner?: (spinner: unknown, text?: string) => void;
  /** Update spinner text (optional) */
  updateSpinner?: (spinner: unknown, text: string) => void;
  /** Display build statistics as a table (optional) */
  statsTable?: (stats: {
    totalPages: number;
    assetsCount: number;
    buildTimeMs: number;
    outputSizeBytes: number;
    cacheHits?: number;
    cacheMisses?: number;
  }) => void;
  /** Display navigation tree structure (optional) */
  navigationTree?: (navigation: NavNode[]) => void;
}

/**
 * Statistics collected during the build process.
 * Provides useful metrics about the site generation.
 *
 * @example
 * ```typescript
 * const stats: BuildStats = {
 *   totalPages: 15,
 *   assetsCount: 8,
 *   buildTimeMs: 1250,
 *   outputSizeBytes: 2048576,
 *   cacheHits: 5,
 *   cacheMisses: 10
 * };
 * ```
 */
export interface BuildStats {
  /** Total number of pages processed */
  totalPages: number;
  /** Number of static assets copied */
  assetsCount: number;
  /** Total build time in milliseconds */
  buildTimeMs: number;
  /** Total size of output directory in bytes */
  outputSizeBytes: number;
  /** Number of cache hits (if caching enabled) */
  cacheHits?: number;
  /** Number of cache misses (if caching enabled) */
  cacheMisses?: number;
}

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
  tags?: string[];
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
