# @stati/core

## 2.10.0

### Minor Changes

- d9ad4c4: add the base path to the search index

## 2.9.0

### Minor Changes

- 78eaca2: copy front matter fields into search index documents

## 2.8.3

### Patch Changes

- 080415b: keep RSS feeds when a callback or one feed fails

## 2.8.2

### Patch Changes

- f4e7f1b: A page that rendered with an error in a production build is rendered again, and its error logged again, on every build until it is fixed

## 2.8.1

### Patch Changes

- e27f093: update documentation

## 2.8.0

### Minor Changes

- 6b4d646: add word count and reading time to pages

### Patch Changes

- 6b4d646: skip unclosed and list-item code fences in word counts
- 6b4d646: hash front matter reading time in listing summaries

## 2.7.2

### Patch Changes

- 874fac0: end adjacent Eta tags with a semicolon in production

## 2.7.1

### Patch Changes

- 051ebc1: load a stati.config.ts that imports CommonJS packages such as fs-extra

## 2.7.0

### Minor Changes

- f1a4ea5: add Google News sitemap

## 2.6.0

### Minor Changes

- 0f5e34e: add news starter template

## 2.5.1

### Patch Changes

- a522376: read numeric, boolean and date front matter titles, descriptions and tags as text instead of crashing the build

## 2.5.0

### Minor Changes

- c34cb74: serve a site from a subfolder taken from site.baseUrl

## 2.4.6

### Patch Changes

- 2a50cb1: serialize JSON-LD structured data safely for script tags

## 2.4.5

### Patch Changes

- add context7.json to index Stati docs with Context7

## 2.4.4

### Patch Changes

- move stylesheet scanner timing checks to the perf suite
- move remaining scanner timing checks to the perf suites

## 2.4.3

### Patch Changes

- 95b80ea: keep POSIX backslashes when comparing the output folder
- 053cfb7: skip pages whose URL has a .. segment and guard the output path

## 2.4.2

### Patch Changes

- 73e19ab: reject an outDir that holds or sits inside the site folders

## 2.4.1

### Patch Changes

- refresh benchmark baselines and drop the unchecked p95
- cut benchmark headroom to 25ms so 2x slowdowns fail

## 2.4.0

### Minor Changes

- 66371c4: `createDevServer()` and `createPreviewServer()` no longer take `configPath`. Both servers, and the builds the dev server runs, load `stati.config.*` from the current directory. Before, the dev server read its own settings from the current directory but built with the config next to `configPath`, and the preview server ignored the option.

## 2.3.1

### Patch Changes

