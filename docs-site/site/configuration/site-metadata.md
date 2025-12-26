---
title: 'Site Metadata'
description: 'Configure site title, URL, and SEO metadata for your Stati site.'
order: 2
---

# Site Metadata Configuration

Stati provides a streamlined approach to site metadata and SEO. The `site` configuration object contains essential site information, while SEO metadata is managed separately through page frontmatter and the SEO configuration system.

## Site Configuration

The `site` object contains three core properties that define your site's identity:

```javascript
// stati.config.js
import { defineConfig } from '@stati/core';

export default defineConfig({
  site: {
    title: 'My Stati Site',
    baseUrl: 'https://example.com',
    defaultLocale: 'en-US', // Optional
  },
});
```

### Available Properties

#### `title` (required)

The site's title, used in templates and metadata.

```javascript
export default defineConfig({
  site: {
    title: 'My Amazing Blog',
    baseUrl: 'https://blog.example.com',
  },
});
```

Access in templates:

```html
<title><%= stati.page.title %> | <%= stati.site.title %></title>
```

#### `baseUrl` (required)

Base URL for the site, used for absolute URL generation, sitemaps, and canonical links.

```javascript
export default defineConfig({
  site: {
    title: 'My Site',
    baseUrl: 'https://mysite.com', // No trailing slash
  },
});
```

**Important:** Do not include a trailing slash in `baseUrl`.

#### `defaultLocale` (optional)

Default locale for internationalization support.

```javascript
export default defineConfig({
  site: {
    title: 'My Site',
    baseUrl: 'https://example.com',
    defaultLocale: 'en-US',
  },
});
```

Common locale formats:
- `'en-US'` - English (United States)
- `'en-GB'` - English (United Kingdom)
- `'es-ES'` - Spanish (Spain)
- `'fr-FR'` - French (France)
- `'de-DE'` - German (Germany)

#### `description` (optional)

Default site description used as a fallback for meta tags when a page doesn't have its own description.

```javascript
export default defineConfig({
  site: {
    title: 'My Site',
    baseUrl: 'https://example.com',
    description: 'A modern static site built with Stati',
  },
});
```

This description is used as the last fallback in the description chain:

1. Page frontmatter `seo.description`
2. Page frontmatter `description`
3. Site config `description` (this field)

The site description appears in:

- `<meta name="description">` tag
- `<meta property="og:description">` (Open Graph)
- `<meta name="twitter:description">` (Twitter Cards)

## Author Configuration

Author information is configured through the `seo.defaultAuthor` property, not the `site` object:

```javascript
export default defineConfig({
  site: {
    title: 'My Blog',
    baseUrl: 'https://blog.example.com',
  },
  seo: {
    defaultAuthor: {
      name: 'Jane Smith',
      email: 'jane@example.com',
      url: 'https://janesmith.dev',
    },
  },
});
```

**Per-Page Authors:** Override the default author in page frontmatter:

```markdown
---
title: 'My Post'
author:
  name: 'John Doe'
  email: 'john@example.com'
  url: 'https://johndoe.com'
---

# Post Content# Post Content
```

## SEO Metadata

Stati manages SEO metadata through page frontmatter and the SEO configuration system. See the [SEO Configuration](./seo.md) guide for details.

### Page-Level SEO

All SEO metadata is defined in page frontmatter:

```markdown
---
title: 'My Page Title'
description: 'A compelling description for search engines'
keywords: ['seo', 'metadata', 'stati']
author:
  name: 'Jane Smith'
  email: 'jane@example.com'
robots: 'index, follow'
canonical: 'https://example.com/canonical-url'
---

# Page Content
```

### SEO Tag Injection

Stati offers **two approaches** for injecting SEO tags into your pages:

#### 1. Automatic Injection (Default)

By default, Stati **automatically injects SEO tags** during the build process. No template code required:

```javascript
// stati.config.js
export default defineConfig({
  site: {
    title: 'My Site',
    baseUrl: 'https://example.com',
  },
  seo: {
    autoInject: true, // Default: true
  },
});
```

Stati's build system automatically:
- Detects existing SEO tags in your HTML
- Generates missing tags from page frontmatter
- Injects them before `</head>`
- Skips tags that already exist (no duplication)

**Your template needs NO SEO code** - just a standard HTML structure:

```html
<!DOCTYPE html>
<html lang="<%= stati.site.defaultLocale || 'en' %>">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <!-- SEO tags auto-injected here during build -->
  </head>
  <body>
    <%~ stati.content %>
  </body>
</html>
```

#### 2. Manual Injection with `generateSEO()`

For **explicit control over tag placement**, use the `generateSEO()` helper in templates:

```html
<!DOCTYPE html>
<html lang="<%= stati.site.defaultLocale || 'en' %>">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />

    <%~ stati.generateSEO() %>

    <!-- Additional custom meta tags -->
  </head>
  <body>
    <%~ stati.content %>
  </body>
</html>
```

