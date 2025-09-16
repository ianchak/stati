---
title: 'Incremental Static Generation (ISG)'
description: 'Learn about Stati intelligent caching and incremental building system.'
---

# Incremental Static Generation (ISG)

Incremental Static Generation is one of Stati's most powerful features. It intelligently tracks dependencies, caches build outputs, and only regenerates what has actually changed. This makes builds incredibly fast, especially for large sites.

## What is ISG?

ISG is a build optimization strategy that:

- **Tracks dependencies** between files and content
- **Caches build outputs** with intelligent invalidation
- **Ages content** to optimize cache retention
- **Enables partial rebuilds** for faster development
- **Supports on-demand regeneration** for dynamic content

Unlike traditional static site generators that rebuild everything, Stati only rebuilds what needs to be updated.

## How ISG Works

### Dependency Tracking

Stati automatically tracks relationships between files:

```
blog/index.md depends on:
├── blog/post-1.md
├── blog/post-2.md
├── blog/post-3.md
├── blog/layout.eta
└── _partials/post-preview.eta

When post-1.md changes:
✅ Rebuild blog/post-1/ (direct change)
✅ Rebuild blog/ (depends on post-1.md)
❌ Skip blog/post-2/ (no changes)
❌ Skip about/ (unrelated)
```

### Cache Manifest

Stati maintains a cache manifest at `.stati/cache/manifest.json`:

```json
{
  "version": "1.0.0",
  "entries": {
    "/blog/": {
      "inputsHash": "abc123",
      "deps": ["blog/index.md", "blog/post-1.md", "blog/post-2.md"],
      "tags": ["blog", "posts"],
      "publishedAt": "2024-01-15T10:00:00Z",
      "renderedAt": "2024-01-15T10:00:00Z",
      "ttlSeconds": 3600
    }
  }
}
```

### Build Process

1. **Content Discovery** - Find all content files
2. **Dependency Analysis** - Map relationships between files
3. **Cache Validation** - Check if cached outputs are still valid
4. **Selective Rebuilding** - Only process changed content
5. **Manifest Update** - Update cache entries and dependencies

## Configuration

### Basic ISG Setup

Configure ISG in `stati.config.js`:

```javascript
import { defineConfig } from '@stati/core';

export default defineConfig({
  isg: {
    // Cache TTL in seconds (default: 1 hour)
    ttlSeconds: 3600,

    // Maximum age cap in days (default: 30 days)
    maxAgeCapDays: 30,

    // Enable aging algorithm
    aging: {
      enabled: true,
      schedule: [
        { age: '1d', ttl: '1h' }, // Fresh content: 1 hour cache
        { age: '7d', ttl: '6h' }, // Week-old content: 6 hour cache
        { age: '30d', ttl: '24h' }, // Month-old content: 24 hour cache
        { age: '90d', ttl: '7d' }, // Old content: 7 day cache
      ],
    },

    // Force rebuilds for specific patterns
    alwaysRebuild: ['index.md', 'sitemap.xml'],
  },
});
```

### Advanced Configuration

```javascript
export default defineConfig({
  isg: {
    // Custom dependency tracking
    dependencies: {
      // Blog index depends on all blog posts
      'blog/index.md': ['blog/**/*.md'],

      // RSS feed depends on recent posts
      'rss.xml': ['blog/**/*.md'],

      // Sitemap depends on all pages
      'sitemap.xml': ['**/*.md'],
    },

    // Tag-based invalidation
    tags: {
      // Group related content
      blog: ['blog/**/*.md'],
      docs: ['docs/**/*.md'],
      navigation: ['**/layout.eta', '_partials/nav.eta'],
    },

    // External dependencies
    external: {
      // API data dependencies
      api: {
        url: 'https://api.example.com/data',
        ttl: 300, // 5 minutes
        headers: {
          Authorization: 'Bearer ${process.env.API_TOKEN}',
        },
      },
    },
  },
});
```

## Cache Management

### Manual Invalidation

Use the CLI to invalidate specific content:

