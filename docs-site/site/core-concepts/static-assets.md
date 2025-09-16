---
title: 'Static Assets & Bundling'
description: 'Learn how Stati handles CSS, JavaScript, images, and other static assets with Vite.'
---

# Static Assets & Bundling

Stati leverages Vite's powerful asset processing capabilities to handle CSS, JavaScript, images, and other static files. This provides modern development features like hot module replacement, optimized builds, and support for the latest web technologies.

## Asset Types

### Static Assets (`public/`)

Files in the `public/` directory are copied directly to the output without processing:

```
public/
├── favicon.svg          → /favicon.svg
├── robots.txt           → /robots.txt
├── images/
│   ├── logo.png         → /images/logo.png
│   └── hero.jpg         → /images/hero.jpg
└── downloads/
    └── guide.pdf        → /downloads/guide.pdf
```

Use these for:

- Favicons and meta images
- Document downloads
- Third-party scripts
- Assets that shouldn't be processed

### Processed Assets (`src/`)

Files in `src/` are processed by Vite's build pipeline:

```
src/
├── styles.css           # Main stylesheet
├── main.js              # JavaScript entry point
├── components/
│   ├── header.css       # Component styles
│   └── nav.js           # Component logic
└── assets/
    ├── fonts/           # Web fonts
    ├── icons/           # SVG icons
    └── images/          # Optimized images
```

## CSS Processing

### Basic CSS

Create `src/styles.css` as your main stylesheet:

```css
/* src/styles.css */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

:root {
  --color-primary: #0066cc;
  --color-secondary: #6c757d;
  --color-success: #28a745;
  --color-warning: #ffc107;
  --color-danger: #dc3545;

  --font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --line-height: 1.6;
}

body {
  font-family: var(--font-family);
  line-height: var(--line-height);
  color: #333;
  background: #fff;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
}
```

### PostCSS Support

Stati automatically supports PostCSS with common plugins:

```javascript
// stati.config.js
export default defineConfig({
  css: {
    postcss: {
      plugins: [
        require('autoprefixer'),
        require('cssnano')({
          preset: 'default',
        }),
      ],
    },
  },
});
```

Create `postcss.config.js` for more control:

```javascript
// postcss.config.js
export default {
  plugins: [
    require('postcss-import'),
    require('tailwindcss/nesting'),
    require('tailwindcss'),
    require('autoprefixer'),
    process.env.NODE_ENV === 'production' && require('cssnano'),
  ].filter(Boolean),
};
```

### Sass/SCSS Support

Install Sass and use `.scss` files:

```bash
npm install -D sass
```

```scss
// src/styles.scss
$primary-color: #0066cc;
$secondary-color: #6c757d;

@mixin button-style($bg-color) {
  background: $bg-color;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 0.25rem;
  cursor: pointer;

  &:hover {
    background: darken($bg-color, 10%);
  }
}

.btn-primary {
  @include button-style($primary-color);
  color: white;
}

.btn-secondary {
  @include button-style($secondary-color);
  color: white;
}
```

### CSS Modules

Use CSS Modules for component-scoped styles:

```css
/* src/components/card.module.css */
.card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  padding: 1.5rem;
}

.title {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.content {
  color: #6c757d;
  line-height: 1.6;
}
```

Use in templates:

```eta
<% const styles = it.cssModules['card'] %>
<div class="<%= styles.card %>">
  <h3 class="<%= styles.title %>"><%= it.title %></h3>
  <div class="<%= styles.content %>">
    <%~ it.content %>
  </div>
</div>
```

## Tailwind CSS Integration

### Installation

```bash
npm install -D tailwindcss
npx tailwindcss init
```

### Configuration

```javascript
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./site/**/*.{md,eta}', './src/**/*.{js,ts}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eff6ff',
          500: '#0066cc',
          900: '#1e3a8a',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [require('@tailwindcss/typography'), require('@tailwindcss/forms')],
};
```

### Usage in Templates

```eta
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><%= it.title %></title>
  <link rel="stylesheet" href="/src/styles.css">
</head>
<body class="bg-gray-50 text-gray-900">
  <header class="bg-white shadow-sm border-b">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <nav class="flex items-center justify-between h-16">
        <div class="flex items-center space-x-4">
          <a href="/" class="text-xl font-bold text-brand-500">
            <%= it.site.title %>
          </a>
        </div>

        <div class="hidden md:flex items-center space-x-6">
          <a href="/docs/" class="text-gray-600 hover:text-gray-900 transition-colors">
            Documentation
          </a>
          <a href="/blog/" class="text-gray-600 hover:text-gray-900 transition-colors">
            Blog
          </a>
        </div>
      </nav>
    </div>
  </header>

  <main class="max-w-4xl mx-auto px-4 py-8">
    <article class="prose prose-lg max-w-none">
      <%~ it.content %>
    </article>
  </main>
</body>
</html>
```

