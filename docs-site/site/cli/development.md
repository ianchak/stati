---
title: 'Development Server'
description: 'Learn how to use Stati development server for hot reloading, debugging, and efficient development workflows.'
---

# Development Server

Stati's development server provides a fast, feature-rich environment for building and testing your site with hot reloading, debugging tools, and development-specific optimizations.

## Starting the Development Server

Start the development server:

```bash
# Start with default settings
stati dev

# Specify custom port
stati dev --port 4000

# Open browser automatically
stati dev --open

# Enable verbose logging
stati dev --verbose

# Custom host binding
stati dev --host 0.0.0.0 --port 3000
```

## Configuration

Configure the development server in `stati.config.js`:

```javascript
// stati.config.js
import { defineConfig } from '@stati/core';

export default defineConfig({
  dev: {
    // Server port
    port: 3000,

    // Server host
    host: 'localhost',

    // Open browser on start
    open: true,

    // Enable HTTPS
    https: false,

    // Hot reload settings
    hotReload: {
      enabled: true,
      port: 3001, // WebSocket port for hot reload
      debounce: 100, // ms
    },

    // File watching
    watch: {
      enabled: true,
      ignored: ['node_modules/**', '.git/**', 'dist/**'],
      extensions: ['.md', '.eta', '.js', '.css', '.json'],
    },
  },
});
```

## Hot Reloading

The development server provides intelligent hot reloading:

### Content Changes

Automatically reload when content changes:

```bash
# Edit a markdown file
echo "# Updated content" > site/blog/post.md
# → Browser refreshes automatically
```

### Template Changes

Template modifications trigger immediate updates:

```html
<!-- Edit layout.eta -->
<header class="updated-header">
  <h1><%= site.title %></h1>
</header>
<!-- → All pages using this layout refresh -->
```

### Style Changes

CSS changes are injected without full page reload:

```css
/* Update styles.css */
.header {
  background: #3b82f6; /* Change takes effect immediately */
}
```

### Configuration Changes

Config changes trigger full rebuild:

```javascript
// Update stati.config.js
export default defineConfig({
  site: {
    title: 'Updated Title', // → Full site rebuild
  },
});
```

## Development Features

### Live Debugging

Enable debugging features during development:

```javascript
export default defineConfig({
  dev: {
    debug: {
      // Show template compilation times
      templates: true,

      // Show markdown processing times
      markdown: true,

      // Show ISG cache operations
      cache: true,

      // Enable React DevTools integration
      reactDevTools: false,

      // Source maps for debugging
      sourceMaps: true,
    },
  },
});
```

### Development Overlays

Display helpful information during development:

```javascript
export default defineConfig({
  dev: {
    overlays: {
      // Show build errors in browser
      errors: true,

      // Show compilation warnings
      warnings: true,

      // Show performance metrics
      performance: true,

      // Custom overlay content
      custom: {
        enabled: true,
        position: 'bottom-right', // 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
        content: (stats) => `
          <div>
            <p>Pages: ${stats.pageCount}</p>
            <p>Build time: ${stats.buildTime}ms</p>
          </div>
        `,
      },
    },
  },
});
```

### Development Middleware

Add custom middleware for development:

```javascript
export default defineConfig({
  dev: {
    middleware: [
      // API mock middleware
      {
        path: '/api/*',
        handler: (req, res, next) => {
          if (req.url.startsWith('/api/')) {
            // Mock API responses
            res.json({ data: 'mock data' });
          } else {
            next();
          }
        },
      },

      // Authentication middleware
      {
        path: '/admin/*',
        handler: (req, res, next) => {
          // Check auth in development
          if (process.env.DEV_AUTH === 'true') {
            next();
          } else {
            res.status(401).send('Unauthorized');
          }
        },
      },

      // CORS middleware
      {
        path: '*',
        handler: (req, res, next) => {
          res.header('Access-Control-Allow-Origin', '*');
          res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE');
          res.header('Access-Control-Allow-Headers', 'Content-Type');
          next();
        },
      },
    ],
  },
});
```

## File Watching

### Watch Configuration

Customize file watching behavior:

