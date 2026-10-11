---
title: Search Index Configuration
description: Learn how to configure and generate a search index for your Stati site
order: 7
---

# Search Index Configuration

Stati can generate a JSON search index at build time, enabling client-side search functionality for your static site.

## Overview

Search index generation in Stati:

- **Build-time generation**: Search index is generated during the build process
- **Section-level indexing**: Extracts searchable sections from markdown headings
- **Cache-friendly**: Hash-based filenames for optimal cache busting
- **Auto-discovery**: Automatically injects a meta tag for client-side discovery
- **Configurable**: Control heading levels, content length, and exclusions

## Basic Configuration

Enable search index generation in your `stati.config.ts`:

```typescript
import { defineConfig } from '@stati/core';

export default defineConfig({
  search: {
    enabled: true,
  },
});
```

This generates a `search-index-[hash].json` file in your output directory containing all your pages.

## Configuration Options

### Full Configuration Example

```typescript
import { defineConfig } from '@stati/core';

export default defineConfig({
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

### Option Reference

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | `boolean` | `false` | Enable search index generation |
| `indexName` | `string` | `'search-index'` | Base filename for the search index (without extension) |
| `hashFilename` | `boolean` | `true` | Include content hash in filename for cache busting |
| `maxContentLength` | `number` | `1000` | Maximum content length per section (in characters) |
| `maxPreviewLength` | `number` | `500` | Maximum preview length for page-level entries (in characters) |
| `headingLevels` | `number[]` | `[2, 3, 4, 5, 6]` | Heading levels to include in the index |
| `exclude` | `string[]` | `[]` | Glob patterns for pages to exclude |
| `includeHomePage` | `boolean` | `false` | Include the home page in the search index |
| `autoInjectMetaTag` | `boolean` | `true` | Auto-inject search index meta tag into HTML |

## Content Filtering

### Exclude Pages

Use `exclude` patterns to exclude specific content from the search index:

```typescript
search: {
  enabled: true,
  exclude: [
    '/private/**',      // Exclude all pages under /private/
    '/admin/**',        // Exclude admin pages
    '/api/**',          // Exclude API documentation
  ],
}
```

### Include Home Page

By default, the home page is excluded from the search index. To include it:

```typescript
search: {
  enabled: true,
  includeHomePage: true,
}
```

### Control Heading Levels

Specify which heading levels to index:

```typescript
search: {
  enabled: true,
  headingLevels: [2, 3],  // Only index h2 and h3 headings
}
```

## Search Index Structure

The generated search index is a JSON file with the following structure:

```json
{
  "version": "1.0.0",
  "generatedAt": "2025-01-15T10:30:00.000Z",
  "documentCount": 150,
  "documents": [
    {
      "id": "/getting-started/installation#prerequisites",
      "url": "/getting-started/installation",
      "anchor": "prerequisites",
      "title": "Installation",
      "heading": "Prerequisites",
      "level": 2,
      "content": "Before installing Stati, ensure you have Node.js 22 or later...",
      "breadcrumb": "Getting Started > Installation",
      "tags": ["setup", "installation"]
    }
  ]
}
```

### Document Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique identifier (page URL + section anchor) |
| `url` | `string` | Page URL path |
| `anchor` | `string` | Section anchor (heading ID), empty for page-level entries |
| `title` | `string` | Page title from frontmatter |
| `heading` | `string` | Section heading text |
| `level` | `number` | Heading level (1 for page title, 2-6 for headings) |
| `content` | `string` | Text content of the section (stripped of markdown) |
| `breadcrumb` | `string` | Breadcrumb path for display |
| `tags` | `string[]` | Optional tags from frontmatter |

## Template Access

Access the search index path in your templates via `stati.assets.searchIndexPath`:

```html
<% if (stati.assets.searchIndexPath) { %>
<script>
  window.SEARCH_INDEX_PATH = '<%= stati.assets.searchIndexPath %>';
</script>
<% } %>
```

## Auto-Injected Meta Tag

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

## Implementing Client-Side Search

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

## Cache Busting

When `hashFilename` is enabled (default), the search index filename includes a hash:

```text
search-index-a1b2c3d4.json
```

This ensures browsers fetch the latest version when your content changes. The hash is deterministic per build, so the filename remains consistent within a single build but changes between builds when content is updated.

To disable hash-based filenames:

```typescript
search: {
  enabled: true,
  hashFilename: false,  // Generates 'search-index.json'
}
```

## Performance Considerations

### Content Length

The `maxContentLength` and `maxPreviewLength` options control how much text is included in the index:

```typescript
search: {
  enabled: true,
  maxContentLength: 500,   // Shorter sections for smaller index
  maxPreviewLength: 200,   // Shorter previews
}
```

Smaller values result in a smaller index file but less context for search results.

### Heading Levels

Limiting heading levels reduces the number of documents in the index:

```typescript
search: {
  enabled: true,
  headingLevels: [2],  // Only index h2 headings
}
```

### Excluding Content

Exclude non-essential pages to keep the index focused:

```typescript
search: {
  enabled: true,
  exclude: [
    '/changelog/**',
    '/license',
    '/404',
  ],
}
```

## Draft Pages

Draft pages (pages with `draft: true` in frontmatter) are automatically excluded from the search index, regardless of other configuration settings.
