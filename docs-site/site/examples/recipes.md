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

## Search & Discovery

### Client-Side Search

Implement full-text search with Fuse.js:

```javascript
// stati.config.js
export default defineConfig({
  // ... other config

  plugins: [
    // Generate search index
    {
      name: 'search-index',
      generateFiles: async (pages, config) => {
        const searchIndex = pages
          .filter((page) => !page.data.noindex)
          .map((page) => ({
            id: page.url,
            title: page.data.title,
            content: page.content.replace(/<[^>]*>/g, ''), // Strip HTML
            description: page.data.description,
            tags: page.data.tags || [],
            url: page.url,
          }));

        return [
          {
            path: '/search-index.json',
            content: JSON.stringify(searchIndex, null, 2),
          },
        ];
      },
    },
  ],
});
```

```html
<!-- _partials/search.eta -->
<div class="search-container">
  <input type="text" id="search-input" placeholder="Search..." class="search-input" />
  <div id="search-results" class="search-results hidden"></div>
</div>

<script>
  document.addEventListener('DOMContentLoaded', async () => {
    // Load search index and Fuse.js
    const [searchIndex, Fuse] = await Promise.all([
      fetch('/search-index.json').then((r) => r.json()),
      import('https://cdn.skypack.dev/fuse.js').then((m) => m.default),
    ]);

    // Configure Fuse
    const fuse = new Fuse(searchIndex, {
      keys: [
        { name: 'title', weight: 0.3 },
        { name: 'content', weight: 0.4 },
        { name: 'description', weight: 0.2 },
        { name: 'tags', weight: 0.1 },
      ],
      threshold: 0.3,
      includeScore: true,
    });

    const searchInput = document.getElementById('search-input');
    const searchResults = document.getElementById('search-results');

    let searchTimeout;

    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      const query = e.target.value.trim();

      if (query.length < 2) {
        searchResults.classList.add('hidden');
        return;
      }

      searchTimeout = setTimeout(() => {
        const results = fuse.search(query).slice(0, 10);
        displayResults(results);
      }, 300);
    });

    function displayResults(results) {
      if (results.length === 0) {
        searchResults.innerHTML = '<div class="no-results">No results found</div>';
      } else {
        searchResults.innerHTML = results
          .map(
            (result) => `
        <div class="search-result">
          <h3><a href="${result.item.url}">${result.item.title}</a></h3>
          <p class="description">${result.item.description || ''}</p>
          <div class="url">${result.item.url}</div>
          ${
            result.item.tags.length > 0
              ? `
            <div class="tags">
              ${result.item.tags.map((tag) => `<span class="tag">${tag}</span>`).join('')}
            </div>
          `
              : ''
          }
        </div>
      `,
          )
          .join('');
      }

      searchResults.classList.remove('hidden');
    }

    // Close search on outside click
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.search-container')) {
        searchResults.classList.add('hidden');
      }
    });
  });
</script>
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

  plugins: [
    // Generate sitemap
    {
      name: 'sitemap',
      generateFiles: async (pages, config) => {
        const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages
  .filter((page) => !page.data.noindex)
  .map(
    (page) => `  <url>
    <loc>${config.site.url}${page.url}</loc>
    <lastmod>${page.data.updated || page.data.date || new Date().toISOString()}</lastmod>
    <changefreq>${page.data.changefreq || 'monthly'}</changefreq>
    <priority>${page.data.priority || '0.5'}</priority>
  </url>`,
  )
  .join('\n')}
</urlset>`;

        return [
          {
            path: '/sitemap.xml',
            content: sitemap,
          },
        ];
      },
    },

    // Generate robots.txt
    {
      name: 'robots',
      generateFiles: async (pages, config) => {
        const robots = `User-agent: *
Allow: /

Sitemap: ${config.site.url}/sitemap.xml`;

        return [
          {
            path: '/robots.txt',
            content: robots,
          },
        ];
      },
    },
  ],
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

## Performance Optimization

### Image Optimization

Responsive images with lazy loading:

