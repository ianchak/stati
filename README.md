# Stati

**A feature-packed, TypeScript-first static site generator that's fast to learn and even faster to build with.**

Built for developers who want modern tooling without the complexity. Write in Markdown, template with Eta, and deploy anywhere.

[![Build](https://github.com/ianchak/stati/actions/workflows/ci.yml/badge.svg)](https://github.com/ianchak/stati/actions/workflows/ci.yml)
[![Coverage](https://codecov.io/github/ianchak/stati/graph/badge.svg?token=V3DWFQ2W7E)](https://codecov.io/github/ianchak/stati)
[![npm version](https://img.shields.io/npm/v/@stati/core.svg)](https://www.npmjs.com/package/@stati/core)
[![DeepScan grade](https://deepscan.io/api/teams/28348/projects/30556/branches/982395/badge/grade.svg)](https://deepscan.io/dashboard#view=project&tid=28348&pid=30556&bid=982395)
[![Downloads](https://img.shields.io/npm/dm/@stati/core.svg)](https://npmjs.com/package/@stati/core)
[![License](https://img.shields.io/github/license/ianchak/stati.svg)](LICENSE)
[![Docs](https://api.netlify.com/api/v1/badges/fa476271-ada2-4830-ac30-fcff95aeca03/deploy-status)](https://stati.build)

---

## Why Stati?

- **Fast Setup** - Create a site in under 2 minutes with `npx create-stati`
- **Simple by Design** - Markdown files become pages. No complex configuration required.
- **Smart Caching** - Incremental builds with intelligent cache invalidation
- **Your Choice of CSS** - Plain CSS, Sass, or Tailwind CSS
- **SEO Ready** - Automatic meta tags, Open Graph, and structured data

---

## Quick Start

```bash
# Create a new site
npx create-stati my-site

# Start building
cd my-site
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
│   └── about.md    # About page → /about
├── public/         # Static assets (CSS, images, fonts)
├── src/            # Client-side TypeScript (created by default; not with --no-typescript)
└── stati.config.js # Optional configuration (or .ts for TypeScript)
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
- `site/blog/hello.md` → `/blog/hello` (written to `dist/blog/hello.html`)
- `site/about.md` → `/about`

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

Customize layouts with [Eta templates](https://eta.js.org). Layouts share one page shell with `stati.layout()` and reuse other templates with `stati.include()`:

```html
<!-- site/base.eta -->
<!DOCTYPE html>
<html>
  <head>
    <title><%= stati.page.title %></title>
  </head>
  <body>
    <%~ stati.include('partials/header') %>
    <%~ stati.body %>
  </body>
</html>

<!-- site/layout.eta -->
<% stati.layout('base') %>
<main><%~ stati.content %></main>
```

### Incremental Static Generation (ISG)

Pages rebuild only when needed:
- **Smart caching** - Only changed pages rebuild, plus the listings that show them
- **Stale page cleanup** - Deleted posts and unused tag pages disappear from the output
- **TTL-based refresh** - Control how long pages stay cached
- **Tag-based invalidation** - Update related content together

```bash
# Invalidate by tag
stati invalidate "tag:news"

# Invalidate by path
stati invalidate "path:/blog/2024/"

# Invalidate by age
stati invalidate "age:3months"
```

### Collections, Pagination and Tag Pages

A folder with an `index.md` is a collection that templates read as `stati.collection`. Split a listing into pages and create one page per tag from front matter:

```markdown
---
# site/blog/index.md → /blog, /blog/page/2, …
paginate: 10
---
```

```markdown
---
# site/blog/tags/[tag].md → /blog/tags/css, /blog/tags/javascript, …
title: 'Posts tagged {tag}'
generate:
  from: tags
---
```

### Built-in SEO

SEO optimization works automatically with zero configuration. Stati analyzes your pages and injects SEO metadata during build.

**What's included by default:**
- Meta tags (title, description, keywords)
- Open Graph tags for Facebook/LinkedIn, with `og:locale` from `site.defaultLocale`
- Twitter Cards, with `twitter:site` and `twitter:creator` from handles in the config
- Article tags (`og:type`, publish date, tags) on the pages `seo.articles` matches
- Structured data (JSON-LD) when configured in frontmatter
- `noindex` on the 404 page, which also stays out of the sitemap, search index, RSS feeds, navigation and Open Graph cards

You can also enable sitemap and robots.txt generation with a single config option.

### CSS Your Way

Choose your styling approach during setup:

```bash
npx create-stati my-site --styling=tailwind
```

- **Plain CSS** - Simple and straightforward
- **Sass/SCSS** - CSS with superpowers
- **Tailwind CSS** - Utility-first framework

---

## CLI Commands

```bash
# Development
npm run dev              # Start dev server with live reload
npm run dev -- --port 8080 --open

# Production
npm run build            # Build site for production
npx stati build --clean --force  # Pass flags to stati directly

# Preview
npm run preview          # Test production build locally

# Cache Management
npx stati invalidate "tag:news"
npx stati invalidate "path:/blog/"
npx stati invalidate "age:6months"
```

---

## Configuration

Stati works with zero configuration, but you can customize it by creating `stati.config.js` (or `stati.config.ts` for TypeScript projects):

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
    toc: true, // TOC + heading anchors (default: true)
    plugins: [
      ['external-links', { externalTarget: '_blank' }], // Open external links in new tab
    ],
    configure: (md) => {
      // Configure MarkdownIt instance directly
    },
  },

  // Template helpers, called as stati.helpers.formatDate()
  helpers: {
    formatDate: (date) => new Date(date).toLocaleDateString('en-US'),
  },

  // Incremental Static Generation (enabled by default)
  isg: {
    ttlSeconds: 86400,        // Cache TTL: 24 hours (default: 21600 / 6 hours)
    maxAgeCapDays: 30,        // Max age for aging rules (default: 365)
    aging: [
      { untilDays: 7, ttlSeconds: 86400 },   // up to 7 days old: 1 day
      { untilDays: 30, ttlSeconds: 604800 }, // up to 30 days old (and older): 1 week
    ],
  },

  // SEO configuration (auto-injection enabled by default)
  seo: {
    defaultAuthor: {
      name: 'John Doe',
      email: 'john@example.com',
      url: 'https://johndoe.com', // article:author on article pages
      twitter: '@johndoe',        // twitter:creator
    },
    twitter: { site: '@example' },          // twitter:site
    articles: { include: ['/blog/*'] },     // og:type article + article:* tags
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
    open: false,              // Auto-open browser (default: false)
  },

  // TypeScript compilation (opt-in)
  typescript: {
    enabled: true,            // Enable TypeScript compilation
    srcDir: 'src',            // Source directory (default: 'src')
    // If bundles omitted, defaults to [{ entryPoint: 'main.ts', bundleName: 'main' }]
    // hash and minify are automatic based on build mode
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

[View full configuration options →](https://stati.build/configuration/file/)

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

- [**Getting Started**](https://stati.build/getting-started/introduction/) - Installation and first steps
- [**Core Concepts**](https://stati.build/core-concepts/overview/) - How Stati works
- [**Configuration**](https://stati.build/configuration/file/) - All configuration options
- [**SEO Guide**](https://stati.build/configuration/seo/) - Optimize for search engines
- [**ISG & Caching**](https://stati.build/configuration/isg/) - Smart rebuilds explained
- [**API Reference**](https://stati.build/api/reference/) - Complete API documentation

### AI agent skill

The portable [Stati skill](./.claude/skills/stati/SKILL.md) teaches agents the
site-building workflow, Stati-specific Eta/component rules, configuration, and
generated features. It includes detailed references, a working starter, and a
smoke test against an installed core package.

`create-stati --agent-skill` installs it in a new site. To add it to an existing
site, or update it, use the open [`skills` CLI](https://github.com/vercel-labs/skills):

```bash
# Add the skill (asks which agents; -a claude-code --copy -y skips the prompts)
npx skills add ianchak/stati --skill stati

# Check for an update, then update
npx skills check
npx skills update stati -p
```

Commit the `skills-lock.json` it writes, or `npx skills update` finds nothing
to update. An update replaces the whole folder, so keep project rules in
`CLAUDE.md` or `AGENTS.md`, not in the skill. `.claude/skills/stati/` serves
both Claude Code and Copilot in VS Code; `-a universal` installs to
`.agents/skills/stati/` for Copilot, Codex, Cursor and other agents. The CLI
needs Node.js 22.20 or later, `git` and network access, and sends anonymous
usage data unless `DISABLE_TELEMETRY=1` or `DO_NOT_TRACK=1` is set. See the
[scaffolder docs](https://stati.build/cli/scaffolder/#agent-skill) for details
and [installation and discovery](./.claude/skills/stati/references/installation.md)
for verification and explicit `/stati` invocation. Automatic discovery does not
guarantee automatic use on every request. See the
[resource directory](./.claude/skills/stati/references/resources.md) for official
documentation links, version provenance, and source-verified caveats.

---

## Project Structure

This is a monorepo containing:

```
packages/
├── @stati/core       # Core static site generator engine
├── @stati/cli        # Command-line interface
├── @stati/images     # Optional: responsive images and Open Graph cards
└── create-stati      # Project scaffolding tool
```

Each package can be used independently or together for the complete Stati experience.

---

## Requirements

- **Node.js** 22.12.0 or higher on the 22.x line, or 24 and later
- **A package manager**: npm, pnpm, yarn or bun

Contributing to this repository needs Node.js 22.13.0+ or 24+ and npm 11.5.1+ (see [Contributing](#contributing)).

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

- **Simplicity over complexity** - Only include what you need
- **Speed by default** - Fast builds, fast development, fast sites
- **TypeScript-first** - Type safety throughout
- **Developer experience** - Great tooling makes great sites
- **Safe defaults** - Sensible choices that just work

---

## License

MIT © [Imre Csige](https://github.com/ianchak)

---

## Quick Links

- [Documentation](https://stati.build)
- [Examples](https://stati.build/examples/list/)
- [GitHub Issues](https://github.com/ianchak/stati/issues)
- [Discussions](https://github.com/ianchak/stati/discussions)

**Ready to build something?**

```bash
npx create-stati my-awesome-site
```
