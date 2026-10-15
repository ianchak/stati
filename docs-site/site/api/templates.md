---
title: 'Templates'
description: 'Complete reference for Stati template context, built-in helpers, and partial templates.'
order: 1
seo:
  title: 'Template API'
---

# Templates

Stati templates have access to a rich context object and built-in helpers for building dynamic pages. This reference covers all template-specific APIs.

## Template context (`stati`)

Every Eta template receives a `TemplateContext` object with site metadata, front matter, and rendered content. The runtime context includes additional properties not present in the TypeScript type definition:

```typescript
interface TemplateContext {
  site: SiteConfig;
  page: {
    path: string;
    url: string;
    content: string;
    toc: TocEntry[]; // Table of contents entries (added at runtime)
    navNode?: NavNode; // Current page's navigation node (added at runtime)
    title?: string;
    description?: string;
    [key: string]: unknown; // Front matter fields
  };
  content: string; // Rendered HTML content
  nav: {
    tree: NavNode[];
    getTree: () => NavNode[];
    findNode: (path: string) => NavNode | undefined;
    getChildren: (path: string) => NavNode[];
    getParent: (path?: string) => NavNode | undefined;
    getSiblings: (path?: string, includeSelf?: boolean) => NavNode[];
    getSubtree: (path: string) => NavNode[];
    getBreadcrumbs: (path?: string) => NavNode[];
    getCurrentNode: () => NavNode | undefined;
  };
  collection?: CollectionData; // Index pages, and top-level pages (root collection)
  partials: Record<string, CallablePartial>; // Callable partial functions (runtime type)
  assets: StatiAssets; // Bundle paths ([] when none) and the search index path
  propValue: (...args) => string; // Class/attribute value builder (added at runtime)
  generateSEO: (tags?: string[]) => string; // SEO tag generator (added at runtime)
  image: (src: string, options?: ImageOptions) => string; // Sized, lazy-loaded <img> or <picture>
  ogImage: GeneratedOgImage | undefined; // The page's generated Open Graph image, with images.og
  og: { width: number; height: number } | undefined; // Card size, only while og.eta renders
  generator: { version: string }; // Stati core version
  props: Record<string, unknown> | undefined; // Data passed to a callable partial
  // ...plus one function per entry in eta.filters, e.g. stati.formatDate()
}

interface TocEntry {
  /** Anchor ID for the heading (used in href="#id") */
  id: string;
  /** Plain text content of the heading */
  text: string;
  /** Heading level (2-6) */
  level: number;
}

interface CallablePartial {
  // Can be called with optional props
  (props?: Record<string, unknown>): string;
  // Can be used directly in template interpolation
  toString(): string;
  valueOf(): string;
}

interface SiteConfig {
  title: string;
  baseUrl: string;
  defaultLocale?: string;
  description?: string;
}

interface ImageOptions {
  alt?: string;
  sizes?: string;
  priority?: boolean;
  class?: string;
  title?: string;
}

interface GeneratedOgImage {
  url: string; // Absolute
  path: string; // Root-relative
  width: number;
  height: number;
  alt?: string; // The page title
}

interface StatiAssets {
  /** Array of TypeScript bundle paths matched for this page */
  bundlePaths: string[];
  /** Path to search index file (when search enabled) */
  searchIndexPath?: string;
}
```

Front matter values are exposed through `stati.page`. Additional properties you place on `site` in a JavaScript config are available at runtime as `stati.site.yourKey`, but the `SiteConfig` type only declares the four fields above, so a TypeScript config rejects them.

