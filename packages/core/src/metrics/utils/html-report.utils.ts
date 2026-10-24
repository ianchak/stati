/**
 * HTML Metrics Report Generator
 *
 * Generates a self-contained HTML file for visualizing build performance metrics.
 * Handles both standard and detailed (with pageTimings) metrics files. The page shares its
 * look with the Stati documentation site and the development error overlay.
 */

import { writeFile } from 'node:fs/promises';
import {
  STATI_FAVICON_HREF,
  STATI_MARK_PATH,
  STATI_PRINT_STYLES,
  STATI_THEME_STYLES,
} from '../../core/utils/theme.utils.js';
import type { BuildMetrics, PageTiming } from '../types.js';

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  if (i === 0) return `${bytes} B`;
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
 * Format a count with thousands separators
 */
function formatCount(value: number): string {
  return value.toLocaleString('en-US');
}

/**
 * Escapes text for HTML content and attribute values.
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Get human-readable phase name
 */
function getPhaseLabel(key: string): string {
  const labels: Record<string, string> = {
    configLoadMs: 'Config loading',
    contentDiscoveryMs: 'Content discovery',
    navigationBuildMs: 'Navigation build',
    cacheManifestLoadMs: 'Cache manifest load',
    typescriptCompileMs: 'TypeScript compile',
    templateIndexMs: 'Template index',
    pageRenderingMs: 'Page rendering',
    shouldRebuildTotalMs: 'Rebuild checks',
    markdownRenderTotalMs: 'Markdown',
    renderPageTotalMs: 'Render pages',
    postRenderTotalMs: 'After rendering',
    fileWriteTotalMs: 'File writing',
    cacheEntryTotalMs: 'Cache entry updates',
    searchIndexGenerationMs: 'Search index generation',
    searchIndexWriteMs: 'Search index write',
    assetCopyMs: 'Asset copying',
    cacheManifestSaveMs: 'Cache manifest save',
    sitemapGenerationMs: 'Sitemap generation',
    rssGenerationMs: 'RSS generation',
    tailwindInitMs: 'Tailwind init',
    tailwindInventoryMs: 'Tailwind inventory',
    tailwindBuildMs: 'Tailwind build',
    getDirectorySizeMs: 'Directory size',
    lockAcquireMs: 'Lock acquire',
    lockReleaseMs: 'Lock release',
    hookBeforeAllMs: 'beforeAll hook',
    hookAfterAllMs: 'afterAll hook',
    hookBeforeRenderTotalMs: 'beforeRender hooks',
    hookAfterRenderTotalMs: 'afterRender hooks',
    imageSettleMs: 'Image generation',
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
    templateIndexMs:
      'Time spent listing every .eta file in the source directory, once per build. Template names resolve against this list, so neither rendering nor the cache checks search folders page by page. A dev server keeps the list between rebuilds.',
    pageRenderingMs:
      'Total time spent in the page pipeline: the beforeAll hook, the search index, and for every page the rebuild check, rendering, hooks, file writing and cache update. The steps listed under it are its parts; the per-page ones are summed over all pages. This is typically the largest phase in a build.',
    shouldRebuildTotalMs:
      'Aggregate time spent checking if each page needs to be rebuilt. This includes computing content hashes, hashing the templates each page rendered, and checking the template names it looked up against the template index.',
    markdownRenderTotalMs:
      "Aggregate time spent rendering each rendered page's Markdown to HTML with markdown-it, including its plugins, heading anchors, the table of contents and image sizing. Long pages and heavy plugins increase this time.",
    renderPageTotalMs:
      'Aggregate time spent actually rendering pages through the Eta template engine: each layout, the parents it names and the templates it includes. Templates a page does not use are never rendered. Complex templates with many includes or heavy computations will increase this time.',
    postRenderTotalMs:
      'Aggregate time spent on each rendered page between its templates and the file write: injecting SEO, search and bundle tags, registering the images the HTML uses, and hashing the data the page read for the cache.',
    fileWriteTotalMs:
      'Aggregate time spent writing rendered HTML files to the dist directory. Slow disk I/O or antivirus scanning can increase this time significantly.',
    cacheEntryTotalMs:
      'Aggregate time spent updating the ISG cache manifest with new page entries. This includes serializing page metadata and dependency information.',
    searchIndexGenerationMs:
      'Time spent generating the search index from page content before the pages render. This includes extracting text and headings and building the index structure.',
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
    tailwindBuildMs:
      'Time spent running Tailwind CSS for the production stylesheet (--tailwind-input and --tailwind-output), writing its hashed file, and updating the pages that linked an earlier name.',
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
    imageSettleMs:
      'Time spent waiting for the responsive image variants and Open Graph cards the written pages use, and saving the images manifest. Reused files make this fast.',
  };
  return descriptions[key] || 'No description available for this phase.';
}

/**
 * Phases in the order a build runs them. The phases measured inside page rendering follow it.
 */
