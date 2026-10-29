# @stati/core

**The core engine powering Stati - a minimal, TypeScript-first static site generator that's fast to learn and even faster to build with.**

Built for developers who want modern tooling without the complexity. Write in Markdown, template with Eta, and deploy anywhere.

---

## Getting Started

### The Easy Way (Recommended)

If you're new to Stati, start with our scaffolding tool:

```bash
npx create-stati my-site

cd my-site
npm run dev
```

This creates a complete Stati project with sensible defaults, your choice of CSS framework, and everything configured for you.

### Using the Core Package Directly

For advanced users who want programmatic control or to integrate Stati into existing tooling:

```bash
npm install @stati/core
```

---

## Quick Example

Here's how simple it is to build a static site with Stati:

**1. Create a configuration file (`stati.config.js`):**

```javascript
import { defineConfig } from '@stati/core';

export default defineConfig({
  site: {
    title: 'My Site',
    baseUrl: 'https://example.com',
  },
});
```

**2. Add some content (`site/index.md`):**

```markdown
---
title: Welcome
---

# Hello Stati

This is my first page. It's just Markdown.
```

**3. Build or develop:**

```typescript
import { build, createDevServer, setEnv } from '@stati/core';

// Development with live reload
const server = await createDevServer({
  port: 3000,
  open: true,
});
await server.start();

// Or build for production (build() alone runs a development build unless NODE_ENV is production)
setEnv('production');
const stats = await build({
  clean: true,
});
```

