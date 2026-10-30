/**
 * Tests for metrics utility functions.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdir, writeFile } from 'node:fs/promises';
import {
  isCI,
  getGitCommit,
  getGitBranch,
  getCpuCount,
  getPlatform,
  getArch,
  getNodeVersion,
  getMemoryUsage,
  writeMetrics,
  generateMetricsFilename,
  generateMetricsHtml,
  writeMetricsHtml,
  DEFAULT_METRICS_DIR,
} from '../../src/metrics/utils/index.js';
import type { BuildMetrics } from '../../src/metrics/types.js';

// Mock fs/promises
vi.mock('node:fs/promises', () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
}));

describe('system.utils', () => {
  describe('isCI', () => {
    const originalEnv = { ...process.env };

    afterEach(() => {
      // Restore original environment
      process.env = { ...originalEnv };
    });

    it('should return false when no CI env vars are set', () => {
      // Clear all known CI env vars
      delete process.env.CI;
      delete process.env.GITHUB_ACTIONS;
      delete process.env.GITLAB_CI;
      delete process.env.CIRCLECI;
      delete process.env.TRAVIS;
      delete process.env.JENKINS_URL;
      delete process.env.BUILDKITE;
      delete process.env.AZURE_PIPELINES;
      delete process.env.TF_BUILD;

      expect(isCI()).toBe(false);
    });

    it('should return true when CI env var is set', () => {
      process.env.CI = 'true';
      expect(isCI()).toBe(true);
    });

    it('should return true when GITHUB_ACTIONS is set', () => {
      delete process.env.CI;
      process.env.GITHUB_ACTIONS = 'true';
      expect(isCI()).toBe(true);
    });

    it('should return true when GITLAB_CI is set', () => {
      delete process.env.CI;
      delete process.env.GITHUB_ACTIONS;
      process.env.GITLAB_CI = 'true';
      expect(isCI()).toBe(true);
    });

    it('should return true when JENKINS_URL is set', () => {
      delete process.env.CI;
      delete process.env.GITHUB_ACTIONS;
      delete process.env.GITLAB_CI;
      process.env.JENKINS_URL = 'http://jenkins.example.com';
      expect(isCI()).toBe(true);
    });
  });

  describe('getGitCommit', () => {
    it('should return a commit SHA or undefined', () => {
      const commit = getGitCommit();
      // Either undefined (no git) or a 40-char hex string
      if (commit !== undefined) {
        expect(commit).toMatch(/^[a-f0-9]{40}$/);
      } else {
        expect(commit).toBeUndefined();
      }
    });
  });

  describe('getGitBranch', () => {
    it('should return a branch name or undefined', () => {
      const branch = getGitBranch();
      // Either undefined (no git) or a non-empty string
      if (branch !== undefined) {
        expect(typeof branch).toBe('string');
        expect(branch.length).toBeGreaterThan(0);
      } else {
        expect(branch).toBeUndefined();
      }
    });
  });

  describe('getCpuCount', () => {
    it('should return a positive integer', () => {
      const count = getCpuCount();
      expect(count).toBeGreaterThan(0);
      expect(Number.isInteger(count)).toBe(true);
    });
  });

  describe('getPlatform', () => {
    it('should return a valid platform string', () => {
      const platform = getPlatform();
      expect(['aix', 'darwin', 'freebsd', 'linux', 'openbsd', 'sunos', 'win32']).toContain(
        platform,
      );
    });
  });

  describe('getArch', () => {
    it('should return a valid architecture string', () => {
      const arch = getArch();
      expect([
        'arm',
        'arm64',
        'ia32',
        'mips',
        'mipsel',
        'ppc',
        'ppc64',
        's390',
        's390x',
        'x64',
      ]).toContain(arch);
    });
  });

  describe('getNodeVersion', () => {
    it('should return version without v prefix', () => {
      const version = getNodeVersion();
      expect(version).not.toMatch(/^v/);
      expect(version).toMatch(/^\d+\.\d+\.\d+/);
    });
  });

  describe('getMemoryUsage', () => {
    it('should return memory stats with rss, heapUsed, and heapTotal', () => {
      const usage = getMemoryUsage();
      expect(usage).toHaveProperty('rss');
      expect(usage).toHaveProperty('heapUsed');
      expect(usage).toHaveProperty('heapTotal');
      expect(usage.rss).toBeGreaterThan(0);
      expect(usage.heapUsed).toBeGreaterThan(0);
      expect(usage.heapTotal).toBeGreaterThan(0);
    });
  });
});

describe('writer.utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('DEFAULT_METRICS_DIR', () => {
    it('should be "metrics"', () => {
      expect(DEFAULT_METRICS_DIR).toBe('metrics');
    });
  });

  describe('generateMetricsFilename', () => {
    it('should generate filename with command and timestamp', () => {
      const filename = generateMetricsFilename('build', '2024-01-15T10:30:00.000Z');
      expect(filename).toBe('build-2024-01-15T10-30-00Z.json');
    });

    it('should replace colons with dashes for Windows compatibility', () => {
      const filename = generateMetricsFilename('dev', '2024-12-25T23:59:59.999Z');
      expect(filename).toBe('dev-2024-12-25T23-59-59Z.json');
      expect(filename).not.toContain(':');
    });

    it('should work with different commands', () => {
      const buildFilename = generateMetricsFilename('build', '2024-01-01T00:00:00.000Z');
      const devFilename = generateMetricsFilename('dev', '2024-01-01T00:00:00.000Z');
      expect(buildFilename).toContain('build-');
      expect(devFilename).toContain('dev-');
    });
  });

  describe('writeMetrics', () => {
    const mockMetrics: BuildMetrics = {
      schemaVersion: '1',
      meta: {
        timestamp: '2024-01-15T10:30:00.000Z',
        ci: false,
        nodeVersion: '22.0.0',
        platform: 'linux',
        arch: 'x64',
        cpuCount: 4,
        cliVersion: '1.0.0',
        coreVersion: '1.0.0',
        command: 'build',
        flags: {},
      },
      totals: {
        durationMs: 1000,
        peakRssBytes: 100000000,
        heapUsedBytes: 50000000,
      },
      phases: {
        configLoadMs: 50,
      },
      counts: {
        totalPages: 10,
        renderedPages: 5,
        cachedPages: 5,
        assetsCopied: 2,
        templatesLoaded: 1,
        markdownFilesProcessed: 10,
      },
      isg: {
        enabled: true,
        cacheHitRate: 0.5,
        manifestEntries: 10,
        invalidatedEntries: 0,
      },
    };

    it('should write metrics to default location', async () => {
      const result = await writeMetrics(mockMetrics, {
        cacheDir: '.stati',
      });

      expect(result.success).toBe(true);
      expect(result.path).toContain('.stati');
      expect(result.path).toContain('metrics');
      expect(result.path).toContain('build-');
      expect(result.path).toContain('.json');
      expect(mkdir).toHaveBeenCalled();
      expect(writeFile).toHaveBeenCalled();
    });

    it('should write metrics to custom output path', async () => {
      const customPath = '/custom/path/metrics.json';
      const result = await writeMetrics(mockMetrics, {
        cacheDir: '.stati',
        outputPath: customPath,
      });

      expect(result.success).toBe(true);
      expect(result.path).toBe(customPath);
    });

    it('should write JSON format by default', async () => {
      await writeMetrics(mockMetrics, {
        cacheDir: '.stati',
      });

      const writeFileCall = vi.mocked(writeFile).mock.calls[0];
      expect(writeFileCall).toBeDefined();
      const content = writeFileCall![1] as string;

      // JSON format is pretty-printed
      expect(content).toContain('\n  ');
      expect(JSON.parse(content)).toEqual(mockMetrics);
    });

    it('should write NDJSON format when specified', async () => {
      await writeMetrics(mockMetrics, {
        cacheDir: '.stati',
        format: 'ndjson',
      });

      const writeFileCall = vi.mocked(writeFile).mock.calls[0];
      expect(writeFileCall).toBeDefined();
      const content = writeFileCall![1] as string;

      // NDJSON is a single line ending with newline
      expect(content).not.toContain('\n  ');
      expect(content.endsWith('\n')).toBe(true);
      expect(JSON.parse(content.trim())).toEqual(mockMetrics);
    });

    it('should handle write errors gracefully', async () => {
      vi.mocked(writeFile).mockRejectedValueOnce(new Error('EACCES: permission denied'));

      const result = await writeMetrics(mockMetrics, {
        cacheDir: '.stati',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to write metrics');
      expect(result.error).toContain('permission denied');
    });

    it('should handle mkdir errors gracefully', async () => {
      vi.mocked(mkdir).mockRejectedValueOnce(new Error('EACCES: permission denied'));

      const result = await writeMetrics(mockMetrics, {
        cacheDir: '.stati',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to write metrics');
    });

    it('should handle non-Error thrown values', async () => {
      vi.mocked(writeFile).mockRejectedValueOnce('string error');

      const result = await writeMetrics(mockMetrics, {
        cacheDir: '.stati',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('string error');
    });

    it('should not generate HTML report by default (requires generateHtml: true)', async () => {
      const result = await writeMetrics(mockMetrics, {
        cacheDir: '.stati',
      });

      expect(result.success).toBe(true);
      expect(result.htmlPath).toBeUndefined();
      // Should have written only JSON
      expect(writeFile).toHaveBeenCalledTimes(1);
    });

    it('should generate HTML report when generateHtml is true', async () => {
      const result = await writeMetrics(mockMetrics, {
        cacheDir: '.stati',
        generateHtml: true,
      });

      expect(result.success).toBe(true);
      expect(result.htmlPath).toContain('.html');
      // Should have written both JSON and HTML
      expect(writeFile).toHaveBeenCalledTimes(2);
    });

    it('should not generate HTML when generateHtml is false', async () => {
      const result = await writeMetrics(mockMetrics, {
        cacheDir: '.stati',
        generateHtml: false,
      });

      expect(result.success).toBe(true);
      expect(result.htmlPath).toBeUndefined();
      // Should have written only JSON
      expect(writeFile).toHaveBeenCalledTimes(1);
    });
  });
});

describe('html-report.utils', () => {
  const mockMetrics: BuildMetrics = {
    schemaVersion: '1',
    meta: {
      timestamp: '2024-01-15T10:30:00.000Z',
      ci: false,
      nodeVersion: '22.0.0',
      platform: 'linux',
      arch: 'x64',
      cpuCount: 4,
      cliVersion: '1.0.0',
      coreVersion: '1.0.0',
      command: 'build',
      flags: {
        force: false,
        clean: true,
      },
      gitCommit: 'abc123def456',
      gitBranch: 'main',
    },
    totals: {
      durationMs: 1000,
      peakRssBytes: 100000000,
      heapUsedBytes: 50000000,
    },
    phases: {
      configLoadMs: 50,
      contentDiscoveryMs: 100,
      pageRenderingMs: 500,
      assetCopyMs: 50,
    },
    counts: {
      totalPages: 10,
      renderedPages: 5,
      cachedPages: 5,
      assetsCopied: 2,
      templatesLoaded: 20,
      markdownFilesProcessed: 10,
    },
    isg: {
      enabled: true,
      cacheHitRate: 0.5,
      manifestEntries: 10,
      invalidatedEntries: 2,
    },
  };

  /** The markup of one tab panel of the phase breakdown */
  function phasePanel(html: string, view: 'duration' | 'timeline'): string {
    const start = html.indexOf(`id="phases-${view}"`);
    expect(start).toBeGreaterThan(-1);
    const end = html.indexOf('</ol>\n      </div>', start);
    return html.slice(start, end);
  }

  /** The text of each top-level phase row in a panel, in order */
  function phaseNames(panel: string): string[] {
    return [
      ...panel.matchAll(/<li class="phase">[\s\S]*?<span class="phase-name">([^<]*)<\/span>/g),
    ].map((match) => match[1]!);
  }

  describe('generateMetricsHtml', () => {
    it('should generate a valid HTML document in the Stati light and dark themes', () => {
      const html = generateMetricsHtml(mockMetrics);
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html lang="en">');
      expect(html).toContain('</html>');
      expect(html).toContain('<meta name="color-scheme" content="light dark">');
      expect(html).toContain('--accent: 37 99 235;');
      expect(html).toContain('@media (prefers-color-scheme: dark)');
      expect(html).toContain('<link rel="icon" href="data:image/svg+xml,');
      expect(html).not.toContain('box-shadow: 0');
    });

    it('should include title with timestamp', () => {
      const html = generateMetricsHtml(mockMetrics);
      expect(html).toContain(
        '<title>Stati Build Metrics Report - 2024-01-15T10:30:00.000Z</title>',
      );
      expect(html).toContain('datetime="2024-01-15T10:30:00.000Z"');
    });

    it('should state the page count and duration in the headline', () => {
      expect(generateMetricsHtml(mockMetrics)).toContain('>Built 10 pages in 1.00s</h1>');
      const onePage = generateMetricsHtml({
        ...mockMetrics,
        totals: { ...mockMetrics.totals, durationMs: 12.5 },
        counts: { ...mockMetrics.counts, totalPages: 1 },
      });
      expect(onePage).toContain('>Built 1 page in 12.50ms</h1>');
    });

    it('should summarize renders, cache hits, templates and memory', () => {
      const html = generateMetricsHtml(mockMetrics);
      expect(html).toContain('<dt>Pages rendered</dt>');
      expect(html).toContain('of 10, 5 from cache');
      expect(html).toContain('<dt>Cache hit rate</dt>');
      expect(html).toContain('<dd class="stat-value">50.0%</dd>');
      expect(html).toContain('<dt>Templates loaded</dt>');
      expect(html).toContain('4.0 per rendered page');
      expect(html).toContain('<dt>Peak memory</dt>');
      expect(html).toContain('<dd class="stat-value">95.37 MB</dd>');
    });

    it('should display phase breakdown with descriptions', () => {
      const html = generateMetricsHtml(mockMetrics);
      expect(html).toContain('Phase breakdown');
      expect(html).toContain('<span class="phase-name">Config loading</span>');
      expect(html).toContain('<span class="phase-name">Content discovery</span>');
      expect(html).toContain('<span class="phase-name">Page rendering</span>');
      expect(html).toContain('Time spent loading and validating the stati.config.ts');
      expect(html).toContain('<span class="section-note">4 phases</span>');
    });

    it('should open phase descriptions with native details elements', () => {
      const html = generateMetricsHtml(mockMetrics);
      expect(html).toContain('<summary class="phase-row" title="configLoadMs">');
      expect(html).toContain('<p class="phase-description">');
      expect(html).not.toContain('onclick=');
    });

    it('should list phases slowest first, and in execution order on the timeline', () => {
      const html = generateMetricsHtml(mockMetrics);
      expect(phaseNames(phasePanel(html, 'duration'))).toEqual([
        'Page rendering',
        'Content discovery',
        'Config loading',
        'Asset copying',
      ]);
      expect(phaseNames(phasePanel(html, 'timeline'))).toEqual([
        'Config loading',
        'Content discovery',
        'Page rendering',
        'Asset copying',
      ]);
    });

    it('should switch between the views with accessible tabs', () => {
      const html = generateMetricsHtml(mockMetrics);
      expect(html).toContain('role="tablist"');
      expect(html).toContain(
        'id="phases-tab-duration" aria-controls="phases-duration" aria-selected="true"',
      );
      expect(html).toContain(
        'id="phases-tab-timeline" aria-controls="phases-timeline" aria-selected="false" tabindex="-1"',
      );
      expect(html).toMatch(/id="phases-timeline" aria-labelledby="phases-tab-timeline" hidden>/);
      expect(html).toContain("event.key === 'ArrowRight'");
    });

    it('should number the timeline and start each bar where the phase before it ended', () => {
      const timeline = phasePanel(generateMetricsHtml(mockMetrics), 'timeline');
      expect(timeline).toContain('<span class="phase-order">01</span>');
      expect(timeline).toContain('<span class="phase-order">04</span>');
      // configLoad 50ms, contentDiscovery 100ms, pageRendering 500ms, assetCopy 50ms of 1000ms
      expect(timeline).toContain('style="left: 0.00%; width: 5.00%"');
      expect(timeline).toContain('style="left: 5.00%; width: 10.00%"');
      expect(timeline).toContain('style="left: 15.00%; width: 50.00%"');
      expect(timeline).toContain('style="left: 65.00%; width: 5.00%"');
      // The duration view starts every bar at zero
      const duration = phasePanel(generateMetricsHtml(mockMetrics), 'duration');
      expect(duration).toContain('style="left: 0.00%; width: 50.00%"');
      expect(duration).not.toContain('phase-order');
    });

    it('should nest the steps of page rendering under it instead of counting them twice', () => {
      const html = generateMetricsHtml({
        ...mockMetrics,
        phases: {
          configLoadMs: 100,
          pageRenderingMs: 600,
          shouldRebuildTotalMs: 100,
          renderPageTotalMs: 300,
          fileWriteTotalMs: 50,
          searchIndexGenerationMs: 40,
          imageSettleMs: 200,
        },
      });
      const timeline = phasePanel(html, 'timeline');
      expect(phaseNames(timeline)).toEqual([
        'Config loading',
        'Page rendering',
        'Image generation',
      ]);
      expect(timeline).toContain('<ol class="phase-steps" aria-label="Parts of page rendering">');
      // Steps run from where page rendering starts, in the order the build runs them
      const steps = timeline.slice(timeline.indexOf('phase-steps'));
      const stepNames = [...steps.matchAll(/<span class="phase-name">([^<]*)<\/span>/g)].map(
        (match) => match[1],
      );
      expect(stepNames.slice(0, 4)).toEqual([
        'Search index generation',
        'Rebuild checks',
        'Render pages',
        'File writing',
      ]);
      expect(steps).toContain('style="left: 10.00%; width: 4.00%"');
      expect(steps).toContain('style="left: 14.00%; width: 10.00%"');
      expect(steps).toContain('style="left: 24.00%; width: 30.00%"');
      // Image generation starts after page rendering, not after its steps as well
      expect(timeline).toContain('style="left: 70.00%; width: 20.00%"');
      expect(html).toContain('<span class="section-note">7 phases</span>');

      // Slowest first, steps included
      const duration = phasePanel(html, 'duration');
      expect(phaseNames(duration)).toEqual([
        'Page rendering',
        'Image generation',
        'Config loading',
      ]);
      const durationSteps = duration.slice(duration.indexOf('phase-steps'));
      expect(durationSteps.indexOf('Render pages')).toBeLessThan(
        durationSteps.indexOf('Rebuild checks'),
      );
    });

    it('should nest Markdown rendering and the work after rendering under page rendering', () => {
      const html = generateMetricsHtml({
        ...mockMetrics,
        phases: {
          pageRenderingMs: 600,
          shouldRebuildTotalMs: 10,
          markdownRenderTotalMs: 200,
          renderPageTotalMs: 100,
          postRenderTotalMs: 50,
        },
      });
      const timeline = phasePanel(html, 'timeline');
      expect(phaseNames(timeline)).toEqual(['Page rendering']);
      const steps = timeline.slice(timeline.indexOf('phase-steps'));
      const stepNames = [...steps.matchAll(/<span class="phase-name">([^<]*)<\/span>/g)].map(
        (match) => match[1],
      );
      expect(stepNames).toEqual(['Rebuild checks', 'Markdown', 'Render pages', 'After rendering']);
      expect(html).toContain('rendering each rendered page&#39;s Markdown to HTML');
    });

    it('should list the steps as phases when page rendering itself was not recorded', () => {
      const html = generateMetricsHtml({
        ...mockMetrics,
        phases: { configLoadMs: 100, renderPageTotalMs: 300 },
      });
      expect(phaseNames(phasePanel(html, 'timeline'))).toEqual(['Config loading', 'Render pages']);
      expect(html).not.toContain('phase-steps');
    });

    it('should keep bars inside the track when the phases add up to more than the build', () => {
      const html = generateMetricsHtml({
        ...mockMetrics,
        totals: { ...mockMetrics.totals, durationMs: 100 },
        phases: { configLoadMs: 150, assetCopyMs: 50 },
      });
      const timeline = phasePanel(html, 'timeline');
      expect(timeline).toContain('style="left: 0.00%; width: 75.00%"');
      expect(timeline).toContain('style="left: 75.00%; width: 25.00%"');
    });

    it('should show thin phases and leave out phases that took no time', () => {
      const html = generateMetricsHtml({
        ...mockMetrics,
        phases: { configLoadMs: 999, sitemapGenerationMs: 0.5, rssGenerationMs: 0 },
      });
      expect(html).toContain('style="left: 0.00%; width: 0.40%"');
      expect(html).toContain('Sitemap generation');
      expect(html).not.toContain('RSS generation');
    });

    it('should say so when no phases were recorded', () => {
      const html = generateMetricsHtml({ ...mockMetrics, phases: {} });
      expect(html).toContain('No phases were recorded for this build.');
      expect(html).not.toContain('<div class="tabs" role="tablist"');
      expect(html).not.toContain('phases</span>');
    });

    it('should group the counts', () => {
      const html = generateMetricsHtml(mockMetrics);
      expect(html).toContain('<h2 class="section-title" id="counts-title">Counts</h2>');
      expect(html).toContain('<h3 class="group-title">Pages</h3>');
      expect(html).toContain('<div class="count"><dt>From cache</dt><dd>5</dd></div>');
      expect(html).toContain('<div class="count"><dt>Markdown files</dt><dd>10</dd></div>');
      expect(html).toContain('<div class="count"><dt>Per rendered page</dt><dd>4.0</dd></div>');
      expect(html).toContain(
        '<h3 class="group-title">ISG cache<span class="group-status">Enabled</span></h3>',
      );
      expect(html).toContain('<div class="count"><dt>Invalidated</dt><dd>2</dd></div>');
      expect(html).toContain('<div class="count"><dt>Copied</dt><dd>2</dd></div>');
    });

    it('should show template and image counts only when the build recorded them', () => {
      const without = generateMetricsHtml(mockMetrics);
      expect(without).not.toContain('<dt>Indexed</dt>');
      expect(without).not.toContain('<dt>Renders</dt>');
      expect(without).not.toContain('<dt>Cached includes</dt>');
      expect(without).not.toContain('<dt>Images generated</dt>');

      const html = generateMetricsHtml({
        ...mockMetrics,
        counts: {
          ...mockMetrics.counts,
          templatesIndexed: 12,
          templateRenders: 34,
          includeCacheHits: 0,
          imagesGenerated: 1234,
          imagesCached: 5,
          imagesFailed: 0,
        },
      });
      expect(html).toContain('<div class="count"><dt>Indexed</dt><dd>12</dd></div>');
      expect(html).toContain('<div class="count"><dt>Renders</dt><dd>34</dd></div>');
      expect(html).toContain('<div class="count"><dt>Cached includes</dt><dd>0</dd></div>');
      expect(html).toContain('<div class="count"><dt>Images generated</dt><dd>1,234</dd></div>');
      expect(html).toContain('<div class="count"><dt>Images failed</dt><dd>0</dd></div>');
    });

    it('should show the ISG cache as disabled', () => {
      const html = generateMetricsHtml({
        ...mockMetrics,
        isg: { ...mockMetrics.isg, enabled: false },
      });
      expect(html).toContain('<span class="group-status">Disabled</span>');
    });

    it('should include raw JSON data in a closed disclosure', () => {
      const html = generateMetricsHtml(mockMetrics);
      expect(html).toContain('Raw JSON data');
      expect(html).toContain('<details class="disclosure" id="raw-json-data">');
      expect(html).toContain('"schemaVersion": "1"');
      expect(html).toContain(
        '<button type="button" class="copy-button" id="copy-json">Copy</button>',
      );
      expect(html).toContain('navigator.clipboard.writeText');
    });

    it('should include git info when available', () => {
      const html = generateMetricsHtml(mockMetrics);
      expect(html).toContain('<dt>Branch</dt>');
      expect(html).toContain('<dd>main (abc123d)</dd>');
    });

    it('should show the commit when the branch is unknown', () => {
      const { gitBranch, ...meta } = mockMetrics.meta;
      expect(gitBranch).toBe('main');
      const html = generateMetricsHtml({ ...mockMetrics, meta });
      expect(html).toContain('<dt>Commit</dt>');
      expect(html).toContain('<dd>abc123d</dd>');
    });

    it('should list the CLI flags that were set', () => {
      const html = generateMetricsHtml(mockMetrics);
      expect(html).toContain('<dd>--clean</dd>');
      expect(html).not.toContain('--force');

      const all = generateMetricsHtml({
        ...mockMetrics,
        meta: { ...mockMetrics.meta, flags: { force: true, clean: true, includeDrafts: true } },
      });
      expect(all).toContain('<dd>--force --clean --include-drafts</dd>');

      const none = generateMetricsHtml({
        ...mockMetrics,
        meta: { ...mockMetrics.meta, flags: {} },
      });
      expect(none).toContain('<dd>none</dd>');
    });

    it('should show the run environment', () => {
      const html = generateMetricsHtml(mockMetrics);
      expect(html).toContain('<dd>CLI 1.0.0, core 1.0.0</dd>');
      expect(html).toContain('<dd>22.0.0</dd>');
      expect(html).toContain('<dd>linux x64, 4 CPUs</dd>');
    });

    it('should show Local badge when not in CI', () => {
      const html = generateMetricsHtml(mockMetrics);
      expect(html).toContain('<span class="type-badge">Local</span>');
      expect(html).toContain('<span class="type-badge">build</span>');
    });

    it('should show CI badge when in CI', () => {
      const ciMetrics = {
        ...mockMetrics,
        meta: { ...mockMetrics.meta, ci: true },
      };
      const html = generateMetricsHtml(ciMetrics);
      expect(html).toContain('>CI<');
      expect(html).not.toContain('>Local<');
    });

    it('should list every page, slowest first, with what it rendered', () => {
      const detailedMetrics: BuildMetrics = {
        ...mockMetrics,
        pageTimings: [
          { url: '/page2', durationMs: 0, cached: true },
          { url: '/page1', durationMs: 50, cached: false, templatesLoaded: 5, templateRenders: 7 },
          { url: '/page3', durationMs: 25, cached: false, templatesLoaded: 3, templateRenders: 3 },
        ],
      };
      const html = generateMetricsHtml(detailedMetrics);
      expect(html).toContain('Page timings');
      expect(html).toContain('<span class="type-badge">Detailed</span>');
      expect(html).toContain('<a href="#pages">Pages</a>');
      expect(html).toContain('3 pages, slowest first');
      expect(html).toContain('2 rendered · 1 cached');
      expect(html.indexOf('>/page1<')).toBeLessThan(html.indexOf('>/page3<'));
      expect(html.indexOf('>/page3<')).toBeLessThan(html.indexOf('>/page2<'));

      const row = (url: string) => {
        const start = html.indexOf(`<span title="${url}">`);
        return html.slice(start, html.indexOf('</tr>', start));
      };
      expect(row('/page1')).toContain('status-rendered');
      expect(row('/page1')).toContain('style="left: 0.00%; width: 100.00%"');
      expect(row('/page1')).toContain('<span class="num">50.00ms</span>');
      expect(row('/page1')).toContain('<td class="num">5</td>');
      expect(row('/page1')).toContain('<td class="num">7</td>');
      expect(row('/page3')).toContain('style="left: 0.00%; width: 50.00%"');
      // A cached page did not render: no bar, no time, no templates
      expect(row('/page2')).toContain('status-cached');
      expect(row('/page2')).toContain('meter-empty');
      expect(row('/page2')).toContain('<span class="num">–</span>');
      expect(row('/page2')).toContain('<td class="num">–</td>');
    });

    it('should leave out the pages section without page timings', () => {
      const html = generateMetricsHtml(mockMetrics);
      expect(html).not.toContain('Page timings');
      expect(html).not.toContain('href="#pages"');
      expect(html).not.toContain('>Detailed<');
    });

    it('should handle incremental metrics', () => {
      const incrementalMetrics: BuildMetrics = {
        ...mockMetrics,
        meta: { ...mockMetrics.meta, command: 'dev' },
        incremental: {
          triggerFile: 'src/index.md',
          triggerType: 'markdown',
          renderedPages: 1,
          cachedPages: 9,
          durationMs: 100,
        },
      };
      const html = generateMetricsHtml(incrementalMetrics);
      expect(html).toContain('Incremental rebuild');
      expect(html).toContain('<a href="#rebuild">Rebuild</a>');
      expect(html).toContain('<dd>src/index.md</dd>');
      expect(html).toContain('<dd>markdown</dd>');
      expect(html).toContain('<dd>1 rendered, 9 cached</dd>');
      expect(html).toContain('<span class="type-badge">dev</span>');
    });

    it('should escape HTML special characters in JSON output', () => {
      const html = generateMetricsHtml({
        ...mockMetrics,
        pageTimings: [{ url: '/a?b=1&c=<x>', durationMs: 1, cached: false }],
      });
      // Sliced out by position: a lazy regex here is polynomial on repeated opening tags
      const open = '<pre class="code" id="json-content" tabindex="0">';
      const start = html.indexOf(open);
      expect(start).toBeGreaterThan(-1);
      const end = html.indexOf('</pre>', start);
      expect(end).toBeGreaterThan(start);
      const pre = html.slice(start + open.length, end);
      expect(pre).toContain('"schemaVersion": "1"');
      expect(pre).toContain('/a?b=1&amp;c=&lt;x&gt;');
      const text = pre.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
      expect(JSON.parse(text).pageTimings[0].url).toBe('/a?b=1&c=<x>');
    });

    it('should escape user data in the page', () => {
      const html = generateMetricsHtml({
        ...mockMetrics,
        meta: {
          ...mockMetrics.meta,
          gitBranch: 'feature/my-<special>-branch',
          gitCommit: 'abc123',
        },
        pageTimings: [{ url: '/"quoted"/<b>', durationMs: 1, cached: false }],
        incremental: {
          triggerFile: 'site/<script>.md',
          triggerType: 'markdown',
          renderedPages: 1,
          cachedPages: 0,
          durationMs: 1,
        },
      });
      expect(html).toContain('<dd>feature/my-&lt;special&gt;-branch (abc123)</dd>');
      expect(html).toContain(
        '<span title="/&quot;quoted&quot;/&lt;b&gt;">/&quot;quoted&quot;/&lt;b&gt;</span>',
      );
      expect(html).toContain('<dd>site/&lt;script&gt;.md</dd>');
      expect(html).not.toContain('<special>');
      expect(html).not.toContain('<b>');
    });
  });

  describe('writeMetricsHtml', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should write HTML file successfully', async () => {
      const result = await writeMetricsHtml(mockMetrics, '/path/to/metrics.html');
      expect(result.success).toBe(true);
      expect(result.path).toBe('/path/to/metrics.html');
      expect(writeFile).toHaveBeenCalled();
    });

    it('should handle write errors gracefully', async () => {
      vi.mocked(writeFile).mockRejectedValueOnce(new Error('EACCES: permission denied'));

      const result = await writeMetricsHtml(mockMetrics, '/path/to/metrics.html');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to write HTML report');
    });
  });

  describe('edge cases', () => {
    it('should handle metrics with zero values', () => {
      const zeroMetrics: BuildMetrics = {
        ...mockMetrics,
        totals: {
          durationMs: 0,
          peakRssBytes: 0,
          heapUsedBytes: 0,
        },
        phases: {},
        counts: {
          totalPages: 0,
          renderedPages: 0,
          cachedPages: 0,
          assetsCopied: 0,
          templatesLoaded: 0,
          markdownFilesProcessed: 0,
        },
      };

      const html = generateMetricsHtml(zeroMetrics);
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('0 B'); // Zero bytes formatted
      expect(html).toContain('>Built 0 pages in 0μs</h1>');
      expect(html).toContain('0 per rendered page');
      expect(html).not.toContain('NaN');
      expect(html).not.toContain('Infinity');
    });

    it('should format sizes below a kilobyte without decimals', () => {
      const html = generateMetricsHtml({
        ...mockMetrics,
        totals: { ...mockMetrics.totals, peakRssBytes: 1536, heapUsedBytes: 675 },
      });
      expect(html).toContain('<dd class="stat-value">1.50 KB</dd>');
      expect(html).toContain('Heap 675 B');
    });

    it('should handle metrics without optional fields', () => {
      const minimalMetrics: BuildMetrics = {
        schemaVersion: '1',
        meta: {
          timestamp: '2024-01-15T10:30:00.000Z',
          ci: false,
          nodeVersion: '22.0.0',
          platform: 'linux',
          arch: 'x64',
          cpuCount: 1,
          cliVersion: '1.0.0',
          coreVersion: '1.0.0',
          command: 'build',
          flags: {},
          // No gitCommit or gitBranch
        },
        totals: {
          durationMs: 100,
          peakRssBytes: 1000,
          heapUsedBytes: 500,
        },
        phases: {},
        counts: {
          totalPages: 1,
          renderedPages: 1,
          cachedPages: 0,
          assetsCopied: 0,
          templatesLoaded: 1,
          markdownFilesProcessed: 1,
        },
        isg: {
          enabled: false,
          cacheHitRate: 0,
          manifestEntries: 0,
          invalidatedEntries: 0,
        },
      };

      const html = generateMetricsHtml(minimalMetrics);
      expect(html).toContain('<!DOCTYPE html>');
      // Should not throw when git info is missing
      expect(html).not.toContain('undefined');
      expect(html).not.toContain('<dt>Branch</dt>');
      expect(html).not.toContain('<dt>Commit</dt>');
      expect(html).toContain('<dd>linux x64, 1 CPU</dd>');
    });

    it('should handle large duration values', () => {
      const longBuildMetrics: BuildMetrics = {
        ...mockMetrics,
        totals: {
          durationMs: 3600000, // 1 hour
          peakRssBytes: 2 * 1024 * 1024 * 1024, // 2 GB
          heapUsedBytes: 1024 * 1024 * 1024, // 1 GB
        },
      };

      const html = generateMetricsHtml(longBuildMetrics);
      expect(html).toContain('>Built 10 pages in 3600.00s</h1>');
      expect(html).toContain('2.00 GB');
    });

    it('should handle pageTimings with empty array', () => {
      const metricsWithEmptyTimings: BuildMetrics = {
        ...mockMetrics,
        pageTimings: [],
      };

      const html = generateMetricsHtml(metricsWithEmptyTimings);
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).not.toContain('Page timings');
    });
  });
});
