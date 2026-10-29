---
title: 'Incremental Static Generation'
description: 'Learn about Incremental Static Generation and build caching.'
order: 6
---

# Incremental Static Generation

Incremental Static Generation (ISG) caches each page between builds and renders only the pages whose inputs changed. It runs at build time: a static host needs a new build to show new content.

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

### Pages that fail to render

A page that logged an error while it rendered in a production build (a failed layout, shell or include, or an include that names no template) is never served from the cache. Every build renders it again and logs the error again, until the error is fixed, so a build that reuses `.stati/` still shows it. Its cache entry stays in the manifest, so its HTML is still removed when the page is deleted.

### Removing pages that no longer exist

`stati build` deletes the HTML of pages that no longer exist: a deleted or renamed Markdown file, a draft after a build with `--include-drafts`, a tag no post uses anymore, or the last page of a listing that got shorter. It deletes only files the cache manifest records, along with folders that deleting them leaves empty, so files that `public/` or other tools put in `dist/` are never touched, and neither is anything outside `dist/`, even through a linked folder. A file it can't delete, such as one another program has open, keeps its cache entry, so the next build tries again. Invalidating the cache (`stati invalidate`, or `stati dev` at start-up) keeps the entries, marked to render again, so a page deleted afterwards is still removed.

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

`deps` lists the template files the page rendered, layout first, and `templateLookups` the names it looked up, each with the folder the lookup started from and the file it found. `readsCollection` and `readsNav` record whether the last render read `stati.collection` and the navigation. An entry without these records, such as one an older Stati release wrote, makes its page rebuild once. `templatesRecorded` marks an entry whose `deps` and `templateLookups` were recorded while the page rendered, and `ttlSeconds` is the page's effective TTL. `images` lists the generated images the page references.

### Build process

1. **Content discovery** - Find all Markdown pages, create [generated and paginated pages](/core-concepts/collections), and build the navigation tree
2. **Cache check** - For each page, compare its content, template and data hashes with the manifest, and check its TTL
3. **Selective rendering** - Render only the pages that changed, expired, or have no output file yet
4. **Cleanup** - Delete the output of pages that no longer exist
5. **Manifest update** - Save new cache entries, including each page's template dependencies and what it read

## Configuration

Set the default TTL, aging rules and the age cap in the [`isg` options](/configuration/isg). A page can override its TTL and age cap in front matter.

## Invalidation

`stati invalidate` removes cache entries by tag, path, glob or render age, so the next build renders those pages again. See [Cache invalidation](/configuration/isg#cache-invalidation).

## Development

In `stati dev`:

- **Initial build** - The dev server clears the cache and builds every page
- **Content change** - The edited page rebuilds, along with the pages that list it or render the navigation when what they show changed; a deleted page's HTML is removed
- **Template change** - The pages that rendered the template rebuild; a template no page renders rebuilds nothing
- **Template added or deleted** - The pages whose template names now find a different file rebuild, along with the pages that rendered a deleted template

## Cache storage

### Cache directory structure

```text
.stati/
├── manifest.json            # Cache entries and navigation hash
├── tailwind-classes.html    # Tailwind class inventory (only when the project uses Tailwind)
├── images/manifest.json     # Generated and copied images, reused between builds
├── metrics/                 # Build metrics (only with --metrics)
├── .build-lock              # Present while `stati build` runs
└── .dev-server-lock         # Present while `stati dev` runs
```

### Cache persistence

`.stati/manifest.json` stores the cache between runs. A cached page is reused only while its HTML file still exists in the output directory, so a cache is only useful together with the previous `dist/`.

Keep both `.stati/` and `dist/` between builds. A CI runner or container that starts empty builds every page.

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

## Monitoring and debugging

### Build output

Stati reports cache performance during builds, showing how many pages were generated vs cached and the cache hit rate. Use the `--metrics` flag for detailed build performance data.

Next, learn about [Static Assets & Bundling](/core-concepts/static-assets) to understand how Stati handles CSS, JavaScript, and other assets.
