---
title: 'Configuration'
description: 'Learn how to configure Stati with the stati.config.js file and available options.'
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
      keywords: ['static site generator', 'typescript', 'vite'],
      themeColor: '#0066cc',
      msapplicationTileColor: '#0066cc',
    },
  },
});
```

### Markdown Configuration

Customize markdown processing:

```javascript
export default defineConfig({
  markdown: {
    // Markdown-It options
    options: {
      html: true, // Enable HTML tags
      linkify: true, // Auto-convert URLs to links
      typographer: true, // Smart quotes and typography
      breaks: false, // Convert line breaks to <br>
      xhtmlOut: false, // Use XHTML-style self-closing tags
    },

    // Plugin configuration
    plugins: {
      // Heading anchors
      anchor: {
        permalink: true,
        permalinkBefore: true,
        permalinkSymbol: '#',
        permalinkClass: 'header-anchor',
      },

      // Table of contents
      toc: {
        includeLevel: [1, 2, 3, 4],
        containerClass: 'table-of-contents',
        markerPattern: /^\[\[toc\]\]/im,
      },

      // Footnotes
      footnote: {
        backrefLabel: '↩',
        anchorTemplate: '^%d',
      },
    },

    // Custom setup function
    setup(md) {
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
  templates: {
    // Eta configuration
    eta: {
      // Template caching
      cache: true,

      // Custom filters
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

      // Global helpers
      helpers: {
        // Check if URL is active
        isActive: (linkUrl, currentUrl) => {
          if (linkUrl === '/') return currentUrl === '/';
          return currentUrl.startsWith(linkUrl);
        },

        // Generate absolute URL
        absoluteUrl: (path, baseUrl) => {
          return baseUrl + path;
        },
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
    // Cache TTL in seconds
    ttlSeconds: 3600, // 1 hour

    // Maximum age cap
    maxAgeCapDays: 30,

    // Aging configuration
    aging: {
      enabled: true,
      schedule: [
        { age: '1d', ttl: '1h' },
        { age: '7d', ttl: '6h' },
        { age: '30d', ttl: '24h' },
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

Configure the development experience:

```javascript
export default defineConfig({
  dev: {
    // Server configuration
    port: 3000,
    host: 'localhost',
    open: true,

    // HTTPS in development
    https: {
      key: './certs/localhost-key.pem',
      cert: './certs/localhost.pem',
    },

    // Proxy configuration
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },

    // Watch options
    watch: {
      // Watch additional files
      include: ['data/**/*.json', 'config/**/*.yaml'],

      // Ignore patterns
      exclude: ['node_modules/**', '.git/**'],

      // Debounce delay
      delay: 100,
    },
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

      // Post-build tasks
      await optimizeImages();
      await generateSearchIndex();
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

### Vite Integration

Customize the underlying Vite configuration:

```javascript
export default defineConfig({
  vite: {
    // Vite plugins
    plugins: [
      // Add custom Vite plugins
      customVitePlugin(),

      // Image optimization
      require('vite-plugin-imagemin')({
        gifsicle: { optimizationLevel: 7 },
        mozjpeg: { quality: 80 },
        pngquant: { quality: [0.65, 0.8] },
      }),
    ],

    // Build configuration
    build: {
      // Output directory (relative to dist/)
      outDir: 'build',

      // Asset naming
      rollupOptions: {
        output: {
          assetFileNames: 'assets/[name]-[hash][extname]',
          chunkFileNames: 'assets/[name]-[hash].js',
          entryFileNames: 'assets/[name]-[hash].js',
        },
      },

      // Minification
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true,
        },
      },
    },

    // CSS configuration
    css: {
      postcss: {
        plugins: [require('autoprefixer'), require('cssnano')],
      },
    },

    // Define global constants
    define: {
      __VERSION__: JSON.stringify(process.env.npm_package_version),
      __BUILD_DATE__: JSON.stringify(new Date().toISOString()),
    },
  },
});
```

### Custom Plugins

Create and use custom Stati plugins:

```javascript
// plugins/custom-plugin.js
export function customPlugin(options = {}) {
  return {
    name: 'custom-plugin',

    // Plugin hooks
    setup(stati) {
      stati.addContentTransform('*.md', async (content, page) => {
        // Transform markdown content
        return processCustomSyntax(content);
      });

      stati.addPageHook('beforeRender', (page) => {
        // Modify page data
        page.customProperty = generateCustomData(page);
      });
    },
  };
}

// stati.config.js
import { customPlugin } from './plugins/custom-plugin.js';

export default defineConfig({
  plugins: [
    customPlugin({
      option1: 'value1',
      option2: 'value2',
    }),
  ],
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
// Invalid configuration will show clear errors
export default defineConfig({
  site: {
    title: 123, // ❌ Error: title must be a string
    baseUrl: 'invalid-url', // ❌ Error: baseUrl must be a valid URL
  },

  isg: {
    ttlSeconds: 'invalid', // ❌ Error: ttlSeconds must be a number
  },
});
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
