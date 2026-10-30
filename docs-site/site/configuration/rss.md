---
title: 'RSS feeds'
description: Learn how to configure and generate RSS feeds for your Stati site
order: 6
seo:
  title: 'RSS feed configuration'
---

# RSS feeds

Stati writes RSS 2.0 feeds during production builds (`stati build`), never in `stati dev`. A site can have several feeds, each with its own content selection.

## Basic configuration

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

This minimal configuration will generate a `feed.xml` file containing all your pages, including index pages such as the home page. To leave a listing page out, exclude its file, such as `excludePatterns: ['**/blog/index.md']`. A pattern like `'**/index.md'` also drops posts written as `post-name/index.md`.

Stati does not link the feed from your pages. Add a link to the `<head>` of your layout:

```eta
<link rel="alternate" type="application/rss+xml" title="My Blog Posts" href="<%= stati.url('/feed.xml') %>">
```

## Content filtering

### Filter by directory

Use `contentPatterns` to include only specific content:

```typescript
rss: {
  enabled: true,
  feeds: [
    {
      filename: 'blog.xml',
      title: 'Blog Feed',
      description: 'Latest blog posts',
      contentPatterns: ['**/blog/**'],  // Only pages in a blog/ folder
    },
  ],
}
```

> **How patterns match:** `contentPatterns` and `excludePatterns` are tested against each page's **source file path**, which is an absolute path such as `/home/me/my-site/site/blog/post.md`. Start folder patterns with `**/` (`'**/blog/**'`). A pattern like `'blog/**'` or `'site/blog/**'` matches nothing and produces an empty feed. Patterns without `*` or `?` must equal the path or be a prefix of it, so prefer glob patterns. `**/blog/**` also matches `blog/index.md`; add `excludePatterns: ['**/blog/index.md']` to leave the listing page out. An empty `contentPatterns` array includes every page. Pages created from a `[param].md` template, the later pages of a paginated listing and [the 404 page](/core-concepts/routing#the-404-page) are never in a feed, whatever the patterns.

### Exclude patterns

Use `excludePatterns` to exclude specific content:

```typescript
rss: {
  enabled: true,
  feeds: [
    {
      filename: 'feed.xml',
      title: 'Main Feed',
      description: 'All content except draft-* files',
      excludePatterns: ['**/draft-*', '**/blog/index.md'],
    },
  ],
}
```

### Custom filter function

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

## Multiple feeds

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
      contentPatterns: ['**/blog/**'],
      maxItems: 20,
    },
    {
      filename: 'news.xml',
      title: 'News Feed',
      description: 'Latest news updates',
      contentPatterns: ['**/news/**'],
      maxItems: 10,
    },
  ],
}
```

## Feed metadata

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

## Sorting and limiting

### Sort order

Control the order of items in your feed:

```typescript
{
  filename: 'feed.xml',
  title: 'My Feed',
  description: 'Latest posts',
  sortBy: 'date-desc',  // Options: 'date-desc', 'date-asc', 'title-asc', 'title-desc', 'custom'
}
```

### Custom sort function

```typescript
{
  filename: 'feed.xml',
  title: 'My Feed',
  description: 'Latest posts',
  sortBy: 'custom',
  sortFn: (a, b) => {
    // Custom sorting logic
    const priorityA = Number(a.frontMatter.priority ?? 0);
    const priorityB = Number(b.frontMatter.priority ?? 0);
    return priorityB - priorityA;  // Higher priority first
  },
}
```

### Limit items

Limit the number of items in a feed:

```typescript
{
  filename: 'feed.xml',
  title: 'Recent Posts',
  description: 'Last 10 posts',
  maxItems: 10,
}
```

## Field mapping

Customize how page data maps to RSS feed items:

### Default mapping

By default, Stati uses these front matter fields:

- `title` → RSS item title
- `description` → RSS item description
- `publishedAt`, `published`, `date` or `createdAt` (first valid one) → RSS item pubDate
- `author` → RSS item author
- `tags` → RSS item categories
- `author` → RSS item author. Text is used as written; an object is written as `email (name)`, or as just the email or name when it has only one of them. A list of authors is joined with commas:

  ```yaml
  author:
    name: Jane Doe
    email: jane@example.com
  ```

### Custom field names

Map to different front matter fields:

```typescript
{
  filename: 'feed.xml',
  title: 'My Feed',
  description: 'Latest posts',
  itemMapping: {
    title: 'headline',        // Use 'headline' instead of 'title'
    description: 'excerpt',   // Use 'excerpt' instead of 'description'
    pubDate: 'publishDate',   // Use 'publishDate' instead of the default date fields
    author: 'authorName',     // Use 'authorName' instead of 'author'
    category: 'categories',   // Use 'categories' instead of 'tags'
  },
}
```

### Field mapping functions

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
      String(page.frontMatter.excerpt || page.frontMatter.description || 'Read more...'),

    // Custom author format
    author: (page) => {
      const author = page.frontMatter.author;
      const email = page.frontMatter.email;
      return email ? `${email} (${author})` : undefined;
    },

    // Custom link
    link: (page, config) =>
      `${config.site.baseUrl}${page.url}?utm_source=rss`,
  },
}
```

An item's `guid` defaults to its link, so a custom `link` changes the `guid` too. Set `itemMapping.guid` to keep it stable.

