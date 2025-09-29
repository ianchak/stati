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



## Environment & Utilities

### Environment Management

```typescript
import { setEnv, getEnv } from '@stati/core';

// Set environment for builds
setEnv('production'); // 'development' | 'production' | 'test'

// Get current environment
const env = getEnv(); // Returns current environment string
```

### Build Hooks

Stati provides lifecycle hooks for custom build logic:

```typescript
import { defineConfig } from '@stati/core';

export default defineConfig({
  hooks: {
    // Called before starting the build process
    beforeAll: async (ctx) => {
      console.log(`Building ${ctx.pages.length} pages`);
      // Setup logic, external data fetching, etc.
    },

    // Called after completing the build process
    afterAll: async (ctx) => {
      console.log(`Built ${ctx.pages.length} pages successfully`);
      // Post-build tasks, deployment preparation, etc.
    },

    // Called before rendering each individual page
    beforeRender: async (ctx) => {
      // Modify page data or context before rendering
      ctx.page.buildTime = new Date().toISOString();
    },

    // Called after rendering each individual page
    afterRender: async (ctx) => {
      // Post-process rendered HTML, analytics, etc.
      console.log(`Rendered: ${ctx.page.url}`);
    },
  },
});
```

**Available Hook Contexts:**

```typescript
interface BuildContext {
  config: StatiConfig;
  pages: PageModel[];
}

interface PageContext {
  page: PageModel;
  config: StatiConfig;
}
```

## CLI API

### Programmatic Usage

```typescript
import { build, createDevServer, createPreviewServer, invalidate, loadConfig } from '@stati/core';
import type { BuildOptions, DevServerOptions, PreviewServerOptions } from '@stati/core';

// Configuration Loading
const config = await loadConfig('./stati.config.js');
```

### Build Process

```typescript
// Programmatic build
const buildOptions: BuildOptions = {
  force: false,
  clean: true,
  includeDrafts: false,
  configPath: './stati.config.js',
};

await build(buildOptions);
```

### Development Server

```typescript
import { createDevServer } from '@stati/core';

const devServer = await createDevServer({
  port: 3000,
  host: 'localhost',
  open: true,
  configPath: './stati.config.js',
});

await devServer.start();
console.log(`Dev server running at ${devServer.url}`);

// Graceful shutdown
process.on('SIGINT', async () => {
  await devServer.stop();
});
```

### Preview Server

```typescript
import { createPreviewServer } from '@stati/core';

const previewServer = await createPreviewServer({
  port: 4000,
  host: 'localhost',
  open: false,
  configPath: './stati.config.js',
});

await previewServer.start();
console.log(`Preview server running at ${previewServer.url}`);
```

### Cache Management

```typescript
import { invalidate } from '@stati/core';

// Clear entire cache
const result = await invalidate();

// Invalidate by tag
const result = await invalidate('tag:blog');

// Invalidate by path pattern
const result = await invalidate('path:/blog/**');

// Invalidate by age
const result = await invalidate('age:3months');

console.log(`Invalidated ${result.invalidatedCount} cache entries`);

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
