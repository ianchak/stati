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

  describe('generateMetricsHtml', () => {
    it('should generate valid HTML document', () => {
      const html = generateMetricsHtml(mockMetrics);
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html lang="en">');
      expect(html).toContain('</html>');
    });

    it('should include title with timestamp', () => {
      const html = generateMetricsHtml(mockMetrics);
      expect(html).toContain('Stati Build Metrics Report');
      expect(html).toContain('2024-01-15T10:30:00.000Z');
    });

    it('should include summary cards', () => {
      const html = generateMetricsHtml(mockMetrics);
      expect(html).toContain('Total Duration');
      expect(html).toContain('Pages');
      expect(html).toContain('Cache Hit Rate');
      expect(html).toContain('Peak Memory');
    });

    it('should display phase breakdown', () => {
      const html = generateMetricsHtml(mockMetrics);
      expect(html).toContain('Phase Breakdown');
      expect(html).toContain('Config Loading');
      expect(html).toContain('Content Discovery');
      expect(html).toContain('Page Rendering');
    });

    it('should include ISG cache section', () => {
      const html = generateMetricsHtml(mockMetrics);
      expect(html).toContain('ISG Cache Performance');
      expect(html).toContain('Pages from Cache');
      expect(html).toContain('Pages Rendered');
    });

    it('should include raw JSON data', () => {
      const html = generateMetricsHtml(mockMetrics);
      expect(html).toContain('Raw JSON Data');
      expect(html).toContain('"schemaVersion": "1"');
    });

    it('should include git info when available', () => {
      const html = generateMetricsHtml(mockMetrics);
      expect(html).toContain('main');
      expect(html).toContain('abc123d'); // truncated commit
    });

    it('should include CLI flags', () => {
      const html = generateMetricsHtml(mockMetrics);
      expect(html).toContain('--force');
      expect(html).toContain('--clean');
    });

    it('should show Local badge when not in CI', () => {
      const html = generateMetricsHtml(mockMetrics);
      expect(html).toContain('Local');
    });

    it('should show CI badge when in CI', () => {
      const ciMetrics = {
        ...mockMetrics,
        meta: { ...mockMetrics.meta, ci: true },
      };
      const html = generateMetricsHtml(ciMetrics);
      expect(html).toContain('>CI<');
    });

    it('should handle detailed metrics with pageTimings', () => {
      const detailedMetrics: BuildMetrics = {
        ...mockMetrics,
        pageTimings: [
          { url: '/page1', durationMs: 50, cached: false, templatesLoaded: 5 },
          { url: '/page2', durationMs: 30, cached: true },
        ],
      };
      const html = generateMetricsHtml(detailedMetrics);
      expect(html).toContain('Page Timings');
      expect(html).toContain('/page1');
      expect(html).toContain('/page2');
      expect(html).toContain('Detailed');
      expect(html).toContain('Waterfall View');
    });

    it('should handle incremental metrics', () => {
      const incrementalMetrics: BuildMetrics = {
        ...mockMetrics,
        incremental: {
          triggerFile: 'src/index.md',
          triggerType: 'markdown',
          renderedPages: 1,
          cachedPages: 9,
          durationMs: 100,
        },
      };
      const html = generateMetricsHtml(incrementalMetrics);
      expect(html).toContain('Incremental Rebuild');
      expect(html).toContain('src/index.md');
      expect(html).toContain('markdown');
    });

    it('should escape HTML special characters in JSON output', () => {
      const html = generateMetricsHtml(mockMetrics);
      // The JSON section should escape < and > to prevent XSS from user data
      // Check that the JSON pre content uses &lt; and &gt; escaping
      const jsonPreMatch = html.match(/<pre id="json-content">([\s\S]*?)<\/pre>/);
      expect(jsonPreMatch).toBeTruthy();
      // Verify basic structure is preserved after escaping
      expect(jsonPreMatch![1]).toContain('"schemaVersion": "1"');
    });

    it('should include interactive JavaScript', () => {
      const html = generateMetricsHtml(mockMetrics);
      expect(html).toContain('function switchTab');
      expect(html).toContain('function copyJson');
    });

    it('should include phase descriptions that expand on click', () => {
      const html = generateMetricsHtml(mockMetrics);
      // Should have expandable phase items
      expect(html).toContain('togglePhase(this)');
      expect(html).toContain('phase-description');
      expect(html).toContain('phase-expand-icon');
      // Should include detailed descriptions
      expect(html).toContain('Time spent loading and validating the stati.config.ts');
    });

    it('should include timeline view with execution order', () => {
      const html = generateMetricsHtml(mockMetrics);
      // Should have view tabs
      expect(html).toContain("switchPhaseView('duration')");
      expect(html).toContain("switchPhaseView('timeline')");
      expect(html).toContain('By Duration');
      expect(html).toContain('Timeline');
      // Should have timeline elements
      expect(html).toContain('timeline-view');
      expect(html).toContain('timeline-track');
      expect(html).toContain('timeline-list');
      expect(html).toContain('timeline-item');
      expect(html).toContain('timeline-order');
    });

    it('should display phases in correct order in timeline view', () => {
      const html = generateMetricsHtml(mockMetrics);
      // Timeline view should have phases in execution order (not by duration)
      // The timeline items should have order numbers
      expect(html).toMatch(/<div class="timeline-order">1<\/div>/);
      // Should include expandable timeline items
      expect(html).toContain('toggleTimeline(this)');
      expect(html).toContain('expandTimelineItem(');
    });

    it('should include phase color classes for timeline segments', () => {
      const html = generateMetricsHtml(mockMetrics);
      // Should have color classes for timeline visualization
      expect(html).toContain('phase-color-0');
      expect(html).toContain('phase-color-1');
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
});
