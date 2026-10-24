---
title: 'SEO'
description: 'Complete API reference for Stati SEO functions, types, and configuration interfaces'
order: 6
seo:
  title: 'SEO API'
---

# SEO

Complete reference for Stati's SEO API including functions, types, and configuration interfaces.

## Functions

### `generateSEOMetadata()`

Generates SEO metadata tags as an HTML string based on page context and configuration.

**Signature:**

```typescript
function generateSEOMetadata(context: SEOContext): string;
```

**Parameters:**

- `context` (SEOContext): The SEO generation context containing page data, configuration, and tag filters

**Returns:**

- `string`: HTML string containing all generated SEO meta tags

**Example:**

```typescript
import { generateSEOMetadata } from '@stati/core';
import { SEOTagType } from '@stati/core/types';

const html = generateSEOMetadata({
  page: pageData,
  config: statiConfig,
  siteUrl: 'https://example.com',
  logger: logger, // Logger instance for validation warnings
  exclude: new Set([SEOTagType.Title]), // Skip title generation
});
```

> **Note:** `SEOTagType` is a runtime enum. Import it from `@stati/core/types`; the `@stati/core` entry point exports it as a type only, so importing it as a value from `@stati/core` fails: a TypeScript error, or a `SyntaxError` when the module loads in JavaScript.

**Behavior:**

- Validation errors are logged as warnings rather than throwing to allow builds to continue with degraded SEO
- This prevents a single SEO issue from blocking the entire build
- Validation warnings are logged when `config.seo.debug` is enabled
- The robots meta tag gets `noindex` on the 404 page (`/404` or `/404/`) unless the page sets `seo.noindex`, or a `seo.robots` value that says whether to index it (`index`, `noindex`, `all`, `none` or `index:`)

---

### `generateSEO()`

Generates SEO tags for a page. Templates call it as `stati.generateSEO(tags?)`, with the page and configuration filled in. It is one of Stati's own functions on `stati`, not a helper under `stati.helpers`.

**Signature:**

```typescript
function generateSEO(
  context: {
    page: PageModel;
    config: StatiConfig;
    site?: SiteConfig;
  },
  tags?: Array<SEOTagType | string>,
): string;
```

**Parameters:**

- `context` (object): The SEO generation context
  - `page` (PageModel): The page model with frontmatter and metadata
  - `config` (StatiConfig): The Stati configuration object
  - `site` (SiteConfig, optional): Site configuration (can be omitted if provided in config)
- `tags` (Array<SEOTagType | string>, optional): Array of tag types to generate. Use **strings** in Eta templates (`'title'`, `'description'`, etc.). The `SEOTagType` enum is only available for programmatic/TypeScript usage.

**Returns:**

- `string`: HTML string containing generated SEO meta tags

**Examples:**

```html
<!-- Generate all SEO tags -->
<%~ stati.generateSEO() %>

<!-- Generate specific tags using strings (in Eta templates) -->
<%~ stati.generateSEO(['title', 'description', 'canonical']) %>

<!-- Generate specific tags with Open Graph and Twitter -->
<%~ stati.generateSEO(['title', 'opengraph', 'twitter']) %>
```

**Programmatic Usage (TypeScript):**

```typescript
import { generateSEO } from '@stati/core';
import { SEOTagType } from '@stati/core/types';

// Using enum values in TypeScript code
const html = generateSEO({ page, config, site: config.site }, [
  SEOTagType.Title,
  SEOTagType.OpenGraph,
]);

// Or using strings
const html2 = generateSEO({ page, config, site: config.site }, ['title', 'description']);
```

**Template Context:**

When used in Eta templates, Stati automatically wraps this function to provide the context, so you call it as `stati.generateSEO(tags)` where `stati` is the template context object.

---

### `generateSitemap()`

Generates an XML sitemap from an array of pages.

> **Production Only**: In Stati's build pipeline, sitemaps are only generated during production builds to improve development build performance.

**Signature:**

