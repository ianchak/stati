---
title: 'Using JavaScript'
description: 'Learn four powerful ways to add JavaScript functionality to your Stati site: inline scripts, external files, built-in TypeScript compilation, and build hooks.'
order: 4
seo:
  title: 'Using JavaScript in Stati'
---

# Using JavaScript

Stati is a static site generator, but that doesn't mean your sites have to be purely static. You can add interactivity and dynamic behavior using JavaScript in four main ways: inline scripts in templates, external JavaScript files, built-in TypeScript compilation (recommended for substantial client-side code), and build-time JavaScript via hooks.

## Table of contents

- [Method 1: Inline Scripts in Templates](#method-1-inline-scripts-in-templates)
- [Method 2: External JavaScript Files](#method-2-external-javascript-files)
- [Method 3: Built-in TypeScript Compilation](#method-3-built-in-typescript-compilation)
- [Method 4: Build Hooks (Build-Time JavaScript)](#method-4-build-hooks-build-time-javascript)
- [Comparison & Best Practices](#comparison-and-best-practices)

---

## Method 1: Inline scripts in templates

The most straightforward way to add JavaScript is by including inline `<script>` tags directly in your Eta templates. This is ideal for small, page-specific scripts that enhance the user experience.

### When to use

- **Small interactive features**: Scroll-to-top buttons, mobile navigation toggles, etc.
- **Page-specific behavior**: Form validation, animations specific to one page
- **Quick enhancements**: When you don't need a separate file

### Example: Scroll to top button

The examples on this page show a `layout.eta` that writes the whole page, as in the blank starter. If your layouts share a shell with `stati.layout()`, as in the blog, docs and news starters, the `<head>` and `<body>` are in the shell, such as `site/base.eta`, so the scripts go there. See [Sharing a shell](/core-concepts/templates#sharing-a-shell).

In the template that writes the page's `<body>`:

```eta
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><%= stati.page.title %></title>
    <link rel="stylesheet" href="/styles.css">
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
            <li><a href="/">Home</a></li>
            <li><a href="/docs">Docs</a></li>
            <li><a href="/blog">Blog</a></li>
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

### Example: Loading external libraries

You can also use inline scripts to initialize external libraries:

```eta
<head>
    <!-- Load particles.js library -->
    <script src="https://cdn.jsdelivr.net/particles.js/2.0.0/particles.min.js" defer></script>
</head>

<body>
    <div id="particles-js"></div>

    <script>
        // Wait for library to load
        window.addEventListener('DOMContentLoaded', () => {
            if (typeof particlesJS !== 'undefined') {
                particlesJS('particles-js', {
                    particles: {
                        number: { value: 80 },
                        color: { value: '#ffffff' },
                        shape: { type: 'circle' },
                        opacity: { value: 0.5 },
                        size: { value: 3 }
                    }
                });
            }
        });
    </script>
</body>
```

### Inline script advantages

- ✅ Simple and direct
- ✅ No build step required
- ✅ Easy to understand and maintain
- ✅ Perfect for small scripts
- ✅ Can use Eta template variables in scripts

### Inline script considerations

- ⚠️ Can clutter templates if scripts get large
- ⚠️ Not easily reusable across pages
- ⚠️ No module system (unless using ES modules)
- ⚠️ Increases HTML file size

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
    <link rel="stylesheet" href="/styles.css">
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
    <script src="/js/theme-switcher.js"></script>
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

### Example: Using ES modules

Create `public/js/modules/utils.js`:

```javascript
// Utility functions module
export function formatDate(date, locale = 'en-US') {
    return new Date(date).toLocaleDateString(locale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

export function slugify(text) {
    return text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
}
```

Create `public/js/main.js`:

```javascript
// Main application entry point
import { formatDate, debounce, slugify } from './modules/utils.js';

class StatiApp {
    constructor() {
        this.init();
    }

    init() {
        this.setupDateFormatting();
        this.setupSearch();
        this.setupNavigation();
    }

    setupDateFormatting() {
        document.querySelectorAll('[data-timestamp]').forEach(el => {
            const timestamp = el.dataset.timestamp;
            el.textContent = formatDate(timestamp);
        });
    }

    setupSearch() {
        const searchInput = document.getElementById('search');
        if (searchInput) {
            searchInput.addEventListener('input',
                debounce(this.handleSearch.bind(this), 300)
            );
        }
    }

    handleSearch(event) {
        const query = event.target.value;
        console.log('Searching for:', query);
        // Implement search logic
    }

    setupNavigation() {
        // Add active states, smooth scrolling, etc.
    }
}

// Initialize app
new StatiApp();
```

Include in your template with module type:

```eta
<script type="module" src="/js/main.js"></script>
```

### External file advantages

- ✅ Clean separation of concerns
- ✅ Reusable across multiple pages
- ✅ Better for version control and code review
- ✅ Can use modern JavaScript features and modules
- ✅ Easier to test and debug
- ✅ Can be minified and bundled

### External file considerations

- ⚠️ Requires separate HTTP request (can be mitigated with HTTP/2 or bundling)
- ⚠️ Cannot directly access Eta template variables
- ⚠️ Need to manage script loading order

---

## Method 3: Built-in TypeScript compilation

For modern, type-safe client-side code, Stati provides built-in TypeScript compilation powered by [esbuild](https://esbuild.github.io/). This is the **recommended approach** for any substantial client-side functionality.

### When to use built-in TypeScript

- **Type safety**: Catch type errors before deploying with `npm run typecheck` (esbuild compiles without type checking)
- **Modern development**: Full IDE support with IntelliSense
- **Production optimization**: Automatic minification and cache-busting hashes
- **Live reload**: Bundles are recompiled on change and the browser reloads during development
- **Bundle management**: Automatic script injection into HTML

### Quick setup

New projects use TypeScript by default:

```bash
npx create-stati my-site
```

Or enable TypeScript in an existing project by adding to your `stati.config.ts`:

```typescript
import { defineConfig } from '@stati/core';

export default defineConfig({
  site: {
    title: 'My Site',
    baseUrl: 'https://example.com',
  },
  typescript: {
    enabled: true, // Enable TypeScript compilation
    // bundles defaults to [{ entryPoint: 'main.ts', bundleName: 'main' }]
  },
});
```

### Project structure

```text
my-site/
├── src/
│   └── main.ts           # Your TypeScript entry point
├── site/
│   ├── layout.eta
│   └── index.md
├── stati.config.ts
└── tsconfig.json
```

### Example: Interactive navigation

Create `src/main.ts`:

```typescript
interface NavState {
  isOpen: boolean;
  activeItem: string | null;
}

class Navigation {
  private state: NavState = { isOpen: false, activeItem: null };
  private menuBtn: HTMLButtonElement | null;
  private menu: HTMLElement | null;

  constructor() {
    this.menuBtn = document.querySelector('.menu-toggle');
    this.menu = document.querySelector('.nav-menu');
    this.init();
  }

  private init(): void {
    if (!this.menuBtn || !this.menu) return;

    this.menuBtn.addEventListener('click', () => this.toggle());
    this.highlightCurrentPage();
  }

  private toggle(): void {
    this.state.isOpen = !this.state.isOpen;
    this.menu?.classList.toggle('open', this.state.isOpen);
    this.menuBtn?.setAttribute('aria-expanded', String(this.state.isOpen));
  }

  private highlightCurrentPage(): void {
    const currentPath = window.location.pathname;
    this.menu?.querySelectorAll('a').forEach(link => {
      if (link.getAttribute('href') === currentPath) {
        link.classList.add('active');
        this.state.activeItem = currentPath;
      }
    });
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new Navigation();
});
```

### Automatic bundle injection

Stati **automatically injects** your compiled bundle into every page before `</body>`. No template changes needed:

```html
<!-- Automatically added by Stati -->
<script type="module" src="/_assets/main-a1b2c3d4.js"></script>
</body>
```

For advanced use cases like preloading, access the bundle paths in templates:

```eta
<head>
  <% if (stati.assets?.bundlePaths?.length) { %>
    <% for (const path of stati.assets.bundlePaths) { %>
    <link rel="modulepreload" href="<%= path %>">
    <% } %>
  <% } %>
</head>
```

### Development vs production

Stati automatically adjusts behavior based on build mode:

| Feature | Development (`stati dev`) | Production (`stati build`) |
|---------|---------------------------|----------------------------|
| Filenames | Stable (`bundle.js`) | Hashed (`bundle-a1b2c3d4.js`) |
| Source maps | ✅ Enabled | ❌ Disabled |
| Minification | ❌ Disabled | ✅ Enabled |
| Watch mode | ✅ Recompile and live reload | N/A |

### TypeScript advantages

- ✅ Type safety with full IDE support
- ✅ Automatic bundling and optimization
- ✅ Live reload in development
- ✅ Production-ready output (minified, hashed)
- ✅ No manual script tag management
- ✅ Modern ES module output

### TypeScript considerations

- ⚠️ Projects created with `--no-typescript` need the `typescript` config block added by hand
- ⚠️ Run `npm run typecheck` to catch type errors (esbuild doesn't type-check)

> Stati supports [multiple bundles](/configuration/typescript/#multiple-bundles) with per-page targeting for advanced use cases. For full configuration options, see the [TypeScript Configuration Guide](/configuration/typescript).

---

## Method 4: Build hooks (build-time JavaScript)

The most powerful way to use JavaScript in Stati is through build hooks in your `stati.config.js`. These hooks run during the build process and can modify content, fetch data, generate files, and more.

### When to use build hooks

- **Data fetching**: Load data from APIs at build time
- **Content transformation**: Adjust page data and Markdown before rendering
- **Integration with external services**: CMS, analytics, databases
- **Build-time calculations**: Reading time, related posts, etc.

Hooks cannot add pages, but [`collections.generate`](/core-concepts/collections#pages-from-data) can: it may be async, so it can fetch from a CMS or API, and the pages it returns are rendered by a `[param].md` template, with their data as `stati.generated.data`. Pages that each need their own Markdown body suit a script that writes the files before `stati build` (for example a `prebuild` npm script).

### Hook types

Stati provides four main hooks:

1. **`beforeAll`** - Runs once after the pages are loaded, before any page renders
2. **`beforeRender`** - Runs before rendering each page that is re-rendered (cached pages skip it)
3. **`afterRender`** - Runs after rendering each re-rendered page
4. **`afterAll`** - Runs once after the build completes

> **Important:** Hook contexts (`BuildContext` and `PageContext`) don't include shared state properties. To share data between hooks, use module-level variables as shown in the examples below. Data can then be added to `ctx.page.frontMatter` in `beforeRender` to make it available in templates.

### Example: Fetch data at build time

In your `stati.config.js`:

```javascript
import { defineConfig } from '@stati/core';

// Module-level state for sharing data between hooks
let sharedData = {};

export default defineConfig({
    site: {
        title: 'My Stati Site',
        baseUrl: 'https://example.com'
    },
    hooks: {
        // Fetch data before building
        beforeAll: async (ctx) => {
            console.log('Fetching external data...');

            // Fetch from API
            const response = await fetch('https://api.example.com/products');
            const products = await response.json();

            // Store in module-level state
            sharedData.products = products;

            console.log(`Loaded ${products.length} products`);
        },

        beforeRender: async (ctx) => {
            // Add shared data to page frontmatter
            ctx.page.frontMatter.products = sharedData.products;
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

### Example: Calculate reading time

```javascript
export default defineConfig({
    hooks: {
        beforeRender: async (ctx) => {
            // Calculate reading time for blog posts
            if (ctx.page.url.startsWith('/blog/')) {
                const wordCount = ctx.page.content.split(/\s+/).length;
                const readingTime = Math.ceil(wordCount / 200); // 200 words per minute

                // Add to page front matter
                ctx.page.frontMatter.readingTime = readingTime;
                ctx.page.frontMatter.wordCount = wordCount;
            }
        }
    }
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
                    <a href="<%= post.url %>">
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

Hooks cannot add pages. For CMS entries that each need their own Markdown body, write the files in a script that runs **before** Stati; pages a template can render from data can come from [`collections.generate`](/core-concepts/collections#pages-from-data) instead:

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

### Build hook advantages

- ✅ Most powerful option
- ✅ Can fetch and process data at build time
- ✅ Generate dynamic content from external sources
- ✅ Full access to Node.js APIs
- ✅ Pre-render data that would otherwise require client-side fetching
- ✅ Better performance (no runtime data fetching)
- ✅ Better SEO (content is in the HTML)

### Build hook considerations

- ⚠️ Runs at build time, not runtime
- ⚠️ Changes require rebuilding
- ⚠️ Can slow down builds if doing heavy processing
- ⚠️ Requires understanding of the build pipeline

---

## Comparison & best practices

### Quick reference table

| Method | Best For | Performance | Complexity | Runs At |
|--------|----------|-------------|------------|---------|
| **Inline Scripts** | Small UI enhancements, page-specific logic | Good (inline) | Low | Runtime (browser) |
| **External Files** | Simple reusable scripts, no bundling needed | Good (cached) | Low | Runtime (browser) |
| **TypeScript** | Type-safe code, modern development, production apps | Excellent (bundled, minified) | Medium | Runtime (browser) |
| **Build Hooks** | Data fetching, content generation, SEO | Excellent (build-time) | High | Build time (Node.js) |

### When to use each method

**Use Inline Scripts when:**

- Adding small interactive features (less than 30 lines)
- Implementing page-specific behavior
- Need quick access to Eta template variables
- Don't need to reuse the code

**Use External Files when:**

- Simple reusable scripts without bundling needs
- Quick prototyping
- Legacy JavaScript that doesn't need TypeScript

**Use Built-in TypeScript when:**

- Building any substantial client-side functionality
- Want type safety and IDE support
- Need automatic bundling and optimization
- Want live reload during development
- Building production-ready applications

**Use Build Hooks when:**

- Fetching data from APIs
- Processing content at build time
- Need access to all pages/content
- Want to optimize performance

### Best practices

#### Performance

1. **Load scripts efficiently:**

   ```eta
   <!-- Defer non-critical scripts -->
   <script src="/js/analytics.js" defer></script>

   <!-- Use async for independent scripts -->
   <script src="/js/ads.js" async></script>

   <!-- Inline critical scripts -->
   <script>/* Critical code here */</script>
   ```

2. **Minimize and bundle in production:**

   ```javascript
   // Use a bundler like esbuild or rollup
   // in your build process
   ```

3. **Use build hooks to pre-compute expensive operations:**

   ```javascript
   // Calculate at build time instead of runtime
   hooks: {
       beforeRender: async (ctx) => {
           ctx.page.frontMatter.processedData =
               expensiveCalculation(ctx.page.content);
       }
   }
   ```

#### Organization

1. **Keep related code together:**

   ```text
   public/
   ├── js/
   │   ├── main.js
   │   ├── components/
   │   │   ├── search.js
   │   │   ├── navigation.js
   │   │   └── theme.js
   │   └── utils/
   │       ├── dom.js
   │       └── format.js
   ```

2. **Use consistent naming conventions:**

   ```javascript
   // Use descriptive names
   public/js/theme-switcher.js    // Good
   public/js/script.js            // Bad
   ```

3. **Document your build hooks:**

   ```javascript
   export default defineConfig({
       hooks: {
           /**
            * Fetches the latest blog posts from an external API
            * and adds them to the blog index's front matter
            */
           beforeAll: async (ctx) => {
               // Implementation
           }
       }
   });
   ```

#### Security

1. **Sanitize user input:**

   ```javascript
   function sanitize(html) {
       const div = document.createElement('div');
       div.textContent = html;
       return div.innerHTML;
   }
   ```

2. **Use Content Security Policy:**

   ```eta
   <meta http-equiv="Content-Security-Policy"
         content="default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.example.com;">
   ```

3. **Validate data in build hooks:**

   ```javascript
   // Module-level state
   let validatedData = null;

   export default defineConfig({
     hooks: {
       beforeAll: async (ctx) => {
         const data = await fetchExternalData();

         // Validate before using
         if (!isValidData(data)) {
           throw new Error('Invalid data from API');
         }

         validatedData = data;
       },

       beforeRender: async (ctx) => {
         // Add validated data to pages as needed
         ctx.page.frontMatter.externalData = validatedData;
       }
     }
   });
   ```

### Combining methods

You can (and should) use multiple methods together. Here's an example that combines TypeScript for client-side code with build hooks for data fetching:

```typescript
// stati.config.ts - Build hooks for data + TypeScript enabled
import { defineConfig } from '@stati/core';

// Module-level state for sharing data between hooks
let blogPosts: any[] = [];

export default defineConfig({
    typescript: {
        enabled: true, // Your TypeScript bundle is auto-injected
    },
    hooks: {
        beforeAll: async (ctx) => {
            // Fetch blog posts at build time
            blogPosts = await fetchBlogPosts();
        },
        beforeRender: async (ctx) => {
            // Add shared data to page frontmatter
            ctx.page.frontMatter.blogPosts = blogPosts;

            // Calculate reading time
            ctx.page.frontMatter.readingTime =
                calculateReadingTime(ctx.page.content);
        }
    }
});
```

```typescript
// src/main.ts - Your TypeScript client-side code
import { initTheme } from './theme';
import { initSearch } from './search';

document.addEventListener('DOMContentLoaded', () => {
    initTheme();    // Theme switching logic
    initSearch();   // Client-side search
});
```

```eta
<!-- layout.eta - Build hook data + auto-injected TypeScript bundle -->
<!DOCTYPE html>
<html>
<head>
    <title><%= stati.page.title %></title>
    <% if (stati.assets?.bundlePaths?.length) { %>
      <% for (const path of stati.assets.bundlePaths) { %>
      <link rel="modulepreload" href="<%= path %>">
      <% } %>
    <% } %>
</head>
<body>
    <!-- Use data from build hooks (added to page frontmatter) -->
    <nav>
        <% if (stati.page.blogPosts) { %>
          <% stati.page.blogPosts.slice(0, 5).forEach(post => { %>
            <a href="<%= post.url %>"><%= post.title %></a>
          <% }); %>
        <% } %>
    </nav>

    <main><%~ stati.content %></main>

    <!-- TypeScript bundle auto-injected here by Stati -->
    <!-- Small inline script for truly page-specific behavior -->
    <script>
        // Quick highlight - too small for TypeScript
        document.querySelector(`nav a[href="${location.pathname}"]`)
            ?.classList.add('active');
    </script>
</body>
</html>
```

---

## Summary

Stati gives you four powerful ways to use JavaScript:

1. **Inline Scripts** - Perfect for small, page-specific enhancements (< 30 lines)
2. **External Files** - Good for simple reusable scripts without bundling
3. **Built-in TypeScript** - Recommended for any substantial client-side code
4. **Build Hooks** - Ideal for data fetching and build-time processing

**For most projects**, we recommend using **TypeScript** for client-side code and **Build Hooks** for data processing, with inline scripts reserved for tiny page-specific enhancements.

The key is to use build hooks for anything that can be computed at build time, TypeScript for type-safe client-side functionality, and inline scripts only for trivial page-specific behavior.

For more information:

- [TypeScript Configuration](/configuration/typescript)
- [Build Hooks API](/api/hooks)
- [Templates & Layouts](/core-concepts/templates)
- [Template Configuration](/configuration/templates)
- [Eta Template Documentation](https://eta.js.org/), for the tag syntax: Stati templates combine with `stati.include()` and `stati.layout()`, not Eta's `include()` and `layout()`
