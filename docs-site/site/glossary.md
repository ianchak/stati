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

Stati's templating engine. Eta files (`.eta`) hold HTML with embedded JavaScript. A page's layout is typically `layout.eta`; layouts share a [shell](#shell) through `stati.layout()` and reuse other templates through `stati.include()`.

## Layout

The template that renders a page: the nearest `layout.eta`, or the one named in front matter without the extension (`layout: layouts/post`). A layout can name a [shell](#shell) to wrap it with `stati.layout()`.

## Layout inheritance

Stati's hierarchical layout system where more specific layouts **override** parent directory layouts. A `layout.eta` in a subdirectory replaces the root layout for pages in that directory. For example, `site/blog/layout.eta` overrides `site/layout.eta` for all pages under `/blog/`. The document around both can live in one [shell](#shell) that each layout names.

## Shell

A template that wraps a layout's output, named with `<% stati.layout('base') %>` at the top of the layout. It prints the wrapped output as `stati.body`, so the `<head>`, header and footer are written once for every layout. See [Sharing a shell](/core-concepts/templates#sharing-a-shell).

## Partials

Reusable templates that layouts and other templates include, conventionally kept in `site/partials/`. Any `.eta` file under `site/` can be included by its path without the extension: `<%~ stati.include('partials/header') %>`. See [Includes](#includes).

## Includes

Rendering another template inside the current one with `stati.include(name, props?, body?)`:

```eta
<%~ stati.include('partials/card', { title: 'Hello', featured: true }) %>
```

The included template reads the props as `stati.props`, and the optional third argument, HTML to wrap, as `stati.body`. Includes give component-like reuse: the same template renders different content for different props.

**Examples:**

- Simple: `<%~ stati.include('partials/header') %>`
- With props: `<%~ stati.include('partials/card', { title: 'My Card', url: '/page' }) %>`
- With content: `<%~ stati.include('partials/callout', { tone: 'note' }, '<p>Heads up</p>') %>`
- In loops: `<% posts.forEach(post => { %> <%~ stati.include('partials/card', { title: post.frontMatter.title }) %> <% }) %>`

**Inside the template:**

```eta
<div class="card">
  <h2><%= stati.props.title %></h2>
  <% if (stati.props.featured) { %>
    <span class="badge">Featured</span>
  <% } %>
</div>
```

A template renders only where it is included.

## Frontmatter

YAML metadata at the top of Markdown files. Controls title, description, layout, order, and SEO settings.

## Template lookup

How Stati finds a template by name in `stati.include()`, `stati.layout()` and front matter `layout:`. A name such as `partials/header` is looked up from the current page's folder up to `site/`, and the nearest match wins, so a section overrides a template by putting one at the same path, such as `site/blog/partials/header.eta`. What counts is the page being rendered, not where the calling template lives. A name starting with `/` is read from `site/` only, and `./icon` or `../icons/arrow` are relative to the calling template.

## Template context (`stati`)

The object passed to every Eta template containing:

- `stati.site` – Site configuration
- `stati.page` – Current page data and frontmatter
- `stati.content` – Rendered HTML content
- `stati.nav` – Navigation helpers and tree
- `stati.include()` and `stati.layout()` – Render another template here, or wrap this one in a shell
- `stati.props` and `stati.body` – The props and content a template was rendered with
- `stati.helpers` – Your functions from `helpers` in the config

## SEO metadata

Automatically generated HTML tags for search engines and social sharing. Includes title, description, canonical, Open Graph, Twitter Cards, and JSON-LD structured data.

## `stati.config.ts`

The TypeScript configuration file at your project root. Defines site metadata, Markdown plugins, template helpers, ISG settings, and build hooks.

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

A folder of pages with an `index.md`, often with shared layout and navigation (e.g., blog posts, documentation sections). Templates read it as `stati.collection`, with the pages sorted by date and grouped by tag: the index page reads its own collection, the pages in the folder read theirs, and any page can name one with `collection` in its front matter. See [Collections and generated pages](/core-concepts/collections).

## Pagination

Splitting a collection listing into numbered pages with `paginate` in front matter. The first page keeps its URL, later ones get `/page/2`, `/page/3` and so on, and templates read their part as `stati.pagination`. See [Pagination](/core-concepts/collections#pagination).

## Generated page

A page Stati creates from a `[param].md` template, one per key: `site/blog/tags/[tag].md` becomes `/blog/tags/css`, `/blog/tags/javascript` and so on, one for each tag in its collection. Templates read the key and its pages as `stati.generated`. See [Generated pages](/core-concepts/collections#generated-pages).

## Helpers

Your own functions registered in `stati.config.ts` under `helpers` and called from templates as `stati.helpers.name()` (e.g., date formatting).

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

## `@stati/images`

An optional package that adds the image features needing an encoder: responsive AVIF and WebP images (`images.responsive`) and generated Open Graph cards (`images.og`). Without it, Stati still adds sizes and lazy loading to Markdown images. See [Images](/configuration/images).

## Open Graph card

The image social networks and chat apps show when someone shares a page. With `images.og`, Stati draws one for every page from an `og.eta` template, or from the card built into `@stati/images`.

## `/_img/`

The output folder for images Stati copies from `site/` and for the files it generates, such as responsive variants and Open Graph cards. Names change with the content, so these files can be cached forever.

## Scaffolder (`create-stati`)

The interactive CLI tool that creates new Stati projects with styling options, TypeScript support, and Git initialization.

## Related resources

- [FAQ](/faq) – Frequently asked questions about Stati
- [Core concepts](/core-concepts/overview) – Deep dive into Stati's architecture
