---
title: 'Configuration File'
description: 'Learn how to configure Stati with the stati.config.js (or stati.config.ts) file and available options.'
order: 1
---

# Configuration

Stati is designed to work great out of the box, but it's also highly configurable. The `stati.config.js` file (or `stati.config.ts` for TypeScript projects) is where you customize every aspect of your site's behavior, from basic metadata to advanced build optimizations.

## Configuration File

### Basic Setup

Create `stati.config.js` in your project root:

```javascript
import { defineConfig } from '@stati/core';

export default defineConfig({
  site: {
    title: 'My Stati Site',
    baseUrl: 'https://my-site.com',
    defaultLocale: 'en-US',
  },
});
```

### TypeScript Configuration

For full type safety, use `stati.config.ts`:

```typescript
import { defineConfig } from '@stati/core';
import type { StatiConfig } from '@stati/core';

const config: StatiConfig = {
  site: {
    title: 'My Stati Site',
    baseUrl: 'https://my-site.com',
    defaultLocale: 'en-US',
  },

  // Full type safety for all options
  markdown: {
    options: {
      html: true,
      linkify: true,
      typographer: true,
    },
  },
};

export default defineConfig(config);
```

## Configuration Sections

### Site Metadata

The foundation of your site configuration:

```javascript
export default defineConfig({
  site: {
    title: 'Stati Documentation',        // Required
    baseUrl: 'https://stati.dev',         // Required
    defaultLocale: 'en-US',               // Optional
  },
});
```

**Required Fields:**
- `title` (string) - The site's title, used in templates and metadata
- `baseUrl` (string) - Base URL for the site, used for absolute URL generation

**Optional Fields:**
- `defaultLocale` (string) - Default locale for internationalization (e.g., 'en-US', 'fr-FR')

### Markdown Configuration

Configure markdown processing with plugins and custom renderer modifications:

```javascript
export default defineConfig({
  markdown: {
    // Plugin configuration - array of plugin names or [name, options] tuples
    plugins: [
      'anchor',                    // markdown-it-anchor - Add anchors to headings
      'toc-done-right',           // markdown-it-toc-done-right - Table of contents
      ['footnote', { /* options */ }],  // markdown-it-footnote - Footnotes with options
    ],

    // Custom markdown-it configuration function
    configure: (md) => {
      // Add custom plugins or modify renderer
      md.use(customPlugin, options);

      // Modify rendering rules
      md.renderer.rules.code_inline = (tokens, idx) => {
        const token = tokens[idx];
        return `<code class="inline-code">${token.content}</code>`;
      };
    },
  },
});
```

**Available Options:**
- `plugins` (array) - Array of markdown-it plugin names (strings) or [name, options] tuples
- `configure` (function) - Function that receives the markdown-it instance for custom configuration

### Template Configuration

Configure the Eta template engine:

```javascript
export default defineConfig({
  eta: {
    // Custom filters for Eta templates
    filters: {
      // Date formatting
      date: (date, format = 'long') => {
        return new Intl.DateTimeFormat('en-US', {
          dateStyle: format,
        }).format(new Date(date));
      },

      // Slugify text
      slug: (text) => {
        return text
          .toLowerCase()
          .replace(/[^\w\s-]/g, '')
          .replace(/[\s_-]+/g, '-')
          .replace(/^-+|-+$/g, '');
      },

      // Truncate text
      truncate: (text, length = 150) => {
        if (text.length <= length) return text;
        return text.slice(0, length) + '...';
      },
    },
  },
});
```

### ISG Configuration

Configure Incremental Static Generation for smart caching:

```javascript
export default defineConfig({
  isg: {
    // Enable ISG caching
    enabled: true,

    // Default cache TTL in seconds
    ttlSeconds: 3600, // 1 hour

    // Maximum age cap in days
    maxAgeCapDays: 30,

    // Aging rules for progressive cache extension
    aging: [
      { untilDays: 7, ttlSeconds: 86400 },     // 1 day for week-old content
      { untilDays: 30, ttlSeconds: 604800 },   // 1 week for month-old content
      { untilDays: 365, ttlSeconds: 2592000 }, // 30 days for year-old content
    ],
  },
});
```

**Available Options:**
- `enabled` (boolean) - Enable or disable ISG caching (default: false)
- `ttlSeconds` (number) - Default cache time-to-live in seconds (default: 3600)
- `maxAgeCapDays` (number) - Maximum age in days for applying aging rules
- `aging` (array) - Array of aging rules with `untilDays` and `ttlSeconds` properties

**Aging Rules:**

Aging rules allow you to progressively extend cache TTL based on content age. Each rule specifies a time threshold (`untilDays`) and the cache duration (`ttlSeconds`) to apply to content that reaches that age.

```javascript
// Example: older content gets cached longer
aging: [
  { untilDays: 7, ttlSeconds: 86400 },    // 1 day cache for content 7+ days old
  { untilDays: 30, ttlSeconds: 604800 },  // 1 week cache for content 30+ days old
]
```

### Development Server

Configure the development server:

```javascript
export default defineConfig({
  dev: {
    // Server configuration
    port: 3000,        // Port for development server
    host: 'localhost', // Host to bind to
    open: false,       // Whether to open browser automatically
  },
});
```

### Preview Server

Configure the preview server:

```javascript
export default defineConfig({
  preview: {
    // Server configuration
    port: 4000,        // Port for preview server
    host: 'localhost', // Host to bind to
    open: false,       // Whether to open browser automatically
  },
});
```

> **Note:** CLI options (e.g., `stati dev --port 8080` or `stati preview --port 8080`) take precedence over config file settings.

## Advanced Configuration

### Build Hooks

Add custom logic at various stages of the build process:

