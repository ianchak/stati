---
title: 'TypeScript Types'
description: 'Reference for TypeScript type definitions in Stati.'
order: 5
---

# TypeScript Types

Stati is built with TypeScript-first design, providing comprehensive type definitions for type-safe development and excellent IntelliSense support in your editor.

## Core Types

### Configuration Types

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

  /** TypeScript compilation settings */
  typescript?: TypeScriptConfig;

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

### Site Configuration

```typescript
interface SiteConfig {
  /** The site's title, used in templates and metadata (required) */
  title: string;

  /** Base URL for the site, used for absolute URL generation (required) */
  baseUrl: string;

  /** Default locale for internationalization (optional) */
  defaultLocale?: string;
}
```

### SEO Configuration

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

### Build Hooks

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

### Build Statistics

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

## Content Types

### PageModel Interface

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

  /** Publication date (parsed from front matter or file stats) */
  publishedAt?: Date;
}
```

### FrontMatter Interface

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
```

### TocEntry Interface

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

## Template Types

### TemplateContext Interface

The context object passed to Eta templates during rendering:

```typescript
interface TemplateContext {
  /** Site configuration (title, baseUrl, defaultLocale) */
  site: SiteConfig;

  /** Full Stati configuration */
  config: StatiConfig;

  /** Current page data */
  page: {
    /** Output path for the page */
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

  /** TypeScript bundle assets (when typescript.enabled is true) */
  assets?: StatiAssets;
}
```



## ISG Types

### ISG Configuration

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
}
```

### TypeScript Configuration

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
   * Matches against page output path (e.g., '/docs/api/hooks.html').
   * If omitted, bundle is included on ALL pages (global bundle).
   */
  include?: string[];

  /** Glob patterns for pages to exclude from this bundle. Takes precedence over include. */
  exclude?: string[];
}
```

> **Note:** Source maps, hashing, and minification are automatic based on build mode. In development, source maps are enabled and hash/minify are disabled. In production, source maps are disabled and hash/minify default to true but can be set to false for debugging.

### StatiAssets Interface

Available in templates when TypeScript is enabled. Script tags are **automatically injected** into your HTML during build - no template changes required!

```typescript
interface StatiAssets {
  /**
   * Array of all bundle paths matched for this page.
   * Paths are in config order: ['/_assets/core-abc.js', '/_assets/docs-def.js']
   * Always an array, empty [] if no TypeScript enabled or no bundles match.
   */
  bundlePaths: string[];
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



## Utility Types

### Configuration Helper

```typescript
/** Helper function for type-safe configuration */
declare function defineConfig(config: StatiConfig): StatiConfig;
```

## Module Exports

### Core Package

The `@stati/core` package exports the following types and functions:

```typescript
// Functions
export { defineConfig, loadConfig, setEnv, getEnv } from '@stati/core';
export { build, createDevServer, createPreviewServer, invalidate } from '@stati/core';

// Configuration types
export type {
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
} from '@stati/core';

// SEO types
export type {
  SEOMetadata,
  SEOConfig,
  RobotsConfig,
  OpenGraphConfig,
  OpenGraphImage,
  OpenGraphArticle,
  TwitterCardConfig,
  AuthorConfig,
} from '@stati/core';

// Sitemap types
export type {
  SitemapConfig,
  SitemapEntry,
  SitemapGenerationResult,
  ChangeFrequency,
} from '@stati/core';

// RSS types
export type {
  RSSConfig,
  RSSFeedConfig,
  RSSGenerationResult,
} from '@stati/core';
```

Additional types like `TemplateContext`, `CollectionData`, `StatiAssets`, `TocEntry`, and `CacheEntry` are available from the internal types barrel but are primarily used by the framework internally.

### CLI Package

```typescript
// From @stati/cli
export { cli } from '@stati/cli';
```

### Create-Stati Package

```typescript
// From create-stati
export interface CreateOptions {
  /** Name of the project to create */
  projectName: string;

  /** Template to use (currently only 'blank' is supported) */
  template: 'blank';

  /** CSS solution to use */
  styling: 'css' | 'sass' | 'tailwind';

  /** Enable TypeScript configuration */
  typescript?: boolean;

  /** Initialize a git repository */
  gitInit?: boolean;

  /** Install dependencies after scaffolding */
  install?: boolean;

  /** Package manager to use for installation */
  packageManager?: 'npm' | 'yarn' | 'pnpm' | 'bun';

  /** Target directory (defaults to projectName) */
  dir?: string;
}

export function createSite(options: CreateOptions): Promise<void>;
```

## Usage Examples

### Type-Safe Configuration

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

### Using Build Hooks

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
      if (ctx.page.frontMatter.draft) {
        console.log(`Skipping draft: ${ctx.page.slug}`);
      }
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

Stati's comprehensive TypeScript support ensures type safety throughout your development process, providing excellent IntelliSense and catching errors at compile time. Use these types to build robust, maintainable static sites with confidence.
