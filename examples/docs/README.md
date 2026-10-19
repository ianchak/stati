# Stati Docs Template

A ready-to-write documentation site for [Stati](https://stati.build). The sidebar, search, an on-page table of contents, previous and next links and search-engine metadata are already wired in, and the sample pages explain how each part works.

## What's included

- **A sidebar built from your folders**: each folder in `site/` is a section, each Markdown file a page, ordered by `order` in its front matter
- **Search** with <kbd>Ctrl</kbd> <kbd>K</kbd>, <kbd>⌘</kbd> <kbd>K</kbd> or <kbd>/</kbd>, over the index Stati builds, linking straight to headings
- **"On this page"** from each page's headings, highlighting the section in view
- **Previous and next links** in sidebar order, and **breadcrumbs**
- **Section overview pages** and a **home page** listing every section
- **Code blocks** highlighted at build time, with a language label and a copy button
- **Light and dark themes** following the reader's system setting, with a toggle
- **A mobile layout** where the sidebar becomes a drawer
- **Sitemap**, **robots.txt**, **Open Graph and Twitter tags** and **breadcrumb structured data**
- **Drafts** that stay out of the build until you publish them, and a **404 page**
- Self-hosted [Inter](https://rsms.me/inter/); every page reads fine without JavaScript

## Quick start

1. Set the site name, address, header links and repository in `stati.config.js` (or `stati.config.ts`)
2. Run `npm run dev`
3. Read the sample pages, then replace them with your own in `site/`
4. Edit the heading, buttons and code panel of the home page in `site/index.md`

## Writing a page

Create `site/getting-started/my-page.md`:

```markdown
---
title: My page
description: One sentence for the lead paragraph, search engines and link previews.
order: 4
---

Your page, in Markdown. Start with a paragraph: the layout prints the title.

## A section

Level 2 and 3 headings appear in "On this page".
```

It appears in the sidebar, in search and in the previous and next links. Add `draft: true` to keep it out of the build, `sidebar: false` to hide it from the sidebar, or `sidebarTitle` for a shorter sidebar label.

To add a section, create a folder in `site/` with an `index.md` giving its `title`, `description` and `order`.

## Available scripts

- `npm run dev` - Start the development server
- `npm run build` - Build the site for production
- `npm run build:drafts` - Build including draft pages
- `npm run preview` - Preview the built site
- `npm run clean` - Clean build artifacts

## Directory structure

```
├── helpers/
│   └── docs.js           # Sections, sidebar order, pager, breadcrumbs, SEO
├── public/
│   ├── fonts/            # Inter and its license
│   ├── images/           # Sample screenshot
│   ├── scripts/docs.js   # Search, theme toggle, mobile menu, copy buttons
│   ├── favicon.svg       # Your logo
│   └── styles.css        # All styles; colors, fonts and widths at the top
├── site/
│   ├── partials/         # Head, header, sidebar, TOC, pager, search, footer, icons
│   ├── getting-started/  # One folder per section
│   │   ├── index.md      # Section title, description and order
│   │   └── *.md          # Its pages
│   ├── writing/
│   ├── customizing/
│   ├── publishing/
│   ├── base.eta          # The page around both layouts
│   ├── home.eta          # Home page layout
│   ├── layout.eta        # Layout for every other page
│   ├── index.md          # Home page
│   └── 404.md
└── stati.config.js       # Name, header links, search, SEO, sitemap
```

## How the sidebar works

Templates can read Stati's navigation tree as `stati.nav`, but its nodes only carry a title, URL, order, date and children. The sidebar also needs each section's description, `sidebarTitle`, `sidebar: false` and drafts, so `helpers/docs.js` reads every page's front matter in the `beforeAll` hook and groups the pages into sections. Templates read the result through helpers: `stati.helpers.docsSections()`, `stati.helpers.docsSection(url)`, `stati.helpers.docsPager(url)` and `stati.helpers.docsBreadcrumbs(url)`.

## Before you deploy

- Set `baseUrl` in the config to your real address; the sitemap and link previews use it
- Replace `public/favicon.svg`, and give pages an `image` for link previews (or create the site with image tools, which draws one for every page)
- Build with `npm run build` and deploy the `dist/` folder to any static host

Happy documenting!
