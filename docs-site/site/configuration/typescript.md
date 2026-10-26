---
title: 'TypeScript'
description: 'Configure TypeScript compilation for your Stati site with esbuild-powered builds.'
order: 8
seo:
  title: 'TypeScript configuration'
---

# TypeScript

Stati compiles your site's client-side TypeScript into JavaScript bundles with [esbuild](https://esbuild.github.io/) and adds them to your pages.

## Quick start

New projects from `create-stati` use TypeScript by default:

```bash
npx create-stati my-site
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
    baseUrl: 'https://example.com',
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

## TypeScriptConfig options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | `boolean` | required | Enable TypeScript compilation; without a `typescript` block nothing is compiled |
| `srcDir` | `string` | `'src'` | Directory containing TypeScript source files |
| `outDir` | `string` | `'_assets'` | Output subdirectory within `dist/` |
| `bundles` | `BundleConfig[]` | `[{ entryPoint: 'main.ts', bundleName: 'main' }]` | Array of bundle configurations (see [Multiple Bundles](#multiple-bundles)) |
| `hash` | `boolean` | `true` | Add content hash to filename (production only) |
| `minify` | `boolean` | `true` | Minify JavaScript output (production only) |
| `autoInject` | `boolean` | `true` | Automatically inject bundle script tags before `</body>` |

## Development vs production

Stati automatically adjusts TypeScript settings based on the build mode:

### Development (`stati dev`)

- **Stable filenames** - No hash
- **Source maps enabled** - Full debugging support
- **No minification** - Readable output
- **Watch mode** - Automatic recompilation on changes

### Production (`stati build`)

- **Hashed filenames** - `main-A1B2C3D4.js` for cache busting
- **No source maps** - Smaller bundle size, no source code exposure
- **Minified** - Optimized for production

The `hash` and `minify` options only take effect in production builds. Set them to `false` if you need to debug production output.

## Automatic bundle injection

When TypeScript is enabled, Stati **automatically injects** script tags into your HTML output before the closing `</body>` tag during both `stati dev` and `stati build`, on every page or on the pages a bundle's `include` and `exclude` patterns select. Stati does not add a script tag that is already in the page.

```html
<!-- Automatically injected by Stati -->
<script type="module" src="/_assets/main-A1B2C3D4.js"></script>
</body>
```

### Disabling auto-injection

If you need manual control over script placement, disable auto-injection:

```typescript
import { defineConfig } from '@stati/core';

export default defineConfig({
  // site: { … },
  typescript: {
    enabled: true,
    autoInject: false, // Disable automatic script injection
  },
});
```

When `autoInject: false`, you must manually add script tags in your templates using `stati.assets.bundlePaths`. The paths start at the site root, so print them through `stati.url()`:

```eta
<body>
  <!-- Your content -->

  <% for (const path of stati.assets.bundlePaths) { %>
  <script type="module" src="<%= stati.url(path) %>"></script>
  <% } %>
</body>
```

This is useful when you need to:

- Place scripts in a specific location (e.g., before other scripts)
- Add custom attributes to script tags (e.g., `defer`, `async`)
- Conditionally include scripts based on template logic

### Accessing bundle info in templates

`stati.assets.bundlePaths` lists the bundles matched for the page, such as `['/_assets/main-A1B2C3D4.js']`, with auto-injection on or off. Use it to preload them:

```eta
<head>
  <% for (const path of stati.assets.bundlePaths) { %>
  <link rel="modulepreload" href="<%= stati.url(path) %>">
  <% } %>
