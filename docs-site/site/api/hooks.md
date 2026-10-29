---
title: 'Build hooks'
description: 'Learn how to use build hooks to customize the Stati build process.'
order: 2
---

# Build hooks

Build hooks run your own code at four points of a build: `beforeAll`, `beforeRender`, `afterRender` and `afterAll`. Define them under `hooks` in `stati.config.ts`; each may be synchronous or async. The dev server runs them on every rebuild, `beforeAll` and `afterAll` with every page.

## Hook lifecycle

A build runs in this order:

```text
1. Load config, discover Markdown pages, create generated and paginated pages
   (collections.generate runs here), build the navigation tree
2. Compile TypeScript bundles (when enabled)
3. beforeAll    → once, with every page (ctx.pages)
4. Search index written (when search is enabled), from the pages as beforeAll left them
5. For each page:
   - cache check: an unchanged page is skipped here, with no hooks
   - beforeRender → before the page renders
   - Markdown → HTML, layout rendering, SEO/search/script injection, file write
     (the dev server writes the files once every page has rendered, and a production
     build with --tailwind-input/--tailwind-output once Tailwind CSS has run)
   - afterRender  → after the page renders, which can be before its file is written
6. Removal of pages that no longer exist, cache manifest, static asset copy
7. sitemap.xml, robots.txt, RSS feeds (production builds only)
8. afterAll     → once, at the end
```

> **Per-page hooks only run for pages that are rendered.** With ISG enabled (the default), unchanged pages are served from the cache and skip `beforeRender` and `afterRender`. Do work that every page needs, or that other pages depend on, in `beforeAll`. Use `stati build --force` to run the per-page hooks for every page.

A hook that throws, or returns a rejected promise, fails the build. Hooks have no timeout.

## Hook types

### `beforeAll`