## JavaScript Processing

### Basic JavaScript

Create `src/main.js` for site-wide functionality:

```javascript
// src/main.js
console.log('Stati site loaded!');

// Theme switching
function initTheme() {
  const theme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', theme);

  const toggleButton = document.querySelector('[data-theme-toggle]');
  if (toggleButton) {
    toggleButton.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme');
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('theme', newTheme);
    });
  }
}

// Search functionality
function initSearch() {
  const searchInput = document.querySelector('[data-search]');
  if (!searchInput) return;

  let searchIndex = null;

  // Load search index
  fetch('/search-index.json')
    .then((response) => response.json())
    .then((index) => {
      searchIndex = index;
    });

  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    if (query.length < 2) return;

    const results = searchIndex.filter(
      (item) =>
        item.title.toLowerCase().includes(query) || item.content.toLowerCase().includes(query),
    );

    displaySearchResults(results);
  });
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initSearch();
});
```

### TypeScript Support

Use TypeScript for better type safety:

```typescript
// src/main.ts
interface SearchItem {
  title: string;
  url: string;
  content: string;
  tags?: string[];
}

interface SiteConfig {
  title: string;
  baseUrl: string;
  theme: {
    default: 'light' | 'dark';
    storageKey: string;
  };
}

class ThemeManager {
  private config: SiteConfig['theme'];

  constructor(config: SiteConfig['theme']) {
    this.config = config;
    this.init();
  }

  private init(): void {
    const savedTheme = localStorage.getItem(this.config.storageKey);
    const theme = savedTheme || this.config.default;
    this.setTheme(theme as 'light' | 'dark');

    this.bindToggleButton();
  }

  private setTheme(theme: 'light' | 'dark'): void {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(this.config.storageKey, theme);
  }

  private bindToggleButton(): void {
    const button = document.querySelector('[data-theme-toggle]');
    button?.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      const newTheme = current === 'dark' ? 'light' : 'dark';
      this.setTheme(newTheme);
    });
  }
}

// Usage
const siteConfig: SiteConfig = {
  title: 'My Site',
  baseUrl: 'https://example.com',
  theme: {
    default: 'light',
    storageKey: 'theme',
  },
};

new ThemeManager(siteConfig.theme);
```

### Module Bundling

Vite automatically handles module bundling:

```javascript
// src/utils/date.js
export function formatDate(date, options = {}) {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...options,
  }).format(new Date(date));
}

export function timeAgo(date) {
  const now = new Date();
  const diffTime = Math.abs(now - new Date(date));
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;

  return formatDate(date);
}
```

```javascript
// src/components/post-meta.js
import { formatDate, timeAgo } from '../utils/date.js';

export function initPostMeta() {
  document.querySelectorAll('[data-post-date]').forEach((element) => {
    const date = element.getAttribute('data-post-date');
    const showRelative = element.hasAttribute('data-relative');

    element.textContent = showRelative ? timeAgo(date) : formatDate(date);
  });
}
```

## Image Optimization

### Responsive Images

```eta
<!-- Basic responsive image -->
<img src="/images/hero.jpg"
     alt="Hero image"
     loading="lazy"
     class="w-full h-auto">

<!-- Responsive with srcset -->
<img src="/images/hero-800.jpg"
     srcset="/images/hero-400.jpg 400w,
             /images/hero-800.jpg 800w,
             /images/hero-1200.jpg 1200w"
     sizes="(max-width: 768px) 100vw,
            (max-width: 1200px) 80vw,
            1200px"
     alt="Hero image"
     loading="lazy">

<!-- Picture element for art direction -->
<picture>
  <source media="(max-width: 768px)" srcset="/images/hero-mobile.jpg">
  <source media="(max-width: 1200px)" srcset="/images/hero-tablet.jpg">
  <img src="/images/hero-desktop.jpg" alt="Hero image">
</picture>
```

### Image Processing

Use Vite plugins for image optimization:

```javascript
// stati.config.js
import { defineConfig } from '@stati/core';
import { imageOptimize } from 'vite-plugin-imagemin';

export default defineConfig({
  vite: {
    plugins: [
      imageOptimize({
        gifsicle: { optimizationLevel: 7 },
        mozjpeg: { quality: 80 },
        pngquant: { quality: [0.65, 0.8] },
        svgo: {
          plugins: [{ name: 'removeViewBox', active: false }],
        },
      }),
    ],
  },
});
```

## Web Fonts

### Google Fonts

```css
/* Import in CSS */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

/* Or preload in template */
```

