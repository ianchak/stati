---
title: 'Templates & Layouts'
description: 'Learn how to use Eta templates and layout inheritance in Stati.'
---

# Templates & Layouts

Stati uses Eta as its templating engine, providing a powerful yet familiar syntax for creating dynamic layouts and templates. Combined with Stati's layout inheritance system, you can create flexible and maintainable site designs.

## Template Engine: Eta

Eta is a fast, lightweight templating engine with a syntax similar to EJS but with better performance and TypeScript support.

### Basic Syntax

```eta
<!-- Variables -->
<h1><%= stati.title %></h1>
<p><%= stati.description %></p>

<!-- Raw HTML (unescaped) -->
<div><%~ stati.content %></div>

<!-- Conditionals -->
<% if (stati.user) { %>
  <p>Welcome, <%= stati.user.name %>!</p>
<% } else { %>
  <p>Please log in.</p>
<% } %>

<!-- Loops -->
<ul>
<% stati.posts.forEach(post => { %>
  <li><a href="<%= post.url %>"><%= post.title %></a></li>
<% }); %>
</ul>

<!-- Comments -->
<%/* This is a comment */%>
```

### Available Data

In your templates, you have access to:

```eta
<!-- Page data -->
<%= stati.title %>          <!-- From front matter -->
<%= stati.description %>    <!-- From front matter -->
<%= stati.content %>        <!-- Rendered markdown content -->
<%= stati.url %>            <!-- Current page URL -->
<%= stati.date %>           <!-- Page date (if specified) -->

<!-- Site data -->
<%= stati.site.title %>     <!-- Site title from config -->
<%= stati.site.baseUrl %>   <!-- Site base URL -->
<%= stati.site.description %> <!-- Site description -->

<!-- Template data -->
<%= stati.layout %>         <!-- Current layout name -->
<%= stati.partials.header %> <!-- Partial templates -->
```

## Layout System

### Layout Inheritance

Stati supports hierarchical layouts that inherit from parent directories:

```text
site/
├── layout.eta           # Root layout (all pages)
└── blog/
    ├── layout.eta       # Blog layout (inherits from root)
    ├── index.md
    └── posts/
        ├── layout.eta   # Post layout (inherits from blog)
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
    <title><%= stati.title ? `${stati.title} | ${stati.site.title}` : stati.site.title %></title>
    <meta name="description" content="<%= stati.description || stati.site.description %>">

    <!-- Favicon -->
    <link rel="icon" href="/favicon.svg" type="image/svg+xml">

    <!-- Styles -->
    <link rel="stylesheet" href="/styles.css">

    <!-- SEO Meta Tags -->
    <meta property="og:title" content="<%= stati.title || stati.site.title %>">
    <meta property="og:description" content="<%= stati.description || stati.site.description %>">
    <meta property="og:type" content="website">
    <meta property="og:url" content="<%= stati.site.baseUrl + stati.url %>">
</head>
<body>
    <%~ it.partials.header %>

    <main>
        <%~ it.content %>
    </main>

    <%~ it.partials.footer %>
</body>
</html>
```

### Section Layout Example

`site/blog/layout.eta`:

```eta
<!-- This extends the root layout -->
<div class="blog-container">
    <aside class="blog-sidebar">
        <%~ it.partials.blogNav %>
    </aside>

    <article class="blog-content">
        <% if (it.title) { %>
        <header class="post-header">
            <h1><%= it.title %></h1>
            <% if (it.date) { %>
            <time datetime="<%= it.date %>">
                <%= new Date(it.date).toLocaleDateString() %>
            </time>
            <% } %>
            <% if (it.tags) { %>
            <div class="tags">
                <% it.tags.forEach(tag => { %>
                <span class="tag"><%= tag %></span>
                <% }); %>
            </div>
            <% } %>
        </header>
        <% } %>

        <div class="prose">
            <%~ it.content %>
        </div>
    </article>
</div>
```

## Partial Templates

Partials are reusable template components stored in `_partials/` directories.

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
                <img src="/logo.svg" alt="<%= it.site.title %>">
                <%= it.site.title %>
            </a>
        </div>

        <ul class="nav-links">
            <li><a href="/" class="<%= it.url === '/' ? 'active' : '' %>">Home</a></li>
            <li><a href="/blog/" class="<%= it.url.startsWith('/blog/') ? 'active' : '' %>">Blog</a></li>
            <li><a href="/docs/" class="<%= it.url.startsWith('/docs/') ? 'active' : '' %>">Docs</a></li>
            <li><a href="/about/" class="<%= it.url === '/about/' ? 'active' : '' %>">About</a></li>
        </ul>
    </nav>
</header>
```

### Using Partials

Partials are automatically available in templates:

```eta
<!-- Include a partial -->
<%~ it.partials.header %>
<%~ it.partials.footer %>
<%~ it.partials.sidebar %>

<!-- Partials can be nested -->
<%~ it.partials.blogSidebar %>  <!-- From blog/_partials/sidebar.eta -->
```

### Hierarchical Partials

Partials inherit from parent directories:

```
site/
├── _partials/
│   ├── header.eta       # Available everywhere
│   └── footer.eta
└── blog/
    ├── _partials/
    │   ├── sidebar.eta  # Available in blog/ and subdirectories
    │   └── tagList.eta
    └── posts/
        └── _partials/
            └── meta.eta # Available only in posts/
