---
title: 'API Reference'
description: 'Complete API reference for Stati template helpers, configuration options, and programmatic interface.'
---

# API Reference

Stati provides a comprehensive API for templates, configuration, and programmatic usage. This reference documents all available interfaces, functions, and options.

## Template API

### Page Context (`it`)

Every template receives a context object with page and site data:

```typescript
interface PageContext {
  // Page metadata
  title?: string;
  description?: string;
  date?: string;
  lastModified?: string;
  tags?: string[];
  author?: string;
  draft?: boolean;

  // Page content
  content: string; // Rendered HTML content
  excerpt?: string; // Auto-generated or manual excerpt
  rawContent: string; // Original markdown content

  // Page info
  url: string; // Page URL path
  path: string; // File system path
  layout?: string; // Layout name

  // Site context
  site: SiteConfig; // Site configuration

  // Template helpers
  partials: PartialMap; // Available partials
  renderMarkdown: (md: string) => string;
}
```

### Site Configuration Context

```typescript
interface SiteConfig {
  title: string;
  description?: string;
  baseUrl: string;
  defaultLocale?: string;

  // Custom metadata
  author?: string;
  social?: Record<string, string>;
  navigation?: NavigationItem[];

  // Any custom properties from config
  [key: string]: any;
}
```

### Template Helpers

#### Date Formatting

```eta
<!-- Basic date formatting -->
<time><%= new Date(it.date).toLocaleDateString() %></time>

<!-- Custom date formatting -->
<time datetime="<%= it.date %>">
  <%= new Date(it.date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }) %>
</time>

<!-- Relative time -->
<%
const now = new Date();
const postDate = new Date(it.date);
const diffTime = Math.abs(now - postDate);
const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
%>
<span class="relative-time">
  <% if (diffDays === 0) { %>Today<% }
     else if (diffDays === 1) { %>Yesterday<% }
     else if (diffDays < 7) { %><%= diffDays %> days ago<% }
     else { %><%= new Date(it.date).toLocaleDateString() %><% } %>
</span>
```

#### URL Helpers

```eta
<!-- Absolute URL generation -->
<link rel="canonical" href="<%= it.site.baseUrl + it.url %>">

<!-- Active navigation links -->
<%
function isActive(linkUrl, currentUrl) {
  if (linkUrl === '/') return currentUrl === '/';
  return currentUrl.startsWith(linkUrl);
}
%>
<a href="/blog/" class="<%= isActive('/blog/', it.url) ? 'active' : '' %>">
  Blog
</a>

<!-- Safe URL joining -->
<%
function joinUrl(base, path) {
  return base.replace(/\/$/, '') + '/' + path.replace(/^\//, '');
}
%>
<a href="<%= joinUrl(it.site.baseUrl, it.url) %>">Permalink</a>
```

#### Text Processing

```eta
<!-- Truncate text -->
<%
function truncate(text, length = 150) {
  if (!text || text.length <= length) return text;
  return text.slice(0, length).replace(/\s+\S*$/, '') + '...';
}
%>
<p class="excerpt"><%= truncate(it.description) %></p>

<!-- Slugify text -->
<%
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
%>
<a href="/tags/<%= slugify(tag) %>/" class="tag">#<%= tag %></a>

<!-- Strip HTML -->
<%
function stripHtml(html) {
  return html.replace(/<[^>]*>/g, '');
}
%>
<meta name="description" content="<%= truncate(stripHtml(it.content), 160) %>">
```

### Partial Templates

```eta
<!-- Include partials -->
<%~ it.partials.header %>
<%~ it.partials.footer %>
<%~ it.partials.navigation %>

<!-- Conditional partials -->
<% if (it.partials.sidebar) { %>
  <%~ it.partials.sidebar %>
<% } %>

<!-- Partials with data -->
<%~ it.partials.postMeta %>
<%~ it.partials.tagList %>
<%~ it.partials.shareButtons %>
```

## Configuration API

### Core Configuration Types

