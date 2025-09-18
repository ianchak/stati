---
title: 'Advanced Topics'
description: 'Explore advanced Stati features including performance optimization, SEO, and complex deployment scenarios.'
---

# Advanced Topics

This section covers advanced Stati features and patterns for building high-performance, production-ready static sites. These topics are designed for users who want to push Stati to its limits and implement sophisticated site architectures.

## Performance Optimization

### Build Performance

**Parallel Processing**

```javascript
export default defineConfig({
  build: {
    // Enable parallel page processing
    parallel: true,

    // Optimize worker allocation
    workers: Math.max(1, os.cpus().length - 1),

    // Memory management
    memoryLimit: '2GB',
  },
});
```

**Asset Optimization**

```javascript
export default defineConfig({
  build: {
    // Tree shaking and dead code elimination
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log'],
      },
    },

    // Code splitting strategy
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor libraries
          vendor: ['lodash', 'date-fns'],

          // UI components
          ui: ['./src/components/index.js'],

          // Utilities
          utils: ['./src/utils/index.js'],
        },
      },
    },
  },
});
```

### Runtime Performance

**Critical Resource Hints**

```eta
<head>
  <!-- DNS prefetching -->
  <link rel="dns-prefetch" href="//fonts.googleapis.com">
  <link rel="dns-prefetch" href="//api.example.com">

  <!-- Preconnect for critical resources -->
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>

  <!-- Preload critical assets -->
  <link rel="preload" href="/fonts/inter-var.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="/src/critical.css" as="style">

  <!-- Prefetch non-critical resources -->
  <link rel="prefetch" href="/src/components/gallery.js">
  <link rel="prefetch" href="/images/hero-large.jpg">
</head>
```

**Lazy Loading Implementation**

```javascript
// Intersection Observer for lazy loading
class LazyLoader {
  constructor(selector, options = {}) {
    this.observer = new IntersectionObserver(this.handleIntersection.bind(this), {
      threshold: 0.1,
      ...options,
    });

    document.querySelectorAll(selector).forEach((el) => {
      this.observer.observe(el);
    });
  }

  async handleIntersection(entries) {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        await this.loadElement(entry.target);
        this.observer.unobserve(entry.target);
      }
    }
  }

  async loadElement(element) {
    const src = element.dataset.src;
    const component = element.dataset.component;

    if (src) {
      // Lazy load images
      element.src = src;
      element.classList.add('loaded');
    }

    if (component) {
      // Lazy load components
      const { default: Component } = await import(`./components/${component}.js`);
      new Component(element);
    }
  }
}

// Initialize lazy loading
new LazyLoader('[data-lazy]');
new LazyLoader('[data-component]');
```

**Service Worker Integration**

```javascript
// Advanced service worker for Stati sites
const CACHE_NAME = 'stati-v1';
const OFFLINE_PAGE = '/offline/';

const CRITICAL_RESOURCES = ['/', '/src/critical.css', '/src/main.js', OFFLINE_PAGE];

const CACHE_STRATEGIES = {
  pages: 'stale-while-revalidate',
  assets: 'cache-first',
  api: 'network-first',
};

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(CRITICAL_RESOURCES)));
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Route-based caching strategies
  if (url.pathname.endsWith('.html') || url.pathname === '/') {
    event.respondWith(staleWhileRevalidate(request));
  } else if (url.pathname.startsWith('/assets/')) {
    event.respondWith(cacheFirst(request));
  } else if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request));
  }
});
```

## SEO and Metadata

### Advanced Meta Tags

