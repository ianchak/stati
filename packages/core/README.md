# @stati/core

**The core engine powering Stati — a minimal, TypeScript-first static site generator that's fast to learn and even faster to build with.**

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
import { build, createDevServer } from '@stati/core';

// Development with live reload
const server = await createDevServer({
  port: 3000,
  open: true,
});

// Or build for production
const stats = await build({
  clean: true,
});
```

That's it! Your site is ready.

---

## Why Choose @stati/core?

### For New Users

- **Zero Configuration Required** — Works out of the box with sensible defaults
- **Simple File Structure** — Markdown files automatically become pages
- **Live Reload Built-In** — See changes instantly during development
- **SEO Ready** — Automatic meta tags and structured data

### For Advanced Users

- **Programmatic API** — Full control over the build process
- **TypeScript-First** — Complete type safety throughout
- **Extensible Hooks** — Customize every stage of the build
- **Smart Caching** — Incremental builds with intelligent invalidation

---

## Core Concepts

### How Stati Works

Stati uses a simple, file-based approach:

```text
my-site/
├── site/           # Your content (Markdown + templates)
│   ├── index.md    # Homepage → /
│   └── blog/
│       └── hello.md # Blog post → /blog/hello/
├── public/         # Static assets (CSS, images)
└── stati.config.js # Configuration (optional)
```

**The workflow:**

1. Write content in Markdown with front-matter
2. Stati processes it through templates
3. Static HTML is generated with smart caching
4. Deploy anywhere (Netlify, Vercel, GitHub Pages, etc.)

### Key Features

#### Markdown-First Content

Write naturally with front-matter for metadata:

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

```html
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

- Smart caching based on file modification times
- TTL-based refresh for dynamic content
- Tag-based invalidation for related content

```typescript
import { invalidate } from '@stati/core';

// Invalidate by tag
await invalidate('tag:blog');

// Invalidate by path
await invalidate('path:/posts');

// Invalidate old content (3+ months)
await invalidate('age:3months');
```

#### Built-In SEO

SEO optimization works automatically with zero configuration:

- Meta tags (title, description, keywords)
- Open Graph for social sharing
- Twitter Cards
- Structured data (JSON-LD)

Enable sitemap and robots.txt with one config option.

---

## Complete Configuration Reference

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

