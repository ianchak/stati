---
title: 'Using JavaScript'
description: 'Add JavaScript to a Stati site with inline scripts, files in public/, built-in TypeScript bundles or build hooks.'
order: 4
seo:
  title: 'Using JavaScript in Stati'
---

# Using JavaScript

You can add JavaScript in four ways: inline scripts in templates, external JavaScript files, built-in TypeScript compilation (recommended for substantial client-side code), and build-time JavaScript via hooks.

## Method 1: Inline scripts in templates

Put small, page-specific scripts in a `<script>` tag in a template.

### Example: Scroll to top button

The examples on this page show a `layout.eta` that writes the whole page, as in the blank starter. If your layouts share a shell with `stati.layout()`, as in the blog, docs and news starters, the `<head>` and `<body>` are in the shell, such as `site/base.eta`, so the scripts go there. See [Sharing a shell](/core-concepts/templates#sharing-a-shell). Links to the site's own files go through `stati.url()`, which adds the base path of a site served from a subfolder.

In the template that writes the page's `<body>`:

```eta
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><%= stati.page.title %></title>
    <link rel="stylesheet" href="<%= stati.url('/styles.css') %>">
</head>
<body>
    <main>
        <%~ stati.content %>
    </main>

    <!-- Scroll to top button -->
    <button id="scroll-to-top" class="scroll-btn hidden">
        ↑ Back to Top
    </button>

    <script>
        // Scroll to top functionality
        const scrollBtn = document.getElementById('scroll-to-top');

        window.addEventListener('scroll', () => {
            if (window.pageYOffset > 300) {
                scrollBtn.classList.remove('hidden');
            } else {
                scrollBtn.classList.add('hidden');
            }
        });

        scrollBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    </script>
</body>
</html>
```

---

## Method 2: External JavaScript files

Put larger or shared scripts in files in the `public/` directory. Stati copies them to `dist/` as they are.

### File structure

```text
my-stati-site/
├── public/
│   ├── js/
│   │   ├── main.js           # Main site JavaScript
│   │   ├── analytics.js      # Analytics tracking
│   │   ├── search.js         # Search functionality
│   │   └── theme-switcher.js # Dark mode toggle
│   └── styles.css
└── site/
    ├── layout.eta
    └── index.md
```

### Example: Load a script from `public/`

Save the script as `public/js/theme-switcher.js` and load it from the template that writes the page's `<body>`:

```eta
<script src="<%= stati.url('/js/theme-switcher.js') %>"></script>
```

### Example: Search functionality

Create `public/js/search.js`:

This example searches the index that Stati builds when `search: { enabled: true }` is set (see [Search](/configuration/search)). It assumes Fuse.js is loaded on the page, for example from a CDN.

```javascript
// Client-side search using Fuse.js over Stati's search index
class SiteSearch {
    constructor(documents, basePath) {
        // Entry URLs are relative to the site root; basePath is '' for a site at the root
        this.basePath = basePath;
        this.fuse = new Fuse(documents, {
            keys: ['title', 'heading', 'content'],
            threshold: 0.3,
            includeMatches: true,
            minMatchCharLength: 2
        });
    }

    search(query) {
        if (!query || query.trim().length < 2) {
            return [];
        }
        return this.fuse.search(query).slice(0, 10);
    }

    renderResults(results, container) {
        container.replaceChildren();
        if (results.length === 0) {
            container.textContent = 'No results found';
            return;
        }

        for (const { item } of results) {
            const link = document.createElement('a');
            const url = this.basePath + item.url;
            link.href = item.anchor ? `${url}#${item.anchor}` : url;
            link.textContent = item.breadcrumb;
            const article = document.createElement('article');
            article.className = 'search-result';
            article.append(link);
            container.append(article);
        }
    }
}