```typescript
function generateSitemap(
  pages: PageModel[],
  config: StatiConfig,
  sitemapConfig: SitemapConfig,
): SitemapGenerationResult;
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
import type { SitemapConfig } from '@stati/core';

const sitemapConfig: SitemapConfig = {
  enabled: true,
  defaultPriority: 0.5,
  defaultChangeFreq: 'monthly',
};

const result = generateSitemap(pages, config, sitemapConfig);

console.log(result.xml); // XML string
console.log(result.entryCount); // Number of URLs
console.log(result.sizeInBytes); // Size in bytes
console.log(result.sitemaps); // Array of sitemap files (if split)
```

**Notes:**

- Automatically splits into multiple sitemaps if entries exceed 50,000
- Returns sitemap index XML if multiple sitemaps are generated
- Uses `config.site.baseUrl` for absolute URLs
- Leaves out the 404 page and pages marked `noindex`, as [`generateSitemapEntry()`](#generatesitemapentry) does

---

### `generateRobotsTxt()`

Generates robots.txt content from low-level options.

> **Production Only**: In Stati's build pipeline, robots.txt is only generated during production builds to improve development build performance.

**Signature:**

```typescript
function generateRobotsTxt(options?: RobotsTxtOptions): string;

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
      crawlDelay: 1,
    },
    {
      userAgent: '*',
      disallow: ['/admin/', '/api/'],
    },
  ],
  sitemaps: ['https://example.com/sitemap.xml'],
  custom: ['# Custom comment'],
});
```

---

### `generateRobotsTxtFromConfig()`

Generates robots.txt content from Stati configuration.

**Signature:**

```typescript
function generateRobotsTxtFromConfig(config: RobotsTxtConfig, siteUrl?: string): string;
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
      disallow: ['/admin/'],
    },
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
function autoInjectSEO(html: string, options: AutoInjectOptions): string;

interface AutoInjectOptions {
  /** Page model with frontmatter and metadata */
  page: PageModel;
  /** Stati configuration */
  config: StatiConfig;
  /** Site base URL */
  siteUrl: string;
  /** Logger for validation warnings and debug output (required) */
  logger: Logger;
  /** Enable debug logging */
  debug?: boolean;
}
```

**Parameters:**

- `html` (string): The rendered HTML content
- `options` (AutoInjectOptions): Options object containing page, config, siteUrl, logger, and optional debug flag

**Returns:**

- `string`: Modified HTML with injected SEO tags

**Example:**

```typescript
import { autoInjectSEO } from '@stati/core';

const enrichedHtml = autoInjectSEO(renderedHtml, {
  page: pageModel,
  config: statiConfig,
  siteUrl: 'https://example.com',
  logger,
  debug: false,
});
```

**Behavior:**

- Returns original HTML unchanged if `config.seo.autoInject === false`
- Detects existing SEO tags and skips generation for those tag types
- Injects generated tags before `</head>` closing tag; HTML without `</head>` is returned unchanged
- Preserves existing tags exactly (no modification)

`Logger` is the logger interface used across Stati (`import type { Logger } from '@stati/core/types'`): an object with the required methods `info`, `success`, `warning`, `error`, `status`, `building`, `processing` and `stats`, each taking a message string, plus optional progress and formatting methods. The same `logger` field is required in `SEOContext` for `generateSEOMetadata`, `generateOpenGraphTags` and `generateTwitterCardTags`.

---

### `generateOpenGraphTags()`

Generates Open Graph meta tags from SEO context.

**Signature:**

```typescript
function generateOpenGraphTags(context: SEOContext): string[];
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
  logger,
});

console.log(ogTags.join('\n'));
```

Values the page's front matter leaves out come from the config, as during a build: `og:locale` from `site.defaultLocale` in Open Graph form, and on the pages `seo.articles` matches, `og:type` `article` and the `article:*` tags. See [site-wide defaults](/configuration/seo#site-wide-defaults).

---

### `generateTwitterCardTags()`

Generates Twitter Card meta tags from SEO context.

**Signature:**

```typescript
function generateTwitterCardTags(context: SEOContext): string[];
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
  logger,
});

console.log(twitterTags.join('\n'));
```

`twitter:site` falls back to `seo.twitter.site`, and `twitter:creator` to the `twitter` handle of the page's own `seo.author`, then of `seo.defaultAuthor`. An author's name is never printed as `twitter:creator`.

---

### `generateSitemapEntry()`

Generates a single sitemap entry from a page model.

**Signature:**

```typescript
function generateSitemapEntry(
  page: PageModel,
  config: StatiConfig,
  sitemapConfig: SitemapConfig,
): SitemapEntry | null;
```

**Parameters:**

- `page` (PageModel): The page to generate entry for
- `config` (StatiConfig): Stati configuration
- `sitemapConfig` (SitemapConfig): Sitemap configuration

**Returns:**

- `SitemapEntry | null`: Generated entry or null if page should be excluded

Returns `null` for the 404 page (`/404` or `/404/`) and for pages marked `noindex` by `seo.noindex`, `seo.robots.index: false` or a `seo.robots` string with a `noindex` or `none` directive, unless the page sets `sitemap: { exclude: false }`. See [Sitemap configuration](/configuration/seo#advanced-sitemap-options).

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
function generateSitemapXml(entries: SitemapEntry[]): string;
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
  { url: 'https://example.com/about', priority: 0.8 },
];

const xml = generateSitemapXml(entries);
```

---

### `generateSitemapIndexXml()`

Generates sitemap index XML for multiple sitemaps.

**Signature:**

```typescript
function generateSitemapIndexXml(sitemapUrls: string[], siteUrl: string): string;
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
  'https://example.com',
);
```

---

### `shouldAutoInject()`

Determines if auto-injection should be enabled for a page.

**Signature:**

```typescript
function shouldAutoInject(config: StatiConfig, page: PageModel): boolean;
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

