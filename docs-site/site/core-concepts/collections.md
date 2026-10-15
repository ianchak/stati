---
title: 'Collections and generated pages'
description: 'List the pages of a folder, split long listings into pages, and generate a page for every tag, author or other key.'
order: 4
---

# Collections and generated pages

A folder of pages with an `index.md` is a **collection**. Templates read it as `stati.collection`: the pages in the folder, sorted by date and grouped by tag. On top of that, Stati can split a listing into numbered pages with `paginate`, and turn one `[param].md` template into a page for every tag, author or other key. Listings stay current: when a post is added, removed, retitled or retagged, Stati rebuilds the pages that list it, and nothing else.

```text
site/
├── index.md             # Root collection: every top-level page
├── blog/
│   ├── index.md         # Blog collection: every page under /blog
│   ├── index.eta        # Optional layout used only for blog/index.md
│   ├── hello-world.md
│   └── 2025/
│       └── recap.md
└── tags/
    ├── index.md         # All tags, with `collection: /blog`
    └── [tag].md         # One page per tag: /tags/css, /tags/javascript…
```

## Collection data

| Property                  | What it holds                                                                       |
| ------------------------- | ----------------------------------------------------------------------------------- |
| `pages`                   | Every page in the collection, at any depth, excluding the index page itself         |
| `children`                | Only the pages one level down (`hello-world`, not `2025/recap`)                     |
| `recentPages`             | `pages` sorted by publish date, newest first; undated pages follow, sorted by title |
| `pagesByTag`              | An object mapping each front matter tag to the pages that carry it                  |
| `metadata.totalPages`     | The number of entries in `pages`                                                    |
| `metadata.hasChildren`    | Whether `children` is non-empty                                                     |
| `metadata.collectionPath` | The index page's URL, such as `/blog`                                               |
| `metadata.collectionName` | The folder name, such as `blog`, or `Home` for the root                             |

Each entry is a page model, not a template context. Read front matter through `frontMatter`, and use `url` for links:

```eta
<% const posts = stati.collection?.recentPages ?? []; %>
<ul class="post-list">
  <% posts.forEach(post => { %>
  <li>
    <a href="<%= post.url %>"><%= post.frontMatter.title %></a>
    <% if (post.publishedAt) { %>
    <time datetime="<%= post.publishedAt.toISOString() %>">
      <%= post.publishedAt.toLocaleDateString('en-US', { dateStyle: 'medium' }) %>
    </time>
    <% } %>
  </li>
  <% }) %>
</ul>
```

A tag list with counts comes straight from `pagesByTag`:

```eta
<% const byTag = stati.collection?.pagesByTag ?? {}; %>
<% Object.keys(byTag).sort().forEach(tag => { %>
<a href="<%= `/tags/${stati.slugify(tag)}` %>"><%= tag %> (<%= byTag[tag].length %>)</a>
<% }) %>
```

Each template gets its own copy of the lists, so sorting or filtering them in place doesn't affect other pages.

## Which collection a page reads

1. **The one its front matter names.** `collection: /blog` gives any page the blog collection, such as the latest posts on the home page. The value is the URL of a collection's index page; `blog`, `/blog` and `/blog/` all work.
2. **Its own,** on a collection index page: `site/blog/index.md` reads the blog collection.
3. **The nearest one it belongs to,** on other pages: `/blog/hello-world` and `/blog/2025/recap` read the blog collection, and top-level pages such as `/about` read the root collection.
4. **None:** a page that belongs to no collection, such as `/notes/draft` without a `site/notes/index.md`, gets `undefined`. Guard with `stati.collection?.` in shared layouts.

```markdown
---
title: Home
# List the newest posts on the home page
collection: /blog
---
```

```eta
<% for (const post of (stati.collection?.recentPages ?? []).slice(0, 5)) { %>
  <a href="<%= post.url %>"><%= post.frontMatter.title %></a>
<% } %>
```

Since posts read their own collection, prev/next links need no hook:

```eta
<%
  const posts = stati.collection?.recentPages ?? [];
  const i = posts.findIndex((post) => post.url === stati.page.url);
  const newer = posts[i - 1];
  const older = posts[i + 1];
%>
<% if (newer) { %><a href="<%= newer.url %>" rel="prev"><%= newer.frontMatter.title %></a><% } %>
<% if (older) { %><a href="<%= older.url %>" rel="next"><%= older.frontMatter.title %></a><% } %>
```

A collection name that matches no index page is reported with a warning, and the page reads its default collection instead.

## What rebuilds a listing

