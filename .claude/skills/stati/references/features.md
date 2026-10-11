# Generated features, lifecycle hooks, ISG, and metrics

Enable features deliberately. A working development page is not proof that
production-only artifacts were generated. Validate files, schemas, links, and
warnings after a production build.

## SEO

SEO auto-injection defaults on (`seo.autoInject !== false`).
Config fields: `defaultAuthor`, `autoInject`, `debug`.
`defaultAuthor` is an object with required `name`, optional `email`, `url`.

```ts
seo: {
  autoInject: true,
  debug: true,
  defaultAuthor: { name: 'Example author', url: 'https://example.com/about' },
}
```

Frontmatter `seo` supports:

- `title`, `description`, `keywords: string[]`, `canonical`.
- `author`: string or `{ name, email?, url? }`.
- `robots`: string or object with `index`, `follow`, `archive`, `snippet`,
  `imageindex`, `translate`, `maxSnippet`, `maxImagePreview`, `maxVideoPreview`.
- `noindex`.
- `openGraph`: `title`, `type`, `description`, `image`, `url`, `siteName`, `locale`,
  `article`. An image is a URL string or `{ url, alt?, width?, height? }`.
  Article fields: `publishedTime`, `modifiedTime`, `author`, `section`, `tags`.
- `twitter`: `card`, `site`, `creator`, `title`, `description`, `image`, `imageAlt`.
  Card values: `summary`, `summary_large_image`, `app`, `player`.
- `structuredData`: a JSON-LD object.
- `priority`, `changeFreq` exist in SEO types, but use the separate `sitemap`
  metadata contract for sitemap controls rather than assuming they are equivalent.

Fallbacks: SEO title -> frontmatter title -> site title; SEO description ->
frontmatter description -> site description; keywords -> tags; canonical ->
absolute page URL. Open Graph defaults to website type. Relative OG images are
made absolute using the site base URL.

Normally let auto-injection manage tags. For explicit placement:

```ts
seo: {
  autoInject: false;
}
```

```eta
<%~ stati.generateSEO() %>
```

Optional helper groups:
`title`, `description`, `keywords`, `author`, `robots`, `canonical`, `opengraph`,
`twitter`, `structuredData`.

```eta
<%~ stati.generateSEO(['canonical', 'opengraph', 'twitter']) %>
```

`generateSEOMetadata` is the lower-level programmatic API with
`{ page, config, siteUrl, logger, include?, exclude? }`; include/exclude are sets
of tag types, and include takes precedence. The template helper supplies context
and a no-op logger; it does not expose validation warnings. In the build path,
SEO debug enables warning visibility. Invalid metadata may warn and continue.

Avoid duplicate `<title>`, descriptions, canonical links, or OG tags. Check real
HTML after auto-injection, especially existing manually authored head partials.
Automatic head injection requires a closing `</head>`; malformed/empty layouts
may silently receive no tags. Always verify the emitted document.
Robots metadata is not access control; `noindex` does not make a page private.

## Search

```ts
search: {
  enabled: true,
  indexName: 'search-index',
  hashFilename: true,
  maxContentLength: 1000,
  maxPreviewLength: 500,
  headingLevels: [2, 3, 4, 5, 6],
  exclude: ['/private/**'],
  includeHomePage: false,
  autoInjectMetaTag: true,
}
```

Those values show the feature defaults; search is disabled until enabled.
Default output is `search-index-<8-character-hash>.json`, not a fixed
`search-index.json`. With `hashFilename: false`, the filename is stable.

The file is an **object**, not a bare document array:

```ts
{
  version: string,
  generatedAt: string,
  documentCount: number,
  documents: Array<{
    id: string,
    url: string,
    anchor: string,
    title: string,
    heading: string,
    level: number,
    content: string,
    breadcrumb: string,
    tags?: string[],
  }>,
}
```

Included pages get page-level documents (`level: 1`, empty anchor); configured
heading levels produce additional section documents. Drafts are always excluded,
even if the HTML build includes them. Home is excluded by default.

Default injection:

```html
<meta name="stati:search-index" content="/search-index-HASH.json" />
```

Use this tag in browser code rather than guessing a filename. Templates can
inspect `stati.assets?.searchIndexPath`. Search generation runs in development
as well as production; its JSON does not include a built-in interactive UI.
Search `exclude` patterns match page URLs, not source filenames.
Implement loading/error/empty-result states, keyboard interaction, focus
management, and safe text rendering. Do not use `innerHTML` for arbitrary index
text. If matching/fuzzy-search needs a dependency, explicitly install/configure
it; the generator does not automatically supply a browser search engine.

