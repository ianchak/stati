# Generated features, lifecycle hooks, ISG, and metrics

Enable features deliberately. A working development page is not proof that
production-only artifacts were generated. Validate files, schemas, links, and
warnings after a production build.

## SEO

SEO auto-injection defaults on (`seo.autoInject !== false`).
Config fields: `defaultAuthor`, `twitter`, `articles`, `autoInject`, `debug`.
`defaultAuthor` is an object with required `name`, optional `email`, `url`,
`twitter` (core 2.1+).

```ts
seo: {
  autoInject: true,
  debug: true,
  defaultAuthor: { name: 'Example author', url: 'https://example.com/about', twitter: '@example' },
  twitter: { site: '@example' },
  articles: { include: ['/blog/*'] },
}
```

Site-wide defaults (core 2.1+), each used only where front matter leaves the value out:

- `og:locale`: `site.defaultLocale` converted to Open Graph form (`en-US` ->
  `en_US`, `zh-Hant-TW` -> `zh_TW`). A tag without a two-letter region (`en`,
  `es-419`) prints no `og:locale`; `seo.debug` warns. Before 2.1, Stati printed
  `defaultLocale` as written, an invalid `en-US`.
- `twitter:site`: `seo.twitter.site`. `twitter:creator`: the `twitter` handle of
  the page's own `seo.author`, then of `seo.defaultAuthor`. A page naming its own
  author never gets the default's handle or URL. Handles print with one `@`.
  Without a handle there is no `twitter:creator`; before 2.1 Stati printed the
  author's name there.
