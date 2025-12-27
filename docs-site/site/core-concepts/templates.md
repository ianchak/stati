---
title: 'Templates & Layouts'
description: 'Learn how to create dynamic templates and layouts using Eta template engine.'
order: 3
---

# Templates & Layouts

Stati uses Eta as its templating engine, providing a powerful yet familiar syntax for creating dynamic layouts and templates. Combined with Stati's layout inheritance system, you can create flexible and maintainable site designs.

## Template Engine: Eta

Eta is a fast, lightweight templating engine with a syntax similar to EJS but with better performance and TypeScript support.

### Dynamic Attribute Values

> Eta requires every HTML attribute value to be fully resolved by the time it is rendered. You cannot splice template expressions into the middle of a static value (for example `class="bg-<%= color %>-500"`).

Use template literals (or the helper described below) to make the entire attribute value dynamic:

```eta
<!-- ❌ Invalid: partial interpolation -->
<button class="bg-<%= color %>-500">Click me</button>

<!-- ✅ Valid: full dynamic value -->
<button class="<%= `bg-${color}-500` %>">Click me</button>
```

For more complex combinations, prefer the `stati.propValue()` helper provided by Stati. It builds attribute values by accepting strings, arrays, or objects and works best for attributes that support space-separated tokens:

```eta
<a
  class="<%= stati.propValue('btn', `btn-${variant}`, isActive && 'is-active') %>"
  data-analytics="<%= stati.propValue('cta', campaign, isActive && 'active') %>"
>
  Learn more
</a>
```

`stati.propValue()` joins all truthy values with spaces (similar to `classnames`). For attributes that need a single concatenated string, use a template literal instead:

```eta
data-id="<%= `item-${id}` %>"
```

### Basic Syntax

```eta
<!-- Variables -->
<h1><%= stati.page.title %></h1>
<p><%= stati.page.description %></p>

<!-- Raw HTML (unescaped) -->
<div><%~ stati.content %></div>

<!-- Conditionals -->
<% if (stati.page.author) { %>
  <p>Written by <%= stati.page.author %></p>
<% } else { %>
  <p>Author unknown</p>
<% } %>

<!-- Loops -->
<ul>
<% (stati.collection?.pages || []).forEach(page => { %>
  <li><a href="<%= page.url %>"><%= page.title %></a></li>
<% }); %>
</ul>

<!-- Comments -->
<%/* This is a comment */%>
```

### Available Data

In your templates, you have access to:

```eta
<!-- Page data -->
<%= stati.page.title %>     <!-- From front matter -->
<%= stati.page.description %> <!-- From front matter -->
<%= stati.content %>        <!-- Rendered markdown content -->
<%= stati.page.url %>       <!-- Current page URL -->
<%= stati.page.date %>      <!-- Page date (if specified) -->
<% stati.page.toc.forEach(entry => { %>  <!-- TOC entries (h2-h6) -->
  <a href="<%= `#${entry.id}` %>"><%= entry.text %></a>
<% }) %>

<!-- Site data -->
<%= stati.site.title %>     <!-- Site title from config -->
<%= stati.site.baseUrl %>   <!-- Site base URL -->
<%= stati.site.defaultLocale %> <!-- Default locale (optional) -->
<%= stati.site.description %> <!-- Default site description (optional) -->

<!-- Generator data -->
<%= stati.generator.version %> <!-- Stati core version -->

<!-- Page frontmatter data -->
<%= stati.page.layout %>    <!-- Layout name from frontmatter -->
<%= stati.partials.header %> <!-- Partial templates -->
```

## Layout System

### Layout Inheritance

Stati supports hierarchical layouts where more specific layouts **override** parent directory layouts:

```text
site/
├── layout.eta           # Root layout (fallback for all pages)
└── blog/
    ├── layout.eta       # Blog layout (overrides root for /blog pages)
    ├── index.md
    └── posts/
        ├── layout.eta   # Post layout (overrides blog for /blog/posts pages)
        └── my-post.md
