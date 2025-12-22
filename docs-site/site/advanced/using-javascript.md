---
title: 'Using JavaScript in Stati'
description: 'Learn four powerful ways to add JavaScript functionality to your Stati site: inline scripts, external files, built-in TypeScript compilation, and build hooks.'
layout: layout.eta
order: 4
---

# Using JavaScript in Stati

Stati is a static site generator, but that doesn't mean your sites have to be purely static. You can add interactivity and dynamic behavior using JavaScript in four main ways: inline scripts in templates, external JavaScript files, built-in TypeScript compilation (recommended for substantial client-side code), and build-time JavaScript via hooks.

## Table of Contents

- [Method 1: Inline Scripts in Templates](#method-1-inline-scripts-in-templates)
- [Method 2: External JavaScript Files](#method-2-external-javascript-files)
- [Method 3: Built-in TypeScript Compilation](#method-3-built-in-typescript-compilation)
- [Method 4: Build Hooks (Build-Time JavaScript)](#method-4-build-hooks-build-time-javascript)
- [Comparison & Best Practices](#comparison--best-practices)

---

## Method 1: Inline Scripts in Templates

The most straightforward way to add JavaScript is by including inline `<script>` tags directly in your Eta templates. This is ideal for small, page-specific scripts that enhance the user experience.

### When to Use

- **Small interactive features**: Scroll-to-top buttons, mobile navigation toggles, etc.
- **Page-specific behavior**: Form validation, animations specific to one page
- **Quick enhancements**: When you don't need a separate file

### Example: Scroll to Top Button

In your `layout.eta` template:

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

### Example: Mobile Navigation Toggle

```eta
<!-- Header with mobile menu -->
<header>
    <nav>
        <button id="menu-toggle" class="mobile-menu-btn">
            Menu
        </button>
        <ul id="nav-menu" class="nav-menu">
            <li><a href="/">Home</a></li>
            <li><a href="/docs/">Docs</a></li>
            <li><a href="/blog/">Blog</a></li>
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

### Example: Loading External Libraries

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

### Inline Script Advantages

- ✅ Simple and direct
- ✅ No build step required
- ✅ Easy to understand and maintain
- ✅ Perfect for small scripts
- ✅ Can use Eta template variables in scripts

### Inline Script Considerations

- ⚠️ Can clutter templates if scripts get large
- ⚠️ Not easily reusable across pages
- ⚠️ No module system (unless using ES modules)
- ⚠️ Increases HTML file size

---

## Method 2: External JavaScript Files

For larger scripts or reusable functionality, place your JavaScript in separate files within the `public/` directory. Stati will copy these files to your build output automatically.

### When to Use External Files

- **Large scripts**: Any JavaScript over 20-30 lines
- **Reusable functionality**: Code used across multiple pages
- **Third-party integrations**: Analytics, chat widgets, etc.
- **Module-based code**: When you want to use ES modules
- **Separation of concerns**: Keep templates clean and focused

### File Structure

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

### Example: Theme Switcher

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

Include in your `layout.eta`:

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
            🌙 Toggle Theme
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

### Example: Search Functionality

Create `public/js/search.js`:

```javascript
// Client-side search using Fuse.js
class SiteSearch {
    constructor(searchIndex) {
        this.fuse = new Fuse(searchIndex, {
            keys: ['title', 'description', 'content'],
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
        if (results.length === 0) {
            container.innerHTML = '<p class="no-results">No results found</p>';
            return;
        }

        const html = results.map(result => `
            <article class="search-result">
                <h3><a href="${result.item.url}">${result.item.title}</a></h3>
                <p>${result.item.description}</p>
            </article>
        `).join('');

        container.innerHTML = html;
    }
}

// Initialize search when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    const searchInput = document.getElementById('search-input');
    const searchResults = document.getElementById('search-results');

    if (!searchInput || !searchResults) return;

    // Load search index
    const response = await fetch('/search-index.json');
    const searchIndex = await response.json();

    const search = new SiteSearch(searchIndex);

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

### Example: Using ES Modules

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

### External File Advantages

- ✅ Clean separation of concerns
- ✅ Reusable across multiple pages
- ✅ Better for version control and code review
- ✅ Can use modern JavaScript features and modules
- ✅ Easier to test and debug
- ✅ Can be minified and bundled

### External File Considerations

- ⚠️ Requires separate HTTP request (can be mitigated with HTTP/2 or bundling)
- ⚠️ Cannot directly access Eta template variables
- ⚠️ Need to manage script loading order

---

## Method 3: Built-in TypeScript Compilation

For modern, type-safe client-side code, Stati provides built-in TypeScript compilation powered by [esbuild](https://esbuild.github.io/). This is the **recommended approach** for any substantial client-side functionality.

### When to Use Built-in TypeScript

- **Type safety**: Catch errors at build time, not runtime
- **Modern development**: Full IDE support with IntelliSense
- **Production optimization**: Automatic minification and cache-busting hashes
- **Hot reload**: Instant updates during development
- **Bundle management**: Automatic script injection into HTML

### Quick Setup

Create a new project with TypeScript:

```bash
npx create-stati my-site --typescript
```

Or enable TypeScript in an existing project by adding to your `stati.config.ts`:

```typescript
import { defineConfig } from '@stati/core';

export default defineConfig({
  site: {
    title: 'My Site',
  },
  typescript: {
    enabled: true, // Enable TypeScript compilation
    // bundles defaults to [{ entryPoint: 'main.ts', bundleName: 'main' }]
  },
});
```

### Project Structure

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

### Example: Interactive Navigation

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

### Automatic Bundle Injection

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

### Development vs Production

Stati automatically adjusts behavior based on build mode:

| Feature | Development (`stati dev`) | Production (`stati build`) |
|---------|---------------------------|----------------------------|
| Filenames | Stable (`bundle.js`) | Hashed (`bundle-a1b2c3d4.js`) |
| Source maps | ✅ Enabled | ❌ Disabled |
| Minification | ❌ Disabled | ✅ Enabled |
| Watch mode | ✅ Hot reload | N/A |

### TypeScript Advantages

- ✅ Type safety with full IDE support
- ✅ Automatic bundling and optimization
- ✅ Hot reload in development
- ✅ Production-ready output (minified, hashed)
- ✅ No manual script tag management
- ✅ Modern ES module output

### TypeScript Considerations

- ⚠️ Requires initial setup (`--typescript` flag or config)
- ⚠️ Run `npm run typecheck` to catch type errors (esbuild doesn't type-check)

> Stati supports [multiple bundles](/configuration/typescript/#multiple-bundles) with per-page targeting for advanced use cases. For full configuration options, see the [TypeScript Configuration Guide](/configuration/typescript).

---

## Method 4: Build Hooks (Build-Time JavaScript)

The most powerful way to use JavaScript in Stati is through build hooks in your `stati.config.js`. These hooks run during the build process and can modify content, fetch data, generate files, and more.

### When to Use Build Hooks

- **Data fetching**: Load data from APIs at build time
- **Content transformation**: Process markdown, images, etc.
- **Dynamic page generation**: Create pages programmatically
- **Integration with external services**: CMS, analytics, databases
- **Build-time calculations**: Reading time, related posts, etc.

### Hook Types

Stati provides four main hooks:

1. **`beforeAll`** - Runs once before the build starts
2. **`beforeRender`** - Runs before rendering each page
3. **`afterRender`** - Runs after rendering each page
4. **`afterAll`** - Runs once after the build completes

### Example: Fetch Data at Build Time

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
            console.log('Fetching external data...');

            // Fetch from API
            const response = await fetch('https://api.example.com/products');
            const products = await response.json();

            // Store in context for use in pages
            ctx.globalData = { products };

            console.log(`Loaded ${products.length} products`);
        }
    }
});
```

Access the data in your templates:

```eta
<h1>Our Products</h1>
<div class="products">
    <% stati.globalData.products.forEach(product => { %>
        <article class="product">
            <h2><%= product.name %></h2>
            <p><%= product.description %></p>
            <span class="price">$<%= product.price %></span>
        </article>
    <% }); %>
</div>
```

### Example: Calculate Reading Time

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

### Example: Generate Related Posts

```javascript
export default defineConfig({
    hooks: {
        beforeRender: async (ctx) => {
            if (ctx.page.url.startsWith('/blog/')) {
                // Get all blog posts
                const blogPosts = ctx.pages
                    .filter(p => p.url.startsWith('/blog/') && p.url !== ctx.page.url)
                    .sort((a, b) => new Date(b.frontMatter.date) - new Date(a.frontMatter.date));

                // Find related posts by tags
                const currentTags = ctx.page.frontMatter.tags || [];
                const relatedPosts = blogPosts
                    .filter(post => {
                        const postTags = post.frontMatter.tags || [];
                        return postTags.some(tag => currentTags.includes(tag));
                    })
                    .slice(0, 3);

                ctx.page.frontMatter.relatedPosts = relatedPosts;
            }
        }
    }
});
```

Display related posts:

```eta
<% if (stati.relatedPosts && stati.relatedPosts.length > 0) { %>
    <aside class="related-posts">
        <h2>Related Posts</h2>
        <ul>
            <% stati.relatedPosts.forEach(post => { %>
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

### Example: Generate Search Index

```javascript
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export default defineConfig({
    hooks: {
        afterAll: async (ctx) => {
            console.log('Generating search index...');

            // Create search index from all pages
            const searchIndex = ctx.pages.map(page => ({
                title: page.frontMatter.title || 'Untitled',
                description: page.frontMatter.description || '',
                url: page.url,
                content: page.content
                    .replace(/<[^>]*>/g, '') // Strip HTML
                    .substring(0, 500) // First 500 chars
            }));

            // Write to public directory
            const indexPath = join(ctx.config.outDir, 'search-index.json');
            await writeFile(indexPath, JSON.stringify(searchIndex, null, 2));

            console.log(`Generated search index with ${searchIndex.length} entries`);
        }
    }
});
```

### Example: Integration with CMS

```javascript
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export default defineConfig({
    hooks: {
        beforeAll: async (ctx) => {
            // Fetch content from headless CMS
            const cmsContent = await fetchFromCMS();

            // Generate markdown files
            for (const item of cmsContent) {
                const markdown = `---
title: ${item.title}
date: ${item.date}
author: ${item.author}
---

${item.content}
`;

                const filePath = join(
                    ctx.config.siteDir,
                    'blog',
                    `${item.slug}.md`
                );
                await writeFile(filePath, markdown);
            }

            console.log(`Generated ${cmsContent.length} posts from CMS`);
        }
    }
});

async function fetchFromCMS() {
    const response = await fetch('https://cms.example.com/api/posts', {
        headers: {
            'Authorization': `Bearer ${process.env.CMS_TOKEN}`
        }
    });
    return response.json();
}
```

### Build Hook Advantages

- ✅ Most powerful option
- ✅ Can fetch and process data at build time
- ✅ Generate dynamic content from external sources
- ✅ Full access to Node.js APIs
- ✅ Pre-render data that would otherwise require client-side fetching
- ✅ Better performance (no runtime data fetching)
- ✅ Better SEO (content is in the HTML)

### Build Hook Considerations

- ⚠️ Runs at build time, not runtime
- ⚠️ Changes require rebuilding
- ⚠️ Can slow down builds if doing heavy processing
- ⚠️ Requires understanding of the build pipeline

---

## Comparison & Best Practices

### Quick Reference Table

| Method | Best For | Performance | Complexity | Runs At |
|--------|----------|-------------|------------|---------|
| **Inline Scripts** | Small UI enhancements, page-specific logic | Good (inline) | Low | Runtime (browser) |
| **External Files** | Simple reusable scripts, no bundling needed | Good (cached) | Low | Runtime (browser) |
| **TypeScript** | Type-safe code, modern development, production apps | Excellent (bundled, minified) | Medium | Runtime (browser) |
| **Build Hooks** | Data fetching, content generation, SEO | Excellent (build-time) | High | Build time (Node.js) |

### When to Use Each Method

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
- Want hot reload during development
- Building production-ready applications

**Use Build Hooks when:**

- Fetching data from APIs
- Generating pages programmatically
- Processing content at build time
- Need access to all pages/content
- Want to optimize performance

### Best Practices

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
            * Fetches latest blog posts from external API
            * and generates static pages at build time
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
   beforeAll: async (ctx) => {
       const data = await fetchExternalData();

       // Validate before using
       if (!isValidData(data)) {
           throw new Error('Invalid data from API');
       }

       ctx.globalData = data;
   }
   ```

### Combining Methods

You can (and should) use multiple methods together. Here's an example that combines TypeScript for client-side code with build hooks for data fetching:

```typescript
// stati.config.ts - Build hooks for data + TypeScript enabled
import { defineConfig } from '@stati/core';

export default defineConfig({
    typescript: {
        enabled: true, // Your TypeScript bundle is auto-injected
    },
    hooks: {
        beforeAll: async (ctx) => {
            // Fetch blog posts at build time
            ctx.globalData = await fetchBlogPosts();
        },
        beforeRender: async (ctx) => {
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
    <!-- Use data from build hooks -->
    <nav>
        <% stati.globalData.blogPosts.slice(0, 5).forEach(post => { %>
            <a href="<%= post.url %>"><%= post.title %></a>
        <% }); %>
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
- [Template Configuration](/configuration/templates)
- [Eta Template Documentation](https://eta.js.org/)
