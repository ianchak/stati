---
title: 'Template API'
description: 'Complete API reference for Stati template helpers, configuration options, and programmatic interface.'
order: 1
---

# API Reference

Stati provides a comprehensive API for templates, configuration, and programmatic usage. This reference documents all available interfaces, functions, and options.

## Template API

### Template Context (`it`)

Every Eta template receives a `TemplateContext` object with site metadata, front matter, and rendered content:

```typescript
interface TemplateContext {
  site: SiteConfig;
  page: {
    path: string;
    url: string;
    content: string;
    title?: string;
    description?: string;
    [key: string]: unknown; // Front matter fields
  };
  content: string; // Rendered HTML content
  navigation: NavNode[];
  collection?: CollectionData; // Only for index pages
  partials: Record<string, string>; // Rendered partial markup
}

interface SiteConfig {
  title: string;
  baseUrl: string;
  defaultLocale?: string;
}
```

Front matter values are exposed through `stati.page`. Additional properties you place on `site` in `stati.config.ts` are available at runtime, but the public type includes the three fields above by default.

### Stati Configuration Structure

```typescript
import type MarkdownIt from 'markdown-it';

interface StatiConfig {
  srcDir?: string;
  outDir?: string;
  staticDir?: string;
  site: SiteConfig;
  markdown?: {
    plugins?: (string | [string, unknown])[];
    configure?: (md: MarkdownIt) => void;
  };
  eta?: {
    filters?: Record<string, (value: unknown) => unknown>;
  };
  isg?: ISGConfig;
  dev?: {
    port?: number;
    host?: string;
    open?: boolean;
  };
  hooks?: BuildHooks;
}

interface SiteConfig {
  title: string;
  baseUrl: string;
  defaultLocale?: string;
}
```

At runtime Stati preserves any additional keys you place under `site`, so you can augment the type locally if you need editor support for custom metadata.

### Markdown Options

```typescript
interface MarkdownConfig {
  plugins?: (string | [string, unknown])[];
  configure?: (md: MarkdownIt) => void;
}
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
<p class="excerpt"><%= truncate(stati.page.description as string) %></p>

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
<meta name="description" content="<%= truncate(stripHtml(stati.content), 160) %>">
```

### Partial Templates

```eta
<!-- Include partials -->
<%~ stati.partials.header %>
<%~ stati.partials.footer %>
<%~ stati.partials.navigation %>

<!-- Conditional partials -->
<% if (stati.partials.sidebar) { %>
  <%~ stati.partials.sidebar %>
<% } %>

<!-- Partials with data -->
<%~ stati.partials.postMeta %>
<%~ stati.partials.tagList %>
<%~ stati.partials.shareButtons %>
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
  enabled?: boolean;
  ttlSeconds?: number;
  maxAgeCapDays?: number;
  aging?: AgingRule[];
}

interface AgingRule {
  untilDays: number;
  ttlSeconds: number;
}
```

### Eta Configuration

```typescript
interface EtaConfig {
  filters?: Record<string, (value: unknown) => unknown>;
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
import type { BuildHooks } from '@stati/core';

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
      // Modify page front matter before rendering
      ctx.page.frontMatter.buildTime = new Date().toISOString();
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
const config = await loadConfig();
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
const cleared = await invalidate();

// Invalidate by tag
const tagResult = await invalidate('tag:blog');

// Invalidate by path prefix
const pathResult = await invalidate('path:/blog/');

// Invalidate entries rendered within the last 3 months (exact calendar arithmetic)
const recentResult = await invalidate('age:3months');

// Invalidate using a glob pattern
const globResult = await invalidate('glob:blog/**');

console.log(`Invalidated ${tagResult.invalidatedCount} cache entries`);
console.log(tagResult.invalidatedPaths);

// Result objects share the shape: { invalidatedCount, invalidatedPaths, clearedAll }
```

## Error Handling

Stati throws regular `Error` instances with descriptive messages. Wrap build steps in `try/catch` blocks to surface problems in your own tooling, and rely on the CLI for formatted logs and, during development, the in-browser overlay.

```typescript
try {
  await build();
} catch (error) {
  if (error instanceof Error) {
    console.error('Build failed:', error.message);
  }
  throw error;
}
```

### Handling Errors in Hooks

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

### Typed Hooks and Context

```typescript
import type { BuildContext, BuildHooks, PageContext } from '@stati/core';

const hooks: BuildHooks = {
  beforeAll: (ctx: BuildContext) => {
    console.log(`Building ${ctx.pages.length} pages`);
  },
  beforeRender: ({ page }: PageContext) => {
    page.frontMatter.generatedAt = new Date().toISOString();
  },
};
```

### Template Helpers with `defineConfig`

```typescript
import { defineConfig } from '@stati/core';

const hooks: BuildHooks = {
  beforeAll: (ctx) => {
    console.log(`Building ${ctx.pages.length} pages`);
  },
};

export default defineConfig({
  eta: {
    filters: {
      formatDate: (value: string | Date, locale = 'en-US') =>
        new Intl.DateTimeFormat(locale).format(new Date(value)),
    },
  },
  hooks,
});
```

This API reference covers all the major interfaces and functions available in Stati. For implementation examples and practical usage, refer to the [Examples](/examples/list/) section or explore the specific configuration guides in the [Configuration](/configuration/file/) section.