const PHASE_EXECUTION_ORDER: readonly string[] = [
  'lockAcquireMs',
  'configLoadMs',
  'tailwindInitMs',
  'cacheManifestLoadMs',
  'contentDiscoveryMs',
  'navigationBuildMs',
  'typescriptCompileMs',
  'templateIndexMs',
  'pageRenderingMs',
  'hookBeforeAllMs',
  'searchIndexGenerationMs',
  'searchIndexWriteMs',
  'shouldRebuildTotalMs',
  'hookBeforeRenderTotalMs',
  'markdownRenderTotalMs',
  'renderPageTotalMs',
  'postRenderTotalMs',
  'fileWriteTotalMs',
  'cacheEntryTotalMs',
  'hookAfterRenderTotalMs',
  'imageSettleMs',
  'tailwindInventoryMs',
  'tailwindBuildMs',
  'cacheManifestSaveMs',
  'assetCopyMs',
  'sitemapGenerationMs',
  'rssGenerationMs',
  'hookAfterAllMs',
  'getDirectorySizeMs',
  'lockReleaseMs',
];

/**
 * Phases measured inside page rendering, so its time includes theirs. The per-page ones are
 * sums over all pages.
 */
const PAGE_RENDERING_STEPS: ReadonlySet<string> = new Set([
  'hookBeforeAllMs',
  'searchIndexGenerationMs',
  'searchIndexWriteMs',
  'shouldRebuildTotalMs',
  'hookBeforeRenderTotalMs',
  'markdownRenderTotalMs',
  'renderPageTotalMs',
  'postRenderTotalMs',
  'fileWriteTotalMs',
  'cacheEntryTotalMs',
  'hookAfterRenderTotalMs',
]);

/**
 * A recorded phase as the report shows it.
 */
interface PhaseRow {
  key: string;
  label: string;
  description: string;
  value: number;
  /** Share of the build, in percent */
  share: number;
  /** Where the phase's bar starts on the timeline, in percent */
  start: number;
  /** Phases measured inside this one */
  steps: PhaseRow[];
}

function executionIndex(key: string): number {
  const index = PHASE_EXECUTION_ORDER.indexOf(key);
  return index === -1 ? PHASE_EXECUTION_ORDER.length : index;
}

/**
 * The recorded phases in the order the build runs them, each with its share of the build and
 * where its bar starts on the timeline: where the phase before it ended. The phases measured
 * inside page rendering are nested under it, so no time is counted twice.
 */
function generatePhaseRows(
  phases: Record<string, number | undefined>,
  durationMs: number,
): PhaseRow[] {
  const recorded = Object.entries(phases)
    .filter((entry): entry is [string, number] => entry[1] !== undefined && entry[1] > 0)
    .sort(([a], [b]) => executionIndex(a) - executionIndex(b));
  const nested = recorded.some(([key]) => key === 'pageRenderingMs');
  const isStep = (key: string) => nested && PAGE_RENDERING_STEPS.has(key);
  const topLevel = recorded.filter(([key]) => !isStep(key));
  const scale = Math.max(
    durationMs,
    topLevel.reduce((sum, [, value]) => sum + value, 0),
  );

  const toRow = ([key, value]: [string, number], start: number): PhaseRow => ({
    key,
    label: getPhaseLabel(key),
    description: getPhaseDescription(key),
    value,
    share: (value / scale) * 100,
    start,
    steps: [],
  });

  let elapsed = 0;
  return topLevel.map((entry) => {
    const row = toRow(entry, (elapsed / scale) * 100);
    elapsed += entry[1];
    if (entry[0] === 'pageRenderingMs') {
      let stepStart = row.start;
      row.steps = recorded
        .filter(([key]) => isStep(key))
        .map((step) => {
          const stepRow = toRow(step, stepStart);
          stepStart += stepRow.share;
          return stepRow;
        });
    }
    return row;
  });
}

/**
 * The same phases, slowest first, and the steps inside a phase slowest first as well.
 */
function sortByDuration(rows: PhaseRow[]): PhaseRow[] {
  return [...rows]
    .sort((a, b) => b.value - a.value)
    .map((row) => ({ ...row, steps: [...row.steps].sort((a, b) => b.value - a.value) }));
}

const CHEVRON_ICON = `<svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>`;

/**
 * A horizontal bar. Thin values stay visible, and a bar never runs past the end of its track.
 */
function renderMeter(start: number, share: number): string {
  const width = Math.min(Math.max(share, 0.4), 100 - start);
  return `<span class="meter" aria-hidden="true"><span class="meter-fill" style="left: ${start.toFixed(2)}%; width: ${width.toFixed(2)}%"></span></span>`;
}

/**
 * Phase rows that open to describe what the phase measures. The timeline numbers the phases and
 * starts each bar where the phase began.
 */
function renderPhaseRows(
  rows: PhaseRow[],
  view: 'duration' | 'timeline',
  isStep: boolean = false,
): string {
  return rows
    .map((row, index) => {
      const order =
        view === 'timeline' && !isStep
          ? `
                <span class="phase-order">${String(index + 1).padStart(2, '0')}</span>`
          : '';
      const steps =
        row.steps.length > 0
          ? `
            <ol class="phase-steps" aria-label="${escapeHtml(`Parts of ${row.label.toLowerCase()}`)}">${renderPhaseRows(row.steps, view, true)}
            </ol>`
          : '';
      return `
          <li class="${isStep ? 'phase phase-step' : 'phase'}">
            <details>
              <summary class="phase-row" title="${escapeHtml(row.key)}">${order}
                <span class="phase-name">${escapeHtml(row.label)}</span>
                ${renderMeter(view === 'timeline' ? row.start : 0, row.share)}
                <span class="phase-time">${formatDuration(row.value)}</span>
                <span class="phase-share">${row.share.toFixed(1)}%</span>
                ${CHEVRON_ICON}
              </summary>
              <p class="phase-description">${escapeHtml(row.description)}</p>
            </details>${steps}
          </li>`;
    })
    .join('');
}

