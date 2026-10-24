---
title: 'Static assets'
description: 'Learn how to manage static files, images, and integrate TypeScript and Tailwind CSS.'
order: 7
---

# Static assets

## Overview

Stati handles static assets and provides built-in TypeScript compilation. It also runs Tailwind CSS when you give `stati dev` and `stati build` its input and output; other CSS processing, such as Sass or PostCSS, uses standard tooling at the project level.

## Static assets (`public/`)

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

Static assets are copied after the pages are written, and generated files are written last: if `public/` contains a `robots.txt` or `sitemap.xml` and the matching feature is enabled, the generated file replaces your copy in production builds.

Avoid a `public/_img/` folder: Stati writes copied and generated images to `/_img/`.

Use the `public/` directory for:

- Favicons and meta images
- Document downloads
- Third-party scripts
- Pre-built CSS stylesheets
- Any assets that don't need processing

## TypeScript compilation (`src/`)

When TypeScript compilation is enabled, Stati uses esbuild to compile TypeScript from the `src/` directory:

```text
src/
├── main.ts              # Default entry point (global bundle)
├── docs.ts              # Optional: targeted bundle for /docs/**
└── components/
    └── nav.ts           # Component modules
```

Your compiled bundles are automatically injected into pages before the closing `</body>` tag. Stati supports multiple bundles with per-page targeting via include/exclude patterns, so you can ship only the JavaScript each page needs. For full TypeScript configuration options, see the [TypeScript Configuration Guide](/configuration/typescript).

## CSS processing

Stati does not include a built-in CSS preprocessor. Tailwind CSS runs from Stati's commands when you pass them its input and output (see [Tailwind CSS integration](#tailwind-css-integration)); other tools, such as Sass or PostCSS, run from your npm scripts.

