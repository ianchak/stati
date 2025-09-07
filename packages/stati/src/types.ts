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
 *   srcDir: 'content',
 *   outDir: 'dist',
 *   templateDir: 'templates',
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
  /** Source directory for content files (default: 'content') */
  srcDir?: string;
  /** Output directory for generated site (default: 'dist') */
  outDir?: string;
  /** Directory containing template files (default: 'templates') */
  templateDir?: string;
  /** Directory for static assets (default: 'public') */
  staticDir?: string;
  /** Site-wide configuration */
  site: SiteConfig;
  /** Markdown processing configuration */
  markdown?: {
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
