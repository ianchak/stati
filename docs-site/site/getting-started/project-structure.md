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
    └── partials/
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
- **`site/blog/tags/[tag].md`** with `generate: { from: tags }` → `/blog/tags/css`, `/blog/tags/javascript`… one page per tag, and none at its own URL. See [Generated pages](/core-concepts/collections#generated-pages).

Images can sit next to the pages that use them. In `site/blog/first-post.md`, `![Map](./map.png)` refers to `site/blog/map.png`, which Stati copies to `/_img/` with its size added to the page. See [Images](/configuration/images).

### `public/`

Static assets that should be copied directly to the output directory. Everything in `public/` is served from the root of your site.

- **`public/favicon.svg`** → `/favicon.svg`
- **`public/images/logo.png`** → `/images/logo.png`
- **`public/styles.css`** → `/styles.css`

### `site/partials/`

Templates that layouts and other templates include with `stati.include()`, such as the header and footer. Only Markdown files become pages, so a folder of templates adds no URLs.

The folder name is a convention: any `.eta` file under `site/` can be included by its path, without the extension.

**Example organization:**

- **`site/partials/header.eta`** - Site header, included with `stati.include('partials/header')`
- **`site/partials/footer.eta`** - Site footer
- **`site/partials/nav/sidebar.eta`** - Navigation sidebar, included with `stati.include('partials/nav/sidebar')`

## Configuration files

### `stati.config.js` (or `stati.config.ts`)

The main configuration file where you define site metadata, template helpers, Markdown plugins, and more. Use `.ts` for TypeScript projects with full type safety.

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
- **`blog/index.eta`** - Optional layout of the index page `blog/index.md`, used ahead of `layout.eta` once the folder holds other pages
- **`base.eta`** - Optional page shell that layouts share, named with `stati.layout('base')`

You can also give a page its own layout by naming it in the page's front matter, without the `.eta` extension. Stati looks for the name from the page's folder up to `site/`, so `layout: home` on a page in `site/` uses `site/home.eta`; a name starting with `/`, such as `layout: /home`, is read from `site/` only. If no file matches, the build warns and falls back to the usual `layout.eta` lookup.

### Content files

- **`.md` files** - Markdown content with front matter; every `.md` file outside an underscore folder becomes a page
- **`.eta` files** - Layouts, shells and included templates; an `.eta` file never becomes a page on its own
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
│   └── partials/
│       └── post-meta.eta
├── docs/
│   ├── index.md
│   ├── layout.eta
│   └── api/
│       ├── index.md
│       └── reference.md
├── base.eta
└── partials/
    ├── header.eta
    ├── footer.eta
    └── nav.eta
```

## Special files and directories

### Directories starting with `_`

- **Excluded from routing** - Markdown inside them won't generate pages
- **Templates still work** - Like any `.eta` file under `site/`, a template in one can be included with `stati.include()`
- **Examples**: `_drafts/`, `_data/`

> **Note:** Individual files starting with `_` (like `_draft.md`) are NOT automatically excluded. Use `draft: true` in frontmatter to exclude drafts.

### Template inheritance

Layouts cascade down the directory tree:

1. `site/layout.eta` (root layout)
2. `site/blog/layout.eta` (override for /blog pages)
3. `site/blog/tutorials/layout.eta` (override for /blog/tutorials pages)

Included templates are looked up the same way, from the page's folder up: `site/blog/partials/header.eta` replaces `site/partials/header.eta` on the pages in `site/blog/`.

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