The `create-stati` scaffolder can set up these tools for you. See the [Styling Solutions](/cli/scaffolder#styling-solutions) section for available options.

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

Production builds link a copy named after its content, such as `/_assets/styles-A1B2C3D4.css`, so browsers never pair new pages with an old cached stylesheet. See [CSS](/configuration/css#stylesheets-in-public).

### Sass/SCSS projects

When you select Sass during project scaffolding, `create-stati` configures npm scripts to compile SCSS:

```bash
# Development (watches and compiles SCSS alongside Stati dev server)
npm run dev

# Production build (compiles SCSS into public/, then builds the site)
npm run build

# Standalone scripts (also available)
npm run watch:css   # Watch and compile SCSS only
npm run build:css   # Compile SCSS only
```

The scaffolder creates an `src/styles.scss` file with your SCSS source and compiles it into `public/styles.css`, which the templates link. Production builds name it after its content, like any stylesheet in `public/`. See [CSS](/configuration/css#sass).

## Tailwind CSS integration

Stati provides automatic support for dynamic Tailwind classes when you build classes with `stati.propValue()`. This ensures that dynamically-generated classes (like `from-${color}-50`) are properly included in your CSS build.

### Installation

Stati works with Tailwind CSS 4 and 3. Tailwind CSS 4 ships its command line tool in a separate package:

```bash
npm install -D tailwindcss @tailwindcss/cli @tailwindcss/typography @tailwindcss/forms
```

### Configuration

Tailwind CSS 4 is configured in the stylesheet. Import Tailwind, then add an `@source` rule for `.stati/tailwind-classes.html`, where Stati lists the classes your templates build at render time:

```css
/* src/styles.css */
@import 'tailwindcss';

/* Required for dynamic class support. The path is relative to this file. */
@source '../.stati/tailwind-classes.html';

@plugin '@tailwindcss/typography';
@plugin '@tailwindcss/forms';

@theme {
  --color-brand-50: #eff6ff;
  --color-brand-500: #0066cc;
  --color-brand-900: #1e3a8a;
  --font-sans: 'Inter', system-ui, sans-serif;
}
```

**Important**: Tailwind finds the templates in your project by itself, but it skips everything your `.gitignore` lists, and `.stati/` is normally listed. Without the `@source` rule, classes built with `stati.propValue()` are missing from the CSS. A template folder that is ignored, or outside the project, needs an `@source` rule of its own.

> **Note**: The `.stati/tailwind-classes.html` file is automatically generated during build and dev server startup. It contains all dynamic Tailwind classes used in your templates via `stati.propValue()`.

> **Tailwind CSS 3:** the command is part of the `tailwindcss` package (`npm install -D tailwindcss@3`) and the configuration lives in `tailwind.config.js`. Add `./.stati/tailwind-classes.html` to its `content` array, along with globs that cover every folder that holds templates, such as `./site/**/*.{md,eta,html}`.

### Dynamic classes with propValue

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

### Usage in templates

Link the output under its path, as in development; production builds point the link at the hashed file. A page without the link gets one before `</head>`.

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
          <a href="/docs" class="text-gray-600 hover:text-gray-900 transition-colors">
            Documentation
          </a>
          <a href="/blog" class="text-gray-600 hover:text-gray-900 transition-colors">
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

### Development with built-in watcher

Stati's development server includes integrated Tailwind CSS support. Simply pass the input and output file paths:

```bash
stati dev --tailwind-input src/styles.css --tailwind-output dist/styles.css
```

This starts both the Stati dev server and Tailwind watcher in a single process. Pages link the output under its path in `dist/`, `/styles.css`. The watcher runs for as long as the dev server does, also when the dev server runs in a background or CI shell. When you stop the dev server (`Ctrl+C`), the Tailwind watcher stops automatically, and it also exits when the dev server process is killed.

**Quiet mode (default):**

- Shows only errors from Tailwind
- Keeps console output clean during development

**Verbose mode:**

- Use `--tailwind-verbose` flag to see all Tailwind output
- Helpful for debugging or monitoring compilation times

**Requirements:**

- The Tailwind command must be installed locally in your project: `@tailwindcss/cli` for Tailwind CSS 4, or `tailwindcss` for Tailwind CSS 3
- Stati validates the installation before starting the watcher

See the [Development Server](/cli/development) documentation for more details on Tailwind integration.

### Production builds

`stati build` takes the same flags:

```bash
stati build --tailwind-input src/styles.css --tailwind-output dist/styles.css
```

The build runs Tailwind once, after the last page has rendered, so the CSS has every class the templates built with `stati.propValue()`. It writes the minified stylesheet as `dist/_assets/styles-[hash].css`, named after its content, and points every page's link to `/styles.css` at it, adding one where a page has none. A deploy that changes the CSS gives it a new URL, so no browser shows new pages with a cached copy of the old stylesheet. The build also deletes the stylesheets earlier builds wrote under other names.

See [CSS](/configuration/css) for how the build links the file, the `css` options and moving from a separate `build:css` script.

## Images and media

Images in `public/` are copied to the output as they are. When a Markdown page shows one, Stati adds its `width` and `height` and loads it lazily, except the page's first image near the top, such as a hero image, which loads eagerly:

```markdown
![Hero image](/images/hero.jpg)
```

```html
<img src="/images/hero.jpg" alt="Hero image" width="1600" height="900" loading="eager" fetchpriority="high" decoding="async">
```

Images can also sit next to the pages that use them: `![Map](./map.png)` in `site/blog/post.md` reads `site/blog/map.png`, and Stati copies it to `/_img/` under a name that changes with its content. In layouts and partials, `stati.image()` does the same for images such as a post's cover:

```eta
<%~ stati.image(stati.page.cover, { alt: stati.page.coverAlt, priority: true }) %>
```

Raw `<img>` tags are written as authored, so give those `width` and `height` yourself.

### Responsive images

With the optional `@stati/images` package and `images.responsive` on, Stati writes each of these images as a `<picture>` with AVIF and WebP versions at several widths. You don't need to resize images before adding them. See [Images](/configuration/images) for setup, options and caching.

For art direction, such as a different crop on small screens, write the `<picture>` element yourself in a template:

```eta
<picture>
  <source media="(max-width: 768px)" srcset="/images/hero-mobile.jpg">
  <source media="(max-width: 1200px)" srcset="/images/hero-tablet.jpg">
  <img src="/images/hero-desktop.jpg" alt="Hero image" width="1600" height="900">
</picture>
```

## Web fonts

### Google fonts

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

### Self-hosted fonts

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