/**
 * The phases, slowest first or in the order the build runs them.
 */
function renderPhasesSection(rows: PhaseRow[]): string {
  const count = rows.reduce((sum, row) => sum + 1 + row.steps.length, 0);
  const body =
    rows.length === 0
      ? `
      <p class="empty">No phases were recorded for this build.</p>`
      : `
      <div class="tabs" role="tablist" aria-label="Phase order">
        <button type="button" class="tab" role="tab" id="phases-tab-duration" aria-controls="phases-duration" aria-selected="true">By duration</button>
        <button type="button" class="tab" role="tab" id="phases-tab-timeline" aria-controls="phases-timeline" aria-selected="false" tabindex="-1">Timeline</button>
      </div>

      <div class="tab-panel" role="tabpanel" id="phases-duration" aria-labelledby="phases-tab-duration">
        <p class="view-intro">Slowest first, as a share of the build. Open a phase to see what it measures.</p>
        <ol class="phases" data-view="duration">${renderPhaseRows(sortByDuration(rows), 'duration')}
        </ol>
      </div>

      <div class="tab-panel" role="tabpanel" id="phases-timeline" aria-labelledby="phases-tab-timeline" hidden>
        <p class="view-intro">In the order the build runs them. Steps inside page rendering are totals over all pages, so their bars show how long they took, not when.</p>
        <ol class="phases" data-view="timeline">${renderPhaseRows(rows, 'timeline')}
        </ol>
      </div>`;

  return `
    <section class="section" id="phases" aria-labelledby="phases-title">
      <div class="section-head">
        <h2 class="section-title" id="phases-title">Phase breakdown</h2>${
          count > 0
            ? `
        <span class="section-note">${count} ${count === 1 ? 'phase' : 'phases'}</span>`
            : ''
        }
      </div>${body}
    </section>`;
}

/**
 * One group of counts, headed by a rule, with a value per row.
 */
function renderCountGroup(
  title: string,
  items: Array<[label: string, value: string] | null>,
  status?: string,
): string {
  const rows = items
    .filter((item): item is [string, string] => item !== null)
    .map(
      ([label, value]) => `
            <div class="count"><dt>${label}</dt><dd>${value}</dd></div>`,
    )
    .join('');
  return `
        <div class="group">
          <h3 class="group-title">${title}${status ? `<span class="group-status">${status}</span>` : ''}</h3>
          <dl class="counts">${rows}
          </dl>
        </div>`;
}

/**
 * Every count of the build, grouped.
 */
function renderCountsSection(metrics: BuildMetrics): string {
  const { counts, isg } = metrics;
  const optional = (label: string, value: number | undefined): [string, string] | null =>
    value === undefined ? null : [label, formatCount(value)];
  const perPage =
    counts.renderedPages > 0 ? (counts.templatesLoaded / counts.renderedPages).toFixed(1) : '0';

  return `
    <section class="section" id="counts" aria-labelledby="counts-title">
      <h2 class="section-title" id="counts-title">Counts</h2>
      <div class="groups">${renderCountGroup('Pages', [
        ['Total', formatCount(counts.totalPages)],
        ['Rendered', formatCount(counts.renderedPages)],
        ['From cache', formatCount(counts.cachedPages)],
        ['Markdown files', formatCount(counts.markdownFilesProcessed)],
      ])}${renderCountGroup('Templates', [
        optional('Indexed', counts.templatesIndexed),
        ['Loaded', formatCount(counts.templatesLoaded)],
        ['Per rendered page', perPage],
        optional('Renders', counts.templateRenders),
        optional('Cached includes', counts.includeCacheHits),
      ])}${renderCountGroup(
        'ISG cache',
        [
          ['Hit rate', formatPercent(isg.cacheHitRate)],
          ['Manifest entries', formatCount(isg.manifestEntries)],
          ['Invalidated', formatCount(isg.invalidatedEntries)],
        ],
        isg.enabled ? 'Enabled' : 'Disabled',
      )}${renderCountGroup('Assets', [
        ['Copied', formatCount(counts.assetsCopied)],
        optional('Images generated', counts.imagesGenerated),
        optional('Images reused', counts.imagesCached),
        optional('Images failed', counts.imagesFailed),
      ])}
      </div>
    </section>`;
}

/**
 * What triggered a dev server rebuild and what it did.
 */
function renderIncrementalSection(incremental: NonNullable<BuildMetrics['incremental']>): string {
  return `
    <section class="section" id="rebuild" aria-labelledby="rebuild-title">
      <h2 class="section-title" id="rebuild-title">Incremental rebuild</h2>
      <dl class="facts">
        <div class="fact">
          <dt>Changed file</dt>
          <dd>${escapeHtml(incremental.triggerFile)}</dd>
        </div>
        <div class="fact">
          <dt>Type</dt>
          <dd>${escapeHtml(incremental.triggerType)}</dd>
        </div>
        <div class="fact">
          <dt>Duration</dt>
          <dd>${formatDuration(incremental.durationMs)}</dd>
        </div>
        <div class="fact">
          <dt>Pages</dt>
          <dd>${formatCount(incremental.renderedPages)} rendered, ${formatCount(incremental.cachedPages)} cached</dd>
        </div>
      </dl>
    </section>`;
}

/**
 * Every page, slowest first: rendered (solid square) or served from cache (hollow circle),
 * with its duration against the slowest page and the templates it rendered.
 */
