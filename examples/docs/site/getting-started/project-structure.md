---
title: Project structure
description: Every file in the template, and which ones you will usually edit.
order: 3
---

## The files

```text
├── helpers/
│   └── docs.js            # Builds the sidebar, pager and breadcrumbs
├── public/
│   ├── fonts/             # Inter and its license
│   ├── images/            # Sample screenshot
│   ├── scripts/docs.js    # Search, theme toggle, menu, copy buttons
│   ├── favicon.svg        # Your logo
│   └── styles.css         # All styles; colors and fonts at the top
├── site/
│   ├── partials/          # Header, sidebar, table of contents, search...
│   ├── getting-started/   # A section: one folder per section
│   │   ├── index.md       # The section's title, description and order
│   │   └── *.md           # Its pages
│   ├── base.eta           # The page around both layouts
│   ├── home.eta           # Layout for the home page
│   ├── layout.eta         # Layout for every other page
│   ├── index.md           # The home page
│   └── 404.md             # Shown for broken links
└── stati.config.js        # Site name, header links, search, SEO, sitemap
```

## What you will edit most

- **Markdown in `site/`.** Pages, sections and the home page. Most of your time goes here.
- **`stati.config.js`.** The site name, header links and repository link, once.
- **The top of `public/styles.css`.** Colors, fonts and widths are custom properties there. See [Colors and fonts](/customizing/colors-and-fonts).

## What you can leave alone

- **`helpers/docs.js`** groups pages into sections. You only need it to change how grouping works.
- **`site/partials/`** and **`site/base.eta`** hold the page pieces. Edit them when you want to change the page structure; see [Layouts and partials](/customizing/layouts-and-partials).
- **`public/scripts/docs.js`** runs search and the interactive parts.

## Generated folders

`dist/` holds the built site and `.stati/` Stati's build cache. Both are rebuilt from your sources, so do not edit them. Delete them any time with `npm run clean`.