```eta
<head>
  <!-- Basic SEO -->
  <title><%= it.title ? `${it.title} | ${it.site.title}` : it.site.title %></title>
  <meta name="description" content="<%= it.description || it.site.description %>">
  <link rel="canonical" href="<%= it.site.baseUrl + it.url %>">

  <!-- Open Graph -->
  <meta property="og:type" content="<%= it.type || 'website' %>">
  <meta property="og:title" content="<%= it.title || it.site.title %>">
  <meta property="og:description" content="<%= it.description || it.site.description %>">
  <meta property="og:url" content="<%= it.site.baseUrl + it.url %>">
  <meta property="og:site_name" content="<%= it.site.title %>">

  <% if (it.image) { %>
  <meta property="og:image" content="<%= it.site.baseUrl + it.image %>">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <% } %>

  <!-- Twitter Cards -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="<%= it.title || it.site.title %>">
  <meta name="twitter:description" content="<%= it.description || it.site.description %>">
  <% if (it.site.social && it.site.social.twitter) { %>
  <meta name="twitter:site" content="<%= it.site.social.twitter %>">
  <% } %>

  <!-- Schema.org JSON-LD -->
  <script type="application/ld+json">
  <%
  const schema = {
    "@context": "https://schema.org",
    "@type": it.schemaType || "WebPage",
    "name": it.title || it.site.title,
    "description": it.description || it.site.description,
    "url": it.site.baseUrl + it.url
  };

  if (it.author) {
    schema.author = {
      "@type": "Person",
      "name": it.author
    };
  }

  if (it.date) {
    schema.datePublished = it.date;
    schema.dateModified = it.lastModified || it.date;
  }
  %>
  <%~ JSON.stringify(schema, null, 2) %>
  </script>
</head>
```

### Sitemap Generation

```javascript
// Advanced sitemap with priority and change frequency
export default defineConfig({
  hooks: {
    async afterBuild(pages) {
      const sitemap = generateAdvancedSitemap(pages);
      fs.writeFileSync('dist/sitemap.xml', sitemap);

      // Generate sitemap index for large sites
      if (pages.length > 1000) {
        const sitemapIndex = generateSitemapIndex(pages);
        fs.writeFileSync('dist/sitemap-index.xml', sitemapIndex);
      }
    },
  },
});

function generateAdvancedSitemap(pages) {
  const entries = pages
    .map((page) => {
      const priority = calculatePriority(page);
      const changefreq = calculateChangeFreq(page);
      const lastmod = page.lastModified || page.date || new Date().toISOString();

      return `  <url>
    <loc>${page.site.baseUrl}${page.url}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>`;
}

function calculatePriority(page) {
  if (page.url === '/') return '1.0';
  if (page.url.startsWith('/blog/') && !page.url.includes('/page/')) return '0.8';
  if (page.featured) return '0.9';
  return '0.6';
}

function calculateChangeFreq(page) {
  if (page.url === '/') return 'daily';
  if (page.url.startsWith('/blog/')) return 'weekly';
  if (page.type === 'docs') return 'monthly';
  return 'yearly';
}
```

### RSS and Feeds

```javascript
// Multi-format feed generation
import RSS from 'rss';
import { Feed } from 'feed';

export default defineConfig({
  hooks: {
    async afterBuild(pages) {
      const posts = pages
        .filter((page) => page.url.startsWith('/blog/'))
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 20);

      // RSS 2.0
      await generateRSS(posts);

      // Atom 1.0
      await generateAtom(posts);

      // JSON Feed
      await generateJSONFeed(posts);
    },
  },
});

async function generateRSS(posts) {
  const feed = new RSS({
    title: site.title,
    description: site.description,
    feed_url: `${site.baseUrl}/rss.xml`,
    site_url: site.baseUrl,
    language: 'en',
    pubDate: new Date(),
    ttl: 60,
  });

  posts.forEach((post) => {
    feed.item({
      title: post.title,
      description: post.description,
      url: site.baseUrl + post.url,
      date: new Date(post.date),
      categories: post.tags || [],
      author: post.author,
    });
  });

  fs.writeFileSync('dist/rss.xml', feed.xml());
}
```

## Complex Deployment Scenarios

### Multi-Environment Configuration

