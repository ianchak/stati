---
title: 'SEO API Reference'
description: 'Complete API reference for Stati SEO functions, types, and configuration interfaces'
layout: layout.eta
---

# SEO API Reference

Complete reference for Stati's SEO API including functions, types, and configuration interfaces.

## Functions

### `generateSEOMetadata()`

Generates SEO metadata tags as an HTML string based on page context and configuration.

**Signature:**

```typescript
function generateSEOMetadata(context: SEOContext): string
```

**Parameters:**

- `context` (SEOContext): The SEO generation context containing page data, configuration, and tag filters

**Returns:**

- `string`: HTML string containing all generated SEO meta tags

**Example:**

```typescript
import { generateSEOMetadata, SEOTagType } from '@stati/core';

const html = generateSEOMetadata({
  page: pageData,
  config: statiConfig,
  siteUrl: 'https://example.com',
  exclude: new Set([SEOTagType.Title]), // Skip title generation
});
```

**Throws:**

- `Error`: If SEO validation fails (invalid canonical URL, malformed data, etc.)

---

### `generateSEO()`

Template helper function for convenient SEO generation in Eta templates.

**Signature:**

```typescript
function generateSEO(
  stati: TemplateContext,
  tags?: Array<SEOTagType | string>
): string
```

**Parameters:**

- `stati` (TemplateContext): The template context object (available as `stati` in templates)
- `tags` (Array<SEOTagType | string>, optional): Array of tag types to generate. Use **strings** in Eta templates (`'title'`, `'description'`, etc.). The `SEOTagType` enum is only available for programmatic/TypeScript usage.

**Returns:**

- `string`: HTML string containing generated SEO meta tags

**Examples:**

```html
<!-- Generate all SEO tags -->
<%~ stati.generateSEO(stati) %>

<!-- Generate specific tags using strings (in Eta templates) -->
<%~ stati.generateSEO(stati, ['title', 'description', 'canonical']) %>

<!-- Generate specific tags with Open Graph and Twitter -->
<%~ stati.generateSEO(stati, ['title', 'opengraph', 'twitter']) %>
```

**Programmatic Usage (TypeScript):**

```typescript
import { generateSEO, SEOTagType } from '@stati/core';

// Using enum values in TypeScript code
const html = generateSEO(stati, [SEOTagType.Title, SEOTagType.OpenGraph]);

// Or using strings
const html2 = generateSEO(stati, ['title', 'description']);
```

---

### `generateSitemap()`

Generates an XML sitemap from an array of pages.

**Signature:**

```typescript
function generateSitemap(
  pages: PageModel[],
  config: StatiConfig,
  sitemapConfig: SitemapConfig
): SitemapGenerationResult
```

**Parameters:**

- `pages` (PageModel[]): Array of page objects to include in sitemap
- `config` (StatiConfig): Stati configuration object (used for `site.baseUrl`)
- `sitemapConfig` (SitemapConfig): Sitemap-specific configuration options

**Returns:**

- `SitemapGenerationResult`: Object containing the generated XML, entry count, and size

**Example:**

```typescript
import { generateSitemap } from '@stati/core';

const sitemapConfig = {
  enabled: true,
  defaultPriority: 0.5,
  defaultChangeFreq: 'monthly',
};

const result = generateSitemap(pages, config, sitemapConfig);

console.log(result.xml);          // XML string
console.log(result.entryCount);   // Number of URLs
console.log(result.sizeInBytes);  // Size in bytes
console.log(result.sitemaps);     // Array of sitemap files (if split)
```

**Notes:**

- Automatically splits into multiple sitemaps if entries exceed 50,000
- Returns sitemap index XML if multiple sitemaps are generated
- Uses `config.site.baseUrl` for absolute URLs

---

### `generateRobotsTxt()`

Generates robots.txt content from low-level options.

**Signature:**

```typescript
function generateRobotsTxt(options?: RobotsTxtOptions): string

interface RobotsTxtOptions {
  /** User agent rules */
  rules?: Array<{
    userAgent: string;
    allow?: string[];
    disallow?: string[];
    crawlDelay?: number;
  }>;
  /** Sitemap URLs to include */
  sitemaps?: string[];
  /** Additional custom directives */
  custom?: string[];
  /** Site base URL for resolving sitemap paths */
  siteUrl?: string;
}
```