</head>
```

## Multiple bundles

Stati supports compiling multiple TypeScript bundles with per-page targeting. Instead of shipping a single bundle to all pages, you can define an array of bundles, each with its own entry point and glob-based patterns to control which pages receive which bundles.

### BundleConfig options

Each bundle in the `bundles` array can have these properties:

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `entryPoint` | `string` | Yes | Entry point file name relative to `srcDir` (e.g., `'main.ts'`, `'features/playground.ts'`) |
| `bundleName` | `string` | Yes | Output bundle name (without extension). Final filename includes hash in production: `[bundleName]-[hash].js` |
| `include` | `string[]` | No | Glob patterns for pages that should include this bundle. Matched against the page URL (e.g., `/docs/api/hooks`, or `/` for the home page). **If omitted, bundle is included on ALL pages (global bundle).** |
| `exclude` | `string[]` | No | Glob patterns for pages to exclude from this bundle. **Takes precedence over `include` patterns.** |

### Minimal configuration (default bundle)

If you don't specify a `bundles` array, Stati defaults to a single global bundle:

```typescript
import { defineConfig } from '@stati/core';

export default defineConfig({
  // site: { … },
  typescript: {
    enabled: true
    // Defaults to: bundles: [{ entryPoint: 'main.ts', bundleName: 'main' }]
    // Injects 'main' bundle on ALL pages
  }
});
```

### Custom multiple bundles

Define multiple bundles with targeted page injection:

```typescript
import { defineConfig } from '@stati/core';

export default defineConfig({
  // site: { … },
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
        include: ['/examples/**', '/playground'],
        exclude: ['/examples/simple/**']
      },

      // Homepage animations
      {
        entryPoint: 'home.ts',
        bundleName: 'home',
        include: ['/']
      }
    ]
  }
});
```

### Pattern matching

Patterns use Stati's built-in glob syntax:

| Pattern | Matches |
|---------|---------|
| `*` | Any characters except `/` |
| `**` | Any characters including `/` |
| `**/` | Zero or more whole path segments |
| `?` | A single character except `/` |
| `[abc]` | Any character in brackets |

Brace alternatives such as `{a,b}` are not supported; list each pattern separately. A pattern must match the whole URL: `/docs/**` matches `/docs/intro` and `/docs/api/hooks` but not the `/docs` index page itself, so add `'/docs'` too when that page needs the bundle.

Patterns match against the page's **URL**, not its source file or output file:

- Source: `site/docs/api/hooks.md`
- URL (what patterns see): `/docs/api/hooks`
- Output file: `dist/docs/api/hooks.html`

### Matching logic

For each page, Stati determines which bundles to inject:

1. Iterate through all bundles in configuration order
2. For each bundle:
   - If no `include` patterns: bundle matches (global bundle)
   - If `include` patterns exist: page must match at least one pattern
   - If page matches any `exclude` pattern: bundle is excluded (exclude takes precedence)
3. All matching bundles are injected in configuration order

**Example matching:**

```text
Page: /docs/api/hooks

Bundle 'core':       include=undefined        → MATCH (global)
Bundle 'docs':       include=['/docs/**']     → MATCH
Bundle 'playground': include=['/examples/**'] → NO MATCH
Bundle 'home':       include=['/']            → NO MATCH

Result: ['core', 'docs'] scripts injected
```

## Project structure

A TypeScript-enabled Stati project typically looks like:

```text
my-site/
├── dist/                    # Build output
│   ├── _assets/
│   │   ├── main-A1B2C3D4.js
│   │   └── docs-E5F6G7H8.js
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

## Type checking

Run the TypeScript compiler to check for type errors:

```bash
npm run typecheck
```

This runs `tsc --noEmit` to validate your TypeScript without generating output. esbuild compiles without checking types, so run it before you deploy.

## Shared code between bundles

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
TypeScript entry point not found: /path/to/src/main.ts (bundle: main)
```

Ensure your entry file exists at the configured location (`srcDir/entryPoint`, relative to the project root). For multiple bundles, each missing entry point is skipped with a warning, and compilation continues with the remaining bundles.

### Build fails on a bundle

A syntax error in a bundle fails the build with `Bundle '<name>' compilation failed: …`. Two bundles with the same `bundleName` also fail the build (`Duplicate bundleName(s) found in configuration`); give each bundle a unique name.

### Bundle missing on a page

Check the page's URL against the bundle's `include` and `exclude` patterns. Patterns see `/docs/intro`, not `/docs/intro.html`, and `/docs/**` does not match the `/docs` index page.
