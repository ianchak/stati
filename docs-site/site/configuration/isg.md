---
title: 'ISG Options'
description: 'Configure Incremental Static Generation (ISG) for intelligent caching and selective rebuilds.'
order: 5
---

# ISG Configuration

Incremental Static Generation (ISG) is Stati's intelligent caching system that provides selective rebuilds by only regenerating content that has actually changed. Configure ISG to optimize your site's build workflow and deployment strategy.

## Configuration Options

Enable and configure ISG in your `stati.config.js`:

```javascript
import { defineConfig } from '@stati/core';

export default defineConfig({
  isg: {
    enabled: true,
    ttlSeconds: 3600,
    maxAgeCapDays: 365,
    aging: [
      { untilDays: 7, ttlSeconds: 86400 },
      { untilDays: 30, ttlSeconds: 604800 },
    ],
  },
});
```

### Available Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | boolean | `false` | Enable or disable ISG caching |
| `ttlSeconds` | number | `3600` | Default cache time-to-live in seconds |
| `maxAgeCapDays` | number | - | Maximum age in days for applying aging rules |
| `aging` | AgingRule[] | `[]` | Array of aging rules for progressive cache extension |

## TTL (Time To Live)

The `ttlSeconds` option sets the default cache duration for all pages:

```javascript
export default defineConfig({
  isg: {
    enabled: true,
    ttlSeconds: 3600, // 1 hour in seconds
  },
});
```

### Common TTL Values

| Duration | Seconds | Use Case |
|----------|---------|----------|
| 5 minutes | 300 | Frequently updated news sites |
| 1 hour | 3600 | Regular blog updates |
| 6 hours | 21600 | Daily updated content |
| 24 hours | 86400 | Static documentation |
| 1 week | 604800 | Rarely changing content |

## Aging Rules

Aging rules allow you to progressively extend cache TTL based on content age. This is useful for keeping recent content fresh while caching older content longer.

### How Aging Rules Work

Each aging rule specifies:
- `untilDays` - Age threshold in days after content was rendered
- `ttlSeconds` - Cache duration in seconds for content that reaches this age

```javascript
export default defineConfig({
  isg: {
    enabled: true,
    ttlSeconds: 3600, // Default: 1 hour
    maxAgeCapDays: 365, // Stop applying rules after 1 year
    aging: [
      { untilDays: 7, ttlSeconds: 86400 },     // 1 day for week-old content
      { untilDays: 30, ttlSeconds: 604800 },   // 1 week for month-old content
      { untilDays: 90, ttlSeconds: 2592000 },  // 30 days for 3-month-old content
    ],
  },
});
```

### Practical Examples

**News Site (Keep Recent Content Fresh):**

```javascript
export default defineConfig({
  isg: {
    enabled: true,
    ttlSeconds: 300, // 5 minutes for new articles
    maxAgeCapDays: 30,
    aging: [
      { untilDays: 1, ttlSeconds: 3600 },    // 1 hour for day-old news
      { untilDays: 7, ttlSeconds: 86400 },   // 1 day for week-old news
      { untilDays: 30, ttlSeconds: 604800 }, // 1 week for month-old archives
    ],
  },
});
```

**Documentation Site (Long Caching):**

```javascript
export default defineConfig({
  isg: {
    enabled: true,
    ttlSeconds: 21600, // 6 hours for all docs
    maxAgeCapDays: 365,
    aging: [
      { untilDays: 30, ttlSeconds: 86400 },   // 1 day for month-old docs
      { untilDays: 90, ttlSeconds: 604800 },  // 1 week for older docs
    ],
  },
});
```

**Blog (Balanced Approach):**

```javascript
export default defineConfig({
  isg: {
    enabled: true,
    ttlSeconds: 3600, // 1 hour default
    maxAgeCapDays: 180,
    aging: [
      { untilDays: 7, ttlSeconds: 21600 },   // 6 hours for week-old posts
      { untilDays: 30, ttlSeconds: 86400 },  // 1 day for month-old posts
      { untilDays: 90, ttlSeconds: 604800 }, // 1 week for 3-month-old posts
    ],
  },
});
```

## Maximum Age Cap

The `maxAgeCapDays` option limits how old content can be before aging rules stop applying:

```javascript
export default defineConfig({
  isg: {
    enabled: true,
    ttlSeconds: 3600,
    maxAgeCapDays: 365, // Stop applying aging rules after 1 year
    aging: [
      { untilDays: 7, ttlSeconds: 86400 },
      { untilDays: 30, ttlSeconds: 604800 },
    ],
  },
});
```

Content older than `maxAgeCapDays` will continue to use the last applicable aging rule's TTL.

## Cache Invalidation

Stati provides cache invalidation through the `stati invalidate` CLI command. See [CLI Commands](/cli/commands) for full documentation.

### Invalidation Patterns

| Pattern | Example | Description |
|---------|---------|-------------|
| `tag:value` | `tag:blog` | Invalidate entries with specific tag |
| `path:value` | `path:/blog` | Invalidate specific path or prefix |
| `glob:pattern` | `glob:blog/**` | Invalidate paths matching glob pattern |
| `age:duration` | `age:1week` | Invalidate entries rendered within time window |
| (empty) | `stati invalidate` | Clear entire cache |