- 5740adf: Open Graph and Twitter card image URLs are now built with `resolveAbsoluteUrl` unconditionally, so a `site.baseUrl` that ends in a trailing slash no longer produces a double slash in `og:image` and `twitter:image`. `resolveAbsoluteUrl` also handles protocol-relative URLs (`//cdn.example.com/og.png` resolves against the site's scheme instead of producing a double slash) and relative paths, and image values that are not strings (or lack a `url`) no longer throw while the page's SEO tags are generated. Sitemap dates (`sitemap.lastmod`, `updated`, `date`) are now validated before formatting: an invalid date such as `updated: soon` is skipped with a warning that names the page and the field, instead of failing the build with `RangeError: Invalid time value`. Date strings are accepted only in ISO 8601 shape (a date, or a date-time with an optional time and timezone), and a date-time without a timezone designator is read as UTC, so `lastmod` no longer depends on the build machine's local time.

## 2.3.0

### Minor Changes

- 7c360d2: Production builds name stylesheets after their content and point the pages' `<link>` tags at those names, so a deploy that changes the CSS gives it a new URL. A `.css` file in the static directory that a page links gets a copy at `_assets/[folder/]name-[hash].css` (the file is still copied under its own name), and `build()` and `createDevServer()` take `tailwind: { input, output }`: production builds run Tailwind CSS after the last page renders and write `_assets/[name]-[hash].css`, adding a link on pages that have none. Relative `url()` references and `@import` strings become paths from the site root, and pages kept by the ISG cache get the new names written in. New `css` options (`hash`, `minify`, `autoInject`) and `stati.assets.stylesheetPaths`. Set `css.hash: false` to keep every stylesheet's own name; the first build that hashes renders every page again.

## 2.2.0

### Minor Changes

- 36ead37: Stati recognises the site's 404 page, the page at `/404` or `/404/` that `stati dev` and `stati preview` serve for a missing URL, and keeps it out of the outputs that list a site's pages. Sites no longer repeat the same exclusions across their config and front matter.

  - The sitemap, the search index and every RSS feed leave it out, and `images.og` draws no card for it.
  - `stati.nav` leaves it out, so `stati.page.navNode` is `undefined` on that page.
  - Its robots meta tag gets `noindex`, filled into `seo.noindex` like the other SEO defaults, unless the page sets `seo.noindex`, or a `seo.robots` value that says whether to index it (`index`, `noindex`, `all`, `none`, or `index` in the object form). A value such as `nofollow` gets `noindex` added. Requested by its own URL, the page is an ordinary file that most hosts send with a 200, so without `noindex` a search engine could list it.
  - Front matter opts back in: `sitemap.exclude: false` (with `seo.noindex: false`, or the page is listed as noindex), `search: true`, `nav: true`. Only the page at the site root counts: `/docs/404` is an ordinary page. Collections are unchanged.

  The sitemap also leaves out every page marked noindex (`seo.noindex: true`, `seo.robots.index: false`, or a `seo.robots` string with a `noindex` or `none` directive), as search engines report a sitemap URL marked noindex as an error. `sitemap.exclude: false` keeps such a page in.

  Existing exclude patterns and front matter keep working; they are now redundant. A 404 page cached by an earlier version is rebuilt once.

## 2.1.0

### Minor Changes

- fb8b9cb: Site-wide SEO defaults for `og:locale`, the Twitter handles and Open Graph article tags, so a site no longer writes them into every page's front matter from a `beforeAll` hook. Each value is used only where the page's front matter leaves it out.

  - `og:locale` comes from `site.defaultLocale` converted to Open Graph form: `en-US` becomes `en_US`, `pt-br` becomes `pt_BR`, `zh-Hant-TW` becomes `zh_TW`. Stati used to print `defaultLocale` as written, so a site following the docs printed an invalid `en-US`. A tag without a region, such as `en`, now prints no `og:locale`, and `seo.debug` warns about it.
  - `seo.defaultAuthor.twitter` and a page's own `seo.author.twitter` give `twitter:creator`; `seo.twitter.site` gives `twitter:site`. Handles are accepted with or without `@` and printed with one. A page that names its own author never gets the default author's handle.
  - `seo.articles: { include, exclude }` takes URL glob patterns, with the same rules as bundle `include` and `exclude`. A matching page prints `og:type` `article`, `article:published_time` from its publish date, `article:modified_time` from `updated`, one `article:tag` per tag and `article:author` from the author's `url`, filled in value by value. Generated pages and the pages of a paginated listing never match.
  - Stati writes these values into each page's `seo` front matter after the `beforeAll` hook, so templates read them as `stati.page.seo`, and changing one of them rebuilds the cached pages it changes. After the `beforeRender` hook, values Stati filled in are worked out again from the page as the hook left it, so a hook that sets the author or tags gets matching tags.
  - The config loader rejects `seo.articles`, `seo.twitter` and `seo.defaultAuthor.twitter` values of the wrong type.

  `twitter:creator` no longer falls back to the author's name, which was never a valid handle. Sites that relied on it lose the tag until they set a `twitter` handle on the author.

## 2.0.1

### Patch Changes

- update @stati/cli and @stati/core to version 2.0.0 in package.json and package-lock.json

## 2.0.0

### Major Changes

- 30ed01f: Front matter is read with js-yaml 4 instead of gray-matter, so `npm audit` no longer reports the advisories of gray-matter's js-yaml 3 and sprintf-js. Values follow YAML 1.2: `time: 10:30` is the text `10:30` instead of the number 630, `0755` is 755 instead of 493, and `1_000` is text. Dates, booleans and other values read as before. Front matter that cannot be read stops the build with the file and the line, and suggests quotes for a value that contains a colon. Such a file no longer builds on the next try with its front matter left in the page. Front matter in another language than YAML, such as `---js`, is an error instead of running as JavaScript, and front matter that is a list or a single value is an error instead of breaking the page's render.
- 704277f: Markdown renders with markdown-it 15, and links follow its rules. URLs with a scheme still become links, but a URL with a user name, such as `https://git@github.com/o/r.git`, is linked only up to the `@`. Domains without a scheme, such as `www.example.com`, no longer become links, so file names such as `README.md` stop turning into links too. Text shaped like an email address becomes a `mailto:` link whatever its domain, package versions such as `react@18.3.1` outside backticks included. `md.linkify.set()` in `markdown.configure` changes each of these with `fuzzyLink`, `fuzzyEmail` and `urlAuth`. Links now end at CJK punctuation and closing quotes, and image alt text keeps inline code. Plugins that import `markdown-it/lib/*` or call `md.utils.assign()`, `has()` or `isString()` need a version that supports markdown-it 15. markdown-it ships its own TypeScript types, so the `md` that `markdown.configure` receives is typed and `@types/markdown-it` is no longer needed; `@stati/core` exports the type as `MarkdownIt`.
- 8ba675f: Templates compose with `stati.include()` and `stati.layout()`, and the functions a site registers for its templates move to a top-level `helpers` option. `stati.include(name, props?, body?)` renders any `.eta` file under the source directory by its path, with props as `stati.props` and optional content as `stati.body`; `stati.layout(name, props?)` wraps a template in another one, so layouts share one page shell instead of repeating it. `stati.include.has()` and `stati.layout.has()` check whether a name resolves. Names are looked up from the page's folder up to the source directory, so a section overrides a template by having one at the same path; `/name` reads from the source directory and `./name` is relative to the calling template. Templates call helpers as `stati.helpers.name()`, and the dev server suggests the right name for a misspelled helper or a call without `helpers.`.

  Pages render only the templates they use. Stati lists the templates once per build, records the templates each page rendered and the names it looked up, and rebuilds a cached page when one of them changes, disappears or would now resolve to another file. The dev server rebuilds only the pages a template change affects, and nothing when no page uses the template. The build metrics count the distinct templates each page rendered (`templatesLoaded`) and add `templateRenders`, `includeCacheHits`, `templatesIndexed`, and the `templateIndexMs`, `markdownRenderTotalMs` and `postRenderTotalMs` phases, so the time pages spend outside their templates is no longer unaccounted for; the HTML report has a new design, nests the steps of page rendering under it, and records page times to fractions of a millisecond. Stati now uses Eta 4.

  Upgrading, as described in the [upgrade guide](https://stati.build/getting-started/upgrading-to-2):

  - `stati.partials` is removed: `stati.partials.header` becomes `stati.include('_partials/header')`, with the partial's path in place of its name, and `'card' in stati.partials` becomes `stati.include.has('_partials/card')`.
  - The `eta` config option is removed: `eta: { filters }` becomes `helpers`, and `stati.formatDate()` becomes `stati.helpers.formatDate()`. A helper named after a key of `stati`, such as `slugify`, no longer replaces Stati's value.
  - Eta's own `include()`, `includeAsync()`, `layout()`, `block()` and `blockAsync()` are blocked; use `stati.include()`, `stati.layout()` and layout props.
  - A `layout` in front matter is looked up from the page's folder like other names, so on a page in a folder with a template of the same name, write `layout: /name` for the root one. A `layout` that names no template now logs a warning.
  - Unused partials no longer render, so their errors and warnings go away.
  - Included templates render synchronously, so `await` in one is an error.
  - A missing include in a production build renders nothing and logs an error, instead of writing the page with the fallback HTML.
  - `this` in a helper is the helpers object.
  - The first build after upgrading re-renders every page once, because the cache records templates differently.

### Patch Changes

- 75f6f8b: Template tags that start with `(`, `[` or a template literal render under `stati dev` too. The line markers Eta adds in development no longer join them to the statement before, which failed with errors such as "1 is not a function".
- 3835b0a: Tailwind CSS 4 projects are recognized by `@tailwindcss/cli` or `@tailwindcss/postcss` in `package.json` as well as by `tailwindcss`, so their class inventory is written even without a `tailwind.config.js`. The comment at the top of `.stati/tailwind-classes.html` shows the `@source` rule that Tailwind CSS 4 needs to scan it, next to the `content` entry for Tailwind CSS 3.
- ff631ed: Stati finds content, templates and the dev server's CSS files with tinyglobby instead of fast-glob, so `npm audit` no longer reports the braces advisory that fast-glob brought in through micromatch. Content files are read in path order, so pages that sort equally, such as undated pages in the RSS feed and the sitemap, keep the same order on every build.

## 1.29.2

### Patch Changes

- bea0079: scan middle folders for partials on deep Windows pages

## 1.29.1

### Patch Changes

- 4f37eff: Fix cache reuse for sites with search: production builds name the hashed search index after its content instead of the build time, so a build that changes no indexed text reuses every cached page again (since 1.24.3 every production build with search re-rendered every page). The index is now generated before rendering, after `beforeAll`.

  `stati build` deletes the hashed TypeScript bundles and search index files that earlier builds wrote in `dist/`, and the bundle and source map `stati dev` leaves there.

  `stati dev` and `stati preview` serve `.mjs`, `.avif`, `.xml`, `.txt` and other common files with the right content type, serve the site's `404.html` for a missing URL, ignore query strings and decode escaped file names. They also no longer serve a file outside the output directory: a raw request for `/../dist`, when `dist/` has no `index.html`, could read `dist.html` next to it.

## 1.29.0

### Minor Changes

- b7f6663: Collection listings stay current, and collections can split listings into pages and generate a page per tag. Stati now records which pages read `stati.collection` and the navigation while they render, and rebuilds them when that data changes: retitling, retagging, adding or deleting a post rebuilds the post and the pages that list it, while a body edit still rebuilds only that post. This works in `stati build` as well as the dev server, which no longer forces a full rebuild when the navigation changes. `collections.summaryFields` sets which front matter fields count. `stati build` also deletes the HTML of pages that no longer exist, such as deleted posts, and only files its cache manifest records.

  Pages inside a folder now read that folder's collection, so posts can link to their neighbours without a hook, and any page can name a collection with `collection: /blog` in its front matter. `paginate: 10` splits a listing into `/blog`, `/blog/page/2` and so on, read as `stati.pagination`. A file named `[tag].md` with `generate: { from: tags }` becomes one page per tag, with `{tag}` in its front matter replaced by the tag, read as `stati.generated`; `collections.generate` in the config creates pages from data. `stati.slugify` gives the keys Stati uses in those URLs. On Windows, pages two or more folders deep no longer get a backslash in their URL. Changing an unquoted date in front matter, such as `updated: 2025-03-01`, now rebuilds the page; such dates were left out of its content hash. Tags edited while `stati dev` runs now reach the cache, so `stati invalidate "tag:…"` finds the page by its new tags.

  Upgrading: the first build after upgrading re-renders every page once, to record what each page reads. Pages inside a folder that has an `index.md` used to get `stati.collection` as `undefined`; layouts that show a listing whenever `stati.collection` is set now show it on those pages too. An `index.md` whose folder has no pages yet now gets an empty collection instead of `undefined`. `collection`, `paginate` and `generate` are now reserved front matter fields, and a Markdown file whose name is a word in brackets is a template rather than a page.

## 1.28.0

### Minor Changes

- 9b7c08d: Images get their size and lazy loading on every site. Markdown images now carry their intrinsic `width` and `height`, read from the file, plus `loading="lazy"` and `decoding="async"`, so pages no longer shift while images load. A page's first image near the top loads eagerly with `fetchpriority="high"`. Images next to a page's Markdown file (`./photo.jpg`) are copied to `/_img/`. In templates, `stati.image(src, { alt, sizes, priority })` renders the same markup.

  Two new features use the new `@stati/images` package: `images.responsive` writes AVIF and WebP variants with `srcset`, and `images.og` generates an Open Graph image for every page from an `og.eta` template or a built-in card. A page can opt out with `seo.openGraph.image: false`. Turning either feature on without the package installed stops the build with an install command.

  Upgrading: the first build after upgrading re-renders every page once. If your CSS sets `max-width` on images, make sure it also sets `height: auto`, or sized images stretch when narrowed. To keep images exactly as written, set `images: false`. An invalid `images` block now stops the build instead of falling back to the default configuration.

## 1.27.2

### Patch Changes

- c636a50: track the rendered layout for nested collection index pages

## 1.27.1

### Patch Changes

- 5bb2dba: Read page publish dates the same way everywhere. `PageModel.publishedAt`, and with it `stati.collection.recentPages` and navigation order, now accepts unquoted YAML dates (`publishedAt: 2026-01-01`) and falls back to `published`, `date` and `createdAt`, matching ISG aging. RSS sorting and the default `pubDate` use the same fields and skip invalid values instead of stopping at them. Invalid dates are reported with a warning. The `FrontMatter` type now allows `Date` for `publishedAt` and `date`, and the bundled Stati agent skill describes the new behavior.

## 1.27.0

### Minor Changes

- d2ef0c0: In the dev server, reading an unknown `stati.*` property in an Eta template now fails with the template file, line, and a "Did you mean" suggestion in the error overlay. The bundled agent skill documents the check.

## 1.26.2

### Patch Changes

- 77d3f5e: Upgrade yargs to 18 in `@stati/cli` and require Node.js `^22.12.0 || >=24`. The published packages now declare this in `engines`, and new projects from `create-stati` declare it too. Node 22.0–22.11 is no longer supported because yargs 18 requires 22.12 or later.

## 1.26.1

### Patch Changes

- 20aed75: upgrade ESLint 9 to 10

  Errors that wrap a lower-level failure (file system operations, cache manifest saves, build and dev server locks, ISG config validation, Tailwind executable lookup, and create-stati styling and package.json setup) now keep the original error as `cause`. Messages are unchanged.

## 1.26.0

### Minor Changes

- enforce single-line commit messages with trailers

## 1.25.0

### Minor Changes

- 4b0bd14: Fail fast when the dev or preview server port is unavailable

  The dev and preview servers now check that their port can be bound before doing any startup work (dev server lock, TypeScript watchers, initial build). If the port is already in use or not permitted, startup stops immediately with a clear message, for example:

  ```text
  Port 3000 is already in use on localhost. Stop the process using it, or choose another port with --port or `dev.port` in your Stati config.
  ```

  Previously, the dev server ran a full initial build and then failed with a raw `EADDRINUSE` listen error. The new `PortUnavailableError` (with `port`, `host`, and `code`) is also used when the port is taken between the check and the actual bind.

## 1.24.5

### Patch Changes

- b96e91d: Upgrade runtime dependencies to pick up security fixes: `markdown-it` 14.3.2 (linkify quadratic-time DoS), `chokidar` 5 (drops the vulnerable `braces` glob chain from the dev watcher), `open` 11, `ws` 8.22, `esbuild` 0.28.2, and `fs-extra` 11.4.

## 1.24.4

### Patch Changes

- 392d0cd: Keep acronyms uppercase in search index breadcrumbs

  URL segments such as `cli`, `api`, `seo` and `rss` now produce
  "CLI > Commands" instead of "Cli > Commands" in `SearchDocument.breadcrumb`.

- bd929b8: Keep inline code and clean up tables in search index text

  `SearchDocument.content` now keeps the text of inline code instead of
  dropping it, so searching for an option or function name such as
  `ttlSeconds` finds the section that mentions it.
  - Code spans with longer delimiters (`` `a` ``) stay one span.
  - Spans written with three backticks inside a sentence are no longer
    mistaken for code blocks. Fenced blocks opened with `~~~` are now
    removed like those opened with three backticks.
  - Table pipes and delimiter rows are removed from indexed text.

## 1.24.3

### Patch Changes

- fc3b416: Fix page cache reuse when generated HTML is missing or rendering assets change.

## 1.24.2

### Patch Changes

- a15ba0f: Fix importing `SiteConfig` from `@stati/core` by exporting it from the package root.
  Correct the `@stati/core/types` and `@stati/core/config` export mappings to point to
  the declarations and JavaScript files emitted by the build.

## 1.24.1

### Patch Changes

- 50988fe: Fix a dev-server startup regression where pages could render before TypeScript bundles were available.
  In development mode, build now compiles TypeScript once when no bundles exist yet, ensuring scripts are injected on first load.

## 1.24.0

### Minor Changes

- a785e03: add CSS watcher diagnostics and slowdown check script
  - Introduced a new script to check for dev server rebuild slowdown.

## 1.23.4

### Patch Changes

- 38374fd: address memory leak during development sessions

  Added a dedicated test for memory leaks in the dev server by

## 1.23.3

### Patch Changes

- 1f37feb: update esbuild to version 0.28.1 in package.json

  Updated the esbuild dependency from version 0.27.0 to 0.28.1 to

## 1.23.2

### Patch Changes

- 57a8a2d: replace minimatch with matchesGlob for pattern matching

## 1.23.1

### Patch Changes

- 7ba43f5: standardize punctuation in documentation for consistency

## 1.23.0

### Minor Changes

- 79e4340: Add `site.description` config option as fallback for SEO meta tags

## 1.22.0

### Minor Changes

- 5e6eed8: Improve dev server performance with comprehensive caching and concurrency management
  - Cache markdown processor, templates, file hashes, and config in dev mode
  - Add dev server lock manager to prevent multiple instances
  - Optimize cache updates with fast mode that reuses existing deps
  - Add batched pending changes queue for incremental rebuilds
  - Skip TypeScript compilation in dev when bundles exist
  - Add isDevelopment(), isProduction(), isTest() helpers

### Patch Changes

- 5e6eed8: Optimize search index and Tailwind inventory writes in dev mode
  - Skip writes when content hash unchanged (search index and Tailwind inventory)
  - Use MD5 hash for accurate change detection
  - Escape single quotes in HTML output for security

## 1.21.0

### Minor Changes

- 480ba92: Add progress tracking methods to Logger interface (startProgress, updateProgress, endProgress, showRenderingSummary)

## 1.20.3

### Patch Changes

- c880f2c: Fix template dependency tracking to ignore commented-out includes and partials

## 1.20.2

### Patch Changes

- 8c21734: Add `isPathWithinDirectory` utility to prevent path traversal attacks in dev/preview servers
- 8c21734: Refactor template dependency tracking: extract resolver pattern, improve path normalization, expand test coverage

## 1.20.1

### Patch Changes

- 5b9470e: Fix dev server template change detection with path normalization. Template changes now reliably trigger page rebuilds by normalizing file watcher and cached dependency paths to a consistent format before comparison.

## 1.20.0

### Minor Changes

- 68e4b13: ### Build-time search index generation
  - Enable with `search: { enabled: true }` in config
  - Generates JSON index with page sections, headings, breadcrumbs, and tags
  - Auto-injects `<meta name="stati:search-index">` for client-side discovery
  - Hash-based filenames for cache busting
  - Configurable heading levels, content length, and exclusion patterns
  - Access index path in templates via `stati.assets.searchIndexPath`

## 1.19.0

### Minor Changes

- 5012b1a: ### Separate CLI and Core version tracking in metrics
  - Changed `BuildOptions.version` to separate `cliVersion` and `coreVersion` options for more granular version tracking
  - Updated `MetricsMeta` interface: replaced `statiVersion` with `cliVersion` and `coreVersion` fields
  - Updated `MetricRecorderOptions` to use `cliVersion` and `coreVersion` instead of `statiVersion`
  - Exported `getStatiVersion` utility function from core for use by CLI and consumers
  - Removed `formatMetricsSummary` export from core (metrics summary is now handled by CLI)

  ### Preview server caching fix
  - Changed preview server cache control from aggressive caching (`max-age=31536000`) to no-cache (`no-cache, no-store, must-revalidate`) to ensure fresh content during preview

## 1.18.0

### Minor Changes

- 53c2d82: feat(toc): add build-time TOC extraction and heading anchor generation
  - Add `TocEntry` type for representing table of contents entries with `id`, `text`, and `level` properties
  - Implement `slugify` utility for generating URL-friendly anchor IDs with full Unicode transliteration support
  - Enhance `renderMarkdown` to extract TOC entries and inject anchor IDs into heading elements (h2-h6)
  - Add `toc` array to template context (`page.toc`) for building in-page navigation
  - Add `markdown.toc` config option to enable/disable TOC extraction (default: true)
  - Handle duplicate heading IDs by appending numeric suffixes
  - Warn when frontmatter contains reserved keys that conflict with page properties

## 1.17.0

### Minor Changes

- 05e1648: # Add build performance metrics recording and reporting

  Introduces optional build metrics collection (totals, phases, ISG cache stats, optional per-page timing) plus JSON writing and summary helpers.

## 1.16.3

### Patch Changes

- 6c2e4ec: simplify partials rendering logic in renderPage function
- 6c2e4ec: replace affectedPages array with count for efficiency
- 6c2e4ec: simplify date validation in getPublishedDate function
- 6c2e4ec: improve handling of '\*\*' pattern in globToRegex function

## 1.16.2

### Patch Changes

- 897459e: add tests for open flag behavior in dev and preview commands

## 1.16.1

### Patch Changes

- update @stati/core to version 1.16.0 across all packages

## 1.16.0

### Minor Changes

- 23fdc3e: enable nested callable partial calls with dynamic context

### Patch Changes

- 6d57f11: improve dev server file watching with CSS watcher and pending changes queue
  - Add separate CSS watcher for output directory to enable live reload when external tools update CSS
  - Implement pending changes queue to prevent file changes from being lost during active builds
  - Improve incremental rebuild logging with action-specific messages (rebuilt, copied, deleted)
  - Fix recursive copy logging parameter in static asset copying

## 1.15.2

### Patch Changes

- exclude docs-site from compilation
- Releasing 3 package(s)

  Releases:

## 1.15.1

### Patch Changes

- a0c63fa: restructure to support multiple bundles
- a0c63fa: update dependencies to latest versions

## 1.14.0

### Minor Changes

- a178a68: add browser globals for TypeScript files in eslint config
- a178a68: add code block copy button functionality and theme toggle

## 1.13.0

### Minor Changes

- 38da83e: add TypeScript watcher to dev server
- 38da83e: add TypeScript support types and esbuild dependency
- 38da83e: implement typescript.utils.ts compiler
- 38da83e: integrate TypeScript compilation into build pipeline
- 38da83e: enhance config loader for .ts files

### Patch Changes

- 38da83e: remove TypeScript compilation from dev server setup
- 38da83e: add TypeScript support tests
  - Added typescript.utils.test.ts with tests for compileTypeScript, compileStatiConfig, cleanupCompiledConfig

- 38da83e: handle undefined bundleFilename when compilation is skipped

## 1.12.5

### Patch Changes

- resolve #74 cleanup script error

## 1.12.4

### Patch Changes

- 832b5de: update documentation links to point to new site URL

## 1.12.3

### Patch Changes

- update @stati/cli and @stati/core to latest versions

## 1.12.2

### Patch Changes

- ccca616: enhance console logs for better user feedback

## 1.12.1

### Patch Changes

- remove npm install step from getting started guide

## 1.12.0

### Minor Changes

- f0d1296: add mergeServerOptions utility for config handling
- f0d1296: add configuration for preview server in settings

## 1.11.6

### Patch Changes

- a10572a: reorganize utility functions naming and improve validation logic

## 1.11.5

### Patch Changes

- c4f6a32: update documentation for SEO, templates, and routing

## 1.11.4

### Patch Changes

- update @stati/cli and @stati/core versions

## 1.11.3

### Patch Changes

- update package.json metadata fields

## 1.11.2

### Patch Changes

- correct coverage range and configuration settings

## 1.11.1

### Patch Changes

- add coverage range configuration to codecov.yml

## 1.11.0

### Minor Changes

- 33c2d31: enhance RSS feed generation with logging support for errors
- 2eaf13b: add validation and generation for RSS feeds
- 2eaf13b: add comprehensive tests for RSS feed generation and validation
- 33c2d31: add validation and generation for RSS feeds
- 2eaf13b: add type guard for valid record-like objects
- 33c2d31: add comprehensive tests for RSS feed generation and validation
- 2eaf13b: enhance RSS feed generation with logging support for errors

### Patch Changes

- 2eaf13b: improve globToRegex handling of \*\* patterns
- 33c2d31: correct glob pattern matching logic for URL patterns
- 2eaf13b: correct glob pattern matching logic for URL patterns
- 2eaf13b: improve type safety for frontMatter access in getFieldValue
- 33c2d31: update links in RSS documentation for consistency
- 2eaf13b: add comprehensive tests for glob pattern utilities
- 2eaf13b: add build step to pre-commit hook
- 33c2d31: improve type safety for frontMatter access in getFieldValue
- 2eaf13b: consolidate glob pattern matching utilities
- 2eaf13b: validate pages array before generating RSS feeds

## 1.10.3

### Patch Changes

- add repository field to package metadata
- enhance CI workflows and add changeset bot for automation
- Releasing 3 package(s)

  Releases:

## 1.10.2

### Patch Changes

- add repository field to package metadata
- enhance CI workflows and add changeset bot for automation

## 1.10.1

### Patch Changes

- update @stati/cli and @stati/core versions

  Commit: 7077cfe

- update @stati/cli and @stati/core versions

  Commit: 6eb730a

## 1.10.0

### Minor Changes

- enhance inventory management with previous build loading

  Commit: 42b5e92

- enhance navigation with dynamic section rendering and styles

  Commit: 4ab7152

- add dynamic class tracking and inventory management

  Commit: b7485d4

- Implement navigation helpers and update templates

  Commit: 7229789

### Patch Changes

- add comprehensive tests for internal functions

  Commit: 1808d3b

- harden dev server and enhance documentation

  Commit: 4a1dd8e

- add integration tests for internal functions

  Commit: 07707a0

- update links to configuration and documentation resources

  Commit: 34c58f8

- refactor integration tests for better structure and reuse

  Commit: e9e8499

- remove outdated examples and configuration references

  Commit: 43ab1d1

- remove outdated ISG integration tests

  Commit: d9b370f

- add order field to documentation index files

  Commit: afae959

## 1.9.0

### Minor Changes

- add callable partials support for enhanced reusability

  Commit: 1a131f1

### Patch Changes

- add test for accessing function properties via Reflect.get

  Commit: df0eec0

## 1.8.0

### Minor Changes

- add initial codecov configuration for coverage reporting

  Commit: 5fcfbd9

- add sitemap configuration with priority rules

  Commit: b9d2a3c

- add robots configuration to enable sitemap

  Commit: 4d33078

- enhance config loader tests with new scenarios and defaults

  Commit: d281c2a

### Patch Changes

- improve priority matching for root and path prefixes

  Commit: 1eedf70

- update Codecov configuration to disable require_changes option

  Commit: 9c9fc69

- adjust indentation for injected SEO tags in HTML

  Commit: 59ac767

- add --clean option to local build script for better output

  Commit: 824250f

- update indentation for injected SEO tags to 4 spaces

  Commit: 4d15e4f

- correct link reference for robots.txt configuration

  Commit: 2d13853

- handle undefined page.url in canonical and OG tags

  Commit: 3d744b6

## 1.7.1

### Patch Changes

- update build and preview server port in README

  Commit: fce6b39

- update coverage configuration to include additional patterns

  Commit: 1bf51dd

- update CI workflow to include coverage reporting

  Commit: c6b9c9f

- update README to fix Docs badge link and remove Bundle Size badge

  Commit: 924821e

- add coverage configuration for testing

  Commit: 623178c

- update README with badges for build, coverage, npm version, and more

  Commit: 3d96d09

- enhance documentation for Stati CLI, Core, and Create Stati

  Commit: adc2c63

- fix indentation in CI workflow for Codecov action

  Commit: 283ad35

## 1.7.0

### Minor Changes

- add comprehensive SEO and sitemap configurations

  Commit: e98261c

- Add SEO and sitemap generation features

  Commit: 12576c2

- enhance scroll position handling and styling for active links

  Commit: 787715d

### Patch Changes

- refactor SEO documentation

  Commit: 20b8920

- clarify age-based invalidation logic and arithmetic

  Commit: 31c83ea

- remove unused sanitizeStructuredData function and documentation

  Commit: ba8819f

- remove unused directories field from package.json

  Commit: fc486f5

- update introduction and features for clarity and conciseness

  Commit: d667848

- add comprehensive tests for core utilities and error handling

  Commit: 6bb64e9

- reorganize imports and restructure utility modules

  Commit: 1efd2e4

- add comprehensive tests for SEO utilities and robots.txt generator

  Commit: 0a59cb9

- extract debug logger helper to reduce duplication

  Commit: 220549e

- add author information to package.json

  Commit: 3ead32d

- enhance auto-inject options type definition

  Commit: 4138f86

- remove unused sanitizeStructuredData function and imports

  Commit: 1cb3da6

- add comprehensive tests for sitemap generation functionality

  Commit: 6643a23

- update log message for cleaning output and ISG cache

  Commit: 2149083

- improve age calculation logic for consistency

  Commit: 4384fe0

- add comprehensive tests for auto-injection functionality

  Commit: e12f160

- enhance heading styles with drop shadow and tighter spacing

  Commit: c3fc1f4

- improve active link highlighting with section-specific classes

  Commit: 280a641

- enhance cleaning process to include cache removal

  Commit: 8a602eb

- Releasing 2 package(s)

  Releases:

  Commit: 5eef806

- improve SEO context handling and type definitions

  Commit: ce07ed2

- add logger to SEO context and update debug logging

  Commit: d3c2f8c

- replace process.env with getEnv and setEnv functions

  Commit: 7546025

- update partials section to reflect correct paths

  Commit: 6131168

- reorganize exports into barrel files for clarity

  Commit: 5ded97b

- add hero image

  Commit: 67f944f

- add comprehensive SEO API reference and configuration guide

  Commit: 7f91a5c

- log validation errors as warnings instead of throwing

  Commit: 6f1893d

- update exclude patterns to include test files

  Commit: a105640

- remove unnecessary animation classes from sections

  Commit: 5f7eb29

- update recipe collection for clarity and structure

  Commit: 6198390

- enhance SEO section with detailed features and configuration

  Commit: 5fc33d2

- add tests for sitemap and robots.txt generation

  Commit: 4f2197c

- update license information to include author details

  Commit: a557204

## 1.6.4

### Patch Changes

- enhance cleaning process to include cache removal

  Commit: 8a602eb

- improve age calculation logic for consistency

  Commit: 4384fe0

- clarify age-based invalidation logic and arithmetic

  Commit: 31c83ea

- update log message for cleaning output and ISG cache

  Commit: 2149083

## 1.6.3

### Patch Changes

- update devDependencies for @stati/cli and @stati/core

  Commit: 3e876dd

## 1.6.2

### Patch Changes

- enhance setup instructions and configuration details

  Commit: 37d2630

- update commands for Stati CLI and add preview instructions

  Commit: a60531a

- update project creation instructions and testing details

  Commit: a8459e5

- update @stati/cli and @stati/core versions

  Commit: 470c81d

- update @stati/cli and @stati/core versions

  Commit: 19103db

- clarify additional template examples and update commands

  Commit: 19f0118

- add note for pathspec warnings during versioning

  Commit: 0ce6bc1

## 1.6.1

### Patch Changes

- add generator version information to templates

  Commit: 27a9334

- update @stati/cli and @stati/core to latest versions

  Commit: 45f097c

- add unit tests for getStatiVersion function

  Commit: 12457a6

- remove default version fallback in footer display

  Commit: 022f01d

- correct package.json path in getStatiVersion function

  Commit: 455b74a

## 1.6.0

### Minor Changes

- add dynamic attribute handling and utility functions for templates

  Commit: e377d13

### Patch Changes

- Implement code changes to enhance functionality and improve performance

  Commit: d8e8af1

- update @stati/cli and @stati/core versions

  Commit: e2a9edb

## 1.5.0

### Minor Changes

- update documentation scripts for improved functionality

  Commit: 4fb8130

- replace logo SVG with image for improved branding

  Commit: 6c86005

- add link to recipes in the sidebar navigation

  Commit: 27d65ad

- enhance scaffolder documentation and add new options

  Commit: 3f4855b

- replace Nord theme with custom Stati theme for syntax highlighting

  Commit: 6474322

- add utility to retrieve current Stati version from package.json

  Commit: 9b858d9

- add error overlay utility for development mode

  Commit: a55f32b

- add stati engine and version information

  Commit: 2a73368

- enhance button styles and add hover effects for better UX

  Commit: 40eaa78

- enhance layout and styling for better UX

  Commit: 4b89abf

- enhance feature icons and descriptions for clarity

  Commit: 862c513

- implement resolvePrettyUrl for enhanced URL handling

  Commit: 0198b84

- add CSS validation settings and Tailwind IntelliSense config

  Commit: 382faa8

- implement loadMarkdownPlugin for dynamic plugin loading

  Commit: 9200cdf

- enhance partial rendering with multiple passes for dependencies

  Commit: e5080b6

- enhance documentation site layout and styling

  Commit: 524769c

- implement theme management and toggle functionality

  Commit: 7650528

### Patch Changes

- update build and clean scripts for docs-site

  Commit: 34665fe

- add new API documentation for Hooks and Error Handling; update sidebar links

  Commit: ecd36e3

- update invalidate command examples for clarity and accuracy

  Commit: e6c8c5f

- update scaffolder documentation for clarity and completeness

  Commit: f38d807

- update features subtitle for clarity and impact

  Commit: 60f08e4

- enhance feature item styling with dynamic colors

  Commit: e5cf34c

- sidebar and header components for improved usability and aesthetics

  Commit: 8a02946

- remove border from logo images for cleaner look

  Commit: 60715b7

- update generator version reference in footer and layout

  Commit: 543f9b5

- update template context and configuration details for clarity

  Commit: b2a6267

- remove toc.js and integrate TOC functionality in toc.eta

  Commit: 9fec840

- add detailed usage and options for stati preview command

  Commit: 4306e1b

- streamline API documentation and improve examples

  Commit: be7c90e

- enhance fallback handling for missing HTML files

  Commit: df45699

- untrack generated css

  Commit: b97a6af

- documentation and remove Plugin API section

  Commit: 4fd21fd

- replace logo image with SVG icon for consistency

  Commit: 3209b85

- improve partial rendering logic and track progress for retries

  Commit: 084d931

- remove dark mode toggle and theme management script

  Commit: 0c50735

- update documentation to remove references to Vite and clarify features

  Commit: 94a79a5

- update and restructure AI coding agent instructions

  Commit: 1aa3be5

- update background decoration comments for clarity

  Commit: 013a3e9

- restructure site metadata and recipes documentation for clarity

  Commit: 37d8213

- update sidebar and documentation for clarity and completeness

  Commit: 854bd3b

- remove outdated documentation files: error handling, feature documentation

  Commit: f26cb4e

- Remove outdated documentation example and update examples index with improved descriptions and structure

  Commit: fa75826

- adjust layout for improved responsiveness and clarity

  Commit: d54b83b

- improve sorting of front matter keys for consistency

  Commit: 6bf9833

- update development server instructions and CLI command details

  Commit: b90bc60

- replace 'it' with 'stati' for consistency in templates

  Commit: 8e9c7ab

- improve button class structure for better readability

  Commit: dd26c4d

- remove outdated plugin examples and notes from documentation

  Commit: 40c177b

## 1.4.0

### Minor Changes

- Add comprehensive documentation for Stati static site generator

  Commit: d2fed3d

### Patch Changes

- clear cache for fresh build on dev server start

  Commit: c4351e8

- enhance cache invalidation handling in dev server tests

  Commit: 610b539

## 1.3.2

### Patch Changes

- extract test mock utilities and standardize patterns
  - Create packages/core/src/tests/utils/test-mocks.ts with reusable mock factory functions

  Commit: 27e8c0e

- add newline at end of LICENSE file for consistency

  Commit: 73685cf

- modularize build process for improved clarity and testing

  Commit: 26a7e01

- update development commands for clarity and consistency

  Commit: 2f922c0

- extract SHA-256 hash creation pattern
  - Add createSha256Hash() helper to eliminate duplicate patterns

  Commit: 5b77924

- enhance CLI tests with additional mocks and assertions

  Commit: 9cd85eb

- consolidate duplicate template discovery logic
  - Create packages/core/src/core/utils/template-discovery.ts with shared utilities

  Commit: 93c4626

- strengthen type safety with readonly modifiers
  - Add readonly to immutable cache entry properties (path, inputsHash, deps, tags, etc.)

  Commit: c28f83c

- remove unnecessary console spacing in build logs

  Commit: 918e9e6

- improve commit parsing for clarity

  Commit: bba9ed6

- improve directory scanning for partials discovery

  Commit: 5c66645

- harden ESLint rules for code quality
  - Add stricter ESLint rules: prefer-const, stricter no-unused-vars, eqeqeq, no-var

  Commit: 1a2a0b7

- enhance partials discovery and rendering tests

  Commit: a041dc8

- enhance template path resolution for hierarchical search

  Commit: 6dab506

- use posix.relative for consistent path handling

  Commit: 85f42e4

- extract file system path resolution utilities (REFAC-20250914-03)

  Extract common path resolution patterns into centralized utilities:

  Commit: 5790134

- extract fs error handling wrapper

  Commit: c79b3b4

- extract config file patterns into reusable utilities
  - Add getConfigFilePaths() helper function in config/loader.ts

  Commit: a181557

- restructure dev server functions for improved clarity

  Commit: 703ba81

- clean up redundant test comments
  - Remove obvious comments that don't add value ('Create test files', 'Verify content')

  Commit: 245b02e

- centralize logger creation and enhance logging methods

  Commit: b1f19cc

- add comprehensive tests for file system utilities

  Commit: 1547b23

- update default TTL for incremental static generation

  Commit: c4ec644

- deduplicate path resolution logic
  - Import and use resolveSrcDir() from utils/paths.ts

  Commit: 6c3d01a

- remove outdated refactoring log file

  Commit: 16dabf9

- simplify path handling in partial discovery

  Commit: 5f68c3c

- update license from ISC to MIT and add LICENSE file

  Commit: ddbbed5

- extract magic constants into centralized constants module
  - Create packages/core/src/constants.ts with organized constant groups

  Commit: 30f6cbe

- replace hardcoded extensions with constants for clarity

  Commit: 251d2c7

- enhance mock implementation for readFile in snapshots

  Commit: 8c211da

- update test:ci script to include build step

  Commit: 2c33fda

- centralize file system operations in utils module

  Commit: 3ef399a

- normalize paths for consistent partials discovery

  Commit: 64cc5a6

## 1.3.1

### Patch Changes

- enhance logging and rebuild process for templates

  Commit: 840473d

## 1.3.0

### Minor Changes

- enhance build process with ISG support and caching improvements

  Commit: 6403c1e

## 1.2.0

### Minor Changes

- add additional test scripts for blank example project

  Commit: 5e938fc

- implement automated changeset generation script

  Commit: ed82f65

- implement Incremental Static Generation (ISG) caching mechanism

  Commit: d412ce2

- Implement build locking mechanism and validation for ISG configuration

  Commit: 5f2c0ba

- implement rendering tree for build process visualization

  Commit: 0366479

- integrate ISG logic for incremental rebuilds and caching

  Commit: 3f65a6c

- ce73559: Implemented milestone 5 with other improvements

### Patch Changes

- remove unused changeset generation script

  Commit: 12c8c8b

- remove blog template example as there are other plans in the future

  Commit: 56c0749

- update quick start guide and enhance project creation section

  Commit: 26c4364

- replace chalk with custom ANSI colors for CLI output

  Commit: dae7d28

- remove spinner utilities and update dependencies

  Commit: daaa85d

- update README and CONTRIBUTING for consistency and clarity

  Commit: 7e11b82

- format log messages for better readability

  Commit: 3130f88

- add comprehensive tests for ISG cache invalidation, manifest handling, and TTL management

  Commit: a641d13

- add .stati to ignore list and remove cache manifest

  Commit: d8aa7bf

- normalize paths to use posix format across modules

  Commit: 4a1c10c

- update cache manifest handling in build and test files

  Commit: a410981

- update console output expectations for ISG rebuilding

  Commit: 43378cb

- update cache manifest path handling in template change

  Commit: 896778a

- Implemented milestone 5 with other improvements

  Commit: ce73559

- update cache key calculation to use relative path

  Commit: b5c46f9

- improve glob pattern matching and conversion to regex

  Commit: 646a056

- update CLI commands and ISG features

  Commit: c82964b

- update ISG ttlSeconds to 6 hours for better caching

  Commit: b591c81

- remove cli-table3 dependency and update logging format

  Commit: d32c709

- update cache invalidation documentation to include patterns and age

  Commit: e27f6a2

## 1.1.0

### Minor Changes

- implement automated changeset generation from commits

  Commit: 66c0c80

- implement development server with live reload functionality

  Commit: e361676

- enhance logging and add new dependencies for better output

  Commit: 78ee0dd

- implement development server with live reload functionality

  Commit: e361676

- add version option to build process and update logging

  Commit: 483aed1

- implement automated changeset generation from commits

  Commit: 66c0c80

- add version option to build process and update logging

  Commit: 483aed1

- add logging and color utilities for improved CLI output

  Commit: 89c1bab

- enhance partial rendering with error handling and context updates

  Commit: 2c1fcdb

- enhance partial rendering with error handling and context updates

  Commit: 2c1fcdb

- enhance logging and add new dependencies for better output

  Commit: 78ee0dd

- add logging and color utilities for improved CLI output

  Commit: 89c1bab

### Patch Changes

- rename build job to test in CI workflow

  Commit: b4c0ec7

- update build:ci script to install latest @stati/cli

  Commit: e5f43d5

- add mock for copyFile in build and error scenarios

  Commit: 995aa1d

- update build:ci script to specify package for npm exec

  Commit: c03d034

- fix build command in CI workflow

  Commit: 5bb2f90

- update CI scripts for linting and type checking in examples

  Commit: a37fdb0

- add comprehensive README for Stati CLI, Core, and Create-Stati

  Commit: a63fc18

- use npx for script commands in package.json

  Commit: 4981171

- remove gold-ants-hug changeset file

  Commit: bf685d3

- update build:ci script to use npm exec for execution

  Commit: 8fc3625

- simplify build progress log messages in tests

  Commit: 4028cd0

- remove gold-ants-hug changeset file

  Commit: bf685d3

- add comprehensive README for Stati CLI, Core, and Create-Stati

  Commit: a63fc18

- update CI build command to include examples/blog

  Commit: 2e8c039

- update CONTRIBUTING and README for clarity and completeness

  Commit: e781bbe

- update build:ci command to ensure proper execution in examples

  Commit: f03ed50

- update build:ci script to install dependencies without global flag

  Commit: fc92a95

- update build:ci command to ensure proper execution in examples

  Commit: f03ed50

- update build:ci script to specify package for npm exec

  Commit: c03d034

- update build:ci script to install dependencies without global flag

  Commit: fc92a95

- update mock build response keys for consistency

  Commit: 9dd17bf

- streamline CI workflow by consolidating test commands

  Commit: de1a30b

- rename build job to test in CI workflow

  Commit: b4c0ec7

- update build:ci script to use npm exec for execution

  Commit: 8fc3625

- use npx for script commands in package.json

  Commit: 4981171

- streamline CI workflow by consolidating test commands

  Commit: de1a30b

- update build:ci script to install @stati/cli globally

  Commit: ea82827

- update CI scripts for linting and type checking in examples

  Commit: a37fdb0

- update CONTRIBUTING and README for clarity and completeness

  Commit: e781bbe

- add mock for copyFile in build and error scenarios

  Commit: 995aa1d

- update build:ci script to install @stati/cli globally

  Commit: ea82827

- update build:ci script to install latest @stati/cli

  Commit: e5f43d5

- update CI build command to include examples/blog

  Commit: 2e8c039

- remove duplicate build step in CI workflow

  Commit: 764c978

- simplify build progress log messages in tests

  Commit: 4028cd0

- update mock build response keys for consistency

  Commit: 9dd17bf

- fix build command in CI workflow

  Commit: 5bb2f90

- remove duplicate build step in CI workflow

  Commit: 764c978

## 1.0.0

### Major Changes

- ed11dc0: Initial release of @stati/core - the core engine for Stati static site generator

  This is the first public release of @stati/core, featuring:
  - **Static site generation**: Build fast, modern websites from Markdown content
  - **Template rendering**: Powerful templating with Eta templates
  - **TypeScript support**: Full TypeScript support throughout
  - **Flexible content structure**: Support for various content organization patterns
  - **Plugin system**: Extensible architecture for custom functionality
  - **Content processing**: Markdown processing, frontmatter parsing, and navigation generation
