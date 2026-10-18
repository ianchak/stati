---
title: 'Routing'
description: 'Learn how Stati uses filesystem-based routing to generate URLs from your content.'
order: 2
seo:
  title: 'Filesystem routing in Stati'
---

# Routing

Stati uses filesystem-based routing, which means the structure of your `site/` directory directly determines the URLs of your website. This approach is intuitive, predictable, and doesn't require complex routing configuration.

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
my post.md → /my post (space in URL - breaks)
post!.md → /post! (special chars - problematic)
```

### Filename best practices

To ensure clean, working URLs:

1. **Use lowercase**: `about.md` not `About.md`
2. **Use hyphens for word separation**: `my-post.md` not `my_post.md` or `my post.md`
3. **Avoid special characters**: Use only letters, numbers, and hyphens
4. **Keep names descriptive but concise**: `getting-started.md` not `getting_started_with_our_platform.md`

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

### Section organization

Organize content by topic, date, or any logical structure:

```text
site/
├── blog/
│   ├── 2024/
│   │   ├── january/
│   │   │   └── new-year-post.md → /blog/2024/january/new-year-post
│   │   └── february/
│   │       └── valentine-post.md → /blog/2024/february/valentine-post
│   └── 2023/
│       └── archive/
│           └── old-post.md → /blog/2023/archive/old-post
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

Templates don't need an underscore folder: only Markdown files become pages, so `site/partials/header.eta` creates no URL. See [Non-Markdown files](#non-markdown-files).

> **Tip:** To exclude individual files, use `draft: true` in frontmatter instead of filename prefixes.

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

#### **Use cases for underscore exclusion**

**Data and Configuration:**

```text
_data/
├── site-config.json    # Site-wide settings
├── navigation.json     # Menu structure
├── authors.json        # Author information
└── categories.json     # Content categories
```

**Development Files:**

```text
_drafts/                # Work-in-progress content
_temp/                  # Temporary build files
_backup/                # Content backups
_assets/                # Source assets (pre-processing)
```

This convention allows you to keep data, drafts and other working files next to your content without creating unwanted routes, keeping your URL structure clean and intentional.

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

## Dynamic content organization

### Date-based organization

For blogs and news sites, organize by date:

```text
site/
└── blog/
    ├── index.md
    ├── 2024/
    │   ├── 01/
    │   │   ├── 15-new-feature.md → /blog/2024/01/15-new-feature
    │   │   └── 30-update.md → /blog/2024/01/30-update
    │   └── 02/
    │       └── 14-valentine.md → /blog/2024/02/14-valentine
```

### Category-based organization

For documentation or portfolio sites:

```text
site/
├── projects/
│   ├── web-development/
│   │   ├── ecommerce-site.md → /projects/web-development/ecommerce-site
│   │   └── portfolio.md → /projects/web-development/portfolio
│   └── mobile-apps/
│       ├── ios-app.md → /projects/mobile-apps/ios-app
│       └── react-native.md → /projects/mobile-apps/react-native
```

### Generated and paginated URLs

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
- **Templates:** a file named `[tag].md` (any word in brackets) renders nothing at its own URL. It becomes one page per key, at its URL with the bracketed part replaced by the key, or at its `permalink` with `[tag]` replaced.

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
- Start it with `/`; Stati uses the value as-is and does not validate it
- It completely replaces the file-path-based URL, which also changes the page's place in collections and navigation

Example use cases:

```markdown
---
# Override deeply nested file path
# File: site/archive/2023/old-posts/article.md
# Without permalink: /archive/2023/old-posts/article
# With permalink: /featured/article
permalink: '/featured/article'
---
```

