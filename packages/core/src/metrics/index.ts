/**
 * Stati Build Metrics System
 *
 * Provides performance measurement and reporting for Stati builds.
 * Uses Node.js built-ins only - no external dependencies.
 *
 * @example Basic Usage
 * ```typescript
 * import { createMetricRecorder, writeMetrics, formatMetricsSummary } from '@stati/core';
 *
 * // Create recorder (noop when disabled)
 * const recorder = createMetricRecorder({ enabled: true });
 *
 * // Record phases with spans
 * const endConfig = recorder.startSpan('configLoadMs');
 * await loadConfig();
 * endConfig();
 *
 * // Increment counters
 * recorder.increment('renderedPages');
 *
 * // Finalize and write
 * const metrics = recorder.finalize();
 * await writeMetrics(metrics, { cacheDir: '.stati' });
 *
 * // Format for CLI
 * const summary = formatMetricsSummary(metrics);
 * summary.forEach(line => console.log(line));
 * ```
 *
 * @packageDocumentation
 */

// Types
export type {
  BuildMetrics,
  MetricsMeta,
  MetricsFlags,
  MetricsTotals,
  MetricsPhases,
  MetricsCounts,
  MetricsISG,
  PageTiming,
  IncrementalMetrics,
  MetricRecorder,
  MetricRecorderOptions,
  PhaseName,
  CounterName,
} from './types.js';

// Recorder factory
export { createMetricRecorder } from './recorder.js';

// Noop recorder singleton
export { noopMetricRecorder } from './noop.js';

// Utilities (file writing, system info)
export {
  // Writer utilities
  writeMetrics,
  formatMetricsSummary,
  generateMetricsFilename,
  DEFAULT_METRICS_DIR,
  // System utilities
  isCI,
  getGitCommit,
  getGitBranch,
  getCpuCount,
  getPlatform,
  getArch,
  getNodeVersion,
  getMemoryUsage,
} from './utils/index.js';
export type { WriteMetricsOptions, WriteMetricsResult } from './utils/index.js';