**Parameters:**

- `options` (RobotsTxtOptions, optional): Robots.txt generation options

**Returns:**

- `string`: robots.txt file content

**Example:**

```typescript
import { generateRobotsTxt } from '@stati/core';

const robotsTxt = generateRobotsTxt({
  rules: [
    {
      userAgent: 'Googlebot',
      allow: ['/'],
      crawlDelay: 1
    },
    {
      userAgent: '*',
      disallow: ['/admin/', '/api/']
    }
  ],
  sitemaps: ['https://example.com/sitemap.xml'],
  custom: ['# Custom comment']
});
```

---

### `generateRobotsTxtFromConfig()`

Generates robots.txt content from Stati configuration.

**Signature:**

```typescript
function generateRobotsTxtFromConfig(
  config: RobotsTxtConfig,
  siteUrl?: string
): string
```

**Parameters:**

- `config` (RobotsTxtConfig): Robots.txt configuration object
- `siteUrl` (string, optional): Site base URL for resolving sitemap paths

**Returns:**

- `string`: robots.txt file content

**Example:**

```typescript
import { generateRobotsTxtFromConfig } from '@stati/core';

const config = {
  enabled: true,
  userAgents: [
    {
      userAgent: 'Googlebot',
      allow: ['/public/'],
      disallow: ['/admin/']
    }
  ],
  disallow: ['/admin/', '/private/'],
  sitemap: true,
};

const robotsTxt = generateRobotsTxtFromConfig(config, 'https://example.com');
// User-agent: Googlebot
// Allow: /public/
// Disallow: /admin/
//
// User-agent: *
// Disallow: /admin/
// Disallow: /private/
//
// Sitemap: https://example.com/sitemap.xml
```

---

### `autoInjectSEO()`

Automatically injects SEO metadata into rendered HTML, skipping tags that already exist.

**Signature:**

```typescript
function autoInjectSEO(
  html: string,
  options: AutoInjectOptions
): string

interface AutoInjectOptions {
  /** Page model with frontmatter and metadata */
  page: PageModel;
  /** Stati configuration */
  config: StatiConfig;
  /** Site base URL */
  siteUrl: string;
  /** Enable debug logging */
  debug?: boolean;
}
```

**Parameters:**

- `html` (string): The rendered HTML content
- `options` (AutoInjectOptions): Options object containing page, config, siteUrl, and optional debug flag

**Returns:**

- `string`: Modified HTML with injected SEO tags

**Example:**

```typescript
import { autoInjectSEO } from '@stati/core';

const enrichedHtml = autoInjectSEO(renderedHtml, {
  page: pageModel,
  config: statiConfig,
  siteUrl: 'https://example.com',
  debug: false,
});
```

**Behavior:**

- Returns original HTML unchanged if `config.seo.autoInject === false`
- Detects existing SEO tags and skips generation for those tag types
- Injects generated tags before `</head>` closing tag
- Preserves existing tags exactly (no modification)

---

### `generateOpenGraphTags()`

Generates Open Graph meta tags from SEO context.

**Signature:**

```typescript
function generateOpenGraphTags(context: SEOContext): string[]
```

**Parameters:**

- `context` (SEOContext): The SEO generation context

**Returns:**

- `string[]`: Array of Open Graph meta tag strings

**Example:**

```typescript
import { generateOpenGraphTags } from '@stati/core';

const ogTags = generateOpenGraphTags({
  page: pageModel,
  config: statiConfig,
  siteUrl: 'https://example.com',
});

console.log(ogTags.join('\n'));
```

---

### `generateTwitterCardTags()`

Generates Twitter Card meta tags from SEO context.

**Signature:**

```typescript
function generateTwitterCardTags(context: SEOContext): string[]
```

**Parameters:**

- `context` (SEOContext): The SEO generation context

**Returns:**

- `string[]`: Array of Twitter Card meta tag strings

**Example:**

```typescript
import { generateTwitterCardTags } from '@stati/core';

const twitterTags = generateTwitterCardTags({
  page: pageModel,
  config: statiConfig,
  siteUrl: 'https://example.com',
});

console.log(twitterTags.join('\n'));
```

---

### `generateSitemapEntry()`

Generates a single sitemap entry from a page model.

**Signature:**