- `seo.articles` (`include` required, `exclude` wins; whole-URL globs as in
  bundles): matching pages print `og:type` `article`, `article:published_time`
  (`page.publishedAt`, ISO), `article:modified_time` (front matter `updated`),
  one `article:tag` per tag and `article:author` (the author's `url`), filled
  field by field. Generated pages and every page of a paginated listing never
  match. No `seo.articles` means no derived article tags.
- `noindex` (core 2.2+): `seo.noindex: true` on [the 404 page](#the-404-page),
  unless its front matter sets `seo.noindex`, or a `seo.robots` value that says
  whether to index (`index`, `noindex`, `all`, `none`, or `index:` in the
  object). A robots value such as `nofollow` gets `noindex` added.
- Stati writes these into `page.frontMatter.seo` after `beforeAll` (hook values
  win), so templates see them in `stati.page.seo` and changing a default rebuilds
  the cached pages it changes. After `beforeRender` it works out again the values
  it filled in and the hook left alone, so a hook that sets `seo.author` or `tags`
  gets matching tags; values the hook sets are kept. Prefer them over a `beforeAll` hook or layout tags:
  one `og:`/`twitter:` tag in the layout turns off that whole generated group.
- Config load rejects a non-array `seo.articles.include`/`exclude`, unknown keys in
  `seo.articles` or `seo.twitter`, and non-string handles.

Frontmatter `seo` supports:

- `title`, `description`, `keywords: string[]`, `canonical`.
- `author`: string or `{ name, email?, url?, twitter? }`.
- `robots`: string or object with `index`, `follow`, `archive`, `snippet`,
  `imageindex`, `translate`, `maxSnippet`, `maxImagePreview`, `maxVideoPreview`.
- `noindex`.
- `openGraph`: `title`, `type`, `description`, `image`, `url`, `siteName`, `locale`,
  `article`. An image is a URL string or `{ url, alt?, width?, height? }`.
  Article fields: `publishedTime`, `modifiedTime`, `author`, `section`, `tags`.
- `twitter`: `card`, `site`, `creator`, `title`, `description`, `image`, `imageAlt`.
  Card values: `summary`, `summary_large_image`, `app`, `player`.
- `structuredData`: a JSON-LD object, printed as it is written. Stati does not HTML-escape the values (entities would corrupt the JSON), and writes every `<` in a key or value as `\u003c` so nothing can close the `<script>` tag.
- `priority`, `changeFreq` exist in SEO types, but use the separate `sitemap`
  metadata contract for sitemap controls rather than assuming they are equivalent.

Fallbacks: SEO title -> frontmatter title -> site title; SEO description ->
frontmatter description -> site description; keywords -> tags; canonical ->
absolute page URL. Open Graph defaults to website type (article on pages
`seo.articles` matches). Relative OG images are
made absolute using the site base URL. `twitter:card` defaults to
`summary_large_image`.

### Generated Open Graph images

With `images.og` (needs `@stati/images`), each page that sets no
`seo.openGraph.image` gets a generated card and the tags `og:image`,
`og:image:width`, `og:image:height`, `og:image:alt` and `twitter:image`.
`seo.openGraph.image: false` gives a page no image; `images.og.exclude` takes URL
globs. The 404 page never gets a card (core 2.2+). Production builds require
`site.baseUrl` to be an absolute, non-localhost URL.

- **Template:** the nearest `og.eta` from the page's folder up to `site/`, else the
  card built into the package (`node_modules/@stati/images/templates/og.eta`).
  `og.eta` is not a layout or included template and never becomes a page.
- **Context:** the layout's `stati` object with `stati.content` empty and
  `stati.og` = `{ width, height }`. `stati.include()` and `stati.helpers` work;
  `stati.body` is absent, and relative (`./`) names fail because the built-in card has no file.
- **CSS:** Satori's subset. Inline `style` attributes only (no classes, `<style>`
  or Sass), flexbox only, and every element with more than one child needs
  `display:flex`. Unsupported CSS fails the dev build with the template path.
  Local `<img src="/...">` is read from `public/`, a relative `src` from the
  template's folder; inline `<svg>` works. `stati.image()` resolves as in layouts
  (relative to the page), and the card inlines the original file, never a
  generated variant.
- **Fonts:** Archivo 800, Inter 400/500 and Fira Code 400 are bundled (Latin,
  Latin-1, Latin Extended-A). Add more with
  `images.og.fonts: [{ name, path, weight?, style? }]`, paths relative to the
  project, TTF/OTF/WOFF only (no WOFF2).
- **Caching:** the image URL hashes the rendered card HTML, fonts and options, so it
  changes when the title, description or site title change, not on body edits.
- **Layouts with hand-written OG tags** read the image as `stati.ogImage`
  (`url` is absolute). `stati.generateSEO()` includes it automatically, even when
  called from an included template.

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

## The 404 page

Core 2.2+ treats the page at URL `/404` or `/404/` (`site/404.md`, or a `/404/`
permalink) as the site's not-found page, the file `stati dev` and `stati preview`
serve for a missing URL. Only the root one counts: `/docs/404` is an ordinary page.

| Output           | The 404 page               | Front matter to change it                       |
| ---------------- | -------------------------- | ----------------------------------------------- |
| Sitemap          | Left out                   | `sitemap.exclude: false` + `seo.noindex: false` |
| Search index     | Left out                   | `search: true` (`exclude` applies)              |
| RSS feeds        | Never an item              | None                                            |
| `stati.nav`      | Left out; `navNode` absent | `nav: true`                                     |
| `images.og` card | None                       | Its own `seo.openGraph.image`                   |
| Robots meta tag  | `noindex` (an SEO default) | `seo.noindex`, or robots deciding indexing      |
| Collections      | Unchanged (root member)    | Not applicable                                  |

Before 2.2 sites excluded it by hand (`excludePatterns: ['/404']`,
`search.exclude`, `images.og.exclude`, `**/404.md` feed patterns, front matter
`seo.noindex`/`sitemap.exclude`); those still work and are now redundant. Don't
add `Disallow: /404` to robots.txt: a crawler that may not fetch the page never
reads its `noindex`, and hosts send `/404.html` with a 200 when it is requested
directly.

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
  fields: ['description', 'date'], // optional; default none
}
```

Those values show the feature defaults; search is disabled until enabled.
Default output is `search-index-<8-character-hash>.json`, not a fixed
`search-index.json`. With `hashFilename: false`, the filename is stable.
Core 1.29.1+ hashes the index content (1.24.3–1.29.0 hashed the build time, so
every production build with search re-rendered every page). The name is in each
page's cache hash: editing indexed text re-renders all pages once; a build with
no indexed-text change reuses them. `stati build` deletes older index files.
The index is built after `beforeAll`, before rendering; `beforeRender` content
changes do not reach it.
Generated pages (`[param].md`) are left out unless the template sets
`search: true`; pages 2+ of a paginated listing are always left out. So is the
404 page unless it sets `search: true` (core 2.2+).

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
    fields?: Record<string, unknown>, // page-level documents, with search.fields
  }>,
}
```

