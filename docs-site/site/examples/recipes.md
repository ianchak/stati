---
title: 'Recipes'
description: 'Practical recipes and patterns for common Stati use cases.'
order: 2
---

# Recipe Collection

A curated collection of practical recipes and patterns for building sites with Stati. Each recipe solves a common use case with complete, copy-paste code examples.

## Content Management

### Dynamic Navigation Menu

Automatically generate navigation from your content structure using Stati's built-in navigation:

```html
<!-- _partials/menu.eta -->
<nav class="menu">
  <% function renderNavigation(items, level = 0) { %>
    <ul class="<%= stati.propValue('menu-level', `level-${level}`) %>">
      <% items.forEach(item => { %>
        <li class="menu-item">
          <a
            href="<%= item.url %>"
            class="<%= stati.propValue('menu-link', stati.page.url === item.url && 'active') %>"
          >
            <%= item.title %>
          </a>
          <% if (item.children && item.children.length > 0) { %>
            <%~ renderNavigation(item.children, level + 1) %>
          <% } %>
        </li>
      <% }) %>
    </ul>
  <% } %>
  <%~ renderNavigation(stati.nav.tree) %>
</nav>
```

### Section-Specific Navigation

Use `stati.page.navNode` to show the current page's child pages:

```html
<!-- _partials/section-nav.eta -->
<% if (stati.page.navNode?.children && stati.page.navNode.children.length > 0) { %>
  <nav class="section-navigation">
    <h3><%= stati.page.navNode.title %></h3>

    <!-- Show all child pages of the current page -->
    <ul>
      <% stati.page.navNode.children.forEach(page => { %>
        <li>
          <a
            href="<%= page.url %>"
            class="<%= stati.page.url === page.url ? 'active' : '' %>"
          >
            <%= page.title %>
          </a>

          <!-- Show nested children if they exist -->
          <% if (page.children && page.children.length > 0) { %>
            <ul class="subsection">
              <% page.children.forEach(child => { %>
                <li>
                  <a
                    href="<%= child.url %>"
                    class="<%= stati.page.url === child.url ? 'active' : '' %>"
                  >
                    <%= child.title %>
                  </a>
                </li>
              <% }) %>
            </ul>
          <% } %>
        </li>
      <% }) %>
    </ul>
  </nav>
<% } %>
```

Common navigation patterns made easy:

- **Current page's children** - Use `stati.page.navNode.children`
- **Any section's children** - Use `stati.nav.getChildren('/path')`
- **Current page's siblings** - Use `stati.nav.getSiblings()`

### Table of Contents (In-Page Navigation)

Stati automatically extracts headings (h2-h6) and makes them available via `stati.page.toc`:

```html
<!-- _partials/toc.eta -->
<% if (stati.page.toc && stati.page.toc.length > 0) { %>
  <nav class="table-of-contents">
    <h2>On this page</h2>
    <ul>
      <% stati.page.toc.forEach(entry => { %>
        <li class="<%= stati.propValue(`toc-level-${entry.level}`) %>">
          <a href="<%= `#${entry.id}` %>"><%= entry.text %></a>
        </li>
      <% }) %>
    </ul>
  </nav>
<% } %>
```

Each TOC entry contains:

- `id` - Anchor ID for linking (e.g., `getting-started`)
- `text` - Plain text heading content
- `level` - Heading level (2-6)

For hierarchical TOC with nesting:

```html
<!-- _partials/hierarchical-toc.eta -->
<%
  // Build a nested tree structure from flat TOC entries
  function buildTocTree(entries) {
    const root = { children: [] };
    const stack = [{ node: root, level: 1 }];

    entries.forEach(entry => {
      const newNode = { ...entry, children: [] };

      // Pop stack until we find the parent level
      while (stack.length > 1 && stack[stack.length - 1].level >= entry.level) {
        stack.pop();
      }

      // Add as child of current parent
      stack[stack.length - 1].node.children.push(newNode);
      stack.push({ node: newNode, level: entry.level });
    });

    return root.children;
  }

  // Recursive template function for rendering TOC tree
  function renderTocTree(items) { %>
    <ul>
      <% items.forEach(item => { %>
        <li>
          <a href="<%= `#${item.id}` %>"><%= item.text %></a>
          <% if (item.children && item.children.length > 0) { %>
            <%~ renderTocTree(item.children) %>
          <% } %>
        </li>
      <% }) %>
    </ul>
  <% }
%>

