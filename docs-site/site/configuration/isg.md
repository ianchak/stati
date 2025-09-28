---
title: 'ISG Configuration'
description: 'Configure Incremental Static Generation (ISG) for intelligent caching, TTL management, and performance optimization.'
---

# ISG Configuration

Incremental Static Generation (ISG) is Stati's intelligent caching system that provides blazing-fast rebuilds by only regenerating content that has actually changed. Configure ISG to optimize your site's build performance and deployment strategy.

## Basic ISG Configuration

Enable and configure ISG in your `stati.config.js`:

```javascript
// stati.config.js
import { defineConfig } from '@stati/core';

export default defineConfig({
  isg: {
    // Enable ISG
    enabled: true,

    // Cache directory
    cacheDir: '.stati/cache',

    // Default TTL for cached content
    defaultTtl: '1h',

    // Aging algorithm for intelligent TTL adjustment
    aging: {
      enabled: true,
      strategy: 'exponential', // 'linear' | 'exponential' | 'custom'
      maxAge: '30d',
    },

    // Invalidation strategies
    invalidation: {
      tags: true,
      paths: true,
      dependencies: true,
    },
  },
});
```

## Cache Management

### Cache Storage

```javascript
export default defineConfig({
  isg: {
    cache: {
      // Cache storage directory
      directory: '.stati/cache',

      // Maximum cache size
      maxSize: '500MB',

      // Cache cleanup strategy
      cleanup: {
        // Run cleanup on every build
        enabled: true,

        // Remove entries older than this
        maxAge: '7d',

        // Cleanup when cache exceeds size
        maxSizeThreshold: 0.8, // 80% of maxSize
      },

      // Cache compression
      compression: {
        enabled: true,
        algorithm: 'gzip', // 'gzip' | 'brotli' | 'lz4'
        level: 6,
      },
    },
  },
});
```

### Cache Manifest

```javascript
export default defineConfig({
  isg: {
    manifest: {
      // Manifest file location
      file: '.stati/cache/manifest.json',

      // Include metadata in manifest
      metadata: {
        buildTime: true,
        dependencies: true,
        tags: true,
        fileHashes: true,
      },

      // Manifest validation
      validation: {
        enabled: true,

        // Check for corrupted entries
        integrity: true,

        // Validate file existence
        files: true,
      },
    },
  },
});
```

## TTL (Time To Live) Management

### Default TTL Policies

```javascript
export default defineConfig({
  isg: {
    ttl: {
      // Default TTL for different content types
      defaults: {
        pages: '1h', // 1 hour
        posts: '6h', // 6 hours
        assets: '24h', // 24 hours
        feeds: '30m', // 30 minutes
      },

      // Path-based TTL rules
      rules: [
        {
          // Blog posts - longer TTL for older content
          pattern: '/blog/**',
          ttl: (page) => {
            const age = Date.now() - new Date(page.publishedAt).getTime();
            const days = age / (1000 * 60 * 60 * 24);

            if (days < 1) return '30m'; // Fresh content
            if (days < 7) return '2h'; // Week old
            if (days < 30) return '6h'; // Month old
            return '24h'; // Older content
          },
        },

        {
          // Documentation - medium TTL
          pattern: '/docs/**',
          ttl: '2h',
        },

        {
          // API docs - short TTL (frequently updated)
          pattern: '/api/**',
          ttl: '15m',
        },

        {
          // Static pages - long TTL
          pattern: '/about',
          ttl: '24h',
        },
      ],
    },
  },
});
```

### Aging Algorithm

Intelligent TTL adjustment based on content age:

```javascript
export default defineConfig({
  isg: {
    aging: {
      enabled: true,

      // Aging strategy
      strategy: 'exponential',

      // Maximum age before content is considered "cold"
      maxAge: '30d',

      // Custom aging function
      algorithm: (baseAge, contentAge) => {
        const days = contentAge / (1000 * 60 * 60 * 24);

        // Exponential decay: older content gets longer TTL
        if (days < 1) return baseAge; // 0-1 days: no change
        if (days < 7) return baseAge * 2; // 1-7 days: 2x TTL
        if (days < 30) return baseAge * 4; // 1-4 weeks: 4x TTL
        return baseAge * 8; // > 1 month: 8x TTL
      },

      // Minimum and maximum TTL bounds
      bounds: {
        min: '5m', // Never cache for less than 5 minutes
        max: '7d', // Never cache for more than 7 days
      },
    },
  },
});
```

