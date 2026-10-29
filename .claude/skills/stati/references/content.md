# Content, frontmatter, routing, navigation, and listings

## Content sources

The content loader reads `**/*.md` below `srcDir` (`site` by default), excluding
underscore-prefixed directories. Markdown in `_drafts/` is not an ordinary
page. `.eta` files are templates, not standalone routes, wherever they are, so
template folders such as `site/partials/` need no underscore. Markdown is not MDX and
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

Write images as Markdown (`![Alt text](./photo.jpg)`) rather than raw `<img>` so
Stati adds their size and lazy loading; a relative path points next to the `.md`
file. For a caption, put the Markdown image between blank lines inside
`<figure>`, before the `<figcaption>`.

Quote dates intended as strings. Use a numeric `order`, booleans for `draft`,
and arrays of strings for `tags`. Do not assume YAML fields are schema-validated
or that malformed values will be safely coerced by every feature. The fields Stati
reads as text (`title`, `description`, `tags`, `seo.title`, `seo.description`,
`seo.keywords`) are the exception: when YAML reads one as a number, boolean or date
(`title: 1984`, `tags: [2024]`, `title: 2024-01-01`), Stati uses the text that was
written (a date as `2024-01-01`), and drops `null` tag entries with a warning that
names the file.

Built-in/respected metadata:

| Field                            | Purpose                                                         |
| -------------------------------- | --------------------------------------------------------------- |
| `title`, `description`           | Display/SEO defaults                                            |
| `tags`                           | Grouping, search, invalidation, keyword fallback                |
| `layout`                         | Source-root-relative layout name without `.eta`                 |
| `order`                          | Navigation sort key                                             |
| `publishedAt`                    | Canonical publication date, parsed into `PageModel.publishedAt` |
| `published`, `date`, `createdAt` | Fallbacks, in that order, when `publishedAt` is absent/invalid  |
| `updated`                        | Modification metadata fallback                                  |
| `draft`                          | Omitted unless draft inclusion requested                        |
| `permalink`                      | String URL override supported by loader                         |
| `ttlSeconds`, `maxAgeCapDays`    | Page cache controls                                             |
| `seo`                            | Page SEO settings                                               |
| `sitemap`                        | Page sitemap settings                                           |
| custom fields                    | Remain in `frontMatter` / current `stati.page`                  |

Reserve `path`, `url`, `content`, `navNode`, `toc`: rendering overwrites them.
From core 1.29, `collection`, `paginate` and `generate` configure collections,
pagination and generated pages (see below); in a `[param].md` template, `nav`
and `search` opt its pages in. Any other custom frontmatter field is not
automatically a runtime feature: `slug`, `pagination` (as opposed to
`paginate`) or `locale` do not imply route generation.

## Routes and output are different

In the checked implementation, filenames/directories are preserved rather than
automatically slugified. Choose lowercase hyphenated names yourself.

| Source               | Normalized `PageModel.url` | Physical output        |
| -------------------- | -------------------------- | ---------------------- |
| `site/index.md`      | `/`                        | `dist/index.html`      |
| `site/about.md`      | `/about`                   | `dist/about.html`      |
| `site/blog/index.md` | `/blog`                    | `dist/blog.html`       |
| `site/blog/hello.md` | `/blog/hello`              | `dist/blog/hello.html` |
| `site/blog/a/b.md`   | `/blog/a/b`                | `dist/blog/a/b.html`   |

An explicit trailing-slash permalink such as `/custom/` produces
`dist/custom/index.html`. Normal nonroot URLs instead produce `<url>.html`.
(Before core 1.29, pages two or more folders deep got a backslash in their URL
on Windows, such as `/blog\a/b`.)

Docs sometimes show trailing slashes and filename slugification that are not
guaranteed by the checked source. Use actual `page.url` / navigation URLs in
templates, and inspect output and host resolution. Do not derive route strings
from titles or assume all pages are directory-style `index.html`.

`permalink` overrides the URL as a string; it is not a redirect or an additional
alias route. Use unique, safe internal paths and test the output file and link.
Do not include query strings, fragments, or a full external URL as a content
route. A `..` segment in a `permalink` or `collections.generate` URL leads out of
the output directory: the build warns and skips that page. Moving a file or
changing a permalink does not create an old URL redirect. Implement redirects
using explicit pages or hosting configuration.

`site.baseUrl` supplies absolute metadata links and, from core 2.5, the base path of a
site served from a subfolder: `page.url` and navigation URLs stay relative to the
site root, and links print through `stati.url()`. Markdown links and images that start
with a single `/` get the base path automatically. A host must resolve the emitted
pretty URLs to actual files.
Verify both `/about` and intended trailing-slash variants on the target host.
From core 1.29, `stati build` deletes the HTML of pages that no longer exist
(only files its cache manifest records); on older versions use a clean
production build after deleting or renaming routes.

## Markdown behavior

Default MarkdownIt options enable raw HTML, linkification, and typography.
Core 2.0 uses markdown-it 15 (linkify-it 6), which links differently from 1.x:
domains without a scheme (`www.example.com`) and file names (`README.md`) stay
text; email-shaped text links whatever its domain, so `react@18.3.1` outside
backticks becomes a `mailto:` link; a URL with a user name
(`https://git@github.com/o/r.git`) links only up to the `@`. In
`markdown.configure`, `md.linkify.set()` takes `fuzzyLink: true`,
`fuzzyEmail: false` and `urlAuth: true` to change each.
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
callbacks, and collection arrays receive. From 1.29, generated pages carry
`generated` and every page of a paginated listing carries `pagination`; hooks
receive those pages too.

