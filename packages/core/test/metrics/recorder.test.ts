/**
 * Tests for the metrics module.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createMetricRecorder,
  noopMetricRecorder,
  formatMetricsSummary,
} from '../../src/metrics/index.js';
import type { BuildMetrics } from '../../src/metrics/index.js';

describe('MetricRecorder', () => {
  describe('noopMetricRecorder', () => {
    it('should have enabled=false', () => {
      expect(noopMetricRecorder.enabled).toBe(false);
    });

    it('should return noop function from startSpan', () => {
      const endSpan = noopMetricRecorder.startSpan('configLoadMs');
      expect(typeof endSpan).toBe('function');
      // Should not throw
      endSpan();
    });

    it('should return valid metrics from finalize', () => {
      const metrics = noopMetricRecorder.finalize();
      expect(metrics.schemaVersion).toBe('1');
      expect(metrics.totals.durationMs).toBe(0);
    });

    it('should have addToPhase as a noop', () => {
      // Should not throw
      noopMetricRecorder.addToPhase('hookBeforeRenderTotalMs', 100);
      noopMetricRecorder.addToPhase('hookAfterRenderTotalMs', 50);

      // Finalize should still return zeroed metrics
      const metrics = noopMetricRecorder.finalize();
      expect(metrics.phases.hookBeforeRenderTotalMs).toBeUndefined();
      expect(metrics.phases.hookAfterRenderTotalMs).toBeUndefined();
    });
  });

  describe('createMetricRecorder', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return noop recorder when disabled', () => {
      const recorder = createMetricRecorder({ enabled: false });
      expect(recorder.enabled).toBe(false);
    });

    it('should return noop recorder when no options and no env var', () => {
      const originalEnv = process.env.STATI_METRICS;
      delete process.env.STATI_METRICS;

      const recorder = createMetricRecorder();
      expect(recorder.enabled).toBe(false);

      if (originalEnv !== undefined) {
        process.env.STATI_METRICS = originalEnv;
      }
    });

    it('should return active recorder when enabled', () => {
      const recorder = createMetricRecorder({ enabled: true });
      expect(recorder.enabled).toBe(true);
    });

    it('should return active recorder when env var is set', () => {
      const originalEnv = process.env.STATI_METRICS;
      process.env.STATI_METRICS = '1';

      const recorder = createMetricRecorder();
      expect(recorder.enabled).toBe(true);

      if (originalEnv !== undefined) {
        process.env.STATI_METRICS = originalEnv;
      } else {
        delete process.env.STATI_METRICS;
      }
    });

    it('should record phase timings via startSpan', () => {
      vi.useRealTimers(); // Need real timers for performance.now()
      const recorder = createMetricRecorder({ enabled: true });

      const endSpan = recorder.startSpan('configLoadMs');
      // Simulate some work
      const start = Date.now();
      while (Date.now() - start < 5) {
        // Busy wait for at least 5ms
      }
      endSpan();

      const metrics = recorder.finalize();
      expect(metrics.phases.configLoadMs).toBeGreaterThan(0);
    });

    it('should increment counters', () => {
      const recorder = createMetricRecorder({ enabled: true });

      recorder.increment('renderedPages');
      recorder.increment('renderedPages');
      recorder.increment('cachedPages', 5);

      const metrics = recorder.finalize();
      expect(metrics.counts.renderedPages).toBe(2);
      expect(metrics.counts.cachedPages).toBe(5);
    });

    it('should record ISG metrics', () => {
      const recorder = createMetricRecorder({ enabled: true });

      recorder.setISGMetrics({
        enabled: true,
        cacheHitRate: 0.75,
        manifestEntries: 10,
        invalidatedEntries: 2,
      });

      const metrics = recorder.finalize();
      expect(metrics.isg.enabled).toBe(true);
      expect(metrics.isg.cacheHitRate).toBe(0.75);
      expect(metrics.isg.manifestEntries).toBe(10);
    });

    it('should record page timings in detailed mode', () => {
      const recorder = createMetricRecorder({ enabled: true, detailed: true });

      recorder.recordPageTiming('/page1', 50, false);
      recorder.recordPageTiming('/page2', 0, true);

      const metrics = recorder.finalize();
      expect(metrics.pageTimings).toBeDefined();
      expect(metrics.pageTimings).toHaveLength(2);
      expect(metrics.pageTimings?.[0]).toEqual({
        url: '/page1',
        durationMs: 50,
        cached: false,
      });
    });

    it('should not record page timings when not in detailed mode', () => {
      const recorder = createMetricRecorder({ enabled: true, detailed: false });

      recorder.recordPageTiming('/page1', 50, false);

      const metrics = recorder.finalize();
      expect(metrics.pageTimings).toBeUndefined();
    });

    it('should include meta information', () => {
      const recorder = createMetricRecorder({
        enabled: true,
        command: 'build',
        statiVersion: '1.0.0',
        flags: { force: true, clean: false },
      });

      const metrics = recorder.finalize();
      expect(metrics.meta.command).toBe('build');
      expect(metrics.meta.statiVersion).toBe('1.0.0');
      expect(metrics.meta.flags.force).toBe(true);
      expect(metrics.meta.nodeVersion).toBeDefined();
      expect(metrics.meta.platform).toBeDefined();
    });

    it('should track memory usage', () => {
      const recorder = createMetricRecorder({ enabled: true });

      recorder.snapshotMemory();
      recorder.snapshotMemory();

      const metrics = recorder.finalize();
      expect(metrics.totals.peakRssBytes).toBeGreaterThan(0);
      expect(metrics.totals.heapUsedBytes).toBeGreaterThan(0);
    });

    it('should record phase timings via recordPhase (replaces)', () => {
      const recorder = createMetricRecorder({ enabled: true });

      recorder.recordPhase('configLoadMs', 100);
      recorder.recordPhase('configLoadMs', 50); // Should replace

      const metrics = recorder.finalize();
      expect(metrics.phases.configLoadMs).toBe(50);
    });

    it('should accumulate phase timings via addToPhase', () => {
      const recorder = createMetricRecorder({ enabled: true });

      recorder.addToPhase('hookBeforeRenderTotalMs', 10);
      recorder.addToPhase('hookBeforeRenderTotalMs', 20);
      recorder.addToPhase('hookBeforeRenderTotalMs', 15);

      const metrics = recorder.finalize();
      expect(metrics.phases.hookBeforeRenderTotalMs).toBe(45);
    });

    it('should record hook phases correctly', () => {
      const recorder = createMetricRecorder({ enabled: true });

      // beforeAll and afterAll are typically recorded once
      recorder.recordPhase('hookBeforeAllMs', 25);
      recorder.recordPhase('hookAfterAllMs', 10);

      // beforeRender and afterRender accumulate across pages
      recorder.addToPhase('hookBeforeRenderTotalMs', 5);
      recorder.addToPhase('hookBeforeRenderTotalMs', 8);
      recorder.addToPhase('hookAfterRenderTotalMs', 3);
      recorder.addToPhase('hookAfterRenderTotalMs', 4);

      const metrics = recorder.finalize();
      expect(metrics.phases.hookBeforeAllMs).toBe(25);
      expect(metrics.phases.hookAfterAllMs).toBe(10);
      expect(metrics.phases.hookBeforeRenderTotalMs).toBe(13);
      expect(metrics.phases.hookAfterRenderTotalMs).toBe(7);
    });

    it('should handle addToPhase when phase is not yet initialized', () => {
      const recorder = createMetricRecorder({ enabled: true });

      // First call should start from 0
      recorder.addToPhase('hookBeforeRenderTotalMs', 100);

      const metrics = recorder.finalize();
      expect(metrics.phases.hookBeforeRenderTotalMs).toBe(100);
    });

    it('should set peakRss gauge', () => {
      const recorder = createMetricRecorder({ enabled: true });

      recorder.setGauge('peakRss', 100000000);
      recorder.setGauge('peakRss', 150000000); // Higher value
      recorder.setGauge('peakRss', 120000000); // Lower value (should keep max)

      const metrics = recorder.finalize();
      // peakRss should be the max value set or from snapshotMemory
      expect(metrics.totals.peakRssBytes).toBeGreaterThanOrEqual(150000000);
    });

    it('should ignore unknown gauge names', () => {
      const recorder = createMetricRecorder({ enabled: true });

      // Should not throw for unknown gauge
      recorder.setGauge('unknownGauge', 100);

      const metrics = recorder.finalize();
      expect(metrics).toBeDefined();
    });

    it('should set incremental metrics', () => {
      const recorder = createMetricRecorder({ enabled: true });

      recorder.setIncrementalMetrics({
        triggerFile: '/site/index.md',
        triggerType: 'markdown',
        renderedPages: 2,
        cachedPages: 8,
        durationMs: 150,
      });

      const metrics = recorder.finalize();
      expect(metrics.incremental).toBeDefined();
      expect(metrics.incremental?.triggerFile).toBe('/site/index.md');
      expect(metrics.incremental?.triggerType).toBe('markdown');
      expect(metrics.incremental?.renderedPages).toBe(2);
      expect(metrics.incremental?.cachedPages).toBe(8);
      expect(metrics.incremental?.durationMs).toBe(150);
    });

    it('should not include incremental metrics when not set', () => {
      const recorder = createMetricRecorder({ enabled: true });

      const metrics = recorder.finalize();
      expect(metrics.incremental).toBeUndefined();
    });

    it('should include git info when available', () => {
      const recorder = createMetricRecorder({ enabled: true });
      const metrics = recorder.finalize();

      // Git info may or may not be present depending on the environment
      if (metrics.meta.gitCommit !== undefined) {
        expect(metrics.meta.gitCommit).toMatch(/^[a-f0-9]{40}$/);
      }
      if (metrics.meta.gitBranch !== undefined) {
        expect(typeof metrics.meta.gitBranch).toBe('string');
      }
    });

    it('should default to command "build" when not specified', () => {
      const recorder = createMetricRecorder({ enabled: true });

      const metrics = recorder.finalize();
      expect(metrics.meta.command).toBe('build');
    });

    it('should use command "dev" when specified', () => {
      const recorder = createMetricRecorder({ enabled: true, command: 'dev' });

      const metrics = recorder.finalize();
      expect(metrics.meta.command).toBe('dev');
    });

    it('should capture total duration from start to finalize', () => {
      vi.useRealTimers();
      const recorder = createMetricRecorder({ enabled: true });

      // Simulate some work
      const start = Date.now();
      while (Date.now() - start < 10) {
        // Busy wait for at least 10ms
      }

      const metrics = recorder.finalize();
      expect(metrics.totals.durationMs).toBeGreaterThan(0);
    });
  });
});

describe('noopMetricRecorder additional methods', () => {
  it('should have recordPhase as a noop', () => {
    noopMetricRecorder.recordPhase('configLoadMs', 100);
    const metrics = noopMetricRecorder.finalize();
    expect(metrics.phases.configLoadMs).toBeUndefined();
  });

  it('should have increment as a noop', () => {
    noopMetricRecorder.increment('renderedPages', 5);
    const metrics = noopMetricRecorder.finalize();
    expect(metrics.counts.renderedPages).toBe(0);
  });

  it('should have setGauge as a noop', () => {
    noopMetricRecorder.setGauge('peakRss', 100000000);
    // Should not throw
    const metrics = noopMetricRecorder.finalize();
    expect(metrics).toBeDefined();
  });

  it('should have recordPageTiming as a noop', () => {
    noopMetricRecorder.recordPageTiming('/page', 100, false);
    const metrics = noopMetricRecorder.finalize();
    expect(metrics.pageTimings).toBeUndefined();
  });

  it('should have snapshotMemory as a noop', () => {
    noopMetricRecorder.snapshotMemory();
    // Should not throw
    const metrics = noopMetricRecorder.finalize();
    expect(metrics).toBeDefined();
  });

  it('should have setISGMetrics as a noop', () => {
    noopMetricRecorder.setISGMetrics({ enabled: true, cacheHitRate: 0.9 });
    const metrics = noopMetricRecorder.finalize();
    expect(metrics.isg.enabled).toBe(false);
  });

  it('should have setIncrementalMetrics as a noop', () => {
    noopMetricRecorder.setIncrementalMetrics({
      triggerFile: '/site/test.md',
      triggerType: 'markdown',
      renderedPages: 1,
      cachedPages: 0,
      durationMs: 100,
    });
    const metrics = noopMetricRecorder.finalize();
    expect(metrics.incremental).toBeUndefined();
  });

  it('should have detailed=false', () => {
    expect(noopMetricRecorder.detailed).toBe(false);
  });
});

describe('formatMetricsSummary', () => {
  it('should format metrics summary lines', () => {
    const metrics: BuildMetrics = {
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
        peakRssBytes: 100 * 1024 * 1024, // 100 MB
        heapUsedBytes: 50 * 1024 * 1024, // 50 MB
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

    const lines = formatMetricsSummary(metrics);

    // Should include key information
    const output = lines.join('\n');
    expect(output).toContain('Build Metrics Summary');
    expect(output).toContain('1.25s'); // Total time
    expect(output).toContain('75.0%'); // Cache hit rate
    expect(output).toContain('100.0 MB'); // Peak memory
    expect(output).toContain('pageRendering'); // Top phase
  });
});
