---
title: 'Project structure'
description: 'Understanding how Stati organizes your files and directories.'
order: 3
seo:
  title: 'Stati project structure'
---

# Project structure

Stati organizes your files in a clean and structured way, designed for simplicity and flexibility.

## Example structure

```text
my-stati-site/
├── package.json
├── stati.config.js
├── public/
│   ├── favicon.svg
│   └── styles.css
└── site/
    ├── index.md
    ├── layout.eta
    └── _partials/
        ├── header.eta
        └── footer.eta
```

### With TypeScript enabled

TypeScript is the scaffolder's default, and a TypeScript project gets these additional files (pass `--no-typescript` for a JavaScript project):

```text
my-stati-site/
├── package.json
├── stati.config.ts         # TypeScript configuration
├── tsconfig.json           # TypeScript compiler config
├── src/
│   └── main.ts             # TypeScript entry point
├── public/
│   └── ...
└── site/
    └── ...
```

## Key directories

### `site/`

This is where all your content lives. Stati uses filesystem-based routing, so the structure of your `site/` directory directly maps to the URLs of your website.

- **`site/index.md`** → `/`
- **`site/about.md`** → `/about`
- **`site/blog/index.md`** → `/blog`
- **`site/blog/first-post.md`** → `/blog/first-post`
- **`site/blog/tags/[tag].md`** → `/blog/tags/css`, `/blog/tags/javascript`… one page per tag, and none at its own URL. See [Generated pages](/core-concepts/collections#generated-pages).

Images can sit next to the pages that use them. In `site/blog/first-post.md`, `![Map](./map.png)` refers to `site/blog/map.png`, which Stati copies to `/_img/` with its size added to the page. See [Images](/configuration/images).

### `public/`

Static assets that should be copied directly to the output directory. Everything in `public/` is served from the root of your site.

- **`public/favicon.svg`** → `/favicon.svg`
- **`public/images/logo.png`** → `/images/logo.png`
- **`public/styles.css`** → `/styles.css`

### `_partials/`

Template partials that can be included in your layouts and pages (or even other partials).

Directories starting with `_` are excluded from routing, so you can organize your partials as you see fit.

**Example organization:**

- **`_partials/header.eta`** - Site header
- **`_components/footer.eta`** - Site footer
- **`_navigation/sidebar.eta`** - Navigation sidebar

## Configuration files

### `stati.config.js` (or `stati.config.ts`)

The main configuration file where you define site metadata, template settings, markdown configuration, and more. Use `.ts` for TypeScript projects with full type safety.

```javascript
import { defineConfig } from '@stati/core';

export default defineConfig({
  site: {
    title: 'My Stati Site',
    baseUrl: 'https://example.com',
  },
  // Additional configuration...
});
```

For TypeScript projects, you can also configure the built-in TypeScript compilation:

```typescript
export default defineConfig({
  site: { title: 'My Stati Site', baseUrl: 'https://example.com' },
  typescript: {
    enabled: true,
    // bundles defaults to [{ entryPoint: 'main.ts', bundleName: 'main' }]
  },
});
```

See the [TypeScript Configuration](/configuration/typescript) guide for more details on multiple bundles and per-page targeting.

### `package.json`

Standard Node.js package file with your dependencies and build scripts.

```json
{
  "scripts": {
    "dev": "stati dev",
    "build": "stati build"
  }
}
```

## Template files

### Layouts

- **`layout.eta`** - Default layout template
- **`blog/layout.eta`** - Section-specific layout

You can also give a page its own layout by naming it in the page's front matter, relative to `site/` and without the `.eta` extension. For example, `layout: home` uses `site/home.eta`. If that file does not exist, Stati silently falls back to the usual `layout.eta` lookup.

### Content files

- **`.md` files** - Markdown content with front matter; every `.md` file outside an underscore folder becomes a page
- **`.eta` files** - Layouts and partials only; an `.eta` file never becomes a page on its own
- **`og.eta`** - With [`images.og`](/configuration/images#open-graph-images), the template for the link preview image of the pages in its folder and below

## Advanced structure

For larger sites, you might organize content like this:

```text
site/
├── index.md
├── layout.eta
├── about.md
├── blog/
│   ├── index.md
│   ├── layout.eta
│   ├── 2024/
│   │   ├── first-post.md
│   │   └── second-post.md
│   └── _partials/
│       └── post-meta.eta
├── docs/
│   ├── index.md
│   ├── layout.eta
│   └── api/
│       ├── index.md
│       └── reference.md
└── _partials/
    ├── header.eta
    ├── footer.eta
    └── nav.eta
```

## Special files and directories

### Directories starting with `_`

- **Excluded from routing** - Contents won't generate pages
- **Used for partials and utilities** - Templates can be included via `stati.partials`
- **Examples**: `_partials/`, `_components/`, `_data/`

> **Note:** Individual files starting with `_` (like `_draft.md`) are NOT automatically excluded. Use `draft: true` in frontmatter to exclude drafts.

### Template inheritance

Layouts and partials cascade down the directory tree:

1. `site/layout.eta` (root layout)
2. `site/blog/layout.eta` (override for /blog pages)
3. `site/blog/tutorials/layout.eta` (override for /blog/tutorials pages)

### Index files

- **`index.md`** - Becomes the directory's homepage
- **`site/blog/index.md`** → `/blog` (written to `dist/blog.html`)
- **No index file** → 404 (add an `index.md` to make the directory accessible)

## Build output

When you run `stati build`, the output structure mirrors your site structure:

```text
dist/
├── index.html
├── about.html
├── blog.html
├── blog/
│   └── first-post.html
├── _img/          # images copied from site/, and generated ones
├── favicon.svg
└── styles.css
```

## Next steps

- Learn about [Templates & Layouts](/core-concepts/templates)
- Understand [Filesystem-based Routing](/core-concepts/routing)
- Explore [Static Assets](/core-concepts/static-assets)
- Configure your [Site Metadata](/configuration/site-metadata)
- Enable [TypeScript Compilation](/configuration/typescript)
