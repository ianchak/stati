---
title: 'Incremental Static Generation'
description: 'Learn about Incremental Static Generation and build caching.'
order: 5
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

For each page, Stati records the **templates** it was rendered with: its layout, plus the partials it references by name (`stati.partials.header`, `stati.partials.card({ … })`) or loads from `_` folders with `include()`. It also records the **images** the page shows, from Markdown or `stati.image()`, hashed by content. A page is re-rendered when its own Markdown or front matter changes, when one of those templates or images changes, or when its TTL expires. The [ISG configuration](/configuration/isg#template-dependency-tracking) page lists the template changes that are not detected.

Other pages are **not** dependencies. A listing page such as `blog/index.md` that shows the titles of the posts in `stati.collection` is not re-rendered when you edit a post:

```text
When blog/post-1.md changes (stati build):
✅ Rebuild blog/post-1 (its content changed)
❌ Skip blog (index page) — still cached until its TTL expires
❌ Skip blog/post-2 (no changes)

When blog/layout.eta changes:
✅ Rebuild every page rendered with blog/layout.eta
```

To refresh listing pages after editing posts, run `stati build --force`, invalidate them (`stati invalidate path:/blog.html`), or give them a short `ttlSeconds` in their front matter. You can also make the listing depend on its posts: in a `beforeAll` hook, write a fingerprint of what the listing shows into the index page's front matter. The page's hash then changes whenever a post's title (or whatever you include) changes:

```javascript
export default defineConfig({
  hooks: {
    beforeAll: (ctx) => {
      const posts = ctx.pages.filter((p) => p.url.startsWith('/blog/'));
      const index = ctx.pages.find((p) => p.url === '/blog');
      if (index) {
        index.frontMatter.postsFingerprint = posts
          .map((p) => `${p.url}|${p.frontMatter.title}`)
          .join('\n');
      }
    },
  },
});
```

During `stati dev`, an edit that changes a page's `title` or `order` (or adds or removes a page) rebuilds every page.

### Cache manifest

Stati maintains a cache manifest at `.stati/manifest.json`. Entries are keyed by output path:

```json
{
  "entries": {
    "/blog/first-post.html": {
      "path": "/blog/first-post.html",
      "inputsHash": "sha256-cf6a9a641fd5…",
      "deps": ["/home/me/my-site/site/blog/layout.eta", "/home/me/my-site/site/_partials/header.eta"],
      "assetDeps": ["/home/me/my-site/site/blog/map.png"],
      "tags": ["blog", "news"],
      "publishedAt": "2024-01-15T00:00:00.000Z",
      "renderedAt": "2024-01-20T10:00:00.000Z",
      "ttlSeconds": 21600,
      "maxAgeCapDays": 365
    }
  },
  "navigationHash": "…"
}
```

### Build process

1. **Content discovery** - Find all Markdown pages and build the navigation tree
2. **Cache check** - For each page, compare its content and template hashes with the manifest, and check its TTL
3. **Selective rendering** - Render only the pages that changed, expired, or have no output file yet
4. **Manifest update** - Save new cache entries, including each page's template dependencies

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
├── Content change: Only the edited page
└── Layout change: Only pages using that layout
```

### Development experience

During development, ISG provides fast feedback:

- **Initial build** - The dev server clears the cache and builds every page
- **Content change** - The edited page rebuilds; if its `title` or `order` changed, every page rebuilds so navigation stays current
- **Template change** - All pages using that template rebuild

This means most edits during development result in significantly faster rebuilds compared to full site regeneration.

## Cache storage

### Cache directory structure

```text
.stati/
├── manifest.json            # Cache entries and navigation hash
├── tailwind-classes.html    # Tailwind class inventory (only when Tailwind is detected)
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
