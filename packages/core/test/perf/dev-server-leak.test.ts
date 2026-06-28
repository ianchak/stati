/**
 * Dev-server leak / rebuild-time accumulation regression tests.
 *
 * These tests simulate a long dev session by repeatedly editing the site the way
 * a developer would: mostly markdown content edits, with periodic template/layout
 * and static-asset edits. The template path re-renders nearly every page and is
 * the heaviest; markdown/static edits reuse the engines. A leak shows up as:
 *   - monotonically increasing rebuild time, and/or
 *   - monotonically increasing live heap after a forced GC.
 *
 * The fix (reusing the markdown-it + Eta engines across rebuilds) keeps both
 * flat. These tests assert that flatness so the regression cannot silently
 * return.
 *
 * Run locally / in CI with accurate heap detection:
 *   npm run test:dev-leak
 * This test is excluded from the default Vitest config and runs via
 * `vitest.leak.config.ts`, which uses fork `execArgv: ['--expose-gc']`.
 * Without `--expose-gc`, heap assertions are skipped and only rebuild-time
 * stability is checked.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { setTimeout as sleep } from 'node:timers/promises';
import { build } from '../../src/core/build.js';
import { clearTemplateEngineCache } from '../../src/core/templates.js';
import { clearMarkdownProcessorCache } from '../../src/core/markdown.js';
import { setEnv } from '../../src/env.js';

const LEAK_CONFIG = {
  /** Pages to render each rebuild (more pages = clearer signal) */
  pageCount: 40,
  /** Warmup rebuilds before measuring */
  warmupRebuilds: 5,
  /** Measured rebuilds */
  rebuilds: 100,
  /** Test timeout */
  timeout: 180000,
  /** Max acceptable heap growth across the whole session, in MB (gc available) */
  maxHeapGrowthMb: 25,
  /** Max ratio of late-window rebuild time vs early-window rebuild time */
  maxRebuildTimeRatio: 1.6,
};

function createSilentLogger() {
  return {
    info: () => {},
    success: () => {},
    warning: () => {},
    error: () => {},
    status: () => {},
    building: () => {},
    processing: () => {},
    stats: () => {},
  };
}

function createTestFixture(baseDir: string, pageCount: number): void {
  const siteDir = join(baseDir, 'site');
  const publicDir = join(baseDir, 'public');
  const partialsDir = join(siteDir, '_partials');
  mkdirSync(siteDir, { recursive: true });
  mkdirSync(publicDir, { recursive: true });
  mkdirSync(partialsDir, { recursive: true });

  // A header partial so layout edits cascade through partial compilation too.
  writeFileSync(
    join(partialsDir, 'header.eta'),
    `<% if (!stati.props) { %><% return; } %><header><%= stati.props.title || 'Site' %></header>`,
  );

  for (let i = 0; i < pageCount; i++) {
    writeFileSync(
      join(siteDir, `page-${i}.md`),
      `---\ntitle: Page ${i}\ndescription: Page number ${i}\n---\n\n# Page ${i}\n\nLorem ipsum dolor sit amet.\n\n## Section\n\nMore content here.\n`,
    );
  }
  writeFileSync(join(siteDir, 'index.md'), `---\ntitle: Home\n---\n\n# Home\n`);
  writeFileSync(join(publicDir, 'styles.css'), 'body { margin: 0; }');

  writeFileSync(
    join(baseDir, 'stati.config.js'),
    `export default { site: { title: 'Leak Test', baseUrl: 'https://test.example.com' }, srcDir: 'site', outDir: 'dist', staticDir: 'public' };\n`,
  );
}

function writeLayout(siteDir: string, marker: number): void {
  // Each marker change forces a real recompile + full re-render of all pages,
  // mirroring the heaviest dev-server edit path.
  writeFileSync(
    join(siteDir, 'layout.eta'),
    `<!DOCTYPE html>
<html>
<head><title><%= stati.page.title %> | rev ${marker}</title></head>
<body>
  <%~ stati.partials.header({ title: 'rev ${marker}' }) %>
  <main><%~ stati.content %></main>
  <footer>rev ${marker}</footer>
</body>
</html>`,
  );
}

