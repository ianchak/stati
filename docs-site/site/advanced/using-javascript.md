---
title: 'Using JavaScript'
description: 'Learn four powerful ways to add JavaScript functionality to your Stati site: inline scripts, external files, built-in TypeScript compilation, and build hooks.'
order: 4
seo:
  title: 'Using JavaScript in Stati'
---

# Using JavaScript

You can add JavaScript in four ways: inline scripts in templates, external JavaScript files, built-in TypeScript compilation (recommended for substantial client-side code), and build-time JavaScript via hooks.

## Method 1: Inline scripts in templates

The most straightforward way to add JavaScript is by including inline `<script>` tags directly in your Eta templates. This is ideal for small, page-specific scripts that enhance the user experience.

### When to use

- **Small interactive features**: Scroll-to-top buttons, mobile navigation toggles, etc.
- **Page-specific behavior**: Form validation, animations specific to one page
- **Quick enhancements**: When you don't need a separate file

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

### Example: Mobile navigation toggle

```eta
<!-- Header with mobile menu -->
<header>
    <nav>
        <button id="menu-toggle" class="mobile-menu-btn">
            Menu
        </button>
        <ul id="nav-menu" class="nav-menu">
            <li><a href="<%= stati.url('/') %>">Home</a></li>
            <li><a href="<%= stati.url('/docs') %>">Docs</a></li>
            <li><a href="<%= stati.url('/blog') %>">Blog</a></li>
        </ul>
    </nav>
</header>

<script>
    // Mobile menu toggle
    const menuToggle = document.getElementById('menu-toggle');
    const navMenu = document.getElementById('nav-menu');

    menuToggle.addEventListener('click', () => {
        navMenu.classList.toggle('active');
        menuToggle.setAttribute(
            'aria-expanded',
            navMenu.classList.contains('active')
        );
    });

    // Close menu on outside click
    document.addEventListener('click', (e) => {
        if (!menuToggle.contains(e.target) && !navMenu.contains(e.target)) {
            navMenu.classList.remove('active');
            menuToggle.setAttribute('aria-expanded', 'false');
        }
    });
</script>
```

---

## Method 2: External JavaScript files

For larger scripts or reusable functionality, place your JavaScript in separate files within the `public/` directory. Stati will copy these files to your build output automatically.

### When to use external files

- **Large scripts**: Any JavaScript over 20-30 lines
- **Reusable functionality**: Code used across multiple pages
- **Third-party integrations**: Analytics, chat widgets, etc.
- **Module-based code**: When you want to use ES modules
- **Separation of concerns**: Keep templates clean and focused

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

### Example: Theme switcher

Create `public/js/theme-switcher.js`:

```javascript
// Theme switcher with localStorage persistence
(function() {
    const STORAGE_KEY = 'stati-theme';
    const DARK_CLASS = 'dark';

    // Get saved theme or default to light
    function getTheme() {
        return localStorage.getItem(STORAGE_KEY) || 'light';
    }

    // Save theme preference
    function saveTheme(theme) {
        localStorage.setItem(STORAGE_KEY, theme);
    }

    // Apply theme to document
    function applyTheme(theme) {
        if (theme === 'dark') {
            document.documentElement.classList.add(DARK_CLASS);
        } else {
            document.documentElement.classList.remove(DARK_CLASS);
        }
    }

    // Toggle between themes
    function toggleTheme() {
        const currentTheme = getTheme();
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        saveTheme(newTheme);
        applyTheme(newTheme);
        return newTheme;
    }

    // Initialize theme on page load
    function init() {
        const theme = getTheme();
        applyTheme(theme);

        // Set up toggle button
        const toggleBtn = document.getElementById('theme-toggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                const newTheme = toggleTheme();
                toggleBtn.setAttribute('aria-label',
                    `Switch to ${newTheme === 'light' ? 'dark' : 'light'} mode`
                );
            });
        }
    }

    // Run on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
```

Include it in the template that writes the page's `<body>`:

```eta
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title><%= stati.page.title %></title>
    <link rel="stylesheet" href="<%= stati.url('/styles.css') %>">
</head>
<body>
    <header>
        <button id="theme-toggle" aria-label="Switch to dark mode">
            Toggle theme
        </button>
    </header>

    <main>
        <%~ stati.content %>
    </main>

    <!-- Load external script -->
    <script src="<%= stati.url('/js/theme-switcher.js') %>"></script>
</body>
</html>
```

### Example: Search functionality

Create `public/js/search.js`:

This example searches the index that Stati builds when `search: { enabled: true }` is set (see [Search](/configuration/search)). It assumes Fuse.js is loaded on the page, for example from a CDN.