```markdown
---
# Shorten long category paths
# File: site/documentation/api-reference/authentication.md
# Without permalink: /documentation/api-reference/authentication
# With permalink: /docs/auth
permalink: '/docs/auth'
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

### Navigation helpers

In templates, you can access routing information:

```eta
<% const inBlog = stati.page.url === '/blog' || stati.page.url.startsWith('/blog/'); %>
<nav>
  <a href="/" class="<%= stati.page.url === '/' ? 'active' : '' %>">Home</a>
  <a href="/blog" class="<%= inBlog ? 'active' : '' %>">Blog</a>
</nav>
```

### Breadcrumbs

Use the built-in `stati.nav.getBreadcrumbs()` helper to generate breadcrumb navigation:

```eta
<nav class="breadcrumbs" aria-label="Breadcrumb">
  <ol>
    <li><a href="/">Home</a></li>
    <% stati.nav.getBreadcrumbs().forEach((crumb, index, array) => { %>
      <li>
        <% if (index === array.length - 1) { %>
          <span aria-current="page"><%= crumb.title %></span>
        <% } else { %>
          <a href="<%= crumb.url %>"><%= crumb.title %></a>
        <% } %>
      </li>
    <% }) %>
  </ol>
</nav>
```

The `getBreadcrumbs()` method returns an array of `NavNode` objects, each with `title` and `url` properties, using page titles from front matter. The trail starts at the collection that contains the current page, not at the site root: for `/docs/api/hooks` it is `API › Hooks`, because every collection folder is a top-level node in the navigation tree (see [Navigation](/api/navigation#navigation-structure)). Add a Home link, and links to higher sections, yourself.

See the [Navigation API](/api/navigation) for more details on breadcrumb customization.

## Best practices

### URL structure design

1. **Keep URLs short and descriptive**
   - Good: `/docs/getting-started`
   - Avoid: `/documentation/getting-started-with-our-amazing-platform`

2. **Use consistent naming conventions**
   - All lowercase
   - Hyphens for word separation
   - Avoid underscores and special characters

3. **Organize by content hierarchy**
   - Group related content together
   - Use logical nesting levels
   - Consider your site's navigation structure

### File organization

1. **Use meaningful directory names**

   ```text
   site/
   ├── getting-started/    # Clear section purpose
   ├── tutorials/          # Obvious content type
   └── api-reference/      # Descriptive and specific
   ```

2. **Keep related content together**

   ```text
   site/
   └── blog/
       ├── index.md        # Blog homepage
       ├── layout.eta      # Blog-specific layout
       ├── partials/       # Blog-specific templates, replacing root ones
       └── posts/          # All blog posts
   ```

3. **Use index files for section homepages**
   - Always provide an `index.md` for directory sections
   - Use it to introduce the section and link to subsections
   - Make it the navigation hub for that area

### SEO considerations

1. **Descriptive URLs help SEO**
   - `/blog/how-to-optimize-website-performance` is better than `/blog/post-123`

2. **Consistent structure improves crawling**
   - Use predictable patterns like `/blog/yyyy/mm/post-name`
   - Maintain consistent depth levels when possible

3. **Clean URLs are user-friendly**
   - `/contact` is cleaner than `/contact.html`
   - Stati generates URLs without trailing slashes for every page, index pages included (`/blog`, `/about`)

## Advanced routing patterns

### Multi-language sites

Organize content by language:

```text
site/
├── en/
│   ├── index.md → /en
│   └── about.md → /en/about
├── es/
│   ├── index.md → /es
│   └── acerca.md → /es/acerca
└── fr/
    ├── index.md → /fr
    └── apropos.md → /fr/apropos
```

### API documentation

Structure API docs logically:

```text
site/
└── api/
    ├── index.md → /api (API overview)
    ├── authentication.md → /api/authentication
    ├── endpoints/
    │   ├── users.md → /api/endpoints/users
    │   └── posts.md → /api/endpoints/posts
    └── examples/
        ├── basic.md → /api/examples/basic
        └── advanced.md → /api/examples/advanced
```

Understanding filesystem-based routing is key to organizing your Stati site effectively. Next, learn about [Templates & Layouts](/core-concepts/templates) to understand how your content gets rendered.