```eta
<head>
  <!-- Preconnect for performance -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>

  <!-- Load fonts -->
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>
```

### Self-hosted Fonts

```css
/* src/styles.css */
@font-face {
  font-family: 'CustomFont';
  src:
    url('./assets/fonts/custom-font.woff2') format('woff2'),
    url('./assets/fonts/custom-font.woff') format('woff');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}

body {
  font-family: 'CustomFont', sans-serif;
}
```

## Build Optimization

### Production Configuration

```javascript
// stati.config.js
export default defineConfig({
  build: {
    // Asset optimization
    minify: true,
    sourcemap: false,

    // Rollup options
    rollupOptions: {
      output: {
        // Asset naming
        assetFileNames: 'assets/[name]-[hash][extname]',
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',

        // Manual chunk splitting
        manualChunks: {
          vendor: ['lodash', 'date-fns'],
          utils: ['./src/utils/index.js'],
        },
      },
    },
  },

  // CSS optimization
  css: {
    // CSS code splitting
    extract: true,

    // PostCSS optimization
    postcss: {
      plugins: [
        require('autoprefixer'),
        require('cssnano')({
          preset: [
            'default',
            {
              discardComments: { removeAll: true },
              normalizeWhitespace: false,
            },
          ],
        }),
      ],
    },
  },
});
```

### Asset Preloading

```eta
<head>
  <!-- Preload critical assets -->
  <link rel="preload" href="/src/styles.css" as="style">
  <link rel="preload" href="/src/main.js" as="script">

  <!-- Preload critical images -->
  <link rel="preload" href="/images/hero.jpg" as="image">

  <!-- Prefetch non-critical assets -->
  <link rel="prefetch" href="/images/gallery-1.jpg">
  <link rel="prefetch" href="/src/components/gallery.js">
</head>
```

### Code Splitting

```javascript
// Dynamic imports for code splitting
async function loadGallery() {
  const { Gallery } = await import('./components/gallery.js');
  return new Gallery();
}

// Lazy load components
document.addEventListener('DOMContentLoaded', () => {
  const galleryContainer = document.querySelector('[data-gallery]');

  if (galleryContainer) {
    // Use Intersection Observer for lazy loading
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(async (entry) => {
        if (entry.isIntersecting) {
          const gallery = await loadGallery();
          gallery.init(entry.target);
          observer.unobserve(entry.target);
        }
      });
    });

    observer.observe(galleryContainer);
  }
});
```

## Development Features

### Hot Module Replacement

HMR works automatically during development:

```javascript
// src/main.js
if (import.meta.hot) {
  // HMR-specific code
  import.meta.hot.accept((newModule) => {
    console.log('Module updated:', newModule);
  });

  // Preserve state during HMR
  if (import.meta.hot.data.count) {
    console.log('Preserved count:', import.meta.hot.data.count);
  }

  import.meta.hot.dispose((data) => {
    data.count = window.myAppState?.count || 0;
  });
}
```

### Environment Variables

```javascript
// Access environment variables
const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const isDev = import.meta.env.DEV;
const isProd = import.meta.env.PROD;

console.log('Environment:', {
  apiUrl,
  isDev,
  isProd,
});
```

### Development Tools

```javascript
// stati.config.js
export default defineConfig({
  dev: {
    // Development server options
    port: 3000,
    open: true,
    host: 'localhost',

    // HTTPS in development
    https: false,

    // Proxy API requests
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
});
```

## Asset Loading in Templates

### CSS Integration

```eta
<!-- Load processed CSS -->
<link rel="stylesheet" href="/src/styles.css">

<!-- Component-specific CSS -->
<% if (it.layout === 'blog') { %>
  <link rel="stylesheet" href="/src/components/blog.css">
<% } %>

<!-- Conditional loading -->
<% if (it.frontmatter.hasGallery) { %>
  <link rel="stylesheet" href="/src/components/gallery.css">
<% } %>
```

### JavaScript Integration

```eta
<!-- Load main JavaScript -->
<script type="module" src="/src/main.js"></script>

<!-- Page-specific scripts -->
<% if (it.frontmatter.interactive) { %>
  <script type="module" src="/src/components/interactive.js"></script>
<% } %>

<!-- Inline configuration -->
<script>
  window.siteConfig = {
    baseUrl: '<%= it.site.baseUrl %>',
    currentPath: '<%= it.url %>',
    theme: '<%= it.site.theme || "light" %>'
  };
</script>
```

Stati's asset handling system gives you the power of modern build tools while maintaining the simplicity of static site generation. The integration with Vite ensures you get excellent performance and developer experience out of the box.

You now understand all the core concepts of Stati! Next, explore the [Configuration](/configuration/) section to learn how to customize Stati for your specific needs.