// Initialize search when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    const searchInput = document.getElementById('search-input');
    const searchResults = document.getElementById('search-results');

    if (!searchInput || !searchResults) return;

    // The index filename includes a hash; Stati puts it in a meta tag
    const meta = document.querySelector('meta[name="stati:search-index"]');
    if (!meta) return;
    const response = await fetch(meta.getAttribute('content'));
    const searchIndex = await response.json();

    const search = new SiteSearch(searchIndex.documents, searchIndex.basePath);

    // Handle search input
    let debounceTimer;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            const results = search.search(e.target.value);
            search.renderResults(results, searchResults);
        }, 300);
    });
});
```

### ES modules

Files in `public/` can import each other as ES modules. Load the entry file with `type="module"`:

```eta
<script type="module" src="<%= stati.url('/js/main.js') %>"></script>
```

Files in `public/` are copied as they are: Stati does not bundle or minify them.

---

## Method 3: Built-in TypeScript compilation

For substantial client-side code, let Stati compile TypeScript with [esbuild](https://esbuild.github.io/): new projects from `create-stati` have it on, and other projects (including ones created with `--no-typescript`) add `typescript: { enabled: true }` to the config and an entry file at `src/main.ts`. Bundles are minified and hashed in production, rebuilt with live reload in `stati dev`, and added to your pages automatically. esbuild does not type-check, so run `tsc --noEmit` as well (the `typecheck` script in TypeScript projects from `create-stati`). See [TypeScript](/configuration/typescript) for the options and per-page bundles.

---

## Method 4: Build hooks (build-time JavaScript)

Build hooks run JavaScript in Node.js during the build, for example to load data from an API or CMS, or to adjust page data before pages render.

A `beforeAll` hook can push pages onto `ctx.pages`, and Stati renders them, but navigation and generated pages are worked out before it runs. For pages from data, [`collections.generate`](/core-concepts/collections#pages-from-data) is the better fit: it may be async, so it can fetch from a CMS or API, and the pages it returns are rendered by a `[param].md` template, with their data as `stati.generated.data`. Pages that each need their own Markdown body suit a script that writes the files before `stati build` (for example a `prebuild` npm script).

The four hooks, `beforeAll`, `beforeRender`, `afterRender` and `afterAll`, and when each runs are described in [Build hooks](/api/hooks#hook-lifecycle). Per-page hooks run only for pages the cache can't serve, and a page whose front matter `beforeRender` changes renders again on every build, so add data in `beforeAll`, which runs before the cache check.

### Example: Fetch data at build time

In your `stati.config.js`:

```javascript
import { defineConfig } from '@stati/core';

export default defineConfig({
    site: {
        title: 'My Stati Site',
        baseUrl: 'https://example.com'
    },
    hooks: {
        // Fetch data before building
        beforeAll: async (ctx) => {
            const response = await fetch('https://api.example.com/products');
            const products = await response.json();

            // Front matter set here is part of the page's cache hash
            for (const page of ctx.pages) {
                if (page.url === '/products') {
                    page.frontMatter.products = products;
                }
            }
        }
    }
});
```

Access the data in your templates:

```eta
<h1>Our Products</h1>
<div class="products">
    <% stati.page.products.forEach(product => { %>
        <article class="product">
            <h2><%= product.name %></h2>
            <p><%= product.description %></p>
            <span class="price">$<%= product.price %></span>
        </article>
    <% }); %>
</div>
```

Reading time and related posts need no hook: every page has `stati.page.readingTime` and `stati.page.wordCount` (see [Word count and reading time](/core-concepts/markdown#word-count-and-reading-time)), and a post layout picks related posts with [`stati.collection.related()`](/core-concepts/collections#related-pages).

### Example: Write an extra file after the build

Stati already builds a search index (`search: { enabled: true }`), a sitemap and RSS feeds. For anything else, write files in `afterAll`:

```javascript
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export default defineConfig({
    hooks: {
        afterAll: async (ctx) => {
            // A simple list of all pages for another tool to read
            const pages = ctx.pages.map(page => ({
                title: page.frontMatter.title || 'Untitled',
                url: page.url,
            }));

            const outDir = ctx.config.outDir ?? 'dist';
            await writeFile(join(outDir, 'pages.json'), JSON.stringify(pages, null, 2));
        }
    }
});
```

### Example: Integration with CMS

For CMS entries that each need their own Markdown body, write the files in a script that runs **before** Stati; pages a template can render from data can come from [`collections.generate`](/core-concepts/collections#pages-from-data) instead:

```javascript
// scripts/fetch-cms.mjs, run with "prebuild": "node scripts/fetch-cms.mjs"
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const response = await fetch('https://cms.example.com/api/posts', {
    headers: { Authorization: `Bearer ${process.env.CMS_TOKEN}` },
});
const posts = await response.json();

await mkdir(join('site', 'blog'), { recursive: true });
for (const post of posts) {
    // JSON.stringify quotes the values, which is valid YAML
    const markdown = `---
title: ${JSON.stringify(post.title)}
publishedAt: ${JSON.stringify(post.date)}
author: ${JSON.stringify(post.author)}
---

${post.content}
`;
    await writeFile(join('site', 'blog', `${post.slug}.md`), markdown);
}

console.log(`Wrote ${posts.length} posts from the CMS`);
```

npm runs a `prebuild` script automatically before `npm run build`.
