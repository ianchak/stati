---
title: 'RSS'
description: API reference for RSS feed generation in Stati
order: 6
seo:
  title: 'RSS API'
---

# RSS

## Types

### RSSConfig

Main configuration interface for RSS feed generation.

```typescript
interface RSSConfig {
  enabled?: boolean;
  feeds: RSSFeedConfig[];
}
```

**Properties:**

- `enabled` - Enable RSS feed generation (default: `false`). RSS feeds are only generated in production builds.
- `feeds` - Array of feed configurations. Each feed can target different content.

---

### RSSFeedConfig

Configuration for a single RSS feed.

```typescript
interface RSSFeedConfig {
  // Required
  filename: string;
  title: string;
  description: string;

  // Optional metadata
  link?: string;
  language?: string;
  copyright?: string;
  managingEditor?: string;
  webMaster?: string;
  category?: string;
  ttl?: number;
  image?: RSSImageConfig;

  // Content selection
  contentPatterns?: string[];
  excludePatterns?: string[];
  filter?: (page: PageModel) => boolean;
  maxItems?: number;

  // Sorting
  sortBy?: 'date-desc' | 'date-asc' | 'title-asc' | 'title-desc' | 'custom';
  sortFn?: (a: PageModel, b: PageModel) => number;

  // Item mapping
  itemMapping?: RSSItemMapping;

  // Advanced
  enclosure?: (page: PageModel) => RSSEnclosure | undefined;
  namespaces?: Record<string, string>;
  customItemElements?: (page: PageModel) => Record<string, string | number | boolean | undefined>;
}
```

**Required Properties:**

- `filename` - Output filename for the feed (e.g., `'feed.xml'`, `'blog.xml'`)
- `title` - Title of the RSS feed
- `description` - Description of the RSS feed

**Optional Metadata:**

- `link` - Feed link (defaults to `site.baseUrl`)
- `language` - Language code (e.g., `'en-US'`)
- `copyright` - Copyright notice
- `managingEditor` - Editor email (format: `'email@example.com (Name)'`)
- `webMaster` - Webmaster email (format: `'email@example.com (Name)'`)
- `category` - Feed category
- `ttl` - Time to live in minutes (cache duration)
- `image` - Feed image configuration

**Content Selection:**

- `contentPatterns` - Glob patterns to include content (e.g., `['**/blog/**']`)
- `excludePatterns` - Glob patterns to exclude content (e.g., `['**/draft-*']`)
- `filter` - Custom filter function for fine-grained control
- `maxItems` - Maximum number of items to include in feed

