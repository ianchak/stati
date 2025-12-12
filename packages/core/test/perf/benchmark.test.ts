/**
 * Performance benchmark tests for Stati builds.
 *
 * These tests measure build performance across different scenarios:
 * 1. Cold build: Clean slate, no cache
 * 2. Warm build: No changes, expect high cache hit rate
 * 3. Single markdown change: Expect minimal re-render
 * 4. Template change: Expect dependent pages re-render
 *
 * Run with: npx vitest run packages/core/test/perf
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { existsSync, mkdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { build } from '../../src/core/build.js';
import { setEnv } from '../../src/env.js';

/**
 * Benchmark configuration
 */
const BENCHMARK_CONFIG = {
  /** Number of warmup runs before measuring */
  warmupRuns: 1,
  /** Number of measured runs */
  measuredRuns: 3,
  /** Timeout per test in ms */
  timeout: 60000,
  /** Number of test pages to generate */
  pageCount: 10,
};

/**
 * Simple logger that captures output for tests.
 */
function createSilentLogger() {
  return {
    info: () => {},
    success: () => {},
    warning: () => {},
    error: console.error,
    building: () => {},
    processing: () => {},
    stats: () => {},
  };
}

/**
 * Create a test fixture directory with markdown pages and templates.
 */
function createTestFixture(baseDir: string, pageCount: number): void {
  const siteDir = join(baseDir, 'site');
  const publicDir = join(baseDir, 'public');

  // Create directories
  mkdirSync(siteDir, { recursive: true });
  mkdirSync(publicDir, { recursive: true });

  // Create layout template using Stati's template syntax
  const layoutContent = `<!DOCTYPE html>
<html>
<head>
  <title><%= stati.page.title ? \`\${stati.page.title} | Test Site\` : 'Test Site' %></title>
</head>
<body>
  <nav>Test Navigation</nav>
  <main>
    <%~ stati.content %>
  </main>
  <footer>Test Footer</footer>
</body>
</html>`;
  writeFileSync(join(siteDir, 'layout.eta'), layoutContent);

  // Create markdown pages
  for (let i = 0; i < pageCount; i++) {
    const pageContent = `---
title: Test Page ${i}
description: This is test page number ${i}
---

# Test Page ${i}

This is the content of test page ${i}.

## Section 1

Lorem ipsum dolor sit amet, consectetur adipiscing elit.

## Section 2

More content here.
`;
    writeFileSync(join(siteDir, `page-${i}.md`), pageContent);
  }

  // Create index page
  const indexContent = `---
title: Home
description: Test home page
---

# Welcome

This is the home page.
`;
  writeFileSync(join(siteDir, 'index.md'), indexContent);

  // Create a static asset
  writeFileSync(join(publicDir, 'styles.css'), 'body { margin: 0; }');

  // Create stati config
  const configContent = `export default {
  site: {
    title: 'Test Site',
    baseUrl: 'https://test.example.com',
  },
  srcDir: 'site',
  outDir: 'dist',
  staticDir: 'public',
};
`;
  writeFileSync(join(baseDir, 'stati.config.js'), configContent);
}

/**
 * Calculate median of an array of numbers.
 */
function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

/**
 * Calculate p95 of an array of numbers.
 */
function p95(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil(0.95 * sorted.length) - 1;
  return sorted[Math.max(0, index)]!;
}

/**
 * Benchmark results to be written at the end of the test suite.
 */
interface BenchmarkSummary {
  timestamp: string;
  nodeVersion: string;
  platform: string;
  pageCount: number;
  coldBuild?: { medianMs: number; p95Ms: number };
  warmBuild?: { medianMs: number; p95Ms: number; cacheHitRate: number };
  incrementalBuild?: { medianMs: number };
}

const benchmarkResults: BenchmarkSummary = {
  timestamp: new Date().toISOString(),
  nodeVersion: process.version,
  platform: process.platform,
  pageCount: BENCHMARK_CONFIG.pageCount,
};

/**
 * Write benchmark summary to a file for CI consumption.
 */
function writeBenchmarkSummary(): void {
  const summaryDir = join(process.cwd(), '.stati', 'metrics');
  if (!existsSync(summaryDir)) {
    mkdirSync(summaryDir, { recursive: true });
  }
  const summaryPath = join(summaryDir, 'benchmark-summary.json');
  writeFileSync(summaryPath, JSON.stringify(benchmarkResults, null, 2));
  console.warn(`[PERF] Benchmark summary written to: ${summaryPath}`);
}

