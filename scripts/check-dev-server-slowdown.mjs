import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';
import { createDevServer } from '../packages/core/dist/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, '..');
const docsSiteDir = join(repoRoot, 'docs-site');
const layoutPath = join(docsSiteDir, 'site', 'layout.eta');

const ITERATIONS = Number(process.env.STATI_DEV_CHECK_EDITS || '20');
const IDLE_MS = Number(process.env.STATI_DEV_CHECK_IDLE_MS || '700');
const PORT = Number(process.env.STATI_DEV_CHECK_PORT || '4789');
const HOST = process.env.STATI_DEV_CHECK_HOST || '127.0.0.1';
const MAX_RATIO = Number(process.env.STATI_DEV_CHECK_MAX_RATIO || '1.25');
const REPORT_PATH = process.env.STATI_DEV_CHECK_REPORT_PATH || '';

function median(values) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] || 0;
}

function formatMs(value) {
  return `${value}ms`;
}

function formatRatio(value) {
  if (!Number.isFinite(value)) return 'n/a';
  return `${value.toFixed(2)}x`;
}

function formatChange(early, late) {
  const delta = late - early;
  const percent = early > 0 ? (delta / early) * 100 : 0;
  const deltaPrefix = delta >= 0 ? '+' : '';
  const percentPrefix = percent >= 0 ? '+' : '';
  return `${deltaPrefix}${delta}ms (${percentPrefix}${percent.toFixed(1)}%)`;
}

function buildReport({
  iterations,
  validCount,
  idleMs,
  early,
  late,
  ratio,
  threshold,
  cssWatcherDisabled,
  wsReloadDisabled,
  passed,
  reason,
}) {
  return {
    iterations,
    validCount,
    idleMs,
    early,
    late,
    ratio,
    threshold,
    cssWatcherDisabled,
    wsReloadDisabled,
    passed,
    reason,
    rows: [
      ['Result', passed ? 'PASS' : 'FAIL'],
      ['Edits completed', `${validCount}/${iterations}`],
      ['Idle between edits', formatMs(idleMs)],
      ['Early median', formatMs(early)],
      ['Late median', formatMs(late)],
      ['Change', formatChange(early, late)],
      ['Ratio', formatRatio(ratio)],
      ['Threshold', `${threshold.toFixed(2)}x`],
      ['CSS watcher', cssWatcherDisabled ? 'disabled' : 'enabled'],
      ['WS reload', wsReloadDisabled ? 'disabled' : 'enabled'],
    ],
  };
}

function printReport(report) {
  const { rows, reason } = report;
  const labelWidth = Math.max(...rows.map(([label]) => label.length), 18);

  console.log('Dev server rebuild slowdown check');
  console.log('');
  for (const [label, value] of rows) {
    console.log(`${label.padEnd(labelWidth)} : ${value}`);
  }
  if (reason) {
    console.log('');
    console.log(`Reason${' '.repeat(labelWidth - 6)} : ${reason}`);
  }
}

function escapeMarkdown(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

function renderReportMarkdown(report) {
  const statusEmoji = report.passed ? 'PASS' : 'FAIL';
  const feedbackLine = report.passed
    ? 'Feedback: no slowdown detected.'
    : `Feedback: slowdown detected and this check failed because ${report.reason}.`;
  const lines = [
    '## Dev Server Slowdown Check',
    '',
    `Status: **${statusEmoji}**`,
    '',
    feedbackLine,
    '',
    '| Metric | Value |',
    '| --- | --- |',
  ];

  for (const [label, value] of report.rows) {
    lines.push(`| ${escapeMarkdown(label)} | ${escapeMarkdown(value)} |`);
  }

  if (report.reason) {
    lines.push('', `Reason: ${escapeMarkdown(report.reason)}`);
  }

  lines.push('', `Generated at: ${new Date().toISOString()}`);
  return lines.join('\n');
}

async function waitForDurationCount(durations, beforeCount, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (durations.length > beforeCount) return true;
    await sleep(50);
  }
  return false;
}