```javascript
export default defineConfig({
  dev: {
    watch: {
      // Watch patterns
      include: ['site/**/*', 'public/**/*', 'stati.config.js'],

      // Ignore patterns
      exclude: ['node_modules/**', '.git/**', 'dist/**', '**/*.log', '**/.*'],

      // File extensions to watch
      extensions: ['.md', '.eta', '.js', '.ts', '.css', '.scss', '.json', '.yaml'],

      // Watch options
      options: {
        // Polling for network drives
        usePolling: false,

        // Polling interval (if enabled)
        interval: 1000,

        // Binary files threshold
        binaryInterval: 300,

        // Follow symlinks
        followSymlinks: true,

        // Ignore initial events
        ignoreInitial: true,
      },
    },
  },
});
```

### Custom Watch Handlers

Define custom behavior for file changes:

```javascript
export default defineConfig({
  dev: {
    watchHandlers: {
      // Handle content file changes
      'site/**/*.md': async (filePath, eventType) => {
        console.log(`Content changed: ${filePath} (${eventType})`);

        if (eventType === 'add') {
          // Handle new content files
          await generateIndex();
        } else if (eventType === 'unlink') {
          // Handle deleted files
          await updateSitemap();
        }
      },

      // Handle template changes
      'site/**/*.eta': async (filePath, eventType) => {
        console.log(`Template changed: ${filePath}`);

        // Invalidate template cache
        await invalidateTemplateCache(filePath);

        // Rebuild dependent pages
        await rebuildDependentPages(filePath);
      },

      // Handle configuration changes
      'stati.config.js': async () => {
        console.log('Configuration changed - full rebuild required');

        // Reload configuration
        await reloadConfig();

        // Trigger full rebuild
        await fullRebuild();
      },
    },
  },
});
```

## Performance Optimization

### Development Build Optimization

Optimize builds for development speed:

```javascript
export default defineConfig({
  dev: {
    performance: {
      // Skip expensive operations in development
      skipOptimizations: {
        // Skip image optimization
        images: true,

        // Skip CSS minification
        css: true,

        // Skip JavaScript minification
        js: true,

        // Skip HTML minification
        html: true,
      },

      // Parallel processing
      parallel: {
        enabled: true,
        maxWorkers: require('os').cpus().length / 2, // Use half CPU cores
      },

      // Memory management
      memory: {
        // Clear caches periodically
        clearInterval: 5 * 60 * 1000, // 5 minutes

        // Memory usage threshold
        threshold: 1024 * 1024 * 1024, // 1GB
      },
    },
  },
});
```

### Smart Rebuilding

Enable intelligent partial rebuilds:

```javascript
export default defineConfig({
  dev: {
    smartRebuild: {
      enabled: true,

      // Track dependencies for minimal rebuilds
      trackDependencies: true,

      // Rebuild strategies
      strategies: {
        // Content changes - rebuild affected pages only
        content: 'incremental',

        // Template changes - rebuild dependent pages
        templates: 'dependent',

        // Config changes - full rebuild
        config: 'full',

        // Asset changes - copy only
        assets: 'copy',
      },
    },
  },
});
```

## Proxy and API Integration

### Proxy Configuration

Proxy API requests during development:

```javascript
export default defineConfig({
  dev: {
    proxy: {
      // Proxy API requests to backend
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        pathRewrite: {
          '^/api': '/v1/api',
        },
      },

      // Proxy to external service
      '/external': {
        target: 'https://api.external.com',
        secure: true,
        changeOrigin: true,
        headers: {
          Authorization: 'Bearer ' + process.env.API_TOKEN,
        },
      },

      // WebSocket proxy
      '/ws': {
        target: 'ws://localhost:8080',
        ws: true,
      },
    },
  },
});
```

### Mock API

Create mock APIs for development:

```javascript
export default defineConfig({
  dev: {
    mock: {
      enabled: true,

      // Mock API endpoints
      apis: {
        'GET /api/posts': () => ({
          posts: [
            { id: 1, title: 'Hello World', content: 'First post' },
            { id: 2, title: 'Second Post', content: 'Another post' },
          ],
        }),

        'POST /api/posts': (req) => ({
          id: Date.now(),
          ...req.body,
          createdAt: new Date().toISOString(),
        }),

        'GET /api/posts/:id': (req) => ({
          id: req.params.id,
          title: `Post ${req.params.id}`,
          content: 'Mock content',
        }),
      },

      // Mock data generators
      generators: {
        posts: () =>
          Array.from({ length: 10 }, (_, i) => ({
            id: i + 1,
            title: `Generated Post ${i + 1}`,
            content: 'Generated content',
            createdAt: new Date(Date.now() - i * 86400000).toISOString(),
          })),
      },
    },
  },
});
```

