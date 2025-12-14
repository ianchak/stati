/**
 * Noop MetricRecorder implementation.
 * Used when metrics collection is disabled - has zero overhead.
 * (Null Object Pattern)
 */

import type {
  MetricRecorder,
  BuildMetrics,
  PhaseName,
  CounterName,
  GaugeName,
  MetricsISG,
  IncrementalMetrics,
} from './types.js';

/**
 * Empty function that does nothing.
 */
const noop = (): void => {
  /* intentionally empty */
};

/**
 * Noop implementation of MetricRecorder.
 * All methods are no-ops with minimal overhead.
 */
class NoopMetricRecorder implements MetricRecorder {
  readonly enabled = false;
  readonly detailed = false;

  startSpan(_name: PhaseName): () => void {
    return noop;
  }

  recordPhase(_name: PhaseName, _durationMs: number): void {
    /* noop */
  }

  addToPhase(_name: PhaseName, _durationMs: number): void {
    /* noop */
  }

  increment(_name: CounterName, _amount?: number): void {
    /* noop */
  }

  setGauge(_name: GaugeName, _value: number): void {
    /* noop */
  }

  recordPageTiming(
    _url: string,
    _durationMs: number,
    _cached: boolean,
    _templatesLoaded?: number,
  ): void {
    /* noop */
  }

  snapshotMemory(): void {
    /* noop */
  }

  setISGMetrics(_metrics: Partial<MetricsISG>): void {
    /* noop */
  }

  setIncrementalMetrics(_metrics: IncrementalMetrics): void {
    /* noop */
  }

  finalize(): BuildMetrics {
    // Return minimal valid metrics object
    return {
      schemaVersion: '1',
      meta: {
        timestamp: new Date().toISOString(),
        ci: false,
        nodeVersion: process.version.replace(/^v/, ''),
        platform: process.platform as BuildMetrics['meta']['platform'],
        arch: process.arch,
        cpuCount: 1,
        cliVersion: 'unknown',
        coreVersion: 'unknown',
        command: 'build',
        flags: {},
      },
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
      isg: {
        enabled: false,
        cacheHitRate: 0,
        manifestEntries: 0,
        invalidatedEntries: 0,
      },
    };
  }
}

/**
 * Singleton noop recorder instance.
 * Use this when metrics are disabled for zero-overhead operation.
 */
export const noopMetricRecorder: MetricRecorder = new NoopMetricRecorder();