## Sitemap

Production-only, opt-in:

```ts
sitemap: {
  enabled: true,
  defaultPriority: 0.5,
  defaultChangeFreq: 'monthly',
  excludePatterns: ['/private/**'],
  priorityRules: [{ pattern: '/', priority: 1 }],
}
```

Additional fields: `includePatterns`, `filter(page)`,
`transformUrl(url, page, config)`, `transformEntry(entry, page)`,
`generateIndex`.

Filter sequence: `frontMatter.sitemap.exclude`, excludes, includes, custom
filter. URL transformation precedes entry creation; entry transformation runs
last and can return `null`.

```yaml
sitemap:
  exclude: false
  lastmod: '2026-10-01'
  changefreq: weekly
  priority: 0.8
```

Defaults apply at generation. Lastmod falls back from `sitemap.lastmod` to
`updated`, then `date` (do not assume every date alias is read everywhere).
Priority falls back to matching rules then default; changefreq to default.
Frequency values: `always`, `hourly`, `daily`, `weekly`, `monthly`, `yearly`,
`never`. URLs use `site.baseUrl`.

Output is `sitemap.xml`. Above 50,000 entries, generation splits files and makes
an index automatically. In the checked source, `generateIndex` is typed but not
consulted by splitting logic; do not promise it forces/disables index output.

## robots.txt

Production-only, opt-in:

```ts
robots: {
  enabled: true,
  userAgents: [
    { userAgent: '*', allow: ['/'], disallow: ['/private/'] },
  ],
  sitemap: true,
}
```

Fields: `enabled`, `userAgents`, global `allow`, `disallow`, `crawlDelay`,
`sitemap: string | boolean`, `customLines`.
Agent groups support `userAgent`, `allow`, `disallow`; per-agent crawl delay is
supported by the lower-level API, not exposed/preserved by site config conversion.
Without rules the low-level default allows `/` for `*`.

Set `robots.sitemap` **explicitly**. Type comments suggesting it is automatically
connected to `sitemap.enabled` do not match the checked conversion logic.
`true` uses the standard sitemap URL; a string supplies a sitemap location.
Validate host/domain and file existence. Robots directives are crawler hints,
not authentication or protection of confidential data.

## RSS

Production-only, opt-in. Feed metadata requires `filename`, `title`, `description`:

```ts
rss: {
  enabled: true,
  feeds: [{
    filename: 'rss.xml',
    title: 'Example articles',
    description: 'Latest articles from Example.',
    contentPatterns: ['**/blog/**/*.md'],
    filter: (page) => page.url !== '/blog',
    maxItems: 20,
    sortBy: 'date-desc',
  }],
}
```

RSS patterns match **source paths**, unlike bundle output patterns or URL-oriented
search/sitemap patterns. Portable includes such as `**/blog/**/*.md` avoid a
machine-specific absolute prefix.

Optional fields:
`link`, `language`, `copyright`, `managingEditor`, `webMaster`, `category`, `ttl`,
`image`, `maxItems`, `contentPatterns`, `excludePatterns`, `filter`, `sortBy`,
`sortFn`, `itemMapping`, `enclosure`, `namespaces`, `customItemElements`.
Channel `image` is `{ url, title, link, width?, height? }`.
RSS recommends width at most 144 and height at most 400; the checked generator
does not clamp these values. Supply valid positive dimensions.

Sort values: `date-desc` (default), `date-asc`, `title-asc`, `title-desc`, `custom`.
Use `sortFn(a, b)` only with `sortBy: 'custom'`. Date sorting reads
`frontMatter.publishedAt` then `date`; missing dates sort after dated pages.
`maxItems` limits only when positive.

`itemMapping`:

| Key                    | Accepted mapping                                              |
| ---------------------- | ------------------------------------------------------------- |
| `title`, `description` | Frontmatter property name or `(page) => string`               |
| `pubDate`              | Property name or `(page) => Date \| string`                   |
| `author`               | Property name or callback returning string/undefined          |
| `category`             | Property name or callback returning string/string[]/undefined |
| `link`, `guid`         | `(page, config) => string` only                               |
| `includeContent`       | Boolean                                                       |

Extensions: `enclosure(page)` returns `{ url, length, type }` or undefined;
`namespaces` maps prefixes to URLs; `customItemElements(page)` returns a record
of string/number/boolean/undefined values.