## Environment Variables

### Development Environment

Set up environment-specific configuration:

```bash
# .env.development
NODE_ENV=development
DEBUG=stati:*
DEV_PORT=3000
DEV_HOST=localhost
DEV_OPEN=true
API_BASE_URL=http://localhost:8080
```

### Configuration Integration

Use environment variables in development config:

```javascript
export default defineConfig({
  dev: {
    port: process.env.DEV_PORT || 3000,
    host: process.env.DEV_HOST || 'localhost',
    open: process.env.DEV_OPEN === 'true',

    // Environment-specific features
    features: {
      debugging: process.env.NODE_ENV === 'development',
      analytics: process.env.NODE_ENV === 'production',
      hotReload: process.env.HOT_RELOAD !== 'false',
    },
  },
});
```

## Browser Integration

### Developer Tools

Integrate with browser developer tools:

```javascript
export default defineConfig({
  dev: {
    devTools: {
      // Enable React DevTools (if using React components)
      react: true,

      // Enable Vue DevTools (if using Vue components)
      vue: true,

      // Custom DevTools integration
      custom: {
        enabled: true,

        // Inject custom debugging helpers
        helpers: `
          window.__STATI_DEBUG__ = {
            reloadPage: () => location.reload(),
            showPageInfo: () => console.table(window.__PAGE_DATA__),
            clearCache: () => fetch('/__dev/clear-cache', { method: 'POST' })
          };
        `,
      },
    },
  },
});
```

### Development Routes

Add development-only routes:

```javascript
export default defineConfig({
  dev: {
    routes: {
      // Debug page information
      '/__dev/page-info': (req, res) => {
        res.json({
          currentPage: req.headers.referer,
          pageData: getCurrentPageData(),
          buildStats: getBuildStats(),
        });
      },

      // Clear caches
      '/__dev/clear-cache': (req, res) => {
        clearAllCaches();
        res.json({ success: true, message: 'Caches cleared' });
      },

      // Reload configuration
      '/__dev/reload-config': async (req, res) => {
        await reloadConfiguration();
        res.json({ success: true, message: 'Configuration reloaded' });
      },
    },
  },
});
```

## Debugging and Troubleshooting

### Debug Mode

Enable comprehensive debugging:

```bash
# Enable debug output
DEBUG=stati:* stati dev

# Debug specific modules
DEBUG=stati:dev,stati:build stati dev

# Save debug output to file
DEBUG=stati:* stati dev 2> debug.log
```

### Common Issues

**Port Already in Use:**

```bash
# Find process using port
netstat -ano | findstr :3000
lsof -ti:3000

# Use different port
stati dev --port 3001
```

**File Watching Issues:**

```javascript
export default defineConfig({
  dev: {
    watch: {
      // Enable polling for network drives
      usePolling: true,
      interval: 1000,
    },
  },
});
```

**Memory Issues:**

```javascript
export default defineConfig({
  dev: {
    performance: {
      memory: {
        // Reduce memory usage
        clearInterval: 60000, // Clear caches more frequently
        threshold: 512 * 1024 * 1024, // Lower threshold
      },
    },
  },
});
```

## Best Practices

### Development Workflow

1. **Fast Feedback**: Keep hot reload enabled for quick feedback
2. **Selective Watching**: Watch only necessary files to improve performance
3. **Environment Separation**: Use different configs for dev/prod
4. **Debug Thoughtfully**: Enable debugging only when needed

### Performance

1. **Optimize Watch Patterns**: Exclude unnecessary files from watching
2. **Memory Management**: Clear caches periodically during long sessions
3. **Parallel Processing**: Use appropriate worker counts
4. **Skip Optimizations**: Disable expensive optimizations in development

### Debugging

1. **Structured Logging**: Use consistent logging patterns
2. **Error Boundaries**: Handle errors gracefully in development
3. **Source Maps**: Enable source maps for easier debugging
4. **Dev Tools**: Take advantage of browser developer tools integration

The Stati development server provides a powerful, flexible environment for building and testing your static sites. Configure it to match your development workflow and take advantage of its debugging and optimization features.