async function main() {
  const originalCwd = process.cwd();
  const originalLayout = await readFile(layoutPath, 'utf-8');
  const reportPath = REPORT_PATH ? join(repoRoot, REPORT_PATH) : '';
  const durations = [];
  const marks = [];

  const logger = {
    info: (msg) => {
      if (typeof msg !== 'string') return;
      const pagesMatch = msg.match(/pages rebuilt in (\d+)ms/);
      if (pagesMatch) {
        durations.push(Number(pagesMatch[1]));
        return;
      }
      const doneMatch = msg.match(/Done in (\d+)ms/);
      if (doneMatch) {
        durations.push(Number(doneMatch[1]));
      }
    },
    success: () => {},
    warning: (msg) => {
      if (msg) console.log(`[WARN] ${msg}`);
    },
    error: (msg) => {
      if (msg) console.log(`[ERROR] ${msg}`);
    },
    status: (msg) => {
      if (msg) console.log(`[STATUS] ${msg}`);
    },
    building: () => {},
    processing: () => {},
    stats: () => {},
    startProgress: () => {},
    updateProgress: () => {},
    endProgress: () => {},
  };

  process.chdir(docsSiteDir);
  const server = await createDevServer({ port: PORT, host: HOST, logger });

  try {
    await server.start();
    await sleep(1000);

    for (let i = 1; i <= ITERATIONS; i++) {
      const beforeCount = durations.length;
      const marker = `\n<!-- check-layout-edit-${i}-${Date.now()} -->\n`;
      await writeFile(layoutPath, originalLayout + marker, 'utf-8');

      const rebuilt = await waitForDurationCount(durations, beforeCount);
      const lastDuration = durations[durations.length - 1] || -1;
      const rssMb = Math.round(process.memoryUsage().rss / 1024 / 1024);
      marks.push({ i, rebuilt, durationMs: lastDuration, rssMb });

      if (!rebuilt) {
        console.log(`[CHECK] edit #${i}: timeout waiting for rebuild`);
        break;
      }

      console.log(`[CHECK] #${i} ${lastDuration}ms rss=${rssMb}MB`);
      await sleep(IDLE_MS);
    }

    const valid = marks.filter((m) => m.rebuilt).map((m) => m.durationMs);
    const sampleWindow = Math.max(2, Math.floor(valid.length / 4));
    const early = median(valid.slice(0, sampleWindow));
    const late = median(valid.slice(-sampleWindow));
    const ratio = early > 0 ? late / early : Number.POSITIVE_INFINITY;
    const cssWatcherDisabled = process.env.STATI_DEV_DISABLE_CSS_WATCHER === '1';
    const wsReloadDisabled = process.env.STATI_DEV_DISABLE_WS_RELOAD === '1';
    const reason =
      valid.length < 4
        ? `only ${valid.length} rebuild sample(s) were collected`
        : ratio > MAX_RATIO
          ? `late median is ${formatRatio(ratio)} of early median, above the ${MAX_RATIO.toFixed(2)}x threshold`
          : '';
    const passed = reason === '';

    const report = buildReport({
      iterations: ITERATIONS,
      validCount: valid.length,
      idleMs: IDLE_MS,
      early,
      late,
      ratio,
      threshold: MAX_RATIO,
      cssWatcherDisabled,
      wsReloadDisabled,
      passed,
      reason,
    });

    printReport(report);

    if (reportPath) {
      await writeFile(reportPath, `${renderReportMarkdown(report)}\n`, 'utf-8');
    }

    if (!passed) {
      process.exitCode = 1;
    }
  } finally {
    await writeFile(layoutPath, originalLayout, 'utf-8');
    await server.stop();
    process.chdir(originalCwd);
  }
}

main().catch((error) => {
  console.error('[CHECK] failed', error);
  process.exitCode = 1;
});
