---
title: 'Recipe Collection'
description: 'Common patterns and solutions for Stati static site generation'
---

# Recipe Collection

A curated collection of practical recipes and patterns for building sites with Stati. Each recipe solves a common use case with complete, copy-paste code examples.

## Content Management

### Dynamic Menu Generation

Automatically generate navigation menus from your content structure:

```javascript
// stati.config.js
export default defineConfig({
  // ... other config

  eta: {
    globals: {
      // Generate menu from filesystem
      generateMenu: async (contentDir) => {
        const glob = await import('fast-glob');
        const path = await import('path');

        const files = await glob('**/*.md', {
          cwd: contentDir,
          ignore: ['**/README.md', '**/index.md'],
        });

        const menu = {};

        files.forEach((file) => {
          const parts = file.replace('.md', '').split('/');
          let current = menu;

          parts.forEach((part, index) => {
            if (!current[part]) {
              current[part] = {
                title: part.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
                path: index === parts.length - 1 ? `/${file.replace('.md', '')}` : null,
                children: {},
              };
            }
            current = current[part].children;
          });
        });

        return menu;
      },
    },
  },
});
```

```html
<!-- _partials/menu.eta -->
<% const menu = await it.generateMenu('site') %>

<nav class="menu">
  <% function renderMenu(items, level = 0) { %>
  <ul class="menu-level-<%= level %>">
    <% Object.entries(items).forEach(([key, item]) => { %>
    <li class="menu-item">
      <% if (item.path) { %>
      <a href="<%= item.path %>" class="<%= it.page.url === item.path ? 'active' : '' %>">
        <%= item.title %>
      </a>
      <% } else { %>
      <span class="menu-header"><%= item.title %></span>
      <% } %> <% if (Object.keys(item.children).length > 0) { %> <%~ renderMenu(item.children, level
      + 1) %> <% } %>
    </li>
    <% }) %>
  </ul>
  <% } %> <%~ renderMenu(menu) %>
</nav>
```

### Content Collections

Group and filter content by type:

```javascript
// stati.config.js
export default defineConfig({
  // ... other config

  eta: {
    globals: {
      // Get all posts with optional filtering
      getPosts: async (pages, filter = {}) => {
        return pages
          .filter((page) => page.data.type === 'post')
          .filter((page) => {
            if (filter.tag) {
              return page.data.tags?.includes(filter.tag);
            }
            if (filter.category) {
              return page.data.category === filter.category;
            }
            if (filter.author) {
              return page.data.author === filter.author;
            }
            return true;
          })
          .sort((a, b) => new Date(b.data.date) - new Date(a.data.date));
      },

      // Get all unique tags
      getAllTags: (pages) => {
        const tags = new Set();
        pages
          .filter((page) => page.data.type === 'post')
          .forEach((page) => {
            page.data.tags?.forEach((tag) => tags.add(tag));
          });
        return Array.from(tags).sort();
      },

      // Get related posts
      getRelatedPosts: (currentPost, pages, limit = 5) => {
        const currentTags = currentPost.data.tags || [];

        return pages
          .filter((page) => page.data.type === 'post' && page.url !== currentPost.url)
          .map((page) => {
            const commonTags = page.data.tags?.filter((tag) => currentTags.includes(tag)) || [];
            return {
              ...page,
              score: commonTags.length,
            };
          })
          .filter((page) => page.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, limit);
      },
    },
  },
});
```

```html
<!-- blog/index.eta -->
<% const posts = await it.getPosts(it.collections.all) %> <% const tags =
it.getAllTags(it.collections.all) %>

<div class="blog-index">
  <!-- Tag filter -->
  <div class="tag-filter">
    <a href="/blog/" class="tag <%= !it.params.tag ? 'active' : '' %>">All</a>
    <% tags.forEach(tag => { %>
    <a
      href="/blog/tag/<%= tag.toLowerCase() %>/"
      class="tag <%= it.params.tag === tag ? 'active' : '' %>"
    >
      <%= tag %>
    </a>
    <% }) %>
  </div>

  <!-- Posts -->
  <div class="posts">
    <% posts.forEach(post => { %>
    <article class="post-card">
      <h2><a href="<%= post.url %>"><%= post.data.title %></a></h2>
      <div class="post-meta">
        <time><%= new Date(post.data.date).toLocaleDateString() %></time>
        <span class="author">by <%= post.data.author %></span>
      </div>
      <p><%= post.data.description %></p>
      <% if (post.data.tags) { %>
      <div class="tags">
        <% post.data.tags.forEach(tag => { %>
        <span class="tag"><%= tag %></span>
        <% }) %>
      </div>
      <% } %>
    </article>
    <% }) %>
  </div>
</div>
```

