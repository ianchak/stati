# Stati Configuration

This document provides comprehensive documentation for all configuration options available in Stati.

## Configuration File

Stati looks for configuration files in the following order:

1. `stati.config.ts` (TypeScript)
2. `stati.config.js` (JavaScript ES Module)
3. `stati.config.mjs` (JavaScript ES Module)

## Configuration Structure

```typescript
import type { StatiConfig } from 'stati';

const config: StatiConfig = {
  // Directory configuration
  srcDir: 'site', // Source content directory
  outDir: 'dist', // Output directory for generated site
  templateDir: 'templates', // Template files directory
  staticDir: 'public', // Static assets directory

  // Site metadata
  site: {
    title: 'My Site',
    baseUrl: 'https://example.com',
    defaultLocale: 'en',
  },

  // Template engine configuration
  eta: {
    filters: {
      // Custom template filters
    },
  },

  // Markdown processing
  markdown: {
    configure: (md) => {
      // Configure MarkdownIt instance
    },
  },

  // Incremental Static Generation
  isg: {
    enabled: true,
    ttlSeconds: 3600,
    maxAgeCapDays: 365,
    aging: [],
  },

  // Build lifecycle hooks
  hooks: {
    beforeAll: async (ctx) => {},
    afterAll: async (ctx) => {},
    beforeRender: async (ctx) => {},
    afterRender: async (ctx) => {},
  },
};

export default config;
```

## Directory Configuration

### `srcDir` (string, default: 'site')

The directory containing your content files (Markdown, etc.).

```typescript
{
  srcDir: 'src/site'; // Look for content in src/site/
}
```

### `outDir` (string, default: 'dist')

The output directory where the generated static site will be placed.

```typescript
{
  outDir: 'build'; // Output to build/ directory
}
```

### `templateDir` (string, default: 'templates')

The directory containing your template files (.eta files by default).

```typescript
{
  templateDir: 'src/templates';
}
```

### `staticDir` (string, default: 'public')

The directory containing static assets (CSS, images, etc.) that should be copied to the output directory.

```typescript
{
  staticDir: 'assets';
}
```

## Site Configuration

### `site.title` (string, required)

The title of your site, used in templates and metadata.

```typescript
{
  site: {
    title: 'My Awesome Blog';
  }
}
```

### `site.baseUrl` (string, required)

The base URL for your site, used for generating absolute URLs.

```typescript
{
  site: {
    baseUrl: 'https://myblog.com';
  }
}
```

### `site.defaultLocale` (string, optional)

Default locale for internationalization.

```typescript
{
  site: {
    defaultLocale: 'en-US';
  }
}
```

## Template Engine Configuration

### `eta.filters` (object, optional)

Custom filters for the Eta template engine.

```typescript
{
  eta: {
    filters: {
      uppercase: (str: string) => str.toUpperCase(),
      formatDate: (date: Date) => date.toLocaleDateString()
    }
  }
}
```

Usage in templates:

```html
<h1><%= title | uppercase %></h1>
<time><%= publishedAt | formatDate %></time>
```

## Markdown Configuration

### `markdown.configure` (function, optional)

Function to configure the MarkdownIt instance with plugins and options.

```typescript
import markdownItAnchor from 'markdown-it-anchor';
import markdownItToc from 'markdown-it-toc-done-right';

{
  markdown: {
    configure: (md) => {
      md.use(markdownItAnchor);
      md.use(markdownItToc);

      // Configure options
      md.set({
        html: true,
        breaks: true,
        linkify: true,
      });
    };
  }
}
```

## Incremental Static Generation (ISG)

### `isg.enabled` (boolean, default: true)

Whether to enable ISG caching features.

```typescript
{
  isg: {
    enabled: false; // Disable ISG completely
  }
}
```

### `isg.ttlSeconds` (number, default: 3600)

Default cache time-to-live in seconds (1 hour by default).

```typescript
{
  isg: {
    ttlSeconds: 86400; // Cache for 24 hours
  }
}
```

### `isg.maxAgeCapDays` (number, default: 365)

Maximum age in days for applying aging rules.

```typescript
{
  isg: {
    maxAgeCapDays: 30; // Only apply aging rules for content up to 30 days old
  }
}
```

### `isg.aging` (AgingRule[], optional)

Array of aging rules for progressive cache extension based on content age.

