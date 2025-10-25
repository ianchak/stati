---
title: RSS Feed Configuration
description: Learn how to configure and generate RSS feeds for your Stati site
order: 6
---

# RSS Feed Configuration

Stati supports automatic RSS feed generation for your content. RSS feeds allow visitors to subscribe to your content and receive updates in their feed readers.

## Overview

RSS feed generation in Stati:

- **Production-only**: RSS feeds are only generated during production builds
- **Auto-regenerate**: Feeds regenerate on every production build with latest content
- **Multiple feeds**: Support for multiple feeds with different content
- **Highly customizable**: Field mappings, content filtering, and custom metadata
- **Works out of the box**: Minimal configuration required

## Basic Configuration

Enable RSS feed generation in your `stati.config.ts`:

```typescript
import { defineConfig } from '@stati/core';

export default defineConfig({
  site: {
    title: 'My Blog',
    baseUrl: 'https://example.com',
  },
  rss: {
    enabled: true,
    feeds: [
      {
        filename: 'feed.xml',
        title: 'My Blog Posts',
        description: 'Latest articles from my blog',
      },
    ],
  },
});
```

This minimal configuration will generate a `feed.xml` file containing all your pages.

## Content Filtering

### Filter by Directory

Use `contentPatterns` to include only specific content:

```typescript
rss: {
  enabled: true,
  feeds: [
    {
      filename: 'blog.xml',
      title: 'Blog Feed',
      description: 'Latest blog posts',
      contentPatterns: ['blog/**'],  // Only pages in blog directory
    },
  ],
}
```

### Exclude Patterns

Use `excludePatterns` to exclude specific content:

```typescript
rss: {
  enabled: true,
  feeds: [
    {
      filename: 'feed.xml',
      title: 'Main Feed',
      description: 'All content except drafts',
      excludePatterns: ['**/draft-*', '**/index.md'],
    },
  ],
}
```

### Custom Filter Function

For fine-grained control, use a custom filter function:

```typescript
rss: {
  enabled: true,
  feeds: [
    {
      filename: 'featured.xml',
      title: 'Featured Posts',
      description: 'Hand-picked featured articles',
      filter: (page) => page.frontMatter.featured === true,
    },
  ],
}
```

## Multiple Feeds

You can create multiple feeds targeting different content:

```typescript
rss: {
  enabled: true,
  feeds: [
    {
      filename: 'feed.xml',
      title: 'All Posts',
      description: 'All blog posts and articles',
    },
    {
      filename: 'blog.xml',
      title: 'Blog Posts',
      description: 'Latest blog posts',
      contentPatterns: ['blog/**'],
      maxItems: 20,
    },
    {
      filename: 'news.xml',
      title: 'News Feed',
      description: 'Latest news updates',
      contentPatterns: ['news/**'],
      maxItems: 10,
    },
  ],
}
```

## Feed Metadata

Customize your feed with optional metadata:

```typescript
{
  filename: 'feed.xml',
  title: 'My Blog',
  description: 'Articles about web development',

  // Optional metadata
  language: 'en-US',
  copyright: 'Copyright 2025 My Company',
  category: 'Technology',
  ttl: 60,  // Cache for 60 minutes

  // Managing editor
  managingEditor: 'editor@example.com (Jane Doe)',

  // Webmaster
  webMaster: 'webmaster@example.com (John Smith)',

  // Feed image
  image: {
    url: 'https://example.com/logo.png',
    title: 'Site Logo',
    link: 'https://example.com',
    width: 144,
    height: 144,
  },
}
```

## Sorting and Limiting

### Sort Order

Control the order of items in your feed:

```typescript
{
  filename: 'feed.xml',
  title: 'My Feed',
  description: 'Latest posts',
  sortBy: 'date-desc',  // Options: 'date-desc', 'date-asc', 'title-asc', 'title-desc', 'custom'
}
```

### Custom Sort Function

```typescript
{
  filename: 'feed.xml',
  title: 'My Feed',
  description: 'Latest posts',
  sortBy: 'custom',
  sortFn: (a, b) => {
    // Custom sorting logic
    const priorityA = a.frontMatter.priority || 0;
    const priorityB = b.frontMatter.priority || 0;
    return priorityB - priorityA;  // Higher priority first
  },
}
```

### Limit Items

Limit the number of items in a feed:

```typescript
{
  filename: 'feed.xml',
  title: 'Recent Posts',
  description: 'Last 10 posts',
  maxItems: 10,
}
```

## Field Mapping

Customize how page data maps to RSS feed items:

### Default Mapping

By default, Stati uses these frontmatter fields:
- `title` → RSS item title
- `description` → RSS item description
- `publishedAt` or `date` → RSS item pubDate
- `tags` → RSS item categories

### Custom Field Names

Map to different frontmatter fields:

```typescript
{
  filename: 'feed.xml',
  title: 'My Feed',
  description: 'Latest posts',
  itemMapping: {
    title: 'headline',        // Use 'headline' instead of 'title'
    description: 'excerpt',   // Use 'excerpt' instead of 'description'
    pubDate: 'publishDate',   // Use 'publishDate' instead of 'publishedAt'
    author: 'authorName',     // Use 'authorName' instead of 'author'
    category: 'categories',   // Use 'categories' instead of 'tags'
  },
}
```

### Field Mapping Functions

Use functions for custom transformations:

```typescript
{
  filename: 'feed.xml',
  title: 'My Feed',
  description: 'Latest posts',
  itemMapping: {
    // Transform title
    title: (page) => `${page.frontMatter.title} - My Blog`,

    // Build custom description
    description: (page) =>
      page.frontMatter.excerpt || page.frontMatter.description || 'Read more...',

    // Custom author format
    author: (page) => {
      const author = page.frontMatter.author;
      const email = page.frontMatter.email;
      return email ? `${email} (${author})` : undefined;
    },

    // Custom link
    link: (page, config) =>
      `${config.site.baseUrl}/posts${page.url}?utm_source=rss`,
  },
}
```

## Include Full Content

Include the full HTML content in feed items:

```typescript
{
  filename: 'feed.xml',
  title: 'My Feed',
  description: 'Latest posts with full content',
  itemMapping: {
    includeContent: true,  // Include rendered HTML in description
  },
}
```

## Advanced Features

### Custom Namespaces

Add custom XML namespaces for RSS extensions:

```typescript
{
  filename: 'feed.xml',
  title: 'My Feed',
  description: 'Latest posts',
  namespaces: {
    'content': 'http://purl.org/rss/1.0/modules/content/',
    'dc': 'http://purl.org/dc/elements/1.1/',
  },
}
```

### Custom Item Elements

Add custom XML elements to each item:

```typescript
{
  filename: 'feed.xml',
  title: 'My Feed',
  description: 'Latest posts',
  customItemElements: (page) => ({
    'dc:creator': page.frontMatter.author,
    'content:encoded': page.content,
    'custom:readTime': `${page.frontMatter.readTime} min`,
  }),
}
```

### Enclosures (Media Files)

Add enclosures for podcasts or other media:

```typescript
{
  filename: 'podcast.xml',
  title: 'My Podcast',
  description: 'Latest podcast episodes',
  enclosure: (page) => {
    if (page.frontMatter.audioUrl) {
      return {
        url: page.frontMatter.audioUrl,
        length: page.frontMatter.audioSize,  // Size in bytes
        type: 'audio/mpeg',
      };
    }
    return undefined;
  },
}
```

## Real-World Examples

### Blog Feed

```typescript
rss: {
  enabled: true,
  feeds: [
    {
      filename: 'feed.xml',
      title: 'My Development Blog',
      description: 'Articles about web development, JavaScript, and more',
      contentPatterns: ['blog/**'],
      language: 'en-US',
      copyright: 'Copyright 2025 Your Name',
      category: 'Technology',
      maxItems: 20,
      sortBy: 'date-desc',
      itemMapping: {
        category: 'tags',
        includeContent: false,
      },
    },
  ],
}
```

### News Site with Multiple Feeds

```typescript
rss: {
  enabled: true,
  feeds: [
    {
      filename: 'all.xml',
      title: 'All News',
      description: 'Complete news feed',
      maxItems: 50,
    },
    {
      filename: 'breaking.xml',
      title: 'Breaking News',
      description: 'Breaking news only',
      filter: (page) => page.frontMatter.breaking === true,
      maxItems: 10,
    },
    {
      filename: 'sports.xml',
      title: 'Sports News',
      description: 'Sports coverage',
      contentPatterns: ['news/sports/**'],
      maxItems: 20,
    },
  ],
}
```

### Podcast Feed