```javascript
// Client-side search using Fuse.js over Stati's search index
class SiteSearch {
    constructor(documents) {
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
            link.href = item.anchor ? `${item.url}#${item.anchor}` : item.url;
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

    const search = new SiteSearch(searchIndex.documents);

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

Build hooks in your config run JavaScript during the build. They can modify content, fetch data, generate files, and more.

### When to use build hooks

- **Data fetching**: Load data from APIs at build time
- **Content transformation**: Adjust page data and Markdown before rendering
- **Integration with external services**: CMS, analytics, databases
- **Build-time calculations**: Reading time, related posts, etc.

A `beforeAll` hook can push pages onto `ctx.pages`, and Stati renders them, but navigation and generated pages are worked out before it runs. For pages from data, [`collections.generate`](/core-concepts/collections#pages-from-data) is the better fit: it may be async, so it can fetch from a CMS or API, and the pages it returns are rendered by a `[param].md` template, with their data as `stati.generated.data`. Pages that each need their own Markdown body suit a script that writes the files before `stati build` (for example a `prebuild` npm script).

### Hook types

Stati provides four main hooks:

1. **`beforeAll`** - Runs once after the pages are loaded, before any page renders
2. **`beforeRender`** - Runs before rendering each page that is re-rendered (cached pages skip it)
3. **`afterRender`** - Runs after rendering each re-rendered page
4. **`afterAll`** - Runs once after the build completes

> **Important:** a page whose front matter `beforeRender` changes is re-rendered on every build (see the [caching note](/api/hooks#beforerender)). Add data in `beforeAll` instead, which runs before the cache check, so a page rebuilds only when its data changes.

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

### Example: Show the reading time

Stati counts the words of every page and sets `wordCount` and `readingTime`, so no hook is needed. Set the reading speed in the config if the default of 230 words a minute does not suit your readers:

```javascript
export default defineConfig({
    readingTime: { wordsPerMinute: 200 },
});
```

Use in your template:

```eta
<% if (stati.page.readingTime) { %>
    <p class="meta">
        <%= stati.page.readingTime %> min read • <%= stati.page.wordCount %> words
    </p>
<% } %>
```

### Example: Generate related posts

A post layout can read its folder's posts from [`stati.collection`](/core-concepts/collections) and pick related ones there. To compute them in config instead: `beforeRender` only receives the current page, so collect the posts in `beforeAll`, which sees every page:

```javascript
export default defineConfig({
    hooks: {
        beforeAll: async (ctx) => {
            // Get all blog posts, newest first
            const blogPosts = ctx.pages
                .filter(p => p.url.startsWith('/blog/'))
                .sort((a, b) => new Date(b.frontMatter.date) - new Date(a.frontMatter.date));

            for (const page of blogPosts) {
                // Find related posts by tags
                const currentTags = page.frontMatter.tags || [];
                page.frontMatter.relatedPosts = blogPosts
                    .filter(post => post.url !== page.url)
                    .filter(post => (post.frontMatter.tags || []).some(tag => currentTags.includes(tag)))
                    .slice(0, 3)
                    .map(post => ({ url: post.url, frontMatter: { title: post.frontMatter.title } }));
            }
        }
    }
});
```

Display related posts:

```eta
<% if (stati.page.relatedPosts && stati.page.relatedPosts.length > 0) { %>
    <aside class="related-posts">
        <h2>Related Posts</h2>
        <ul>
            <% stati.page.relatedPosts.forEach(post => { %>
                <li>
                    <a href="<%= stati.url(post.url) %>">
                        <%= post.frontMatter.title %>
                    </a>
                </li>
            <% }); %>
        </ul>
    </aside>
<% } %>
```

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

---

## Comparison

| Method | Best For | Performance | Complexity | Runs At |
|--------|----------|-------------|------------|---------|
| **Inline Scripts** | Small UI enhancements, page-specific logic | Good (inline) | Low | Runtime (browser) |
| **External Files** | Simple reusable scripts, no bundling needed | Good (cached) | Low | Runtime (browser) |
| **TypeScript** | Type-safe code, modern development, production apps | Excellent (bundled, minified) | Medium | Runtime (browser) |
| **Build Hooks** | Data fetching, content generation, SEO | Excellent (build-time) | High | Build time (Node.js) |

## Learn more

- [TypeScript Configuration](/configuration/typescript)
- [Build Hooks API](/api/hooks)
- [Templates and layouts](/core-concepts/templates)
- [Template Configuration](/configuration/templates)
- [Eta Template Documentation](https://eta.js.org/), for the tag syntax: Stati templates combine with `stati.include()` and `stati.layout()`, not Eta's `include()` and `layout()`
