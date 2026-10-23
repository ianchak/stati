---
title: 'Types'
description: 'Reference for TypeScript type definitions in Stati.'
order: 5
seo:
  title: 'TypeScript types'
---

# Types

Stati is built with TypeScript-first design, providing comprehensive type definitions for type-safe development and excellent IntelliSense support in your editor.

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

### Collections configuration

```typescript
interface CollectionsConfig {
  /**
   * Front matter fields of collection pages that listings show; changing one rebuilds the pages
   * that list the page. URLs and publish dates always count; 'content' stands for the body.
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

Import `SiteConfig` from `@stati/core` or `@stati/core/types` to type the `site`
metadata separately from the full `StatiConfig`:

```typescript
import { defineConfig } from '@stati/core';
import type { SiteConfig } from '@stati/core';

const site: SiteConfig = {
  title: 'My Site',
  baseUrl: 'https://example.com',
};

export default defineConfig({ site });
```

```typescript
interface SiteConfig {
  /** The site's title, used in templates and metadata (required) */
  title: string;

  /** Base URL for the site, used for absolute URL generation (required) */
  baseUrl: string;

  /** Default locale for internationalization (optional) */
  defaultLocale?: string;

  /** Default site description for meta tags (used as fallback when page has no description) */
  description?: string;
}
```

### SEO configuration

```typescript
interface SEOConfig {
  /** Default author for all pages; a page's own seo.author replaces it */
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

interface SEOTwitterConfig {
  /** The site's Twitter/X handle, with or without '@', printed as twitter:site */
  site?: string;
}

interface SEOArticlesConfig {
  /** Glob patterns matched against the whole page URL, as in bundle include */
  include: string[];

  /** Glob patterns for page URLs that are never articles; win over include */
  exclude?: string[];
}

interface AuthorConfig {
  /** Author's full name */
  name: string;

  /** Author's email address */
  email?: string;

  /** Author's website or profile URL, printed as article:author on article pages */
  url?: string;

