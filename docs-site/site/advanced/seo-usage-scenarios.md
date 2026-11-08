---
title: 'SEO scenarios'
description: Learn different strategies for using SEO features in your Stati project, from automatic to fully custom control
order: 2
seo:
  title: 'SEO usage scenarios'
  structuredData:
    "@context": "https://schema.org"
    "@type": "TechArticle"
    "headline": "SEO Usage Scenarios in Stati"
    "description": "Learn different strategies for using SEO features in your Stati project, from automatic to fully custom control."
    "about":
      - "SEO"
      - "Open Graph"
      - "sitemaps"
    "proficiencyLevel": "Intermediate"
---

# SEO scenarios

Five ways to use Stati's SEO features, from automatic injection to writing every tag yourself. Start with Scenario 1, and move to Scenario 3 when some pages need tags of their own.

---

## Scenario 1: Automatic SEO

**Best for:** Projects that want comprehensive SEO with zero configuration and minimal maintenance.

### Configuration

The minimal Stati configuration with automatic SEO:

```typescript
// stati.config.ts
import { defineConfig } from '@stati/core';

export default defineConfig({
  site: {
    title: 'My Site',
    baseUrl: 'https://example.com',
  },
});
```

### How it works

With automatic SEO, a simple page template like this:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body>
  <h1>My Page</h1>
  <p>Welcome to my page content.</p>
</body>
</html>
```

Gets these SEO tags automatically injected:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">

  <!-- Auto-injected by Stati -->
  <title>My Page</title>
  <link rel="canonical" href="https://example.com/my-page">
  <meta property="og:title" content="My Page">
  <meta property="og:url" content="https://example.com/my-page">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="My Site">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="My Page">
</head>
<body>
  <h1>My Page</h1>
  <p>Welcome to my page content.</p>
</body>
</html>
```

**Note:** The title uses only the page title from front matter or config fallbacks. For custom title formats like "Page | Site", use manual templating (see Scenario 3 or 5). Description and other optional meta tags are only generated if specified in front matter or config.

