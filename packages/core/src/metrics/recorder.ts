/**
 * Active MetricRecorder implementation.
 * Uses performance.now() from node:perf_hooks for high-resolution timing.
 */

import { performance } from 'node:perf_hooks';
import type {
  MetricRecorder,
  MetricRecorderOptions,
  BuildMetrics,
  MetricsISG,
  IncrementalMetrics,
  PageTiming,
  PhaseName,
  CounterName,
} from './types.js';
import {
  isCI,
  getGitCommit,
  getGitBranch,
  getCpuCount,
  getPlatform,
  getArch,
  getNodeVersion,
  getMemoryUsage,
} from './utils/index.js';
import { noopMetricRecorder } from './noop.js';

/**
 * Internal mutable phase timings type.
 */
type MutablePhases = {
  configLoadMs?: number;
  contentDiscoveryMs?: number;
  navigationBuildMs?: number;
  cacheManifestLoadMs?: number;
  typescriptCompileMs?: number;
  pageRenderingMs?: number;
  assetCopyMs?: number;
  cacheManifestSaveMs?: number;
  sitemapGenerationMs?: number;
  rssGenerationMs?: number;
  hookBeforeAllMs?: number;
  hookAfterAllMs?: number;
  hookBeforeRenderTotalMs?: number;
  hookAfterRenderTotalMs?: number;
};

/**
 * Internal mutable counts type.
 */
type MutableCounts = {
  totalPages: number;
  renderedPages: number;
  cachedPages: number;
  assetsCopied: number;
  templatesLoaded: number;
  markdownFilesProcessed: number;
};

/**
 * Active metric recorder that collects build performance data.
 */
class ActiveMetricRecorder implements MetricRecorder {
  readonly enabled = true;
  readonly detailed: boolean;

  private readonly startTime: number;
  private readonly command: 'build' | 'dev';
  private readonly flags: BuildMetrics['meta']['flags'];
  private readonly statiVersion: string;

  private readonly phases: MutablePhases = {};
  private readonly counts: MutableCounts = {
    totalPages: 0,
    renderedPages: 0,
    cachedPages: 0,
    assetsCopied: 0,
    templatesLoaded: 0,
    markdownFilesProcessed: 0,
  };
  private isgMetrics: MetricsISG = {
    enabled: false,
    cacheHitRate: 0,
    manifestEntries: 0,
    invalidatedEntries: 0,
  };
  private incrementalMetrics?: IncrementalMetrics;
  private pageTimings: PageTiming[] = [];
  private peakRss = 0;

  constructor(options: MetricRecorderOptions = {}) {
    this.startTime = performance.now();
    this.detailed = options.detailed ?? false;
    this.command = options.command ?? 'build';
    this.flags = options.flags ?? {};
    this.statiVersion = options.statiVersion ?? 'unknown';

    // Take initial memory snapshot
    this.snapshotMemory();
  }

  startSpan(name: PhaseName): () => void {
    const spanStart = performance.now();
    return () => {
      const duration = performance.now() - spanStart;
      this.recordPhase(name, duration);
    };
  }

  recordPhase(name: PhaseName, durationMs: number): void {
    // Record phase timing using the phase name directly (replaces)
    this.phases[name] = durationMs;
  }

  addToPhase(name: PhaseName, durationMs: number): void {
    // Add to existing phase timing (accumulates)
    const current = this.phases[name] ?? 0;
    this.phases[name] = current + durationMs;
  }

  increment(name: CounterName, amount = 1): void {
    const current = this.counts[name] ?? 0;
    this.counts[name] = current + amount;
  }

  setGauge(name: string, value: number): void {
    // For now, we handle specific known gauges
    // This can be extended for custom gauges
    if (name === 'peakRss') {
      this.peakRss = Math.max(this.peakRss, value);
    }
  }

  recordPageTiming(url: string, durationMs: number, cached: boolean): void {
    if (this.detailed) {
      this.pageTimings.push({ url, durationMs, cached });
    }
  }

  snapshotMemory(): void {
    const usage = getMemoryUsage();
    this.peakRss = Math.max(this.peakRss, usage.rss);
  }

  setISGMetrics(metrics: Partial<MetricsISG>): void {
    this.isgMetrics = { ...this.isgMetrics, ...metrics };
  }

  setIncrementalMetrics(metrics: IncrementalMetrics): void {
    this.incrementalMetrics = metrics;
  }

  finalize(): BuildMetrics {
    // Take final memory snapshot
    this.snapshotMemory();
    const finalMemory = getMemoryUsage();
    const totalDuration = performance.now() - this.startTime;

    // Build the meta object, excluding undefined git values
    const gitCommit = getGitCommit();
    const gitBranch = getGitBranch();

    const meta: BuildMetrics['meta'] = {
      timestamp: new Date().toISOString(),
      ci: isCI(),
      nodeVersion: getNodeVersion(),
      platform: getPlatform() as BuildMetrics['meta']['platform'],
      arch: getArch(),
      cpuCount: getCpuCount(),
      statiVersion: this.statiVersion,
      command: this.command,
      flags: this.flags,
      ...(gitCommit !== undefined && { gitCommit }),
      ...(gitBranch !== undefined && { gitBranch }),
    };

    // Build the base metrics object
    const baseMetrics = {
      schemaVersion: '1' as const,
      meta,
      totals: {
        durationMs: totalDuration,
        peakRssBytes: this.peakRss,
        heapUsedBytes: finalMemory.heapUsed,
      },
      phases: this.phases,
      counts: this.counts,
      isg: this.isgMetrics,
    };

    // Add optional fields conditionally
    const optionalFields: {
      pageTimings?: readonly PageTiming[];
      incremental?: IncrementalMetrics;
    } = {};

    if (this.detailed && this.pageTimings.length > 0) {
      optionalFields.pageTimings = this.pageTimings;
    }

    if (this.incrementalMetrics) {
      optionalFields.incremental = this.incrementalMetrics;
    }

    return { ...baseMetrics, ...optionalFields } as BuildMetrics;
  }
}

/**
 * Create a MetricRecorder instance.
 * Returns a noop recorder when disabled for zero overhead.
 *
 * @param options - Recorder configuration
 * @returns MetricRecorder instance
 *
 * @example
 * ```typescript
 * // Create an enabled recorder
 * const recorder = createMetricRecorder({ enabled: true });
 *
 * // Start a span
 * const endSpan = recorder.startSpan('configLoadMs');
 * await loadConfig();
 * endSpan(); // Records duration
 *
 * // Increment counters
 * recorder.increment('renderedPages');
 *
 * // Finalize and get metrics
 * const metrics = recorder.finalize();
 * ```
 */
export function createMetricRecorder(options: MetricRecorderOptions = {}): MetricRecorder {
  if (options.enabled === false) {
    return noopMetricRecorder;
  }

  // Check environment variable for CI metrics
  const envEnabled = process.env.STATI_METRICS === '1' || process.env.STATI_METRICS === 'true';

  if (!options.enabled && !envEnabled) {
    return noopMetricRecorder;
  }

  return new ActiveMetricRecorder(options);
}
