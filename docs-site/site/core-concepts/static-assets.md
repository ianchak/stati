---
title: 'Static Assets'
description: 'Learn how to manage static files, images, and integrate TypeScript and Tailwind CSS.'
order: 6
---

# Static Assets

## Overview

Stati handles static assets and provides built-in TypeScript compilation. CSS processing (Sass, PostCSS, Tailwind) is configured at the project level using standard tooling, with optional CLI integration for Tailwind during development.

## Static Assets (`public/`)

Files in the `public/` directory are copied directly to the output without processing:

```text
public/
├── favicon.svg          → /favicon.svg
├── robots.txt           → /robots.txt
├── images/
│   ├── logo.png         → /images/logo.png
│   └── hero.jpg         → /images/hero.jpg
└── downloads/
    └── guide.pdf        → /downloads/guide.pdf
```

Use the `public/` directory for:

- Favicons and meta images
- Document downloads
- Third-party scripts
- Pre-built CSS stylesheets
- Any assets that don't need processing

## TypeScript Compilation (`src/`)

When TypeScript compilation is enabled, Stati uses esbuild to compile TypeScript from the `src/` directory:

```text
src/
├── main.ts              # Default entry point (global bundle)
├── docs.ts              # Optional: targeted bundle for /docs/**
└── components/
    └── nav.ts           # Component modules
```

Your compiled bundles are automatically injected into pages before the closing `</body>` tag. Stati supports multiple bundles with per-page targeting via include/exclude patterns, so you can ship only the JavaScript each page needs. For full TypeScript configuration options, see the [TypeScript Configuration Guide](/configuration/typescript).

## CSS Processing

Stati does not include a built-in CSS preprocessor. Instead, CSS processing is configured at the project level using standard tools like Sass, PostCSS, or Tailwind CSS.

The `create-stati` scaffolder can set up these tools for you. See the [Styling Solutions](/cli/scaffolder/#styling-solutions) section for available options.

### Basic CSS

For simple projects, place your CSS file in `public/` and link to it in your layout template:

```css
/* public/styles.css */
:root {
  --color-primary: #0066cc;
  --font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
}

body {
  font-family: var(--font-family);
  color: #333;
}
```

```eta
<head>
  <link rel="stylesheet" href="/styles.css">
</head>
```

### Sass/SCSS Projects

When you select Sass during project scaffolding, `create-stati` configures npm scripts to compile SCSS:

```bash
# Development (watches and compiles SCSS alongside Stati dev server)
npm run dev

# Production build (compiles Stati site, then SCSS)
npm run build

# Standalone scripts (also available)
npm run watch:css   # Watch and compile SCSS only
npm run build:css   # Compile SCSS only
```

The scaffolder creates a `styles/` directory with your SCSS source files and sets up the build pipeline.

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
module.exports = {
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

- Tracks all classes passed to it for the Tailwind inventory
- Filters out falsy values (null, undefined, false, empty strings)
- Works with strings, arrays, and objects (like the classnames library)
- Splits space-separated strings and tracks each class individually

### Usage in Templates

```eta
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><%= stati.page.title %></title>
  <link rel="stylesheet" href="/styles.css">
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
stati dev --tailwind-input src/styles.css --tailwind-output dist/styles.css
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

See the [Development Server](/cli/development) documentation for more details on Tailwind integration.

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

Place font files in your `public/` directory and reference them in your CSS:

```css
/* public/styles.css */
@font-face {
  font-family: 'CustomFont';
  src:
    url('/fonts/custom-font.woff2') format('woff2'),
    url('/fonts/custom-font.woff') format('woff');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}

body {
  font-family: 'CustomFont', sans-serif;
}
```

With a directory structure like:

```text
public/
├── fonts/
│   ├── custom-font.woff2
│   └── custom-font.woff
└── styles.css
```

Static assets are automatically copied to your output directory during builds.
