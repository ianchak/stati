# Stati Configuration

> **📌 This is the authoritative configuration reference for Stati.** All configuration options are documented here. Other documentation files reference this guide rather than duplicating configuration details.

This document provides comprehensive documentation for all configuration options available in Stati.

## Configuration File

Stati looks for configuration files in the following order:

1. `stati.config.ts` (TypeScript)
2. `stati.config.js` (JavaScript ES Module)
3. `stati.config.mjs` (JavaScript ES Module)

### Helper Function

Stati provides a `defineConfig` helper function for better TypeScript IntelliSense and validation:

```typescript
import { defineConfig } from 'stati';

export default defineConfig({
  site: {
    title: 'My Site',
    baseUrl: 'https://example.com',
  },
  // Configuration options...
});
```

The `defineConfig` function is a simple helper that returns the configuration object with proper TypeScript typing. It enables:

- **Full IntelliSense**: Autocompletion for all configuration options
- **Type checking**: Compile-time validation of configuration values
- **Documentation**: Hover tooltips with option descriptions
- **Error detection**: Immediate feedback on invalid configurations

You can also use the type directly without the helper:

```typescript
import type { StatiConfig } from 'stati';

const config: StatiConfig = {
  // Configuration options...
};

export default config;
```

## Configuration Structure

```typescript
import type { StatiConfig } from 'stati';

const config: StatiConfig = {
  // Directory configuration
  srcDir: 'site', // Source content directory
  outDir: 'dist', // Output directory for generated site
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

The directory containing your content files (Markdown, etc.) and templates.

**Folder Structure Rules:**

- `.md` files create routes based on their path
- `.eta` files provide layouts and templates
- Folders starting with `_` are excluded from routing (perfect for partials)
- Partials in `_` folders are auto-discovered and provided to templates

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

## Template System

Stati uses the Eta template engine for rendering layouts and templates. The template system follows a hierarchical structure with clear placement rules and resolution order.

### Template Types

**Layout Files (`layout.eta`)**

- Applied automatically to all content in their directory and subdirectories
- Cascade through the directory hierarchy (child layouts inherit from parent layouts)
- Can be overridden by placing a new `layout.eta` file in a subdirectory
- Perfect for section-specific styling and structure

**Collection Index Files (`index.eta`)**

- Specialized templates for collection aggregation pages (pages that list child content)
- Only applied to pages that contain other pages (collection index pages)
- Receive full collection data for listing, filtering, and organizing child content
- Fall back to `layout.eta` if not present
- Perfect for blog indexes, news aggregation, and documentation overviews

**Named Template Files (e.g., `post.eta`, `article.eta`)**

- Used when explicitly specified in front matter: `layout: 'post'`
- Can be placed anywhere in the `srcDir` structure
- Take precedence over `layout.eta` and `index.eta` files when specified
- Ideal for content-type-specific templates

### Template Resolution Order

When Stati processes a markdown file, it looks for templates in this order:

1. **Explicit Layout**: If `layout: 'templatename'` is specified in front matter, use `templatename.eta`
2. **Directory Layout**: Look for `layout.eta` in the current directory, then parent directories (cascading up to root)
3. **Built-in Fallback**: Use Stati's minimal built-in template if no templates are found

### Template Placement Examples

```
site/
├── post.eta                 # Named template for blog posts
├── article.eta              # Named template for articles
├── layout.eta               # Root layout for all pages (fallback)
├── index.md                 # Uses layout.eta
├── blog/
│   ├── layout.eta           # Layout for all blog pages
│   ├── my-post.md           # Uses blog/layout.eta
│   └── tech/
│       ├── layout.eta       # Overrides parent layout for tech posts
│       └── latest.md        # Uses blog/tech/layout.eta
└── docs/
    ├── layout.eta           # Layout for all documentation
    ├── guide.md             # Uses docs/layout.eta
    └── api.md               # layout: 'article' → uses article.eta
```

### Partials and Components

**Underscore Folders (`_*`)**

- Any folder starting with `_` is excluded from routing
- Perfect for organizing partials, components, and utilities
- Partials are auto-discovered and available to all templates in the hierarchy

**Hierarchical Partial Discovery**

- Templates automatically have access to partials from all parent directories
- Enables powerful composition where child layouts inherit global and context-specific components

```
site/
├── _partials/
│   ├── navbar.eta           # Available globally
│   └── footer.eta           # Available globally
├── blog/
│   ├── _components/
│   │   └── post-card.eta    # Available to blog/ and subdirectories
│   └── +layout.eta          # Can use navbar, footer, and post-card
└── docs/
    ├── _widgets/
    │   └── toc.eta          # Available only to docs/
    └── +layout.eta          # Can use navbar, footer, and toc
