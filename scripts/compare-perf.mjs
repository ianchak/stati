#!/usr/bin/env node
/**
 * Compare performance metrics against baseline and generate a report.
 *
 * Usage:
 *   node scripts/compare-perf.mjs [--metrics-dir=.stati/metrics] [--baseline=perf/baselines/benchmark.json] [--output=perf-report.md]
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

// Parse CLI arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    metricsDir: '.stati/metrics',
    baseline: 'perf/baselines/benchmark.json',
    output: 'perf-report.md',
  };

  for (const arg of args) {
    if (arg.startsWith('--metrics-dir=')) {
      options.metricsDir = arg.replace('--metrics-dir=', '');
    } else if (arg.startsWith('--baseline=')) {
      options.baseline = arg.replace('--baseline=', '');
    } else if (arg.startsWith('--output=')) {
      options.output = arg.replace('--output=', '');
    }
  }

  return options;
}

// Load the most recent metrics file from the directory
function loadLatestMetrics(metricsDir) {
  const absDir = join(rootDir, metricsDir);

  if (!existsSync(absDir)) {
    console.error(`Metrics directory not found: ${absDir}`);
    return null;
  }

  const files = readdirSync(absDir)
    .filter((f) => f.endsWith('.json') && f.startsWith('build-'))
    .sort()
    .reverse();

  if (files.length === 0) {
    console.error('No metrics files found');
    return null;
  }

  const latestFile = join(absDir, files[0]);
  console.log(`Loading metrics from: ${latestFile}`);
  return JSON.parse(readFileSync(latestFile, 'utf-8'));
}

// Load benchmark summary from performance tests
function loadBenchmarkSummary(metricsDir) {
  const absDir = join(rootDir, metricsDir);
  const summaryPath = join(absDir, 'benchmark-summary.json');

  if (!existsSync(summaryPath)) {
    console.log('No benchmark summary found');
    return null;
  }

  console.log(`Loading benchmark summary from: ${summaryPath}`);
  return JSON.parse(readFileSync(summaryPath, 'utf-8'));
}

// Load baseline configuration
function loadBaseline(baselinePath) {
  const absPath = join(rootDir, baselinePath);

  if (!existsSync(absPath)) {
    console.error(`Baseline file not found: ${absPath}`);
    return null;
  }

  return JSON.parse(readFileSync(absPath, 'utf-8'));
}

// Extract test results from benchmark summary or metrics files
function extractPerfResults(benchmarkSummary, metrics) {
  const results = {
    coldBuild: null,
    warmBuild: null,
    incrementalBuild: null,
    complexBuild: null,
  };

  // Prefer benchmark summary from perf tests (has aggregated results)
  if (benchmarkSummary) {
    if (benchmarkSummary.coldBuild) {
      results.coldBuild = {
        medianMs: benchmarkSummary.coldBuild.medianMs,
        p95Ms: benchmarkSummary.coldBuild.p95Ms,
      };
    }
    if (benchmarkSummary.warmBuild) {
      results.warmBuild = {
        medianMs: benchmarkSummary.warmBuild.medianMs,
        p95Ms: benchmarkSummary.warmBuild.p95Ms,
        cacheHitRate: benchmarkSummary.warmBuild.cacheHitRate,
      };
    }
    if (benchmarkSummary.incrementalBuild) {
      results.incrementalBuild = {
        medianMs: benchmarkSummary.incrementalBuild.medianMs,
      };
    }
    if (benchmarkSummary.complexBuild) {
      results.complexBuild = {
        medianMs: benchmarkSummary.complexBuild.medianMs,
        p95Ms: benchmarkSummary.complexBuild.p95Ms,
      };
    }
    return results;
  }

  // Fallback: infer from single metrics file
  if (metrics) {
    if (metrics.meta?.flags?.force && metrics.meta?.flags?.clean) {
      results.coldBuild = {
        medianMs: metrics.totals.durationMs,
      };
    } else if (typeof metrics.isg?.cacheHitRate === 'number' && metrics.isg.cacheHitRate >= 0.9) {
      results.warmBuild = {
        medianMs: metrics.totals.durationMs,
        cacheHitRate: metrics.isg.cacheHitRate,
      };
    } else {
      results.incrementalBuild = {
        medianMs: metrics.totals.durationMs,
      };
    }
  }

  return results;
}

// Compare results against baseline
function compareWithBaseline(results, baseline) {
  const comparison = {
    coldBuild: null,
    warmBuild: null,
    incrementalBuild: null,
    complexBuild: null,
    overall: 'pass',
  };

  const thresholds = baseline.thresholds;

  // Cold build comparison
  if (results.coldBuild && thresholds.coldBuild) {
    const threshold = thresholds.coldBuild;
    const maxAllowed = threshold.medianMs * (1 + threshold.tolerance);
    const actual = results.coldBuild.medianMs;
    const status = actual <= maxAllowed ? 'pass' : 'fail';
    const change = ((actual - threshold.medianMs) / threshold.medianMs) * 100;

    comparison.coldBuild = {
      actual,
      baseline: threshold.medianMs,
      maxAllowed,
      change,
      status,
    };

    if (status === 'fail') comparison.overall = 'fail';
  }

  // Warm build comparison
  if (results.warmBuild && thresholds.warmBuild) {
    const threshold = thresholds.warmBuild;
    const maxAllowed = threshold.medianMs * (1 + threshold.tolerance);
    const actual = results.warmBuild.medianMs;
    const status = actual <= maxAllowed ? 'pass' : 'fail';
    const change = ((actual - threshold.medianMs) / threshold.medianMs) * 100;

    comparison.warmBuild = {
      actual,
      baseline: threshold.medianMs,
      maxAllowed,
      change,
      status,
      cacheHitRate: results.warmBuild.cacheHitRate,
      minCacheHitRate: threshold.minCacheHitRate,
      cacheStatus: results.warmBuild.cacheHitRate >= threshold.minCacheHitRate ? 'pass' : 'fail',
    };

    if (status === 'fail' || comparison.warmBuild.cacheStatus === 'fail') {
      comparison.overall = 'fail';
    }
  }

  // Incremental build comparison
  if (results.incrementalBuild && thresholds.incrementalBuild) {
    const threshold = thresholds.incrementalBuild;
    const maxAllowed = threshold.medianMs * (1 + threshold.tolerance);
    const actual = results.incrementalBuild.medianMs;
    const status = actual <= maxAllowed ? 'pass' : 'fail';
    const change = ((actual - threshold.medianMs) / threshold.medianMs) * 100;

    comparison.incrementalBuild = {
      actual,
      baseline: threshold.medianMs,
      maxAllowed,
      change,
      status,
    };

    if (status === 'fail') comparison.overall = 'fail';
  }

  // Complex build comparison
  if (results.complexBuild && thresholds.complexBuild) {
    const threshold = thresholds.complexBuild;
    const maxAllowed = threshold.medianMs * (1 + threshold.tolerance);
    const actual = results.complexBuild.medianMs;
    const status = actual <= maxAllowed ? 'pass' : 'fail';
    const change = ((actual - threshold.medianMs) / threshold.medianMs) * 100;

    comparison.complexBuild = {
      actual,
      baseline: threshold.medianMs,
      maxAllowed,
      change,
      status,
    };

    if (status === 'fail') comparison.overall = 'fail';
  }

  return comparison;
}

// Format duration for display
function formatDuration(ms) {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

// Format change percentage
function formatChange(change) {
  const sign = change >= 0 ? '+' : '';
  return `${sign}${change.toFixed(1)}%`;
}

// Get status emoji
function getStatusEmoji(status) {
  return status === 'pass' ? '✅' : '❌';
}

// Generate markdown report
function generateReport(metricsOrSummary, comparison, baseline) {
  const lines = [];

  // Header
  lines.push('## 📊 Performance Report');
  lines.push('');

  // Overall status
  const overallEmoji = comparison.overall === 'pass' ? '✅' : '❌';
  lines.push(
    `**Status:** ${overallEmoji} ${comparison.overall === 'pass' ? 'All benchmarks passed' : 'Some benchmarks failed'}`,
  );
  lines.push('');

  // Build info
  if (metricsOrSummary) {
    lines.push('### Build Info');
    lines.push('');
    // Handle both metrics format and benchmark summary format
    const nodeVersion =
      metricsOrSummary.meta?.nodeVersion || metricsOrSummary.nodeVersion || 'unknown';
    const platform = metricsOrSummary.meta?.platform || metricsOrSummary.platform || 'unknown';
    const gitCommit = metricsOrSummary.meta?.gitCommit?.substring(0, 7);
    const gitBranch = metricsOrSummary.meta?.gitBranch;

    if (gitCommit) lines.push(`- **Commit:** \`${gitCommit}\``);
    if (gitBranch) lines.push(`- **Branch:** \`${gitBranch}\``);
    lines.push(`- **Node:** ${nodeVersion}`);
    lines.push(`- **Platform:** ${platform}`);
    lines.push('');
  }

  // Results table
  lines.push('### Benchmark Results');
  lines.push('');
  lines.push('| Benchmark | Duration | Baseline | Change | Status |');
  lines.push('|-----------|----------|----------|--------|--------|');

  if (comparison.coldBuild) {
    const c = comparison.coldBuild;
    lines.push(
      `| Cold Build | ${formatDuration(c.actual)} | ${formatDuration(c.baseline)} | ${formatChange(c.change)} | ${getStatusEmoji(c.status)} |`,
    );
  }

  if (comparison.warmBuild) {
    const c = comparison.warmBuild;
    lines.push(
      `| Warm Build | ${formatDuration(c.actual)} | ${formatDuration(c.baseline)} | ${formatChange(c.change)} | ${getStatusEmoji(c.status)} |`,
    );
  }

  if (comparison.incrementalBuild) {
    const c = comparison.incrementalBuild;
    lines.push(
      `| Incremental Build | ${formatDuration(c.actual)} | ${formatDuration(c.baseline)} | ${formatChange(c.change)} | ${getStatusEmoji(c.status)} |`,
    );
  }

  if (comparison.complexBuild) {
    const c = comparison.complexBuild;
    lines.push(
      `| Complex Build | ${formatDuration(c.actual)} | ${formatDuration(c.baseline)} | ${formatChange(c.change)} | ${getStatusEmoji(c.status)} |`,
    );
  }

  lines.push('');

  // Thresholds info
  lines.push('<details>');
  lines.push('<summary>📋 Threshold Details</summary>');
  lines.push('');
  lines.push('| Benchmark | Max Allowed | Tolerance |');
  lines.push('|-----------|-------------|-----------|');

  const t = baseline.thresholds;
  lines.push(
    `| Cold Build | ${formatDuration(t.coldBuild.medianMs * (1 + t.coldBuild.tolerance))} | ${(t.coldBuild.tolerance * 100).toFixed(0)}% |`,
  );
  lines.push(
    `| Warm Build | ${formatDuration(t.warmBuild.medianMs * (1 + t.warmBuild.tolerance))} | ${(t.warmBuild.tolerance * 100).toFixed(0)}% |`,
  );
  lines.push(
    `| Incremental Build | ${formatDuration(t.incrementalBuild.medianMs * (1 + t.incrementalBuild.tolerance))} | ${(t.incrementalBuild.tolerance * 100).toFixed(0)}% |`,
  );
  if (t.complexBuild) {
    lines.push(
      `| Complex Build | ${formatDuration(t.complexBuild.medianMs * (1 + t.complexBuild.tolerance))} | ${(t.complexBuild.tolerance * 100).toFixed(0)}% |`,
    );
  }

  lines.push('');
  lines.push('</details>');
  lines.push('');

  // Test scenario descriptions
  const pageCount = metricsOrSummary?.pageCount || 100;
  const complexPageCount = metricsOrSummary?.complexPageCount || 10;

  lines.push('<details>');
  lines.push('<summary>📖 Test Scenario Details</summary>');
  lines.push('');
  lines.push('| Scenario | Description |');
  lines.push('|----------|-------------|');
  lines.push(
    `| **Cold Build** | Full build with no cache. Renders ${pageCount} simple markdown pages + 1 index page. |`,
  );
  lines.push(
    `| **Warm Build** | Rebuild with no file changes. All ${pageCount + 1} pages served from cache. |`,
  );
  lines.push(
    `| **Incremental Build** | Single markdown file modified. Only 1 page re-rendered, ${pageCount} served from cache. |`,
  );
  lines.push(
    `| **Complex Build** | Full build including ${complexPageCount} pages with deeply nested Eta components (hero, grid, cards, footer). Total: ${pageCount + 1 + complexPageCount} pages. |`,
  );
  lines.push('');
  lines.push('</details>');
  lines.push('');

  // Memory usage (if available from full metrics)
  if (metricsOrSummary?.totals) {
    lines.push('<details>');
    lines.push('<summary>🧠 Memory Usage</summary>');
    lines.push('');
    lines.push(
      `- **Peak RSS:** ${(metricsOrSummary.totals.peakRssBytes / 1024 / 1024).toFixed(1)} MB`,
    );
    lines.push(
      `- **Heap Used:** ${(metricsOrSummary.totals.heapUsedBytes / 1024 / 1024).toFixed(1)} MB`,
    );
    lines.push('');
    lines.push('</details>');
  }

  return lines.join('\n');
}

// Main
async function main() {
  const options = parseArgs();

  console.log('Comparing performance metrics against baseline...');
  console.log(`  Metrics dir: ${options.metricsDir}`);
  console.log(`  Baseline: ${options.baseline}`);
  console.log(`  Output: ${options.output}`);

  // Load data
  const benchmarkSummary = loadBenchmarkSummary(options.metricsDir);
  const metrics = loadLatestMetrics(options.metricsDir);
  const baseline = loadBaseline(options.baseline);

  if (!baseline) {
    console.error('Failed to load baseline');
    process.exit(1);
  }

  // Extract results - prefer benchmark summary, fall back to metrics
  let results;
  if (benchmarkSummary || metrics) {
    results = extractPerfResults(benchmarkSummary, metrics);
  } else {
    // Create placeholder results for report generation
    results = {
      coldBuild: null,
      warmBuild: null,
      incrementalBuild: null,
      complexBuild: null,
    };
    console.warn(
      'No benchmark summary or build metrics found. This is expected if performance tests have not been run yet. Generating placeholder report.',
    );
  }

  // Compare
  const comparison = compareWithBaseline(results, baseline);

  // Generate report
  const report = generateReport(metrics || benchmarkSummary, comparison, baseline);

  // Write report
  const outputPath = join(rootDir, options.output);
  writeFileSync(outputPath, report, 'utf-8');
  console.log(`Report written to: ${outputPath}`);

  // Also output to console
  console.log('\n' + report);

  // Exit with appropriate code
  process.exit(comparison.overall === 'pass' ? 0 : 1);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
