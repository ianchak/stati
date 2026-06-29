/**
 * Dev-server REAL rebuild-time repro.
 *
 * Unlike dev-server-leak.test.ts (which drives build() directly), this boots the
 * actual createDevServer() so all dev-only machinery participates: chokidar
 * watchers, TS esbuild watch contexts, WebSocket server, manifest load/save and
 * the handleTemplateChange path. The reported user symptom is rebuild time that
 * creeps upward across consecutive layout.eta edits AND worsens with idle time.
 *
 * This test edits layout.eta repeatedly, sleeps between edits, and captures the
 * "pages rebuilt in Xms" duration the dev server logs. It asserts the late
 * window is not dramatically slower than the early window.
 *
 * Run: npx vitest run packages/core/test/perf/dev-server-rebuild.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { setTimeout as sleep } from 'node:timers/promises';
import { createDevServer } from '../../src/core/dev.js';
import { setEnv } from '../../src/env.js';

const PAGES = 40;
const EDITS = 24;
const IDLE_MS = 700;

function createCapturingLogger(durations: number[]) {
  const noop = () => {};
  return {
    info: (msg?: string) => {
      if (typeof msg === 'string') {
        const m = msg.match(/in (\d+)ms/);
        if (m) durations.push(Number(m[1]));
      }
    },
    success: noop,
    warning: noop,
    error: noop,
    status: noop,
    building: noop,
    processing: noop,
    stats: noop,
    startProgress: noop,
    updateProgress: noop,
    endProgress: noop,
  };
}

function fixture(base: string): void {
  const site = join(base, 'site');
  const pub = join(base, 'public');
  const partials = join(site, '_partials');
  mkdirSync(partials, { recursive: true });
  mkdirSync(pub, { recursive: true });
  const big = Array.from(
    { length: 60 },
    (_, k) => `## H ${k}\n\nLorem ipsum dolor sit amet ${k}. \n\n\`\`\`js\nconst x=${k};\n\`\`\`\n`,
  ).join('\n');
  for (let i = 0; i < PAGES; i++) {
    writeFileSync(
      join(site, `page-${i}.md`),
      `---\ntitle: Page ${i}\n---\n\n# Page ${i}\n\n${big}\n`,
    );
  }
  writeFileSync(join(site, 'index.md'), `---\ntitle: Home\n---\n\n# Home\n`);
  for (let p = 0; p < 12; p++) {
    writeFileSync(join(partials, `p${p}.eta`), `<div>partial ${p} <%= stati.page.title %></div>`);
  }
  writeFileSync(join(partials, 'header.eta'), `<header>hdr</header>`);
  writeFileSync(join(pub, 'styles.css'), 'body{margin:0}');
  writeFileSync(
    join(base, 'stati.config.js'),
    `export default { site: { title: 'Repro', baseUrl: 'https://x.test' }, srcDir: 'site', outDir: 'dist', staticDir: 'public', search: { enabled: true } };\n`,
  );
}

function layout(site: string, n: number): void {
  writeFileSync(
    join(site, 'layout.eta'),
    `<!DOCTYPE html><html><head><title><%= stati.page.title %> r${n}</title></head><body><main><%~ stati.content %></main><!-- r${n} --></body></html>`,
  );
}

const median = (v: number[]) => {
  const s = [...v].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)] ?? 0;
};

describe('Dev server real rebuild creep', () => {
  let dir: string;
  let cwd: string;
  let server: Awaited<ReturnType<typeof createDevServer>>;
  const durations: number[] = [];

  beforeAll(async () => {
    dir = join(tmpdir(), `stati-devrepro-${randomUUID()}`);
    mkdirSync(dir, { recursive: true });
    fixture(dir);
    layout(join(dir, 'site'), 0);
    cwd = process.cwd();
    process.chdir(dir);
    setEnv('development');
    server = await createDevServer({
      port: 4599,
      host: '127.0.0.1',
      logger: createCapturingLogger(durations),
    });
    await server.start();
  });

  afterAll(async () => {
    await server.stop();
    process.chdir(cwd);
    setEnv('test');
    if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
  });

  it('does not slow down across many layout edits with idle gaps', async () => {
    const site = join(dir, 'site');
    durations.length = 0;
    for (let i = 1; i <= EDITS; i++) {
      const before = durations.length;
      layout(site, i);
      // wait for rebuild to be reported
      for (let t = 0; t < 100 && durations.length === before; t++) await sleep(50);
      await sleep(IDLE_MS);
    }
    const w = Math.max(2, Math.floor(durations.length / 4));
    const early = median(durations.slice(0, w));
    const late = median(durations.slice(-w));
    console.warn(
      `[DEVREPRO] n=${durations.length} early=${early}ms late=${late}ms all=${durations.join(',')}`,
    );
    expect(late).toBeLessThan(early * 1.6);
  }, 120000);
});