```typescript
interface StatiConfig {
  site: SiteConfig;
  markdown?: MarkdownConfig;
  templates?: TemplateConfig;
  isg?: ISGConfig;
  dev?: DevConfig;
  build?: BuildConfig;
  hooks?: HooksConfig;
  plugins?: Plugin[];
  vite?: ViteConfig;
}
```

### Site Configuration

```typescript
interface SiteConfig {
  title: string;
  description?: string;
  baseUrl: string;
  defaultLocale?: string;
  alternateLocales?: string[];
  author?: string;
  social?: Record<string, string>;
  navigation?: NavigationItem[];
  meta?: Record<string, any>;
}

interface NavigationItem {
  title: string;
  url: string;
  children?: NavigationItem[];
  external?: boolean;
}
```

### Markdown Configuration

```typescript
interface MarkdownConfig {
  options?: {
    html?: boolean;
    linkify?: boolean;
    typographer?: boolean;
    breaks?: boolean;
    xhtmlOut?: boolean;
  };
  plugins?: {
    anchor?: AnchorPluginOptions;
    toc?: TOCPluginOptions;
    footnote?: FootnotePluginOptions;
  };
  setup?: (md: MarkdownIt) => void;
}

interface AnchorPluginOptions {
  permalink?: boolean;
  permalinkBefore?: boolean;
  permalinkSymbol?: string;
  permalinkClass?: string;
}
```

### ISG Configuration

```typescript
interface ISGConfig {
  ttlSeconds?: number;
  maxAgeCapDays?: number;
  aging?: {
    enabled: boolean;
    schedule: AgingRule[];
    maxTtl?: string;
    minTtl?: string;
  };
  dependencies?: Record<string, string[]>;
  tags?: Record<string, string[]>;
  alwaysRebuild?: string[];
  storage?: StorageConfig;
}

interface AgingRule {
  age: string;
  ttl: string;
}
```

### Template Configuration

```typescript
interface TemplateConfig {
  eta?: {
    cache?: boolean;
    filters?: Record<string, Function>;
    helpers?: Record<string, Function>;
  };
}
```

## Build Hooks API

### Hook Types

```typescript
interface HooksConfig {
  beforeBuild?: (context: BuildContext) => Promise<void> | void;
  afterBuild?: (stats: BuildStats) => Promise<void> | void;
  beforeRender?: (page: PageData) => Promise<void> | void;
  afterRender?: (page: PageData, html: string) => Promise<void> | void;
}

interface BuildContext {
  pages: PageData[];
  config: StatiConfig;
  outputDir: string;
}

interface BuildStats {
  buildTime: number;
  pageCount: number;
  cacheHitRate: number;
  assetCount: number;
  totalSize: number;
}

interface PageData {
  title?: string;
  description?: string;
  date?: string;
  url: string;
  path: string;
  content: string;
  frontmatter: Record<string, any>;
}
```

### Hook Examples

```typescript
export default defineConfig({
  hooks: {
    async beforeBuild(context) {
      // Generate dynamic content
      const posts = context.pages.filter((p) => p.url.startsWith('/blog/'));
      await generateRSSFeed(posts);
      await generateSitemap(context.pages);
    },

    beforeRender(page) {
      // Add computed properties
      page.readingTime = calculateReadingTime(page.content);
      page.wordCount = countWords(page.content);
    },

    async afterBuild(stats) {
      console.log(`Built ${stats.pageCount} pages in ${stats.buildTime}ms`);

      // Post-build optimizations
      await optimizeImages();
      await generateSearchIndex();
    },
  },
});
```

## Plugin API

### Plugin Interface

```typescript
interface Plugin {
  name: string;
  setup: (stati: StatiAPI) => Promise<void> | void;
}

interface StatiAPI {
  addContentTransform: (pattern: string, transform: ContentTransform) => void;
  addPageHook: (hook: PageHook, handler: PageHookHandler) => void;
  addBuildHook: (hook: BuildHook, handler: BuildHookHandler) => void;
  addTemplateHelper: (name: string, helper: Function) => void;
}

type ContentTransform = (content: string, page: PageData) => Promise<string> | string;
type PageHookHandler = (page: PageData) => Promise<void> | void;
type BuildHookHandler = (context: BuildContext) => Promise<void> | void;
```