```javascript
// stati.config.js
import sharp from 'sharp';

export default defineConfig({
  plugins: [
    // Image optimization plugin
    {
      name: 'image-optimization',
      buildStart: async (config) => {
        const glob = await import('fast-glob');
        const path = await import('path');
        const fs = await import('fs-extra');

        const imageFiles = await glob('**/*.{jpg,jpeg,png,webp}', {
          cwd: path.join(config.build.contentDir, 'images'),
          absolute: true,
        });

        for (const imagePath of imageFiles) {
          const relativePath = path.relative(
            path.join(config.build.contentDir, 'images'),
            imagePath,
          );
          const { name, dir, ext } = path.parse(relativePath);

          // Generate multiple sizes
          const sizes = [400, 800, 1200, 1600];

          for (const size of sizes) {
            const outputPath = path.join(
              config.build.outputDir,
              'images',
              dir,
              `${name}-${size}w${ext}`,
            );

            await fs.ensureDir(path.dirname(outputPath));

            await sharp(imagePath)
              .resize(size, null, { withoutEnlargement: true })
              .jpeg({ quality: 80 })
              .toFile(outputPath);
          }

          // Generate WebP versions
          for (const size of sizes) {
            const outputPath = path.join(
              config.build.outputDir,
              'images',
              dir,
              `${name}-${size}w.webp`,
            );

            await sharp(imagePath)
              .resize(size, null, { withoutEnlargement: true })
              .webp({ quality: 80 })
              .toFile(outputPath);
          }
        }
      },
    },
  ],

  eta: {
    globals: {
      // Responsive image helper
      responsiveImage: (src, alt, options = {}) => {
        const { name, dir, ext } = path.parse(src);
        const sizes = options.sizes || [400, 800, 1200, 1600];
        const loading = options.loading || 'lazy';

        const srcset = sizes
          .map((size) => `/images/${dir}/${name}-${size}w${ext} ${size}w`)
          .join(', ');

        const srcsetWebP = sizes
          .map((size) => `/images/${dir}/${name}-${size}w.webp ${size}w`)
          .join(', ');

        return `
          <picture>
            <source srcset="${srcsetWebP}" type="image/webp">
            <img src="/images/${src}"
                 srcset="${srcset}"
                 sizes="${options.imageSizes || '(max-width: 768px) 100vw, 50vw'}"
                 alt="${alt}"
                 loading="${loading}"
                 ${options.class ? `class="${options.class}"` : ''}>
          </picture>
        `;
      },
    },
  },
});
```

### CSS Optimization

Critical CSS and optimization:

```javascript
// stati.config.js
import postcss from 'postcss';
import autoprefixer from 'autoprefixer';
import cssnano from 'cssnano';

export default defineConfig({
  plugins: [
    {
      name: 'css-optimization',
      buildEnd: async (pages, config) => {
        const fs = await import('fs-extra');
        const path = await import('path');

        // Read main CSS file
        const cssPath = path.join(config.build.outputDir, 'styles.css');
        const css = await fs.readFile(cssPath, 'utf8');

        // Process CSS
        const result = await postcss([
          autoprefixer,
          cssnano({
            preset: [
              'default',
              {
                discardComments: { removeAll: true },
                normalizeWhitespace: true,
              },
            ],
          }),
        ]).process(css, { from: cssPath });

        // Write optimized CSS
        await fs.writeFile(cssPath, result.css);

        // Generate critical CSS for each page
        for (const page of pages) {
          // Extract critical CSS (above-the-fold styles)
          // This is a simplified example - use tools like critical or penthouse
          const criticalCSS = extractCriticalCSS(result.css, page.content);

          if (criticalCSS) {
            const pagePath = path.join(config.build.outputDir, page.url, 'index.html');
            let html = await fs.readFile(pagePath, 'utf8');

            // Inline critical CSS
            html = html.replace(
              '<link rel="stylesheet" href="/styles.css">',
              `<style>${criticalCSS}</style>
               <link rel="preload" href="/styles.css" as="style" onload="this.onload=null;this.rel='stylesheet'">
               <noscript><link rel="stylesheet" href="/styles.css"></noscript>`,
            );

            await fs.writeFile(pagePath, html);
          }
        }
      },
    },
  ],
});

// Simplified critical CSS extraction
function extractCriticalCSS(css, html) {
  // In a real implementation, use a proper critical CSS tool
  // This is just a basic example
  const criticalSelectors = ['body', 'html', 'h1', 'h2', 'h3', 'nav', 'header', '.hero'];

  const lines = css.split('\n');
  const criticalLines = [];
  let inCriticalRule = false;
  let braceCount = 0;

  for (const line of lines) {
    if (criticalSelectors.some((sel) => line.includes(sel))) {
      inCriticalRule = true;
    }

    if (inCriticalRule) {
      criticalLines.push(line);
      braceCount += (line.match(/{/g) || []).length;
      braceCount -= (line.match(/}/g) || []).length;

      if (braceCount === 0) {
        inCriticalRule = false;
      }
    }
  }

  return criticalLines.join('\n');
}
```

