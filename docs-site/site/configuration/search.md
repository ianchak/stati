---
title: 'Search'
description: Learn how to configure and generate a search index for your Stati site
order: 7
seo:
  title: 'Search index configuration'
---

# Search

Stati can generate a JSON search index at build time, enabling client-side search functionality for your static site.

## Overview

Search index generation in Stati:

- **Build-time generation**: Search index is generated during the build process, in both `stati build` and `stati dev`
- **Section-level indexing**: Extracts searchable sections from markdown headings
- **Cache-friendly**: Hashed filenames for cache busting
- **Auto-discovery**: Automatically injects a meta tag for client-side discovery
- **Configurable**: Control heading levels, content length, and exclusions

## Basic configuration

Enable search index generation in your `stati.config.ts`:

```typescript
import { defineConfig } from '@stati/core';

export default defineConfig({
  // site: { … },
  search: {
    enabled: true,
  },
});
```

This generates a `search-index-[hash].json` file in your output directory containing all your pages except the home page (see `includeHomePage`).

## Configuration options

### Full configuration example

```typescript
import { defineConfig } from '@stati/core';

export default defineConfig({
  // site: { … },
  search: {
    enabled: true,
    indexName: 'search-index',
    hashFilename: true,
    maxContentLength: 1000,
    maxPreviewLength: 500,
    headingLevels: [2, 3, 4, 5, 6],
    exclude: ['/private/**'],
    includeHomePage: false,
    autoInjectMetaTag: true,
  },
});
```

### Option reference

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | `boolean` | `false` | Enable search index generation |
| `indexName` | `string` | `'search-index'` | Base filename for the search index (without extension) |
| `hashFilename` | `boolean` | `true` | Add a hash of the index content to the filename for cache busting |
| `maxContentLength` | `number` | `1000` | Maximum content length per section (in characters) |
| `maxPreviewLength` | `number` | `500` | Maximum preview length for page-level entries (in characters) |
| `headingLevels` | `number[]` | `[2, 3, 4, 5, 6]` | Heading levels to include in the index |
| `exclude` | `string[]` | `[]` | Glob patterns for pages to exclude |
| `includeHomePage` | `boolean` | `false` | Include the home page in the search index |
| `autoInjectMetaTag` | `boolean` | `true` | Auto-inject search index meta tag into HTML |

## Content filtering

### Exclude pages

Use `exclude` patterns to exclude specific content from the search index:

```typescript
search: {
  enabled: true,
  exclude: [
    '/private',         // The /private index page
    '/private/**',      // Every page under /private/
    '/admin/**',        // Admin pages
    '/api/**',          // API documentation
  ],
}
```

Patterns are globs matched against the whole page URL (`/private/docs`, `/` for the home page). `/private/**` does not match `/private` itself, and a pattern without wildcards matches only that exact URL.

### Generated and paginated pages

