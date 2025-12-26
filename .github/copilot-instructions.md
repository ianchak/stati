# Stati AI Guide for Coding Agents

## Repo map

- Monorepo root uses npm workspaces; build flow is always `core` → `cli` → `create-stati`.
- `packages/core/src/core/*` runs the pipeline (content → markdown → templates → ISG cache). `packages/core/src/config/loader.ts` dynamically imports `stati.config.ts`.
- `packages/cli/src/cli.ts` wires yargs commands to core while `packages/cli/src/logger.ts` creates the colored logger contract used across builds.
- `packages/create-stati/src/create.ts` scaffolds from `examples/`; its build step copies templates into `dist/templates`.
- `examples/*` double as integration fixtures and `docs-site/` hosts the real documentation built with Stati.

## Build + test workflow

- Node 22+ and npm 11.5.1+ required (npm version needed for OIDC publishing). Run `npm install`, then `npm run build` (workspaces chain the packages in dependency order).
- `npm run test` executes Vitest across workspaces; `npm run test:blank:full` cleans, rebuilds, and verifies the blank starter end-to-end.
- CLI and scaffolder checks assume fresh dist artifacts - run `npm run build` before touching example scripts or `test:create-stati`.

## Core engine hotspots

- `core/build.ts` streams Markdown through `renderMarkdown` into Eta `renderPage`, writing HTML under `dist/` and recording cache metadata in `.stati/cache/manifest.json`.
- Rebuild decisions come from `shouldRebuildPage` plus config hooks (`beforeAll`, `beforeRender`, `afterRender`) defined via `defineConfig()`.
- Static assets move through `copyStaticAssetsWithLogging`; preserve `logger.*` calls to keep CLI output structured.

## Error handling patterns

- Build errors during incremental rebuilds should be surfaced via `logger.error()` rather than throwing - this keeps the dev server alive and feeds the error overlay.
- The error overlay (`core/utils/error-overlay.utils.ts`) renders build failures in-browser during dev mode; it expects structured error objects with `message`, `file`, and optional `line`/`column`.
- Template rendering errors are caught in `renderPage` and logged with context (template path, page slug); they don't halt the entire build.
- Use `logger.warning()` for recoverable issues (missing optional fields, deprecated config); use `logger.error()` for failures that skip a page.
- Validation errors from config loading throw immediately since the build cannot proceed without valid configuration.

## Eta Template Restrictions

- **CRITICAL**: Eta templates do NOT support partial dynamic attributes like `class="static-<%= dynamic %>-morestatic"`. All dynamic content in HTML attributes must be fully dynamic.
- **Solution**: Use template literals for fully dynamic values: `class="<%= `static-${dynamic}-morestatic` %>"`
- **Utility Function**: Use `stati.propValue()` for building space-separated property values (similar to classnames). It accepts strings, arrays, and objects: `class="<%= stati.propValue('base-class', `dynamic-${value}`, condition && 'conditional-class') %>"` or `data-analytics="<%= stati.propValue('cta', campaign, isPrimary && 'primary') %>"`.
- **Concatenation Note**: When you need a single concatenated value (e.g., `data-id="item-42"`), prefer a template literal: `data-id="<%= `item-${id}` %>"`.
- **Common Pattern**: Build dynamic segments with template literals before passing them to `propValue`: `class="<%= stati.propValue('card', `hover:border-${color}-300`) %>"`.

## Dev + preview servers

- `createDevServer` (in `core/dev.ts`) clears cache, triggers an initial build, then watches `site/` and `public/`. Template edits flow through `handleTemplateChange` to evict affected manifest entries.
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

## Conventions

- Packages ship as ESM (`"type": "module"`); import locals with explicit `.js` extensions and use helpers from `packages/core/src/core/utils/fs.utils.ts` instead of `fs` directly.
- Strict TypeScript everywhere; export runtime symbols and types from separate barrels (`types/` for declarations). Avoid default exports except in configs.
- **Type imports**: Key types are exported from `packages/core/src/types/index.ts`: `StatiConfig`, `SiteConfig`, `BuildContext`, `PageContext`, `FrontMatter`, `PageModel`, `SEOConfig`, `ISGConfig`, `CacheManifest`, `CacheEntry`, `NavNode`, `BuildHooks`, `BuildStats`, `BundleConfig`.
- **Config typing**: Use `defineConfig()` from `@stati/core` for type-safe configuration in `stati.config.ts`.
- Tests live in `packages/*/test/` directories (not inside `src/`), use Vitest in `node` mode with `mockReset`/`restoreMocks`, and prefer temporary directories for file-system assertions.
- **Utils naming**: All utility files in `utils/` folders must use the `.utils.ts` suffix (e.g., `fs.utils.ts`, `error-overlay.utils.ts`). Each `utils/` folder must have an `index.ts` barrel that re-exports all utilities from that folder.

## Common file patterns