### CLI Examples

```bash
# Clear all cache
stati invalidate

# Invalidate by tag (from front matter)
stati invalidate "tag:blog"

# Invalidate specific path or nested routes
stati invalidate "path:/about"

# Invalidate paths matching glob pattern
stati invalidate "glob:blog/**"

# Invalidate entries rendered within time window
stati invalidate "age:3months"

# Multiple criteria (space-separated)
stati invalidate "tag:blog age:1week"

# Quoted strings for values with spaces
stati invalidate "tag:my blog" "path:/my path"
```

### Age-Based Invalidation

The `age:` pattern uses exact calendar arithmetic for precise time calculations:

| Format | Example | Description |
|--------|---------|-------------|
| `age:Ndays` | `age:7days` | Content rendered in last N days |
| `age:Nweeks` | `age:2weeks` | Content rendered in last N weeks (N × 7 days) |
| `age:Nmonths` | `age:3months` | Content rendered in last N months (exact calendar months) |
| `age:Nyears` | `age:1year` | Content rendered in last N years (exact calendar years) |

**Note:** Months and years use exact calendar arithmetic (accounting for varying month lengths and leap years), not approximate day counts.

## Build Command Options

ISG can be controlled via CLI flags:

```bash
# Build with ISG (default when enabled in config)
stati build

# Force rebuild, bypassing cache
stati build --force

# Clean cache before building
stati build --clean

# Clean cache with selective invalidation
stati build --clean --invalidate "tag:blog"
```

## How ISG Works

### Cache Manifest

ISG maintains a cache manifest at `.stati/cache/manifest.json` that tracks:

- **inputsHash**: Hash of page content and all dependencies
- **deps**: Array of file paths this page depends on (templates, partials)
- **tags**: Tags from front matter for invalidation
- **renderedAt**: ISO date when page was last rendered
- **ttlSeconds**: Effective TTL for this page
- **publishedAt**: ISO date when content was originally published (from front matter)

### Rebuild Decision Logic

A page is rebuilt if:

1. Cache is bypassed (`--force` flag)
2. Page is not in cache manifest
3. Page's `inputsHash` has changed (content or dependencies modified)
4. Page's TTL has expired
5. Page matches an invalidation query

### Template Dependency Tracking

ISG automatically tracks template dependencies:

- Main layout template (`layout.eta`)
- Included partials (`<%~ include() %>` or `<%- include() %>`)
- Changes to any dependency invalidate affected pages

### Tag Extraction

Tags are extracted from page front matter:

```yaml
---
title: My Blog Post
tags: [blog, tutorial, javascript]
category: development
---
```

Both `tags` arrays and individual properties like `category` become searchable tags for invalidation.

## Best Practices

### Cache Strategy

1. **Appropriate TTL**: Use shorter TTL (5-60 minutes) for frequently changing content, longer TTL (6-24 hours) for stable content
2. **Aging Rules**: Define 2-4 aging rules that progressively extend TTL as content ages
3. **Max Age Cap**: Set `maxAgeCapDays` to prevent indefinite cache growth (typically 30-365 days)
4. **Tag Organization**: Use consistent, hierarchical tags in front matter for efficient invalidation

### Development Workflow

1. **Dev Mode**: ISG is bypassed in `stati dev` (watch mode)
2. **Test Builds**: Use `stati build` locally to test ISG behavior
3. **Selective Invalidation**: Use `stati invalidate` with specific patterns during testing
4. **Cache Inspection**: Review `.stati/cache/manifest.json` to understand cache state

### Production Deployment

1. **Persistent Cache**: Keep `.stati/cache/` in CI/CD between builds for efficient rebuilds
2. **Invalidation Strategy**: Define clear invalidation patterns for content updates
3. **Monitoring**: Track build times to measure ISG effectiveness
4. **Cache Cleanup**: Periodically clear stale cache entries with `age:` invalidation

### Build Tips

1. **Enable ISG**: ISG can reduce build times for incremental updates
2. **Template Organization**: Keep partials small and focused to minimize invalidation scope
3. **Tag Granularity**: Balance between too many tags (complex management) and too few (broad invalidation)
4. **TTL Tuning**: Start with conservative TTL values and adjust based on content update patterns

## Troubleshooting

### Cache Not Working

- Verify `isg.enabled: true` in config
- Check that `.stati/cache/` directory exists
- Review build output for cache hit/miss messages
- Try `stati build --clean` to reset cache

### Unexpected Rebuilds

- Check `inputsHash` in manifest for changed dependencies
- Verify template partials aren't changing unintentionally
- Review TTL settings - may be too short
- Ensure file timestamps are stable in CI/CD

### Invalidation Not Working

- Verify tag names match front matter exactly (case-sensitive)
- Check path patterns use correct syntax (`path:/prefix`, `glob:pattern/**`)
- Review manifest to confirm tags are being extracted
- Try full cache clear with `stati invalidate` (no arguments)

ISG is a powerful feature that can help with build workflows. Configure it appropriately for your content patterns and deployment strategy.
