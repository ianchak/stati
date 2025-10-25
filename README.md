# Stati

**A minimal, TypeScript-first static site generator that's fast to learn and even faster to build with.**

Built for developers who want modern tooling without the complexity. Write in Markdown, template with Eta, and deploy anywhere.

[![Build](https://github.com/ianchak/stati/actions/workflows/ci.yml/badge.svg)](https://github.com/ianchak/stati/actions/workflows/ci.yml)
[![Coverage](https://codecov.io/github/ianchak/stati/graph/badge.svg?token=V3DWFQ2W7E)](https://codecov.io/github/ianchak/stati)
[![npm version](https://img.shields.io/npm/v/@stati/core.svg)](https://www.npmjs.com/package/@stati/core)
[![Downloads](https://img.shields.io/npm/dm/@stati/core.svg)](https://npmjs.com/package/@stati/core)
[![License](https://img.shields.io/github/license/ianchak/stati.svg)](LICENSE)
[![Docs](https://api.netlify.com/api/v1/badges/fa476271-ada2-4830-ac30-fcff95aeca03/deploy-status)](https://docs.stati.build)

---

## Why Stati?

- **Fast Setup** — Create a site in under 2 minutes with `npx create-stati`
- **Simple by Design** — Markdown files become pages. No complex configuration required.
- **Smart Caching** — Incremental builds with intelligent cache invalidation
- **Your Choice of CSS** — Plain CSS, Sass, or Tailwind CSS
- **SEO Ready** — Automatic meta tags, Open Graph, and structured data

---

## Quick Start

```bash
# Create a new site
npx create-stati my-site

# Start building
cd my-site
npm install
npm run dev
```

Your site is now running at `http://localhost:3000` with live reload. Edit `site/index.md` to see changes instantly.

---

## How It Works

Stati uses a simple file-based structure:

```
my-site/
├── site/           # Your content (Markdown + templates)
│   ├── index.md    # Homepage
│   └── about.md    # About page → /about/
├── public/         # Static assets (CSS, images, fonts)
└── stati.config.js # Optional configuration
```

**Write content:**
```markdown
---
title: Welcome
---

# Hello Stati

This is my first page. It's just Markdown.
```

**Pages are automatically routed:**
- `site/index.md` → `/`
- `site/blog/hello.md` → `/blog/hello/`
- `site/about.md` → `/about/`

---

## Key Features

### Markdown-First

Write content in Markdown with front-matter for metadata:

```markdown
---
title: My Post
description: A great article
date: 2024-01-15
---

# My Post

Your content here...
```

### Flexible Templating

Customize layouts with [Eta templates](https://eta.js.org):

```html
<!-- site/layout.eta -->
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

### Incremental Static Generation (ISG)

Pages rebuild only when needed:
- **Smart caching** — Only changed pages rebuild
- **TTL-based refresh** — Control how long pages stay cached
- **Tag-based invalidation** — Update related content together

```bash
# Invalidate by tag
stati invalidate "tag:news"

# Invalidate by path
stati invalidate "path:/blog/2024/"

# Invalidate by age
stati invalidate "age:3months"
```

### Built-in SEO

SEO optimization works automatically with zero configuration. Stati analyzes your pages and injects SEO metadata during build.

**What's included by default:**
- Meta tags (title, description, keywords)
- Open Graph tags for Facebook/LinkedIn
- Twitter Cards
- Structured data (JSON-LD) when configured in frontmatter

You can also enable sitemap and robots.txt generation with a single config option.

### CSS Your Way

Choose your styling approach during setup:

```bash
npx create-stati my-site --styling=tailwind
```

- **Plain CSS** — Simple and straightforward
- **Sass/SCSS** — CSS with superpowers
- **Tailwind CSS** — Utility-first framework

---

## CLI Commands

```bash
# Development
npm run dev              # Start dev server with live reload
npm run dev -- --port 8080 --open

# Production
npm run build            # Build site for production
npm run build -- --clean --force

# Preview
npm run preview          # Test production build locally

# Cache Management
npx stati invalidate "tag:news"
npx stati invalidate "path:/blog/"
npx stati invalidate "age:6months"
```

---

## Configuration

Stati works with zero configuration, but you can customize it by creating `stati.config.js`:

### Minimal Configuration

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

### Extended Configuration

Customize behavior or enable optional features:

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
      'anchor',                                      // Add anchor links to headings
      'toc-done-right',                             // Table of contents
      ['external-links', { externalTarget: '_blank' }], // Open external links in new tab
    ],
    configure: (md) => {
      // Configure MarkdownIt instance directly
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
    enabled: true,
    defaultPriority: 0.5,
    defaultChangeFreq: 'monthly',
    excludePatterns: ['/draft/**', '/admin/**'],
    priorityRules: [
      { pattern: '/', priority: 1.0 },
      { pattern: '/blog/**', priority: 0.8 },
    ],
  },

  // Robots.txt generation (opt-in)
  robots: {
    enabled: true,
    disallow: ['/admin/', '/draft/'],
    sitemap: true,            // Auto-include sitemap URL
  },

  // Development server
  dev: {
    port: 3000,
    host: 'localhost',
    open: true,               // Auto-open browser
  },

  // Build lifecycle hooks
  hooks: {
    beforeAll: async (ctx) => {
      console.log(`Building ${ctx.pages.length} pages...`);
    },
    afterAll: async (ctx) => {
      console.log('Build complete!');
    },
  },
});
```

This extended configuration example covers the most common options. For a full list of available settings, see the documentation.

[View full configuration options →](https://docs.stati.build/configuration/file/)

---

## Examples

### Blog Post with SEO

```markdown
---
title: Getting Started with Stati
description: Learn how to build fast static sites
date: 2024-01-15
tags: [tutorial, stati]
seo:
  keywords: [static site generator, typescript, markdown]
  openGraph:
    image: /images/tutorial-cover.jpg
---

# Getting Started with Stati

Your content here...
```

### Custom Layout

```html
<!-- site/blog/layout.eta -->
<!DOCTYPE html>
<html>
  <head>
    <title><%= stati.page.title %> - My Blog</title>
  </head>
  <body>
    <article>
      <h1><%= stati.page.title %></h1>
      <time><%= stati.page.date %></time>
      <%~ stati.content %>
    </article>
  </body>
</html>
```

---

## Documentation

- [**Getting Started**](https://docs.stati.build/getting-started/introduction/) — Installation and first steps
- [**Core Concepts**](https://docs.stati.build/core-concepts/overview/) — How Stati works
- [**Configuration**](https://docs.stati.build/configuration/file/) — All configuration options
- [**SEO Guide**](https://docs.stati.build/configuration/seo/) — Optimize for search engines
- [**ISG & Caching**](https://docs.stati.build/configuration/isg/) — Smart rebuilds explained
- [**API Reference**](https://docs.stati.build/api/reference/) — Complete API documentation

---

## Project Structure

This is a monorepo containing:

```
packages/
├── @stati/core       # Core static site generator engine
├── @stati/cli        # Command-line interface
└── create-stati      # Project scaffolding tool
```

Each package can be used independently or together for the complete Stati experience.

---

## Requirements

- **Node.js** 22.0.0 or higher
- **npm** 11.5.1 or higher (or equivalent package manager)

---

## Contributing

We welcome contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md) for:
- Development setup
- Coding guidelines
- Testing requirements
- PR process

---

## Philosophy

Stati is built on these principles:

- **Simplicity over complexity** — Only include what you need
- **Speed by default** — Fast builds, fast development, fast sites
- **TypeScript-first** — Type safety throughout
- **Developer experience** — Great tooling makes great sites
- **Safe defaults** — Sensible choices that just work

---

## License

MIT © [Imre Csige](https://github.com/ianchak)

---

## Quick Links

- [Documentation](https://docs.stati.build)
- [Examples](https://docs.stati.build/examples/list/)
- [GitHub Issues](https://github.com/ianchak/stati/issues)
- [Discussions](https://github.com/ianchak/stati/discussions)

**Ready to build something?**

```bash
npx create-stati my-awesome-site
```
