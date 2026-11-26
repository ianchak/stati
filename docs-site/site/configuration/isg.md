---
title: 'ISG'
description: 'Set how long Stati reuses cached pages: the TTL, aging rules, the age cap and cache invalidation.'
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

Stati checks these values, and the page's `tags`, as each Markdown file loads, and again on every page after a [`beforeAll` hook](/api/hooks) runs: `ttlSeconds` must be a whole number of 0 or more, `maxAgeCapDays` a whole number above 0 and `tags` a list of texts (in a Markdown file, a single tag counts as a list of one). An invalid value stops the build with an error that names the file, before any page is written, so the pages of the last build stay as they were (unless `--clean` removed them first). Values a `beforeRender` hook sets are not checked: an override that isn't valid is ignored. A field without a value (`ttlSeconds:`) counts as not set. With `isg.enabled: false` they are not checked.

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

`stati invalidate` marks cache entries stale, so the next build renders those pages again. Queries select entries by `tag:`, `path:`, `glob:`, `age:` or a plain term; see [`stati invalidate`](/cli/commands#stati-invalidate) for the syntax and examples.

A page's tags are its `tags` front matter (`tags: news` counts as `tags: [news]`) and, on a generated page, its key and label. Other fields, such as `category`, are not tags.

The same queries work from code: `import { invalidate } from '@stati/core'`, then `await invalidate('tag:blog')`, or `await invalidate()` to mark every entry. It reads `.stati/` in the current working directory.

## How ISG works

### Cache manifest

Each page's entry in `.stati/manifest.json` is described in [Cache manifest](/core-concepts/isg#cache-manifest). Generated images are tracked separately, in `.stati/images/manifest.json`, so later builds reuse them instead of encoding them again. See [Caching and cleanup](/configuration/images#caching-and-cleanup).

### Rebuild decision logic

A page is rebuilt if:

1. Cache is bypassed (`--force` flag) or ISG is disabled (`isg.enabled: false`)
2. Its HTML file, or a generated image it references, is missing from the output directory. You can delete `dist/` and keep `.stati/`: the next build recreates the missing pages.
3. Page is not in the cache manifest, or its entry is marked stale: by `stati invalidate`, by a render that logged an error, or by an image job that failed
4. Page's `inputsHash` has changed (its own content or front matter, one of its templates, an image it shows, the `images` settings, the bundle and search index paths, the stylesheet settings, or data it read: the summary of its collection, the pages of its listing, or the navigation tree)
5. Page's TTL has expired and the page is not frozen by `maxAgeCapDays`
6. Its layout would now be a different file, a template name it looked up would now find a different file, or a template it rendered was deleted

Changes to other pages rebuild a page only through data it read: a listing that reads `stati.collection` rebuilds when a listed page's URL, publish date or one of the `collections.summaryFields` (by default `title`, `description`, `tags` and `draft`) changes, not when its body does. See [Dependency tracking](/core-concepts/isg#dependency-tracking).

### Template dependency tracking

Stati records each page's templates while it renders, so it tracks exactly what rendered:

- The page's layout: the `layout` named in front matter, or the nearest `layout.eta` (`index.eta` first for index pages)
- Every shell the layout names with `stati.layout()`, and the shells those name
- Every template rendered with `stati.include()`, including the ones included templates render
- The Open Graph template, with `images.og`
- Every template name the page looked up and the file it found, including names `stati.include.has()` and `stati.layout.has()` did not find

Editing one of these templates rebuilds the pages that rendered it, and deleting one rebuilds them too. Adding a template rebuilds the pages whose recorded names would now find it, such as a section's own `partials/header.eta`. A template a page includes only under a condition is recorded only on the pages where it rendered.

Helpers are config code, not templates, so they are not tracked. After changing a helper whose output appears on cached pages, run `stati build --force`.

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
