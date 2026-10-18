---
title: 'ISG'
description: 'Configure Incremental Static Generation (ISG) for intelligent caching and selective rebuilds.'
order: 5
seo:
  title: 'ISG configuration'
---

# ISG

Incremental Static Generation (ISG) is Stati's intelligent caching system that provides selective rebuilds by only regenerating content that has actually changed. Configure ISG to optimize your site's build workflow and deployment strategy.

## Configuration options

Enable and configure ISG in your `stati.config.ts` (or `stati.config.js`):

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

### Available options

| Option          | Type        | Default | Description                                                                                                                                    |
| --------------- | ----------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `enabled`       | boolean     | `true`  | Enable or disable ISG cache reuse                                                                                                              |
| `ttlSeconds`    | number      | `21600` | Cache time-to-live in seconds (6 hours) for pages that no aging rule covers: pages without a publish date, or every page when `aging` is empty |
| `maxAgeCapDays` | number      | `365`   | Age in days after which a dated page is frozen: no longer rebuilt for TTL reasons                                                              |
| `aging`         | AgingRule[] | `[]`    | Rules that set the TTL from a dated page's age                                                                                                 |

The values are validated when the config loads: `ttlSeconds` must be a whole number from 0 to one year, `maxAgeCapDays` a whole number from 1 to 3650, and invalid values stop the build with an "Invalid ISG configuration" error.

Pages can override both settings in front matter:

```markdown
---
title: Live scores
ttlSeconds: 300
maxAgeCapDays: 7
---
```

## TTL (time to live)

Setting `isg.enabled: false` renders every page on every build, regardless of
existing cache entries. With caching enabled, a page is rebuilt if its HTML output
is missing, even when its TTL has not expired or it is frozen by the age cap.
You can delete the output directory without deleting `.stati/`; the next build
recreates the missing pages.

The `ttlSeconds` option sets the default cache duration for all pages:

```javascript
export default defineConfig({
  isg: {
    enabled: true,
    ttlSeconds: 3600, // 1 hour (override default of 6 hours)
  },
});
```

### Common TTL values

| Duration  | Seconds | Use Case                      |
| --------- | ------- | ----------------------------- |
| 5 minutes | 300     | Frequently updated news sites |
| 1 hour    | 3600    | Regular blog updates          |
| 6 hours   | 21600   | Daily updated content         |
| 24 hours  | 86400   | Static documentation          |
| 1 week    | 604800  | Rarely changing content       |

## Aging rules

Aging rules set a page's TTL from its age, so recent content is refreshed often and older content is cached longer.

### How aging rules work

A page's age is counted from its publish date: the first of the `publishedAt`, `published`, `date` or `createdAt` front matter fields that holds a valid date. Pages without one ignore the rules and use `ttlSeconds`.

Each aging rule specifies:

- `untilDays` - The rule applies to pages up to this many days old
- `ttlSeconds` - The cache duration for those pages

Stati picks the first rule, in ascending `untilDays` order, whose `untilDays` is at least the page's age. Pages older than every rule use the last rule, until they pass `maxAgeCapDays` and are frozen.

```javascript
export default defineConfig({
  isg: {
    enabled: true,
    ttlSeconds: 3600, // pages without a publish date: 1 hour
    maxAgeCapDays: 365, // freeze pages older than 1 year
    aging: [
      { untilDays: 7, ttlSeconds: 86400 }, // up to 7 days old: 1 day
      { untilDays: 30, ttlSeconds: 604800 }, // up to 30 days old: 1 week
      { untilDays: 90, ttlSeconds: 2592000 }, // older: 30 days (the last rule)
    ],
  },
});
```

Rules must be listed in ascending `untilDays` order, without duplicate `untilDays`, with `untilDays` no greater than `maxAgeCapDays` and `ttlSeconds` no greater than 30 days (2592000); otherwise the config is rejected.

### Practical examples

**News Site (Keep Recent Content Fresh):**

```javascript
export default defineConfig({
  isg: {
    enabled: true,
    ttlSeconds: 3600, // undated pages: 1 hour
    maxAgeCapDays: 30, // articles older than 30 days are frozen
    aging: [
      { untilDays: 1, ttlSeconds: 300 }, // first day: 5 minutes
      { untilDays: 7, ttlSeconds: 3600 }, // first week: 1 hour
      { untilDays: 30, ttlSeconds: 86400 }, // first month: 1 day
    ],
  },
});
```

**Documentation Site (Long Caching):**

```javascript
export default defineConfig({
  isg: {
    enabled: true,
    ttlSeconds: 21600, // undated pages: 6 hours
    maxAgeCapDays: 365,
    aging: [
      { untilDays: 30, ttlSeconds: 86400 }, // up to 30 days old: 1 day
      { untilDays: 90, ttlSeconds: 604800 }, // older: 1 week
    ],
  },
});
```

