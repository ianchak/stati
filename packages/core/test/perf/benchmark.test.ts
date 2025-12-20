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
  pageCount: 100,
  /** Number of complex pages with nested components */
  complexPageCount: 10,
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

  // Create components directory for nested Eta components
  const componentsDir = join(siteDir, '_components');
  mkdirSync(componentsDir, { recursive: true });

  // Create nested Eta components using Stati's partial syntax
  // Components need the guard pattern since they're processed even when not called as partials
  const buttonComponent = `<% if (!stati.props) { %><% return; } %><button class="btn <%= stati.props.variant || 'primary' %>">
  <%= stati.props.text || 'Click me' %>
</button>`;
  writeFileSync(join(componentsDir, 'button.eta'), buttonComponent);

  const cardComponent = `<% if (!stati.props) { %><% return; } %><div class="card">
  <h3><%= stati.props.title %></h3>
  <p><%= stati.props.description %></p>
  <%~ stati.partials.button({ text: stati.props.buttonText || 'Learn more', variant: 'secondary' }) %>
</div>`;
  writeFileSync(join(componentsDir, 'card.eta'), cardComponent);

  const heroComponent = `<% if (!stati.props) { %><% return; } %><section class="hero">
  <h1><%= stati.props.headline %></h1>
  <p><%= stati.props.subheadline %></p>
  <div class="hero-actions">
    <%~ stati.partials.button({ text: 'Get Started', variant: 'primary' }) %>
    <%~ stati.partials.button({ text: 'Learn More', variant: 'outline' }) %>
  </div>
</section>`;
  writeFileSync(join(componentsDir, 'hero.eta'), heroComponent);

  const gridComponent = `<% if (!stati.props) { %><% return; } %><div class="grid">
  <% for (const item of stati.props.items) { %>
    <%~ stati.partials.card({ title: item.title, description: item.description, buttonText: item.cta }) %>
  <% } %>
</div>`;
  writeFileSync(join(componentsDir, 'grid.eta'), gridComponent);

  const navComponent = `<% if (!stati.props) { %><% return; } %><nav class="nav">
  <% for (const link of stati.props.links) { %>
    <a href="<%= link.href %>" class="<%= link.active ? 'active' : '' %>">
      <%= link.label %>
    </a>
  <% } %>
</nav>`;
  writeFileSync(join(componentsDir, 'nav.eta'), navComponent);

  const footerComponent = `<% if (!stati.props) { %><% return; } %><footer class="footer">
  <div class="footer-grid">
    <% for (const section of stati.props.sections) { %>
      <div class="footer-section">
        <h4><%= section.title %></h4>
        <%~ stati.partials.nav({ links: section.links }) %>
      </div>
    <% } %>
  </div>
  <%~ stati.partials.button({ text: 'Back to top', variant: 'ghost' }) %>
</footer>`;
  writeFileSync(join(componentsDir, 'footer.eta'), footerComponent);

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
 * Create complex pages with multiple nested Eta components.
 * Note: Pages must be .md files as Stati only processes markdown as content.
 * The components are called via stati.partials in the markdown's template.
 */