function renderPagesSection(pageTimings: readonly PageTiming[]): string {
  const pages = [...pageTimings].sort((a, b) => b.durationMs - a.durationMs);
  const slowest = pages.reduce((max, page) => Math.max(max, page.durationMs), 0);
  const rendered = pages.filter((page) => !page.cached).length;
  const rows = pages
    .map((page) => {
      const status = page.cached ? 'cached' : 'rendered';
      const meter =
        slowest > 0 && page.durationMs > 0
          ? renderMeter(0, (page.durationMs / slowest) * 100)
          : '<span class="meter meter-empty" aria-hidden="true"></span>';
      // A page served from cache did not render, so it has no render time
      const duration = page.cached && page.durationMs === 0 ? '–' : formatDuration(page.durationMs);
      return `
              <tr>
                <td class="page-url"><span title="${escapeHtml(page.url)}">${escapeHtml(page.url)}</span></td>
                <td><span class="status status-${status}"><span class="marker" aria-hidden="true"></span>${status}</span></td>
                <td class="page-duration"><span class="duration">${meter}<span class="num">${duration}</span></span></td>
                <td class="num">${page.templatesLoaded ?? '–'}</td>
                <td class="num">${page.templateRenders ?? '–'}</td>
              </tr>`;
    })
    .join('');

  return `
    <section class="section" id="pages" aria-labelledby="pages-title">
      <h2 class="section-title" id="pages-title">Page timings</h2>
      <figure class="panel">
        <figcaption class="panel-bar">
          <span>${formatCount(pages.length)} ${pages.length === 1 ? 'page' : 'pages'}, slowest first</span>
          <span class="panel-summary">${formatCount(rendered)} rendered · ${formatCount(pages.length - rendered)} cached</span>
        </figcaption>
        <div class="table-scroll" tabindex="0" role="region" aria-labelledby="pages-title">
          <table class="pages">
            <thead>
              <tr>
                <th scope="col">Page</th>
                <th scope="col">Result</th>
                <th scope="col" class="page-duration">Duration</th>
                <th scope="col" class="num">Templates</th>
                <th scope="col" class="num">Renders</th>
              </tr>
            </thead>
            <tbody>${rows}
            </tbody>
          </table>
        </div>
      </figure>
    </section>`;
}

