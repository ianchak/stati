---
title: 'Types'
description: 'The TypeScript types for stati.config.ts, hooks and build scripts, and which @stati/core entry point exports each one.'
order: 5
seo:
  title: 'TypeScript types'
---

# Types

These types give you editor completion and compile-time checks in `stati.config.ts`, hooks and build scripts. Templates are plain JavaScript and are not type-checked.

## Core types

### Configuration types

Main configuration interface for Stati:

```typescript
import type { StatiConfig } from '@stati/core';

interface StatiConfig {
  /** Source directory for content files (default: 'site') */
  srcDir?: string;

  /** Output directory for generated site (default: 'dist') */
  outDir?: string;

  /** Directory for static assets (default: 'public') */
  staticDir?: string;

  /** Site-wide configuration (required) */
  site: SiteConfig;

  /** Markdown processing configuration */
  markdown?: {
    plugins?: (string | [string, unknown])[];
    configure?: (md: MarkdownIt) => void;
    toc?: boolean;
  };

  /** Functions templates call as stati.helpers.name() */
  helpers?: Record<string, (...args: any[]) => unknown>;

  /** Incremental Static Generation configuration */
  isg?: ISGConfig;

  /** Collection listings: which fields rebuild them, and pages generated from data */
  collections?: CollectionsConfig;

  /** Reading speed for each page's readingTime */
  readingTime?: ReadingTimeConfig;

  /** SEO configuration */
  seo?: SEOConfig;

  /** Sitemap generation configuration */
  sitemap?: SitemapConfig;

  /** Robots.txt generation configuration */
  robots?: RobotsTxtConfig;

  /** RSS feed generation configuration */
  rss?: RSSConfig;

  /** Search index generation configuration */
  search?: SearchConfig;

  /** TypeScript compilation settings */
  typescript?: TypeScriptConfig;

  /** Hashed production stylesheets, and the one Stati builds with Tailwind CSS */
  css?: CSSConfig;

  /** Image sizes, responsive images and Open Graph cards; false turns the built-in handling off */
  images?: false | ImagesConfig;

  /** Development server configuration */
  dev?: {
    port?: number;
    host?: string;
    open?: boolean;
  };

  /** Preview server configuration */
  preview?: {
    port?: number;
    host?: string;
    open?: boolean;
  };

  /** Build lifecycle hooks */
  hooks?: BuildHooks;
}
```

### Reading time configuration

```typescript
interface ReadingTimeConfig {
  /** Words read in a minute; any number above 0. Default: 230 */
  wordsPerMinute?: number;
}
```

