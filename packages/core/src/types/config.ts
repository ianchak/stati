import type MarkdownIt from 'markdown-it';
import type { SitemapConfig } from './sitemap.js';
import type { AuthorConfig } from './content.js';

/**
 * Configuration related type definitions
 */

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
  readonly title: string;
  /** Base URL for the site, used for absolute URL generation */
  readonly baseUrl: string;
  /** Default locale for internationalization (optional) */
  readonly defaultLocale?: string;
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
  isg?: import('./isg.js').ISGConfig;
  /** SEO configuration */
  seo?: SEOConfig;
  /** Sitemap generation configuration */
  sitemap?: SitemapConfig;
  /** Robots.txt generation configuration */
  robots?: RobotsTxtConfig;
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
 * SEO configuration for the site.
 * Controls automatic SEO metadata injection and site-wide defaults.
 */
export interface SEOConfig {
  /** Default author for all pages (can be overridden per-page) */
  defaultAuthor?: AuthorConfig;
  /** Automatically inject SEO tags into <head> if not present (default: true) */
  autoInject?: boolean;
  /** Enable debug logging for SEO generation (default: false) */
  debug?: boolean;
}

/**
 * Robots.txt generation configuration.
 * Controls how the robots.txt file is generated.
 */
export interface RobotsTxtConfig {
  /** Enable robots.txt generation (default: false) */
  enabled?: boolean;
  /**
   * User agent specific rules.
   * Each entry defines rules for a specific user agent.
   *
   * @example
   * ```typescript
   * userAgents: [
   *   {
   *     userAgent: 'Googlebot',
   *     allow: ['/public/'],
   *     disallow: ['/admin/']
   *   }
   * ]
   * ```
   */
  userAgents?: Array<{
    userAgent: string;
    allow?: string[];
    disallow?: string[];
  }>;
  /** Global allow rules (applies to all user agents) */
  allow?: string[];
  /** Global disallow rules (applies to all user agents) */
  disallow?: string[];
  /** Crawl delay in seconds (time between requests) */
  crawlDelay?: number;
  /** Sitemap URL or boolean to auto-include sitemap.xml (default: true if sitemap enabled) */
  sitemap?: string | boolean;
  /** Custom lines to append to robots.txt */
  customLines?: string[];
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
  pages: import('./content.js').PageModel[];
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
  page: import('./content.js').PageModel;
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
  beforeRender?: (ctx: PageContext) => Promise<void> | void;
  /** Called after rendering each individual page */
  afterRender?: (ctx: PageContext) => Promise<void> | void;
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
