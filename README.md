# Stati

**A TypeScript-first static site generator.** Write in Markdown, template with Eta, and rebuild only the pages that changed.

[![Build](https://github.com/ianchak/stati/actions/workflows/ci.yml/badge.svg)](https://github.com/ianchak/stati/actions/workflows/ci.yml)
[![Coverage](https://codecov.io/github/ianchak/stati/graph/badge.svg?token=V3DWFQ2W7E)](https://codecov.io/github/ianchak/stati)
[![npm version](https://img.shields.io/npm/v/@stati/core.svg)](https://www.npmjs.com/package/@stati/core)
[![DeepScan grade](https://deepscan.io/api/teams/28348/projects/30556/branches/982395/badge/grade.svg)](https://deepscan.io/dashboard#view=project&tid=28348&pid=30556&bid=982395)
[![Downloads](https://img.shields.io/npm/dm/@stati/core.svg)](https://npmjs.com/package/@stati/core)
[![License](https://img.shields.io/github/license/ianchak/stati.svg)](LICENSE)
[![Docs](https://api.netlify.com/api/v1/badges/fa476271-ada2-4830-ac30-fcff95aeca03/deploy-status)](https://stati.build)

---

## Why Stati?

- **Quick setup** - `npx create-stati` creates a site from a blank, blog, docs or news template
- **Markdown pages** - Files in `site/` become pages, with no configuration required
- **Incremental builds** - Only pages whose content, templates or data changed render again
- **Your choice of CSS** - Plain CSS, Sass or Tailwind CSS
- **SEO built in** - Meta, Open Graph and Twitter tags on every page; sitemap, robots.txt and RSS when you turn them on

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

Write content in Markdown with front matter for metadata:

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

```eta
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

# Invalidate pages rendered within the last 3 months
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

Stati injects SEO metadata into every page during the build, with no `seo` block needed. Canonical and Open Graph URLs use `site.baseUrl`.

**What's included by default:**
- Meta tags (title, description, keywords)
- Open Graph tags for Facebook/LinkedIn, with `og:locale` from `site.defaultLocale`
- Twitter Cards, with `twitter:site` and `twitter:creator` from handles in the config
- Article tags (`og:type`, publish date, tags) on the pages `seo.articles` matches
- Structured data (JSON-LD) when configured in front matter
- `noindex` on the 404 page, which also stays out of the sitemap, search index, RSS feeds, navigation and Open Graph cards

Set `sitemap.enabled` and `robots.enabled` to write `sitemap.xml` and `robots.txt` in production builds.

### CSS Your Way

Choose your styling approach during setup:

```bash
npx create-stati my-site --styling=tailwind
```

`--styling` takes `css` (the default), `sass` or `tailwind`.

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
```

---

## Configuration

Stati works with zero configuration, but you can customize it by creating `stati.config.js` (or `stati.config.ts` for TypeScript projects). Without a config file, `site.baseUrl` is `http://localhost:3000`, so canonical and Open Graph URLs point there:

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

With this config, ISG caching (6-hour TTL) and SEO tags on every page are on.

[View full configuration options →](https://stati.build/configuration/file/)

---

## Documentation

- [**Getting Started**](https://stati.build/getting-started/introduction/) - Installation and first steps
- [**Core Concepts**](https://stati.build/core-concepts/overview/) - How Stati works
- [**Configuration**](https://stati.build/configuration/file/) - All configuration options
- [**SEO Guide**](https://stati.build/configuration/seo/) - Optimize for search engines
- [**ISG & Caching**](https://stati.build/configuration/isg/) - Smart rebuilds explained
- [**API Reference**](https://stati.build/api/reference/) - Complete API documentation

### Context7

Stati's documentation is indexed by [Context7](https://context7.com), so MCP-enabled
AI assistants can pull current Stati docs into their context. The index is
configured by [`context7.json`](./context7.json) and covers the docs site and the
package READMEs. Add the Context7 MCP server to your assistant, then mention
`use context7` in a prompt or name the library, for example
`use library /ianchak/stati`.

### AI agent skill

The [Stati skill](./.claude/skills/stati/SKILL.md) teaches coding agents to build Stati sites: content, Eta templates, includes and helpers, configuration and the built-in features. `create-stati --agent-skill` installs it in a new site. To add or update it in an existing site:

```bash
npx skills@1 add ianchak/stati --skill stati -a claude-code --copy -y
npx skills@1 update stati -p
```

Commit the `skills-lock.json` the first command writes; the update reads it. See the [scaffolder docs](https://stati.build/cli/scaffolder/#agent-skill) for the install targets and [installation and discovery](./.claude/skills/stati/references/installation.md) for checking that the skill loads.

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

---

## Requirements

- **Node.js** 22.20.0 or higher on the 22.x line, or 24 and later
- **A package manager**: npm, pnpm, yarn or bun

Contributing to this repository needs Node.js 22.20.0+ or 24+ and npm 11.5.1+ (see [Contributing](#contributing)).

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the development setup, coding guidelines, tests and the pull request process.

---

## License

MIT © [Imre Csige](https://github.com/ianchak)

---

## Quick Links

- [Documentation](https://stati.build)
- [Examples](https://stati.build/examples/list/)
- [GitHub Issues](https://github.com/ianchak/stati/issues)
- [Discussions](https://github.com/ianchak/stati/discussions)