```

### Template Resolution Order

Stati looks for templates in this order:

1. **Named template** specified in front matter (e.g., `layout: 'article'`)
2. **Directory-specific** `layout.eta` (cascades from current to root)
3. **Root** `layout.eta` as final fallback

**Example:** For `/blog/tech/post.md`, Stati checks:

1. Front matter `layout` field first
2. `/blog/tech/layout.eta`
3. `/blog/layout.eta`
4. `/layout.eta` (root fallback)

```yaml
---
# This overrides automatic template discovery
layout: 'article'
title: 'My Post'
---
```

The first match wins, providing maximum flexibility while maintaining sensible defaults.

### Root Layout Example

`site/layout.eta`:

```eta
<!DOCTYPE html>
<html lang="<%= stati.site.defaultLocale || 'en-US' %>">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><%= stati.page.title ? `${stati.page.title} | ${stati.site.title}` : stati.site.title %></title>
    <% if (stati.page.description) { %>
    <meta name="description" content="<%= stati.page.description %>">
    <% } %>

    <!-- Favicon -->
    <link rel="icon" href="/favicon.svg" type="image/svg+xml">

    <!-- Styles -->
    <link rel="stylesheet" href="/styles.css">

    <!-- SEO Meta Tags -->
    <meta property="og:title" content="<%= stati.page.title || stati.site.title %>">
    <% if (stati.page.description) { %>
    <meta property="og:description" content="<%= stati.page.description %>">
    <% } %>
    <meta property="og:type" content="website">
    <meta property="og:url" content="<%= stati.site.baseUrl + stati.page.url %>">
</head>
<body>
    <%~ stati.partials.header %>

    <main>
        <%~ stati.content %>
    </main>

    <%~ stati.partials.footer %>
</body>
</html>
```

### Section Layout Example

Section layouts **completely replace** the root layout for pages in that directory and its subdirectories. They must be complete HTML documents (or include another complete layout via partials).

`site/blog/layout.eta`:

```eta
<!DOCTYPE html>
<html lang="<%= stati.site.defaultLocale || 'en-US' %>">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><%= stati.page.title ? `${stati.page.title} | ${stati.site.title}` : stati.site.title %></title>
    <link rel="stylesheet" href="/styles.css">
</head>
<body>
    <%~ stati.partials.header %>

    <div class="blog-container">
        <aside class="blog-sidebar">
            <%~ stati.partials.blogNav %>
        </aside>

        <article class="blog-content">
            <% if (stati.page.title) { %>
            <header class="post-header">
                <h1><%= stati.page.title %></h1>
                <% if (stati.page.date) { %>
                <time datetime="<%= stati.page.date %>">
                    <%= new Date(stati.page.date).toLocaleDateString() %>
                </time>
                <% } %>
                <% if (stati.page.tags) { %>
                <div class="tags">
                    <% stati.page.tags.forEach(tag => { %>
                    <span class="tag"><%= tag %></span>
                    <% }); %>
                </div>
                <% } %>
            </header>
            <% } %>

            <div class="prose">
                <%~ stati.content %>
            </div>
        </article>
    </div>

    <%~ stati.partials.footer %>
</body>
</html>
```

> **Note:** To share common structure (header, footer, meta tags) between layouts, extract them into partials and include them in each layout.

## Partial Templates

Partials are reusable template components stored in `_` (underscore) prefixed directories.

### Partial Discovery Rules

Stati uses a strict convention for partial auto-discovery:

- **Partials MUST be placed in folders starting with `_` (underscore)**
- Multiple underscore folders are supported: `_partials/`, `_components/`, `_includes/`
- Partials can be nested within underscore folders: `_partials/components/button.eta`
- Folders without underscore prefix are NOT scanned for partials
- Files within underscore folders are automatically available as partials

```text
site/
├── _partials/           ✅ Auto-discovered
│   ├── header.eta
│   └── components/      ✅ Nested partials supported
│       └── button.eta
├── _components/         ✅ Multiple underscore folders
│   └── card.eta
├── _includes/           ✅ Any underscore folder name
│   └── analytics.eta
└── partials/            ❌ NOT discovered (no underscore)
    └── ignored.eta