```typescript
rss: {
  enabled: true,
  feeds: [
    {
      filename: 'podcast.xml',
      title: 'My Tech Podcast',
      description: 'Weekly discussions about technology',
      contentPatterns: ['episodes/**'],
      language: 'en-US',
      category: 'Technology',
      image: {
        url: 'https://example.com/podcast-cover.jpg',
        title: 'My Tech Podcast',
        link: 'https://example.com/podcast',
      },
      enclosure: (page) => ({
        url: page.frontMatter.audioUrl,
        length: page.frontMatter.audioSize,
        type: 'audio/mpeg',
      }),
      itemMapping: {
        author: (page) => `podcast@example.com (${page.frontMatter.host})`,
        description: 'summary',
      },
    },
  ],
}
```

## Configuration Validation

Stati automatically validates your RSS configuration during the build process. If there are any errors, the build will display them and continue without generating the problematic feeds.

### Automatic Validation

Validation happens automatically when you run a production build:

```typescript
export default defineConfig({
  rss: {
    enabled: true,
    feeds: [
      {
        filename: 'feed.xml',
        title: 'My Blog',
        description: 'Latest posts',
        // Validation will check:
        // - Required fields are present
        // - Email formats are valid
        // - Image dimensions are within limits
        // - No duplicate filenames
      },
    ],
  },
});
```

### Manual Validation

You can also validate RSS configuration programmatically:

```typescript
import { validateRSSConfig } from '@stati/core';

const result = validateRSSConfig(config.rss);

if (!result.valid) {
  console.error('RSS configuration errors:');
  result.errors.forEach(error => console.error(`  - ${error}`));
}

if (result.warnings.length > 0) {
  console.warn('RSS configuration warnings:');
  result.warnings.forEach(warning => console.warn(`  - ${warning}`));
}
```

### Validation Rules

**Errors** (will prevent feed generation):

- Missing required fields (`filename`, `title`, `description`)
- Invalid TTL value (must be non-negative)
- Duplicate feed filenames
- Missing image fields when image is specified

**Warnings** (informational only):

- Email addresses not in correct format
- Image dimensions exceeding RSS 2.0 recommendations (144×400 max)
- Filename not ending in `.xml`
- TTL set to 0 (no caching)
- Empty content patterns array

For more details on validation, see the [RSS API Reference](../api/rss.md#rssvalidationresult).

## Development vs Production

**Important**: RSS feeds are **only generated in production builds**, not in development mode.

```bash
# RSS feeds will NOT be generated
npm run dev

# RSS feeds WILL be generated
npm run build
```

This is by design to avoid unnecessary regeneration during development. When you run a production build, all enabled feeds will be regenerated with the latest content.

## Troubleshooting

### Feed Not Generated

If your feed isn't being generated:

1. **Check environment**: Ensure you're running a production build (`npm run build`, not `npm run dev`)
2. **Verify enabled**: Ensure `rss.enabled: true` in your config
3. **Check feed config**: Verify your feed has required fields (`filename`, `title`, `description`)
4. **Check validation errors**: Look for validation errors in the build output
5. **Check content patterns**: If using `contentPatterns`, ensure they match your content

### Empty Feed

If your feed is empty:

1. **Check content patterns**: Verify patterns match your content paths
2. **Check exclude patterns**: Ensure you're not excluding all content
3. **Check filter function**: Verify your custom filter isn't too restrictive
4. **Check maxItems**: Ensure `maxItems` isn't set to 0

### Invalid XML

If your feed has XML errors:

1. **Check special characters**: Stati automatically escapes XML characters
2. **Check custom elements**: Ensure custom elements use valid XML tag names
3. **Validate feed**: Use an RSS validator to check your feed

## Best Practices

1. **Use clear titles**: Make feed titles descriptive and unique
2. **Provide good descriptions**: Write clear descriptions for both feeds and items
3. **Limit items**: Use `maxItems` to keep feeds manageable (10-50 items typical)
4. **Sort by date**: Most recent content first (`date-desc`) is standard
5. **Include categories**: Use tags/categories to help readers filter content
6. **Set TTL**: Use `ttl` to suggest appropriate cache duration
7. **Test feeds**: Validate generated feeds with RSS validators
8. **Link in HTML**: Add `<link>` tags in your HTML to advertise feeds

## Next Steps

- Learn about [SEO configuration](/configuration/seo)
- Configure [Sitemap generation](/configuration/seo)
- Explore [Build hooks](/api/hooks)
