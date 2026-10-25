# Stati Guide for Coding Agents

This is the canonical instruction file for every coding agent working in this repo (GitHub Copilot, Claude Code, Codex, Cursor, and others). Tool-specific entry points only point here:

- `CLAUDE.md` imports this file for Claude Code.
- `.github/copilot-instructions.md` points here for GitHub Copilot. Copilot chat and the Copilot coding agent also read `AGENTS.md` directly.
- `.github/commit-message-guidelines.md` mirrors the [Commit messages](#commit-messages) section for VS Code's Copilot commit message generation. Keep the two in sync.

Edit this file, not the tool-specific ones, when guidance changes.

## Repo map

- Monorepo root uses npm workspaces; build flow is always `core` → `images` → `cli` → `create-stati`.
- `packages/core/src/core/*` runs the pipeline (content → markdown → templates → ISG cache). `packages/core/src/config/loader.ts` dynamically imports `stati.config.ts`.
- `packages/core/src/images/*` is the image pipeline: intrinsic sizes and lazy loading for every Markdown image, co-located image copies, and the plumbing (URLs, caching, markup, pruning) for `images.responsive` and `images.og`. Those two features need `packages/images` (`@stati/images`), a thin provider that encodes with sharp and draws Open Graph cards with Satori; core loads it from the project and talks to it through the `ImageProvider` contract in `packages/core/src/types/images.ts`.
- `packages/cli/src/cli.ts` wires yargs commands to core while `packages/cli/src/logger.ts` creates the colored logger contract used across builds.
- `packages/create-stati/src/create.ts` scaffolds from `examples/`; its build step copies templates into `dist/templates`.
- `examples/*` double as integration fixtures and `docs-site/` hosts the real documentation built with Stati.
- `context7.json` configures how [Context7](https://context7.com) indexes the repo (`docs-site/site` and the package READMEs, with `rules` shown to coding agents). Keep it in step when docs folders move or packages are added or removed, and check any new or changed rule against the source: each is at most 255 characters and there are at most 50. The schema is `https://context7.com/schema/context7.json`.
- `.claude/skills/stati/` is the Stati agent skill for people building sites with Stati. It is read by Claude Code and Copilot. Users install and update it from `main` with the `skills` CLI (`npx skills add ianchak/stati --skill stati`, `npx skills update stati -p`), which `create-stati --agent-skill` also runs, so a skill change reaches users when it merges, not when a package is released. A skill change that describes new behavior goes in the same PR as the code, which is released when it merges.
- Load that skill in this repo too, before writing or reviewing anything that describes how Stati behaves: `docs-site/` pages, the homepage feature list, `examples/`, recipes and starter templates. Its references record behavior verified against source and tests, including known gaps between the docs and the code. When the docs and the skill disagree, check the source, then fix whichever is wrong.

## Build + test workflow

- Node 22.20+ or 24+ and npm 11.5.1+ required (the npm version is needed for OIDC publishing). Run `npm install`, then `npm run build` (workspaces chain the packages in dependency order).
- `npm run test` executes Vitest across workspaces; `npm run test:blank:full` cleans, rebuilds, and verifies the blank starter end-to-end.
- `npm run test:create-stati:images` scaffolds the blog starter with `--images` into `examples/test-images` and builds it with the local CLI and `@stati/images`; clean up with `npm run test:create-stati:images:cleanup`.
- CLI and scaffolder checks assume fresh dist artifacts - run `npm run build` before touching example scripts or `test:create-stati`.

## Core engine hotspots

- `core/build.ts` streams Markdown through `renderMarkdown` into Eta `renderPage`, writing HTML under `dist/` and recording cache metadata in `.stati/manifest.json`. After rendering it deletes the output of pages that no longer exist (`core/isg/prune.ts`), but only files the manifest records.
- `core/expand.ts` runs between `loadContent` and `buildNavigation`: it removes `[param].md` templates, expands them (and `collections.generate` entries) into generated pages, and adds the later pages of `paginate` listings. Generated and pagination pages are "virtual" (`isVirtualPage`): never collection members, and out of navigation, search and RSS unless they opt in.
- The site's 404 page (`isNotFoundPage`: the page written to `404.html` or `404/index.html` at the site root, which `stati dev` and `stati preview` serve for a missing URL) stays a collection member but is left out of the sitemap, search, RSS, generated Open Graph cards and navigation, and `applySEODefaults` gives it `seo.noindex`. Front matter opts back in: `sitemap.exclude: false` (plus `seo.noindex: false`, or it is listed as noindex), `search: true`, `nav: true`, and `seo.noindex` or a `seo.robots` value that says whether to index.
- `core/collections.ts` computes every collection once per page list (`getCollections`), resolves which collection a page reads (`resolveCollectionPath`: `collection` front matter, own index, then nearest), hashes collection summaries, and builds the per-render views that record whether a page read `stati.collection`.
- The image runtime (`ImageRuntime`, created per build) registers each page's images while it renders, starts only the jobs the written HTML references, then settles them: a failed job rewrites the page to plain image markup and marks its cache entry `STALE`. `stati build` prunes generated files in `dist/_img/` that no page uses, and only files recorded in `.stati/images/manifest.json`.
- Templates: `core/template-index.ts` lists every `.eta` file under `srcDir` once per build and resolves template names (`partials/header` looked up from the page's folder up, `/x` from `srcDir`, `./x` and `../x` from the calling template); a dev server session keeps one index and updates it on add and unlink. `core/template-render.ts` holds the per-page `RenderScope` behind `stati.include()`, `stati.layout()`, `stati.body` and `stati.props`: layout slots, the cycle stack, the include cache (keyed by file and base context) and the recording of every template rendered and name looked up, reached through `AsyncLocalStorage`. `core/eta-plugin.ts` blocks Eta's own `include`, `includeAsync`, `layout`, `block` and `blockAsync`, and anchors on Eta's `layout()` declaration (engine creation throws if it moves).
- Rebuild decisions come from `shouldRebuildPage` plus config hooks (`beforeAll`, `beforeRender`, `afterRender`) defined via `defineConfig()`.
- Static assets move through `copyStaticAssetsWithLogging`; preserve `logger.*` calls to keep CLI output structured.
- `packages/core/src/css/` is hashed stylesheets. With `css.hash` (default) a production build points every `<link>` that applies, offers or preloads a stylesheet at a hashed name (`getLinkedStylesheetPaths`, `rewriteStylesheetLinks`, after SEO injection and before the Tailwind link is added): the Tailwind output's path at the render path below, and a `.css` file in the static directory at a copy `StaticStylesheets` writes on first use (`hashStylesheet`: rebased `url()`s and `@import` strings, `_assets/[folder/]<name>-<HASH>.css`; the static copy still writes the original). The render inputs carry `hashedStylesheets: true`, never a hash. The stylesheet Stati builds with Tailwind (`BuildOptions.tailwind`, from `--tailwind-input`/`--tailwind-output` on `stati build` and `stati dev`): a production build checks the input and the Tailwind CLI before rendering, renders pages with a path made up for the build (`<name>-pending-<random>.css`, which page content can't hold) and holds them in memory (up to `MAX_DEFERRED_PAGES_LENGTH`, then in `.stati/pending-pages/`, never in `outDir`, so a Tailwind error leaves the previous pages), runs Tailwind right after rendering, writes `_assets/<name>-<HASH>.css`, then writes the held pages with the final path. `CacheManifest.stylesheets` records every stylesheet pages link by its own path: its hashed name, or the path itself when the static directory has no file for it. Stylesheets only cached pages link are looked up again from it. Cached pages get each current name in place of the recorded one and of every other hashed copy still in its `_assets/` folder (`getStaleStylesheetPaths`, `relinkStylesheets`, which rewrites only same-site stylesheet `<link>` tags through `rewriteStylesheetLinks`), so pages a build that stopped before its manifest save rewrote are caught too; a stylesheet gone from the static directory goes back to its own path, and one recorded under its own path gets its copy once the file exists. Links with an `integrity` digest are never rewritten. `findLinkTags` is a quote-aware tokenizer that skips comments and script, style, template, textarea and title contents in one pass; the CSS scan is one regex pass too, with `@import` strings recognized by position, so neither has polynomial cases. All of this happens before stale pages are pruned and image failures are patched, which read the written pages. Hashed copies of a stylesheet the build no longer hashes (another `--tailwind-output`, no flags, a removed static file, `css.hash: false`) are deleted with the other stale files. The static copy skips a file at the Tailwind output's path in every build, and `StaticStylesheets` doesn't hash it. The dev server's `--tailwind-output` file is never deleted: the dev server watches it for reload only when it exists at startup. The hash is never in the render inputs; the stylesheet settings are. Development links the output as it is and never runs Tailwind (the CLI's watcher does).

## Error handling patterns

- Build errors during incremental rebuilds should be surfaced via `logger.error()` rather than throwing - this keeps the dev server alive and feeds the error overlay.
- The error overlay (`core/utils/error-overlay.utils.ts`) renders build failures in-browser during dev mode; it expects structured error objects with `message`, `file`, and optional `line`/`column`.
- Template rendering errors are caught in `renderPage` and logged with context (template path, page slug); they don't halt the entire build. In production, a failing layout or shell writes the fallback HTML, and a failing include leaves an HTML comment; in development, misuse of `stati.include()`/`stati.layout()` throws `TemplateUsageError` so the overlay points at the calling template.
- Use `logger.warning()` for recoverable issues (missing optional fields, deprecated config); use `logger.error()` for failures that skip a page.
- Validation errors from config loading throw immediately since the build cannot proceed without valid configuration.

## Eta Template Restrictions

- **CRITICAL**: Eta templates do NOT support partial dynamic attributes like `class="static-<%= dynamic %>-morestatic"`. All dynamic content in HTML attributes must be fully dynamic.
- **Solution**: Use template literals for fully dynamic values: `class="<%= `static-${dynamic}-morestatic` %>"`
- **Utility Function**: Use `stati.propValue()` for building space-separated property values (similar to classnames). It accepts strings, arrays, and objects: `class="<%= stati.propValue('base-class', `dynamic-${value}`, condition && 'conditional-class') %>"` or `data-analytics="<%= stati.propValue('cta', campaign, isPrimary && 'primary') %>"`.
- **Concatenation Note**: When you need a single concatenated value (e.g., `data-id="item-42"`), prefer a template literal: `data-id="<%= `item-${id}` %>"`.
- **Common Pattern**: Build dynamic segments with template literals before passing them to `propValue`: `class="<%= stati.propValue('card', `hover:border-${color}-300`) %>"`.

## Dev + preview servers

- `createDevServer` (in `core/dev.ts`) clears cache, triggers an initial build, then watches `site/` and `public/`. Template add, change and unlink events flow through `markTemplateChanges`, which marks entries stale when their `deps` hold the file or their `templateLookups` now resolve differently, and builds only when a page is affected.
- Build failures feed the in-browser overlay produced by `core/utils/error-overlay.utils.ts`; prefer surfacing errors via the logger instead of throwing inside incremental rebuilds.
- `createPreviewServer` serves the built `dist/` with the same logger expectations as dev.

## CLI surface

- yargs commands live in `packages/cli/src/cli.ts`; each command calls `setEnv` before delegating to core and reuses the shared logger factory.
- Options surfaced to users (`--force`, `--clean`, `--include-drafts`, invalidate queries like `tag:news` or `age:3months`) must line up with `BuildOptions`/`InvalidateOptions` in core.
- Version banners rely on reading the package JSON; keep `getCliVersion()` (CLI) and `getStatiVersion()` (core) in sync when moving files.

## Scaffolder specifics

- `src/index.ts` parses flags, prompts for missing values, and hands control to `createSite` in `create.ts`.
- Styling choices map to installers in `css-processors.ts`; updating templates requires touching both `examples/` sources and the copy routine in the package build script.
- Generated projects expect `site/layout.eta`, `site/index.md`, and `public/styles.css`; maintain these when extending templates.
- The Tailwind installer passes `--tailwind-input src/styles.css --tailwind-output dist/styles.css` to `stati dev` and `stati build` and deletes `public/styles.css`; the templates keep their link to `/styles.css`, which production builds point at the hashed file. The Sass installer compiles `src/styles.scss` into `public/styles.css` before `stati build` (`build:css`) and next to `stati dev` (`watch:css`), and the generated `.gitignore` lists that file.

## Conventions

- Packages ship as ESM (`"type": "module"`); import locals with explicit `.js` extensions and use helpers from `packages/core/src/core/utils/fs.utils.ts` instead of `fs` directly.
- Strict TypeScript everywhere; export runtime symbols and types from separate barrels (`types/` for declarations). Avoid default exports except in configs.
- **Type imports**: Key types are exported from `packages/core/src/types/index.ts`: `StatiConfig`, `SiteConfig`, `BuildContext`, `PageContext`, `FrontMatter`, `PageModel`, `SEOConfig`, `ISGConfig`, `CacheManifest`, `CacheEntry`, `NavNode`, `BuildHooks`, `BuildStats`, `BundleConfig`.
- **Config typing**: Use `defineConfig()` from `@stati/core` for type-safe configuration in `stati.config.ts`.
- Tests live in `packages/*/test/` directories (not inside `src/`), use Vitest in `node` mode with `mockReset`/`restoreMocks`, and prefer temporary directories for file-system assertions.
- **Utils naming**: All utility files in `utils/` folders must use the `.utils.ts` suffix (e.g., `fs.utils.ts`, `error-overlay.utils.ts`). Each `utils/` folder must have an `index.ts` barrel that re-exports all utilities from that folder.

## Common file patterns

- `*.eta` - Eta templates (layouts, shells, included templates); never pages on their own
- `*.md` - Markdown content files with YAML frontmatter
- `stati.config.ts` / `stati.config.js` - Site configuration using `defineConfig()`
- `.stati/` - Build cache directory (contains `manifest.json` and `images/manifest.json`)
- `og.eta` - Open Graph card template, used with `images.og` for pages in its folder and below
- `dist/_img/` - Copied co-located images and generated responsive variants and Open Graph cards
- `site/` - Source content and templates
- `public/` - Static assets copied verbatim to `dist/`
- `dist/` - Build output directory

## Configuration sections reference

All config blocks live under `defineConfig()`. Key sections:

- **site**: `title`, `baseUrl`, `description`, `defaultLocale` - basic site metadata.
- **srcDir**: Source directory for content (default: `'site'`).
- **outDir**: Output directory (default: `'dist'`).
- **staticDir**: Static assets directory (default: `'public'`).
- **dev**: `port`, `host`, `open` (auto-open browser) - dev server options.
- **preview**: `port`, `host`, `open` - preview server options.
- **markdown.plugins**: Array of `[pluginName, options]` tuples (e.g., `['external-links', { externalTarget: '_blank' }]`, `['prism', { defaultLanguage: 'javascript' }]`).
- **markdown.configure**: Callback receiving the markdown-it instance for advanced customization.
- **markdown.toc**: Enable TOC extraction and heading anchors (default: `true`).
- **helpers**: Object of functions templates call as `<%= stati.helpers.name(value) %>`; validated at load (every entry must be a function). The root of `stati` holds only Stati's API.
- **typescript**: `enabled`, `srcDir`, `outDir`, `hash`, `minify`, `bundles[]` with `entryPoint`, `bundleName`, `include`/`exclude` glob patterns for selective bundle injection.
- **css**: `hash` (hashed names for the Tailwind output and the static stylesheets pages link), `minify` and `autoInject` (the Tailwind stylesheet), all default `true`; development never hashes or minifies. Validated in `css/config.ts`.
- **isg**: `enabled`, `ttlSeconds`, `maxAgeCapDays`, `aging[]` (array of `{ untilDays, ttlSeconds }` rules).
- **collections**: `summaryFields[]` (front matter that rebuilds listings; default `title`, `description`, `tags`, `draft`), `generate(ctx)` returning `{ url, template, key?, label?, items?, data? }` pages rendered with a `[param].md` template.
- **seo**: `defaultAuthor` (`name`, `email`, `url`, `twitter`), `twitter.site`, `articles` (`include`/`exclude` URL globs), `autoInject`, `debug` - SEO metadata configuration. `applySEODefaults` (`seo/defaults.ts`) fills `og:locale` (from `site.defaultLocale`, converted to `en_US` form), the Twitter handles, article metadata and the 404 page's `noindex` into each page's `seo` front matter after `beforeAll`, so the front matter hash covers them; `refreshSEODefaults` works out again, after `beforeRender`, the values it filled in that the hook left alone; the generator resolves the same values for direct callers.
- **search**: `enabled`, `indexName`, `hashFilename`, `maxContentLength`, `maxPreviewLength`, `headingLevels[]`, `exclude[]`, `includeHomePage`, `autoInjectMetaTag`.
- **sitemap**: `enabled`, `defaultPriority`, `defaultChangeFreq`, `excludePatterns[]`, `includePatterns[]`, `filter()`, `transformUrl()`, `transformEntry()`, `priorityRules[]` with `pattern` and `priority`, `generateIndex`, `news`. The 404 page and pages marked noindex (`seo.noindex`, `seo.robots`) are left out unless front matter sets `sitemap.exclude: false`. `news` (`include`, `publicationName`, `language`, `maxAgeDays`, `filename`; `seo/news-sitemap.ts`) writes the Google News sitemap as its own file in production builds, from pages matching `include` (URL globs) published within `maxAgeDays`: newest first, at most 1000, without drafts, virtual pages, the 404 page and noindex pages, and independent of the main sitemap's patterns and callbacks. `robots.sitemap: true` lists it after `sitemap.xml`.
- **robots**: `enabled`, `userAgents[]` with `userAgent`, `allow[]`, `disallow[]`, global `allow[]`/`disallow[]`, `crawlDelay`, `sitemap`, `customLines[]`.
- **rss**: `enabled`, `feeds[]` with `filename`, `title`, `description`, `link`, `language`, `copyright`, `managingEditor`, `webMaster`, `category`, `ttl`, `image`, `maxItems`, `contentPatterns[]`, `excludePatterns[]`, `filter()`, `sortBy`, `sortFn()`, `itemMapping`.
- **hooks**: `beforeAll`, `afterAll`, `beforeRender`, `afterRender` - async callbacks for build lifecycle customization.
- **images**: `false` turns off the built-in sizing; otherwise `eagerFirst`, `dev` (`'fast'` | `'full'`), `responsive` (`true` or `{ widths, formats, quality, sizes }`) and `og` (`true` or `{ template, width, height, format, fonts, exclude }`). `responsive` and `og` each need `@stati/images` and fail the build with an install message when it is missing.

## Search system

- Lives in `packages/core/src/search/`; generates a JSON search index at build time.
- Enable via `search: { enabled: true }` in config; index written to `dist/search-index.json` (or `dist/search-index-[hash].json` if `hashFilename: true`).
- Index contains `SearchDocument` entries with `id`, `url`, `anchor`, `title`, `heading`, `level`, `content`, `breadcrumb`, and optional `tags`.
- Configure with `indexName`, `maxContentLength`, `maxPreviewLength`, `headingLevels[]` to control index size.
- Use `exclude[]` glob patterns and `includeHomePage` to control which pages are indexed.
- Set `autoInjectMetaTag: true` (default) to inject `<meta name="stati:search-index">` into rendered HTML.
- `core/build.ts` generates and writes the index before any page renders (`writeSearchIndexBeforeRendering`, after `beforeAll`), from each page's Markdown and `extractToc`. The index path is part of every page's render-inputs hash, so a production build hashes the index content, never something that changes per build: editing indexed text re-renders every page, an unchanged build reuses them all. Dev keeps one fixed name. Production builds delete index files, hashed bundles and hashed stylesheets from earlier builds (`removeStaleSearchIndexes`, `removeStaleBundleFiles`, `removeStaleStylesheets`), only after every page is written and before the static copy, so a build that fails midway leaves the old pages working.
- Client-side search (e.g., in docs-site) loads the index and performs fuzzy matching; Stati does not bundle a search UI - that's up to the site.
- Exclusions: pages with `draft: true` in frontmatter and the 404 page (unless it sets `search: true`) are omitted from the index. Use `search.exclude[]` glob patterns for additional exclusions.

## Utility functions reference

All utilities in `packages/core/src/core/utils/` follow the `*.utils.ts` naming convention:

- **fs.utils.ts**: `ensureDir`, `readFile`, `writeFile`, `pathExists`, `remove`, `stat`, `lstat`, `realpath`, `copyFile`, `readdir`, `readFileBuffer`, `readFileBufferSync`, `statSyncOrNull`, `listFilesRecursiveSync` - safe filesystem helpers with consistent error handling (the sync ones serve template helpers such as `stati.image()`, which must stay synchronous).
- **paths.utils.ts**: `resolveSrcDir`, `resolveOutDir`, `resolveStaticDir`, `resolveCacheDir`, `normalizePathForComparison`, `isPathWithinDirectory`, `getPageOutputFile` - path resolution, cross-platform comparison, and the output file of a page URL.
- **slugify.utils.ts**: `slugify(text)` - URL-safe slug generation.
- **html.utils.ts**: `findHeadClosePosition`, `injectBeforeHeadClose` - HTML manipulation for SEO/meta tag injection.
- **navigation-helpers.utils.ts**: `createNavigationHelpers` - creates navigation helper object with `findNode`, `getChildren`, `getParent`, `getSiblings`, `getSubtree`, `getBreadcrumbs`, `getCurrentNode` methods.
- **template-discovery.utils.ts**: Page helpers for layout discovery: `isVirtualPage`, `isNotFoundPage`, `isCollectionIndexPage`, `getCollectionPathForPage`, `getFirstPaginationPage`.
- **context-validation.utils.ts**: `createValidatingContextProxy` - the dev-mode proxy that turns reads of unknown `stati.*` properties into "Did you mean" errors.
- **similarity.utils.ts**: `editDistance`, `findSimilarNames` - suggestions for misspelled names.
- **theme.utils.ts**: Design tokens and the Stati mark shared by the error overlay and the metrics HTML report.
- **template-errors.utils.ts**: Formats template errors with source context for the error overlay.
- **bundle-matching.utils.ts**: Matches pages to TypeScript bundles based on `include`/`exclude` patterns.
- **glob-patterns.utils.ts**: Minimatch-based pattern matching for sitemap rules and bundle selection.
- **server.utils.ts**: Shared HTTP server helpers for dev/preview.
- **version.utils.ts**: `getStatiVersion()` - reads version from package.json.
- **tailwind-inventory.utils.ts**: Detects Tailwind CSS setup in projects.
- **logger.utils.ts**: `createFallbackLogger()` - creates a minimal console-based logger fallback.
- **typescript.utils.ts**: TypeScript/esbuild compilation orchestration.
- **template.utils.ts**: `propValue()` - builds space-separated property values for HTML attributes (similar to classnames).

Import from the barrel: `import { slugify, normalizePathForComparison } from './utils/index.js';`

## ISG and cache internals

- Cache manifest lives at `.stati/manifest.json`; structure defined by `CacheManifest` type.
- Each entry tracks: `path` (output path), `inputsHash` (content+deps hash), `deps` (the template files the page rendered, layout first), `templateLookups` (each template name looked up, the folder it was looked up from and the file it found, or `null`), `templatesRecorded`, `tags`, `publishedAt`, `renderedAt` timestamp, `ttlSeconds`, `maxAgeCapDays`, plus `assetDeps` (files found while rendering, such as source images, hashed by content in `inputsHash`), `images` (generated files the page references), and `readsCollection`/`readsNav` (whether the last render read `stati.collection` or the navigation).
- `deps` and `templateLookups` are recorded while the page renders, never parsed from templates; other render-discovered files belong in `assetDeps`. An entry without `templatesRecorded` rebuilds once. Settings that change rendered HTML without a file change, such as the image settings, go into the render-inputs hash in `core/build.ts`. So do the page's collection path, its pagination slice and page count, and a generated page's items; the collection summary and the navigation hash are added only when the entry's read flags say the page read them. An entry without the flags (older versions) forces one rebuild; never treat a missing flag as `false`.
- `shouldRebuildPage` compares current content/template hashes against manifest, and rebuilds when the page's layout would be another file (`deps[0]`), a recorded lookup now resolves differently (checked against the template index, no file reads) or a recorded template is gone; cache hit skips render.
- In dev, template changes go through `markTemplateChanges` (see Dev + preview servers); helpers are config code and are not recorded.
- Aging rules (`isg.aging[]`) apply progressive TTL based on content age (e.g., content older than 7 days gets longer cache TTL).
- `invalidate` command accepts queries like `tag:news`, `age:3months`, `path:/blog/*` to selectively clear cache entries.
- Cache keys use POSIX-normalized paths; Windows backslashes are converted before lookup.

## Metrics system

- Enable via CLI: `stati build --metrics` (JSON output), `--metrics-html` (HTML report), `--metrics-detailed` (per-page timings).
- Metrics written to `.stati/metrics/` as timestamped JSON files.
- Use metrics to diagnose slow builds, cache inefficiencies, or memory issues.

## Troubleshooting

- Cache hiccups: clear `.stati/` or run `stati build --clean`; the invalidate logic lives under `core/invalidate.ts`.
- If templates stop refreshing, inspect the page's `deps` and `templateLookups` in `.stati/manifest.json`; `markTemplateChanges` compares POSIX-normalized absolute paths.
- For docs regressions, run `npm run build` followed by entering the directory `docs-site` and running one of the local scripts. In the `docs-site` dir `npm run build:local` to confirm build is running with local CLI. In the `docs-site` dir `npm run dev:local` to start a dev server with local CLI. In the `docs-site` dir `npm run preview:local` to preview the static build with local CLI.

## Documentation Reference

The official Stati documentation lives in `docs-site/site/`. Read these files directly for authoritative guidance:

### Getting Started

- `docs-site/site/getting-started/introduction.md` - What is Stati, key features, and philosophy
- `docs-site/site/getting-started/installation.md` - Node.js requirements and installation methods
- `docs-site/site/getting-started/quick-start.md` - Create your first Stati site in minutes
- `docs-site/site/getting-started/project-structure.md` - Directory layout and file conventions
- `docs-site/site/getting-started/upgrading-to-2.md` - Moving a Stati 1 site to includes, shared layouts and helpers

### Core Concepts

- `docs-site/site/core-concepts/overview.md` - Fundamental concepts and architecture
- `docs-site/site/core-concepts/templates.md` - Eta templating, layouts, shells, includes, and helpers
- `docs-site/site/core-concepts/markdown.md` - Frontmatter, markdown-it plugins, and content authoring
- `docs-site/site/core-concepts/routing.md` - URL generation, slugs, and navigation trees
- `docs-site/site/core-concepts/static-assets.md` - Public directory, asset handling, and copying
- `docs-site/site/core-concepts/isg.md` - Incremental Static Generation and caching

### Configuration

- `docs-site/site/configuration/file.md` - `stati.config.ts` structure and `defineConfig()`
- `docs-site/site/configuration/site-metadata.md` - Title, baseUrl, description, locale
- `docs-site/site/configuration/templates.md` - Template helpers and the fixed Eta settings
- `docs-site/site/configuration/markdown.md` - Plugins, TOC, and markdown-it customization
- `docs-site/site/configuration/typescript.md` - Client-side TS bundling with esbuild
- `docs-site/site/configuration/isg.md` - Cache TTL, aging rules, and invalidation
- `docs-site/site/configuration/seo.md` - Meta tags, Open Graph, and structured data
- `docs-site/site/configuration/search.md` - Search index generation and configuration
- `docs-site/site/configuration/rss.md` - Feed generation and customization
- `docs-site/site/configuration/images.md` - Image sizes, responsive images and Open Graph cards
- `docs-site/site/configuration/css.md` - Hashed stylesheets (`public/`, Sass, Tailwind), Tailwind CSS in `stati dev` and `stati build`, and the `css` options

### CLI

- `docs-site/site/cli/commands.md` - `build`, `dev`, `preview`, `invalidate` reference
- `docs-site/site/cli/development.md` - Dev server, hot reload, and error overlay
- `docs-site/site/cli/scaffolder.md` - `create-stati` options and templates

### API Reference

- `docs-site/site/api/reference.md` - Complete API documentation
- `docs-site/site/api/types.md` - TypeScript type definitions
- `docs-site/site/api/hooks.md` - Build lifecycle hooks (`beforeAll`, `afterRender`, etc.)
- `docs-site/site/api/navigation.md` - Navigation helpers and tree utilities
- `docs-site/site/api/templates.md` - Template context, `stati.include()`, `stati.layout()`, and helpers
- `docs-site/site/api/seo.md` - SEO helper functions and injection
- `docs-site/site/api/rss.md` - RSS feed API
- `docs-site/site/api/error-handling.md` - Error patterns and overlay system

### Advanced Topics

- `docs-site/site/advanced/metrics.md` - Build performance measurement and reporting
- `docs-site/site/advanced/troubleshooting.md` - Common issues and solutions
- `docs-site/site/advanced/contributing.md` - Development setup and contribution guide
- `docs-site/site/advanced/using-javascript.md` - JS config files instead of TypeScript
- `docs-site/site/advanced/seo-usage-scenarios.md` - Real-world SEO patterns

### Other Resources

- `docs-site/site/faq.md` - Frequently asked questions
- `docs-site/site/glossary.md` - Term definitions
- `docs-site/site/examples/list.md` - Starter templates and example sites
- `docs-site/site/examples/recipes.md` - Common patterns and solutions

## Commit messages

- Format: `type(scope): subject` in imperative mood, subject ≤72 chars, no emoji.
- Single line only: no body, no trailers (`Co-Authored-By: ...`, `Signed-off-by: ...`), and no closing keywords (`Closes #123`). Put what changed and why, issue links, and co-author credits in the PR description. The `commit-msg` hook (`scripts/check-commit-msg.mjs`) enforces this, because the changeset generator reads each body line as a separate commit. This overrides any tool default that appends trailers to commits.
- Types: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert.
- Scope is usually the package: `core`, `cli`, `images`, `create-stati`, or an area like `isg`, `search`, `docs`.
- Mark breaking changes with `!` after the type (`feat(core)!: ...`). A `BREAKING CHANGE:` footer is rejected by the hook.
- Commit types drive releases (see below), so pick them carefully: `feat` → minor, everything else → patch, `!` → major.

## Releases and changesets

Full details live in `.github/publishing-and-changesets.md`. The essentials for agents:

- Versioning is handled by Changesets. Never hand-edit package `version` fields or `CHANGELOG.md` files; CI does that on `main` via `npx changeset version`.
- Changesets in `.changeset/*.md` are generated from conventional commits (`npm run changeset:generate`, or the changeset bot on PRs). Create one manually with `npm run changeset` when needed.
- Package detection is path-based: `packages/core/` → `@stati/core`, `packages/cli/` → `@stati/cli`, `packages/images/` → `@stati/images`, `packages/create-stati/` → `create-stati`. Root `package.json`, `package-lock.json`, `tsconfig.base.json`, `vitest.config.ts`, and `eslint.config.mjs` affect all packages.
- `examples/` is bundled into `create-stati`, so changes there release it. Changes under `.github/`, `.claude/` (including the agent skill, which users install from `main`), `docs-site/`, `scripts/`, and root docs do not trigger a release. PRs that need no release get the `skip-changeset` label.
- Check pending releases with `npm run changeset:status` or `npm run changeset:dry-run`.
- Publishing runs from `.github/workflows/publish.yml` after CI passes on `main`, using npm OIDC trusted publishing (npm 11.5.1+). Don't add npm tokens or secrets. A brand-new package can't make its first publish through OIDC: a maintainer publishes it once by hand and attaches the trusted publisher on npmjs.com first.
- `@stati/images` declares no `peerDependencies` on `@stati/core`: Changesets would give it a major bump on every core minor. Compatibility is checked at runtime through `ImageProvider.apiVersion`.
