---
title: 'Project Structure'
description: 'Understanding how Stati organizes your files and directories.'
order: 3
---

# Project Structure

When you create a new Stati project, you'll get a clean and organized directory structure designed for simplicity and flexibility.

## Default Project Structure

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

### `stati.config.js`

The main configuration file where you define site metadata, template settings, markdown configuration, and more.

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
- **`blog/layout.eta`** - Section-specific layout (inherits from parent)

You can also use page specific layouts if you want, by referring to the layouts name in the front matter of your page. For example: `layout: home`

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
2. `site/blog/layout.eta` (inherits from root)
3. `site/blog/tutorials/layout.eta` (inherits from blog)

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
