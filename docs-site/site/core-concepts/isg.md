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

    // Progressive TTL increases based on content age
    aging: [
      { untilDays: 7, ttlSeconds: 21600 },   // 6 hours for week-old content
      { untilDays: 30, ttlSeconds: 86400 },  // 24 hours for month-old content
      { untilDays: 90, ttlSeconds: 259200 }, // 3 days for 3-month-old content
      { untilDays: 365, ttlSeconds: 604800 } // 7 days for year-old content
    ],

    // Content older than 1 year never rebuilds (optional)
    freezeAfterDays: 365,

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
stati invalidate age:7days

# Force rebuild everything
stati invalidate all

# Invalidate multiple targets
stati invalidate path:/blog/ tag:navigation age:30days
```

### Programmatic Invalidation



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

## Aging Configuration

The aging configuration uses a simple array format:

```javascript
export default defineConfig({
  isg: {
    aging: [
      { untilDays: 7, ttlSeconds: 21600 },   // 6 hours for week-old content
      { untilDays: 30, ttlSeconds: 86400 },  // 24 hours for month-old content
      { untilDays: 90, ttlSeconds: 259200 }, // 3 days for 3-month-old content
      { untilDays: 365, ttlSeconds: 604800 } // 7 days for year-old content
    ],
  },
});
```

### Age Format for Invalidation

When invalidating by age, use these formats:

```bash
stati invalidate age:30days
stati invalidate age:2weeks
stati invalidate age:6months
stati invalidate age:1year
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

The cache persists between builds in the `.stati/cache/` directory:

- `manifest.json` - Tracks all cached pages and their metadata
- Generated HTML files are cached until their dependencies change
- Cache automatically clears when Stati version changes

## Monitoring and Debugging

### Build Output

Stati shows cache performance during builds:

```bash
$ stati build

✅ Build completed in 1.2s
📄 Pages: 247 generated, 1,000 cached (95.2% hit rate)
💾 Cache: 156 MB, 1,247 entries
```

### Debug Mode

View detailed dependency tracking in development:

```bash
$ stati dev --verbose

✅ Checking dependencies for blog/post-1.md...
📂 Dependencies: layout.eta, _partials/header.eta
♻️  Cache miss: content changed
✅ Rebuilt blog/post-1/ in 0.1s
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

1. **Use appropriate TTL values**

   ```javascript
   export default defineConfig({
     isg: {
       // Shorter TTL for frequently updated content
       ttlSeconds: 1800, // 30 minutes

       // Longer cache for older content
       aging: [
         { untilDays: 7, ttlSeconds: 3600 },   // 1 hour for week-old
         { untilDays: 30, ttlSeconds: 86400 }, // 24 hours for month-old
       ],
     },
   });
   ```

2. **Monitor build performance**

   ```javascript
   export default defineConfig({
     hooks: {
       afterBuild(stats) {
         console.log(`Built ${stats.totalPages} pages in ${stats.buildTimeMs}ms`);
         if (stats.cacheHits && stats.cacheMisses) {
           const hitRate = stats.cacheHits / (stats.cacheHits + stats.cacheMisses);
           console.log(`Cache hit rate: ${(hitRate * 100).toFixed(1)}%`);
         }
       }
     }
   });
   ```

ISG is what makes Stati uniquely fast and efficient. Understanding how to configure and optimize it will dramatically improve your development experience and build times. Next, learn about [Static Assets & Bundling](/core-concepts/static-assets/) to understand how Stati handles CSS, JavaScript, and other assets.
