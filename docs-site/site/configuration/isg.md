---
title: 'ISG'
description: 'Configure Incremental Static Generation (ISG) for intelligent caching and selective rebuilds.'
order: 5
seo:
  title: 'ISG configuration'
---

# ISG

The `isg` options set how long Stati reuses a cached page before it renders it again. See [Incremental Static Generation](/core-concepts/isg) for what the cache tracks.

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

## Maximum age cap

`maxAgeCapDays` freezes old content. A dated page older than `maxAgeCapDays` is never rebuilt because its TTL expired. Every other reason still rebuilds it, such as a change to its content, its templates or what it lists, and so does forcing it (`stati build --force` or `stati invalidate`).

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

The same queries work from code: `import { invalidate } from '@stati/core'`, then `await invalidate('tag:blog')`, or `await invalidate()` to clear everything. It reads `.stati/` in the current working directory.

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

## Build command options

ISG can be controlled via CLI flags:

```bash
# Build with ISG (default when enabled in config)
stati build

# Force rebuild, bypassing cache
stati build --force

# Delete the output directory and the cache, then build everything
stati build --clean
```

## How ISG works

### Cache manifest

Each page's entry in `.stati/manifest.json` is described in [Cache manifest](/core-concepts/isg#cache-manifest). Generated images are tracked separately, in `.stati/images/manifest.json`, so later builds reuse them instead of encoding them again. See [Caching and cleanup](/configuration/images#caching-and-cleanup).

### Rebuild decision logic

A page is rebuilt if:

1. Cache is bypassed (`--force` flag) or ISG is disabled (`isg.enabled: false`)
2. Its HTML file, or a generated image it references, is missing from the output directory
3. Page is not in cache manifest (for example, after `stati invalidate`)
4. Page's `inputsHash` has changed (its own content or front matter, one of its templates, an image it shows, the `images` settings, the bundles, search index and stylesheet it links, or data it read: the summary of its collection, the pages of its listing, or the navigation tree)
5. Page's TTL has expired and the page is not frozen by `maxAgeCapDays`
6. An image job for the page failed in the previous build
7. Its layout would now be a different file, a template name it looked up would now find a different file, or a template it rendered was deleted
8. Its cache entry has no record of what the page read and rendered, which happens once after upgrading to a version that records more

Changes to other pages rebuild a page only through data it read: a listing that reads `stati.collection` rebuilds when a post's title, description, tags or publish date changes, not when its body does. See [Dependency tracking](/core-concepts/isg#dependency-tracking).

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

Only values in the `tags` array, and a generated page's key and label, become tags for invalidation; other properties such as `category` don't. `tags` must be a list of strings: `tags: news` stops the build.

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