describe('Build Performance Benchmarks', () => {
  let testDir: string;
  let originalCwd: string;

  beforeAll(() => {
    // Create unique temp directory
    testDir = join(tmpdir(), `stati-perf-${randomUUID()}`);
    mkdirSync(testDir, { recursive: true });
    createTestFixture(testDir, BENCHMARK_CONFIG.pageCount);

    // Save original cwd and change to test dir
    originalCwd = process.cwd();
    process.chdir(testDir);

    // Set production environment
    setEnv('development'); // Use development to avoid sitemap/RSS generation
  });

  afterAll(() => {
    // Write benchmark summary before cleanup
    process.chdir(originalCwd);
    writeBenchmarkSummary();

    // Clean up test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  beforeEach(() => {
    // Clean cache between tests for consistent measurements
    const cacheDir = join(testDir, '.stati');
    const distDir = join(testDir, 'dist');

    if (existsSync(cacheDir)) {
      rmSync(cacheDir, { recursive: true, force: true });
    }
    if (existsSync(distDir)) {
      rmSync(distDir, { recursive: true, force: true });
    }
  });

  it(
    'should measure cold build performance',
    async () => {
      const durations: number[] = [];

      // Warmup
      for (let i = 0; i < BENCHMARK_CONFIG.warmupRuns; i++) {
        // Clean between warmup runs
        const cacheDir = join(testDir, '.stati');
        const distDir = join(testDir, 'dist');
        if (existsSync(cacheDir)) rmSync(cacheDir, { recursive: true, force: true });
        if (existsSync(distDir)) rmSync(distDir, { recursive: true, force: true });

        await build({
          clean: true,
          force: true,
          logger: createSilentLogger(),
          metrics: { enabled: true },
        });
      }

      // Measured runs
      for (let i = 0; i < BENCHMARK_CONFIG.measuredRuns; i++) {
        // Clean between runs
        const cacheDir = join(testDir, '.stati');
        const distDir = join(testDir, 'dist');
        if (existsSync(cacheDir)) rmSync(cacheDir, { recursive: true, force: true });
        if (existsSync(distDir)) rmSync(distDir, { recursive: true, force: true });

        const result = await build({
          clean: true,
          force: true,
          logger: createSilentLogger(),
          metrics: { enabled: true },
        });

        expect(result.buildMetrics).toBeDefined();
        durations.push(result.buildMetrics!.totals.durationMs);

        // Verify all pages were rendered (no cache hits in cold build)
        expect(result.cacheHits).toBe(0);
        expect(result.cacheMisses).toBe(BENCHMARK_CONFIG.pageCount + 1); // +1 for index
      }

      const medianDuration = median(durations);
      const p95Duration = p95(durations);

      // Record results for summary
      benchmarkResults.coldBuild = {
        medianMs: medianDuration,
        p95Ms: p95Duration,
      };

      console.warn(
        `[PERF] Cold build: median=${medianDuration.toFixed(0)}ms, p95=${p95Duration.toFixed(0)}ms`,
      );

      // Basic sanity check - cold build should complete in reasonable time
      expect(medianDuration).toBeLessThan(10000); // 10 seconds max
    },
    BENCHMARK_CONFIG.timeout,
  );

  it(
    'should measure warm build performance with high cache hit rate',
    async () => {
      // First, do a cold build to populate cache
      await build({
        clean: true,
        force: true,
        logger: createSilentLogger(),
        metrics: { enabled: true },
      });

      const durations: number[] = [];
      const cacheHitRates: number[] = [];

      // Measured runs (warm builds - no changes)
      for (let i = 0; i < BENCHMARK_CONFIG.measuredRuns; i++) {
        const result = await build({
          logger: createSilentLogger(),
          metrics: { enabled: true },
        });

        expect(result.buildMetrics).toBeDefined();
        durations.push(result.buildMetrics!.totals.durationMs);
        cacheHitRates.push(result.buildMetrics!.isg.cacheHitRate);

        // Verify high cache hit rate
        expect(result.buildMetrics!.isg.cacheHitRate).toBeGreaterThanOrEqual(0.9);
      }

      const medianDuration = median(durations);
      const p95Duration = p95(durations);
      const medianCacheHitRate = median(cacheHitRates);

      // Record results for summary
      benchmarkResults.warmBuild = {
        medianMs: medianDuration,
        p95Ms: p95Duration,
        cacheHitRate: medianCacheHitRate,
      };

      console.warn(
        `[PERF] Warm build: median=${medianDuration.toFixed(0)}ms, cacheHitRate=${(medianCacheHitRate * 100).toFixed(1)}%`,
      );

      // Warm builds should be fast and have high cache hit rate
      expect(medianCacheHitRate).toBeGreaterThanOrEqual(0.95);
    },
    BENCHMARK_CONFIG.timeout,
  );

  it(
    'should measure incremental build after single file change',
    async () => {
      // First, do a cold build to populate cache
      await build({
        clean: true,
        force: true,
        logger: createSilentLogger(),
        metrics: { enabled: true },
      });

      const durations: number[] = [];

      // Measured runs
      for (let i = 0; i < BENCHMARK_CONFIG.measuredRuns; i++) {
        // Modify a single markdown file
        const pageFile = join(testDir, 'site', 'page-0.md');
        const originalContent = readFileSync(pageFile, 'utf-8');
        writeFileSync(pageFile, originalContent + `\n\nUpdated at ${Date.now()}\n`);

        const result = await build({
          logger: createSilentLogger(),
          metrics: { enabled: true },
        });

        expect(result.buildMetrics).toBeDefined();
        durations.push(result.buildMetrics!.totals.durationMs);

        // Should have mostly cache hits with only 1 rebuild
        expect(result.cacheMisses).toBe(1);
        expect(result.cacheHits).toBeGreaterThanOrEqual(BENCHMARK_CONFIG.pageCount);
      }

      const medianDuration = median(durations);

      // Record results for summary
      benchmarkResults.incrementalBuild = {
        medianMs: medianDuration,
      };

      console.warn(`[PERF] Single file change: median=${medianDuration.toFixed(0)}ms`);

      // Incremental builds should be fast
      expect(medianDuration).toBeLessThan(5000);
    },
    BENCHMARK_CONFIG.timeout,
  );

  it(
    'should measure build with metrics in detailed mode',
    async () => {
      const result = await build({
        clean: true,
        force: true,
        logger: createSilentLogger(),
        metrics: { enabled: true, detailed: true },
      });

      expect(result.buildMetrics).toBeDefined();
      expect(result.buildMetrics!.pageTimings).toBeDefined();
      expect(result.buildMetrics!.pageTimings!.length).toBe(BENCHMARK_CONFIG.pageCount + 1);

      // Verify page timing structure
      const firstTiming = result.buildMetrics!.pageTimings![0];
      expect(firstTiming).toHaveProperty('url');
      expect(firstTiming).toHaveProperty('durationMs');
      expect(firstTiming).toHaveProperty('cached');
    },
    BENCHMARK_CONFIG.timeout,
  );
});