## Invalidation Strategies

### Tag-Based Invalidation

```javascript
export default defineConfig({
  isg: {
    invalidation: {
      tags: {
        enabled: true,

        // Auto-generate tags from content
        autoTags: {
          // Tag by content type
          contentType: true,

          // Tag by categories/tags in front matter
          frontMatter: ['category', 'tags', 'series'],

          // Tag by file path segments
          pathSegments: true,

          // Tag by date (year, month)
          date: ['year', 'month'],
        },

        // Custom tag generation
        generators: [
          // Tag by author
          (page) => (page.author ? [`author:${page.author}`] : []),

          // Tag by content length
          (page) => {
            const length = page.content?.length || 0;
            if (length < 1000) return ['short-content'];
            if (length < 5000) return ['medium-content'];
            return ['long-content'];
          },

          // Tag by last modified date
          (page) => {
            const modified = new Date(page.modifiedAt);
            const today = new Date();
            const diffDays = Math.floor((today - modified) / (1000 * 60 * 60 * 24));

            if (diffDays === 0) return ['modified-today'];
            if (diffDays < 7) return ['modified-this-week'];
            return ['modified-older'];
          },
        ],
      },
    },
  },
});
```

### Path-Based Invalidation

```javascript
export default defineConfig({
  isg: {
    invalidation: {
      paths: {
        enabled: true,

        // Invalidation patterns
        patterns: [
          {
            // When blog index changes, invalidate all blog pages
            trigger: '/blog/index.md',
            invalidate: ['/blog/**'],
          },

          {
            // When navigation changes, invalidate all pages
            trigger: '/_partials/navigation.eta',
            invalidate: ['/**'],
          },

          {
            // When a post changes, invalidate related content
            trigger: '/blog/posts/**',
            invalidate: [
              '/blog/', // Blog index
              '/feed.xml', // RSS feed
              '/sitemap.xml', // Sitemap
            ],
          },
        ],

        // Dependency tracking
        dependencies: {
          // Track template dependencies
          templates: true,

          // Track included/imported files
          includes: true,

          // Track asset dependencies
          assets: true,
        },
      },
    },
  },
});
```

### Dependency-Based Invalidation

```javascript
export default defineConfig({
  isg: {
    invalidation: {
      dependencies: {
        enabled: true,

        // Track different types of dependencies
        types: {
          // Template includes
          templates: {
            enabled: true,
            patterns: ['<%~ include(', '<%- include('],
          },

          // Image references
          images: {
            enabled: true,
            patterns: ['![', '<img src='],
          },

          // Link references
          links: {
            enabled: true,
            patterns: ['](', '<a href='],
          },

          // Data files
          data: {
            enabled: true,
            extensions: ['.json', '.yaml', '.yml'],
          },
        },

        // Dependency resolution
        resolution: {
          // Resolve relative paths
          relative: true,

          // Follow symlinks
          symlinks: true,

          // Maximum dependency depth
          maxDepth: 10,
        },
      },
    },
  },
});
```

## Performance Optimization

### Build Optimization

```javascript
export default defineConfig({
  isg: {
    performance: {
      // Parallel cache operations
      parallel: {
        enabled: true,
        maxWorkers: require('os').cpus().length,
      },

      // Memory optimization
      memory: {
        // Stream large files instead of loading into memory
        streaming: {
          enabled: true,
          threshold: '10MB',
        },

        // Garbage collection
        gc: {
          enabled: true,
          frequency: 100, // Every 100 operations
        },
      },
    },
  },
});
```

### Cache Strategies

```javascript
export default defineConfig({
  isg: {
    strategies: {
      // Development strategy
      development: {
        enabled: process.env.NODE_ENV === 'development',

        // Aggressive invalidation in dev
        ttl: '30s',

        // Watch for file changes
        watch: true,

        // Skip cache for debugging
        bypass: false,
      },

      // Production strategy
      production: {
        enabled: process.env.NODE_ENV === 'production',

        // Longer TTL in production
        ttl: '1h',

        // Aggressive caching
        aggressive: true,

        // Precompute popular pages
        precompute: ['/', '/blog/', '/docs/'],
      },

      // CI/CD strategy
      cicd: {
        enabled: process.env.CI === 'true',

        // Restore cache from previous builds
        restore: true,

        // Save cache for next build
        persist: true,

        // Cache key strategy
        keyStrategy: 'git-hash', // 'git-hash' | 'timestamp' | 'content-hash'
      },
    },
  },
});
```

