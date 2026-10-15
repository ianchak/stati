---
title: 'Recipes'
description: 'Practical recipes and patterns for common Stati use cases.'
order: 2
seo:
  title: 'Stati recipes'
---

# Recipes

Practical recipes and patterns for building sites with Stati. Each recipe solves a common use case with code you can adapt.

## Content management

### Dynamic navigation menu

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
            <% renderNavigation(item.children, level + 1) %>
          <% } %>
        </li>
      <% }) %>
    </ul>
  <% } %>
  <% renderNavigation(stati.nav.tree) %>
</nav>
```

Call a template function that writes markup with `<% %>`: it adds to the output as it runs and returns nothing, so `<%~ renderNavigation(...) %>` would print `undefined`. Every folder of pages is a top-level node in `stati.nav.tree`, so this menu has at most two levels, with nested folders listed at the top (see [Tree shape](/api/navigation#tree-shape)).

### Section-specific navigation

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
        </li>
      <% }) %>
    </ul>
  </nav>
<% } %>
```

`navNode.children` is only set on collection pages (a folder's `index.md`), and the children are the pages in that folder. A subfolder appears there as a single page without its own children.

Common navigation patterns:

- **Current page's children** - Use `stati.page.navNode.children`
- **Any section's children** - Use `stati.nav.getChildren('/path')`
- **Current page's siblings** - Use `stati.nav.getSiblings()`

### Table of contents (in-page navigation)

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
            <% renderTocTree(item.children) %>
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
    <% renderTocTree(tocTree) %>
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

### Prev/Next navigation using siblings

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

### Collection index pages

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

### Related posts

A post reads the collection of its folder, so the post layout can pick related posts from `stati.collection` with no hook:

```html
<!-- blog/layout.eta -->
<%
  const tags = stati.page.tags ?? [];
  const related = (stati.collection?.recentPages ?? [])
    .filter((post) => post.url !== stati.page.url)
    .map((post) => ({
      post,
      commonTags: (post.frontMatter.tags ?? []).filter((tag) => tags.includes(tag)),
    }))
    .filter(({ commonTags }) => commonTags.length > 0)
    .sort((a, b) => b.commonTags.length - a.commonTags.length)
    .slice(0, 3);
%>
<article class="post">
  <%~ stati.content %>
</article>

<% if (related.length > 0) { %>
  <aside class="related-posts">
    <h2>Related Posts</h2>
    <ul>
      <% related.forEach(({ post, commonTags }) => { %>
        <li>
          <a href="<%= post.url %>"><%= post.frontMatter.title %></a>
          <span class="common-tags"><%= commonTags.join(', ') %></span>
        </li>
      <% }) %>
    </ul>
  </aside>
<% } %>
```

Because the layout reads `stati.collection`, ISG re-renders the posts when a post is added or removed or its title or tags change.

### Paginated listing

Split a long listing into pages with `paginate`, and link them with `stati.pagination`:

```markdown
---
# site/blog/index.md
title: Blog
paginate: 10
---
```

```html
<!-- blog/index.eta -->
<% const { items, pageNumber, totalPages, prevUrl, nextUrl, urls } = stati.pagination; %>
<% items.forEach((post) => { %>
  <h2><a href="<%= post.url %>"><%= post.frontMatter.title %></a></h2>
<% }) %>

<% if (totalPages > 1) { %>
  <nav aria-label="Pages">
    <% if (prevUrl) { %><a href="<%= prevUrl %>" rel="prev">Newer</a><% } %>
    <% urls.forEach((url, i) => { %>
      <% if (i + 1 === pageNumber) { %>
        <span aria-current="page"><%= i + 1 %></span>
      <% } else { %>
        <a href="<%= url %>"><%= i + 1 %></a>
      <% } %>
    <% }) %>
    <% if (nextUrl) { %><a href="<%= nextUrl %>" rel="next">Older</a><% } %>
  </nav>
<% } %>
```

The first page stays at `/blog`; the next ones are `/blog/page/2`, `/blog/page/3` and so on.

### A page for every tag

A file named `[tag].md` becomes one page per tag of its collection:

```markdown
---
# site/blog/tags/[tag].md
title: 'Posts tagged {tag}'
generate:
  from: tags
---
```

```html
<!-- blog/tags/layout.eta -->
<h1><%= stati.page.title %></h1>
<ul>
  <% stati.generated.items.forEach((post) => { %>
    <li><a href="<%= post.url %>"><%= post.frontMatter.title %></a></li>
  <% }) %>
</ul>
```

Link to the pages with `stati.slugify`, which gives the same key Stati used for the URL:

```html
<% (stati.page.tags ?? []).forEach((tag) => { %>
  <a href="<%= `/blog/tags/${stati.slugify(tag)}` %>"><%= tag %></a>
<% }) %>
```

See [Collections and generated pages](/core-concepts/collections) for keys from other fields, pagination of tag pages and pages from data.

### Custom filters in templates

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

### Breadcrumb navigation

`stati.nav.getBreadcrumbs()` returns the trail from the page's top-level navigation node, which for nested pages is the nearest folder rather than the site root, so add the Home link yourself (see [getBreadcrumbs](/api/navigation#stati-nav-getbreadcrumbs-path)):

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

## SEO & metadata

### Leveraging built-in SEO

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
  author: John Doe
  openGraph:
    type: article
    image: /images/og-image.jpg
    article:
      publishedTime: '2024-01-15'
      tags: [tech, web-dev]
  twitter:
    card: summary_large_image
    site: '@mysite'
---
```

Quote dates inside `seo` (`'2024-01-15'`): an unquoted YAML date becomes a `Date` object, which breaks the Open Graph tag generator.

### Custom structured data

Add structured data in a `beforeAll` hook. Changes made there are part of each page's input, so cached pages stay cached until the data changes (changes made in `beforeRender` make the page re-render on every build):

```javascript
// stati.config.js
export default defineConfig({
  hooks: {
    beforeAll: async (ctx) => {
      // Add structured data for blog posts
      for (const page of ctx.pages) {
        if (page.frontMatter.type !== 'post') continue;
        page.frontMatter.seo = page.frontMatter.seo || {};
        page.frontMatter.seo.structuredData = {
          '@context': 'https://schema.org',
          '@type': 'BlogPosting',
          headline: page.frontMatter.title,
          description: page.frontMatter.description,
          datePublished: page.publishedAt?.toISOString(),
          dateModified: page.frontMatter.modifiedAt || page.publishedAt?.toISOString(),
          author: {
            '@type': 'Person',
            name: page.frontMatter.author || ctx.config.seo?.defaultAuthor?.name
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

`page.publishedAt` is a `Date` taken from the first valid front matter value among `publishedAt`, `published`, `date` and `createdAt`, quoted or unquoted. It is `undefined` for undated pages.

## Advanced patterns

### Build-time data fetching

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

### Dynamic class names with propValue

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

### ISG cache invalidation strategies

Configure intelligent caching with aging rules:

```javascript
// stati.config.js
export default defineConfig({
  isg: {
    enabled: true,
    ttlSeconds: 21600, // 6 hours default

    // Age-based TTL adjustment
    aging: [
      { untilDays: 7, ttlSeconds: 21600 },    // up to 7 days old: 6 hours
      { untilDays: 30, ttlSeconds: 86400 },   // up to 30 days old: 1 day
      { untilDays: 90, ttlSeconds: 259200 },  // up to 90 days old (and older): 3 days
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

### Performance monitoring

Track build performance with hooks:

Each hook receives a new context object, so keep timing state in module-level variables:

```javascript
// stati.config.js
let buildStart = 0;
const renderStarts = new Map();

export default defineConfig({
  hooks: {
    beforeAll: async (ctx) => {
      buildStart = Date.now();
      console.log(`Building ${ctx.pages.length} pages...`);
    },

    beforeRender: async (ctx) => {
      renderStarts.set(ctx.page.url, Date.now());
    },

    afterRender: async (ctx) => {
      const renderTime = Date.now() - renderStarts.get(ctx.page.url);
      if (renderTime > 100) {
        console.warn(`Slow render: ${ctx.page.url} took ${renderTime}ms`);
      }
    },

    afterAll: async (ctx) => {
      const totalTime = Date.now() - buildStart;
      console.log(`Build completed in ${totalTime}ms`);
      console.log(`Average: ${Math.round(totalTime / ctx.pages.length)}ms per page`);
    }
  }
});
```

The render hooks only run for pages that are re-rendered, not for pages served from the ISG cache. For detailed timings, use [build metrics](/advanced/metrics) instead.

### Environment-specific configuration

Use environment variables for different build targets:

```javascript
// stati.config.js
import { getEnv } from '@stati/core';

const isDev = getEnv() === 'development';
const isProd = getEnv() === 'production';

export default defineConfig({
  site: {
    title: 'My Site',
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

### Markdown extensions

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
      // Customize renderer rules. Wrap the default image rule instead of
      // replacing it: Stati's rule adds width, height and lazy loading, and
      // with images.responsive it writes a <picture> with srcset.
      const defaultImageRender = md.renderer.rules.image || ((tokens, idx, options, env, self) => self.renderToken(tokens, idx, options));

      md.renderer.rules.image = (tokens, idx, options, env, self) => {
        const token = tokens[idx];
        const alt = token.content;

        // Attributes set on the token, such as a class, are kept on the <img>
        token.attrJoin('class', 'responsive-image');
        const image = defaultImageRender(tokens, idx, options, env, self);

        return `
          <figure class="image-figure">
            ${image}
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

An image rule that doesn't call `defaultImageRender` replaces Stati's own, and Markdown images lose their sizes, lazy loading and [responsive versions](/configuration/images).

## Development workflow

### Custom build scripts

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
    "invalidate:all": "stati invalidate"
  }
}
```

### Git hooks for cache management

```bash
#!/bin/sh
# .husky/post-merge
# Clear the whole cache after pulling changes
npx stati invalidate
```

`stati invalidate` without a query clears every cache entry. A `path:` query is a plain prefix (`path:/blog`), not a glob; use `glob:` for wildcards.

For complete starter sites, see [Examples](/examples/list).