Stati notices which pages read `stati.collection` while they render. Such a page depends on a summary of the collection: every page's URL and publish date, plus its `title`, `description`, `tags` and `draft` front matter. When the summary changes, because a page in the collection was added, removed, moved or had one of those fields changed, the pages that read the collection rebuild. A change to a post's body or to other front matter rebuilds only that post. See [ISG](/core-concepts/isg#dependency-tracking).

When a listing shows other fields, add them to `collections.summaryFields`. The list replaces the default, and `content` stands for the Markdown body, for listings that show excerpts:

```javascript
export default defineConfig({
  collections: {
    summaryFields: ['title', 'description', 'tags', 'draft', 'image', 'author'],
  },
});
```

## Pagination

`paginate` splits a page's collection into pages of a fixed size:

```markdown
---
title: Blog
paginate:
  size: 10 # posts per page
  path: page # optional, default 'page'
---
```

`paginate: 10` is short for `paginate: { size: 10 }`. It works on any page with a collection: an index page, or a page that names one with `collection`.

| Page   | URL                         | File                    |
| ------ | --------------------------- | ----------------------- |
| Page 1 | `/blog`, the page's own URL | `dist/blog.html`        |
| Page 2 | `/blog/page/2`              | `dist/blog/page/2.html` |
| Page 3 | `/blog/page/3`              | `dist/blog/page/3.html` |

Later pages follow the first page's style: with `permalink: /blog/`, page 2 is `/blog/page/2/`, and the root page's page 2 is `/page/2`. Each page renders with the same layout and Markdown as the first, and templates read their part of the listing from `stati.pagination`:

| Property     | What it holds                                                       |
| ------------ | ------------------------------------------------------------------- |
| `pageNumber` | This page's number, starting at 1                                   |
| `totalPages` | The number of pages; at least 1, even when the collection is empty  |
| `items`      | This page's share of `recentPages`, newest first                    |
| `prevUrl`    | The previous page's URL; absent on page 1                           |
| `nextUrl`    | The next page's URL; absent on the last page                        |
| `urls`       | Every page's URL, in order, for numbered links; `urls[0]` is page 1 |

```eta
<% const pagination = stati.pagination; %>
<% for (const post of pagination.items) { %>
  <a href="<%= post.url %>"><%= post.frontMatter.title %></a>
<% } %>
<% if (pagination.totalPages > 1) { %>
<nav aria-label="Pages">
  <% if (pagination.prevUrl) { %><a href="<%= pagination.prevUrl %>" rel="prev">Newer</a><% } %>
  <% pagination.urls.forEach((url, i) => { %>
    <a href="<%= url %>"<% if (i + 1 === pagination.pageNumber) { %> aria-current="page"<% } %>><%= i + 1 %></a>
  <% }) %>
  <% if (pagination.nextUrl) { %><a href="<%= pagination.nextUrl %>" rel="next">Older</a><% } %>
</nav>
<% } %>
```

A page of the listing rebuilds when the posts it shows change, and every page rebuilds when the number of pages changes, because each one links to all of them. Adding a post moves every post down by one, so all pages of a newest-first listing rebuild. Pages that a shorter listing no longer needs are deleted. Templates that also read `stati.collection` depend on the whole collection, so read `stati.pagination` alone where you can.

Later pages repeat the first page's Markdown body; show it on page 1 only with `<% if (stati.pagination.pageNumber === 1) { %>`.

## Generated pages

A Markdown file whose name is a word in brackets, such as `site/blog/tags/[tag].md`, is a **template**: Stati turns it into one page per key and never renders the file itself.

```markdown
---
title: 'Posts tagged {tag}'
description: 'Every post about {tag}, newest first.'
generate:
  from: tags # one page per tag in the collection
  paginate: { size: 10 } # optional, see Pagination
---
```

With posts tagged `CSS` and `JavaScript`, this creates `/blog/tags/css` and `/blog/tags/javascript`, and `/blog/tags/css/page/2` once more than ten posts carry `CSS`.

- **Keys:** `generate.from` names a front matter field of the pages in the template's collection. Lists such as `tags` give a page per value, and so do single values such as `author: ada`. Each value becomes a key through the same slugify Stati uses for heading anchors: `CSS` becomes `css`, `Node.js` becomes `node-js`.
- **Collection:** the template reads the collection its `collection` front matter names, or else the nearest collection its folder belongs to. `site/blog/tags/[tag].md` reads `/blog`, even when `site/blog/tags/index.md` exists, because that folder holds no pages of its own.
- **URLs:** the file's path, with the bracketed name replaced by the key. To put the pages elsewhere, write the bracketed name into `permalink`: `permalink: /topics/[tag]/` gives `/topics/css/`.
- **Collisions:** values that slugify to the same key share one page, under the first value seen (newest page first), with a warning. Values whose key comes out empty get no page, also with a warning: slugify keeps Latin letters and digits only, so `!!!` or a tag written in another script has no key. Give such pages URLs of your own with [`collections.generate`](#pages-from-data). When another page already has a generated page's URL, that page wins.
- **Drafts:** a tag only drafts use gets a page only when you build with `--include-drafts`.

Templates read the page's key and items as `stati.generated`:

| Property   | What it holds                                                     |
| ---------- | ----------------------------------------------------------------- |
| `key`      | The key in the URL, such as `css`                                 |
| `label`    | The original value, such as `CSS`                                 |
| `items`    | The pages with this key, newest first                             |
| `template` | The template's path in the source directory, `blog/tags/[tag].md` |
| `data`     | Data from a [`collections.generate`](#pages-from-data) entry      |

```eta
<h1>Posts tagged <%= stati.generated.label %></h1>
<% for (const post of (stati.pagination ?? stati.generated).items) { %>
  <a href="<%= post.url %>"><%= post.frontMatter.title %></a>
<% } %>
```

Generated pages render with the layout their template's folder would use, so `site/blog/tags/layout.eta`, or the `layout` in the template's front matter, styles them all.

### Placeholders

`{tag}` in a template named `[tag].md` is replaced in every text value of its front matter, nested ones included, before navigation, SEO, the sitemap and search read it:

- It is replaced with the label (`CSS`), not the key (`css`).
- `{{tag}}` produces the literal text `{tag}`.
- Placeholders with other names, such as `{author}`, are left as they are, and so are `permalink` and `generate`.
- The Markdown body is not changed. Use `stati.generated` in the template for anything more.

### Linking to generated pages

`stati.slugify` gives the same key Stati used, so any page can link to a tag's page:

```eta
<% for (const tag of stati.page.tags ?? []) { %>
  <a href="<%= `/blog/tags/${stati.slugify(tag)}` %>"><%= tag %></a>
<% } %>
```

### What rebuilds a generated page

A generated page depends on its template and on its own items, so a new post tagged `CSS` rebuilds `/blog/tags/css` and not the page of every other tag. A template that also reads `stati.collection`, for a tag cloud for example, depends on the whole collection. When the last post with a tag loses it, the tag's page is deleted. Each generated page's cache entry carries its key and label as tags, so `stati invalidate "tag:css"` refreshes `/blog/tags/css` along with the posts tagged `css`.

### Pages from data

For keys that don't come from front matter, return pages from `collections.generate`. Each entry names a `[param].md` template that renders it:

```javascript
export default defineConfig({
  collections: {
    generate: async ({ pages }) => [
      {
        url: '/authors/ada',
        template: 'authors/[author].md',
        label: 'Ada Lovelace',
        items: pages.filter((page) => page.frontMatter.author === 'ada'),
        data: { bio: 'Wrote the first program.' },
      },
    ],
  },
});
```

| Field      | Required | What it does                                                                 |
| ---------- | -------- | ---------------------------------------------------------------------------- |
| `url`      | Yes      | The page's URL, starting with `/`                                            |
| `template` | Yes      | The `[param].md` file, relative to the source directory                      |
| `key`      | No       | `stati.generated.key`; defaults to the last segment of `url`                 |
| `label`    | No       | `stati.generated.label` and the value of `{param}`; defaults to the key      |
| `items`    | No       | `stati.generated.items`, split up when the template sets `generate.paginate` |
| `data`     | No       | `stati.generated.data`; any JSON value, and changing it rebuilds the page    |

The function runs once per build, after content is loaded, and receives the configuration and the pages loaded from Markdown. A template used only by `collections.generate` needs no `generate.from`.

## Where generated and paginated pages appear

Generated pages and the pages after the first of a listing are never members of a collection, so they don't show up in `stati.collection`, and they don't turn their folder into a collection. Elsewhere:

| Output          | Generated pages                              | Pages 2 and later of a listing |
| --------------- | -------------------------------------------- | ------------------------------ |
| Navigation tree | No; `nav: true` in the template adds them    | No                             |
| Sitemap         | Yes                                          | Yes                            |
| Search index    | No; `search: true` in the template adds them | No                             |
| RSS feeds       | No                                           | No                             |

Hooks see them: `beforeAll`, `afterAll` and the per-page hooks receive them like any other page, with `page.generated` and `page.pagination` set. Pages are generated before `beforeAll` runs, so tags that a hook adds to front matter don't create tag pages.

## Rules to know

- **Dates:** `recentPages` sorts on `post.publishedAt`, which Stati takes from the first valid front matter field among `publishedAt`, `published`, `date` and `createdAt`. Quoted (`publishedAt: '2025-03-01'`) and unquoted (`date: 2025-03-01`) values both work. An invalid value is skipped with a warning. Navigation, ISG aging and RSS read dates in the same order.
- **The root collection is shallow:** `site/index.md` collects only top-level pages, such as `/about` and `/blog`, not the pages inside `blog/`. Other collections include every depth.
- **Drafts:** pages with `draft: true` are left out unless you build with `--include-drafts`.
- **Index layouts:** an `index.eta` next to an index page is used for that page, and for the later pages of its listing, ahead of `layout.eta`. The listing can have its own template while the posts keep the folder layout.
- **Reserved front matter:** `collection`, `paginate`, `generate`, and in templates `nav` and `search`, configure these features.
- **Template names:** `[tag].md`, `[author].md` and `[release-year].md` work; the name inside the brackets uses letters, digits, `-` and `_`. Brackets in folder names have no meaning.