To add a sitemap, see [Sitemap configuration](/configuration/seo#sitemap-configuration).

---

## Scenario 2: Enhanced SEO

**Best for:** Projects that want better SEO without changing templates.

### Overview

Keep automatic injection enabled and enhance SEO through configuration and front matter. This sets SEO values in front matter without touching template code.

### Global configuration

```typescript
// stati.config.ts
import { defineConfig } from '@stati/core';

export default defineConfig({
  site: {
    title: 'My Awesome Site',
    description: 'Building amazing static sites with Stati',
    baseUrl: 'https://example.com',
    defaultLocale: 'en-US', // Printed as og:locale en_US
  },

  seo: {
    autoInject: true, // Keep automatic injection enabled
    defaultAuthor: {
      name: 'Jane Doe',
      url: 'https://janedoe.com', // article:author on article pages
      twitter: '@janedoe', // twitter:creator
    },
    twitter: { site: '@mysite' }, // twitter:site
    // Blog posts are articles: og:type, publish date, updated date and tags
    articles: { include: ['/blog/*'] },
  },

  sitemap: {
    enabled: true,
    defaultPriority: 0.5,
    defaultChangeFreq: 'weekly',
  },

  robots: {
    enabled: true,
    disallow: ['/admin/', '/draft/'],
  },
});
```

### Per-page enhancement

Add SEO front matter to high-value pages. On a page under `/blog/`, `seo.articles` already prints `og:type` as `article`, `article:published_time` from `publishedAt` and one `article:tag` per tag, so the front matter adds only what the page cannot supply:

```markdown
---
title: Complete Guide to Static Sites
description: Learn everything about static site generation with this comprehensive guide
publishedAt: 2025-01-15
tags: [tutorial, static-sites, jamstack]
seo:
  keywords: [static sites, jamstack, web development]
  openGraph:
    image:
      url: https://example.com/images/og-guide.jpg
      alt: Static Site Guide Cover
      width: 1200
      height: 630
    article:
      section: Web Development
  twitter:
    card: summary_large_image
    image: https://example.com/images/twitter-guide.jpg
    imageAlt: Static Site Guide
  structuredData:
    '@context': https://schema.org
    '@type': Article
    headline: Complete Guide to Static Sites
    datePublished: '2025-01-15T10:00:00Z'
    author:
      '@type': Person
      name: Jane Doe
sitemap:
  priority: 0.9
  changefreq: weekly
---

# Complete Guide to Static Sites

Your content here...
```

### Sitemap control

To leave a page out of the sitemap:

```markdown
---
title: Draft Page
sitemap:
  exclude: true  # Exclude from sitemap
---
```

Pages marked `noindex` and the 404 page are left out without it.

---

## Scenario 3: Hybrid mode

**Best for:** Projects that need custom control over specific tags while automating the rest.

### Concept

Keep auto-injection enabled but manually override specific SEO tags when needed. Stati detects existing tags and skips auto-generating them. This gives you fine-grained control where you need it while maintaining automatic fallbacks everywhere else.

The examples here and in the scenarios below show a `site/layout.eta` that writes the whole page, as in the blank starter. If your layouts share a shell with `stati.layout()`, as in the blog, docs and news starters, the tags go in the shell's `<head>`, which those starters keep in `site/partials/head.eta`. See [Sharing a shell](/core-concepts/templates#sharing-a-shell).

### Example 1: Custom title, auto-generate rest

```eta
<!-- site/layout.eta -->
<!DOCTYPE html>
<html>
<head>
  <!-- Manual title with custom format -->
  <title><%= stati.page.title %> - <%= stati.site.title %> | Premium Guides</title>

  <!-- Stati auto-generates: description, canonical, OG tags, Twitter, etc. -->
</head>
<body>
  <%~ stati.content %>
</body>
</html>
```

**Result:**

- Your custom title is used
- All other SEO tags are auto-generated (description, canonical, OG, Twitter, etc.)

### Example 2: Custom OG image, manual OG tags

```eta
<!-- site/layout.eta -->
<!DOCTYPE html>
<html>
<head>
  <!-- Custom OG image tag -->
  <meta property="og:image" content="<%= `${stati.site.baseUrl}/custom-og.jpg` %>">

  <!-- Stati detects OG tag and SKIPS all Open Graph generation -->
  <!-- You must add other OG tags manually -->
  <meta property="og:title" content="<%= stati.page.title %>">
  <meta property="og:description" content="<%= stati.page.description %>">
  <meta property="og:url" content="<%= stati.site.baseUrl + stati.page.url %>">

  <!-- Stati still auto-generates: title, description, canonical, Twitter, etc. -->
</head>
<body>
  <%~ stati.content %>
</body>
</html>
```

### Example 3: Conditional custom tags

```eta
<!-- site/layout.eta -->
<!DOCTYPE html>
<html>
<head>
  <% if (stati.page.customTitle) { %>
    <!-- Use custom title format for specific pages -->
    <title><%= stati.page.customTitle %></title>
  <% } %>

  <% if (stati.page.author) { %>
    <!-- Custom author meta tag -->
    <meta name="author" content="<%= stati.page.author %>">
  <% } %>

  <!-- Stati auto-generates all missing tags -->
</head>
<body>
  <%~ stati.content %>
</body>
</html>
```

### Example 4: Open Graph tags for pages with their own image

In this example, a page can name its own share image with two custom front matter fields:

```yaml
---
title: Release 2.0
shareImage: https://example.com/images/release-2.png
shareImageAlt: The Release 2.0 banner
---
```

The layout writes a complete Open Graph section for those pages:

```eta
<!-- site/layout.eta -->
<!DOCTYPE html>
<html>
<head>
  <% if (stati.page.shareImage) { %>
    <!-- Complete custom Open Graph section -->
    <meta property="og:image" content="<%= stati.page.shareImage %>">
    <meta property="og:image:alt" content="<%= stati.page.shareImageAlt || stati.page.title %>">
    <meta property="og:title" content="<%= stati.page.title %>">
    <meta property="og:description" content="<%= stati.page.description %>">
    <meta property="og:url" content="<%= stati.site.baseUrl + stati.page.url %>">
    <meta property="og:type" content="article">
  <% } %>

  <!-- Stati auto-generates: title, description, canonical, Twitter Card tags -->
</head>
<body>
  <%~ stati.content %>
</body>
</html>
```

On pages with a `shareImage`, the layout writes `og:*` tags, so Stati skips its own Open Graph tags there (see [Tag groups](#tag-groups)). Other pages keep the generated ones.

> **Note:** You only need a layout like this to control the whole Open Graph section. To set just the image, use `seo.openGraph.image` in front matter and Stati writes the tags for you. To generate an image for every page from a template, see [`images.og`](/configuration/images#open-graph-images).

### Tag groups

Auto-injection skips generated tags by group, judging by the tags already in the page's `<head>`:

| Group | Behavior |
|-------|----------|
| **Open Graph** | If **any** `og:*` tag exists, **all** OG tags are skipped |
| **Twitter Cards** | If **any** `twitter:*` tag exists, **all** Twitter tags are skipped |
| **Structured data** | If any `<script type="application/ld+json">` exists, `seo.structuredData` is not printed |
| **Individual Tags** | Title, description, keywords, author, robots, canonical are independent |

So a layout should not add one `og:` or `twitter:` tag just to set a value that is the same on every page, such as `og:locale` or `twitter:site`: it would turn off the whole group, the generated `og:image` included. Set those in the config instead ([site-wide defaults](/configuration/seo#site-wide-defaults)).

---

## Scenario 4: Selective manual control

**Best for:** Projects that want explicit control over which tags are generated.

### Overview

Call `stati.generateSEO()` with specific tag types to control exactly which tags Stati generates. This approach is more explicit than hybrid mode and prevents any automatic tag generation.

### Configuration

Disable auto-injection to avoid conflicts:

```typescript
// stati.config.ts
import { defineConfig } from '@stati/core';

export default defineConfig({
  // site: { … },
  seo: {
    autoInject: false, // Disable automatic injection
    defaultAuthor: {
      name: 'John Doe',
    },
  },
});
```

### Example 1: Generate only title and description

```eta
<!-- site/layout.eta -->
<!DOCTYPE html>
<html>
<head>
  <!-- Generate only title and description -->
  <%~ stati.generateSEO(['title', 'description']) %>

  <!-- Add custom tags -->
  <link rel="canonical" href="<%= stati.site.baseUrl + stati.page.url %>">
  <meta name="custom-meta" content="custom value">
</head>
<body>
  <%~ stati.content %>
</body>
</html>
```

### Example 2: Generate basic SEO + custom social

`ogImageName` is a custom front matter field in this example (for example `ogImageName: launch-post`).

```eta
<!-- site/layout.eta -->
<!DOCTYPE html>
<html>
<head>
  <!-- Generate basic SEO tags -->
  <%~ stati.generateSEO(['title', 'description', 'canonical', 'author']) %>

  <!-- Custom Open Graph -->
  <meta property="og:title" content="<%= `${stati.page.title} | ${stati.site.title}` %>">
  <meta property="og:image" content="<%= `${stati.site.baseUrl}/images/og-${stati.page.ogImageName}.jpg` %>">
  <meta property="og:type" content="article">

  <!-- Custom Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@mysite">
  <meta name="twitter:image" content="<%= `${stati.site.baseUrl}/images/twitter-${stati.page.ogImageName}.jpg` %>">
</head>
<body>
  <%~ stati.content %>
</body>
</html>
```

### Example 3: Generate multiple tag types

```eta
<!-- site/layout.eta -->
<!DOCTYPE html>
<html>
<head>
  <!-- Generate multiple specific tag types -->
  <%~ stati.generateSEO(['title', 'description', 'canonical', 'opengraph']) %>

  <!-- Add custom tags -->
  <meta name="theme-color" content="#000000">
</head>
<body>
  <%~ stati.content %>
</body>
</html>
```

The tag types are listed in [Available tag types](/configuration/seo#available-tag-types).

---

## Scenario 5: Full custom control

**Best for:** Projects with complex custom SEO requirements or specific SEO systems.

### Overview

Disable automatic injection and manually implement all SEO tags. This gives you complete control over every aspect of SEO tag generation.

### Configuration

```typescript
// stati.config.ts
import { defineConfig } from '@stati/core';

export default defineConfig({
  // site: { … },
  seo: {
    autoInject: false, // Completely disable automatic injection
  },
});
```

### Manual implementation

```eta
<!-- site/layout.eta -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">

  <!-- Manual title with custom logic -->
  <title>
    <% if (stati.page.seoTitle) { %>
      <%= stati.page.seoTitle %>
    <% } else if (stati.page.title) { %>
      <%= stati.page.title %> | <%= stati.site.title %>
    <% } else { %>
      <%= stati.site.title %>
    <% } %>
  </title>

  <!-- Manual meta description -->
  <% if (stati.page.description) { %>
    <meta name="description" content="<%= stati.page.description %>">
  <% } %>

  <!-- Manual keywords -->
  <% if (stati.page.tags && stati.page.tags.length > 0) { %>
    <meta name="keywords" content="<%= stati.page.tags.join(', ') %>">
  <% } %>

  <!-- Manual canonical -->
  <link rel="canonical" href="<%= stati.site.baseUrl + stati.page.url %>">

  <!-- Manual Open Graph -->
  <meta property="og:title" content="<%= stati.page.title || stati.site.title %>">
  <% if (stati.page.description) { %>
  <meta property="og:description" content="<%= stati.page.description %>">
  <% } %>
  <meta property="og:url" content="<%= stati.site.baseUrl + stati.page.url %>">
  <meta property="og:type" content="<%= stati.page.type || 'website' %>">

  <% if (stati.page.shareImage) { %>
    <!-- stati.url() adds the base path to a path such as /images/og.png; new URL() makes it absolute -->
    <meta property="og:image" content="<%= new URL(stati.url(stati.page.shareImage), stati.site.baseUrl).href %>">
    <% if (stati.page.shareImageWidth) { %>
      <meta property="og:image:width" content="<%= stati.page.shareImageWidth %>">
    <% } %>
    <% if (stati.page.shareImageHeight) { %>
      <meta property="og:image:height" content="<%= stati.page.shareImageHeight %>">
    <% } %>
  <% } %>

  <!-- Manual Twitter Cards -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@mysite">
  <meta name="twitter:title" content="<%= stati.page.title %>">
  <% if (stati.page.description) { %>
    <meta name="twitter:description" content="<%= stati.page.description %>">
  <% } %>
  <% if (stati.page.twitterImage || stati.page.shareImage) { %>
    <meta name="twitter:image" content="<%= new URL(stati.url(stati.page.twitterImage || stati.page.shareImage), stati.site.baseUrl).href %>">
  <% } %>

  <!-- Manual structured data (escape "<" so the JSON cannot close the script tag) -->
  <% if (stati.page.schema) { %>
    <script type="application/ld+json">
      <%~ JSON.stringify(stati.page.schema, null, 2).replace(/</g, '\\u003c') %>
    </script>
  <% } %>

  <!-- Your other custom tags -->
</head>
<body>
  <%~ stati.content %>
</body>
</html>
```

### Trade-offs

- More code to maintain
- You must keep using `<%= %>` (escaped) for values; `<%~ %>` prints them unescaped
- No automatic fallbacks
- Higher chance of errors (missing tags, typos)
- More testing required