Default links use the absolute site base URL plus page URL. Invalid dates may
be omitted; mapping exceptions can warn and yield undefined; invalid RSS config
can log errors and skip feeds without failing the entire build. Inspect XML,
dates, absolute links, item count, exclusions, and any generated extension tags.
Add an actual `<link rel="alternate" type="application/rss+xml">` to the layout
when desired; configuring RSS does not imply every template advertises it.

## ISG and cache

ISG caches build output. It does **not** run server-side on visitors' requests.
Static hosting needs a scheduled build/webhook/redeployment for new content.

```ts
isg: {
  enabled: true,
  ttlSeconds: 21600,
  maxAgeCapDays: 365,
  aging: [
    { untilDays: 7, ttlSeconds: 3600 },
    { untilDays: 30, ttlSeconds: 21600 },
  ],
}
```

Actual loader default is enabled, despite older docs saying false.
Use positive page `ttlSeconds` for an override. Aging rules sort ascending by
`untilDays`, choose the first applicable threshold based on parsed publication
age, and otherwise use the default TTL. Max-age capping suppresses time-based
refresh of old dated pages, not content/dependency-driven changes. Do not use it
as an immutable-content guarantee.

Cache manifest: `.stati/cache/manifest.json`; entries track output path, inputs
hash, template dependencies, tags, publication/render timestamps, TTL/max age;
the manifest can also track navigation hash. ISG compares source/dependency
hashes and time constraints. Do not manually edit manifest entries as an author.

Invalidation:

```sh
npx stati invalidate "tag:news"
npx stati invalidate "path:/blog"
npx stati invalidate "glob:/blog/**"
npx stati invalidate "age:1week"
```

- No query invalidates the full cache.
- `tag:` uses exact equality.
- `path:` uses exact/prefix matching, **not glob expansion**.
- Use `glob:` for wildcards.
- Multiple space-separated terms are **OR**, not AND.
- `age:` uses **renderedAt >= cutoff**: recently rendered entries within the
  interval, not content published before it or entries older than the interval.
  Days/weeks/months/years are supported; month/year arithmetic is calendar-based.
- Invalidating removes manifest entries; it does not regenerate or delete output.
  Run a subsequent build.

Use `--force` when validating output-affecting config/hook/filter changes instead
of assuming their effects are always captured by existing cache hashes. External
data changes need an explicit rebuild strategy. A before-render mutation cannot
affect an earlier cache-hit decision.

## Hooks: actual lifecycle

```ts
hooks: {
  beforeAll: async ({ config, pages }) => { /* loaded pages available */ },
  beforeRender: async ({ config, page }) => { /* mutate frontmatter before render */ },
  afterRender: async ({ config, page }) => { /* no html argument */ },
  afterAll: async ({ config, pages }) => { /* generated artifacts available */ },
}
```

`BuildContext = { config, pages }`, `PageContext = { page, config }`.
Hooks may be synchronous or async.

Actual order:

1. Load config/cache/content, construct navigation/processors/bundle preparation.
2. `beforeAll` receives the **already loaded** pages.
3. For each cache miss: `beforeRender` -> Markdown -> Eta -> SEO/search/bundle
   injection -> production HTML write/cache update -> `afterRender`.
4. Dev mode queues writes; `afterRender` runs before the deferred physical write.
5. Save cache/copy assets/generate applicable search/sitemap/robots/RSS output.
6. `afterAll`.

Cache hits skip both per-page hooks. All-build hooks still run.
`afterRender` does not receive HTML or an output path and is not a returned-HTML
transform API. Do not post-process via nonexistent `ctx.html`.
Navigation is constructed before `beforeAll`; do not assume mutations automatically
rebuild it. Generate files before the Stati build if content discovery must see them.
Hook failures propagate; don't hide errors with broad catches.

## Metrics

CLI:

```sh
npm run build -- --metrics --metrics-detailed --metrics-html
```

Flags include `--metrics`, `--metrics-file <path>`, `--metrics-detailed`,
`--metrics-html`. Default reports live under `.stati/metrics/`.
No `metrics` block exists in `StatiConfig`; use CLI/build API options.

Reports contain schemaVersion, metadata, totals, phases, counts, ISG metrics,
optional page timings, and optional incremental measurements. Detailed mode
adds per-page timings. Use these to identify expensive hooks, repeated partials,
asset copying, bundling, and poor cache hit rates before optimizing.

Low-level APIs are indexed in the resource directory. Inspect the installed
signatures for advanced use; normal sites should prefer configuration and CLI.