Below are commonly used configuration options. This is **not a complete list** — see the [full configuration documentation](https://docs.stati.build/configuration/) for all available options.

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
    plugins: [
      'anchor',                                      // Anchor links to headings
      'toc-done-right',                             // Table of contents
      ['external-links', { externalTarget: '_blank' }], // External links in new tab
    ],
    configure: (md) => {
      // Configure MarkdownIt instance directly
      md.set({
        html: true,
        linkify: true,
        typographer: true,
      });
    },
  },

  // Eta template engine
  eta: {
    filters: {
      formatDate: (date) => new Date(date).toLocaleDateString('en-US'),
      slugify: (text) => text.toLowerCase().replace(/\s+/g, '-'),
    },
  },

  // Incremental Static Generation (enabled by default)
  isg: {
    ttlSeconds: 86400,        // Cache TTL: 24 hours (default: 21600 / 6 hours)
    maxAgeCapDays: 30,        // Max age for aging rules (default: 365)
    aging: [
      { untilDays: 7, ttlSeconds: 86400 },   // 1 day cache for week-old content
      { untilDays: 30, ttlSeconds: 604800 }, // 1 week cache for month-old content
    ],
  },

  // SEO configuration (auto-injection enabled by default)
  seo: {
    defaultAuthor: {
      name: 'John Doe',
      email: 'john@example.com',
      url: 'https://johndoe.com',
    },
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

> **For the complete configuration reference** including all options, advanced features, and detailed explanations, see the [Configuration Guide](https://docs.stati.build/configuration/file/).

---

## API Reference

### Build Functions

#### `build(options?: BuildOptions): Promise<BuildStats>`

Build your static site for production.

**Options:**

```typescript
{
  force?: boolean;        // Force rebuild of all pages (ignores cache)
  clean?: boolean;        // Clean output directory before build
  includeDrafts?: boolean; // Include draft pages in build
  configPath?: string;    // Custom config file path
}
```

**Example:**

```typescript
import { build } from '@stati/core';

const stats = await build({
  clean: true,
  force: false,
  includeDrafts: false,
});

console.log(`Built ${stats.totalPages} pages in ${stats.buildTimeMs}ms`);
```

**Returns:** Build statistics including pages built, duration, and cache hits.

---

#### `createDevServer(options?: DevServerOptions): Promise<DevServer>`

Start a development server with live reload.

**Options:**

```typescript
{
  port?: number;          // Port number (default: 3000)
  host?: string;          // Host address (default: 'localhost')
  open?: boolean;         // Auto-open browser (default: false)
  configPath?: string;    // Custom config file path
}
```

**Example:**

```typescript
import { createDevServer } from '@stati/core';

const server = await createDevServer({
  port: 3000,
  open: true,
});

console.log(`Dev server running at http://localhost:3000`);
```

**Returns:** Server instance with methods to stop and restart.

---

#### `createPreviewServer(options?: PreviewServerOptions): Promise<PreviewServer>`

Start a production preview server to test your built site locally.

**Options:**

```typescript
{
  port?: number;          // Port number (default: 4000)
  host?: string;          // Host address (default: 'localhost')
  open?: boolean;         // Auto-open browser (default: false)
  configPath?: string;    // Custom config file path
}
```

**Example:**

```typescript
import { createPreviewServer } from '@stati/core';

// First build your site
await build({ clean: true });

// Then preview it
const server = await createPreviewServer({
  port: 4000,
  open: true,
});

console.log(`Preview server running at http://localhost:4000`);
```

**Returns:** Server instance with methods to stop.

**Note:** Unlike `createDevServer`, the preview server serves the static files from your `dist/` directory without live reload or rebuilding. This is useful for testing your production build locally before deployment.

---

#### `invalidate(query?: string): Promise<InvalidationResult>`

Invalidate cache by tags, paths, patterns, or age.

**Query Syntax:**

- `tag:blog` — Invalidate pages with specific tag
- `path:/posts` — Invalidate pages under path
- `glob:/blog/**` — Invalidate by glob pattern
- `age:3months` — Invalidate content younger than 3 months
- No query — Clear entire cache

**Examples:**

```typescript
import { invalidate } from '@stati/core';

// Invalidate by tag
await invalidate('tag:news');

// Invalidate by path prefix
await invalidate('path:/blog/2024/');

// Invalidate old content
await invalidate('age:6months');

// Multiple criteria (OR logic)
await invalidate('tag:blog age:1month');

// Clear everything
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
  BuildContext,
  BuildStats,

  // Pages
  PageModel,
  PageContext,
  FrontMatter,

  // Navigation
  NavNode,

  // Development
  DevServerOptions,
  PreviewServerOptions,

  // Cache
  InvalidationResult,
  AgingRule,
} from '@stati/core/types';
```

> **Need more types?** This is a curated list of commonly used types. For the complete type reference including all SEO, sitemap, and configuration types, see the [API Types Documentation](https://docs.stati.build/api/types/).

---

## Features Deep Dive

### Markdown Processing

Stati supports rich Markdown features out of the box:

- **Front-matter** — YAML, TOML, or JSON metadata
- **Plugins** — Full markdown-it ecosystem compatibility
- **Syntax highlighting** — Code blocks with language support
- **Custom rendering** — Configure parser behavior
- **Draft mode** — Mark pages as `draft: true`

**Example with plugins:**

```javascript
export default defineConfig({
  markdown: {
    plugins: [
      'anchor',                    // Add anchor links
      'table',                     // Enhanced tables
      'footnote',                  // Footnote support
      ['abbr', { /* options */ }], // Abbreviations
    ],
  },
});
```

### Template Engine

Powered by [Eta](https://eta.js.org) for fast, flexible templates:

- **Layouts** — Template inheritance via `layout` property
- **Partials** — Reusable components
- **Custom filters** — Transform data in templates
- **Type-safe helpers** — Access page data with autocomplete
- **Hot reload** — See template changes instantly

**Template structure:**

```html
<!-- site/layout.eta -->
<!DOCTYPE html>
<html>
  <head>
    <title><%= stati.page.title %> - <%= stati.site.title %></title>
  </head>
  <body>
    <%~ include('_partials/header') %>
    <main>
      <%~ stati.content %>
    </main>
    <%~ include('_partials/footer') %>
  </body>
