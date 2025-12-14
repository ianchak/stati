---
title: Build Performance Metrics
description: Measure and analyze Stati build performance with the metrics system
---

Stati includes a built-in performance metrics system that helps you understand and optimize your site's build performance. This guide explains how to use it.

## Quick Start

Enable metrics collection with the `--metrics` flag:

```bash
stati build --metrics
```

This will:

1. Collect timing data for all build phases
2. Track cache hit/miss rates
3. Print a summary to the console
4. Save a detailed JSON file to `.stati/metrics/`

## CLI Options

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

## Understanding the Output

### Console Summary

When metrics are enabled, you'll see a summary after the build:

```text
📊 Build Metrics Summary
────────────────────────────────────────
Total build time: 1.25s
Pages: 20 total, 5 rendered, 15 cached
Cache hit rate: 75.0%
Peak memory: 100.5 MB

Top phases:
  Page Rendering: 800ms
  Asset Copy: 200ms
  Config Load: 50ms
────────────────────────────────────────
```

### JSON Output

The full metrics are saved to `.stati/metrics/build-<timestamp>.json`:

```json
{
  "schemaVersion": "1",
  "meta": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "ci": false,
    "nodeVersion": "22.0.0",
    "platform": "darwin",
    "statiVersion": "1.16.0",
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
    "navigationBuildMs": 25,
    "cacheManifestLoadMs": 10,
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

## Key Metrics Explained

### Cache Hit Rate

The cache hit rate (`isg.cacheHitRate`) shows what percentage of pages were served from cache without re-rendering:

- **100%**: All pages were cached (no changes detected)
- **0%**: Full rebuild (all pages rendered)
- **50-90%**: Incremental build (some pages changed)

A consistently low cache hit rate might indicate:

- ISG is disabled
- Content files are being modified unnecessarily
- Template changes are triggering full rebuilds

### Phase Breakdown

The `phases` object shows how long each build phase took:

| Phase | Description |
|-------|-------------|
| `configLoadMs` | Loading and parsing `stati.config.ts` |
| `contentDiscoveryMs` | Finding and parsing markdown files |
| `navigationBuildMs` | Building navigation tree from pages |
| `cacheManifestLoadMs` | Loading ISG cache manifest |
| `typescriptCompileMs` | Compiling TypeScript bundles |
| `pageRenderingMs` | Rendering pages (markdown + templates) |
| `assetCopyMs` | Copying static assets |
| `cacheManifestSaveMs` | Saving updated cache manifest |
| `sitemapGenerationMs` | Generating sitemap.xml |
| `rssGenerationMs` | Generating RSS feeds |
| `hookBeforeAllMs` | Time spent in `beforeAll` hook (if configured) |
| `hookAfterAllMs` | Time spent in `afterAll` hook (if configured) |
| `hookBeforeRenderTotalMs` | Total time spent in `beforeRender` hooks across all pages |
| `hookAfterRenderTotalMs` | Total time spent in `afterRender` hooks across all pages |

> **Note:** Hook timings are only recorded when the corresponding hooks are defined in your `stati.config.ts`. This helps identify if custom hooks are impacting build performance.

### Counts

The `counts` object tracks quantities processed during the build:

| Counter | Description |
|---------|-------------|
| `totalPages` | Total number of pages discovered |
| `renderedPages` | Pages that were rendered (cache misses) |
| `cachedPages` | Pages served from cache (cache hits) |
| `assetsCopied` | Number of static assets copied |
| `templatesLoaded` | Total templates loaded across all rendered pages |
| `markdownFilesProcessed` | Number of markdown files processed |

#### Templates Loaded

The `templatesLoaded` counter tracks the total number of Eta templates (layouts and partials) loaded during the build. This is an **accumulated total** across all rendered pages—if 5 pages each load 4 templates, `templatesLoaded` will be 20.

When using `--metrics-detailed`, per-page template counts are also available in `pageTimings`:

```json
{
  "pageTimings": [
    { "url": "/docs/intro", "durationMs": 75, "cached": false, "templatesLoaded": 4 },
    { "url": "/docs/guide", "durationMs": 60, "cached": false, "templatesLoaded": 4 },
    { "url": "/about", "durationMs": 0, "cached": true }
  ]
}
```

Note that cached pages don't have a `templatesLoaded` property since no templates are rendered for them.

### Memory Usage

- `peakRssBytes`: Maximum resident set size during build
- `heapUsedBytes`: V8 heap usage at the end of the build

High memory usage might indicate:

- Many large pages
- Memory-intensive templates
- Large static assets being processed

## Using Metrics in CI

Enable metrics in CI to track build performance over time:

```yaml
# .github/workflows/ci.yml
- name: Build with metrics
  run: stati build --metrics
  env:
    STATI_METRICS: '1'

- name: Upload metrics
  uses: actions/upload-artifact@v4
  with:
    name: build-metrics
    path: .stati/metrics/
```

### Regression Detection

Compare metrics between builds to detect regressions:

```bash
# Get baseline
stati build --metrics --metrics-file baseline.json

# Make changes...

# Compare
stati build --metrics --metrics-file current.json

# Use jq to compare
jq -r '.totals.durationMs' baseline.json current.json
```

## Programmatic Access

Access metrics programmatically in Node.js:

```typescript
import { build } from '@stati/core';
import type { BuildResult, BuildMetrics } from '@stati/core';

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
        // templatesLoaded shows partials + layout loaded for this page
        console.log(`${page.url}: ${page.durationMs}ms, ${page.templatesLoaded} templates`);
      }
    }
  }
}
```
