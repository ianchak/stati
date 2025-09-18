# Stati SSG — 1.0 Development Roadmap & Implementation Plan

> Goal: ship a **lightweight, TypeScript‑first static site generator** with build‑time ISG in **v1.0**.

---

## 0) Assessment (strengths, risks, unknowns)

**Strengths**

- Clear vision: filesystem‑driven authoring, Markdown‑It + Eta templates.
- Strong ISG plan: TTL + aging + freeze, dirty detection, per‑page overrides.
- Lightweight mindset: TS strict, minimal deps, curated plugins.

**Risks**

- Scope creep vs “lightweight” (plugin explosion, image pipeline too early).
- ISG correctness (cache invalidation bugs are costly).
- Template API stability (breaking changes ripple through example templates).

---

## 1) TL;DR roadmap

**Milestones**

1. **Foundation & DX** (repo, tooling, release infra)
2. **Core SSG pipeline** (content loader → markdown → Eta → output)
3. **FS routing & assets** (collections, permalinks, static/asset copy)
4. **ISG** (cache manifest, TTL/aging/freeze, invalidation CLI)
5. **Templates & scaffolder** (blog, docs, news + `npx create-stati`)
6. **SEO, RSS, sitemap** (opt‑in Tailwind setup in scaffolder)
7. **Docs, examples, CI polish** (readmes, guides, example sites)
8. **v1.0 hardening** (perf, tests, API lock, changelog)

**Principles**

- Keep defaults simple; advanced features are **opt‑in**.
- Make every critical decision documented with trade‑offs.
- Tests first for cache invalidation and rendering determinism.

---

## 2) Deliverables & Definition of Done (v1.0)

- `stati build` produces deterministic output for example sites.
- Incremental builds: default to ISG when cache exists; `--force` triggers a full rebuild without deleting prior cache files; `--clean` wipes the cache folder first, then performs a full rebuild.
- TTL + aging + freeze works and is covered by tests.
- Eta templates + Markdown‑It with curated plugins; shortcodes/partials documented.
- Scaffolder (`create-stati`) generates blog/docs/news starters; Tailwind & SCSS support opt‑in.
- SEO defaults (config‑driven), RSS (Atom) and sitemap generation.
- TS strict, ESLint+Prettier, Vitest coverage on critical paths.
- CI: lint/typecheck/test/build; Changesets for releases; SemVer.
- Docs: README, Getting Started, ISG guide, Template guide, Contributing.
- Minimal dev server: `stati dev` serves the built site, watches site folder, performs incremental rebuilds of affected pages using the ISG graph, and triggers full‑page reload (no template HMR in v1.0).

---

## 3) Workstreams & Step‑by‑Step Plan

### 3.1 Foundation & DX (Week 1)

**Repo layout**

```
/ (monorepo optional later)
  /packages
    /stati            # core SSG CLI + build
    /create-stati     # scaffolder (npx)
  /examples
    /blog
    /docs
    /news
```

**Core tooling**

- TypeScript strict; Node 18+ target. Vitest, ESLint, Prettier, Husky (pre‑commit: lint + typecheck).
- Changesets for versioning; GitHub Actions CI.

**Copy‑ready files**

`packages/stati/tsconfig.json`

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "declaration": true,
    "outDir": "dist",
    "types": ["node"],
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true
  },
  "include": ["src/**/*"]
}
```

`tsconfig.base.json`

```json
{
  "compilerOptions": {
    "skipLibCheck": true,
    "resolveJsonModule": true
  }
}
```

`.eslintrc.cjs`

```js
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  ignorePatterns: ['dist', 'coverage'],
};
```

`.github/workflows/ci.yml`

```yaml
name: CI
on:
  push: { branches: [main] }
  pull_request:
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: 'npm' }
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test --workspaces
      - run: npm run build --workspaces
```

`changeset/config.json`

```json
{
  "changelog": ["@changesets/changelog-github", { "repo": "your/repo" }],
  "commit": true,
  "access": "public"
}
```

**Acceptance**: CI green; `npm run build` in `stati` produces a binary; `changeset version` works.

---

### 3.2 Core SSG pipeline (Weeks 1–2)

**Dependencies (lean)**

- `fast-glob`, `fs-extra`, `gray-matter`, `markdown-it`, `eta`, `yargs`.

**Config API** (`stati.config.ts`)

The configuration system provides TypeScript interfaces for all options. Key configuration areas include:

- **Directory Structure**: `srcDir`, `outDir`, `staticDir`
- **Site Metadata**: `site.title`, `site.baseUrl`, `site.defaultLocale`
- **Markdown Processing**: `markdown.configure` function for MarkdownIt setup
- **Template Engine**: `eta.filters` for custom template functions
- **ISG Settings**: `isg.enabled`, `isg.ttlSeconds`, `isg.maxAgeCapDays`, `isg.aging`
- **Build Hooks**: `hooks.beforeAll`, `hooks.afterAll`, `hooks.beforeRender`, `hooks.afterRender`

> **📖 For complete configuration reference, see [Configuration Guide](configuration.md)**

**CLI skeleton**

```ts
// packages/stati/src/cli.ts
#!/usr/bin/env node
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { build } from './core/build';
import { invalidate } from './core/invalidate';

