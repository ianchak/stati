---
title: Layouts and partials
description: Which template renders which page, and how to change the page structure.
order: 3
---

## Layouts

A layout is the HTML around a page's content. The template has two:

| Layout            | Used by                                                      |
| ----------------- | ------------------------------------------------------------ |
| `site/layout.eta` | Every page, section overview and the 404 page                |
| `site/home.eta`   | The home page, chosen with `layout: home` in `site/index.md` |

Stati picks the layout named in a page's front matter first, then the nearest `layout.eta` walking up from the page's folder. To give one section its own layout, add a `layout.eta` to its folder.

## Partials

The pieces both layouts share live in `site/_partials/`. Folders starting with `_` are never turned into pages.

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

A layout includes a partial with `<%~ stati.partials.header %>`. Partials that take options are called like functions:

```eta
<%~ stati.partials.toc({ variant: 'inline' }) %>
<%~ stati.partials.icon({ name: 'search', size: 16 }) %>
```

Inside the partial, the options are on `stati.props`.

## Template data

Every template can read:

- `stati.page`: the current page's front matter, plus `url` and `toc`
- `stati.site`: the `site` block of `stati.config.js`
- `stati.content`: the page's Markdown, rendered to HTML
- `stati.docsSections()`, `stati.docsSection(url)`, `stati.docsPager(url)` and `stati.docsBreadcrumbs(url)`, from `helpers/docs.js`

## A note on attributes

Stati uses [Eta](https://eta.js.org) templates, which cannot mix fixed and dynamic text inside one attribute. Build the whole value in a template literal instead:

```eta
<!-- Does not work -->
<a class="link-<%= kind %>">

<!-- Works -->
<a class="<%= `link-${kind}` %>">
```

For several classes, `stati.propValue('button', isPrimary && 'button-primary')` joins the ones that apply.