**Blog (Balanced Approach):**

```javascript
export default defineConfig({
  isg: {
    enabled: true,
    ttlSeconds: 3600, // undated pages: 1 hour
    maxAgeCapDays: 180,
    aging: [
      { untilDays: 7, ttlSeconds: 21600 }, // up to 7 days old: 6 hours
      { untilDays: 30, ttlSeconds: 86400 }, // up to 30 days old: 1 day
      { untilDays: 90, ttlSeconds: 604800 }, // older: 1 week
    ],
  },
});
```

## Maximum age cap

`maxAgeCapDays` freezes old content. A dated page older than `maxAgeCapDays` is never rebuilt because its TTL expired; it is rebuilt only when its own content or one of its templates changes, or when you force it (`stati build --force` or `stati invalidate`):

```javascript
export default defineConfig({
  isg: {
    enabled: true,
    ttlSeconds: 3600,
    maxAgeCapDays: 365, // pages published more than a year ago are frozen
    aging: [
      { untilDays: 7, ttlSeconds: 86400 },
      { untilDays: 30, ttlSeconds: 604800 },
    ],
  },
});
```

Pages without a publish date are never frozen.

## Cache invalidation

Stati provides cache invalidation through the `stati invalidate` CLI command. See [CLI commands](/cli/commands) for full documentation.

### Invalidation patterns

| Pattern        | Example            | Description                                        |
| -------------- | ------------------ | -------------------------------------------------- |
| `tag:value`    | `tag:blog`         | Invalidate entries with specific tag               |
| `path:value`   | `path:/blog`       | Invalidate entries whose key starts with the value |
| `glob:pattern` | `glob:/blog/**`    | Invalidate entries whose key matches the glob      |
| `age:duration` | `age:1week`        | Invalidate entries rendered within time window     |
| (empty)        | `stati invalidate` | Clear entire cache                                 |

Cache keys are output paths with a leading slash, such as `/blog.html` and `/blog/first-post.html`, so include the `/` in `path:` and `glob:` values. When a query has several terms, an entry that matches **any** of them is invalidated.

### CLI examples

```bash
# Clear all cache
stati invalidate

# Invalidate by tag (from front matter)
stati invalidate "tag:blog"

# Invalidate specific path or nested routes
stati invalidate "path:/about"

# Invalidate paths matching glob pattern
stati invalidate "glob:/blog/**"

# Invalidate entries rendered within time window
stati invalidate "age:3months"

# Several terms (an entry matching either one is invalidated)
stati invalidate "tag:blog age:1week"

# Values with spaces: quote them inside the single query argument
stati invalidate '"tag:my blog" "path:/my path"'
```

### Age-based invalidation

The `age:` pattern uses exact calendar arithmetic for precise time calculations:

| Format        | Example       | Description                                               |
| ------------- | ------------- | --------------------------------------------------------- |
| `age:Ndays`   | `age:7days`   | Content rendered in last N days                           |
| `age:Nweeks`  | `age:2weeks`  | Content rendered in last N weeks (N × 7 days)             |
| `age:Nmonths` | `age:3months` | Content rendered in last N months (exact calendar months) |
| `age:Nyears`  | `age:1year`   | Content rendered in last N years (exact calendar years)   |

**Note:** Months and years use exact calendar arithmetic (accounting for varying month lengths and leap years), not approximate day counts.

## Build command options

ISG can be controlled via CLI flags:

```bash
# Build with ISG (default when enabled in config)
stati build

# Force rebuild, bypassing cache
stati build --force

# Clean cache before building
stati build --clean
```

## How ISG works

### Cache manifest

ISG maintains a cache manifest at `.stati/manifest.json`, with one entry per output path (such as `/blog/first-post.html`) that tracks:

- **inputsHash**: Hash of page content and all dependencies
- **deps**: The template files the page rendered, layout first: its layout, the shells it names with `stati.layout()`, the templates it includes and its Open Graph template
- **templateLookups**: Every template name the page looked up, the folder the lookup started from, and the file it found (`null` when none)
- **templatesRecorded**: `true` when `deps` and `templateLookups` were recorded while the page rendered
- **assetDeps**: Files found while rendering, such as the images the page shows; their content is part of `inputsHash`
- **images**: Generated image files the page references, such as responsive variants and its Open Graph card
- **tags**: Tags from front matter for invalidation
- **renderedAt**: ISO date when page was last rendered
- **ttlSeconds**: Effective TTL for this page
- **publishedAt**: ISO date when content was originally published (from front matter)