</html>
```

### Navigation System

Automatic navigation hierarchy based on your file structure:

- **Auto-generated tree** — Reflects directory structure
- **Breadcrumbs** — Parent-child relationships
- **Custom ordering** — Use `order` in front-matter
- **Index pages** — Special handling for `index.md`

**Access in templates:**

```html
<!-- Show breadcrumbs -->
<nav>
  <% stati.nav.getBreadcrumbs().forEach(crumb => { %>
    <a href="<%= crumb.url %>"><%= crumb.title %></a>
  <% }) %>
</nav>

<!-- Show navigation tree -->
<ul>
  <% stati.nav.tree.forEach(item => { %>
    <li><a href="<%= item.url %>"><%= item.title %></a></li>
  <% }) %>
</ul>
```

### Development Experience

Built for productivity:

- **Live reload** — WebSocket-based instant updates
- **Fast rebuilds** — Only rebuild changed pages
- **Error overlay** — See build errors in browser
- **Static assets** — Served from `public/` directory
- **Source maps** — Debug with original code

### Caching & Performance

Smart caching for lightning-fast builds:

- **Modification tracking** — Rebuild only changed files
- **Incremental builds** — Skip unchanged pages
- **Tag invalidation** — Update related content together
- **TTL-based refresh** — Control cache lifetime
- **Age-based rules** — Different TTL for old content

**Cache strategies:**

```javascript
export default defineConfig({
  isg: {
    ttlSeconds: 21600,     // 6 hours default
    aging: [
      { untilDays: 7, ttlSeconds: 3600 },    // Recent: 1 hour
      { untilDays: 30, ttlSeconds: 86400 },  // Month: 1 day
      // Older content uses default TTL
    ],
  },
});
```

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
    plugins: ['anchor', 'toc-done-right', 'container'],
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
      { untilDays: 30, ttlSeconds: 3600 },   // Fresh posts: 1 hour
      { untilDays: 365, ttlSeconds: 86400 }, // Year-old: 1 day
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

- **Node.js** >=22
- **npm** 11.5.1 or higher (or equivalent package manager)

---

## Learn More

- [**Full Documentation**](https://docs.stati.build) — Complete guides and tutorials
- [**Configuration Guide**](https://docs.stati.build/configuration/file/) — All options explained
- [**API Reference**](https://docs.stati.build/api/reference/) — Detailed API docs
- [**Examples**](https://docs.stati.build/examples/list/) — Real-world projects
- [**Contributing**](https://github.com/ianchak/stati/blob/main/CONTRIBUTING.md) — Help improve Stati

---

## Philosophy

Stati Core is built on these principles:

- **Simplicity First** — Sensible defaults that just work
- **Performance Matters** — Fast builds, smart caching
- **Developer Experience** — Great tooling, clear errors
- **Type Safety** — TypeScript throughout
- **Extensibility** — Customize when you need to

---

## Support & Community

- [GitHub Issues](https://github.com/ianchak/stati/issues) — Report bugs or request features
- [Discussions](https://github.com/ianchak/stati/discussions) — Ask questions, share ideas
- [Documentation](https://docs.stati.build) — Comprehensive guides

---

## License

MIT © [Imre Csige](https://github.com/ianchak)

---

**Ready to build?**

```bash
# New project (easiest way)
npx create-stati my-site

# Or use core directly
npm install @stati/core
```