### Utility functions

#### `escapeHtml()`

Escapes HTML special characters for safe output.

**Signature:**

```typescript
function escapeHtml(text: string): string;
```

**Parameters:**

- `text` (string): Text to escape

**Returns:**

- `string`: HTML-escaped text

---

#### `generateRobotsContent()`

Generates robots meta tag content from SEO metadata.

**Signature:**

```typescript
function generateRobotsContent(seo: SEOMetadata): string;
```

**Parameters:**

- `seo` (SEOMetadata): SEO metadata with robots configuration

**Returns:**

- `string`: Comma-separated robots directives (for example `'noindex, nofollow'`), or an empty string when there are none. A string `seo.robots` value is returned as-is, with `noindex, ` prepended when `seo.noindex` is set.

---

#### `validateSEOMetadata()`

Validates SEO metadata and returns validation results.

**Signature:**

```typescript
function validateSEOMetadata(seo: SEOMetadata, pageUrl: string): SEOValidationResult;
```

**Parameters:**

- `seo` (SEOMetadata): The SEO metadata to validate
- `pageUrl` (string): The page URL for error context

**Returns:**

- `SEOValidationResult`: Object with `valid`, `errors`, and `warnings` arrays

**Example:**

```typescript
import { validateSEOMetadata } from '@stati/core';

const result = validateSEOMetadata(page.frontMatter.seo ?? {}, page.url);

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
function detectExistingSEOTags(html: string): Set<SEOTagType>;
```

**Parameters:**

- `html` (string): HTML content to scan

**Returns:**

- `Set<SEOTagType>`: Set of detected tag types

**Example:**

```typescript
import { detectExistingSEOTags } from '@stati/core';
import { SEOTagType } from '@stati/core/types';

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
import { SEOTagType } from '@stati/core/types';

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

  /** Logger for debug output and validation warnings */
  logger: Logger;

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
  errors: ['Invalid canonical URL: example.com/page'],
  warnings: [
    'Title is only 4 characters (recommended: 50-60)',
    'Description is 182 characters (recommended: 150-160)'
  ]
}
```

`validateSEOMetadata` reports these checks:

- **Errors:** `canonical` is not an `http`/`https` URL; `priority` outside 0.0–1.0; Open Graph image `width`/`height` not a positive integer
- **Warnings:** `title` shorter than 5 or longer than 70 characters; `description` shorter than 50 or longer than 160 characters; Open Graph or Twitter image URL that is neither absolute nor starting with `/`; `structuredData` larger than 100 KB

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
type ChangeFrequency = 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
```

---

## Configuration interfaces

### `SEOConfig`

Global SEO configuration options.

```typescript
interface SEOConfig {
  /** Enable automatic SEO injection (default: true) */
  autoInject?: boolean;

  /** Default author for pages whose front matter names none */
  defaultAuthor?: AuthorConfig;

  /** Site-wide Twitter Card values */
  twitter?: SEOTwitterConfig;

  /** Pages that get Open Graph article metadata, chosen by URL */
  articles?: SEOArticlesConfig;

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
    url: 'https://johndoe.com',
    twitter: '@johndoe'
  },
  twitter: { site: '@example' },
  articles: { include: ['/blog/*'] },
  debug: false
}
```

Stati checks `seo.twitter`, `seo.articles` and `seo.defaultAuthor.twitter` when it loads the config, and stops with an error when one has the wrong type, such as `include: '/blog/*'` instead of `include: ['/blog/*']`.

---

### `SEOTwitterConfig`

Site-wide Twitter Card values. A page's `seo.twitter` front matter overrides them.

```typescript
interface SEOTwitterConfig {
  /** The site's handle, with or without '@', printed as twitter:site */
  site?: string;
}
```

---

### `SEOArticlesConfig`

The pages that are articles. On a matching page, Stati prints `og:type` as `article` and fills in `article:published_time` (the publish date), `article:modified_time` (front matter `updated`), one `article:tag` per front matter tag and `article:author` (the author's `url`), each only when the page's `seo.openGraph` front matter leaves it out.

```typescript
interface SEOArticlesConfig {
  /** Glob patterns matched against the whole page URL, as in bundle include */
  include: string[];

  /** Glob patterns for URLs that are never articles; win over include */
  exclude?: string[];
}
```

Generated pages and every page of a paginated listing never match. See [article pages](/configuration/seo#article-pages).

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

  /** Validated to be 0.0-1.0, but not used by the sitemap */
  priority?: number;

  /** Not used by the sitemap */
  changeFreq?: ChangeFrequency;
}
```

To set a page's sitemap values, use the separate `sitemap` front matter block (`sitemap.priority`, `sitemap.changefreq`, `sitemap.lastmod`, `sitemap.exclude`); see [Per-page sitemap configuration](/configuration/seo#per-page-sitemap-configuration).

---

### `AuthorConfig`

Author information configuration.

```typescript
interface AuthorConfig {
  /** Author's name (required) */
  name: string;

  /** Author's email address */
  email?: string;

  /** Author's website or profile URL, printed as article:author on article pages */
  url?: string;

  /** Author's Twitter/X handle, with or without '@', printed as twitter:creator */
  twitter?: string;
}
```

The same shape serves `seo.defaultAuthor` in the config and `seo.author` in front matter. A page that names its own author never gets the default author's `url` or `twitter`.

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

  /** Content type (default: 'article' on pages seo.articles matches, 'website' elsewhere) */
  type?: string;

  /** OG description (defaults to SEO description) */
  description?: string;

  /** OG image (string URL or OpenGraphImage object), or false for none, not even one generated by images.og */
  image?: string | OpenGraphImage | false;

  /** The canonical URL of the page */
  url?: string;

  /** Site name */
  siteName?: string;

  /** Locale such as 'en_US', printed as written (default: site.defaultLocale in Open Graph form) */
  locale?: string;

  /** Article-specific metadata, printed when type is 'article' */
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

  /** Author profile URL (Open Graph expects a URL here) */
  author?: string;

  /** Article section/category */
  section?: string;

  /** Article tags */
  tags?: string[];
}
```

On the pages [`seo.articles`](#seoarticlesconfig) matches, each field the front matter leaves out except `section` is filled in from the page: `publishedTime` from the publish date, `modifiedTime` from `updated`, `tags` from `tags` and `author` from the author's `url`. Dates are printed in ISO 8601 form, such as `2026-01-10T00:00:00.000Z`.

---

### `TwitterCardConfig`

Twitter Card meta tags configuration.

```typescript
interface TwitterCardConfig {
  /** Card type (default: 'summary_large_image') */
  card?: 'summary' | 'summary_large_image' | 'app' | 'player';

