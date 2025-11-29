---
title: 'Project Structure'
description: 'Understanding how Stati organizes your files and directories.'
order: 3
---

# Project Structure

Stati organizes your files in a clean and structured way, designed for simplicity and flexibility.

## Example Structure

```
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

### With TypeScript Enabled

When you create a project with `--typescript`, you get additional files:

```
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

## Key Directories

### `site/`

This is where all your content lives. Stati uses filesystem-based routing, so the structure of your `site/` directory directly maps to the URLs of your website.

- **`site/index.md`** → `/`
- **`site/about.md`** → `/about/`
- **`site/blog/index.md`** → `/blog/`
- **`site/blog/first-post.md`** → `/blog/first-post/`

### `public/`

Static assets that should be copied directly to the output directory. Everything in `public/` is served from the root of your site.

- **`public/favicon.svg`** → `/favicon.svg`
- **`public/images/logo.png`** → `/images/logo.png`
- **`public/styles.css`** → `/styles.css`

### `_partials/`

Template partials that can be included in your layouts and pages (or even other partials).

Directories starting with `_` are excluded from routing. So you can organize the structure of your partials as you see fit.

- **`_partials/header.eta`** - Site header
- **`_components/footer.eta`** - Site footer
- **`_navigation/sidebar.eta`** - Navigation sidebar

## Configuration Files

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
  site: { ... },
  typescript: {
    enabled: true,
    srcDir: 'src',
    entryPoint: 'main.ts',
  },
});
```

See the [TypeScript Configuration](/configuration/typescript/) guide for more details.

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

## Template Files

### Layouts

- **`layout.eta`** - Default layout template
- **`blog/layout.eta`** - Section-specific layout

You can also use page specific layouts if you want, by referring to the layouts name in the front matter of your page. For example: `layout: home` refers to `home.eta`

### Content Files

- **`.md` files** - Markdown content with front matter
- **`.eta` files** - Raw template files (rare, usually for complex pages)

## Advanced Structure

For larger sites, you might organize content like this:

```
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

## Special Files and Directories

### Files Starting with `_`

- **Excluded from routing** - Won't generate pages
- **Used for partials and utilities** - Can be included in templates
- **Examples**: `_partials/`, `_components/`, `_data/`

### Template Inheritance

Layouts and partials cascade down the directory tree:

1. `site/layout.eta` (root layout)
2. `site/blog/layout.eta` (override for /blog pages)
3. `site/blog/tutorials/layout.eta` (override for /blog/tutorials pages)

### Index Files

- **`index.md`** - Becomes the directory's homepage
- **`site/blog/index.md`** → `/blog/`
- **No index file** → Directory listing (if enabled)

## Build Output

When you run `stati build`, the output structure mirrors your site structure:

```
dist/
├── index.html
├── about.html
├── blog.html
├── blog/
│   └── first-post.html
├── favicon.svg
└── styles.css
```

## Next Steps

- Learn about [Templates & Layouts](/core-concepts/templates/)
- Understand [Filesystem-based Routing](/core-concepts/routing/)
- Explore [Static Assets](/core-concepts/static-assets/)
- Configure your [Site Metadata](/configuration/site-metadata/)
- Enable [TypeScript Compilation](/configuration/typescript/)
