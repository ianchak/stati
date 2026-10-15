---
title: Pages and front matter
description: How a Markdown file becomes a page, and every front matter field the template reads.
order: 1
---

## One file, one page

Every `.md` file in `site/` becomes a page. Its address follows the file's path:

| File                                  | Address                        |
| ------------------------------------- | ------------------------------ |
| `site/index.md`                       | `/`                            |
| `site/getting-started/index.md`       | `/getting-started`             |
| `site/getting-started/quick-start.md` | `/getting-started/quick-start` |
| `site/writing/code-blocks.md`         | `/writing/code-blocks`         |

Use lowercase file names with hyphens: they become part of the URL.

## Front matter

The block between the `---` lines at the top of a file is front matter, written in YAML. This template reads these fields:

| Field          | What it does                                                                                                       |
| -------------- | ------------------------------------------------------------------------------------------------------------------ |
| `title`        | The page heading, the sidebar label, the browser tab and search results                                            |
| `description`  | The lead paragraph under the heading, and the text search engines and link previews show                           |
| `order`        | The page's position in its section, smallest first. Pages without one come last, by title                          |
| `sidebarTitle` | A shorter label for the sidebar, when the title is long                                                            |
| `sidebar`      | Set to `false` to keep a page out of the sidebar and the previous and next links. It is still built and searchable |
| `draft`        | Set to `true` to leave the page out of the build. See [Drafts](#drafts)                                            |
| `image`        | A link-preview image for this page; with image tools on, it replaces the generated card                            |
| `seo`          | Overrides for search engines, such as `seo.title` or `seo.noindex: true`                                           |

A complete example:

```yaml
---
title: Configuring the client
sidebarTitle: Configuration
description: Every option the client accepts, with defaults.
order: 3
---
```

## Write the body without a title

The layout prints the `title` as the page's heading and the `description` under it, so start the Markdown with your first paragraph, not with `# Title`. Use `##` for sections and `###` for subsections: both appear in **On this page**.

## Drafts

Add `draft: true` to work on a page without publishing it:

```yaml
---
title: Upcoming feature
draft: true
---
```

`npm run build` and `npm run dev` leave drafts out, so they appear nowhere: not in the sidebar, search or sitemap. To review them, run `npm run build:drafts` and then `npm run preview`. Drafts then show a **Draft** badge in the sidebar and under their heading.

## Section pages

A folder's `index.md` describes its section rather than being a normal page. Its `title` and `order` name and place the section in the sidebar, and the page itself lists the section's pages with their descriptions. See [Sidebar and sections](/writing/sidebar-and-sections).