function writeMarkdown(siteDir: string, page: number, marker: number): void {
  // A typical content edit: single page, no template recompile needed.
  writeFileSync(
    join(siteDir, `page-${page}.md`),
    `---\ntitle: Page ${page}\ndescription: Page number ${page}\n---\n\n# Page ${page}\n\nLorem ipsum dolor sit amet (rev ${marker}).\n\n## Section\n\nMore content here.\n`,
  );
}

function writeStatic(publicDir: string, marker: number): void {
  // A static asset edit triggers a full rebuild + asset copy.
  writeFileSync(join(publicDir, 'styles.css'), `body { margin: ${marker % 4}px; }`);
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

/** Force GC if exposed; returns true when GC was actually run. */
async function forceGc(): Promise<boolean> {
  const gc = (globalThis as { gc?: () => void }).gc;
  if (!gc) return false;
  gc();
  await sleep(0);
  gc();
  return true;
}

describe('Dev server rebuild leak regression', () => {
  let testDir: string;
  let originalCwd: string;

  beforeAll(() => {
    testDir = join(tmpdir(), `stati-leak-${randomUUID()}`);
    mkdirSync(testDir, { recursive: true });
    createTestFixture(testDir, LEAK_CONFIG.pageCount);
    writeLayout(join(testDir, 'site'), 0);
    originalCwd = process.cwd();
    process.chdir(testDir);
    setEnv('development');
  });

  afterAll(() => {
    process.chdir(originalCwd);
    clearTemplateEngineCache();
    clearMarkdownProcessorCache();
    setEnv('test');
    if (existsSync(testDir)) rmSync(testDir, { recursive: true, force: true });
  });

  it(
    'keeps rebuild time and heap flat across a realistic mixed-edit session',
    async () => {
      const siteDir = join(testDir, 'site');
      const publicDir = join(testDir, 'public');

      // Warm cache + engines.
      await build({ clean: true, force: true, logger: createSilentLogger() });

      const durations: number[] = [];
      const heaps: number[] = [];
      const gcAvailable = await forceGc();

      for (let i = 0; i < LEAK_CONFIG.warmupRebuilds + LEAK_CONFIG.rebuilds; i++) {
        // Mirror a real dev session: mostly markdown edits, periodic template
        // and static-asset edits. Template edits clear the engine cache exactly
        // like the dev server does; markdown/static edits reuse the engine.
        let force = false;
        if (i % 7 === 0) {
          writeLayout(siteDir, i + 1);
          clearTemplateEngineCache();
          force = true;
        } else if (i % 11 === 0) {
          writeStatic(publicDir, i + 1);
        } else {
          writeMarkdown(siteDir, i % LEAK_CONFIG.pageCount, i + 1);
        }

        const start = performance.now();
        await build({ force, logger: createSilentLogger() });
        const elapsed = performance.now() - start;

        if (i >= LEAK_CONFIG.warmupRebuilds) {
          durations.push(elapsed);
          if (gcAvailable) {
            await forceGc();
            heaps.push(process.memoryUsage().heapUsed / 1024 / 1024);
          }
        }
      }

      const window = Math.max(3, Math.floor(durations.length / 5));
      const earlyMedian = median(durations.slice(0, window));
      const lateMedian = median(durations.slice(-window));

      console.warn(
        `[LEAK] rebuilds early=${earlyMedian.toFixed(0)}ms late=${lateMedian.toFixed(0)}ms gc=${gcAvailable}`,
      );

      // Rebuild time must not creep upward over the session.
      expect(lateMedian).toBeLessThan(earlyMedian * LEAK_CONFIG.maxRebuildTimeRatio);

      if (gcAvailable && heaps.length > 0) {
        const heapGrowth = heaps[heaps.length - 1]! - heaps[0]!;
        console.warn(`[LEAK] heap growth=${heapGrowth.toFixed(1)}MB over ${heaps.length} rebuilds`);
        expect(heapGrowth).toBeLessThan(LEAK_CONFIG.maxHeapGrowthMb);
      } else {
        console.warn('[LEAK] --expose-gc not set; skipping heap assertion');
      }
    },
    LEAK_CONFIG.timeout,
  );
});
