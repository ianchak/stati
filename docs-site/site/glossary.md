---
title: 'Glossary'
description: 'Definitions of key terms and concepts used in Stati documentation.'
order: 98
---

# Stati Glossary

Key terms and concepts used throughout Stati documentation.

## Filesystem-based Routing

Stati maps your directory structure in `site/` directly to URL paths. A file at `site/docs/intro.md` becomes `/docs/intro/`.

## Incremental Static Generation (ISG)

A build optimization that caches rendered pages and only rebuilds when content changes or TTL expires. Configured via `isg` in `stati.config.ts`.

## Eta Templates

Stati's templating engine. Eta files (`.eta`) support layouts, partials, filters, and embedded JavaScript. The main layout is typically `layout.eta`.

## Layout

A reusable template wrapper that provides consistent structure (header, footer, navigation). Pages specify their layout via frontmatter: `layout: layout.eta`.

## Partials

Reusable template fragments stored in underscore-prefixed directories (e.g., `_partials/`, `_components/`). Include them via `stati.partials.header`. Stati uses a **flat namespace** for partials — the file name becomes the partial name regardless of subdirectory.

## Callable Partials

An advanced partial usage pattern that allows passing data to partials like function arguments. Instead of just `<%~ stati.partials.header %>`, you can call:

```eta
<%~ stati.partials.card({ title: 'Hello', featured: true }) %>
```

Data is accessed inside the partial via `stati.props`. Callable partials enable component-like reusability where the same partial renders different content based on props.

**Examples:**

- Simple: `<%~ stati.partials.header %>`
- With props: `<%~ stati.partials.card({ title: 'My Card', url: '/page' }) %>`
- In loops: `<% posts.forEach(post => { %> <%~ stati.partials.card({ title: post.title }) %> <% }) %>`

**Inside the partial:**

```eta
<div class="card">
  <h2><%= stati.props.title %></h2>
  <% if (stati.props.featured) { %>
    <span class="badge">Featured</span>
  <% } %>
</div>
```

## Frontmatter

YAML metadata at the top of Markdown files. Controls title, description, layout, order, and SEO settings.

## Template Context (`stati`)

The object passed to every Eta template containing:

- `stati.site` – Site configuration
- `stati.page` – Current page data and frontmatter
- `stati.content` – Rendered HTML content
- `stati.navigation` – Site navigation tree
- `stati.partials` – Rendered partial markup

## SEO Metadata

Automatically generated HTML tags for search engines and social sharing. Includes title, description, canonical, Open Graph, Twitter Cards, and JSON-LD structured data.

## `stati.config.ts`

The TypeScript configuration file at your project root. Defines site metadata, Markdown plugins, Eta filters, ISG settings, and build hooks.

## `defineConfig`

A helper function from `@stati/core` that provides type-safe configuration. Wraps your Stati config object for IntelliSense and type checking.

## Build Hooks

Extension points (`beforeAll`, `afterAll`, `beforeRender`, `afterRender`) that let you inject custom logic at various stages of the build process.

## esbuild

The underlying JavaScript bundler that powers Stati's TypeScript compilation. Provides near-instant build times for client-side code.

## Development Server

Stati's local server (`stati dev`) with hot reload, file watching, and incremental builds for efficient development.

## TTL (Time To Live)

The duration in seconds that cached content remains valid before requiring a rebuild. Configured via `isg.ttlSeconds`.

## Cache Invalidation

The process of marking cached entries as stale using `stati invalidate` with patterns like `tag:`, `path:`, `glob:`, or `age:`.

## Draft

A page marked with `draft: true` in frontmatter, excluded from production builds unless `--include-drafts` is used.

## Collection

A group of pages in a directory, often with shared layout and navigation (e.g., blog posts, documentation sections).

## Eta Filters

Custom functions registered in `stati.config.ts` under `eta.filters` that transform values in templates (e.g., date formatting, slugify).

## `stati.nav`

The navigation helper object available in templates with methods like `getTree()`, `findNode()`, `getChildren()`, and `getParent()`.

## NavNode

A navigation tree node containing `title`, `url`, `path`, `order`, `children`, and `isCollection` properties.

## Sitemap

An XML file listing all site URLs with metadata, auto-generated during production builds when `sitemap.enabled` is true.

## RSS Feed

An XML file for content syndication, configured via `rss.feeds` with content patterns, filters, and item mapping.

## Scaffolder (`create-stati`)

The interactive CLI tool that creates new Stati projects with styling options, TypeScript support, and Git initialization.

## Related Resources

- [FAQ](/faq/) – Frequently asked questions about Stati
- [Core Concepts](/core-concepts/overview/) – Deep dive into Stati's architecture
