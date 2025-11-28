---
title: 'TypeScript Support'
description: 'Configure TypeScript compilation for your Stati site with esbuild-powered builds.'
order: 8
---

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
    entryPoint: 'main.ts',   // Entry file (default: 'main.ts')
    bundleName: 'bundle',    // Output bundle name (default: 'bundle')
    hash: true,              // Add content hash for cache busting (default: true in production)
    minify: true,            // Minify output (default: true in production)
    sourceMaps: false,       // Generate source maps (default: true in development)
  },
});
```

## TypeScriptConfig Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | `boolean` | `false` | Enable TypeScript compilation |
| `srcDir` | `string` | `'src'` | Directory containing TypeScript source files |
| `outDir` | `string` | `'_assets'` | Output subdirectory within `dist/` |
| `entryPoint` | `string` | `'main.ts'` | Main entry file relative to `srcDir` |
| `bundleName` | `string` | `'bundle'` | Base name for output bundle |
| `hash` | `boolean` | `true` (prod) | Add content hash to filename |
| `minify` | `boolean` | `true` (prod) | Minify JavaScript output |
| `sourceMaps` | `boolean` | `true` (dev) | Generate source maps |

## Development vs Production

Stati automatically adjusts TypeScript settings based on the build mode:

### Development (`stati dev`)

- **Stable filenames** - No hash, easier debugging
- **Source maps enabled** - Full debugging support
- **No minification** - Readable output
- **Watch mode** - Automatic recompilation on changes

### Production (`stati build`)

- **Hashed filenames** - `bundle-a1b2c3d4.js` for cache busting
- **No source maps** - Smaller bundle size
- **Minified** - Optimized for production

You can override these defaults in your configuration.

## Accessing the Bundle in Templates

When TypeScript is enabled, Stati provides the bundle path through `stati.assets`:

```eta
<!DOCTYPE html>
<html>
<head>
  <title><%= it.title %></title>
</head>
<body>
  <%~ it.content %>
  
  <% if (stati.assets?.bundlePath) { %>
  <script type="module" src="<%= stati.assets.bundlePath %>"></script>
  <% } %>
</body>
</html>
```

### StatiAssets Object

| Property | Type | Description |
|----------|------|-------------|
| `bundlePath` | `string` | Path to the compiled JS bundle (e.g., `/_assets/bundle-a1b2c3d4.js`) |

The conditional check `stati.assets?.bundlePath` ensures the script tag is only rendered when a bundle exists.

## Project Structure

A TypeScript-enabled Stati project typically looks like:

```text
my-site/
├── dist/                    # Build output
│   ├── _assets/
│   │   └── bundle-a1b2c3d4.js
│   └── index.html
├── public/                  # Static assets
├── site/                    # Content and templates
│   ├── index.md
│   └── layout.eta
├── src/                     # TypeScript source
│   └── main.ts
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

## Advanced: Multiple Entry Points

Currently, Stati supports a single entry point. For complex applications, you can use standard ES module imports in your entry file:

### src/main.ts with imports

```typescript
import { initNavigation } from './navigation';
import { initSearch } from './search';
import { initThemeToggle } from './theme';

document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initSearch();
  initThemeToggle();
});
```

esbuild will bundle all imports into a single optimized file.

## Troubleshooting

### TypeScript entry point not found

If you see this warning:

```text
TypeScript entry point not found: /path/to/src/main.ts
Skipping TypeScript compilation.
```

Ensure your entry file exists at the configured location (`srcDir/entryPoint`).

### Type errors not caught during build

Stati uses esbuild for fast compilation, which doesn't perform type checking. Always run `npm run typecheck` to validate your types before deploying.

### Source maps not working in browser

In production mode, source maps are disabled by default. To enable them:

```typescript
export default defineConfig({
  typescript: {
    enabled: true,
    sourceMaps: true,  // Enable even in production
  },
});
```
