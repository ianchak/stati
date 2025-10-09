---
title: 'Configuration File'
description: 'Learn how to configure Stati with the stati.config.js file and available options.'
order: 1
---

# Configuration

Stati is designed to work great out of the box, but it's also highly configurable. The `stati.config.js` file is where you customize every aspect of your site's behavior, from basic metadata to advanced build optimizations.

## Configuration File

### Basic Setup

Create `stati.config.js` in your project root:

```javascript
import { defineConfig } from '@stati/core';

export default defineConfig({
  site: {
    title: 'My Stati Site',
    description: 'A modern static site built with Stati',
    baseUrl: 'https://my-site.com',
  },
});
```

### TypeScript Configuration

For full type safety, use `stati.config.ts`:

```typescript
import { defineConfig } from '@stati/core';
import type { StatiConfig } from '@stati/core/types';

const config: StatiConfig = {
  site: {
    title: 'My Stati Site',
    description: 'A modern static site built with Stati',
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
    // Basic information
    title: 'Stati Documentation',
    description: 'TypeScript-first static site generator',
    baseUrl: 'https://stati.dev',

    // Localization
    defaultLocale: 'en-US',
    alternateLocales: ['es', 'fr', 'de'],

    // Social and SEO
    author: 'John Doe',
    social: {
      twitter: 'https://twitter.com/stati',
      github: 'https://github.com/stati/stati',
      linkedin: 'https://linkedin.com/company/stati',
    },

    // Custom metadata
    meta: {
      keywords: ['static site generator', 'typescript', 'ssg'],
      themeColor: '#0066cc',
      msapplicationTileColor: '#0066cc',
    },
  },
});
```

### Markdown Configuration

Customize markdown processing:

### Markdown Configuration

Configure markdown processing:

```javascript
export default defineConfig({
  markdown: {
    // Plugin configuration - array of plugin names or [name, options] tuples
    plugins: [
      'anchor',                    // Add anchors to headings
      'toc-done-right',           // Table of contents
      ['footnote', { /* options */ }],  // Footnotes with options
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

Configure Incremental Static Generation:

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
      { untilDays: 7, ttlSeconds: 86400 },    // 1 day for week-old content
      { untilDays: 30, ttlSeconds: 604800 },  // 1 week for month-old content
        { age: '90d', ttl: '7d' },
      ],
    },

    // Custom dependencies
    dependencies: {
      'blog/index.md': ['blog/**/*.md'],
      'sitemap.xml': ['**/*.md'],
      'rss.xml': ['blog/**/*.md'],
    },

    // Tag-based invalidation
    tags: {
      blog: ['blog/**/*.md'],
      docs: ['docs/**/*.md'],
      navigation: ['**/layout.eta', '_partials/nav.eta'],
    },

    // Always rebuild certain files
    alwaysRebuild: ['index.md', 'sitemap.xml', 'rss.xml'],
  },
});
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

## Advanced Configuration

### Build Hooks

Add custom logic to the build process:

```javascript
export default defineConfig({
  hooks: {
    // Before build starts
    async beforeBuild(context) {
      console.log('Starting build...');

      // Generate dynamic content
      await generateSitemap(context.pages);
      await generateRSSFeed(context.posts);
    },

    // After build completes
    async afterBuild(stats) {
      console.log(`Build completed in ${stats.buildTime}ms`);
      console.log(`Generated ${stats.pageCount} pages`);

      // Post-build tasks can be added here
    },

    // Before each page renders
    beforeRender(page) {
      // Add computed properties
      page.readingTime = calculateReadingTime(page.content);
      page.wordCount = countWords(page.content);
    },

    // After each page renders
    afterRender(page, html) {
      // Validate HTML
      if (process.env.NODE_ENV === 'development') {
        validateHTML(html, page.path);
      }
    },
  },
});
```





## Environment-based Configuration

### Environment Variables

```javascript
// stati.config.js
const isDev = process.env.NODE_ENV === 'development';
const isProd = process.env.NODE_ENV === 'production';