<% if (stati.page.toc && stati.page.toc.length > 0) { %>
  <nav class="toc-hierarchical">
    <h2>Contents</h2>
    <% const tocTree = buildTocTree(stati.page.toc) %>
    <%~ renderTocTree(tocTree) %>
  </nav>
<% } %>
```

Here are practical examples:

```html
<!-- _partials/docs-sidebar.eta -->
<!-- Show children of the docs section, regardless of current page -->
<aside class="docs-sidebar">
  <h3>Documentation</h3>
  <ul>
    <% stati.nav.getChildren('/docs').forEach(page => { %>
      <li>
        <a
          href="<%= page.url %>"
          class="<%= stati.page.url === page.url ? 'active' : '' %>"
        >
          <%= page.title %>
        </a>
      </li>
    <% }) %>
  </ul>
</aside>
```

```html
<!-- _partials/sibling-nav.eta -->
<!-- Show siblings of the current page -->
<% const siblings = stati.nav.getSiblings() %>

<% if (siblings.length > 0) { %>
  <nav class="sibling-nav">
    <h3>Related Pages</h3>
    <ul>
      <% siblings.forEach(sibling => { %>
        <li>
          <a href="<%= sibling.url %>"><%= sibling.title %></a>
        </li>
      <% }) %>
    </ul>
  </nav>
<% } %>
```

```html
<!-- _partials/multi-section-sidebar.eta -->
<!-- Show multiple sections using getChildren() -->
<aside class="sidebar">
  <section>
    <h3>Getting Started</h3>
    <ul>
      <% stati.nav.getChildren('/getting-started').forEach(page => { %>
        <li><a href="<%= page.url %>"><%= page.title %></a></li>
      <% }) %>
    </ul>
  </section>

  <section>
    <h3>Core Concepts</h3>
    <ul>
      <% stati.nav.getChildren('/core-concepts').forEach(page => { %>
        <li><a href="<%= page.url %>"><%= page.title %></a></li>
      <% }) %>
    </ul>
  </section>

  <section>
    <h3>API Reference</h3>
    <ul>
      <% stati.nav.getChildren('/api').forEach(page => { %>
        <li><a href="<%= page.url %>"><%= page.title %></a></li>
      <% }) %>
    </ul>
  </section>
</aside>
```

### Prev/Next Navigation Using Siblings

```html
<!-- _partials/page-nav.eta -->
<%
  // Get siblings to create prev/next navigation
  const siblings = stati.nav.getSiblings(undefined, true);
  const currentIndex = siblings.findIndex(s => s.url === stati.page.url);
  const prevPage = currentIndex > 0 ? siblings[currentIndex - 1] : null;
  const nextPage = currentIndex < siblings.length - 1 ? siblings[currentIndex + 1] : null;
%>

<% if (prevPage || nextPage) { %>
  <nav class="page-navigation">
    <% if (prevPage) { %>
      <a href="<%= prevPage.url %>" class="nav-prev">
        <span class="label">← Previous</span>
        <span class="title"><%= prevPage.title %></span>
      </a>
    <% } %>

    <% if (nextPage) { %>
      <a href="<%= nextPage.url %>" class="nav-next">
        <span class="label">Next →</span>
        <span class="title"><%= nextPage.title %></span>
      </a>
    <% } %>
  </nav>
<% } %>
```

### Collection Index Pages

Use collection data provided to index pages to list and filter content:

```html
<!-- blog/index.eta -->
<% // Collection data is automatically provided to index pages %>
<% const posts = stati.collection ? stati.collection.recentPages : [] %>
<% const tags = stati.collection ? Object.keys(stati.collection.pagesByTag) : [] %>

<div class="blog-index">
  <!-- Tag filter -->
  <% if (tags.length > 0) { %>
    <div class="tag-filter">
      <% tags.forEach(tag => { %>
        <a
          href="<%= `#tag-${tag}` %>"
          class="<%= stati.propValue('tag', 'filter-tag') %>"
          data-tag="<%= tag %>"
        >
          <%= tag %> (<%= stati.collection.pagesByTag[tag].length %>)
        </a>
      <% }) %>
    </div>
  <% } %>

  <!-- Posts -->
  <div class="posts">
    <% posts.forEach(post => { %>
      <article class="post-card">
        <h2>
          <a href="<%= post.url %>"><%= post.frontMatter.title %></a>
        </h2>
        <div class="post-meta">
          <% if (post.publishedAt) { %>
            <time datetime="<%= post.publishedAt.toISOString() %>">
              <%= post.publishedAt.toLocaleDateString() %>
            </time>
          <% } %>
          <% if (post.frontMatter.author) { %>
            <span class="author">by <%= post.frontMatter.author %></span>
          <% } %>
        </div>
        <% if (post.frontMatter.description) { %>
          <p><%= post.frontMatter.description %></p>
        <% } %>
        <% if (post.frontMatter.tags && post.frontMatter.tags.length > 0) { %>
          <div class="tags">
            <% post.frontMatter.tags.forEach(tag => { %>
              <span class="tag"><%= tag %></span>
            <% }) %>
          </div>
        <% } %>
      </article>
    <% }) %>
  </div>