```bash
# Invalidate by path
stati invalidate path:/blog/post-1/

# Invalidate by tag
stati invalidate tag:blog

# Invalidate by age
stati invalidate age:7d

# Force rebuild everything
stati invalidate all

# Invalidate multiple targets
stati invalidate path:/blog/ tag:navigation age:30d
```

### Programmatic Invalidation

Invalidate cache from within your build process:

```javascript
import { invalidateCache } from '@stati/core';

// In a build hook
export default defineConfig({
  hooks: {
    async beforeBuild() {
      // Check external API for updates
      const apiData = await fetch('https://api.example.com/posts');
      const lastModified = apiData.headers.get('last-modified');

      // Invalidate if API data is newer
      if (isNewerThan(lastModified, cache.getLastUpdate('api'))) {
        await invalidateCache('tag:blog');
      }
    },
  },
});
```

### Cache Strategies

#### Time-based Caching

```javascript
export default defineConfig({
  isg: {
    // Different TTL for different content types
    strategies: {
      blog: { ttlSeconds: 1800 }, // 30 minutes
      docs: { ttlSeconds: 3600 }, // 1 hour
      pages: { ttlSeconds: 7200 }, // 2 hours
      assets: { ttlSeconds: 86400 }, // 24 hours
    },
  },
});
```

#### Content-based Caching

```javascript
export default defineConfig({
  isg: {
    // Dynamic TTL based on content
    dynamicTtl(page) {
      // Frequently updated content gets shorter cache
      if (page.path.startsWith('blog/')) {
        return page.frontmatter.draft ? 60 : 1800; // 1 min for drafts, 30 min for published
      }

      // Static pages get longer cache
      if (page.path.includes('about') || page.path.includes('contact')) {
        return 86400; // 24 hours
      }

      return 3600; // Default 1 hour
    },
  },
});
```

## Aging Algorithm

The aging algorithm automatically adjusts cache TTL based on content age:

### How Aging Works

```javascript
// Content published 1 day ago
publishedAt: "2024-01-14T10:00:00Z"
currentTime: "2024-01-15T10:00:00Z"
age: 1 day

// Apply aging schedule
schedule: [
  { age: '1d', ttl: '1h' },   // ✅ Matches: cache for 1 hour
  { age: '7d', ttl: '6h' },   // Not reached yet
  { age: '30d', ttl: '24h' }  // Not reached yet
]

result: TTL = 1 hour
```

### Aging Configuration

```javascript
export default defineConfig({
  isg: {
    aging: {
      enabled: true,

      // Custom aging schedule
      schedule: [
        { age: '6h', ttl: '5m' }, // Very fresh: 5 minutes
        { age: '1d', ttl: '30m' }, // Fresh: 30 minutes
        { age: '3d', ttl: '2h' }, // Recent: 2 hours
        { age: '1w', ttl: '6h' }, // Week old: 6 hours
        { age: '1m', ttl: '1d' }, // Month old: 1 day
        { age: '3m', ttl: '1w' }, // Old: 1 week
      ],

      // Maximum cache time regardless of age
      maxTtl: '7d',

      // Minimum cache time regardless of age
      minTtl: '1m',
    },
  },
});
```

### Age Format

Ages can be specified in various formats:

```javascript
'30s'; // 30 seconds
'5m'; // 5 minutes
'2h'; // 2 hours
'1d'; // 1 day
'1w'; // 1 week
'1M'; // 1 month (30 days)
'1y'; // 1 year (365 days)
```

## Performance Benefits

### Build Time Comparison

```
Traditional SSG (full rebuild):
├── 1000 pages: ~60 seconds
├── 5000 pages: ~300 seconds
└── 10000 pages: ~600+ seconds

Stati with ISG (incremental):
├── First build: ~60 seconds
├── 1 file changed: ~0.5 seconds
├── 10 files changed: ~2 seconds
└── Layout change: ~10 seconds (only affected pages)
```

### Development Experience