```typescript
function generateSitemapEntry(
  page: PageModel,
  config: StatiConfig,
  sitemapConfig: SitemapConfig
): SitemapEntry | null
```

**Parameters:**

- `page` (PageModel): The page to generate entry for
- `config` (StatiConfig): Stati configuration
- `sitemapConfig` (SitemapConfig): Sitemap configuration

**Returns:**

- `SitemapEntry | null`: Generated entry or null if page should be excluded

**Example:**

```typescript
import { generateSitemapEntry } from '@stati/core';

const entry = generateSitemapEntry(page, config, sitemapConfig);
if (entry) {
  console.log(`URL: ${entry.url}, Priority: ${entry.priority}`);
}
```

---

### `generateSitemapXml()`

Generates XML string from sitemap entries.

**Signature:**

```typescript
function generateSitemapXml(entries: SitemapEntry[]): string
```

**Parameters:**

- `entries` (SitemapEntry[]): Array of sitemap entries

**Returns:**

- `string`: XML sitemap content

**Example:**

```typescript
import { generateSitemapXml } from '@stati/core';

const entries = [
  { url: 'https://example.com/', priority: 1.0 },
  { url: 'https://example.com/about', priority: 0.8 }
];

const xml = generateSitemapXml(entries);
```

---

### `generateSitemapIndexXml()`

Generates sitemap index XML for multiple sitemaps.

**Signature:**

```typescript
function generateSitemapIndexXml(
  sitemapUrls: string[],
  siteUrl: string
): string
```

**Parameters:**

- `sitemapUrls` (string[]): Array of sitemap URLs (relative or absolute)
- `siteUrl` (string): Base site URL

**Returns:**

- `string`: Sitemap index XML content

**Example:**

```typescript
import { generateSitemapIndexXml } from '@stati/core';

const indexXml = generateSitemapIndexXml(
  ['/sitemap-1.xml', '/sitemap-2.xml'],
  'https://example.com'
);
```

---

### `shouldAutoInject()`

Determines if auto-injection should be enabled for a page.

**Signature:**

```typescript
function shouldAutoInject(
  config: StatiConfig,
  page: PageModel
): boolean
```

**Parameters:**

- `config` (StatiConfig): Stati configuration
- `page` (PageModel): Page to check (reserved for future page-level overrides)

**Returns:**

- `boolean`: True if auto-injection should run

**Example:**

```typescript
import { shouldAutoInject } from '@stati/core';

if (shouldAutoInject(config, page)) {
  // Auto-injection is enabled
}
```

---

### Utility Functions

#### `escapeHtml()`

Escapes HTML special characters for safe output.

**Signature:**

```typescript
function escapeHtml(text: string): string
```

**Parameters:**

- `text` (string): Text to escape

**Returns:**

- `string`: HTML-escaped text

---

#### `sanitizeStructuredData()`

Sanitizes structured data object for safe JSON-LD output.

**Signature:**

```typescript
function sanitizeStructuredData(data: Record<string, unknown>): Record<string, unknown>
```

**Parameters:**

- `data` (Record<string, unknown>): Structured data to sanitize

**Returns:**

- `Record<string, unknown>`: Sanitized structured data

---

#### `generateRobotsContent()`

Generates robots meta tag content from SEO metadata.

**Signature:**

```typescript
function generateRobotsContent(seo: SEOMetadata): string | null
```

**Parameters:**

- `seo` (SEOMetadata): SEO metadata with robots configuration

**Returns:**

- `string | null`: Robots meta content or null if no robots config

---

#### `validateSEOMetadata()`

Validates SEO metadata and returns validation results.

**Signature:**

```typescript
function validateSEOMetadata(
  seo: SEOMetadata,
  pageUrl: string
): SEOValidationResult
```

**Parameters:**

- `seo` (SEOMetadata): The SEO metadata to validate
- `pageUrl` (string): The page URL for error context

**Returns:**

- `SEOValidationResult`: Object with `valid`, `errors`, and `warnings` arrays

**Example:**

```typescript
import { validateSEOMetadata } from '@stati/core';

const result = validateSEOMetadata(page.frontMatter.seo, page.url);

if (!result.valid) {
  console.error('SEO validation errors:', result.errors);
}
if (result.warnings.length > 0) {
  console.warn('SEO warnings:', result.warnings);
}
```

#### `detectExistingSEOTags()`

