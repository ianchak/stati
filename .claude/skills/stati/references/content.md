# Content, frontmatter, routing, navigation, and listings

## Content sources

The content loader reads `**/*.md` below `srcDir` (`site` by default), excluding
underscore-prefixed directories. Markdown in `_partials/` is not an ordinary
page. `.eta` files are templates, not standalone routes. Markdown is not MDX and
does not run Eta expressions as a second template pass.

Use UTF-8 Markdown with YAML frontmatter:

```md
---
title: 'A useful article'
description: 'What the reader will learn.'
publishedAt: '2026-10-01T09:00:00Z'
updated: '2026-10-05T09:00:00Z'
tags: ['guides', 'stati']
order: 2
layout: article
draft: false
---

## The first section

Readable content with ordinary Markdown links and images.
```

Quote dates intended as strings. Use a numeric `order`, booleans for `draft`,
and arrays of strings for `tags`. Do not assume YAML fields are schema-validated
or that malformed values will be safely coerced by every feature.

Built-in/respected metadata:

| Field                         | Purpose                                                          |
| ----------------------------- | ---------------------------------------------------------------- |
| `title`, `description`        | Display/SEO defaults                                             |
| `tags`                        | Grouping, search, invalidation, keyword fallback                 |
| `layout`                      | Source-root-relative layout name without `.eta`                  |
| `order`                       | Navigation sort key                                              |
| `publishedAt`                 | Canonical publication date, parsed on PageModel                  |
| `date`                        | Feature-specific date alias/fallback; not universally equivalent |
| `updated`                     | Modification metadata fallback                                   |
| `draft`                       | Omitted unless draft inclusion requested                         |
| `permalink`                   | String URL override supported by loader                          |
| `ttlSeconds`, `maxAgeCapDays` | Page cache controls                                              |
| `seo`                         | Page SEO settings                                                |
| `sitemap`                     | Page sitemap settings                                            |
| custom fields                 | Remain in `frontMatter` / current `stati.page`                   |

Reserve `path`, `url`, `content`, `navNode`, `toc`: rendering overwrites them.
A custom frontmatter field is not automatically a new runtime feature.
For example, `slug`, `pagination`, or `locale` do not imply route generation.

## Routes and output are different

In the checked implementation, filenames/directories are preserved rather than
automatically slugified. Choose lowercase hyphenated names yourself.

| Source               | Normalized `PageModel.url` | Physical output        |
| -------------------- | -------------------------- | ---------------------- |
| `site/index.md`      | `/`                        | `dist/index.html`      |
| `site/about.md`      | `/about`                   | `dist/about.html`      |
| `site/blog/index.md` | `/blog`                    | `dist/blog.html`       |
| `site/blog/hello.md` | `/blog/hello`              | `dist/blog/hello.html` |

An explicit trailing-slash permalink such as `/custom/` produces
`dist/custom/index.html`. Normal nonroot URLs instead produce `<url>.html`.

Docs sometimes show trailing slashes and filename slugification that are not
guaranteed by the checked source. Use actual `page.url` / navigation URLs in
templates, and inspect output and host resolution. Do not derive route strings
from titles or assume all pages are directory-style `index.html`.

`permalink` overrides the URL as a string; it is not a redirect or an additional
alias route. Use unique, safe internal paths and test the output file and link.
Do not include query strings, fragments, parent traversal, or a full external URL
as a content route. Moving a file or changing a permalink does not create an old
URL redirect. Implement redirects using explicit pages or hosting configuration.

`site.baseUrl` is used for absolute metadata links, not a universal route-prefix
transformer. A host must resolve the emitted pretty URLs to actual files.
Verify both `/about` and intended trailing-slash variants on the target host.
Use a clean production build for route deletions/renames to avoid stale output.

## Markdown behavior

Default MarkdownIt options enable raw HTML, linkification, and typography.
Raw HTML is trusted author input, not sanitization of arbitrary user content.
Plugins are explicitly configured/installed, not assumed built-ins.

TOC extraction is on by default:

- Headings `h2` through `h6` get entries; `h1` is omitted.
- Entries are `{ id, text, level }`.
- Duplicate heading anchors gain `-1`, `-2`, etc.
- Empty/special-character-only heading IDs use a fallback.
- `markdown: { toc: false }` disables the built-in TOC/anchor behavior.

Use extracted IDs rather than re-slugifying headings in templates:

```eta
<% if (stati.page.toc.length > 0) { %>
  <nav aria-label="On this page">
    <ul>
      <% for (const entry of stati.page.toc) { %>
        <li><a href="<%= `#${entry.id}` %>"><%= entry.text %></a></li>
      <% } %>
    </ul>
  </nav>