Included pages get page-level documents (`level: 1`, empty anchor); configured
heading levels produce additional section documents.

`search.fields` (core 2.9+) lists front matter fields to copy onto page-level
documents, under `fields`, so a results list can show a description, date or
section without embedding that data in every page. A page's missing or `null`
value is left out, dates become ISO strings, and a value JSON cannot hold is
skipped with a warning. Heading documents never carry them. Collections and
navigation do not exist when the index is built, so a derived value such as a
section must be front matter (a `beforeAll` hook can set it). The fields are in
the index content, so editing one renames the index and re-renders every page.
A `fields` that is not an array of non-empty strings stops the build. Drafts are always excluded,
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

Filter sequence: `frontMatter.sitemap.exclude: true`; then (core 2.2+) the 404
page and pages marked noindex (`seo.noindex`, `seo.robots.index: false`, a robots
string with a `noindex` or `none` directive), skipped when front matter sets
`sitemap.exclude: false`; excludes, includes, custom filter. URL transformation
precedes entry creation; entry transformation runs last and can return `null`.

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

### Google News sitemap

`sitemap.news` writes a separate Google News sitemap (the `news:` namespace) on
production builds, so a news site needs no `afterAll` hook for it:

```ts
sitemap: {
  enabled: true,
  news: {
    include: ['/news/*/*'], // required: URL globs, like seo.articles.include
    publicationName: 'Stati News', // default site.title
    language: 'en', // default from site.defaultLocale, else 'en'
    maxAgeDays: 2, // default 2: Google reads the last two days
    filename: 'news-sitemap.xml', // default
  },
},
```