</div>
```

### Related Posts

Find related posts based on shared tags using collection data:

```html
<!-- blog/post-layout.eta -->
<article class="post">
  <%~ stati.content %>
</article>

<% if (stati.collection && stati.page.tags) { %>
  <%
    const currentTags = stati.page.tags;
    const relatedPosts = stati.collection.pages
      .filter(p => p.url !== stati.page.url)
      .map(p => ({
        ...p,
        commonTags: (p.frontMatter.tags || []).filter(t => currentTags.includes(t))
      }))
      .filter(p => p.commonTags.length > 0)
      .sort((a, b) => b.commonTags.length - a.commonTags.length)
      .slice(0, 3);
  %>

  <% if (relatedPosts.length > 0) { %>
    <aside class="related-posts">
      <h2>Related Posts</h2>
      <ul>
        <% relatedPosts.forEach(post => { %>
          <li>
            <a href="<%= post.url %>">
              <%= post.frontMatter.title %>
            </a>
            <span class="common-tags">
              <%= post.commonTags.join(', ') %>
            </span>
          </li>
        <% }) %>
      </ul>
    </aside>
  <% } %>
<% } %>
```

### Custom Filters in Templates

Add reusable template filters via Eta configuration:

```javascript
// stati.config.js
export default defineConfig({
  eta: {
    filters: {
      // Date formatting
      formatDate: (date) => {
        return new Date(date).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      },

      // Time ago formatting
      timeAgo: (date) => {
        const now = new Date();
        const then = new Date(date);
        const diffMs = now - then;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
        if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
        return `${Math.floor(diffDays / 365)} years ago`;
      },

      // String manipulation
      slugify: (text) => {
        return text
          .toLowerCase()
          .replace(/[^\w\s-]/g, '')
          .replace(/[\s_-]+/g, '-')
          .replace(/^-+|-+$/g, '');
      },

      // Excerpt generation
      excerpt: (content, length = 150) => {
        const text = content.replace(/<[^>]*>/g, '');
        return text.length > length
          ? text.substring(0, length).trim() + '...'
          : text;
      },

      // Reading time estimation
      readingTime: (content) => {
        const wordsPerMinute = 200;
        const text = content.replace(/<[^>]*>/g, '');
        const words = text.trim().split(/\s+/).length;
        const minutes = Math.ceil(words / wordsPerMinute);
        return `${minutes} min read`;
      }
    }
  }
});
```

Use filters in templates:

```html
<!-- Post template -->
<article class="post">
  <header>
    <h1><%= stati.page.title %></h1>
    <div class="meta">
      <time><%= stati.formatDate(stati.page.publishedAt) %></time>
      <span><%= stati.timeAgo(stati.page.publishedAt) %></span>
      <span><%= stati.readingTime(stati.content) %></span>
    </div>
  </header>
  <%~ stati.content %>
</article>
```

### Breadcrumb Navigation

Stati provides `stati.nav.getBreadcrumbs()` which uses the navigation tree for accurate titles:

```html
<!-- _partials/breadcrumbs.eta -->
<nav class="breadcrumbs" aria-label="Breadcrumb">
  <ol class="breadcrumb-list">
    <li class="breadcrumb-item">
      <a href="/">Home</a>
    </li>
    <% stati.nav.getBreadcrumbs().forEach((crumb, index, array) => { %>
      <li class="breadcrumb-item">
        <% if (index === array.length - 1) { %>
          <span aria-current="page"><%= crumb.title %></span>
        <% } else { %>
          <a href="<%= crumb.url %>"><%= crumb.title %></a>
        <% } %>
      </li>
    <% }); %>
  </ol>
