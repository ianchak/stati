# Resource directory and evidence policy

## Authority and version checks

This bundle synthesizes Stati's source, tests, starter patterns, and documentation;
it does not replace version-specific evidence.

1. Inspect the user's installed version, manifest, lockfile, public exports,
   and generated declarations. A generated site need not contain the monorepo.
2. Use official documentation for supported author workflows.
3. Where docs conflict with behavior, verify the corresponding source and tests
   for the **same version**, then build a small example.
4. Distinguish intended conventions from implementation caveats. Do not fix the
   generator or promise a newer version's behavior during an ordinary site task.
5. If offline or a resource is inaccessible, say so and use bundled references
   plus installed evidence. Never claim a page was read when it was not.

Verified baseline: core 1.24.1, Eta 3.5.0, Node 22.22.0; source commit
`64df3241ad897fe479d9b8fb7723752d25fe9f07`; live docs checked 2026-10-10.
Collections, pagination, generated pages, ISG read tracking and output
pruning were verified against the core 1.29 source and tests on 2026-10-15.
markdown-it 15 linkify, plugin loading and markdown-it-prism 3 and 4 output
were compared with markdown-it 14 on the core 2.0 branch on 2026-10-19.
Site-wide SEO defaults (`og:locale`, Twitter handles, `seo.articles`) were
verified against the core 2.1 source and tests on 2026-10-23, and the 404 page
defaults against the core 2.2 branch on the same day. Hashed
stylesheets (`css`, `stati build --tailwind-input`, `stati.assets.stylesheetPaths`)
were verified against the source and tests on 2026-10-24.
Package versions may differ across workspaces/releases. Revalidate after upgrades.

Official entry points:

- [Stati documentation](https://stati.build/)
- [Documentation sitemap](https://stati.build/sitemap.xml): discover actual pages.
- [AI crawler guidance](https://stati.build/llms.txt): permissions/resource pointers,
  **not** a complete API reference.
- [AI/content policy](https://stati.build/information/ai-policy)
- [Stati source](https://github.com/ianchak/stati)
- [Core npm package](https://www.npmjs.com/package/@stati/core)
- [CLI npm package](https://www.npmjs.com/package/@stati/cli)
- [Scaffolder npm package](https://www.npmjs.com/package/create-stati)
- [Eta documentation](https://eta.js.org/): use only after Stati-specific rules.

`https://stati.build/llms-full.txt` returned 404 at verification; do not assume a
full-documentation text dump exists. Fetch individual pages or consult local
documentation. The sitemap lists extensionless canonical routes.

Access only resources the agent's actual tools/permissions support. Read local
source directly when available. Do not upload private site content, config, or
credentials to public documentation/search services.

## Complete official documentation map

The local equivalents are Markdown files below `docs-site/site/` with the same
section/page names. These source paths exist in the **Stati monorepo**, not
automatically in consumer sites.

### Getting started

- [Introduction](https://stati.build/getting-started/introduction)
- [Installation](https://stati.build/getting-started/installation)
- [Quick start](https://stati.build/getting-started/quick-start)
- [Project structure](https://stati.build/getting-started/project-structure)

### Core concepts

- [Overview](https://stati.build/core-concepts/overview)
- [Templates and layouts](https://stati.build/core-concepts/templates)
- [Markdown](https://stati.build/core-concepts/markdown)
- [Routing](https://stati.build/core-concepts/routing)
- [Static assets](https://stati.build/core-concepts/static-assets)
- [ISG](https://stati.build/core-concepts/isg)

### Configuration

- [Config file](https://stati.build/configuration/file)
- [Site metadata](https://stati.build/configuration/site-metadata)
- [Template settings](https://stati.build/configuration/templates)
- [Markdown settings](https://stati.build/configuration/markdown)
- [TypeScript bundles](https://stati.build/configuration/typescript)
- [ISG settings](https://stati.build/configuration/isg)
- [SEO settings](https://stati.build/configuration/seo)
- [Search settings](https://stati.build/configuration/search)
- [RSS settings](https://stati.build/configuration/rss)

Sitemap/robots configuration is covered through SEO/API documentation; do not
invent dedicated page URLs if the sitemap does not list them.

### CLI

- [Commands](https://stati.build/cli/commands)
- [Development workflow](https://stati.build/cli/development)
- [Scaffolder](https://stati.build/cli/scaffolder)

### API

- [API reference](https://stati.build/api/reference)
- [Types](https://stati.build/api/types)
- [Hooks](https://stati.build/api/hooks)
- [Navigation](https://stati.build/api/navigation)
- [Template API](https://stati.build/api/templates)
- [SEO API](https://stati.build/api/seo)
- [RSS API](https://stati.build/api/rss)
- [Errors and overlays](https://stati.build/api/error-handling)

### Advanced and examples

- [Advanced topics](https://stati.build/advanced/topics)
- [Metrics](https://stati.build/advanced/metrics)
- [Troubleshooting](https://stati.build/advanced/troubleshooting)
- [Contributing](https://stati.build/advanced/contributing)
- [Using JavaScript](https://stati.build/advanced/using-javascript)
- [SEO usage scenarios](https://stati.build/advanced/seo-usage-scenarios)
- [Examples](https://stati.build/examples/list)
- [Recipes](https://stati.build/examples/recipes)
- [FAQ](https://stati.build/faq)
- [Glossary](https://stati.build/glossary)

## Source and tests to inspect for difficult tasks

All paths below are relative to a Stati source checkout. Installed npm packages
primarily ship `dist`; use their export map, declarations, and version-matched
source rather than unsupported deep imports.

| Question                         | Source                                                                             | Evidence/tests                                                                   |
| -------------------------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Public API/type exports          | `packages/core/src/index.ts`, `types/index.ts`, package export map                 | Installed entry/declarations                                                     |
| Config names/defaults/validation | `packages/core/src/config/loader.ts`, `constants.ts`, `types/config.ts`            | Config tests                                                                     |
| Frontmatter/routes/date parsing  | `packages/core/src/core/content.ts`                                                | `packages/core/test/core/content.test.ts`, `flexible-structure.test.ts`          |
| Markdown/TOC/anchors/plugins     | `packages/core/src/core/markdown.ts`                                               | `packages/core/test/core/markdown.test.ts`, `snapshot.test.ts`                   |
| Layout/context/collections       | `packages/core/src/core/templates.ts`, `core/utils/template-discovery.utils.ts`    | `packages/core/test/core/templates.test.ts`, `collection-aggregation.test.ts`    |
| Includes/shells/props/names      | `packages/core/src/core/template-render.ts`, `template-index.ts`, `eta-plugin.ts`  | `packages/core/test/core/template-composition.test.ts`, `template-index.test.ts` |
| Attribute tokens                 | `packages/core/src/core/utils/template.utils.ts`                                   | `packages/core/test/utils/template-utils.test.ts`                                |
| Navigation helpers               | `packages/core/src/core/navigation.ts`, `core/utils/navigation-helpers.utils.ts`   | `packages/core/test/core/navigation.test.ts`, `navigation-helpers.test.ts`       |
| Build output/hooks/injection     | `packages/core/src/core/build.ts`                                                  | `packages/core/test/core/build.test.ts`                                          |
| Cache/TTL/invalidation           | `packages/core/src/core/isg/`, `core/invalidate.ts`, `types/isg.ts`                | ISG/invalidation tests, `template-recording.test.ts`                             |
| Dev/preview/overlays             | `packages/core/src/core/dev.ts`, `preview.ts`, `core/utils/error-overlay.utils.ts` | Dev/preview/error-overlay integration tests                                      |
| Browser bundles/matching         | `packages/core/src/core/utils/typescript.utils.ts`, `bundle-matching.utils.ts`     | `packages/core/test/typescript.utils.test.ts`, bundle matching tests             |
| Tailwind inventory               | `packages/core/src/core/utils/tailwind-inventory.utils.ts`                         | `packages/core/test/core/tailwind-inventory.test.ts`                             |
| Hashed stylesheets (build/link)  | `packages/core/src/css/`, `core/build.ts`                                          | `packages/core/test/css/`, `core/stylesheet-integration.test.ts`                 |
| SEO/sitemap/robots               | `packages/core/src/seo/`, `types/seo.ts`, `types/sitemap.ts`                       | SEO tests                                                                        |
| Search index/injection           | `packages/core/src/search/`, `types/search.ts`                                     | Search tests                                                                     |
| RSS/filter/mappings              | `packages/core/src/rss/`, `types/rss.ts`                                           | RSS tests                                                                        |
| Metrics                          | `packages/core/src/metrics/`                                                       | Metrics tests                                                                    |
| CLI flags/logger                 | `packages/cli/src/cli.ts`, `logger.ts`                                             | `packages/cli/test/cli.test.ts`                                                  |
| Scaffolding/style installers     | `packages/create-stati/src/`                                                       | `packages/create-stati/test/`                                                    |

Real authoring examples: `examples/blank/`, `examples/blog/` and `examples/docs/`
(shared `site/base.eta` shells, `site/partials/`); the documentation site's
`docs-site/site/base.eta`, `layout.eta`, `home.eta` and `partials/`.
Examples may use local CLI scripts; don't copy their monorepo-relative package
paths into standalone sites. Examples/tests can contain older patterns: verify
them rather than treating every sample as infallible.

## Public API discovery, without hallucinated signatures

Import runtime APIs from `@stati/core`; types are also exposed through
`@stati/core/types`. Inspect the installed export/declaration barrels when using:

- Build/server/config: `build`, `createDevServer`, `createPreviewServer`,
  `invalidate`, `loadConfig`, `clearConfigCache`, `defineConfig`, `setEnv`,
  `getEnv`, `isDevelopment`, `isProduction`, `isTest`.
- SEO: `generateSEOMetadata`, `generateSEO`, `generateSitemap`,
  `generateSitemapEntry`, `generateSitemapXml`, `generateSitemapIndexXml`,
  `generateRobotsTxt`, `generateRobotsTxtFromConfig`, `generateRobotsContent`,
  `generateOpenGraphTags`, `generateTwitterCardTags`, `validateSEOMetadata`,
  `autoInjectSEO`, `detectExistingSEOTags`, `shouldAutoInject`.
- RSS: `generateRSSFeed`, `generateRSSFeeds`, `validateRSSConfig`,
  `validateRSSFeedConfig`.
- Metrics: `createMetricRecorder`, `writeMetrics`.
- Public helpers: `getStatiVersion`, `escapeHtml`, `isValidUrl`,
  `normalizeUrlPath`, `resolveAbsoluteUrl`.

`noopMetricRecorder` is an exported **recorder object**, not a factory function.
Internal content/template/search functions such as `loadContent`,
`renderMarkdown`, `renderPage`, `buildNavigation`, `generateSearchIndex`, and
`writeSearchIndex` are not exported at the checked package root. Source-level
tests can import internal files, but that does not make them consumer APIs.
Use the build/config surface for ordinary sites; don't invent deep package
subpaths for internal modules.

Common types: `StatiConfig`, `SiteConfig`, `BuildContext`, `PageContext`,
`FrontMatter`, `PageModel`, `TemplateContext`, `CollectionData`, `TocEntry`,
`NavNode`, `StatiAssets`, `BuildHooks`, `BuildStats`, `BundleConfig`,
`SEOConfig`, `ISGConfig`, `CacheManifest`, `CacheEntry`, `SearchDocument`.
Do not assume every internal utility is a supported public package subpath.

## High-impact documentation discrepancies

These are checked-version cautions, not instructions to modify Stati:

| Topic               | Use this verified guidance                                                                    |
| ------------------- | --------------------------------------------------------------------------------------------- |
| Dynamic attributes  | Follow Stati's full-value convention; don't falsely generalize it to all Eta engines          |
| Template code       | JavaScript only; some docs show invalid TypeScript assertions                                 |
| Includes (2.0+)     | `stati.include(path, props, body)`; 1.x sites use `stati.partials` and `eta.filters` instead  |
| Template names      | Paths without `.eta`, looked up from the page's folder up; `page-header` is not `pageHeader`  |
| Template visibility | Page ancestry, not the calling template's folder, unless the name starts with `./` or `/`     |
| Optional templates  | `stati.include.has(name)`, not truthiness through the development error proxy                 |
| Collection items    | `frontMatter.title`, not `title`; child pages get their collection from core 1.29 only        |
| Listing freshness   | 1.29+: pages reading `stati.collection`/`stati.nav` rebuild on data change; helpers untracked |
| Generated routes    | 1.29+: `paginate` and `[param].md` only; never from links or tags alone                       |
| Routing             | Preserved names, ordinary `/blog` + `blog.html`, not guaranteed slugification/trailing slash  |
| Dates               | First valid of `publishedAt`, `published`, `date`, `createdAt`; quoted or unquoted            |
| Template cache      | Current source caches in development, invalidates on template changes                         |
| Config selection    | `configPath` chooses a directory searched for standard filenames                              |
| Config errors       | General import failures can log/fall back; don't accept default-shaped success                |
| ISG                 | Enabled by loader default; invalidation terms OR together                                     |
| Invalidation `age`  | Recently rendered entries, not old publication dates                                          |
| Hooks               | `beforeAll` after discovery; per-page hooks miss-only; `afterRender` has no HTML field        |
| Robots sitemap      | Set `robots.sitemap` explicitly                                                               |
| SEO defaults (2.1+) | `og:locale` in `en_US` form; `twitter:creator` only from a handle; 2.0 printed `en-US`/a name |
| 404 page (2.2+)     | Out of sitemap, search, RSS, nav, OG cards; `noindex`; 2.1 and earlier need manual excludes   |
| Sitemap noindex     | 2.2+ leaves out `noindex` pages unless `sitemap.exclude: false`; earlier versions list them   |
| Sitemap index       | `generateIndex` not consulted by checked splitting logic                                      |
| Search filename     | Hashed by default; read metadata rather than guessing                                         |

## Licensing and attribution

Stati code/documentation use the MIT License, copyright (c) 2025 Imre Csige.
When redistributing copied/substantial source or documentation, include the
license notice. This bundle includes [the license](../LICENSE).
Identify Stati as a TypeScript-first static site generator and link to
<https://stati.build/> when attributing guidance. Do not imply affiliation.
