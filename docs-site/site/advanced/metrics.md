---
title: 'Build metrics'
description: Measure and analyze Stati build performance with the metrics system
order: 6
seo:
  title: 'Build performance metrics'
---

# Build metrics

Stati includes a built-in performance metrics system that helps you understand and optimize your site's build performance. This guide explains how to use it.

## Quick start

Enable metrics collection with the `--metrics` flag:

```bash
npx stati build --metrics
```

Run the commands on this page from your project root, where `@stati/cli` is installed (inside npm scripts, plain `stati` works).

This will:

1. Collect timing data for all build phases
2. Track cache hit/miss rates
3. Save a detailed JSON file to `.stati/metrics/`

## CLI options

### `--metrics`

Enable metrics collection. Can also be enabled via the `STATI_METRICS=1` environment variable.

```bash
# Via flag
stati build --metrics

# Via environment variable
STATI_METRICS=1 stati build
```

### `--metrics-file <path>`

Specify a custom output path for the metrics JSON file. The path is relative to `.stati/metrics/`:

```bash
# Writes to .stati/metrics/my-metrics.json
stati build --metrics --metrics-file my-metrics.json

# Writes to .stati/metrics/reports/build.json
stati build --metrics --metrics-file reports/build.json
```

### `--metrics-detailed`

Include per-page timing information in the output:

```bash
stati build --metrics --metrics-detailed
```

### `--metrics-html`

Generate an interactive HTML report alongside the JSON file:

```bash
stati build --metrics --metrics-html
```

The report is a single HTML file that follows your system's light or dark theme. It shows:

- The pages rendered, the cache hit rate, the templates loaded and the peak memory
- Every phase, slowest first or in the order the build runs them, with the steps of page rendering nested under it. Open a phase to see what it measures.
- Every count, grouped by pages, templates, the ISG cache and assets
- Each page's result, render time and template counts, slowest first (with `--metrics-detailed`)
- The raw JSON, ready to copy

