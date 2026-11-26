---
title: 'Routing'
description: 'How file paths in site/ become URLs and output files, which files are not pages, the 404 page, and permalinks.'
order: 2
seo:
  title: 'Filesystem routing in Stati'
---

# Routing

The path of each Markdown file in `site/`, without `.md`, is the page's URL. An `index.md` takes its folder's URL, without a trailing slash, and every page is written to a `.html` file named after its URL; only the root page becomes an `index.html`:

```text
site/index.md               → /                    → dist/index.html
site/about.md               → /about               → dist/about.html
site/blog/index.md          → /blog                → dist/blog.html
site/blog/first-post.md     → /blog/first-post     → dist/blog/first-post.html
site/docs/api/reference.md  → /docs/api/reference  → dist/docs/api/reference.html
```

Folders nest to any depth. A URL that ends in `/`, from a `permalink` or a `collections.generate` entry, is written as a folder-style `…/index.html` (see [Front matter URL override](#front-matter-url-override)).

`stati preview` serves `/blog`, `/blog.html` and `/blog/` from `dist/blog.html`. On your production host, check that an extensionless URL such as `/blog` is served from `blog.html`, including when a `blog/` folder sits next to it. Many static hosts do this by default; others need a "clean URLs" or rewrite setting.

## No slug transformation

Stati keeps file names as written: it doesn't lowercase them or replace spaces, underscores or other characters. Use lowercase, hyphenated file names:

```text
my-post.md  → /my-post
About.md    → /About     (URLs are case-sensitive)
my_post.md  → /my_post
my post.md  → /my post   (links must write it as /my%20post)
```

## Files that aren't pages

Only `.md` files become pages. Markdown in a folder whose name starts with `_`, such as `site/_drafts/`, is skipped; a single file that starts with `_`, such as `site/_notes.md`, is still a page (`/_notes`), so keep one file out with `draft: true` instead. Templates (`.eta`) and every other file in `site/` never become pages, so `site/partials/` needs no underscore. A `README.md` in `site/` is a page (`/README`), so keep READMEs out of `site/`. Which layout a page uses is on [Templates and layouts](/core-concepts/templates#template-resolution-order).

## The 404 page

`site/404.md` is the page for addresses that don't exist. It builds to `dist/404.html`, which most static hosts serve for a missing address, and `stati dev` and `stati preview` serve it the same way. With `permalink: /404/` it builds to `dist/404/index.html` and works the same.

The page is only there for readers who followed a broken link, so Stati keeps it out of the places that list your pages:

| Output                                              | The 404 page | To change it, in its front matter                                       |
| --------------------------------------------------- | ------------ | ----------------------------------------------------------------------- |
| [Sitemap](/configuration/seo#sitemap-configuration) | Left out     | `sitemap: { exclude: false }`, with `seo.noindex: false`                |
| [Search index](/configuration/search)               | Left out     | `search: true`                                                          |
| [RSS feeds](/configuration/rss)                     | Left out     | Not possible                                                            |
| [Navigation tree](/api/navigation)                  | Left out     | `nav: true`                                                             |
| [Generated Open Graph image](/configuration/images) | None         | Set your own `seo.openGraph.image`                                      |
| Robots meta tag                                     | `noindex`    | `seo.noindex: false`, or a `seo.robots` value with `index` or `noindex` |

The `noindex` matters because a host sends the 404 status only for missing addresses. Requested by its own address, `/404` or `/404.html`, the page is an ordinary file that most hosts send with a 200, and a search engine could list it. Don't add `Disallow: /404` to `robots.txt` for the same reason: a crawler that may not fetch the page never sees its `noindex`.

Only the page at the site root counts: `site/docs/404.md` is an ordinary page at `/docs/404`. The 404 page stays one of the top-level pages of the root collection.

## Generated and paginated URLs

`paginate: 10` in a listing's front matter adds `/blog/page/2`, `/blog/page/3` and so on after its URL (`/blog/page/2/` after a trailing-slash `/blog/`). A `[tag].md` file renders nothing at its own URL and becomes one page per key instead, such as `/blog/tags/css`. Stati deletes their output once they are no longer needed. See [Collections and generated pages](/core-concepts/collections).

## Front matter URL override

`permalink` in front matter replaces the URL Stati takes from the file path:

```markdown
---
title: 'Custom URL Example'
permalink: '/custom-path'
---

# This page will be available at /custom-path
```

**Note:** A permalink without a trailing slash (`/custom-path`) is written to `dist/custom-path.html`; one with a trailing slash (`/custom-path/`) is written to `dist/custom-path/index.html`. Generated URLs never end in a slash (except `/`), so use permalinks without a trailing slash to stay consistent.

**Important:** When using `permalink`:

- It must be a static string (no template variables or date formatting)
- Start it with `/`; Stati uses the value as-is and does not validate it, apart from `..` segments (`/../page`), which lead out of `dist/`: the build warns and skips a page with one, and does the same for a `collections.generate` URL
- It completely replaces the file-path-based URL, which also changes the page's place in collections and navigation

Example:

```markdown
---
# Override deeply nested file path
# File: site/archive/2023/old-posts/article.md
# Without permalink: /archive/2023/old-posts/article
# With permalink: /featured/article
permalink: '/featured/article'
---
```

## Working with the router

### Link generation

When linking between pages, use absolute paths from the site root, written the way Stati generates them, without a trailing slash:

```markdown
Check out our [Getting Started page](/getting-started/introduction) for more information.
Visit the [API documentation](/api/reference) to learn more.
Visit the [Blog homepage](/blog) to see all posts.
```

Markdown links get the base path of a site served from a subfolder automatically. In templates, print links with [`stati.url()`](/advanced/deploying-to-a-subfolder#link-with-stati-url).

### Active links

Compare `stati.page.url` to mark the current section:

```eta
<% const inBlog = stati.page.url === '/blog' || stati.page.url.startsWith('/blog/'); %>
<nav>
  <a href="<%= stati.url('/') %>" class="<%= stati.page.url === '/' ? 'active' : '' %>">Home</a>
  <a href="<%= stati.url('/blog') %>" class="<%= inBlog ? 'active' : '' %>">Blog</a>
</nav>
```

### Breadcrumbs

`stati.nav.getBreadcrumbs()` gives the trail for breadcrumb navigation ([example](/api/navigation#stati-nav-getbreadcrumbs-path)).

The `getBreadcrumbs()` method returns an array of `NavNode` objects, each with `title` and `url` properties, using page titles from front matter. The trail starts at the collection that contains the current page, not at the site root: for `/docs/api/hooks` it is `API › Hooks`, because every collection folder is a top-level node in the navigation tree (see [Navigation](/api/navigation#navigation-structure)). Add a Home link, and links to higher sections, yourself.

## Multilingual sites

Stati has no language routing. Keep each language in its own folder, such as `site/en/` and `site/es/`; each folder with an `index.md` is a [collection](/core-concepts/collections).
