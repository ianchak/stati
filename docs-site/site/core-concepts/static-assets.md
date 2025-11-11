---
title: 'Static Assets'
description: 'Learn how to manage static files, CSS, JavaScript, images, and integrate with Tailwind CSS.'
order: 6
---

# Static Assets & Bundling

Stati provides powerful asset processing capabilities to handle CSS, JavaScript, images, and other static files. This provides modern development features like hot module replacement, optimized builds, and support for the latest web technologies.

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

Files in `src/` are processed by Stati's build pipeline:

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
<% const styles = stati.cssModules['card'] %>
<div class="<%= styles.card %>">
  <h3 class="<%= styles.title %>"><%= stati.page.title %></h3>
  <div class="<%= styles.content %>">
    <%~ stati.content %>
  </div>
</div>
```

## Tailwind CSS Integration

Stati provides automatic support for dynamic Tailwind classes when using the `stati.propValue()` helper function. This ensures that dynamically-generated classes (like `from-${color}-50`) are properly included in your CSS build.

### Installation

```bash
npm install -D tailwindcss
npx tailwindcss init
```

### Configuration

**Important**: Add `./.stati/tailwind-classes.html` to your content array to ensure dynamic classes are detected:

```javascript
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './site/**/*.{md,eta,html}',
    './src/**/*.{js,ts}',
    './.stati/tailwind-classes.html', // ← Required for dynamic class support
  ],
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

> **Note**: The `.stati/tailwind-classes.html` file is automatically generated during build and dev server startup. It contains all dynamic Tailwind classes used in your templates via `stati.propValue()`.

### Dynamic Classes with propValue

When using template variables to build Tailwind classes, use `stati.propValue()` to ensure they're tracked:

```eta
<%
const color = 'primary'; // Could come from frontMatter or config
%>

<!-- ✅ Correct - Classes will be tracked and included -->
<button class="<%= stati.propValue(`from-${color}-50`, `to-${color}-100`, 'px-4', 'py-2') %>">
  Click me
</button>

<!-- ❌ Incorrect - Dynamic classes won't be detected by Tailwind -->
<button class="<%= `from-${color}-50 to-${color}-100` %> px-4 py-2">
  Click me
</button>
```

The `propValue()` function:

- Automatically tracks dynamic Tailwind classes for the inventory
- Filters out falsy values
- Works with strings, arrays, and objects (like classnames library)
- Only tracks classes that match dynamic patterns (color utilities, variants, etc.)

### Usage in Templates

```eta
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><%= stati.page.title %></title>
  <link rel="stylesheet" href="/src/styles.css">
</head>
<body class="bg-gray-50 text-gray-900">
  <header class="bg-white shadow-sm border-b">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <nav class="flex items-center justify-between h-16">
        <div class="flex items-center space-x-4">
          <a href="/" class="text-xl font-bold text-brand-500">
            <%= stati.site.title %>
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
      <%~ stati.content %>
    </article>
  </main>
</body>
</html>
```

### Development with Built-in Watcher

Stati's development server includes integrated Tailwind CSS support. Simply pass the input and output file paths:

```bash
stati dev --tailwind-input src/styles.css --tailwind-output public/styles.css
```

This starts both the Stati dev server and Tailwind watcher in a single process. When you stop the dev server (`Ctrl+C`), the Tailwind watcher stops automatically.

**Quiet mode (default):**

- Shows only errors from Tailwind
- Keeps console output clean during development

**Verbose mode:**

- Use `--tailwind-verbose` flag to see all Tailwind output
- Helpful for debugging or monitoring compilation times

**Requirements:**

- `tailwindcss` must be installed locally in your project
- Stati validates the installation before starting the watcher

See the [Development Server](/cli/development/) documentation for more details on Tailwind integration.

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

// Navigation functionality
function initNavigation() {
  const menuToggle = document.querySelector('[data-menu-toggle]');
  const mobileMenu = document.querySelector('[data-mobile-menu]');

  if (menuToggle && mobileMenu) {
    menuToggle.addEventListener('click', () => {
      mobileMenu.classList.toggle('hidden');
    });
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initNavigation();
});
```

### TypeScript Support

Use TypeScript for better type safety:

```typescript
// src/main.ts
interface NavigationItem {
  title: string;
  url: string;
  active?: boolean;
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

Stati automatically handles module bundling:

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

## Images and Media

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

**Note**: Stati copies images from your `public/` directory as-is. For image optimization, you'll need to optimize images before placing them in your project or use external tools in your build process.

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

Static assets are automatically copied to your output directory during builds. Use appropriate file organization and web standards for optimal performance.