```

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
    <h1><%= it.title %></h1>

    <% if (it.featured) { %>
    <div class="featured-badge">Featured Post</div>
    <% } %>

    <div class="post-meta">
        <span>By <%= it.author %></span>
        <time><%= new Date(it.date).toLocaleDateString() %></time>
    </div>

    <div class="tags">
        <% it.tags.forEach(tag => { %>
        <a href="/tags/<%= tag %>/" class="tag">#<%= tag %></a>
        <% }); %>
    </div>

    <div class="content">
        <%~ it.content %>
    </div>
</article>
```

### Global Site Data

Access site configuration in any template:

```eta
<!-- Site metadata -->
<title><%= it.site.title %></title>
<meta name="description" content="<%= it.site.description %>">

<!-- Social links -->
<% if (it.site.social) { %>
<div class="social-links">
    <% Object.entries(it.site.social).forEach(([platform, url]) => { %>
    <a href="<%= url %>" target="_blank" rel="noopener">
        <%= platform.charAt(0).toUpperCase() + platform.slice(1) %>
    </a>
    <% }); %>
</div>
<% } %>

<!-- Navigation from config -->
<% if (it.site.navigation) { %>
<nav>
    <% it.site.navigation.forEach(item => { %>
    <a href="<%= item.url %>" class="<%= it.url === item.url ? 'active' : '' %>">
        <%= item.title %>
    </a>
    <% }); %>
</nav>
<% } %>
```

## Custom Filters and Helpers

### Date Formatting

```eta
<!-- Format dates -->
<time><%= new Date(it.date).toLocaleDateString('en-US', {
  year: 'numeric',
  month: 'long',
  day: 'numeric'
}) %></time>

<!-- Relative time -->
<%
const now = new Date();
const postDate = new Date(it.date);
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
    <%= new Date(it.date).toLocaleDateString() %>
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
<p class="excerpt"><%= truncate(it.description) %></p>

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

### URL Helpers

```eta
<!-- Active link helper -->
<%
function isActive(linkUrl, currentUrl) {
  if (linkUrl === '/') return currentUrl === '/';
  return currentUrl.startsWith(linkUrl);
}
%>
<a href="/blog/" class="<%= isActive('/blog/', it.url) ? 'active' : '' %>">Blog</a>

<!-- Absolute URL helper -->
<%
function absoluteUrl(path) {
  return it.site.baseUrl + path;
}
%>
<link rel="canonical" href="<%= absoluteUrl(it.url) %>">
```

## Advanced Template Patterns

### Template Composition

Break down complex layouts into smaller, reusable components:

```eta
<!-- Main layout -->
<div class="page-wrapper">
    <%~ it.partials.pageHeader %>

    <div class="page-content">
        <% if (it.sidebar !== false) { %>
        <%~ it.partials.sidebar %>
        <% } %>

        <main class="main-content">
            <%~ it.content %>
        </main>
    </div>

    <%~ it.partials.pageFooter %>
</div>
```

### Conditional Layouts

Choose different layouts based on content type:

```eta
<!-- In your layout -->
<% if (it.layout === 'post') { %>
    <%~ it.partials.postLayout %>
<% } else if (it.layout === 'page') { %>
    <%~ it.partials.pageLayout %>
<% } else { %>
    <%~ it.partials.defaultLayout %>
<% } %>
```

### Dynamic Navigation

Generate navigation from content structure:

```eta
<%
// Get all pages in a section
function getSectionPages(section) {
  // This would be populated by Stati's content system
  return it.site.pages.filter(page =>
    page.url.startsWith(`/${section}/`) &&
    page.url !== `/${section}/`
  );
}
%>

<nav class="section-nav">
    <h3>Documentation</h3>
    <ul>
        <% getSectionPages('docs').forEach(page => { %>
        <li>
            <a href="<%= page.url %>" class="<%= it.url === page.url ? 'active' : '' %>">
                <%= page.title %>
            </a>
        </li>
        <% }); %>
    </ul>
</nav>
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

## Testing Templates

### Template Debugging

```eta
<!-- Debug current context -->
<% if (it.site.debug) { %>
<pre style="background: #f0f0f0; padding: 1rem; font-size: 12px;">
<%= JSON.stringify({
  title: it.title,
  url: it.url,
  layout: it.layout,
  keys: Object.keys(it)
}, null, 2) %>
</pre>
<% } %>
```

### Error Handling

```eta
<!-- Graceful degradation -->
<% try { %>
    <div class="author-info">
        <img src="<%= it.author.avatar %>" alt="<%= it.author.name %>">
        <span><%= it.author.name %></span>
    </div>
<% } catch (error) { %>
    <div class="author-info">
        <span>Anonymous Author</span>
    </div>
<% } %>

<!-- Safe property access -->
<% if (it.author && it.author.name) { %>
    <span class="author">By <%= it.author.name %></span>
<% } %>
```

Understanding templates and layouts is crucial for creating maintainable Stati sites. Next, learn about the [Markdown Pipeline](/core-concepts/markdown/) to understand how your content gets processed.