const REPORT_STYLES = `
    *,
    *::before,
    *::after {
      box-sizing: border-box;
    }

    html {
      background-color: rgb(var(--canvas));
      scrollbar-color: rgb(var(--line-strong)) transparent;
      scroll-padding-top: 1.5rem;
    }

    body {
      margin: 0;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      background-color: rgb(var(--canvas));
      color: rgb(var(--ink));
      font-family: var(--font-sans);
      font-size: 16px;
      line-height: 1.6;
      font-feature-settings: 'kern' 1, 'liga' 1, 'calt' 1, 'cv11' 1;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    ::selection {
      background-color: rgb(var(--accent) / 0.25);
    }

    :focus-visible {
      outline: 2px solid rgb(var(--accent));
      outline-offset: 2px;
    }

    h1,
    h2,
    h3,
    p,
    pre,
    dl,
    dd,
    ol,
    figure {
      margin: 0;
    }

    ol {
      padding: 0;
      list-style: none;
    }

    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }

    .meta-time,
    .fact dd,
    .stat-value,
    .section-note,
    .phase-order,
    .phase-time,
    .phase-share,
    .counts dd,
    .panel-bar,
    .page-url,
    .num,
    .code {
      font-family: var(--font-mono);
      font-feature-settings: normal;
      font-variant-ligatures: none;
      font-variant-numeric: tabular-nums;
    }

    .shell {
      width: 100%;
      max-width: 72rem;
      margin: 0 auto;
      padding-left: 1rem;
      padding-right: 1rem;
    }

    /* Header bar */

    .bar {
      border-bottom: 1px solid rgb(var(--line));
    }

    .bar .shell {
      min-height: 3.5rem;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem 1.5rem;
      padding-top: 0.625rem;
      padding-bottom: 0.625rem;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      min-width: 0;
    }

    .brand-mark {
      width: 1.25rem;
      height: 1.25rem;
      flex: none;
      color: rgb(var(--accent));
    }

    .brand-name {
      font-family: var(--font-display);
      font-size: 1.125rem;
      font-weight: 800;
      font-stretch: 112%;
      letter-spacing: -0.02em;
      line-height: 1;
    }

    .brand-rule {
      width: 1px;
      height: 1rem;
      background-color: rgb(var(--line-strong));
    }

    .brand-context {
      font-size: 0.875rem;
      font-weight: 500;
      color: rgb(var(--muted));
      white-space: nowrap;
    }

    .bar-nav {
      display: flex;
      flex-wrap: wrap;
      gap: 0.25rem;
      margin: 0 -0.5rem;
    }

    .bar-nav a {
      padding: 0.375rem 0.5rem;
      border-radius: 6px;
      font-size: 0.875rem;
      font-weight: 500;
      line-height: 1.25;
      color: rgb(var(--muted));
      text-decoration: none;
      transition: color 150ms, background-color 150ms;
    }

    .bar-nav a:hover {
      background-color: rgb(var(--raised));
      color: rgb(var(--ink));
    }

    /* Summary */

    .main {
      flex: 1;
      padding-top: 2.5rem;
      padding-bottom: 4rem;
    }

    .headline {
      font-family: var(--font-display);
      font-size: 1.875rem;
      font-weight: 800;
      font-stretch: 108%;
      letter-spacing: -0.015em;
      line-height: 1.1;
      text-wrap: balance;
    }

    .meta {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.5rem 0.75rem;
      margin-top: 0.875rem;
      font-size: 0.875rem;
      color: rgb(var(--muted));
    }

    .type-badge {
      display: inline-flex;
      align-items: center;
      padding: 0.125rem 0.5rem;
      border: 1px solid rgb(var(--line-strong));
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 600;
      line-height: 1.5;
      color: rgb(var(--ink));
      text-transform: capitalize;
    }

    .meta-time {
      font-size: 0.75rem;
      color: rgb(var(--faint));
    }

    .stats {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 1px;
      margin-top: 1.75rem;
      overflow: hidden;
      border: 1px solid rgb(var(--line));
      border-radius: 8px;
      background-color: rgb(var(--line));
    }

    .stat {
      min-width: 0;
      padding: 1rem 1.25rem;
      background-color: rgb(var(--canvas));
    }

    .stat dt {
      font-size: 0.8125rem;
      color: rgb(var(--muted));
    }

    .stat-value {
      margin-top: 0.25rem;
      font-size: 1.5rem;
      font-weight: 500;
      line-height: 1.25;
      letter-spacing: -0.02em;
      color: rgb(var(--ink));
      overflow-wrap: anywhere;
    }

    .stat-note {
      margin-top: 0.25rem;
      font-size: 0.8125rem;
      line-height: 1.5;
      color: rgb(var(--faint));
    }

    .facts {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem 2.5rem;
      margin-top: 1.25rem;
    }

    .fact {
      min-width: 0;
    }

    .fact dt {
      font-size: 0.8125rem;
      color: rgb(var(--faint));
    }

    .fact dd {
      margin-top: 0.125rem;
      font-size: 0.8125rem;
      overflow-wrap: anywhere;
      color: rgb(var(--ink));
    }

    /* Sections */

    .section {
      margin-top: 2.5rem;
      padding-top: 1.75rem;
      border-top: 1px solid rgb(var(--line));
    }

    .section-head {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      justify-content: space-between;
      gap: 0.25rem 1rem;
    }

    .section-title {
      font-family: var(--font-display);
      font-size: 1.125rem;
      font-weight: 700;
      font-stretch: 108%;
      letter-spacing: -0.01em;
      line-height: 1.25;
    }

    .section-note {
      font-size: 0.75rem;
      color: rgb(var(--faint));
    }

    .section > .section-title + * {
      margin-top: 1rem;
    }

    .empty {
      margin-top: 1rem;
      font-size: 0.875rem;
      color: rgb(var(--muted));
    }

    /* Tabs */

    .tabs {
      display: flex;
      gap: 1.5rem;
      margin-top: 1rem;
      border-bottom: 1px solid rgb(var(--line));
    }

    .tab {
      margin-bottom: -1px;
      padding: 0.5rem 0;
      border: 0;
      border-radius: 0;
      background: none;
      font: inherit;
      font-size: 0.875rem;
      font-weight: 500;
      line-height: 1.5;
      color: rgb(var(--muted));
      cursor: pointer;
      transition: color 150ms;
    }

    .tab:hover {
      color: rgb(var(--ink));
    }

    .tab[aria-selected='true'] {
      color: rgb(var(--ink));
      box-shadow: inset 0 -2px 0 rgb(var(--accent));
    }

    .view-intro {
      max-width: 40rem;
      margin-top: 1rem;
      font-size: 0.875rem;
      color: rgb(var(--muted));
    }

    /* Phases */

    .phases {
      --order: 0rem;
      margin-top: 1rem;
      border-bottom: 1px solid rgb(var(--line));
    }

    .phases[data-view='timeline'] {
      --order: 2.75rem;
    }

    .phase-row {
      display: grid;
      grid-template-columns: minmax(0, 13rem) minmax(0, 1fr) 5.5rem 3.25rem 1rem;
      grid-template-areas: 'name meter time share icon';
      align-items: center;
      column-gap: 1rem;
      padding: 0.625rem 0;
      border-top: 1px solid rgb(var(--line));
      cursor: pointer;
      list-style: none;
    }

    .phase-row::-webkit-details-marker {
      display: none;
    }

    .phases > .phase:first-child > details > .phase-row {
      border-top-color: rgb(var(--ink));
    }

    .phases[data-view='timeline'] .phase-row {
      grid-template-columns: 1.75rem minmax(0, 13rem) minmax(0, 1fr) 5.5rem 3.25rem 1rem;
      grid-template-areas: 'order name meter time share icon';
    }

    .phase-order {
      grid-area: order;
      font-size: 0.75rem;
      color: rgb(var(--faint));
    }

    .phase-name {
      grid-area: name;
      min-width: 0;
      font-size: 0.875rem;
      font-weight: 500;
      line-height: 1.4;
      overflow-wrap: anywhere;
      transition: color 150ms;
    }

    .phase-row:hover .phase-name {
      color: rgb(var(--accent-ink));
    }

    .phase-row .meter {
      grid-area: meter;
    }

    .phase-time {
      grid-area: time;
      font-size: 0.8125rem;
      text-align: right;
      white-space: nowrap;
    }

    .phase-share {
      grid-area: share;
      font-size: 0.75rem;
      text-align: right;
      color: rgb(var(--faint));
    }

    .chevron {
      grid-area: icon;
      width: 1rem;
      height: 1rem;
      color: rgb(var(--faint));
      transition: transform 150ms, color 150ms;
    }

    .phase-row:hover .chevron {
      color: rgb(var(--ink));
    }

    details[open] > .phase-row .chevron {
      transform: rotate(90deg);
    }

    .phase-description {
      max-width: 42rem;
      padding: 0 0 1rem var(--order);
      font-size: 0.875rem;
      line-height: 1.65;
      color: rgb(var(--muted));
    }

    .phase-step {
      position: relative;
    }

    .phase-step::before {
      content: '';
      position: absolute;
      top: 0;
      bottom: 0;
      left: var(--order);
      width: 1px;
      background-color: rgb(var(--line-strong));
    }

    .phase-step .phase-row {
      border-top: 0;
    }

    .phase-step .phase-name {
      padding-left: 0.875rem;
      font-weight: 400;
      color: rgb(var(--muted));
    }

    .phase-step .phase-description {
      padding-left: calc(var(--order) + 0.875rem);
    }

    /* Bars */

    .meter {
      position: relative;
      display: block;
      height: 0.375rem;
      overflow: hidden;
      border-radius: 2px;
      background-color: rgb(var(--line));
    }

    .meter-fill {
      position: absolute;
      top: 0;
      bottom: 0;
      min-width: 2px;
      border-radius: 2px;
      background-color: rgb(var(--ink));
    }

    .phase-step .meter-fill {
      background-color: rgb(var(--muted));
    }

    /* Counts */

    .groups {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      gap: 2rem 2.5rem;
      margin-top: 1.25rem;
    }

    .group-title {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid rgb(var(--ink));
      font-size: 0.875rem;
      font-weight: 600;
      line-height: 1.25;
    }

    .group-status {
      font-weight: 400;
      color: rgb(var(--muted));
    }

    .count {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 1rem;
      padding: 0.5rem 0;
      border-bottom: 1px solid rgb(var(--line));
      font-size: 0.875rem;
    }

    .count dt {
      color: rgb(var(--muted));
    }

    .counts dd {
      font-size: 0.8125rem;
      color: rgb(var(--ink));
    }

    /* Panels */

    .panel {
      overflow: hidden;
      border: 1px solid rgb(var(--line));
      border-radius: 8px;
      background-color: rgb(var(--sunken));
    }

    .panel-bar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 0.25rem 1rem;
      min-height: 2.5rem;
      padding: 0.375rem 1rem;
      border-bottom: 1px solid rgb(var(--line));
      background-color: rgb(var(--canvas));
      font-size: 0.75rem;
      line-height: 1.5;
      color: rgb(var(--faint));
    }

    .panel-summary {
      font-family: var(--font-sans);
    }

    .table-scroll {
      max-height: 32rem;
      overflow: auto;
    }

    .pages {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.8125rem;
    }

    .pages th {
      position: sticky;
      top: 0;
      z-index: 1;
      padding: 0.5rem 1rem;
      border-bottom: 1px solid rgb(var(--line));
      background-color: rgb(var(--sunken));
      font-size: 0.75rem;
      font-weight: 600;
      text-align: left;
      white-space: nowrap;
      color: rgb(var(--muted));
    }

    .pages td {
      padding: 0.5rem 1rem;
      border-top: 1px solid rgb(var(--line));
      vertical-align: middle;
      white-space: nowrap;
    }

    .pages tbody tr:first-child td {
      border-top: 0;
    }

    .pages .num {
      text-align: right;
    }

    .page-url {
      color: rgb(var(--ink));
    }

    .page-url span {
      display: block;
      max-width: 26rem;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .status {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      vertical-align: middle;
    }

    .status-rendered {
      color: rgb(var(--ink));
    }

    .status-cached {
      color: rgb(var(--faint));
    }

    .marker {
      width: 0.375rem;
      height: 0.375rem;
      flex: none;
    }

    .status-rendered .marker {
      background-color: rgb(var(--ink));
    }

    .status-cached .marker {
      border: 1px solid currentColor;
      border-radius: 50%;
    }

    .page-duration {
      width: 40%;
      text-align: right;
    }

    .duration {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .duration .meter {
      flex: 1;
      min-width: 6rem;
    }

    .duration .num {
      min-width: 4.75rem;
      text-align: right;
    }

    .meter-empty {
      background-color: transparent;
    }

    /* Raw JSON */

    .disclosure summary {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      width: fit-content;
      cursor: pointer;
      list-style: none;
      border-radius: 4px;
    }

    .disclosure summary::-webkit-details-marker {
      display: none;
    }

    .disclosure summary:hover .section-title {
      color: rgb(var(--accent-ink));
    }

    .disclosure[open] summary .chevron {
      transform: rotate(90deg);
    }

    .disclosure .panel {
      margin-top: 1rem;
    }

    .copy-button {
      display: inline-flex;
      align-items: center;
      padding: 0.25rem 0.5rem;
      margin-right: -0.5rem;
      border: 0;
      border-radius: 6px;
      background: none;
      font: inherit;
      font-family: var(--font-sans);
      font-size: 0.75rem;
      font-weight: 500;
      color: rgb(var(--muted));
      cursor: pointer;
      transition: color 150ms, background-color 150ms;
    }

    .copy-button:hover {
      background-color: rgb(var(--raised));
      color: rgb(var(--ink));
    }

    .copy-button[data-copied='true'] {
      color: rgb(var(--accent-ink));
    }

    .code {
      max-height: 36rem;
      overflow: auto;
      padding: 1rem 1.25rem;
      font-size: 0.8125rem;
      line-height: 1.65;
      tab-size: 2;
      color: rgb(var(--ink));
    }

    /* Footer */

    .footer {
      border-top: 1px solid rgb(var(--line));
      font-size: 0.8125rem;
      color: rgb(var(--faint));
    }

    .footer .shell {
      display: flex;
      flex-wrap: wrap;
      gap: 0.25rem 0.75rem;
      padding-top: 1rem;
      padding-bottom: 1rem;
    }

    .footer-name {
      font-weight: 600;
      color: rgb(var(--muted));
    }

    @media (prefers-reduced-motion: no-preference) {
      .main {
        animation: report-in 240ms cubic-bezier(0.16, 1, 0.3, 1) both;
      }

      @keyframes report-in {
        from {
          opacity: 0;
          transform: translateY(6px);
        }
      }
    }

    @media (max-width: 639px) {
      .phase-row {
        grid-template-columns: minmax(0, 1fr) auto auto 1rem;
        grid-template-areas:
          'name time share icon'
          'meter meter meter meter';
        row-gap: 0.5rem;
      }

      .phases[data-view='timeline'] .phase-row {
        grid-template-columns: 1.75rem minmax(0, 1fr) auto auto 1rem;
        grid-template-areas:
          'order name time share icon'
          '. meter meter meter meter';
      }

      .phase-step .meter {
        margin-left: 0.875rem;
      }

      .duration .meter {
        display: none;
      }

      .page-duration {
        width: auto;
      }
    }

    @media (min-width: 640px) {
      .shell {
        padding-left: 1.5rem;
        padding-right: 1.5rem;
      }

      .main {
        padding-top: 3.5rem;
      }

      .headline {
        font-size: 2.25rem;
      }

      .groups {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @media (min-width: 1024px) {
      .shell {
        padding-left: 3rem;
        padding-right: 3rem;
      }

      .headline {
        font-size: 2.75rem;
      }

      .stats,
      .groups {
        grid-template-columns: repeat(4, minmax(0, 1fr));
      }
    }

    @media print {
      .bar-nav,
      .copy-button {
        display: none;
      }

      .table-scroll,
      .code {
        max-height: none;
        overflow: visible;
      }
    }`;