### Markdown Extensions

Add custom markdown processing:

```javascript
// stati.config.js
import markdownItContainer from 'markdown-it-container';
import markdownItAnchor from 'markdown-it-anchor';
import markdownItTocDoneRight from 'markdown-it-toc-done-right';

export default defineConfig({
  markdown: {
    html: true,
    linkify: true,
    typographer: true,

    // Custom plugins
    plugins: [
      // Anchor links for headings
      [
        markdownItAnchor,
        {
          permalink: markdownItAnchor.permalink.headerLink({
            safariReaderFix: true,
            class: 'header-link',
          }),
        },
      ],

      // Table of contents
      [
        markdownItTocDoneRight,
        {
          containerClass: 'table-of-contents',
          listType: 'ul',
          level: [1, 2, 3],
        },
      ],

      // Custom containers
      [
        markdownItContainer,
        'tip',
        {
          render: (tokens, idx) => {
            const token = tokens[idx];
            if (token.nesting === 1) {
              return '<div class="callout callout-tip">\n';
            } else {
              return '</div>\n';
            }
          },
        },
      ],

      [
        markdownItContainer,
        'warning',
        {
          render: (tokens, idx) => {
            const token = tokens[idx];
            if (token.nesting === 1) {
              return '<div class="callout callout-warning">\n';
            } else {
              return '</div>\n';
            }
          },
        },
      ],
    ],

    // Custom renderer rules
    renderer: {
      // Custom image rendering
      image: (tokens, idx, options, env) => {
        const token = tokens[idx];
        const src = token.attrs[token.attrIndex('src')][1];
        const alt = token.content;
        const title =
          token.attrs && token.attrs[token.attrIndex('title')]
            ? token.attrs[token.attrIndex('title')][1]
            : '';

        // Add lazy loading and responsive images
        return `
          <figure class="image-figure">
            <img src="${src}"
                 alt="${alt}"
                 ${title ? `title="${title}"` : ''}
                 loading="lazy"
                 class="responsive-image">
            ${alt ? `<figcaption>${alt}</figcaption>` : ''}
          </figure>
        `;
      },

      // Custom code block rendering
      code_block: (tokens, idx, options, env) => {
        const token = tokens[idx];
        const content = token.content;
        const language = token.info.trim() || 'text';

        // Extract filename from language info
        const match = language.match(/^(\w+)(?:\s+(.+))?$/);
        const lang = match ? match[1] : language;
        const filename = match ? match[2] : '';

        return `
          <div class="code-block">
            ${filename ? `<div class="code-filename">${filename}</div>` : ''}
            <pre><code class="language-${lang}">${content}</code></pre>
            <button class="copy-button" onclick="copyCode(this)">Copy</button>
          </div>
        `;
      },
    },
  },
});
```



### SEO Optimization

Comprehensive SEO setup:

```javascript
// stati.config.js
export default defineConfig({
  site: {
    title: 'My Awesome Site',
    description: 'A fantastic website built with Stati',
    url: 'https://example.com',
    author: 'Your Name',
    language: 'en',
  },

  eta: {
    globals: {
      // Generate structured data
      generateStructuredData: (page, site) => {
        const baseData = {
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: site.title,
          url: site.url,
          description: site.description,
          author: {
            '@type': 'Person',
            name: site.author,
          },
        };

        if (page.data.type === 'post') {
          return {
            ...baseData,
            '@type': 'BlogPosting',
            headline: page.data.title,
            description: page.data.description,
            datePublished: page.data.date,
            dateModified: page.data.updated || page.data.date,
            author: {
              '@type': 'Person',
              name: page.data.author || site.author,
            },
            publisher: {
              '@type': 'Organization',
              name: site.title,
              url: site.url,
            },
          };
        }

        return baseData;
      },

      // Generate meta tags
      generateMeta: (page, site) => {
        const meta = [
          { name: 'description', content: page.data.description || site.description },
          { name: 'author', content: page.data.author || site.author },
          { property: 'og:title', content: page.data.title || site.title },
          { property: 'og:description', content: page.data.description || site.description },
          { property: 'og:url', content: `${site.url}${page.url}` },
          { property: 'og:type', content: page.data.type === 'post' ? 'article' : 'website' },
          { name: 'twitter:card', content: 'summary_large_image' },
          { name: 'twitter:title', content: page.data.title || site.title },
          { name: 'twitter:description', content: page.data.description || site.description },
        ];

        if (page.data.image) {
          meta.push(
            { property: 'og:image', content: `${site.url}${page.data.image}` },
            { name: 'twitter:image', content: `${site.url}${page.data.image}` },
          );
        }

        if (page.data.tags) {
          meta.push({ name: 'keywords', content: page.data.tags.join(', ') });
        }

        return meta;
      },
    },
  },
});
```

```html
<!-- layout.eta -->
<!DOCTYPE html>
<html lang="<%= it.site.language %>">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />

    <!-- Basic meta -->
    <title>
      <%= it.page.data.title ? `${it.page.data.title} | ${it.site.title}` : it.site.title %>
    </title>

    <!-- Generated meta tags -->
    <% const metaTags = it.generateMeta(it.page, it.site) %> <% metaTags.forEach(tag => { %> <% if
    (tag.name) { %>
    <meta name="<%= tag.name %>" content="<%= tag.content %>" />
    <% } else if (tag.property) { %>
    <meta property="<%= tag.property %>" content="<%= tag.content %>" />
    <% } %> <% }) %>

    <!-- Canonical URL -->
    <link rel="canonical" href="<%= it.site.url %><%= it.page.url %>" />

    <!-- Structured data -->
    <script type="application/ld+json">
      <%~ JSON.stringify(it.generateStructuredData(it.page, it.site), null, 2) %>
    </script>

    <!-- CSS -->
    <link rel="stylesheet" href="/styles.css" />
  </head>
  <body>
    <%~ it.body %>
  </body>
</html>
```



## Development Workflow

### Development Server Configuration

Basic development server setup:

```javascript
// stati.config.js
export default defineConfig({
  dev: {
    port: 3000,
    host: 'localhost',
    open: true,
  },
});
```

### Build Scripts

Custom build workflows:

```json
{
  "scripts": {
    "dev": "stati dev",
    "build": "npm run build:clean && npm run build:site && npm run build:optimize",
    "build:clean": "rimraf dist",
    "build:site": "stati build",
    "build:optimize": "npm run optimize:images && npm run optimize:css && npm run optimize:js",
    "optimize:images": "node scripts/optimize-images.js",
    "optimize:css": "node scripts/optimize-css.js",
    "optimize:js": "node scripts/optimize-js.js",
    "preview": "npx serve dist",
    "analyze": "npm run build && node scripts/analyze-bundle.js",
    "lighthouse": "npm run build && node scripts/lighthouse-ci.js",
    "deploy": "npm run build && node scripts/deploy.js"
  }
}
```

```javascript
// scripts/lighthouse-ci.js
import { spawn } from 'child_process';
import { createServer } from 'http-server';

async function runLighthouse() {
  // Start local server
  const server = createServer({ root: './dist' });
  server.listen(8080);

  try {
    // Run Lighthouse CI
    const lhci = spawn('npx', ['lhci', 'autorun', '--upload.target=temporary-public-storage'], {
      stdio: 'inherit',
    });

    await new Promise((resolve, reject) => {
      lhci.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`Lighthouse CI failed with code ${code}`));
      });
    });
  } finally {
    server.close();
  }
}

runLighthouse().catch(console.error);
```

This recipe collection provides practical, copy-paste solutions for common Stati use cases, helping developers quickly implement powerful features and optimizations in their static sites.