</nav>
```

## SEO & Metadata

### Leveraging Built-in SEO

Stati provides automatic SEO tag injection. Configure it in your config:

```javascript
// stati.config.js
export default defineConfig({
  site: {
    title: 'My Awesome Site',
    baseUrl: 'https://example.com',
    defaultLocale: 'en-US'
  },

  seo: {
    autoInject: true,
    defaultAuthor: {
      name: 'Your Name',
      email: 'you@example.com',
      url: 'https://yoursite.com'
    }
  },

  sitemap: {
    enabled: true,
    defaultPriority: 0.5,
    defaultChangeFreq: 'monthly',
    priorityRules: [
      { pattern: '/', priority: 1.0 },
      { pattern: '/blog/**', priority: 0.8 }
    ]
  },

  robots: {
    enabled: true,
    disallow: ['/admin/', '/draft/'],
    sitemap: true
  }
});
```

Add SEO metadata in front matter:

```markdown
---
title: My Blog Post
description: A comprehensive guide to...
seo:
  title: Custom SEO Title | My Site
  description: Custom meta description
  keywords: [stati, ssg, jamstack]
  image: /images/og-image.jpg
  author: John Doe
  openGraph:
    type: article
    article:
      publishedTime: 2024-01-15
      tags: [tech, web-dev]
  twitter:
    card: summary_large_image
    site: '@mysite'
---
```

### Custom Structured Data

Add structured data using build hooks:

```javascript
// stati.config.js
export default defineConfig({
  hooks: {
    beforeRender: async (ctx) => {
      // Add structured data for blog posts
      if (ctx.page.frontMatter.type === 'post') {
        ctx.page.frontMatter.seo = ctx.page.frontMatter.seo || {};
        ctx.page.frontMatter.seo.structuredData = {
          '@context': 'https://schema.org',
          '@type': 'BlogPosting',
          headline: ctx.page.frontMatter.title,
          description: ctx.page.frontMatter.description,
          datePublished: ctx.page.publishedAt?.toISOString(),
          dateModified: ctx.page.frontMatter.modifiedAt || ctx.page.publishedAt?.toISOString(),
          author: {
            '@type': 'Person',
            name: ctx.page.frontMatter.author || ctx.config.seo?.defaultAuthor?.name
          },
          publisher: {
            '@type': 'Organization',
            name: ctx.config.site.title,
            url: ctx.config.site.baseUrl
          }
        };
      }
    }
  }
});
```

## Advanced Patterns

### Build-time Data Fetching

Fetch external data during build using hooks:

```javascript
// stati.config.js
export default defineConfig({
  hooks: {
    beforeAll: async (ctx) => {
      // Fetch data from external API
      const response = await fetch('https://api.example.com/data');
      const data = await response.json();

      // Store in a way that templates can access
      ctx.pages.forEach(page => {
        if (page.frontMatter.useExternalData) {
          page.frontMatter.externalData = data;
        }
      });
    }
  }
});
```

### Dynamic Class Names with propValue

Use `stati.propValue()` for clean dynamic class generation:

```html
<!-- Component with dynamic classes -->
<button
  class="<%= stati.propValue(
    'btn',
    `btn-${stati.page.variant || 'primary'}`,
    stati.page.large && 'btn-lg',
    stati.page.disabled && 'btn-disabled'
  ) %>"
>
  <%= stati.page.buttonText %>
</button>

<!-- Dynamic attributes -->
<div
  class="<%= stati.propValue('card', stati.page.featured && 'featured') %>"
  data-category="<%= stati.page.category %>"
  data-analytics="<%= stati.propValue('card-click', `category-${stati.page.category}`) %>"
>
  <!-- Card content -->
</div>
```

### ISG Cache Invalidation Strategies

Configure intelligent caching with aging rules:

```javascript
// stati.config.js
export default defineConfig({
  isg: {
    enabled: true,
    ttlSeconds: 21600, // 6 hours default

    // Age-based TTL adjustment
    aging: [
      { untilDays: 7, ttlSeconds: 21600 },    // 6 hours for week-old content
      { untilDays: 30, ttlSeconds: 86400 },   // 1 day for month-old content
      { untilDays: 90, ttlSeconds: 259200 },  // 3 days for 3-month-old content
    ]
  }
});
```

**Cache Tags:**

Stati automatically extracts tags from each page's frontmatter `tags` array field. These tags can be used for targeted cache invalidation.

**Example frontmatter:**

```markdown
---
title: My Blog Post
tags: [blog, tutorial, javascript]
---
```

This page will be tagged with `blog`, `tutorial`, and `javascript` in the cache, allowing you to invalidate all related content:

```bash
# Invalidate by tag from frontmatter
stati invalidate "tag:blog"
stati invalidate "tag:tutorial"

# Invalidate by path prefix
stati invalidate "path:/blog"

# Invalidate by glob pattern
stati invalidate "glob:/blog/**"