- `*.eta` - Eta templates (layouts, partials, pages)
- `*.md` - Markdown content files with YAML frontmatter
- `stati.config.ts` / `stati.config.js` - Site configuration using `defineConfig()`
- `.stati/` - Build cache directory (contains `cache/manifest.json`)
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
- **eta.filters**: Object of custom filter functions available in templates as `<%= it.value | filterName %>`.
- **typescript**: `enabled`, `srcDir`, `outDir`, `hash`, `minify`, `bundles[]` with `entryPoint`, `bundleName`, `include`/`exclude` glob patterns for selective bundle injection.
- **isg**: `enabled`, `ttlSeconds`, `maxAgeCapDays`, `aging[]` (array of `{ untilDays, ttlSeconds }` rules).
- **seo**: `defaultAuthor`, `autoInject`, `debug` - SEO metadata configuration.
- **search**: `enabled`, `indexName`, `hashFilename`, `maxContentLength`, `maxPreviewLength`, `headingLevels[]`, `exclude[]`, `includeHomePage`, `autoInjectMetaTag`.
- **sitemap**: `enabled`, `defaultPriority`, `defaultChangeFreq`, `excludePatterns[]`, `includePatterns[]`, `filter()`, `transformUrl()`, `transformEntry()`, `priorityRules[]` with `pattern` and `priority`, `generateIndex`.
- **robots**: `enabled`, `userAgents[]` with `userAgent`, `allow[]`, `disallow[]`, global `allow[]`/`disallow[]`, `crawlDelay`, `sitemap`, `customLines[]`.
- **rss**: `enabled`, `feeds[]` with `filename`, `title`, `description`, `link`, `language`, `copyright`, `managingEditor`, `webMaster`, `category`, `ttl`, `image`, `maxItems`, `contentPatterns[]`, `excludePatterns[]`, `filter()`, `sortBy`, `sortFn()`, `itemMapping`.
- **hooks**: `beforeAll`, `afterAll`, `beforeRender`, `afterRender` - async callbacks for build lifecycle customization.

## Search system

- Lives in `packages/core/src/search/`; generates a JSON search index at build time.
- Enable via `search: { enabled: true }` in config; index written to `dist/search-index.json` (or `dist/search-index-[hash].json` if `hashFilename: true`).
- Index contains `SearchDocument` entries with `id`, `url`, `anchor`, `title`, `heading`, `level`, `content`, `breadcrumb`, and optional `tags`.
- Configure with `indexName`, `maxContentLength`, `maxPreviewLength`, `headingLevels[]` to control index size.
- Use `exclude[]` glob patterns and `includeHomePage` to control which pages are indexed.
- Set `autoInjectMetaTag: true` (default) to inject `<meta name="stati:search-index">` into rendered HTML.
- Client-side search (e.g., in docs-site) loads the index and performs fuzzy matching; Stati does not bundle a search UI - that's up to the site.
- Exclusions: pages with `draft: true` in frontmatter are omitted from the index. Use `search.exclude[]` glob patterns for additional exclusions.

## Utility functions reference

All utilities in `packages/core/src/core/utils/` follow the `*.utils.ts` naming convention:

- **fs.utils.ts**: `ensureDir`, `readFile`, `writeFile`, `pathExists`, `remove`, `stat`, `copyFile`, `readdir` - safe filesystem helpers with consistent error handling.
- **paths.utils.ts**: `resolveSrcDir`, `resolveOutDir`, `resolveStaticDir`, `resolveCacheDir`, `normalizePathForComparison`, `isPathWithinDirectory` - path resolution and cross-platform comparison utilities.
- **slugify.utils.ts**: `slugify(text)` - URL-safe slug generation.
- **html.utils.ts**: `findHeadClosePosition`, `injectBeforeHeadClose` - HTML manipulation for SEO/meta tag injection.
- **navigation-helpers.utils.ts**: `createNavigationHelpers` - creates navigation helper object with `findNode`, `getChildren`, `getParent`, `getSiblings`, `getSubtree`, `getBreadcrumbs`, `getCurrentNode` methods.
- **callable-partials.utils.ts**: Helpers for invoking partials programmatically in templates.
- **partial-validation.utils.ts**: Validates partial paths to prevent directory traversal attacks.
- **template-discovery.utils.ts**: Finds all `.eta` files for dependency tracking.
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

- Cache manifest lives at `.stati/cache/manifest.json`; structure defined by `CacheManifest` type.
- Each entry tracks: `path` (output path), `inputsHash` (content+deps hash), `deps` (template dependencies), `tags`, `publishedAt`, `renderedAt` timestamp, `ttlSeconds`, `maxAgeCapDays`.
- `shouldRebuildPage` compares current content/template hashes against manifest; cache hit skips render.
- Template changes trigger `handleTemplateChange` which invalidates all pages listing that template in `deps`.
- Dependency tracking happens during render: `renderPage` records each `<%~ include() %>` call.
- Aging rules (`isg.aging[]`) apply progressive TTL based on content age (e.g., content older than 7 days gets longer cache TTL).
- `invalidate` command accepts queries like `tag:news`, `age:3months`, `path:/blog/*` to selectively clear cache entries.
- Cache keys use POSIX-normalized paths; Windows backslashes are converted before lookup.

## Metrics system

- Enable via CLI: `stati build --metrics` (JSON output), `--metrics-html` (HTML report), `--metrics-detailed` (per-page timings).
- Metrics written to `.stati/metrics/` as timestamped JSON files.
- Use metrics to diagnose slow builds, cache inefficiencies, or memory issues.

## Troubleshooting

- Cache hiccups: clear `.stati/` or run `stati build --clean`; the invalidate logic lives under `core/invalidate.ts`.
- If templates stop refreshing, inspect dependency tracking in `core/isg/manifest.ts`; `handleTemplateChange` expects POSIX-normalized paths.
- For docs regressions, run `npm run build` followed by entering the directory `docs-site` and running one of the local scripts. In the `docs-site` dir `npm run build:local` to confirm build is running with local CLI. In the `docs-site` dir `npm run dev:local` to start a dev server with local CLI. In the `docs-site` dir `npm run preview:local` to preview the static build with local CLI.
