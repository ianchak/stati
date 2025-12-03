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
  /** Site metadata and settings */
  site: SiteConfig;

  /** Build configuration */
  build?: BuildConfig;

  /** Development server settings */
  dev?: DevConfig;

  /** Template engine configuration */
  templates?: TemplateConfig;

  /** Markdown processing configuration */
  markdown?: MarkdownConfig;

  /** ISG (Incremental Static Generation) settings */
  isg?: ISGConfig;

  /** TypeScript compilation settings */
  typescript?: TypeScriptConfig;

  /** Custom configuration extensions */
  [key: string]: any;
}
```

### Site Configuration

```typescript
interface SiteConfig {
  /** Site title */
  title: string;

  /** Site description */
  description: string;

  /** Site URL (required for sitemaps and social cards) */
  url: string;

  /** Site language */
  language?: string;

  /** Site timezone */
  timezone?: string;

  /** Author information */
  author?: AuthorConfig;

  /** SEO and meta tag configuration */
  meta?: MetaConfig;

  /** Open Graph configuration */
  openGraph?: OpenGraphConfig;

  /** Twitter card configuration */
  twitter?: TwitterConfig;

  /** Analytics configuration */
  analytics?: AnalyticsConfig;

  /** RSS feed configuration */
  feeds?: FeedConfig;

  /** Internationalization settings */
  i18n?: I18nConfig;
}

interface AuthorConfig {
  name: string;
  email?: string;
  url?: string;
  avatar?: string;
  bio?: string;
  social?: Record<string, string>;
}

interface MetaConfig {
  viewport?: string;
  themeColor?: string;
  keywords?: string[];
  robots?: string;
  locale?: string;
}

interface OpenGraphConfig {
  type?: 'website' | 'article' | 'book' | 'profile';
  image?: string;
  imageWidth?: number;
  imageHeight?: number;
  siteName?: string;
  locale?: string;
}

interface TwitterConfig {
  card?: 'summary' | 'summary_large_image' | 'app' | 'player';
  site?: string;
  creator?: string;
  image?: string;
}
```

### Build Configuration

```typescript
interface BuildConfig {
  /** Input directory for content */
  contentDir?: string;

  /** Output directory for generated site */
  outputDir?: string;

  /** Public assets directory */
  publicDir?: string;

  /** Clean output directory before build */
  clean?: boolean;

  /** Enable minification */
  minify?: boolean | MinifyConfig;

  /** Asset optimization settings */
  assets?: AssetConfig;

  /** Build parallelization */
  parallel?: boolean | ParallelConfig;
}

interface MinifyConfig {
  html?: boolean | HtmlMinifyOptions;
  css?: boolean | CssMinifyOptions;
  js?: boolean | JsMinifyOptions;
}

interface AssetConfig {
  /** Image optimization */
  images?: ImageOptimization;

  /** CSS processing */
  css?: CssProcessing;

  /** JavaScript processing */
  js?: JsProcessing;
}

interface ParallelConfig {
  enabled: boolean;
  maxWorkers?: number;
}
```

## Content Types

### Page Interface

Core page object structure:

```typescript
interface Page {
  /** Page path (URL) */
  path: string;

  /** Page title */
  title: string;

  /** Page description */
  description?: string;

  /** Page content (HTML) */
  content: string;

  /** Raw markdown content */
  raw?: string;

  /** Front matter data */
  frontMatter: Record<string, any>;

  /** Page metadata */
  meta: PageMeta;

  /** Page type */
  type?: string;

  /** Page tags */
  tags?: string[];

  /** Page categories */
  categories?: string[];

  /** Page author */
  author?: string;

  /** Publication date */
  publishedAt?: string;

  /** Last modified date */
  modifiedAt?: string;

  /** Draft status */
  draft?: boolean;

  /** Template to use */
  template?: string;

  /** Custom page data */
  [key: string]: any;
}

interface PageMeta {
  /** Source file path */
  sourcePath: string;

  /** Output file path */
  outputPath: string;

  /** File size */
  size: number;

  /** Content hash */
  hash: string;

  /** Build timestamp */
  builtAt: string;

  /** Page dependencies */
  dependencies: string[];

