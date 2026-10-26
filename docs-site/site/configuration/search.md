---
title: 'Search'
description: Learn how to configure and generate a search index for your Stati site
order: 7
seo:
  title: 'Search index configuration'
---

# Search

Stati can generate a JSON search index at build time, in both `stati build` and `stati dev`, for client-side search on your static site.

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
| `fields` | `string[]` | `[]` | Front matter fields to copy onto each page-level entry (see [Front matter fields](#front-matter-fields)) |

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

### Control heading levels

Specify which heading levels to index:

```typescript
search: {
  enabled: true,
  headingLevels: [2, 3],  // Only index h2 and h3 headings
}
```

Sections come from the heading anchors that `markdown.toc` creates. With `markdown: { toc: false }`, each page contributes only its page-level entry.

## Front matter fields

A search interface often shows more than a title and a text snippet: a standfirst, a date, the section a story belongs to. List the front matter fields it needs in `fields`, and Stati copies them onto each page's entry in the index, so the page does not have to embed that data itself:

```typescript
search: {
  enabled: true,
  fields: ['description', 'date', 'section'],
}
```

```json
{
  "id": "/news/world/a-story#top",
  "url": "/news/world/a-story",
  "anchor": "",
  "title": "A story",
  "heading": "A story",
  "level": 1,
  "content": "Text before the first heading…",
  "breadcrumb": "News > World > A story",
  "fields": {
    "description": "The standfirst of the story",
    "date": "2026-10-25T09:15:00.000Z",
    "section": "World"
  }
}
```

- Only page-level entries (`level: 1`) carry `fields`, so the entries for a page's headings do not repeat them.
- A page that does not set a field, or sets it to `null`, leaves it out; a page with none of the listed fields has no `fields` key. Without the `fields` option the index is the same as before.
- Values must be JSON-serializable. Dates (YAML reads `date: 2026-10-25` as one) are written as ISO strings. A value JSON cannot hold, such as a function, a circular structure or an invalid date, is left out with a warning that names the page and the field.
- The values are read from each page's front matter after the `beforeAll` hook and before any page renders. Collections and navigation are not available there, so a value derived from them, such as a page's section, has to be front matter: write it in the page, or set it in `beforeAll`.
- The fields are part of the index content, so changing a listed field changes the index file name, and every page renders again with the new name (see [Cache busting](#cache-busting)).

An entry's fields are `doc.fields?.description` in client code. Treat them as text, like the rest of the index: do not set them with `innerHTML`.

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
      "content": "Node.js 22.20 or later on the 22.x line, or 24 and later…",
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
| `url` | `string` | Page URL path, relative to the site root |
| `anchor` | `string` | Section anchor (heading ID), empty for page-level entries |
| `title` | `string` | Page title from front matter (the page slug if there is none) |
| `heading` | `string` | Section heading text |
| `level` | `number` | Heading level (1 for page title, 2-6 for headings) |
| `content` | `string` | Text content of the section (stripped of markdown) |
| `breadcrumb` | `string` | Breadcrumb for display, built from the URL folders, the page title and (for sections) the heading |
| `tags` | `string[]` | Optional tags from front matter |
| `fields` | `object` | The front matter values listed in the `fields` option, on page-level entries only |

## Template access

Access the search index path in your templates via `stati.assets.searchIndexPath`:

```eta
<% if (stati.assets.searchIndexPath) { %>
<script>
  window.SEARCH_INDEX_PATH = '<%= stati.url(stati.assets.searchIndexPath) %>';
</script>
<% } %>
```

## Auto-injected meta tag

When `autoInjectMetaTag` is enabled (default), Stati automatically injects a meta tag into your HTML:

```html
<meta name="stati:search-index" content="/search-index-a1b2c3d4.json">
```

On a site [served from a subfolder](/advanced/deploying-to-a-subfolder), the path in the tag includes the base path (`/docs/search-index-a1b2c3d4.json`), while the index file is still written at the root of `dist/`. The `url` of each entry stays relative to the site root, so client code adds the base path to the links it builds; a template can hand it over with `<body data-base-path="<%= stati.url('/') %>">`.

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

## Index size

Lower `maxContentLength` and `maxPreviewLength`, fewer `headingLevels` and more `exclude` patterns give a smaller index with less context per result.

## Draft pages

Draft pages (pages with `draft: true` in front matter) are never in the search index. Drafts are normally not built at all; with `stati build --include-drafts` they are rendered but still left out of the index.