### Creating Plugins

```typescript
// Custom plugin example
export function customPlugin(options: CustomPluginOptions = {}): Plugin {
  return {
    name: 'custom-plugin',

    setup(stati) {
      // Add content transformation
      stati.addContentTransform('*.md', async (content, page) => {
        // Transform markdown content
        return processCustomSyntax(content, options);
      });

      // Add page hook
      stati.addPageHook('beforeRender', (page) => {
        // Modify page data
        page.customProperty = generateCustomData(page, options);
      });

      // Add template helpers
      stati.addTemplateHelper('customHelper', (input) => {
        return processInput(input, options);
      });
    },
  };
}
```

## CLI API

### Programmatic Usage

```typescript
import { build, dev, invalidate } from '@stati/core';
import type { StatiConfig } from '@stati/core/types';

// Programmatic build
const config: StatiConfig = {
  site: {
    title: 'My Site',
    baseUrl: 'https://example.com',
  },
};

const result = await build(config, {
  outputDir: 'dist',
  clean: true,
  verbose: true,
});

console.log(`Built ${result.pageCount} pages in ${result.buildTime}ms`);
```

### Cache Management

```typescript
import { CacheManager } from '@stati/core/cache';

const cache = new CacheManager({
  cacheDir: '.stati/cache',
  ttlSeconds: 3600,
});

// Get cache statistics
const stats = await cache.getStats();
console.log(`Cache hit rate: ${stats.hitRate}%`);

// Invalidate by pattern
await cache.invalidate('path:/blog/');
await cache.invalidate('tag:navigation');
await cache.invalidate('age:7d');

// Clean orphaned entries
await cache.clean();

// Reset all cache
await cache.reset();
```

## Error Handling

### Error Types

```typescript
class StatiError extends Error {
  constructor(
    message: string,
    public code: string,
    public category: 'config' | 'template' | 'markdown' | 'build' | 'cache',
  ) {
    super(message);
    this.name = 'StatiError';
  }
}

// Specific error types
class ConfigError extends StatiError {
  constructor(
    message: string,
    public path?: string,
  ) {
    super(message, 'CONFIG_ERROR', 'config');
  }
}

class TemplateError extends StatiError {
  constructor(
    message: string,
    public templatePath?: string,
  ) {
    super(message, 'TEMPLATE_ERROR', 'template');
  }
}
```

### Error Handling in Hooks

```typescript
export default defineConfig({
  hooks: {
    async beforeBuild(context) {
      try {
        await generateExternalData();
      } catch (error) {
        throw new StatiError('Failed to generate external data', 'EXTERNAL_DATA_ERROR', 'build');
      }
    },

    beforeRender(page) {
      try {
        page.customData = processPageData(page);
      } catch (error) {
        console.warn(`Failed to process ${page.path}:`, error.message);
        page.customData = null; // Graceful fallback
      }
    },
  },
});
```

## TypeScript Support

### Type Definitions

```typescript
// Import types for development
import type { StatiConfig, PageContext, BuildContext, Plugin } from '@stati/core/types';

// Extend base types
interface CustomPageContext extends PageContext {
  customProperty: string;
  computedValue: number;
}

// Custom plugin with types
export function typedPlugin(): Plugin {
  return {
    name: 'typed-plugin',
    setup(stati) {
      stati.addPageHook('beforeRender', (page: PageData) => {
        (page as CustomPageContext).customProperty = 'value';
      });
    },
  };
}
```

### Template Type Safety

```typescript
// stati.config.ts with full type safety
import { defineConfig } from '@stati/core';

export default defineConfig({
  templates: {
    eta: {
      helpers: {
        // Type-safe helper
        formatDate: (date: string | Date, locale = 'en-US'): string => {
          return new Intl.DateTimeFormat(locale).format(new Date(date));
        },
      },
    },
  },
});
```

This API reference covers all the major interfaces and functions available in Stati. For implementation examples and practical usage, refer to the [Examples](/examples/) section or explore the specific configuration guides in the [Configuration](/configuration/) section.