/**
 * Tabs that switch the phase views, with the arrow keys moving between them, and copying the
 * raw JSON.
 */
const REPORT_SCRIPT = `
    (function () {
      document.querySelectorAll('[role="tablist"]').forEach(function (list) {
        var tabs = Array.prototype.slice.call(list.querySelectorAll('[role="tab"]'));

        function select(tab) {
          tabs.forEach(function (other) {
            var selected = other === tab;
            other.setAttribute('aria-selected', selected ? 'true' : 'false');
            other.tabIndex = selected ? 0 : -1;
            document.getElementById(other.getAttribute('aria-controls')).hidden = !selected;
          });
        }

        tabs.forEach(function (tab, index) {
          tab.addEventListener('click', function () {
            select(tab);
          });
          tab.addEventListener('keydown', function (event) {
            var step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
            if (!step) return;
            event.preventDefault();
            var next = tabs[(index + step + tabs.length) % tabs.length];
            select(next);
            next.focus();
          });
        });
      });

      // The JSON section starts closed; following a link to it opens it
      var json = document.getElementById('raw-json-data');
      document.querySelectorAll('a[href="#raw-json"]').forEach(function (link) {
        link.addEventListener('click', function () {
          json.open = true;
        });
      });

      var copyButton = document.getElementById('copy-json');
      var copyStatus = document.getElementById('copy-status');
      if (!navigator.clipboard) {
        copyButton.hidden = true;
        return;
      }
      copyButton.addEventListener('click', function () {
        var text = document.getElementById('json-content').textContent;
        navigator.clipboard.writeText(text).then(function () {
          copyButton.setAttribute('data-copied', 'true');
          copyButton.textContent = 'Copied';
          copyStatus.textContent = 'JSON copied to the clipboard';
          setTimeout(function () {
            copyButton.removeAttribute('data-copied');
            copyButton.textContent = 'Copy';
            copyStatus.textContent = '';
          }, 2000);
        });
      });
    })();`;