  /** ISG cache tags */
  cacheTags: string[];
}
```

### Content Processing

```typescript
interface ContentProcessor {
  /** Processor name */
  name: string;

  /** File pattern to match */
  test: RegExp | ((filePath: string) => boolean);

  /** Process function */
  process: (filePath: string, context: BuildContext) => Promise<Page | Page[] | null>;

  /** Processor options */
  options?: Record<string, any>;
}

interface BuildContext {
  /** Build configuration */
  config: StatiConfig;

  /** All pages */
  pages: Page[];

  /** Global data */
  globalData: Record<string, any>;

  /** Build statistics */
  stats: BuildStats;

  /** Logger instance */
  logger: Logger;

  /** Utility functions */
  utils: BuildUtils;
}

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

## Template Types

### Template Configuration

```typescript
interface TemplateConfig {
  /** Template engine */
  engine?: 'eta' | 'ejs' | 'handlebars';

  /** Templates directory */
  templatesDir?: string;

  /** Layouts directory */
  layoutsDir?: string;

  /** Partials directory */
  partialsDir?: string;

  /** Template file extensions */
  extensions?: string[];

  /** Default layout */
  defaultLayout?: string;

  /** Eta-specific configuration */
  eta?: EtaConfig;

  /** Custom filters */
  filters?: Record<string, TemplateFilter>;

  /** Global template data */
  data?: Record<string, any>;
}

interface EtaConfig {
  /** Template delimiters */
  tags?: [string, string];

  /** Auto-escape HTML */
  autoEscape?: boolean;

  /** Auto-trim whitespace */
  autoTrim?: boolean;

  /** Debug mode */
  debug?: boolean;

  /** Cache compiled templates */
  cache?: boolean;

  /** Custom filters */
  filters?: Record<string, TemplateFilter>;

  /** Global data */
  data?: Record<string, any>;
}

type TemplateFilter = (value: any, ...args: any[]) => any | Promise<any>;

interface TemplateContext {
  /** Current page data */
  page: Page;

  /** Site configuration */
  site: SiteConfig;

  /** All pages */
  pages: Page[];

  /** Global data */
  data: Record<string, any>;

  /** Utility functions */
  utils: TemplateUtils;
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

### ISG Cache

```typescript
interface ISGCache {
  /** Cache directory */
  directory: string;

  /** Maximum cache size */
  maxSize: string | number;

  /** Cache cleanup */
  cleanup?: ISGCacheCleanup;

  /** Cache compression */
  compression?: ISGCacheCompression;
}

interface CacheEntry {
  /** Entry key */
  key: string;

  /** Entry value */
  value: any;

  /** Creation timestamp */
  createdAt: number;

  /** Last accessed timestamp */
  accessedAt: number;

  /** TTL in milliseconds */
  ttl: number;

  /** Cache tags */
  tags: string[];

  /** Dependencies */
  dependencies: string[];

  /** Content hash */
  hash: string;
}
```

## Utility Types

### Helper Types

```typescript
/** Make all properties optional recursively */
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/** Make specific properties required */
type RequiredKeys<T, K extends keyof T> = T & Required<Pick<T, K>>;

/** Extract specific properties */
type PickRequired<T, K extends keyof T> = Required<Pick<T, K>>;

/** Omit and make optional */
type OmitOptional<T, K extends keyof T> = Partial<Omit<T, K>>;

/** Function type for configuration */
type ConfigFunction<T> = (config: DeepPartial<T>) => T;

/** Event handler type */
type EventHandler<T = any> = (event: T) => void | Promise<void>;

/** Async function type */
type AsyncFunction<T = void, U = any> = (...args: U[]) => Promise<T>;
```

### Configuration Helpers

```typescript
/** Helper function for type-safe configuration */
declare function defineConfig(config: StatiConfig): StatiConfig;

/** Plugin factory type */
type PluginFactory<T = Record<string, any>> = (options?: T) => Plugin;

/** Template filter factory */
type FilterFactory<T = any, U = any> = (options?: T) => TemplateFilter<U>;

/** Processor factory */
type ProcessorFactory<T = Record<string, any>> = (options?: T) => ContentProcessor;
```

## Module Declarations

### Core Modules

```typescript
declare module '@stati/core' {
  export { defineConfig } from './config';
  export type * from './types';
  export { build, dev, createContext } from './core';
}

