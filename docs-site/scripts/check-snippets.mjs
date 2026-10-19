/**
 * Type-checks the TypeScript config snippets shown on the homepage against
 * the installed @stati/core types, so a copyable example can't drift from
 * the real API.
 *
 * Snippets live in site/index.md front matter. A full module (one with
 * `defineConfig(`) is checked as written, with the import added if missing.
 * A fragment such as `isg: { ... }` is wrapped in `defineConfig({ ... })`.
 * Panels labelled "(excerpt)" may leave out the required `site` block; the
 * check fills it in. Every other snippet must be a complete config.
 *
 * Usage: node scripts/check-snippets.mjs
 */
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { load } from 'js-yaml';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const IMPORT = "import { defineConfig } from '@stati/core';";
const SITE = "site: { title: 'Excerpt', baseUrl: 'https://example.com' },";

// The homepage's front matter: the YAML between its first two --- lines
const homepage = await readFile(join(root, 'site/index.md'), 'utf8');
const frontMatter = /^---\r?\n([\s\S]*?)\r?\n---/.exec(homepage);
if (!frontMatter) {
  throw new Error('site/index.md has no front matter');
}
const data = load(frontMatter[1]) ?? {};

const isExcerpt = (file) => String(file).includes('(excerpt)');

/** Every TypeScript config snippet on the homepage, with where it came from. */
const snippets = [];
if (data.hero?.config) {
  snippets.push({ label: 'hero.config', code: data.hero.config, excerpt: false });
}
for (const claim of data.claims?.items ?? []) {
  claim.panels?.forEach((panel, i) => {
    if (panel.lang === 'typescript') {
      snippets.push({
        label: `claims.${claim.id}.panels[${i}]`,
        code: panel.code,
        excerpt: isExcerpt(panel.file),
      });
    }
  });
}
if (data.dogfood?.code) {
  snippets.push({
    label: 'dogfood.code',
    code: data.dogfood.code,
    excerpt: isExcerpt(data.dogfood.file),
  });
}

function toModule({ code, excerpt }) {
  const site = excerpt && !/^\s*site:/m.test(code) ? `${SITE}\n` : '';
  if (code.includes('defineConfig(')) {
    const body = code.replace('defineConfig({', `defineConfig({\n${site}`);
    return body.includes('@stati/core') ? body : `${IMPORT}\n${body}`;
  }
  return `${IMPORT}\nexport default defineConfig({\n${site}${code}\n});\n`;
}

// Inside docs-site so module resolution finds the installed @stati/core
const dir = await mkdtemp(join(root, '.snippets-'));
try {
  const files = [];
  for (const [i, snippet] of snippets.entries()) {
    const file = join(dir, `snippet-${i}.ts`);
    await writeFile(file, `// ${snippet.label}\n${toModule(snippet)}`);
    files.push(file);
  }

  const tsc = join(root, 'node_modules', 'typescript', 'bin', 'tsc');
  const result = spawnSync(
    process.execPath,
    [
      tsc,
      // The snippets are checked with the options below, not docs-site's tsconfig.json
      '--ignoreConfig',
      '--noEmit',
      '--strict',
      '--skipLibCheck',
      '--target',
      'ES2022',
      '--module',
      'ESNext',
      '--moduleResolution',
      'bundler',
      ...files,
    ],
    { cwd: root, encoding: 'utf8' },
  );

  if (result.status !== 0) {
    console.error(result.stdout || result.stderr);
    console.error(`Homepage snippets failed to type-check (${snippets.length} checked).`);
    process.exitCode = 1;
  } else {
    console.log(
      `All ${snippets.length} homepage TypeScript snippets type-check against @stati/core.`,
    );
  }
} finally {
  await rm(dir, { recursive: true, force: true });
}