![The Stati build metrics report: a header with the Stati mark and links to its sections; the headline Built 45 pages in 4.25s; badges for a local, detailed build; the pages rendered, cache hit rate, templates loaded and peak memory; the flags, branch and versions of the build; and the phase breakdown, slowest first, starting with image generation.](/images/stati_build_metrics.jpg){.dark:hidden}
![The Stati build metrics report in its dark theme: the headline Built 45 pages in 4.25s, the pages rendered, cache hit rate, templates loaded and peak memory, the build's flags, branch and versions, and the phase breakdown.](/images/stati_build_metrics_dark.jpg){.hidden .dark:block}

You can combine all flags for the most comprehensive output:

```bash
stati build --metrics --metrics-detailed --metrics-html
```

## Understanding the output

### JSON output

Metrics are saved to `.stati/metrics/build-<timestamp>.json`:

```json
{
  "schemaVersion": "1",
  "meta": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "gitCommit": "9180b39c1d2e…",
    "gitBranch": "main",
    "ci": false,
    "nodeVersion": "22.13.0",
    "platform": "darwin",
    "arch": "arm64",
    "cpuCount": 8,
    "cliVersion": "1.11.0",
    "coreVersion": "1.18.0",
    "command": "build",
    "flags": {
      "force": false,
      "clean": false
    }
  },
  "totals": {
    "durationMs": 1250,
    "peakRssBytes": 105381888,
    "heapUsedBytes": 52428800
  },
  "phases": {
    "configLoadMs": 50,
    "contentDiscoveryMs": 100,
    "cacheManifestLoadMs": 10,
    "templateIndexMs": 2,
    "pageRenderingMs": 800,
    "assetCopyMs": 200,
    "cacheManifestSaveMs": 15
  },
  "counts": {
    "totalPages": 20,
    "renderedPages": 5,
    "cachedPages": 15,
    "assetsCopied": 10,
    "templatesLoaded": 18,
    "templateRenders": 31,
    "includeCacheHits": 4,
    "templatesIndexed": 9,
    "markdownFilesProcessed": 20
  },
  "isg": {
    "enabled": true,
    "cacheHitRate": 0.75,
    "manifestEntries": 20,
    "invalidatedEntries": 5
  }
}
```

## Key metrics explained

### Cache hit rate

The cache hit rate (`isg.cacheHitRate`) shows what percentage of pages were served from cache without re-rendering:

- **100%**: All pages were cached (no changes detected)
- **0%**: Full rebuild (all pages rendered)
- **50-90%**: Incremental build (some pages changed)

A consistently low cache hit rate might indicate:

- ISG is disabled
- Content files are being modified unnecessarily
- Template changes are triggering full rebuilds

### Phase breakdown

The `phases` object shows how long each build phase took:

| Phase | Description |
|-------|-------------|
| `configLoadMs` | Loading and parsing `stati.config.ts` |
| `contentDiscoveryMs` | Finding and parsing markdown files |
| `cacheManifestLoadMs` | Loading ISG cache manifest |
| `typescriptCompileMs` | Compiling TypeScript bundles |
| `templateIndexMs` | Listing every `.eta` file in the source directory, once per build (a dev server keeps the list between rebuilds) |
| `pageRenderingMs` | Rendering pages (markdown + templates), including the phases measured inside it: the `beforeAll` hook, the search index and the per-page totals below |
| `shouldRebuildTotalMs` | Aggregate time checking if pages need rebuild |
| `markdownRenderTotalMs` | Aggregate time rendering each rendered page's Markdown to HTML, with its plugins |
| `renderPageTotalMs` | Aggregate time rendering pages through their templates |
| `postRenderTotalMs` | Aggregate time between a page's templates and its file write: SEO, search and bundle tag injection, image registration and cache hashing |
| `fileWriteTotalMs` | Aggregate time writing HTML files to disk |
| `cacheEntryTotalMs` | Aggregate time updating cache entries |
| `searchIndexGenerationMs` | Generating search index JSON |
| `searchIndexWriteMs` | Writing search index to disk |
| `assetCopyMs` | Copying static assets |
| `imageSettleMs` | Waiting for image jobs to finish and saving the image manifest (unless `images: false`) |
| `cacheManifestSaveMs` | Saving updated cache manifest |
| `sitemapGenerationMs` | Generating sitemap.xml |
| `tailwindInitMs` | Tailwind detection and inventory initialization |
| `tailwindInventoryMs` | Writing Tailwind inventory at end of build |
| `getDirectorySizeMs` | Calculating directory size for build stats |
| `hookBeforeAllMs` | Time spent in `beforeAll` hook (if configured) |
| `hookAfterAllMs` | Time spent in `afterAll` hook (if configured) |
| `hookBeforeRenderTotalMs` | Total time spent in `beforeRender` hooks across all pages |
| `hookAfterRenderTotalMs` | Total time spent in `afterRender` hooks across all pages |

> **Note:** The `MetricsPhases` type also declares `navigationBuildMs`, `rssGenerationMs`, `lockAcquireMs` and `lockReleaseMs`, but the build does not record them yet.
>
> `pageRenderingMs` already contains `hookBeforeAllMs`, `searchIndexGenerationMs`, `searchIndexWriteMs` and the per-page totals (`shouldRebuildTotalMs`, `hookBeforeRenderTotalMs`, `markdownRenderTotalMs`, `renderPageTotalMs`, `postRenderTotalMs`, `fileWriteTotalMs`, `cacheEntryTotalMs` and `hookAfterRenderTotalMs`), so adding them all up counts that time twice. The HTML report lists them under page rendering.
>
> Not all phases appear in every build. Only phases that actually run will be included in the metrics output. For example, hook timings are only recorded when the corresponding hooks are defined in your `stati.config.ts`, and TypeScript compilation only runs when TypeScript bundles are configured.

### Counts

The `counts` object tracks quantities processed during the build:

| Counter | Description |
|---------|-------------|
| `totalPages` | Total number of pages discovered |
| `renderedPages` | Pages that were rendered (cache misses) |
| `cachedPages` | Pages served from cache (cache hits) |
| `assetsCopied` | Number of static assets copied |
| `templatesLoaded` | Distinct templates each rendered page used, summed over the rendered pages |
| `templateRenders` | Template renders across the rendered pages: layouts, the parents they name, included templates and the Open Graph template |
| `includeCacheHits` | Includes without props or children that reused the page's earlier render of the same template |
| `templatesIndexed` | `.eta` files in the source directory |
| `markdownFilesProcessed` | Number of markdown files processed |
| `imagesGenerated` | Image jobs that ran in this build: one per image's set of responsive versions, per Open Graph card and per image copied from next to a page |
| `imagesCached` | Image jobs whose files were reused from an earlier build |
| `imagesFailed` | Image jobs that failed; their pages show the original image and are rebuilt next time |

#### Templates loaded and renders

`templatesLoaded` counts, for each rendered page, the template files it rendered: its layout, the parents named with `stati.layout()`, the templates it includes and the Open Graph template. Templates a page does not use are neither rendered nor counted. The counter is an **accumulated total**: if 5 pages each render 4 templates, `templatesLoaded` is 20.

`templateRenders` counts renders instead of files. A component included three times with different props is one template loaded and three renders. An include without props or children renders once per page and reuses that HTML afterwards; each reuse counts in `includeCacheHits`, not in `templateRenders`.

When using `--metrics-detailed`, per-page template counts are also available in `pageTimings`:

```json
{
  "pageTimings": [
    { "url": "/docs/intro", "durationMs": 75.4, "cached": false, "templatesLoaded": 4, "templateRenders": 9 },
    { "url": "/docs/guide", "durationMs": 60.2, "cached": false, "templatesLoaded": 4, "templateRenders": 7 },
    { "url": "/about", "durationMs": 0, "cached": true }
  ]
}
```

Cached pages have neither count, since nothing renders for them.

### Memory usage

- `peakRssBytes`: Maximum resident set size during build
- `heapUsedBytes`: V8 heap usage at the end of the build

High memory usage might indicate:

- Many large pages
- Memory-intensive templates
- Large static assets being processed

## Using metrics in CI

Enable metrics in CI to track build performance over time. The `STATI_METRICS` variable turns metrics on without changing your `build` script:

```yaml
# .github/workflows/ci.yml
- name: Build with metrics
  run: npm run build
  env:
    STATI_METRICS: '1'

- name: Upload metrics
  uses: actions/upload-artifact@v4
  with:
    name: build-metrics
    path: .stati/metrics/
```

### Regression detection

Compare metrics between builds to detect regressions:

```bash
# Get baseline (written to .stati/metrics/baseline.json)
npx stati build --metrics --metrics-file baseline.json

# Make changes...

# Compare
npx stati build --metrics --metrics-file current.json

# Use jq to compare
jq -r '.totals.durationMs' .stati/metrics/baseline.json .stati/metrics/current.json
```

## Programmatic access

Access metrics programmatically in Node.js:

```typescript
import { build, setEnv } from '@stati/core';
import type { BuildResult, BuildMetrics } from '@stati/core';

setEnv('production'); // build() alone runs a development build

const result: BuildResult = await build({
  metrics: { enabled: true, detailed: true }
});

if (result.buildMetrics) {
  const metrics: BuildMetrics = result.buildMetrics;
  console.log(`Build took ${metrics.totals.durationMs}ms`);
  console.log(`Cache hit rate: ${metrics.isg.cacheHitRate * 100}%`);

  // Per-page timings (when detailed: true)
  if (metrics.pageTimings) {
    for (const page of metrics.pageTimings) {
      if (page.cached) {
        console.log(`${page.url}: cached`);
      } else {
        // The templates this page rendered, and how many renders they took
        console.log(
          `${page.url}: ${page.durationMs}ms, ${page.templatesLoaded} templates, ${page.templateRenders} renders`,
        );
      }
    }
  }
}
```