```

### Collection Index Templates

**Using `index.eta` for Collection Pages**

Collection index pages automatically receive aggregated data about their child content. Use `index.eta` to create specialized templates for listing and organizing content.

```eta
<!-- blog/index.eta - Blog listing page -->
<h1>Latest Blog Posts</h1>

<% if (it.collection?.recentPages) { %>
  <div class="posts">
    <% it.collection.recentPages.forEach(post => { %>
      <article class="post-card">
        <h2><a href="<%= post.url %>"><%= post.title %></a></h2>
        <time><%= post.date %></time>
        <p><%= post.excerpt || post.description %></p>
      </article>
    <% }) %>
  </div>
<% } %>
```

**Collection Data Available to Index Templates**

- `collection.pages` - All child pages
- `collection.children` - Direct child pages only
- `collection.recentPages` - Pages sorted by date (newest first)
- `collection.pagesByTag` - Pages grouped by tags

```eta
<!-- docs/index.eta - Documentation overview -->
<h1>Documentation</h1>

<% if (it.collection?.children) { %>
  <nav class="doc-sections">
    <% it.collection.children.forEach(section => { %>
      <div class="section">
        <h3><a href="<%= section.url %>"><%= section.title %></a></h3>
        <p><%= section.description %></p>
      </div>
    <% }) %>
  </nav>
<% } %>
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

Stati supports two approaches for configuring markdown processing:

### `markdown.plugins` (array, optional)

Array of markdown-it plugins to load automatically. Each item can be either:

- A string (plugin name without the `markdown-it-` prefix)
- A tuple `[pluginName, options]` for plugins that require configuration

```typescript
{
  markdown: {
    plugins: [
      'anchor', // Uses markdown-it-anchor plugin
      'task-lists', // Uses markdown-it-task-lists plugin
      [
        'external-links',
        {
          // Uses markdown-it-external-links with options
          externalTarget: '_blank',
          externalRel: 'noopener noreferrer',
        },
      ],
    ];
  }
}
```

### `markdown.configure` (function, optional)

Function to configure the MarkdownIt instance with plugins and options. This provides full control over the markdown processor and runs after any plugins from the `plugins` array.

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

### Using Both Approaches Together

You can combine both approaches - plugins from the `plugins` array are loaded first, then the `configure` function runs for any additional customization:

```typescript
{
  markdown: {
    plugins: ['anchor', 'task-lists'],  // Load basic plugins automatically
    configure: (md) => {                // Additional configuration
      md.set({ breaks: true });
      // Add custom rendering rules, etc.
    }
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

---

## CLI Reference

### `stati build`

Builds the static site with Incremental Static Generation support.

**Usage:**

```bash
stati build [options]
```

**Options:**

- `--force` - Forces a full rebuild, ignoring existing cache
- `--clean` - Wipes the cache directory before building
- `--include-drafts` - Includes pages marked with `draft: true` in the build
- `--invalidateTag <tag>` - Invalidates all pages with the specified tag
- `--invalidatePath <path>` - Invalidates the page at the specified path

**Examples:**

```bash
# Normal incremental build
stati build

# Force full rebuild
stati build --force

# Clean cache and rebuild
stati build --clean

# Include draft pages
stati build --include-drafts

# Invalidate specific content
stati build --invalidateTag "blog"
stati build --invalidatePath "/posts/my-post"
```

**Output:**

The build command displays comprehensive statistics upon completion, including:

- Build time and performance metrics
- Number of pages processed and assets copied
- Total output size and cache efficiency
- Cache hit/miss rates (when ISG is enabled)

These statistics help monitor site performance and validate caching strategies.

### `stati dev` _(Planned)_

Starts a development server with live reload and incremental rebuilds.

**Usage:**

```bash
stati dev [options]
```

**Features:**

- Serves the built site locally
- Watches source files for changes
- Performs incremental rebuilds using ISG
- Triggers full-page reload on changes

---

## Complete Example

```typescript
import { defineConfig } from 'stati';
import markdownItAnchor from 'markdown-it-anchor';

export default defineConfig({
  srcDir: 'site',
  outDir: 'dist',
  staticDir: 'public',

  site: {
    title: 'Tech Blog',
    baseUrl: 'https://techblog.example.com',
    defaultLocale: 'en-US',
  },

  markdown: {
    plugins: ['task-lists', ['external-links', { externalTarget: '_blank' }]],
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
      formatDate: (date: unknown) => {
        if (!(date instanceof Date)) return String(date);
        return new Intl.DateTimeFormat('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }).format(date);
      },
      excerpt: (content: unknown, length: unknown = 150) => {
        const text = String(content);
        const maxLength = typeof length === 'number' ? length : 150;
        return text.length > maxLength ? text.slice(0, maxLength) + '...' : text;
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
});
```