```typescript
{
  isg: {
    aging: [
      { untilDays: 7, ttlSeconds: 86400 }, // 1 day cache for content 0-7 days old
      { untilDays: 30, ttlSeconds: 604800 }, // 1 week cache for content 7-30 days old
      { untilDays: 365, ttlSeconds: 2592000 }, // 1 month cache for content 30-365 days old
    ];
  }
}
```

## Build Lifecycle Hooks

Hooks allow you to inject custom logic at various stages of the build process.

### `hooks.beforeAll` (function, optional)

Called before starting the build process.

```typescript
{
  hooks: {
    beforeAll: async (ctx) => {
      console.log(`Starting build with ${ctx.pages.length} pages`);
      // Initialize external services, validate data, etc.
    };
  }
}
```

### `hooks.afterAll` (function, optional)

Called after completing the build process.

```typescript
{
  hooks: {
    afterAll: async (ctx) => {
      console.log('Build complete!');
      // Generate sitemaps, deploy, send notifications, etc.
    };
  }
}
```

### `hooks.beforeRender` (function, optional)

Called before rendering each individual page.

```typescript
{
  hooks: {
    beforeRender: async (ctx) => {
      // Add build timestamp to all pages
      ctx.page.frontMatter.buildTime = new Date().toISOString();

      // Add reading time estimation
      const wordCount = ctx.page.content.split(/\s+/).length;
      ctx.page.frontMatter.readingTime = Math.ceil(wordCount / 200);
    };
  }
}
```

### `hooks.afterRender` (function, optional)

Called after rendering each individual page.

```typescript
{
  hooks: {
    afterRender: async (ctx) => {
      console.log(`Rendered page: ${ctx.page.slug}`);
      // Post-process HTML, validate output, etc.
    };
  }
}
```

## Front Matter Configuration

Individual pages can override global ISG settings using front matter:

```yaml
---
title: 'My Post'
description: 'A great post'
tags: ['blog', 'tutorial']
layout: 'post'
order: 1
publishedAt: '2024-01-01'
ttlSeconds: 7200 # Override global TTL
maxAgeCapDays: 60 # Override global max age cap
draft: false # Exclude from build if true
---
```

## Environment-Specific Configuration

You can create different configurations for different environments:

```typescript
// stati.config.ts
const isDev = process.env.NODE_ENV === 'development';

const config: StatiConfig = {
  site: {
    title: 'My Site',
    baseUrl: isDev ? 'http://localhost:3000' : 'https://mysite.com',
  },
  isg: {
    enabled: !isDev, // Disable ISG in development
    ttlSeconds: isDev ? 0 : 3600,
  },
};

export default config;
```

## Complete Example

```typescript
import type { StatiConfig } from 'stati';
import markdownItAnchor from 'markdown-it-anchor';

const config: StatiConfig = {
  srcDir: 'content',
  outDir: 'dist',
  templateDir: 'templates',
  staticDir: 'public',

  site: {
    title: 'Tech Blog',
    baseUrl: 'https://techblog.example.com',
    defaultLocale: 'en-US',
  },

  markdown: {
    configure: (md) => {
      md.use(markdownItAnchor, {
        permalink: true,
        permalinkBefore: true,
        permalinkSymbol: '#',
      });
    },
  },

  eta: {
    filters: {
      formatDate: (date: Date) => {
        return new Intl.DateTimeFormat('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }).format(date);
      },
      excerpt: (content: string, length = 150) => {
        return content.slice(0, length) + '...';
      },
    },
  },

  isg: {
    enabled: true,
    ttlSeconds: 1800, // 30 minutes
    maxAgeCapDays: 90,
    aging: [
      { untilDays: 1, ttlSeconds: 300 }, // 5 minutes for fresh content
      { untilDays: 7, ttlSeconds: 1800 }, // 30 minutes for week-old content
      { untilDays: 30, ttlSeconds: 7200 }, // 2 hours for month-old content
      { untilDays: 90, ttlSeconds: 86400 }, // 24 hours for older content
    ],
  },

  hooks: {
    beforeAll: async (ctx) => {
      console.log(`🚀 Building ${ctx.pages.length} pages...`);
    },

    beforeRender: async (ctx) => {
      // Add reading time to all posts
      if (ctx.page.frontMatter.layout === 'post') {
        const wordCount = ctx.page.content.split(/\s+/).length;
        ctx.page.frontMatter.readingTime = Math.ceil(wordCount / 200);
      }
    },

    afterAll: async (ctx) => {
      console.log(`✅ Build complete! Generated ${ctx.pages.length} pages.`);
    },
  },
};

export default config;
```
