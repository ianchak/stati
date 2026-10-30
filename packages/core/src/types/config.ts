import type { MarkdownIt } from 'markdown-it';
import type { SitemapConfig } from './sitemap.js';
import type { AuthorConfig } from './content.js';
import type { SearchConfig } from './search.js';

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
  /** Default site description for meta tags (used as fallback when page has no description) */
  readonly description?: string;
}

/**
 * Site functions that templates call as `stati.helpers.name()`.
 *
 * @example
 * ```typescript
 * const helpers: StatiHelpers = {
 *   formatDate: (date: string | Date, locale = 'en-US') =>
 *     new Date(date).toLocaleDateString(locale),
 * };
 * ```
 */
// Helpers take whatever arguments their templates pass, so their parameters are not typed here
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type StatiHelpers = Record<string, (...args: any[]) => unknown>;

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
    /** Enable TOC extraction and heading anchor generation (default: true) */
    toc?: boolean;
  };
  /**
   * Functions templates call as `stati.helpers.name()`, such as a date formatter. Each one is
   * called with the arguments the template passes, and with `stati.helpers` as `this`.
   */
  helpers?: StatiHelpers;
  /** Incremental Static Generation configuration */
  isg?: import('./isg.js').ISGConfig;
  /** Collection listings: which fields rebuild them, and pages generated from data */
  collections?: CollectionsConfig;
  /** Reading speed for `page.readingTime` */
  readingTime?: ReadingTimeConfig;
  /** SEO configuration */
  seo?: SEOConfig;
  /** Sitemap generation configuration */
  sitemap?: SitemapConfig;
  /** Robots.txt generation configuration */
  robots?: RobotsTxtConfig;
  /** RSS feed generation configuration */
  rss?: import('./rss.js').RSSConfig;
  /** Search index generation configuration */
  search?: SearchConfig;
  /** TypeScript compilation settings */
  typescript?: TypeScriptConfig;
  /**
   * Hashed stylesheets in production, and the stylesheet Stati builds with Tailwind CSS
   * (`--tailwind-input` and `--tailwind-output`)
   */
  css?: CSSConfig;
  /**
   * Image handling. Intrinsic sizes, lazy loading and co-located images work without
   * configuration; `false` turns them off. `responsive` and `og` need `@stati/images`.
   */
  images?: false | import('./images.js').ImagesConfig;
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
 * Reading time settings. Every page gets `wordCount` and `readingTime`, which templates read as
 * `stati.page.readingTime` and collection items carry as `post.readingTime`.
 *
 * @example
 * ```typescript
 * const readingTime: ReadingTimeConfig = { wordsPerMinute: 200 };
 * ```
 */
export interface ReadingTimeConfig {
  /**
   * Reading speed. `readingTime` is the word count divided by this number, rounded to whole
   * minutes, and never less than 1.
   *
   * @default 230
   */
  wordsPerMinute?: number;
}

/**
 * Collection settings.
 *
 * @example
 * ```typescript
 * const collections: CollectionsConfig = {
 *   // Listings also show each post's image, so changing it rebuilds them
 *   summaryFields: ['title', 'description', 'tags', 'draft', 'image'],
 *   // One page per author, rendered with site/authors/[author].md
 *   generate: ({ pages }) => [
 *     {
 *       url: '/authors/ada',
 *       template: 'authors/[author].md',
 *       label: 'Ada Lovelace',
 *       items: pages.filter((page) => page.frontMatter.author === 'ada'),
 *     },
 *   ],
 * };
 * ```
 */
export interface CollectionsConfig {
  /**
   * Front matter fields of collection pages that listings show. A page that reads
   * `stati.collection` rebuilds when one of these fields changes on a page in the collection,
   * and so do paginated and generated pages that list it. Each page's URL and publish date
   * always count. `content` stands for the Markdown body, for listings that show excerpts.
   * `wordCount` and `readingTime` stand for the values Stati computes for each page, so a
   * listing that shows the reading time rebuilds when the minutes change, and not when an edit
   * leaves them as they were.
   *
   * @default ['title', 'description', 'tags', 'draft']
   */
  summaryFields?: string[];
  /**
   * Pages to create from data, each rendered with a `[param].md` template. Runs once per build,
   * after content is loaded and before navigation is built.
   */
  generate?: (ctx: BuildContext) => GeneratedPageEntry[] | Promise<GeneratedPageEntry[]>;
}

/**
 * A page returned by `collections.generate`.
 */
