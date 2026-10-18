---
title: Sidebar and sections
description: How folders become sidebar sections, how pages are ordered, and how to add, rename or hide them.
order: 2
---

The sidebar is built from your files. You never edit a navigation list by hand.

## Sections are folders

Each top-level folder in `site/` is a sidebar section. The folder's `index.md` gives the section its title, a description for its overview page and the home page, and its position:

```yaml
# site/guides/index.md
---
title: Guides
description: Step-by-step walkthroughs of common tasks.
order: 2
---
```

The section heading in the sidebar links to that overview page, which lists the section's pages with their descriptions. A folder without an `index.md` still becomes a section, titled after the folder name.

## Ordering

Sections and pages are sorted by `order`, smallest first, then alphabetically by title. Pages without an `order` come after the ones with one.

Leave gaps if you expect to insert pages later: `10`, `20`, `30` lets you add `15` without renumbering.

## Add a section

1. Create a folder, for example `site/reference/`.
2. Add `site/reference/index.md` with a `title`, `description` and `order`.
3. Add pages to the folder.

The new section appears in the sidebar, on the home page, in search and in the previous and next links. To link it from the header too, add it to `nav` in `stati.config.js`.

## Rename or move a page

The sidebar label comes from the page's `title`, or `sidebarTitle` when set. Renaming the file changes the page's address, so links to the old address break. Search the project for the old path and update links when you move a page.

## Hide a page

`sidebar: false` keeps a page out of the sidebar and the previous and next links while still building it, which suits pages you only link to from elsewhere. The [404 page](/404) uses it.

## Deeper folders

Pages in subfolders, such as `site/guides/advanced/caching.md`, belong to their top-level section and sort with its other pages. To show nested groups instead, change `buildIndex` in `helpers/docs.js`.

## Under the hood

Every template can read Stati's navigation tree as `stati.nav`, with each page's title, address and order. The sidebar needs a little more from front matter, such as section descriptions, `sidebarTitle` and `sidebar: false`, so `helpers/docs.js` reads every page in Stati's `beforeAll` hook and builds the list of sections. Templates read it through helpers:

```eta
<% for (const section of stati.helpers.docsSections()) { %>
  <h2><%= section.title %></h2>
  <% for (const page of section.pages) { %>
    <a href="<%= page.url %>"><%= page.label %></a>
  <% } %>
<% } %>
```

`stati.helpers.docsPager(url)` gives the previous and next pages and `stati.helpers.docsBreadcrumbs(url)` the breadcrumb trail.
