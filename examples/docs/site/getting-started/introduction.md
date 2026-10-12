---
title: Introduction
description: A tour of the docs template, and what each part of it does for your readers.
order: 1
---

This is a documentation site built with [Stati](https://stati.build), a static site generator. Every page you are reading is a Markdown file in `site/`. The pages explain how the template works, so you can read them once, then replace them with your own.

## What is included

- **A sidebar built from your folders.** Each folder in `site/` is a section and each Markdown file a page, sorted by a number in its front matter. See [Sidebar and sections](/writing/sidebar-and-sections).
- **Search.** Press <kbd>Ctrl</kbd> <kbd>K</kbd> (or <kbd>⌘</kbd> <kbd>K</kbd> on a Mac) or <kbd>/</kbd> to search every page and heading. Stati builds the index; see [Search](/customizing/search).
- **An on-page table of contents** on the right, built from the headings of each page, with the section you are reading highlighted.
- **Previous and next links** at the bottom of each page, in sidebar order, and **breadcrumbs** at the top.
- **Code blocks** highlighted at build time, with a copy button. See [Code blocks](/writing/code-blocks).
- **Light and dark themes** that follow the reader's system setting, with a toggle in the header.
- **Search engine basics**: a sitemap, `robots.txt`, link previews and breadcrumb structured data. See [SEO and sitemap](/publishing/seo-and-sitemap).
- **A mobile layout** where the sidebar becomes a drawer behind the menu button.

Everything is plain Stati: Markdown, [Eta](https://eta.js.org) templates and one stylesheet. The only JavaScript is a small script for search, the theme toggle, the mobile menu and the copy buttons, and the pages still read fine without it.

## How a page is made

A page is a Markdown file with a short block of front matter at the top:

```md
---
title: Introduction
description: A tour of the docs template.
order: 1
---

Your content, in Markdown.
```

The `title` becomes the page heading and the sidebar label, the `description` the lead paragraph under it (and the text search engines show), and `order` its place in the sidebar.

## Where to go next

Run the site on your machine with the [quick start](/getting-started/quick-start), then read [Project structure](/getting-started/project-structure) to find your way around the files.
