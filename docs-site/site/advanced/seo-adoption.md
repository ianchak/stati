---
title: SEO Adoption Guide
description: Learn different strategies for adopting SEO features in your Stati project, from automatic to fully custom control
layout: layout.eta
---

# SEO Adoption Guide

This guide covers five different approaches to adopting Stati's SEO features, from zero-configuration automatic injection to full custom control. Choose the approach that best fits your project's needs.

## Table of Contents

- [Scenario 1: Existing Project (No Changes)](#scenario-1-existing-project-no-changes)
- [Scenario 2: Enhanced SEO (Gradual Enhancement)](#scenario-2-enhanced-seo-gradual-enhancement)
- [Scenario 3: Hybrid Mode (Granular Override)](#scenario-3-hybrid-mode-granular-override) ⭐ **Recommended**
- [Scenario 4: Selective Manual Control](#scenario-4-selective-manual-control)
- [Scenario 5: Full Custom Control](#scenario-5-full-custom-control)
- [Comparison Table](#comparison-table)
- [Migration Path](#migration-path)
- [Testing & Validation](#testing--validation)

---

## Scenario 1: Existing Project (No Changes)

**Best for:** Projects that want instant SEO improvements with zero configuration.

### What Happens

When you upgrade Stati, SEO features activate automatically on your next build:

✅ **Automatic SEO injection enabled** (default behavior)
✅ **Basic meta tags generated** from site config and page content
✅ **Sitemap available** (just needs to be enabled)
✅ **No code changes required**

### Before Automatic SEO

```html
<!DOCTYPE html>
<html>
<head>
  <!-- No SEO tags -->
</head>
<body>
  <h1>My Page</h1>
</body>
</html>
```

### After Automatic SEO

```html
<!DOCTYPE html>
<html>
<head>
  <!-- Auto-injected by Stati -->
  <title>My Page | My Site</title>
  <meta name="description" content="Page content extracted from body">
  <link rel="canonical" href="https://example.com/my-page">
  <meta property="og:title" content="My Page">
  <meta property="og:description" content="Page content extracted from body">
  <meta property="og:url" content="https://example.com/my-page">
  <meta property="og:type" content="website">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="My Page">
</head>
<body>
  <h1>My Page</h1>
</body>
</html>
```

### Action Required

**None!** Just rebuild your site and SEO tags will be automatically injected.

### Optional Enhancements

Enable sitemap generation in `stati.config.ts`:

```typescript
export default defineConfig({
  site: {
    baseUrl: 'https://example.com', // Required for sitemap URLs
  },
  sitemap: {
    enabled: true,
  },
});
```

---

## Scenario 2: Enhanced SEO (Gradual Enhancement)

**Best for:** Projects that want better SEO without changing templates.

### Approach

Keep automatic injection enabled and enhance SEO through configuration and frontmatter.

### Step 1: Configure Global SEO

```typescript
// stati.config.ts
import { defineConfig } from '@stati/core';

export default defineConfig({
  site: {
    title: 'My Awesome Site',
    baseUrl: 'https://example.com',
  },

  seo: {
    autoInject: true, // Keep automatic injection enabled
    defaultAuthor: {
      name: 'Jane Doe',
      email: 'jane@example.com',
      url: 'https://janedoe.com',
    },
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

### Step 2: Enhance Important Pages

Add SEO frontmatter to high-value pages:

```markdown
---
title: Complete Guide to Static Sites
description: Learn everything about static site generation with this comprehensive guide
seo:
  keywords: [static sites, jamstack, web development]
  openGraph:
    image:
      url: https://example.com/images/og-guide.jpg
      alt: Static Site Guide Cover
      width: 1200
      height: 630
    type: article
    article:
      publishedTime: 2025-01-15T10:00:00Z
      author: Jane Doe
      section: Web Development
      tags: [tutorial, static-sites, jamstack]
  twitter:
    card: summary_large_image
    image: https://example.com/images/twitter-guide.jpg
    imageAlt: Static Site Guide
  structuredData:
    '@context': https://schema.org
    '@type': Article
    headline: Complete Guide to Static Sites
    datePublished: 2025-01-15T10:00:00Z
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

### Step 3: Configure Sitemap Per-Page

For pages you want to exclude or deprioritize:

```markdown
---
title: Draft Page
sitemap:
  exclude: true  # Exclude from sitemap
---
```

```markdown
---
title: Archive Page
sitemap:
  priority: 0.3
  changefreq: yearly
---
```

### Benefits

✅ **Zero template changes**
✅ **Gradual enhancement** - improve pages over time
✅ **Full control over important pages**
✅ **Automatic fallback** for pages without SEO config

---

## Scenario 3: Hybrid Mode (Granular Override)

**Best for:** Projects that need custom control over specific tags while automating the rest.

⭐ **This is the recommended approach for most projects.**

### Concept

Keep auto-injection enabled but manually override specific SEO tags when needed. Stati detects existing tags and skips auto-generating them.

### Example 1: Custom Title, Auto-Generate Rest

```html
<!-- site/layout.eta -->
<!DOCTYPE html>
<html>
<head>
  <!-- Manual title with custom format -->
  <title><%= stati.page.title %> - <%= stati.site.title %> | Premium Guides</title>

  <!-- Stati auto-generates: description, canonical, OG tags, Twitter, etc. -->
</head>
<body>
  <%~ it.content %>
</body>
</html>
```

**Result:**
- ✅ Your custom title is used
- ✅ All other SEO tags are auto-generated (description, canonical, OG, Twitter, etc.)

### Example 2: Custom OG Image, Auto-Generate Other OG Tags

```html
<!-- site/layout.eta -->
<!DOCTYPE html>
<html>
<head>
  <!-- Custom OG image tag -->
  <meta property="og:image" content="<%= stati.site.baseUrl %>/custom-og.jpg">

  <!-- Stati detects OG tag and SKIPS all Open Graph generation -->
  <!-- You must add other OG tags manually -->
  <meta property="og:title" content="<%= stati.page.title %>">
  <meta property="og:description" content="<%= stati.page.description %>">
  <meta property="og:url" content="<%= stati.site.baseUrl %><%= stati.page.url %>">

  <!-- Stati still auto-generates: title, description, canonical, Twitter, etc. -->
</head>
<body>
  <%~ it.content %>
</body>
</html>
```

**Important:** Open Graph tags are a **group**. If you add **any** `og:*` tag manually, Stati skips auto-generating **all** Open Graph tags. The same applies to Twitter Card tags.

### Example 3: Conditional Custom Tags

```html
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
  <%~ it.content %>
</body>
</html>
```

### Example 4: Dynamic OG Images

```html
<!-- site/layout.eta -->
<!DOCTYPE html>
<html>
<head>
  <% if (stati.page.ogImage) { %>
    <!-- Complete custom Open Graph section -->
    <meta property="og:image" content="<%= stati.page.ogImage %>">
    <meta property="og:image:alt" content="<%= stati.page.ogImageAlt || stati.page.title %>">
    <meta property="og:title" content="<%= stati.page.title %>">
    <meta property="og:description" content="<%= stati.page.description %>">
    <meta property="og:url" content="<%= stati.site.baseUrl %><%= stati.page.url %>">
    <meta property="og:type" content="article">
  <% } %>

  <!-- Stati auto-generates: title, description, canonical, Twitter (if no OG) -->
</head>
<body>
  <%~ it.content %>
</body>
</html>
```

### Tag Groups

Understanding tag groups is critical for hybrid mode:

| Group | Behavior |
|-------|----------|
| **Open Graph** | If **any** `og:*` tag exists, **all** OG tags are skipped |
| **Twitter Cards** | If **any** `twitter:*` tag exists, **all** Twitter tags are skipped |
| **Individual Tags** | Title, description, keywords, author, robots, canonical are independent |

### Benefits

✅ **Fine-grained control** where you need it
✅ **Automatic fallback** everywhere else
✅ **No duplication** - Stati detects existing tags
✅ **Flexible** - override on a per-page basis with frontmatter

---

## Scenario 4: Selective Manual Control

**Best for:** Projects that want explicit control over which tags are generated.

### Approach

Use the `stati.generateSEO()` helper with specific tag types.

### Example 1: Generate Only Title and Description

```html
<!-- site/layout.eta -->
<!DOCTYPE html>
<html>
<head>
  <!-- Generate only title and description -->
  <%~ stati.generateSEO(stati, ['title', 'description']) %>

  <!-- Add custom tags -->
  <link rel="canonical" href="<%= stati.site.baseUrl %><%= stati.page.url %>">
  <meta name="custom-meta" content="custom value">
</head>
<body>
  <%~ it.content %>
</body>
</html>
```

### Example 2: Generate Basic SEO + Custom Social

```html
<!-- site/layout.eta -->
<!DOCTYPE html>
<html>
<head>
  <!-- Generate basic SEO tags -->
  <%~ stati.generateSEO(stati, ['title', 'description', 'canonical', 'author']) %>

  <!-- Custom Open Graph -->
  <meta property="og:title" content="<%= stati.page.title %> | <%= stati.site.title %>">
  <meta property="og:image" content="<%= stati.site.baseUrl %>/images/og-<%= stati.page.slug %>.jpg">
  <meta property="og:type" content="article">

  <!-- Custom Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@mysite">
  <meta name="twitter:image" content="<%= stati.site.baseUrl %>/images/twitter-<%= stati.page.slug %>.jpg">
</head>
<body>
  <%~ it.content %>
</body>
</html>
```

### Example 3: Generate Multiple Tag Types

```html
<!-- site/layout.eta -->
<!DOCTYPE html>
<html>
<head>
  <!-- Generate multiple specific tag types -->
  <%~ stati.generateSEO(stati, ['title', 'description', 'canonical', 'opengraph']) %>

  <!-- Add custom tags -->
  <meta name="theme-color" content="#000000">
</head>
<body>
  <%~ it.content %>
</body>
</html>
```

### Configuration

**Disable** auto-injection to avoid conflicts:

```typescript
// stati.config.ts
export default defineConfig({
  seo: {
    autoInject: false, // Disable automatic injection
    defaultAuthor: {
      name: 'John Doe',
      email: 'john@example.com',
    },
  },
});
```

### Benefits

✅ **Explicit control** over tag generation
✅ **Predictable** - you control exactly what's generated
✅ **Mix and match** - combine generated and custom tags
✅ **Simple string API** - easy to use in templates

---

## Scenario 5: Full Custom Control

**Best for:** Projects with complex custom SEO requirements or migrating from existing SEO systems.

### Approach

Disable automatic injection and manually implement all SEO tags.

### Configuration

```typescript
// stati.config.ts
export default defineConfig({
  seo: {
    autoInject: false, // Completely disable automatic injection
  },
});
```

### Manual Implementation

```html
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
  <link rel="canonical" href="<%= stati.site.baseUrl %><%= stati.page.url %>">

  <!-- Manual Open Graph -->
  <meta property="og:title" content="<%= stati.page.title || stati.site.title %>">
  <meta property="og:description" content="<%= stati.page.description || stati.site.description %>">
  <meta property="og:url" content="<%= stati.site.baseUrl %><%= stati.page.url %>">
  <meta property="og:type" content="<%= stati.page.type || 'website' %>">

  <% if (stati.page.ogImage) { %>
    <meta property="og:image" content="<%= stati.site.baseUrl %><%= stati.page.ogImage %>">
    <% if (stati.page.ogImageWidth) { %>
      <meta property="og:image:width" content="<%= stati.page.ogImageWidth %>">
    <% } %>
    <% if (stati.page.ogImageHeight) { %>
      <meta property="og:image:height" content="<%= stati.page.ogImageHeight %>">
    <% } %>
  <% } %>

  <!-- Manual Twitter Cards -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@mysite">
  <meta name="twitter:title" content="<%= stati.page.title %>">
  <% if (stati.page.description) { %>
    <meta name="twitter:description" content="<%= stati.page.description %>">
  <% } %>
  <% if (stati.page.twitterImage || stati.page.ogImage) { %>
    <meta name="twitter:image" content="<%= stati.site.baseUrl %><%= stati.page.twitterImage || stati.page.ogImage %>">
  <% } %>

  <!-- Manual structured data -->
  <% if (stati.page.schema) { %>
    <script type="application/ld+json">
      <%~ JSON.stringify(stati.page.schema, null, 2) %>
    </script>
  <% } %>

  <!-- Your other custom tags -->
</head>
<body>
  <%~ it.content %>
</body>
</html>
```

### Benefits

✅ **Complete control** over every tag
✅ **Custom logic** for complex requirements
✅ **Migration-friendly** for existing SEO systems
✅ **No magic** - everything is explicit

### Drawbacks

❌ **More code to maintain**
❌ **Manual escaping** required for user input
❌ **No automatic fallbacks**
❌ **Higher chance of errors** (missing tags, typos)

---

## Comparison Table

| Feature | Scenario 1<br>(No Changes) | Scenario 2<br>(Enhanced) | Scenario 3<br>(Hybrid) ⭐ | Scenario 4<br>(Selective) | Scenario 5<br>(Full Custom) |
|---------|-------------|------------|----------|------------|-------------|
| **Setup Effort** | None | Low | Low | Medium | High |
| **Code Changes** | None | None | Minimal | Medium | Extensive |
| **Control Level** | Low | Medium | High | High | Complete |
| **Auto-Injection** | ✅ Yes | ✅ Yes | ✅ Yes | ❌ No | ❌ No |
| **Custom Tags** | ❌ No | ✅ Frontmatter | ✅ Template | ✅ Template | ✅ Full |
| **Fallback** | ✅ Always | ✅ Always | ✅ Partial | ❌ No | ❌ No |
| **Type Safety** | N/A | N/A | Partial | ✅ Yes | Partial |
| **Maintenance** | Minimal | Low | Low | Medium | High |
| **Best For** | New projects | Most projects | Advanced needs | Specific control | Complex SEO |

---

## Migration Path

### From No SEO → Automatic SEO

1. Upgrade Stati (automatic SEO is enabled by default)
2. Rebuild your site
3. ✅ Done! SEO tags are auto-injected

### From Automatic → Enhanced

1. Keep `seo.autoInject: true`
2. Add frontmatter to important pages
3. Configure sitemap and robots.txt
4. ✅ Gradual enhancement complete

### From Automatic → Hybrid

1. Keep `seo.autoInject: true`
2. Add specific tags to templates where needed
3. Stati detects and skips auto-generation for those tags
4. ✅ Hybrid mode active

### From Automatic → Selective

1. Set `seo.autoInject: false`
2. Add `stati.generateSEO(stati, ['title', 'description'])` to templates
3. Add custom tags as needed
4. ✅ Selective control implemented

### From Automatic → Full Custom

1. Set `seo.autoInject: false`
2. Implement all SEO tags manually in templates
3. Test thoroughly
4. ✅ Full custom control achieved

### From Hybrid → Selective or Full Custom

1. Set `seo.autoInject: false`
2. Move existing custom tags into explicit generation
3. Add remaining tags (either via `generateSEO()` or manually)
4. ✅ Migration complete

---

## Testing & Validation

### Checklist

After implementing SEO, validate your setup:

- [ ] **Build succeeds** without errors
- [ ] **View page source** - verify SEO tags are present
- [ ] **Check title tags** - correct format and no duplicates
- [ ] **Check meta descriptions** - present and under 160 characters
- [ ] **Check canonical URLs** - absolute URLs, correct protocol
- [ ] **Check Open Graph tags** - og:title, og:description, og:image, og:url
- [ ] **Check Twitter Cards** - twitter:card, twitter:title, twitter:image
- [ ] **Check sitemap.xml** - exists at `/sitemap.xml`, valid XML
- [ ] **Check robots.txt** - exists at `/robots.txt`, correct directives
- [ ] **Validate structured data** - use [Google Rich Results Test](https://search.google.com/test/rich-results)
- [ ] **Test social sharing** - use [Facebook Debugger](https://developers.facebook.com/tools/debug/) and [Twitter Card Validator](https://cards-dev.twitter.com/validator)

### Tools

**Validation:**
- [W3C HTML Validator](https://validator.w3.org/)
- [Google Rich Results Test](https://search.google.com/test/rich-results)
- [Schema.org Validator](https://validator.schema.org/)

**Social Media:**
- [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)
- [Twitter Card Validator](https://cards-dev.twitter.com/validator)
- [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/)

**Search Console:**
- [Google Search Console](https://search.google.com/search-console)
- [Bing Webmaster Tools](https://www.bing.com/webmasters)

### Common Issues

**Issue:** SEO tags appear twice

**Solution:** Disable auto-injection if using manual tags:
```typescript
export default defineConfig({
  seo: { autoInject: false }
});
```

**Issue:** Open Graph tags not generated

**Solution:** Check for existing `og:*` tags in your HTML (any OG tag skips all OG generation)

**Issue:** Sitemap not generated

**Solution:** Ensure sitemap is enabled and baseUrl is set:

```typescript
export default defineConfig({
  site: {
    baseUrl: 'https://example.com' // Required for sitemap URLs
  },
  sitemap: {
    enabled: true,
  }
});
```

**Issue:** Structured data validation errors

**Solution:** Validate frontmatter JSON structure and required fields for your schema type

---

## Recommended Approach

For most projects, we recommend **Scenario 3: Hybrid Mode** because it offers:

✅ **Best of both worlds** - automatic fallback + custom control
✅ **Low maintenance** - minimal code to maintain
✅ **Flexible** - override only what you need
✅ **Safe** - Stati handles escaping and validation
✅ **Gradual** - start automatic, add custom tags as needed

## Next Steps

- [SEO Configuration Guide](/configuration/seo) - Complete SEO configuration reference
- [SEO API Reference](/api/seo) - Detailed API documentation
- [Examples & Recipes](/examples/seo) - Real-world SEO examples

---

**Questions?** Check the [Troubleshooting section](/configuration/seo#troubleshooting) or open a [GitHub issue](https://github.com/ianchak/stati/issues).