Most projects use the `stati` command from [`@stati/cli`](https://www.npmjs.com/package/@stati/cli) instead (`stati dev`, `stati build`), which sets the environment for you.

Add `site/layout.eta` to shape the page; without one Stati writes a basic fallback page and warns.

---

## Why Choose @stati/core?

### For New Users

- **Zero Configuration Required** - Works out of the box with sensible defaults
- **Simple File Structure** - Markdown files automatically become pages
- **Live Reload Built-In** - See changes instantly during development
- **SEO Ready** - Automatic meta tags and structured data

### For Advanced Users

- **Programmatic API** - Full control over the build process
- **TypeScript-First** - Complete type safety for configuration
- **TypeScript Compilation** - Built-in esbuild for client-side TypeScript
- **Build Hooks** - Run code before and after the build and each rendered page
- **Smart Caching** - Incremental builds with intelligent invalidation

---

## Core Concepts

### How Stati Works

Stati uses a simple, file-based approach:

```text
my-site/
├── site/           # Your content (Markdown + templates)
│   ├── index.md    # Homepage → /
│   └── blog/
│       └── hello.md # Blog post → /blog/hello
├── public/         # Static assets (CSS, images)
└── stati.config.js # Configuration (optional)
```

**The workflow:**

1. Write content in Markdown with front matter
2. Stati processes it through templates
3. Static HTML is generated with smart caching
4. Deploy anywhere (Netlify, Vercel, GitHub Pages, etc.)

### Key Features

#### Markdown-First Content

Write naturally with front matter for metadata:

```markdown
---
title: My Post
description: A great article
date: 2024-01-15
tags: [tutorial, stati]
---

# My Post

Your content here...
```

#### Flexible Templating

Customize layouts with [Eta templates](https://eta.js.org):

```eta
<!DOCTYPE html>
<html>
  <head>
    <title><%= stati.page.title %></title>
  </head>
  <body>
    <%~ stati.content %>
  </body>
</html>
```

#### Incremental Static Generation (ISG)

Only rebuild what changed:

- Smart caching based on hashes of each page's content and templates, and of the collection and navigation data it reads
- Removal of pages that no longer exist, such as deleted posts and unused tag pages
- TTL-based refresh for dynamic content
- Tag-based invalidation for related content

```typescript
import { invalidate } from '@stati/core';

// Invalidate by tag
await invalidate('tag:blog');

// Invalidate by path
await invalidate('path:/posts');

// Invalidate pages rendered within the last 3 months
await invalidate('age:3months');
```

#### Collections, Pagination and Generated Pages

A folder with an `index.md` is a collection: templates read its pages as `stati.collection`, sorted by date and grouped by tag. `paginate: 10` in front matter splits a listing into `/blog`, `/blog/page/2` and so on (`stati.pagination`), and a `[tag].md` template becomes one page per tag (`stati.generated`). See [Collections and generated pages](https://stati.build/core-concepts/collections).

#### Built-In SEO

Stati injects SEO metadata into every page by default, with no `seo` block needed. Canonical and Open Graph URLs use `site.baseUrl`:

- Meta tags (title, description, keywords from front matter)
- Open Graph for social sharing, with `og:locale` from `site.defaultLocale`
- Twitter Cards, with `twitter:site` and `twitter:creator` from handles in the config
- Article tags (`og:type`, publish date, tags) on the pages `seo.articles` matches
- Structured data (JSON-LD) from `seo.structuredData` in front matter
- `noindex` on the 404 page, which also stays out of the sitemap, search index, RSS feeds, navigation and Open Graph cards

Enable sitemap and robots.txt with one config option.

---

## Configuration

Stati works with **zero configuration**, but you can customize every aspect when needed.

### Minimal Setup (Recommended for Beginners)

```javascript
import { defineConfig } from '@stati/core';

export default defineConfig({
  site: {
    title: 'My Stati Site',
    baseUrl: 'https://example.com',
  },
});
```

This is all you need! Stati automatically enables:

- **ISG caching** with 6-hour TTL
- **SEO auto-injection** for all pages
- **Markdown processing** with standard features

### Extended Configuration (Common Options)

Below are commonly used configuration options. This is **not a complete list** - see the [full configuration documentation](https://stati.build/configuration/file/) for all available options.

```javascript
import { defineConfig } from '@stati/core';

export default defineConfig({
  // Directory configuration
  srcDir: 'site',           // Content source (default: 'site')
  outDir: 'dist',           // Build output (default: 'dist')
  staticDir: 'public',      // Static assets (default: 'public')

  // Site metadata
  site: {
    title: 'My Stati Site',
    baseUrl: 'https://example.com',
    defaultLocale: 'en-US',
  },

  // Markdown processing
  markdown: {
    toc: true,                                      // TOC + heading anchors (default: true)
    plugins: [
      ['external-links', { externalTarget: '_blank' }], // External links in new tab
    ],
    configure: (md) => {
      // Configure MarkdownIt instance directly
      md.set({ breaks: true }); // Turn single line breaks into <br>
    },
  },

  // Template helpers, called as stati.helpers.formatDate()
  helpers: {
    formatDate: (date) => new Date(date).toLocaleDateString('en-US'),
  },

  // Incremental Static Generation (enabled by default)
  isg: {
    ttlSeconds: 86400,        // Cache TTL: 24 hours (default: 21600 / 6 hours)
    maxAgeCapDays: 30,        // Dated pages older than this stop rebuilding on TTL (default: 365)
    aging: [
      { untilDays: 7, ttlSeconds: 86400 },   // up to 7 days old: 1 day
      { untilDays: 30, ttlSeconds: 604800 }, // up to 30 days old: 1 week
    ],
  },

  // SEO configuration (auto-injection enabled by default)
  seo: {
    defaultAuthor: {
      name: 'John Doe',
      url: 'https://johndoe.com', // article:author on article pages
      twitter: '@johndoe',        // twitter:creator
    },
    twitter: { site: '@example' },          // twitter:site
    articles: { include: ['/blog/*'] },     // og:type article + article:* tags
    debug: false,             // Enable SEO debug logging
  },

  // Sitemap generation (opt-in)
  sitemap: {
    enabled: true,            // Generate sitemap.xml
    defaultPriority: 0.5,     // Default priority for pages
    defaultChangeFreq: 'monthly',
    excludePatterns: ['/draft/**', '/admin/**'], // Exclude patterns
    priorityRules: [
      { pattern: '/', priority: 1.0 },           // Homepage highest priority
      { pattern: '/blog/**', priority: 0.8 },    // Blog posts high priority
      { pattern: '/docs/**', priority: 0.7 },    // Documentation
    ],
  },

  // Robots.txt generation (opt-in)
  robots: {
    enabled: true,            // Generate robots.txt
    disallow: ['/admin/', '/draft/', '/private/'], // Paths to block
    crawlDelay: 10,           // Crawl delay in seconds
    sitemap: true,            // Auto-include sitemap URL
    customLines: [
      '# Custom directives',
      'User-agent: GPTBot',
      'Disallow: /',
    ],
  },

  // Development server
  dev: {
    port: 3000,
    host: 'localhost',
    open: false,
  },

  // Preview server
  preview: {
    port: 4000,
    host: 'localhost',
    open: false,
  },

  // Build lifecycle hooks
  hooks: {
    beforeAll: async (ctx) => {
      console.log(`Building ${ctx.pages.length} pages`);
    },
    beforeRender: async (ctx) => {
      // Custom pre-render logic
    },
    afterRender: async (ctx) => {
      // Custom post-render logic
    },
  },
});
```

> **For the complete configuration reference** including all options, advanced features, and detailed explanations, see the [Configuration Guide](https://stati.build/configuration/file/).

---

## API Reference

### Build Functions

#### `build(options?: BuildOptions): Promise<BuildResult>`

Build your static site. `build()` uses Stati's current environment, which is `NODE_ENV` or else `development`, unless you call `setEnv('production')` first (the `stati build` command does). Sitemap, robots.txt and RSS are only generated in production.

**Options:**

```typescript
{
  force?: boolean;        // Force rebuild of all pages (ignores cache)
  clean?: boolean;        // Delete the output directory and the .stati cache first
  includeDrafts?: boolean; // Include draft pages in build
  configPath?: string;    // Config file; only its directory is used to find stati.config.*
  metrics?: MetricsOptions; // Collect build metrics
  logger?: Logger;        // Custom logger for build output
  tailwind?: { input: string; output: string }; // As --tailwind-input/--tailwind-output; production builds run Tailwind
}
```

**Example:**

```typescript
import { build, setEnv } from '@stati/core';

setEnv('production');
const stats = await build({
  clean: true,
  force: false,
  includeDrafts: false,
});

console.log(`Built ${stats.totalPages} pages in ${stats.buildTimeMs}ms`);
```

**Returns:** Build statistics (`totalPages`, `assetsCount`, `buildTimeMs`, `outputSizeBytes`, `cacheHits`, `cacheMisses`), plus `buildMetrics` when metrics are enabled.

---

#### `createDevServer(options?: DevServerOptions): Promise<DevServer>`

Start a development server with live reload.

**Options:**

```typescript
{
  port?: number;          // Port number (default: 3000)
  host?: string;          // Host address (default: 'localhost')
  open?: boolean;         // Auto-open browser (default: false)
  logger?: Logger;        // Custom logger
  tailwind?: { input: string; output: string }; // Links the output; run Tailwind's watcher yourself (stati dev does)
}
```

The config is always loaded from the current working directory.

**Example:**

```typescript
import { createDevServer } from '@stati/core';

const server = await createDevServer({
  port: 3000,
  open: true,
});
await server.start();

console.log(`Dev server running at ${server.url}`);
```

**Returns:** A server object with `start()`, `stop()` and `url`. Nothing listens until you call `start()`.

---

#### `createPreviewServer(options?: PreviewServerOptions): Promise<PreviewServer>`

Start a production preview server to test your built site locally.

**Options:**

```typescript
{
  port?: number;          // Port number (default: 4000)
  host?: string;          // Host address (default: 'localhost')
  open?: boolean;         // Auto-open browser (default: false)
  logger?: Logger;        // Custom logger
}
```

The config (used to find the output directory) is always loaded from the current working directory.

**Example:**

```typescript
import { build, createPreviewServer, setEnv } from '@stati/core';

// First build your site
setEnv('production');
await build({ clean: true });

// Then preview it
const server = await createPreviewServer({
  port: 4000,
  open: true,
});
await server.start();

console.log(`Preview server running at ${server.url}`);
```

**Returns:** A server object with `start()`, `stop()` and `url`.

**Note:** Unlike `createDevServer`, the preview server serves the static files from your `dist/` directory without live reload or rebuilding. This is useful for testing your production build locally before deployment.

---

#### `invalidate(query?: string): Promise<InvalidationResult>`

Invalidate cache by tags, paths, patterns, or age.

**Query Syntax:**

- `tag:blog` - Invalidate pages with specific tag
- `path:/posts` - Invalidate cache entries whose key (output path, such as `/posts/hello.html`) starts with this prefix
- `glob:/blog/**` - Invalidate by glob pattern matched against the whole key
- `age:3months` - Invalidate pages rendered within the last 3 months
- No query - Invalidate every entry

**Examples:**

```typescript
import { invalidate } from '@stati/core';

// Invalidate by tag
await invalidate('tag:news');

// Invalidate by path prefix
await invalidate('path:/blog/2024/');

// Invalidate pages rendered within the last 6 months
await invalidate('age:6months');

// Multiple criteria (OR logic)
await invalidate('tag:blog age:1month');

// Invalidate everything
await invalidate();
```

**Returns:** Invalidation result with count of pages affected.

---

#### `defineConfig(config: StatiConfig): StatiConfig`

Define a type-safe configuration with full TypeScript support.

**Example:**

```typescript
import { defineConfig } from '@stati/core';

export default defineConfig({
  site: {
    title: 'My Site',
    baseUrl: 'https://example.com',
  },
  // TypeScript provides autocomplete and validation
});
```

---

#### `loadConfig(cwd?: string): Promise<StatiConfig>`

Load and validate Stati configuration from a project directory.

**Example:**

```typescript
import { loadConfig } from '@stati/core';

// Load from current directory
const config = await loadConfig();

// Load from specific directory
const config2 = await loadConfig('/path/to/project');
```

---

### TypeScript Types

Full type definitions for TypeScript users:

```typescript
import type {
  // Configuration
  StatiConfig,
  ISGConfig,
  BuildHooks,

  // Build
  BuildOptions,
  BuildResult,
  BuildContext,
  BuildStats,

  // Pages
  PageModel,
  PageContext,
  FrontMatter,
  TemplateContext,

  // Navigation
  NavNode,

  // Development
  DevServerOptions,
  PreviewServerOptions,

  // Cache
  InvalidationResult,
  AgingRule,
} from '@stati/core';

// Cache types are only exported from the types entry point
import type { CacheManifest } from '@stati/core/types';
```

> **Need more types?** This is a curated list of commonly used types. For the complete type reference including all SEO, sitemap, and configuration types, see the [API Types Documentation](https://stati.build/api/types/).

---

## Features Deep Dive

### Markdown Processing

Stati supports rich Markdown features out of the box:

- **Front matter** - YAML (default) or JSON (`---json`) metadata
- **Plugins** - Any markdown-it plugin that supports markdown-it 15
- **Syntax highlighting** - Code blocks get `language-*` classes; add a plugin such as `markdown-it-prism` to highlight them
- **Custom rendering** - Configure parser behavior
- **Draft mode** - Mark pages as `draft: true`

**Example with plugins:**

```javascript
export default defineConfig({
  markdown: {
    toc: true,                     // TOC + heading anchors (built-in, default: true)
    plugins: [
      'footnote',                  // Footnote support
      ['abbr', { /* options */ }], // Abbreviations
    ],
  },
});
```

Install each plugin first, such as `npm install markdown-it-footnote`; Stati loads `markdown-it-<name>` from your project.

### Template Engine

Powered by [Eta](https://eta.js.org) for fast, flexible templates:

- **Layouts** - Chosen by folder or front matter, sharing one page shell through `stati.layout()`
- **Includes** - Reusable templates with props and a body through `stati.include()`
- **Helpers** - Your own functions, called as `stati.helpers.name()`
- **Typed context** - The `TemplateContext` type describes everything templates can read
- **Live reload** - The browser reloads when a template changes

**Template structure:**

```eta
<!-- site/layout.eta -->
<!DOCTYPE html>
<html>
  <head>
    <title><%= stati.page.title %> - <%= stati.site.title %></title>
  </head>
  <body>
    <%~ stati.include('partials/header') %>
    <main>
      <%~ stati.content %>
    </main>
    <%~ stati.include('partials/footer') %>
  </body>
</html>
```

### Navigation System

Automatic navigation hierarchy based on your file structure:

- **Auto-generated tree** - Built from your folders (each folder of pages is a top-level node)
- **Breadcrumbs** - Parent-child relationships
- **Custom ordering** - Use `order` in front matter
- **Index pages** - Special handling for `index.md`

**Access in templates:**

```eta
<!-- Show breadcrumbs -->
<nav>
  <% stati.nav.getBreadcrumbs().forEach(crumb => { %>
    <a href="<%= stati.url(crumb.url) %>"><%= crumb.title %></a>
  <% }) %>
</nav>

<!-- Show navigation tree -->
<ul>
  <% stati.nav.tree.forEach(item => { %>
    <li><a href="<%= stati.url(item.url) %>"><%= item.title %></a></li>
  <% }) %>
</ul>
```

### Development Experience

Built for productivity:

- **Live reload** - WebSocket-based instant updates
- **Fast rebuilds** - Only rebuild changed pages
- **Error overlay** - See build errors in browser
- **Static assets** - Served from `public/` directory
- **Source maps** - Debug with original code

---

## Use Cases

### Documentation Sites

Perfect for technical documentation:

```javascript
export default defineConfig({
  site: {
    title: 'My Project Docs',
    baseUrl: 'https://docs.example.com',
  },
  markdown: {
    // TOC and heading anchors are built-in (enabled by default)
    plugins: ['container', 'footnote'],
  },
});
```

### Blogs

Great for content-heavy sites:

```javascript
export default defineConfig({
  site: {
    title: 'My Blog',
    baseUrl: 'https://blog.example.com',
  },
  isg: {
    aging: [
      { untilDays: 30, ttlSeconds: 3600 },   // up to 30 days old: 1 hour
      { untilDays: 365, ttlSeconds: 86400 }, // up to a year old: 1 day
    ],
  },
});
```

### Landing Pages

Fast, SEO-optimized marketing sites:

```javascript
export default defineConfig({
  site: {
    title: 'Product Name',
    baseUrl: 'https://example.com',
  },
  seo: {
    defaultAuthor: {
      name: 'Company Name',
      url: 'https://example.com',
    },
  },
});
```

---

## Requirements

- **Node.js** ^22.20.0 || >=24
- **A package manager**: npm, pnpm, yarn or bun

---

## Learn More

- [**Full Documentation**](https://stati.build) - Complete guides and tutorials
- [**Configuration Guide**](https://stati.build/configuration/file/) - All options explained
- [**API Reference**](https://stati.build/api/reference/) - Detailed API docs
- [**Examples**](https://stati.build/examples/list/) - Real-world projects
- [**Contributing**](https://github.com/ianchak/stati/blob/main/CONTRIBUTING.md) - Help improve Stati

---

## Support & Community

- [GitHub Issues](https://github.com/ianchak/stati/issues) - Report bugs or request features
- [Discussions](https://github.com/ianchak/stati/discussions) - Ask questions, share ideas

---

## License

MIT © [Imre Csige](https://github.com/ianchak)

