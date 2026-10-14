---
title: 'Glossary'
description: 'Definitions of key terms and concepts used in Stati documentation.'
order: 98
seo:
  title: 'Stati glossary'
---

# Glossary

Key terms and concepts used throughout Stati documentation.

## Filesystem-based routing

Stati maps your directory structure in `site/` directly to URL paths. A file at `site/docs/intro.md` becomes `/docs/intro` (written to `dist/docs/intro.html`).

## Incremental Static Generation (ISG)

A build optimization that caches rendered pages and only rebuilds when content changes or TTL expires. Configured via `isg` in `stati.config.ts`.

## Eta templates

Stati's templating engine. Eta files (`.eta`) support layouts, partials, filters, and embedded JavaScript. The main layout is typically `layout.eta`.

## Layout

A reusable template wrapper that provides consistent structure (header, footer, navigation). Pages use the nearest `layout.eta`, or name one in front matter without the extension: `layout: layouts/post`.

## Layout inheritance

Stati's hierarchical layout system where more specific layouts **override** parent directory layouts. A `layout.eta` in a subdirectory completely replaces the root layout for pages in that directory. For example, `site/blog/layout.eta` overrides `site/layout.eta` for all pages under `/blog/`. Section layouts must be complete HTML documents.

## Partials

Reusable template fragments stored in underscore-prefixed directories (e.g., `_partials/`, `_components/`). Include them via `stati.partials.header`. Stati uses a **flat namespace** for partials - the file name becomes the partial name regardless of subdirectory.

## Callable partials

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
<% if (!stati.props) return; %>
<div class="card">
  <h2><%= stati.props.title %></h2>
  <% if (stati.props.featured) { %>
    <span class="badge">Featured</span>
  <% } %>
</div>
```

Every partial is also rendered once without props, so guard `stati.props` as in the first line.

## Frontmatter

YAML metadata at the top of Markdown files. Controls title, description, layout, order, and SEO settings.

## Hierarchical partials

Partials are discovered **upward** from the current page's directory to the root. A page can access partials from its own directory and all parent directories, but **not** from child directories. What counts is the page being rendered, not where the layout lives: a page in `site/blog/` sees both `site/_partials/` and `site/blog/_partials/`, even when it uses the root `layout.eta`. More specific partials (deeper in hierarchy) override less specific ones with the same name.

## Template context (`stati`)

The object passed to every Eta template containing:

- `stati.site` – Site configuration
- `stati.page` – Current page data and frontmatter
- `stati.content` – Rendered HTML content
- `stati.nav` – Navigation helpers and tree
- `stati.partials` – Partial templates accessible as properties (rendered markup) or callable functions (with props)

## SEO metadata

Automatically generated HTML tags for search engines and social sharing. Includes title, description, canonical, Open Graph, Twitter Cards, and JSON-LD structured data.

## `stati.config.ts`

The TypeScript configuration file at your project root. Defines site metadata, Markdown plugins, Eta filters, ISG settings, and build hooks.

## `defineConfig`

A helper function from `@stati/core` that provides type-safe configuration. Wraps your Stati config object for IntelliSense and type checking.

## Build hooks

Extension points (`beforeAll`, `afterAll`, `beforeRender`, `afterRender`) that let you inject custom logic at various stages of the build process.

## esbuild

The underlying JavaScript bundler that powers Stati's TypeScript compilation. Provides near-instant build times for client-side code.

## Development server

Stati's local server (`stati dev`) with file watching, incremental rebuilds and live reload in the browser.

## TTL (time to live)

The duration in seconds that cached content remains valid before requiring a rebuild. Configured via `isg.ttlSeconds`.

## Cache invalidation

The process of marking cached entries as stale using `stati invalidate` with patterns like `tag:`, `path:`, `glob:`, or `age:`.

## Draft

A page marked with `draft: true` in frontmatter. Drafts are excluded from every build, including `stati dev`, unless you run `stati build --include-drafts`.

## Dynamic attribute values

Stati's convention for dynamic content in HTML attributes: make the whole attribute value one expression instead of mixing static text and tags. Use template literals for the entire attribute value, or use `stati.propValue()` for space-separated values like multiple CSS classes. See [Dynamic Attribute Values](/core-concepts/templates#dynamic-attribute-values) in the templates documentation.

## Collection

A folder of pages with an `index.md`, often with shared layout and navigation (e.g., blog posts, documentation sections). Its index page receives `stati.collection` with the pages sorted by date and grouped by tag. See [Collections](/core-concepts/templates#collections).

## Eta filters

Custom functions registered in `stati.config.ts` under `eta.filters` that transform values in templates (e.g., date formatting, slugify).

## `stati.nav`

The navigation helper object available in templates with methods:

- `getTree()` – Returns the full navigation tree
- `findNode(path)` – Finds a navigation node by path or URL
- `getChildren(path)` – Gets child nodes of a path
- `getParent(path?)` – Gets the parent node (defaults to current page)
- `getSiblings(path?, includeSelf?)` – Gets sibling nodes
- `getSubtree(path)` – Gets a subtree starting from a path
- `getBreadcrumbs(path?)` – Gets the breadcrumb trail
- `getCurrentNode()` – Gets the current page's navigation node

## NavNode

A navigation tree node containing `title`, `url`, `path`, `order`, `publishedAt`, `children`, and `isCollection` properties.

## Sitemap

An XML file listing all site URLs with metadata, auto-generated during production builds when `sitemap.enabled` is true.

## RSS feed

An XML file for content syndication, configured via `rss.feeds` with content patterns, filters, and item mapping.

## Scaffolder (`create-stati`)

The interactive CLI tool that creates new Stati projects with styling options, TypeScript support, and Git initialization.

## Related resources

- [FAQ](/faq) – Frequently asked questions about Stati
- [Core concepts](/core-concepts/overview) – Deep dive into Stati's architecture
