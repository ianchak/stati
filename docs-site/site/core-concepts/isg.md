---
title: 'Incremental Static Generation'
description: 'Learn about Incremental Static Generation and build caching.'
order: 5
---

# Incremental Static Generation (ISG)

Incremental Static Generation is one of Stati's most powerful features. It intelligently tracks dependencies, caches build outputs, and only regenerates what has actually changed. This makes builds incredibly fast, especially for large sites.

## What is ISG?

ISG is a build optimization strategy that:

- **Tracks dependencies** between files and content
- **Caches build outputs** with intelligent invalidation
- **Ages content** to optimize cache retention
- **Enables partial rebuilds** for faster development

Unlike traditional static site generators that rebuild everything, Stati only rebuilds what needs to be updated.

## How ISG Works

### Dependency Tracking

Stati automatically tracks relationships between files:

```text
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
```text

### Cache Manifest

Stati maintains a cache manifest at `.stati/cache/manifest.json`:

```json
{
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
    // Enable ISG (default: true)
    enabled: true,

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

# Invalidate entries rendered in the last 7 days
stati invalidate age:7days

# Force rebuild everything
stati invalidate

# Invalidate multiple targets (space-separated)
stati invalidate "path:/blog/ tag:navigation age:30days"
```

### Programmatic Invalidation

Use the invalidate function programmatically in your build scripts or applications:

```javascript
import { invalidate } from '@stati/core';

// Invalidate specific paths
await invalidate('path:/blog/');

// Invalidate by tag
await invalidate('tag:navigation');

// Invalidate entries rendered within the last 30 days (exact calendar arithmetic)
await invalidate('age:30days');

// Invalidate multiple targets
await invalidate('path:/blog/ tag:navigation age:30days');

// Clear all cache
await invalidate();
```

### Cache Configuration

#### Basic Time-based Caching

ISG uses a single global configuration approach. All content shares the same TTL and aging settings:

```javascript
export default defineConfig({
  isg: {
    // Global TTL for all content
    ttlSeconds: 3600, // 1 hour

    // Age-based TTL adjustments apply to all content
    aging: [
      { untilDays: 7, ttlSeconds: 1800 },   // 30 minutes for fresh content
      { untilDays: 30, ttlSeconds: 3600 },  // 1 hour for week-old content
      { untilDays: 90, ttlSeconds: 86400 }, // 24 hours for month-old content
    ],
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

**Important**: Age calculations use exact calendar arithmetic:

- **Days/Weeks**: Simple day arithmetic (1 week = 7 days)
- **Months**: Exact month arithmetic using `setMonth()` - handles varying month lengths (28-31 days)
- **Years**: Exact year arithmetic using `setFullYear()` - properly handles leap years

This means `age:3months` goes back exactly 3 calendar months (e.g., from Oct 1st to Jul 1st), not approximately 90 days.

## Performance Benefits

### Build Time Comparison

```text
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
🚀 Dev server running at [http://localhost:3000](http://localhost:3000)

# Make a change to blog/post-1.md
✅ Rebuilt in 0.1s (1 page updated)
♻️  Browser refreshed

# Make a change to layout.eta
✅ Rebuilt in 1.2s (247 pages updated)
♻️  Browser refreshed
```

## Cache Storage

### Cache Directory Structure

```text
.stati/
└── cache/
    └── manifest.json       # Cache metadata and entries
```

### Cache Persistence

The cache persists between builds in the `.stati/cache/` directory:

- `manifest.json` - Tracks all cached pages and their metadata
- Generated HTML files are cached until their dependencies change

## Monitoring and Debugging

### Build Output

Stati shows cache performance during builds:

```bash
$ stati build

✅ Build completed in 1.2s
📄 Pages: 247 generated, 1,000 cached (95.2% hit rate)
💾 Cache: 156 MB, 1,247 entries
```

ISG is what makes Stati uniquely fast and efficient. Understanding how to configure and optimize it will dramatically improve your development experience and build times. Next, learn about [Static Assets & Bundling](/core-concepts/static-assets/) to understand how Stati handles CSS, JavaScript, and other assets.
