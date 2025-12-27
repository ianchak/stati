---
title: 'Filesystem Routing'
description: 'Learn how Stati uses filesystem-based routing to generate URLs from your content.'
order: 2
---

# Filesystem-based Routing

Stati uses filesystem-based routing, which means the structure of your `site/` directory directly determines the URLs of your website. This approach is intuitive, predictable, and doesn't require complex routing configuration.

## Basic Routing

### Files to URLs

The mapping from files to URLs is straightforward:

```text
site/
├── index.md              → /
├── about.md               → /about
├── contact.md             → /contact
└── blog/
    ├── index.md           → /blog/
    ├── first-post.md      → /blog/first-post
    └── second-post.md     → /blog/second-post
```

### Directory Structure

Every directory can have its own `index.md` file, which becomes the homepage for that section:

```text
site/
├── index.md              → / (site homepage)
├── docs/
│   ├── index.md          → /docs/ (docs homepage)
│   ├── getting-started.md → /docs/getting-started
│   └── api/
│       ├── index.md      → /docs/api/ (API section homepage)
│       └── reference.md  → /docs/api/reference
```

## URL Generation Rules

### Clean URLs

Stati automatically generates clean URLs by:

- Removing the `.md` file extension
- Converting `index` files to directory URLs with trailing slashes

```text
about.md → /about
blog/index.md → /blog/
blog/my-post.md → /blog/my-post
```

**Important:** Only `index` files get trailing slashes. Non-index pages have URLs without trailing slashes. This means:

- `site/about.md` becomes `/about` (no trailing slash)
- `site/blog/index.md` becomes `/blog/` (trailing slash)
- `site/blog/post.md` becomes `/blog/post` (no trailing slash)

### Important: No Automatic Slug Transformation

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

### Filename Best Practices

To ensure clean, working URLs:

1. **Use lowercase**: `about.md` not `About.md`
2. **Use hyphens for word separation**: `my-post.md` not `my_post.md` or `my post.md`
3. **Avoid special characters**: Use only letters, numbers, and hyphens
4. **Keep names descriptive but concise**: `getting-started.md` not `getting_started_with_our_platform.md`

## Nested Routing

### Deep Nesting

Stati supports unlimited nesting levels:

```text
site/
└── docs/
    └── guides/
        └── advanced/
            └── customization.md → /docs/guides/advanced/customization
```

### Section Organization

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

## Special Files and Directories

### Files and Directories Excluded from Routing

Stati excludes certain files and directories from URL generation:

#### **Directories Starting with `_` (Underscore)**

**Critical Rule**: Any **directory** starting with `_` (and all files within it) is excluded from routing. Individual files starting with `_` are NOT automatically excluded:

```text
site/
├── _partials/           ❌ Not routed - Partial templates
│   ├── header.eta
│   ├── footer.eta
│   └── components/
│       └── button.eta
├── _components/         ❌ Not routed - Reusable components
│   └── card.eta
├── _includes/           ❌ Not routed - Include files
│   └── analytics.eta
├── _data/               ❌ Not routed - Data files
│   └── config.json
├── _drafts/             ❌ Not routed - Draft content
│   └── upcoming-post.md
├── _notes.md            ✅ ROUTED! - Individual files with _ ARE processed → /_notes
├── partials/            ✅ Routed - Creates /partials/ (no underscore)
│   └── content.md       ✅ Routed - Creates /partials/content
└── published.md         ✅ Routed - Creates /published
```

> **Tip:** To exclude individual files, use `draft: true` in frontmatter instead of filename prefixes.

#### **Non-Markdown Files**

Only `.md` files become pages. All other file types are automatically excluded:

```text
site/
├── layout.eta           ❌ Not routed - Template file (.eta)
├── config.js            ❌ Not routed - JavaScript file
├── styles.css           ❌ Not routed - Stylesheet
├── image.png            ❌ Not routed - Image file
├── .DS_Store            ❌ Not routed - Not markdown
├── .gitkeep             ❌ Not routed - Not markdown
├── README.md            ✅ Routed - Creates /readme (is markdown!)
└── index.md             ✅ Routed - Creates / homepage
```

**Note:** `README.md` files ARE routed because they are markdown files. Don't place README files in your `site/` directory, keep them in your project root or other non-site directories.

#### **Use Cases for Underscore Exclusion**

**Partial Templates:**

```text
_partials/
├── header.eta          # Site header
├── navigation.eta      # Main navigation
├── sidebar.eta         # Blog sidebar
└── footer.eta          # Site footer
```

**Component Library:**

