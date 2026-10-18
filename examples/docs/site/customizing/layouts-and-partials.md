---
title: Layouts and partials
description: Which template renders which page, and how to change the page structure.
order: 3
---

## Layouts

A layout is the HTML around a page's content. The template has two, and both sit inside a third template, the page itself:

| Template          | What it renders                                                      |
| ----------------- | -------------------------------------------------------------------- |
| `site/layout.eta` | Every page, section overview and the 404 page                        |
| `site/home.eta`   | The home page, chosen with `layout: home` in `site/index.md`         |
| `site/base.eta`   | The page around both: the `<head>`, header, footer and search dialog |

Stati picks the layout named in a page's front matter first, then the nearest `layout.eta` walking up from the page's folder. To give one section its own layout, add a `layout.eta` to its folder.

Each layout names the page around it with `stati.layout()`, and what the layout renders arrives in `base.eta` as `stati.body`. The home page also gives `<body>` a class, which `base.eta` reads as `stati.props.bodyClass`:

```eta
<% stati.layout('base', { bodyClass: 'page-home' }) %>
```

## Partials

The pieces the layouts share live in `site/partials/`. Only Markdown files become pages, so the folder adds none.

| Partial       | What it renders                                             |
| ------------- | ----------------------------------------------------------- |
| `head.eta`    | The `<head>`: title, stylesheet, font preload, theme script |
| `header.eta`  | The top bar: logo, links, search, theme toggle              |
| `sidebar.eta` | The docs navigation and the mobile drawer                   |
| `toc.eta`     | **On this page**, as a side column or a collapsible list    |
| `pager.eta`   | The previous and next links                                 |
| `search.eta`  | The search dialog                                           |
| `footer.eta`  | The footer                                                  |
| `icon.eta`    | The SVG icons, by name                                      |

A template includes a partial by its path in `site/`, without `.eta`. Options go in an object after the path:

```eta
<%~ stati.include('partials/header') %>
<%~ stati.include('partials/toc', { variant: 'inline' }) %>
<%~ stati.include('partials/icon', { name: 'search', size: 16 }) %>
```

Inside the partial, the options are on `stati.props`. Stati looks for the path from the page's folder up to `site/`, so a section can have its own version of a partial: `site/writing/partials/toc.eta` would replace the table of contents on the pages in `site/writing/`.

## Template data

Every template can read:

- `stati.page`: the current page's front matter, plus `url` and `toc`
- `stati.site`: the `site` block of `stati.config.js`
- `stati.content`: the page's Markdown, rendered to HTML
- `stati.helpers.docsSections()`, `stati.helpers.docsSection(url)`, `stati.helpers.docsPager(url)` and `stati.helpers.docsBreadcrumbs(url)`, from `helpers/docs.js`

## A note on attributes

Stati uses [Eta](https://eta.js.org) templates, which cannot mix fixed and dynamic text inside one attribute. Build the whole value in a template literal instead:

```eta
<!-- Does not work -->
<a class="link-<%= kind %>">

<!-- Works -->
<a class="<%= `link-${kind}` %>">
```

For several classes, `stati.propValue('button', isPrimary && 'button-primary')` joins the ones that apply.
