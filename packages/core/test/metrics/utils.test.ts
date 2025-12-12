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
  formatMetricsSummary,
  generateMetricsFilename,
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
        statiVersion: '1.0.0',
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
  });

  describe('formatMetricsSummary', () => {
    const mockMetrics: BuildMetrics = {
      schemaVersion: '1',
      meta: {
        timestamp: '2024-01-15T10:30:00.000Z',
        ci: false,
        nodeVersion: '22.0.0',
        platform: 'linux',
        arch: 'x64',
        cpuCount: 4,
        statiVersion: '1.0.0',
        command: 'build',
        flags: {},
      },
      totals: {
        durationMs: 1250,
        peakRssBytes: 100 * 1024 * 1024,
        heapUsedBytes: 50 * 1024 * 1024,
      },
      phases: {
        configLoadMs: 50,
        pageRenderingMs: 800,
        assetCopyMs: 200,
      },
      counts: {
        totalPages: 20,
        renderedPages: 5,
        cachedPages: 15,
        assetsCopied: 10,
        templatesLoaded: 3,
        markdownFilesProcessed: 20,
      },
      isg: {
        enabled: true,
        cacheHitRate: 0.75,
        manifestEntries: 20,
        invalidatedEntries: 5,
      },
    };

    it('should include header', () => {
      const lines = formatMetricsSummary(mockMetrics);
      const output = lines.join('\n');
      expect(output).toContain('Build Metrics Summary');
    });

    it('should include total build time', () => {
      const lines = formatMetricsSummary(mockMetrics);
      const output = lines.join('\n');
      expect(output).toContain('1.25s');
    });

    it('should include page stats', () => {
      const lines = formatMetricsSummary(mockMetrics);
      const output = lines.join('\n');
      expect(output).toContain('20 total');
      expect(output).toContain('5 rendered');
      expect(output).toContain('15 cached');
    });

    it('should include cache hit rate', () => {
      const lines = formatMetricsSummary(mockMetrics);
      const output = lines.join('\n');
      expect(output).toContain('75.0%');
    });

    it('should include peak memory', () => {
      const lines = formatMetricsSummary(mockMetrics);
      const output = lines.join('\n');
      expect(output).toContain('100.0 MB');
    });

    it('should include top phases sorted by duration', () => {
      const lines = formatMetricsSummary(mockMetrics);
      const output = lines.join('\n');
      expect(output).toContain('pageRendering');
      expect(output).toContain('800ms');
    });

    it('should handle metrics with no phases', () => {
      const noPhases = { ...mockMetrics, phases: {} };
      const lines = formatMetricsSummary(noPhases);
      const output = lines.join('\n');
      expect(output).toContain('Build Metrics Summary');
      expect(output).not.toContain('Top phases');
    });

    it('should handle metrics with zero-duration phases', () => {
      const zeroPhases = {
        ...mockMetrics,
        phases: { configLoadMs: 0, pageRenderingMs: 0 },
      };
      const lines = formatMetricsSummary(zeroPhases);
      const output = lines.join('\n');
      expect(output).not.toContain('Top phases');
    });
  });
});
