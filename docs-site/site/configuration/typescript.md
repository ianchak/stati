---
title: 'TypeScript Support'
description: 'Configure TypeScript compilation for your Stati site with esbuild-powered builds.'
order: 8
---

# TypeScript Support

Stati provides first-class TypeScript support for your site's client-side code. Using [esbuild](https://esbuild.github.io/) under the hood, Stati compiles your TypeScript to optimized JavaScript bundles with near-instant build times.

## Quick Start

Create a new Stati project with TypeScript enabled:

```bash
npx create-stati my-site --typescript
```

This creates a project with:

- `stati.config.ts` - Type-safe configuration
- `tsconfig.json` - TypeScript compiler options
- `src/main.ts` - Entry point for your TypeScript code

## Configuration

Enable TypeScript in your `stati.config.ts`:

```typescript
import { defineConfig } from '@stati/core';

export default defineConfig({
  site: {
    title: 'My TypeScript Site',
  },
  typescript: {
    enabled: true,
    srcDir: 'src',           // Source directory (default: 'src')
    outDir: '_assets',       // Output directory within dist (default: '_assets')
    // bundles defaults to [{ entryPoint: 'main.ts', bundleName: 'main' }]
    // hash and minify are automatic - true in production, false in development
  },
});
```

## TypeScriptConfig Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | `boolean` | `false` | Enable TypeScript compilation |
| `srcDir` | `string` | `'src'` | Directory containing TypeScript source files |
| `outDir` | `string` | `'_assets'` | Output subdirectory within `dist/` |
| `bundles` | `BundleConfig[]` | `[{ entryPoint: 'main.ts', bundleName: 'main' }]` | Array of bundle configurations (see [Multiple Bundles](#multiple-bundles)) |
| `hash` | `boolean` | `true` | Add content hash to filename (production only) |
| `minify` | `boolean` | `true` | Minify JavaScript output (production only) |
| `autoInject` | `boolean` | `true` | Automatically inject bundle script tags before `</body>` |

> **Note:** Source maps, hashing, and minification are automatic based on build mode. The `hash` and `minify` options only apply to production builds - development mode always uses stable filenames and unminified output for easier debugging.

## Development vs Production

Stati automatically adjusts TypeScript settings based on the build mode:

### Development (`stati dev`)

- **Stable filenames** - No hash
- **Source maps enabled** - Full debugging support
- **No minification** - Readable output
- **Watch mode** - Automatic recompilation on changes

### Production (`stati build`)

- **Hashed filenames** - `main-a1b2c3d4.js` for cache busting
- **No source maps** - Smaller bundle size, no source code exposure
- **Minified** - Optimized for production

The `hash` and `minify` options only take effect in production builds. Set them to `false` if you need to debug production output.

## Automatic Bundle Injection

When TypeScript is enabled, Stati **automatically injects** script tags into your HTML output before the closing `</body>` tag during both `stati dev` and `stati build`. No template modifications required!

Your compiled bundles are seamlessly added to every page (or specific pages if using include/exclude patterns):

```html
<!-- Automatically injected by Stati -->
<script type="module" src="/_assets/main-a1b2c3d4.js"></script>
</body>
```

### Disabling Auto-Injection

If you need manual control over script placement, disable auto-injection:

```typescript
import { defineConfig } from '@stati/core';

export default defineConfig({
  typescript: {
    enabled: true,
    autoInject: false, // Disable automatic script injection
  },
});
```

When `autoInject: false`, you must manually add script tags in your templates using `stati.assets.bundlePaths`:

```eta
<body>
  <!-- Your content -->

  <% if (stati.assets?.bundlePaths) { %>
    <% for (const path of stati.assets.bundlePaths) { %>
    <script type="module" src="<%= path %>"></script>
    <% } %>
  <% } %>
</body>
```

This is useful when you need to:

- Place scripts in a specific location (e.g., before other scripts)
- Add custom attributes to script tags (e.g., `defer`, `async`)
- Conditionally include scripts based on template logic

### Accessing Bundle Info in Templates

If you need to access bundle paths in your templates (for example, to preload or customize placement), Stati provides them via `stati.assets`:

| Property | Type | Description |
|----------|------|-------------|
| `bundlePaths` | `string[]` | Array of paths to matched JS bundles for this page (e.g., `['/_assets/main-a1b2c3d4.js']`) |

Example for preloading:

```eta
<head>
  <% if (stati.assets?.bundlePaths) { %>
    <% for (const path of stati.assets.bundlePaths) { %>
    <link rel="modulepreload" href="<%= path %>">
    <% } %>
  <% } %>
</head>
```

> **Note:** Script tags are auto-injected, so you don't need to add them manually. Stati also prevents duplicate injection if a bundle path already exists in your HTML.

## Multiple Bundles

Stati supports compiling multiple TypeScript bundles with per-page targeting. Instead of shipping a single bundle to all pages, you can define an array of bundles—each with its own entry point and glob-based patterns to control which pages receive which bundles.

### BundleConfig Options

Each bundle in the `bundles` array can have these properties:

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `entryPoint` | `string` | Yes | Entry point file name relative to `srcDir` (e.g., `'main.ts'`, `'features/playground.ts'`) |
| `bundleName` | `string` | Yes | Output bundle name (without extension). Final filename includes hash in production: `[bundleName]-[hash].js` |
| `include` | `string[]` | No | Glob patterns for pages that should include this bundle. Matches against page output path (e.g., `/docs/api/hooks.html`). **If omitted, bundle is included on ALL pages (global bundle).** |
| `exclude` | `string[]` | No | Glob patterns for pages to exclude from this bundle. **Takes precedence over `include` patterns.** |

### Minimal Configuration (Default Bundle)

If you don't specify a `bundles` array, Stati defaults to a single global bundle:

```typescript
import { defineConfig } from '@stati/core';

export default defineConfig({
  typescript: {
    enabled: true
    // Defaults to: bundles: [{ entryPoint: 'main.ts', bundleName: 'main' }]
    // Injects 'main' bundle on ALL pages
  }
});
```

### Custom Multiple Bundles

Define multiple bundles with targeted page injection:

```typescript
import { defineConfig } from '@stati/core';

export default defineConfig({
  typescript: {
    enabled: true,
    srcDir: 'src',
    bundles: [
      // Core bundle - included on all pages (no include = global)
      {
        entryPoint: 'core.ts',
        bundleName: 'core'
      },

      // Documentation-specific interactivity
      {
        entryPoint: 'docs.ts',
        bundleName: 'docs',
        include: ['/docs/**', '/api/**']
      },

      // Code playground - only on specific pages
      {
        entryPoint: 'playground.ts',
        bundleName: 'playground',
        include: ['/examples/**', '/playground.html'],
        exclude: ['/examples/simple/**']
      },

      // Homepage animations
      {
        entryPoint: 'home.ts',
        bundleName: 'home',
        include: ['/index.html', '/']
      }
    ]
  }
});
```

### Pattern Matching

Patterns use minimatch-style glob syntax:

| Pattern | Matches |
|---------|---------|
| `*` | Any characters except `/` |
| `**` | Any characters including `/` |
| `?` | A single character |
| `[abc]` | Any character in brackets |

Patterns match against the page's **output path** (the URL path), not the source file path:

- Source: `site/docs/api/hooks.md`
- Output path: `/docs/api/hooks.html`

### Matching Logic

For each page, Stati determines which bundles to inject:

1. Iterate through all bundles in configuration order
2. For each bundle:
   - If no `include` patterns: bundle matches (global bundle)
   - If `include` patterns exist: page must match at least one pattern
   - If page matches any `exclude` pattern: bundle is excluded (exclude takes precedence)
3. All matching bundles are injected in configuration order

**Example matching:**

```text
Page: /docs/api/hooks.html

Bundle 'core':      include=undefined       → MATCH (global)
Bundle 'docs':      include=['/docs/**']    → MATCH
Bundle 'playground': include=['/examples/**'] → NO MATCH
Bundle 'home':      include=['/index.html'] → NO MATCH

Result: ['core', 'docs'] scripts injected
```

### Use Cases

Multiple bundles are ideal for:

- **Documentation sites** with interactive code playgrounds only on certain pages
- **Landing pages** with animation libraries not needed elsewhere
- **Admin sections** with rich editors
- **Blog posts** with embedded visualizations

This approach avoids shipping unused JavaScript to pages that don't need it.

## Project Structure

A TypeScript-enabled Stati project typically looks like:

```text
my-site/
├── dist/                    # Build output
│   ├── _assets/
│   │   ├── main-a1b2c3d4.js
│   │   └── docs-e5f6g7h8.js
│   └── index.html
├── public/                  # Static assets
├── site/                    # Content and templates
│   ├── index.md
│   └── layout.eta
├── src/                     # TypeScript source
│   ├── main.ts
│   └── docs.ts
├── package.json
├── stati.config.ts
└── tsconfig.json
```

## Type Checking

Run the TypeScript compiler to check for type errors:

```bash
npm run typecheck
```

This runs `tsc --noEmit` to validate your TypeScript without generating output (esbuild handles compilation).

## Example: Adding Interactivity

Here's a simple example of adding interactivity to your site:

### src/main.ts

```typescript
interface MenuItem {
  element: HTMLElement;
  isOpen: boolean;
}

document.addEventListener('DOMContentLoaded', () => {
  // Mobile menu toggle
  const menuButton = document.querySelector<HTMLButtonElement>('.menu-toggle');
  const menu = document.querySelector<HTMLElement>('.nav-menu');

  if (menuButton && menu) {
    const menuItem: MenuItem = { element: menu, isOpen: false };

    menuButton.addEventListener('click', () => {
      menuItem.isOpen = !menuItem.isOpen;
      menuItem.element.classList.toggle('open', menuItem.isOpen);
    });
  }

  console.log('Site initialized');
});
```

### Shared Code Between Bundles

For code shared between bundles, use standard ES module imports. esbuild will bundle all imports into each output file:

### src/core.ts

```typescript
import { initNavigation } from './shared/navigation';
import { initThemeToggle } from './shared/theme';

document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initThemeToggle();
});
```

### src/docs.ts

```typescript
import { initSearch } from './shared/search';
import { initCodeHighlight } from './shared/code-highlight';

document.addEventListener('DOMContentLoaded', () => {
  initSearch();
  initCodeHighlight();
});
```

## Troubleshooting

### TypeScript entry point not found

If you see this warning:

```text
TypeScript entry point not found: /path/to/src/main.ts
Skipping TypeScript compilation.
```

Ensure your entry file exists at the configured location (`srcDir/entryPoint`). For multiple bundles, each missing entry point is skipped with a warning, and compilation continues with the remaining bundles.

### Type errors not caught during build

Stati uses esbuild for compilation, which doesn't perform type checking. Always run `npm run typecheck` to validate your types before deploying.

### Source maps in production

Source maps are automatically disabled in production builds for security (to avoid exposing source code) and performance (smaller bundle size). They are always enabled in development mode for debugging.
