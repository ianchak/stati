---
title: 'Advanced topics'
description: 'Explore advanced Stati features including performance optimization, SEO, and complex deployment scenarios.'
order: 1
---

# Advanced topics

This section covers Stati features and patterns that go beyond the basics: build performance, SEO, environment-specific configuration, error handling and the template context.

## Build optimization

### Build caching with ISG

Stati uses **Incremental Static Generation (ISG)** for smart caching and selective rebuilds. For comprehensive ISG configuration, see the [ISG documentation](/core-concepts/isg).

#### Build options for performance

```javascript
import { build, setEnv } from '@stati/core';

// build() runs a development build unless the environment is set first
setEnv('production');

// Clean the output and cache, then render every page
await build({ force: true, clean: true });

// Incremental build using the ISG cache
await build({ force: false });
```

### Template performance

#### Eta template optimization

Eta caches compiled templates in memory; the dev server keeps them between rebuilds and clears them when a template changes. This is separate from ISG, which caches rendered pages between builds.

For detailed template configuration and `propValue` utility documentation, see [Template Configuration](/configuration/templates) and [`stati.propValue()`](/api/templates#stati-propvalue-args).

## SEO and metadata

Stati includes built-in support for SEO optimization, sitemap generation, and robots.txt creation. For comprehensive documentation on these features, see:

- [SEO Configuration](/configuration/seo) - Configure automatic SEO meta tags, Open Graph, Twitter Cards, and Schema.org
- [SEO API](/api/seo) - Use the `generateSEO()` function in templates
- [SEO Usage Scenarios](/advanced/seo-usage-scenarios) - Real-world examples and patterns

## Development and deployment

### Environment-based configuration

For settings that differ between `stati dev` and `stati build`, see [Environment-specific configuration](/examples/recipes#environment-specific-configuration).

For comprehensive development server and ISG configuration options, see the [configuration file guide](/configuration/file).

## Markdown processing

For detailed markdown configuration including custom plugins and renderer modifications, see the [Markdown Configuration](/configuration/markdown) documentation.

## Error handling and build hooks

### Development error handling

Stati provides error overlays during development to help with debugging:

```javascript
import { defineConfig } from '@stati/core';

// Template errors are automatically caught and displayed
export default defineConfig({
  dev: {
    port: 3000,
    open: true, // Opens the browser when the dev server starts
  },

  hooks: {
    beforeRender: async (ctx) => {
      if (!ctx.page.frontMatter.title) {
        // A thrown error fails the build; stati dev shows it in the error overlay
        throw new Error(`Missing title in ${ctx.page.sourcePath}`);
      }
    }
  }
});
```

### Cache management and invalidation

For detailed cache management, see [Cache invalidation](/configuration/isg#cache-invalidation), which covers all invalidation features and query syntax.

## Template engine features

### Advanced template context

Every template receives the `stati` object with page and site data:

```eta
<%= stati.page.title %>     <!-- Page title -->
<%~ stati.content %>        <!-- Rendered Markdown content (HTML) -->
<%= stati.page.url %>       <!-- Page URL -->
<%= stati.site.title %>     <!-- Site title -->
<%= stati.site.baseUrl %>   <!-- Site base URL -->
```

These members are objects, so read their properties rather than printing them:

- `stati.page`: the current page, with every front matter field, `url`, `toc`, `navNode`, `wordCount` and `readingTime`
- `stati.nav`: the navigation tree and helpers such as `getChildren()` and `getBreadcrumbs()`
- `stati.collection`: the pages of the page's collection (a folder's `index.md` and the pages in that folder, or the one named by `collection` in front matter)

For comprehensive template configuration including template helpers, see the [Template Configuration](/configuration/templates) documentation.