Detects which SEO tag types exist in HTML content.

**Signature:**

```typescript
function detectExistingSEOTags(html: string): Set<SEOTagType>
```

**Parameters:**

- `html` (string): HTML content to scan

**Returns:**

- `Set<SEOTagType>`: Set of detected tag types

**Example:**

```typescript
import { detectExistingSEOTags, SEOTagType } from '@stati/core';

const existingTags = detectExistingSEOTags(html);

if (existingTags.has(SEOTagType.Title)) {
  console.log('Title tag already exists');
}
```

---

## Types

### `SEOTagType`

Enum defining the nine types of SEO tags that can be generated.

```typescript
enum SEOTagType {
  Title = 'title',
  Description = 'description',
  Keywords = 'keywords',
  Author = 'author',
  Robots = 'robots',
  Canonical = 'canonical',
  OpenGraph = 'opengraph',
  Twitter = 'twitter',
  StructuredData = 'structuredData',
}
```

**Usage:**

```typescript
import { SEOTagType } from '@stati/core';

const tags = [SEOTagType.Title, SEOTagType.Description];
```

---

### `SEOContext`

Context object passed to SEO generation functions.

```typescript
interface SEOContext {
  /** The page object with frontmatter and metadata */
  page: PageModel;

  /** Stati configuration */
  config: StatiConfig;

  /** Base URL of the site */
  siteUrl: string;

  /** Set of tag types to exclude from generation (blacklist mode) */
  exclude?: Set<SEOTagType>;

  /** Set of tag types to include in generation (whitelist mode) */
  include?: Set<SEOTagType>;
}
```

**Tag Filtering Modes:**

- **Default mode**: `exclude` and `include` both undefined → generate all tags
- **Whitelist mode**: `include` defined → generate only specified tag types
- **Blacklist mode**: `exclude` defined → generate all except specified tag types

---

### `SEOValidationResult`

Result of SEO metadata validation.

```typescript
interface SEOValidationResult {
  /** Whether the SEO metadata is valid */
  valid: boolean;

  /** Array of blocking validation errors */
  errors: string[];

  /** Array of non-blocking warnings */
  warnings: string[];
}
```

**Example:**

```typescript
{
  valid: false,
  errors: ['Invalid canonical URL format'],
  warnings: [
    'Title is too short (< 5 characters)',
    'Description is too long (> 160 characters)'
  ]
}
```

---

### `SitemapEntry`

Represents a single entry in the XML sitemap.

```typescript
interface SitemapEntry {
  /** The absolute URL of the page */
  url: string;

  /** Last modification date (ISO 8601 format: YYYY-MM-DD) */
  lastmod?: string;

  /** How frequently the page changes */
  changefreq?: ChangeFrequency;

  /** Priority of this URL relative to other URLs (0.0 to 1.0) */
  priority?: number;
}
```

---

### `SitemapGenerationResult`

Result of sitemap generation.

```typescript
interface SitemapGenerationResult {
  /** The generated XML sitemap content (or sitemap index if split) */
  xml: string;

  /** Number of entries in the sitemap(s) */
  entryCount: number;

  /** Size of the XML in bytes */
  sizeInBytes: number;

  /** Individual sitemap files (when split into multiple sitemaps) */
  sitemaps?: Array<{ filename: string; xml: string }>;
}
```

---

### `ChangeFrequency`

Valid values for sitemap entry change frequency.

```typescript
type ChangeFrequency =
  | 'always'
  | 'hourly'
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'yearly'
  | 'never';
```

---

## Configuration Interfaces

### `SEOConfig`

Global SEO configuration options.

```typescript
interface SEOConfig {
  /** Enable automatic SEO injection (default: true) */
  autoInject?: boolean;

  /** Default author for all pages */
  defaultAuthor?: AuthorConfig;

  /** Enable debug logging (default: false) */
  debug?: boolean;
}
```

**Example:**

```typescript
{
  autoInject: true,
  defaultAuthor: {
    name: 'John Doe',
    email: 'john@example.com',
    url: 'https://johndoe.com'
  },
  debug: false
}
```

---

### `SEOMetadata`

Page-level SEO metadata (used in frontmatter).