```javascript
// Environment-specific configurations
const environments = {
  development: {
    site: {
      baseUrl: 'http://localhost:3000',
      analytics: false,
    },
    dev: {
      port: 3000,
      open: true,
    },
  },

  staging: {
    site: {
      baseUrl: 'https://staging.example.com',
      analytics: true,
      robots: 'noindex',
    },
    build: {
      sourcemap: true,
    },
  },

  production: {
    site: {
      baseUrl: 'https://example.com',
      analytics: true,
    },
    build: {
      minify: true,
      sourcemap: false,
    },
  },
};

const env = process.env.NODE_ENV || 'development';
const config = environments[env];

export default defineConfig(config);
```

### CDN Integration

```javascript
// CDN asset optimization
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        // CDN-friendly asset naming
        assetFileNames: (assetInfo) => {
          const extType = assetInfo.name.split('.').pop();
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(extType)) {
            return `images/[name]-[hash][extname]`;
          }
          if (/css/i.test(extType)) {
            return `css/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        },
      },
    },
  },

  hooks: {
    afterBuild(stats) {
      // Generate CDN manifest
      const manifest = generateCDNManifest(stats.assets);
      fs.writeFileSync('dist/cdn-manifest.json', JSON.stringify(manifest));
    },
  },
});
```

### Edge Deployment

```javascript
// Edge-optimized configuration
export default defineConfig({
  // Generate edge functions
  hooks: {
    afterBuild() {
      generateEdgeFunctions();
    },
  },
});

function generateEdgeFunctions() {
  // Netlify Edge Functions
  const netlifyFunction = `
export default async (request, context) => {
  const url = new URL(request.url);

  // A/B testing
  if (Math.random() < 0.5) {
    url.pathname = '/experiments' + url.pathname;
  }

  // Geolocation-based redirects
  const country = context.geo?.country;
  if (country === 'GB') {
    url.pathname = '/uk' + url.pathname;
  }

  return context.rewrite(url);
};
`;

  fs.writeFileSync('netlify/edge-functions/main.js', netlifyFunction);

  // Vercel Edge Functions
  const vercelFunction = `
export default function middleware(request) {
  const { pathname } = request.nextUrl;

  // Bot detection
  const userAgent = request.headers.get('user-agent');
  if (isBot(userAgent)) {
    return new Response(generateStaticHTML(pathname), {
      headers: { 'content-type': 'text/html' }
    });
  }

  return NextResponse.next();
}
`;

  fs.writeFileSync('middleware.js', vercelFunction);
}
```

## Internationalization (i18n)

### Multi-language Setup

```javascript
// i18n configuration
export default defineConfig({
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'es', 'fr', 'de'],

    // Locale-specific routing
    routing: {
      strategy: 'prefix', // or 'domain'
      prefixDefault: false,
    },
  },

  // Generate locale-specific builds
  hooks: {
    beforeBuild(context) {
      context.locales.forEach((locale) => {
        generateLocaleContent(locale);
      });
    },
  },
});
```

### Content Translation

```markdown
## <!-- Content with translations -->

title:
en: 'Welcome to Stati'
es: 'Bienvenido a Stati'
fr: 'Bienvenue à Stati'
description:
en: 'TypeScript-first static site generator'
es: 'Generador de sitios estáticos basado en TypeScript'
fr: 'Générateur de site statique basé sur TypeScript'

---

# Multi-language content handling
```

```eta
<!-- Template i18n helpers -->
<%
function t(key, locale = it.locale) {
  const translations = it.translations[locale] || it.translations.en;
  return translations[key] || key;
}

function localizedUrl(url, locale) {
  if (locale === 'en') return url;
  return `/${locale}${url}`;
}
%>

<h1><%= t('welcome') %></h1>
<p><%= t('description') %></p>

<!-- Language switcher -->
<nav class="language-switcher">
  <% it.site.locales.forEach(locale => { %>
    <a href="<%= localizedUrl(it.url, locale) %>"
       class="<%= locale === it.locale ? 'active' : '' %>">
      <%= locale.toUpperCase() %>
    </a>
  <% }); %>