export interface GeneratedPageEntry {
  /** URL of the page, such as `/authors/ada` */
  url: string;
  /** The `[param].md` template that renders it, relative to the source directory */
  template: string;
  /** `stati.generated.key`; defaults to the last segment of `url` */
  key?: string;
  /** `stati.generated.label` and the value of `{param}` placeholders; defaults to `key` */
  label?: string;
  /** Pages the page lists (`stati.generated.items`), split up by the template's `generate.paginate` */
  items?: import('./content.js').PageModel[];
  /** Any JSON-serializable data, as `stati.generated.data`; changing it rebuilds the page */
  data?: Record<string, unknown>;
}

/**
 * SEO configuration for the site.
 * Controls automatic SEO metadata injection and site-wide defaults.
 */
export interface SEOConfig {
  /**
   * Default author for all pages. A page that names its own `seo.author` uses that author
   * instead, including for `twitter:creator` and `article:author`.
   */
  defaultAuthor?: AuthorConfig;
  /** Site-wide Twitter Card values */
  twitter?: SEOTwitterConfig;
  /** Pages that get Open Graph article metadata, chosen by URL */
  articles?: SEOArticlesConfig;
  /** Automatically inject SEO tags into <head> if not present (default: true) */
  autoInject?: boolean;
  /** Enable debug logging for SEO generation (default: false) */
  debug?: boolean;
}

/**
 * Site-wide Twitter Card values. Front matter `seo.twitter` overrides them per page.
 *
 * @example
 * ```typescript
 * const twitter: SEOTwitterConfig = { site: '@example' };
 * ```
 */
export interface SEOTwitterConfig {
  /** The site's Twitter/X handle, with or without `@`, printed as `twitter:site` */
  site?: string;
}

/**
 * Pages that are articles. On a matching page, Stati prints `og:type` as `article` and fills
 * `article:published_time`, `article:modified_time`, `article:tag` and `article:author` from
 * the page, for each value its front matter leaves out. Generated pages and the pages of a
 * paginated listing never match.
 *
 * @example
 * ```typescript
 * const articles: SEOArticlesConfig = {
 *   include: ['/blog/*'],
 *   exclude: ['/blog/archive'],
 * };
 * ```
 */
export interface SEOArticlesConfig {
  /**
   * Glob patterns matched against the page URL, as in bundle `include`. A pattern must match
   * the whole URL: `/blog/*` matches `/blog/hello` but not the `/blog` index page.
   */
  include: string[];
  /** Glob patterns for page URLs that are never articles; take precedence over `include` */
  exclude?: string[];
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
   * Matches against the page URL (e.g., '/docs/api/hooks', or '/' for the home page),
   * not its output file. A pattern must match the whole URL: '/docs/**' does not match
   * the '/docs' index page itself.
   * If omitted, bundle is included on ALL pages (global bundle).
   *
   * Supports glob syntax: `*`, `**`, `?`, `[abc]` (no `{a,b}`; list each pattern instead)
   *
   * @example ['/docs', '/docs/**', '/api/**']
   */
  include?: string[];

  /**
   * Glob patterns for page URLs to exclude from this bundle.
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
 * Stylesheet settings. Production builds name stylesheets after their content, so a deploy
 * that changes the CSS gives it a new URL: the stylesheet Stati builds with Tailwind CSS when
 * `stati build` gets `--tailwind-input` and `--tailwind-output`, and every stylesheet in the
 * static directory a page links. Pages' `<link>` tags to `/styles.css` then point at
 * `/_assets/styles-[hash].css`. Development keeps every stylesheet's own name.
 *
 * @example
 * ```typescript
 * const config: StatiConfig = {
 *   css: {
 *     autoInject: false, // link stati.assets.stylesheetPaths in your templates instead
 *   },
 * };
 * ```
 */
export interface CSSConfig {
  /**
   * Name production stylesheets after their content, as `_assets/styles-A1B2C3D4.css`, and
   * point the pages' links at those names: the Tailwind output, and the static directory's
   * stylesheets that pages link (a copy; the file under its own name is still copied). When
   * false, production links every stylesheet under its own name, and writes the
   * `--tailwind-output` file. Development always uses the own names.
   * @default true
   */
  hash?: boolean;

  /**
   * Minify the Tailwind stylesheet in production builds. Development output, and stylesheets
   * in the static directory, are never minified.
   * @default true
   */
  minify?: boolean;

  /**
   * Add a `<link rel="stylesheet">` to the Tailwind stylesheet before `</head>` on every page
   * that does not link it already. When disabled, link it in your templates, under its own
   * path or from `stati.assets.stylesheetPaths`.
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
  /** Global allow rules (applies to all user agents); `''` writes an empty `Allow:` */
  allow?: string[];
  /** Global disallow rules (applies to all user agents); `''` writes `Disallow:`, which blocks nothing */
  disallow?: string[];
  /** Crawl delay in seconds (time between requests), written only when greater than 0 */
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