export default defineConfig({
  site: {
    title: 'My Site',
    baseUrl: isProd ? 'https://my-site.com' : 'http://localhost:3000',
  },

  // Development-only features
  ...(isDev && {
    dev: {
      port: 3000,
      open: true,
    },
  }),

  // Production-only optimizations
  ...(isProd && {
    build: {
      minify: true,
      sourcemap: false,
    },
  }),
});
```

### Multiple Configurations

```javascript
// stati.config.base.js
export const baseConfig = {
  site: {
    title: 'My Site'
  },
  markdown: {
    options: {
      html: true,
      linkify: true
    }
  }
};

// stati.config.dev.js
import { baseConfig } from './stati.config.base.js';

export default defineConfig({
  ...baseConfig,
  dev: {
    port: 3000,
    open: true
  }
});

// stati.config.prod.js
import { baseConfig } from './stati.config.base.js';

export default defineConfig({
  ...baseConfig,
  build: {
    minify: true,
    sourcemap: false
  }
});
```

## Configuration Validation

### Schema Validation

Stati validates your configuration and provides helpful error messages:

```javascript
// Invalid configuration examples with error messages
export default defineConfig({
  // Directory validation
  srcDir: 123, // ❌ Error: srcDir must be a string
  outDir: null, // ❌ Error: outDir must be a string
  staticDir: [], // ❌ Error: staticDir must be a string

  // Site metadata validation
  site: {
    title: 123, // ❌ Error: title must be a string
    baseUrl: 'invalid-url', // ❌ Error: baseUrl must be a valid URL
    description: false, // ❌ Error: description must be a string
  },

  // ISG validation
  isg: {
    enabled: 'yes', // ❌ Error: enabled must be a boolean
    ttlSeconds: 'invalid', // ❌ Error: ttlSeconds must be a number
    maxAgeCapDays: -1, // ❌ Error: maxAgeCapDays must be positive
    aging: 'not-array', // ❌ Error: aging must be an array
    freezeAfterDays: 'never', // ❌ Error: freezeAfterDays must be a number
  },

  // Template validation
  eta: {
    filters: 'not-object', // ❌ Error: filters must be an object
    autoEscape: 'yes', // ❌ Error: autoEscape must be a boolean
  },

  // Hook validation
  hooks: {
    beforeAll: 'not-function', // ❌ Error: hooks must be functions
    afterRender: () => {}, // ✅ Valid function
  },
});
```

### Validation Error Output

When validation fails, Stati provides detailed error messages:

```text
Configuration validation failed:

❌ site.title: Expected string but received number
❌ site.baseUrl: "invalid-url" is not a valid URL
❌ isg.ttlSeconds: Expected number but received string
❌ isg.aging[0].untilDays: Missing required property
❌ hooks.beforeAll: Expected function but received string

Build aborted. Please fix configuration errors and try again.
```

### Configuration Testing

Test your configuration:

```javascript
// scripts/test-config.js
import { validateConfig } from '@stati/core/config';
import config from '../stati.config.js';

const result = validateConfig(config);

if (result.errors.length > 0) {
  console.error('Configuration errors:');
  result.errors.forEach((error) => {
    console.error(`- ${error.path}: ${error.message}`);
  });
  process.exit(1);
}