/**
 * Generate the HTML report content
 */
export function generateMetricsHtml(metrics: BuildMetrics): string {
  const { meta, totals, phases, counts, isg, pageTimings, incremental } = metrics;
  const phaseRows = generatePhaseRows(
    phases as Record<string, number | undefined>,
    totals.durationMs,
  );
  const hasDetailedTimings = pageTimings !== undefined && pageTimings.length > 0;

  const enabledFlags = [
    meta.flags.force ? '--force' : null,
    meta.flags.clean ? '--clean' : null,
    meta.flags.includeDrafts ? '--include-drafts' : null,
  ].filter((flag): flag is string => flag !== null);
  const commit = meta.gitCommit ? meta.gitCommit.substring(0, 7) : undefined;
  const source = meta.gitBranch ? `${meta.gitBranch}${commit ? ` (${commit})` : ''}` : commit;
  const perPage =
    counts.renderedPages > 0 ? (counts.templatesLoaded / counts.renderedPages).toFixed(1) : '0';

  const navigation = [
    ['phases', 'Phases'],
    ['counts', 'Counts'],
    incremental ? ['rebuild', 'Rebuild'] : null,
    hasDetailedTimings ? ['pages', 'Pages'] : null,
    ['raw-json', 'JSON'],
  ]
    .filter((link): link is [string, string] => link !== null)
    .map(([id, label]) => `<a href="#${id}">${label}</a>`)
    .join('\n        ');

  // Escaped for the <pre>: the JSON stays readable in the page source and copies unchanged
  const json = JSON.stringify(metrics, null, 2);
  const jsonData = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <link rel="icon" href="${STATI_FAVICON_HREF}">
  <title>Stati Build Metrics Report - ${escapeHtml(meta.timestamp)}</title>
  <style>${STATI_THEME_STYLES}
${REPORT_STYLES}
${STATI_PRINT_STYLES}
  </style>
</head>
<body>
  <header class="bar">
    <div class="shell">
      <div class="brand">
        <svg class="brand-mark" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${STATI_MARK_PATH}"/></svg>
        <span class="brand-name">Stati</span>
        <span class="brand-rule" aria-hidden="true"></span>
        <span class="brand-context">Build metrics</span>
      </div>
      <nav class="bar-nav" aria-label="Report sections">
        ${navigation}
      </nav>
    </div>
  </header>

  <main class="main shell">
    <section class="summary" aria-labelledby="report-title">
      <h1 class="headline" id="report-title">Built ${formatCount(counts.totalPages)} ${counts.totalPages === 1 ? 'page' : 'pages'} in ${formatDuration(totals.durationMs)}</h1>
      <p class="meta">
        <span class="type-badge">${escapeHtml(meta.command)}</span>
        <span class="type-badge">${meta.ci ? 'CI' : 'Local'}</span>
        ${hasDetailedTimings ? '<span class="type-badge">Detailed</span>' : ''}
        <time class="meta-time" datetime="${escapeHtml(meta.timestamp)}">${escapeHtml(new Date(meta.timestamp).toLocaleString())}</time>
      </p>

      <dl class="stats">
        <div class="stat">
          <dt>Pages rendered</dt>
          <dd class="stat-value">${formatCount(counts.renderedPages)}</dd>
          <dd class="stat-note">of ${formatCount(counts.totalPages)}, ${formatCount(counts.cachedPages)} from cache</dd>
        </div>
        <div class="stat">
          <dt>Cache hit rate</dt>
          <dd class="stat-value">${formatPercent(isg.cacheHitRate)}</dd>
          <dd class="stat-note">${formatCount(isg.manifestEntries)} manifest entries</dd>
        </div>
        <div class="stat">
          <dt>Templates loaded</dt>
          <dd class="stat-value">${formatCount(counts.templatesLoaded)}</dd>
          <dd class="stat-note">${perPage} per rendered page</dd>
        </div>
        <div class="stat">
          <dt>Peak memory</dt>
          <dd class="stat-value">${formatBytes(totals.peakRssBytes)}</dd>
          <dd class="stat-note">Heap ${formatBytes(totals.heapUsedBytes)}</dd>
        </div>
      </dl>

      <dl class="facts">
        <div class="fact">
          <dt>Flags</dt>
          <dd>${enabledFlags.length > 0 ? enabledFlags.join(' ') : 'none'}</dd>
        </div>
        ${
          source
            ? `<div class="fact">
          <dt>${meta.gitBranch ? 'Branch' : 'Commit'}</dt>
          <dd>${escapeHtml(source)}</dd>
        </div>`
            : ''
        }
        <div class="fact">
          <dt>Stati</dt>
          <dd>CLI ${escapeHtml(meta.cliVersion)}, core ${escapeHtml(meta.coreVersion)}</dd>
        </div>
        <div class="fact">
          <dt>Node</dt>
          <dd>${escapeHtml(meta.nodeVersion)}</dd>
        </div>
        <div class="fact">
          <dt>Platform</dt>
          <dd>${escapeHtml(`${meta.platform} ${meta.arch}`)}, ${meta.cpuCount} ${meta.cpuCount === 1 ? 'CPU' : 'CPUs'}</dd>
        </div>
      </dl>
    </section>
${renderPhasesSection(phaseRows)}
${renderCountsSection(metrics)}
${incremental ? renderIncrementalSection(incremental) : ''}
${pageTimings && pageTimings.length > 0 ? renderPagesSection(pageTimings) : ''}
    <section class="section" id="raw-json" aria-labelledby="raw-json-title">
      <details class="disclosure" id="raw-json-data">
        <summary>
          ${CHEVRON_ICON}
          <h2 class="section-title" id="raw-json-title">Raw JSON data</h2>
          <span class="section-note">${formatBytes(Buffer.byteLength(json))}</span>
        </summary>
        <figure class="panel">
          <figcaption class="panel-bar">
            <span>Schema version ${escapeHtml(metrics.schemaVersion)}</span>
            <button type="button" class="copy-button" id="copy-json">Copy</button>
          </figcaption>
          <pre class="code" id="json-content" tabindex="0">${jsonData}</pre>
        </figure>
        <span class="sr-only" id="copy-status" role="status"></span>
      </details>
    </section>
  </main>

  <footer class="footer">
    <div class="shell">
      <span class="footer-name">Stati build metrics</span>
      <span>Generated ${escapeHtml(new Date().toISOString())}</span>
    </div>
  </footer>

  <script>${REPORT_SCRIPT}
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