See [Word count and reading time](/core-concepts/markdown#word-count-and-reading-time).

### Collections configuration

```typescript
interface CollectionsConfig {
  /**
   * Front matter fields of collection pages that listings show; changing one rebuilds the pages
   * that list the page. URLs and publish dates always count; 'content' stands for the body, and
   * 'wordCount' and 'readingTime' for the counts Stati computes for each page.
   * Default: ['title', 'description', 'tags', 'draft']
   */
  summaryFields?: string[];

  /** Pages to create from data, each rendered with a [param].md template */
  generate?: (ctx: BuildContext) => GeneratedPageEntry[] | Promise<GeneratedPageEntry[]>;
}

interface GeneratedPageEntry {
  url: string; // '/authors/ada'
  template: string; // 'authors/[author].md', relative to the source directory
  key?: string; // Defaults to the last segment of url
  label?: string; // Defaults to key; the value of {param} placeholders
  items?: PageModel[]; // stati.generated.items
  data?: Record<string, unknown>; // stati.generated.data; JSON-serializable
}
```

See [Collections and generated pages](/core-concepts/collections).

### Site configuration

```typescript
interface SiteConfig {
  /** The site's title, used in templates and metadata (required) */
  readonly title: string;

  /** Base URL for the site, used for absolute URL generation (required) */
  readonly baseUrl: string;

  /** Default locale for internationalization (optional) */
  readonly defaultLocale?: string;

  /** Default site description for meta tags (used as fallback when page has no description) */
  readonly description?: string;
}
```

### SEO, sitemap and robots.txt configuration

`SEOConfig`, `SEOTwitterConfig`, `SEOArticlesConfig`, `AuthorConfig`, `SitemapConfig`, `NewsSitemapConfig` and `RobotsTxtConfig` are listed with the other SEO types under [SEO API: configuration interfaces](/api/seo#configuration-interfaces).

### Build hooks

```typescript
interface BuildHooks {
  /** Called before starting the build process */
  beforeAll?: (ctx: BuildContext) => Promise<void> | void;

  /** Called after completing the build process */
  afterAll?: (ctx: BuildContext) => Promise<void> | void;

  /** Called before rendering each individual page */
  beforeRender?: (ctx: PageContext) => Promise<void> | void;

  /** Called after rendering each individual page */
  afterRender?: (ctx: PageContext) => Promise<void> | void;
}

interface BuildContext {
  /** The resolved Stati configuration */
  config: StatiConfig;

  /** Every page of the build, generated and paginated pages included */
  pages: PageModel[];
}

interface PageContext {
  /** The page model being processed */
  page: PageModel;

  /** The resolved Stati configuration */
  config: StatiConfig;
}
```

### Build options and result

`build(options?)` takes a `BuildOptions` object, the options the `stati build` flags set:

```typescript
interface BuildOptions {
  /** Render every page, whatever the ISG cache holds (--force) */
  force?: boolean;

  /** Delete the output directory and the .stati cache before building (--clean) */
  clean?: boolean;

  /** A config file path; Stati loads the stati.config.* file in its folder */
  configPath?: string;

  /** Build pages with draft: true (--include-drafts) */
  includeDrafts?: boolean;

  /** Receives the build's output; the console by default */
  logger?: Logger;

  /** Collect build metrics into BuildResult.buildMetrics (--metrics, --metrics-detailed) */
  metrics?: { enabled?: boolean; detailed?: boolean };

  /** Build a stylesheet with Tailwind CSS (--tailwind-input, --tailwind-output) */
  tailwind?: { input: string; output: string };
}
```

It returns a `BuildResult`: the statistics below, plus `buildMetrics` when `metrics.enabled` is true.

```typescript
interface BuildStats {
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
```

## Content types

### PageModel interface

Core page object representing a content file during build:

```typescript
interface PageModel {
  /** URL-friendly identifier for the page */
  slug: string;

  /** Full URL path for the page (e.g., '/blog/my-post') */
  url: string;

  /** Absolute path to the source content file */
  sourcePath: string;

  /** Parsed front matter metadata */
  frontMatter: FrontMatter;

  /** Raw markdown content (before rendering) */
  content: string;

  /** Publication date, from the first valid of `publishedAt`, `published`, `date`, `createdAt` */
  publishedAt?: Date;

  /** Words in the Markdown body, without code blocks, HTML tags and Markdown syntax */
  wordCount?: number;

  /** Whole minutes to read the page, at least 1: wordCount / readingTime.wordsPerMinute */
  readingTime?: number;

  /** Position in a paginated listing; set on every page of a listing with `paginate` */
  pagination?: PaginationData;

  /** Set on pages created from a [param].md template or a collections.generate entry */
  generated?: GeneratedPageData;
}
```

Generated pages and the pages after the first of a listing share the template's or the first page's `sourcePath`, `content` and front matter; in generated pages' front matter, `{param}` placeholders are filled in. `PaginationData` and `GeneratedPageData` are described under [Template API](/api/templates#template-context-stati).

### FrontMatter interface

Front matter metadata extracted from content files:

```typescript
interface FrontMatter {
  /** Page title for SEO and display */
  title?: string;

  /** Page description for SEO and meta tags */
  description?: string;

  /** Array of tags for categorization; a single tag (`tags: news`) is read as a list of one */
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

  /** Publication date when `publishedAt` and `published` are absent or invalid */
  date?: string | Date;

  /** Last updated date as ISO string */
  updated?: string;

  /** Custom cache TTL in seconds (overrides global ISG settings) */
  ttlSeconds?: number;

  /** Custom max age cap in days (overrides global ISG settings) */
  maxAgeCapDays?: number;

  /** Whether the page is a draft (excludes from build); only `true` makes it one */
  draft?: boolean;

  /** SEO configuration for the page */
  seo?: SEOMetadata;

  /** Sitemap configuration for the page */
  sitemap?: SitemapMetadata;

  /** URL of the collection index page this page reads as stati.collection, such as '/blog' */
  collection?: string;

  /** Splits the page's collection into pages: a size, or { size, path } */
  paginate?: number | { size: number; path?: string };

  /** In a [param].md template: { from: 'tags', paginate?: number | { size, path } } */
  generate?: { from?: string; paginate?: number | { size: number; path?: string } };

  /** In a [param].md template or the 404 page: include the page(s) in navigation */
  nav?: boolean;

  /** In a [param].md template or the 404 page: include the page(s) in the search index */
  search?: boolean;

  /** Additional custom properties */
  [key: string]: unknown;
}
```

## Template types

`TemplateContext` is the `stati` object every template receives, with `TemplateIncludeFunction` (`stati.include`), `TemplateLayoutFunction` (`stati.layout`), `StatiHelpers` (`stati.helpers`) and the types of its members (`TocEntry`, `StatiAssets`, `PaginationData`, `GeneratedPageData`, `GeneratedOgImage`, `PropValueArg`). They are defined under [Template API](/api/templates#template-context-stati). Templates are not type-checked; use these types to type helpers and build scripts.

## ISG types

### ISG configuration

```typescript
interface ISGConfig {
  /** Whether ISG caching is enabled (default: true) */
  enabled?: boolean;

  /** Default cache time-to-live in seconds (default: 21600) */
  ttlSeconds?: number;

  /** Dated pages older than this many days are no longer rebuilt for TTL reasons (default: 365) */
  maxAgeCapDays?: number;

  /** Array of aging rules for progressive cache extension */
  aging?: AgingRule[];
}

interface AgingRule {
  /**
   * The rule applies to pages up to this many days old. A page older than every rule's
   * untilDays gets the last rule's TTL.
   */
  untilDays: number;

  /** Cache time-to-live in seconds for content matching this age */
  ttlSeconds: number;
}
```

`CacheManifest`, `CacheEntry` and `TemplateLookup` (from `@stati/core/types`) describe `.stati/manifest.json`; see [Cache manifest](/core-concepts/isg#cache-manifest).

## TypeScript and CSS types

```typescript
interface TypeScriptConfig {
  /** Enable TypeScript compilation */
  enabled: boolean;

  /** Source directory containing TypeScript files (default: 'src') */
  srcDir?: string;

  /** Output directory within dist (default: '_assets') */
  outDir?: string;

  /** Add content hash to filename in production (default: true, ignored in development) */
  hash?: boolean;

  /** Minify JavaScript output in production (default: true, ignored in development) */
  minify?: boolean;

  /**
   * Array of bundle configurations for multiple entry points.
   * Each bundle can target specific pages using include/exclude patterns.
   * Defaults to [{ entryPoint: 'main.ts', bundleName: 'main' }]
   */
  bundles?: BundleConfig[];

  /**
   * Automatically inject bundle script tags before </body>.
   * When disabled, use stati.assets.bundlePaths in templates for manual control.
   * @default true
   */
  autoInject?: boolean;
}

/** The `css` block: hashed production stylesheets and Tailwind CSS (see /configuration/css) */
interface CSSConfig {
  /**
   * Name production stylesheets after their content, _assets/styles-[hash].css, and point the
   * pages' links at them: the Tailwind output and the public/ stylesheets pages link
   * (default: true, ignored in development)
   */
  hash?: boolean;

  /** Minify the production Tailwind stylesheet (default: true, ignored in development) */
  minify?: boolean;

  /** Add a <link rel="stylesheet"> to the Tailwind stylesheet before </head> (default: true) */
  autoInject?: boolean;
}

interface BundleConfig {
  /** Entry point file name relative to srcDir (e.g., 'main.ts', 'features/playground.ts') */
  entryPoint: string;

  /** Output bundle file name (without extension). Final filename includes hash in production. */
  bundleName: string;

  /**
   * Glob patterns for pages that should include this bundle, matched against the whole page URL
   * (e.g., '/docs/api/hooks', or '/' for the home page): '/docs/**' does not match '/docs'.
   * Supports *, **, ? and [abc], not {a,b}. If omitted, the bundle is included on every page.
   */
  include?: string[];

  /** Glob patterns for page URLs to exclude from this bundle, matched like include. Takes precedence over include. */
  exclude?: string[];
}
```

> **Note:** Development builds always write source maps for TypeScript bundles; production builds never do.

## Image types

Types for the `images` block. `responsive` and `og` need the `@stati/images` package. See [Images](/configuration/images) for defaults and behavior.

```typescript
interface ImagesConfig {
  /** Load the first image near the top of a page eagerly with high fetch priority (default: true) */
  eagerFirst?: boolean;
  /** AVIF and WebP variants with srcset and <picture> */
  responsive?: boolean | ResponsiveImagesConfig;
  /** An Open Graph image for every page */
  og?: boolean | OgImagesConfig;
  /** 'fast' (default) skips responsive and og in the dev server; 'full' runs them */
  dev?: 'fast' | 'full';
}

interface ResponsiveImagesConfig {
  /** Candidate widths in pixels (default: [480, 960, 1440]) */
  widths?: number[];
  /** Formats added as <source> elements (default: ['avif', 'webp']) */
  formats?: ImageVariantFormat[]; // 'avif' | 'webp'
  /** Encoder quality from 1 to 100 (default: avif 50, webp 75, jpeg 80, png lossless) */
  quality?: ImagesQualityConfig; // { avif?, webp?, jpeg?, png? }
  /** Default sizes attribute (default: '100vw') */
  sizes?: string;
}

interface OgImagesConfig {
  /** Template file name, looked up from the page's folder up to srcDir (default: 'og.eta') */
  template?: string;
  /** Card width in pixels (default: 1200) */
  width?: number;
  /** Card height in pixels (default: 630) */
  height?: number;
  /** Output format (default: 'png') */
  format?: 'png' | 'jpeg';
  /** Fonts added to the bundled ones (Archivo, Inter, Fira Code) */
  fonts?: OgImageFontConfig[];
  /** URL glob patterns of pages that get no generated image; a pattern must match the whole URL */
  exclude?: string[];
}

interface OgImageFontConfig {
  /** Family name used in font-family inside the template */
  name: string;
  /** TTF, OTF or WOFF file, relative to the project root (WOFF2 is not supported) */
  path: string;
  /** Font weight (default: 400) */
  weight?: number;
  /** Font style (default: 'normal') */
  style?: 'normal' | 'italic';
}
```

`GeneratedOgImage` (`stati.ogImage`) is defined under [Template API](/api/templates#template-context-stati). `ImageProvider`, `VariantRequest`, `VariantOutput`, `OgImageRequest`, `OgFont` and `OgDefaults` describe the contract between `@stati/core` and `@stati/images`. Sites don't need them.

## Module exports

### Core package

`@stati/core` has three entry points.

**`@stati/core`** exports these functions:

```typescript
// Configuration and environment
import { defineConfig, loadConfig, clearConfigCache } from '@stati/core';
import { setEnv, getEnv, isDevelopment, isProduction, isTest, getStatiVersion } from '@stati/core';

// Build and servers
import { build, createDevServer, createPreviewServer, invalidate } from '@stati/core';

// Metrics
import { createMetricRecorder, noopMetricRecorder, writeMetrics } from '@stati/core';

// SEO, sitemap and robots.txt
import {
  generateSEOMetadata,
  generateSEO,
  generateOpenGraphTags,
  generateTwitterCardTags,
  generateSitemap,
  generateSitemapEntry,
  generateSitemapXml,
  generateSitemapIndexXml,
  generateNewsSitemap,
  generateNewsSitemapXml,
  generateRobotsTxt,
  generateRobotsTxtFromConfig,
  generateRobotsContent,
  validateSEOMetadata,
  detectExistingSEOTags,
  autoInjectSEO,
  shouldAutoInject,
  escapeHtml,
  normalizeUrlPath,
  resolveAbsoluteUrl,
  isValidUrl,
} from '@stati/core';

// RSS
import {
  generateRSSFeed,
  generateRSSFeeds,
  validateRSSConfig,
  validateRSSFeedConfig,
} from '@stati/core';
```

and these types:

```typescript
import type {
  // Configuration and content
  SiteConfig,
  StatiConfig,
  StatiHelpers,
  TemplateContext,
  TemplateIncludeFunction,
  TemplateLayoutFunction,
  PageModel,
  FrontMatter,
  BuildContext,
  PageContext,
  BuildHooks,
  NavNode,
  ISGConfig,
  AgingRule,
  BuildStats,
  BundleConfig,
  CSSConfig,
  ReadingTimeConfig,
  // The markdown-it instance that markdown.configure receives
  MarkdownIt,
  // Collections, pagination and generated pages
  CollectionData,
  RelatedPagesOptions,
  CollectionsConfig,
  GeneratedPageEntry,
  PaginationData,
  GeneratedPageData,
  PaginateOptions,
  GenerateOptions,
  // Build, servers and invalidation
  BuildOptions,
  BuildResult,
  MetricsOptions,
  TailwindBuildOptions,
  DevServerOptions,
  PreviewServerOptions,
  InvalidationResult,
  // Metrics
  BuildMetrics,
  MetricsMeta,
  MetricsFlags,
  MetricsTotals,
  MetricsPhases,
  MetricsCounts,
  MetricsISG,
  PageTiming,
  IncrementalMetrics,
  MetricRecorder,
  MetricRecorderOptions,
  PhaseName,
  CounterName,
  // SEO
  SEOMetadata,
  SEOConfig,
  SEOTwitterConfig,
  SEOArticlesConfig,
  SEOContext,
  SEOValidationResult,
  SEOTagType,
  RobotsConfig,
  OpenGraphConfig,
  OpenGraphImage,
  OpenGraphArticle,
  TwitterCardConfig,
  AuthorConfig,
  AutoInjectOptions,
  // Sitemap and RSS
  SitemapConfig,
  NewsSitemapConfig,
  NewsSitemapGenerationResult,
  SitemapEntry,
  SitemapGenerationResult,
  ChangeFrequency,
  RSSConfig,
  RSSFeedConfig,
  RSSGenerationResult,
  RSSValidationResult,
  // Images
  ImagesConfig,
  ResponsiveImagesConfig,
  OgImagesConfig,
  OgImageFontConfig,
  ImagesQualityConfig,
  ImageVariantFormat,
  ImageOutputFormat,
  ImageSourceFormat,
  GeneratedOgImage,
  ImageProvider,
  VariantRequest,
  VariantOutput,
  OgImageRequest,
  OgFont,
  OgDefaults,
} from '@stati/core';
```

`SEOTagType` is exported from `@stati/core` as a type only. To use its values (such as `SEOTagType.Title`), import it from `@stati/core/types`.

**`@stati/core/types`** exports type declarations only (plus the `SEOTagType` enum), including these the main entry point leaves out: `StatiAssets`, `TocEntry`, `PropValueArg`, `NavigationHelpers` (`stati.nav`), `StatiImageOptions` (the options of `stati.image()`), `SitemapMetadata` (front matter `sitemap`), `CacheEntry`, `CacheManifest`, `TemplateLookup`, `RobotsTxtConfig`, `TypeScriptConfig`, `SearchConfig`, `SearchDocument`, `SearchIndex`, `SearchIndexMetadata` and `Logger`.

```typescript
import type { CacheManifest, Logger, TocEntry } from '@stati/core/types';
```

**`@stati/core/config`** exports `loadConfig`, `clearConfigCache`, `getConfigFilePaths(cwd)`, which returns the config file paths Stati looks for in a directory, and `validateConfigOptions(config)`, which throws for an option Stati does not know, such as a leftover `eta` block, or for `helpers` that are not functions.

### CLI package

The `@stati/cli` package provides the `stati` command-line interface as a binary. It does not export any programmatic API - use `@stati/core` functions directly if you need to build programmatically.

### `create-stati` package

`create-stati` is a command-line tool only: the package declares a `bin` entry and no importable module or type declarations. See [Scaffolder](/cli/scaffolder) for its options.