Without `news` nothing is written. Each `<url>` has `news:publication` (name,
language), `news:publication_date` (the page's `publishedAt`, ISO 8601 in UTC)
and `news:title` (the `title` front matter), all XML-escaped, under `site.baseUrl`
and its base path. Newest first, at most 1000. Left out: drafts, generated pages,
later pages of a listing, the 404 page, noindex pages (unless `sitemap.exclude:
false`), `sitemap.exclude: true`, and pages with no valid date or title (a
warning names them). The sitemap's `excludePatterns`, `includePatterns`,
`filter`, `transformUrl` and `transformEntry` do not apply. No recent article
still writes a valid empty `urlset`. The file is not written when
`sitemap.enabled` is off. Invalid options (`include` not an array of strings,
`language` not an ISO 639 code like `en`, `maxAgeDays` not above 0, a `filename` that is not an `.xml` name of letters, digits, `.`, `_` and `-`, or is
`sitemap.xml`/`sitemap-<n>.xml`) fail config loading.

Freshness is decided at build time: a site built once and served for weeks
keeps one day's list. Tell the user to rebuild on publish or on a schedule.

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
`true` uses the standard sitemap URL, plus the news sitemap when `sitemap.news`
is set (no `customLines` entry needed; an existing `Sitemap:` line for it is not
repeated); a string supplies a sitemap location and lists only that.
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

Generated pages and pages 2+ of a paginated listing are never feed items; they
share their template's source path, so patterns could not tell them apart. Nor
is the 404 page (core 2.2+). Generated and later listing pages are in the
sitemap by default (exclude them with `excludePatterns`, `filter`, or
`sitemap: { exclude: true }` in the template).

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
Use `sortFn(a, b)` only with `sortBy: 'custom'`. Date sorting and the default
`pubDate` use the first valid of `publishedAt`, `published`, `date`, `createdAt`;
missing dates sort after dated pages.
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

Cache manifest: `.stati/manifest.json`; entries track output path, inputs
hash, template dependencies, tags, publication/render timestamps, TTL/max age,
and from core 1.29 `readsCollection`/`readsNav`. ISG compares source/dependency
hashes and time constraints. Do not manually edit manifest entries as an author.

What a page read while rendering is part of its hash (core 1.29+): reading
`stati.collection` adds the collection summary (members' URL, publish date,
`title`, `description`, `tags`, `draft`, or `collections.summaryFields`, where
`wordCount` and `readingTime` name Stati's computed counts);
reading `stati.nav`/`stati.page.navNode` adds the navigation hash. So a body
edit rebuilds only that page, while a retitled/added/deleted post also rebuilds
the pages that list it, in `stati build` and dev alike. Paginated pages depend
on their slice and page count; generated pages on their own items. Entries
from older versions lack the flags and rebuild once. Earlier versions never
rebuilt listings for other pages' changes (hence `beforeAll` "fingerprint"
hacks), and the dev server forced a full rebuild on navigation changes.

`stati build` (1.29+) deletes the HTML of pages that no longer exist, plus
emptied folders, and only files the manifest records; `public/` and other tools'
files survive, as does anything a linked folder reaches outside `dist/`. A file
it cannot delete keeps its manifest entry and is retried on the next build.

Invalidation:

```sh
npx stati invalidate "tag:news"
npx stati invalidate "path:/blog"
npx stati invalidate "glob:/blog/**"
npx stati invalidate "age:1week"
```

- No query invalidates the full cache.
- `tag:` uses exact equality. A generated tag page carries its key and label
  (`tag:css` and `tag:CSS`).
- `path:` uses exact/prefix matching, **not glob expansion**.
- Use `glob:` for wildcards.
- Multiple space-separated terms are **OR**, not AND.
- `age:` uses **renderedAt >= cutoff**: recently rendered entries within the
  interval, not content published before it or entries older than the interval.
  Days/weeks/months/years are supported; month/year arithmetic is calendar-based.
- Invalidating removes manifest entries; it does not regenerate or delete output.
  Run a subsequent build.

Use `--force` when validating output-affecting config/hook/helper changes instead
of assuming their effects are always captured by existing cache hashes. External
data changes need an explicit rebuild strategy. Data a helper returns from a
`beforeAll` closure is not tracked; write what a page shows into its frontmatter
in `beforeAll`, or read it from `stati.collection`. A before-render mutation
cannot affect an earlier cache-hit decision.

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

1. Load config/cache/content, expand `[param].md` templates, `collections.generate`
   entries and `paginate` listings into pages, construct navigation/processors/
   bundle preparation.
2. `beforeAll` receives the **already loaded** pages, generated ones included.
3. For each cache miss: `beforeRender` -> Markdown -> Eta -> SEO/search/bundle
   injection -> production HTML write/cache update -> `afterRender`.
4. Dev mode queues writes; `afterRender` runs before the deferred physical write.
5. Delete output of pages that no longer exist, save cache, copy assets,
   generate applicable search/sitemap/robots/RSS output.
6. `afterAll`.

Cache hits skip both per-page hooks. All-build hooks still run.
`afterRender` does not receive HTML or an output path and is not a returned-HTML
transform API. Do not post-process via nonexistent `ctx.html`.
Navigation, generated pages and pagination are constructed before `beforeAll`; do
not assume mutations automatically rebuild them (hook-added tags make no tag pages). Generate files before the Stati build if content discovery must see them.
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
adds per-page timings, with each page's template loads and renders. Use these to
identify expensive hooks, heavily repeated includes (`templateRenders` against
`includeCacheHits`), asset copying, bundling, and poor cache hit rates before
optimizing.

Low-level APIs are indexed in the resource directory. Inspect the installed
signatures for advanced use; normal sites should prefer configuration and CLI.
