---
title: 'Overview'
description: 'Every public Stati API on one page: config, programmatic build and servers, hooks, the template context, SEO, RSS and types, with links to the full reference.'
order: 0
seo:
  title: 'Stati API overview'
---

# Overview

The main parts of Stati's public API on one page. Everything below is exported from `@stati/core` or available in templates as `stati`. Each section links to its full reference, and [Types](/api/types#module-exports) lists every export.

## Configuration

```typescript
import { defineConfig } from '@stati/core';

export default defineConfig({
  site: { title: 'My site', baseUrl: 'https://example.com' },
});
```

| Export             | Signature                                |
| ------------------ | ---------------------------------------- |
| `defineConfig`     | `(config: StatiConfig) => StatiConfig`   |
| `loadConfig`       | `(cwd?: string) => Promise<StatiConfig>` |
| `clearConfigCache` | `() => void`                             |

Every config section is covered under [Configuration](/configuration/file).

## Build and servers

The same functions the `stati` CLI calls, for use in your own scripts.

| Export                                    | Signature                                                           |
| ----------------------------------------- | ------------------------------------------------------------------- |
| `build`                                   | `(options?: BuildOptions) => Promise<BuildResult>`                  |
| `createDevServer`                         | `(options?: DevServerOptions) => Promise<DevServer>`                |
| `createPreviewServer`                     | `(options?: PreviewServerOptions) => Promise<PreviewServer>`        |
| `invalidate`                              | `(query?: string) => Promise<InvalidationResult>`                   |
| `setEnv`, `getEnv`                        | Set or read the environment (`development`, `production` or `test`) |
| `isDevelopment`, `isProduction`, `isTest` | Check the current environment                                       |

Dev and preview servers expose `start()`, `stop()` and `url`; call `start()` to begin serving. `build()` does not set the environment: call `setEnv('production')` first for a production build (sitemap, robots.txt and RSS are only generated in production). `invalidate` accepts the same queries as the CLI, such as `tag:news`, `path:/blog` or `age:3months`. See [CLI commands](/cli/commands#stati-invalidate) and [ISG](/core-concepts/isg).

`createMetricRecorder`, `noopMetricRecorder` and `writeMetrics` back the `--metrics` flags (see [Build metrics](/advanced/metrics)), and `getStatiVersion()` returns the installed `@stati/core` version.

## Build hooks

Defined under `hooks` in your config. Each can be async.

| Hook           | Receives       | Runs                           |
| -------------- | -------------- | ------------------------------ |
| `beforeAll`    | `BuildContext` | Once, before any page renders  |
| `beforeRender` | `PageContext`  | Before each re-rendered page   |
| `afterRender`  | `PageContext`  | After each re-rendered page    |
| `afterAll`     | `BuildContext` | Once, after the build finishes |

Pages served from the ISG cache skip `beforeRender` and `afterRender`. Full reference: [Build hooks](/api/hooks).

## Template context

Every Eta template and partial receives a `stati` object.

| Member                     | What it holds                                                                                                                            |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `stati.site`               | Site config (`title`, `baseUrl`, `defaultLocale`, …)                                                                                     |
| `stati.page`               | The current page: `url`, `path` and every front matter field                                                                             |
| `stati.content`            | The rendered Markdown body                                                                                                               |
| `stati.partials`           | Partials from `_`-prefixed folders, renderable or callable with props                                                                    |
| `stati.nav`                | The navigation tree and helpers: `findNode`, `getChildren`, `getParent`, `getSiblings`, `getSubtree`, `getBreadcrumbs`, `getCurrentNode` |
| `stati.collection`         | Pages in the current collection, on index pages                                                                                          |
| `stati.assets`             | `bundlePaths` for this page (empty when no bundle matches) and `searchIndexPath` when search is enabled                                  |
| `stati.propValue(...)`     | Builds space-separated attribute values from strings, arrays and objects                                                                 |
| `stati.generateSEO(tags?)` | Renders SEO tags for manual placement                                                                                                    |
| `stati.generator.version`  | The Stati version that built the page                                                                                                    |
| `stati.<filter>(...)`      | Your custom filters from `eta.filters`                                                                                                   |

Full reference: [Templates](/api/templates) and [Navigation](/api/navigation).

## SEO, sitemap and robots.txt

Generated automatically from config. The underlying functions are exported for custom pipelines: `generateSEO`, `generateSEOMetadata`, `generateOpenGraphTags`, `generateTwitterCardTags`, `generateSitemap`, `generateSitemapXml`, `generateRobotsTxt`, `autoInjectSEO` and `validateSEOMetadata`. See [SEO](/api/seo).

## RSS

`generateRSSFeed`, `generateRSSFeeds`, `validateRSSConfig` and `validateRSSFeedConfig`. Feeds are normally configured under `rss` and written during the build. See [RSS](/api/rss).

## Types

The types you will reach for most: `StatiConfig`, `SiteConfig`, `BuildContext`, `PageContext`, `PageModel`, `FrontMatter`, `NavNode`, `BuildHooks`, `ISGConfig`, `AgingRule`, `BundleConfig`, `SEOConfig`, `SitemapConfig`, `RSSConfig`, `BuildOptions` and `BuildResult`. See [Types](/api/types).

## Errors

Build and template errors are reported through the logger and, during `stati dev`, an in-browser overlay. See [Error handling](/api/error-handling).
