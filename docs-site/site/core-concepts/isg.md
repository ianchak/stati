---
title: 'Incremental Static Generation'
description: 'Learn about Incremental Static Generation and build caching.'
order: 6
---

# Incremental Static Generation

Incremental Static Generation is one of Stati's most powerful features. It intelligently tracks dependencies, caches build outputs, and only regenerates what has actually changed. This reduces build times, especially for large sites.

## What is ISG?

ISG is a build optimization strategy that:

- **Tracks dependencies** between files and content
- **Caches build outputs** with intelligent invalidation
- **Ages content** to optimize cache retention
- **Enables partial rebuilds** for efficient development

Unlike traditional static site generators that rebuild everything, Stati only rebuilds what needs to be updated.

## How ISG works

### Dependency tracking

For each page, Stati records the **templates** it rendered: its layout, the shells it names with `stati.layout()`, the templates it includes with `stati.include()` and its Open Graph template, along with every template name it looked up and the file that name found. Recording happens while the page renders, so an include behind a condition counts only on the pages where it rendered. It also records the **images** the page shows, from Markdown or `stati.image()`, hashed by content. See [Template dependency tracking](/configuration/isg#template-dependency-tracking).

It also records what the page **read** while it rendered:

- **Its [collection](/core-concepts/collections).** A page that reads `stati.collection` depends on a summary of the pages in it: each one's URL, publish date, `title`, `description`, `tags` and `draft`. [`collections.summaryFields`](/core-concepts/collections#what-rebuilds-a-listing) changes the fields. A page of a paginated listing depends on the pages it shows and on the number of pages, and a generated page on its own items.
- **The navigation.** A page that reads `stati.nav` or `stati.page.navNode` depends on the whole navigation tree.

A page is re-rendered when its own Markdown or front matter changes, when one of its templates or images changes, when data it read changes, or when its TTL expires:

```text
When the body of blog/post-1.md changes:
✅ Rebuild blog/post-1
❌ Skip blog (index page): nothing it lists changed

When the title of blog/post-1.md changes:
✅ Rebuild blog/post-1
✅ Rebuild blog, and every page that reads the blog collection, such as posts with newer and older links
✅ Rebuild the pages that render the navigation, which shows the title
❌ Skip pages that read neither the collection nor the navigation

When blog/post-3.md is added, or deleted:
✅ Render blog/post-3, or delete its HTML
✅ Rebuild the pages that read the blog collection

When blog/layout.eta changes:
✅ Rebuild every page rendered with blog/layout.eta

When blog/partials/header.eta is added:
✅ Rebuild the pages in blog/ whose partials/header lookup now finds it
❌ Skip pages outside blog/, which keep partials/header.eta

When partials/banner.eta changes and no page includes it:
❌ Skip every page
```

Data that reaches a template some other way is not tracked, for example a helper that returns posts it collected in a `beforeAll` hook. Read listings from `stati.collection`, or, in that hook, write what the page shows into its front matter, which is part of its hash.

### Removing pages that no longer exist

`stati build` deletes the HTML of pages that no longer exist: a deleted or renamed Markdown file, a draft after a build with `--include-drafts`, a tag no post uses anymore, or the last page of a listing that got shorter. It deletes only files the cache manifest records, along with folders that deleting them leaves empty, so files that `public/` or other tools put in `dist/` are never touched, and neither is anything outside `dist/`, even through a linked folder. A file it can't delete, such as one another program has open, keeps its cache entry, so the next build tries again.

### Upgrading

When a Stati release records more about each page, the first build after upgrading re-renders every page once to record it; later builds use the cache as usual.

### Cache manifest

Stati maintains a cache manifest at `.stati/manifest.json`. Entries are keyed by output path:

```json
{
  "entries": {
    "/blog/first-post.html": {
      "path": "/blog/first-post.html",
      "inputsHash": "sha256-cf6a9a641fd5…",
      "deps": [
        "/home/me/my-site/site/blog/layout.eta",
        "/home/me/my-site/site/base.eta",
        "/home/me/my-site/site/partials/header.eta"
      ],
      "templateLookups": [
        { "name": "layout", "from": "blog", "file": "blog/layout.eta" },
        { "name": "base", "from": "blog", "file": "base.eta" },
        { "name": "partials/header", "from": "blog", "file": "partials/header.eta" }
      ],
      "templatesRecorded": true,
      "assetDeps": ["/home/me/my-site/site/blog/map.png"],
      "tags": ["blog", "news"],
      "publishedAt": "2024-01-15T00:00:00.000Z",
      "renderedAt": "2024-01-20T10:00:00.000Z",
      "ttlSeconds": 21600,
      "maxAgeCapDays": 365,
      "readsCollection": true,
      "readsNav": false
    }
  },
  "navigationHash": "…"
}
```

`deps` lists the template files the page rendered, layout first, and `templateLookups` the names it looked up, each with the folder the lookup started from and the file it found. `readsCollection` and `readsNav` record whether the last render read `stati.collection` and the navigation. An entry without these records makes its page rebuild once.

### Build process

1. **Content discovery** - Find all Markdown pages, create [generated and paginated pages](/core-concepts/collections), and build the navigation tree
2. **Cache check** - For each page, compare its content, template and data hashes with the manifest, and check its TTL
3. **Selective rendering** - Render only the pages that changed, expired, or have no output file yet
4. **Cleanup** - Delete the output of pages that no longer exist
5. **Manifest update** - Save new cache entries, including each page's template dependencies and what it read

## Configuration

### Basic ISG setup

Configure ISG in `stati.config.js`:

```javascript
import { defineConfig } from '@stati/core';

export default defineConfig({
  isg: {
    // Enable ISG (default: true)
    enabled: true,

    // Cache TTL in seconds (default: 6 hours)
    ttlSeconds: 21600,

    // Maximum age cap in days (default: 365 days)
    maxAgeCapDays: 365,

    // TTL by content age, measured from the page's publish date
    aging: [
      { untilDays: 7, ttlSeconds: 21600 },   // up to 7 days old: 6 hours
      { untilDays: 30, ttlSeconds: 86400 },  // up to 30 days old: 24 hours
      { untilDays: 90, ttlSeconds: 259200 }, // up to 90 days old: 3 days
      { untilDays: 365, ttlSeconds: 604800 } // up to 365 days old: 7 days
    ],
  },
});
```

The defaults apply even without an `isg` block: ISG is enabled, `ttlSeconds` is 21600 and `maxAgeCapDays` is 365.

## Cache management

### Manual invalidation

Use the CLI to invalidate specific content:

```bash
# Invalidate by path (cache keys are output paths such as /blog/post-1.html)
stati invalidate path:/blog/post-1

# Invalidate by tag
stati invalidate tag:blog

# Invalidate entries rendered in the last 7 days
stati invalidate age:7days

# Clear the whole cache, so the next build renders everything
stati invalidate

# Several terms: an entry matching ANY of them is invalidated
stati invalidate "path:/blog/ tag:navigation age:30days"
```

### Programmatic invalidation

Use the invalidate function programmatically in your build scripts or applications:

```javascript
import { invalidate } from '@stati/core';

// Invalidate specific paths
await invalidate('path:/blog/');

// Invalidate by tag
await invalidate('tag:navigation');

// Invalidate entries rendered within the last 30 days (exact calendar arithmetic)
await invalidate('age:30days');

// Invalidate anything matching any of the terms
await invalidate('path:/blog/ tag:navigation age:30days');

// Clear all cache
await invalidate();
```

### Cache configuration

#### Basic time-based caching

The `isg` settings apply to every page. A page can override them with `ttlSeconds` and `maxAgeCapDays` in its front matter:

```javascript
export default defineConfig({
  isg: {
    // TTL for pages without a publish date
    ttlSeconds: 21600, // 6 hours

    // TTL for dated pages, by age
    aging: [
      { untilDays: 7, ttlSeconds: 1800 },   // up to 7 days old: 30 minutes
      { untilDays: 30, ttlSeconds: 3600 },  // up to 30 days old: 1 hour
      { untilDays: 90, ttlSeconds: 86400 }, // up to 90 days old: 24 hours
    ],
  },
});
```

```markdown
---
title: Breaking news
ttlSeconds: 300
---
```

## Aging configuration

Aging rules set the TTL from a page's age, counted from its publish date (the `publishedAt`, `published`, `date` or `createdAt` front matter field). For each page Stati uses the first rule, in ascending `untilDays` order, whose `untilDays` is at least the page's age; pages older than every rule use the last rule. Pages without a publish date use `ttlSeconds`.

```javascript
export default defineConfig({
  isg: {
    aging: [
      { untilDays: 7, ttlSeconds: 21600 },   // up to 7 days old: 6 hours
      { untilDays: 30, ttlSeconds: 86400 },  // up to 30 days old: 24 hours
      { untilDays: 90, ttlSeconds: 259200 }, // up to 90 days old: 3 days
      { untilDays: 365, ttlSeconds: 604800 } // up to 365 days old: 7 days
    ],
  },
});
```

List rules in ascending `untilDays` order, without duplicates, with `untilDays` no greater than `maxAgeCapDays` (365 by default) and `ttlSeconds` no greater than 30 days; otherwise the config is rejected. Pages older than `maxAgeCapDays` are frozen: they are only rebuilt when their content or templates change.

### Age format for invalidation

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

## Build efficiency

### How ISG helps

```text
Traditional SSG (full rebuild):
├── Every change: Rebuilds all pages
└── Large sites: Can be slow

Stati with ISG (incremental):
├── First build: Full build
├── Body edit: Only the edited page
├── Title or tag edit: The edited page, the pages that list it, and for a title the pages that show the navigation
└── Layout change: Only pages using that layout
```

### Development experience

During development, ISG provides fast feedback:

- **Initial build** - The dev server clears the cache and builds every page
- **Content change** - The edited page rebuilds, along with the pages that list it or render the navigation when what they show changed; a deleted page's HTML is removed
- **Template change** - The pages that rendered the template rebuild; a template no page renders rebuilds nothing
- **Template added or deleted** - The pages whose template names now find a different file rebuild, along with the pages that rendered a deleted template

This means most edits during development result in significantly faster rebuilds compared to full site regeneration.

## Cache storage

### Cache directory structure

```text
.stati/
├── manifest.json            # Cache entries and navigation hash
├── tailwind-classes.html    # Tailwind class inventory (only when the project uses Tailwind)
├── metrics/                 # Build metrics (only with --metrics)
├── .build-lock              # Present while `stati build` runs
└── .dev-server-lock         # Present while `stati dev` runs
```

### Cache persistence

`.stati/manifest.json` stores the cache between runs. A cached page is reused only while its HTML file still exists in the output directory, so a cache is only useful together with the previous `dist/`.

**Hosting Considerations:**

| Environment                  | Cache Behavior         | Setup Required                          |
| ---------------------------- | ---------------------- | --------------------------------------- |
| Traditional servers          | Persists on disk       | None                                    |
| CI/CD pipelines              | Lost between runs      | Cache both `.stati/` and `dist/`        |
| Serverless (Vercel, Netlify) | Ephemeral filesystems  | Use platform cache features for both    |
| Docker containers            | Lost on rebuild        | Mount volumes for `.stati/` and `dist/` |

**CI/CD Cache Examples:**

```yaml
# GitHub Actions
- uses: actions/cache@v4
  with:
    path: |
      .stati
      dist
    key: stati-cache-${{ hashFiles('site/**') }}
    restore-keys: stati-cache-

# GitLab CI
cache:
  paths:
    - .stati/
    - dist/
```

For platforms with ephemeral filesystems, the first build will always be a full build. Subsequent builds within the same deployment or cached CI run will benefit from ISG.

## Monitoring and debugging

### Build output

Stati reports cache performance during builds, showing how many pages were generated vs cached and the cache hit rate. Use the `--metrics` flag for detailed build performance data.

ISG is central to Stati's build workflow. Understanding how to configure and optimize it will improve your development experience and build times. Next, learn about [Static Assets & Bundling](/core-concepts/static-assets) to understand how Stati handles CSS, JavaScript, and other assets.