function createComplexFixture(baseDir: string, pageCount: number): void {
  const siteDir = join(baseDir, 'site');

  // Create a complex layout that uses nested components
  const complexLayoutContent = `<!DOCTYPE html>
<html>
<head>
  <title><%= stati.page.title ? \`\${stati.page.title} | Test Site\` : 'Test Site' %></title>
</head>
<body>
  <%~ stati.partials.hero({
    headline: stati.page.title || 'Welcome',
    subheadline: stati.page.description || 'A complex page'
  }) %>
  <%~ stati.partials.grid({
    items: [
      { title: 'Feature 1', description: 'Description for feature 1', cta: 'Explore' },
      { title: 'Feature 2', description: 'Description for feature 2', cta: 'Discover' },
      { title: 'Feature 3', description: 'Description for feature 3', cta: 'Learn' },
      { title: 'Feature 4', description: 'Description for feature 4', cta: 'Try it' },
      { title: 'Feature 5', description: 'Description for feature 5', cta: 'Get started' },
      { title: 'Feature 6', description: 'Description for feature 6', cta: 'View more' }
    ]
  }) %>
  <main>
    <%~ stati.content %>
  </main>
  <div class="cards-row">
    <%~ stati.partials.card({ title: 'Card A', description: 'Standalone card A', buttonText: 'Click A' }) %>
    <%~ stati.partials.card({ title: 'Card B', description: 'Standalone card B', buttonText: 'Click B' }) %>
  </div>
  <%~ stati.partials.footer({
    sections: [
      {
        title: 'Company',
        links: [
          { href: '/about', label: 'About', active: false },
          { href: '/careers', label: 'Careers', active: false },
          { href: '/contact', label: 'Contact', active: false }
        ]
      },
      {
        title: 'Resources',
        links: [
          { href: '/docs', label: 'Documentation', active: false },
          { href: '/blog', label: 'Blog', active: false },
          { href: '/support', label: 'Support', active: false }
        ]
      }
    ]
  }) %>
</body>
</html>`;
  writeFileSync(join(siteDir, 'complex-layout.eta'), complexLayoutContent);

  // Create complex markdown pages that use the complex layout
  for (let i = 0; i < pageCount; i++) {
    const complexPageContent = `---
title: Complex Page ${i}
description: Complex page with nested components
layout: complex-layout
---

# Complex Page ${i}

This is a complex page that uses nested Eta components via the layout.

## Content Section

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
`;
    writeFileSync(join(siteDir, `complex-${i}.md`), complexPageContent);
  }
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
  complexPageCount: number;
  coldBuild?: { medianMs: number; p95Ms: number };
  warmBuild?: { medianMs: number; p95Ms: number; cacheHitRate: number };
  incrementalBuild?: { medianMs: number };
  complexBuild?: { medianMs: number; p95Ms: number };
}

const benchmarkResults: BenchmarkSummary = {
  timestamp: new Date().toISOString(),
  nodeVersion: process.version,
  platform: process.platform,
  pageCount: BENCHMARK_CONFIG.pageCount,
  complexPageCount: BENCHMARK_CONFIG.complexPageCount,
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
    'should measure complex build performance with nested components',
    async () => {
      // Add complex pages with nested Eta components to the fixture
      createComplexFixture(testDir, BENCHMARK_CONFIG.complexPageCount);

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

        // Total pages should include at least the base pages + complex pages
        // Base: pageCount + 1 (index), Complex: complexPageCount
        const minExpectedPages = BENCHMARK_CONFIG.pageCount + 1 + BENCHMARK_CONFIG.complexPageCount;
        expect(result.cacheMisses).toBeGreaterThanOrEqual(minExpectedPages);
      }

      const medianDuration = median(durations);
      const p95Duration = p95(durations);

      // Record results for summary
      benchmarkResults.complexBuild = {
        medianMs: medianDuration,
        p95Ms: p95Duration,
      };

      console.warn(
        `[PERF] Complex build (${BENCHMARK_CONFIG.complexPageCount} nested component pages): median=${medianDuration.toFixed(0)}ms, p95=${p95Duration.toFixed(0)}ms`,
      );

      // Complex builds should complete in reasonable time
      expect(medianDuration).toBeLessThan(15000); // 15 seconds max
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
      // Page count may include complex pages if that test ran before this one
      expect(result.buildMetrics!.pageTimings!.length).toBeGreaterThanOrEqual(
        BENCHMARK_CONFIG.pageCount + 1,
      );

      // Verify page timing structure
      const firstTiming = result.buildMetrics!.pageTimings![0];
      expect(firstTiming).toHaveProperty('url');
      expect(firstTiming).toHaveProperty('durationMs');
      expect(firstTiming).toHaveProperty('cached');
    },
    BENCHMARK_CONFIG.timeout,
  );
});
