---
title: 'Templates'
description: 'Complete reference for the Stati template context, includes, layouts, helpers and built-in functions.'
order: 1
seo:
  title: 'Template API'
---

# Templates

Stati templates have access to a rich context object and built-in functions for building dynamic pages. This reference covers all template-specific APIs.

## Template context (`stati`)

Every Eta template receives a `TemplateContext` object with site metadata, front matter, and rendered content:

```typescript
interface TemplateContext {
  site: SiteConfig;
  page: {
    path: string;
    url: string;
    content: string;
    toc: TocEntry[]; // Table of contents entries (added at runtime)
    navNode?: NavNode; // Current page's navigation node
    title?: string;
    description?: string;
    [key: string]: unknown; // Front matter fields
  };
  content: string; // Rendered HTML content
  body?: string; // The HTML this template wraps (see stati.body and stati.props)
  props: Record<string, unknown> | undefined; // Props of the stati.include() or stati.layout() call
  include: TemplateIncludeFunction; // Renders another template and returns its HTML
  layout: TemplateLayoutFunction; // Wraps this template's output in another template
  helpers: Record<string, (...args: any[]) => unknown>; // The functions in helpers in the config
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
  collection?: CollectionData; // The page's collection; undefined when it has none
  pagination?: PaginationData; // This page's part of a listing with `paginate`
  generated?: GeneratedPageData; // Key and items of a page from a [param].md template
  slugify: (text: string) => string; // The slug Stati gives generated page keys
  assets?: StatiAssets; // Bundle paths ([] when none) and the search index path
  propValue: (...args) => string; // Class/attribute value builder
  generateSEO: (tags?: string[]) => string; // SEO tag generator
  image: (src: string, options?: ImageOptions) => string; // Sized, lazy-loaded <img> or <picture>
  ogImage: GeneratedOgImage | undefined; // The page's generated Open Graph image, with images.og
  og: { width: number; height: number } | undefined; // Card size, only while og.eta renders
  generator: { version: string }; // Stati core version
}

interface TemplateIncludeFunction {
  (name: string, props?: Record<string, unknown> | null, body?: string | null): string;
  has(name: string): boolean; // Whether name resolves to a template for this page
}

interface TemplateLayoutFunction {
  (name: string, props?: Record<string, unknown> | null): string; // Returns ''
  has(name: string): boolean; // The same function as stati.include.has
}

interface TocEntry {
  /** Anchor ID for the heading (used in href="#id") */
  id: string;
  /** Plain text content of the heading */
  text: string;
  /** Heading level (2-6) */
  level: number;
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

interface PaginationData {
  pageNumber: number; // Starts at 1
  totalPages: number; // At least 1
  items: PageModel[]; // This page's share of the listing, newest first
  prevUrl?: string; // Absent on the first page
  nextUrl?: string; // Absent on the last page
  urls: string[]; // Every page's URL; urls[0] is the first page
}

interface GeneratedPageData {
  key: string; // In the URL: 'css'
  label: string; // As written: 'CSS'
  items: PageModel[]; // Pages with this key, newest first
  template: string; // 'blog/tags/[tag].md'
  data?: Record<string, unknown>; // From a collections.generate entry
}
```

