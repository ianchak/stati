---
title: 'Template API'
description: 'Complete reference for Stati template context, built-in helpers, and partial templates.'
order: 1
---

# Stati Template API

Stati templates have access to a rich context object and built-in helpers for building dynamic pages. This reference covers all template-specific APIs.

## Template Context (`stati`)

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
  collection?: CollectionData; // Only for index pages
  partials: Record<string, CallablePartial>; // Callable partial functions (runtime type)
  assets?: StatiAssets; // TypeScript bundle paths (when enabled)
  propValue: (...args) => string; // Class/attribute value builder (added at runtime)
  generateSEO: (tags?: string[]) => string; // SEO tag generator (added at runtime)
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
}

interface StatiAssets {
  /** Array of TypeScript bundle paths matched for this page */
  bundlePaths: string[];
  /** Path to search index file (when search enabled) */
  searchIndexPath?: string;
}
```

Front matter values are exposed through `stati.page`. Additional properties you place on `site` in `stati.config.ts` are available at runtime, but the public type includes the three fields above by default.

The `nav` object provides helper methods for working with navigation. See [Navigation API](/api/navigation) for details on `getTree()`, `findNode()`, `getBreadcrumbs()`, and other navigation helpers.

**Type Definition Notes:**

The runtime `TemplateContext` includes several properties added dynamically that are not present in the static TypeScript type definition (`packages/core/src/types/content.ts`):

- `page.toc` - Added during rendering from markdown heading extraction
- `page.navNode` - Added from navigation tree matching
- `propValue` - Utility function added to base context
- `generateSEO` - SEO helper function added to base context
- `partials` - Runtime type is `Record<string, CallablePartial>` (callable functions), not `Record<string, string>` as in the type definition

This distinction exists because TypeScript's type system cannot fully express the dynamic context merging that happens at runtime. The TypeScript definition provides the minimum guaranteed contract, while the actual runtime context is richer.

## Built-in Helpers

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

- Eta does NOT support partial dynamic attributes like `class="static-<%= dynamic %>-morestatic"`. All attribute values must be fully dynamic.
- For single concatenated values (like `data-id="item-42"`), use template literals: `data-id="<%=`item-${id}`%>"`.
- `propValue()` also tracks Tailwind classes for inventory when Tailwind integration is enabled, ensuring dynamically-generated classes are included in the CSS build.

For more details on Eta template limitations and best practices, see [Template Configuration](/configuration/templates).

## Text Processing Utilities

Common text processing patterns for templates:

```eta
<!-- Truncate text -->
<%
function truncate(text, length = 150) {
  if (!text || text.length <= length) return text;
  return text.slice(0, length).replace(/\s+\S*$/, '') + '...';
}
%>
<p class="excerpt"><%= truncate(stati.page.description as string) %></p>

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
<a href="/tags/<%= slugify(tag) %>/" class="tag">#<%= tag %></a>

<!-- Strip HTML -->
<%
function stripHtml(html) {
  return html.replace(/<[^>]*>/g, '');
}
%>
<meta name="description" content="<%= truncate(stripHtml(stati.content), 160) %>">
```

## Partial Templates

Partials are reusable templates from underscore-prefixed directories (e.g., `_partials/`, `_components/`, `_layouts/`), available as callable functions in `stati.partials`.

### Basic Usage

```eta
<!-- Without props (pre-rendered) -->
<%~ stati.partials.header %>
<%~ stati.partials.footer %>

<!-- With props (re-rendered dynamically) -->
<%~ stati.partials.card({ title: 'Hello', featured: true }) %>

<!-- Conditional -->
<% if (stati.partials.sidebar) { %>
  <%~ stati.partials.sidebar %>
<% } %>
```

### Defining Partials

```eta
<!-- site/_partials/card.eta or site/_components/card.eta -->
<article class="<%= stati.propValue('card', stati.props.featured && 'featured') %>">
  <h2><%= stati.props.title %></h2>
  <p><%= stati.props.description %></p>
  <a href="<%= stati.props.url %>">Read more</a>
</article>
```

### Props vs Context

- Props passed to partials are available as `stati.props` within the partial
- Partials also have full access to `stati.page`, `stati.site`, `stati.content`, etc.
- Without props: uses pre-rendered content (fast)
- With props: re-renders with merged context (dynamic)

```eta
<!-- Fallback pattern: props → page → site -->
<%= stati.props?.author || stati.page.author || stati.site.author %>
```

## Custom Filters

Register custom Eta filters in your configuration for reusable transformations:

```typescript
import { defineConfig } from '@stati/core';

export default defineConfig({
  eta: {
    filters: {
      formatDate: (value: string | Date, locale = 'en-US') =>
        new Intl.DateTimeFormat(locale).format(new Date(value)),
      uppercase: (value: string) => value.toUpperCase(),
      json: (value: unknown) => JSON.stringify(value, null, 2),
    },
  },
});
```

Use filters in templates by calling them as functions from the `stati` context:

```eta
<time><%= stati.formatDate(stati.page.date) %></time>
<pre><%= stati.json(stati.page.metadata) %></pre>
<h1><%= stati.uppercase(stati.page.title) %></h1>
```

## Related Documentation

- [TypeScript Types](/api/types) - Full type definitions for template context
- [Build Hooks](/api/hooks) - Customize rendering with lifecycle hooks
- [Template Configuration](/configuration/templates) - Configure template engine options
- [Navigation API](/api/navigation) - Working with navigation data in templates
