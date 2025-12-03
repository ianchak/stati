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
  /** RSS feed generation configuration */
  rss?: import('./rss.js').RSSConfig;
  /** TypeScript compilation settings */
  typescript?: TypeScriptConfig;
  /** Development server configuration */
  dev?: {
    /** Port for development server (default: 3000) */
    port?: number;
    /** Host for development server (default: 'localhost') */
    host?: string;
    /** Whether to open browser automatically (default: false) */
    open?: boolean;
  };
  /** Preview server configuration */
  preview?: {
    /** Port for preview server (default: 4000) */
    port?: number;
    /** Host for preview server (default: 'localhost') */
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
 * Configuration for a single TypeScript bundle.
 * Defines how a bundle is compiled and which pages should include it.
 *
 * @example
 * ```typescript
 * // Global bundle (included on all pages)
 * const coreBundle: BundleConfig = {
 *   entryPoint: 'core.ts',
 *   bundleName: 'core'
 * };
 *
 * // Targeted bundle (only on specific pages)
 * const docsBundle: BundleConfig = {
 *   entryPoint: 'docs.ts',
 *   bundleName: 'docs',
 *   include: ['/docs/**', '/api/**'],
 *   exclude: ['/docs/legacy/**']
 * };
 * ```
 */
export interface BundleConfig {
  /**
   * Entry point file name relative to srcDir.
   * @example 'main.ts', 'features/playground.ts'
   */
  entryPoint: string;

  /**
   * Output bundle file name (without extension).
   * Final filename includes hash in production: `[bundleName]-[hash].js`
   */
  bundleName: string;

  /**
   * Glob patterns for pages that should include this bundle.
   * Matches against page output path (e.g., '/docs/api/hooks.html').
   * If omitted, bundle is included on ALL pages (global bundle).
   *
   * Supports glob syntax: `*`, `**`, `?`, `[abc]`, `{a,b}`
   *
   * @example ['/docs/**', '/api/**']
   */
  include?: string[];

  /**
   * Glob patterns for pages to exclude from this bundle.
   * Takes precedence over include patterns.
   *
   * @example ['/docs/legacy/**']
   */
  exclude?: string[];
}

/**
 * TypeScript compilation configuration.
 * Controls how Stati compiles TypeScript files using esbuild.
 *
 * In development mode, source maps are always enabled and hash/minify are always disabled.
 * In production mode, source maps are always disabled and hash/minify default to true.
 *
 * @example
 * ```typescript
 * // Simple configuration (defaults to single global bundle)
 * const simpleConfig: StatiConfig = {
 *   typescript: {
 *     enabled: true
 *     // Defaults to: bundles: [{ entryPoint: 'main.ts', bundleName: 'main' }]
 *   }
 * };
 *
 * // Multiple bundles with per-page targeting
 * const multiConfig: StatiConfig = {
 *   typescript: {
 *     enabled: true,
 *     srcDir: 'src',
 *     bundles: [
 *       { entryPoint: 'core.ts', bundleName: 'core' },
 *       { entryPoint: 'docs.ts', bundleName: 'docs', include: ['/docs/**'] }
 *     ]
 *   }
 * };
 * ```
 */
export interface TypeScriptConfig {
  /**
   * Enable TypeScript compilation.
   * @default false
   */
  enabled: boolean;

  /**
   * Source directory containing TypeScript files.
   * Relative to site root.
   * @default 'src'
   */
  srcDir?: string;

  /**
   * Output directory for compiled JavaScript.
   * Relative to build output directory (dist/).
   * @default '_assets'
   */
  outDir?: string;

  /**
   * Include content hash in bundle filename for cache busting in production.
   * When true, outputs `bundle-a1b2c3d4.js`. When false, outputs `bundle.js`.
   * This option only applies to production builds; development always uses stable filenames.
   * @default true
   */
  hash?: boolean;

  /**
   * Minify JavaScript output in production builds.
   * This option only applies to production builds; development output is never minified.
   * @default true
   */
  minify?: boolean;

  /**
   * Array of bundle configurations.
   * Each bundle can target specific pages using include/exclude patterns.
   * If omitted, defaults to a single global bundle:
   * `[{ entryPoint: 'main.ts', bundleName: 'main' }]`
   *
   * When defined, completely overrides the default.
   */
  bundles?: BundleConfig[];

  /**
   * Automatically inject bundle script tags before </body>.
   * When enabled (default), Stati automatically adds script tags for matched bundles.
   * Disable if you want manual control over script placement in templates.
   *
   * When disabled, use `stati.assets.bundlePaths` in templates to access bundle paths.
   *
   * @default true
   */
  autoInject?: boolean;
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
