---
title: 'SEO and sitemap'
description: Complete guide to SEO metadata generation, sitemap, and robots.txt configuration in Stati
order: 6
seo:
  title: 'SEO and sitemap configuration'
  structuredData:
    "@context": "https://schema.org"
    "@type": "TechArticle"
    "headline": "SEO Configuration in Stati"
    "description": "Complete guide to SEO metadata generation, sitemap, and robots.txt configuration in Stati."
    "about":
      - "SEO"
      - "meta tags"
      - "sitemap"
    "proficiencyLevel": "Intermediate"
---

# SEO and sitemap

Stati provides comprehensive SEO support with automatic metadata generation, sitemap creation, and robots.txt configuration. The SEO features are designed to work automatically with minimal configuration while offering granular control when needed.

## Automatic SEO injection

By default, Stati automatically injects SEO metadata into all pages during build. This requires **zero configuration** and works out of the box.

### How it works

1. Stati analyzes your rendered HTML before writing it to disk
2. Detects any existing SEO tags in the `<head>` section
3. Generates missing SEO metadata based on page content and configuration
4. Injects the generated tags before `</head>`

### What gets generated

When auto-injection is enabled (default), Stati automatically generates:

- **Title tag** - From `seo.title`, the page `title`, or the site title
- **Meta description** - From `seo.description`, the page `description`, or `site.description`
- **Meta keywords** - From `seo.keywords`, or the page `tags`
- **Canonical URL** - `seo.canonical`, or the page URL on `site.baseUrl`
- **Author meta tag** - From `seo.author`, or `seo.defaultAuthor` in the config
- **Robots meta tag** - Only when the page sets `seo.robots` or `seo.noindex`, and `noindex` on [the 404 page](/core-concepts/routing#the-404-page)
- **Open Graph tags** - For social media sharing (og:title, og:description, og:image, etc.), with `og:locale` from `site.defaultLocale` and article tags on the pages `seo.articles` matches
- **Twitter Card tags** - For Twitter sharing, with `twitter:site` and `twitter:creator` from the handles in the config
- **Structured Data** - JSON-LD schema when configured in front matter

### Disabling auto-injection

To disable automatic SEO injection globally:

```typescript
// stati.config.ts (excerpt)
import { defineConfig } from '@stati/core';

export default defineConfig({
  // site: { … },
  seo: {
    autoInject: false, // Disable automatic SEO injection
  },
});
```

## Manual SEO generation

For complete control, you can generate SEO tags in your templates with Stati's own `stati.generateSEO()`.

### Basic usage

Generate all SEO tags:

```html
<head>
  <%~ stati.generateSEO() %>
  <!-- Your custom tags here -->
</head>
```

### Selective generation

Generate only specific SEO tags using tag type strings:

```html
<head>
  <%~ stati.generateSEO(['title', 'description', 'canonical']) %>
  <!-- Add custom Open Graph tags -->
  <meta property="og:custom" content="value">
</head>
```

### Available tag types

In templates, pass the strings. The `SEOTagType` enum is for TypeScript code that calls the SEO functions directly; import it from `@stati/core/types`.

- `'title'` or `SEOTagType.Title` - Title tag
- `'description'` or `SEOTagType.Description` - Meta description
- `'keywords'` or `SEOTagType.Keywords` - Meta keywords
- `'author'` or `SEOTagType.Author` - Author meta tag
- `'robots'` or `SEOTagType.Robots` - Robots meta tag
- `'canonical'` or `SEOTagType.Canonical` - Canonical link
- `'opengraph'` or `SEOTagType.OpenGraph` - All Open Graph tags
- `'twitter'` or `SEOTagType.Twitter` - All Twitter Card tags
- `'structuredData'` or `SEOTagType.StructuredData` - JSON-LD structured data

## SEO configuration options

Configure SEO behavior in your `stati.config.ts`:

```typescript
// stati.config.ts
import { defineConfig } from '@stati/core';

export default defineConfig({
  // site: { … },
  seo: {
    // Enable/disable automatic SEO injection (default: true)
    autoInject: true,

    // Default author for all pages
    defaultAuthor: {
      name: 'John Doe',
      email: 'john@example.com',
      url: 'https://johndoe.com', // article:author on article pages
      twitter: '@johndoe', // twitter:creator; the @ is optional
    },

    // The site's own handle, printed as twitter:site; the @ is optional
    twitter: {
      site: '@example',
    },

    // Pages that are articles: og:type article, plus article:* tags from the page
    articles: {
      include: ['/blog/*'],
      exclude: [],
    },

    // Enable debug logging (default: false)
    debug: false,
  },
});
```

## Site-wide defaults

A few Open Graph, Twitter and robots values are the same on every page, or follow from the page itself. Stati fills them in from the config and the page, so no page has to repeat them. Front matter still wins, value by value.

| Tag | From |
| --- | --- |
| `og:locale` | `site.defaultLocale`, converted to Open Graph form |
| `twitter:site` | `seo.twitter.site` |
| `twitter:creator` | The `twitter` handle of the page's own `seo.author`, then of `seo.defaultAuthor` |
| `og:type` | `article` on the pages `seo.articles` matches, `website` elsewhere |
| `article:published_time` | The page's publish date (`publishedAt`, `published`, `date` or `createdAt`), on article pages |
| `article:modified_time` | Front matter `updated`, on article pages |
| `article:tag` | One per front matter `tags` entry, on article pages |
| `article:author` | The `url` of the page's own `seo.author`, then of `seo.defaultAuthor`, on article pages |
| `robots` | `noindex` (`seo.noindex: true`) on [the 404 page](/core-concepts/routing#the-404-page), unless it sets `seo.noindex`, or a `seo.robots` value that says whether to index it (`index`, `noindex`, `all`, `none`, or `index:` in the object form) |

### Locale

`site.defaultLocale` is a BCP 47 tag such as `en-US`, the form `<html lang>` needs. Open Graph writes locales as `language_TERRITORY`, so Stati converts it: `en-US` becomes `en_US`, `pt-br` becomes `pt_BR`, and `zh-Hant-TW` becomes `zh_TW` (the script is dropped). A tag without a region, such as `en`, has no Open Graph form: `og:locale` is left out, and Open Graph assumes `en_US`. With `seo.debug` on, Stati warns about it. A page's `seo.openGraph.locale` is printed as written.

### Twitter handles

`twitter:creator` takes an `@username`, so it comes only from a handle, never from an author's name: without a handle, no `twitter:creator` is printed. Write handles with or without `@`; Stati prints them with one. A page that names its own `seo.author` never gets the default author's handle or URL:

```markdown
---
title: Guest post
seo:
  author:
    name: Grace Hopper
    url: https://grace.example.com
    twitter: '@grace'
---
```

A `seo.author` that is a plain name gives the page no `twitter:creator` and no `article:author`.

### Article pages

`seo.articles.include` and `exclude` are glob patterns matched against the page URL, with the same rules as [bundle targeting](/configuration/typescript#pattern-matching): a pattern must match the whole URL, so `/blog/*` matches `/blog/hello` but not the `/blog` index page, and `exclude` wins over `include`. Generated pages (from a `[param].md` template or `collections.generate`) and every page of a paginated listing never match. Without `seo.articles`, no page is an article unless its front matter sets `type: article`.

On a matching page, Stati fills in each value the front matter leaves out. A page that sets only `section` still gets its dates and tags:

```markdown
---
title: Grid or flexbox
publishedAt: 2026-01-10
updated: 2026-02-01
tags: [css, layout]
seo:
  openGraph:
    article:
      section: CSS
---
```

A matching page whose front matter sets another `type` gets no article tags.

### How defaults reach the page

Stati writes these values into each page's `seo` front matter after the `beforeAll` hook and before rendering. So:

- Values a `beforeAll` hook writes into `seo` win over the defaults.
- A `beforeRender` hook can change what a default comes from, such as `seo.author`, `tags` or the URL: Stati works the defaults out again after it runs. Values the hook sets itself are kept.
- Templates read the same values the head prints, such as `stati.page.seo.openGraph.type`.
- Changing `site.defaultLocale`, a handle or `seo.articles` rebuilds the cached pages it changes, like a front matter edit.

To print these tags from the config, set them here rather than in a layout: one `og:` or `twitter:` tag in the layout's `<head>` turns off Stati's whole Open Graph or Twitter group for that page (see [tag type groups](#tag-type-groups)).

## Frontmatter SEO fields

Customize SEO metadata for individual pages using frontmatter:

### Basic SEO fields

```markdown
---
title: 'SEO & Sitemap'
description: 'Configure SEO settings, meta tags, and sitemap generation.'
order: 6
---
```

### Open Graph configuration

With [`images.og`](/configuration/images#open-graph-images), every page that sets no image gets a generated card, and its `og:image`, `twitter:image` and image size tags are added for you. Set `image: false` under `openGraph` to give a page no image at all.

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
      publishedTime: '2025-01-15T10:00:00Z'
      modifiedTime: '2025-01-20T15:30:00Z'
      author: Jane Doe
      section: Technology
      tags: [web, development, seo]
---
```

> **Quote dates.** YAML turns an unquoted date or timestamp into a date object, and an unquoted `publishedTime` or `modifiedTime` makes the build fail with "text.replace is not a function". Dates inside `structuredData` must be quoted too; unquoted ones are written as `{}`.

Article tags (`article:published_time`, `article:tag` and so on) are only written when `type` is `article`. On the pages [`seo.articles`](#article-pages) matches, the type and the article values the front matter leaves out are filled in from the page. `locale` is printed as written; without it, `og:locale` comes from [`site.defaultLocale`](#locale). Image URLs that start with `/` are made absolute with `site.baseUrl`.

### Twitter card configuration

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

`site` and `creator` are printed as written. Without them, they come from [the handles in the config](#twitter-handles).

### Structured data (Schema.org)

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

### Robots configuration

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

A page that sets `index: false` here, `seo.noindex: true`, or a `seo.robots` string with a `noindex` or `none` directive is left out of the [sitemap](#advanced-sitemap-options).

## Sitemap configuration

Stati can automatically generate XML sitemaps for your site.

> **Production Only**: Sitemaps are only generated during production builds (`stati build`). They are skipped in development mode to improve build performance.

### Enable sitemap generation

```typescript
// stati.config.ts
import { defineConfig } from '@stati/core';

export default defineConfig({
  site: {
    title: 'My Site',
    baseUrl: 'https://example.com', // Used for the absolute URLs in the sitemap
  },
  sitemap: {
    enabled: true,
  },
});
```

### Advanced sitemap options

```typescript
// stati.config.ts
import { defineConfig } from '@stati/core';

export default defineConfig({
  site: {
    title: 'My Site',
    baseUrl: 'https://example.com', // Used for absolute URLs
  },
  sitemap: {
    enabled: true,

    // Default priority for all pages (0.0 to 1.0; 0.5 if not set)
    defaultPriority: 0.5,

    // Default change frequency (no <changefreq> is written if not set)
    defaultChangeFreq: 'monthly',

    // Exclude pages whose URL matches (see "Pattern matching" below)
    excludePatterns: ['/draft', '/admin'],

    // Include only pages whose URL matches (if specified)
    includePatterns: ['/blog', '/docs'],

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

    // Priority rules based on URL patterns (first match wins)
    priorityRules: [
      { pattern: '/', priority: 1.0 },
      { pattern: '/blog/**', priority: 0.8 },
      { pattern: '/docs/**', priority: 0.9 },
    ],
  },
});
```

**Pattern matching.** `excludePatterns`, `includePatterns` and `priorityRules[].pattern` are matched against page URLs such as `/blog/first-post` (`/` for the home page):

- A pattern with `*` or `?` is a glob that must match the whole URL: `/blog/**` matches `/blog/first-post` but not the `/blog` index page.
- A pattern without wildcards matches that URL and everything below it: `/blog` matches `/blog` and `/blog/first-post`, but not `/blog-archive`. The pattern `/` matches only the home page.

Pages with `draft: true` are never in the sitemap (they are not built), so `filter: (page) => !page.frontMatter.draft` is only needed for builds with `--include-drafts`.

Two more kinds of page are left out without a pattern: [the 404 page](/core-concepts/routing#the-404-page), and pages whose robots meta tag says `noindex` (`seo.noindex: true`, `seo.robots: { index: false }`, or a `seo.robots` string with a `noindex` or `none` directive). Search engines report a sitemap URL marked `noindex` as an error. A page that sets `sitemap: { exclude: false }` in front matter stays in despite both (the 404 page also needs `seo.noindex: false`, or it is listed as noindex); `excludePatterns`, `includePatterns` and `filter` still apply to it.

Pages created from a `[param].md` template and the later pages of a paginated listing (`/blog/page/2`) are in the sitemap like any other page. Leave them out with a pattern such as `excludePatterns: ['/blog/page/**']`, `sitemap: { exclude: true }` in the template's front matter, or a `filter` that checks `page.generated` and `page.pagination`.

**Output.** `lastmod` comes from the page's `sitemap.lastmod`, then `updated`, then `date` front matter (not `publishedAt`). Priorities are written with one decimal place, so `0.85` becomes `0.8`. Above 50,000 URLs the sitemap is split into `sitemap-1.xml`, `sitemap-2.xml`, … with `sitemap.xml` as the index; this happens automatically (the `generateIndex` option is not used).

### Per-page sitemap configuration

Control sitemap behavior for individual pages using frontmatter:

```markdown
---
title: My Page
sitemap:
  exclude: false        # true leaves the page out; false keeps a noindex or 404 page in
  priority: 0.8         # Priority (0.0 to 1.0), overrides priorityRules
  changefreq: weekly    # Change frequency
  lastmod: '2025-01-20' # Last modification date
---
```

The sitemap reads only this `sitemap` block; `seo.priority` and `seo.changeFreq` are not used for it. On a page that is neither the 404 page nor marked `noindex`, `exclude: false` is the same as leaving `exclude` out.

### Change frequency values

- `always` - Changes on every access
- `hourly` - Changes hourly
- `daily` - Changes daily (good for news/blogs)
- `weekly` - Changes weekly (good for general content)
- `monthly` - Changes monthly
- `yearly` - Changes yearly (good for static content)
- `never` - Archived content that never changes

## robots.txt configuration

Generate a `robots.txt` file to control search engine crawling.

> **Production Only**: The robots.txt file is only generated during production builds (`stati build`). It is skipped in development mode to improve build performance.

### Enable robots.txt

```typescript
// stati.config.ts
import { defineConfig } from '@stati/core';

export default defineConfig({
  site: { title: 'My Site', baseUrl: 'https://example.com' },
  robots: {
    enabled: true,
  },
});
```

With no rules configured, this writes `User-agent: *` and `Allow: /`. The `Sitemap:` line is only added when you set `robots.sitemap` (see below).

### Advanced robots.txt options

```typescript
// stati.config.ts
import { defineConfig } from '@stati/core';

export default defineConfig({
  // site: { … },
  robots: {
    enabled: true,

    // User agent specific rules
    userAgents: [
      {
        userAgent: 'Googlebot',
        allow: ['/public/'],
        disallow: ['/admin/', '/private/'],
      },
      {
        userAgent: 'Bingbot',
        disallow: ['/admin/'],
      },
    ],

    // Global disallow rules (applies to all user agents)
    disallow: [
      '/admin/',
      '/private/',
      '/api/',
    ],

    // Global allow rules (useful with disallow wildcards)
    allow: [
      '/api/public/',
    ],

    // Crawl delay in seconds, written in the "User-agent: *" group (be careful with this)
    crawlDelay: undefined,

    // Sitemap reference: a URL, or true for <baseUrl>/sitemap.xml (not added when unset)
    sitemap: 'https://example.com/sitemap.xml',

    // Custom lines to add to robots.txt
    customLines: [
      'User-agent: AnotherBot',
      'Disallow: /restricted/',
    ],
  },
});
```

### Example robots.txt output

With the above configuration, Stati generates:

```txt
User-agent: Googlebot
Allow: /public/
Disallow: /admin/
Disallow: /private/

User-agent: Bingbot
Disallow: /admin/

User-agent: *
Allow: /api/public/
Disallow: /admin/
Disallow: /private/
Disallow: /api/

Sitemap: https://example.com/sitemap.xml

User-agent: AnotherBot
Disallow: /restricted/
```

## SEO tag types

Stati supports nine types of SEO tags. Understanding these helps with selective generation and granular override.

### Tag type groups

Some tag types are **grouped**, meaning if you manually add any tag from a group, Stati skips auto-generating **all** tags in that group:

- **Open Graph Group**: If any `og:*` tag exists, all Open Graph tags are skipped
- **Twitter Group**: If any `twitter:*` tag exists, all Twitter Card tags are skipped

This prevents duplicate or conflicting tags.

### Individual tag types

1. **Title** - `<title>` tag
2. **Description** - `<meta name="description">`
3. **Keywords** - `<meta name="keywords">`
4. **Author** - `<meta name="author">`
5. **Robots** - `<meta name="robots">`
6. **Canonical** - `<link rel="canonical">`
7. **OpenGraph** - All `<meta property="og:*">` tags (grouped)
8. **Twitter** - All `<meta name="twitter:*">` tags (grouped)
9. **StructuredData** - `<script type="application/ld+json">` (JSON-LD)

## Best practices

### 1. Use meaningful titles

```markdown
---
title: Complete Guide to SEO in Static Sites | Stati Docs
description: Learn how to optimize your static site for search engines with Stati's powerful SEO features
---
```

### 2. Write compelling descriptions

Keep descriptions between 50-160 characters for optimal search result display.

### 3. Set priorities wisely

Use sitemap priority to indicate relative importance within your site:

- **1.0** - Homepage, most important pages
- **0.8** - Main section pages, popular content
- **0.5** - Regular pages (default)
- **0.3** - Less important pages
- **0.1** - Rarely accessed pages

### 4. Use appropriate change frequencies

Match change frequency to actual update patterns to help search engines crawl efficiently.

### 5. Include Open Graph images

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

Recommended dimensions: **1200 x 630 pixels** (not enforced by Stati).

### 6. Use structured data

Add structured data for rich search results:

```markdown
---
seo:
  structuredData:
    '@context': https://schema.org
    '@type': Article
    headline: Your Article Title
    datePublished: '2025-01-15'
    author:
      '@type': Person
      name: Jane Doe
---
```

### 7. Test your SEO

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
  // site: { … },
  seo: {
    debug: true, // Enable detailed SEO logging
  },
});
```

### Why are some tags missing?

**Common reasons:**

- **Group behavior**: Adding any Open Graph tag manually skips all OG tags
- **Missing data**: No source data available (e.g., no page description, so no description tags)
- **No `</head>`**: Tags are injected before `</head>`; a layout without it gets none

Validation problems (for example a malformed canonical URL) are logged as warnings, but the tags are still generated with the values you gave.

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

When `seo.autoInject` is on (the default), Stati checks each page's `seo` front matter during the build and logs what it finds; none of these stop the build:

- **Invalid priority** (error): `seo.priority` must be between 0.0 and 1.0
- **Invalid canonical URL** (error): `seo.canonical` must be an absolute `http` or `https` URL
- **Structured data too large** (warning): should be under 100KB
- **Title or description length** (warning)

Errors are always logged; warnings are only logged when `seo.debug` is `true`. With `autoInject` off, nothing is logged: `stati.generateSEO()` does not report these checks.

### Performance concerns

For large sites (10,000+ pages):

- Sitemap generation automatically splits into multiple files, with a sitemap index, above 50,000 URLs
- Auto-injection overhead is minimal during builds
- Consider using `sitemap.filter` to exclude unnecessary pages from sitemap

## Next steps

- [SEO Usage Scenarios](/advanced/seo-usage-scenarios) - Learn different approaches to using SEO in your project
- [SEO API](/api/seo) - Detailed API documentation for SEO functions and types