```text
_components/
├── button.eta          # Reusable button
├── card.eta            # Content cards
├── modal.eta           # Modal dialogs
└── forms/
    ├── input.eta       # Form inputs
    └── validation.eta  # Form validation
```

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

This convention allows you to organize helper files, templates, and components without creating unwanted routes, keeping your URL structure clean and intentional.

### Layout Files

`layout.eta` files are special template files that don't generate routes but define the layout for their directory and subdirectories:

```text
site/
├── layout.eta          # Root layout
├── index.md            → / (uses root layout)
├── blog/
│   ├── layout.eta      # Blog-specific layout
│   ├── index.md        → /blog/ (uses blog layout)
│   └── post.md         → /blog/post (uses blog layout)
```

## Dynamic Content Organization

### Date-based Organization

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

### Category-based Organization

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

## Front Matter URL Override

You can completely override the automatic URL generation using the `permalink` field in front matter:

```markdown
---
title: 'Custom URL Example'
permalink: '/custom-path'
---

# This page will be available at /custom-path
```

**Note:** While you _can_ add trailing slashes to permalinks, Stati's default behavior only adds them to index pages. For consistency with the rest of your site, consider using permalinks without trailing slashes for non-index pages.

**Important:** When using `permalink`:

- Must be a static string (no template variables or date formatting)
- Must start with `/`
- Completely replaces the file-path-based URL

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

## Working with the Router

### Link Generation

When linking between pages, use absolute paths from the site root. Match your link URLs to how Stati generates them:

- Index pages: use trailing slash (`/blog/`)
- Non-index pages: no trailing slash (`/about`)

```markdown
Check out our [Getting Started page](/getting-started/introduction) for more information.
Visit the [API documentation](/api/reference) to learn more.
Visit the [Blog homepage](/blog/) to see all posts.
```

### Navigation Helpers

In templates, you can access routing information:

```eta
<nav>
  <% if (stati.page.url === '/') { %>
    <a href="/" class="active">Home</a>
  <% } else { %>
    <a href="/">Home</a>
  <% } %>

  <% if (stati.page.url.startsWith('/blog/')) { %>
    <a href="/blog/" class="active">Blog</a>
  <% } else { %>
    <a href="/blog/">Blog</a>
  <% } %>
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

The `getBreadcrumbs()` method returns an array of `NavNode` objects from the root to the current page, each with `title` and `url` properties. This is more reliable than manually parsing URL segments because it uses the actual navigation tree and page titles from front matter.

See the [Navigation API](/api/navigation) for more details on breadcrumb customization.

## Best Practices

### URL Structure Design

1. **Keep URLs short and descriptive**
   - Good: `/docs/getting-started/`
   - Avoid: `/documentation/getting-started-with-our-amazing-platform/`

2. **Use consistent naming conventions**
   - All lowercase
   - Hyphens for word separation
   - Avoid underscores and special characters

3. **Organize by content hierarchy**
   - Group related content together
   - Use logical nesting levels
   - Consider your site's navigation structure

### File Organization

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
       ├── _partials/      # Blog-specific components
       └── posts/          # All blog posts
   ```

3. **Use index files for section homepages**
   - Always provide an `index.md` for directory sections
   - Use it to introduce the section and link to subsections
   - Make it the navigation hub for that area

### SEO Considerations

1. **Descriptive URLs help SEO**
   - `/blog/how-to-optimize-website-performance` is better than `/blog/post-123`

2. **Consistent structure improves crawling**
   - Use predictable patterns like `/blog/yyyy/mm/post-name`
   - Maintain consistent depth levels when possible

3. **Clean URLs are user-friendly**
   - `/contact` is cleaner than `/contact.html`
   - Stati automatically handles trailing slashes: index pages get them (`/blog/`), non-index pages don't (`/about`)

## Advanced Routing Patterns

### Multi-language Sites

Organize content by language:

```text
site/
├── en/
│   ├── index.md → /en/
│   └── about.md → /en/about
├── es/
│   ├── index.md → /es/
│   └── acerca.md → /es/acerca
└── fr/
    ├── index.md → /fr/
    └── apropos.md → /fr/apropos
```

### API Documentation

Structure API docs logically:

```text
site/
└── api/
    ├── index.md → /api/ (API overview)
    ├── authentication.md → /api/authentication
    ├── endpoints/
    │   ├── users.md → /api/endpoints/users
    │   └── posts.md → /api/endpoints/posts
    └── examples/
        ├── basic.md → /api/examples/basic
        └── advanced.md → /api/examples/advanced
```

Understanding filesystem-based routing is key to organizing your Stati site effectively. Next, learn about [Templates & Layouts](/core-concepts/templates) to understand how your content gets rendered.
