---
title: 'SEO & Sitemap'
description: Complete guide to SEO metadata generation, sitemap, and robots.txt configuration in Stati
layout: layout.eta
order: 6
---

# SEO Configuration

Stati provides comprehensive SEO support with automatic metadata generation, sitemap creation, and robots.txt configuration. The SEO features are designed to work automatically with minimal configuration while offering granular control when needed.

## Table of Contents

- [Automatic SEO Injection](#automatic-seo-injection)
- [Manual SEO Generation](#manual-seo-generation)
- [SEO Configuration Options](#seo-configuration-options)
- [Frontmatter SEO Fields](#frontmatter-seo-fields)
- [Sitemap Configuration](#sitemap-configuration)
- [Robots.txt Configuration](#robots.txt-configuration)
- [SEO Tag Types](#seo-tag-types)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Automatic SEO Injection

By default, Stati automatically injects SEO metadata into all pages during build. This requires **zero configuration** and works out of the box.

### How It Works

1. Stati analyzes your rendered HTML before writing it to disk
2. Detects any existing SEO tags in the `<head>` section
3. Generates missing SEO metadata based on page content and configuration
4. Injects the generated tags before `</head>`

### What Gets Generated

When auto-injection is enabled (default), Stati automatically generates:

- **Title tag** - From page title or site title
- **Meta description** - From page description or excerpt
- **Meta keywords** - From page tags or keywords
- **Canonical URL** - Based on page URL and site base URL
- **Author meta tag** - From page author or site default author
- **Robots meta tag** - Based on page or site robots configuration
- **Open Graph tags** - For social media sharing (og:title, og:description, og:image, etc.)
- **Twitter Card tags** - For Twitter sharing
- **Structured Data** - JSON-LD schema when configured in frontmatter

### Disabling Auto-Injection

To disable automatic SEO injection globally:

```typescript
// stati.config.ts
import { defineConfig } from '@stati/core';

export default defineConfig({
  seo: {
    autoInject: false, // Disable automatic SEO injection
  },
});
```

## Manual SEO Generation

For complete control, you can manually generate SEO tags in your templates using the `stati.generateSEO()` helper.

### Basic Usage

Generate all SEO tags:

```html
<head>
  <%~ stati.generateSEO(stati) %>
  <!-- Your custom tags here -->
</head>
```

### Selective Generation

Generate only specific SEO tags using tag type strings:

```html
<head>
  <%~ stati.generateSEO(stati, ['title', 'description', 'canonical']) %>
  <!-- Add custom Open Graph tags -->
  <meta property="og:custom" content="value">
</head>
```

### Available Tag Types

- `'title'` or `SEOTagType.Title` - Title tag
- `'description'` or `SEOTagType.Description` - Meta description
- `'keywords'` or `SEOTagType.Keywords` - Meta keywords
- `'author'` or `SEOTagType.Author` - Author meta tag
- `'robots'` or `SEOTagType.Robots` - Robots meta tag
- `'canonical'` or `SEOTagType.Canonical` - Canonical link
- `'opengraph'` or `SEOTagType.OpenGraph` - All Open Graph tags
- `'twitter'` or `SEOTagType.Twitter` - All Twitter Card tags
- `'structuredData'` or `SEOTagType.StructuredData` - JSON-LD structured data

## SEO Configuration Options

Configure SEO behavior in your `stati.config.ts`:

```typescript
// stati.config.ts
import { defineConfig } from '@stati/core';

export default defineConfig({
  seo: {
    // Enable/disable automatic SEO injection (default: true)
    autoInject: true,

    // Default author for all pages
    defaultAuthor: {
      name: 'John Doe',
      email: 'john@example.com',
      url: 'https://johndoe.com',
    },

    // Enable debug logging (default: false)
    debug: false,
  },
});
```

## Frontmatter SEO Fields

Customize SEO metadata for individual pages using frontmatter:

### Basic SEO Fields

```markdown
---
title: 'SEO & Sitemap'
description: 'Configure SEO settings, meta tags, and sitemap generation.'
order: 6
---
```

### Open Graph Configuration

```markdown
---
title: My Blog Post
seo:
  openGraph:
    title: Custom OG Title
    description: Custom OG description
    type: article
    image:
      url: https://example.com/image.jpg
      alt: Image description
      width: 1200
      height: 630
    siteName: My Site
    locale: en_US
    article:
      publishedTime: 2025-01-15T10:00:00Z
      modifiedTime: 2025-01-20T15:30:00Z
      author: Jane Doe
      section: Technology
      tags: [web, development, seo]
---
```

### Twitter Card Configuration

```markdown
---
title: My Blog Post
seo:
  twitter:
    card: summary_large_image
    site: '@mysite'
    creator: '@janedoe'
    title: Custom Twitter title
    description: Custom Twitter description
    image: https://example.com/twitter-image.jpg
    imageAlt: Twitter card image description
---
```

### Structured Data (Schema.org)

```markdown
---
title: Product Page
seo:
  structuredData:
    '@context': https://schema.org
    '@type': Product
    name: Amazing Product
    description: The best product ever
    image: https://example.com/product.jpg
    brand:
      '@type': Brand
      name: My Brand
    offers:
      '@type': Offer
      price: 29.99
      priceCurrency: USD
---
```

### Robots Configuration

```markdown
---
title: My Page
seo:
  robots:
    index: true           # Allow indexing (default: true)
    follow: true          # Allow following links (default: true)
    archive: true         # Allow archiving
    snippet: true         # Allow snippets in search results
    imageindex: true      # Allow indexing images
    maxSnippet: 160       # Maximum snippet length
    maxImagePreview: large # Image preview size: none, standard, large
    maxVideoPreview: -1   # Video preview duration (-1 = no limit)
---
```

## Sitemap Configuration

Stati can automatically generate XML sitemaps for your site.

### Enable Sitemap Generation

```typescript
// stati.config.ts
import { defineConfig } from '@stati/core';

export default defineConfig({
  site: {
    baseUrl: 'https://example.com', // Required for absolute URLs in sitemap
  },
  sitemap: {
    enabled: true,
  },
});
```

### Advanced Sitemap Options

```typescript
// stati.config.ts
import { defineConfig } from '@stati/core';

export default defineConfig({
  site: {
    baseUrl: 'https://example.com', // Required for absolute URLs
  },
  sitemap: {
    enabled: true,

    // Default priority for all pages (0.0 to 1.0)
    defaultPriority: 0.5,

    // Default change frequency
    defaultChangeFreq: 'monthly',

    // Exclude pages matching glob patterns
    excludePatterns: ['/draft/**', '/admin/**'],

    // Include only pages matching glob patterns (if specified)
    includePatterns: ['/blog/**', '/docs/**'],

    // Filter pages to include in sitemap
    filter: (page) => {
      // Exclude draft pages
      return !page.frontMatter.draft;
    },

    // Transform URLs before adding to sitemap
    transformUrl: (url, page, config) => {
      // Add trailing slash
      return url.endsWith('/') ? url : `${url}/`;
    },

    // Transform individual sitemap entries
    transformEntry: (entry, page) => {
      // Customize entry or return null to exclude
      if (page.frontMatter.exclude) {
        return null; // Exclude this entry
      }
      return {
        ...entry,
        priority: page.frontMatter.important ? 1.0 : entry.priority,
      };
    },

    // Priority rules based on URL patterns
    priorityRules: [
      { pattern: '/', priority: 1.0 },
      { pattern: '/blog/**', priority: 0.8 },
      { pattern: '/docs/**', priority: 0.9 },
    ],

    // Generate sitemap index for multiple sitemaps (default: false)
    generateIndex: false,
  },
});
```

### Per-Page Sitemap Configuration

Control sitemap behavior for individual pages using frontmatter:

```markdown
---
title: My Page
sitemap:
  exclude: false        # Exclude from sitemap (default: false)
  priority: 0.8         # Priority (0.0 to 1.0)
  changefreq: weekly    # Change frequency
  lastmod: 2025-01-20   # Last modification date
---
```

### Change Frequency Values

- `always` - Changes on every access
- `hourly` - Changes hourly
- `daily` - Changes daily (good for news/blogs)
- `weekly` - Changes weekly (good for general content)
- `monthly` - Changes monthly (default)
- `yearly` - Changes yearly (good for static content)
- `never` - Archived content that never changes

## Robots.txt Configuration

Generate a `robots.txt` file to control search engine crawling.

### Enable Robots.txt

```typescript
// stati.config.ts
import { defineConfig } from '@stati/core';

export default defineConfig({
  robots: {
    enabled: true,
  },
});
```

### Advanced Robots.txt Options

```typescript
// stati.config.ts
import { defineConfig } from '@stati/core';

export default defineConfig({
  robots: {
    enabled: true,

    // Disallow specific paths
    disallow: [
      '/admin/',
      '/private/',
      '/api/',
    ],

    // Explicitly allow paths (useful with disallow wildcards)
    allow: [
      '/api/public/',
    ],

    // Crawl delay in seconds (be careful with this)
    crawlDelay: undefined,

    // Reference to sitemap (automatically added if sitemap is enabled)
    sitemap: 'https://example.com/sitemap.xml',

    // Custom lines to add to robots.txt
    customLines: [
      'User-agent: Googlebot',
      'Disallow: /nogooglebot/',
      '',
      'User-agent: *',
      'Allow: /',
    ],
  },
});
```

### Example robots.txt Output

With the above configuration, Stati generates:

```
User-agent: *
Allow: /
Disallow: /admin/
Disallow: /private/
Disallow: /api/
Allow: /api/public/

Sitemap: https://example.com/sitemap.xml
```

## SEO Tag Types

Stati supports nine types of SEO tags. Understanding these helps with selective generation and granular override.

### Tag Type Groups

Some tag types are **grouped**, meaning if you manually add any tag from a group, Stati skips auto-generating **all** tags in that group:

- **Open Graph Group**: If any `og:*` tag exists, all Open Graph tags are skipped
- **Twitter Group**: If any `twitter:*` tag exists, all Twitter Card tags are skipped

This prevents duplicate or conflicting tags.

### Individual Tag Types

1. **Title** - `<title>` tag
2. **Description** - `<meta name="description">`
3. **Keywords** - `<meta name="keywords">`
4. **Author** - `<meta name="author">`
5. **Robots** - `<meta name="robots">`
6. **Canonical** - `<link rel="canonical">`
7. **OpenGraph** - All `<meta property="og:*">` tags (grouped)
8. **Twitter** - All `<meta name="twitter:*">` tags (grouped)
9. **StructuredData** - `<script type="application/ld+json">` (JSON-LD)

## Best Practices

### 1. Use Meaningful Titles

```markdown
---
title: Complete Guide to SEO in Static Sites | Stati Docs
description: Learn how to optimize your static site for search engines with Stati's powerful SEO features
---
```

### 2. Write Compelling Descriptions

Keep descriptions between 50-160 characters for optimal search result display.

### 3. Set Priorities Wisely

Use sitemap priority to indicate relative importance within your site:

- **1.0** - Homepage, most important pages
- **0.8** - Main section pages, popular content
- **0.5** - Regular pages (default)
- **0.3** - Less important pages
- **0.1** - Rarely accessed pages

### 4. Use Appropriate Change Frequencies

Match change frequency to actual update patterns to help search engines crawl efficiently.

### 5. Include Open Graph Images

Always include Open Graph images for better social media sharing:

```markdown
---
seo:
  openGraph:
    image:
      url: https://example.com/og-image.jpg
      alt: Descriptive alt text
      width: 1200
      height: 630
---
```

Recommended dimensions: **1200 x 630 pixels**.

### 6. Use Structured Data

Add structured data for rich search results:

```markdown
---
seo:
  structuredData:
    '@context': https://schema.org
    '@type': Article
    headline: Your Article Title
    datePublished: 2025-01-15
    author:
      '@type': Person
      name: Jane Doe
---
```

### 7. Test Your SEO

Use these tools to validate your SEO implementation:

- [Google Search Console](https://search.google.com/search-console)
- [Google Rich Results Test](https://search.google.com/test/rich-results)
- [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)
- [Twitter Card Validator](https://cards-dev.twitter.com/validator)

## Troubleshooting

### Why aren't my SEO tags being injected?

**Check these common issues:**

1. **Auto-injection disabled**: Verify `seo.autoInject` is `true` (default)
2. **Tags already exist**: Stati skips tags that already exist in your HTML
3. **Invalid frontmatter**: Check for YAML syntax errors
4. **Missing `</head>`**: Auto-injection requires a closing `</head>` tag

### How do I debug SEO generation?

Enable debug mode to see detailed logs:

```typescript
// stati.config.ts
export default defineConfig({
  seo: {
    debug: true, // Enable detailed SEO logging
  },
});
```

### Why are some tags missing?

**Common reasons:**

- **Group behavior**: Adding any Open Graph tag manually skips all OG tags
- **Validation errors**: Invalid data (e.g., malformed URLs) causes tags to be skipped
- **Missing data**: No source data available (e.g., no page description)

### How do I override specific tags?

Use **hybrid mode** - keep auto-injection enabled and add manual tags for specific fields:

```html
<head>
  <!-- Manual title overrides auto-generated title -->
  <title>Custom Title</title>

  <!-- All other tags are auto-generated -->
</head>
```

### Configuration validation errors

Stati validates SEO configuration at build time. Common errors:

- **Invalid priority**: Must be between 0.0 and 1.0
- **Invalid canonical URL**: Must be a valid URL format
- **Structured data too large**: Should be under 100KB

### Performance concerns

For large sites (10,000+ pages):

- Sitemap generation is optimized and handles large sites efficiently
- Auto-injection adds minimal overhead (~1-2ms per page)
- Consider using `sitemap.filter` to exclude unnecessary pages
- Use `sitemap.maxUrlsPerFile` with `generateIndex: true` for very large sites

## Next Steps

- [SEO Usage Scenarios](/advanced/seo-usage-scenarios) - Learn different approaches to using SEO in your project
- [API Reference](/api/seo) - Detailed API documentation for SEO functions and types
