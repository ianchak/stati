/**
 * Metrics utility functions barrel export.
 *
 * @packageDocumentation
 */

// System utilities
export {
  isCI,
  getGitCommit,
  getGitBranch,
  getCpuCount,
  getPlatform,
  getArch,
  getMemoryUsage,
  getNodeVersion,
} from './system.utils.js';

// Writer utilities
export {
  DEFAULT_METRICS_DIR,
  generateMetricsFilename,
  writeMetrics,
  formatMetricsSummary,
} from './writer.utils.js';

export type { WriteMetricsOptions, WriteMetricsResult } from './writer.utils.js';