## Monitoring and Analytics

### Cache Metrics

```javascript
export default defineConfig({
  isg: {
    monitoring: {
      enabled: true,

      // Metrics to collect
      metrics: {
        // Cache hit/miss rates
        hitRate: true,

        // Build times
        buildTimes: true,

        // Cache size
        cacheSize: true,

        // Invalidation frequency
        invalidations: true,
      },

      // Reporting
      reporting: {
        // Console output
        console: process.env.NODE_ENV === 'development',

        // File output
        file: {
          enabled: true,
          path: '.stati/metrics.json',
        },

        // External analytics
        external: {
          enabled: false,
          endpoint: 'https://analytics.example.com/stati',
        },
      },
    },
  },
});
```

### Debug Mode

```javascript
export default defineConfig({
  isg: {
    debug: {
      enabled: process.env.DEBUG_ISG === 'true',

      // Verbose logging
      verbose: true,

      // Log cache operations
      operations: true,

      // Log invalidation events
      invalidations: true,

      // Cache visualization
      visualization: {
        enabled: true,

        // Generate cache dependency graph
        dependencyGraph: true,

        // Export visualization data
        export: '.stati/debug/cache-graph.json',
      },
    },
  },
});
```

## Advanced Configuration

### Custom Cache Backends

```javascript
export default defineConfig({
  isg: {
    backends: {
      // Redis backend for distributed caching
      redis: {
        enabled: false,

        connection: {
          host: 'localhost',
          port: 6379,
          db: 0,
        },

        // Key prefix
        prefix: 'stati:cache:',

        // Serialization
        serialization: 'json', // 'json' | 'msgpack'
      },

      // S3 backend for cloud storage
      s3: {
        enabled: false,

        bucket: 'my-stati-cache',
        region: 'us-east-1',

        // Path prefix
        prefix: 'cache/',

        // Lifecycle rules
        lifecycle: {
          expiration: '30d',
        },
      },
    },
  },
});
```

### Custom Invalidation Logic

```javascript
export default defineConfig({
  isg: {
    customInvalidation: [
      // Invalidate when package.json changes (affects site build)
      {
        trigger: 'package.json',
        action: () => ['/**'], // Invalidate everything
      },

      // Invalidate based on external API changes
      {
        trigger: async () => {
          // Check external API for changes
          const response = await fetch('https://api.example.com/content/version');
          const data = await response.json();
          return data.version;
        },
        cacheKey: 'external-api-version',
        action: (newVersion, oldVersion) => {
          if (newVersion !== oldVersion) {
            return ['/api/**', '/docs/api/**'];
          }
          return [];
        },
      },

      // Time-based invalidation
      {
        trigger: () => {
          // Invalidate cache at midnight
          const now = new Date();
          return now.getHours() === 0 && now.getMinutes() === 0;
        },
        action: () => ['/**'],
      },
    ],
  },
});
```

## CLI Integration

ISG integrates with Stati CLI commands:

```bash
# Build with ISG (default)
stati build

# Force rebuild (bypass cache)
stati build --force

# Clean cache
stati build --clean

# Invalidate cache entries
stati invalidate                    # Clear all cache
stati invalidate "tag:blog"         # Invalidate by tag
stati invalidate "path:/blog/**"    # Invalidate by path pattern
stati invalidate "age:3months"      # Invalidate entries older than 3 months
```

## Best Practices

### Cache Strategy

1. **Appropriate TTL**: Use shorter TTL for frequently changing content
2. **Tag Organization**: Use consistent tagging for efficient invalidation
3. **Dependency Tracking**: Enable dependency tracking for accurate invalidation
4. **Cache Size**: Monitor cache size and set appropriate limits

### Performance

1. **Parallel Processing**: Enable parallel cache operations
2. **Memory Management**: Use streaming for large files
3. **Monitoring**: Track cache performance metrics

### Development

1. **Debug Mode**: Enable debug mode during development
2. **Bypass Option**: Use cache bypass for testing
3. **Invalidation Testing**: Test invalidation strategies thoroughly
4. **Metrics Review**: Regularly review cache metrics

ISG is a powerful feature that can significantly improve your build performance. Configure it appropriately for your content patterns and deployment strategy to get the maximum benefit.