```javascript
export default defineConfig({
  hooks: {
    // Before build starts - receives BuildContext
    async beforeAll(context) {
      console.log('Starting build...');
      console.log(`Building ${context.pages.length} pages`);
      console.log(`Output directory: ${context.config.outDir}`);
    },

    // After build completes - receives BuildContext
    async afterAll(context) {
      console.log('Build completed!');
      console.log(`Generated ${context.pages.length} pages`);
    },

    // Before each page renders - receives PageContext
    async beforeRender(context) {
      // Add computed properties to the page
      context.page.frontMatter.readingTime = calculateReadingTime(context.page.content);
      context.page.frontMatter.wordCount = countWords(context.page.content);
    },

    // After each page renders - receives PageContext
    async afterRender(context) {
      console.log(`Rendered: ${context.page.slug}`);
    },
  },
});
```

**Available Hooks:**

- `beforeAll` (function) - Called before starting the build process, receives `BuildContext`
- `afterAll` (function) - Called after completing the build process, receives `BuildContext`
- `beforeRender` (function) - Called before rendering each page, receives `PageContext`
- `afterRender` (function) - Called after rendering each page, receives `PageContext`

**Context Types:**

```typescript
// BuildContext - passed to beforeAll and afterAll
interface BuildContext {
  config: StatiConfig;  // The resolved configuration
  pages: PageModel[];   // Array of all loaded pages
}

// PageContext - passed to beforeRender and afterRender
interface PageContext {
  page: PageModel;      // The page being processed
  config: StatiConfig;  // The resolved configuration
}
```

## Environment-based Configuration

You can use environment variables to configure your site differently for development, staging, and production:

```javascript
// stati.config.js
const isDev = process.env.NODE_ENV === 'development';
const isProd = process.env.NODE_ENV === 'production';

export default defineConfig({
  site: {
    title: 'My Site',
    baseUrl: isProd ? 'https://my-site.com' : 'http://localhost:3000',
  },

  // Enable ISG only in production
  isg: {
    enabled: isProd,
    ttlSeconds: isProd ? 3600 : 0,
  },

  // Development server configuration
  dev: {
    port: parseInt(process.env.PORT || '3000'),
    open: isDev,
  },
});
```

### Multiple Configuration Files

You can split configuration across multiple files:

```javascript
// config/base.js
export const baseConfig = {
  site: {
    title: 'My Site',
    baseUrl: 'https://example.com',
  },
};

// stati.config.js
import { baseConfig } from './config/base.js';

export default defineConfig({
  ...baseConfig,

  // Environment-specific overrides
  site: {
    ...baseConfig.site,
    baseUrl: process.env.SITE_URL || baseConfig.site.baseUrl,
  },
});
```

## Best Practices

### Configuration Organization

1. **Keep it readable**

   ```javascript
   // Good: organized and commented
   export default defineConfig({
     // Site metadata
     site: {
       title: 'My Site',
       baseUrl: 'https://example.com',
     },

     // Markdown processing
     markdown: {
       plugins: ['anchor'],  // markdown-it-anchor
     },
   });
   ```

2. **Use environment variables for secrets**

   ```javascript
   export default defineConfig({
     site: {
       title: 'My Site',
       baseUrl: process.env.SITE_URL || 'http://localhost:3000',
     },
   });
   ```

3. **Split large configurations**

   ```javascript
   // config/site.js
   export const siteConfig = {
     title: 'My Site',
     baseUrl: 'https://example.com',
   };

   // config/markdown.js
   export const markdownConfig = {
     plugins: ['anchor', 'toc-done-right'],  // Stati auto-prepends 'markdown-it-'
   };

   // stati.config.js
   import { siteConfig } from './config/site.js';
   import { markdownConfig } from './config/markdown.js';

   export default defineConfig({
     site: siteConfig,
     markdown: markdownConfig,
   });
   ```

## Multi-Environment Configuration

Configure different settings for development, staging, and production:

```javascript
// config/environments.js
const environments = {
  development: {
    site: {
      title: 'My Site (Dev)',
      baseUrl: 'http://localhost:3000',
    },
    isg: { enabled: false },
    dev: { port: 3000, open: true },
  },

  staging: {
    site: {
      title: 'My Site (Staging)',
      baseUrl: 'https://staging.mysite.com',
    },
    isg: { enabled: true, ttlSeconds: 300 },
  },

  production: {
    site: {
      title: 'My Site',
      baseUrl: 'https://mysite.com',
    },
    isg: {
      enabled: true,
      ttlSeconds: 3600,
      aging: [
        { untilDays: 7, ttlSeconds: 21600 },
        { untilDays: 30, ttlSeconds: 86400 },
      ],
    },
  },
};

export default environments;
```

```javascript
// stati.config.js
import { defineConfig } from '@stati/core';
import environments from './config/environments.js';

const env = process.env.NODE_ENV || 'development';
const envConfig = environments[env] || environments.development;

export default defineConfig({
  srcDir: 'site',
  outDir: 'dist',
  staticDir: 'public',

  ...envConfig,
});
```

## Configuration Reference

For detailed information about specific configuration options, see:

- **[Site Metadata](/configuration/site-metadata/)** - Site title, base URL, and locale settings
- **[Template Settings](/configuration/templates/)** - Eta template engine configuration
- **[Markdown Configuration](/configuration/markdown/)** - Plugins and markdown-it processing
- **[ISG Options](/configuration/isg/)** - Incremental static generation and caching
- **[SEO Configuration](/configuration/seo/)** - SEO metadata and optimization
- **[RSS Configuration](/configuration/rss/)** - RSS feed generation
- **[TypeScript](/configuration/typescript/)** - Built-in TypeScript compilation with esbuild

The configuration system is designed to grow with your needs while maintaining simplicity for basic use cases. Start with minimal configuration and add complexity as your site evolves.