Called once, after the content has been loaded and before any page is rendered. `ctx.pages` holds every page, including [generated and paginated pages](/core-concepts/collections) (with `page.generated` or `page.pagination` set), so this is the place to build indexes or other data that templates read through [helpers](/configuration/templates#helpers) or module-level variables. Listings of a folder's pages need no hook: templates read them from [`stati.collection`](/core-concepts/collections).

`beforeAll` runs before the cache check, so values it writes into `page.frontMatter` are part of each page's cache hash. Data a helper hands to templates is not: Stati can't tell which pages use it. To make a page rebuild when such data changes, write what the page shows into its front matter here; see [Dependency tracking](/core-concepts/isg#dependency-tracking).

Generated pages and pagination are worked out before `beforeAll` runs, from the content as loaded: tags a hook adds don't create tag pages.

```javascript
export default defineConfig({
  hooks: {
    beforeAll: async (ctx) => {
      console.log(`Starting build with ${ctx.pages.length} pages`);

      // Initialize external services
      await initializeAnalytics();

      // Validate environment
      if (!process.env.API_KEY) {
        throw new Error('API_KEY environment variable is required');
      }
    }
  }
});
```

### `afterAll`

Called once after completing the build process, after the static assets, sitemap, robots.txt and RSS feeds have been written.

Sitemaps, robots.txt and RSS feeds are built in; enable them with the `sitemap`, `robots` and `rss` options instead of generating them here.

```javascript
import { getEnv } from '@stati/core';

export default defineConfig({
  hooks: {
    afterAll: async (ctx) => {
      console.log(`Build complete! ${ctx.pages.length} pages`);

      // Deploy only from production builds (`stati build`)
      if (getEnv() === 'production') {
        await deployToCDN(ctx.config.outDir ?? 'dist');
      }

      // Send notification
      await sendBuildNotification({
        status: 'success',
        pageCount: ctx.pages.length
      });
    }
  }
});
```

`deployToCDN` and `sendBuildNotification` stand for your own functions.

### `beforeRender`

Called before rendering each page that is rendered in this build (not for pages served from the cache).

Changes the hook makes to `ctx.page.frontMatter` appear in templates as `stati.page.<name>`, and `ctx.page.content` is the Markdown body. Word count and reading time need no hook: every page has `wordCount` and `readingTime`, which hooks can read on `ctx.page` (see [Word count and reading time](/core-concepts/markdown#word-count-and-reading-time)).

```javascript
export default defineConfig({
  hooks: {
    beforeRender: async (ctx) => {
      if (!ctx.page.frontMatter.description) {
        console.warn(`${ctx.page.url} has no description`);
      }
    }
  }
});
```

> **Caching note:** the cache entry stores a hash of the front matter as the hook left it, while the next build compares it with the front matter read from the file. A page whose front matter `beforeRender` changes is therefore re-rendered on every build. Data that is the same every build is better added in `beforeAll` (which runs before the cache check), for example by looping over `ctx.pages` there; never add per-build values such as timestamps.

### `afterRender`

Called after each rendered page has been processed. The context holds the page model and the config only; the rendered HTML is not passed to the hook.

```javascript
export default defineConfig({
  hooks: {
    afterRender: async (ctx) => {
      console.log(`Rendered page: ${ctx.page.url}`);

      await trackPageMetrics({
        url: ctx.page.url,
        title: ctx.page.frontMatter.title,
        wordCount: ctx.page.wordCount,
      });
    }
  }
});
```

`trackPageMetrics` stands for your own function.

## Hook context

Each hook receives a context object with different properties:

### `beforeAll` and `afterAll` context

```typescript
interface BuildContext {
  config: StatiConfig;          // Build configuration
  pages: PageModel[];           // All pages, generated and paginated ones included
}
```

### `beforeRender` and `afterRender` context

```typescript
interface PageContext {
  page: PageModel;             // Current page being processed
  config: StatiConfig;         // Build configuration
}
```

## Advanced hook patterns

### External state management

Each hook receives a new context object, so values you attach to `ctx` do not carry over to later hooks. Use module-level state to share data between hooks, and expose it to templates through a helper:

```javascript
// Module-level state
let sharedBuildData = { posts: [], authors: [] };

export default defineConfig({
  helpers: {
    // Templates call stati.helpers.authors()
    authors: () => sharedBuildData.authors,
  },
  hooks: {
    beforeAll: async (ctx) => {
      // Fetch data once, store in module state
      sharedBuildData = {
        posts: await fetchBlogPosts(),
        authors: await fetchAuthors(),
      };
    },

    afterAll: async (ctx) => {
      console.log(`Rendered with ${sharedBuildData.authors.length} authors`);
    }
  }
});
```

Pages served from the cache are not re-rendered when this shared data changes; see [Dependency tracking](/core-concepts/isg#dependency-tracking).

### Conditional hook execution

```javascript
import { getEnv } from '@stati/core';

export default defineConfig({
  hooks: {
    beforeAll: async (ctx) => {
      // Only blog posts; values set here are part of each page's cache hash
      for (const page of ctx.pages) {
        if (page.url.startsWith('/blog/')) {
          page.frontMatter.category = extractCategory(page.url);
        }
      }
    },

    afterRender: async (ctx) => {
      // Only log in production builds (`stati build`)
      if (getEnv() === 'production') {
        console.log(`Built production page: ${ctx.page.url}`);
      }
    }
  }
});
```

## Hook utilities

### Page filtering helpers

```javascript
const isPost = (page) => page.frontMatter.type === 'post';
const isBlogContent = (page) => page.url.startsWith('/blog/');

export default defineConfig({
  hooks: {
    beforeAll: async (ctx) => {
      // Drafts are only in ctx.pages with --include-drafts
      const publishedPosts = ctx.pages
        .filter(isPost)
        .filter(isBlogContent)
        .sort((a, b) => new Date(b.frontMatter.date) - new Date(a.frontMatter.date));

      // Give the blog index its list; changing a listed post rebuilds it
      const blogIndex = ctx.pages.find((page) => page.url === '/blog');
      if (blogIndex) {
        blogIndex.frontMatter.recentPosts = publishedPosts
          .slice(0, 5)
          .map((post) => ({ url: post.url, title: post.frontMatter.title }));
      }
    }
  }
});
```

## Real-world examples

### Blog with related posts

Posts read the collection of their folder, so a post layout can also find related posts with [`stati.collection.related()`](/core-concepts/collections#related-pages). Computing them in a hook suits data that templates can't reach, such as posts from several collections:

```javascript
function intersection(arr1, arr2) {
  return arr1.filter(item => arr2.includes(item));
}

export default defineConfig({
  hooks: {
    // beforeAll sees every page and runs before the cache check, so the
    // related posts become part of each post's cache hash: a post is
    // rebuilt when its list of related posts changes.
    beforeAll: async (ctx) => {
      const posts = ctx.pages.filter(p => p.frontMatter.type === 'post');

      for (const post of posts) {
        const currentTags = post.frontMatter.tags || [];

        post.frontMatter.relatedPosts = posts
          .filter(p => p.url !== post.url)
          .map(p => ({
            url: p.url,
            title: p.frontMatter.title,
            score: intersection(currentTags, p.frontMatter.tags || []).length
          }))
          .filter(p => p.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, 3);
      }
    }
  }
});
```