Pages created from a `[param].md` template, such as one page per tag, are left out of the index. To index them, set `search: true` in the template's front matter. The later pages of a listing with `paginate` (`/blog/page/2` and on) are always left out, since they repeat the first page's text. See [Collections and generated pages](/core-concepts/collections#where-generated-and-paginated-pages-appear).

### The 404 page

[The 404 page](/core-concepts/routing#the-404-page) is left out of the index without an `exclude` pattern. To index it, set `search: true` in its front matter; `exclude` patterns still apply.

### Include home page

By default, the home page is excluded from the search index. To include it:

```typescript
search: {
  enabled: true,
  includeHomePage: true,
}
```

### Control heading levels

Specify which heading levels to index:

```typescript
search: {
  enabled: true,
  headingLevels: [2, 3],  // Only index h2 and h3 headings
}
```

Sections come from the heading anchors that `markdown.toc` creates. With `markdown: { toc: false }`, each page contributes only its page-level entry.

## Search index structure

The generated search index is a JSON file with the following structure:

```json
{
  "version": "1.0.0",
  "generatedAt": "2025-01-15T10:30:00.000Z",
  "documentCount": 150,
  "documents": [
    {
      "id": "/getting-started/installation#top",
      "url": "/getting-started/installation",
      "anchor": "",
      "title": "Installation",
      "heading": "Installation",
      "level": 1,
      "content": "Text before the first heading…",
      "breadcrumb": "Getting Started > Installation",
      "tags": ["setup", "installation"]
    },
    {
      "id": "/getting-started/installation#prerequisites",
      "url": "/getting-started/installation",
      "anchor": "prerequisites",
      "title": "Installation",
      "heading": "Prerequisites",
      "level": 2,
      "content": "Node.js 22.20.0 or higher on the 22.x line, or 24 and later…",
      "breadcrumb": "Getting Started > Installation > Prerequisites",
      "tags": ["setup", "installation"]
    }
  ]
}
```

Every page gets one page-level entry (`level: 1`, `anchor: ""`, `id` ending in `#top`) with the text before its first heading, plus one entry per heading section that has text.

### Document fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique identifier (page URL + `#` + section anchor, or `#top` for the page-level entry) |
| `url` | `string` | Page URL path |
| `anchor` | `string` | Section anchor (heading ID), empty for page-level entries |
| `title` | `string` | Page title from front matter (the page slug if there is none) |
| `heading` | `string` | Section heading text |
| `level` | `number` | Heading level (1 for page title, 2-6 for headings) |
| `content` | `string` | Text content of the section (stripped of markdown) |
| `breadcrumb` | `string` | Breadcrumb for display, built from the URL folders, the page title and (for sections) the heading |
| `tags` | `string[]` | Optional tags from frontmatter |

## Template access

Access the search index path in your templates via `stati.assets.searchIndexPath`:

```html
<% if (stati.assets.searchIndexPath) { %>
<script>
  window.SEARCH_INDEX_PATH = '<%= stati.assets.searchIndexPath %>';
</script>
<% } %>
```

## Auto-injected meta tag

When `autoInjectMetaTag` is enabled (default), Stati automatically injects a meta tag into your HTML:

```html
<meta name="stati:search-index" content="/search-index-a1b2c3d4.json">
```

This allows client-side JavaScript to discover the search index location:

```javascript
const metaTag = document.querySelector('meta[name="stati:search-index"]');
const searchIndexPath = metaTag?.getAttribute('content');

if (searchIndexPath) {
  const response = await fetch(searchIndexPath);
  const searchIndex = await response.json();
  // Use searchIndex for client-side search
}
```

## Implementing client-side search

Here's a basic example of implementing client-side search using the generated index:

```javascript
// Fetch the search index
async function loadSearchIndex() {
  const metaTag = document.querySelector('meta[name="stati:search-index"]');
  if (!metaTag) return null;

  const response = await fetch(metaTag.getAttribute('content'));
  return response.json();
}

// Simple search function
function search(index, query) {
  const lowerQuery = query.toLowerCase();
  return index.documents.filter(doc =>
    doc.title.toLowerCase().includes(lowerQuery) ||
    doc.heading.toLowerCase().includes(lowerQuery) ||
    doc.content.toLowerCase().includes(lowerQuery)
  );
}

// Usage
const index = await loadSearchIndex();
const results = search(index, 'installation');
```

For production use, consider using a client-side search library like [Fuse.js](https://www.fusejs.io/) or [Lunr.js](https://lunrjs.com/) for better search capabilities including fuzzy matching and relevance scoring.

## Cache busting

When `hashFilename` is enabled (default), the search index filename includes a hash:

```text
search-index-a1b2c3d4.json
```

In a production build the hash is computed from the index content, so the filename changes only when the indexed text does and browsers never use a stale cached index. `stati build` deletes the index files earlier builds wrote under other names. During `stati dev` the name stays the same between rebuilds. Because the name changes, read it from the meta tag or `stati.assets.searchIndexPath` instead of hard-coding it.

Every page links to the index, so the filename is part of each page's [cache](/configuration/isg) hash. A build that changes no indexed text reuses every cached page. A build that changes indexed text, such as a heading or a paragraph on one page, renames the index and renders every page again with the new name. With `hashFilename: false` the name never changes, so only the changed pages render; serve `search-index.json` with a short cache lifetime instead.

The index is generated from each page's Markdown after the `beforeAll` hook and before any page renders, so changes a `beforeRender` hook makes to a page's content do not reach the index.

To disable hash-based filenames:

```typescript
search: {
  enabled: true,
  hashFilename: false,  // Generates 'search-index.json'
}
```

## Performance considerations

### Content length

The `maxContentLength` and `maxPreviewLength` options control how much text is included in the index:

```typescript
search: {
  enabled: true,
  maxContentLength: 500,   // Shorter sections for smaller index
  maxPreviewLength: 200,   // Shorter previews
}
```

Smaller values result in a smaller index file but less context for search results.

### Heading levels

Limiting heading levels reduces the number of documents in the index:

```typescript
search: {
  enabled: true,
  headingLevels: [2],  // Only index h2 headings
}
```

### Excluding content

Exclude non-essential pages to keep the index focused:

```typescript
search: {
  enabled: true,
  exclude: [
    '/changelog/**',
    '/license',
    '/archive/**',
  ],
}
```

## Draft pages

Draft pages (pages with `draft: true` in front matter) are never in the search index. Drafts are normally not built at all; with `stati build --include-drafts` they are rendered but still left out of the index.
