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

  /** Eta template engine configuration */
  eta?: {
    filters?: Record<string, (x: unknown) => unknown>;
  };

  /** Incremental Static Generation configuration */
  isg?: ISGConfig;

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
  /** Default author for all pages (can be overridden per-page) */
  defaultAuthor?: AuthorConfig;

  /** Automatically inject SEO tags into <head> if not present (default: true) */
  autoInject?: boolean;

  /** Enable debug logging for SEO generation (default: false) */
  debug?: boolean;
}

interface AuthorConfig {
  /** Author's full name */
  name: string;

  /** Author's email address */
  email?: string;

  /** Author's website or profile URL */
  url?: string;
}
```

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

  /** Array of all loaded page models */
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
}
```

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
    /**
     * Table of contents extracted from headings.
     * Always an array (empty if no headings are present).
     */
    toc: TocEntry[];
    /** Current page's navigation node */
    navNode?: NavNode;
    /** Frontmatter fields spread into page object */
    [key: string]: unknown;
  };

  /** Rendered markdown content (same as page.content) */
  content: string;

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

  /** Discovered partials from underscore folders in hierarchy */
  partials: Record<string, string>;

  /** Collection data (available on index pages and collection children) */
  collection?: CollectionData;

  /** Bundle and search index paths (passed on every render) */
  assets?: StatiAssets;
}
```

The declared interface is narrower than what templates receive. At render time the context also has:

- `generator.version`: the installed `@stati/core` version
- `generateSEO(tags?)`: renders SEO tags for manual placement
- `propValue(...values)`: builds space-separated attribute values
- `props`: the props passed to a callable partial (`undefined` otherwise)
- `image(src, options?)`: renders a sized, lazy-loaded image, responsive with `images.responsive` (see [Images in templates](/configuration/images#images-in-templates))
- `ogImage`: the page's generated Open Graph image (`GeneratedOgImage`), when `images.og` made one
- `og`: the card's `width` and `height`, only while an `og.eta` card template renders
- every function from `eta.filters`, under its own name
- `partials.<name>`: each partial's rendered HTML, which can also be called with props (`stati.partials.card({ title: 'Hi' })`)

See [Template API](/api/templates) for how to use them.

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

  /** Hash of page content and all dependencies */
  readonly inputsHash: string;

  /** Array of file paths this page depends on */
  readonly deps: readonly string[];

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
}
```

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

**`@stati/core/types`** exports type declarations only (plus the `SEOTagType` enum), including the template and cache types that the main entry point leaves out: `TemplateContext`, `CollectionData`, `StatiAssets`, `TocEntry`, `CacheEntry`, `CacheManifest`, `RobotsTxtConfig`, `TypeScriptConfig`, `SearchConfig`, `SearchDocument`, `SearchIndex`, `SearchIndexMetadata` and `Logger`.

```typescript
import type { TemplateContext, CacheManifest, Logger } from '@stati/core/types';
```

**`@stati/core/config`** exports `loadConfig`, `clearConfigCache` and `getConfigFilePaths(cwd)`, which returns the config file paths Stati looks for in a directory.

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
    },
    beforeRender: async (ctx) => {
      // Modify page data before rendering
      ctx.page.frontMatter.description ??= ctx.config.site.description;
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
