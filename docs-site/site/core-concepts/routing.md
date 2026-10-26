---
title: 'Routing'
description: 'Learn how Stati uses filesystem-based routing to generate URLs from your content.'
order: 2
seo:
  title: 'Filesystem routing in Stati'
---

# Routing

Stati uses filesystem-based routing, which means the structure of your `site/` directory directly determines the URLs of your website.

## Basic routing

### Files to URLs

The mapping from files to URLs is straightforward:

```text
site/
├── index.md              → /
├── about.md               → /about
├── contact.md             → /contact
└── blog/
    ├── index.md           → /blog
    ├── first-post.md      → /blog/first-post
    └── second-post.md     → /blog/second-post
```

### Directory structure

Every directory can have its own `index.md` file, which becomes the homepage for that section:

```text
site/
├── index.md              → / (site homepage)
├── docs/
│   ├── index.md          → /docs (docs homepage)
│   ├── getting-started.md → /docs/getting-started
│   └── api/
│       ├── index.md      → /docs/api (API section homepage)
│       └── reference.md  → /docs/api/reference
```

## URL generation rules

### Clean URLs

Stati generates URLs by:

- Removing the `.md` file extension
- Mapping an `index.md` file to its folder's URL, without a trailing slash (the root `index.md` becomes `/`)

```text
about.md        → /about           → dist/about.html
blog/index.md   → /blog            → dist/blog.html
blog/my-post.md → /blog/my-post    → dist/blog/my-post.html
index.md        → /                → dist/index.html
```

Every page is written as a `.html` file named after its URL. Only the root page becomes an `index.html`. A URL that ends in `/`, from a `permalink` or a `collections.generate` entry, is the way to get a folder-style `…/index.html` output (see [Front matter URL override](#front-matter-url-override)).

`stati preview` serves `/blog`, `/blog.html` and `/blog/` from `dist/blog.html`. On your production host, check that an extensionless URL such as `/blog` is served from `blog.html`, including when a `blog/` folder sits next to it. Many static hosts do this by default; others need a "clean URLs" or rewrite setting.

### Important: No automatic slug transformation

**Stati preserves filenames exactly as written** (minus the `.md` extension). There is NO automatic:

- Lowercase conversion
- Space/underscore to hyphen conversion
- Special character removal
- Slug beautification

This means you must use URL-safe filenames from the start:

```text
✅ Good (URL-safe):
about.md → /about
my-post.md → /my-post
getting-started.md → /getting-started

⚠️ Problematic (not URL-safe):
About.md → /About (case-sensitive URL)
my_post.md → /my_post (underscore in URL)
my post.md → /my post (space in URL, must be written %20 in links)
post!.md → /post! (special chars - problematic)
```

## Nested routing

### Deep nesting

Stati supports unlimited nesting levels:

```text
site/
└── docs/
    └── guides/
        └── advanced/
            └── customization.md → /docs/guides/advanced/customization
```

## Special files and directories

### Files and directories excluded from routing

Stati excludes certain files and directories from URL generation:

#### **Directories starting with `_` (underscore)**

**Critical Rule**: Any **directory** starting with `_` (and all files within it) is excluded from routing. Individual files starting with `_` are NOT automatically excluded:

```text
site/
├── _drafts/             ❌ Not routed - Draft content
│   └── upcoming-post.md
├── _data/               ❌ Not routed - Data files
│   └── config.json
├── _notes.md            ✅ ROUTED! - Individual files with _ ARE processed → /_notes
├── guides/              ✅ Routed (no underscore)
│   └── setup.md         ✅ Routed - Creates /guides/setup
└── published.md         ✅ Routed - Creates /published
```

The underscore matters only for Markdown files. Other files in `site/` never become pages, so templates such as `site/partials/header.eta` need no underscore folder. See [Non-Markdown files](#non-markdown-files).

> **Tip:** To exclude individual files, use `draft: true` in front matter instead of filename prefixes.

#### **Non-Markdown files**

Only `.md` files become pages. All other file types are automatically excluded:

```text
site/
├── layout.eta           ❌ Not routed - Template file (.eta)
├── config.js            ❌ Not routed - JavaScript file
├── styles.css           ❌ Not routed - Stylesheet
├── image.png            ❌ Not routed - Image file
├── .DS_Store            ❌ Not routed - Not markdown
├── .gitkeep             ❌ Not routed - Not markdown
├── README.md            ✅ Routed - Creates /README (is markdown!)
└── index.md             ✅ Routed - Creates / homepage
```

**Note:** `README.md` files ARE routed because they are markdown files. Don't place README files in your `site/` directory, keep them in your project root or other non-site directories.

### Layout files

`layout.eta` files are special template files that don't generate routes but define the layout for their directory and subdirectories. Other templates, such as a shared `base.eta` shell or the files in `partials/`, don't generate routes either:

```text
site/
├── layout.eta          # Root layout
├── index.md            → / (uses root layout)
├── blog/
│   ├── layout.eta      # Blog-specific layout
│   ├── index.md        → /blog (uses blog layout)
│   └── post.md         → /blog/post (uses blog layout)
```

### The 404 page

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

Only the page at the site root counts: `site/docs/404.md` is an ordinary page at `/docs/404`. Collections don't change, so the 404 page is still one of the top-level pages in the root collection. Settings that sites used to keep it out, such as `excludePatterns: ['/404']` or `seo.noindex: true` in its front matter, keep working but are no longer needed.

## Generated and paginated URLs

Two kinds of pages get their URLs from data rather than from a file of their own. See [Collections and generated pages](/core-concepts/collections).

```text
site/
├── blog/
│   ├── index.md         → /blog, with `paginate: 10`
│   │                    → /blog/page/2, /blog/page/3… (dist/blog/page/2.html)
│   └── tags/
│       └── [tag].md     → /blog/tags/css, /blog/tags/javascript… (one per tag)
```

- **Pagination:** `paginate` in front matter adds `/page/2`, `/page/3` and so on after the page's URL. With a trailing-slash permalink such as `/blog/`, page 2 is `/blog/page/2/`.
- **Templates:** a file named `[tag].md` (a name of letters, digits, `-` and `_` in brackets, starting with a letter or `_`) renders nothing at its own URL. It becomes one page per key, at its URL with the bracketed part replaced by the key, or at its `permalink` with `[tag]` replaced.

Stati deletes the output of these pages when they are no longer needed, such as a tag that no post uses.

## Front matter URL override

You can completely override the automatic URL generation using the `permalink` field in front matter:

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

### Navigation helpers

In templates, you can access routing information:

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

Next, learn about [Templates and layouts](/core-concepts/templates) to understand how your content gets rendered.