```

### Creating Partials

`site/_partials/header.eta`:

```eta
<header class="site-header">
    <nav class="main-nav">
        <div class="nav-brand">
            <a href="/">
                <img src="/logo.svg" alt="<%= stati.site.title %>">
                <%= stati.site.title %>
            </a>
        </div>

        <ul class="nav-links">
            <li><a href="/" class="<%= stati.page.url === '/' ? 'active' : '' %>">Home</a></li>
            <li><a href="/blog/" class="<%= stati.page.url.startsWith('/blog/') ? 'active' : '' %>">Blog</a></li>
            <li><a href="/docs/" class="<%= stati.page.url.startsWith('/docs/') ? 'active' : '' %>">Docs</a></li>
            <li><a href="/about/" class="<%= stati.page.url === '/about/' ? 'active' : '' %>">About</a></li>
        </ul>
    </nav>
</header>
```

### Using Partials

Partials are automatically available in templates:

```eta
<!-- Include a partial -->
<%~ stati.partials.header %>
<%~ stati.partials.footer %>
<%~ stati.partials.sidebar %>
```

### Passing Data to Partials

Partials can accept custom data, making them reusable like components. This is perfect for cards, buttons, or any content that varies slightly each time you use it.

#### Basic Usage

```eta
<!-- Simple: no data needed -->
<%~ stati.partials.header %>

<!-- With custom data -->
<%~ stati.partials.hero({
  title: 'Welcome to Stati',
  subtitle: 'Build modern static sites'
}) %>

<!-- In loops: render a card for each post -->
<% posts.forEach(post => { %>
  <%~ stati.partials.card({
    title: post.title,
    description: post.description,
    url: post.url
  }) %>
<% }) %>
```

**How it works:**

- Use partials as-is when no custom data is needed: `<%~ stati.partials.header %>`
- Pass data by calling the partial like a function: `stati.partials.name({ ... })`
- Access passed data inside the partial via `stati.props.propertyName`
- All Stati data remains available: `stati.site`, `stati.page`, `stati.content`, etc.

#### Creating a Reusable Partial

Let's create a card component that accepts custom data.

**Example partial** (`_partials/card.eta`):

```eta
<article class="card">
  <h3><%= stati.props.title || 'Untitled' %></h3>
  <% if (stati.props.description) { %>
    <p><%= stati.props.description %></p>
  <% } %>
  <% if (stati.props.url) { %>
    <a href="<%= stati.props.url %>">Read more →</a>
  <% } %>
</article>
```

**Using the card**:

```eta
<!-- Without data: uses defaults -->
<%~ stati.partials.card %>
<!-- Output: <article class="card"><h3>Untitled</h3></article> -->

<!-- With custom data -->
<%~ stati.partials.card({
  title: 'Custom Title',
  description: 'A great article',
  url: '/blog/article'
}) %>
<!-- Output: full card with all fields -->

<!-- Render multiple cards from a collection -->
<div class="posts-grid">
  <% stati.collection?.pages.forEach(post => { %>
    <%~ stati.partials.card({
      title: post.title,
      description: post.description,
      url: post.url
    }) %>
  <% }) %>
</div>
```

#### Accessing Data Inside Partials

Inside your partials, any data you pass is available via `stati.props`:

```eta
<!-- Inside _partials/hero.eta -->
<section class="hero">
  <h1><%= stati.props.title %></h1>
  <p><%= stati.props.subtitle %></p>

  <!-- You still have access to site data -->
  <small>© <%= stati.site.title %></small>

  <!-- And page data -->
  <small>Current page: <%= stati.page.title %></small>
</section>
```

#### Mixing Custom and Site Data

You can combine data passed to the partial with Stati's global data:

```eta
<!-- _partials/page-header.eta -->
<header>
  <!-- Use custom title if provided, otherwise fall back to site title -->
  <h1><%= stati.props.customTitle || stati.site.title %></h1>

  <!-- Always show current page -->
  <p>You're on: <%= stati.page.title %></p>

  <!-- Use custom subtitle if provided -->
  <% if (stati.props.subtitle) { %>
    <p class="subtitle"><%= stati.props.subtitle %></p>
  <% } %>
</header>