  /** Site's Twitter handle (e.g., '@mysite'); default: seo.twitter.site */
  site?: string;

  /** Creator's Twitter handle (e.g., '@johndoe'); default: the author's twitter handle */
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

````typescript
interface SitemapConfig {
  /** Enable sitemap generation (default: false) */
  enabled?: boolean;

  /** Default priority for all pages (0.0 to 1.0, default: 0.5) */
  defaultPriority?: number;

  /** Default change frequency (no default: omitted from entries unless set) */
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

  /** Declared but currently not read: splitting always produces an index */
  generateIndex?: boolean;
}
````

**Notes:**

- Sitemap URLs use `config.site.baseUrl` for absolute URL generation
- `transformEntry` can return `null` to exclude an entry from the sitemap
- `transformUrl` receives the config object as third parameter for advanced transformations
- `excludePatterns`, `includePatterns` and `priorityRules[].pattern` are matched against the page URL (`/blog/first-post`, `/` for the home page). A pattern containing `*` or `?` is a glob that must match the whole URL (`/blog/**` matches `/blog/first-post` but not `/blog`). A pattern without wildcards matches that exact URL, or any URL below it when followed by `/` (`/blog` matches `/blog` and `/blog/first-post`, but not `/blog-archive`); `/` matches only the home page
- `priorityRules` are applied in order; first matching pattern sets the priority. A page's own `sitemap.priority` front matter wins over the rules
- `lastmod` comes from front matter `sitemap.lastmod`, then `updated`, then `date`; `publishedAt` is not used
- Priorities are written with one decimal place (`0.85` becomes `0.8`)
- Above 50,000 entries the sitemap is split into `sitemap-1.xml`, `sitemap-2.xml`, … and `sitemap.xml` becomes a sitemap index

---

### `RobotsTxtConfig`

Robots.txt generation configuration.

````typescript
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

  /** Crawl delay in seconds (written in the `User-agent: *` group) */
  crawlDelay?: number;

  /** `true` adds `Sitemap: <baseUrl>/sitemap.xml`; a string adds that URL; unset adds nothing */
  sitemap?: string | boolean;

  /** Custom lines to add to robots.txt */
  customLines?: string[];
}
````

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
  sitemap: true, // Adds "Sitemap: <baseUrl>/sitemap.xml"
  customLines: ['# Custom robots.txt directives']
}
```

The global `allow`, `disallow` and `crawlDelay` values form a `User-agent: *` group, written after the `userAgents` groups; within a group, `Allow` lines come before `Disallow` lines. Without any rules, Stati writes `User-agent: *` / `Allow: /`. `sitemap: true` adds the line whether or not sitemap generation is enabled, so enable `sitemap` too.

---

## Complete configuration example

```typescript
// stati.config.ts
import { defineConfig } from '@stati/core';

export default defineConfig({
  site: {
    title: 'My Site',
    baseUrl: 'https://example.com',
    defaultLocale: 'en-US', // og:locale en_US
  },

  seo: {
    autoInject: true,
    defaultAuthor: {
      name: 'John Doe',
      email: 'john@example.com',
      url: 'https://johndoe.com',
      twitter: '@johndoe',
    },
    twitter: { site: '@example' },
    articles: { include: ['/blog/*'] },
    debug: false,
  },

  sitemap: {
    enabled: true,
    defaultPriority: 0.5,
    defaultChangeFreq: 'monthly',
    excludePatterns: ['/draft/**', '/admin/**'],
    filter: (page) => !page.frontMatter.draft,
    transformUrl: (url, page, config) => (url.endsWith('/') ? url : `${url}/`),
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

## See also

- [SEO Configuration Guide](/configuration/seo) - User-friendly configuration guide
- [SEO Usage Scenarios](/advanced/seo-usage-scenarios) - Usage strategies for different project needs
- [Incremental Static Generation](/core-concepts/isg) - How SEO integrates with ISG caching