```bash
# Initial dev server start
$ stati dev
✅ Build completed in 2.3s (1,247 pages)
🚀 Dev server running at http://localhost:3000

# Make a change to blog/post-1.md
✅ Rebuilt in 0.1s (1 page updated)
♻️  Browser refreshed

# Make a change to layout.eta
✅ Rebuilt in 1.2s (247 pages updated)
♻️  Browser refreshed
```

## Cache Storage

### Cache Directory Structure

```
.stati/
└── cache/
    ├── manifest.json       # Cache metadata
    ├── content/           # Processed content cache
    │   ├── blog-index.html
    │   └── about.html
    ├── assets/            # Asset build cache
    │   ├── styles.css
    │   └── bundle.js
    └── meta/              # Dependency metadata
        ├── deps.json
        └── hashes.json
```

### Cache Persistence

The cache persists between builds and deployments:

```javascript
export default defineConfig({
  isg: {
    // Cache storage options
    storage: {
      // Local filesystem (default)
      type: 'fs',
      path: '.stati/cache',

      // Or remote storage (for CI/CD)
      // type: 'redis',
      // url: process.env.REDIS_URL
    },

    // Cache cleanup
    cleanup: {
      // Remove unused cache entries
      removeOrphaned: true,

      // Maximum cache size (in MB)
      maxSize: 1000,

      // Cleanup frequency
      frequency: 'daily',
    },
  },
});
```

## Monitoring and Debugging

### Cache Statistics

View cache performance:

```bash
# Show cache statistics
stati cache stats

Output:
Cache Statistics:
├── Total entries: 1,247
├── Hit rate: 94.3%
├── Cache size: 156 MB
├── Avg build time: 0.8s
└── Oldest entry: 7 days ago
```

### Debug Mode

Enable detailed logging:

```javascript
export default defineConfig({
  isg: {
    debug: process.env.NODE_ENV === 'development',

    // Detailed logging
    logging: {
      level: 'debug',
      cacheHits: true,
      dependencies: true,
      invalidations: true,
    },
  },
});
```

### Cache Analysis

```bash
# Analyze cache dependencies
stati cache analyze

# Show dependency tree
stati cache deps /blog/

# Show cache age distribution
stati cache age-report
```

## Best Practices

### Dependency Design

1. **Minimize cross-dependencies**

   ```javascript
   // Good: isolated sections
   'blog/': ['blog/**/*.md']
   'docs/': ['docs/**/*.md']

   // Avoid: everything depends on everything
   '**/*.md': ['**/*.md', '**/*.eta']
   ```

2. **Use specific patterns**

   ```javascript
   // Good: specific dependencies
   'blog/index.md': ['blog/posts/**/*.md']

   // Avoid: overly broad patterns
   'blog/index.md': ['**/*.md']
   ```

### Cache Tuning

1. **Match TTL to update frequency**

   ```javascript
   // News content (updates frequently)
   news: {
     ttlSeconds: 300;
   }

   // Documentation (updates rarely)
   docs: {
     ttlSeconds: 86400;
   }
   ```

2. **Use aging for blogs**
   ```javascript
   aging: {
     schedule: [
       { age: '1d', ttl: '1h' }, // Recent posts change more
       { age: '30d', ttl: '24h' }, // Old posts rarely change
     ];
   }
   ```

### Production Optimization

1. **Preload critical content**

   ```javascript
   hooks: {
     beforeBuild() {
       // Warm cache for critical pages
       return warmCache([
         '/',
         '/about/',
         '/blog/'
       ]);
     }
   }
   ```

2. **Monitor cache health**
   ```javascript
   hooks: {
     afterBuild(stats) {
       // Alert on low hit rates
       if (stats.cacheHitRate < 0.8) {
         console.warn('Low cache hit rate:', stats.cacheHitRate);
       }
     }
   }
   ```

ISG is what makes Stati uniquely fast and efficient. Understanding how to configure and optimize it will dramatically improve your development experience and build times. Next, learn about [Static Assets & Bundling](/core-concepts/static-assets/) to understand how Stati handles CSS, JavaScript, and other assets.