```typescript
interface SEOMetadata {
  /** Custom SEO title (overrides page title) */
  title?: string;

  /** Meta description */
  description?: string;

  /** Meta keywords */
  keywords?: string[];

  /** Canonical URL */
  canonical?: string;

  /** Author information (string name or full config object) */
  author?: string | AuthorConfig;

  /** Prevent indexing */
  noindex?: boolean;

  /** Robots meta tag configuration (string or full config object) */
  robots?: string | RobotsConfig;

  /** Open Graph configuration */
  openGraph?: OpenGraphConfig;

  /** Twitter Card configuration */
  twitter?: TwitterCardConfig;

  /** Structured data (Schema.org JSON-LD) */
  structuredData?: Record<string, unknown>;

  /** Sitemap priority (0.0 to 1.0) */
  priority?: number;

  /** Sitemap change frequency */
  changeFreq?: ChangeFrequency;
}
```

---

### `AuthorConfig`

Author information configuration.

```typescript
interface AuthorConfig {
  /** Author's name (required) */
  name: string;

  /** Author's email address */
  email?: string;

  /** Author's website URL */
  url?: string;
}
```

---

### `RobotsConfig`

Configuration for robots meta tag.

```typescript
interface RobotsConfig {
  /** Allow indexing */
  index?: boolean;

  /** Allow following links */
  follow?: boolean;

  /** Allow archiving */
  archive?: boolean;

  /** Allow snippets in search results */
  snippet?: boolean;

  /** Allow indexing images */
  imageindex?: boolean;

  /** Allow translation in search results */
  translate?: boolean;

  /** Maximum snippet length (-1 for unlimited) */
  maxSnippet?: number;

  /** Maximum image preview size */
  maxImagePreview?: 'none' | 'standard' | 'large';

  /** Maximum video preview duration (-1 for unlimited) */
  maxVideoPreview?: number;
}
```

---

### `OpenGraphConfig`

Open Graph meta tags configuration.

```typescript
interface OpenGraphConfig {
  /** OG title (defaults to SEO title or page title) */
  title?: string;

  /** Content type (default: 'website') */
  type?: string;

  /** OG description (defaults to SEO description) */
  description?: string;

  /** OG image (string URL or OpenGraphImage object) */
  image?: string | OpenGraphImage;

  /** The canonical URL of the page */
  url?: string;

  /** Site name */
  siteName?: string;

  /** Locale (e.g., 'en_US') */
  locale?: string;

  /** Article-specific metadata */
  article?: OpenGraphArticle;
}
```

---

### `OpenGraphImage`

Open Graph image configuration.

```typescript
interface OpenGraphImage {
  /** Image URL (required) */
  url: string;

  /** Image alt text */
  alt?: string;

  /** Image width in pixels */
  width?: number;

  /** Image height in pixels */
  height?: number;
}
```

**Recommended dimensions:** 1200 x 630 pixels

---

### `OpenGraphArticle`

Article-specific Open Graph metadata.

```typescript
interface OpenGraphArticle {
  /** Publication date (ISO 8601) */
  publishedTime?: string;

  /** Last modification date (ISO 8601) */
  modifiedTime?: string;

  /** Author name */
  author?: string;

  /** Article section/category */
  section?: string;

  /** Article tags */
  tags?: string[];
}
```

---

### `TwitterCardConfig`

Twitter Card meta tags configuration.

```typescript
interface TwitterCardConfig {
  /** Card type (default: 'summary_large_image') */
  card?: 'summary' | 'summary_large_image' | 'app' | 'player';

  /** Site's Twitter handle (e.g., '@mysite') */
  site?: string;

  /** Creator's Twitter handle (e.g., '@johndoe') */
  creator?: string;

  /** Twitter card title */
  title?: string;

  /** Twitter card description */
  description?: string;

  /** Twitter card image URL */
  image?: string;

  /** Twitter card image alt text */
  imageAlt?: string;
}
```

---

### `SitemapConfig`

Sitemap generation configuration.