console.log('Configuration is valid!');
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
       description: 'A great site',
     },

     // Markdown processing
     markdown: {
       options: { html: true },
     },
   });
   ```

2. **Use environment variables for secrets**

   ```javascript
   export default defineConfig({
     site: {
       baseUrl: process.env.SITE_URL || 'http://localhost:3000',
     },

     // Don't commit secrets to config
     external: {
       apiKey: process.env.API_KEY, // ✅ Good
       // apiKey: 'secret-key' // ❌ Bad
     },
   });
   ```

3. **Split large configurations**

   ```javascript
   // config/site.js
   export const siteConfig = {
     /* ... */
   };

   // config/markdown.js
   export const markdownConfig = {
     /* ... */
   };

   // stati.config.js
   import { siteConfig } from './config/site.js';
   import { markdownConfig } from './config/markdown.js';

   export default defineConfig({
     site: siteConfig,
     markdown: markdownConfig,
   });
   ```

## Environment-Specific Configuration

Configure different settings for development, staging, and production:

### Basic Environment Detection

```javascript
export default defineConfig({
  site: {
    title: 'My Site',
    baseUrl: process.env.NODE_ENV === 'production'
      ? 'https://mysite.com'
      : 'http://localhost:3000',

    // Enable analytics only in production
    analytics: process.env.NODE_ENV === 'production' ? {
      googleId: 'GA-XXXXXXXXX',
      plausible: 'mysite.com'
    } : undefined,
  },

  // ISG only in production
  isg: {
    enabled: process.env.NODE_ENV === 'production',
    ttlSeconds: process.env.NODE_ENV === 'production' ? 3600 : 0,
  },

  // Different markdown options per environment
  markdown: {
    options: {
      html: true,
      // Stricter validation in development
      linkify: process.env.NODE_ENV !== 'production',
    },
  },
});
```

### Multi-Environment Setup

```javascript
// config/environments.js
const environments = {
  development: {
    site: {
      baseUrl: 'http://localhost:3000',
    },
    isg: { enabled: false },
    dev: { port: 3000, open: true },
  },

  staging: {
    site: {
      baseUrl: 'https://staging.mysite.com',
    },
    isg: { enabled: true, ttlSeconds: 300 }, // 5 minutes
  },

  production: {
    site: {
      baseUrl: 'https://mysite.com',
    },
    isg: {
      enabled: true,
      ttlSeconds: 3600,
      aging: [
        { untilDays: 7, ttlSeconds: 21600 },
        { untilDays: 30, ttlSeconds: 86400 },
        { untilDays: 365, ttlSeconds: 604800 }
      ]
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
  // Base configuration
  srcDir: 'site',
  outDir: 'dist',

  // Merge environment-specific config
  ...envConfig,

  // Override with environment variables
  site: {
    ...envConfig.site,
    title: process.env.SITE_TITLE || envConfig.site.title,
    baseUrl: process.env.SITE_URL || envConfig.site.baseUrl,
  },
});
```

### Configuration with Secrets

```javascript
export default defineConfig({
  site: {
    title: 'My Site',
    baseUrl: process.env.SITE_URL || 'http://localhost:3000',
  },

  // External service configuration
  external: {
    cms: {
      endpoint: process.env.CMS_ENDPOINT,
      apiKey: process.env.CMS_API_KEY,
    },

    analytics: process.env.ANALYTICS_ID ? {
      id: process.env.ANALYTICS_ID,
      domain: process.env.ANALYTICS_DOMAIN,
    } : undefined,
  },

  // Build-time feature flags
  features: {
    comments: process.env.ENABLE_COMMENTS === 'true',
    search: process.env.ENABLE_SEARCH === 'true',
    newsletter: !!process.env.NEWSLETTER_API_KEY,
  },
});
```

### Performance Configuration

```javascript
export default defineConfig({
  // Optimize for your content
  isg: {
    // Short TTL for frequently updated content
    ttlSeconds: 300, // 5 minutes for news sites

    // Longer TTL for static content
    dependencies: {
      'docs/**/*.md': { ttlSeconds: 86400 }, // 24 hours for docs
    },
  },

  // Optimize builds
  build: {
    // Enable parallel processing
    parallel: true,

    // Optimize chunks
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['lodash', 'date-fns'],
          utils: ['./src/utils/index.js'],
        },
      },
    },
  },
});
```

## Configuration Reference

For detailed information about specific configuration options, see:

- **[Site Metadata](/configuration/site-metadata/)** - Title, description, SEO settings
- **[Template Settings](/configuration/templates/)** - Eta configuration and helpers
- **[Markdown Configuration](/configuration/markdown/)** - Plugins and processing options
- **[ISG Options](/configuration/isg/)** - Caching and dependency management

The configuration system is designed to grow with your needs while maintaining simplicity for basic use cases. Start with minimal configuration and add complexity as your site evolves.