**Selective tag generation:**

```html
<!-- Generate only specific tags -->
<%~ stati.generateSEO(['title', 'description', 'opengraph']) %>

<!-- Generate all standard tags -->
<%~ stati.generateSEO() %>
```

**Note:** When using `generateSEO()` in templates, auto-injection still runs but only adds **missing tags** (no duplication).

**Disable auto-injection** if you want full manual control:

```javascript
export default defineConfig({
  seo: {
    autoInject: false, // Disable automatic injection
  },
});
```

See [SEO API Reference](../api/seo.md) for complete `generateSEO()` documentation.

## Template Usage

Access site configuration in Eta templates:

```html
<!-- Site title -->
<title><%= stati.page.title %> | <%= stati.site.title %></title>

<!-- Base URL for absolute links -->
<link rel="canonical" href="<%= stati.site.baseUrl %><%= stati.page.url %>" />

<!-- Locale -->
<html lang="<%= stati.site.defaultLocale || 'en' %>">

<!-- Author from SEO config (if configured) -->
<% if (stati.page.author) { %>
  <meta name="author" content="<%= stati.page.author.name %>" />
<% } %>
```

## Environment-Specific Configuration

Configure different metadata for different environments:

```javascript
export default defineConfig({
  site: {
    title: 'My Site',
    baseUrl:
      process.env.NODE_ENV === 'production'
        ? 'https://mysite.com'
        : 'http://localhost:3000',
    defaultLocale: 'en-US',
  },
  seo: {
    // Disable auto-injection in development for manual control
    autoInject: process.env.NODE_ENV === 'production',
    debug: process.env.NODE_ENV === 'development',
  },
});
```

## Sitemap and Robots.txt

Configure automated sitemap and robots.txt generation:

```javascript
export default defineConfig({
  site: {
    title: 'My Site',
    baseUrl: 'https://example.com',
  },
  sitemap: {
    enabled: true,
    hostname: 'https://example.com',
  },
  robotsTxt: {
    enabled: true,
    sitemap: true, // Auto-reference sitemap.xml
    userAgents: [
      {
        userAgent: 'Googlebot',
        allow: ['/'],
      },
    ],
  },
});
```

See [SEO Configuration](./seo.md) for complete sitemap and robots.txt options.

## RSS Feeds

Configure RSS feeds for your content:

```javascript
export default defineConfig({
  site: {
    title: 'My Blog',
    baseUrl: 'https://blog.example.com',
  },
  rss: {
    enabled: true,
    feeds: [
      {
        filename: 'feed.xml',
        title: 'My Blog Feed',
        description: 'Latest posts from my blog',
        contentPatterns: ['blog/**/*.md'],
      },
    ],
  },
});
```

See [RSS Configuration](./rss.md) for complete RSS feed options.

## Validation and Testing

### Metadata Validation

Test your metadata using external validation tools:

- [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)
- [Twitter Card Validator](https://cards-dev.twitter.com/validator)
- [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/)
- [Google Rich Results Test](https://search.google.com/test/rich-results)

### SEO Debugging

Enable SEO debug logging:

```javascript
export default defineConfig({
  site: {
    title: 'My Site',
    baseUrl: 'https://example.com',
  },
  seo: {
    debug: true, // Enable detailed SEO generation logs
  },
});
```

## Best Practices

### Site Configuration

1. **Use HTTPS:** Always use HTTPS URLs for `baseUrl` in production
2. **No Trailing Slashes:** Don't include trailing slashes in `baseUrl`
3. **Consistent Title:** Use a clear, descriptive site title
4. **Proper Locale:** Set `defaultLocale` if building multilingual sites

### SEO Metadata

1. **Unique Titles:** Every page should have a unique, descriptive title (50-60 chars)
2. **Meta Descriptions:** Write compelling descriptions under 160 characters
3. **Author Attribution:** Set `seo.defaultAuthor` for blogs and content sites
4. **Canonical URLs:** Use `baseUrl` consistently for canonical links

### Per-Page Frontmatter

1. **Required Fields:** Always include `title` and `description` in frontmatter
2. **Keywords:** Use 3-5 relevant keywords per page
3. **Author Override:** Specify authors per-page for multi-author sites
4. **Robots Control:** Use `robots` frontmatter for page-specific indexing rules

### Testing

1. **Validate Markup:** Use validation tools before deploying
2. **Test Social Sharing:** Preview how links appear on social platforms
3. **Monitor SEO:** Track how your pages appear in search results
4. **Use Debug Mode:** Enable `seo.debug` during development

## Related Configuration

- [SEO Configuration](./seo.md) - Complete SEO setup including Open Graph and Twitter Cards
- [RSS Configuration](./rss.md) - RSS feed generation
- [Sitemap Configuration](./seo.md#sitemap-configuration) - XML sitemap generation
- [Template Configuration](./templates.md) - Access metadata in templates
