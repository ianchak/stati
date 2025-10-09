---
title: 'Performance'
description: 'Explore advanced Stati features including performance optimization, SEO, and complex deployment scenarios.'
order: 1
---

# Advanced Topics

This section covers advanced Stati features and patterns for building high-performance, production-ready static sites. These topics are designed for users who want to push Stati to its limits and implement sophisticated site architectures.

## Performance Optimization

### Build Performance with ISG

Stati uses **Incremental Static Generation (ISG)** for smart caching and faster rebuilds. For comprehensive ISG configuration, see the [ISG documentation](/core-concepts/isg/).

#### Build Options for Performance

```javascript
// Force rebuild to clear all caches
await build({ force: true, clean: true });

// Incremental build using ISG cache
await build({ force: false });
```

### Template Performance

#### Eta Template Optimization

Stati uses the Eta template engine with built-in performance features and automatic template caching via ISG.

For detailed template configuration and `propValue` utility documentation, see [Template Configuration](/configuration/templates/).

#### Static Asset Optimization

```javascript
export default defineConfig({
  // Static assets are copied efficiently
  staticDir: 'public', // Default static assets directory

  hooks: {
    afterAll: async (ctx) => {
      // Custom asset processing after build
      console.log(`Copied ${ctx.config.staticDir} assets`);
    }
  }
});
```

## SEO and Metadata

### Template-Based Meta Tags

Stati provides the page context in templates for SEO optimization:

```eta
<head>
  <!-- Basic SEO with Stati page context -->
  <title><%= stati.title ? `${stati.title} | ${stati.site.title}` : stati.site.title %></title>
  <meta name="description" content="<%= stati.description || stati.site.description %>">
  <link rel="canonical" href="<%= stati.site.baseUrl + stati.url %>">

  <!-- Open Graph -->
  <meta property="og:type" content="<%= stati.type || 'website' %>">
  <meta property="og:title" content="<%= stati.title || stati.site.title %>">
  <meta property="og:description" content="<%= stati.description || stati.site.description %>">
  <meta property="og:url" content="<%= stati.site.baseUrl + stati.url %>">
  <meta property="og:site_name" content="<%= stati.site.title %>">

  <% if (stati.image) { %>
  <meta property="og:image" content="<%= stati.site.baseUrl + stati.image %>">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <% } %>

  <!-- Twitter Cards -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="<%= stati.title || stati.site.title %>">
  <meta name="twitter:description" content="<%= stati.description || stati.site.description %>">
  <% if (stati.site.social && stati.site.social.twitter) { %>
  <meta name="twitter:site" content="<%= stati.site.social.twitter %>">
  <% } %>

  <!-- Schema.org JSON-LD -->
  <script type="application/ld+json">
  <%
  const schema = {
    "@context": "https://schema.org",
    "@type": stati.schemaType || "WebPage",
    "name": stati.title || stati.site.title,
    "description": stati.description || stati.site.description,
    "url": stati.site.baseUrl + stati.url
  };

  if (stati.author) {
    schema.author = {
      "@type": "Person",
      "name": stati.author
    };
  }

  if (stati.date) {
    schema.datePublished = stati.date;
    schema.dateModified = stati.lastModified || stati.date;
  }
  %>
  <%~ JSON.stringify(schema, null, 2) %>
  </script>
</head>
```

### Build Hooks for SEO Assets

Stati's build hooks enable custom SEO asset generation:

```javascript
import fs from 'fs';

export default defineConfig({
  site: {
    title: 'My Stati Site',
    baseUrl: 'https://example.com',
  },

  hooks: {
    afterAll: async (ctx) => {
      // Generate sitemap.xml
      const sitemap = generateSitemap(ctx.pages, ctx.config.site);
      fs.writeFileSync('dist/sitemap.xml', sitemap);

      // Generate robots.txt
      const robots = `User-agent: *
Allow: /

Sitemap: ${ctx.config.site.baseUrl}/sitemap.xml`;
      fs.writeFileSync('dist/robots.txt', robots);
    },
  },
});

function generateSitemap(pages, site) {
  const entries = pages
    .map((page) => `  <url>
    <loc>${site.baseUrl}${page.url}</loc>
    <lastmod>${page.date || new Date().toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`)
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>`;
}
```

For comprehensive build hook documentation and examples, see the [Build Hooks API](/api/hooks/).

## Development and Deployment

### Environment-Based Configuration

```javascript
// stati.config.js - Environment-specific setup
import { defineConfig, getEnv } from '@stati/core';

const isDev = getEnv() === 'development';
const isProd = getEnv() === 'production';

export default defineConfig({
  site: {
    title: 'My Site',
    baseUrl: isProd ? 'https://mysite.com' : 'http://localhost:3000',
  },

  // ISG configuration per environment
  isg: {
    enabled: isProd, // Only enable caching in production
    ttlSeconds: isProd ? 3600 : 0, // No cache in development
  },

  hooks: {
    beforeAll: async (ctx) => {
      if (isDev) {
        console.log('Development build started');
      }
    },

    afterAll: async (ctx) => {
      if (isProd) {
        // Production-only tasks
        console.log('Production build completed');
      }
    }
  }
});
```

For comprehensive development server and ISG configuration options, see the [Configuration Guide](/configuration/file/).

## Markdown Processing

For detailed markdown configuration including custom plugins and renderer modifications, see the [Markdown Configuration](/configuration/markdown/) documentation.

## Error Handling and Build Hooks

### Development Error Handling

Stati provides error overlays during development to help with debugging:

```javascript
// Template errors are automatically caught and displayed
export default defineConfig({
  dev: {
    port: 3000,
    open: true, // Opens browser with error overlay on build failures
  },

  hooks: {
    beforeRender: async (ctx) => {
      try {
        // Validate page data
        if (!ctx.page.frontMatter.title) {
          throw new Error(`Missing title in ${ctx.page.sourcePath}`);
        }
      } catch (error) {
        // Errors in hooks are displayed in the error overlay
        console.error(`Page validation failed: ${error.message}`);
        throw error;
      }
    }
  }
});
```

### Cache Management and Invalidation

For detailed cache management, see the [ISG documentation](/core-concepts/isg/) which covers all invalidation features and query syntax.

## Template Engine Features

### Advanced Template Context

Every template receives the `stati` object with comprehensive page and site data:

```eta
<!-- Enhanced template context beyond basic usage -->
<%= stati.title %>          <!-- Page title -->
<%= stati.content %>        <!-- Rendered markdown content -->
<%= stati.url %>            <!-- Page URL -->
<%= stati.frontMatter %>    <!-- Full front matter object -->

<%= stati.site.title %>     <!-- Site title -->
<%= stati.site.baseUrl %>   <!-- Site base URL -->

<%= stati.nav %>            <!-- Auto-generated navigation -->
<%= stati.collection %>     <!-- Collection data (for index pages) -->
```

For comprehensive template configuration including Eta filters, see the [Template Configuration](/configuration/templates/) documentation.

These advanced topics showcase Stati's core capabilities for building sophisticated static sites. The framework emphasizes:

- **Smart Caching** with ISG for optimal build performance
- **Flexible Build Hooks** for custom build pipeline integration
- **Template-First SEO** with rich context and metadata support
- **Developer-Friendly** error handling and development workflow
- **TypeScript-First** configuration with full type safety

For specific implementation details, refer to the [API Reference](/api/reference/) or explore the [Configuration Guide](/configuration/file/) for complete setup instructions.