<% } %>
```

Do not add a competing anchor/TOC plugin without checking duplicate IDs and
rendered headings. A layout that prints the page title as an `h1` normally should
not also require the Markdown body to repeat that same `h1`.

## PageModel versus current-page template data

A `PageModel` has `slug`, `url`, `sourcePath`, `frontMatter`, raw Markdown
`content`, and optional parsed `publishedAt`. This is what hooks, feature
callbacks, and collection arrays receive.

Inside the current template, `stati.page.title` is flattened frontmatter and
`stati.content` is rendered HTML. In a listing:

```eta
<% for (const post of stati.collection?.recentPages ?? []) { %>
  <article>
    <h2>
      <a href="<%= post.url %>"><%= post.frontMatter.title ?? 'Untitled' %></a>
    </h2>
    <% if (post.frontMatter.description) { %>
      <p><%= post.frontMatter.description %></p>
    <% } %>
  </article>
<% } %>
```

`post.title` is not the equivalent of `stati.page.title`.
`post.content` is raw Markdown, not guaranteed rendered HTML; use descriptions
for plain-text excerpts or an explicitly prepared/sanitized transformation.

## Navigation

`stati.nav` is a helper object over a `NavNode[]`, not an array.
Nodes have `title`, `url`, `path`, optional `order`, `publishedAt`, `children`,
and `isCollection`.

| Helper                             | Result                                                      |
| ---------------------------------- | ----------------------------------------------------------- |
| `getTree()` / `.tree`              | Full tree                                                   |
| `findNode(path)`                   | Node or undefined                                           |
| `getChildren(path)`                | Child nodes, or empty array                                 |
| `getParent(path?)`                 | Parent or undefined; default current page                   |
| `getSiblings(path?, includeSelf?)` | Siblings; default excludes self                             |
| `getSubtree(path)`                 | `[matchingNode]` with nested children intact; not flattened |
| `getBreadcrumbs(path?)`            | Ancestor/current breadcrumb trail                           |
| `getCurrentNode()`                 | Current page node or undefined                              |

Use returned URLs instead of concatenating directory names. Nodes can represent
collections without a real landing page: add the corresponding Markdown index
before promising a clickable landing route.

```eta
<nav aria-label="Main navigation">
  <ul>
    <% for (const node of stati.nav.getTree()) { %>
      <li>
        <a href="<%= node.url %>"
          <% if (node.url === stati.page.url) { %>aria-current="page"<% } %>>
          <%= node.title %>
        </a>
      </li>
    <% } %>
  </ul>
</nav>
```

Sort behavior uses numeric `order` first. Child ordering then uses parsed
publication date newest first and title; top-level ordering falls back to title.
Do not mutate the shared navigation tree to implement one view's sorting.

## Collections and generated-content limits

`collection` contains `pages`, `children`, `recentPages`, `pagesByTag`, `metadata`.
Nonroot aggregation pages include descendants, excluding the current page.
Root aggregation is not the entire website. An `index.eta` can specialize the
listing layout, but still needs Markdown pages and actual descendant content.

The checked implementation's child-page parent collection lookup has URL
trailing-slash sensitivity. Guard `stati.collection`; do not rely on every post
having a parent collection. Navigation helpers are often the better sidebar API.

To list a section from another page, such as the latest posts on the home page,
use `stati.nav.getChildren('/blog')`; the root collection cannot do it. Nodes
arrive in nav order (numeric `order`, then newest `publishedAt`), so a plain
`.slice(0, 5)` gives the latest posts when posts set no `order`. Posts in
subfolders come back as `isCollection` nodes with nested `children`, not a flat
list. Nodes carry no `description`, `tags`, or other frontmatter; when a listing
outside its index page needs those, build the data in `beforeAll` and expose it
through an `eta.filters` function.

Tags only aggregate data. They do not create `/tags/<tag>` pages. Pagination,
author archives, language variants, CMS-driven pages, and date archives require
explicit content generation or authored Markdown plus layouts/hooks. Generate
source content **before** Stati's content discovery if adding pages in a build
script; `beforeAll` is not a pre-discovery file-generation hook.

Drafts are omitted by normal content loading. `--include-drafts` is an explicit
build preview choice; search still excludes drafts. Do not publish draft-including
artifacts accidentally.

Source authority: `packages/core/src/core/content.ts`, `markdown.ts`,
`navigation.ts`, `utils/navigation-helpers.utils.ts`, `types/content.ts`,
`types/navigation.ts`; corresponding `packages/core/test/core/` tests.