const cli = yargs(hideBin(process.argv))
  .scriptName('stati')
  .command('build', 'Build site', (y)=>y
    .option('force', { type: 'boolean' })
    .option('clean', { type: 'boolean' })
  , async (argv)=>{ await build({ force: !!argv.force, clean: !!argv.clean }); })
  .command('invalidate [query]', 'Invalidate by tag:, path:, glob:, or age:', (y)=>y
    .positional('query', { type: 'string' })
  , async (argv)=>{ await invalidate(argv.query as string|undefined); })
  .demandCommand(1)
  .help();
cli.parse();
```

**Renderer flow**

1. Load config; set dirs.
2. Scan `site/**/*.md` (front‑matter via `gray-matter`).
3. Build `PageModel`: `{ slug, url, fm, content, publishedAt }`.
4. Convert Markdown → HTML (Markdown‑It + plugins) → pass as `body` to Eta layout.
5. Emit to `dist`, copy `public/**`.

**Acceptance**: Example pages render via Eta layouts with front‑matter fields.

---

### 3.3 FS routing, collections & assets (Week 2)

- ✅ Route = file path without extension; `index.md` → `/`
- ✅ **Underscore folder exclusion**: Folders starting with `_` are excluded from routing
- ✅ **Hierarchical partials**: Auto-discover `.eta` files in `_` folders throughout directory tree
- ✅ Collections: `site/blog/**`, `site/docs/**`, `site/news/**` with collection metadata
- ✅ Permalinks via front‑matter or defaults; helper to compute canonical URLs
- ✅ Static assets: copy `public/**` straight; optional hash/fingerprint **(post‑1.0)**
- ✅ **Development server**: `stati dev` with live reload, file watching, and WebSocket communication

**Test**: routes match expected slugs; underscore folders excluded; partials discovered; permalinks respected; static copied; dev server working.

**Status**: ✅ **COMPLETED** - All features implemented including development server with live reload

---

### 3.4 ISG (Weeks 3–4)

**Manifest schema** (`.stati/cache/manifest.json`)

```ts
export interface CacheEntry {
  path: string; // output path
  inputsHash: string; // content + deps fingerprint
  deps: string[]; // referenced files (templates, partials)
  tags: string[]; // arbitrary invalidation tags
  publishedAt?: string; // ISO
  renderedAt: string; // ISO
  ttlSeconds: number; // effective ttl
  maxAgeCapDays?: number; // freeze cap
}
export interface CacheManifest {
  entries: Record<string, CacheEntry>;
}
```

**Rules**

- Default mode: if prior cache exists → incremental; else full build.
- Rebuild a page if:
  - Inputs changed (content or deps hash mismatch), or
  - TTL expired **and** page not frozen, or
  - Page invalidated by tag/path.
- `--force` forces full rebuild; `--clean` wipes cache first.
- Per‑page overrides (front‑matter): `ttlSeconds`, `maxAgeCapDays`, `tags`, `publishedAt`.

**Invalidation**

- CLI `stati invalidate "tag:news"` or `stati invalidate "path:/blog/2024/hello"` or `stati invalidate "age:3months"`.

**Tests (Vitest)**

- TTL expiry triggers rebuild; after cap, page freezes unless inputs change.
- Template change updates `deps` and causes rebuild of dependents.

---

### 3.5 Templates & scaffolder (Week 5–6)

- Example templates: blog, docs, news with Eta layouts/partials and collection lists.
- `packages/create-stati` (npx): prompts for template + Tailwind opt‑in; writes `stati.config.ts`, content skeleton and scripts.
- Post‑create instructions printed.

**Scaffolder script skeleton**

```ts
#!/usr/bin/env node
import inquirer from 'inquirer';
import { createSite } from './create';

const answers = await inquirer.prompt([
  { name: 'name', message: 'Project name', default: 'my-site' },
  { name: 'template', type: 'list', choices: ['blog', 'docs', 'news'] },
  { name: 'tailwind', type: 'confirm', default: false },
]);
await createSite(answers);
```

---

### 3.6 SEO, RSS, sitemap, draft support (Week 6)

- SEO defaults: title template, description, `og:`/`twitter:` if present in front‑matter.
- RSS (Atom) for blog/news collections; configurable limit; uses site `baseUrl`.
- Sitemap with lastmod from `publishedAt` or file mtime.
- Draft pages (marked with `draft: true` in front matter) are excluded from builds by default. Use `stati build --include-drafts` to include them in the build.

**Acceptance**: Validators pass (W3C XML well‑formed); example feeds load.

---

### 3.7 Docs, examples, CI polish (Week 7)

- README: vision, quick start, config reference, ISG guide.
- CONTRIBUTING: setup, scripts, code style, commit rules.
- Issue/PR templates, labels; basic governance notes.
- Examples wired in CI to build on PRs.

---

### 3.8 v1.0 hardening (Week 8)

- Type surface audit; mark experimental APIs; JSDoc.
- Benchmarks on example sites; cold vs warm build timings.
- Error messages improved (actionable, with codes).
- Final Changeset release; tag `v1.0.0`.

---

## 4) Test Plan (high‑value tests)

- **Rendering determinism**: same input → identical HTML (snapshots ok, but prefer structural checks).
- **ISG TTL/freeze**: simulate time with injected clock; assert rebuild windows.
- **Deps change**: layout/partial change invalidates dependents.
- **Front‑matter overrides**: TTL and tags honored per page.
- **Routing**: path → URL mapping; index edge cases.

Example Vitest for TTL/freeze:

```ts
import { describe, it, expect } from 'vitest';
import { computeNextRebuildAt } from '../src/isg/ttl';

it('freezes after cap', () => {
  const now = new Date('2025-01-01T00:00:00Z');
  const publishedAt = new Date('2023-12-15T00:00:00Z');
  const ttl = 24 * 3600; // 1d
  const cap = 365; // 1y
  const next = computeNextRebuildAt({
    now,
    publishedAt,
    ttlSeconds: ttl,
    maxAgeCapDays: cap,
  });
  expect(next).toEqual(null); // frozen
});
```

---

## 5) CLI surface (v1.0)

```
stati build [--force] [--clean]
stati dev                        # serves site locally
stati invalidate [tag:foo|path:/x|age:3months]
```

Dev server behavior (v1.0):

- Serves from `dist` at http://localhost:PORT with a lightweight server.
- Watches `site/**`, and `public/**`.
- On change: re-render only affected pages when dependencies are known; otherwise fall back to a small batched rebuild.
- Broadcasts a websocket event to trigger a full-page reload in the browser. No template/markdown HMR in v1.0 to keep parity with production builds.

**Config** `stati.config.ts`

```ts
import type { StatiConfig } from 'stati';
const config: StatiConfig = {
  site: { title: 'My Site', baseUrl: 'https://example.com' },
  isg: {
    enabled: true,
    ttlSeconds: 6 * 3600,
    maxAgeCapDays: 365,
    aging: [
      { untilDays: 7, ttlSeconds: 3600 },
      { untilDays: 90, ttlSeconds: 24 * 3600 },
      { untilDays: 365, ttlSeconds: 7 * 24 * 3600 },
    ],
  },
};
export default config;
```

---

## 6) Dependency policy (why these, and no more)

- **markdown-it**: fast, pluggable; we ship a minimal preset (anchors, footnotes opt‑in).
- **eta**: tiny template engine with partials/includes.
- **fast-glob**: cross‑platform globbing.
- **gray-matter**: robust front‑matter parsing.
- **fs-extra**: reliable fs utils.
- **yargs**: small CLI arg parsing.
- **Optional**: Tailwind for starter templates (scaffolder opt‑in).

---

## 7) Governance & Community

- `README` with vision + quick start.
- `CONTRIBUTING` with setup, scripts, PR rules, commit conventions.
- Issue/PR templates with labels (`type:feat`, `type:bug`, `area:isg`).
- Human‑readable changelogs (Changesets).

---

## 8) Risk register & mitigations

- **ISG edge cases**: time travel bugs → use injected clock in ISG module; heavy unit tests.
- **Scope creep**: explicitly defer image pipeline to >1.0; document as future.

---

## 9) Future backlog (post‑1.0)

- Template HMR for Eta/Markdown with fine-grained partial boundaries and module-graph invalidation.
- Asset fingerprinting + minification pipeline.
- Image/asset pipeline.
- Search index generation.
