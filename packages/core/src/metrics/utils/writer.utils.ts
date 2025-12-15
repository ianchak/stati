/**
 * Metrics file writing utilities.
 * Handles graceful degradation - never blocks builds on write failures.
 */

import { writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import type { BuildMetrics } from '../types.js';

/**
 * Default metrics output directory (relative to cache dir).
 */
export const DEFAULT_METRICS_DIR = 'metrics';

/**
 * Generate a timestamped filename for metrics output.
 *
 * @param command - The command that was run (build, dev)
 * @param timestamp - ISO timestamp
 * @returns Filename like "build-2024-01-15T10-30-00.json"
 */
export function generateMetricsFilename(command: string, timestamp: string): string {
  // Replace colons with dashes for Windows compatibility
  const safeTimestamp = timestamp.replace(/:/g, '-').replace(/\.\d+Z$/, 'Z');
  return `${command}-${safeTimestamp}.json`;
}

/**
 * Options for writing metrics.
 */
export interface WriteMetricsOptions {
  /** Base cache directory (e.g., .stati) */
  cacheDir: string;
  /** Custom output path (overrides default) */
  outputPath?: string | undefined;
  /** Format: json (default) or ndjson */
  format?: 'json' | 'ndjson' | undefined;
}

/**
 * Result of metrics write operation.
 */
export interface WriteMetricsResult {
  success: boolean;
  path?: string;
  error?: string;
}

/**
 * Write build metrics to a JSON file.
 * Degrades gracefully on failure - logs warning but doesn't throw.
 *
 * @param metrics - The metrics to write
 * @param options - Write options
 * @returns Result indicating success/failure and path
 *
 * @example
 * ```typescript
 * const result = await writeMetrics(metrics, {
 *   cacheDir: '.stati',
 * });
 *
 * if (result.success) {
 *   console.log(`Metrics written to ${result.path}`);
 * }
 * ```
 */
export async function writeMetrics(
  metrics: BuildMetrics,
  options: WriteMetricsOptions,
): Promise<WriteMetricsResult> {
  try {
    // Determine output path
    let outputPath: string;

    if (options.outputPath) {
      outputPath = options.outputPath;
    } else {
      const metricsDir = join(options.cacheDir, DEFAULT_METRICS_DIR);
      const filename = generateMetricsFilename(metrics.meta.command, metrics.meta.timestamp);
      outputPath = join(metricsDir, filename);
    }

    // Ensure directory exists
    await mkdir(dirname(outputPath), { recursive: true });

    // Format content
    const format = options.format ?? 'json';
    let content: string;

    if (format === 'ndjson') {
      // NDJSON: one JSON object per line, no pretty printing
      content = JSON.stringify(metrics) + '\n';
    } else {
      // JSON: pretty printed for readability
      content = JSON.stringify(metrics, null, 2) + '\n';
    }

    // Write file
    await writeFile(outputPath, content, 'utf-8');

    return {
      success: true,
      path: outputPath,
    };
  } catch (error) {
    // Graceful degradation - don't throw, just report failure
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: `Failed to write metrics: ${errorMessage}`,
    };
  }
}