declare module '@stati/cli' {
  export { cli } from './cli';
  export type { CLIOptions, CLIContext } from './types';
}

declare module 'create-stati' {
  export interface ScaffoldOptions {
    projectName: string;
    template: 'blank';
    styling: 'css' | 'sass' | 'tailwind';
    git: boolean;
    directory?: string;
  }

  export function scaffold(options: ScaffoldOptions): Promise<void>;
}
```

### Plugin Modules

```typescript
declare module '@stati/plugin-*' {
  const plugin: PluginFactory;
  export default plugin;
}

declare module 'stati-plugin-*' {
  const plugin: PluginFactory;
  export default plugin;
}
```

## Type Guards

### Runtime Type Checking

```typescript
/** Check if value is a valid page */
function isPage(value: any): value is Page {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof value.path === 'string' &&
    typeof value.title === 'string' &&
    typeof value.content === 'string'
  );
}

/** Check if value is a valid plugin */
function isPlugin(value: any): value is Plugin {
  return typeof value === 'object' && value !== null && typeof value.name === 'string';
}

/** Check if value is a content processor */
function isContentProcessor(value: any): value is ContentProcessor {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof value.name === 'string' &&
    (value.test instanceof RegExp || typeof value.test === 'function') &&
    typeof value.process === 'function'
  );
}

/** Check if value is a template filter */
function isTemplateFilter(value: any): value is TemplateFilter {
  return typeof value === 'function';
}
```

## Generic Types

### Extensible Types

```typescript
/** Extensible page type */
interface ExtensiblePage<T = Record<string, any>> extends Page {
  /** Custom properties */
  custom: T;
}

/** Extensible config type */
interface ExtensibleConfig<T = Record<string, any>> extends StatiConfig {
  /** Custom configuration */
  custom: T;
}

/** Plugin with typed options */
interface TypedPlugin<T = Record<string, any>> extends Plugin {
  /** Typed configuration */
  config: T;
}

/** Content processor with typed options */
interface TypedProcessor<T = Record<string, any>> extends ContentProcessor {
  /** Typed options */
  options: T;
}
```

## Usage Examples

### Type-Safe Configuration

```typescript
import { defineConfig, type StatiConfig } from '@stati/core';

const config: StatiConfig = defineConfig({
  site: {
    title: 'My Site',
    description: 'A Stati-powered site',
    url: 'https://example.com',
  },

  build: {
    outputDir: 'dist',
    minify: true,
  },

  plugins: [
    // Type-safe plugin usage
    myPlugin({
      option1: 'value',
      option2: true,
    }),
  ],
});

export default config;
```

### Type-Safe Plugin Development

```typescript
import type { Plugin, PluginFactory } from '@stati/core';

interface MyPluginOptions {
  enabled: boolean;
  apiKey: string;
  debug?: boolean;
}

const createMyPlugin: PluginFactory<MyPluginOptions> = (options = {}) => {
  const config: MyPluginOptions = {
    enabled: true,
    apiKey: '',
    debug: false,
    ...options,
  };

  const plugin: Plugin = {
    name: 'my-plugin',
    config,

    hooks: {
      'build:start': async (context) => {
        if (config.debug) {
          console.log('Plugin started');
        }
      },
    },
  };

  return plugin;
};

export default createMyPlugin;
```

### Custom Type Extensions

```typescript
// Extend the Page interface
declare module '@stati/core' {
  interface Page {
    /** Reading time in minutes */
    readingTime?: number;

    /** Word count */
    wordCount?: number;

    /** Custom metadata */
    seo?: {
      keywords: string[];
      noindex: boolean;
    };
  }
}

// Use extended types
const page: Page = {
  path: '/example',
  title: 'Example',
  content: '<p>Content</p>',
  readingTime: 5,
  wordCount: 1000,
  seo: {
    keywords: ['example', 'stati'],
    noindex: false,
  },
};
```

Stati's comprehensive TypeScript support ensures type safety throughout your development process, providing excellent IntelliSense and catching errors at compile time. Use these types to build robust, maintainable static sites with confidence.