  /** Author's Twitter/X handle, with or without '@', printed as twitter:creator */
  twitter?: string;
}
```

See [site-wide SEO defaults](/configuration/seo#site-wide-defaults) for what these values print.

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

### Build statistics

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

  /** Position in a paginated listing; set on every page of a listing with `paginate` */
  pagination?: PaginationData;

  /** Set on pages created from a [param].md template or a collections.generate entry */
  generated?: GeneratedPageData;
}
```

Generated pages and the pages after the first of a listing share the template's or the first page's `sourcePath`, `content` and front matter, with `{param}` placeholders filled in. `PaginationData` and `GeneratedPageData` are described under [Template API](/api/templates#template-context-stati).

### FrontMatter interface

Front matter metadata extracted from content files:

```typescript
interface FrontMatter {
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

  /** Publication date when `publishedAt` and `published` are absent or invalid; also the sitemap lastmod fallback */
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

  /** URL of the collection index page this page reads as stati.collection, such as '/blog' */
  collection?: string;

  /** Splits the page's collection into pages: a size, or { size, path } */
  paginate?: number | { size: number; path?: string };

  /** In a [param].md template: { from: 'tags', paginate?: number | { size, path } } */
  generate?: { from?: string; paginate?: number | { size: number; path?: string } };

  /** In a [param].md template: include its pages in navigation */
  nav?: boolean;

  /** In a [param].md template: include its pages in the search index */
  search?: boolean;

  /** Additional custom properties */
  [key: string]: unknown;
}
```

### TocEntry interface

Table of contents entry extracted from page headings (available in template context via `stati.page.toc`):

```typescript
interface TocEntry {
  /** Anchor ID for the heading (used in href="#id") */
  id: string;

  /** Plain text content of the heading */
  text: string;

  /** Heading level (2-6) */
  level: number;
}
```

## Template types

### TemplateContext interface

The context object passed to Eta templates during rendering:

```typescript
interface TemplateContext {
  /** Site configuration (title, baseUrl, defaultLocale) */
  site: SiteConfig;

  /** Current page data */
  page: {
    /** URL path of the page (same value as url) */
    path: string;
    /** URL for the page */
    url: string;
    /** Rendered HTML content */
    content: string;
    /** Current page's navigation node */
    navNode?: NavNode;
    /** Frontmatter fields spread into page object */
    [key: string]: unknown;
  };

  /** Rendered markdown content (same as page.content) */
  content: string;

  /**
   * The HTML this template wraps: the wrapped output in a template named by stati.layout(),
   * the body argument (or undefined) in one rendered by stati.include(). Absent in the
   * page's own layout and in the Open Graph template.
   */
  body?: string;

  /** Props of the stati.include() or stati.layout() call that rendered this template */
  props: Record<string, unknown> | undefined;

  /** Renders another template here and returns its HTML */
  include: TemplateIncludeFunction;

  /** Wraps this template's output in another template */
  layout: TemplateLayoutFunction;

  /** The functions registered in the config's helpers */
  helpers: StatiHelpers;

  /** Navigation helpers and tree */
  nav: {
    /** The full navigation tree */
    tree: NavNode[];
    /** Gets the full navigation tree */
    getTree: () => NavNode[];
    /** Finds a navigation node by path or URL */
    findNode: (path: string) => NavNode | undefined;
    /** Gets the children of a navigation node */
    getChildren: (path: string) => NavNode[];
    /** Gets the parent of a navigation node */
    getParent: (path?: string) => NavNode | undefined;
    /** Gets the siblings of a navigation node */
    getSiblings: (path?: string, includeSelf?: boolean) => NavNode[];
    /** Gets a subtree starting from a specific path */
    getSubtree: (path: string) => NavNode[];
    /** Gets the breadcrumb trail for a path */
    getBreadcrumbs: (path?: string) => NavNode[];
    /** Gets the current page's navigation node */
    getCurrentNode: () => NavNode | undefined;
  };

  /** The page's collection: its own, the one it belongs to, or the one `collection` names */
  collection?: CollectionData;

  /** This page's part of a listing with `paginate` */
  pagination?: PaginationData;

  /** Key and items of a page created from a [param].md template */
  generated?: GeneratedPageData;

  /** Bundle and search index paths (passed on every render) */
  assets?: StatiAssets;

  /** The Stati version that rendered the page */
  generator: { version: string };

  /** The URL slug Stati gives generated page keys */
  slugify: (text: string) => string;

  /** Builds space-separated attribute values, like classnames */
  propValue: (...args: unknown[]) => string;

  /** Renders a sized, lazy-loaded image, responsive with images.responsive */
  image: (
    src: string,
    options?: { alt?: string; sizes?: string; priority?: boolean; class?: string; title?: string },
  ) => string;

  /** Renders SEO tags for manual placement */
  generateSEO: (tags?: string[]) => string;

  /** The card's width and height, only while an og.eta card template renders */
  og?: { width: number; height: number };

  /** The page's generated Open Graph image, when images.og made one */
  ogImage?: GeneratedOgImage;
}

interface TemplateIncludeFunction {
  (name: string, props?: Record<string, unknown> | null, body?: string | null): string;
  /** Whether name resolves to a template for this page */
  has(name: string): boolean;
}

interface TemplateLayoutFunction {
  /** Returns an empty string, so the call can be printed */
  (name: string, props?: Record<string, unknown> | null): string;
  /** The same function as stati.include.has */
  has(name: string): boolean;
}

type StatiHelpers = Record<string, (...args: any[]) => unknown>;
```

At render time, `page` also has `toc`: the table of contents extracted from the page's headings, always an array (empty when the page has none). The `TemplateContext` type leaves it out.

The root of the context holds only Stati's API. Your functions are under `helpers`, so they never replace a value of Stati's. See [Template API](/api/templates) for how to use the context.

## ISG types

### ISG configuration

```typescript
interface ISGConfig {
  /** Whether ISG caching is enabled */
  enabled?: boolean;

  /** Default cache time-to-live in seconds */
  ttlSeconds?: number;

  /** Maximum age in days for applying aging rules */
  maxAgeCapDays?: number;

  /** Array of aging rules for progressive cache extension */
  aging?: AgingRule[];
}

interface AgingRule {
  /** Number of days after which this aging rule applies */
  untilDays: number;

  /** Cache time-to-live in seconds for content matching this age */
  ttlSeconds: number;
}

interface CacheEntry {
  /** Output path of the rendered page */
  readonly path: string;

  /** Hash of page content, template dependencies and rendering asset inputs */
  readonly inputsHash: string;

  /** Every template file the last render used: the layout, the shells it names, the templates it included and the Open Graph template, as absolute paths, the layout first */
  readonly deps: readonly string[];

  /** Template names the last render looked up and the file each resolved to, including names that matched none; the page rebuilds when one would now resolve to another file */
  templateLookups?: readonly TemplateLookup[];

  /** Whether deps and templateLookups were recorded while the page rendered */
  templatesRecorded?: boolean;

  /** Tags for invalidation and organization */
  readonly tags: readonly string[];

  /** ISO date when content was originally published */
  publishedAt?: string;

  /** ISO date when page was last rendered */
  readonly renderedAt: string;

  /** Effective TTL for this page in seconds */
  readonly ttlSeconds: number;

  /** Maximum age cap for this page in days */
  maxAgeCapDays?: number;

  /** Files found while rendering, such as the images the page shows; their content is part of inputsHash */
  assetDeps?: readonly string[];

  /** Generated image files the page references, relative to the output directory */
  images?: readonly string[];

  /** Whether the last render read stati.collection; its summary is then part of inputsHash */
  readsCollection?: boolean;

  /** Whether the last render read stati.nav or stati.page.navNode */
  readsNav?: boolean;
}

interface TemplateLookup {
  /** The name as looked up, such as 'partials/header'; for /, ./ and ../ names, the file's path from the source directory with a leading / */
  readonly name: string;

  /** The folder the name was looked up from, relative to the source directory ('' for the source directory); absent for paths */
  readonly from?: string;

  /** The template file the name resolved to, relative to the source directory, or null when none matched */
  readonly file: string | null;
}
```

An entry without `templatesRecorded`, `readsCollection` or `readsNav` was written by a version of Stati that didn't record them, such as Stati 1; its page rebuilds once.

### TypeScript configuration

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

interface BundleConfig {
  /** Entry point file name relative to srcDir (e.g., 'main.ts', 'features/playground.ts') */
  entryPoint: string;

  /** Output bundle file name (without extension). Final filename includes hash in production. */
  bundleName: string;

  /**
   * Glob patterns for pages that should include this bundle.
   * Matches against the page URL (e.g., '/docs/api/hooks', or '/' for the home page).
   * If omitted, bundle is included on ALL pages (global bundle).
   */
  include?: string[];

  /** Glob patterns for pages to exclude from this bundle. Takes precedence over include. */
  exclude?: string[];
}
```

> **Note:** Source maps, hashing, and minification are automatic based on build mode. In development, source maps are enabled and hash/minify are disabled. In production, source maps are disabled and hash/minify default to true but can be set to false for debugging.

### Image configuration

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
  /** URL glob patterns of pages that get no generated image */
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

`GeneratedOgImage` is the generated card a template reads as `stati.ogImage`:

```typescript
interface GeneratedOgImage {
  /** Absolute URL */
  url: string;
  /** Root-relative path */
  path: string;
  width: number;
  height: number;
  /** Alternative text, the page title */
  alt?: string;
}
```

`ImageProvider`, `VariantRequest`, `VariantOutput`, `OgImageRequest`, `OgFont` and `OgDefaults` describe the contract between `@stati/core` and `@stati/images`. Sites don't need them.

### StatiAssets interface

Available in every template as `stati.assets`. Bundle script tags are injected into your HTML automatically (unless `typescript.autoInject` is `false`), so you only need these paths for custom markup.

```typescript
interface StatiAssets {
  /**
   * Array of all bundle paths matched for this page.
   * Paths are in config order: ['/_assets/core-abc.js', '/_assets/docs-def.js']
   * Always an array, empty [] if no TypeScript enabled or no bundles match.
   */
  bundlePaths: string[];

  /** Path to the search index (e.g., '/search-index-a1b2c3d4.json') when search is enabled */
  searchIndexPath?: string;
}
```

For advanced use cases like preloading, access via `stati.assets`:

```eta
<% if (stati.assets?.bundlePaths?.length) { %>
  <% for (const path of stati.assets.bundlePaths) { %>
  <link rel="modulepreload" href="<%= path %>">
  <% } %>
<% } %>
```

## Utility types

### Configuration helper

```typescript
/** Helper function for type-safe configuration */
declare function defineConfig(config: StatiConfig): StatiConfig;
```

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
  // The markdown-it instance that markdown.configure receives
  MarkdownIt,
  // Collections, pagination and generated pages
  CollectionData,
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

**`@stati/core/types`** exports type declarations only (plus the `SEOTagType` enum), including the template and cache types that the main entry point leaves out: `StatiAssets`, `TocEntry`, `CacheEntry`, `CacheManifest`, `TemplateLookup`, `RobotsTxtConfig`, `TypeScriptConfig`, `SearchConfig`, `SearchDocument`, `SearchIndex`, `SearchIndexMetadata` and `Logger`.

```typescript
import type { CacheManifest, Logger, TocEntry } from '@stati/core/types';
```

**`@stati/core/config`** exports `loadConfig`, `clearConfigCache`, `getConfigFilePaths(cwd)`, which returns the config file paths Stati looks for in a directory, and `validateConfigOptions(config)`, which throws for an option Stati does not know, such as Stati 1's `eta`, or for `helpers` that are not functions.

### CLI package

The `@stati/cli` package provides the `stati` command-line interface as a binary. It does not export any programmatic API - use `@stati/core` functions directly if you need to build programmatically.

### `create-stati` package

`create-stati` is a command-line tool only: the package declares a `bin` entry and no importable module or type declarations. See [Scaffolder](/cli/scaffolder) for its options.

## Usage examples

### Type-safe configuration

```typescript
import { defineConfig, type StatiConfig } from '@stati/core';

const config: StatiConfig = defineConfig({
  site: {
    title: 'My Site',
    baseUrl: 'https://example.com',
  },

  srcDir: 'site',
  outDir: 'dist',
  staticDir: 'public',

  markdown: {
    toc: true, // Enable automatic TOC extraction
  },

  hooks: {
    beforeAll: async ({ config, pages }) => {
      console.log(`Building ${pages.length} pages`);
    },
  },
});

export default config;
```

### Using build hooks

```typescript
import { defineConfig } from '@stati/core';

export default defineConfig({
  site: {
    title: 'My Site',
    baseUrl: 'https://example.com',
  },

  hooks: {
    beforeAll: async (ctx) => {
      console.log(`Starting build with ${ctx.pages.length} pages`);
      // Change page data here: beforeAll runs before the cache check
      for (const page of ctx.pages) {
        page.frontMatter.description ??= ctx.config.site.description;
      }
    },
    beforeRender: async (ctx) => {
      console.log(`Rendering: ${ctx.page.url}`);
    },
    afterRender: async (ctx) => {
      console.log(`Rendered: ${ctx.page.url}`);
    },
    afterAll: async (ctx) => {
      console.log('Build complete!');
    },
  },
});
```

These types give you editor completion and compile-time checks in `stati.config.ts`, hooks and build scripts. Templates are plain JavaScript and are not type-checked.