### Bundle Analysis

Analyze and optimize bundle size:

```javascript
// stati.config.js
export default defineConfig({
  plugins: [
    {
      name: 'bundle-analysis',
      buildEnd: async (pages, config) => {
        const fs = await import('fs-extra');
        const path = await import('path');
        const gzipSize = await import('gzip-size');

        const outputDir = config.build.outputDir;
        const analysis = {
          timestamp: new Date().toISOString(),
          pages: pages.length,
          assets: {},
          total: { raw: 0, gzipped: 0 },
        };

        // Analyze CSS
        const cssPath = path.join(outputDir, 'styles.css');
        if (await fs.pathExists(cssPath)) {
          const css = await fs.readFile(cssPath);
          analysis.assets.css = {
            raw: css.length,
            gzipped: await gzipSize.default(css),
          };
        }

        // Analyze JavaScript files
        const jsFiles = await glob('**/*.js', { cwd: outputDir });
        analysis.assets.js = { raw: 0, gzipped: 0 };

        for (const jsFile of jsFiles) {
          const jsPath = path.join(outputDir, jsFile);
          const js = await fs.readFile(jsPath);
          analysis.assets.js.raw += js.length;
          analysis.assets.js.gzipped += await gzipSize.default(js);
        }

        // Calculate totals
        Object.values(analysis.assets).forEach((asset) => {
          analysis.total.raw += asset.raw;
          analysis.total.gzipped += asset.gzipped;
        });

        // Write analysis report
        await fs.writeJSON(path.join(outputDir, 'bundle-analysis.json'), analysis, { spaces: 2 });

        // Log summary
        console.log('\n📊 Bundle Analysis:');
        console.log(`   Pages: ${analysis.pages}`);
        console.log(`   Total size: ${(analysis.total.raw / 1024).toFixed(1)} KB`);
        console.log(`   Gzipped: ${(analysis.total.gzipped / 1024).toFixed(1)} KB`);

        if (analysis.assets.css) {
          console.log(
            `   CSS: ${(analysis.assets.css.raw / 1024).toFixed(1)} KB (${(analysis.assets.css.gzipped / 1024).toFixed(1)} KB gzipped)`,
          );
        }

        if (analysis.assets.js.raw > 0) {
          console.log(
            `   JS: ${(analysis.assets.js.raw / 1024).toFixed(1)} KB (${(analysis.assets.js.gzipped / 1024).toFixed(1)} KB gzipped)`,
          );
        }
      },
    },
  ],
});
```

## Development Workflow

### Hot Module Replacement

Enhanced development experience:

```javascript
// stati.config.js
export default defineConfig({
  dev: {
    port: 3000,
    host: 'localhost',
    open: true,

    // Custom middleware
    middleware: [
      // API mock middleware
      (req, res, next) => {
        if (req.url.startsWith('/api/')) {
          // Mock API responses for development
          const mockData = getMockData(req.url);
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(mockData));
          return;
        }
        next();
      },

      // Development tools middleware
      (req, res, next) => {
        if (req.url === '/__dev/reload') {
          // Custom reload endpoint
          res.setHeader('Content-Type', 'text/event-stream');
          res.setHeader('Cache-Control', 'no-cache');
          res.setHeader('Connection', 'keep-alive');

          // Send reload events
          const interval = setInterval(() => {
            res.write('data: ping\n\n');
          }, 30000);

          req.on('close', () => {
            clearInterval(interval);
          });

          return;
        }
        next();
      },
    ],
  },
});

function getMockData(url) {
  const mocks = {
    '/api/posts': [
      { id: 1, title: 'Sample Post', content: 'Lorem ipsum...' },
      { id: 2, title: 'Another Post', content: 'Dolor sit amet...' },
    ],
    '/api/users': [{ id: 1, name: 'John Doe', email: 'john@example.com' }],
  };

  return mocks[url] || { error: 'Not found' };
}
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