`stati.collection` is the page's own collection on a folder's index page, the collection it belongs to on other pages, or the one its `collection` front matter names. `stati.pagination` and `stati.generated` are set on the pages they describe and `undefined` elsewhere. Reading `stati.collection` or `stati.nav` makes the page depend on that data for [ISG](/core-concepts/isg#dependency-tracking). See [Collections and generated pages](/core-concepts/collections).

The root of `stati` holds only Stati's own API. Your functions live under [`stati.helpers`](#helpers), so a helper named `page` or `slugify` never replaces Stati's value.

Front matter values are exposed through `stati.page`. Additional properties you place on `site` in a JavaScript config are available at runtime as `stati.site.yourKey`, but the `SiteConfig` type only declares the four fields above, so a TypeScript config rejects them.

During `stati dev`, reading a `stati.*` property that does not exist (for example a misspelled helper, or `stati.site.author` when your config has no `site.author`) throws an error instead of returning `undefined`, suggesting the property you probably meant or listing the available ones: `stati.helpers.formatDat` and `stati.formatDate` both suggest `stati.helpers.formatDate`. Front matter under `stati.page` is not checked. Test for optional values with the `in` operator: `'author' in stati.site`. See [Unknown template properties](/api/error-handling#unknown-template-properties).

The `nav` object provides helper methods for working with navigation. See [Navigation API](/api/navigation) for details on `getTree()`, `findNode()`, `getBreadcrumbs()`, and other navigation helpers.

`page.toc` is added at render time from the page's headings, so the `TemplateContext` type in `@stati/core` does not declare it.

## Includes and layouts

### `stati.include(name, props?, body?)`

Renders the template `name` and returns its HTML. Print the result with `<%~ %>`:

```eta
<%~ stati.include('partials/header') %>
<%~ stati.include('partials/card', { title: 'Hello', featured: true }) %>
<%~ stati.include('partials/callout', { tone: 'note' }, '<p>Inside the callout</p>') %>
```

| Argument | Description |
|---|---|
| `name` | The template's path without `.eta`. `partials/card` is looked up from the page's folder up to `site/`, and the nearest match wins; `/partials/card` is read from `site/` only; `./card` and `../shared/card` are relative to the template making the call. A `.eta` suffix is dropped. |
| `props` | An object the template reads as `stati.props` |
| `body` | HTML the template prints as `stati.body` |

- Included templates render synchronously, so they cannot use `await`.
- Without props and body, a template renders once per page; later includes of it on the same page reuse that HTML.
- The included template can call `stati.layout()` to wrap its own output in a frame.
- A name never resolves outside `site/`. An unknown name opens the error overlay in development, listing similar templates; in production the build logs the error and the include returns `''`.
- An error thrown inside the included template opens the overlay at that file in development. In production the build logs it, and an HTML comment takes the template's place.

### `stati.layout(name, props?)`

Wraps the output of the calling template in the template `name`, once the calling template has rendered. The call returns `''`, so it can sit in `<% %>` or `<%~ %>`, anywhere in the template:

```eta
<% stati.layout('base', { bodyClass: 'post' }) %>
<article><%~ stati.content %></article>
```

- The named template prints the wrapped output as `stati.body` and reads the props as `stati.props`. It can call `stati.layout()` in turn.
- Names resolve the same way as `stati.include()` names.
- One call per template: a second call is an error in development; in production the build warns and the last call wins.
- An unknown name is an error in development; in production the build logs it and the template renders without the wrapper.

### `stati.include.has(name)` and `stati.layout.has(name)`

Whether `name` resolves to a template for the current page, with the lookup the call would use. The two are the same function:

```eta
<% if (stati.include.has('partials/sidebar')) { %>
  <%~ stati.include('partials/sidebar') %>
<% } %>

<% stati.layout(stati.layout.has('blog/base') ? 'blog/base' : 'base') %>
```

### `stati.body` and `stati.props`

| Template | `stati.body` | `stati.props` |
|---|---|---|
| The page's layout (front matter or discovery) | Absent; the page is `stati.content` | `undefined` |
| A template named by `stati.layout()` | The output it wraps | The call's props |
| A template rendered by `stati.include()` | The `body` argument, or `undefined` | The call's props, or `undefined` |
| The Open Graph template (`og.eta`) | Absent | `undefined` |

`stati.body` is HTML, so print it with `<%~ %>`. Reading it where it is absent is an error in development that points at `stati.content`. A `body` that is not a string, and props that are not an object, are errors in development; in production the build warns and renders without them.

```eta
<!-- Fallback pattern: props → page → site title -->
<%= stati.props?.author || stati.page.author || stati.site.title %>
```

### Eta's include, layout and block

Eta's own `include()`, `includeAsync()`, `layout()`, `block()` and `blockAsync()` are not available in Stati templates:

| Call | Development | Production |
|---|---|---|
| `include('x', data)` | Error: "Use `stati.include('./x', data)` instead" | Error logged; renders `''` |
| `includeAsync('x')` | The same, noting that includes render synchronously | Error logged; renders `''` |
| `layout('x', data)` | Error: "Use `stati.layout('./x', data)` instead; the data arrives as `stati.props`" | Error logged; no layout applied |
| `block()`, `blockAsync()` | Error: pass the content to the layout as a prop | Error logged; renders `''` |

The suggested name keeps Eta's resolution: a name that does not start with `/`, `./` or `../` gets `./` in front, so it stays relative to the calling template.

## Built-in functions

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

Renders an image from a layout or an included template the way Stati renders Markdown images: with its `width` and `height`, `loading="lazy"` and `decoding="async"`, and as a `<picture>` with AVIF and WebP versions when [`images.responsive`](/configuration/images#responsive-images) is on. It returns HTML, so print it with `<%~ %>`:

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
- The function is synchronous, so it works anywhere in a template, included templates too.
- With `images: false`, it returns a plain `<img>` with the attributes you passed.

### `stati.ogImage`

With [`images.og`](/configuration/images#open-graph-images), the page's generated card: `url` (absolute), `path`, `width`, `height` and `alt`. It is `undefined` when the page has no generated card, for example because its front matter sets its own image. Stati's SEO injection and `stati.generateSEO()` already write the tags, so you only need this in a layout that writes its own Open Graph tags:

```eta
<% if (stati.ogImage) { %>
  <meta property="og:image" content="<%= stati.ogImage.url %>">
<% } %>
```

In an `og.eta` card template, `stati.og` holds the card's `width` and `height`.

## Helpers

Register your own functions under `helpers` in the configuration, and call them from any template as `stati.helpers.name()`:

```typescript
import { defineConfig } from '@stati/core';

export default defineConfig({
  site: { title: 'My Site', baseUrl: 'https://example.com' },
  helpers: {
    formatDate: (value: string | Date, locale = 'en-US') =>
      new Intl.DateTimeFormat(locale).format(new Date(value)),
    uppercase: (value: string) => value.toUpperCase(),
    json: (value: unknown) => JSON.stringify(value, null, 2),
  },
});
```

```eta
<time><%= stati.helpers.formatDate(stati.page.date) %></time>
<pre><%= stati.helpers.json(stati.page.metadata) %></pre>
<h1><%= stati.helpers.uppercase(stati.page.title) %></h1>
```

`helpers` is typed `Record<string, (...args: any[]) => unknown>`, so a helper declares whatever parameters it needs. Helpers reach every template Stati renders: layouts, the shells they name, included templates and the Open Graph template. A helper written with `function` or method syntax gets the helpers object as `this`.

## Text processing utilities

Common text processing patterns for templates. Code inside `<% %>` tags is plain JavaScript: Stati does not compile TypeScript in templates, so type annotations or `as` casts cause a syntax error. Functions you need in more than one template belong in [helpers](#helpers).

```eta
<!-- Truncate text -->
<%
function truncate(text, length = 150) {
  if (!text || text.length <= length) return text;
  return text.slice(0, length).replace(/\s+\S*$/, '') + '...';
}
%>
<p class="excerpt"><%= truncate(stati.page.description) %></p>

<!-- Slugify text with Stati's own function -->
<a href="<%= `/tags/${stati.slugify(tag)}` %>" class="tag">#<%= tag %></a>

<!-- Strip HTML -->
<%
function stripHtml(html) {
  return html.replace(/<[^>]*>/g, '');
}
%>
<meta name="description" content="<%= truncate(stripHtml(stati.content), 160) %>">
```

## Related documentation

- [Templates and layouts](/core-concepts/templates) - Layouts, shells and includes, with examples
- [TypeScript Types](/api/types) - Full type definitions for template context
- [Build Hooks](/api/hooks) - Customize rendering with lifecycle hooks
- [Template Configuration](/configuration/templates) - Configure helpers and template options
- [Navigation API](/api/navigation) - Working with navigation data in templates
