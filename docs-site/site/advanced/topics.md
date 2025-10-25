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

Stati includes built-in support for SEO optimization, sitemap generation, and robots.txt creation. For comprehensive documentation on these features, see:

- [SEO Configuration](/configuration/seo/) - Configure automatic SEO meta tags, Open Graph, Twitter Cards, and Schema.org
- [SEO API](/api/seo/) - Use the `generateSEO()` function in templates
- [SEO Usage Scenarios](/advanced/seo-usage-scenarios/) - Real-world examples and patterns

These built-in features handle sitemap.xml and robots.txt generation automatically based on your configuration.

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
<%= stati.page.title %>     <!-- Page title -->
<%= stati.content %>        <!-- Rendered markdown content -->
<%= stati.page.url %>       <!-- Page URL -->
<%= stati.page %>           <!-- Full page object with frontMatter properties -->

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