Both pattern lists are matched against each page's absolute source file path (`PageModel.sourcePath`), so folder patterns need a leading `**/`. A pattern such as `'blog/**'` matches nothing.

**Sorting:**

- `sortBy` - Sort method:
  - `'date-desc'` - Newest first (default)
  - `'date-asc'` - Oldest first
  - `'title-asc'` - Alphabetically by title
  - `'title-desc'` - Reverse alphabetically
  - `'custom'` - Use `sortFn`
- `sortFn` - Custom sort function when `sortBy` is `'custom'`

**Item Mapping:**

- `itemMapping` - Field mappings for RSS item elements

**Advanced:**

- `enclosure` - Function to generate enclosures (for podcasts/media)
- `namespaces` - Custom XML namespaces
- `customItemElements` - Custom XML elements for each item

---

### RSSItemMapping

Field mappings for RSS feed items.

> **Note:** Not exported: this is the inline type of `RSSFeedConfig.itemMapping`.

```typescript
interface RSSItemMapping {
  title?: string | ((page: PageModel) => string);
  description?: string | ((page: PageModel) => string);
  link?: (page: PageModel, config: StatiConfig) => string;
  pubDate?: string | ((page: PageModel) => Date | string);
  author?: string | ((page: PageModel) => string | undefined);
  category?: string | ((page: PageModel) => string | string[] | undefined);
  guid?: (page: PageModel, config: StatiConfig) => string;
  includeContent?: boolean;
}
```

**Properties:**

- `title` - Title field mapping (default: `'title'`)
  - String: front matter property name
  - Function: custom title generator

- `description` - Description field mapping (default: `'description'`)
  - String: front matter property name
  - Function: custom description generator

- `link` - Custom link generator (default: `site.baseUrl` plus the page URL). A relative URL is resolved against `site.baseUrl`. If the function throws or returns no URL, the item is skipped with a warning

- `pubDate` - Publication date field mapping (default: the first valid of `'publishedAt'`, `'published'`, `'date'`, `'createdAt'`)
  - String: front matter property name
  - Function: custom date generator

- `author` - Author field mapping (default: `'author'`)
  - String: front matter property name. The value is text, or an object with `name` and `email`, which is written as `email (name)`; a list is joined with commas
  - Function: custom author generator

- `category` - Category/categories field mapping (default: `'tags'`)
  - String: front matter property name
  - Function: custom category generator

- `guid` - Custom GUID generator (default: the item's link). The `<guid>` is a permalink (`isPermaLink="true"`) only when it is an absolute `http` or `https` URL. If the function throws, the item has no `<guid>`

- `includeContent` - Whether to put the page body in `<description>` (default: `false`). The body is the page's Markdown source (`PageModel.content`), wrapped in CDATA; it is not rendered to HTML.

---

### RSSImageConfig

Feed image configuration.

> **Note:** Not exported: this is the inline type of `RSSFeedConfig.image`.

```typescript
interface RSSImageConfig {
  url: string;
  title: string;
  link: string;
  width?: number;
  height?: number;
}
```

**Properties:**

- `url` - Image URL
- `title` - Image alt text
- `link` - URL the image links to
- `width` - Image width in pixels (RSS recommends at most 144; a larger value logs a warning)
- `height` - Image height in pixels (RSS recommends at most 400; a larger value logs a warning)

---

### RSSEnclosure

Media enclosure for podcast episodes or other media files.

> **Note:** Not exported: this is the return type of `RSSFeedConfig.enclosure`.

```typescript
interface RSSEnclosure {
  url: string;
  length: number;
  type: string;
}
```

**Properties:**

- `url` - URL of the media file. A relative URL is resolved against `site.baseUrl`; an enclosure without one is left out
- `length` - File size in bytes. A missing or invalid value is written as `0`
- `type` - MIME type (e.g., `'audio/mpeg'`)

---

### RSSGenerationResult

Result of RSS feed generation.

```typescript
interface RSSGenerationResult {
  filename: string;
  itemCount: number;
  sizeInBytes: number;
  xml: string;
}
```

**Properties:**

- `filename` - Generated feed filename
- `itemCount` - Number of items in the feed
- `sizeInBytes` - Size of the feed in bytes
- `xml` - Generated RSS XML content

---

### RSSValidationResult

Result of RSS configuration validation.

```typescript
interface RSSValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}
```

**Properties:**

- `valid` - Whether validation passed (no errors)
- `errors` - Array of validation error messages
- `warnings` - Array of validation warning messages (non-critical issues)

## Functions

### validateRSSFeedConfig

Validates a single RSS feed configuration.

```typescript
function validateRSSFeedConfig(
  feedConfig: RSSFeedConfig,
  feedIndex?: number
): RSSValidationResult
```

**Parameters:**

- `feedConfig` - Feed configuration to validate
- `feedIndex` - Optional index of feed in config array (for error messages, default: 0)

**Returns:** Validation result with errors and warnings

**Example:**

```typescript
import { validateRSSFeedConfig } from '@stati/core';

const result = validateRSSFeedConfig({
  filename: 'feed.xml',
  title: 'My Feed',
  description: 'Latest posts',
});

if (!result.valid) {
  console.error('Validation errors:', result.errors);
}
if (result.warnings.length > 0) {
  console.warn('Validation warnings:', result.warnings);
}
```

---

### validateRSSConfig

Validates the entire RSS configuration.

```typescript
function validateRSSConfig(
  rssConfig: RSSConfig | undefined
): RSSValidationResult
```

**Parameters:**

- `rssConfig` - RSS configuration to validate

**Returns:** Validation result with aggregated errors and warnings from all feeds

**Example:**

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

---

### generateRSSFeed

Generates a single RSS feed from pages.

```typescript
function generateRSSFeed(
  pages: PageModel[],
  config: StatiConfig,
  feedConfig: RSSFeedConfig,
  logger?: Logger
): RSSGenerationResult
```

**Parameters:**

- `pages` - All pages in the site
- `config` - Stati configuration
- `feedConfig` - Feed configuration
- `logger` - Optional logger instance for warnings (default: the console)

**Returns:** RSS generation result. `itemCount` counts the items written, without the ones skipped because their `link` mapping failed. Throws when `filter` or `sortFn` throws.

**Example:**

```typescript
import { generateRSSFeed } from '@stati/core';

const result = generateRSSFeed(pages, config, {
  filename: 'feed.xml',
  title: 'My Blog',
  description: 'Latest posts',
});

console.log(`Generated ${result.filename} with ${result.itemCount} items`);
```

---

### generateRSSFeeds

Generates all configured RSS feeds for a site.

```typescript
function generateRSSFeeds(
  pages: PageModel[],
  config: StatiConfig,
  logger?: Logger
): RSSGenerationResult[]
```

**Parameters:**

- `pages` - All pages in the site
- `config` - Stati configuration (with RSS config)
- `logger` - Optional logger instance for warnings and errors (default: the console)

**Returns:** Array of RSS generation results. A feed that fails is logged with `logger.error` and left out of the array; the other feeds are still generated.

**Example:**

```typescript
import { generateRSSFeeds } from '@stati/core';

const results = generateRSSFeeds(pages, config);

for (const result of results) {
  console.log(`Generated ${result.filename} (${result.itemCount} items)`);
}
```

## See also

- [RSS Configuration Guide](/configuration/rss)
- [SEO API](/api/seo)
- [Build Configuration](/configuration/file)