```typescript
interface SitemapConfig {
  /** Enable sitemap generation (default: false) */
  enabled?: boolean;

  /** Default priority for all pages (0.0 to 1.0, default: 0.5) */
  defaultPriority?: number;

  /** Default change frequency (default: 'monthly') */
  defaultChangeFreq?: ChangeFrequency;

  /** Glob patterns for pages to exclude from sitemap */
  excludePatterns?: string[];

  /** Glob patterns for pages to include in sitemap (if specified, only these are included) */
  includePatterns?: string[];

  /** Filter function to include/exclude pages */
  filter?: (page: PageModel) => boolean;

  /** Transform URLs before adding to sitemap */
  transformUrl?: (url: string, page: PageModel, config: StatiConfig) => string;

  /** Transform sitemap entries (return null to exclude) */
  transformEntry?: (entry: SitemapEntry, page: PageModel) => SitemapEntry | null;

  /**
   * Priority rules based on URL patterns.
   * Applied in order, first match wins.
   *
   * @example
   * ```typescript
   * priorityRules: [
   *   { pattern: '/blog/**', priority: 0.8 },
   *   { pattern: '/docs/**', priority: 0.9 },
   *   { pattern: '/', priority: 1.0 }
   * ]
   * ```
   */
  priorityRules?: Array<{ pattern: string; priority: number }>;

  /** Generate sitemap index for multiple sitemaps (default: false) */
  generateIndex?: boolean;
}
```

**Notes:**

- Sitemap URLs use `config.site.baseUrl` for absolute URL generation
- `transformEntry` can return `null` to exclude an entry from the sitemap
- `transformUrl` receives the config object as third parameter for advanced transformations
- `excludePatterns` and `includePatterns` use glob syntax (e.g., `/blog/**`, `*.html`)
- `priorityRules` are applied in order; first matching pattern sets the priority

---

### `RobotsTxtConfig`

Robots.txt generation configuration.

```typescript
interface RobotsTxtConfig {
  /** Enable robots.txt generation (default: false) */
  enabled?: boolean;

  /**
   * User agent specific rules.
   * Each entry defines rules for a specific user agent.
   *
   * @example
   * ```typescript
   * userAgents: [
   *   {
   *     userAgent: 'Googlebot',
   *     allow: ['/public/'],
   *     disallow: ['/admin/']
   *   }
   * ]
   * ```
   */
  userAgents?: Array<{
    userAgent: string;
    allow?: string[];
    disallow?: string[];
  }>;

  /** Global paths to disallow (applies to all user agents) */
  disallow?: string[];

  /** Global paths to explicitly allow (applies to all user agents) */
  allow?: string[];

  /** Crawl delay in seconds */
  crawlDelay?: number;

  /** Sitemap URL or boolean to auto-include sitemap.xml (default: true if sitemap enabled) */
  sitemap?: string | boolean;

  /** Custom lines to add to robots.txt */
  customLines?: string[];
}
```

**Example:**

```typescript
{
  enabled: true,
  userAgents: [
    {
      userAgent: 'Googlebot',
      allow: ['/api/public/'],
      disallow: ['/admin/']
    }
  ],
  disallow: ['/admin/', '/private/'],
  allow: ['/api/public/'],
  sitemap: true, // Auto-include sitemap.xml if sitemap is enabled
  customLines: ['# Custom robots.txt directives']
}
```

---

## Complete Configuration Example

```typescript
// stati.config.ts
import { defineConfig } from '@stati/core';

export default defineConfig({
  site: {
    title: 'My Site',
    baseUrl: 'https://example.com',
  },

  seo: {
    autoInject: true,
    defaultAuthor: {
      name: 'John Doe',
      email: 'john@example.com',
      url: 'https://johndoe.com',
    },
    debug: false,
  },

  sitemap: {
    enabled: true,
    defaultPriority: 0.5,
    defaultChangeFreq: 'monthly',
    excludePatterns: ['/draft/**', '/admin/**'],
    filter: (page) => !page.frontMatter.draft,
    transformUrl: (url, page, config) => url.endsWith('/') ? url : `${url}/`,
    priorityRules: [
      { pattern: '/', priority: 1.0 },
      { pattern: '/blog/**', priority: 0.8 },
      { pattern: '/docs/**', priority: 0.9 },
    ],
  },

  robots: {
    enabled: true,
    disallow: ['/admin/', '/private/'],
    allow: ['/api/public/'],
  },
});
```

## See Also

- [SEO Configuration Guide](/configuration/seo) - User-friendly configuration guide
- [SEO Usage Scenarios](/advanced/seo-usage-scenarios) - Usage strategies for different project needs
- [Core Concepts: ISG](/core-concepts/isg) - How SEO integrates with ISG caching