<!-- Usage -->
<%~ stati.partials.pageHeader({
  customTitle: 'Special Event',
  subtitle: 'Join us for an amazing experience'
}) %>
```

**Practical tips:**

- Use `stati.props` for data that changes each time you use the partial
- Use `stati.site` for global site information (title, URL, etc.)
- Use `stati.page` for the current page's information
- Provide sensible defaults with `||` for optional properties

### Hierarchical Partials

Partials are discovered **upward** from the current page's directory to the root. A page can access partials from its own directory and all parent directories, but **not** from child directories.

```text
site/
├── _partials/
│   ├── header.eta       # Available to ALL pages
│   └── footer.eta
└── blog/
    ├── _partials/
    │   ├── sidebar.eta  # Available to blog/ and blog/posts/ pages
    │   └── tagList.eta  # NOT available to root pages
    └── posts/
        └── _partials/
            └── meta.eta # Available ONLY to blog/posts/ pages
```

**Key points:**

- Root layout (`site/layout.eta`) can only access `site/_partials/`
- Blog layout (`site/blog/layout.eta`) can access both `site/_partials/` AND `site/blog/_partials/`
- More specific partials (deeper in hierarchy) override less specific ones with the same name

## Template Data and Context

### Front Matter Integration

Front matter from your markdown files is available in templates:

```markdown
---
title: 'My Blog Post'
description: 'A great post about Stati'
date: '2024-01-15'
tags: ['stati', 'markdown', 'templates']
author: 'John Doe'
featured: true
---

# Content goes here...
```

Template usage:

```eta
<article>
    <h1><%= stati.page.title %></h1>

    <% if (stati.page.featured) { %>
    <div class="featured-badge">Featured Post</div>
    <% } %>

    <div class="post-meta">
        <span>By <%= stati.page.author %></span>
        <time><%= new Date(stati.page.date).toLocaleDateString() %></time>
    </div>

    <div class="tags">
        <% stati.page.tags.forEach(tag => { %>
        <a href="/tags/<%= tag %>/" class="tag">#<%= tag %></a>
        <% }); %>
    </div>

    <div class="content">
        <%~ stati.content %>
    </div>
</article>
```

## Custom Filters and Helpers

### Date Formatting

```eta
<!-- Format dates -->
<time><%= new Date(stati.page.date).toLocaleDateString('en-US', {
  year: 'numeric',
  month: 'long',
  day: 'numeric'
}) %></time>

<!-- Relative time -->
<%
const now = new Date();
const postDate = new Date(stati.page.date);
const diffTime = Math.abs(now - postDate);
const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
%>
<span class="relative-time">
  <% if (diffDays === 0) { %>
    Today
  <% } else if (diffDays === 1) { %>
    Yesterday
  <% } else if (diffDays < 7) { %>
    <%= diffDays %> days ago
  <% } else { %>
    <%= new Date(stati.page.date).toLocaleDateString() %>
  <% } %>
</span>
```

### Text Processing

```eta
<!-- Truncate text -->
<%
function truncate(text, length = 150) {
  if (text.length <= length) return text;
  return text.slice(0, length) + '...';
}
%>
<p class="excerpt"><%= truncate(stati.page.description) %></p>

<!-- Slugify text -->
<%
function slugify(text) {
  return text.toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
%>
<a href="/tags/<%= slugify(tag) %>/" class="tag-link">#<%= tag %></a>
```

## Performance Considerations

### Template Caching

Stati automatically caches compiled templates, but you can optimize further:

1. **Keep partials small and focused**
2. **Avoid complex logic in templates**
3. **Use front matter for data that doesn't change**
4. **Cache expensive computations in build process**

### Best Practices

1. **Separate logic from presentation**
   - Use front matter for data
   - Keep complex logic in build scripts
   - Use simple helpers for common tasks

2. **Optimize partial usage**
   - Don't over-fragment templates
   - Reuse partials across sections
   - Keep partial dependencies clear

3. **Performance-friendly patterns**
   - Minimize nested loops
   - Use conditionals to skip unnecessary work
   - Cache computed values when possible

## Generator Information

### Displaying Version Information

You can access Stati's version information in templates using `stati.generator.version`. This is useful for attribution, debugging, or technical information display:

```eta
<!-- Simple footer attribution -->
<footer>
    <p>Generated with Stati v<%= stati.generator.version %></p>
</footer>
```

Understanding templates and layouts is crucial for creating maintainable Stati sites. Next, learn about the [Markdown Pipeline](/core-concepts/markdown) to understand how your content gets processed.