During `stati dev`, reading a `stati.*` property that does not exist (for example a misspelled filter, or `stati.site.author` when your config has no `site.author`) throws an error with a "Did you mean …?" hint instead of returning `undefined`. Front matter under `stati.page` is not checked. Test for optional values with the `in` operator: `'author' in stati.site`. See [Unknown template properties](/api/error-handling#unknown-template-properties).

The `nav` object provides helper methods for working with navigation. See [Navigation API](/api/navigation) for details on `getTree()`, `findNode()`, `getBreadcrumbs()`, and other navigation helpers.

**Type Definition Notes:**

The runtime `TemplateContext` includes several properties added dynamically that are not present in the static TypeScript type definition (`packages/core/src/types/content.ts`):

- `page.toc` - Added during rendering from markdown heading extraction
- `page.navNode` - Added from navigation tree matching
- `propValue` - Utility function added to base context
- `generateSEO` - SEO helper function added to base context
- `partials` - Runtime type is `Record<string, CallablePartial>` (callable functions), not `Record<string, string>` as in the type definition

This distinction exists because TypeScript's type system cannot fully express the dynamic context merging that happens at runtime. The TypeScript definition provides the minimum guaranteed contract, while the actual runtime context is richer.

## Built-in helpers

### `stati.propValue(...args)`

Builds property values from various inputs, similar to the `classnames` library. Accepts strings, arrays, and objects, filtering out falsy values. Especially useful for building dynamic HTML attributes that support space-separated tokens (like `class` or `data-analytics`).

**Signature:**

```typescript
type PropValueArg =
  | string
  | number
  | boolean
  | null
  | undefined
  | Record<string, boolean | string | number | null | undefined>
  | PropValueArg[];

stati.propValue(...args: PropValueArg[]): string
```

**Examples:**

```eta
<!-- Basic usage -->
<button class="<%= stati.propValue('btn', `btn-${variant}`, isActive && 'is-active') %>">
  Click me
</button>

<!-- Array syntax -->
<div class="<%= stati.propValue(['card', 'card-hover', featured && 'featured']) %>">
  Card content
</div>

<!-- Object syntax (keys with truthy values are included) -->
<article class="<%= stati.propValue({
  'post': true,
  'post-featured': stati.page.featured,
  'post-draft': stati.page.draft,
  [`post-${stati.page.category}`]: stati.page.category
}) %>">
  Article content
</article>

<!-- Data attributes -->
<div
  class="<%= stati.propValue('card', `hover:border-${color}-300`) %>"
  data-analytics="<%= stati.propValue('card-click', `category-${stati.page.category}`) %>"
>
  Card with analytics
</div>
```

**Important Notes:**

- Stati's convention is to write each dynamic attribute value as one expression instead of splicing expressions into static text (`class="static-<%= dynamic %>-morestatic"`). Eta renders spliced values, but the convention keeps attributes readable and lets `propValue()` record Tailwind classes.
- For single concatenated values (like `data-id="item-42"`), use template literals: ``data-id="<%= `item-${id}` %>"``.
- `propValue()` also tracks Tailwind classes for inventory when Tailwind integration is enabled, ensuring dynamically-generated classes are included in the CSS build.

For more details on Eta template limitations and best practices, see [Template Configuration](/configuration/templates).

### `stati.image(src, options?)`

Renders an image from a layout or partial the way Stati renders Markdown images: with its `width` and `height`, `loading="lazy"` and `decoding="async"`, and as a `<picture>` with AVIF and WebP versions when [`images.responsive`](/configuration/images#responsive-images) is on. It returns HTML, so print it with `<%~ %>`:

```eta
<%~ stati.image(stati.page.cover, { alt: stati.page.coverAlt, priority: true }) %>
```

| Option | Description |
|---|---|
| `alt` | Alternative text. Use `''` for a decorative image; Stati warns when `alt` is missing. |
| `priority` | Load eagerly with `fetchpriority="high"`, for the main image above the fold. |
| `sizes` | The `sizes` attribute for responsive images. |
| `class`, `title` | Added to the `<img>`. |

- A path that starts with `/` is read from `public/`; any other path is read next to the page's Markdown file and copied to `/_img/`.
- An empty `src` returns an empty string, so an optional cover image needs no guard.
- The helper is synchronous, so it works anywhere in a template.
- With `images: false`, it returns a plain `<img>` with the attributes you passed.

### `stati.ogImage`

With [`images.og`](/configuration/images#open-graph-images), the page's generated card: `url` (absolute), `path`, `width`, `height` and `alt`. It is `undefined` when the page has no generated card, for example because its front matter sets its own image. Stati's SEO injection and `stati.generateSEO()` already write the tags, so you only need this in a layout that writes its own Open Graph tags:

```eta
<% if (stati.ogImage) { %>
  <meta property="og:image" content="<%= stati.ogImage.url %>">
<% } %>
```

In an `og.eta` card template, `stati.og` holds the card's `width` and `height`.

## Text processing utilities

Common text processing patterns for templates. Code inside `<% %>` tags is plain JavaScript: Stati does not compile TypeScript in templates, so type annotations or `as` casts cause a syntax error.

```eta
<!-- Truncate text -->
<%
function truncate(text, length = 150) {
  if (!text || text.length <= length) return text;
  return text.slice(0, length).replace(/\s+\S*$/, '') + '...';
}
%>
<p class="excerpt"><%= truncate(stati.page.description) %></p>

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
<a href="<%= `/tags#${slugify(tag)}` %>" class="tag">#<%= tag %></a>

<!-- Strip HTML -->
<%
function stripHtml(html) {
  return html.replace(/<[^>]*>/g, '');
}
%>
<meta name="description" content="<%= truncate(stripHtml(stati.content), 160) %>">
```

## Partial templates

Partials are reusable templates from underscore-prefixed directories (e.g., `_partials/`, `_components/`, `_layouts/`), available as callable functions in `stati.partials`.

### Basic usage

```eta
<!-- Without props (pre-rendered) -->
<%~ stati.partials.header %>
<%~ stati.partials.footer %>

<!-- With props (re-rendered dynamically) -->
<%~ stati.partials.card({ title: 'Hello', featured: true }) %>

<!-- Conditional: test membership, not truthiness -->
<% if ('sidebar' in stati.partials) { %>
  <%~ stati.partials.sidebar %>
<% } %>
```

Outside production builds, reading a partial that does not exist returns an inline "Partial not found" warning box instead of `undefined`, so `if (stati.partials.sidebar)` is always true. Use the `in` operator to check whether a partial exists.

### Defining partials

```eta
<!-- site/_partials/card.eta or site/_components/card.eta -->
<% if (!stati.props) return; %>
<article class="<%= stati.propValue('card', stati.props.featured && 'featured') %>">
  <h2><%= stati.props.title %></h2>
  <p><%= stati.props.description %></p>
  <a href="<%= stati.props.url %>">Read more</a>
</article>
```

Stati pre-renders every partial once without props for each page, with `stati.props` set to `undefined`. The first line keeps that pass from failing when the card reads its props; see [Passing data to partials](/core-concepts/templates#passing-data-to-partials).

### Props vs context

- Props passed to partials are available as `stati.props` within the partial
- Partials also have full access to `stati.page`, `stati.site`, `stati.content`, etc.
- Without props: uses pre-rendered content (fast)
- With props: re-renders with merged context (dynamic)

```eta
<!-- Fallback pattern: props → page → site title -->
<%= stati.props?.author || stati.page.author || stati.site.title %>
```

## Custom filters

Register custom Eta filters in your configuration for reusable transformations:

```typescript
import { defineConfig } from '@stati/core';

export default defineConfig({
  site: { title: 'My Site', baseUrl: 'https://example.com' },
  eta: {
    filters: {
      formatDate: (value: unknown, locale = 'en-US') =>
        new Intl.DateTimeFormat(locale).format(new Date(String(value))),
      uppercase: (value: unknown) => String(value).toUpperCase(),
      json: (value: unknown) => JSON.stringify(value, null, 2),
    },
  },
});
```

The `eta.filters` type is `Record<string, (x: unknown) => unknown>`, so in a TypeScript config declare the first parameter as `unknown` and make any further parameters optional; filters typed as `(value: string) => …` or with two required parameters do not type-check. At runtime, filters are plain functions on `stati` and receive whatever arguments the template passes.

Use filters in templates by calling them as functions from the `stati` context:

```eta
<time><%= stati.formatDate(stati.page.date) %></time>
<pre><%= stati.json(stati.page.metadata) %></pre>
<h1><%= stati.uppercase(stati.page.title) %></h1>
```

## Related documentation

- [TypeScript Types](/api/types) - Full type definitions for template context
- [Build Hooks](/api/hooks) - Customize rendering with lifecycle hooks
- [Template Configuration](/configuration/templates) - Configure template engine options
- [Navigation API](/api/navigation) - Working with navigation data in templates