A `link` or `guid` function can return any text. A `link` that isn't an absolute URL is resolved against `site.baseUrl`, as are the feed's `link`, the `image` URLs and an enclosure's `url`; a protocol-relative URL (`//cdn.example.com/a.mp3`) gets the scheme of `site.baseUrl`. The `<guid>` is marked as a permalink (`isPermaLink="true"`) only when it is an absolute `http` or `https` URL; any other value, such as `urn:post:42`, is written with `isPermaLink="false"`.

### When a callback fails

A callback that throws for one page doesn't stop the feed. Stati logs a warning that names the feed and the page, and leaves out what failed:

- `link`: the item is skipped, since Stati can't know where it points.
- `title`, `description`, `pubDate`, `author` and `category`, `guid`, `enclosure` and `customItemElements`: the item stays and only that field is left out.

A callback that fails for the whole feed, such as a `filter` or `sortFn` that throws, skips that feed and logs an error. The other feeds are still written, and the build finishes. The skipped feed's file from an earlier build stays in `dist/` unless you build with `--clean`.

## Include full content

Include each page's body in its feed item:

```typescript
{
  filename: 'feed.xml',
  title: 'My Feed',
  description: 'Latest posts with full content',
  itemMapping: {
    includeContent: true,  // Put the page body in <description>
  },
}
```

> **Note:** `includeContent` uses the page's **Markdown source** (the text after the front matter), not rendered HTML. It is written inside a CDATA section in `<description>`. Feed readers that expect HTML will show the Markdown as plain text. The body is not escaped, so a body that contains `]]>` produces invalid XML.

## Advanced features

### Custom namespaces

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

### Custom item elements

Add custom XML elements to each item:

```typescript
{
  filename: 'feed.xml',
  title: 'My Feed',
  description: 'Latest posts',
  customItemElements: (page) => ({
    'dc:creator': String(page.frontMatter.author ?? ''),
    'custom:readTime': `${page.readingTime} min`,
  }),
}
```

Values are converted to strings and HTML-escaped; `undefined` and `null` values are skipped. Declare any prefix you use (`dc:`, `custom:`) in `namespaces`. A key that isn't a valid XML element name (`'read time'`, or anything starting with `xml`) is skipped with a warning.

### Enclosures (media files)

Add enclosures for podcasts or other media:

```typescript
{
  filename: 'podcast.xml',
  title: 'My Podcast',
  description: 'Latest podcast episodes',
  enclosure: (page) => {
    if (page.frontMatter.audioUrl) {
      return {
        url: String(page.frontMatter.audioUrl),
        length: Number(page.frontMatter.audioSize),  // Size in bytes
        type: 'audio/mpeg',
      };
    }
    return undefined;
  },
}
```

`length` is the file size in bytes. RSS requires it, so a missing or invalid value is written as `0`. An enclosure without a `url` is left out with a warning.

## Configuration validation

Stati automatically validates your RSS configuration during the build process. If validation reports any error, Stati logs the errors and generates **no** feeds for that build; the rest of the build continues. Warnings are logged and the feeds are still generated.

To validate a config in your own code, use [`validateRSSConfig()`](/api/rss#validaterssconfig).

### Validation rules

**Errors** (no feed is generated while any error remains):

- Missing required fields (`filename`, `title`, `description`)
- Invalid TTL value (must be non-negative)
- Invalid `maxItems` value (must be a positive number)
- Invalid `sortBy` value (must be one of: `date-desc`, `date-asc`, `title-asc`, `title-desc`, `custom`)
- Missing `sortFn` when `sortBy` is `custom`
- Duplicate feed filenames
- Missing image fields when image is specified
- An empty `feeds` array

**Warnings** (informational only):

- Email addresses not in correct format
- Image dimensions exceeding RSS 2.0 recommendations (144×400 max)
- Filename not ending in `.xml`
- TTL set to 0 (no caching)
- Empty content patterns array

## Troubleshooting

### Feed not generated

If your feed isn't being generated:

1. **Check environment**: Ensure you're running a production build (`npm run build`, not `npm run dev`)
2. **Verify enabled**: Ensure `rss.enabled: true` in your config
3. **Check feed config**: Verify your feed has required fields (`filename`, `title`, `description`)
4. **Check validation errors**: Look for validation errors in the build output
5. **Check content patterns**: If using `contentPatterns`, ensure they match your content
6. **Check maxItems**: `maxItems` must be 1 or more; `0` fails validation, and then no feed is written

### Empty feed

If your feed is empty:

1. **Check content patterns**: Patterns are matched against absolute source file paths, so folder patterns need a leading `**/` (`'**/blog/**'`, not `'blog/**'`)
2. **Check exclude patterns**: Ensure you're not excluding all content
3. **Check filter function**: Verify your custom filter isn't too restrictive

### Invalid XML

If your feed has XML errors:

1. **Check special characters**: Stati automatically escapes XML characters
2. **Check custom elements**: Ensure custom elements use valid XML tag names
3. **Validate feed**: Use an RSS validator to check your feed

## Next steps

- Learn about [SEO configuration](/configuration/seo)
- Configure [Sitemap generation](/configuration/seo#sitemap-configuration)
- Explore [Build hooks](/api/hooks)
