---
title: 'Site Metadata'
description: 'Configure your site metadata for SEO and branding.'
order: 2
---

# Site Metadata Configuration

Site metadata provides essential information about your website, including SEO properties, social media cards, and global site settings. Stati automatically injects this metadata into your pages and templates.

## Basic Site Configuration

The `site` configuration object contains core metadata for your Stati site:

```javascript
// stati.config.js
import { defineConfig } from '@stati/core';

export default defineConfig({
  site: {
    title: 'My Stati Site',
    description: 'A fast static site built with Stati',
    url: 'https://mysite.com',
    author: {
      name: 'John Doe',
      email: 'john@example.com',
      url: 'https://johndoe.com',
    },
    language: 'en',
    timezone: 'America/New_York',
  },
});
```

## Required Properties

### Basic Information

```javascript
export default defineConfig({
  site: {
    // Site title - used in <title> tags and metadata
    title: 'My Amazing Blog',

    // Site description - used for meta description and social cards
    description: 'Thoughts on web development, technology, and life',

    // Full site URL - required for sitemaps and social cards
    url: 'https://blog.example.com',
  },
});
```

These three properties are **required** for proper SEO and social media integration.

## Author Information

Configure author details for blog posts and articles:

```javascript
export default defineConfig({
  site: {
    author: {
      name: 'Jane Smith',
      email: 'jane@example.com',
      url: 'https://janesmith.dev',
      avatar: '/images/jane-avatar.jpg',
      bio: 'Full-stack developer passionate about web performance',
      social: {
        twitter: '@janesmith',
        github: 'janesmith',
        linkedin: 'janesmith',
      },
    },
  },
});
```

Author information is available in templates as `site.author`:

```html
<!-- In your Eta templates -->
<article>
  <header>
    <h1><%= post.title %></h1>
    <p>By <a href="<%= site.author.url %>"><%= site.author.name %></a></p>
  </header>
</article>
```

## SEO Configuration

### Meta Tags

Configure default meta tags for all pages:

```javascript
export default defineConfig({
  site: {
    meta: {
      // Viewport settings
      viewport: 'width=device-width, initial-scale=1',

      // Theme color for mobile browsers
      themeColor: '#3b82f6',

      // Default keywords (can be overridden per page)
      keywords: ['stati', 'static site generator', 'blog'],

      // Robots meta tag
      robots: 'index, follow',

      // Language and locale
      language: 'en',
      locale: 'en_US',
    },
  },
});
```

### Open Graph Settings

Configure Open Graph metadata for social media sharing:

```javascript
export default defineConfig({
  site: {
    openGraph: {
      // Default Open Graph type
      type: 'website',

      // Default image for social cards
      image: '/images/og-default.jpg',

      // Image dimensions
      imageWidth: 1200,
      imageHeight: 630,

      // Site name for social cards
      siteName: 'My Stati Site',

      // Locale for Open Graph
      locale: 'en_US',
    },
  },
});
```

### Twitter Cards

Configure Twitter card metadata:

```javascript
export default defineConfig({
  site: {
    twitter: {
      // Card type: summary, summary_large_image, app, player
      card: 'summary_large_image',

      // Your Twitter handle
      site: '@mysite',

      // Content creator's Twitter handle
      creator: '@johndoe',

      // Default Twitter image
      image: '/images/twitter-card.jpg',
    },
  },
});
```

## Advanced Metadata

### Structured Data

Configure JSON-LD structured data:

```javascript
export default defineConfig({
  site: {
    structuredData: {
      // Organization schema
      organization: {
        '@type': 'Organization',
        name: 'My Company',
        url: 'https://mycompany.com',
        logo: 'https://mycompany.com/logo.png',
        contactPoint: {
          '@type': 'ContactPoint',
          telephone: '+1-555-0123',
          contactType: 'customer service',
        },
      },

      // Website schema
      website: {
        '@type': 'WebSite',
        name: 'My Stati Site',
        url: 'https://mysite.com',
        potentialAction: {
          '@type': 'SearchAction',
          target: 'https://mysite.com/search?q={search_term_string}',
          'query-input': 'required name=search_term_string',
        },
      },
    },
  },
});
```

### Analytics and Tracking

Configure analytics and tracking codes:

```javascript
export default defineConfig({
  site: {
    analytics: {
      // Google Analytics 4
      googleAnalytics: 'GA-MEASUREMENT-ID',

      // Google Tag Manager
      googleTagManager: 'GTM-XXXXXXX',

      // Fathom Analytics
      fathom: {
        siteId: 'ABCDEFGH',
        honorDNT: true,
      },

      // Custom tracking scripts
      customScripts: [
        {
          src: 'https://analytics.example.com/script.js',
          async: true,
          defer: true,
        },
      ],
    },
  },
});
```

## Advanced Site Configuration

Stati supports custom metadata configuration for enhanced SEO and functionality:

```javascript
export default defineConfig({
  site: {
    title: 'My Site',
    baseUrl: 'https://example.com',
    defaultLocale: 'en-US', // Optional locale setting
          locale: 'ar_SA',
          direction: 'rtl',
        },
      },

      // URL structure for languages
      strategy: 'prefix', // 'prefix' or 'domain'

      // Fallback behavior
      fallbackLanguage: 'en',
    },
  },
});
```

## Environment-Specific Configuration

Configure different metadata for different environments:

```javascript
export default defineConfig({
  site: {
    title: 'My Site',
    url: process.env.NODE_ENV === 'production' ? 'https://mysite.com' : 'http://localhost:3000',

    // Disable analytics in development
    analytics:
      process.env.NODE_ENV === 'production'
        ? {
            googleAnalytics: 'GA-MEASUREMENT-ID',
          }
        : {},

    // Different robots behavior
    meta: {
      robots: process.env.NODE_ENV === 'production' ? 'index, follow' : 'noindex, nofollow',
    },
  },
});
```

## Template Usage

Access site metadata in your Eta templates:

```html
<!DOCTYPE html>
<html lang="<%= site.language %>">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="<%= site.meta.viewport %>" />
    <title><%= page.title %> | <%= site.title %></title>
    <meta name="description" content="<%= page.description || site.description %>" />

    <!-- Open Graph -->
    <meta property="og:title" content="<%= page.title %> | <%= site.title %>" />
    <meta property="og:description" content="<%= page.description || site.description %>" />
    <meta property="og:url" content="<%= site.url %><%= page.path %>" />
    <meta property="og:image" content="<%= page.image || site.openGraph.image %>" />

    <!-- Twitter Card -->
    <meta name="twitter:card" content="<%= site.twitter.card %>" />
    <meta name="twitter:site" content="<%= site.twitter.site %>" />

    <!-- Structured Data -->
    <% if (site.structuredData) { %>
    <script type="application/ld+json">
      <%- JSON.stringify(site.structuredData) %>
    </script>
    <% } %>
  </head>
  <body>
    <!-- Your content -->
  </body>
</html>
```

## Page-Level Overrides

Override site metadata at the page level using front matter:

```markdown
---
title: 'Custom Page Title'
description: 'Custom page description that overrides site default'
image: '/images/custom-page-image.jpg'
openGraph:
  type: 'article'
  publishedTime: '2024-01-15T10:00:00Z'
twitter:
  card: 'summary'
---

# Page Content

This page has custom metadata that overrides the site defaults.
```

## Validation and Testing

### Metadata Validation

Test your metadata manually using external tools and validation services.

### Testing Tools

Use these tools to test your metadata:

- **Facebook Debugger**: https://developers.facebook.com/tools/debug/
- **Twitter Card Validator**: https://cards-dev.twitter.com/validator
- **LinkedIn Post Inspector**: https://www.linkedin.com/post-inspector/
- **Google Rich Results Test**: https://search.google.com/test/rich-results

## Best Practices

### SEO Optimization

1. **Unique Titles**: Ensure each page has a unique, descriptive title
2. **Meta Descriptions**: Write compelling descriptions under 160 characters
3. **Structured Data**: Use appropriate schema markup for your content type
4. **Image Optimization**: Use high-quality images with proper alt text

### Social Media

1. **Consistent Branding**: Use consistent images and messaging across platforms
2. **Optimal Dimensions**: Use 1200x630px for Open Graph images
3. **Compelling Content**: Write engaging descriptions for social sharing

### Performance

1. **Minimal Scripts**: Only include necessary analytics and tracking scripts
2. **Async Loading**: Load analytics scripts asynchronously when possible
3. **CDN Usage**: Host images and assets on a CDN for better performance

### Accessibility

1. **Language Declaration**: Always specify the page language
2. **Proper Meta Tags**: Include viewport and other accessibility-related meta tags
3. **Alt Text**: Provide descriptive alt text for all images

Site metadata is the foundation of good SEO and social media presence. Take time to configure it properly and test across different platforms to ensure your content is properly represented when shared.
