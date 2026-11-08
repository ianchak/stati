---
title: 'Recipes'
description: 'Practical recipes and patterns for common Stati use cases.'
order: 2
seo:
  title: 'Stati recipes'
---

# Recipes

A recipe that starts with a `site/partials/` file name, such as `site/partials/menu.eta`, is a template to include from a layout: `<%~ stati.include('partials/menu') %>`. The others are layouts: they say which pages they lay out, and wrap themselves in the page shell `site/base.eta` with `stati.layout('base')` (see [Sharing a shell](/core-concepts/templates#sharing-a-shell)). Links to the site's own pages go through `stati.url()`, so the templates also work on a site served from a subfolder.

## Content management

### Dynamic navigation menu

Build a menu from the navigation tree, `stati.nav.tree`:

```eta
<!-- site/partials/menu.eta -->
<nav class="menu">
  <% function renderNavigation(items, level = 0) { %>
    <ul class="<%= stati.propValue('menu-level', `level-${level}`) %>">
      <% items.forEach(item => { %>
        <li class="menu-item">
          <a
            href="<%= stati.url(item.url) %>"
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

```eta
<!-- site/partials/section-nav.eta -->
<% if (stati.page.navNode?.children && stati.page.navNode.children.length > 0) { %>
  <nav class="section-navigation">
    <h3><%= stati.page.navNode.title %></h3>

    <!-- Show all child pages of the current page -->
    <ul>
      <% stati.page.navNode.children.forEach(page => { %>
        <li>
          <a
            href="<%= stati.url(page.url) %>"
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

The navigation tree is flat: every folder with pages is a top-level node. A nested folder's `index.md` therefore also appears, without children, among its parent folder's pages, and `stati.page.navNode` can be that entry. On such a page, look its node up among the top-level nodes instead: `stati.nav.tree.find((node) => node.url === stati.page.url)?.children ?? []`.

Common navigation patterns:

- **Current page's children** - Use `stati.page.navNode.children`
- **Any section's children** - Use `stati.nav.getChildren('/path')`
- **Current page's siblings** - Use `stati.nav.getSiblings()`

```eta
<!-- site/partials/docs-sidebar.eta -->
<!-- Show children of the docs section, regardless of current page -->
<aside class="docs-sidebar">
  <h3>Documentation</h3>
  <ul>
    <% stati.nav.getChildren('/docs').forEach(page => { %>
      <li>
        <a
          href="<%= stati.url(page.url) %>"
          class="<%= stati.page.url === page.url ? 'active' : '' %>"
        >
          <%= page.title %>
        </a>
      </li>
    <% }) %>
  </ul>
</aside>
```

```eta
<!-- site/partials/sibling-nav.eta -->
<!-- Show siblings of the current page -->
<% const siblings = stati.nav.getSiblings() %>

<% if (siblings.length > 0) { %>
  <nav class="sibling-nav">
    <h3>Related Pages</h3>
    <ul>
      <% siblings.forEach(sibling => { %>
        <li>
          <a href="<%= stati.url(sibling.url) %>"><%= sibling.title %></a>
        </li>
      <% }) %>
    </ul>
  </nav>
<% } %>
```

### Table of contents (in-page navigation)

`stati.page.toc` lists the page's h2 to h6 headings; it is empty when there are none or `markdown.toc` is `false`:

```eta
<!-- site/partials/toc.eta -->
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

```eta
<!-- site/partials/hierarchical-toc.eta -->
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

### Prev/Next navigation using siblings

```eta
<!-- site/partials/page-nav.eta -->
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
      <a href="<%= stati.url(prevPage.url) %>" class="nav-prev">
        <span class="label">← Previous</span>
        <span class="title"><%= prevPage.title %></span>
      </a>
    <% } %>

    <% if (nextPage) { %>
      <a href="<%= stati.url(nextPage.url) %>" class="nav-next">
        <span class="label">Next →</span>
        <span class="title"><%= nextPage.title %></span>
      </a>
    <% } %>
  </nav>
<% } %>
```

### Collection index pages

Use collection data provided to index pages to list content and link to tag pages:

```eta
<!-- site/blog/index.eta: layout of site/blog/index.md -->
<% stati.layout('base') %>

<% const posts = stati.collection ? stati.collection.recentPages : [] %>
<% const tags = stati.collection ? Object.keys(stati.collection.pagesByTag) : [] %>

<div class="blog-index">
  <!-- Tag links -->
  <% if (tags.length > 0) { %>
    <div class="tag-filter">
      <% tags.forEach(tag => { %>
        <a
          href="<%= stati.url(`/blog/tags/${stati.slugify(tag)}`) %>"
          class="tag"
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
          <a href="<%= stati.url(post.url) %>"><%= post.frontMatter.title %></a>
        </h2>
        <div class="post-meta">
          <% if (post.publishedAt) { %>
            <time datetime="<%= post.publishedAt.toISOString() %>">
              <%= post.publishedAt.toLocaleDateString('en-US') %>
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

The tag links lead to the pages from [A page for every tag](#a-page-for-every-tag).

### Related posts

A post reads the collection of its folder, so the post layout can ask it for related posts with no hook. `related()` scores the other posts by shared tags, newest first on ties:

```eta
<!-- site/blog/layout.eta: layout of the posts -->
<% stati.layout('base') %>
<% const related = stati.collection?.related(stati.page.url, { limit: 3 }) ?? []; %>
<article class="post">
  <%~ stati.content %>
</article>

<% if (related.length > 0) { %>
  <aside class="related-posts">
    <h2>Related Posts</h2>
    <ul>
      <% related.forEach((post) => { %>
        <li>
          <a href="<%= stati.url(post.url) %>"><%= post.frontMatter.title %></a>
        </li>
      <% }) %>
    </ul>
  </aside>
<% } %>
```

Because the layout calls `stati.collection.related()`, ISG re-renders the posts when a post is added, removed or moved, or its publish date or a field in `collections.summaryFields` (by default `title`, `description`, `tags` and `draft`) changes. See [Related pages](/core-concepts/collections#related-pages) for the options.

### Paginated listing

Split a long listing into pages with `paginate`, and link them with `stati.pagination`:

```markdown
---
# site/blog/index.md
title: Blog
paginate: 10
---
```

```eta
<!-- site/blog/index.eta: layout of site/blog/index.md -->
<% stati.layout('base') %>
<% const { items, pageNumber, totalPages, prevUrl, nextUrl, urls } = stati.pagination; %>
<% items.forEach((post) => { %>
  <h2><a href="<%= stati.url(post.url) %>"><%= post.frontMatter.title %></a></h2>
<% }) %>

<% if (totalPages > 1) { %>
  <nav aria-label="Pages">
    <% if (prevUrl) { %><a href="<%= stati.url(prevUrl) %>" rel="prev">Newer</a><% } %>
    <% urls.forEach((url, i) => { %>
      <% if (i + 1 === pageNumber) { %>
        <span aria-current="page"><%= i + 1 %></span>
      <% } else { %>
        <a href="<%= stati.url(url) %>"><%= i + 1 %></a>
      <% } %>
    <% }) %>
    <% if (nextUrl) { %><a href="<%= stati.url(nextUrl) %>" rel="next">Older</a><% } %>
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

```eta
<!-- site/blog/tags/layout.eta: layout of the pages from site/blog/tags/[tag].md -->
<% stati.layout('base') %>
<h1><%= stati.page.title %></h1>
<ul>
  <% stati.generated.items.forEach((post) => { %>
    <li><a href="<%= stati.url(post.url) %>"><%= post.frontMatter.title %></a></li>
  <% }) %>
</ul>
```

Link to the pages with `stati.slugify`, which gives the same key Stati used for the URL:

```eta
<% (stati.page.tags ?? []).forEach((tag) => { %>
  <a href="<%= stati.url(`/blog/tags/${stati.slugify(tag)}`) %>"><%= tag %></a>
<% }) %>
```

See [Collections and generated pages](/core-concepts/collections) for keys from other fields, pagination of tag pages and pages from data.

### Helpers in templates

Add reusable functions for templates under `helpers` in the config:

```javascript
// stati.config.js
import { defineConfig } from '@stati/core';

export default defineConfig({
  helpers: {
    formatDate: (date) =>
      new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
  },
});
```

Call them in templates as `stati.helpers.name()`. A helper runs when the page renders, so text that depends on the build date, such as "3 days ago", stays as it was on pages the ISG cache serves. For slugs, Stati's own `stati.slugify()` is built in, and so is the reading time: `stati.page.readingTime` holds whole minutes at `readingTime.wordsPerMinute` (default 230).

```eta
<!-- site/blog/layout.eta: layout of the posts -->
<% stati.layout('base') %>
<article class="post">
  <header>
    <h1><%= stati.page.title %></h1>
    <% const published = stati.page.publishedAt ?? stati.page.date; %>
    <div class="meta">
      <% if (published) { %>
        <time><%= stati.helpers.formatDate(published) %></time>
      <% } %>
      <span><%= stati.page.readingTime %> min read</span>
    </div>
  </header>
  <%~ stati.content %>
</article>
```

### Breadcrumb navigation

`stati.nav.getBreadcrumbs()` returns the trail from the page's top-level navigation node, which for nested pages is the nearest folder rather than the site root, so add the Home link yourself (see [getBreadcrumbs](/api/navigation#stati-nav-getbreadcrumbs-path)):

```eta
<!-- site/partials/breadcrumbs.eta -->
<nav class="breadcrumbs" aria-label="Breadcrumb">
  <ol class="breadcrumb-list">
    <li class="breadcrumb-item">
      <a href="<%= stati.url('/') %>">Home</a>
    </li>
    <% stati.nav.getBreadcrumbs().forEach((crumb, index, array) => { %>
      <li class="breadcrumb-item">
        <% if (index === array.length - 1) { %>
          <span aria-current="page"><%= crumb.title %></span>
        <% } else { %>
          <a href="<%= stati.url(crumb.url) %>"><%= crumb.title %></a>
        <% } %>
      </li>
    <% }); %>
  </ol>
</nav>
```

## SEO & metadata

### Built-in SEO

Stati adds SEO tags to every page. Set the site-wide values in the config:

```javascript
// stati.config.js
import { defineConfig } from '@stati/core';

export default defineConfig({
  site: {
    title: 'My Awesome Site',
    baseUrl: 'https://example.com',
    defaultLocale: 'en-US'
  },

  seo: {
    defaultAuthor: {
      name: 'Your Name',
      url: 'https://yoursite.com',
      twitter: '@yourname'
    },
    twitter: { site: '@mysite' },
    articles: { include: ['/blog/*'] }
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

Every page now gets `og:locale` `en_US`, `twitter:site` `@mysite` and `twitter:creator` `@yourname`. Posts under `/blog/` also get `og:type` `article`, `article:published_time` from their publish date, `article:modified_time` from `updated`, one `article:tag` per tag and `article:author`.

Add SEO metadata in front matter. Each value set here wins over the config:

```markdown
---
title: My Blog Post
description: A comprehensive guide to...
publishedAt: 2024-01-15
tags: [tech, web-dev]
seo:
  title: Custom SEO Title | My Site
  description: Custom meta description
  keywords: [stati, ssg, jamstack]
  openGraph:
    image: /images/og-image.jpg
    article:
      section: Guides
  twitter:
    card: summary_large_image
---
```

Quote dates inside `seo` (`'2024-01-15'`): an unquoted YAML date becomes a `Date` object, which the tag prints as a local date string such as `Mon Jan 15 2024 ...` instead of ISO 8601. Dates Stati fills in itself, such as the publish date, are always printed in ISO 8601 form.

### Custom structured data

Add structured data in a `beforeAll` hook. Changes made there are part of each page's input, so cached pages stay cached until the data changes (changes made in `beforeRender` make the page re-render on every build):

```javascript
// stati.config.js
import { defineConfig } from '@stati/core';

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
          dateModified: page.frontMatter.updated || page.publishedAt?.toISOString(),
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
import { defineConfig } from '@stati/core';

export default defineConfig({
  hooks: {
    beforeAll: async (ctx) => {
      // Fetch data from external API
      const response = await fetch('https://api.example.com/data');
      const data = await response.json();

      // Templates read it as stati.page.externalData
      ctx.pages.forEach(page => {
        if (page.frontMatter.useExternalData) {
          page.frontMatter.externalData = data;
        }
      });
    }
  }
});
```

Front matter is part of each page's cache hash, so these pages re-render when the fetched data changes and stay cached while it does not.

### Performance monitoring

Each hook receives a new context object, so keep timing state in module-level variables:

```javascript
// stati.config.js
import { defineConfig } from '@stati/core';

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

`getEnv()` returns `'production'` in `stati build` and `stati preview` and `'development'` in `stati dev`:

```javascript
// stati.config.js
import { defineConfig, getEnv } from '@stati/core';

const isProd = getEnv() === 'production';

export default defineConfig({
  site: {
    title: 'My Site',
    baseUrl: isProd ? 'https://example.com' : 'http://localhost:3000',
  },

  seo: {
    debug: !isProd, // SEO warnings while you develop
  },
});
```

Keep ISG on in development: with `isg.enabled: false`, every rebuild renders every page. For a config per environment, see [Multi-environment configuration](/configuration/file#multi-environment-configuration).

### Markdown extensions

For markdown-it plugins such as `markdown-it-container`, and for changing how elements render with `markdown.configure`, see [Markdown configuration](/configuration/markdown#custom-renderer-rules). Wrap Stati's `image` rule instead of replacing it, or Markdown images lose their sizes, lazy loading and [responsive versions](/configuration/images).

## Development workflow

### Custom build scripts

```json
{
  "scripts": {
    "dev": "stati dev",
    "build": "stati build",
    "build:clean": "stati build --clean",
    "preview": "stati preview --port 8080",
    "invalidate:recent": "stati invalidate tag:recent",
    "invalidate:all": "stati invalidate"
  }
}
```
