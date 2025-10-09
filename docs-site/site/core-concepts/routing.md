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

```
site/
├── index.md              → /
├── about.md               → /about/
├── contact.md             → /contact/
└── blog/
    ├── index.md           → /blog/
    ├── first-post.md      → /blog/first-post/
    └── second-post.md     → /blog/second-post/
```

### Directory Structure

Every directory can have its own `index.md` file, which becomes the homepage for that section:

```
site/
├── index.md              → / (site homepage)
├── docs/
│   ├── index.md          → /docs/ (docs homepage)
│   ├── getting-started.md → /docs/getting-started/
│   └── api/
│       ├── index.md      → /docs/api/ (API section homepage)
│       └── reference.md  → /docs/api/reference/
```

## URL Generation Rules

### Clean URLs

Stati automatically generates clean URLs by:

- Removing file extensions (`.md`, `.eta`)
- Converting `index` files to directory URLs
- Adding trailing slashes for consistency

```
about.md → /about/
blog/index.md → /blog/
blog/my-post.md → /blog/my-post/
```

### Slug Generation

File names are converted to URL-friendly slugs:

```
My First Post.md → /my-first-post/
Hello_World.md → /hello-world/
2024-01-15-news.md → /2024-01-15-news/
```

### Special Cases

- **Uppercase letters** → converted to lowercase
- **Spaces and underscores** → converted to hyphens
- **Special characters** → removed or converted
- **Multiple hyphens** → collapsed to single hyphens

## Nested Routing

### Deep Nesting

Stati supports unlimited nesting levels:

```
site/
└── docs/
    └── guides/
        └── advanced/
            └── customization.md → /docs/guides/advanced/customization/
```

### Section Organization

Organize content by topic, date, or any logical structure:

```
site/
├── blog/
│   ├── 2024/
│   │   ├── january/
│   │   │   └── new-year-post.md → /blog/2024/january/new-year-post/
│   │   └── february/
│   │       └── valentine-post.md → /blog/2024/february/valentine-post/
│   └── 2023/
│       └── archive/
│           └── old-post.md → /blog/2023/archive/old-post/
```

## Special Files and Directories

### Files and Directories Excluded from Routing

Stati excludes certain files and directories from URL generation to allow for better project organization:

#### **Files and Folders Starting with `_` (Underscore)**

**Critical Rule**: Any file or directory starting with `_` is excluded from routing and used for organization:

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
├── _utils/              ❌ Not routed - Utility files
│   └── helpers.js
├── partials/            ✅ Routed - Creates /partials/ page
│   └── content.md       ✅ Routed - Creates /partials/content/ page
└── published.md         ✅ Routed - Creates /published/ page
```

#### **Special Files Excluded from Routing**

```text
site/
├── layout.eta           ❌ Not routed - Layout template
├── .DS_Store           ❌ Not routed - System files
├── .gitkeep            ❌ Not routed - Git placeholder
├── Thumbs.db           ❌ Not routed - Windows thumbnail cache
├── desktop.ini         ❌ Not routed - Windows system file
├── README.md           ✅ Routed - Creates /readme/ page
└── index.md            ✅ Routed - Creates / homepage
```

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

```
site/
├── layout.eta          # Root layout
├── index.md            → / (uses root layout)
├── blog/
│   ├── layout.eta      # Blog-specific layout
│   ├── index.md        → /blog/ (uses blog layout)
│   └── post.md         → /blog/post/ (uses blog layout)
```

## Dynamic Content Organization

### Date-based Organization

For blogs and news sites, organize by date:

```
site/
└── blog/
    ├── index.md
    ├── 2024/
    │   ├── 01/
    │   │   ├── 15-new-feature.md → /blog/2024/01/15-new-feature/
    │   │   └── 30-update.md → /blog/2024/01/30-update/
    │   └── 02/
    │       └── 14-valentine.md → /blog/2024/02/14-valentine/
```

### Category-based Organization

For documentation or portfolio sites:

```
site/
├── projects/
│   ├── web-development/
│   │   ├── ecommerce-site.md → /projects/web-development/ecommerce-site/
│   │   └── portfolio.md → /projects/web-development/portfolio/
│   └── mobile-apps/
│       ├── ios-app.md → /projects/mobile-apps/ios-app/
│       └── react-native.md → /projects/mobile-apps/react-native/
```

## Front Matter URL Override

You can override the automatic URL generation using front matter:

```markdown
---
title: 'Custom URL Example'
permalink: '/custom-path/'
---

# This page will be available at /custom-path/
```

Or for more complex scenarios:

```markdown
---
title: 'Product Launch'
date: '2024-01-15'
permalink: '/announcements/{{ date | date: "yyyy" }}/product-launch/'
---

# This uses template syntax in the permalink
```

## Working with the Router

### Link Generation

When linking between pages, use absolute paths from the site root:

```markdown
Check out our [About page](/about/) for more information.
Visit the [API documentation](/docs/api/) to learn more.
```

### Navigation Helpers

In templates, you can access routing information:

```eta
<nav>
  <% if (stati.url === '/') { %>
    <a href="/" class="active">Home</a>
  <% } else { %>
    <a href="/">Home</a>
  <% } %>

  <% if (stati.url.startsWith('/blog/')) { %>
    <a href="/blog/" class="active">Blog</a>
  <% } else { %>
    <a href="/blog/">Blog</a>
  <% } %>
</nav>
```

### Breadcrumbs

Generate breadcrumbs from the URL structure:

```eta
<nav class="breadcrumbs">
  <a href="/">Home</a>
  <%
  const parts = stati.url.split('/').filter(Boolean);
  let currentPath = '';
  %>
  <% parts.forEach((part, index) => { %>
    <% currentPath += '/' + part; %>
    <% if (index < parts.length - 1) { %>
      <span class="separator">›</span>
      <a href="<%= currentPath %>/" class="breadcrumb-link">
        <%= part.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) %>
      </a>
    <% } else { %>
      <span class="separator">›</span>
      <span class="current">
        <%= part.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) %>
      </span>
    <% } %>
  <% }); %>
</nav>
```

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

   ```
   site/
   ├── getting-started/    # Clear section purpose
   ├── tutorials/          # Obvious content type
   └── api-reference/      # Descriptive and specific
   ```

2. **Keep related content together**

   ```
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
   - `/blog/how-to-optimize-website-performance/` is better than `/blog/post-123/`

2. **Consistent structure improves crawling**
   - Use predictable patterns like `/blog/yyyy/mm/post-name/`
   - Maintain consistent depth levels when possible

3. **Clean URLs are user-friendly**
   - `/contact/` is cleaner than `/contact.html`
   - Trailing slashes provide consistency

## Advanced Routing Patterns

### Multi-language Sites

Organize content by language:

```
site/
├── en/
│   ├── index.md → /en/
│   └── about.md → /en/about/
├── es/
│   ├── index.md → /es/
│   └── acerca.md → /es/acerca/
└── fr/
    ├── index.md → /fr/
    └── apropos.md → /fr/apropos/
```

### API Documentation

Structure API docs logically:

```
site/
└── api/
    ├── index.md → /api/ (API overview)
    ├── authentication.md → /api/authentication/
    ├── endpoints/
    │   ├── users.md → /api/endpoints/users/
    │   └── posts.md → /api/endpoints/posts/
    └── examples/
        ├── basic.md → /api/examples/basic/
        └── advanced.md → /api/examples/advanced/
```

Understanding filesystem-based routing is key to organizing your Stati site effectively. Next, learn about [Templates & Layouts](/core-concepts/templates/) to understand how your content gets rendered.