Every page also has `wordCount` and `readingTime`, computed when the content is
loaded from the Markdown body, so `beforeAll` hooks can read them and templates print
`stati.page.readingTime` or `post.readingTime` without a hook. Front matter,
fenced code blocks, HTML tags, images and Markdown syntax do not count; link text and
inline code do. Words are runs between whitespace; each Han, Hiragana and Katakana
character counts as one word, so the count is approximate for Chinese and Japanese.
`readingTime` is `wordCount` over `readingTime.wordsPerMinute` (default 230), rounded
to whole minutes and at least 1. They belong to Stati's page, so front matter keys of
those names are replaced with a warning, and a hook that edits `content` does not
change them (pages a hook adds get theirs after the hook).

`publishedAt` is a `Date` taken from the first valid front matter value among
`publishedAt`, `published`, `date`, `createdAt`. Quoted (string) and unquoted
(YAML `Date`) values both work; invalid values are skipped with a console
warning. Collections, navigation, ISG aging and RSS use the same order. The
flattened `stati.page.publishedAt` is still the raw front matter value.

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

## Collections, pagination and generated pages

`collection` contains `pages`, `children`, `recentPages`, `pagesByTag`, `metadata`
and the method `related(url, options?)` for related pages (core 2.11+; see
[Eta and components](./eta.md#collections-inside-templates)).
Nonroot aggregation pages include descendants, excluding the current page.
Root aggregation is not the entire website: only top-level pages, including
folder index pages such as `/blog`. An `index.eta` can specialize the listing
layout, but still needs Markdown pages and actual descendant content. Each
render gets its own copies of the arrays.

Which collection `stati.collection` is (core 1.29+):

1. The one named by `collection: /blog` in the page's frontmatter (`blog`,
   `/blog`, `/blog/` all work). Use this to list another section, such as the
   latest posts on the home page. An unknown name warns and falls back.
2. Its own, on a collection index page. An `index.md` whose folder has no
   pages yet reads an empty collection, never another one.
3. The nearest collection the page belongs to: `/blog/post` and
   `/blog/2025/recap` read `/blog`; top-level pages read the root collection.
4. `undefined` when it belongs to none. Guard with `stati.collection?.`.

Before 1.29, nested child pages got `undefined` (a trailing-slash lookup bug), so
older sites computed prev/next and related posts in `beforeAll`.

ISG tracks reads: a page that reads `stati.collection` rebuilds when a member is
added, removed or moved, or its `title`, `description`, `tags`, `draft` or
publish date changes. `collections.summaryFields` replaces that field list
(`content` means the body). Data handed over through `beforeAll` and helpers is
not tracked; prefer `stati.collection`.

**Pagination:** `paginate: 10` or `paginate: { size: 10, path: 'page' }` on a page
with a collection splits `recentPages`: page 1 keeps the URL (`/blog`), later
pages are `/blog/page/2` (`/blog/page/2/` when the URL has a trailing slash;
`/page/2` for the root). Templates read `stati.pagination`: `pageNumber`,
`totalPages` (≥ 1), `items`, `prevUrl`, `nextUrl`, `urls`. Later pages reuse the
first page's layout (including `index.eta`), Markdown and frontmatter.

**Generated pages:** a file named `[tag].md` (letters, digits, `-`, `_` in the
brackets) is a template, never a page. With `generate: { from: tags }` it
becomes one page per value of that frontmatter field in its collection
(`collection:` or the nearest collection with pages), keyed by Stati's slugify
(`CSS` → `css`, at `/blog/tags/css`). Values slugifying to the same key merge
with a warning; values with an empty key (no Latin letters or digits) get no
page. `{tag}` in its frontmatter strings becomes the label (`CSS`), `{{tag}}`
stays literal, other `{…}` and `permalink`/`generate` are untouched;
`permalink: /topics/[tag]/` places pages. `generate.paginate` splits each page.
Templates read `stati.generated`: `key`, `label`, `items`, `template`, `data`.
Link to them with `` `/blog/tags/${stati.slugify(tag)}` ``.
`collections.generate(ctx)` in config returns `{ url, template, key?, label?,
items?, data? }` entries for keys that aren't frontmatter values.

Generated pages and pages 2+ are never collection members, stay out of
navigation (`nav: true` in the template opts generated pages in), search
(`search: true` opts in) and RSS, and are in the sitemap. They are created
after content loads and before `beforeAll`, so hook-added tags make no pages.
Their output is deleted when a key or page disappears.

The root 404 page (core 2.2+) is the reverse: it stays a collection member but
is out of navigation, search, RSS and the sitemap. See
[the 404 page](./features.md#the-404-page).

Author archives by field, tag pages and numbered listings need no build
script. Language variants, CMS-driven pages and date archives still need
authored Markdown, `collections.generate`, or source files generated **before**
Stati's content discovery; `beforeAll` is not a pre-discovery file-generation
hook.

Drafts are omitted by normal content loading. `--include-drafts` is an explicit
build preview choice; search still excludes drafts. Do not publish draft-including
artifacts accidentally.

Source authority: `packages/core/src/core/content.ts`, `markdown.ts`,
`navigation.ts`, `utils/navigation-helpers.utils.ts`, `types/content.ts`,
`types/navigation.ts`; corresponding `packages/core/test/core/` tests.
