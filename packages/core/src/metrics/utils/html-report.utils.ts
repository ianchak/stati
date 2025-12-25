/**
 * HTML Metrics Report Generator
 *
 * Generates a self-contained HTML file for visualizing build performance metrics.
 * Handles both standard and detailed (with pageTimings) metrics files.
 */

import { writeFile } from 'node:fs/promises';
import type { BuildMetrics, PageTiming } from '../types.js';

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

/**
 * Format milliseconds to human-readable duration
 */
function formatDuration(ms: number): string {
  if (ms < 1) return `${(ms * 1000).toFixed(0)}μs`;
  if (ms < 1000) return `${ms.toFixed(2)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * Format percentage
 */
function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

/**
 * Get human-readable phase name
 */
function getPhaseLabel(key: string): string {
  const labels: Record<string, string> = {
    configLoadMs: 'Config Loading',
    contentDiscoveryMs: 'Content Discovery',
    navigationBuildMs: 'Navigation Build',
    cacheManifestLoadMs: 'Cache Manifest Load',
    typescriptCompileMs: 'TypeScript Compile',
    pageRenderingMs: 'Page Rendering',
    shouldRebuildTotalMs: 'Rebuild Checks',
    renderPageTotalMs: 'Render Pages',
    fileWriteTotalMs: 'File Writing',
    cacheEntryTotalMs: 'Cache Entry Updates',
    searchIndexGenerationMs: 'Search Index Generation',
    searchIndexWriteMs: 'Search Index Write',
    assetCopyMs: 'Asset Copying',
    cacheManifestSaveMs: 'Cache Manifest Save',
    sitemapGenerationMs: 'Sitemap Generation',
    rssGenerationMs: 'RSS Generation',
    tailwindInitMs: 'Tailwind Init',
    tailwindInventoryMs: 'Tailwind Inventory',
    getDirectorySizeMs: 'Directory Size Calc',
    lockAcquireMs: 'Lock Acquire',
    lockReleaseMs: 'Lock Release',
    hookBeforeAllMs: 'Hook: beforeAll',
    hookAfterAllMs: 'Hook: afterAll',
    hookBeforeRenderTotalMs: 'Hook: beforeRender (total)',
    hookAfterRenderTotalMs: 'Hook: afterRender (total)',
  };
  return (
    labels[key] ||
    key
      .replace(/Ms$/, '')
      .replace(/([A-Z])/g, ' $1')
      .trim()
  );
}

/**
 * Get detailed description for each phase
 */
function getPhaseDescription(key: string): string {
  const descriptions: Record<string, string> = {
    configLoadMs:
      'Time spent loading and validating the stati.config.ts configuration file. This includes parsing the config, resolving paths, and setting up the build context. A slow config load may indicate complex config logic or slow dynamic imports.',
    contentDiscoveryMs:
      'Time spent scanning the site directory for markdown files and extracting frontmatter metadata. This includes parsing YAML frontmatter, building the page list, and collecting tags/categories. Large sites with many files will have longer discovery times.',
    navigationBuildMs:
      'Time spent constructing the navigation tree from discovered pages. This includes sorting pages, building parent-child relationships, and generating breadcrumbs. Complex nested structures may increase this time.',
    cacheManifestLoadMs:
      'Time spent reading the ISG cache manifest from disk. The manifest tracks which pages are cached and their dependencies. A large manifest or slow disk I/O can increase this time.',
    typescriptCompileMs:
      'Time spent compiling TypeScript bundles using esbuild. This includes bundling client-side scripts defined in the config. More bundles or larger codebases will increase compile time.',
    pageRenderingMs:
      'Total time spent in the page rendering pipeline, including rebuild checks, template rendering, file writing, and cache updates. This is typically the largest phase in a build.',
    shouldRebuildTotalMs:
      'Aggregate time spent checking if each page needs to be rebuilt. This includes computing content hashes and comparing dependencies. Fast hash comparisons keep this time low.',
    renderPageTotalMs:
      'Aggregate time spent actually rendering pages through the Eta template engine. Complex templates with many partials or heavy computations will increase this time.',
    fileWriteTotalMs:
      'Aggregate time spent writing rendered HTML files to the dist directory. Slow disk I/O or antivirus scanning can increase this time significantly.',
    cacheEntryTotalMs:
      'Aggregate time spent updating the ISG cache manifest with new page entries. This includes serializing page metadata and dependency information.',
    searchIndexGenerationMs:
      'Time spent generating the search index from rendered page content. This includes extracting text, building the index structure, and computing relevance scores.',
    searchIndexWriteMs:
      'Time spent writing the search index JSON file to disk. Large indices with many documents will take longer to serialize and write.',
    assetCopyMs:
      'Time spent copying static assets from the public directory to dist. Many files or large files will increase copy time. File watching may add overhead in dev mode.',
    cacheManifestSaveMs:
      'Time spent persisting the updated cache manifest to disk. This happens at the end of every build to preserve ISG state for subsequent builds.',
    sitemapGenerationMs:
      'Time spent generating the sitemap.xml file. This includes formatting URLs, setting priorities, and writing the XML structure.',
    rssGenerationMs:
      'Time spent generating RSS/Atom feed files. This includes sorting posts by date, formatting content, and writing XML.',
    tailwindInitMs:
      'Time spent initializing Tailwind CSS detection and setting up the class inventory system. This is a one-time cost at the start of each build.',
    tailwindInventoryMs:
      'Time spent writing the Tailwind class inventory file at the end of the build. This file tracks which classes were used for purging unused CSS.',
    getDirectorySizeMs:
      'Time spent calculating the total size of the dist directory after the build completes. This is used for the build summary statistics.',
    lockAcquireMs:
      'Time spent acquiring the build lock to prevent concurrent builds. Lock contention can increase this time if another build is in progress.',
    lockReleaseMs:
      'Time spent releasing the build lock after the build completes. This should be nearly instantaneous.',
    hookBeforeAllMs:
      'Time spent executing the beforeAll hook defined in your config. Long-running setup code will directly impact this time.',
    hookAfterAllMs:
      'Time spent executing the afterAll hook defined in your config. Post-build processing like compression or uploads will show here.',
    hookBeforeRenderTotalMs:
      'Aggregate time spent in beforeRender hooks across all pages. Per-page setup logic accumulates here.',
    hookAfterRenderTotalMs:
      'Aggregate time spent in afterRender hooks across all pages. Per-page post-processing accumulates here.',
  };
  return descriptions[key] || 'No description available for this phase.';
}

/**
 * Define the canonical execution order of phases
 */
const PHASE_EXECUTION_ORDER: string[] = [
  'lockAcquireMs',
  'configLoadMs',
  'tailwindInitMs',
  'cacheManifestLoadMs',
  'contentDiscoveryMs',
  'navigationBuildMs',
  'hookBeforeAllMs',
  'typescriptCompileMs',
  'shouldRebuildTotalMs',
  'hookBeforeRenderTotalMs',
  'renderPageTotalMs',
  'hookAfterRenderTotalMs',
  'fileWriteTotalMs',
  'cacheEntryTotalMs',
  'pageRenderingMs',
  'searchIndexGenerationMs',
  'searchIndexWriteMs',
  'tailwindInventoryMs',
  'cacheManifestSaveMs',
  'assetCopyMs',
  'sitemapGenerationMs',
  'rssGenerationMs',
  'hookAfterAllMs',
  'getDirectorySizeMs',
  'lockReleaseMs',
];

/**
 * Generate phase breakdown data sorted by duration
 */
function generatePhaseData(
  phases: Record<string, number | undefined>,
): Array<{ name: string; value: number; label: string; description: string }> {
  return Object.entries(phases)
    .filter(([, value]) => value !== undefined && value > 0)
    .map(([key, value]) => ({
      name: key,
      value: value as number,
      label: getPhaseLabel(key),
      description: getPhaseDescription(key),
    }))
    .sort((a, b) => b.value - a.value);
}

/**
 * Generate phase data in execution order for timeline view
 */
function generateTimelineData(
  phases: Record<string, number | undefined>,
): Array<{ name: string; value: number; label: string; description: string; order: number }> {
  const activePhases = Object.entries(phases)
    .filter(([, value]) => value !== undefined && value > 0)
    .map(([key, value]) => ({
      name: key,
      value: value as number,
      label: getPhaseLabel(key),
      description: getPhaseDescription(key),
      order: PHASE_EXECUTION_ORDER.indexOf(key),
    }));

  // Sort by execution order, unknown phases go to the end
  return activePhases.sort((a, b) => {
    const orderA = a.order === -1 ? 999 : a.order;
    const orderB = b.order === -1 ? 999 : b.order;
    return orderA - orderB;
  });
}

/**
 * Generate the HTML report content
 */
export function generateMetricsHtml(metrics: BuildMetrics): string {
  const { meta, totals, phases, counts, isg, pageTimings, incremental } = metrics;
  const phaseData = generatePhaseData(phases as Record<string, number | undefined>);
  const timelineData = generateTimelineData(phases as Record<string, number | undefined>);
  const totalPhaseTime = phaseData.reduce((sum, p) => sum + p.value, 0);
  const hasDetailedTimings = pageTimings && pageTimings.length > 0;
  const hasIncremental = !!incremental;

  // Calculate phase percentages for the chart
  const phaseChartData = phaseData.map((p) => ({
    ...p,
    percent: (p.value / totals.durationMs) * 100,
  }));

  // Calculate timeline data with cumulative offsets for visualization
  let cumulativeTime = 0;
  const timelineChartData = timelineData.map((p) => {
    const item = {
      ...p,
      percent: (p.value / totals.durationMs) * 100,
      startOffset: (cumulativeTime / totals.durationMs) * 100,
    };
    cumulativeTime += p.value;
    return item;
  });

  // Sort page timings by duration for detailed view
  const sortedPageTimings = hasDetailedTimings
    ? [...pageTimings].sort((a, b) => b.durationMs - a.durationMs)
    : [];

  // Generate JSON for embedding
  const jsonData = JSON.stringify(metrics, null, 2);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Stati Build Metrics Report - ${meta.timestamp}</title>
  <style>
    :root {
      --bg-primary: #0d1117;
      --bg-secondary: #161b22;
      --bg-tertiary: #21262d;
      --border-color: #30363d;
      --text-primary: #e6edf3;
      --text-secondary: #8b949e;
      --text-muted: #6e7681;
      --accent-blue: #58a6ff;
      --accent-green: #3fb950;
      --accent-yellow: #d29922;
      --accent-red: #f85149;
      --accent-purple: #a371f7;
      --accent-cyan: #39c5cf;
      --accent-orange: #db6d28;
      --shadow: 0 3px 6px rgba(0,0,0,0.4);
      --radius: 8px;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      background: var(--bg-primary);
      color: var(--text-primary);
      line-height: 1.5;
      min-height: 100vh;
    }

    .container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 24px;
    }

    /* Header */
    header {
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: var(--radius);
      padding: 24px;
      margin-bottom: 24px;
      box-shadow: var(--shadow);
    }

    header h1 {
      font-size: 24px;
      font-weight: 600;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    header h1 svg {
      width: 32px;
      height: 32px;
      color: var(--accent-blue);
    }

    .meta-info {
      display: flex;
      flex-wrap: wrap;
      gap: 16px 32px;
      margin-top: 16px;
      font-size: 13px;
      color: var(--text-secondary);
    }

    .meta-info span {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .meta-info svg {
      width: 14px;
      height: 14px;
      opacity: 0.7;
    }

    /* Summary Cards */
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .summary-card {
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: var(--radius);
      padding: 20px;
      box-shadow: var(--shadow);
    }

    .summary-card .label {
      font-size: 12px;
      font-weight: 500;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }

    .summary-card .value {
      font-size: 28px;
      font-weight: 600;
      color: var(--text-primary);
    }

    .summary-card .subtext {
      font-size: 12px;
      color: var(--text-muted);
      margin-top: 4px;
    }

    .summary-card.highlight {
      border-color: var(--accent-blue);
      background: linear-gradient(135deg, var(--bg-secondary) 0%, rgba(88, 166, 255, 0.1) 100%);
    }

    .summary-card.success .value {
      color: var(--accent-green);
    }

    .summary-card.warning .value {
      color: var(--accent-yellow);
    }

    /* Section */
    .section {
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: var(--radius);
      margin-bottom: 24px;
      box-shadow: var(--shadow);
      overflow: hidden;
    }

    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      border-bottom: 1px solid var(--border-color);
      background: var(--bg-tertiary);
    }

    .section-header h2 {
      font-size: 16px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .section-header svg {
      width: 18px;
      height: 18px;
      color: var(--accent-blue);
    }

    .section-content {
      padding: 20px;
    }

    /* Phase Breakdown */
    .phase-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .phase-item {
      display: grid;
      grid-template-columns: 200px 1fr 100px 80px 32px;
      align-items: center;
      gap: 16px;
      padding: 12px 16px;
      border-radius: 8px;
      background: var(--bg-tertiary);
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .phase-item:hover {
      background: var(--bg-secondary);
      box-shadow: 0 0 0 1px var(--border-color);
    }

    .phase-item.expanded {
      background: var(--bg-secondary);
      box-shadow: 0 0 0 1px var(--accent-blue);
    }

    .phase-name {
      font-size: 14px;
      font-weight: 500;
      color: var(--text-primary);
    }

    .phase-bar-container {
      height: 24px;
      background: rgba(0,0,0,0.3);
      border-radius: 4px;
      overflow: hidden;
      position: relative;
    }

    .phase-bar {
      height: 100%;
      background: linear-gradient(90deg, var(--accent-blue), var(--accent-cyan));
      border-radius: 4px;
      transition: width 0.3s ease;
      min-width: 2px;
    }

    .phase-duration {
      font-size: 14px;
      font-weight: 600;
      color: var(--text-primary);
      text-align: right;
      font-variant-numeric: tabular-nums;
    }

    .phase-percent {
      font-size: 13px;
      color: var(--text-secondary);
      text-align: right;
      font-variant-numeric: tabular-nums;
    }

    .phase-expand-icon {
      width: 20px;
      height: 20px;
      color: var(--text-muted);
      transition: transform 0.2s ease;
    }

    .phase-item.expanded .phase-expand-icon {
      transform: rotate(180deg);
      color: var(--accent-blue);
    }

    .phase-description {
      grid-column: 1 / -1;
      padding: 16px;
      margin-top: 8px;
      background: var(--bg-primary);
      border-radius: 6px;
      font-size: 13px;
      line-height: 1.6;
      color: var(--text-secondary);
      display: none;
    }

    .phase-item.expanded .phase-description {
      display: block;
    }

    .phase-description code {
      background: var(--bg-tertiary);
      padding: 2px 6px;
      border-radius: 4px;
      font-family: 'SF Mono', Monaco, Consolas, monospace;
      font-size: 12px;
      color: var(--accent-cyan);
    }

    /* Timeline View */
    .timeline-container {
      position: relative;
      padding: 20px 0;
    }

    .timeline-track {
      height: 40px;
      background: var(--bg-tertiary);
      border-radius: 8px;
      position: relative;
      overflow: hidden;
      margin-bottom: 16px;
    }

    .timeline-segment {
      position: absolute;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      font-weight: 500;
      color: white;
      text-shadow: 0 1px 2px rgba(0,0,0,0.5);
      overflow: hidden;
      cursor: pointer;
      transition: filter 0.2s ease;
      min-width: 2px;
    }

    .timeline-segment:hover {
      filter: brightness(1.2);
      z-index: 10;
    }

    .timeline-segment span {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      padding: 0 4px;
    }

    .timeline-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .timeline-item {
      display: grid;
      grid-template-columns: 32px 180px 1fr 100px;
      align-items: center;
      gap: 12px;
      padding: 10px 12px;
      border-radius: 6px;
      background: var(--bg-tertiary);
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .timeline-item:hover {
      background: var(--bg-secondary);
    }

    .timeline-item.expanded {
      background: var(--bg-secondary);
      box-shadow: 0 0 0 1px var(--accent-blue);
    }

    .timeline-order {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: var(--bg-primary);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 600;
      color: var(--text-secondary);
    }

    .timeline-item:nth-child(1) .timeline-order { background: var(--accent-blue); color: white; }
    .timeline-item:nth-child(2) .timeline-order { background: var(--accent-cyan); color: white; }
    .timeline-item:nth-child(3) .timeline-order { background: var(--accent-green); color: white; }

    .timeline-name {
      font-size: 13px;
      font-weight: 500;
      color: var(--text-primary);
    }

    .timeline-bar-container {
      height: 20px;
      background: rgba(0,0,0,0.3);
      border-radius: 4px;
      overflow: hidden;
      position: relative;
    }

    .timeline-bar {
      height: 100%;
      border-radius: 4px;
      min-width: 2px;
    }

    .timeline-time {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-primary);
      text-align: right;
      font-variant-numeric: tabular-nums;
    }

    .timeline-description {
      grid-column: 1 / -1;
      padding: 12px;
      margin-top: 8px;
      background: var(--bg-primary);
      border-radius: 6px;
      font-size: 12px;
      line-height: 1.6;
      color: var(--text-secondary);
      display: none;
    }

    .timeline-item.expanded .timeline-description {
      display: block;
    }

    /* Phase colors for timeline */
    .phase-color-0 { background: linear-gradient(90deg, #58a6ff, #388bfd); }
    .phase-color-1 { background: linear-gradient(90deg, #39c5cf, #2ea9b3); }
    .phase-color-2 { background: linear-gradient(90deg, #3fb950, #2ea043); }
    .phase-color-3 { background: linear-gradient(90deg, #a371f7, #8957e5); }
    .phase-color-4 { background: linear-gradient(90deg, #d29922, #bb8009); }
    .phase-color-5 { background: linear-gradient(90deg, #f85149, #da3633); }
    .phase-color-6 { background: linear-gradient(90deg, #db6d28, #bd561d); }
    .phase-color-7 { background: linear-gradient(90deg, #8b949e, #6e7681); }

    /* Waterfall Chart */
    .waterfall-container {
      overflow-x: auto;
      margin-top: 16px;
    }

    .waterfall {
      min-width: 600px;
      position: relative;
    }

    .waterfall-row {
      display: flex;
      align-items: center;
      height: 32px;
      gap: 12px;
      border-bottom: 1px solid var(--border-color);
    }

    .waterfall-row:last-child {
      border-bottom: none;
    }

    .waterfall-label {
      width: 160px;
      flex-shrink: 0;
      font-size: 12px;
      color: var(--text-secondary);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .waterfall-track {
      flex: 1;
      height: 16px;
      background: var(--bg-tertiary);
      border-radius: 2px;
      position: relative;
    }

    .waterfall-bar {
      position: absolute;
      height: 100%;
      border-radius: 2px;
      min-width: 3px;
    }

    .waterfall-bar.cached {
      background: var(--accent-green);
      opacity: 0.6;
    }

    .waterfall-bar.rendered {
      background: var(--accent-blue);
    }

    .waterfall-time {
      width: 80px;
      flex-shrink: 0;
      font-size: 12px;
      color: var(--text-secondary);
      text-align: right;
      font-variant-numeric: tabular-nums;
    }

    /* Stats Grid */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 16px;
    }

    .stat-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .stat-label {
      font-size: 12px;
      color: var(--text-secondary);
    }

    .stat-value {
      font-size: 18px;
      font-weight: 600;
      color: var(--text-primary);
      font-variant-numeric: tabular-nums;
    }

    /* ISG Section */
    .isg-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
    }

    .isg-stat {
      text-align: center;
      padding: 20px;
      background: var(--bg-tertiary);
      border-radius: var(--radius);
    }

    .isg-stat .value {
      font-size: 32px;
      font-weight: 700;
    }

    .isg-stat .label {
      font-size: 13px;
      color: var(--text-secondary);
      margin-top: 4px;
    }

    .isg-stat.hit .value {
      color: var(--accent-green);
    }

    .isg-stat.miss .value {
      color: var(--accent-yellow);
    }

    /* Cache Hit Rate Ring */
    .cache-ring-container {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 20px;
    }

    .cache-ring {
      position: relative;
      width: 150px;
      height: 150px;
    }

    .cache-ring svg {
      transform: rotate(-90deg);
    }

    .cache-ring-bg {
      fill: none;
      stroke: var(--bg-tertiary);
      stroke-width: 12;
    }

    .cache-ring-progress {
      fill: none;
      stroke: var(--accent-green);
      stroke-width: 12;
      stroke-linecap: round;
      transition: stroke-dashoffset 0.5s ease;
    }

    .cache-ring-text {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      text-align: center;
    }

    .cache-ring-value {
      font-size: 28px;
      font-weight: 700;
      color: var(--accent-green);
    }

    .cache-ring-label {
      font-size: 11px;
      color: var(--text-secondary);
    }

    /* Page Timings Table */
    .page-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }

    .page-table th {
      text-align: left;
      padding: 12px 16px;
      background: var(--bg-tertiary);
      color: var(--text-secondary);
      font-weight: 500;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1px solid var(--border-color);
    }

    .page-table td {
      padding: 12px 16px;
      border-bottom: 1px solid var(--border-color);
      vertical-align: middle;
    }

    .page-table tr:hover {
      background: var(--bg-tertiary);
    }

    .page-table .url {
      font-family: 'SF Mono', Monaco, Consolas, monospace;
      font-size: 12px;
      color: var(--accent-blue);
      max-width: 400px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .page-table .duration {
      font-variant-numeric: tabular-nums;
      font-weight: 500;
    }

    .page-table .status {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 500;
    }

    .page-table .status.cached {
      background: rgba(63, 185, 80, 0.15);
      color: var(--accent-green);
    }

    .page-table .status.rendered {
      background: rgba(88, 166, 255, 0.15);
      color: var(--accent-blue);
    }

    /* Tabs */
    .tabs {
      display: flex;
      gap: 4px;
      padding: 8px;
      background: var(--bg-tertiary);
      border-radius: var(--radius);
      margin-bottom: 16px;
    }

    .tab {
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 500;
      color: var(--text-secondary);
      background: transparent;
      border: none;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .tab:hover {
      color: var(--text-primary);
      background: var(--bg-secondary);
    }

    .tab.active {
      color: var(--text-primary);
      background: var(--bg-secondary);
      box-shadow: var(--shadow);
    }

    .tab-content {
      display: none;
    }

    .tab-content.active {
      display: block;
    }

    .phase-view {
      display: none;
    }

    .phase-view.active {
      display: block;
    }

    /* JSON View */
    .json-view {
      background: var(--bg-tertiary);
      border-radius: var(--radius);
      padding: 16px;
      overflow-x: auto;
    }

    .json-view pre {
      font-family: 'SF Mono', Monaco, Consolas, monospace;
      font-size: 12px;
      line-height: 1.6;
      color: var(--text-primary);
      margin: 0;
    }

    /* Incremental Section */
    .incremental-info {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
    }

    .trigger-file {
      font-family: 'SF Mono', Monaco, Consolas, monospace;
      font-size: 12px;
      color: var(--accent-yellow);
      background: rgba(210, 153, 34, 0.1);
      padding: 8px 12px;
      border-radius: 4px;
      word-break: break-all;
    }

    /* Badges */
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 500;
    }

    .badge.ci {
      background: rgba(163, 113, 247, 0.15);
      color: var(--accent-purple);
    }

    .badge.local {
      background: rgba(88, 166, 255, 0.15);
      color: var(--accent-blue);
    }

    .badge.detailed {
      background: rgba(57, 197, 207, 0.15);
      color: var(--accent-cyan);
    }

    /* Flags */
    .flags {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .flag {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 10px;
      background: var(--bg-tertiary);
      border-radius: 4px;
      font-size: 12px;
      color: var(--text-secondary);
    }

    .flag.enabled {
      color: var(--accent-green);
    }

    .flag.disabled {
      color: var(--text-muted);
    }

    /* Tooltip */
    [data-tooltip] {
      position: relative;
      cursor: help;
    }

    [data-tooltip]:hover::after {
      content: attr(data-tooltip);
      position: absolute;
      bottom: 100%;
      left: 50%;
      transform: translateX(-50%);
      padding: 6px 10px;
      background: var(--bg-tertiary);
      color: var(--text-primary);
      font-size: 12px;
      border-radius: 4px;
      white-space: nowrap;
      z-index: 100;
      box-shadow: var(--shadow);
      border: 1px solid var(--border-color);
    }

    /* Responsive */
    @media (max-width: 768px) {
      .container {
        padding: 16px;
      }

      .phase-item {
        grid-template-columns: 1fr;
        gap: 8px;
      }

      .phase-duration,
      .phase-percent {
        text-align: left;
      }

      .meta-info {
        flex-direction: column;
        gap: 8px;
      }
    }

    /* Print styles */
    @media print {
      body {
        background: white;
        color: black;
      }

      .section {
        break-inside: avoid;
      }

      .tab {
        display: none !important;
      }

      .tab-content {
        display: block !important;
      }
    }

    /* Animations */
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .section {
      animation: fadeIn 0.3s ease-out;
    }

    .summary-card {
      animation: fadeIn 0.3s ease-out;
    }

    .summary-card:nth-child(2) { animation-delay: 0.05s; }
    .summary-card:nth-child(3) { animation-delay: 0.1s; }
    .summary-card:nth-child(4) { animation-delay: 0.15s; }
    .summary-card:nth-child(5) { animation-delay: 0.2s; }
    .summary-card:nth-child(6) { animation-delay: 0.25s; }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <header>
      <h1>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 20V10M18 20V4M6 20v-4"/>
        </svg>
        Stati Build Metrics Report
        ${hasDetailedTimings ? '<span class="badge detailed">Detailed</span>' : ''}
        ${meta.ci ? '<span class="badge ci">CI</span>' : '<span class="badge local">Local</span>'}
      </h1>
      <div class="meta-info">
        <span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
          </svg>
          ${new Date(meta.timestamp).toLocaleString()}
        </span>
        <span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
          </svg>
          Command: ${meta.command}
        </span>
        <span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
          </svg>
          ${meta.platform} / ${meta.arch}
        </span>
        <span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
          Node ${meta.nodeVersion}
        </span>
        <span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 7h-9M14 17H5M17 17a3 3 0 100-6 3 3 0 000 6zM7 7a3 3 0 100-6 3 3 0 000 6z"/>
          </svg>
          CLI v${meta.cliVersion} / Core v${meta.coreVersion}
        </span>
        ${
          meta.gitBranch
            ? `
        <span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/>
            <path d="M18 9a9 9 0 01-9 9"/>
          </svg>
          ${meta.gitBranch}${meta.gitCommit ? ` (${meta.gitCommit.substring(0, 7)})` : ''}
        </span>`
            : ''
        }
      </div>
      ${
        Object.keys(meta.flags).length > 0
          ? `
      <div class="flags" style="margin-top: 12px;">
        ${meta.flags.force !== undefined ? `<span class="flag ${meta.flags.force ? 'enabled' : 'disabled'}">--force: ${meta.flags.force}</span>` : ''}
        ${meta.flags.clean !== undefined ? `<span class="flag ${meta.flags.clean ? 'enabled' : 'disabled'}">--clean: ${meta.flags.clean}</span>` : ''}
        ${meta.flags.includeDrafts !== undefined ? `<span class="flag ${meta.flags.includeDrafts ? 'enabled' : 'disabled'}">--include-drafts: ${meta.flags.includeDrafts}</span>` : ''}
      </div>`
          : ''
      }
    </header>

    <!-- Summary Cards -->
    <div class="summary-grid">
      <div class="summary-card highlight">
        <div class="label">Total Duration</div>
        <div class="value">${formatDuration(totals.durationMs)}</div>
        <div class="subtext">${(totals.durationMs / 1000).toFixed(3)} seconds</div>
      </div>
      <div class="summary-card ${counts.cachedPages > 0 ? 'success' : ''}">
        <div class="label">Pages</div>
        <div class="value">${counts.totalPages}</div>
        <div class="subtext">${counts.renderedPages} rendered, ${counts.cachedPages} cached</div>
      </div>
      <div class="summary-card">
        <div class="label">Cache Hit Rate</div>
        <div class="value" style="color: ${isg.cacheHitRate > 0.5 ? 'var(--accent-green)' : isg.cacheHitRate > 0 ? 'var(--accent-yellow)' : 'var(--text-secondary)'}">${formatPercent(isg.cacheHitRate)}</div>
        <div class="subtext">${isg.manifestEntries} manifest entries</div>
      </div>
      <div class="summary-card">
        <div class="label">Peak Memory</div>
        <div class="value">${formatBytes(totals.peakRssBytes)}</div>
        <div class="subtext">Heap: ${formatBytes(totals.heapUsedBytes)}</div>
      </div>
      <div class="summary-card">
        <div class="label">Templates Loaded</div>
        <div class="value">${counts.templatesLoaded}</div>
        <div class="subtext">${(counts.templatesLoaded / counts.totalPages).toFixed(1)} avg per page</div>
      </div>
      <div class="summary-card">
        <div class="label">Assets Copied</div>
        <div class="value">${counts.assetsCopied}</div>
        <div class="subtext">${counts.markdownFilesProcessed} markdown files</div>
      </div>
    </div>

    <!-- Phase Breakdown -->
    <div class="section">
      <div class="section-header">
        <h2>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
          </svg>
          Phase Breakdown
        </h2>
        <span style="font-size: 13px; color: var(--text-secondary);">
          ${phaseData.length} phases tracked • ${formatDuration(totalPhaseTime)} total
        </span>
      </div>
      <div class="section-content">
        <!-- View Tabs -->
        <div class="tabs" style="margin-bottom: 20px;">
          <button class="tab active" onclick="switchPhaseView('duration')">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px;">
              <path d="M3 3v18h18"/><path d="M18 9l-5 5-4-4-3 3"/>
            </svg>
            By Duration
          </button>
          <button class="tab" onclick="switchPhaseView('timeline')">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px;">
              <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
            </svg>
            Timeline
          </button>
        </div>

        <!-- Duration View (sorted by duration) -->
        <div id="duration-view" class="phase-view active">
          <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 16px;">
            Click on any phase to see a detailed description of what happens during that phase.
          </p>
          <div class="phase-list">
            ${phaseChartData
              .map(
                (phase) => `
            <div class="phase-item" onclick="togglePhase(this)">
              <div class="phase-name" title="${phase.name}">${phase.label}</div>
              <div class="phase-bar-container">
                <div class="phase-bar" style="width: ${Math.max(phase.percent, 0.5)}%"></div>
              </div>
              <div class="phase-duration">${formatDuration(phase.value)}</div>
              <div class="phase-percent">${phase.percent.toFixed(1)}%</div>
              <svg class="phase-expand-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6,9 12,15 18,9"/>
              </svg>
              <div class="phase-description">${phase.description}</div>
            </div>`,
              )
              .join('')}
          </div>
        </div>

        <!-- Timeline View (in execution order) -->
        <div id="timeline-view" class="phase-view" style="display: none;">
          <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 16px;">
            Phases shown in their approximate execution order during the build process.
          </p>

          <!-- Visual Timeline Track -->
          <div class="timeline-track">
            ${timelineChartData
              .map(
                (phase, i) => `
            <div class="timeline-segment phase-color-${i % 8}"
                 style="left: ${phase.startOffset}%; width: ${Math.max(phase.percent, 0.5)}%;"
                 title="${phase.label}: ${formatDuration(phase.value)} (${phase.percent.toFixed(1)}%)"
                 onclick="expandTimelineItem(${i})">
              <span>${phase.percent > 8 ? phase.label : ''}</span>
            </div>`,
              )
              .join('')}
          </div>

          <!-- Timeline List -->
          <div class="timeline-list">
            ${timelineChartData
              .map(
                (phase, i) => `
            <div class="timeline-item" id="timeline-item-${i}" onclick="toggleTimeline(this)">
              <div class="timeline-order">${i + 1}</div>
              <div class="timeline-name">${phase.label}</div>
              <div class="timeline-bar-container">
                <div class="timeline-bar phase-color-${i % 8}" style="width: ${Math.max(phase.percent, 0.5)}%"></div>
              </div>
              <div class="timeline-time">${formatDuration(phase.value)}</div>
              <div class="timeline-description">${phase.description}</div>
            </div>`,
              )
              .join('')}
          </div>
        </div>
      </div>
    </div>

    <!-- ISG Cache Details -->
    <div class="section">
      <div class="section-header">
        <h2>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
          </svg>
          ISG Cache Performance
        </h2>
        <span style="font-size: 13px; color: ${isg.enabled ? 'var(--accent-green)' : 'var(--text-muted)'};">
          ${isg.enabled ? '● Enabled' : '○ Disabled'}
        </span>
      </div>
      <div class="section-content">
        <div style="display: flex; gap: 40px; align-items: center; flex-wrap: wrap;">
          <div class="cache-ring-container">
            <div class="cache-ring">
              <svg width="150" height="150" viewBox="0 0 150 150">
                <circle class="cache-ring-bg" cx="75" cy="75" r="60"/>
                <circle class="cache-ring-progress" cx="75" cy="75" r="60"
                  stroke-dasharray="${2 * Math.PI * 60}"
                  stroke-dashoffset="${2 * Math.PI * 60 * (1 - isg.cacheHitRate)}"/>
              </svg>
              <div class="cache-ring-text">
                <div class="cache-ring-value">${formatPercent(isg.cacheHitRate)}</div>
                <div class="cache-ring-label">Cache Hit Rate</div>
              </div>
            </div>
          </div>
          <div class="isg-grid" style="flex: 1;">
            <div class="isg-stat hit">
              <div class="value">${counts.cachedPages}</div>
              <div class="label">Pages from Cache</div>
            </div>
            <div class="isg-stat miss">
              <div class="value">${counts.renderedPages}</div>
              <div class="label">Pages Rendered</div>
            </div>
            <div class="isg-stat">
              <div class="value" style="color: var(--accent-purple)">${isg.manifestEntries}</div>
              <div class="label">Manifest Entries</div>
            </div>
            <div class="isg-stat">
              <div class="value" style="color: var(--accent-orange)">${isg.invalidatedEntries}</div>
              <div class="label">Invalidated</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    ${
      hasIncremental
        ? `
    <!-- Incremental Rebuild -->
    <div class="section">
      <div class="section-header">
        <h2>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M23 4v6h-6M1 20v-6h6"/>
            <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
          </svg>
          Incremental Rebuild
        </h2>
      </div>
      <div class="section-content">
        <div class="incremental-info">
          <div class="stat-item">
            <div class="stat-label">Trigger File</div>
            <div class="trigger-file">${incremental!.triggerFile}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">Trigger Type</div>
            <div class="stat-value">${incremental!.triggerType}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">Rebuild Duration</div>
            <div class="stat-value">${formatDuration(incremental!.durationMs)}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">Pages Affected</div>
            <div class="stat-value">${incremental!.renderedPages} rendered / ${incremental!.cachedPages} cached</div>
          </div>
        </div>
      </div>
    </div>`
        : ''
    }

    ${
      hasDetailedTimings
        ? `
    <!-- Detailed Page Timings -->
    <div class="section">
      <div class="section-header">
        <h2>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
            <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>
          </svg>
          Page Timings
        </h2>
        <span style="font-size: 13px; color: var(--text-secondary);">
          ${sortedPageTimings.length} pages • Sorted by duration
        </span>
      </div>
      <div class="section-content">
        <div class="tabs">
          <button class="tab active" onclick="switchTab('table')">Table View</button>
          <button class="tab" onclick="switchTab('waterfall')">Waterfall View</button>
        </div>

        <div id="tab-table" class="tab-content active">
          <div style="overflow-x: auto;">
            <table class="page-table">
              <thead>
                <tr>
                  <th>URL</th>
                  <th>Duration</th>
                  <th>Status</th>
                  <th>Templates</th>
                </tr>
              </thead>
              <tbody>
                ${sortedPageTimings
                  .map(
                    (page: PageTiming) => `
                <tr>
                  <td class="url" title="${page.url}">${page.url}</td>
                  <td class="duration">${formatDuration(page.durationMs)}</td>
                  <td><span class="status ${page.cached ? 'cached' : 'rendered'}">${page.cached ? '● Cached' : '◐ Rendered'}</span></td>
                  <td>${page.templatesLoaded !== undefined ? page.templatesLoaded : '-'}</td>
                </tr>`,
                  )
                  .join('')}
              </tbody>
            </table>
          </div>
        </div>

        <div id="tab-waterfall" class="tab-content">
          <div class="waterfall-container">
            <div class="waterfall">
              ${(() => {
                const maxDuration = Math.max(
                  ...sortedPageTimings.map((p: PageTiming) => p.durationMs),
                );
                return sortedPageTimings
                  .slice(0, 50)
                  .map((page: PageTiming) => {
                    const widthPercent = (page.durationMs / maxDuration) * 100;
                    return `
                  <div class="waterfall-row">
                    <div class="waterfall-label" title="${page.url}">${page.url.split('/').pop() || page.url}</div>
                    <div class="waterfall-track">
                      <div class="waterfall-bar ${page.cached ? 'cached' : 'rendered'}" style="width: ${Math.max(widthPercent, 1)}%"></div>
                    </div>
                    <div class="waterfall-time">${formatDuration(page.durationMs)}</div>
                  </div>`;
                  })
                  .join('');
              })()}
              ${
                sortedPageTimings.length > 50
                  ? `
              <div style="text-align: center; padding: 12px; color: var(--text-muted); font-size: 12px;">
                Showing 50 of ${sortedPageTimings.length} pages
              </div>`
                  : ''
              }
            </div>
          </div>
        </div>
      </div>
    </div>`
        : ''
    }

    <!-- Raw JSON -->
    <div class="section">
      <div class="section-header">
        <h2>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M16 18l6-6-6-6M8 6l-6 6 6 6"/>
          </svg>
          Raw JSON Data
        </h2>
        <button onclick="copyJson()" style="background: var(--bg-secondary); border: 1px solid var(--border-color); color: var(--text-secondary); padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px;">
          Copy to Clipboard
        </button>
      </div>
      <div class="section-content">
        <div class="json-view">
          <pre id="json-content">${jsonData.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <footer style="text-align: center; padding: 24px; color: var(--text-muted); font-size: 12px;">
      Generated by Stati Build Metrics • ${new Date().toISOString()}
    </footer>
  </div>

  <script>
    function switchTab(tabName) {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      document.querySelector(\`[onclick="switchTab('\${tabName}')"]\`).classList.add('active');
      document.getElementById(\`tab-\${tabName}\`).classList.add('active');
    }

    function switchPhaseView(viewName) {
      // Update tabs
      document.querySelectorAll('.tabs .tab').forEach(t => t.classList.remove('active'));
      document.querySelector(\`[onclick="switchPhaseView('\${viewName}')"]\`).classList.add('active');

      // Update views
      document.querySelectorAll('.phase-view').forEach(v => {
        v.style.display = 'none';
        v.classList.remove('active');
      });
      const activeView = document.getElementById(\`\${viewName}-view\`);
      if (activeView) {
        activeView.style.display = 'block';
        activeView.classList.add('active');
      }
    }

    function togglePhase(element) {
      element.classList.toggle('expanded');
    }

    function toggleTimeline(element) {
      element.classList.toggle('expanded');
    }

    function expandTimelineItem(index) {
      const item = document.getElementById(\`timeline-item-\${index}\`);
      if (item) {
        // Collapse others first
        document.querySelectorAll('.timeline-item.expanded').forEach(el => {
          if (el !== item) el.classList.remove('expanded');
        });
        item.classList.add('expanded');
        item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }

    function copyJson() {
      const json = document.getElementById('json-content').textContent;
      navigator.clipboard.writeText(json).then(() => {
        const btn = event.target;
        const originalText = btn.textContent;
        btn.textContent = 'Copied!';
        btn.style.color = 'var(--accent-green)';
        setTimeout(() => {
          btn.textContent = originalText;
          btn.style.color = '';
        }, 2000);
      });
    }
  </script>
</body>
</html>`;
}

/**
 * Write the HTML metrics report to a file.
 *
 * @param metrics - The build metrics data
 * @param outputPath - Path to write the HTML file
 * @returns Promise resolving to success boolean and path
 */
export async function writeMetricsHtml(
  metrics: BuildMetrics,
  outputPath: string,
): Promise<{ success: boolean; path?: string; error?: string }> {
  try {
    const html = generateMetricsHtml(metrics);
    await writeFile(outputPath, html, 'utf-8');
    return { success: true, path: outputPath };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, error: `Failed to write HTML report: ${errorMessage}` };
  }
}