# Invalidate by age
stati invalidate "age:3months"
```

### Performance Monitoring

Track build performance with hooks:

```javascript
// stati.config.js
export default defineConfig({
  hooks: {
    beforeAll: async (ctx) => {
      ctx.buildStartTime = Date.now();
      console.log(`Building ${ctx.pages.length} pages...`);
    },

    afterRender: async (ctx) => {
      const renderTime = Date.now() - (ctx.renderStartTime || 0);
      if (renderTime > 100) {
        console.warn(`Slow render: ${ctx.page.url} took ${renderTime}ms`);
      }
    },

    afterAll: async (ctx) => {
      const totalTime = Date.now() - (ctx.buildStartTime || 0);
      console.log(`Build completed in ${totalTime}ms`);
      console.log(`Average: ${Math.round(totalTime / ctx.pages.length)}ms per page`);
    }
  }
});
```

### Environment-Specific Configuration

Use environment variables for different build targets:

```javascript
// stati.config.js
import { getEnv } from '@stati/core';

const isDev = getEnv() === 'development';
const isProd = getEnv() === 'production';

export default defineConfig({
  site: {
    baseUrl: isProd
      ? 'https://example.com'
      : 'http://localhost:3000'
  },

  isg: {
    enabled: isProd, // Only enable ISG in production
    ttlSeconds: isDev ? 0 : 21600 // No cache in dev
  },

  seo: {
    autoInject: isProd, // Only inject SEO tags in production
    debug: isDev // Enable SEO debugging in development
  }
});
```

### Markdown Extensions

Add custom markdown processing with plugins and the configure function:

```javascript
// stati.config.js
export default defineConfig({
  markdown: {
    // Load markdown-it plugins (Stati auto-prepends 'markdown-it-')
    // Note: TOC and heading anchors are built-in, no plugins needed
    plugins: [
      ['container', 'tip'],
      ['container', 'warning']
    ],

    // Custom markdown-it configuration
    configure: (md) => {
      // Customize renderer rules
      const defaultImageRender = md.renderer.rules.image || ((tokens, idx, options, env, self) => self.renderToken(tokens, idx, options));

      md.renderer.rules.image = (tokens, idx, options, env, self) => {
        const token = tokens[idx];
        const srcIndex = token.attrIndex('src');
        const altIndex = token.attrIndex('alt');
        const titleIndex = token.attrIndex('title');

        const src = srcIndex >= 0 ? token.attrs[srcIndex][1] : '';
        const alt = token.content;
        const title = titleIndex >= 0 ? token.attrs[titleIndex][1] : '';

        return `
          <figure class="image-figure">
            <img src="${md.utils.escapeHtml(src)}"
                 alt="${md.utils.escapeHtml(alt)}"
                 ${title ? `title="${md.utils.escapeHtml(title)}"` : ''}
                 loading="lazy"
                 class="responsive-image">
            ${alt ? `<figcaption>${md.utils.escapeHtml(alt)}</figcaption>` : ''}
          </figure>
        `;
      };

      // Customize fence (code block) rendering
      const defaultFenceRender = md.renderer.rules.fence || ((tokens, idx, options, env, self) => self.renderToken(tokens, idx, options));

      md.renderer.rules.fence = (tokens, idx, options, env, self) => {
        const token = tokens[idx];
        const info = token.info ? md.utils.unescapeAll(token.info).trim() : '';
        const langName = info ? info.split(/\s+/g)[0] : '';
        const filename = info.split(/\s+/g).slice(1).join(' ');

        return `
          <div class="code-block">
            ${filename ? `<div class="code-filename">${md.utils.escapeHtml(filename)}</div>` : ''}
            <pre><code class="language-${langName}">${md.utils.escapeHtml(token.content)}</code></pre>
            <button class="copy-button" onclick="copyCode(this)">Copy</button>
          </div>
        `;
      };
    }
  }
});
```

## Development Workflow

### Custom Build Scripts

```json
{
  "scripts": {
    "dev": "stati dev --port 3000",
    "build": "npm run build:clean && stati build",
    "build:clean:dist": "node -e \"require('node:fs').rmSync('dist',{recursive:true,force:true})\"",
    "build:clean:cache": "node -e \"require('node:fs').rmSync('.stati',{recursive:true,force:true})\"",
    "build:clean": "npm run build:clean:dist && npm run build:clean:cache",
    "preview": "stati preview --port 8080",
    "invalidate:recent": "stati invalidate 'tag:recent'",
    "invalidate:all": "stati invalidate 'path:/**'"
  }
}
```

### Git Hooks for Cache Management

```bash
# .husky/post-merge
#!/bin/sh
# Invalidate cache after pulling changes
stati invalidate "age:0days"
```

This recipe collection provides practical, tested solutions for common Stati use cases, all verified against the current implementation.