Generated images are tracked separately, in `.stati/images/manifest.json`, so later builds reuse them instead of encoding them again. See [Caching and cleanup](/configuration/images#caching-and-cleanup).

### Rebuild decision logic

A page is rebuilt if:

1. Cache is bypassed (`--force` flag) or ISG is disabled (`isg.enabled: false`)
2. Its HTML file, or a generated image it references, is missing from the output directory
3. Page is not in cache manifest (for example, after `stati invalidate`)
4. Page's `inputsHash` has changed (its own content or front matter, one of its templates, an image it shows, the `images` settings, or data it read: the summary of its collection, the pages of its listing, or the navigation tree)
5. Page's TTL has expired and the page is not frozen by `maxAgeCapDays`
6. An image job for the page failed in the previous build
7. Its layout would now be a different file, a template name it looked up would now find a different file, or a template it rendered was deleted
8. Its cache entry has no record of what the page read and rendered, which happens once after upgrading to a version that records more

Changes to other pages rebuild a page only through data it read: a listing that reads `stati.collection` rebuilds when a post's title, description, tags or publish date changes, not when its body does. See [Dependency tracking](/core-concepts/isg#dependency-tracking).

### Removing stale pages

When a page no longer exists, `stati build` deletes its HTML file and its cache entry: a deleted post, a tag no post uses, or the last page of a listing that got shorter. Only files recorded in the cache manifest are deleted, so `stati build --clean` is no longer needed to clear out removed pages.

### Template dependency tracking

Stati records each page's templates while it renders, so it tracks exactly what rendered:

- The page's layout: the `layout` named in front matter, or the nearest `layout.eta` (`index.eta` first for index pages)
- Every shell the layout names with `stati.layout()`, and the shells those name
- Every template rendered with `stati.include()`, including the ones included templates render
- The Open Graph template, with `images.og`
- Every template name the page looked up and the file it found, including names `stati.include.has()` and `stati.layout.has()` did not find

Editing one of these templates rebuilds the pages that rendered it, and deleting one rebuilds them too. Adding a template rebuilds the pages whose recorded names would now find it, such as a section's own `partials/header.eta`. A template a page includes only under a condition is recorded only on the pages where it rendered.

Helpers are config code, not templates, so they are not tracked. After changing a helper whose output appears on cached pages, run `stati build --force`.

### Tag extraction

Tags are extracted from the `tags` array in page front matter:

```yaml
---
title: My Blog Post
tags: [blog, tutorial, javascript]
---
```

Only values in the `tags` array become searchable tags for invalidation. Individual properties like `category` are not automatically converted to tags.

## Best practices

### Cache strategy

1. **Appropriate TTL**: Use shorter TTL (5-60 minutes) for frequently changing content, longer TTL (6-24 hours) for stable content
2. **Aging Rules**: Define 2-4 aging rules that progressively extend TTL as content ages
3. **Max Age Cap**: Set `maxAgeCapDays` to the age after which old pages no longer need refreshing (typically 30-365 days); older pages are frozen
4. **Tag Organization**: Use consistent, hierarchical tags in front matter for efficient invalidation

### Development workflow

1. **Dev Mode**: Cache is cleared at dev server startup, then ISG is used for incremental rebuilds during watch mode
2. **Test Builds**: Use `stati build` locally to test ISG behavior
3. **Selective Invalidation**: Use `stati invalidate` with specific patterns during testing
4. **Cache Inspection**: Review `.stati/manifest.json` to understand cache state

### Production deployment

1. **Persistent Cache**: Keep both `.stati/` and `dist/` between CI/CD builds; a cache entry is only reused when its HTML file still exists
2. **Invalidation Strategy**: Define clear invalidation patterns for content updates
3. **Monitoring**: Track build times to measure ISG effectiveness
4. **Listing pages**: Give index pages that list other pages a short `ttlSeconds`, or invalidate them after publishing

### Build tips

1. **Enable ISG**: ISG can reduce build times for incremental updates
2. **Template Organization**: Keep included templates small and focused: a page depends only on the templates it renders
3. **Tag Granularity**: Balance between too many tags (complex management) and too few (broad invalidation)
4. **TTL Tuning**: Start with conservative TTL values and adjust based on content update patterns

## Troubleshooting

### Cache not working

- Verify `isg.enabled` is not set to `false`
- Check that `.stati/manifest.json` exists and that `dist/` was kept from the previous build
- Review build output for cache hit/miss messages
- Try `stati build --clean` to reset cache

### Unexpected rebuilds

- Check `inputsHash` in manifest for changed dependencies
- Verify the templates the page rendered aren't changing unintentionally; its `deps` lists them
- Review TTL settings - may be too short
- Check `beforeRender` hooks: a hook that writes to `page.frontMatter` changes the page's hash, so that page is re-rendered on every build (do such work in `beforeAll` instead)

### Invalidation not working

- Verify tag names match front matter exactly (case-sensitive)
- Check path patterns use correct syntax and a leading slash (`path:/blog`, `glob:/blog/**`)
- Review manifest to confirm tags are being extracted
- Try full cache clear with `stati invalidate` (no arguments)

ISG is a powerful feature that can help with build workflows. Configure it appropriately for your content patterns and deployment strategy.