</nav>
```

## Error Handling and Monitoring

### Advanced Error Handling

```javascript
// Comprehensive error handling
export default defineConfig({
  hooks: {
    beforeRender(page) {
      try {
        validatePageData(page);
      } catch (error) {
        handlePageError(error, page);
      }
    },
  },

  // Error recovery strategies
  errorHandling: {
    // Missing templates
    missingTemplate: 'fallback', // 'error' | 'fallback' | 'ignore'

    // Invalid front matter
    invalidFrontMatter: 'warn', // 'error' | 'warn' | 'ignore'

    // Broken links
    brokenLinks: 'warn', // 'error' | 'warn' | 'ignore'
  },
});

function validatePageData(page) {
  if (!page.title) {
    throw new Error(`Missing title in ${page.path}`);
  }

  if (!page.description && page.url !== '/') {
    console.warn(`Missing description in ${page.path}`);
  }

  // Validate required fields
  const requiredFields = ['title', 'date'];
  if (page.url.startsWith('/blog/')) {
    requiredFields.forEach((field) => {
      if (!page[field]) {
        throw new Error(`Missing ${field} in blog post ${page.path}`);
      }
    });
  }
}
```

### Build Monitoring

```javascript
// Build performance monitoring
export default defineConfig({
  monitoring: {
    enabled: process.env.NODE_ENV === 'production',
    webhook: process.env.MONITORING_WEBHOOK,
  },

  hooks: {
    async afterBuild(stats) {
      // Performance monitoring
      const metrics = {
        buildTime: stats.buildTime,
        pageCount: stats.pageCount,
        cacheHitRate: stats.cacheHitRate,
        assetSize: stats.totalSize,
        timestamp: new Date().toISOString(),
      };

      // Send to monitoring service
      if (config.monitoring.enabled) {
        await sendMetrics(metrics);
      }

      // Performance alerts
      if (stats.buildTime > 30000) {
        // 30 seconds
        console.warn('Build time exceeded threshold');
      }

      if (stats.cacheHitRate < 0.7) {
        // 70%
        console.warn('Cache hit rate below threshold');
      }
    },
  },
});
```

## Testing and Quality Assurance

### Automated Testing

```javascript
// Integration with testing frameworks
export default defineConfig({
  hooks: {
    afterBuild(stats) {
      if (process.env.RUN_TESTS) {
        runTestSuite();
      }
    },
  },
});

async function runTestSuite() {
  // HTML validation
  await validateHTML();

  // Link checking
  await checkLinks();

  // Performance testing
  await performanceAudit();

  // Accessibility testing
  await accessibilityAudit();
}
```

### Content Validation

```javascript
// Content quality checks
function validateContent(pages) {
  const issues = [];

  pages.forEach((page) => {
    // SEO checks
    if (!page.title) {
      issues.push(`Missing title: ${page.path}`);
    }

    if (!page.description) {
      issues.push(`Missing description: ${page.path}`);
    }

    if (page.title && page.title.length > 60) {
      issues.push(`Title too long: ${page.path}`);
    }

    // Content quality
    const wordCount = countWords(page.content);
    if (wordCount < 100) {
      issues.push(`Low word count (${wordCount}): ${page.path}`);
    }

    // Image optimization
    const images = extractImages(page.content);
    images.forEach((img) => {
      if (!img.alt) {
        issues.push(`Missing alt text: ${img.src} in ${page.path}`);
      }
    });
  });

  return issues;
}
```

These advanced topics showcase Stati's flexibility and power for building sophisticated static sites. Whether you're optimizing for performance, implementing complex deployment strategies, or building multi-language sites, Stati provides the tools and extensibility you need.

For more specific implementation details, refer to the [API Reference](/api/) or explore the [Examples](/examples/) section for complete working implementations.
