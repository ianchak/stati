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
 * Display names for build phases.
 * Maps raw phase keys (e.g., 'configLoadMs') to human-readable labels.
 */
const PHASE_DISPLAY_NAMES: Record<string, string> = {
  configLoadMs: 'Config Load',
  contentDiscoveryMs: 'Content Discovery',
  navigationBuildMs: 'Navigation Build',
  cacheManifestLoadMs: 'Cache Manifest Load',
  typescriptCompileMs: 'TypeScript Compile',
  pageRenderingMs: 'Page Rendering',
  assetCopyMs: 'Asset Copy',
  cacheManifestSaveMs: 'Cache Manifest Save',
  sitemapGenerationMs: 'Sitemap Generation',
  rssGenerationMs: 'RSS Generation',
  hookBeforeAllMs: 'Hook: Before All',
  hookAfterAllMs: 'Hook: After All',
  hookBeforeRenderTotalMs: 'Hook: Before Render (Total)',
  hookAfterRenderTotalMs: 'Hook: After Render (Total)',
};

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

/**
 * Format metrics for CLI summary output.
 *
 * @param metrics - Build metrics to format
 * @returns Array of formatted lines for CLI output
 */
export function formatMetricsSummary(metrics: BuildMetrics): string[] {
  const lines: string[] = [];

  // Header
  lines.push('');
  lines.push('Build Metrics Summary');
  lines.push('─'.repeat(40));

  // Total duration
  const totalSeconds = (metrics.totals.durationMs / 1000).toFixed(2);
  lines.push(`Total build time: ${totalSeconds}s`);

  // Page stats
  const { totalPages, renderedPages, cachedPages } = metrics.counts;
  lines.push(`Pages: ${totalPages} total, ${renderedPages} rendered, ${cachedPages} cached`);

  // Cache hit rate
  const hitRate = (metrics.isg.cacheHitRate * 100).toFixed(1);
  lines.push(`Cache hit rate: ${hitRate}%`);

  // Memory
  const peakMB = (metrics.totals.peakRssBytes / 1024 / 1024).toFixed(1);
  lines.push(`Peak memory: ${peakMB} MB`);

  // Top phases (sorted by duration, top 3)
  const phases = Object.entries(metrics.phases)
    .filter(([, duration]) => duration !== undefined && duration > 0)
    .map(([name, duration]) => ({ name, duration: duration as number }))
    .sort((a, b) => b.duration - a.duration)
    .slice(0, 3);

  if (phases.length > 0) {
    lines.push('');
    lines.push('Top phases:');
    for (const phase of phases) {
      // Use mapped display name if available, otherwise fall back to raw name
      const phaseName = PHASE_DISPLAY_NAMES[phase.name] || phase.name;
      const phaseMs = phase.duration.toFixed(0);
      lines.push(`  ${phaseName}: ${phaseMs}ms`);
    }
  }

  lines.push('─'.repeat(40));

  return lines;
}
