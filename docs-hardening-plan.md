# Documentation hardening plan

Branch: `docs/harden-documentation` (from `main` at `9c6f57e`). Started 2026-10-25.

Status legend: `[ ]` open, `[x]` done. Verification status: ✅ accurate, ❌ wrong (fix needed), ⚠️ unclear or unverifiable, ✂️ adds no value (cut or tighten).

## A. Executive summary

**Scope.** 59 tracked Markdown files, 22,215 lines, 802 fenced code blocks:

- 48 pages under `docs-site/site/` plus `docs-site/README.md` and `docs-site/public/llms.txt`.
- 10 `README.md` files: root, `packages/{core,cli,create-stati,images}`, `packages/images/fonts`, `examples/{blank,blog,docs,news}`.

Code blocks by language: typescript 209, bash 133, javascript 124, eta 92, html 73, text 66, markdown 59, json 15, (none) 11, yaml 10, css 6, other 4.

**Source of truth.** The monorepo source at `9c6f57e`: `@stati/core` 2.8.0, `@stati/cli` 2.4.0, `create-stati` 2.6.0, `@stati/images` 1.1.0. Docs describe this behavior.

**Two goals, both from the request:**

1. Accuracy: every technical claim matches the implementation, with a source citation.
2. Brevity: remove paragraphs, sentences and sections in `docs-site` that add no value (repetition, filler, restated headings, marketing, content duplicated from another page).

**Success criteria.** Every claim in scope has a status and evidence; every ❌ is fixed and re-verified by an independent pass; ✂️ cuts are applied where they lose no information; the docs site builds with zero warnings, zero broken links and anchors; `npm run check:snippets` passes.

**Method.** The scope is partitioned into 10 clusters (section D). One verification agent per cluster extracts and verifies claims (Phases 2 and 4) and later applies the approved fixes to its own files only (Phase 5). A fresh agent that did not make the edits re-verifies each cluster's diff against the source (Phase 6). The lead (this session) runs the automated checks, reviews every finding before it is applied, resolves cross-cluster terminology, and runs final validation.

## B. Phase breakdown

| Phase | Name                          | Edits? | Owner                     |
| ----- | ----------------------------- | ------ | ------------------------- |
| 0     | Discovery and inventory       | No     | Lead                      |
| 1     | Repository mapping            | No     | Lead                      |
| 2     | Verification matrix setup     | No     | Cluster agents            |
| 3     | Automated checks              | No     | Lead                      |
| 4     | Manual verification           | No     | Cluster agents            |
| 5     | Fixes and edits (5A to 5D)    | Yes    | Cluster agents, lead review |
| 6     | Double-check pass             | No (fixes only) | Fresh review agents, lead |
| 7     | Final validation              | No     | Lead                      |

## C. Detailed phase plans

### Phase 0: Discovery and inventory

- Objectives: list every package, example and doc file, with statistics.
- Inputs: `git ls-files`, package manifests.
- Tasks: [x] enumerate packages; [x] enumerate examples; [x] enumerate doc files; [x] statistics (scratch script `doc-stats.mjs`); [x] baseline build of packages and docs site.
- Outputs: section D.
- Completion: every file in scope is listed with a cluster and priority. **Done.**

### Phase 1: Repository mapping

- Objectives: doc → code and code → docs maps; cross-reference overview.
- Tasks: [x] cluster-level doc → code map (section D2); [x] code → docs map and gaps (D3); [x] cross-references from the link crawl (Phase 3); [ ] per-file refinements reported by the cluster agents (appended in section J).
- Completion: every file answers "what code does this cover"; every source area answers "which docs cover it".

### Phase 2: Verification matrix setup

- Objectives: enumerate every checkable claim per doc file: types, signatures, CLI flags, config properties, defaults, behavior, code and command examples, file paths, cross-references.
- Tasks: each cluster agent numbers its claims `V-Cnn-###` and records them in its matrix (section J).
- Completion: every doc file has its claims listed; the totals are in section I.

### Phase 3: Automated checks

- Objectives: machine-checkable drift before manual work.
- Tasks: [x] link and anchor check of Markdown sources against the build; [x] crawl of all built HTML hrefs and srcs; [x] documented CLI flags vs `cli.ts` and `create-stati/src/index.ts`; [x] documented `@stati/core` imports vs the export barrels; [x] Node and npm requirement consistency; [x] scan for version references; [ ] terminology scan (after Phase 4, from agent reports).
- Outputs: section F and the results below.
- Completion: every automated finding is triaged into section F or dismissed with a reason.

### Phase 4: Manual verification

- Objectives: verify every Phase 2 claim against source (Step A extract, B locate evidence, C cross-check), and flag ✂️ candidates.
- Tasks: one agent per cluster; each writes `findings/Cnn.md` with claim, status, evidence (`path:line`), proposed fix. No edits.
- Completion: every claim has a status and evidence; summary counts per cluster in section I.

### Phase 5: Fixes and edits

- 5A high priority: wrong types, signatures, CLI flags, broken examples.
- 5B medium: wrong config docs, misleading behavior, suboptimal examples.
- 5C low: style, wording, formatting.
- 5D improvements: ✂️ cuts, gaps, clarity.
- Process: the lead reviews each cluster's findings (spot-checking evidence for every ❌), approves or rejects each, then the cluster agent applies the approved items to its own files, re-reads the source after each batch of at most 5 edits, and logs the result.
- Completion: every approved ❌ and ✂️ applied and re-verified; rejected items carry a reason.

### Phase 6: Double-check pass

- Objectives: an independent re-verification of every edited file.
- Tasks: a fresh agent per group of clusters reads `git diff` for its files and checks every changed claim against source, without the original findings; hallucination audit (options, methods, defaults that don't exist); lead re-runs the Phase 3 checks.
- Completion: no unverified claim remains; any new issue is fixed and re-checked.

### Phase 7: Final validation

- Tasks: build packages; `npm run build:local` in `docs-site` (zero warnings); link crawl; `npm run typecheck` and `npm run check:snippets` in `docs-site`; Prettier check of changed files; preview spot-check of 10 to 20 pages; consistency scan; final report (section K).

## D. Inventory

### D1. Files, clusters and priority

Priority: **H** = reference material users copy from (config, CLI, API, getting started); **M** = concept pages and guides; **L** = policy, meta and contributor pages.

| Cluster | Files (lines) | Pri |
| --- | --- | --- |
| C01 CLI and client code | `cli/commands.md` (508), `cli/development.md` (116), `advanced/metrics.md` (321), `configuration/typescript.md` (401), `advanced/using-javascript.md` (1093), `packages/cli/README.md` (367) | H |
| C02 Scaffolder and getting started | `cli/scaffolder.md` (381), `getting-started/installation.md` (158), `getting-started/quick-start.md` (278), `getting-started/project-structure.md` (221), `examples/list.md` (216), `packages/create-stati/README.md` (491), `examples/{blank,blog,docs,news}/README.md` (51, 93, 93, 121) | H |
| C03 Templates | `core-concepts/templates.md` (542), `api/templates.md` (391), `configuration/templates.md` (382), `getting-started/upgrading-to-2.md` (149) | H |
| C04 Content, routing, navigation | `core-concepts/markdown.md` (454), `core-concepts/routing.md` (466), `core-concepts/collections.md` (284), `configuration/markdown.md` (512), `api/navigation.md` (578) | H |
| C05 Config and types | `configuration/file.md` (589), `configuration/site-metadata.md` (449), `api/types.md` (1040), `api/reference.md` (101), `advanced/deploying-to-a-subfolder.md` (146) | H |
| C06 SEO | `configuration/seo.md` (778), `api/seo.md` (1359), `advanced/seo-usage-scenarios.md` (735) | H |
| C07 RSS, search, images | `configuration/rss.md` (574), `api/rss.md` (507), `configuration/search.md` (314), `configuration/images.md` (267), `packages/images/README.md` (126), `packages/images/fonts/README.md` (63) | H |
| C08 Build lifecycle and assets | `core-concepts/isg.md` (342), `configuration/isg.md` (374), `api/hooks.md` (388), `api/error-handling.md` (553), `core-concepts/static-assets.md` (340), `configuration/css.md` (177) | H |
| C09 Overviews | `README.md` (494), `packages/core/README.md` (816), `index.md` (371, homepage front matter rendered by `home.eta` and `partials/home/*`), `getting-started/introduction.md` (79), `core-concepts/overview.md` (118), `faq.md` (100), `glossary.md` (191) | M |
| C10 Guides and meta | `examples/recipes.md` (905), `advanced/troubleshooting.md` (326), `advanced/contributing.md` (543), `advanced/topics.md` (169), `information/ai-policy.md` (91), `404.md` (22), `docs-site/README.md` (42), `docs-site/public/llms.txt` | M/L |

Paths without a prefix are under `docs-site/site/`.

### D2. Doc → code map (cluster level)

| Cluster | Primary source | Tests |
| --- | --- | --- |
| C01 | `packages/cli/src/cli.ts`, `logger.ts`, `tailwind.ts`; `packages/core/src/core/{build,dev,preview,invalidate}.ts`; `metrics/*`; `core/utils/typescript.utils.ts`, `bundle-matching.utils.ts`; `config/loader.ts` (JS configs) | `packages/cli/test/`, `packages/core/test/metrics/`, `typescript.utils.test.ts` |
| C02 | `packages/create-stati/src/*`; `examples/*` | `packages/create-stati/test/` |
| C03 | `core/templates.ts`, `template-render.ts`, `template-index.ts`, `eta-plugin.ts`, `core/utils/template*.utils.ts`, `context-validation.utils.ts`; `types/content.ts` (`TemplateContext`) | `template-composition.test.ts`, `template-index.test.ts`, `templates.test.ts` |
| C04 | `core/content.ts`, `markdown.ts`, `collections.ts`, `expand.ts`, `navigation.ts`, `reading-time.ts`, `utils/navigation-helpers.utils.ts`, `utils/slugify.utils.ts` | `content.test.ts`, `markdown.test.ts`, `navigation*.test.ts`, collections tests |
| C05 | `types/config.ts`, `types/index.ts`, `src/index.ts`, `config/loader.ts`, `config/directories.ts`, `core/base-path-links.ts` | config and loader tests |
| C06 | `seo/*`, `types/seo.ts`, `types/sitemap.ts` | `packages/core/test/seo/` |
| C07 | `rss/*`, `types/rss.ts`, `search/*`, `types/search.ts`, `images/*`, `types/images.ts`, `packages/images/src/*` | rss, search, images tests |
| C08 | `core/isg/*`, `types/isg.ts`, `core/build.ts` (hooks), `utils/error-overlay.utils.ts`, `config/errors.ts`, `css/*`, static copy in `build.ts` | isg, hooks, overlay, css tests |
| C09 | all of the above at summary level; `docs-site/scripts/check-snippets.mjs` (homepage snippets) | — |
| C10 | `package.json` scripts, `.github/workflows/*`, `CONTRIBUTING.md`, recipes cross the whole API | — |

### D3. Code → docs map and gaps

| Source area | Covered by |
| --- | --- |
| `cli.ts` commands and flags | C01 commands, development; C09 READMEs |
| `create-stati` flags and processors | C02 scaffolder, create-stati README |
| Template runtime (`stati.*`) | C03 all; C04 navigation; C10 recipes |
| Content, routing, collections, pagination, generated pages | C04 |
| `StatiConfig` and all config blocks | C05 file, types; each feature page |
| `base-path-links.ts`, `stati.url()` | C05 deploying-to-a-subfolder; C03 api/templates |
| `readingTime` config, `wordCount`/`readingTime` page fields | C04 markdown/collections, C05 file/types (to confirm in Phase 4) |
| `css/*` hashed stylesheets | C08 css, static-assets |
| `images/*`, `@stati/images` | C07 images, images README |
| `metrics/*` | C01 metrics |
| `seo/news-sitemap.ts` | C06 seo (to confirm in Phase 4) |
| `invalidate.ts` queries | C01 commands, C08 isg |
| Public exports in `src/index.ts` | C05 api/reference, types; C06 api/seo; C07 api/rss; C09 core README |

Gaps are reported by the cluster agents and collected in section F.

### D4. Packages and examples

- `packages/core`: engine; entry `src/index.ts` (exports `.`, `./types`, `./config`).
- `packages/cli`: `stati` binary; commands `build`, `dev`, `preview`, `invalidate [query]`.
- `packages/create-stati`: scaffolder; copies `examples/*` from `dist/templates`; styling processors for css, sass, tailwind; TypeScript, images and agent-skill options.
- `packages/images`: `@stati/images`, sharp variants and Satori Open Graph cards behind core's `ImageProvider`.
- `examples/blank`, `blog`, `docs`, `news`: starter templates and integration fixtures.

## E. Verification matrix

Each cluster's full matrix is appended in section J, numbered `V-Cnn-###`. Categories: T types and interfaces, A API functions, L CLI, G configuration, X examples, R cross-references and links, B behavior, ✂️ value. Effort 1 (quick) to 5 (complex).

Automated items (lead):

- [x] V-AUTO-001 Markdown links and anchors in all 59 files resolve. ✅ 0 broken (8 hits were inline code samples, checked by hand: `deploying-to-a-subfolder.md:58`, `images.md:22,32`, `static-assets.md:258,265`, `project-structure.md:59`, `upgrading-to-2.md:30`, `packages/images/README.md:62`).
- [x] V-AUTO-002 Every href and src in 48 built pages resolves, including template links. ✅ 0 problems.
- [x] V-AUTO-003 Documented `stati` flags exist. ✅ All match `packages/cli/src/cli.ts:43-75` (build), `:197-217` (dev), `:313-322` (preview), `:373-380` (invalidate). Other `--x` hits are third-party tools (npm, skills, sass, tailwind, curl) or CSS custom properties.
- [x] V-AUTO-004 Documented `create-stati` flags exist. ✅ All match `packages/create-stati/src/index.ts:76-160`.
- [x] V-AUTO-005 Named imports from `@stati/core` in docs exist in `packages/core/src/index.ts`. ✅ None missing.
- [x] V-AUTO-006 Node requirement consistent with `engines` (`^22.20.0 || >=24`). ⚠️ one drift, see F1.
- [x] V-AUTO-007 No release-version references ("from core 2.3", "(2.3+)") outside `upgrading-to-2.md`. ✅ none, apart from F1.

## F. Known drifts

- F1. `packages/images/README.md:45` says "Requires `@stati/core` 1.28 or later and Node.js 22.20 or later". `engines` is `^22.20.0 || >=24` (Node 23 is excluded), and the core requirement must be checked against `ImageProvider.apiVersion`. Owner C07.
- F2. `packages/create-stati/README.md:40` says the TypeScript and agent skill prompts are skipped when name, template and styling are given; `cli/scaffolder.md:65` also lists the image tools prompt. Owner C02.
- F3. `create-stati` accepts any `--styling` value without validation (`index.ts:88-90`); check what the docs promise for invalid values. Owner C02.
- F4. `docs-site` builds CSS with a separate `build:css` step instead of `--tailwind-input`/`--tailwind-output`. Not a doc defect; noted because `configuration/css.md` recommends the flags. No change (feature work, out of scope).

Further drifts from Phase 4 are listed per cluster in section J.

## G. Decisions log

- D1. Docs describe the source at `9c6f57e`; no "from version X" or "(X.Y+)" notes in `docs-site` (existing project convention). `upgrading-to-2.md` is exempt because its subject is a version.
- D2. Claims that can't be verified are not documented; if a claim must stay, it gets `<!-- TODO: Verify ... -->` and an entry in section H.
- D3. ✂️ cuts: remove text that repeats the heading, restates the previous paragraph, duplicates another page without adding to it (link instead), or promotes rather than informs. Keep anything that is the only place a fact is stated.
- D4. No emojis added; existing semantic ones in CLI output samples stay.
- D5. Cluster agents edit only their own files; cross-cluster terminology changes go through the lead.
- D6. Terminology (from the Phase 4 terminology reports and a count across scope: "front matter" 185, "frontmatter" 161, "front-matter" 8):
  - "front matter" in prose; `frontMatter` and `frontmatter` only where they are identifiers or quoted output.
  - "markdown-it" for the library, "Markdown" for the language.
  - Eta code goes in `eta` fences, not `html`.
  - Templates pulled in with `stati.include()` are "included templates" (or "templates"); "partials" only names the `site/partials/` folder.
  - The third argument of `stati.include()` is the "body" (`stati.body`).
  - A section `layout.eta` "replaces" (overrides) its ancestor; don't call that inheritance.
- D7. Base path: template examples that print a link or path to the site's own pages or files use `stati.url()` (`stati.url(post.url)`, `stati.url('/styles.css')`). Markdown links need nothing, since Stati prefixes them itself. Evidence: `packages/core/src/core/base-path-links.ts`; the build warns on unprefixed root links (reproduced by C01, C03, C05).
- D8. Pages added to `ctx.pages` in `beforeAll` are supported: they are rendered (C01 test) and get `wordCount`/`readingTime` (AGENTS.md:121). Docs say so instead of "hooks cannot add pages".
- D9. Front matter set in `beforeRender` re-renders the page on every build (`build.ts:869-888`: the hook runs after the cache check). Examples that set front matter use `beforeAll`.
- D10. A claim about third-party hosts or tools the repo can't confirm (Netlify, Vercel, Docker behavior; the external `skills` CLI) is cut or reduced to what the repo shows.
- D11. Duplicated content keeps one home and the other pages link to it:
  - ISG: `core-concepts/isg.md` explains how it works, and `configuration/isg.md` holds the options, aging, invalidation and rebuild rules.
  - RSS: `configuration/rss.md` is the guide, and `api/rss.md` holds the types and signatures.
  - SEO: `configuration/seo.md` covers configuration, `api/seo.md` the functions and types, and `advanced/seo-usage-scenarios.md` the scenarios.
  - Markdown: configuration lives on `configuration/markdown.md`.
  - Helpers: the full example lives on `configuration/templates.md`.
  - Client TypeScript: `configuration/typescript.md`.
  - Tailwind: `configuration/css.md` and `cli/development.md`.
  - Scaffolder flags: `cli/scaffolder.md`.
  - Skill install: `cli/scaffolder.md`.
- D12. No Prettier reformatting of untouched text; the baseline already differs from Prettier in 32 of 59 files.
- D13. Code bugs found during verification are out of scope (non-goal: no feature work); they are listed in section H and the docs describe current behavior where users can hit it.
- D14. SEO scenarios page recommendation: start with Scenario 1, move to Scenario 3 when you need per-page control (C06 V-C06-098).
- D15. `seo.defaultAuthor.email` is not printed anywhere (no read in `packages/core/src`); drop it from examples and say so in the option reference.
- D16. `generatedImage`/`deferGeneratedImage` stay undocumented on `api/seo.md`: `images.og` plumbing, not an authoring API.
- D17. A code block that shows Stati's literal output keeps that output exactly, under `<!-- prettier-ignore -->` when Prettier would reformat it (`api/error-handling.md` fallback HTML).
- D18. Phase 6 findings were applied by the lead, not the original editors, after re-reading the source for each.

## H. Open questions

Code issues found while verifying. None blocks the docs work; the docs describe current behavior.

- H1. `scripts/generate-changesets.mjs:114`: the regex `^(\w+)(!)?(?:\(([^)]+)\))?: ` doesn't match `feat(core)!: ...`, the breaking-change form `AGENTS.md:258` and `.github/commit-message-guidelines.md` prescribe. Such commits are skipped as "not a conventional commit" and release nothing. (C10 V-C10-101, confirmed by the lead.)
- H2. `examples/blog` and `examples/docs` define `build:drafts` as `stati build --include-drafts`, which skips the Sass/Tailwind step in scaffolded projects; `examples/news` uses `npm run build -- --include-drafts`, which works. (C02.) **Filed as #260.**
- H3. `create-stati --styling` isn't validated in `parseArgs`; a bad value fails after copying the template, and `--styling --no-git` takes `--no-git` as the value. (C02, F3.) **Filed as #262.**
- H4. `stati build --metrics-file <rejected path>` prints "Metrics will not be written to file" and then writes the default file. (C01 V-C01-016.) **Filed as #263.**
- H5. `stati dev` loads the config before `setEnv('development')` (`dev.ts:498` vs `:527`), so `getEnv()` returns `'production'` in the config under `NODE_ENV=production`. (C05 V-C05-031.) **Filed as #264.**
- H6. With `--include-drafts`, drafts appear in RSS feeds (no draft check in `rss/`), while search leaves them out. (C07.) Also true of `sitemap.xml`. **Filed as #265.**
- H7. An index page with `permalink: /blog/` yields two top-level nav nodes; a top-level page with a trailing-slash permalink is left out of the root collection. (C04.) **Already tracked in #234.**
- H8. With `markdown.toc` on, Stati overwrites a markdown-it-attrs `{#id}` on h2 to h6. Documented as behavior. (C04 V-C04-040.) **Already tracked in #233.**
- H9. Wrong JSDoc in source (would trigger releases, so not changed here): **Filed as #266** (the `blog/**` examples are left to #251).
  - `types/sitemap.ts:41`: `'monthly'` default.
  - `types/config.ts:497`: robots `sitemap` default.
  - `types/isg.ts:18` and the `AgingRule` comments: aging described backwards, plus the wrong manifest path and key type.
  - `types/rss.ts:196-201`: `includeContent` uses the Markdown source.
  - `types/rss.ts:93,253,259`: `'blog/**'` examples.
  - `search/index.ts:9`: `@stati/core/search` import.
  - `config/loader.ts:161`: imports from `'stati'`.
  - `types/navigation.ts:33`: `NavNode.path` holds a URL path.
- H10. Outside this task's scope (not `docs-site` or a README), but wrong:
  - `AGENTS.md:242` misdescribes `using-javascript.md`.
  - `AGENTS.md:74` (C02).
  - Root `CONTRIBUTING.md`: `npm run test` and `test:ci` descriptions.
  - The skill's `references/configuration.md:39` gives the default title as "Stati Site"; the source has "My Stati Site".
  - The skill's `references/workflow.md` build order omits `images`.
  - The skill's `references/features.md` omits `twitter:image:alt`.
- H11. `docs-site/package.json` pins `@stati/core` 2.3.0, so `check:snippets` and the docs typecheck run against the published package, not the source. Phase 7 also runs them against the local packages. **Resolved on 2026-10-26:** docs-site now pins core 2.8.0, CLI 2.4.0 and images 1.1.0, and builds its stylesheet with `--tailwind-input`/`--tailwind-output` instead of a separate `build:css` step.
- H12. No `CODE_OF_CONDUCT` file and no PR template exist, though `contributing.md` refers to both. Decision for this pass: remove the references. Add the files if you want them.
- H13. `llms.txt` links llmstxt.org but doesn't follow that format. Its broken prefixes and redirecting links are fixed in this pass; a full rewrite is left to the maintainer.

## I. Progress tracking

Current phase: **Complete**. All 7 phases are done, and the quality gates pass (sections L, M, N, K).

Phase 5 result: 54 files changed, 816 insertions, 4,967 deletions. Applied per cluster:

| Cluster | Applied | Left | Diff |
| --- | --- | --- | --- |
| C01 | 69 | 1 | +86 −911 |
| C02 | 49 | 5 | +85 −209 |
| C03 | 34 | 1 | +45 −354 |
| C04 | 40 | 0 | +110 −669 |
| C05 | 45 | 1 | +67 −554 |
| C06 | 42 | 1 | +80 −371 |
| C07 | 35 | 7 | +54 −393 |
| C08 | 71 | 4 | +89 −879 |
| C09 | 50 | 1 | +65 −191 |
| C10 | 48 | 2 | +135 −436 |

Every "left" item has a reason in the cluster log (section J); most are code bugs listed in section H. None were rejected.

Lead check after Phase 5:
- `npm run build:local` in `docs-site`: 48 pages, no warnings.
- Crawl of the built HTML: 0 broken links or anchors.
- Markdown scan: 9 hits, all inline code samples.
- Every changed file keeps its CRLF line endings.

Phase 2/4 results (claims per cluster; ❌ split H/M/L):

| Cluster | Claims | ✅ | ❌ | ⚠️ | ✂️ |
| --- | --- | --- | --- | --- | --- |
| C01 CLI and client code | 199 | 131 | 18 (0/12/6) | 15 | 35 |
| C02 Scaffolder | 131 | 107 | 16 (0/6/10) | 8 | 21 |
| C03 Templates | 103 | 68 | 6 (1/3/2) | 13 | 16 |
| C04 Content and routing | 146 | 106 | 14 (0/3/11) | 2 | 24 |
| C05 Config and types | 141 | 100 | 14 (0/5/9) | 7 | 20 |
| C06 SEO | 119 | 79 | 10 (0/4/6) | 3 | 27 |
| C07 RSS, search, images | 129 | 95 | 17 (0/3/14) | 3 | 14 |
| C08 Build lifecycle | 172 | 105 | 12 (0/5/7) | 8 | 47 |
| C09 Overviews | 136 | 88 | 16 (0/7/9) | 14 | 18 |
| C10 Guides and meta | 145 | 100 | 16 (0/6/10) | 13 | 22 |
| **Total** | **1,421** | **979** | **139 (1/54/84)** | **86** | **244** |

Lead spot checks of ❌ evidence before approval:
- ✅ V-C06-019: `escape-and-validation.utils.ts:36`.
- ✅ V-C06-061/069: `sitemap.ts:201-206,371-376`.
- ✅ V-C02-026: `examples/news/stati.config.js`, `helpers/news.js:452`.
- ✅ V-C02-112: `create-stati/src/index.ts:298-342`.
- ✅ V-C05-084: `isg/ttl.ts:210-230`; the fix must mention that pages older than every rule get the last rule.
- ✅ V-C03-009: `core-concepts/templates.md:82,102,106`.
- ✅ V-C09-009 with a nuance: the localhost default applies only without a config file (`loader.ts:54-67`), and `SiteConfig.baseUrl` is required (`types/config.ts:27`).
- ✅ V-C08-077: `build.ts:850-888`.
- ✅ V-C10-101: `generate-changesets.mjs:114`.
- ✅ V-C07 drafts: no draft check in `packages/core/src/rss/`.

| Phase | Status | Items |
| --- | --- | --- |
| 0 Discovery | ✅ done | 59 files, 22,215 lines, 802 code blocks |
| 1 Mapping | ✅ cluster level; per-file "Covers" lines in section J | 10 clusters |
| 2 Matrix | ✅ done | 1,421 claims |
| 3 Automated | ✅ done | 7 automated items |
| 4 Manual | ✅ done | 1,421 claims with status and evidence |
| 5 Fixes | ✅ done | 483 applied, 23 left with reasons, 0 rejected |
| 6 Double-check | ✅ done | 470 hunks re-verified; 23 issues found and fixed (section L) |
| 7 Validation | ✅ done | section N |

## J. Cluster matrices and evidence

Each cluster's full matrix (every claim with status, evidence and fix) and its Phase 5 log is in the appendix at the end of this file. Doc line numbers in the matrices refer to the files before Phase 5; source line numbers refer to `9c6f57e` (no source changed).

## L. Phase 6 log (independent double-check)

Five fresh reviewers each covered two clusters. They read `git diff`, not the findings. Coverage: R1 (C01+C02) 13 files and 101 hunks; R2 (C03+C04) 9 files and 87 hunks; R3 (C05+C06) 8 files and 86 hunks; R4 (C07+C08) 11 files and 81 hunks; R5 (C09+C10) 13 files and 115 hunks. Every changed `eta` block was compiled in scratch projects. Examples were built with a base path, and every internal link was checked with core's `slugify`.

They found 23 issues, all applied by the lead after re-checking the source:

| # | Where | Issue | Fix | Evidence |
| --- | --- | --- | --- | --- |
| 1 | `configuration/file.md:26` | New text claimed only top-level keys are checked | Lists the nested blocks that reject unknown keys | `css/config.ts:47`, `images/config.ts:75`, `reading-time.ts:47`, `seo/defaults.ts:386`, `news-sitemap.ts:82` |
| 2 | `cli/commands.md:337`, `advanced/troubleshooting.md:14`, `api/error-handling.md:295` | "invalid `seo`/`sitemap` settings" overstated the validation | Names `seo.twitter`, `seo.articles`, `seo.defaultAuthor.twitter`, `sitemap.news` | `seo/defaults.ts:399-449`, `news-sitemap.ts:67-70` |
| 3 | `configuration/seo.md:66` | Lost fact: auto-injection still runs next to `stati.generateSEO()` | Sentence restored | `build.ts:931-946`, `seo/auto-inject.ts:78-101` |
| 4 | `seo-usage-scenarios.md` (2 blocks), `configuration/seo.md` debug block, `configuration/file.md` multi-file block | `defineConfig` used without import | Import added | `config/loader.ts:369-372` (silent fallback) |
| 5 | 13 blocks in `seo-usage-scenarios.md`, `api/seo.md`, `recipes.md`, `introduction.md`; 3 in `README.md` and `packages/core/README.md` | Eta code in `html` fences (D6) | Scripted `html` → `eta` for blocks containing `<%` | — |
| 6 | `api/types.md:696` | Source-map note read as covering CSS | "for TypeScript bundles" | `typescript.utils.ts:105-106` |
| 7 | `seo-usage-scenarios.md:101` | Scenario 2 also claimed per-page control (conflicts with D14) | Reworded | — |
| 8 | `core-concepts/static-assets.md:50` | "these tools" pointed at removed text | Names Tailwind CSS or Sass | — |
| 9 | `configuration/images.md:16` | Animated images are still copied | Added to the table cell | `images/runtime.ts:340,364-368` |
| 10 | `core-concepts/isg.md:91` | Lost fact: `templatesRecorded`, effective `ttlSeconds` | Sentence added | `types/isg.ts:119-131` |
| 11 | `core-concepts/routing.md:180-181` | Duplicate heading | One heading | — |
| 12 | `core-concepts/templates.md:40` | `propValue` arrays left out | Added | `template.utils.ts:48-53` |
| 13 | `configuration/markdown.md` complete example | Links to `stati.build` got no class | `internalClassName` instead of a custom rule | `markdown-it-external-links/lib/index.js:10-50` |
| 14 | `core-concepts/templates.md:116` | "Layout inheritance" heading (D6) | "Section layouts" | — |
| 15 | 6 files | Link text "Templates & Layouts" didn't match the page title | "Templates and layouts" | page title in `core-concepts/templates.md` front matter |
| 16 | `README.md:275`, `packages/core/README.md:280` | `defaultAuthor.email` in examples (D15) | Removed | no read in `packages/core/src` |
| 17 | `packages/core/README.md:354` | Environment said to default to `development` | `NODE_ENV` or else `development` | `env.ts:3` |
| 18 | `recipes.md:230,240` | "filter" wording after the links became tag-page links | Reworded | — |
| 19 | `packages/core/README.md:618` | "content" for the include body (D6) | "a body" | — |
| 20 | `recipes.md:686` | "frontmatter" | "front matter" | — |
| 21 | `advanced/topics.md:67` | Import under an unrelated comment | Reordered | — |
| 22 | `cli/scaffolder.md:132`, `packages/create-stati/README.md:159` | Lost fact: the skill install needs network access | Sentence restored | `create-stati/src/agent-skill.ts:18-23,95-110` |
| 23 | `configuration/search.md:115` | Sample index entry quoted old installation wording | Updated to the current text | `getting-started/installation.md:11` |

## M. Hallucination audit results

What was checked, and the result:

- **CLI flags:** every `--flag` in scope against `packages/cli/src/cli.ts` and `create-stati/src/index.ts`. ✅ Others are third-party tools or CSS variables.
- **Imports:** every named import from `@stati/core` and `@stati/core/types` against the export barrels. ✅ None missing.
- **Template API:** every `stati.<name>` in scope against `TemplateContext` (`types/content.ts`). ✅ The rest are deliberate:
  - typos in error-message examples (`stati.paeg`, `stati.titel`, `stati.generatr`, `stati.title`, `stati.formatDate`);
  - the Stati 1 API on the upgrade page (`stati.partials`);
  - file names and URLs (`stati.config.ts`, `stati.build`, `stati.svg`, `stati.git`).
- **Error wording:** the quoted "Unknown property … Did you mean" text matches `context-validation.utils.ts:97-105`.
- **Per-claim checks:** each cluster agent checked every option, type, default and signature it documented. Each reviewer audited whole files, not only hunks.
- **Result:** no claim in scope lacks evidence. No `<!-- TODO: Verify -->` markers were needed: claims that couldn't be verified were cut (D10) or left unchanged with a reason in the cluster log.

## N. Phase 7 validation

| Check | Result |
| --- | --- |
| `npm run build:local` in `docs-site` | ✅ 48 pages, 0 warnings, no fallback HTML |
| Built-HTML crawl (href, src, #anchors) | ✅ 48 pages, 0 problems |
| Markdown link scan | ✅ 9 hits, all inline code samples |
| Render-artifact scan (literal fences, Eta outside code, pipe tables as paragraphs, headings as paragraphs, duplicate ids) | ✅ 0 pages with problems |
| `npm run typecheck` in `docs-site` (tsc and `check:snippets` against the pinned core 2.3.0) | ✅ |
| `check:snippets` against local core 2.8.0 | ✅ 4 of 4 |
| Preview server (`stati preview --port 4300`) | ✅ 47 sitemap URLs return 200; an unknown URL returns 404 |
| Browser spot-check of 15 key pages (error handling, both ISG pages, both RSS pages, routing, markdown, site metadata, using JavaScript, CLI commands, template config, navigation, recipes, SEO config, installation) | ✅ No broken in-page anchors and no console errors. Highlighting is missing only on three plain one-line shell commands, which is correct. Error handling page checked visually. |
| Prettier on changed files | ✅ No file that was clean before is unclean now: 31 differed before, 29 now. `api/error-handling.md` and `api/reference.md` were reformatted. The fallback HTML sample is under `<!-- prettier-ignore -->`, because Prettier would change it away from Stati's real output (`templates.ts:435-452`). |
| Line endings | ✅ Every changed file keeps its CRLF endings |
| Added lines (854) | ✅ 0 em dashes, 0 emojis, 0 version references |
| Terminology | ✅ "frontmatter" is left only in identifiers and anchors. Node requirement worded one way, with the short form on the homepage. |
| Leftover servers | ✅ None on ports 4101-4110, 4201-4205 or 4300 |

## K. Final report

**What changed:** 54 files, 854 insertions, 5,009 deletions. The docs went from 22,215 lines to 18,059 (−19%) and from 802 code blocks to 631. No source code, package manifest, example code, skill or AGENTS.md was changed. One example README changed: `examples/blank/README.md` ships inside `create-stati`, so it counts as a `create-stati` change for Changesets.

**Accuracy:** 1,421 claims verified. All 139 wrong claims (1 H, 54 M, 84 L) were fixed, plus the 86 unclear items: each was either fixed or left with a recorded reason. Phase 6 then found 23 more issues, all applied. The most user-visible fixes:

- An Eta block in `core-concepts/templates.md` didn't compile (`<%~` inside an HTML comment).
- Hook examples set front matter in `beforeRender`, which re-renders the page on every build. They now use `beforeAll`.
- Template examples hand-wrote root links that break on a site served from a subfolder. They now use `stati.url()`.
- `excludePatterns: ['**/index.md']` in the RSS docs also dropped posts written as `post/index.md`.
- Recipe and SEO config snippets lacked the `defineConfig` import, so copied as written they silently built with the default config.
- The manual installation never created a layout, so the site built with fallback HTML.
- Missing `logger?` parameters on the sitemap function signatures, plus wrong descriptions of what config validation covers, of aging rules and of `maxAgeCapDays`.
- The "hooks cannot add pages" claim, which is false.

**Less is more:** 244 cuts. The largest:

- The ISG, RSS and SEO page pairs were split so each has one home (D11).
- `api/error-handling.md` went from 553 to 318 lines: an error-name table replaced the internal class listings.
- `advanced/using-javascript.md` 1,093 → 526.
- `configuration/site-metadata.md` 449 → 158.
- `configuration/templates.md` 382 → 162.
- `core-concepts/markdown.md` 454 → 198.
- Generic "best practices", summary and philosophy sections were removed throughout.

Phase 6 checked every removed fact. Three facts were found stated nowhere else and were restored (items 3, 10 and 22 in section L).

**Open items:** section H. Most important: H1 (breaking-change commits in the documented form release nothing) and H2 (`build:drafts` in the blog and docs starters skips the CSS step). Also H14 below.

- H14. `examples/blank/site/layout.eta` hand-writes root links, so a blank-starter site served from a subfolder gets unprefixed links and an unhashed stylesheet. Example code is out of scope for this pass. (Raised by C05.) The blog and docs starters have the same problem. **Filed as #261.**

### Before and after, per file

The appendix starts below this table.

| File | Before | After | Change |
| --- | --- | --- | --- |
| `advanced/using-javascript.md` | 1094 | 527 | -567 (-52%) |
| `configuration/site-metadata.md` | 450 | 159 | -291 (-65%) |
| `core-concepts/markdown.md` | 455 | 199 | -256 (-56%) |
| `api/error-handling.md` | 554 | 319 | -235 (-42%) |
| `configuration/templates.md` | 383 | 163 | -220 (-57%) |
| `core-concepts/routing.md` | 467 | 268 | -199 (-43%) |
| `core-concepts/isg.md` | 343 | 164 | -179 (-52%) |
| `configuration/rss.md` | 575 | 415 | -160 (-28%) |
| `advanced/contributing.md` | 544 | 391 | -153 (-28%) |
| `configuration/file.md` | 590 | 446 | -144 (-24%) |
| `core-concepts/static-assets.md` | 341 | 204 | -137 (-40%) |
| `configuration/isg.md` | 375 | 239 | -136 (-36%) |
| `cli/commands.md` | 509 | 379 | -130 (-26%) |
| `configuration/seo.md` | 779 | 666 | -113 (-15%) |
| `advanced/seo-usage-scenarios.md` | 736 | 629 | -107 (-15%) |
| `api/hooks.md` | 389 | 285 | -104 (-27%) |
| `api/rss.md` | 508 | 409 | -99 (-19%) |
| `configuration/search.md` | 315 | 235 | -80 (-25%) |
| `configuration/typescript.md` | 402 | 337 | -65 (-16%) |
| `api/navigation.md` | 579 | 516 | -63 (-11%) |
| `api/seo.md` | 1360 | 1297 | -63 (-5%) |
| `advanced/topics.md` | 170 | 112 | -58 (-34%) |
| `examples/recipes.md` | 906 | 851 | -55 (-6%) |
| `packages/cli/README.md` | 368 | 313 | -55 (-15%) |
| `api/types.md` | 1041 | 988 | -53 (-5%) |
| `configuration/markdown.md` | 513 | 460 | -53 (-10%) |
| `packages/core/README.md` | 817 | 767 | -50 (-6%) |
| `api/templates.md` | 392 | 343 | -49 (-12%) |
| `core-concepts/templates.md` | 543 | 501 | -42 (-8%) |
| `core-concepts/overview.md` | 119 | 86 | -33 (-28%) |
| `examples/list.md` | 217 | 185 | -32 (-15%) |
| `information/ai-policy.md` | 92 | 62 | -30 (-33%) |
| `cli/scaffolder.md` | 382 | 357 | -25 (-7%) |
| `getting-started/quick-start.md` | 279 | 255 | -24 (-9%) |
| `getting-started/project-structure.md` | 222 | 200 | -22 (-10%) |
| `README.md` | 495 | 474 | -21 (-4%) |
| `packages/create-stati/README.md` | 492 | 472 | -20 (-4%) |
| `getting-started/introduction.md` | 80 | 63 | -17 (-21%) |
| `glossary.md` | 192 | 185 | -7 (-4%) |
| `advanced/troubleshooting.md` | 327 | 321 | -6 (-2%) |
| `advanced/metrics.md` | 322 | 317 | -5 (-2%) |
| `cli/development.md` | 117 | 114 | -3 (-3%) |
| `getting-started/installation.md` | 159 | 158 | -1 (-1%) |
| `advanced/deploying-to-a-subfolder.md` | 147 | 148 | +1 (1%) |
| `api/reference.md` | 102 | 103 | +1 (1%) |
| `configuration/css.md` | 178 | 180 | +2 (1%) |
| `getting-started/upgrading-to-2.md` | 150 | 152 | +2 (1%) |
| **Total (59 files)** | **22215** | **18059** | **-4156 (-19%)** |

Code blocks: 802 → 631.

## Appendix: cluster matrices, evidence and Phase 5 logs

Scratch paths in these files (`work/...`) were temporary test projects. Each cluster section below is the verifying agent's file, unchanged; its headings are demoted one level.

## C01 findings

Summary: 199 claims; ✅ 131, ❌ 18 (H 0, M 12, L 6), ⚠️ 15, ✂️ 35.

Test projects: `work/C01/p1` (blank starter, metrics, dev server on 4101), `work/C01/p2` (TypeScript + search + base path `/docs`, preview on 4101), `work/C01/p3` (template error, hook experiments). `node_modules` in each is a junction to the repo root `node_modules` (a junction to `packages/core` alone made the config fail to load: `ws` not found from the junction path, and Stati fell back to its defaults). No server is left on port 4101.

### docs-site/site/cli/commands.md

Covers: `packages/cli/src/cli.ts`; `packages/core/src/core/{build,dev,preview,invalidate}.ts`; `core/utils/server.utils.ts`; `config/loader.ts`; `metrics/utils/writer.utils.ts`

| ID | Line | Claim | Cat | Status | Evidence | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| V-C01-001 | 15 | Node.js 22.20 or higher, or 24 and later | G | ⚠️ | packages/cli/package.json `engines.node: ^22.20.0 \|\| >=24`. "22.20 or higher" reads as including Node 23, which `engines` excludes. Other pages word it differently (see Terminology) | old: "- Node.js 22.20 or higher, or 24 and later" → new: "- Node.js 22.20.0 or higher on the 22.x line, or 24 and later" (the wording of getting-started/installation.md:11) |
| V-C01-002 | 16 | npm, pnpm, yarn or bun | G | ✅ | Nothing in cli.ts depends on a package manager | |
| V-C01-003 | 26-43 | npm scripts; `npm run invalidate -- "tag:blog"` passes the query | L | ✅ | cli.ts:373-381 (`invalidate [query]` positional) | |
| V-C01-004 | 57 | `npx stati` outside a project downloads the unrelated `stati` package; `npx @stati/cli build` works | L | ✅ | `npm view stati` → "Static blog generator" 0.0.1 with bin `stati`; packages/cli/package.json `bin: { stati: './dist/cli.js' }` (single bin, so npx runs it) | |
| V-C01-005 | 63-72 | Global install gives a `stati` command | L | ✅ | packages/cli/package.json bin | |
| V-C01-006 | 88-95 | `stati dev` flags, types and defaults (port 3000, host localhost, open false) | L | ✅ | cli.ts:197-221; constants.ts:42,48; dev.ts:518-527 (`mergeServerOptions`: flag, then `dev.*`, then default); server.utils.ts:355-364 | |
| V-C01-007 | 94 | `--tailwind-output` is linked when it is a `.css` file in the output directory | L | ✅ | css/stylesheet.ts:190-219 (`createStylesheetPlan` throws otherwise); dev.ts:502-514 turns the throw into a warning and drops the link | |
| V-C01-008 | 95 | `--tailwind-verbose`, default shows errors only | L | ✅ | cli.ts:217-221; packages/cli/src/tailwind.ts:163-223 | |
| V-C01-009 | 99-114 | dev examples | X | ✅ | cli.ts:192-306 | |
| V-C01-010 | 126-130 | `stati preview` flags; port 4000, host localhost | L | ✅ | cli.ts:313-325; constants.ts:45,48; preview.ts:69-77 | |
| V-C01-011 | 145 | Preview: extensionless URLs from `.html`, query strings ignored, `404.html` with status 404 or plain text, dev serves the same with live reload on the 404 page, base path served and `/` redirected | B | ✅ | server.utils.ts:59-67 (`parseRequestPath` drops `?`/`#`), 132-145 (`404.html` or `404/index.html`), 284-320; preview.ts:100-121; dev.ts:594-660; server.utils.ts:87-127. Tested on p2 (base `/docs`): `/` and `/docs` → 302 `/docs/`, `/docs/?a=1` 200, `/docs/index` 200, `/other` 404 "This site is served under /docs/" | |
| V-C01-012 | 159 | `--force` re-renders every page, cache kept and updated | L | ✅ | build.ts:850-852 (`options.force \|\|` first in `shouldRebuild`); cache entries still written | |
| V-C01-013 | 160 | `--clean` deletes output dir and `.stati/`; a bad `outDir` is rejected before anything is deleted | L | ✅ | build.ts:1283-1289; paths.utils.ts:46-48 (`.stati` under cwd); config/directories.ts:54-110; loader.ts:321-332 | |
| V-C01-014 | 161 | `--include-drafts` | L | ✅ | cli.ts:51-54, 90; content.ts:62 | |
| V-C01-015 | 162 | `--metrics`, also `STATI_METRICS=1` or `true` | L | ✅ | cli.ts:84-85; metrics/recorder.ts:281-292 | |
| V-C01-016 | 163 | `--metrics-file` resolved inside `.stati/metrics/`; paths outside are rejected; default `build-<timestamp>.json` | L | ⚠️ | cli.ts:149-172; writer.utils.ts:23-27, 81-87. Tested `--metrics-file ../outside.json`: the CLI logs "Metrics will not be written to file." and then writes `.stati/metrics/build-<timestamp>.json` anyway, because `metricsOutputPath` stays undefined and `writeMetrics` falls back to the default name. The doc sentence is true; the CLI message is wrong. **Maintainer decision:** fix the CLI (skip `writeMetrics` or change the message), or document "a path outside it is rejected and the metrics go to the default file". | If the code is not changed: old: "paths outside that folder are rejected (default: `.stati/metrics/build-<timestamp>.json`)" → new: "a path outside that folder is rejected and the file gets the default name, `.stati/metrics/build-<timestamp>.json`" |
| V-C01-017 | 164-165 | `--metrics-detailed`, `--metrics-html` | L | ✅ | cli.ts:63-70, 96, 171; writer.utils.ts:112-123 (HTML next to the JSON, `.json` → `.html`) | |
| V-C01-018 | 166-167 | Tailwind flags on build: each needs the other; production writes `dist/_assets/<name>-<hash>.css` unless `css.hash` is false | L | ✅ | cli.ts:71-81 (`.implies` both ways; tested "Missing dependent arguments"); css/config.ts:63-71; AGENTS.md css section | |
| V-C01-019 | 171-192 | build examples | X | ✅ | cli.ts:38-191 | |
| V-C01-020 | 194 | Removed pages: deletes the HTML of pages that no longer exist, only files recorded in the manifest | B | ✅ | core/isg/prune.ts; AGENTS.md:32 | |
| V-C01-021 | 196 | Production deletes earlier hashed bundles (and the dev `name.js`/map), stylesheets and search indexes; other names stay; a removed bundle's files stay until `--clean` | B | ✅ | build.ts:1634-1661; typescript.utils.ts:178-210 (patterns only for bundles compiled this build); search/generator.ts:503-527; search/constants.ts:17 (`hashFilename: true` default) | |
| V-C01-022 | 198 | Images: reused, unused ones in `dist/_img/` deleted by `stati build` only; `--clean` drops the image cache | B | ✅ | build.ts:1674-1689 (`getEnv() === 'production'`); build.ts:1283-1289 | |
| V-C01-023 | 208 | Cache keys are output paths with a leading slash (`/index.html`, `/about.html`, `/blog.html`) | B | ✅ | build.ts:591-605; paths.utils.ts:227-232 | |
| V-C01-024 | 214 | `tag:` exact, case-sensitive | L | ✅ | invalidate.ts:91-92 | |
| V-C01-025 | 215 | `path:` plain prefix, matches `/blog-archive.html` too | L | ✅ | invalidate.ts:94-96 | |
| V-C01-026 | 216 | `glob:` matches the whole key | L | ✅ | invalidate.ts:98-100; glob-patterns.utils.ts:27-31,111 (`^...$`) | |
| V-C01-027 | 217 | `age:` = rendered within the period; days/weeks/months/years, singular or plural; calendar arithmetic for months/years | L | ✅ | invalidate.ts:134-183 | |
| V-C01-028 | 218 | Plain term matches a tag containing it or a key containing it | L | ✅ | invalidate.ts:110-113 | |
| V-C01-029 | 219 | No query clears the cache | L | ✅ | invalidate.ts:227-239 | |
| V-C01-030 | 221 | Terms are OR'd; quoting a term with spaces | L | ✅ | invalidate.ts:30-64, 245-246 | |
| V-C01-031 | 223 | Invalidation only removes manifest entries | B | ✅ | invalidate.ts:245-255 | |
| V-C01-032 | 231-232 | `path:/about` "Invalidate one page (its key is /about.html)" | X | ⚠️ | invalidate.ts:96: a prefix, so it also matches `/about-us.html` and every `/about/...` key, as line 215 says | old: "# Invalidate one page (its key is /about.html)" → new: "# Invalidate /about.html (and every other key that starts with /about)" |
| V-C01-033 | 248-253 | Only `stati.config.ts`/`.js`/`.mjs`; switch with env vars | G | ✅ | constants.ts:29-37; loader.ts:172-185 | |
| V-C01-034 | 255 | `stati build` sets Stati's mode, not `NODE_ENV`; `getEnv()` reads it | B | ✅ | cli.ts:131 (`setEnv('production')` before `build()`, which loads the config); env.ts:3-11; anchor exists (configuration/file.md:502) | |
| V-C01-035 | 261-290 | GitHub Actions example | X | ✅ | Generic; runs `npm run build` | |
| V-C01-036 | 292 | Build script holds the CSS step: Tailwind flags, or `npm run build:css && stati build` for Sass | B | ✅ | create-stati/src/tailwind-processor.ts:58; sass-processor.ts:52 | |
| V-C01-037 | 296-314 | Netlify and Vercel config | X | ✅ | Generic host config; `publish = "dist"` matches the default `outDir` (constants.ts:12) | |
| V-C01-038 | 318-333 | `--help`, `--version` on every command | L | ✅ | cli.ts:37, 422; tested `stati build --version` → 2.4.0 | |
| V-C01-039 | 339-345 | Lookup order ts, js, mjs | G | ✅ | constants.ts:29-37; loader.ts:176-181 | |
| V-C01-040 | 347 | No config: title "My Stati Site", base URL `http://localhost:3000`; a file that fails to load prints the error and "Falling back to default configuration." | G | ✅ | constants.ts:51,121; loader.ts:183-185, 371-373. Seen in practice in p2 (missing `ws` → fallback) | |
| V-C01-041 | 347 | Validation errors that stop the build: unknown option, `helpers`, `isg`, `images` | G | ❌ L | loader.ts:241-347 also stops on invalid `readingTime`, `seo`, `sitemap` (news sitemap), `css` and an `outDir` that collides with the project folders | old: "and invalid `isg` or `images` settings stop the build with an error that names the setting." → new: "invalid `isg`, `images`, `css`, `seo`, `sitemap` or `readingTime` settings, and an `outDir` that overlaps the project's folders, stop the build with an error that names the setting." |
| V-C01-042 | 349 | Config, `srcDir`, `outDir`, `staticDir` and `.stati/` resolve from the current directory | B | ✅ | loader.ts:172; paths.utils.ts:46-48; cli.ts:141-142 | |
| V-C01-043 | 357-366 | Dev log lines (`rebuilt`/`Done in`, `changed`/`n/m pages rebuilt in`, `No page uses it`) | X | ✅ | dev.ts:270-300; reproduced in p1 (`▸ site/index.md rebuilt` / `Done in 12ms`; `site/partials/banner.eta changed` / `No page uses it`; `site/layout.eta changed` / `1/1 pages rebuilt in 19ms`) | |
| V-C01-044 | 368 | Which pages a change rebuilds; config not watched | B | ✅ | dev.ts:384-469 (`markTemplateChanges`), 837 (watches `srcDir` and `staticDir` only) | |
| V-C01-045 | 372-381 | Preview builds; `npx serve dist` | X | ✅ | Code block ends with an empty line (L, removed with V-C01-057) | |
| V-C01-046 | 383-387 | Debugging bullets | B | ✅ | dev.ts:594-610 (overlay), 270-300 | |
| V-C01-047 | 401 | `clean` script removes `dist` and `.stati` | X | ✅ | Valid `node -e` | |
| V-C01-048 | 418 | deploy.sh runs `stati build --clean` | X | ❌ L | Skips the CSS step that line 292 says belongs in the build script | Delete with V-C01-058, or old: "stati build --clean" → new: "npm run build -- --clean" |
| V-C01-049 | 440-460 | Makefile: `build: stati build --clean`; `.PHONY` lists only dev build deploy clean | X | ❌ L | Same CSS-step issue; `fresh`, `invalidate-blog`, `invalidate-all` are not in `.PHONY` | Delete with V-C01-058 |
| V-C01-050 | 467-473 | Port in use message and `--port` fix | X | ✅ | server.utils.ts:154-170 (message: "Port 3000 is already in use on localhost. Stop the process using it, or choose another port with --port or `dev.port` in your Stati config.") | |
| V-C01-051 | 475-481 | "Build failures: Error: Build failed with template error / Solution: Check template syntax and rerun a clean build" | B | ❌ M | Tested p3 (layout reads `stati.nope.x`): `stati build` logs "× Error rendering site/layout.eta for /: Cannot read properties of undefined (reading 'x')", writes fallback HTML, prints "Site built successfully!" and exits 0 (AGENTS.md:46). A clean build does not fix a template error. | old: the whole "**Build failures:**" block (lines 475-481) → new: "**Template errors:** a production build logs a failing template, such as `× Error rendering site/layout.eta for /: ...`, writes fallback HTML for that page and still exits with 0. Read the build output before deploying; `stati dev` shows the same error in the browser overlay." |
| V-C01-052 | 485 | Unreadable manifest warns and renders every page | B | ✅ | core/isg/manifest.ts:54-77 | |
| V-C01-053 | 489-504 | Exit codes 0 / 1; unknown or missing command → 1 | L | ⚠️ | cli.ts:186-189, 302-305, 365-370, 412-415, 418-421 (tested `stati buidl` and `stati` → 1). True, but a build with template errors exits 0 (V-C01-051), and the script below deploys it | After line 492 add: "A build whose templates failed still exits with `0`; see Template errors above." |
| V-C01-054 | 508 | Links to scaffolder and dev server pages | R | ✅ | Pages exist (V-AUTO-001) | |
| V-C01-055 | 11 | Intro sentence | V | ✂️ | Marketing ("simple and powerful", "intuitive") | old: "Stati provides a simple and powerful command-line interface for building, developing, and managing your static sites. The CLI is designed to be intuitive while providing advanced options for complex workflows." → new: "The `stati` command builds, serves and previews your site, and manages its cache." |
| V-C01-056 | 45 | "This is the recommended approach because it keeps your project self-contained and works consistently across all environments." | V | ✂️ | The heading already says recommended | delete |
| V-C01-057 | 353-387 | "Development workflows" (Live reload, Preview builds, Debugging) | V | ✂️ | Repeats cli/development.md (log lines, what rebuilds, config not watched, overlay) and the preview section above | Replace the section with: "See [Dev server](/cli/development) for live reload, what each change rebuilds and the error overlay." |
| V-C01-058 | 389-461 | "Scripting and automation" (npm scripts, Bash, Makefile) | V | ✂️ | Generic shell/make examples; `fresh` repeats `--clean`; jpegoptim/optipng and Cloudflare purging are not Stati; two examples skip the CSS step (V-C01-048/049) | delete (the npm scripts at lines 26-35 already show the pattern) |
| V-C01-059 | 465-473 | "Port already in use" | V | ✂️ | Same advice in cli/development.md:116 | delete; keep the Template errors (V-C01-051) and Cache corruption items |
| V-C01-060 | 506 | Closing paragraph | V | ✂️ | Marketing, no information | delete; keep line 508 |
| V-C01-061 | 323-333 | "Version information" block | V | ✂️ | Restates the two bullets above it | delete the `### Version information` heading and code block |

### docs-site/site/cli/development.md

Covers: `packages/core/src/core/dev.ts`; `packages/cli/src/cli.ts` (dev), `tailwind.ts`; `core/utils/server.utils.ts`, `error-overlay.utils.ts`

| ID | Line | Claim | Cat | Status | Evidence | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| V-C01-062 | 17-26 | dev examples | X | ✅ | cli.ts:197-208 | |
| V-C01-063 | 28 | Flags map to `createDevServer` options and override `dev.port`/`dev.host`/`dev.open` | A | ✅ | cli.ts:223-233 (only passed when given); dev.ts:57-66, 518-527; server.utils.ts:355-364 | |
| V-C01-064 | 34 | Startup clears the cache with `invalidate()` | B | ✅ | dev.ts:100-110 | |
| V-C01-065 | 35 | Then a full build | B | ✅ | dev.ts:110-115 (cache empty, so every page renders); 789-790 | |
| V-C01-066 | 36 | Default `http://localhost:3000`, WebSocket at `/__ws`; base path served, `/` redirects, other URLs 404, `/__ws` at the root | B | ✅ | dev.ts:536, 744-746, 799-802, 820; server.utils.ts:87-127 | |
| V-C01-067 | 37 | Watches the content and static directories | B | ✅ | dev.ts:837-842 (dotfiles ignored) | |
| V-C01-068 | 39 | `--open` uses the `open` package | B | ✅ | dev.ts:926-935 | |
| V-C01-069 | 43-47 | chokidar add/change/unlink; changes during a rebuild are queued and built together; log line; `reload` broadcast | B | ✅ | dev.ts:166-172, 252-262, 325-353, 863-912 | |
| V-C01-070 | 51-57 | Template change/add/delete rules; entries without the record rebuild in full once | B | ✅ | dev.ts:370-469 | |
| V-C01-071 | 59 | Listing pages rebuild "when its title, description, tags or date changed" | B | ⚠️ | core/collections.ts:21, 281-287: the fields are `collections.summaryFields` (default title, description, tags, draft), plus URL and publish date (skill configuration.md:158-160) | old: "when its title, description, tags or date changed" → new: "when a field in [`collections.summaryFields`](/core-concepts/collections#what-rebuilds-a-listing) (by default the title, description, tags and draft flag), its URL or its date changed" |
| V-C01-072 | 61 | Internal file references (`markTemplateChanges`, `isg/builder.ts`) | V | ✂️ | Contributor detail on a user page; the behavior is already described above | delete |
| V-C01-073 | 65 | Static assets recopied; co-located images rebuild their pages | B | ✅ | dev.ts:236-249 (non-template change → build without `skipAssetCopy`); AGENTS.md:165 (`assetDeps`) | |
| V-C01-074 | 67 | Dev skips responsive images and OG cards unless `images.dev: 'full'` | G | ✅ | skill configuration.md:234; owned by C07 | |
| V-C01-075 | 71-75 | Flags start a Tailwind watcher next to the dev server | L | ✅ | cli.ts:260-273 | |
| V-C01-076 | 79 | Local `node_modules/.bin/tailwindcss`; Tailwind 3 and 4 | B | ✅ | tailwind.ts:123-149, 15-19 | |
| V-C01-077 | 80 | `<link>` added before `</head>` unless the page links it; output outside `dist/` written but not linked, with a startup warning | B | ⚠️ | dev.ts:502-514; css/config.ts:63-71: the link is also skipped when `css.autoInject` is `false` | old: "Stati adds `<link rel=\"stylesheet\" href=\"/styles.css\">` before `</head>` unless the page links it already." → new: "Stati adds `<link rel=\"stylesheet\" href=\"/styles.css\">` before `</head>` unless the page links it already or `css.autoInject` is `false`." |
| V-C01-078 | 81-82 | Errors only by default; verbose shows "done in" | B | ✅ | tailwind.ts:181-223 ("Tailwind done in ...") | |
| V-C01-079 | 83-85 | Watcher lifetime: background shells, Ctrl+C, killed process, unexpected exit reported | B | ✅ | tailwind.ts:169-179, 247-265, 277-302; cli.ts:277-301 | |
| V-C01-080 | 89 | Install commands for Tailwind 4 / 3 | G | ✅ | tailwind.ts:16-19, 30-58 | |
| V-C01-081 | 90 | "Stati will check for the installation and show an error if it's not found." | B | ⚠️ | tailwind.ts:63-86, 115-121 throws; cli.ts:302-305 logs "Dev server failed: ..." and exits with 1. Also covers a missing input file | old: "Stati will check for the installation and show an error if it's not found." → new: "If Tailwind CSS or the input file is missing, `stati dev` prints an error and exits." |
| V-C01-082 | 92 | `stati build` takes the same flags and runs Tailwind once after rendering | L | ✅ | build.ts:1475-1507 | |
| V-C01-083 | 102-105 | Overlay in place of the page; reloads on the next good rebuild; live status; Refresh / Ctrl+R / Cmd+R | B | ✅ | dev.ts:594-610; error-overlay.utils.ts:607-728 | |
| V-C01-084 | 104 | Unknown `stati.*` properties fail with "Did you mean" | B | ✅ | core/utils/context-validation.utils.ts (AGENTS.md:147); owned by C03 | |
| V-C01-085 | 109 | Ctrl+C / SIGINT / SIGTERM closes WebSocket, watcher, HTTP listener | B | ✅ | cli.ts:277-301; dev.ts:938-985 (also stops the Tailwind and TypeScript watchers) | |
| V-C01-086 | 113-116 | Troubleshooting: watched folders, TypeScript `srcDir` watched by esbuild, restart for config, restart clears the cache, port | B | ✅ | dev.ts:837; typescript.utils.ts:379-501; dev.ts:100-110 | |
| V-C01-087 | 113 | "Repeated failures – Check the browser overlay for the full stack trace, then inspect the terminal output logged by the CLI." | V | ✂️ | Says nothing the Browser feedback section doesn't | delete |

### docs-site/site/advanced/metrics.md

Covers: `packages/core/src/metrics/*`; `core/build.ts` (spans and counters); `packages/cli/src/cli.ts:82-185`

| ID | Line | Claim | Cat | Status | Evidence | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| V-C01-088 | 17-27 | `--metrics` collects phases and cache rates, writes JSON to `.stati/metrics/` | L | ✅ | cli.ts:84-185; writer.utils.ts:81-87; tested p1 | |
| V-C01-089 | 21 | Run from the project root; plain `stati` in npm scripts | L | ✅ | cli.ts:141-142 (`.stati` under cwd) | |
| V-C01-090 | 33-41 | `STATI_METRICS=1` enables it | L | ✅ | cli.ts:84-85 (also `true`); tested `STATI_METRICS=true` | |
| V-C01-091 | 45-53 | `--metrics-file` relative to `.stati/metrics/`, subfolders allowed | L | ✅ | cli.ts:149-166; tested `reports/build.json` | |
| V-C01-092 | 57-61 | `--metrics-detailed` adds per-page timings | L | ✅ | recorder.ts:164-180, 240-242 | |
| V-C01-093 | 65-77 | HTML report: one file, light/dark, headline stats, phases (two orders, nested steps, explanations), counts grouped by pages/templates/ISG cache/assets, page timings, raw JSON with copy | B | ✅ | writer.utils.ts:112-123; generated report for p1 has `prefers-color-scheme: dark`, sections "Phase breakdown" (duration/timeline tabs, `<details>` rows), "Counts" with groups Pages/Templates/ISG cache/Assets, "Page timings", "Raw JSON data" with a Copy button; html-report.utils.ts:303-523 | |
| V-C01-094 | 92 | Default file `.stati/metrics/build-<timestamp>.json` | L | ✅ | writer.utils.ts:23-27 (`build-2026-10-25T20-22-29Z.json`) | |
| V-C01-095 | 94-145 | JSON sample | X | ❌ L | Shape matches types.ts:12-36. But `nodeVersion: "22.13.0"` is below the supported 22.20; `flags` omits `includeDrafts`, which the CLI always writes (build.ts:1250-1262; p1 output has `"includeDrafts": false`); `counts` omits `imagesGenerated`, `imagesCached`, `imagesFailed`, which are always present (recorder.ts:98-111) | old: `"nodeVersion": "22.13.0",` → new: `"nodeVersion": "22.20.0",`; old: `"clean": false` (in flags) → new: `"clean": false,` + `"includeDrafts": false`; after `"markdownFilesProcessed": 20` add `"imagesGenerated": 0, "imagesCached": 0, "imagesFailed": 0` (one per line) |
| V-C01-096 | 152-156 | `isg.cacheHitRate` is "what percentage" of pages came from cache | B | ⚠️ | build.ts:1835-1838: `cacheHits / totalPages`, a fraction from 0 to 1 (the sample shows 0.75) | old: "shows what percentage of pages were served from cache without re-rendering:" → new: "is the share of pages served from the cache without re-rendering, from 0 to 1:" and change the list to "**1**", "**0**", "**0.5 to 0.9**" |
| V-C01-097 | 158-162 | Causes of a low hit rate: ISG disabled, content modified, template changes triggering full rebuilds | B | ⚠️ | Incomplete and the third is vague: a template change rebuilds only the pages that rendered it (dev.ts:384-469; builder deps). Verified causes: `isg.enabled: false` (build.ts:852), `--force`/`--clean` (build.ts:851, 1283), no `.stati/` from an earlier build (fresh CI checkout), and `beforeRender` changing front matter (tested p3: 0% on every build; api/hooks.md:135) | old: the list at lines 160-162 → new: "- `isg.enabled: false`, `--force` or `--clean`" / "- No `.stati/` cache from an earlier build, as in a fresh CI checkout" / "- A `beforeRender` hook that changes front matter, which re-renders the page on every build (see [Hooks](/api/hooks#beforerender))" / "- A change to a template every page renders, such as the layout" |
| V-C01-098 | 166-195 | Phase table | T | ✅ | Every listed phase is recorded: build.ts:544, 580, 653, 1125-1130, 1219, 1269, 1338, 1341, 1363, 1393/1404, 1421, 1426, 1473, 1481, 1595, 1618, 1664, 1698, 1810, 891, 1081 | |
| V-C01-099 | 197 | `navigationBuildMs`, `rssGenerationMs`, `lockAcquireMs`, `lockReleaseMs` declared but not recorded "yet" | T | ✅ | types.ts:99,137,147,149; no `startSpan`/`recordPhase` for them in src (grep) | old: "but the build does not record them yet." → new: "but the build does not record them." (drop the forecast) |
| V-C01-100 | 199 | `pageRenderingMs` contains `hookBeforeAllMs`, search index phases and all per-page totals | B | ⚠️ | build.ts:1426-1447 wraps `processPagesWithCache` (653, 669, 1125-1130). With `--tailwind-input` in production, the held pages' write is added to `fileWriteTotalMs` after that span, inside `tailwindBuildMs` (build.ts:1481-1503) | In the `fileWriteTotalMs` row add: "; with `--tailwind-input`, also the pages held until Tailwind ran, which `tailwindBuildMs` contains" |
| V-C01-101 | 201 | Only phases that run appear; hooks only when defined; TypeScript only when enabled | B | ✅ | build.ts:652, 886, 1076-1081, 1809; 1388-1412 | |
| V-C01-102 | 207-220 | Counter table | T | ✅ | types.ts:169-193; build.ts:926-928, 1370-1371, 1424, 1602-1615, 1670 | |
| V-C01-103 | 224-226 | `templatesLoaded` accumulated; `templateRenders` vs `includeCacheHits` | B | ✅ | types.ts:174-183; build.ts:926-928 | |
| V-C01-104 | 228-240 | `pageTimings` entries; cached pages have no counts | T | ✅ | recorder.ts:164-180; build.ts:877 (`recordPageTiming(url, 0, true)`) | |
| V-C01-105 | 244 | `peakRssBytes`: "Maximum resident set size during build" | T | ❌ M | recorder.ts:122-132, 182-185, 195-197; build.ts:1847; metrics/utils/system.utils.ts `getMemoryUsage` (`process.memoryUsage().rss`). RSS is read only when the recorder is created, at the end of the build and in `finalize()`; the value is the largest of those readings, not a peak sampled during the build | old: "- `peakRssBytes`: Maximum resident set size during build" → new: "- `peakRssBytes`: the larger resident set size of two readings, at the start and the end of the build (memory is not sampled in between)" |
| V-C01-106 | 245 | `heapUsedBytes` at the end of the build | T | ✅ | recorder.ts:198, 227 | |
| V-C01-107 | 255-269 | CI with `STATI_METRICS` | X | ✅ | cli.ts:84-85 | |
| V-C01-108 | 275-286 | Baseline/current with `--metrics-file`; jq prints both durations | X | ✅ | cli.ts:149-166 | |
| V-C01-109 | 292-321 | Programmatic: `BuildResult`, `BuildMetrics` types; `setEnv('production')` because `build()` alone runs a development build | A | ✅ | src/index.ts (exports `BuildResult`, `BuildMetrics`, `build`, `setEnv`); env.ts:3 (`NODE_ENV` or `'development'`); build.ts:345-365 | |
| V-C01-110 | 139-145 | `isg.manifestEntries`, `isg.invalidatedEntries` in the sample, not explained | T | ⚠️ | build.ts:1838-1844: `invalidatedEntries` is the number of pages rendered (cache misses), the same as `counts.renderedPages`, not entries removed by `stati invalidate` | After the Cache hit rate list add: "`isg.invalidatedEntries` is the number of pages rendered in this build (the same as `counts.renderedPages`), and `isg.manifestEntries` the number of entries in the cache manifest." |
| V-C01-111 | 11 | "Stati includes a built-in performance metrics system ... This guide explains how to use it." | V | ✂️ | Restates the title | old: whole paragraph → new: "Stati can record how long each build phase takes, what the cache saved and how much memory the build used." |
| V-C01-112 | 82-86 | "You can combine all flags for the most comprehensive output" + example | V | ✂️ | The same command is in cli/commands.md:188, and each flag is shown above | delete |
| V-C01-113 | 247-251 | "High memory usage might indicate: ..." | V | ✂️ | Speculation; static assets are copied, not processed in memory | delete |

### docs-site/site/configuration/typescript.md

Covers: `packages/core/src/core/utils/typescript.utils.ts`, `bundle-matching.utils.ts`, `glob-patterns.utils.ts`; `types/config.ts` (`TypeScriptConfig`, `BundleConfig`); `build.ts:774-790, 989-990`; `create-stati/src/typescript-processor.ts`

| ID | Line | Claim | Cat | Status | Evidence | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| V-C01-114 | 15-25 | `create-stati` uses TypeScript by default; creates `stati.config.ts`, `tsconfig.json`, `src/main.ts` | X | ✅ | create-stati/src/index.ts:251-259, 349; create.ts:211-213, 250-260; typescript-processor.ts:27-34 | |
| V-C01-115 | 31-47 | Config example and its default comments | X | ✅ | constants.ts:129-138; typescript.utils.ts:90-106 | |
| V-C01-116 | 53 | `enabled` default `false` | T | ⚠️ | types/config.ts:362-367: `enabled: boolean` is required in `TypeScriptConfig`; without a `typescript` block nothing compiles | old: "\| `enabled` \| `boolean` \| `false` \| Enable TypeScript compilation \|" → new: "\| `enabled` \| `boolean` \| required \| Enable TypeScript compilation; without a `typescript` block nothing is compiled \|" |
| V-C01-117 | 54-58 | `srcDir`, `outDir`, `bundles`, `hash`, `minify` defaults; hash/minify production only | T | ✅ | typescript.utils.ts:90-106; constants.ts:129-138 | |
| V-C01-118 | 59 | `autoInject` default true, before `</body>` | T | ✅ | build.ts:989-990; typescript.utils.ts:638-680 | |
| V-C01-119 | 61, 67-80 | Dev: stable names, source maps, no minify, watch; production: hashed, no maps, minified | B | ✅ | typescript.utils.ts:96-106, 418-426 (watch context: `sourcemap: true`, `minify: false`); dev.ts:696-720 | |
| V-C01-120 | 76, 90, 136, 163, 292-293 | Hashed names like `main-a1b2c3d4.js`, `docs-e5f6g7h8.js` | X | ❌ L | esbuild `[hash]` is 8 uppercase letters and digits: p2 built `main-FIYHHZFC.js`; typescript.utils.ts:199 matches `[A-Z0-9]{8}`. commands.md:167 already uses `A1B2C3D4` for CSS | Replace `main-a1b2c3d4.js` → `main-A1B2C3D4.js` (lines 76, 90, 136, 292) and `docs-e5f6g7h8.js` → `docs-E5F6G7H8.js` (line 293) |
| V-C01-121 | 84, 88-92 | Auto-injection before `</body>` in `stati dev` and `stati build` | B | ✅ | build.ts:989-990 (no mode check); typescript.utils.ts:638-680; the injected `src` gets the base path | |
| V-C01-122 | 110-122 | Manual tags: `<script type="module" src="<%= path %>">` | X | ❌ M | `bundlePaths` are relative to the site root (types/content.ts:19-26: "pass one through `stati.url()` when you print it"); build.ts:774-781. Under a base path the tag misses it: p2 (`baseUrl` `https://example.com/docs`) warned `src="/_assets/main-FIYHHZFC.js" does not start with the base path /docs ... Use stati.url(...)`. The `?.` guard is unneeded: `bundlePaths` is always an array (types/content.ts:24) | old: `<% if (stati.assets?.bundlePaths) { %>` / `<% for (const path of stati.assets.bundlePaths) { %>` / `<script type="module" src="<%= path %>"></script>` / `<% } %>` / `<% } %>` → new: `<% for (const path of stati.assets.bundlePaths) { %>` / `<script type="module" src="<%= stati.url(path) %>"></script>` / `<% } %>`; and after "using `stati.assets.bundlePaths`" add: ". The paths start at the site root, so print them through `stati.url()`" |
| V-C01-123 | 136-148 | `bundlePaths` row; preload example `href="<%= path %>"` | X | ❌ M | Same as V-C01-122 | old: `href="<%= path %>"` → new: `href="<%= stati.url(path) %>"`, and drop the `if` guard as above |
| V-C01-124 | 150 | Duplicate script tags are not injected | B | ✅ | typescript.utils.ts:613-617, 648-651 (compares the prefixed URL) | |
| V-C01-125 | 160-165 | `BundleConfig` fields and meaning | T | ✅ | types/config.ts:297-330 | |
| V-C01-126 | 169-227 | Default and multi-bundle examples | X | ✅ | constants.ts:138; bundle-matching.utils.ts:108-140 | |
| V-C01-127 | 233-241 | Glob syntax table; no braces; whole-URL match; `/docs/**` skips `/docs` | B | ✅ | glob-patterns.utils.ts:27-112 (`{`/`}` escaped, `^...$`) | |
| V-C01-128 | 243-247 | Patterns see the URL, not source or output file | B | ✅ | build.ts:774 (`getBundlePathsForPage(page.url, ...)`) | |
| V-C01-129 | 251-271 | Matching logic and example | B | ✅ | bundle-matching.utils.ts:110-175 | |
| V-C01-130 | 288-305 | Project structure | X | ✅ | Hash case covered by V-C01-120 | |
| V-C01-131 | 311-315 | `npm run typecheck` runs `tsc --noEmit` | X | ✅ | typescript-processor.ts:34 (scaffolded TypeScript projects only) | |
| V-C01-132 | 349 | esbuild bundles shared imports into each output | B | ✅ | typescript.utils.ts:230-245 (one `esbuild.build` with `bundle: true` per entry) | |
| V-C01-133 | 381-385 | Entry-not-found warning text; others still compile | B | ✅ | typescript.utils.ts:226-232, 340-353, 400-406 | |
| V-C01-134 | 389 | `Bundle '<name>' compilation failed: …` fails the build; duplicate names fail with `Duplicate bundleName(s) found in configuration` | B | ✅ | typescript.utils.ts:274-278, 320; bundle-matching.utils.ts:10-20, 43-63 | |
| V-C01-135 | 393 | Bundle missing on a page | B | ✅ | As V-C01-127/128 | |
| V-C01-136 | 397, 401 | No type checking; no source maps in production | B | ✅ | typescript.utils.ts:102-105 | |
| V-C01-137 | 11 | "first-class TypeScript support ... optimized JavaScript bundles with near-instant build times" | V | ✂️ | Marketing | old: whole paragraph → new: "Stati compiles your site's client-side TypeScript into JavaScript bundles with [esbuild](https://esbuild.github.io/) and adds them to your pages." |
| V-C01-138 | 61 | Note on automatic source maps, hash and minify | V | ✂️ | Repeats the table (57-58), the config comment (44) and the Development vs production section | delete |
| V-C01-139 | 84-86 | "No template modifications required!" / "seamlessly added to every page" | V | ✂️ | Marketing; repeats the sentence before | old: "...during both `stati dev` and `stati build`. No template modifications required!" + line 86 → new: "...during both `stati dev` and `stati build`, on every page or on the pages a bundle's `include` and `exclude` patterns select:" |
| V-C01-140 | 130-150 | "Accessing bundle info in templates" (one-row table, note) | V | ✂️ | Repeats the manual example and line 84; the note repeats auto-injection | Keep the preload example under "Disabling auto-injection" with one sentence ("`stati.assets.bundlePaths` lists the bundles matched for the page, such as `['/_assets/main-A1B2C3D4.js']`; use it to preload them:"); move "Stati does not add a script tag that is already in the page." next to line 84; delete the rest |
| V-C01-141 | 273-282 | "Use cases" | V | ✂️ | Generic list; line 154 already says why | delete |
| V-C01-142 | 317-345 | "Example: Adding interactivity" (`src/main.ts`) | V | ✂️ | Generic DOM code, nothing Stati-specific | delete; keep "Shared code between bundles" |
| V-C01-143 | 395-401 | Troubleshooting "Type errors not caught" and "Source maps in production" | V | ✂️ | Repeat the Type checking section and lines 69-78 | delete both subsections |

### docs-site/site/advanced/using-javascript.md

Covers: `core/build.ts` (hooks, static copy, bundle injection), `types/content.ts` (`TemplateContext`, `StatiAssets`), `types/search.ts`, `core/utils/typescript.utils.ts`; hooks behavior

| ID | Line | Claim | Cat | Status | Evidence | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| V-C01-144 | 35 | Blank starter writes the whole page in `layout.eta`; blog/docs/news share `site/base.eta` | R | ✅ | examples/blank/site/layout.eta; skill SKILL.md:91-93, resources.md:150-152 | |
| V-C01-145 | 39-76, 261-284, 443, 1037-1070 | Examples use `stati.page.title`, `stati.content` and root paths such as `/styles.css`, `/js/theme-switcher.js` | X | ⚠️ | `stati.content` exists (types/content.ts:559-564). Hand-written `/…` URLs break under a base path (skill SKILL.md:70-74; base-path-links.ts warns). Not wrong for a site at the root. **Lead decision:** whether docs examples switch to `stati.url()` site-wide | If adopted: `href="<%= stati.url('/styles.css') %>"`, `src="<%= stati.url('/js/theme-switcher.js') %>"` |
| V-C01-146 | 169 | Files in `public/` are copied to the output | B | ✅ | build.ts:1664-1669 (`copyStaticAssets`) | |
| V-C01-147 | 290-355 | Search: index under `stati:search-index` meta; `documents` with `title`, `heading`, `content`, `url`, `anchor`, `breadcrumb` | X | ✅ | types/search.ts:112-118; AGENTS.md:129, 132. Under a base path `item.url` lacks it (skill configuration.md:76); minor | |
| V-C01-148 | 453 | External files "Can be minified and bundled" | B | ❌ L | `public/` files are copied as they are; Stati does not minify or bundle them (skill configuration.md:194) | Removed with V-C01-174 |
| V-C01-149 | 469-473, 590-595 | TypeScript: typecheck separate, live reload, minify/hash, auto-injection; dev/prod table | B | ✅ | typescript.utils.ts:96-106; dev.ts:696-720 | |
| V-C01-150 | 566-572 | Auto-injected `<script type="module">` before `</body>` | B | ✅ | build.ts:989-990 (hash case: V-C01-120) | |
| V-C01-151 | 576-583, 1043-1046 | Preload with `href="<%= path %>"` | X | ❌ M | Same as V-C01-122 | old: `href="<%= path %>"` → new: `href="<%= stati.url(path) %>"` (or removed with V-C01-175/179) |
| V-C01-152 | 608 | `--no-typescript` projects need the block by hand | B | ✅ | create-stati/src/create.ts:250-260 | |
| V-C01-153 | 626, 784 | "Hooks cannot add pages" | B | ❌ M | build.ts:648-659: `beforeAll` gets the `pages` array the build renders, and `fillTextStats` handles "Pages the hook added"; types/content.ts:390; core-concepts/markdown.md:388 documents "Pages a hook adds". Tested p3: a page pushed in `beforeAll` was written to `dist/extra.html`. Navigation and generated pages are built before the hook (api/hooks.md:45). **Maintainer decision:** document hook-added pages as supported, or keep steering to `collections.generate` without the false claim | Line 626 old: "Hooks cannot add pages, but [`collections.generate`](/core-concepts/collections#pages-from-data) can:" → new: "A `beforeAll` hook can push pages onto `ctx.pages`, but navigation and generated pages are worked out before it runs. [`collections.generate`](/core-concepts/collections#pages-from-data) is made for pages from data:"; line 784 old: "Hooks cannot add pages. For CMS entries" → new: "For CMS entries" |
| V-C01-154 | 626 | `collections.generate` may be async; pages rendered by a `[param].md` template with data in `stati.generated.data` | R | ✅ | types/content.ts:405-407, 442-465; skill configuration.md:169-173 (C04 owns) | |
| V-C01-155 | 632-635 | Four hooks and when they run; cached pages skip per-page hooks | B | ✅ | build.ts:652-655, 884-892, 1076-1081, 1808-1812 | |
| V-C01-156 | 637, 643-675 | Share data through module state and set it on `ctx.page.frontMatter` in `beforeRender` | X | ❌ M | Front matter is hashed before `beforeRender` runs and stored after it (build.ts:848-865, 884-892; isg/builder.ts:267, 410), so such a page is re-rendered on every build: p3 showed "Cache: 0/1 hits" on three builds in a row. api/hooks.md:135 documents this and recommends `beforeAll`. Setting the same values in `beforeAll` gave a cache hit on the second build and a rebuild when the data changed | Line 637 old: whole note → new: "> **Important:** a page whose front matter `beforeRender` changes is re-rendered on every build (see the [caching note](/api/hooks#beforerender)). Add data in `beforeAll` instead, which runs before the cache check, so a page rebuilds only when its data changes." Example old: `let sharedData = {};` … `beforeRender: async (ctx) => { ctx.page.frontMatter.products = sharedData.products; }` → new: no module state; in `beforeAll: async (ctx) => { ...; for (const page of ctx.pages) { if (page.url === '/products') page.frontMatter.products = products; } }` and drop `beforeRender` |
| V-C01-157 | 679-690 | Template reads `stati.page.products` | X | ✅ | Front matter is flattened into `stati.page` (skill SKILL.md:95-97) | |
| V-C01-158 | 694-710 | `wordCount` and `readingTime` on every page; `readingTime.wordsPerMinute`, default 230 | G | ✅ | AGENTS.md:121; core/reading-time.ts | |
| V-C01-159 | 714-756 | Related posts computed in `beforeAll` | X | ✅ | build.ts:648-667 (front matter hashed after `beforeAll`) | |
| V-C01-160 | 760-779 | `afterAll` writes a file into `ctx.config.outDir` | X | ✅ | build.ts:1808-1812; loader.ts:55-58 (`outDir` default) | |
| V-C01-161 | 786-813 | `prebuild` script writes Markdown before the build | X | ✅ | npm runs `prebuild` before `build` | |
| V-C01-162 | 899-909 | "Use build hooks to pre-compute": sets front matter in `beforeRender` | X | ❌ M | Same as V-C01-156: re-renders every build | Removed with V-C01-177; if kept, move it to `beforeAll` |
| V-C01-163 | 971-996 | "Validate data in build hooks": module state + `beforeRender` | X | ❌ M | Same as V-C01-156 | Removed with V-C01-177; if kept, set the data in `beforeAll` |
| V-C01-164 | 1002-1023 | "Combining methods": module state + `beforeRender` | X | ❌ M | Same as V-C01-156 | Removed with V-C01-178 |
| V-C01-165 | 1093 | Stati combines templates with `stati.include()`/`stati.layout()`, not Eta's | R | ✅ | core/eta-plugin.ts (AGENTS.md:37) | |
| V-C01-166 | 11 | Intro ("doesn't mean your sites have to be purely static") | V | ✂️ | Filler | old: first sentence → delete; keep "You can add JavaScript in four ways: ..." |
| V-C01-167 | 13-19 | Manual table of contents | V | ✂️ | The docs layout renders a page TOC (docs-site/site/partials/sections/toc.eta) | delete (and the `---` rule after it) |
| V-C01-168 | 118-148 | "Loading external libraries" (particles.js from a CDN) | V | ✂️ | Third-party example, nothing Stati-specific | delete |
| V-C01-169 | 150-163 | Inline script advantages/considerations (emoji lists) | V | ✂️ | Generic; "No module system (unless using ES modules)" contradicts itself | delete |
| V-C01-170 | 357-444 | "Using ES modules" (utils.js + main.js app) | V | ✂️ | Long generic JS; `handleSearch` is a placeholder. Only the last line is about Stati | old: lines 357-444 → new: "### ES modules\n\nFiles in `public/` can import each other as ES modules. Load the entry file with `type=\"module\"`:" + the `<script type="module" src="/js/main.js"></script>` block |
| V-C01-171 | 446-459 | External file advantages/considerations | V | ✂️ | Generic; includes V-C01-148 | delete |
| V-C01-172 | 463-611 | Method 3 (setup, structure, example, injection, preload, table, lists) | V | ✂️ | Duplicates configuration/typescript.md (config, defaults, auto-injection, preload, dev/prod) | Replace with: "## Method 3: Built-in TypeScript compilation\n\nFor substantial client-side code, let Stati compile TypeScript with esbuild: new projects from `create-stati` have it on, and other projects add `typescript: { enabled: true }` to the config and an entry file at `src/main.ts`. Bundles are minified and hashed in production, rebuilt with live reload in `stati dev`, and added to your pages automatically. esbuild does not type-check, so run `npm run typecheck` as well. See [TypeScript](/configuration/typescript) for the options and per-page bundles." |
| V-C01-173 | 617 | "The most powerful way to use JavaScript in Stati" | V | ✂️ | Marketing | old: "The most powerful way to use JavaScript in Stati is through build hooks in your `stati.config.js`." → new: "Build hooks in your config run JavaScript during the build." |
| V-C01-174 | 815-830 | Build hook advantages/considerations | V | ✂️ | Generic | delete |
| V-C01-175 | 845-873 | "When to use each method" | V | ✂️ | Repeats each method's "When to use" list | delete; keep the quick reference table (838-843) |
| V-C01-176 | 875-910 | Best practices: Performance | V | ✂️ | Generic; "Use a bundler like esbuild or rollup" contradicts the built-in compilation; item 3 is V-C01-162 | delete |
| V-C01-177 | 911-996 | Best practices: Organization and Security | V | ✂️ | Generic JS advice, not Stati; item 3 of Security is V-C01-163 | delete |
| V-C01-178 | 998-1070 | "Combining methods" | V | ✂️ | Repeats earlier examples; carries V-C01-151 and V-C01-164 | delete |
| V-C01-179 | 1074-1085 | Summary and recommendation paragraphs | V | ✂️ | Repeats the intro and the table | delete lines 1074-1085; keep "For more information" links |

### packages/cli/README.md

Covers: `packages/cli/src/cli.ts`; `core/invalidate.ts`; `create-stati` scripts

| ID | Line | Claim | Cat | Status | Evidence | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| V-C01-180 | 16-22 | `npx create-stati` sets up the CLI in `package.json` | X | ✅ | create-stati/src/package-json.ts | |
| V-C01-181 | 29-32 | Install `@stati/core` too, for `defineConfig` and strict package managers | X | ✅ | packages/cli/package.json depends on core; configs import it | |
| V-C01-182 | 51-56 | `npx @stati/cli` without install; a config importing `@stati/core` falls back to defaults; `npx stati` downloads another package | L | ✅ | loader.ts:362-373; `npm view stati` | |
| V-C01-183 | 74-87 | dev behavior and options | L | ✅ | cli.ts:192-306; dev.ts | |
| V-C01-184 | 96-99 | dev examples | X | ✅ | cli.ts:197-221 | |
| V-C01-185 | 116-120 | build: production mode, hashed bundles, hashed stylesheets incl. `public/` ones, ISG, sitemap/robots/RSS | B | ✅ | cli.ts:131; typescript.utils.ts:90-106; p2 log "Linked /styles.css as /_assets/styles-2A268E91.css" | |
| V-C01-186 | 121 | "Reports build statistics and performance metrics" | B | ⚠️ | Statistics always (build.ts:1204-1240); metrics only with `--metrics` or `STATI_METRICS` (cli.ts:84-99) | old: "- Reports build statistics and performance metrics" → new: "- Reports build statistics, and with `--metrics` writes performance metrics" |
| V-C01-187 | 125-133 | build options | L | ✅ | cli.ts:43-81 | |
| V-C01-188 | 141-151 | build examples | X | ✅ | cli.ts | |
| V-C01-189 | 168-177 | preview behavior and options | L | ✅ | preview.ts; cli.ts:313-325 | |
| V-C01-190 | 201-212 | invalidate query formats | L | ✅ | invalidate.ts:80-113 | |
| V-C01-191 | 218-237 | invalidate examples; OR logic | X | ✅ | invalidate.ts:245-246 | |
| V-C01-192 | 241-246 | Age formats, singular/plural; calendar arithmetic | L | ✅ | invalidate.ts:139, 157-179 | |
| V-C01-193 | 272, 295 | Dev at `http://localhost:3000`, preview at `http://localhost:4000` | G | ✅ | constants.ts:42-48 | |
| V-C01-194 | 276-279 | Edit `site/layout.eta`, `public/styles.css` | X | ⚠️ | Depends on the starter: Tailwind keeps CSS in `src/styles.css` and deletes `public/styles.css`; Sass uses `src/styles.scss`; blog/docs/news put the page shell in `site/base.eta` (AGENTS.md:75; skill configuration.md:246-250) | old: "- Modify `site/layout.eta` for your HTML structure\n   - Update `public/styles.css` for styling" → new: "- Modify the `.eta` templates in `site/` for your HTML structure\n   - Update your stylesheet (`public/styles.css`, or `src/` with Sass or Tailwind)" |
| V-C01-195 | 316-325 | Deployment: `npx stati build --clean` | X | ❌ M | Bypasses the project's build script, so a Tailwind site builds without its stylesheet and a Sass site with stale CSS (create-stati tailwind-processor.ts:58, sass-processor.ts:52; docs commands.md:292 says to use the script) | old: "npx stati build --clean" (line 318) → new: "npm run build -- --clean" |
| V-C01-196 | 329-338 | "After updating a template that affects blog posts: stati invalidate tag:blog" | X | ❌ M | Template changes are detected without help: each entry records its templates and a changed one rebuilds its pages (AGENTS.md:165-167; isg/builder.ts `shouldRebuildPage`; dev.ts:384-469). Invalidation is for changes Stati cannot see (skill features.md:466-472). Line 337 has the same `npx stati build --clean` issue | old: "# After updating a template that affects blog posts" → new: "# After changing data Stati can't track, such as a file a helper reads"; old (line 337): "npx stati build --clean" → new: "npm run build -- --clean" |
| V-C01-197 | 354-355 | Node `^22.20.0 \|\| >=24`; npm, pnpm, yarn or bun | G | ✅ | packages/cli/package.json engines | |
| V-C01-198 | 250-296 | "Quick Start Guide" | V | ✂️ | Repeats "The Easy Way" (lines 13-22) and the command sections; ports are given again | delete, or cut to steps 4 to 6 |
| V-C01-199 | 301-312 | "Development Workflow" | V | ✂️ | Comments only, repeats the dev section | delete |

### Gaps

- **Unknown options are ignored.** `stati build --frce` builds normally and exits 0 (cli.ts has `strictCommands()` but no `strictOptions()`). A typo in a flag silently does nothing. commands.md "Global options" or "Exit codes" could say "Unknown options are ignored, so check the command info box the CLI prints (Force, Clean, Drafts, Metrics, Tailwind)".
- **Build lock.** A production `stati build` takes a lock in `.stati/` and fails when another build holds it; `--force` and `--clean` override it (build.ts:361-365; core/isg/build-lock.ts:275-288). Not in commands.md.
- **One dev server per folder.** `stati dev` takes a dev server lock in `.stati/` and refuses to start when another dev server runs in the same folder (dev.ts:684-692, `DevServerLockManager` in core/isg/dev-server-lock.ts). Not in development.md.
- **Empty `bundles` array.** `typescript.bundles: []` compiles nothing and warns "TypeScript is enabled but no bundles are configured" (typescript.utils.ts:312-316). typescript.md only says the default applies when `bundles` is omitted.
- **Metrics files in the same second overwrite each other** (`build-<timestamp>.json` has second resolution, writer.utils.ts:23-27). Minor; probably not worth documenting.
- **CLI bug (not a doc gap):** a rejected `--metrics-file` still writes the default file after saying it won't (V-C01-016).

### Terminology

- "front matter" (commands.md:214, using-javascript.md:944) vs "frontmatter" (using-javascript.md:637, 670, 1019, 1050). AGENTS and api/hooks.md use "front matter".
- Cache naming: "ISG cache" (commands.md:159), "incremental cache" (development.md:34), "cache" / "`.stati/` cache". Suggest "the cache (`.stati/`)" or "ISG cache" consistently.
- "development server" vs "dev server" (both in commands.md and development.md; the page title is "Dev server").
- Node requirement worded four ways: commands.md:15 "22.20 or higher, or 24 and later"; installation.md:11 and contributing.md:26 "22.20.0 or higher on the 22.x line, or 24 and later"; quick-start.md:25 "22.20 or a later 22.x release"; scaffolder.md:372 and index.md "22.20+ or 24+".
- Hash examples: `a1b2c3d4` (lowercase) for bundles in typescript.md and using-javascript.md vs `A1B2C3D4` for CSS (commands.md:167, types). Bundles and stylesheets both use uppercase; search index hashes are lowercase hex (`search-index-650233e4.json`).
- `stati.assets?.bundlePaths` guarded with `?.` in some examples, unguarded in others; `bundlePaths` is always an array.

### Cross-cluster

- AGENTS.md:242 describes `advanced/using-javascript.md` as "JS config files instead of TypeScript"; the page covers client-side JavaScript and build hooks. JS config files are covered in configuration/file.md.
- `.claude/skills/stati/references/configuration.md:39` gives the default `site.title` as `Stati Site`; the code uses `My Stati Site` (constants.ts:121).
- `.claude/skills/stati/references/features.md:522` lists "optional incremental measurements" in metrics reports; `setIncrementalMetrics` is never called, so `incremental` is never written.
- `metrics/types.ts:42` documents `meta.timestamp` as "ISO timestamp of build start"; recorder.ts:206 sets it in `finalize()`, at the end of the build (code comment, not docs).
- docs-site/site/api/hooks.md:122-131 and :226-236 show `beforeRender` changing front matter, the pattern its own caching note (:135) says re-renders every build (C08). examples/recipes.md:656 sets `page.frontMatter.externalData` (check which hook; C10). configuration/file.md:369 sets `page.frontMatter.section` (check which hook; C05).
- Base path in examples: many docs pages hand-write `href="/..."` in Eta examples; a site-wide decision on `stati.url()` affects C03, C04, C10 as well (see V-C01-145).

### Phase 5 log

Files edited: docs-site/site/cli/commands.md, cli/development.md, advanced/metrics.md, configuration/typescript.md, advanced/using-javascript.md, packages/cli/README.md. Anchors kept: `/cli/commands#stati-invalidate`, `#config-file-location`, `/cli/development#browser-feedback`, `#tailwind-css-integration`, `/configuration/typescript#pattern-matching`, `#multiple-bundles`, `#accessing-bundle-info-in-templates` (linked from configuration/templates.md:152), `/advanced/metrics#templates-loaded-and-renders`. Removed headings had no inbound links (grep of docs-site/site, READMEs, llms.txt).

commands.md
- V-C01-001: applied (lead wording "Node.js 22.20 or later on the 22.x line, or 24 and later"; re-checked against packages/cli/package.json engines)
- V-C01-016: left (lead ruling H4: code bug; current text "paths outside that folder are rejected" promises nothing about what is written)
- V-C01-032: applied (re-checked against invalidate.ts:94-96)
- V-C01-041: applied (re-checked against loader.ts:241-347)
- V-C01-048, V-C01-049: applied (removed with V-C01-058)
- V-C01-051: applied, with "(or an HTML comment in place of a failing included template)" added (re-checked against templates.ts:371-388, template-render.ts:536-541; production exit 0 reproduced in p3)
- V-C01-053: applied (re-checked against cli.ts:186-189 and p3 exit code)
- V-C01-055, 056, 057, 058, 059, 060, 061: applied (057 kept as a one-line link section; facts in the cut text are on cli/development.md: log lines, rebuild rules, config not watched, overlay, port advice at :116)
- Gap "unknown options ignored": applied under Global options (re-checked: cli.ts has `strictCommands()` only; `stati build --frce` exits 0)
- Gap "one dev server per folder": applied under `stati dev` (re-checked against core/isg/dev-server-lock.ts:66 and dev.ts:686; reproduced: a second `stati dev` on 4102 in p1 failed with "A dev server is already running in this directory", exit 1)
- C08 cross-cluster (commands.md:347): applied as V-C01-041
- C08 cross-cluster (commands.md:93-94, one Tailwind flag without the other on dev): applied to the `--tailwind-input` row (re-checked against cli.ts:229-231, 264: no `.implies` on dev, watcher only with both)

development.md
- V-C01-071: applied (re-checked against collections.ts:21, 281-287; anchor `#what-rebuilds-a-listing` exists in core-concepts/collections.md:103)
- V-C01-072: applied
- V-C01-077: applied (re-checked against css/config.ts:63-71)
- V-C01-081: applied (re-checked against tailwind.ts:63-86, cli.ts:302-305)
- V-C01-087: applied

metrics.md
- V-C01-095: applied (sample JSON parses; 12 counts; flags include includeDrafts; re-checked against recorder.ts:98-111 and p1 output)
- V-C01-096, V-C01-097, V-C01-110: applied (re-checked against build.ts:1835-1844, 850-852, 1283; p3 beforeRender test; anchor `/api/hooks#beforerender` is used by api/hooks.md:218 itself)
- V-C01-099, V-C01-100: applied (re-checked against types.ts:99-149, build.ts:1481-1503)
- V-C01-105: applied (re-checked against recorder.ts:122-132, 182-197; build.ts:1847)
- V-C01-111, 112, 113: applied

typescript.md
- V-C01-116: applied (re-checked against types/config.ts:362-367)
- V-C01-120: applied to every bundle hash on the page (p2 built `main-FIYHHZFC.js`)
- V-C01-122, V-C01-123: applied; `if` guards dropped, `stati.url()` added, one explanatory sentence (re-checked against types/content.ts:19-26, build.ts:774-781; re-run in p2 with base `/docs`: `src` and `href` are `/docs/_assets/main-FIYHHZFC.js`, no base path warning)
- C03 cross-cluster (typescript.md:118, :144 without `stati.url()`): applied as V-C01-122/123
- V-C01-137, 138, 139, 140, 141, 142, 143: applied (140 keeps its heading because configuration/templates.md:152 links to it; the duplicate-tag fact moved next to the injection sentence; 143's "type-check before deploying" fact moved into the Type checking section)

using-javascript.md
- V-C01-145: applied per D7 (stati.url in the template examples that link site files: styles.css, nav links, theme-switcher.js, main.js, related posts) plus one sentence near the top; re-run in p3 with base `/docs`: `/docs/styles.css`, `/docs/`, `/docs/js/main.js`, no warning
- V-C01-148, 151, 162, 163, 164: applied (removed with the cut sections; the "copied as they are" fact added in one sentence under ES modules)
- V-C01-153: applied per D8 (line 626 rewritten; "Hooks cannot add pages." dropped from the CMS section; re-checked against build.ts:648-659 and p3 test)
- V-C01-156: applied per D9 (note rewritten; example sets front matter in `beforeAll`; re-run in p3: builds 1/2/3 gave 0%, 100%, 0% cache hits with data A, A, B)
- V-C01-166 to 179: applied (Method 3 replaced by one paragraph; its `typecheck` advice adjusted to `tsc --noEmit` since only scaffolded projects have the script, re-checked against typescript-processor.ts:34; "Comparison & best practices" became "Comparison" with the table; Summary replaced by "Learn more" with the links)
- "frontmatter" pass: only identifiers remain

packages/cli/README.md
- V-C01-186: applied
- V-C01-194: applied (moved into a short "Editing Your Site" list when the Quick Start Guide was cut)
- V-C01-195, V-C01-196: applied (re-checked against create-stati tailwind-processor.ts:58, sass-processor.ts:52)
- V-C01-198, V-C01-199: applied (ports and `dist/` stay stated in the command sections and Deployment Workflow)

Applied 69: 18 ❌, 14 ⚠️, 35 ✂️ and 2 gaps (the 3 cross-cluster items overlap V-C01-041, V-C01-122/123 and one new table edit). Rejected 0. Left 1 (V-C01-016, per ruling).

## C02 findings

Summary: 131 claims; ✅ 107, ❌ 16 (H 0, M 6, L 10), ⚠️ 8, ✂️ 21 (152 rows; the 21 ✂️ rows are counted apart from the claims).

Method: read `packages/create-stati/src/*` and `examples/*`; ran the built scaffolder (`packages/create-stati/dist/index.js`, its `dist/templates` matches `examples/` apart from build output) from `work/C02/` for every template x styling (12 projects), plus `--no-typescript`, `--images` (blank, blog) and invalid values. Built with the local CLI: all four templates with plain CSS, blank and blog with Tailwind (Tailwind CLI 4.3.3 linked from `docs-site/node_modules`), blank and blog with `--images`, and the manual-installation steps. Sass was traced in source only (no `sass` binary available). No server was started.

### docs-site/site/cli/scaffolder.md

Covers: `packages/create-stati/src/index.ts`, `create.ts`, `examples.ts`, `css-processors.ts`, `sass-processor.ts`, `tailwind-processor.ts`, `typescript-processor.ts`, `images-processor.ts`, `agent-skill.ts`, `package-json.ts`; `examples/*`

| ID | Line | Claim | Cat | Status | Evidence | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| V-C02-001 | 15-33 | Quick start commands: templates `blank/blog/docs/news`, `--styling=tailwind`, `--no-typescript` | L | ✅ | packages/create-stati/src/index.ts:76-98; examples.ts:29-95; all ran in work/C02 | |
| V-C02-002 | 35 | `npm create stati my-site -- --template=blog`: options before `--` stay with npm | L | ✅ | npm behavior (`npm init <initializer> -- <args>` forwards args after `--`); index.ts:24-26 reads `process.argv.slice(2)` | |
| V-C02-003 | 37-45 | Steps: new directory, copy template, package.json name + Stati metadata, styling scripts, optional agent skill, Git by default, install by default | B | ✅ | create.ts:318-389, 402-426; package-json.ts:16-23 (`stati: { engine, version }`) | |
| V-C02-004 | 47 | Note: skip install with `--no-install` | V | ✂️ | Repeats line 45 word for word in substance | delete the line `> **Note:** You can skip automatic dependency installation with \`--no-install\` and install them manually later.` |
| V-C02-005 | 51-60 | Prompts and their order: name, template, styling, TypeScript, image tools, agent skill, Git, install | B | ✅ | index.ts:184-305 (same order) | |
| V-C02-006 | 61 | Package manager prompt only when several are detected and another prompt was shown | B | ✅ | index.ts:318-343 (also needs install chosen, implied) | |
| V-C02-007 | 65 | (F2) With name, `--template` and `--styling` given, TypeScript, image tools and agent-skill prompts are skipped; TS on, no images, no skill unless flags; Git and install prompts remain; no `--git`/`--install` flags | B | ✅ | index.ts:249-287 (`hasRequiredPrompts`), 289-305, 349-364; unknown flags fall through the switch at index.ts:75-158 | |
| V-C02-008 | 68 | Fully unattended command | X | ✅ | Ran `--template=blank --styling=css --no-git --no-install`: no prompt, project created | |
| V-C02-009 | 71 | `--package-manager` picks the tool; without it you are asked when more than one is available | B | ✅ | index.ts:140-157, 318-343 | |
| V-C02-010 | 75-92 | Options block | L | ✅ | Matches `--help` text at index.ts:31-47 (only "Show help message" vs "Show this help message") | |
| V-C02-011 | 96 | "Every Stati site gives its images a width, height and lazy loading" | B | ❌ L | Only Markdown images: packages/core/src/images/markdown-rule.ts (Markdown image rule), markup.ts:63; raw `<img>` is not processed (skill SKILL.md:121-124) | old: "Every Stati site gives its images a width, height and lazy loading." → new: "Stati gives every Markdown image a width, height and lazy loading." |
| V-C02-012 | 98-106 | Image tools: adds `@stati/images` dev dependency, turns on `images.responsive` and `images.og`, keeps `site/og.eta` and `og/fonts/` for blog/docs/news; blank uses the built-in card | B | ✅ | images-processor.ts:23-99; create.ts:331-338; core/src/images/runtime.ts:407 (built-in template); built blank-img (`og: true`, `_img/og/index-*.png`) and blog-js-img (fonts block, og.eta kept) | |
| V-C02-013 | 105 | Placeholder `site.baseUrl`; preview images need absolute URLs | G | ✅ | create.ts:268-279; blank-img output `og:image` = `https://example.com/_img/og/...` | |
| V-C02-014 | 108, 110 | Without image tools the card template and fonts are removed; prompt defaults to no | B | ✅ | images-processor.ts:86-92; index.ts:264-272; blog-css has no `site/og.eta` or `og/` | |
| V-C02-015 | 116-121 | Agent skill targets, `skills` agents, install dirs; interactive choice; non-interactive only with `--agent-skill`; `github` alias installs to `.agents/skills/stati/` | L | ✅ | agent-skill.ts:9-40; index.ts:111-138, 274-287 | |
| V-C02-016 | 131 | Exact `npx --yes skills@1 add ... --json` command | X | ✅ | agent-skill.ts:16, 94-110 | |
| V-C02-017 | 134 | If the install fails, the site is still created and the scaffolder prints the command to add the skill later | B | ✅ | create.ts:433-447, 454-477; agent-skill.ts:56-58 | |
| V-C02-018 | 134, 151-156 | `skills` CLI: plain files, `skills-lock.json`, needs git and network, update semantics, `-g`, telemetry env vars | B | ⚠️ | External tool; not in this repo. Consistent with .claude/skills/stati/references/installation.md:44-62. Settle against the `skills` CLI README if needed. No change proposed. | |
| V-C02-019 | 160-165 | Four templates and one-line descriptions | B | ✅ | examples.ts:29-91 | |
| V-C02-020 | 169-175 | Blank: structure, homepage walkthrough, header/nav/footer layout, one stylesheet with light/dark custom properties, config, scripts | B | ✅ | examples/blank/site/layout.eta, site/index.md, public/styles.css:20-37; create.ts:285-296 | |
| V-C02-021 | 179-189 | Blog: posts in `site/posts/`, five a page, tags + `[tag].md`, yearly archive, newer/older/related, RSS/sitemap/robots, OG/Twitter, drafts, 404, self-hosted display face, `helpers/blog.js`, no build hooks | B | ✅ | examples/blog/site/index.md (`paginate: 5`), site/tags/[tag].md, stati.config.js (no `hooks`), helpers/blog.js:39-80; blog-css build output | |
| V-C02-022 | 191 | Blog ships its own `stati.config.js` (becomes `.ts` with TS); stylesheet carried into `src/` with Sass/Tailwind | B | ✅ | create.ts:248-262, 331-338; examples.ts:54-55; css-processors.ts:42-50 | |
| V-C02-023 | 191 | `build:drafts` script is `stati build --include-drafts` | X | ⚠️ M | True of the file (examples/blog/package.json, examples/docs/package.json), but the scaffolder only rewrites `build`/`dev`, so with Sass or Tailwind `build:drafts` skips the CSS step. Reproduced: blog + Tailwind, `stati build --include-drafts` links `/styles.css`, which does not exist (no stylesheet). The news template already uses `npm run build -- --include-drafts` (examples/news/package.json), which works. **Maintainer decision:** change `build:drafts` in examples/blog and examples/docs to `npm run build -- --include-drafts` (source change, releases create-stati). | If changed: old: "adds a `build:drafts` script (`stati build --include-drafts`)" → new: "adds a `build:drafts` script (`npm run build -- --include-drafts`)" |
| V-C02-024 | 195-208, 210 | Docs template features, `helpers/docs.js` beforeAll + helpers, `public/scripts/docs.js`, own config | B | ✅ | examples/docs/stati.config.js (prism, search, hooks), helpers/docs.js:5-19, 144-149, 205-227, 250-251; public/scripts/docs.js:2-3, 431-435 (Ctrl/⌘ K and /) | |
| V-C02-025 | 218-225, 227, 229 | News: sections in `site.sections`, front page by `lead`/`featured`, articles, authors, topics, search keys, feeds, News sitemap, `NewsArticle`, themes, `public/scripts/news.js` | B | ✅ | examples/news/stati.config.js:19-133; helpers/news.js:185-187, 322, 405; public/scripts/news.js:216-220 | |
| V-C02-026 | 226 | `helpers/news.js` "writes the Google News sitemap in `afterAll`" | B | ❌ M | News uses core's `sitemap.news` (examples/news/stati.config.js:120-124); `helpers/news.js` defines only `beforeAll` (helpers/news.js:452; returns `{ helpers, generate, hooks, feeds }` at :504) | old: "fills in each article's metadata in the `beforeAll` hook, and writes the Google News sitemap in `afterAll`" → new: "and fills in each article's metadata in the `beforeAll` hook; the Google News sitemap comes from `sitemap.news` in the config" |
| V-C02-027 | 237-238 | Plain CSS: one file in `public/styles.css`, no build step | B | ✅ | css-processors.ts:52-54 | |
| V-C02-028 | 242 | Sass: `src/styles.scss` from the template stylesheet with `$primary-color`, `$font-stack` and a breakpoint | B | ✅ | sass-processor.ts:42-90 (also declares `$secondary-color` and a `responsive` mixin; omission is harmless) | |
| V-C02-029 | 243-246 | Sass compiles into `public/styles.css`; `build:css` before `stati build`, `watch:css` next to `stati dev`; `build`/`dev` modified; `.gitignore` lists `public/styles.css` | B | ✅ | sass-processor.ts:10-57; create.ts:495 (only when Git is initialized, see Gaps) | |
| V-C02-030 | 250-253, 255-256 | Tailwind 4 deps, `src/styles.css` with `@source '../.stati/tailwind-classes.html'`, dev to `dist/styles.css`, build to `dist/_assets/styles-<hash>.css`; blank gets `@apply` starter, others keep template CSS in `components` layer; link stays `/styles.css`; script flags | B | ✅ | tailwind-processor.ts:14-85, 94-246; core/src/core/utils/template.utils.ts:42-55 (propValue feeds inventory); built blank-tailwind and blog-tailwind: `<link href="/_assets/styles-<HASH>.css">` | |
| V-C02-031 | 254 | Built-in Tailwind integration "(single process)" | B | ❌ L | The CLI spawns Tailwind's watcher as a child process (packages/cli/src/tailwind.ts:173); production runs it via `spawn` too (core/src/css/tailwind.ts:108). It is one command, not one process. | old: "both using Stati's built-in Tailwind integration (single process):" → new: "both using Stati's built-in Tailwind integration (one command, no separate CSS script):" |
| V-C02-032 | 262-266 | Post-creation: `cd`, `npm install` if skipped, `npm run dev` | X | ✅ | index.ts:376-383 | |
| V-C02-033 | 270-283 | Base scripts in every template | X | ✅ | examples/{blank,blog,docs,news}/package.json | |
| V-C02-034 | 285 | Sass adds steps around Stati commands; Tailwind adds flags | B | ✅ | sass-processor.ts:49-54; tailwind-processor.ts:57-60 | |
| V-C02-035 | 291-305, 307 | Plain CSS tree (incl. `README.md`, `src/main.ts`, `tsconfig.json`); generated config for blank sets title, description, placeholder baseUrl, `typescript`; other templates keep theirs | B | ✅ | work/C02/blank-css file list; create.ts:268-296 | |
| V-C02-036 | 311-335 | Sass and Tailwind trees: `src/styles.scss` / `src/styles.css`, `public/` keeps only `favicon.svg` | B | ✅ | blank-sass / blank-tailwind file lists | |
| V-C02-037 | 337 | `public/styles.css` is removed "because every build would copy it over the dev server's `dist/styles.css`" | B | ❌ L | Core never copies a static file at the Tailwind output path; it warns instead (packages/core/src/core/build.ts:1164-1177). tailwind-processor.ts:33-34 gives the real reason. | old: "Either way `public/styles.css` is removed, because every build would copy it over the dev server's `dist/styles.css`." → new: "Either way `public/styles.css` is removed: `--tailwind-output dist/styles.css` names the same path, so Stati would not copy it." |
| V-C02-038 | 339 | `typecheck` script added | B | ✅ | typescript-processor.ts:33-35; package-json.ts:26-39 | (placement, see V-C02-045) |
| V-C02-039 | 343-351 | `--no-typescript`: no `src/main.ts`, `tsconfig.json`, `typecheck`; `stati.config.js` | B | ✅ | work/C02/blank-js file list; create.ts:210-222 | |
| V-C02-040 | 355-368 | Agent skill tree in `.claude/skills/stati/` with `skills-lock.json` | B | ✅ | agent-skill.ts:36-40; .claude/skills/stati/ holds SKILL.md, LICENSE, references/, assets/, scripts/ | |
| V-C02-041 | 372-373 | Node 22.20+ or 24+; npm/yarn/pnpm/bun | G | ✅ | packages/create-stati/package.json `engines`; create.ts:27 | |
| V-C02-042 | 96-381 | Links: `/configuration/images`, `/core-concepts/collections`, `/configuration/css#sass`, `/configuration/css`, `/configuration/typescript` | R | ✅ | V-AUTO-001/002; each target covers the promised topic | |
| V-C02-043 | 179, 195, 214 | "...works on first run. Its sample ... explain how each part of it works, so you can read them, then replace them with your own." three times | V | ✂️ | Same sentence per template | Say it once after the template list (line 165): new line "Each complete template works on first run, and its sample pages explain how each part works." Then delete the three intro sentences (old: "A blog that works on first run. Its sample posts explain how each part of it works, so you can read them, then replace them with your own." and the docs and news equivalents). |
| V-C02-044 | 191, 210, 229 | "ships its own `stati.config.js` ... becomes `stati.config.ts` with TypeScript, and its stylesheet is carried over into `src/`" three times | V | ✂️ | Repeated per template | Keep it once in the sentence added by V-C02-043: "The blog, docs and news templates ship their own `stati.config.js`, which becomes `stati.config.ts` with TypeScript; with Sass or Tailwind their stylesheet is carried over into `src/`." Delete the docs (line 210) and news (line 229) sentences; reduce line 191 to "The blog adds a `build:drafts` script (...)." |
| V-C02-045 | 339 | Typecheck sentence sits under "With Tailwind CSS" | V | ✂️ | Unrelated to Tailwind | delete line 339 and append to line 307 paragraph: "TypeScript projects also get a `typecheck` script (`tsc --noEmit`)." |
| V-C02-046 | 233 | "Choose your preferred styling approach:" | V | ✂️ | Restates the heading | delete |
| V-C02-047 | 258-266, 375-381 | "Post-creation setup" and "Next steps" both start with `npm run dev` | V | ✂️ | Duplicate | delete "- Start the development server: `npm run dev`" from Next steps |

### docs-site/site/getting-started/installation.md

Covers: `packages/create-stati/src/index.ts`, `typescript-processor.ts`; `packages/core/src/constants.ts`; manual setup against core

| ID | Line | Claim | Cat | Status | Evidence | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| V-C02-048 | 11-12 | Node 22.20.0+ on 22.x, or 24+; npm/pnpm/yarn/bun | G | ✅ | packages/*/package.json `engines` `^22.20.0 \|\| >=24`; create.ts:27 | |
| V-C02-049 | 22-32 | Prompt list | B | ✅ | index.ts:184-343 | |
| V-C02-050 | 39-42 | `--styling tailwind` (space form) and the remaining questions | L | ✅ | index.ts:88-90 (`value \|\| args[++i]`), 202-305 | |
| V-C02-051 | 46-59 | Options table | L | ✅ | index.ts:76-158 | |
| V-C02-052 | 44-59 | Options table duplicates scaffolder.md "Command line options" | V | ✂️ | Same flags, same descriptions | old: "Here are the available options:" plus the table → new: "See [Command line options](/cli/scaffolder#command-line-options) for every flag." |
| V-C02-053 | 63-77 | TypeScript by default: `stati.config.ts`, `tsconfig.json`, `src/main.ts`; esbuild compiles from `src/`; `npm run typecheck`; `--no-typescript` gives `stati.config.js` | B | ✅ | typescript-processor.ts:24-37; core/src/constants.ts:129, 138; built blank-css: `_assets/main-*.js` injected | |
| V-C02-054 | 79 | Tip: Tailwind "in a single process"; build runs Tailwind after the pages and hashes the name | B | ❌ L | packages/cli/src/tailwind.ts:173 spawns a child process. Hashing ✅ (built blank-tailwind). Also duplicates scaffolder.md:248-256. | old: "`stati dev` runs the dev server and Tailwind watcher in a single process, and `stati build` runs Tailwind after the pages and names the stylesheet after its content, so you need no separate CSS scripts or process managers." → new: "`stati dev` and `stati build` run Tailwind themselves, so you need no separate CSS scripts. See [Tailwind CSS](/cli/scaffolder#tailwind-css)." |
| V-C02-055 | 85-99 | Manual install commands | X | ✅ | Ran in work/C02/manual; note `npm init -y` writes `"type": "commonjs"` (npm 11), which line 114 tells you to change | optional: add `npm pkg set type=module` after `npm init -y` and drop "(and ensure `"type": "module"` for ESM imports)" |
| V-C02-056 | 97-125 | Manual setup creates no `site/layout.eta`, yet "Verification" implies a working site | X | ❌ M | Build warns `No layout template found, using fallback` (packages/core/src/core/templates.ts:367) and writes fallback HTML (title "Untitled"); reproduced in work/C02/manual | After the `echo '# Hello Stati' > site/index.md` block add: "Create `site/layout.eta`, the layout every page uses:" with ```` ```eta ```` block: `<!DOCTYPE html>` / `<html lang="en">` / `<head><meta charset="UTF-8" /><title><%= stati.page.title \|\| stati.site.title %></title></head>` / `<body><main><%~ stati.content %></main></body>` / `</html>` |
| V-C02-057 | 101-125 | `stati.config.js` sample and scripts | X | ✅ | Built in work/C02/manual | |
| V-C02-058 | 129 | "Stati sizes and lazy-loads your images without extra packages" | B | ❌ L | Markdown images only (core/src/images/markdown-rule.ts) | old: "Stati sizes and lazy-loads your images without extra packages." → new: "Stati sizes and lazy-loads Markdown images without extra packages." |
| V-C02-059 | 132-135 | `npm install --save-dev @stati/images`, then config | X | ✅ | link /configuration/images covers `images.responsive`/`images.og` | |
| V-C02-060 | 141-152 | Dev at `localhost:3000`, preview at `localhost:4000` | G | ✅ | packages/core/src/constants.ts:42, 45 | |
| V-C02-061 | 42, 58, 135, 156-158 | Links | R | ✅ | `#running-without-prompts` and `#agent-skill` headings exist in scaffolder.md:63, 112 | |

### docs-site/site/getting-started/quick-start.md

Covers: scaffolder prompts; `examples/blank`; core dev server and config types

| ID | Line | Claim | Cat | Status | Evidence | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| V-C02-062 | 15-21 | Defaults install dependencies; dev serves at :3000 with reload | B | ✅ | index.ts:298-315; constants.ts:42. (Accepting every default also installs the agent skill to `.claude/skills/stati/`, index.ts:285, and initializes Git; not stated, not wrong) | |
| V-C02-063 | 25-26 | Prerequisites | G | ✅ | engines | |
| V-C02-064 | 27 | "A text editor (VS Code recommended)" | V | ✂️ | No information | delete |
| V-C02-065 | 37-47 | Prompt order and defaults | B | ✅ | index.ts:184-343 | |
| V-C02-066 | 55 | Dependencies already installed if chosen | B | ✅ | create.ts:386-389 | |
| V-C02-067 | 61-74 | Default project tree | B | ⚠️ L | Matches work/C02/blank-css except `README.md`, which the blank template copies (examples/blank/README.md; examples.ts:126-136) | add `├── README.md             # The template's notes` after `package.json` |
| V-C02-068 | 84-88 | Dev server watches `site/` and `public/`, rebuilds and reloads | B | ✅ | packages/core/src/core/dev.ts:837-842 | |
| V-C02-069 | 94-97 | Screenshots, light/dark | R | ✅ | V-AUTO-002 | |
| V-C02-070 | 106-129 | Editing `site/index.md` refreshes the browser | X | ✅ | dev.ts watch | |
| V-C02-071 | 108-127 | Sample page body: "Features I Love" list and "Ready to build something amazing!" | V | ✂️ | Marketing copy inside an example; a two-line body shows the same | new block: front matter as is, then `# Hello, Stati!` / blank / `This is my first page built with Stati.` |
| V-C02-072 | 133-159 | `site/about.md` served at `/about` | X | ✅ | Routing (built blog-css `about.html`) | |
| V-C02-073 | 135-157 | About sample: "Why Stati?" list and "Contact" | V | ✂️ | Marketing copy inside an example | new block: front matter as is, then `# About Me` / blank / `A few words about me and this site.` |
| V-C02-074 | 163-172 | `site/layout.eta` header nav snippet with `aria-current` | X | ✅ | examples/blank/site/layout.eta:29-31; anchor `#dynamic-attribute-values` (V-AUTO-001) | |
| V-C02-075 | 176-192 | `--accent`/`--accent-ink` in light and dark sets; accent styles links, focus rings, selection; Sass `$primary-color` = light accent; Tailwind uses `blue-*` | X | ✅ | examples/blank/public/styles.css:20-37, 66-77; sass-processor.ts:68-75; tailwind-processor.ts:99-245 | |
| V-C02-076 | 198-231 | Config sample: `dev.port`, `dev.open`, `sitemap` and `robots` options | G | ✅ | packages/core/src/types/config.ts:121-136; examples/blog/stati.config.js:64-78 use the same keys | |
| V-C02-077 | 238-250 | `npm run build` writes `dist/`; deploy targets | B | ✅ | default `outDir` | |
| V-C02-078 | 252-278 | "What's Next?" and "Need help?" both link Examples | V | ✂️ | Duplicate links in two closing sections | delete "- Browse [Examples](/examples/list) for inspiration" from Need help |

### docs-site/site/getting-started/project-structure.md

Covers: `packages/core/src/core/content.ts`, `template-index.ts`, `templates.ts`, `utils/template-discovery.utils.ts`, `build.ts` (static copy), `constants.ts`

| ID | Line | Claim | Cat | Status | Evidence | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| V-C02-079 | 11 | "Stati organizes your files in a clean and structured way, designed for simplicity and flexibility." | V | ✂️ | No information | delete |
| V-C02-080 | 15-45 | Example tree; TypeScript adds `stati.config.ts`, `tsconfig.json`, `src/main.ts` | B | ✅ | typescript-processor.ts:24-37 | |
| V-C02-081 | 51-56 | `index.md` → `/`, `about.md` → `/about`, `blog/index.md` → `/blog`, `blog/first-post.md` → `/blog/first-post` | B | ✅ | core/src/core/content.ts:97 (index handling); built blog-css `posts.html`, `posts/*.html` | |
| V-C02-082 | 57 | `[tag].md` with `generate: { from: tags }` makes one page per tag and none at its own URL | B | ✅ | examples/blog/site/tags/[tag].md; built output has `tags/<tag>.html`, no `[tag]` page | |
| V-C02-083 | 59 | Co-located `./map.png` copied to `/_img/` with its size | B | ✅ | core/src/images/markdown-rule.ts; built blog-js-img `_img/sample-*.png` | |
| V-C02-084 | 63-67 | `public/` copied to the output root | B | ✅ | core/src/core/build.ts:1154-1190 | |
| V-C02-085 | 71-79 | Any `.eta` under `site/` can be included by path without extension; folders of templates add no URLs | B | ✅ | core/src/core/template-index.ts (lists every `.eta`); content.ts:40-45 globs only `.md` | |
| V-C02-086 | 85-109 | Config sample; `bundles` defaults to `[{ entryPoint: 'main.ts', bundleName: 'main' }]` | G | ✅ | core/src/constants.ts:138; core/src/core/utils/typescript.utils.ts:101 | |
| V-C02-087 | 113-124 | `package.json` section with two scripts | V | ✂️ | Says nothing the installation and scaffolder pages don't | delete the `### \`package.json\`` section |
| V-C02-088 | 130-133 | `layout.eta`, section layout, `blog/index.eta` used ahead of `layout.eta` once the folder holds other pages, `base.eta` shell | B | ✅ | core/src/core/template-index.ts:504-529; core/src/core/utils/template-discovery.utils.ts:149-169 | |
| V-C02-089 | 135 | Front matter `layout` looked up from the page's folder up, `/name` from `site/`, no match warns and falls back to `layout.eta` discovery | B | ✅ | template-index.ts:480-503; core/src/core/templates.ts:396-410 | |
| V-C02-090 | 139 | "every `.md` file outside an underscore folder becomes a page" | B | ⚠️ L | Drafts (without `--include-drafts`) and `[param].md` templates do not (core/src/core/expand.ts removes the templates; content.ts:40-55); line 57 already mentions templates | old: "every `.md` file outside an underscore folder becomes a page" → new: "every `.md` file outside an underscore folder becomes a page, apart from drafts and `[param].md` templates" |
| V-C02-091 | 140-141 | `.eta` never a page; `og.eta` with `images.og` | B | ✅ | AGENTS.md:88-92; core/src/images/runtime.ts:393-407 | |
| V-C02-092 | 177-181 | Underscore folders excluded from routing; templates in them still includable; `_draft.md` not excluded | B | ✅ | content.ts:43 (`ignore: ['**/_*/**', '_*/**']`, folders only) | |
| V-C02-093 | 185-191 | Layouts "cascade"; section layout overrides; included templates looked up from the page's folder up | B | ✅ | template-index.ts:504-512 | |
| V-C02-094 | 183-189 | "Template inheritance" list repeats the Layouts list (lines 130-131) | V | ✂️ | Duplicate within the page | delete lines 185-189 (the "Layouts cascade" list); keep the line 191 sentence and move it under "### Layouts" |
| V-C02-095 | 195-197 | `site/blog/index.md` → `/blog` written to `dist/blog.html`; no index file → 404 | B | ✅ | built blog-css `posts.html` | |
| V-C02-096 | 203-213 | Build output tree | B | ❌ L | Omits `_assets/`, which every production build writes with `css.hash` on (default): hashed stylesheet copies and script bundles (built blank-css: `dist/_assets/styles-2A268E91.css`, `main-VYKJRYC5.js`) | add `├── _assets/       # hashed stylesheets and script bundles` above `_img/` |
| V-C02-097 | 217-221 | Next-step links | R | ✅ | V-AUTO-001 | |

### docs-site/site/examples/list.md

Covers: `examples/*`

| ID | Line | Claim | Cat | Status | Evidence | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| V-C02-098 | 11, 19-21 | Four templates; blank features | B | ✅ | examples.ts:29-91 | |
| V-C02-099 | 33-43 | Blank key files | B | ✅ | `git ls-files examples/blank` | |
| V-C02-100 | 59-61, 73-85 | Blog features and key files | B | ✅ | examples/blog tree; site/posts/index.md (`layout: /layout`) | |
| V-C02-101 | 97-99, 111-123 | Docs features and key files (home uses `home.eta`) | B | ✅ | examples/docs tree; site/index.md (`layout: home`) | |
| V-C02-102 | 135-136, 149-165 | News features and key files | B | ✅ | examples/news tree and config | |
| V-C02-103 | 137 | "seeing `collections.generate`, generated pages, several RSS feeds and build hooks work together" | B | ❌ L | One hook: `beforeAll` (examples/news/helpers/news.js:452) | old: "several RSS feeds and build hooks work together" → new: "several RSS feeds and a `beforeAll` hook work together" |
| V-C02-104 | 50-53, 175-177 | Links | R | ✅ | V-AUTO-001 | |
| V-C02-105 | 179-181 | "Community examples" with no content | V | ✂️ | Placeholder | delete section |
| V-C02-106 | 183-208 | "Development patterns": content organization and template hierarchy trees | V | ✂️ | Duplicates project-structure.md "Advanced structure" and "Template inheritance" | delete section; add "- **Project structure** - [/getting-started/project-structure](/getting-started/project-structure)" to Learning resources |
| V-C02-107 | 216 | "Happy building with Stati!" | V | ✂️ | Filler | delete |

### packages/create-stati/README.md

Covers: `packages/create-stati/src/*`; core TypeScript bundling

| ID | Line | Claim | Cat | Status | Evidence | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| V-C02-108 | 19-26 | Wizard steps | B | ❌ M | Missing the image tools prompt between TypeScript and agent skill (index.ts:262-272) | after "4. **TypeScript** ..." insert "5. **Image tools** - Off by default; yes adds `@stati/images` for responsive images and link preview cards" and renumber 5-8 to 6-9 |
| V-C02-109 | 40 | (F2) "the TypeScript and agent skill prompts are skipped" | B | ❌ M | The image tools prompt is skipped too (index.ts:262-272); scaffolder.md:65 is right | old: "the TypeScript and agent skill prompts are skipped." → new: "the TypeScript, image tools and agent skill prompts are skipped: the project uses TypeScript (unless `--no-typescript`) and gets neither image tools (unless `--images`) nor an agent skill (unless `--agent-skill`)." |
| V-C02-110 | 44-53 | Flag list | L | ❌ M | Missing `--images` and `--no-images` (index.ts:39-41, 99-104) | after the `--no-typescript` item add "- `--images` - Add image tools: responsive AVIF/WebP images and link preview cards (`@stati/images`)" and "- `--no-images` - Skip image tools (default)" |
| V-C02-111 | 57-75 | Example commands | X | ✅ | All parse (index.ts:76-158) | |
| V-C02-112 | 77 | "When no prompt is shown at all, dependencies are installed with `npm` unless you pass `--no-install`." | B | ❌ M | A run with no prompt at all needs `--no-install` (the install prompt shows otherwise, index.ts:298-305), so it never installs. Without `--package-manager` the scaffolder uses the only manager it finds, asks when it finds several, and falls back to npm when it finds none (index.ts:318-343) | old: the whole note → new: "> **Note:** Without `--package-manager`, the scaffolder uses the one package manager it finds, asks when it finds several, and falls back to npm." |
| V-C02-113 | 85-104 | Interactive sample | X | ❌ L | Missing `? Add image tools? Responsive AVIF/WebP images and link preview cards (@stati/images) (y/N)` after `Use TypeScript?` (index.ts:264-272) | insert that line after `? Use TypeScript? (Y/n)` |
| V-C02-114 | 108 | Package manager prompt conditions | B | ✅ | index.ts:318-343 | |
| V-C02-115 | 114-119 | TypeScript files and `typecheck` | B | ✅ | typescript-processor.ts:24-37 | |
| V-C02-116 | 125-128 | Dev: stable names, source maps, no minify; prod: hashed, minified; bundle injected before `</body>` | B | ✅ | core/src/core/utils/typescript.utils.ts:102-106, 136-137, 620-667 | |
| V-C02-117 | 130-138 | `stati.assets.bundlePaths` array | T | ✅ | core/src/types/content.ts:14-26 | |
| V-C02-118 | 144-181 | Agent skill section | L | ✅ | Same as V-C02-015 to 017; external parts as V-C02-018 | |
| V-C02-119 | 187-217 | Blog, docs, news descriptions | B | ✅ | examples/*; "link previews" = OG/Twitter tags | |
| V-C02-120 | 237-252 | Blank tree (plain CSS, TS) | B | ✅ | work/C02/blank-css (omits the copied `README.md`, harmless) | |
| V-C02-121 | 287 | "Sets the site title and description; add `baseUrl` before deploying" | G | ❌ L | The generated config already has a placeholder `baseUrl` (create.ts:268-279) | old: "Sets the site title and description; add `baseUrl` before deploying" → new: "Sets the site title, description and a placeholder `baseUrl`; set your real address before deploying" |
| V-C02-122 | 311-333 | CSS options: locations, hashing, Tailwind 4 with no config file | B | ✅ | sass-processor.ts:10-57; tailwind-processor.ts:10-63; built outputs | |
| V-C02-123 | 341-383 | Install commands; dev at :3000 with live reload; `dist/`; preview at :4000 | B | ✅ | constants.ts:42, 45 | |
| V-C02-124 | 391-408 | Conventional structure | B | ✅ | | |
| V-C02-125 | 416-419, 475-477 | Links to `https://stati.build/.../` with trailing slashes | R | ⚠️ L | Each answers 301 to the URL without the slash (checked with curl: `/core-concepts/overview/` → `/core-concepts/overview`) | drop the trailing slashes: `https://stati.build/core-concepts/overview`, `/configuration/file`, `/examples/list`, `/cli/commands` (also examples/blank/README.md:49 `/configuration/typescript/`) |
| V-C02-126 | 441-459 | Generated `stati.config.ts` sample | X | ✅ | Identical to work/C02/blank-css/stati.config.ts apart from the title | |
| V-C02-127 | 467-468 | Requirements | G | ✅ | engines | |
| V-C02-128 | 28 | "In less than 2 minutes, you'll have a complete static site ready to customize." | V | ✂️ | Filler, repeats line 3 | delete |
| V-C02-129 | 106 | "Each choice is explained, so you can make the right decision for your project." | V | ✂️ | Filler | delete |
| V-C02-130 | 231-233 | "Responsive design foundation ready to customize", "Extensible architecture for any project type", "Just the essentials - build on your own terms" | V | ✂️ | Filler bullets | delete the three bullets |
| V-C02-131 | 290-295 | "### Perfect For" list | V | ✂️ | Filler | delete section |

### examples/blank/README.md

| ID | Line | Claim | Cat | Status | Evidence | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| V-C02-132 | 7-11 | Semantic layout, light/dark stylesheet, skip link and ARIA landmarks, meta tags, one homepage | B | ✅ | examples/blank/site/layout.eta:5-14, 21-37 | |
| V-C02-133 | 15-18 | Quick start file paths | B | ⚠️ L | Line 17 `public/styles.css` is right only for plain CSS; this README is copied into Sass and Tailwind projects too (examples.ts:126-136), where styles are in `src/` | old: "3. Add your styles: `public/styles.css`" → new: "3. Add your styles: `public/styles.css` (`src/` with Sass or Tailwind)" |
| V-C02-134 | 20 | Tip: create a TypeScript project with `--typescript` | L | ❌ L | TypeScript is the default (index.ts:349) | old: "> **Tip:** Create a TypeScript-enabled project with `npx create-stati my-site --typescript`" → new: "> **Tip:** `npx create-stati` creates TypeScript projects by default; pass `--no-typescript` for JavaScript." |
| V-C02-135 | 24-27, 31-40, 44-49 | Scripts, tree, next steps, include syntax | B | ✅ | examples/blank/package.json; layout.eta | |

### examples/blog/README.md

| ID | Line | Claim | Cat | Status | Evidence | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| V-C02-136 | 7-16 | Features: posts five a page, `/tags/<tag>`, archive at `/posts`, newer/older/related, `/feed.xml`, sitemap, robots, OG/Twitter, drafts, Young Serif, 404 with latest posts | B | ✅ | examples/blog/site/*.md front matter; stati.config.js:36-78; built blog-css | |
| V-C02-137 | 27-40 | Post front matter sample | X | ✅ | matches existing posts (`publishedAt`, `tags`, `draft`) | |
| V-C02-138 | 44-48 | Scripts | X | ⚠️ M | `build:drafts` misses the CSS step with Sass or Tailwind; see V-C02-023 (maintainer decision) | none in the README if the script is fixed |
| V-C02-139 | 52-75 | Directory tree | B | ✅ | `git ls-files examples/blog` (`og.eta` and `og/` are removed without image tools) | |
| V-C02-140 | 79-85 | Listings: `collection: /posts`, `listing`, `paginate: 5`, `[tag].md`, `stati.generated`, `relatedPosts`; rebuild and pruning | B | ✅ | site/index.md, tags/[tag].md, helpers/blog.js:45; AGENTS.md:32 (prune) | |
| V-C02-141 | 89-91 | `seo.openGraph.image` front matter | T | ✅ | core/src/types/content.ts:205, 273-274 | |

### examples/docs/README.md

| ID | Line | Claim | Cat | Status | Evidence | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| V-C02-142 | 7-17 | Features | B | ✅ | examples/docs config, helpers/docs.js, public/scripts/docs.js | |
| V-C02-143 | 21-46 | Quick start and page front matter (`order`, `draft`, `sidebar: false`, `sidebarTitle`, section `index.md`) | X | ✅ | helpers/docs.js:14-19, 144-149 | |
| V-C02-144 | 50-54 | Scripts | X | ⚠️ M | same `build:drafts` issue as V-C02-138 | |
| V-C02-145 | 58-81 | Directory tree | B | ✅ | `find examples/docs/site` | |
| V-C02-146 | 85 | Nav nodes carry title, URL, order, date and children; helpers named | T | ✅ | core/src/types/navigation.ts:28-43 (also `path`, `isCollection`); helpers/docs.js:205-227 | |
| V-C02-147 | 89-91 | Page `image` front matter for link previews | B | ✅ | helpers/docs.js:250-251 | |

### examples/news/README.md

| ID | Line | Claim | Cat | Status | Evidence | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| V-C02-148 | 7-19 | Features (sections, ranked front page with newest fallback lead, articles, authors, topics, latest stream, pagination, search, feeds, SEO, News sitemap, themes, 404) | B | ✅ | stati.config.js; helpers/news.js:48, 185-187, 385, 405; site/*.md front matter; built news-css (`feed-<section>.xml`, `news-sitemap.xml`) | |
| V-C02-149 | 23-59 | Quick start, article front matter, adding a section | X | ✅ | stati.config.js:19-33; helpers/news.js | |
| V-C02-150 | 63-67 | Scripts (`build:drafts` = `npm run build -- --include-drafts`) | X | ✅ | examples/news/package.json | |
| V-C02-151 | 71-112 | Tree, listings, `collections.generate`, `summaryFields`, `--force` after helper changes | B | ✅ | stati.config.js:73-91; site/news/[section].md, authors/[author].md, tags/[tag].md | |
| V-C02-152 | 116-119 | Before you deploy | B | ✅ | | |

### F2 and F3 resolution

- **F2.** `cli/scaffolder.md:65` is correct (TypeScript, image tools and agent skill prompts are skipped; index.ts:249-287). `packages/create-stati/README.md:40` is wrong: it omits the image tools prompt (V-C02-109). The README also omits the image tools prompt from the wizard list and sample (V-C02-108, V-C02-113) and the `--images`/`--no-images` flags (V-C02-110).
- **F3.** No page promises anything for an invalid `--styling` value; all list `css|sass|tailwind`. Behavior: `parseArgs` stores any value (index.ts:88-90). The template is then copied, the config, TypeScript files and package.json are written, and `processStyling` throws `Unsupported styling option: <x>` (css-processors.ts:56-57, 80-81). `create()` deletes the new directory (create.ts:393-398) and the CLI exits 1 with "Failed to create Stati site / Failed to setup less: Unsupported styling option: less". Reproduced. A related quirk: `--styling` followed by another flag takes that flag as its value (`--styling --no-git` sets styling to `--no-git`, and the Git prompt then appears). `--template` and `--package-manager` are validated at parse time instead. No doc change needed; **maintainer decision**: validate `--styling` in `parseArgs` like `--template` (source change, out of this docs pass).

### Gaps

- `.gitignore` is written only by Git initialization (create.ts:479-525). With `--no-git` the project has no `.gitignore`, so a later manual `git init` would commit `node_modules/`, `dist/`, `.stati/` and, with Sass, `public/styles.css`. scaffolder.md:44 or :246 could say: "With `--no-git` there is no `.gitignore` either." Note for the maintainer: the generated `.gitignore` also lists `package-lock.json` and `yarn.lock` (create.ts:487-490), which is unusual for an app and undocumented.
- The interactive agent skill prompt defaults to `.claude/skills` (index.ts:285), so pressing Enter through the quick start installs the skill over the network. quick-start.md:21 could mention it ("...installs dependencies and the agent skill for you").
- Manual installation never creates a layout (V-C02-056).

### Terminology

- "front matter" (most pages) vs "frontmatter" (project-structure.md:181) vs "front-matter" (examples/list.md:36).
- "Styling solution" (scaffolder.md:55, installation.md:26) vs "CSS solution" (quick-start.md:41, README:21, `--help`).
- "link preview card(s)" (scaffolder, installation, quick-start) vs "an Open Graph image for every page" (installation.md:129) vs "link previews" meaning OG/Twitter tags (README:199, list.md:98). Suggest "link preview card" for the generated image and "Open Graph and Twitter tags" for the meta tags.
- Templates for inclusion: "included templates" (project-structure.md:140, 191) vs "Reusable template parts" (README:396) vs "partials" folder name. Consistent enough; prefer "included templates".
- British vs American spelling across example READMEs: "licence(s)", "colours" (blog, news) vs "license", "colors" (docs, docs-site).

### Cross-cluster

- `docs-site/site/information/ai-policy.md:47-74` (C10) repeats the `skills` CLI add/update commands from scaffolder.md:136-156; one could link to `/cli/scaffolder#add-or-update-the-skill-in-an-existing-site` instead.
- `docs-site/site/glossary.md:184-186` (C09): the scaffolder entry lists "styling options, TypeScript support, and Git initialization" but not templates, image tools or the agent skill.
- `AGENTS.md:74` (not in scope): "Generated projects expect ... `public/styles.css`" is not true for Sass and Tailwind projects, which delete it.
- `.claude/skills/stati/references/workflow.md:25-36` (skill): the scaffolder flag table lacks `--images`, `--no-images`, `--agent-skill`, `--no-agent-skill`.

### Phase 5 log

- V-C02-004: applied (scaffolder.md note deleted)
- V-C02-011: applied; re-checked against packages/core/src/images/markdown-rule.ts, images/markup.ts:63
- V-C02-018: applied per D10 and the lead's ruling: scaffolder.md and create-stati README keep the command create-stati runs (agent-skill.ts:94-110), the fallback (create.ts:440-446) and the two commands it prints (agent-skill.ts:43, 56-58; index.ts:385-387); the skills-lock, git/network, update, `-g`, `.github/skills` and telemetry bullets are cut. Heading "Add or update the skill in an existing site" kept, so ai-policy.md:73 still resolves
- V-C02-023, V-C02-138, V-C02-144: left (lead ruling H2: example package.json out of scope; scaffolder.md:191 still describes the script as it is)
- V-C02-026: applied; re-checked against examples/news/stati.config.js:120-124, helpers/news.js:451-452, 504
- V-C02-031: applied; re-checked against packages/cli/src/tailwind.ts:173
- V-C02-037: applied; re-checked against packages/core/src/core/build.ts:1164-1177
- V-C02-043, V-C02-044: applied (one sentence pair under "Project templates"; the blog keeps its unique facts: feed/sitemap/SEO settings and `build:drafts`)
- V-C02-045: applied (typecheck sentence moved to the plain CSS paragraph; typescript-processor.ts:33-35)
- V-C02-046, V-C02-047: applied
- V-C02-052: applied (installation.md table replaced by a link to /cli/scaffolder#command-line-options; the table's `#agent-skill` link went with it)
- V-C02-054: applied; re-checked against packages/cli/src/tailwind.ts:173; link /cli/scaffolder#tailwind-css exists (heading "### Tailwind CSS")
- V-C02-055: applied (`npm pkg set type=module`; the "ensure type module" clause dropped)
- V-C02-056: applied; re-ran the whole manual setup in work/C02/manual2: no "No layout template found" warning (templates.ts:367), title "My Stati Site"
- V-C02-058: applied; re-checked against core/src/images/markdown-rule.ts
- V-C02-064: applied
- V-C02-067: applied (README.md in the quick-start tree; examples.ts:126-136 copies it)
- V-C02-071, V-C02-073, V-C02-078: applied
- V-C02-079, V-C02-087: applied
- V-C02-090: applied; re-checked against core/src/core/content.ts:61-62, expand.ts:17
- V-C02-094: applied ("Template inheritance" removed; its facts now one sentence under Layouts, "replaces" per D6); re-checked against template-index.ts:340-355, 517
- V-C02-096: applied; re-checked against built blank-css `dist/_assets/`
- V-C02-103: applied; re-checked against helpers/news.js:451-452
- V-C02-105, V-C02-106, V-C02-107: applied (project-structure link added to Learning resources); no links pointed at the removed headings
- V-C02-108, V-C02-109, V-C02-110, V-C02-113: applied; re-checked against index.ts:39-41, 99-104, 249-287 (prompt text and `default: false` give "(y/N)")
- V-C02-112: applied; re-checked against index.ts:298-343
- V-C02-121: applied; re-checked against create.ts:268-279
- V-C02-125: applied (trailing slashes dropped in create-stati README and examples/blank/README.md:49)
- V-C02-128, V-C02-129, V-C02-130, V-C02-131: applied
- V-C02-133: applied
- V-C02-134: applied; re-checked against index.ts:349
- Gap `.gitignore` with `--no-git`: applied (scaffolder.md step list); create.ts:479-525
- Gap agent skill by default: applied (quick-start.md:21); index.ts:285, agent-skill.ts:36-37
- Node wording: applied in scaffolder.md (Requirements), installation.md:11, quick-start.md:25; READMEs keep the engines form
- D7/D6 quick-start.md nav snippet: applied (`eta` fence, `stati.url('/')`, `stati.url('/about')`, one sentence on `stati.url()`); rendered in work/C02/blank-css: `href="/"`, `href="/about"`, `aria-current="page"` on /about; templates.ts:322-323
- D7 create-stati README modulepreload example: applied (`stati.url(path)`); types/content.ts:22-24 says bundle paths are site-relative
- D6 "frontmatter"/"front-matter": applied (project-structure.md, examples/list.md)
- Cross-cluster C05 (examples/blank/site/layout.eta root links and canonical): left (examples' code is out of scope for this phase)
- Cross-cluster C09 (examples/blank/package.json ranges): left (package.json out of scope)
- C01 Terminology note on Node wording in my files: applied (see Node wording)

Applied 49 (43 findings, 2 gaps, Node wording, 2 D7 edits, 1 D6 pass), rejected 0, left 5 (V-C02-023, -138, -144, C05 layout item, C09 package.json item).

## C03 findings

Summary: 103 claims; ✅ 68, ❌ 6 (H 1, M 3, L 2), ⚠️ 13, ✂️ 16.

Method: read the sources listed per page; built a test project (`work/C03/proj`, local CLI, `@stati/core` junction) that pastes every Eta snippet of the four pages into real templates (`snippets.eta`, `article.eta`, `full.eta`, `base.eta`, `blog/layout.eta`, partials) plus every helper from `configuration/templates.md`; built it in production, ran `stati dev --port 4103` against it (validating proxy on; server stopped, port free), added error cases (second `stati.layout()`, include cycle, unknown name, non-object props, Eta `include()`) and rebuilt with `site.baseUrl: 'https://example.com/docs'` to see the base path warnings. `work/C03/compile.mjs` compiles a template with Stati's Eta plugin to locate syntax errors. Line numbers below are the doc's.

### docs-site/site/core-concepts/templates.md

Covers: packages/core/src/core/templates.ts, template-render.ts, template-index.ts, eta-plugin.ts, core/utils/template.utils.ts, template-discovery.utils.ts, context-validation.utils.ts, collections.ts (summary), config/loader.ts (helpers)

| ID | Line | Claim | Cat | Status | Evidence | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| V-C03-001 | 9 | "providing a powerful yet familiar syntax for creating dynamic layouts and templates" | V | ✂️ | Filler; the second sentence says what matters. | old: "Stati uses Eta as its templating engine, providing a powerful yet familiar syntax for creating dynamic layouts and templates." → new: "Stati renders pages with [Eta](https://eta.js.org/) templates." |
| V-C03-002 | 13 | "Eta is a fast, lightweight templating engine with a syntax similar to EJS but with better performance and TypeScript support." | V | ✂️ | Marketing; "TypeScript support" misleads: template code is not transpiled (templates.ts:165-174 creates Eta with no transform). The fact that template code is plain JavaScript is stated only in api/templates.md:361, not on this page. | old: the whole line 13 → new: "Code inside `<% %>` tags is plain JavaScript: Stati does not compile TypeScript in templates, so type annotations or `as` casts are a syntax error. Templates read their data from `stati`, not Eta's usual `it`." |
| V-C03-003 | 17 | Convention: one expression per attribute; Eta renders spliced values; `propValue()` records classes in the Tailwind inventory | B | ✅ | Built: `class="bg-<%= color %>-500"` rendered `bg-red-500`; template.utils.ts:38-47 `trackTailwindClass`; build.ts:1315-1317 enables tracking when Tailwind is used | |
| V-C03-004 | 21-27 | Avoid / preferred button example | X | ✅ | Built, both render `class="bg-red-500"` | |
| V-C03-005 | 31-38 | `propValue('btn', ...)` and `data-analytics` example | X | ✅ | Built: `class="btn btn-primary is-active"`, `data-analytics="cta spring active"` | |
| V-C03-006 | 40 | "`stati.propValue()` joins all truthy values with spaces" | B | ⚠️ L | template.utils.ts:35-74: `true` is truthy but prints nothing, arrays keep only strings and numbers (no nesting), objects contribute their keys. | old: "`stati.propValue()` joins all truthy values with spaces (similar to `classnames`)." → new: "`stati.propValue()` joins its strings and numbers, and the keys of objects whose values are truthy, with spaces, and skips falsy values (similar to `classnames`)." |
| V-C03-007 | 42-44 | Template literal for one concatenated value | X | ✅ | Built: `data-id="item-42"` | |
| V-C03-008 | 48-72 | Basic syntax block (escape, raw, if/else, loop over `stati.collection?.pages` with `frontMatter`, `<%/* */%>` comment) | X | ✅ | Built in dev and production; comment tag compiles and prints nothing (eta-plugin.ts:44-55 handles leading comments). Unprefixed `href` see V-C03-041. | |
| V-C03-009 | 78-108 | "Available data" block | X | ❌ H | Three HTML comments contain `<%~`: line 82 "(HTML, so use <%~)", line 102 "(use <%~)", line 106 "(HTML, so use <%~)". `<%~` inside the comment opens an Eta tag, so the copied block does not compile: Eta "unclosed tag at line 1 col 75" (compile.mjs), production build logs "Unexpected token ')'" and writes the fallback page. | old: "<!-- Rendered markdown content (HTML, so use <%~) -->" → new: "<!-- Rendered Markdown (HTML, so print it raw) -->"; old: "<!-- Another template's HTML (use <%~) -->" → new: "<!-- Another template's HTML, printed raw -->"; old: "<!-- Sized, lazy-loaded image (HTML, so use <%~) -->" → new: "<!-- Sized, lazy-loaded image (HTML, so print it raw) -->" |
| V-C03-010 | 79-99 | `stati.page.title/description/url/date/layout`, `stati.content`, `page.toc` (h2-h6), `stati.site.*`, `stati.generator.version` | T | ✅ | templates.ts:263-306 (page overrides, front matter flattened, `generator.version`); markdown.ts:156-157 (levels 2-6); built output matches | |
| V-C03-011 | 101-107 | `stati.include()`, `stati.helpers.formatDate()`, `stati.image()`, `stati.ogImage?.url` | T | ✅ | templates.ts:304, 325-333; template-render.ts:244-255; built (image with empty src returns `''`) | |
| V-C03-012 | 110 | Links to Images in templates and Template API `stati.image` | R | ✅ | configuration/images.md:57; api/templates.md:301 | |
| V-C03-013 | 76-108 | "you have access to:" reads as the list of `stati`, but omits `stati.url()`, `stati.nav`, `stati.collection`, `stati.pagination`, `stati.generated`, `stati.propValue()` and does not link the full list | R | ⚠️ L | types/content.ts:545-639 | Add after line 110: "The [Template API](/api/templates#template-context-stati) lists everything on `stati`." |
| V-C03-014 | 116-129 | Section `layout.eta` overrides/replaces the parent folder's | B | ✅ | template-index.ts:512-533 (nearest `layout.eta` wins); built: blog pages use `site/blog/layout.eta` | |
| V-C03-015 | 133-144 | Resolution order: front matter, folder `layout.eta` up to root, "Root `layout.eta` as final fallback" | B | ⚠️ L | Item 3 restates item 2; the page never says what happens with no layout: templates.ts:366-369 warns "No layout template found, using fallback" and writes `createFallbackHtml`. `index.eta` is explained at line 158. | old: "2. **Directory-specific** `layout.eta` (cascades from current to root)\n3. **Root** `layout.eta` as final fallback" → new: "2. The nearest `layout.eta`, from the page's folder up to `site/`\n\nWithout either, the build warns and writes the page with a bare fallback HTML document." (and drop step "4. `/layout.eta` (root fallback)" wording to "4. `/layout.eta`") |
| V-C03-016 | 146-154 | Front matter `layout` is a name without `.eta`, looked up like includes; `/article` from `site/` only; `layouts/post` nearest; no match warns with similar names and falls back to discovery | B | ✅ | template-index.ts:477-510; templates.ts:396-410 | |
| V-C03-017 | 156 | "The first match wins, providing maximum flexibility while maintaining sensible defaults." | V | ✂️ | Filler | delete |
| V-C03-018 | 158 | Index pages check `index.eta` before `layout.eta` per folder; root `index.md` always an index page; a folder's once it holds another page | B | ✅ | template-index.ts:512-533 (nearer folder wins, `index.eta` first within one); template-discovery.utils.ts:149-169 | |
| V-C03-019 | 164-199 | Root layout example writes its own `og:title`, `og:description`, `og:type`, `og:url`, plus `href="/favicon.svg"`, `href="/styles.css"` | X | ❌ M | Any hand-written `og:` tag makes SEO auto-injection skip its whole Open Graph group (seo/auto-inject.ts:78-98; seo/utils/escape-and-validation.utils.ts:403). Built: `full.html` lost `og:site_name` and `og:locale` that pages without the block get, and would lose generated `og:image`. The two root links break under a base path (build warns "Use stati.url(...)"). | Delete from "    <!-- SEO Meta Tags -->" through the `og:url` meta line; old: `href="/favicon.svg"` → new: ``href="<%= stati.url('/favicon.svg') %>"``; old: `href="/styles.css"` (lines 179 and 214) → new: ``href="<%= stati.url('/styles.css') %>"`` |
| V-C03-020 | 203-257 | Shell example: `base.eta` with `stati.body`, `stati.props?.bodyClass`; `layout.eta` and `blog/layout.eta` naming `base` | X | ✅ | Built: blog index `<body class="site blog">`, root pages `class="site"` | |
| V-C03-021 | 261-265 | `stati.layout()` prints nothing, callable anywhere, wraps after render; body raw, props; nesting; discovery never picks `base.eta`; `stati.body` absent in page layout | B | ✅ | template-render.ts:164-198, 264-271, 244-255; template-index.ts:512-533; context-validation.utils.ts:63-65 | |
| V-C03-022 | 263 | Plain `'base'` in `blog/base.eta` finds itself because names are looked up from the page's folder | B | ✅ | template-index.ts:340-356 + template-render.ts:402-406 (reported as a cycle) | |
| V-C03-023 | 266-270 | One call per template: dev error, production warns, last wins; `stati.layout.has()` | B | ✅ | template-render.ts:389-396; built: "! stati.layout('base'): ... The last call is used."; `article.eta` used the `has()` line | |
| V-C03-024 | 274 | Any `.eta` under `site/` can be included; only Markdown becomes pages; `_` folders skipped by content discovery | B | ✅ | template-index.ts:274-282; content.ts:37-46 | |
| V-C03-025 | 283-291 | Names table; `.eta` suffix dropped; never outside `site/` | B | ✅ | template-index.ts:55-113 | |
| V-C03-026 | 293-303 | Section override at the same path; lookup follows the page, not the caller; pin with `/` or `./` | B | ✅ | Built: `blog/post.md` with root `base.eta` got `site/blog/partials/header.eta`; template-render.ts:295 (lookup from `pageFolder`) | |
| V-C03-027 | 307-331 | Props example and `card.eta` | X | ✅ | Built: cards render for `/blog/post` and `/blog/tech/post2` | |
| V-C03-028 | 335-338 | Renders where included; `stati.props` undefined without props; everything else available; non-object props: dev error, production warning | B | ✅ | template-render.ts:244-255, 410-427 | |
| V-C03-029 | 342-357 | Third argument as `stati.body`, also another include | X | ✅ | Built: `callout-warning` and `callout-note` asides | |
| V-C03-030 | 359 | Component's `stati.layout()` never changes the page's layout | B | ✅ | template-render.ts:211 (own slot per render); test template-composition.test.ts:154 | |
| V-C03-031 | 363-369 | `stati.include.has()` same lookup | B | ✅ | template-render.ts:273-282 | |
| V-C03-032 | 373-376 | Includes synchronous (await = dev error); include without props or content cached per page; cycle message with chain; recursion with props to depth 100; unknown name: overlay with similar paths, production logs and renders nothing | B | ⚠️ L | template-render.ts:327-371, 444-455, 493-510; `MAX_TEMPLATE_DEPTH = 100` (:36). The real chain starts at the page's layout: built "site/errs/errlayout.eta → site/partials/aa.eta → site/partials/bb.eta → site/partials/aa.eta". | old: "(`site/partials/a.eta → site/partials/b.eta → site/partials/a.eta`)" → new: "(`site/layout.eta → site/partials/a.eta → site/partials/b.eta → site/partials/a.eta`)" |
| V-C03-033 | 378 | Eta's `include()`, `includeAsync()`, `layout()`, `block()` unavailable | B | ✅ | eta-plugin.ts:28-34 (also `blockAsync`) | |
| V-C03-034 | 384-424 | Front matter integration example | X | ✅ | Built `blog/post.md` with it; unprefixed `/tags#` link see V-C03-041 | |
| V-C03-035 | 428-439 | Collection = folder with `index.md`; index page reads its own, members theirs, `collection:` names one; sorted/grouped; page models with `frontMatter`; rebuilds on add/remove/retitle/retag | B | ✅ | collections.ts:64-93; templates.ts:233-247; core-concepts/isg.md:24-35 | |
| V-C03-036 | 441 | `index.eta` ahead of `layout.eta`; when a folder's `index.md` is an index page | V | ✂️ | Repeats line 158 almost word for word. | delete line 441 |
| V-C03-037 | 443 | Link to Collections and generated pages | R | ✅ | core-concepts/collections.md exists | |
| V-C03-038 | 447-469 | Helpers in config, called as `stati.helpers.name()` | X | ✅ | types/config.ts:47, 91; templates.ts:304; built same helpers in JS | |
| V-C03-039 | 471 | `this` is the helpers object; Stati's own functions stay on `stati`: `slugify`, `propValue`, `image`, `generateSEO` | B | ⚠️ L | Built: `function` helper calling `this.uppercase()` works; list omits `stati.url()` (templates.ts:322). | old: "`stati.slugify()`, `stati.propValue()`, `stati.image()` and `stati.generateSEO()`." → new: "`stati.slugify()`, `stati.url()`, `stati.propValue()`, `stati.image()` and `stati.generateSEO()`." |
| V-C03-040 | 477-499 | Inline relative-time function; `stati.slugify(tag)` link | X | ⚠️ L | Built OK, but `tag` is undefined in the snippet as written. | old: "<!-- Stati's own slugify for tag links -->\n<a href=\"<%= `/tags/${stati.slugify(tag)}` %>\" class=\"tag-link\">#<%= tag %></a>" → new: "<!-- Stati's own slugify for tag links -->\n<% for (const tag of stati.page.tags ?? []) { %>\n  <a href=\"<%= stati.url(`/tags/${stati.slugify(tag)}`) %>\" class=\"tag-link\">#<%= tag %></a>\n<% } %>" |
| V-C03-041 | 66, 176, 179, 214, 416, 434 | Examples print root links as written: `page.url`, `post.url`, `/favicon.svg`, `/styles.css`, `` `/tags#${tag}` `` | X | ❌ M | With `site.baseUrl: 'https://example.com/docs'` the build warns for each ("href=\"/styles.css\" does not start with the base path /docs ... Use stati.url(\"/styles.css\")"); base-path-links.ts:46-60; the skill's authoring rule and api/templates.md:298 say to wrap them. Work for root-hosted sites. | Wrap each: ``href="<%= stati.url(page.url) %>"`` (66), ``href="<%= stati.url(post.url) %>"`` (434), ``href="<%= stati.url(`/tags#${tag}`) %>"`` (416), favicon and stylesheet as in V-C03-019 (176, 179, 214) |
| V-C03-042 | 503-527 | "You can optimize further" list and "Best practices" lists | V | ✂️ | Generic advice; the facts (compiled once, only used templates render, include cache) are in the first two sentences of 505 and in lines 373-374. | Keep "Stati compiles each template once and reuses it for every page. A page renders only its layout, the shells it names and the templates it includes, and an include without props renders once per page however often it appears." Delete "You can optimize further:" through line 527, and the "### Template caching" / "### Best practices" headings (rename "## Performance considerations" to "## Performance" or merge the two sentences into "Rendering rules"). |
| V-C03-043 | 529-540 | "Generator information" section | V | ✂️ | `stati.generator.version` is already shown at line 96 and in the API reference. | delete lines 529-540 |
| V-C03-044 | 542 | "Understanding templates and layouts is crucial for creating maintainable Stati sites. Next, learn about the [Markdown Pipeline]..." | V | ✂️ | Filler first sentence. | new: "Next, learn about the [Markdown pipeline](/core-concepts/markdown)." |

### docs-site/site/api/templates.md

Covers: packages/core/src/types/content.ts (TemplateContext, includes, layouts, assets, pagination, generated), types/config.ts (SiteConfig, StatiHelpers), types/images.ts (GeneratedOgImage), core/templates.ts, template-render.ts, eta-plugin.ts, context-validation.utils.ts, template.utils.ts, utils/base-path.utils.ts, images/runtime.ts, images/markup.ts, images/og.ts

| ID | Line | Claim | Cat | Status | Evidence | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| V-C03-045 | 11 | "Stati templates have access to a rich context object and built-in functions for building dynamic pages. This reference covers all template-specific APIs." | V | ✂️ | Restates the title and line 15. | delete line 11 |
| V-C03-046 | 17-61 | `TemplateContext` shape | T | ❌ L | Matches types/content.ts:545-639 except: `page.title?` and `page.description?` are not declared (front matter goes through the index signature); `ogImage` and `og` are optional properties (`ogImage?:`, `og?:`). `page.toc` is explained at line 142. | delete the lines "    title?: string;" and "    description?: string;" (28-29); old: "ogImage: GeneratedOgImage \| undefined;" → new: "ogImage?: GeneratedOgImage;"; old: "og: { width: number; height: number } \| undefined;" → new: "og?: { width: number; height: number };" |
| V-C03-047 | 54 | `assets?: StatiAssets; // Bundle paths ([] when none) and the search index path` | T | ⚠️ L | Comment omits `stylesheetPaths` (types/content.ts:19-43); build.ts:779 always sets it. | old: "// Bundle paths ([] when none) and the search index path" → new: "// Bundle, stylesheet and search index paths" |
| V-C03-048 | 63-71 | `TemplateIncludeFunction`, `TemplateLayoutFunction` | T | ✅ | types/content.ts:505-539 | |
| V-C03-049 | 73-87 | `TocEntry`, `SiteConfig` (title, baseUrl, defaultLocale?, description?) | T | ✅ | types/content.ts:59-66; types/config.ts SiteConfig; context-validation.utils.ts:32-37 | |
| V-C03-050 | 89-129 | `ImageOptions`, `GeneratedOgImage`, `StatiAssets`, `PaginationData`, `GeneratedPageData` | T | ✅ | images/runtime.ts:92-103; types/images.ts:190-199; types/content.ts:19-43, 425-470 | |
| V-C03-051 | 132 | Which collection a page reads; pagination/generated undefined elsewhere; reading collection or nav is an ISG dependency | B | ✅ | templates.ts:233-247, 298-302, 107-125; core-concepts/isg.md:24-33 | |
| V-C03-052 | 134 | Root holds only Stati's API; helpers under `stati.helpers` | B | ✅ | templates.ts:292-304 | |
| V-C03-053 | 136 | Extra `site` keys reach templates; the type declares four, so a TypeScript config rejects them | B | ✅ | config/loader.ts:237 (`site: { ...DEFAULT_CONFIG.site, ...userConfig.site }`); types/config.ts SiteConfig | |
| V-C03-054 | 138 | Dev throws for unknown `stati.*` with suggestions; `stati.site.author` throws; front matter not checked; `'author' in stati.site` | B | ✅ | context-validation.utils.ts:44-57, 181-240; built in dev: `'author' in stati.site` printed `false` with no error; test template-composition.test.ts:626 | |
| V-C03-055 | 140-144 | `nav` link; `page.toc` not in the type; `wordCount`/`readingTime` reserved and on collection pages | T | ✅ | types/content.ts:552-560, 373-400; templates.ts:263-280 | |
| V-C03-056 | 148-168 | `stati.include()` table and rules (sync, cached without props/body, can call `stati.layout()`, never outside `site/`, unknown: overlay / logged and `''`, runtime error: overlay / logged plus HTML comment) | A | ✅ | template-render.ts:327-371, 532-542; built: unknown name logged and rendered empty, failing card left `<!-- Error rendering site/partials/card.eta: ... -->` | |
| V-C03-057 | 170-182 | `stati.layout()` returns `''`, wraps after render, names resolve like includes, one call, unknown name: dev error / production unwrapped | A | ✅ | template-render.ts:264-271, 374-408; test template-composition.test.ts:97-122 | |
| V-C03-058 | 184-194 | `.has()` on both, same function | A | ✅ | template-render.ts:260, 269, 273-282 | |
| V-C03-059 | 196-210 | `stati.body`/`stati.props` table; body raw; dev error points at `stati.content`; bad body/props: dev error, production warning | T | ✅ | template-render.ts:48-59, 164-172, 244-255, 410-442; templates.ts:346-350 (og base); context-validation.utils.ts:63-65 | |
| V-C03-060 | 212-223 | Eta's functions blocked; dev messages, production log and `''`, layout not applied; `./` added to bare names | B | ✅ | eta-plugin.ts:134-206; built: "Eta's include() is not available in Stati templates. Use stati.include('./partials/header') instead." | |
| V-C03-061 | 227-244 | `propValue` description and `PropValueArg` signature | A | ✅ | template.utils.ts:7-14, 32 | |
| V-C03-062 | 248-276 | `propValue` examples (basic, array, object, data attributes) | X | ✅ | Built: `card card-hover featured`, `post post-featured post-news`, `card hover:border-red-300` | |
| V-C03-063 | 280-281 | Convention note and template literal note | V | ✂️ | Same text as core-concepts/templates.md:17 and 40-44. | delete the bullets at 280 and 281; keep 282 |
| V-C03-064 | 284 | "For more details on Eta template limitations and best practices, see [Template Configuration](/configuration/templates)." | R | ❌ L | configuration/templates.md covers helpers and fixed Eta settings, not attribute limitations. | new: "See [Dynamic attribute values](/core-concepts/templates#dynamic-attribute-values) for the attribute convention." |
| V-C03-065 | 286-298 | `stati.url()`: adds base path, unchanged without one; leaves absolute, `//`, `#`, `?`, relative; already-prefixed paths returned as is (with the `/docs/intro` caveat); site-root values need wrapping | A | ✅ | base-path.utils.ts:29-108; templates.ts:322-323; built: `stati.url('/')` gave `/` without base path | |
| V-C03-066 | 297, 299 | Markdown always adds the prefix; Stati prefixes "the stylesheet link" | B | ⚠️ L | markdown.ts:223-232 uses `addBasePath` (always) ✅. "the stylesheet link" means the Tailwind link it injects (build.ts:974-985); a hand-written `<link href="/styles.css">` stays as written and is warned about (built). | old: "bundle scripts, the stylesheet link, the search index meta tag" → new: "bundle scripts, the Tailwind stylesheet link it adds, the search index meta tag" |
| V-C03-067 | 301-318 | `stati.image()`: width/height, lazy, async decoding, `<picture>` with responsive; alt warning; `priority` eager plus high fetch priority; `/` from `public/`, others next to the page and copied to `/_img/`; empty src `''`; synchronous | A | ✅ | images/runtime.ts:272-292, 294-330; images/markup.ts:63-64 | |
| V-C03-068 | 319 | "With `images: false`, it returns a plain `<img>` with the attributes you passed." | B | ⚠️ L | templates.ts:85-100: only `src`, `alt`, `title`, `class`; `sizes` and `priority` are dropped, no size attributes. | new: "With `images: false`, it returns a plain `<img>` with `src`, `alt`, `title` and `class`." |
| V-C03-069 | 321-331 | `stati.ogImage` fields, undefined when front matter sets its own image; `stati.og` in `og.eta` | A | ✅ | images/og.ts:23-33; templates.ts:330-353 | |
| V-C03-070 | 335-357 | Helpers section | V | ✂️ | Claims ✅ (types/config.ts:47; templates.ts:304, 348). The config example repeats configuration/templates.md and core-concepts/templates.md:449-464 (third copy on the cluster). | delete the `typescript` block (337-349); old: "Register your own functions under `helpers` in the configuration, and call them" → new: "Register your own functions under [`helpers`](/configuration/templates#helpers) in the configuration, and call them" |
| V-C03-071 | 361 | Template code is plain JavaScript; TypeScript annotations are syntax errors | B | ✅ | templates.ts:165-174 (no transform). Only statement of this in the cluster: keep it (moved to core-concepts by V-C03-002, or kept here under Helpers). | |
| V-C03-072 | 359-383 | "Text processing utilities": local `truncate`, `stati.slugify(tag)`, `stripHtml` | V | ✂️ | Generic JavaScript; `truncate` repeats the helpers on three pages; `tag` is undefined; `/tags/` link lacks `stati.url()`. Built fine otherwise. | delete heading and code block (lines 359 and 363-383); keep the sentence at 361 at the end of "## Helpers" |
| V-C03-073 | 385-391 | Related links | R | ✅ | Pages exist | |

### docs-site/site/configuration/templates.md

Covers: packages/core/src/types/config.ts (helpers, StatiHelpers), config/loader.ts:74-139, core/templates.ts:153-182, core/dev.ts:391, core/build.ts:779-990 (assets, bundle injection), core/utils/bundle-matching.utils.ts

| ID | Line | Claim | Cat | Status | Evidence | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| V-C03-074 | 11, 15 | "Most Eta settings are hardcoded for reliability"; "Stati's template configuration is minimal by design." | V | ✂️ | Filler phrases. | old: "Most Eta settings are hardcoded for reliability, but you can" → new: "Its settings are fixed, but you can"; old: "Stati's template configuration is minimal by design. The only template option" → new: "The only template option" |
| V-C03-075 | 15-28 | Only option is top-level `helpers` | G | ✅ | loader.ts:74-95 (`CONFIG_KEYS`), 114-122 (unknown keys rejected) | |
| V-C03-076 | 184-300 | "Helper examples" and "Using helpers in templates" | V | ✂️ | Second helper catalogue: `formatDate`, `timeAgo` (a different implementation under the same name), `truncate`/`excerpt` repeat lines 36-81; `readingTime` duplicates a built-in (V-C03-083). Usage is already shown at 87-101. All run (built). | delete lines 184-300 ("## Helper examples" through the end of "## Using helpers in templates") |
| V-C03-077 | 83 | Config fails to load when `helpers` is not an object of functions; TS type `Record<string, (...args: any[]) => unknown>` | G | ✅ | loader.ts:125-139; types/config.ts:47 | |
| V-C03-078 | 36-101 | Helper definitions and usage results | X | ✅ | Built: `HELLO WORLD`, `March 1, 2024`, `2 years ago`, truncation | |
| V-C03-079 | 103-108 | Helpers reach layouts, shells, includes, Open Graph template; root names stay Stati's; `this` is the helpers object; dev suggestion for `stati.formatDate`; helper edits need `--force` | B | ✅ | templates.ts:304, 348; context-validation.utils.ts:57, 219-238; built `this.uppercase()`; no helper hash in core/build.ts render inputs (grep) | |
| V-C03-080 | 112-120 | Fixed settings: views = srcDir, `stati` var, `<% %>`, escaping, cache in dev and production cleared on change, `.eta`, composition | G | ✅ | templates.ts:153-182; dev.ts:391; template-index.ts:275 | |
| V-C03-081 | 122-154 | "Combining helpers" and "Conditional helpers" | V | ✂️ | `stati.slugify()` already lowercases (slugify.utils.ts:88), so `stati.slugify(stati.helpers.lowercase(...))` shows nothing; the conditional example is a local arrow function; `/posts/` link lacks `stati.url()`. Built fine. | delete lines 124-154 ("### Combining helpers" through the "Conditional helpers" example), keeping "### Helpers with external dependencies" under "## Advanced helper patterns" (or rename that heading to "## Helpers that use packages") |
| V-C03-082 | 156-182 | Helpers importing `marked`/`highlight.js`; print HTML raw, trusted only | X | ✅ | `marked()` returns a string without `async`; hljs API names correct; raw output rule matches skill | |
| V-C03-083 | 239-244, 292 | `readingTime` helper example (200 wpm, counts the HTML) | X | ❌ M | Stati already provides `stati.page.readingTime` and `wordCount` (templates.ts:269-270; `readingTime.wordsPerMinute`, default 230), counted from Markdown without code. The example teaches a slower duplicate that disagrees with the built-in. Resolved by V-C03-076; if the section stays, delete the helper and its usage line. | delete the `readingTime` helper (239-244) and old: "<span><%= stati.helpers.readingTime(stati.page.content) %></span>" → new: "<span><%= stati.page.readingTime %> min read</span>" |
| V-C03-084 | 302-362 | "TypeScript bundle access" section | V | ✂️ | Claims ✅ (build.ts:779, 989-990; bundle-matching.utils.ts:122-131; types/content.ts:19-26), but it repeats configuration/typescript.md:84-150 (auto-injection, `autoInject`, `bundlePaths`, preload example). | Replace lines 302-362 with: "## TypeScript bundles\n\n`stati.assets.bundlePaths` lists the bundles matched for the page, in config order. Stati already injects their scripts before `</body>`. The paths are relative to the site root, so pass them through [`stati.url()`](/api/templates#stati-url-path) when you print them. See [TypeScript](/configuration/typescript#accessing-bundle-info-in-templates)." |
| V-C03-085 | 366 | `stati.assets.stylesheetPaths` with the Tailwind flags; linked on every page; link to css#linking-it-yourself | B | ✅ | types/content.ts:28-35; build.ts:974-985; configuration/css.md:106 | |
| V-C03-086 | 368 | "For more details on configuring multiple bundles, see [TypeScript Support](/configuration/typescript)." | R | ⚠️ L | Sits under "Stylesheet access", about bundles. | delete (covered by the new paragraph in V-C03-084) |
| V-C03-087 | 370-376 | Best practices list | V | ✂️ | Generic advice. | delete lines 370-376 |
| V-C03-088 | 380 | "See [Templates & Layouts](/core-concepts/templates)" | R | ⚠️ L | Page title is "Templates and layouts". | old: "[Templates & Layouts]" → new: "[Templates and layouts]" |

### docs-site/site/getting-started/upgrading-to-2.md

Covers: Stati 1 behavior via `git show @stati/core@1.29.2:packages/core/src/{types/config.ts,core/templates.ts,package.json}`; current core/template-index.ts, eta-plugin.ts, config/loader.ts, core/markdown.ts, core/utils/front-matter.utils.ts, core/content.ts, metrics/types.ts; packages/cli/package.json; packages/create-stati/src/constants.ts

| ID | Line | Claim | Cat | Status | Evidence | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| V-C03-089 | 9 | `stati.partials` replaced; `eta.filters` move to `helpers` | B | ✅ | 1.29.2 types/config.ts:73-75 (`eta.filters`), templates.ts:323 (filters spread on the root) | |
| V-C03-090 | 13-17 | `npm install @stati/core@^2 @stati/cli@^2`; each CLI runs its own major's core; `@stati/images` unchanged | L | ✅ | packages/cli/package.json:31 (`@stati/core ^2.6.0`); packages/images/package.json has no peer dependency | |
| V-C03-091 | 19 | Build once, fix reported errors; dev overlay shows them with file and line | B | ✅ | template-render.ts:457-471; context-validation.utils.ts | |
| V-C03-092 | 23-33 | Partial name → path table; lookup from the page's folder up as partials were; overrides keep working at the same path | B | ✅ | 1.29.2 templates.ts:104-165 (`_*` folders, basename names, root to page folder, nearer wins); template-index.ts:340-356 | |
| V-C03-093 | 35-41 | Prop guards no longer needed | B | ✅ | template-render.ts:327-371 (render on call only) | |
| V-C03-094 | 47-72 | Before/after config; `stati.formatDate` → `stati.helpers.formatDate`; Stati's functions stay; `slugify` filter no longer shadows; TS helper type | G | ✅ | templates.ts:292-320; types/config.ts:47 | |
| V-C03-095 | 45-63 | Moving filters | G | ⚠️ L | Gap: an `eta` key left in the config now stops loading ("Unknown option eta", loader.ts:114-122), which the page does not say. | Add after the config example: "An `eta` option left in the config stops the build with \"Unknown option eta\"." |
| V-C03-096 | 76-85 | Eta's `include`, `includeAsync`, `layout`, `block` replacements; `./` relative | B | ✅ | eta-plugin.ts:134-185 | |
| V-C03-097 | 89-91 | Front matter `layout` looked up from the page's folder; `/layout` for root; unknown name now warns | B | ✅ | template-index.ts:477-510; templates.ts:396-410 | |
| V-C03-098 | 95-101 | markdown-it 15; plugin load failure only warns; `MarkdownIt` type export | B | ✅ | packages/core/package.json:49 (`^15.0.3`; 1.29.2 had `^14.3.2` plus `@types/markdown-it`); markdown.ts:85, 95; src/index.ts:81 | |
| V-C03-099 | 97 | "markdown-it-prism works in version 3 and 4" | B | ⚠️ L | No test covers version 3; docs-site and examples/docs pin 4.0.0. Settle by building a page with markdown-it-prism 3 against core 2.8, or leave to the C04 owner of configuration/markdown.md. | none until checked |
| V-C03-100 | 105-126 | Shared shell example and link | X | ✅ | Same pattern built in V-C03-020; anchor core-concepts/templates.md "Sharing a shell" | |
| V-C03-101 | 130 | `_` folders still skipped; starters use `site/partials/` | B | ✅ | content.ts:37-46 | |
| V-C03-102 | 134-138 | Tailwind 3 and 4 work; scaffolds get 4; `@source '../.stati/tailwind-classes.html'` | B | ✅ | create-stati/src/constants.ts:9-10; tailwind-inventory.utils.ts:110 | |
| V-C03-103 | 142-150 | Unused templates don't render; sync includes; missing include doesn't fail the page; one full rebuild; `this` in helpers; metrics names; Eta 4; YAML 1.2 values; `---js` error; path-ordered content | B | ✅ | 1.29.2 templates.ts:353-360 (all partials rendered); template-render.ts:327-371; metrics/types.ts:175-185; package.json:46 (eta 4.6.0, was ^3.5.0); parseFrontMatter run: `time: 10:30` → "10:30", `0755` → 755, `1_000` → "1_000", `---js` throws "Stati reads front matter in YAML, not js"; content.ts:37-46 `.sort()` | |

### Gaps

- No-layout fallback: a page with no layout and no front matter `layout` is written with a bare fallback document and a warning (templates.ts:366-369). Not stated on core-concepts/templates.md; fix in V-C03-015.
- Template code is plain JavaScript (no TypeScript) and data is `stati`, not `it`: only api/templates.md:361 says the first; core-concepts never does. Fix in V-C03-002.
- `eta` key left over from Stati 1 fails config loading (V-C03-095).
- Invalid template names (empty, ending with `/`, a drive letter, leaving `site/`) are errors, and relative names fail in the built-in Open Graph template (template-index.ts:55-113). Minor; one sentence under "Template names" would cover it if wanted: "An empty name, a name ending in `/`, or one that leaves `site/` is an error."

### Terminology

- Wrapping template: "shell" (core-concepts headings, upgrading-to-2), "wrapper" (core-concepts:263, api:182), "frame" (core-concepts:359, api:166), "parent" (source comments). Suggest "shell" for the page-level template and "wrapper" for a component's frame.
- "partials": core-concepts:523 "Reuse partials across sections" while the rest of the cluster says "included templates" / "templates in `site/partials/`"; upgrading-to-2 uses "partial" for the Stati 1 concept. Suggest "partial" only for Stati 1.
- "Markdown" vs "markdown": core-concepts:82 "Rendered markdown content", :384 "your markdown files", :542 "Markdown Pipeline"; elsewhere "Markdown".
- Page names in link text differ from titles: "Templates & Layouts" (configuration/templates.md:380), "Template Configuration" (api/templates.md:284, 390; the page's SEO title is "Template configuration"), "Markdown Pipeline" (core-concepts:542), "TypeScript Support" (configuration/templates.md:368).
- "front matter" is consistent in docs; source comments use "frontmatter" (templates.ts:262, 273).

### Cross-cluster

- docs-site/site/configuration/typescript.md:118 and :144 print `stati.assets.bundlePaths` entries as `src="<%= path %>"` / `href="<%= path %>"` without `stati.url()`; they break under a base path, and types/content.ts:13-16 plus configuration/templates.md:319 wrap them. (C01)
- docs-site/site/configuration/typescript.md:84-150 and configuration/templates.md:302-362 cover the same bundle access; if C03 trims its copy (V-C03-084), typescript.md stays the canonical one. (C01)
- A hand-written `<link rel="stylesheet" href="/styles.css">` on a site with a base path is neither prefixed nor pointed at the hashed copy (built with `baseUrl: https://example.com/docs`: href stayed `/styles.css`). Check that configuration/css.md and deploying-to-a-subfolder.md tell users to write `stati.url('/styles.css')`. (C05/C08)

### Phase 5 log

Every `eta` fence in the four files compiles with Stati's Eta plugin after the edits (`work/C03/fences.mjs`: 33 fences, 0 failing). Changed examples were rebuilt in `work/C03/proj` (baseUrl `https://example.com/docs`), and the `eta` key case in `work/C03/etaproj`.

- V-C03-001: applied
- V-C03-002: applied (ruling: the plain-JavaScript fact replaces the Eta marketing line; re-checked against packages/core/src/core/templates.ts:165-174)
- V-C03-006: applied (re-checked template.utils.ts:35-74)
- V-C03-009: applied; re-checked: the "Available data" fence now compiles (fences.mjs, 0 failing; it failed with "unclosed tag" before). Also "markdown" to "Markdown" in the touched comment (D6)
- V-C03-013: applied (anchor `/api/templates#template-context-stati` already used in 2 other pages)
- V-C03-015: applied (approved gap); re-checked against core/templates.ts:366-369 (warning plus `createFallbackHtml`)
- V-C03-017: applied
- V-C03-019: applied; re-checked against seo/auto-inject.ts:78-98 and seo/utils/escape-and-validation.utils.ts:403. Rebuilt the new root layout: `og:site_name` and `og:locale` are now injected, and the favicon and stylesheet links get `/docs` (the stylesheet also goes to the hashed copy). Added one sentence after the example that links to configuration/seo#automatic-seo-injection, because the removed tags were the page's only mention of them
- V-C03-032: applied (chain format re-checked against template-render.ts:444-455 and the built message)
- V-C03-036: applied (fact kept in the "Template resolution order" paragraph)
- V-C03-039: applied (templates.ts:322)
- V-C03-040: applied; rebuilt: `/docs/tags/web-dev`, `/docs/tags/css`
- V-C03-041: applied to lines 66, 416, 434 and the card included template (`stati.url(stati.props.url)`), with 176, 179 and 214 covered by V-C03-019; re-checked against base-path-links.ts:46-60 and utils/base-path.utils.ts:84-108. Rebuilt: card links `/docs/blog/post`; no base-path warnings come from the updated examples
- V-C03-042: applied (the two sentences of facts stay under "## Performance"; checked for links to `#performance-considerations`, `#template-caching` and `#best-practices`: none)
- V-C03-043: applied (no links to `#generator-information`)
- V-C03-044: applied
- V-C03-045: applied
- V-C03-046: applied; re-checked against types/content.ts:545-639
- V-C03-047: applied (types/content.ts:19-43)
- V-C03-063: applied; the "Important Notes" label became a plain sentence since one note was left
- V-C03-064: applied; re-checked: core-concepts/templates.md "### Dynamic attribute values" exists (slug already linked from quick-start, glossary and troubleshooting)
- V-C03-066: applied (build.ts:974-985)
- V-C03-068: applied (templates.ts:85-100)
- V-C03-070: applied as ruled: a two-line call example plus a link to configuration/templates#helpers; the paragraph on typing, reach and `this` stays
- V-C03-072: applied (ruling); the plain-JavaScript sentence now lives in core-concepts (V-C03-002); no links to `#text-processing-utilities`
- V-C03-074: applied
- V-C03-076: applied (lines 184-300 removed; no links to their anchors)
- V-C03-081: applied; "## Advanced helper patterns" plus "### Helpers with external dependencies" became "## Helpers that use packages" (no links to the old anchors)
- V-C03-083: applied through V-C03-076 (the `readingTime` helper and its usage are gone); re-checked against templates.ts:269-270
- V-C03-084: applied; re-checked against build.ts:989 (`typescript.autoInject !== false`), so the new paragraph says "Unless `typescript.autoInject` is `false`". Config order and global bundles are already on configuration/typescript.md:164, 253-258. No links to the removed anchors
- V-C03-086: applied (removed)
- V-C03-087: applied
- V-C03-088: applied
- V-C03-095: applied (approved gap); re-checked: config/loader.ts:114-122; a config with `eta: { filters: {} }` fails with "Unknown option eta. Allowed options: ..."
- V-C03-099: left (ruling: keep the claim; evidence .claude/skills/stati/references/resources.md:22-23, where markdown-it-prism 3 and 4 output was compared on the core 2.0 branch)
- Template-name rules gap: left (ruling: skip)
- Cross-cluster V-C04-141 (C04, nav links without `stati.url()` in C03 files): checked; none of the four files prints a navigation node URL, so no change
- Cross-cluster V-C01-145 (C01, base path in Eta examples): handled by V-C03-019, V-C03-040 and V-C03-041; no other `href`/`src` in the four files lacks `stati.url()`
- D6 pass: no "frontmatter" in prose, no `html` fences for Eta. "partial" stays only in the upgrade guide, where it names the Stati 1 concept.

Applied 34, rejected 0, left 1 (V-C03-099), plus 2 cross-cluster items checked (one needed no change, one handled by existing items). The ✅ items needed no change.

## C04 findings

Summary: 146 claims; ✅ 106, ❌ 14 (H 0, M 3, L 11), ⚠️ 2, ✂️ 24.

(Counts are per row. Rows proposed for ✂️ were also checked for accuracy; the Evidence column says when the cut text is accurate.)

Method: every claim traced in source; examples run in a scratch project (`work/C04/proj`, local CLI, `@stati/core` junctioned to `packages/core`, `markdown-it-prism` 4.0.0, `markdown-it-external-links` 0.0.6 and `markdown-it-attrs` 5.0.1 junctioned from `docs-site/node_modules`). Two config variants built: (a) prism + external-links + a named-export-only plugin + a missing plugin + the heading/link renderer rules + `md.set({ breaks: true })`; (b) `code_inline` and `fence` rules, `md.linkify.set(...)`, `markdown.toc: false`, `attrs`. `stati preview --port 4104` checked `/blog`, `/blog.html`, `/blog/`, `/custom-path`, `/nope`, `/404`; server stopped, nothing left on 4104. The site tree mirrors the docs' examples (`docs/api/hooks`, `blog` with `paginate`, `blog/tags/[tag].md`, `authors/[author].md` from `collections.generate`, `_drafts/`, `_notes.md`, a trailing-slash permalink, `404.md`, images in `public/` and next to a page).

### docs-site/site/core-concepts/markdown.md

Covers: `core/markdown.ts`, `core/reading-time.ts`, `core/utils/front-matter.utils.ts`, `images/markdown-rule.ts`, `search/generator.ts` (`stripMarkdown`), `core/templates.ts` (page context).

| ID | Line | Claim | Cat | Status | Evidence | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| V-C04-001 | 9 | Stati uses markdown-it "enhanced with carefully selected plugins"; "designed to be extensible and developer-friendly" | B | ❌ M | packages/core/src/core/markdown.ts:65-104: no plugin ships with Stati; it installs its own image rule and, at render, heading ids/TOC (markdown.ts:140-187). Every plugin is one the user installs. | old: "Stati uses Markdown-It as its core markdown processor, enhanced with carefully selected plugins and customization options. The pipeline is designed to be extensible and developer-friendly while supporting modern markdown features." → new: "Stati renders Markdown with [markdown-it](https://github.com/markdown-it/markdown-it). On top of it, Stati adds heading anchors, a table of contents and image sizes; other syntax comes from markdown-it plugins you install. The options are on [Markdown configuration](/configuration/markdown)." |
| V-C04-002 | 13-45 | "Stati supports all standard Markdown syntax out of the box", with a 28-line CommonMark sample (includes `[internal links](/getting-started/introduction/)` with a trailing slash, and a fence commented "Code blocks with syntax highlighting" although nothing is highlighted by default) | V | ✂️ | markdown.ts:65-69 (markdown-it default preset: CommonMark plus tables and strikethrough); scratch build `md.md` rendered every construct. The sample teaches CommonMark, not Stati; the trailing-slash link contradicts routing.md:327 and the highlight comment contradicts line 69. | Replace the whole "### Standard Markdown" subsection (heading, sentence and the ````markdown block, lines 13-45) and "### Table support" (lines 119-137, see V-C04-010) with one paragraph under "## Core features": "markdown-it follows CommonMark and adds tables and strikethrough (`~~text~~`). Stati turns on raw HTML, linkify and typographer, described below." |
| V-C04-003 | 47-63 | Every Markdown file can include YAML front matter (example with `title`, `description`, `date`, `tags`, `author`, `draft`, `layout`) | B | ✅ | core/utils/front-matter.utils.ts:71-115; core/content.ts:57-59 | |
| V-C04-004 | 65 | `title: 1984`, `tags: [2024]`, `title: 2024-01-01` come back as the written text for `title`, `description`, `tags`, `seo.title`, `seo.description`, `seo.keywords`; `null` entries in `tags`/`seo.keywords` dropped with a warning naming the file | B | ✅ | front-matter.utils.ts:210-275; scratch build: `title: 1984` → `"1984"` (string), `description: 2024-01-01` → `"2024-01-01"`, `tags: [2024, ~, css]` → `["2024","css"]` and log "Ignoring empty entry in "tags" of site/md.md" | |
| V-C04-005 | 69-76 | Code blocks are rendered with `language-*` classes, without highlighting: `<pre><code class="language-typescript">` | B | ✅ | markdown-it default fence rule (no `highlight` option set in markdown.ts:65-69); scratch variant b output `<pre><code class="language-typescript">const x: number = 1;` | |
| V-C04-006 | 78 | Build-time highlighting with `markdown-it-prism` (link to `/configuration/markdown#syntax-highlighting`), or a client-side library that reads `language-*` classes | R | ✅ | configuration/markdown.md:299 heading exists; scratch variant a highlighted with prism | |
| V-C04-007 | 80-115 | Prism.js in the browser example (`prism.min.js` from jsDelivr) and a "Markdown example" with `typescript`, `css` and `bash` fences | X/V | ✂️ | Duplicates configuration/markdown.md:336-346 (Option 2). Also misleading: Prism's core `prism.js` defines only markup, CSS, C-like and JavaScript (docs-site/node_modules/prismjs/prism.js, `Prism.languages.*` assignments), so the `typescript` and `bash` blocks shown would not be highlighted by that script. | Delete lines 80-115 (from "**Example with Prism.js in the browser:**" to the end of the ````markdown block). Line 78 already links to the options. |
| V-C04-008 | 141-150 | Stati writes each Markdown image's size; images load lazily except the page's first image near the top, which gets `loading="eager"` and `fetchpriority="high"`; `images.eagerFirst: false` turns that off; output sample | B/X | ✅ | images/markdown-rule.ts:12-63 (`EAGER_BLOCK_LIMIT = 3`); scratch build: `<img src="/images/harbour.png" alt="Harbour at dawn" width="1600" height="900" loading="eager" fetchpriority="high" decoding="async">` matches the sample's shape | |
| V-C04-009 | 152 | `/`-paths read from `public/`; relative paths read next to the Markdown file and copied to `/_img/`; `@stati/images` adds AVIF/WebP; link to `/configuration/images` | B/R | ✅ | scratch build: `./map.png` → `<img src="/_img/map-436dbc1f.png" … loading="lazy">`, `dist/_img/map-436dbc1f.png`; AGENTS.md images section | |
| V-C04-010 | 119-137 | Table support: Markdown sample plus the same table rendered | V | ✂️ | markdown-it default preset (tables on). 18 lines show a GFM table twice. | Covered by the replacement paragraph in V-C04-002: delete lines 119-137 ("### Table support" and its two tables). The "## Enhanced features" heading stays for Images, Task lists, Auto-linking and Typography. |
| V-C04-011 | 156 | Task lists are not supported: brackets render as text | B | ✅ | scratch build: `<li>[x] Done</li>` | |
| V-C04-012 | 160-165 | URLs with a scheme and email-shaped text link; `stati.build`, `www.example.com` stay text; `react@18.3.1` becomes `mailto:`; link to `/configuration/markdown#links` | B | ✅ | markdown.ts:67 (`linkify: true`, linkify-it defaults); scratch output: `www.example.com, stati.build, README.md` plain, `<a href="mailto:react@18.3.1">` | |
| V-C04-013 | 169-175 | Typographer: smart quotes, en/em dashes, ellipsis | B | ✅ | markdown.ts:68; scratch output `“Smart quotes” … (–) … (—) … (…)` | |
| V-C04-014 | 177-207 | "Markdown configuration / Base configuration": defaults html, linkify, typographer; example `plugins: ['footnote', ['mark', { /* options */ }]]`; TOC note; install note | G/V | ✂️ | Accurate (markdown.ts:65-69) but duplicates configuration/markdown.md:13-41 and 69-77 and 138-146. `markdown-it-mark` takes no options, so `['mark', { /* options */ }]` suggests something that does not exist. | Delete lines 177-271 ("## Markdown configuration" through the end of "### Advanced configuration") and put in their place: "## Configuration\n\nPlugins, the markdown-it instance (`markdown.configure`) and the table of contents (`markdown.toc`) are set in `stati.config.ts`. See [Markdown configuration](/configuration/markdown)." If the maintainer wants to keep the `fence` wrapper example (lines 262-267, the only `fence` example in the docs), move it to configuration/markdown.md "Custom renderer rules". |
| V-C04-015 | 209-242 | Basic configuration example: `'footnote'`, `['container', 'tip']`, `md.set({ breaks: true })`, `code_inline` rule, `toc: true` | X | ✅ | scratch variant b: `<code class="inline-code">code</code>`; markdown.ts:87-93 passes `'tip'` as `md.use`'s second argument (the container name) | (removed by V-C04-014) |
| V-C04-016 | 244 | Note: html, linkify, typographer on by default, change with `md.set()`; TOC controlled by `markdown.toc` | G | ✅ | markdown.ts:65-69; core/build.ts:547,899 | (removed by V-C04-014; third copy of this note on the page) |
| V-C04-017 | 248-271 | Advanced configuration: `code_inline` rule again, `md.use(customPlugin, options)`, `fence` wrapper | X | ✅ | scratch variant b: `<div class="code-block"><pre><code class="language-typescript">` | (removed by V-C04-014) |
| V-C04-018 | 277-324 | `alertPlugin` example: core rule adds `alert alert-<type>` class to blockquotes starting `[!NOTE]`/`[!TIP]`/`[!WARNING]` and removes the marker; renders `<blockquote class="alert alert-note">…` | X | ✅ | scratch build ran the exact plugin: `<blockquote class="alert alert-note">\n<p>This is a note alert.</p>` | |
| V-C04-019 | 328-363 | Custom front matter fields are available as `stati.page.*`; `stati.propValue` class example | B/X | ✅ | core/templates.ts:282 (`{ ...page.frontMatter, ...pageOverrides }`); scratch: `stati.page.excerpt`, `stati.page.difficulty` printed | |
| V-C04-020 | 326-344 | "### Front matter processing" repeats "### Front matter" (line 47) with a second example | V | ✂️ | Same subject as lines 47-65 | Merge: delete the heading "### Front matter processing", the sentence "Front matter is parsed and made available to templates:" and the ````markdown example at lines 332-342; change the note at 344 to "Stati reads fields such as `title`, `description`, `tags`, `layout`, `date`, `order` and `draft`. Any other field, such as `difficulty` below, is available in templates as `stati.page.*`:" and keep the Eta example, moved up to follow line 65. (Rename the front matter example at line 51 to include `difficulty: 'advanced'` and `estimatedTime: '30 minutes'` so the Eta example still matches.) |
| V-C04-021 | 369-374 | Every page has `wordCount` and `readingTime`, set when content loads, readable by `beforeAll` on `ctx.pages`, as `stati.page.*` and `post.*` | T/B | ✅ | core/content.ts:71-78; core/reading-time.ts:114-120; core/templates.ts:269-270; core/build.ts:651-659 | |
| V-C04-022 | 379 | Listing example `<% for (const post of stati.collection.recentPages) { %>` | X | ❌ L | A page without a collection gets `stati.collection === undefined` (collections.ts:252-275; templates.ts:238-247), and this line throws; the other pages guard with `?.` (collections.md:41, 83) | old: `<% for (const post of stati.collection.recentPages) { %>` → new: `<% for (const post of stati.collection?.recentPages ?? []) { %>` |
| V-C04-023 | 384 | Counting rules: front matter, fenced code, HTML tags, images, Markdown syntax don't count; link text and inline code do; Han/Hiragana/Katakana one word per character; Thai not split; indented code and `<script>`/`<style>` contents count; Korean split on spaces | B | ✅ | reading-time.ts:14-17,86-94; search/generator.ts:107-160 (fenced blocks removed, `<[^>]+>` removed, no indented-code or script/style handling) | |
| V-C04-024 | 386 | Reading time = words / `readingTime.wordsPerMinute` (230 default), rounded to nearest minute; link `/configuration/file#reading-time-configuration`; front matter keys `wordCount`/`readingTime` replaced with a warning | G/B | ✅ | reading-time.ts:8,103-105; configuration/file.md:253 heading exists; templates.ts:273-279; scratch log "contains reserved keys that will be overwritten: wordCount" | |
| V-C04-025 | 388 | Listings rebuild for `post.readingTime` only when it is in `summaryFields`; `beforeAll` changing `content` doesn't change counts; hook-added pages get counts after the hook | B | ✅ | collections.ts:317-330; reading-time.ts:130-136; build.ts:651-659 | |
| V-C04-026 | 388 | First two sentences say the same thing twice (and collections.md:107 says it a third time) | V | ✂️ | — | old: "A listing that reads `post.readingTime` or `post.wordCount` is rebuilt only for the fields in [`collections.summaryFields`](/core-concepts/collections#what-rebuilds-a-listing), like any other field, so it can go stale if you leave them out. To show the reading time in a listing that rebuilds when the minutes change, and only then, add `readingTime` to [`collections.summaryFields`](/core-concepts/collections#what-rebuilds-a-listing)." → new: "A listing that shows `post.readingTime` or `post.wordCount` rebuilds when they change only if you add them to [`collections.summaryFields`](/core-concepts/collections#what-rebuilds-a-listing)." |
| V-C04-027 | 390-415 | No built-in excerpts; three options; `excerpt` front matter example; `stati.page.excerpt` | B/V | ✂️ | Accurate (no excerpt code in core/; templates.ts:282). Option 2 "use a template helper to truncate content" is vague (`post.content` is raw Markdown) and option 3 adds nothing. | Replace lines 392-415 with: "Stati has no excerpt feature. Write one in front matter (`excerpt: 'A short summary.'`) and print it as `stati.page.excerpt` on the page or `post.frontMatter.excerpt` in a listing. Add `excerpt` to [`collections.summaryFields`](/core-concepts/collections#what-rebuilds-a-listing) so listings rebuild when it changes." |
| V-C04-028 | 417-441 | "Performance optimization / Build-time processing": Markdown is rendered at build time; plugins run once; example with `loadLargeDictionary()` | V | ✂️ | True of any static generator; the "once per build" fact is stated at configuration/markdown.md:399. | Delete lines 417-441. |
| V-C04-029 | 443-452 | ISG bullet list (page caching, content hash, template dependency tracking, TTL) | V | ✂️ | Accurate summary of core/isg (AGENTS.md ISG section) but duplicates core-concepts/isg.md; line 454 already links there. | Delete lines 443-452. |
| V-C04-030 | 454 | "The markdown pipeline is one of Stati's core features, providing powerful content processing with extensible plugins." | V | ✂️ | Marketing | old: "The markdown pipeline is one of Stati's core features, providing powerful content processing with extensible plugins. Next, learn about" → new: "Next, learn about" |

### docs-site/site/configuration/markdown.md

Covers: `core/markdown.ts`, `types/config.ts` (`markdown`), `core/utils/front-matter.utils.ts`, `core/build.ts` (TOC), `src/index.ts` (`MarkdownIt` type export).

| ID | Line | Claim | Cat | Status | Evidence | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| V-C04-031 | 15-39 | Three options: `plugins` (Stati prepends `markdown-it-`), `configure` (runs after plugins, synchronously), `toc` (default `true`) | G | ✅ | types/config.ts:79-86; markdown.ts:39-51,76-104; build.ts:547,899 | |
| V-C04-032 | 41, 150, 179, 410 | "TOC extraction and heading anchors are built in" note, four times on the page | V | ✂️ | — | Keep the note at 41. Delete the blockquote at 150 ("> **Built-in Features:** …"), and the comment lines `// Note: TOC and heading anchors are built-in (enabled by default)` at 179 and 410. |
| V-C04-033 | 45-65 | `markdown.toc`: boolean, default `true`; extracts h2-h6; unique ids `intro`, `intro-1`, `intro-2`; fills `stati.page.toc`; when off, `toc` is `[]` and headings get no `id` | G/B | ✅ | markdown.ts:140-187; templates.ts:268; scratch: TOC `example`, `example-1`, `example-2`; with `toc: false` the page had `"toc": []` and `<h2>Getting Started</h2>` without `id` | |
| V-C04-034 | 69-77 | Defaults html, linkify, typographer; change with `md.set()`, e.g. `md.set({ html: false })` | G | ✅ | markdown.ts:65-69; scratch: `md.set({ breaks: true })` in configure took effect (`<br>` in output) | |
| V-C04-035 | 79-101 | Linkify behavior (scheme URLs link, user-name URLs link up to `@`, bare domains and file names stay text, emails link) and `md.linkify.set({ fuzzyLink, fuzzyEmail, urlAuth })` | B/X | ✅ | scratch variant a: `<a href="https://git">https://git</a>@github.com/o/r.git`; variant b with the snippet: `www.example.com` and `README.md` linked, emails not, `https://git@github.com/o/r.git` linked in full | |
| V-C04-036 | 105 | `'footnote'` loads `markdown-it-footnote` from your project | G | ✅ | markdown.ts:39-51 (resolves from `process.cwd()/package.json`, then falls back to core's own resolution) | |
| V-C04-037 | 107 | Stati passes the default export to `md.use()`; a named-export-only plugin logs "Failed to load markdown plugin" and the build continues; a missing plugin logs the same | B | ✅ | markdown.ts:80-96; scratch: "Failed to load markdown plugin: markdown-it-namedonly TypeError: plugin.apply is not a function" and "… markdown-it-missingplugin Error [ERR_MODULE_NOT_FOUND]", build succeeded | |
| V-C04-038 | 107, 160-172 | `markdown-it-emoji` 3 exports `full`, `light`, `bare` and no default; load it in `configure` | X | ✅ | unpkg markdown-it-emoji@3.1.0/index.mjs: `export { default as bare } … light … full`, no default export | |
| V-C04-039 | 109-146 | Plugin formats (string, `[name, options]`) and install commands | G/X | ✅ | types/config.ts:81; markdown.ts:78-97; scratch: `['prism', { defaultLanguage: 'javascript' }]` and `['external-links', { externalTarget: '_blank', internalDomains: ['stati.build'] }]` both applied | |
| V-C04-040 | 152-158 | Common plugins table (prism, footnote, external-links, container, attrs) | R | ⚠️ | Packages exist; prism, external-links and attrs load by name (scratch). Incomplete for `attrs`: with `markdown.toc` on, Stati sets `id` on every h2-h6 after parsing (markdown.ts:178 `token.attrSet('id', id)`), so `## Sub {#custom}` rendered `<h2 id="sub">`; the `{#id}` is lost. Settled by the scratch run; question for the maintainer is only whether to state it. | Add after the table: "With `markdown.toc` on, Stati sets the `id` of every `h2` to `h6` heading, so an `{#id}` from markdown-it-attrs on those headings is replaced." |
| V-C04-041 | 174-201 | "Example: Complete plugin setup" | V | ✂️ | The same plugin list appears again in "Complete example" (401-452) | Delete lines 174-201. |
| V-C04-042 | 205-207 | `configure` runs after plugins; called synchronously, return value ignored, so async work may finish late; prepare with top-level `await` | B | ✅ | markdown.ts:101-104 (`config.markdown.configure(md)` not awaited) | |
| V-C04-043 | 209 | `md` typed with markdown-it 15's own types; `import type { MarkdownIt } from '@stati/core'` | T | ✅ | types/config.ts:83; packages/core/src/index.ts:81; types/index.ts:31; markdown-it 15.0.3 `exports['.'].import.types` = `./dist/markdown-it.d.mts` | |
| V-C04-044 | 213-228 | Basic customization: `md.set`, `md.linkify.set`, `md.use` | X | ✅ | markdown-it API; scratch variant a/b | |
| V-C04-045 | 234-266 | Custom renderer rules: `heading_open` that keeps token attributes (Stati's anchor id survives); `link_open` adding class and rel | X | ✅ | scratch variant a: `<h2 id="getting-started" class="heading heading-h2">`; `<a href="https://stati.build" class="external-link" rel="noopener noreferrer">` | |
| V-C04-046 | 268 | Stati's own `image` rule is installed first; plugins and `configure` can replace it; attributes set on the token, such as a `class`, are kept on the `<img>` | B | ✅ | markdown.ts:71-73; scratch with attrs: `![Map of the route](./map.png){.wide}` → `<img src="/_img/map-436dbc1f.png" alt="Map of the route" class="wide" width="40" height="30" loading="lazy" decoding="async">` | |
| V-C04-047 | 270-297 | `['container', 'warning']` etc. give `::: warning` blocks | X | ✅ | Traced, not run (`markdown-it-container` not installed here): markdown.ts:89-93 calls `md.use(plugin, 'warning')`, which is markdown-it-container's `(md, name, options)` signature | |
| V-C04-048 | 301 | No built-in highlighting; fences render as `<pre><code class="language-xxx">` | B | ✅ | see V-C04-005 | |
| V-C04-049 | 305-323 | `markdown-it-prism` highlights at build time; "This site uses it" | X | ✅ | docs-site/stati.config.ts:2-9,31-36; scratch: `<span class="token keyword">const</span>` | |
| V-C04-050 | 331 | markdown-it-prism 4 puts `language-xxx` on `<code>` only; add `pre:has(> code[class*="language-"])` to theme selectors | B | ✅ | scratch (markdown-it-prism 4.0.0): `<pre><code class="language-typescript">` with no class on `<pre>` | |
| V-C04-051 | 336-343 | Client-side Prism from jsDelivr picks up `language-xxx` classes | X | ❌ L | Prism's core `prism.js`/`prism.min.js` defines only markup/HTML, CSS, C-like and JavaScript (docs-site/node_modules/prismjs/prism.js). Other languages stay plain unless their components or the autoloader are added. | After the code block add: "Prism's core script highlights HTML, CSS and JavaScript; add a component script per other language, or Prism's autoloader plugin." |
| V-C04-052 | 348 | Other server-side highlighters: create with top-level `await`, set `md.options.highlight` in `configure` | X | ✅ | markdown-it reads `options.highlight` in the fence rule at render time; `configure` runs synchronously before any render (markdown.ts:102-104) | |
| V-C04-053 | 352-357 | Front matter is the lines between a leading `---` and the next line starting with `---`; not configurable; quote values with `: `; unquoted dates are dates; YAML 1.2 (`10:30` text, `0755` → 755, `1_000` text); invalid YAML, lists/scalars and `---js` stop the build naming file and line; `---json` is JSON | B | ✅ | front-matter.utils.ts:41-169; js-yaml 4.3.2 in this repo: `{"time":"10:30","a":755,"b":"1_000"}`, `date: 2024-01-15` → `Date` | |
| V-C04-054 | 361-379 | Front matter example and template access (`new Date(stati.page.date)`) | X | ✅ | templates.ts:282 | |
| V-C04-055 | 381-399 | "Best practices": "Install only what you need", "Check compatibility – Stati 2 uses markdown-it 15", "Test thoroughly", "Use configure for overrides", "Preserve defaults", "Handle edge cases", "Limit plugins", plus two facts (ISG skips unchanged pages but search still parses every page; `configure` runs once per build / once per dev session) | V | ✂️ | Facts check out: build.ts:547-555 (search parses every page via `extractToc`), markdown.ts:58-63,106-109 and dev.ts:985 (processor cached for the dev session). The rest is generic or repeats line 205 and the examples. "Stati 2 uses" is a version reference. | Replace lines 381-399 with: "## Performance\n\nUnchanged pages come from the build cache and are not rendered again (see [ISG](/core-concepts/isg)); with search on, every page's Markdown is still parsed for the search index. `configure` runs once per build, and once per dev server session. Stati uses markdown-it 15, which some older plugins don't support." |
| V-C04-056 | 401-452 | "Complete example", "production-ready": `external-links` plugin plus a `link_open` rule that does `attrPush(['class', 'external-link'])` on `http` links | X | ❌ M | markdown-it-external-links already sets `class="external-link"` on external links (its `externalClassName` default, docs-site/node_modules/markdown-it-external-links/README.md:79), and `attrPush` adds a second `class` attribute. Scratch output with the same combination: `<a href="https://example.com" class="external-link" target="_blank" class="external-link" rel="noopener noreferrer">`. Duplicate attributes are invalid HTML; browsers keep the first. | Replace the `link_open` block in "Complete example" (from `// Add custom CSS classes to links` to the closing `};` of the rule) with: "      // external-links already gives external links class=\"external-link\"\n      const defaultLinkOpen = md.renderer.rules.link_open \|\|\n        ((tokens, idx, options, env, self) => self.renderToken(tokens, idx, options));\n\n      md.renderer.rules.link_open = (tokens, idx, options, env, self) => {\n        const href = tokens[idx].attrGet('href') ?? '';\n        if (!href.startsWith('http')) {\n          tokens[idx].attrJoin('class', 'internal-link');\n        }\n        return defaultLinkOpen(tokens, idx, options, env, self);\n      };" |
| V-C04-057 | 456-471 | `TocEntry { id; text; level }` | T | ✅ | types/content.ts:59-66 | |
| V-C04-058 | 475-488 | TOC template example | X | ✅ | templates.ts:268; Eta attribute values fully dynamic | |
| V-C04-059 | 492-506 | Anchor ids: `Getting Started` → `getting-started`, `API Reference` → `api-reference`, `What's New?` → `what-s-new`; duplicates `example`, `example-1`, `example-2` | B | ✅ | core/utils/slugify.utils.ts:77-113; scratch TOC output identical | |
| V-C04-060 | 508-512 | Next steps links | R | ✅ | pages exist | |

### docs-site/site/core-concepts/routing.md

Covers: `core/content.ts` (`computeSlug`, `computeUrl`), `core/utils/paths.utils.ts` (`getPageOutputFile`, `isPageUrlInsideOutput`), `core/expand.ts`, `core/utils/template-discovery.utils.ts` (404), `core/navigation.ts`, preview server.

| ID | Line | Claim | Cat | Status | Evidence | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| V-C04-061 | 11 | "This approach is intuitive, predictable, and doesn't require complex routing configuration." | V | ✂️ | Promotional | Delete the sentence. |
| V-C04-062 | 17-43 | File → URL mapping (`index.md` → folder URL, no trailing slash) | B | ✅ | content.ts:93-110; scratch: `docs/api/index.md` → `/docs/api` | |
| V-C04-063 | 49-61 | `.md` removed; output `dist/about.html`, `dist/blog.html`, `dist/blog/my-post.html`, `dist/index.html`; only root is `index.html`; trailing-slash `permalink`/`collections.generate` URL gives `…/index.html` | B | ✅ | paths.utils.ts:227-232; scratch `dist/` listing (`blog.html`, `custom-path/index.html`) | |
| V-C04-064 | 63 | `stati preview` serves `/blog`, `/blog.html`, `/blog/` from `dist/blog.html` | L | ✅ | scratch preview on 4104: all three 200 with title "Blog" | |
| V-C04-065 | 65-87 | No automatic slug transformation; filenames kept minus `.md` | B | ✅ | content.ts:93-102 | |
| V-C04-066 | 85 | "my post.md → /my post (space in URL - breaks)" | B | ❌ L | Nothing breaks at build time: the page is written to `dist/my post.html` at `/my post` (content.ts:93-102, paths.utils.ts:227-232); links to it need the space encoded. | old: "my post.md → /my post (space in URL - breaks)" → new: "my post.md → /my post (space in URL, must be written %20 in links)" |
| V-C04-067 | 89-96 | "Filename best practices" list | V | ✂️ | Restates 74-87 and is repeated again in "Best practices" (376-383) | Delete lines 89-96. |
| V-C04-068 | 100-110 | Unlimited nesting | B | ✅ | content.ts:93-102 | |
| V-C04-069 | 112-127 | "Section organization" tree | V | ✂️ | Same point as "Deep nesting"; repeated again in 229-260 | Delete lines 112-127. |
| V-C04-070 | 135-151 | Folders starting with `_` and everything in them are excluded; files starting with `_` are not (`_notes.md` → `/_notes`); templates need no underscore folder | B | ✅ | content.ts:39-46 (`ignore: ['**/_*/**', '_*/**']`); scratch: `_drafts/x.md` not built, `dist/_notes.html` built | |
| V-C04-071 | 153 | `draft: true` excludes a file | B | ✅ | content.ts:62-64 | |
| V-C04-072 | 157-171 | Only `.md` files become pages; `README.md` in `site/` becomes `/README` | B | ✅ | content.ts:40 (`**/*.md`) | |
| V-C04-073 | 173-194 | "Use cases for underscore exclusion": `_data/*.json`, `_temp/`, `_backup/`, `_assets/` keep files "without creating unwanted routes" | B/V | ❌ L | Misleading: only `.md` files can become pages (content.ts:40), so JSON, CSS or image files never create routes, underscore or not. The underscore matters for Markdown only. | Delete lines 173-194 and add to the end of the underscore rule (after line 149's tree): "The underscore matters only for Markdown files: other files in `site/` never become pages." |
| V-C04-074 | 196-208 | `layout.eta` sets the layout for its folder and subfolders; `base.eta` and `partials/` create no routes | B | ✅ | AGENTS.md (template index, nearest `layout.eta`); content.ts:40 | |
| V-C04-075 | 210-213 | `site/404.md` → `dist/404.html`; `permalink: /404/` → `dist/404/index.html`; dev and preview serve it for missing URLs | B | ✅ | template-discovery.utils.ts:44-51; scratch preview: `/nope` → 404 with title "Not found" | |
| V-C04-076 | 214-227 | 404 page left out of sitemap, search, RSS, nav, OG image; `noindex`; only the root page counts; still in the root collection; old exclusions keep working | B | ✅ | navigation.ts:10-19 (nav), template-discovery.utils.ts:23-51; scratch: `/404` absent from nav and present in the root collection's `pages`. Sitemap/search/RSS/OG/robots rows not re-verified here (C06/C07); they match AGENTS.md's 404 paragraph. | |
| V-C04-077 | 229-260 | "Dynamic content organization": date-based and category-based trees | V | ✂️ | Nothing beyond "Nested routing" | Delete lines 229-260 except the "### Generated and paginated URLs" subsection, which moves up under "## Nested routing" or becomes "## Generated and paginated URLs". |
| V-C04-078 | 262-275 | Pagination adds `/page/2`… (`dist/blog/page/2.html`); trailing-slash permalink gives `/blog/page/2/`; `[tag].md` renders nothing at its own URL and becomes one page per key, at its URL with the bracket replaced, or at its `permalink` with `[tag]` replaced | B | ✅ | expand.ts:139-149,576-592; scratch: `dist/blog/page/2.html`, `dist/blog/tags/css.html` | |
| V-C04-079 | 276 | "a file named `[tag].md` (any word in brackets)" | B | ❌ L | The name must start with a letter or `_` and use letters, digits, `-`, `_` (expand.ts:22 `PARAM_NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_-]*$/`); others are skipped with a warning (expand.ts:318-321; expand.test.ts:207) | old: "a file named `[tag].md` (any word in brackets)" → new: "a file named `[tag].md` (a name of letters, digits, `-` and `_` in brackets, starting with a letter)" |
| V-C04-080 | 278 | Output of such pages is deleted when no longer needed | B | ✅ | AGENTS.md (core/isg/prune.ts, manifest-recorded files) | |
| V-C04-081 | 282-299 | `permalink` replaces the URL; no trailing slash → `dist/custom-path.html`, trailing slash → `dist/custom-path/index.html`; generated URLs never end in `/` except `/`; static string; used as-is; `..` segments warn and skip, also for `collections.generate`; changes place in collections/navigation | B | ✅ | content.ts:104-110; paths.utils.ts:227-251; expand.ts:309-313,380-383; scratch: `dist/custom-path/index.html` | |
| V-C04-082 | 313-321 | Second permalink example ("Shorten long category paths") | V | ✂️ | Same as the first example | Delete lines 313-321. |
| V-C04-083 | 327-333 | Link with root-absolute paths, without trailing slash | B | ✅ | For Markdown links the base path is added automatically (markdown.ts:223-235,265-267) | |
| V-C04-084 | 339-345, 354 | Template examples hard-code `href="/"` and `href="/blog"` | X | ❌ M | On a site served from a subfolder, template links miss the base path; Stati only warns about them (core/base-path-links.ts:1-60) and the docs tell templates to use `stati.url()` (advanced/deploying-to-a-subfolder.md:34-49; templates.ts:322) | In the "Navigation helpers" example: `href="/"` → `href="<%= stati.url('/') %>"` and `href="/blog"` → `href="<%= stati.url('/blog') %>"`. After line 333 add: "Markdown links get the base path of a site served from a subfolder automatically. In templates, print links with [`stati.url()`](/advanced/deploying-to-a-subfolder#link-with-stati-url)." (Line 354 goes with V-C04-085.) |
| V-C04-085 | 347-368 | Breadcrumbs: `getBreadcrumbs()` returns `NavNode`s with `title` and `url`; trail starts at the containing collection (`API › Hooks` for `/docs/api/hooks`); add Home yourself | A/B | ✅ | navigation-helpers.utils.ts:134-170; scratch: `/docs/api/hooks` crumbs `["API","Hooks"]` | |
| V-C04-086 | 351-366 | Breadcrumb code block | V | ✂️ | Identical to api/navigation.md:362-378, which line 370 links to | Delete the ```eta block (lines 351-366) and change line 349 to "`stati.nav.getBreadcrumbs()` gives the trail for breadcrumb navigation ([example](/api/navigation#stati-nav-getbreadcrumbs-path))." (Anchor from Stati's slugify of "stati.nav.getBreadcrumbs(path?)", slugify.utils.ts:86-113; confirm against the built page.) |
| V-C04-087 | 372-428 | "Best practices": URL structure, file organization, SEO considerations | V | ✂️ | Generic advice; the two facts in it are stated elsewhere: no trailing slashes (line 52) and section `partials/` overriding root ones (core-concepts/templates.md "Template names") | Delete lines 372-428. |
| V-C04-088 | 430-464 | "Advanced routing patterns": multi-language and API docs trees | V | ✂️ | Folder trees again; the one useful fact (no language routing) is implicit | Replace lines 430-464 with: "## Multilingual sites\n\nStati has no language routing. Keep each language in its own folder, such as `site/en/` and `site/es/`; each folder with an `index.md` is a [collection](/core-concepts/collections)." |
| V-C04-089 | 466 | "Understanding filesystem-based routing is key to organizing your Stati site effectively." | V | ✂️ | Filler | Delete the sentence; keep "Next, learn about …". |

### docs-site/site/core-concepts/collections.md

Covers: `core/collections.ts`, `core/expand.ts`, `core/utils/template-discovery.utils.ts`, `core/utils/slugify.utils.ts`, `types/content.ts` (`CollectionData`, `PaginationData`, `GeneratedPageData`, `FrontMatter`), `types/config.ts` (`CollectionsConfig`, `GeneratedPageEntry`), `core/build.ts` (render-inputs hash), `core/isg/builder.ts` (cache tags).

| ID | Line | Claim | Cat | Status | Evidence | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| V-C04-090 | 9 | A folder with `index.md` is a collection, read as `stati.collection`; `paginate`; `[param].md` | B | ✅ | collections.ts:76-108 | |
| V-C04-091 | 9 | "Listings stay current: when a post is added, removed, retitled or retagged, Stati rebuilds the pages that list it and, if the navigation changed, the pages that show the navigation. Other pages stay as they are." | V | ✂️ | Accurate (build.ts:808-838) but restated in full under "What rebuilds a listing" (105) | Delete these two sentences. |
| V-C04-092 | 11-23 | Example tree: root collection, blog collection, `index.eta`, `tags/index.md` and `tags/[tag].md` with `collection: /blog` | X | ✅ | collections.ts:252-275; expand.ts:418-419 | |
| V-C04-093 | 27-36 | `pages` (any depth, without the index page), `children` (one level), `recentPages` (newest first, undated by title), `pagesByTag`, `metadata.totalPages`, `hasChildren`, `collectionPath`, `collectionName` (`Home` for root) | T | ✅ | collections.ts:139-209; types/content.ts:472-492; scratch `/blog`: pages include `/blog/2025/recap`, children don't, recentPages `[recap(2025-12-31), b(04-01), hello(03-01), c, tags]`, `collectionName: "blog"`, root `"Home"` | |
| V-C04-094 | 38-63 | Post list and tag-count examples | X | ✅ | scratch build rendered both | |
| V-C04-095 | 65 | Each page gets its own copy of the lists; templates of one page share it | B | ✅ | collections.ts:388-423 (copy on first read per render view); templates.ts:245,299 | |
| V-C04-096 | 69-72 | Collection resolution order: front matter `collection` (`blog`, `/blog`, `/blog/`), own (empty until folder has pages), nearest, none → `undefined` | B | ✅ | collections.ts:220-275; collections.test.ts:118-204; scratch: home with `collection: /blog` read `/blog`; `/docs/api/hooks` read `/docs/api` | |
| V-C04-097 | 74-99 | Home listing and prev/next examples | X | ✅ | scratch build | |
| V-C04-098 | 101 | Unknown collection name warns and falls back | B | ✅ | expand.ts:330-336; collections.ts:255-258 | |
| V-C04-099 | 105 | Summary = URL, publish date, `title`, `description`, `tags`, `draft`; body or other front matter changes rebuild only the post unless navigation changes (e.g. `order`) | B | ✅ | collections.ts:21,299-330; build.ts:829-838; isg/hash.ts:167-215 | |
| V-C04-100 | 107-115 | `summaryFields` replaces the default; `content`, `wordCount`, `readingTime` | G | ✅ | collections.ts:283-330; types/config.ts:182-193 | |
| V-C04-101 | 119-130 | `paginate: { size, path }`, default `'page'`, `paginate: 10` shorthand; works on any page with a collection | G | ✅ | expand.ts:186-213,501-524 | |
| V-C04-102 | 132-138 | Page URLs/files table; trailing-slash style; root page 2 is `/page/2`; same layout and Markdown | B | ✅ | expand.ts:139-149,540-570; scratch: `dist/blog/page/2.html` | |
| V-C04-103 | 140-147 | `stati.pagination` fields | T | ✅ | types/content.ts:425-438; expand.ts:159-177; scratch: page 1 has no `prevUrl`, page 3 has no `nextUrl`, `urls[0] = "/blog"` | |
| V-C04-104 | 149-167 | Pager example; rebuild rules; extra pages deleted; Markdown body repeats on later pages | X/B | ✅ | build.ts:820-828; scratch build | |
| V-C04-105 | 171-183 | `[tag].md` with `generate.from: tags` and `generate.paginate` → `/blog/tags/css`, `/blog/tags/css/page/2` | B | ✅ | expand.ts:396-499; scratch: `dist/blog/tags/css.html`, `dist/blog/tags/css/page/2.html` | |
| V-C04-106 | 185 | Keys from list or single values via slugify: `CSS` → `css`, `Node.js` → `node-js` | B | ✅ | expand.ts:225-268; scratch: `dist/blog/tags/node-js.html` | |
| V-C04-107 | 186 | Template reads its named collection or its folder's nearest; `site/blog/tags/[tag].md` reads `/blog` even with `site/blog/tags/index.md` | B | ✅ | expand.ts:418-419; collections.ts:269-274; scratch (with `blog/tags/index.md`): generated page's collection `/blog` | |
| V-C04-108 | 187 | URLs: bracket replaced; `permalink: /topics/[tag]/` → `/topics/css/` | B | ✅ | expand.ts:576-592 | |
| V-C04-109 | 188 | Collisions share the first value seen (newest first) with a warning; empty keys warn and get no page; existing page or same output file wins | B | ✅ | expand.ts:225-268,344-369,442-446; scratch: "\"CSS\" and \"css\" both become the key \"css\"; their pages are listed together under \"css\"" (`css` came from the newer post); "\"!!!\" has no Latin letters or digits" | |
| V-C04-110 | 188 | "slugify keeps Latin letters and digits only" | B | ❌ L | slugify also keeps `_` (`\W` excludes it) and turns accented letters into plain ones (slugify.utils.ts:86-113) | old: "slugify keeps Latin letters and digits only, so `!!!` or a tag written in another script has no key" → new: "slugify keeps only ASCII letters, digits and `_`, after dropping accents (`é` becomes `e`), so `!!!` or a tag written in another script has no key" |
| V-C04-111 | 189 | Tags used only by drafts get pages only with `--include-drafts` | B | ✅ | content.ts:62-64 | |
| V-C04-112 | 193-206 | `stati.generated` fields and example | T/X | ✅ | types/content.ts:455-466; scratch `/blog/tags/css`: `{"key":"css","label":"css","items":[b,hello],"template":"blog/tags/[tag].md"}`, `/authors/ada` with `data` | |
| V-C04-113 | 208 | Generated pages use the layout of the template's folder or its `layout` front matter | B | ✅ | expand.ts:486 (`sourcePath` = template); templates.ts:251 | |
| V-C04-114 | 212-217 | `{tag}` → label in every front matter string (nested too), `{{tag}}` literal, other names and `permalink`/`generate` untouched, body unchanged | B | ✅ | expand.ts:75-127; scratch description `'Lit {{tag}} {author}'` → `"Lit {tag} {author}"`, title "Posts tagged css" | |
| V-C04-115 | 221-227 | `stati.slugify` gives the same key | A | ✅ | templates.ts:320; expand.ts:246 | |
| V-C04-116 | 231 | Generated page depends on its template and items; cache entry tags carry key and label; `stati invalidate "tag:CSS"` refreshes it; tags match exactly | B | ✅ | build.ts:829-837; isg/builder.ts:136-151; invalidate.ts:90-92 (`entry.tags.includes(value)`) | |
| V-C04-117 | 235-262 | `collections.generate` example and field table; runs once per build after content loads; gets config and loaded pages; template used only by it needs no `generate.from` | G/X | ✅ | expand.ts:371-393,411-416,452-461,597-628; types/config.ts:194-217; scratch: `/authors/ada` with `label: "Ada Lovelace"`, `data.bio` | |
| V-C04-118 | 266-275 | Generated and later pagination pages are never collection members; nav (opt-in for generated), sitemap yes, search (opt-in for generated), RSS no; hooks see them with `page.generated`/`page.pagination`; generated before `beforeAll` | B | ✅ | template-discovery.utils.ts:13-21; navigation.ts:10-19; collections.ts:77; build.ts:441-442,651; sitemap/RSS rows per AGENTS.md (not re-run, C06/C07) | |
| V-C04-119 | 279-283 | Date field order; root collection shallow; drafts; `index.eta` for index pages and their later pages; index page = folder `index.md` once the folder holds another page, root always; reserved front matter | B | ✅ | date.utils.ts:10-58; collections.ts:117-134; templates.ts:236,251; template-discovery.utils.ts:149-169; types/content.ts:116-132 | |
| V-C04-120 | 284 | "the name inside the brackets uses letters, digits, `-` and `_`. Brackets in folder names have no meaning." | B | ❌ L | Must also start with a letter or `_` (expand.ts:22); `[2024].md` is skipped with a warning. Folder brackets: expand.ts:56 reads the file name only ✅. | old: "the name inside the brackets uses letters, digits, `-` and `_`" → new: "the name inside the brackets starts with a letter or `_` and uses letters, digits, `-` and `_`" |

### docs-site/site/api/navigation.md

Covers: `core/navigation.ts`, `core/utils/navigation-helpers.utils.ts`, `types/navigation.ts`, `types/content.ts` (`TemplateContext.nav`), `core/templates.ts` (`navNode`, nav reads), `core/isg/hash.ts` (`computeNavigationHash`).

| ID | Line | Claim | Cat | Status | Evidence | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| V-C04-121 | 11-19 | `stati.nav` has `tree`, helper methods; current node as `stati.page.navNode` | A | ✅ | navigation-helpers.utils.ts:190-253; templates.ts:257-298; types/content.ts:576-595 | |
| V-C04-122 | 21 | Reading `stati.nav` or `stati.page.navNode` makes a page depend on the tree; title/url/order/date changes rebuild those pages in build and dev | B | ✅ | templates.ts:281-290 (navNode getter sets `reads.nav`); build.ts:838; isg/hash.ts:167-215 | |
| V-C04-123 | 23 | Generated pages out unless `nav: true`; later pagination pages always out; 404 out unless `nav: true` (`navNode` undefined); pages in `site/404/` listed at top level | B | ✅ | navigation.ts:10-19,77-82; navigation.test.ts:179-251; scratch: `/404` navNode absent | |
| V-C04-124 | 32-40 | `NavNode` fields `title`, `url`, `path`, `order?`, `publishedAt?`, `children?`, `isCollection?` | T | ✅ | types/navigation.ts:28-43 | |
| V-C04-125 | 33 | `title` comment: "Front matter title, or the file/folder name" | T | ❌ L | Page nodes fall back to the last URL segment (`basename(page.url)`; for a permalink page that is the permalink's), and the root page without a title gets `Untitled`; folder nodes without `index.md` use the capitalized folder name (navigation.ts:170,205,243-245) | old: "// Front matter title, or the file/folder name" → new: "// Front matter title, or the last URL segment" |
| V-C04-126 | 45-50 | Tree shape: top-level pages plus one collection node per folder with pages besides `index.md`, at any depth; folder title from `index.md` or capitalized folder name; index-only folder is a page node; a collection's `children` are direct pages; subfolders appear only as their `index.md` page node | B | ✅ | navigation.ts:41-91,197-235; scratch tree: `2025 /blog/2025 (collection) -> Recap` (no `index.md`), `Blog` children without `2025/recap` | |
| V-C04-127 | 52-71 | Example tree `About / API (collection) → Hooks / Docs (collection) → API (page), Intro / Home` | X | ✅ | Traced through navigation.ts:41-160; scratch with the same `docs` folders: `API /docs/api (collection) -> Hooks`, `Docs /docs (collection) -> API, Intro` | |
| V-C04-128 | 73 | Top-level sorted by `order` then title; inside collections `order`, newest `publishedAt`, title | B | ✅ | navigation.ts:117-160; scratch `Blog` children: B post (2025-04-01), Hello (2025-03-01), C post, Tags | |
| V-C04-129 | 75 | Nested folders appear twice; `findNode()`, `getChildren()`, `getCurrentNode()`, `navNode` return the first in tree order; reliable lookup via `tree.find(...)` | B | ✅ | navigation-helpers.utils.ts:15-32; scratch: `stati.page.navNode` on `/docs/api` is the top-level collection node (`isCollection: true`, children `/docs/api/hooks`) because "API" sorts before "Docs" | |
| V-C04-130 | 79-121 | `stati.nav.tree` and `stati.nav.getTree()` sections, each with its own example | A/V | ✂️ | Both return the same array (navigation-helpers.utils.ts:196-202) | Delete the `getTree()` section (from the `---` at line 96 through line 119) and change the `tree` section's first line to: "The full navigation tree. `stati.nav.getTree()` returns the same array." |
| V-C04-131 | 123-147 | `findNode(path)` by path or URL; returns node or `undefined` | A | ✅ | navigation-helpers.utils.ts:15-32 | |
| V-C04-132 | 151-181 | `getChildren(path)`; empty when not found or childless | A | ✅ | navigation-helpers.utils.ts:41-44; scratch `getChildren('/docs')` → `["/docs/api","/docs/intro"]` | |
| V-C04-133 | 183-212 | Nested sidebar with a template function called with `<% %>`; calling it with `<%~ %>` prints `undefined` and drops the markup | X/B | ✅ | scratch: `<% renderSection('/docs', …) %>` printed the list; `<%~ renderSection(…) %>` printed only `undefined` | |
| V-C04-134 | 216-242 | `getParent(path?)` defaults to current page | A | ✅ | navigation-helpers.utils.ts:53-86,223; scratch `/docs/intro` → "Docs" | |
| V-C04-135 | 246-303 | `getSiblings(path?, includeSelf?)`, default `false`; prev/next example | A/X | ✅ | navigation-helpers.utils.ts:96-113,231-232; scratch `/blog/hello` siblings exclude itself | |
| V-C04-136 | 307-340 | `getSubtree(path)` returns `[node]` with children | A | ✅ | navigation-helpers.utils.ts:122-125; scratch `getSubtree('/blog')` | |
| V-C04-137 | 344-378 | `getBreadcrumbs(path?)`: `[API, Hooks]` for `/docs/api/hooks`, `[Docs, Intro]` for `/docs/intro` | A | ✅ | navigation-helpers.utils.ts:134-170,246; scratch both trails identical | |
| V-C04-138 | 382-412 | `getCurrentNode()` returns node or `undefined` | A | ✅ | navigation-helpers.utils.ts:179-181,252 | |
| V-C04-139 | 418-440 | `stati.page.navNode`: collection node for a top-level folder's index page, page node without `children` otherwise | B | ✅ | templates.ts:259-290; scratch `/blog` navNode `isCollection: true`; `/docs/intro` page node | |
| V-C04-140 | 446-473 | Recursive `renderNavTree`; renders at most two levels | X | ✅ | scratch build: `nav-level-0` and `nav-level-1` only | |
| V-C04-141 | 366, all examples | Links print `node.url` / `crumb.url` / `page.url` directly, and the breadcrumb example hard-codes `href="/"` | X | ⚠️ | Correct for a site at the host root. On a site served from a subfolder, these links miss the base path: navigation URLs stay relative to the site root (navigation.ts:171-172) and only `stati.url()` adds the base path (templates.ts:322; advanced/deploying-to-a-subfolder.md:47). Same pattern in collections.md examples (`post.url`). Maintainer decision: wrap every example in `stati.url()`, or add one note per page. | Minimal: line 366 `<li><a href="/">Home</a></li>` → `<li><a href="<%= stati.url('/') %>">Home</a></li>`; and after line 19 add: "Node URLs are relative to the site root. On a site served from a subfolder, print them with [`stati.url()`](/advanced/deploying-to-a-subfolder#link-with-stati-url): `href=\"<%= stati.url(node.url) %>\"`." Same one-line note in collections.md after line 38. |
| V-C04-142 | 475-498 | Section navigation from `getParent()?.children` | X | ✅ | navigation-helpers.utils.ts:53-86 | |
| V-C04-143 | 500-532 | Collection TOC via `stati.nav.tree.find(n => n.isCollection && n.url === url)` | X | ✅ | Traced: `/docs` → Docs node, `/docs/api` → API collection node with Hooks, `/docs/intro` → `undefined` → `[]` | |
| V-C04-144 | 534-570 | "Smart sidebar": siblings with "Show children if this is the current page" | X/V | ❌ L | The inner block never renders: a page's siblings are page nodes inside a collection's `children`, and page nodes never have `children` (navigation.ts:168-187,210). Without it the example is the "Section navigation" example again (`getSiblings(undefined, true)` is `parent.children`, navigation-helpers.utils.ts:109-112). | Delete lines 534-570 (the "### Smart sidebar (current section only)" subsection). |
| V-C04-145 | 576 | See also link `/core-concepts/templates/#template-data-and-context` | R | ❌ L | Anchor exists (core-concepts/templates.md:380), but the trailing slash goes against routing.md:327 ("without a trailing slash"); the other two links on the list have none | old: "(/core-concepts/templates/#template-data-and-context)" → new: "(/core-concepts/templates#template-data-and-context)" |
| V-C04-146 | all | Eta examples fenced as ```html (16 blocks) | X | ❌ L | Other pages in the cluster fence Eta as ```eta (routing.md:339, collections.md:40, configuration/markdown.md:477) | Change the 16 ```html fences to ```eta. |

### Gaps

- **Base path in Markdown.** Root-absolute Markdown links and images get the base path of a site served from a subfolder (markdown.ts:215-235,265-267); raw HTML does not. Neither core-concepts/markdown.md nor configuration/markdown.md says so; only advanced/deploying-to-a-subfolder.md does. One sentence plus a link in core-concepts/markdown.md (after "Auto-linking" or "Images") would do. V-C04-084 adds the matching sentence to routing.md.
- **markdown-it-attrs header ids** (V-C04-040): `{#id}` on h2-h6 is replaced by Stati's anchor id when `markdown.toc` is on.
- **Trailing-slash permalinks and collections/navigation (behavior, possibly a bug).** A top-level page with a trailing-slash permalink (`/custom-path/`) is not a member of the root collection (collections.ts:130 with template-discovery.utils.ts:178-186; scratch: root `pages` lacked `/custom-path/`). A folder index page with `permalink: /blog/` produces two top-level navigation nodes: a page node `/blog/` and a folder node `/blog` that links to a URL with no page (navigation.ts:48-88; reproduced with `buildNavigation([{url:'/'},{url:'/blog/'},{url:'/blog/a'}])` → `["Blog","/blog/",false]`, `["Blog","/blog",true,["/blog/a"]]`). Collections handle `/blog/` index pages (collections.test.ts:69). routing.md:293 already advises against trailing-slash permalinks; if the maintainer keeps this behavior, "navigation shows the folder twice" is the concrete reason to add there. Otherwise it is a code issue for the lead.
- **`collections.generate` errors stop the build** with "collections.generate failed: …" (expand.ts:607-614); a non-array result is ignored with a warning (expand.ts:615-618). Not in collections.md "Pages from data". One sentence if wanted.

### Terminology

- "front matter" (most of the cluster, all headings) vs "frontmatter": core-concepts/markdown.md:344,394 and routing.md:153. Use "front matter".
- "Markdown-It" (core-concepts/markdown.md:9,181) vs "markdown-it" (configuration/markdown.md, package name). Use "markdown-it". Also "markdown" lowercase for the language in core-concepts/markdown.md and configuration/markdown.md headings and prose vs "Markdown" in collections.md and routing.md.
- "template" means both an Eta file and a `[param].md` file in collections.md (171, 186, 208, 231, 262) and routing.md:276. The code calls the latter a "template" too (expand.ts), so it is consistent with source, but readers of templates pages may trip; "`[param].md` template" on first use in each section would help.
- "build cache" (configuration/markdown.md:398) vs "ISG cache"/"ISG" elsewhere.
- Code fences for Eta: ```html in api/navigation.md vs ```eta elsewhere (V-C04-146).
- "index page" vs "collection index page": collections.md uses "index page"; types and AGENTS use "collection index page". Fine as is; noted for the lead's terminology pass.

### Cross-cluster

- packages/core/src/types/navigation.ts:33: `NavNode.path` doc comment says "File system path (for organizing hierarchy)"; it is a URL path (the page URL, or the folder's URL for collection nodes; navigation.ts:172,215). Source comment, surfaces in editor hovers and any generated API docs.
- core-concepts/templates.md and api/templates.md: if they show navigation links, they likely share the `node.url` without `stati.url()` pattern (V-C04-141); not checked here (C03).
- configuration/file.md:105-133 repeats the markdown example and the "built-in TOC" note a fifth time (C05); the block could link to configuration/markdown.md instead (the only link is in the reference list at file.md:578).
- .claude/skills/stati/references/content.md:62 lists reserved keys without `wordCount`/`readingTime` (covered at 157-166, so only a completeness nit); SKILL.md:48,119 carry "(core 1.29+)" style version notes (skill, not docs-site; outside D1's scope).

### Phase 5 log

Rulings applied: V-C04-141 per D7 (every link the navigation.md and collections.md examples print goes through `stati.url()`, hard-coded `href="/"` fixed, no notes added); V-C04-040 one sentence; H7 not documented; configuration/file.md left to C05. No gaps added beyond V-C04-040 (none other approved). No cross-cluster items were raised against C04 files (C01's general base-path note is covered by D7). Anchors: no link in docs-site, `.eta` files, READMEs or llms.txt points at a deleted heading (`#standard-markdown`, `#table-support`, `#markdown-configuration`, `#front-matter-processing`, `#performance-optimization`, `#filename-best-practices`, `#section-organization`, `#dynamic-content-organization`, `#best-practices`, `#advanced-routing-patterns`, `#example-complete-plugin-setup`, `#stati-nav-gettree`, `#smart-sidebar-current-section-only`); `/core-concepts/markdown#front-matter` (index.md:71) still resolves. New anchors used: `/advanced/deploying-to-a-subfolder#link-with-stati-url` and `/api/navigation#stati-nav-getbreadcrumbs-path` (slugify output checked; the latter already used by recipes.md:508).

Re-run: scratch project (`work/C04/proj`) with `extract.mjs`, which writes every ```eta block of the five pages as an included template and builds with `site.baseUrl: http://localhost:4104/sub`: build succeeded, no template errors, no unprefixed-link warning, every `href` in `dist/docs/intro.html`, `dist/blog.html`, `dist/blog/hello.html`, `dist/blog/tags/css.html` starts with `/sub/` (pagination `/sub/blog/page/2`, tag links `/sub/blog/tags/css`). Config variant c (`config-c.mjs`, the new Complete example plus the moved `fence` wrapper) built: one `class` attribute per link (`<a href="https://example.com" class="external-link" target="_blank">`, `<a href="/x" class="internal-link">`), `<div class="code-block"><pre><code class="language-typescript">`. No server started; port 4104 free.

- V-C04-001: applied; re-checked against packages/core/src/core/markdown.ts:65-104,140-187 (no bundled plugins; own image rule, anchors, TOC).
- V-C04-002: applied (Standard Markdown sample replaced by one sentence; strikethrough and tables confirmed with `renderMarkdown`: `<s>gone</s>`, `<table>`).
- V-C04-007: applied.
- V-C04-010: applied.
- V-C04-014: applied (lines 177-271 replaced by a two-line pointer); the `fence` wrapper example moved to configuration/markdown.md "Custom renderer rules". V-C04-015/016/017 went with it.
- V-C04-020: applied (custom-field note and Eta example moved under "Front matter"; example front matter gained `difficulty`, `estimatedTime`, `lastModified`); re-checked templates.ts:282.
- V-C04-022: applied; re-checked collections.ts:252-275, templates.ts:238-247.
- V-C04-026: applied; re-checked collections.ts:317-330.
- V-C04-027: applied (excerpt section shortened; `post.frontMatter.excerpt` and `summaryFields` advice: collections.ts:283-330).
- V-C04-028, V-C04-029, V-C04-030: applied (closing line kept as "Next, learn about …").
- V-C04-032: applied (note kept at line 41; copies at the plugins table and the two code comments removed).
- V-C04-040: applied; re-checked markdown.ts:157-178 (`attrSet('id')` for levels 2-6 only).
- V-C04-041: applied.
- V-C04-051: applied; re-checked docs-site/node_modules/prismjs/prism.js (markup, css, clike, javascript only).
- V-C04-055: applied ("Best practices" replaced by "## Performance"; facts from build.ts:547-555, markdown.ts:58-63,106-109, dev.ts:985; "Stati 2" version reference dropped).
- V-C04-056: applied; re-checked markdown-it-external-links README:79 (`externalClassName` default) and the variant c build output.
- V-C04-061, V-C04-067, V-C04-069, V-C04-082, V-C04-087, V-C04-089: applied.
- V-C04-066: applied; re-checked content.ts:93-102, paths.utils.ts:227-232.
- V-C04-073: applied (merged with the existing "Templates don't need an underscore folder" sentence into one); re-checked content.ts:39-46.
- V-C04-077: applied ("Generated and paginated URLs" promoted to `##`, anchor `#generated-and-paginated-urls` unchanged).
- V-C04-079: applied; re-checked expand.ts:22,318-321.
- V-C04-084: applied (both `href`s via `stati.url()`, one sentence after the Markdown link example); re-checked templates.ts:322, base-path-links.ts:1-60, markdown.ts:223-235.
- V-C04-086: applied (code block removed, "See the Navigation API…" line folded into the new first sentence).
- V-C04-088: applied ("## Multilingual sites", one paragraph).
- V-C04-091: applied.
- V-C04-110: applied; re-checked slugify.utils.ts:86-113.
- V-C04-120: applied; re-checked expand.ts:22.
- V-C04-125: applied; re-checked navigation.ts:170,205.
- V-C04-130: applied.
- V-C04-141: applied per ruling (15 links in navigation.md, 11 in collections.md through `stati.url()`; `href="/"` → `stati.url('/')`); also configuration/markdown.md Prism theme `<link>` → `stati.url('/prism-theme.css')` in an `eta` fence (D7).
- V-C04-144: applied (Smart sidebar removed); re-checked navigation.ts:168-187,210.
- V-C04-145: applied.
- V-C04-146: applied (all `html` fences holding Eta in navigation.md are `eta` now: 14 after the two removed examples).
- Terminology (D6): routing.md "frontmatter" → "front matter" (the only prose occurrence left in the five files); "markdown-it" in touched lines.

Applied 40 (14 ❌, 2 ⚠️, 24 ✂️), rejected 0, left 0.

## C05 findings

Summary: 141 claims; ✅ 100, ❌ 14 (H 0, M 5, L 9), ⚠️ 7, ✂️ 20.

Test projects: `work/C05/bp` (base path site, built with the local CLI, previewed on port 4105, server stopped) and `work/C05/cfgtest.mjs` (loads 16 configs through `loadConfig`, incl. every config example on `configuration/file.md`). Node 22.22.0.

### docs-site/site/configuration/file.md

Covers: packages/core/src/config/loader.ts, config/directories.ts, constants.ts, types/config.ts, core/utils/typescript.utils.ts (compileStatiConfig), core/markdown.ts (plugins), core/dev.ts, core/preview.ts, env.ts, packages/cli/src/cli.ts

| ID | Line | Claim | Cat | Status | Evidence | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| V-C05-001 | 17 | Looks in the run directory for `stati.config.ts`, then `.js`, then `.mjs`; first wins | G | ✅ | packages/core/src/constants.ts:29-37; config/loader.ts:148-181 (`loadConfig(cwd = process.cwd())`); dev.ts:85, preview.ts:44, build.ts:377 | |
| V-C05-002 | 17 | The default export is the configuration | G | ✅ | config/loader.ts:232 (`configModule.default \|\| configModule`) | |
| V-C05-003 | 19-26 | Defaults table (`site`, `dist`, `public`, `'My Stati Site'`, `http://localhost:3000`, isg 21600/365) | G | ✅ | config/loader.ts:55-68; constants.ts:9-15, 42-59, 121; cfgtest `noSite` returned exactly these | |
| V-C05-004 | 28 | `site` and `isg` merged field by field, other sections replace the default | G | ✅ | config/loader.ts:234-239 | |
| V-C05-005 | 28 | Load failure prints the error and builds with defaults; "Falling back to default configuration." | B | ✅ | config/loader.ts:362-373; cfgtest `syntaxError` logged both lines and returned defaults | |
| V-C05-006 | 28 | "Invalid `isg` or `images` values, an option Stati does not know ... and `helpers` entries that are not functions stop the build instead" | B | ❌ M | Incomplete: invalid `readingTime`, `css`, `sitemap.news` and `seo` values also throw (loader.ts:273-319; reading-time.ts:39-55; css/config.ts; seo/defaults.ts:404-418; news-sitemap validation). cfgtest: `badReadingTime`, `badCss`, `badSitemapNews` threw. The unknown-option check covers top-level keys only (loader.ts:112-123): `search: { nope: 1 }`, `markdown: { nope: 1 }`, `typescript: { nope: 1 }` and `rss: { enabled: 'x' }` loaded without error. | old: "Invalid `isg` or `images` values, an option Stati does not know (such as a leftover `eta` block) and `helpers` entries that are not functions stop the build instead." → new: "Invalid `isg`, `images`, `readingTime`, `css`, `seo` or `sitemap.news` values, a top-level option Stati does not know (such as a leftover `eta` block) and `helpers` entries that are not functions stop the build instead." |
| V-C05-007 | 28 | `outDir` that is/contains/sits inside `srcDir`, `staticDir`, `typescript.srcDir` (TS on), `.stati/`, or is the project folder or a parent, stops the build naming both paths | G | ✅ | config/directories.ts:65-113; cfgtest `outDirSrc` threw | |
| V-C05-008 | 28 | `stati.config.ts` compiled with esbuild; relative imports bundled, packages external, Node CJS rules apply | B | ✅ | core/utils/typescript.utils.ts:522-538 (`bundle: true`, `packages: 'external'`, `format: 'esm'`) | |
| V-C05-009 | 28 | A `.js` config with `import` loads without `"type": "module"`, Node prints a warning | B | ✅ | Built `work/C05/bp` without `type`: `[MODULE_TYPELESS_PACKAGE_JSON] Warning ... Reparsing as ES module` and the build succeeded | |
| V-C05-010 | 34-44 | Basic setup example | X | ✅ | Same shape as cfgtest cases; loads | |
| V-C05-011 | 50-74 | TypeScript example; `plugins: ['footnote']` loads markdown-it-footnote | X | ✅ | Loaded the exact file as `stati.config.ts` via `loadConfig` (merged result printed); core/markdown.ts:40 (`markdown-it-${pluginName}`) | |
| V-C05-012 | 93-101 | `site` required `title`, `baseUrl`; optional `defaultLocale`, `description` | T | ✅ | types/config.ts:23-32 | |
| V-C05-013 | 107-129 | `plugins` names or `[name, options]` tuples (`['container', 'tip']` passes `'tip'` to the plugin); `configure` runs after plugins; `md.utils.escapeHtml` | X | ✅ | core/markdown.ts:76-104 (`md.use(pluginFunction, options)`, then `configure`); markdown-it 15 keeps `utils.escapeHtml` | |
| V-C05-014 | 133-137 | `toc` default `true` | G | ✅ | types/config.ts:84-85; core/build.ts:900 (`config.markdown?.toc !== false`) | |
| V-C05-015 | 143-172 | Helpers called as `stati.helpers.name()`; `stati.slugify()` stays on `stati` | B | ✅ | config/loader.ts:125-140; core/templates.ts:302, 321 | |
| V-C05-016 | 171 | `<a href="<%= `/${stati.slugify(stati.page.title)}` %>">` | X | ❌ L | A hand-written root path breaks under a base path and triggers the missed-link warning (core/base-path-links.ts:48-60; build.ts:994) | old: ``<a href="<%= `/${stati.slugify(stati.page.title)}` %>">`` → new: ``<a href="<%= stati.url(`/${stati.slugify(stati.page.title)}`) %>">`` |
| V-C05-017 | 180-207 | ISG options and defaults; example config | G | ✅ | config/loader.ts:63-67; core/isg/validation.ts; cfgtest `isgExample` loaded (30-day TTL is exactly the limit, validation.ts:237 uses `>`) | |
| V-C05-018 | 211 | Age from `publishedAt`/`published`/`date`/`createdAt`; first rule whose `untilDays` ≥ age; older than all → last rule; undated → `ttlSeconds` | B | ✅ | core/isg/ttl.ts:77-99, 205-235; core/utils/date.utils.ts:32-41 | |
| V-C05-019 | 213-219 | Second aging example | V | ✂️ | Repeats the first two rules of the example 20 lines above | delete the code block at 213-219 |
| V-C05-020 | 225-251 | Collections block, `summaryFields` default, `generate` entry fields | G | ✅ | types/config.ts:181-217 | |
| V-C05-021 | 255-267 | `wordsPerMinute` default 230, any number above 0, rounded, at least 1 | G | ✅ | core/reading-time.ts:8, 39-55, 104 (`Math.max(1, Math.round(...))`) | |
| V-C05-022 | 271-292 | `images` options and defaults; `og` needs a public `site.baseUrl`; unknown/invalid options stop the build | G | ✅ | types/images.ts (ImagesConfig); images/config.ts:57-75, 278 (`dev ?? 'fast'`); images/runtime.ts:168-181 | |
| V-C05-023 | 296-308 | `css` block, `hash`/`minify`/`autoInject` | G | ✅ | types/config.ts:436-461 | |
| V-C05-024 | 312-350 | dev 3000/localhost/false; preview 4000/localhost/false | G | ✅ | constants.ts:42-48; core/dev.ts:518-525; core/preview.ts:69-76 | |
| V-C05-025 | 352 | CLI options take precedence over config | L | ✅ | packages/cli/src/cli.ts:223-227; core/dev.ts:517 | |
| V-C05-026 | 358-391 | Hook example and comments: `beforeAll` before the cache check; front matter changed in `beforeRender` re-renders the page on every build; `context.page.slug` | B | ✅ | core/build.ts:651-668 (beforeAll, then hashing), 841-891 (cache check, then beforeRender); core/isg/builder.ts:410 (entry hash from the modified front matter, so the next check mismatches); types/content.ts:375 (`slug`) | |
| V-C05-027 | 393-400 | Hook list | A | ✅ | core/build.ts:651-654, 885-891, 1808-1811 | |
| V-C05-028 | 402-416 | "Context Types" block | V | ✂️ | Duplicates `api/types.md` (Build hooks) and `api/hooks.md`; the sentence at 400 already links there | delete lines 402-416 (`**Context Types:**` and its code block) |
| V-C05-029 | 418-443 | Multiple configuration files example | X | ✅ | Plain ESM | |
| V-C05-030 | 445-500 | "Best practices" | V | ✂️ | Item 3 repeats "Multiple configuration files" (418-443); item 1 is generic; item 2 is labelled "secrets" but shows a base URL | delete the whole `## Best practices` section (445-500) |
| V-C05-031 | 550-553, 308 (site-metadata) | `getEnv()` is `'production'` in `stati build`, `'development'` in `stati dev` | B | ⚠️ | build: cli.ts:131 `setEnv('production')` before `build()` loads the config (build.ts:377) ✅. dev: the CLI does not call `setEnv`; `createDevServer` loads the config (dev.ts:498) before `setEnv('development')` (dev.ts:527), so `getEnv()` there is `process.env.NODE_ENV \|\| 'development'` (env.ts:3). With `NODE_ENV=production` in the shell, `stati dev` gets the production settings. | Maintainer decision: fix the code (call `setEnv('development')` before loading) or add: "During `stati dev`, `getEnv()` returns `process.env.NODE_ENV` when it is set." |
| V-C05-032 | 570 | Stati does not set `NODE_ENV`; dev server does not watch the config; Markdown plugins set up once | B | ✅ | env.ts (reads only); core/dev.ts:837 (`watchPaths = [srcDir, staticDir]`); core/markdown.ts:60 | |
| V-C05-033 | 174, 221, 251, 255, 292, 308, 400, 576-587 | Cross-references, incl. `/cli/commands#config-file-location` | R | ✅ | V-AUTO-001; docs-site/site/cli/commands.md:337 | |
| V-C05-034 | 11 | "Stati is designed to work great out of the box, but it's also highly configurable..." | V | ✂️ | Marketing; the next section says what the file is | old: the whole paragraph at line 11 → new: "`stati.config.ts` (or `.js`, `.mjs`) configures your site." |
| V-C05-035 | 13 | `## Configuration file` repeats the H1 | V | ✂️ | Heading restates the page title | delete line 13 and promote `### File name and location`, `### Basic setup`, `### TypeScript configuration` to `##` |
| V-C05-036 | 589 | "The configuration system is designed to grow with your needs..." | V | ✂️ | Filler | delete |
| V-C05-037 | 312, 325-329, 333, 346-350 | "Configure the development server:", `// Server configuration`, and the option lists | V | ✂️ | The lists repeat the inline comments of the examples word for word | delete "Configure the development server:", "Configure the preview server:", the `// Server configuration` comment lines, and both `**Available Options:**` lists; put the defaults in the example comments: `port: 3000, // default 3000` etc. |
| V-C05-038 | 80-101 | Site metadata section with Required/Optional field lists | V | ✂️ | Duplicates `configuration/site-metadata.md` (every field with the same descriptions) | old: lines 80 and 93-101 (`The foundation of your site configuration:` and both field lists) → new: "See [Site metadata](/configuration/site-metadata) for each field." (keep the example) |

### docs-site/site/configuration/site-metadata.md

Covers: types/config.ts (SiteConfig, SEOConfig), seo/defaults.ts, seo/generator.ts, seo/auto-inject.ts, core/utils/base-path.utils.ts, core/templates.ts, env.ts

| ID | Line | Claim | Cat | Status | Evidence | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| V-C05-039 | 17-29 | `site` example | X | ✅ | types/config.ts:23-32 | |
| V-C05-040 | 33-35 | `title` required | T | ✅ | types/config.ts:25 (a missing value falls back to the loader default, loader.ts:237) | |
| V-C05-041 | 37-44 | `title` example | V | ✂️ | Repeats the example at 17-29 | delete the code block at 37-44 |
| V-C05-042 | 48, 223, 241, 260, 287 | Template snippets in ` ```html ` fences | X | ❌ L | They are Eta (`<%= %>`); other pages use ` ```eta ` | change those fences to ` ```eta ` |
| V-C05-043 | 54 | `baseUrl` used for absolute URLs, sitemaps, canonical links | G | ✅ | seo/generator.ts (canonical, og:url); build output `work/C05/bp/dist/sitemap.xml` | |
| V-C05-044 | 60, 65, 419 | "Do not include a trailing slash in `baseUrl`" | G | ⚠️ | Stati's own URLs handle one: built with `https://example.com/docs/` and `https://example.com/`, og:url, sitemap `<loc>`, RSS links and the robots `Sitemap:` line were identical to the no-slash build; the base path ignores it (base-path.utils.ts:41-54). Only a template that joins `stati.site.baseUrl + stati.page.url` (line 292 of this page, and examples/blank/site/layout.eta) gets `//`. | old: "**Important:** Do not include a trailing slash in `baseUrl`." → new: "Leave the trailing slash off: Stati's own URLs work either way, but a template that joins `stati.site.baseUrl + stati.page.url` would get a double slash." Also drop the `// No trailing slash` comment at 60 and best-practice item 2 at 419 (see V-C05-065). |
| V-C05-045 | 67 | Path in `baseUrl` is the base path; build, dev and preview use it; `stati.url()` | B | ✅ | core/utils/base-path.utils.ts:29-54; dev.ts:535; preview.ts:80; build of `work/C05/bp` | |
| V-C05-046 | 71 | `defaultLocale` printed as `og:locale` unless `seo.openGraph.locale`, converted `en-US` → `en_US` | B | ✅ | seo/defaults.ts:60, 179-181; built page has `<meta property="og:locale" content="en_US">` | |
| V-C05-047 | 83-91 | Locale list; script subtag dropped; region-less tag gives no `og:locale`; `seo.debug` warns | B | ✅ | seo/defaults.ts:49-60, 268-277 | |
| V-C05-048 | 107-117 | Description chain `seo.description` → `description` → `site.description`; used in description, og:description, twitter:description | B | ✅ | seo/generator.ts:104, 183, 294-297; built page showed all three from `site.description` | |
| V-C05-049 | 97-105 | `description` example | V | ✂️ | Repeats the example at 17-29 | delete the code block at 97-105 |
| V-C05-050 | 121-147 | Author table: name → `<meta name="author">`, url → `article:author` on article pages, twitter → `twitter:creator`, email not printed | B | ✅ | seo/generator.ts:133-139; seo/defaults.ts:220-233; no `email` in seo/*.ts | |
| V-C05-051 | 165 | A page's own author never gets the default author's handle or URL | B | ✅ | seo/defaults.ts:107-110 (`resolveAuthor`) | |
| V-C05-052 | 119-165 | Author configuration section | V | ✂️ | Duplicates configuration/seo.md "Site-wide defaults" (seo.md:105-212: same fields, same table, same "never gets the default author's handle" sentence) | replace 121-165 with: "The default author is `seo.defaultAuthor`, not part of `site`. See [site-wide SEO defaults](/configuration/seo#site-wide-defaults)." |
| V-C05-053 | 173-191 | Page-level SEO fields; `tags` as keywords fallback | T | ✅ | types/content.ts:193-218; seo/generator.ts:112 | |
| V-C05-054 | 195-279 | Auto-injection skips existing tags; `generateSEO(['title','description','opengraph'])`; `autoInject: false` | B | ✅ | seo/auto-inject.ts (detectExistingSEOTags, exclude set); types/seo.ts:24-40 (tag values); core/templates.ts:308-319 | |
| V-C05-055 | 167-281 | "SEO metadata" section | V | ✂️ | Duplicates configuration/seo.md:23-104 (Automatic SEO injection, Manual SEO generation, Selective generation) and seo.md:213+ (Frontmatter SEO fields) | replace 167-281 with: "Page titles, descriptions and the rest of each page's SEO tags come from front matter and the `seo` config. See [SEO](/configuration/seo)." |
| V-C05-056 | 292 | Canonical link from `stati.site.baseUrl + stati.page.url` | X | ✅ | `page.url` is site-relative (templates.ts:262), so the join includes the base path; double slash with a trailing slash (V-C05-044) | |
| V-C05-057 | 304 | `seo.defaultAuthor` is not in the template context | B | ✅ | core/templates.ts:290-330 (no config key); seo/defaults.ts:220-233 (author not written into front matter) | |
| V-C05-058 | 308-325 | `getEnv()` example | X | ✅ | see V-C05-031 for the dev caveat | |
| V-C05-059 | 328 | Stati does not set `NODE_ENV` | B | ✅ | env.ts | |
| V-C05-060 | 334-357 | Sitemap uses `baseUrl`; `robots.sitemap: true` adds `Sitemap: https://example.com/sitemap.xml` | G | ✅ | build output: `Sitemap: https://example.com/sitemap.xml`; seo/robots.ts:185 | |
| V-C05-061 | 365-383 | RSS feed with `contentPatterns: ['**/blog/**/*.md']` | X | ✅ | Built: the feed listed `/blog/post`; patterns match the source path (rss/generator.ts:63) | |
| V-C05-062 | 330-385 | "Sitemap and robots.txt" and "RSS feeds" sections | V | ✂️ | Each is a config example for another page, which "Related configuration" already links | delete 330-385 (the link list at 444-449 stays) |
| V-C05-063 | 394 | Twitter Card Validator link | R | ❌ L | The Card Validator no longer shows previews (X retired the preview feature in 2022) | delete the line `- [Twitter Card Validator](https://cards-dev.twitter.com/validator)` |
| V-C05-064 | 398-412 | "SEO debugging" | V | ✂️ | `seo.debug` is already shown at 321-324 | delete 398-412 |
| V-C05-065 | 414-442 | "Best practices" | V | ✂️ | Generic SEO advice; item 2 repeats line 65; item 4 ("Set `defaultLocale` if building multilingual sites") is misleading, `defaultLocale` creates no translated pages (only `og:locale`, V-C05-046) | delete 414-442 |
| V-C05-066 | 449 | "[Template Configuration](/configuration/templates) - Access metadata in templates" | R | ❌ L | configuration/templates.md covers helpers and Eta settings, never `stati.site` (0 matches); api/templates.md does | old: "- [Template Configuration](/configuration/templates) - Access metadata in templates" → new: "- [Template context](/api/templates#template-context-stati) - `stati.site` and `stati.page` in templates" |
| V-C05-067 | 11, 15 | "Stati provides a streamlined approach..."; "contains essential properties that define your site's identity" | V | ✂️ | Filler | old (11): whole paragraph → new: "The `site` block holds the site's title, address, language and description." Delete line 15. |

### docs-site/site/api/types.md

Covers: packages/core/src/types/*.ts, src/index.ts, types/index.ts, package.json exports, config/loader.ts, packages/cli/package.json, packages/create-stati/package.json

| ID | Line | Claim | Cat | Status | Evidence | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| V-C05-068 | 22-94 | `StatiConfig` fields, optionality, types | T | ✅ | types/config.ts:69-140 (only differences: imported aliases, inline dev/preview comments) | |
| V-C05-069 | 99-104 | `ReadingTimeConfig` | T | ✅ | types/config.ts:151-159 | |
| V-C05-070 | 110-131 | `CollectionsConfig`, `GeneratedPageEntry` | T | ✅ | types/config.ts:181-217 | |
| V-C05-071 | 138-151 | `SiteConfig` importable from `@stati/core` and `@stati/core/types` | T | ✅ | src/index.ts:24; types/index.ts:11 | |
| V-C05-072 | 153-167 | `SiteConfig` fields | T | ❌ L | All four fields are `readonly` in source (types/config.ts:25-31); assigning `ctx.config.site.title = ...` in a hook is a type error | add `readonly` before `title`, `baseUrl`, `defaultLocale?`, `description?` |
| V-C05-073 | 171-215 | `SEOConfig`, `SEOTwitterConfig`, `SEOArticlesConfig`, `AuthorConfig` | T | ✅ | types/config.ts:223-274; types/content.ts:343-352 | |
| V-C05-074 | 221-251 | `BuildHooks`, `BuildContext`, `PageContext`; pages include generated and paginated pages | T | ✅ | types/config.ts:514-570; core/build.ts:427 (`expandPages`), 1428, 650 | |
| V-C05-075 | 255-275 | `BuildStats` | T | ✅ | types/config.ts:588-601 | |
| V-C05-076 | 283-315 | `PageModel` | T | ✅ | types/content.ts:373-408 | |
| V-C05-077 | 317 | Generated and later listing pages share `sourcePath`, `content`, front matter; link to Template API | B | ✅ | rss/generator.ts:60-61 (corroborates); anchor `#template-context-stati` = api/templates.md:13 | |
| V-C05-078 | 323-385 | `FrontMatter`; `date` is the sitemap lastmod fallback | T | ✅ | types/content.ts:86-173; seo/sitemap.ts:44-61 | |
| V-C05-079 | 391-402 | `TocEntry`, levels 2-6, `stati.page.toc` | T | ✅ | types/content.ts:59-66; core/markdown.ts:153-157 | |
| V-C05-080 | 410-531 | `TemplateContext`, `TemplateIncludeFunction`, `TemplateLayoutFunction`, `StatiHelpers` | T | ✅ | types/content.ts:494-639; types/config.ts:47 (doc drops `\| undefined` on optional members, harmless) | |
| V-C05-081 | 486 | `assets` comment "Bundle and search index paths" | T | ⚠️ | Also holds `stylesheetPaths` (types/content.ts:35) | old: "/** Bundle and search index paths (passed on every render) */" → new: "/** Bundle, stylesheet and search index paths (passed on every render) */" |
| V-C05-082 | 533 | `page.toc` always an array, not in the type | T | ✅ | core/templates.ts:265 (`toc: toc \|\| []`); built page printed `toc=[{...level:2}]` | |
| V-C05-083 | 535 | Context root holds only Stati's API; helpers under `helpers` | B | ✅ | core/templates.ts:290-330 | |
| V-C05-084 | 541-562 | `ISGConfig`, `AgingRule` comments: `maxAgeCapDays` "Maximum age in days for applying aging rules"; `untilDays` "Number of days after which this aging rule applies" | T | ❌ M | Shapes are right; the comments invert the rule. A rule applies to pages **up to** `untilDays` old (core/isg/ttl.ts:218-224), as configuration/file.md:211 says. `maxAgeCapDays` freezes dated pages older than it (ttl.ts:167-183) and no rule may exceed it (isg/validation.ts:166-173). The source comments (types/isg.ts:18, 46) have the same error. | old: "/** Maximum age in days for applying aging rules */" → new: "/** Dated pages older than this many days are no longer rebuilt for TTL reasons (default: 365) */"; old: "/** Number of days after which this aging rule applies */" → new: "/** The rule applies to pages up to this many days old */"; also add "(default: true)" to `enabled` and "(default: 21600)" to `ttlSeconds` |
| V-C05-085 | 564-618 | `CacheEntry`, `TemplateLookup` | T | ✅ | types/isg.ts:64-160 | |
| V-C05-086 | 620 | An entry without the record flags rebuilds once, "such as Stati 1" | B | ❌ L | Behavior ✅ (core/build.ts:840-855); "such as Stati 1" is a version reference | old: "was written by a version of Stati that didn't record them, such as Stati 1; its page rebuilds once." → new: "was written before Stati recorded them; its page rebuilds once." |
| V-C05-087 | 625-688 | `TypeScriptConfig`, `CSSConfig`, `BundleConfig` | T | ✅ | types/config.ts:297-461 | |
| V-C05-088 | 691 | Note on source maps, hashing, minification | V | ✂️ | Restates the `hash`/`minify` comments just above | delete the note, or shorten to "Development builds always write source maps." (the only fact the comments lack; types/config.ts:336) |
| V-C05-089 | 698-745 | `ImagesConfig`, `ResponsiveImagesConfig`, `OgImagesConfig`, `OgImageFontConfig` | T | ✅ | types/images.ts | |
| V-C05-090 | 750-760 | `GeneratedOgImage` | T | ✅ | types/images.ts (GeneratedOgImage) | |
| V-C05-091 | 762 | Provider contract types exported | T | ✅ | src/index.ts:90-98 | |
| V-C05-092 | 766 | Bundle tags and the stylesheet link auto-injected unless `autoInject: false` | B | ✅ | core/utils/typescript.utils.ts:641-669; css/stylesheet.ts:960-971 | |
| V-C05-093 | 769-787 | `StatiAssets` fields; "Print each path as it is" | T | ⚠️ | Fields ✅ (types/content.ts:19-44). The comments omit what the source says: paths are relative to the site root, pass them through `stati.url()` (content.ts:23, 40-41); advanced/deploying-to-a-subfolder.md:63 says the same for `stylesheetPaths`, which "Print each path as it is" seems to contradict. `stati.url()` keeps the name intact and the hashed rewrite recognizes base-path links (css/stylesheet.ts:614, 943). | add to the `bundlePaths` comment: "Relative to the site root; print them with stati.url()." In `stylesheetPaths`, old: "Print each path as it is: a production build writes the final name into the page after rendering." → new: "Print each path through stati.url() without changing it: a production build writes the final name into the page after rendering." In `searchIndexPath`: "relative to the site root, like the others" |
| V-C05-094 | 792-798 | `<link rel="modulepreload" href="<%= path %>">` | X | ❌ M | Under a base path the link misses it and the build warns (core/base-path-links.ts:48-60) | old: `<link rel="modulepreload" href="<%= path %>">` → new: `<link rel="modulepreload" href="<%= stati.url(path) %>">` |
| V-C05-095 | 806 | `defineConfig(config: StatiConfig): StatiConfig` | A | ✅ | src/index.ts:207-209 | |
| V-C05-096 | 813 | Three entry points | A | ✅ | packages/core/package.json `exports` (`.`, `./types`, `./config`) | |
| V-C05-097 | 817-860 | Function exports of `@stati/core` | A | ✅ | src/index.ts:112, 130, 134-156, 160-172, 207 (all listed, none missing) | |
| V-C05-098 | 864-957 | Type exports of `@stati/core` | T | ❌ M | Missing `CSSConfig` (src/index.ts:40), `ReadingTimeConfig` (:43) and `TailwindBuildOptions` (:107). api/reference.md:11 says this page "lists every export". | add `CSSConfig,` and `ReadingTimeConfig,` after `BundleConfig,`; add `TailwindBuildOptions,` after `MetricsOptions,` |
| V-C05-099 | 959 | `SEOTagType` type-only from `@stati/core`, values from `@stati/core/types` | A | ✅ | src/index.ts:59 (`export type`); types/index.ts:59 (`export { SEOTagType }`) | |
| V-C05-100 | 961-965 | `@stati/core/types` extras list | A | ✅ | types/index.ts vs src/index.ts: the 12 named are exactly the types the main entry leaves out | |
| V-C05-101 | 967 | `@stati/core/config` exports four functions; "such as Stati 1's `eta`" | A | ❌ L | Exports ✅ (package.json `./config` → dist/config/loader.js; loader.ts:47, 112, 148, 172). "Stati 1's" is a version reference | old: "such as Stati 1's `eta`," → new: "such as a leftover `eta` block," |
| V-C05-102 | 971 | `@stati/cli` has no programmatic API | A | ✅ | packages/cli/package.json: `bin` only, no `main`/`exports` | |
| V-C05-103 | 975 | `create-stati` declares only a `bin` | A | ✅ | packages/create-stati/package.json: `bin` only (dist holds `.d.ts` files, but no `types`/`exports` field points at them) | |
| V-C05-104 | 981-1006 | Type-safe configuration example | X | ✅ | Valid against types/config.ts | |
| V-C05-105 | 1010-1038 | Hooks example; `beforeAll` runs before the cache check | X | ✅ | core/build.ts:651-668 | |
| V-C05-106 | 1040 | Templates are not type-checked | B | ✅ | Eta templates are plain JS (no TS step in core/templates.ts) | |
| V-C05-107 | 11 | "Stati is built with TypeScript-first design, providing comprehensive type definitions ... excellent IntelliSense" | V | ✂️ | Marketing | delete line 11 |
| V-C05-108 | 977-1038 | "Usage examples" | V | ✂️ | The config example repeats configuration/file.md "TypeScript configuration"; the hooks example repeats configuration/file.md:358-391 and api/hooks.md | delete both examples (977-1038), keep the final sentence at 1040 |

### docs-site/site/api/reference.md

Covers: src/index.ts, core/index.ts, build.ts, dev.ts, preview.ts, invalidate.ts, env.ts, core/templates.ts

| ID | Line | Claim | Cat | Status | Evidence | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| V-C05-109 | 11 | Everything below is exported or on `stati`; "[Types] lists every export" | R | ⚠️ | True once V-C05-098 is applied | apply V-C05-098 |
| V-C05-110 | 23-27 | `defineConfig`, `loadConfig(cwd?)`, `clearConfigCache()` signatures | A | ✅ | src/index.ts:168, 207; config/loader.ts:47, 172 | |
| V-C05-111 | 35-42 | `build`, `createDevServer`, `createPreviewServer`, `invalidate`, env functions | A | ✅ | core/build.ts:345; core/dev.ts:494; core/preview.ts:60-62; core/invalidate.ts:210; env.ts | |
| V-C05-112 | 44 | Servers expose `start()`, `stop()`, `url`; `build()` doesn't set the env; sitemap, robots, RSS only in production; invalidate queries | B | ✅ | core/dev.ts:71-75; core/preview.ts:33-37; no `setEnv` in core/build.ts; build.ts:1692, 1730, 1757; core/invalidate.ts:26-27, 80-110 | |
| V-C05-113 | 46 | Metrics functions; `getStatiVersion()` | A | ✅ | src/index.ts:130, 172 | |
| V-C05-114 | 52-59 | Hooks table; cached pages skip per-page hooks | B | ✅ | core/build.ts:651-654, 866-891, 1808-1811 | |
| V-C05-115 | 63-83 | Template context table | A | ⚠️ | Rows ✅ (core/templates.ts:290-330; types/content.ts:545-639). Missing `stati.image(src, options?)`, a main template API (templates.ts:325-329), and `stati.ogImage` | add a row: "\| `stati.image(src, options?)` \| An `<img>` with its size and lazy loading, responsive with `images.responsive`; see [Images](/configuration/images) \|" |
| V-C05-116 | 89 | SEO functions exported | A | ✅ | src/index.ts:134-156 | |
| V-C05-117 | 93 | RSS functions exported | A | ✅ | src/index.ts:160-165 | |
| V-C05-118 | 97 | Common types incl. `MarkdownIt`, `StatiHelpers` | T | ✅ | src/index.ts:23-49, 81 | |
| V-C05-119 | 29, 44, 59, 85, 89, 93, 97, 101 | Cross-references | R | ✅ | V-AUTO-001; each target covers the topic | |

### docs-site/site/advanced/deploying-to-a-subfolder.md

Covers: core/utils/base-path.utils.ts, core/base-path-links.ts, core/templates.ts (stati.url), core/markdown.ts:215-267, core/build.ts (basePath), core/utils/server.utils.ts, dev.ts, preview.ts, css/stylesheet.ts, images/plan.ts, images/runtime.ts, core/utils/typescript.utils.ts

| ID | Line | Claim | Cat | Status | Evidence | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| V-C05-120 | 27 | Base path from `baseUrl`; trailing slash irrelevant; no path or `/` gives none, "and the site builds exactly as before" | B | ❌ L | Behavior ✅ (base-path.utils.ts:29-54; built with and without the slash). "exactly as before" is a history reference (before what?) | old: "has no base path, and the site builds exactly as before." → new: "has no base path, and the site is built for the root of the host." |
| V-C05-121 | 29 | URL patterns in the config (`seo.articles`, `rss.contentPatterns`, `sitemap.priorityRules`, bundle `include`/`exclude`) stay relative to the site root, like `/posts/hello` | G | ❌ M | `rss.contentPatterns` are matched against the page's source file path, not its URL (rss/generator.ts:53-63, `page.sourcePath`). Built: `['**/blog/**/*.md']` matched, `['/blog/**']` matched nothing. The others match `page.url` (seo/defaults.ts:101-104; seo/sitemap.ts:111-128). | old: "URL patterns in the config (`seo.articles`, `rss.contentPatterns`, `sitemap.priorityRules`, bundle `include` and `exclude`)" → new: "URL patterns in the config (`seo.articles`, `sitemap.priorityRules`, bundle `include` and `exclude`)" |
| V-C05-122 | 33-46 | `stati.url()` adds the base path to `/` paths; leaves absolute, `//`, `#`, `?`, relative and already-prefixed values; twice is harmless; no base path → unchanged | A | ✅ | base-path.utils.ts:62-110; core/templates.ts:322-323; built page printed `/docs/x\|//cdn.x/a\|?q=1\|rel/x\|https://a.b/c\|/docs/a` | |
| V-C05-123 | 48 | `page.url`, nav urls, collection and pagination URLs are site-root relative | B | ✅ | core/templates.ts:262; built nav links needed `stati.url(item.url)` to get `/docs/blog` | |
| V-C05-124 | 54 | Bundle scripts prefixed | B | ✅ | core/utils/typescript.utils.ts:641-669; core/build.ts:990 | |
| V-C05-125 | 55 | Hashed stylesheet links prefixed | B | ✅ | Built: `<link rel="stylesheet" href="/docs/_assets/styles-2A268E91.css" />`; css/stylesheet.ts:943, 971 | |
| V-C05-126 | 56 | Search index meta prefixed | B | ✅ | core/build.ts:955; built: `content="/docs/search-index-979e88ae.json"` | |
| V-C05-127 | 57 | `stati.image()`, Markdown images, variants and co-located copies prefixed | B | ✅ | images/plan.ts:110-116, 190; images/runtime.ts:298-300, 540; core/templates.ts:94; built `![Logo](/favicon.svg)` → `/docs/favicon.svg` | |
| V-C05-128 | 58 | Root-absolute Markdown `href`/`src` prefixed | B | ✅ | core/markdown.ts:223-267; built `[Tags](/tags)` → `/docs/tags`. See Gaps: a Markdown link that already has the base path is prefixed again (`/docs/x` → `/docs/docs/x`, `addBasePath`, not `withBasePath`) | |
| V-C05-129 | 59 | Absolute URLs follow `baseUrl` "(these always followed `baseUrl`)" | B | ❌ L | Behavior ✅ (built og:url, sitemap, RSS, robots all `https://example.com/docs/...`); the parenthesis is a history note | old: "`https://example.com/docs/…` (these always followed `baseUrl`)" → new: "`https://example.com/docs/…`" |
| V-C05-130 | 61 | Relative, absolute, `#hash`, `mailto:` Markdown links untouched; raw HTML unchanged | B | ✅ | base-path.utils.ts:57-64 (`isRootPath`); built: `blog/post`, `https://x.com/a`, `#top`, `mailto:a@b.c`, `<a href="/raw">` unchanged | |
| V-C05-131 | 63-67 | Search index `url`, `stati.assets.*` paths and `stati.ogImage.path` stay site-relative; `data-base-path` pattern | B | ✅ | Built: index entry `"url":"/blog/post"`, assets JSON `searchIndexPath":"/search-index-...json"`, `<body data-base-path="/docs/">`; types/images.ts (`path` root-relative) | |
| V-C05-132 | 69 | Hashed copies rebase relative `url()`/`@import`; root-absolute `url(/x)` left as written | B | ✅ | css/stylesheet.ts:366-378 (`${basePath}${pathname}` for relative references only) | |
| V-C05-133 | 73 | `dist/` holds the site at its root | B | ✅ | Built `work/C05/bp/dist/index.html`, `dist/_assets/` (no `docs/` folder) | |
| V-C05-134 | 77 | Dev and preview serve under the base path; printed address; `/` and `/docs` redirect to `/docs/`; outside is 404; `/__ws` at root | B | ✅ | core/utils/server.utils.ts:87-124; dev.ts:535-536, 744-758; preview.ts:80-81, 160-162. Preview on 4105: printed `http://localhost:4105/docs/`; `/` and `/docs` → 302 `/docs/`; `/?a=1` → `/docs/?a=1`; `/other` → 404 | |
| V-C05-135 | 81-87 | Warning per unprefixed `href`/`src`, naming first page and attribute; sample text; cached pages not rechecked; `--force`; none without a base path | B | ✅ | core/base-path-links.ts:48-109; core/build.ts:866-875 (cache hit `continue`s before 994), 1122. Built warning: `/: href="/raw" does not start with the base path /docs, so it breaks when the site is served from there. Use stati.url("/raw").` | |
| V-C05-136 | 87 | "A template that skips `stati.url()` shows up in the build log instead of as a 404 in production." | V | ✂️ | Restates the paragraph above | delete the sentence |
| V-C05-137 | 91 | robots.txt still written with the base path in `Sitemap:`, plus a note | B | ✅ | core/build.ts:1748-1753; built robots `Sitemap: https://example.com/docs/sitemap.xml` and the log line | |
| V-C05-138 | 95 | Base path is part of the cache check; changing it rebuilds every page | B | ✅ | core/build.ts:791-793 (`basePath` in `staticRenderInputs`) | |
| V-C05-139 | 99-138 | GitHub Pages workflow | X | ⚠️ | Config ✅. `npx stati build` skips a project's own `build` script, which the Tailwind and Sass scaffolds need (AGENTS.md:75); action majors are not the latest (checkout and setup-node have v5, upload-pages-artifact v4), though v4/v3 still run. Not run here (needs GitHub). | old: `      - run: npx stati build` → new: `      - run: npm run build`; optionally bump action majors after checking them |
| V-C05-140 | 140 | Custom domain or user site needs none of this | B | ✅ | No path → no base path (base-path.utils.ts:51-53) | |
| V-C05-141 | 33, 144-146 | Links to `/api/templates#stati-url-path`, `/configuration/site-metadata#baseurl-required`, `/cli/development` | R | ✅ | api/templates.md:286; site-metadata.md:52; V-AUTO-001 | |

### Gaps

- **Markdown links that already carry the base path get it twice.** `[x](/docs/x)` with base path `/docs` renders `/docs/docs/x` (core/markdown.ts:229 uses `addBasePath`, not `withBasePath`), unlike `stati.url()`. deploying-to-a-subfolder.md should say: "Write Markdown links from the site root, without the base path."
- **A `baseUrl` that is not an absolute http(s) URL has no base path** (base-path.utils.ts:41-50). One clause for deploying-to-a-subfolder.md:27.
- **A stylesheet link without the base path is not hashed** (it is outside the site, css/stylesheet.ts:614): with a base path, `href="/styles.css"` stayed as written and only the missed-link warning flagged it. Covered in practice by the warning; optional sentence in the "What Stati prefixes" section.
- **Unknown nested options are not rejected**, only unknown top-level ones (loader.ts:112-123). The `images`, `css` and `readingTime` blocks check their own keys; `search`, `markdown`, `typescript`, `rss` do not. Covered by the V-C05-006 fix ("a top-level option").
- **`BuildResult` is `BuildStats` plus `buildMetrics?`** (core/build.ts:206-209). types.md documents `BuildStats` but never says it is what `build()` returns; one sentence under "Build statistics".
- **`DevServer` and `PreviewServer`** (start/stop/url) are not exported; api/reference.md names them in signatures. Fine as is; note only.

### Terminology

- "frontmatter" (site-metadata.md:109, 110, 149, 173, 191, 432; types.md:430 comment) vs "front matter" (file.md, types.md elsewhere, site-metadata.md:71). Pick "front matter" for prose.
- Eta snippets fenced as ` ```html ` in site-metadata.md but ` ```eta ` in file.md, types.md and deploying-to-a-subfolder.md.
- "Open Graph template" (reference.md:63, types.md:439) vs "og.eta card template" (types.md:510) vs "Open Graph card" (file.md:289). Suggest "Open Graph template" for `og.eta`, "Open Graph card" for the image.
- "ISG cache" (file.md:397, reference.md:59) vs "cache" vs "build cache"; consistent enough within C05.
- "base path" is consistent across the cluster.

### Cross-cluster

- `examples/blank/site/layout.eta:14-29` (C02): hand-written `/favicon.svg`, `/styles.css` and `/` links. Under a base path the build warns for each and the stylesheet is not hashed. The canonical `<%= stati.site.baseUrl %><%= stati.page.url %>` doubles the slash with a trailing-slash `baseUrl`. Check the other starters too.
- `.claude/skills/stati/references/configuration.md:39`: loader default `site.title` is `Stati Site`; source is `'My Stati Site'` (constants.ts:121).
- `packages/core/src/types/isg.ts:13, 18, 46`: source comments for `AgingRule.untilDays` ("for content older than 7 days", "after which this aging rule applies") and `ISGConfig.maxAgeCapDays` are wrong; see V-C05-084. Not docs, but generated `.d.ts` carry them to editors.
- `packages/core/src/config/loader.ts:161`: JSDoc example imports from `'stati'` (should be `'@stati/core'`).
- configuration/isg.md (C08) should be checked for the same aging-rule wording as V-C05-084.

### Phase 5 log

configuration/file.md

- V-C05-006: applied, per the lead's ruling: the complete list of what `loadConfig` validates (`isg`, `images`, `readingTime`, `css` blocks; `seo.defaultAuthor.twitter`, `seo.twitter`, `seo.articles`; `sitemap.news`; `helpers`; unknown top-level options), plus "Only top-level option names are checked". Re-checked against config/loader.ts:241-347, seo/defaults.ts:399-440, seo/news-sitemap.ts:67-97 and cfgtest (`badSeo` with a bad-but-string handle loads, a non-string throws per defaults.ts:408).
- V-C05-016: applied (`stati.url(`/${stati.slugify(...)}`)`). Re-checked against core/templates.ts:322-323; rebuilt `work/C05/bp`: `href="/docs/post"`, no warning.
- V-C05-019, V-C05-028, V-C05-030, V-C05-036: applied (deleted). No anchors pointed at the removed headings (grep of docs-site, READMEs, llms.txt).
- V-C05-034, V-C05-035: applied; the three `###` headings under the removed `## Configuration file` became `##` (slugs unchanged).
- V-C05-037: applied; defaults moved into the example comments. Re-checked against constants.ts:42-48, core/dev.ts:518-525, core/preview.ts:69-76.
- V-C05-038: applied; field lists replaced by a link to Site metadata.
- C04 cross-cluster (file.md:105-133 Markdown block): applied; replaced by one sentence naming `plugins`, `configure` (after the plugins), `toc` (default `true`) and a link to configuration/markdown.md, which states all three (markdown.md:13-67). Re-checked against core/markdown.ts:76-104, build.ts:900.
- C08 cross-cluster (file.md:28): same as V-C05-006, applied.
- C01 cross-cluster (file.md:369 `page.frontMatter.section`): verified, no change: it is set in `beforeAll` (build.ts:651-668), the pattern D9 asks for.

configuration/site-metadata.md

- V-C05-041, V-C05-049, V-C05-052, V-C05-055, V-C05-062, V-C05-064, V-C05-065, V-C05-067: applied (cut). V-C05-052 and V-C05-055 became one section "Author and SEO tags" linking to configuration/seo.md and its site-wide defaults. The only fact not stated on seo.md, "`email` is not printed" (D15), now lives in the `AuthorConfig` comment in api/types.md. No links pointed at the removed anchors (only `#baseurl-required` is linked, kept).
- V-C05-042: applied to the two remaining Eta blocks (the other three were in cut sections).
- V-C05-044: applied (the lead's ruling). Re-checked against base-path.utils.ts:41-54 and the trailing-slash builds.
- V-C05-063: applied (Twitter Card Validator line removed).
- V-C05-066: applied. Re-checked: api/templates.md:13 heading `## Template context (`stati`)`.
- Terminology: "frontmatter" → "front matter" in the two remaining prose lines.

api/types.md

- V-C05-072: applied (`readonly`). Re-checked against types/config.ts:25-31.
- V-C05-084: applied with the lead's addition (a page older than every rule gets the last rule's TTL), plus defaults on `enabled` and `ttlSeconds`. Re-checked against core/isg/ttl.ts:205-235, 167-183; config/loader.ts:63-67; isg/validation.ts:166-185 (rules must be sorted, so "last" is the highest `untilDays`).
- V-C05-086, V-C05-101: applied (version references removed).
- V-C05-081, V-C05-093: applied. Re-checked against types/content.ts:19-44, css/stylesheet.ts:614, 943.
- V-C05-088: applied; note shortened to the one fact the comments lack. Re-checked against core/utils/typescript.utils.ts:106 (`sourceMaps: !isProduction`), :424.
- V-C05-094: applied (`stati.url(path)`).
- V-C05-098: applied (`CSSConfig`, `ReadingTimeConfig`, `TailwindBuildOptions`). Re-checked against src/index.ts:40, 43, 107; the list now matches every `export type` in src/index.ts.
- V-C05-107, V-C05-108: applied. The closing sentence on type-checking moved to the top as the page intro, since the examples it followed are gone. No links pointed at `#usage-examples` and its subsections.
- Gap (BuildResult): applied, one sentence under Build statistics. Re-checked against core/build.ts:206-209.
- D15: `AuthorConfig.email` comment now says it is not printed (no read of `email` in packages/core/src/seo).
- C08 cross-cluster (types.md:557): same as V-C05-084, applied.
- Terminology: "Frontmatter fields" comment → "Front matter fields".

api/reference.md

- V-C05-109: applied through V-C05-098.
- V-C05-115: applied; row added: "An image with its intrinsic size and lazy loading; a `<picture>` with AVIF and WebP variants under `images.responsive`". Re-checked against types/content.ts:624-632, core/templates.ts:325-329, images/markup.ts (`<picture>`), constants.ts:173.

advanced/deploying-to-a-subfolder.md

- V-C05-120, V-C05-129: applied (history wording removed).
- V-C05-121: applied (`rss.contentPatterns` dropped from the URL-pattern list). Re-checked against rss/generator.ts:53-63.
- V-C05-136: applied (sentence cut).
- V-C05-139: applied (`npm run build`; every starter defines `build`, examples/*/package.json). Action majors left as they are: their current versions can't be confirmed from the repo (D10).
- Gap (Markdown link that already includes the base path): applied, one sentence after the raw-HTML note. Re-checked against core/markdown.ts:223-232 (`addBasePath`) and the Phase 4 build (`/docs/x` → `/docs/docs/x`).
- C03 cross-cluster (hand-written `/styles.css` link under a base path is neither prefixed nor hashed): applied; the `stati.url()` example now includes `<link rel="stylesheet" href="<%= stati.url('/styles.css') %>">`. Re-checked: Phase 4 build hashed `/docs/_assets/styles-2A268E91.css` with `stati.url('/styles.css')` and left `/styles.css` unhashed without it.

Left

- V-C05-031: left (the lead's ruling: code bug H5, no doc change).

Applied 45 (14 ❌, 20 ✂️, 6 ⚠️, 2 gaps, 2 cross-cluster from C03 and C04, 1 from D15; C08's two items are the same as V-C05-006 and V-C05-084), rejected 0, left 1 (V-C05-031) plus 1 cross-cluster item verified with no change needed (C01, file.md:369).

## C06 findings

Summary: 119 claims; ✅ 79, ❌ 10 (H 0, M 4, L 6), ⚠️ 3, ✂️ 27. (Rows marked ✅/✂️ count as ✂️: the claim is right and the row carries a cut.)

Test project: `scratchpad/work/C06/p1` (local CLI build with sitemap, news sitemap, robots, an unquoted `openGraph.article.publishedTime` and an unquoted `structuredData` date; `t1.mjs` runs the API examples; `t2.mjs` imports `SEOTagType` from `@stati/core`). No server was started.

### docs-site/site/configuration/seo.md

Covers: packages/core/src/seo/{auto-inject,generator,defaults,sitemap,news-sitemap,robots}.ts, seo/utils/*, types/seo.ts, types/sitemap.ts, types/config.ts (SEOConfig, RobotsTxtConfig), types/content.ts (SEOMetadata, SitemapMetadata), core/build.ts:661-663, 886-947, 1691-1763, config/loader.ts:287-300

| ID | Line | Claim | Cat | Status | Evidence | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| V-C06-001 | 21 | Intro paragraph | V | ✂️ | Marketing ("comprehensive", "designed to work automatically ... granular control") | old: "Stati provides comprehensive SEO support with automatic metadata generation, sitemap creation, and robots.txt configuration. The SEO features are designed to work automatically with minimal configuration while offering granular control when needed." → new: "Stati adds SEO metadata to every page and can write a sitemap and a robots.txt file." |
| V-C06-002 | 25 | "This requires **zero configuration** and works out of the box." | V | ✂️ | Restates the first sentence | old: "By default, Stati automatically injects SEO metadata into all pages during build. This requires **zero configuration** and works out of the box." → new: "By default, Stati injects SEO metadata into every page during the build." |
| V-C06-003 | 29-32 | Injection steps: analyze rendered HTML, detect existing tags in `<head>`, generate missing, inject before `</head>` | B | ✅ | seo/auto-inject.ts:67-125; core/build.ts:930-947; seo/utils/escape-and-validation.utils.ts:380-418 | |
| V-C06-004 | 38-46 | What gets generated and fallbacks (title, description, keywords, canonical, author, robots only when set or on 404, OG, Twitter, JSON-LD) | B | ✅ | seo/generator.ts:96-156; seo/defaults.ts:253-255; verified in p1 `dist/my-page.html` | |
| V-C06-005 | 50-62 | `seo.autoInject: false` disables injection | G | ✅ | seo/auto-inject.ts:71-76; core/build.ts:931 | |
| V-C06-006 | 66-89 | `stati.generateSEO()` and `stati.generateSEO([...])` with tag strings | A | ✅ | core/templates.ts:308-318; seo/generator.ts:399-459 | |
| V-C06-007 | 93-103 | Tag type strings; `SEOTagType` enum imported from `@stati/core/types` | T | ✅ | types/seo.ts:22-41; types/index.ts:59 (value export); src/index.ts:52-65 (type-only); `t2.mjs`: `SyntaxError ... does not provide an export named 'SEOTagType'` from `@stati/core` | |
| V-C06-008 | 109-142 | `seo` options: `autoInject` (default true), `defaultAuthor` {name, email, url, twitter}, `twitter.site`, `articles` {include, exclude}, `debug` (default false) | G | ✅ | types/config.ts:223-277; types/content.ts:343+ (AuthorConfig); seo/defaults.ts:399-447 | |
| V-C06-009 | 122 | `defaultAuthor.email` shown with no comment, next to fields whose output is explained | G | ⚠️ | `email` is never read: no `.email` use in packages/core/src (grep). Readers will expect a tag. Settle: maintainer decides whether to say so or drop `email` from examples | old: "      email: 'john@example.com'," → new: "      email: 'john@example.com', // not printed in any tag" (same in api/seo.md:904, 1324 and seo-usage-scenarios.md:153, 416 if kept) |
| V-C06-010 | 146-158 | Site-wide defaults table (og:locale, twitter:site, twitter:creator, og:type, article:* incl. publish date from `publishedAt`/`published`/`date`/`createdAt`, robots noindex on 404) | B | ✅ | seo/defaults.ts:132-255; core/utils/date.utils.ts:10,32-57; core/content.ts:80-84; test/seo/defaults.test.ts:134-311 | |
| V-C06-011 | 162 | Locale conversion (`en-US`→`en_US`, `pt-br`→`pt_BR`, `zh-Hant-TW`→`zh_TW`, `en` → none, debug warning, front matter locale as written) | B | ✅ | seo/defaults.ts:60-73, 178-182, 270-280; seo/generator.ts:225-227; test/seo/defaults.test.ts:64-83 | |
| V-C06-012 | 166-179 | Handles: only from a handle, one `@`, own author never gets default's handle/url, plain-name author gives no creator/article:author | B | ✅ | seo/defaults.ts:81-87, 107-115, 158-161, 196-218; test/seo/generator.test.ts:1208-1229 | |
| V-C06-013 | 183 | `seo.articles` globs as bundle targeting, whole URL, exclude wins, generated/paginated never match; without it only `type: article` | B | ✅ | seo/defaults.ts:96-105; core/utils/bundle-matching.utils.ts:124-136 (same `matchesGlob`); core/utils/glob-patterns.utils.ts:23-129 | |
| V-C06-014 | 185-200 | Fill value by value; a page setting another `type` gets no article tags | B | ✅ | seo/defaults.ts:132-194; seo/generator.ts:230; test/seo/defaults.test.ts:164-206 | |
| V-C06-015 | 204-209 | Defaults written after `beforeAll`; `beforeRender` refresh; templates see `stati.page.seo`; changing defaults rebuilds | B | ✅ | core/build.ts:661-663, 886-891; seo/defaults.ts:270-307; test/seo/defaults.test.ts:322-404 | |
| V-C06-016 | 211 | One `og:`/`twitter:` tag in the layout turns off the whole group | B | ✅ | seo/utils/escape-and-validation.utils.ts:403-404; seo/auto-inject.ts:97-102 | |
| V-C06-017 | 217-225 | "Basic SEO fields" example (title, description, order) | V | ✂️ | Ordinary front matter; the fallbacks are already listed at lines 38-40 | delete the `### Basic SEO fields` heading and its code block (lines 217-225) |
| V-C06-018 | 229 | `images.og`: pages without an image get a card plus `og:image`, `twitter:image`, size tags; `image: false` gives none | B | ✅ | seo/generator.ts:196-203, 322-326, 368-383; types/content.ts (OpenGraphConfig.image) | |
| V-C06-019 | 255 | Unquoted `publishedTime`/`modifiedTime` makes the build fail with "text.replace is not a function" | B | ❌ M | `escapeHtml` now accepts any value (`String(value)`, seo/utils/escape-and-validation.utils.ts:36-37). p1 build succeeded and printed `<meta property="article:published_time" content="Wed Jan 15 2025 11:00:00 GMT+0100 (...)">`. The `structuredData` half is right: p1 printed `"datePublished":{}` (sanitizeStructuredData treats a Date as an object, :122-138) | old: "YAML turns an unquoted date or timestamp into a date object, and an unquoted `publishedTime` or `modifiedTime` makes the build fail with \"text.replace is not a function\". Dates inside `structuredData` must be quoted too; unquoted ones are written as `{}`." → new: "YAML turns an unquoted date or timestamp into a date object. An unquoted `publishedTime` or `modifiedTime` is printed in JavaScript's long date format (`Wed Jan 15 2025 11:00:00 GMT+0100 ...`), not ISO 8601, and an unquoted date inside `structuredData` is written as `{}`." |
| V-C06-020 | 257 | Article tags only for `type: article`; locale as written; `/` image URLs made absolute with `site.baseUrl` | B | ✅ | seo/generator.ts:205-227, 230; seo/utils/url.utils.ts:38-57 (any URL without a scheme is resolved, not only `/`) | |
| V-C06-021 | 276 | Front matter `twitter.site`/`creator` printed as written, else config handles | B | ✅ | seo/generator.ts:282-289; seo/defaults.ts:207-215 | |
| V-C06-022 | 300 | JSON-LD as written, no entities, `<` as `<` | B | ✅ | seo/utils/escape-and-validation.utils.ts:162-172; seo/generator.ts:153-156 | |
| V-C06-023 | 304-318 | Robots object fields and their output | T | ✅ | types/content.ts (RobotsConfig); seo/utils/escape-and-validation.utils.ts:236-267 | |
| V-C06-024 | 320 | `index: false`, `noindex: true` or a `noindex`/`none` string leaves the page out of the sitemap | B | ✅ | seo/sitemap.ts:137-159 | |
| V-C06-025 | 326, 514 | Sitemap and robots.txt production-only | B | ✅ | core/build.ts:1692, 1736 | |
| V-C06-026 | 330-343 | Enable sitemap; `baseUrl` used for absolute URLs | G | ✅ | seo/sitemap.ts:226, 255 | |
| V-C06-027 | 359-400 | `defaultPriority` (0.5 when unset), `defaultChangeFreq` (none when unset), patterns, `filter`, `transformUrl(url, page, config)`, `transformEntry` (null excludes), `priorityRules` first match | G | ✅ | seo/sitemap.ts:168-186, 201-280; types/sitemap.ts:36-84 | |
| V-C06-028 | 405-408 | Pattern matching (globs whole URL; plain prefix with `/` boundary; `/` only home) | B | ✅ | rss/utils/pattern-matching.utils.ts:16-63; core/utils/glob-patterns.utils.ts:23-108 | |
| V-C06-029 | 410 | Drafts never in sitemap unless `--include-drafts` | B | ✅ | drafts are not loaded without the flag (AGENTS.md); sitemap.ts has no draft check | |
| V-C06-030 | 412 | 404 and noindex pages left out; `sitemap.exclude: false` keeps them; patterns and filter still apply | B | ✅ | seo/sitemap.ts:153-159, 207-224; test/seo/sitemap.test.ts:462-497 | |
| V-C06-031 | 414 | Generated and later pagination pages are in the sitemap | B | ✅ | seo/sitemap.ts:153-159 (no `isVirtualPage` check) | |
| V-C06-032 | 416 | lastmod order (not `publishedAt`), one decimal, split above 50,000, `generateIndex` unused | B | ✅ | seo/sitemap.ts:57-78, 300, 350-421 | |
| V-C06-033 | 422-433 | Per-page `sitemap` block; `seo.priority`/`changeFreq` not used | G | ✅ | seo/sitemap.ts:239-252; types/content.ts (SitemapMetadata) | |
| V-C06-034 | 435-443 | Change frequency list with descriptions | V | ✂️ | Values right (seo/sitemap.ts:98); the descriptions restate the word and the "good for" hints are generic | replace lines 435-443 with: "Change frequency values: `always`, `hourly`, `daily`, `weekly`, `monthly`, `yearly`, `never`." (drop the `###` heading, or keep it with this one line) |
| V-C06-035 | 447-483 | `sitemap.news` options and defaults (`publicationName` site.title, `language` from defaultLocale or `en`, `maxAgeDays` 2, `filename` news-sitemap.xml); `robots.sitemap: true` lists both | G | ✅ | types/sitemap.ts:107-121; seo/news-sitemap.ts:22-25, 44-46, 141-150, 219, 266-269 | |
| V-C06-036 | 485-499 | Written next to sitemap.xml in production; sample `<url>` | X | ✅ | core/build.ts:1700-1706; seo/news-sitemap.ts:171-194; p1 `dist/news-sitemap.xml` matches | |
| V-C06-037 | 501-506 | Which pages, left out, order and size, URLs, robots.txt, validation | B | ✅ | seo/news-sitemap.ts:67-132, 212-277; core/build.ts:1744-1749; seo/robots.ts:184-196; config/loader.ts:298-300 | |
| V-C06-038 | 508 | Freshness decided at build time | B | ✅ | seo/news-sitemap.ts:217-219 | |
| V-C06-039 | 518-530 | Default output `User-agent: *` / `Allow: /`; `Sitemap:` only when set | B | ✅ | seo/robots.ts:40-47, 78, 180-197 | |
| V-C06-040 | 534-582 | robots options, `crawlDelay` in the `*` group, `sitemap` true or URL, `customLines` | G | ✅ | seo/robots.ts:127-209; types/config.ts:467-500 | |
| V-C06-041 | 584-607 | Example robots.txt output | X | ✅ | p1 `dist/robots.txt` identical | |
| V-C06-042 | 609-611, 622-632 | "Stati supports nine types..." and "Individual tag types" list | V | ✂️ | Same nine types as lines 91-103 on this page | delete line 611 and the `### Individual tag types` heading and list (lines 622-632); keep `### Tag type groups` (linked from line 211). Optionally rename `## SEO tag types` to `## Tag type groups` and drop the `###` |
| V-C06-043 | 613-620 | Group behavior | B | ✅ | seo/utils/escape-and-validation.utils.ts:403-404 | |
| V-C06-044 | 634-706 | "Best practices" (titles, descriptions, priorities, change frequency, OG images, structured data, test tools) | V | ✂️ | Generic SEO advice; the OG image and structured data examples repeat lines 233-298; test tools repeat seo-usage-scenarios.md:669-686; the 50-160 description range repeats the validation warnings | delete the `## Best practices` section (lines 634-706) |
| V-C06-045 | 706 | Twitter Card Validator link | R | ❌ L | `https://cards-dev.twitter.com/validator` answers 307 to an X login page; the tool no longer previews cards | delete the line (goes with V-C06-044) |
| V-C06-046 | 710-717 | Troubleshooting: autoInject, tags exist, YAML, missing `</head>` | B | ✅ | seo/auto-inject.ts:71, 97-117 | |
| V-C06-047 | 719-731 | `seo.debug: true` for detailed logs | G | ✅ | seo/auto-inject.ts:40-48; seo/generator.ts:55-66; seo/defaults.ts:272-280 | |
| V-C06-048 | 741 | Validation problems are warnings, tags still generated | V | ✂️ | ✅ in substance (seo/generator.ts:45-66), but lines 756-765 say the same | delete line 741 |
| V-C06-049 | 745-754 | Hybrid override with a manual `<title>` | B | ✅ | seo/utils/escape-and-validation.utils.ts:394 | |
| V-C06-050 | 756-765 | "Configuration validation errors" list | B | ❌ L | These check front matter, not config. List leaves out the Open Graph image `width`/`height` error and the image URL warnings, and the length checks apply only to `seo.title`/`seo.description` (seo/utils/escape-and-validation.utils.ts:289-361). Errors print through `logger.warning` (seo/generator.ts:50-58) | old: "### Configuration validation errors" → new: "### Front matter validation"; old: the four-bullet list (lines 760-763) → new: "Errors, such as a `seo.canonical` that is not an absolute `http` or `https` URL, or a `seo.priority` outside 0.0 to 1.0; warnings, such as a `seo.title` or `seo.description` of unusual length. The full list is in [`SEOValidationResult`](/api/seo#seovalidationresult)." |
| V-C06-051 | 767-773 | "Performance concerns" | V | ✂️ | Split fact repeats line 416; "overhead is minimal" is unverified; filter tip is filler | delete the section |
| V-C06-052 | 775-778 | Next steps links | R | ✅ | pages exist | |

### docs-site/site/api/seo.md

Covers: packages/core/src/index.ts:133-157, seo/*, types/seo.ts, types/sitemap.ts, types/config.ts:223-277, 467-500, types/content.ts SEO types, types/logging.ts

| ID | Line | Claim | Cat | Status | Evidence | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| V-C06-053 | 11 | "Complete reference for Stati's SEO API including functions, types, and configuration interfaces." | V | ✂️ | Restates the heading and the frontmatter description | delete line 11 |
| V-C06-054 | 15-46 | `generateSEOMetadata(context: SEOContext): string`, example with `logger` and `exclude` | A | ✅ | seo/generator.ts:41; types/seo.ts:47-68; src/index.ts:135 | |
| V-C06-055 | 48 | `SEOTagType` value only from `@stati/core/types`; importing from `@stati/core` fails (SyntaxError in JS) | T | ✅ | src/index.ts:59 (`export type`); types/index.ts:59; `t2.mjs` SyntaxError | |
| V-C06-056 | 52-55 | Errors logged as warnings; warnings under debug; 404 noindex | B | ✅/✂️ | seo/generator.ts:45-66, 125-131. Line 53 restates line 52 | delete line 53 ("- This prevents a single SEO issue from blocking the entire build") |
| V-C06-057 | 65-74, 351-362, 751-770 | `generateSEO` context, `AutoInjectOptions` and `SEOContext` shown without `generatedImage` / `deferGeneratedImage` | T | ⚠️ | seo/generator.ts:399-408; seo/auto-inject.ts:18-31; types/seo.ts:60-67. The fields are optional plumbing for `images.og`; the documented subset still compiles. Settle: maintainer decides whether the API page lists them | if listed, add to each block: "  /** Open Graph image generated for the page by images.og */\n  generatedImage?: GeneratedOgImage;" (and to `SEOContext` and `generateSEO`: "  deferGeneratedImage?: boolean;") |
| V-C06-058 | 76-115 | `generateSEO` params, strings in templates, enum or strings in TS | A | ✅ | seo/generator.ts:409-428 | |
| V-C06-059 | 117-119 | "Template Context" paragraph | V | ✂️ | Repeats line 61 | delete the `**Template Context:**` label and its paragraph |
| V-C06-060 | 127, 182, 230 | "Production Only" callouts under `generateSitemap`, `generateNewsSitemap`, `generateRobotsTxt` | V | ✂️ | The functions run in any environment; the build-pipeline rule is stated on configuration/seo.md:326, 485, 514 | delete the three `> **Production Only**` blockquotes |
| V-C06-061 | 132-136 | `generateSitemap(pages, config, sitemapConfig)` | A | ❌ M | Signature has a fourth parameter, `logger?: Logger`, which receives the invalid-date warnings (seo/sitemap.ts:57-78, 371-376) | old: "  sitemapConfig: SitemapConfig,\n): SitemapGenerationResult;" → new: "  sitemapConfig: SitemapConfig,\n  logger?: Logger,\n): SitemapGenerationResult;" and add parameter: "- `logger` (Logger, optional): Receives a warning for each invalid `sitemap.lastmod`, `updated` or `date` value, which is skipped" |
| V-C06-062 | 141-174 | Params, result fields, split at 50,000, index XML, baseUrl, 404/noindex | A | ✅ | seo/sitemap.ts:371-421; types/sitemap.ts:127-136 | |
| V-C06-063 | 186-222 | `generateNewsSitemap(pages, config, news, logger?, now?)`, result, notes, `generateNewsSitemapXml(entries, publication)` | A | ✅ | seo/news-sitemap.ts:171-174, 212-277; src/index.ts:143-144 | |
| V-C06-064 | 235-282 | `generateRobotsTxt(options?)` and `RobotsTxtOptions` | A | ✅ | seo/robots.ts:12-35, 73-116; `t1.mjs` output | |
| V-C06-065 | 292-338 | `generateRobotsTxtFromConfig(config, siteUrl?, additionalSitemaps?)`; example output | A | ✅ | seo/robots.ts:127-239; `t1.mjs` output identical | |
| V-C06-066 | 388-393 | autoInjectSEO behavior | B | ✅ | seo/auto-inject.ts:67-125 | |
| V-C06-067 | 395 | `Logger` shape and import path | T | ✅ | types/logging.ts; types/index.ts:100 | |
| V-C06-068 | 399-469 | `generateOpenGraphTags`, `generateTwitterCardTags` and their defaults | A | ✅ | seo/generator.ts:174-329 | |
| V-C06-069 | 479-485 | `generateSitemapEntry(page, config, sitemapConfig)` | A | ❌ M | Fourth parameter `logger?: Logger` (seo/sitemap.ts:201-206) | old: "  sitemapConfig: SitemapConfig,\n): SitemapEntry \| null;" → new: "  sitemapConfig: SitemapConfig,\n  logger?: Logger,\n): SitemapEntry \| null;" and add "- `logger` (Logger, optional): Receives a warning for each invalid date value" |
| V-C06-070 | 497 | Returns `null` for 404/noindex unless `exclude: false` | B | ✅ | seo/sitemap.ts:153-159, 207-209 | |
| V-C06-071 | 512-573 | `generateSitemapXml`, `generateSitemapIndexXml` and examples | A | ✅ | seo/sitemap.ts:312-343; `t1.mjs` | |
| V-C06-072 | 577-604 | `shouldAutoInject(config, page)` | A | ✅ | seo/auto-inject.ts:134-139 | |
| V-C06-073 | 617 | `escapeHtml(text: string): string` | A | ❌ L | Signature is `escapeHtml(value: unknown): string`; other values are converted with `String()`, `null`/`undefined` become `''` (seo/utils/escape-and-validation.utils.ts:36-37; `t1.mjs`: `escapeHtml(1984)` → `1984`) | old: "function escapeHtml(text: string): string;" → new: "function escapeHtml(value: unknown): string;"; old: "- `text` (string): Text to escape" → new: "- `value` (unknown): Text to escape; other values are converted to text, and `null` and `undefined` become `''`" |
| V-C06-074 | 637-646 | `generateRobotsContent` and its output | A | ✅ | seo/utils/escape-and-validation.utils.ts:221-270; `t1.mjs` | |
| V-C06-075 | 656-713 | `validateSEOMetadata`, `detectExistingSEOTags` and examples | A | ✅ | seo/utils/escape-and-validation.utils.ts:289-419 | |
| V-C06-076 | 719-743 | `SEOTagType` values | T | ✅ | types/seo.ts:22-41 | |
| V-C06-077 | 773-777 | Include/exclude modes | B | ✅ | seo/generator.ts:81-94 | |
| V-C06-078 | 785-814 | `SEOValidationResult` and the full list of checks | T | ✅ | seo/utils/escape-and-validation.utils.ts:289-361 | |
| V-C06-079 | 822-868 | `SitemapEntry`, `SitemapGenerationResult`, `ChangeFrequency` | T | ✅ | types/sitemap.ts:14-30, 127-136 | |
| V-C06-080 | 878-895 | `SEOConfig` interface | T | ✅ | types/config.ts:223-236 | |
| V-C06-081 | 897-912 | `SEOConfig` example object | V | ✂️ | Same values as configuration/seo.md:115-140 and this page's lines 1320-1331 | delete the `**Example:**` label and code block |
| V-C06-082 | 914 | Config load stops on a wrong type in `seo.twitter`, `seo.articles`, `seo.defaultAuthor.twitter` | B | ✅ | seo/defaults.ts:399-447; config/loader.ts:287. (Unknown keys in `seo.twitter`/`seo.articles` are rejected too, :382-390, 421, 436; see Gaps) | |
| V-C06-083 | 918-945 | `SEOTwitterConfig`, `SEOArticlesConfig` | T | ✅ | types/config.ts:248-277; seo/defaults.ts:96-105 | |
| V-C06-084 | 953-993 | `SEOMetadata`; `priority`/`changeFreq` not used by the sitemap | T | ✅ | types/content.ts (SEOMetadata); seo/sitemap.ts:239-252 | |
| V-C06-085 | 1001-1017 | `AuthorConfig`, same shape for default and page author | T | ✅ | types/content.ts:343+; seo/defaults.ts:107-115 (email: see V-C06-009) | |
| V-C06-086 | 1025-1053 | `RobotsConfig` | T | ✅ | types/content.ts (RobotsConfig) | |
| V-C06-087 | 1062-1139 | `OpenGraphConfig`, `OpenGraphImage`, `OpenGraphArticle` and fill rules (all but `section`, ISO dates) | T | ✅ | types/content.ts; seo/defaults.ts:117-164 | |
| V-C06-088 | 1147-1170 | `TwitterCardConfig` and defaults | T | ✅ | types/content.ts; seo/generator.ts:278; seo/defaults.ts:196-218 | |
| V-C06-089 | 1178-1222 | `SitemapConfig` interface | T | ❌ M | Missing `news?: NewsSitemapConfig` (types/sitemap.ts:83, 107-121); `NewsSitemapConfig` and `NewsSitemapGenerationResult` (exported, src/index.ts:70-71) are not on the page, though `generateNewsSitemap` uses them | old: "  /** Declared but currently not read: splitting always produces an index */\n  generateIndex?: boolean;\n}" → new: "  /** Declared but currently not read: splitting always produces an index */\n  generateIndex?: boolean;\n\n  /** Google News sitemap, written as its own file (see below) */\n  news?: NewsSitemapConfig;\n}" and add after the notes: "### `NewsSitemapConfig`\n\n```typescript\ninterface NewsSitemapConfig {\n  /** URL glob patterns of the articles, like seo.articles.include */\n  include: string[];\n  /** Name of the publication (default: site.title) */\n  publicationName?: string;\n  /** ISO 639 code such as 'en' or 'zh-cn' (default: from site.defaultLocale, or 'en') */\n  language?: string;\n  /** Articles published longer ago than this many days are left out (default: 2) */\n  maxAgeDays?: number;\n  /** File name in the output folder (default: 'news-sitemap.xml') */\n  filename?: string;\n}\n```\n\nSee [Google News sitemap](/configuration/seo#google-news-sitemap)." |
| V-C06-090 | 1224-1233 | SitemapConfig notes (baseUrl, transformEntry null, transformUrl third param, pattern matching, priority rules, lastmod, decimals, split) | V | ✂️ | Correct (seo/sitemap.ts), but the pattern, lastmod, decimal and split notes repeat configuration/seo.md:405-416 nearly word for word, and the transform notes repeat the interface comments | replace the notes list with: "Pattern matching, `lastmod`, priorities and splitting are described in [Sitemap configuration](/configuration/seo#advanced-sitemap-options)." |
| V-C06-091 | 1276 | `sitemap` comment: "`true` adds `Sitemap: <baseUrl>/sitemap.xml`; a string adds that URL; unset adds nothing" | T | ❌ L | Incomplete: `true` also lists the news sitemap when `sitemap.news` is set and the sitemap is enabled (seo/robots.ts:184-196; core/build.ts:1744-1749) | old: "/** `true` adds `Sitemap: <baseUrl>/sitemap.xml`; a string adds that URL; unset adds nothing */" → new: "/** `true` adds `Sitemap: <baseUrl>/sitemap.xml`, and the news sitemap with sitemap.news; a string adds that URL only; unset adds nothing */" |
| V-C06-092 | 1284-1301 | `RobotsTxtConfig` example | V | ✂️ | Repeats configuration/seo.md:534-582 | delete the `**Example:**` label and code block; keep the paragraph at 1303 |
| V-C06-093 | 1303 | Global group after `userAgents`, Allow before Disallow, default allow-all, `sitemap: true` regardless of sitemap.enabled | B | ✅ | seo/robots.ts:78-97, 157-197; core/build.ts:1736-1749 | |
| V-C06-094 | 1307-1353 | "Complete configuration example" | V | ✂️ | Every block repeats configuration/seo.md (seo 115-140, sitemap 347-403, robots 534-582) | delete the section; the See also link to /configuration/seo covers it |
| V-C06-095 | 1359 | See also: "Incremental Static Generation - How SEO integrates with ISG caching" | R | ❌ L | docs-site/site/core-concepts/isg.md has no mention of SEO (grep). The cache fact is on configuration/seo.md:209 | delete the line |

### docs-site/site/advanced/seo-usage-scenarios.md

Covers: seo/auto-inject.ts, seo/generator.ts (generateSEO), seo/utils detection, core/templates.ts:308-318, examples/*/site/partials/head.eta

| ID | Line | Claim | Cat | Status | Evidence | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| V-C06-096 | 21 | Intro, "Choose the approach that best fits your project's requirements." | V | ✂️ | Filler | old: "This guide covers five different approaches to using Stati's SEO features, from zero-configuration automatic injection to full custom control. Choose the approach that best fits your project's requirements." → new: "Five ways to use Stati's SEO features, from automatic injection to writing every tag yourself." |
| V-C06-097 | 31-38 | Scenario 1 overview and "Features" list | V | ✂️ | Restates the "Best for" line; "Sitemap generation available (requires baseUrl configured)" also misleads: the sitemap needs `sitemap.enabled` (core/build.ts:1692) | delete line 31 and the `**Features:**` list (lines 33-38) |
| V-C06-098 | 31, 252, 647, 718-726 | Recommendations: Scenario 1 is "the recommended starting point for most projects"; Scenario 3 is "recommended ... for advanced SEO requirements"; table says Scenario 2 is best for "Most projects"; closing section recommends Scenario 3 "for most projects" | V | ⚠️ | Three different "most projects" answers on one page. Settle: maintainer picks one recommendation | suggested: delete line 31 (V-C06-097); table row `**Best For**`: old: "Most projects" → new: "Per-page SEO"; keep the closing section but cut its bullets (V-C06-118) |
| V-C06-099 | 44-100 | Minimal config and the injected tags for a simple layout; description only when set | X | ✅ | p1 `dist/my-page.html` has exactly these tags in this order; seo/generator.ts:96-156 | |
| V-C06-100 | 102-116 | "Optional: Enable sitemap" | V | ✂️ | Repeats configuration/seo.md:328-343 | old: the heading, sentence and code block → new: "To add a sitemap, see [Sitemap configuration](/configuration/seo#sitemap-configuration)." |
| V-C06-101 | 118-123, 240-246, 387-393, 501-507, 609-615 | Five "When to use" lists | V | ✂️ | Each restates its scenario's "Best for" line; the comparison table covers the choice | delete the five `### When to use` sections |
| V-C06-102 | 137-173 | Enhanced config (defaultLocale, defaultAuthor, handles, articles, sitemap, robots) | X | ✅ | types/config.ts:223-277; seo/defaults.ts | |
| V-C06-103 | 177-215 | Per-page example on a `/blog/` page; article type, published time and tags come from `seo.articles` | X | ✅ | seo/defaults.ts:96-105, 132-194 (unquoted `publishedAt` is read, core/utils/date.utils.ts:32-57) | |
| V-C06-104 | 217-238 | Sitemap control: `exclude: true`; noindex and 404 left out; archive example with priority/changefreq | V | ✅/✂️ | seo/sitemap.ts:153-159. The archive example repeats lines 207-209 and configuration/seo.md:422-431 | delete the second code block (lines 231-238, "Archive Page") and change "For pages you want to exclude or deprioritize:" → "To leave a page out of the sitemap:" |
| V-C06-105 | 256-258 | Detection; shell `<head>` lives in `site/partials/head.eta` in blog, docs and news starters; link | R | ✅ | examples/{blog,docs,news}/site/partials/head.eta exist; examples/blank/site/layout.eta; core-concepts/templates.md:201 | |
| V-C06-106 | 260-305 | Examples 1-2 (manual title; one `og:` tag skips all OG) | X | ✅ | seo/utils/escape-and-validation.utils.ts:394, 403 | |
| V-C06-107 | 307 | "**Important:** Open Graph tags are a **group**..." | V | ✂️ | Repeats the Tag groups table at 375-383 on the same page and configuration/seo.md:613-620 | delete line 307 |
| V-C06-108 | 309-373 | Examples 3-4 | X | ✅ | seo/utils/escape-and-validation.utils.ts:394-404 | |
| V-C06-109 | 375-385 | Tag groups table; don't add one `og:`/`twitter:` tag for site-wide values | B | ✅ | as above; seo/defaults.ts (site-wide defaults) | |
| V-C06-110 | 397-487 | Scenario 4 with `autoInject: false` and `stati.generateSEO([...])` | X | ✅ | core/templates.ts:308-318; seo/generator.ts:399-459; core/build.ts:931 | |
| V-C06-111 | 489-499 | "Available tag types" list | V | ✂️ | Repeats configuration/seo.md:91-103 | old: the list → new: "The tag types are listed in [Available tag types](/configuration/seo#available-tag-types)." |
| V-C06-112 | 511-607 | Scenario 5 manual layout; `<` escaping in JSON-LD | X | ✅ | Eta `<%= %>` escapes; `JSON.stringify(...).replace(/</g, '\\u003c')` keeps the JSON valid (same approach as seo/utils/escape-and-validation.utils.ts:162-172) | |
| V-C06-113 | 617-632 | Trade-offs | V | ✂️ | Advantages restate the scenario overview | delete the `**Advantages:**` list and keep the disadvantages under a plain `### Trade-offs` heading |
| V-C06-114 | 636-647 | Comparison table | V | ✅ | Descriptive; see V-C06-098 for the "Best For" row | |
| V-C06-115 | 651-686 | Checklist and validation tools | B | ✅ | Kept as the single place for test tools (configuration/seo.md Best practices removed, V-C06-044) | |
| V-C06-116 | 667, 680 | Twitter Card Validator links | R | ❌ L | `cards-dev.twitter.com/validator` redirects (307) to the X login page and no longer previews cards | line 667: old: " and [Twitter Card Validator](https://cards-dev.twitter.com/validator)" → new: "" ; line 680: delete the bullet |
| V-C06-117 | 690-712 | Common issues: OG skipped, sitemap production-only; structured data | B | ✅/✂️ | core/build.ts:1692; detection as above. The structured data "solution" says nothing specific | delete lines 710-712 (Structured data issue and its solution) |
| V-C06-118 | 716-726 | "Recommended approach" bullets ("Best of both worlds", "Safe", ...) | V | ✂️ | Marketing list; the last sentence carries the advice | replace lines 718-724 with: "For most projects, start with Scenario 1 and move to Scenario 3 when you need to override specific tags." and delete line 726 |
| V-C06-119 | 733-735 | "Questions?" footer | V | ✂️ | Next steps already link both pages | delete lines 733-735 |

### Gaps

- `api/seo.md` documents no `NewsSitemapConfig` or `NewsSitemapGenerationResult` type (exported, src/index.ts:70-71); fix in V-C06-089. `generateNewsSitemapXml(entries, publication)` gets one line (api/seo.md:222), which is enough.
- `api/seo.md` leaves out three exported helpers: `normalizeUrlPath(path)`, `resolveAbsoluteUrl(url, baseUrl)` and `isValidUrl(url)` (src/index.ts:149-151; seo/utils/url.utils.ts:19-78). Either add short entries under "Utility functions" or leave them out on purpose; `api/reference.md` doesn't list them either.
- Config load also rejects unknown keys in `seo.twitter` and `seo.articles` (seo/defaults.ts:382-390, 421, 436). Suggested addition to api/seo.md:914: old: "and stops with an error when one has the wrong type, such as" → new: "and stops with an error when one has the wrong type or an unknown key, such as".
- `robots.txt` under a base path: the build logs that crawlers read it only at the host root (core/build.ts:1757-1762). configuration/seo.md doesn't mention it; add one line under "robots.txt configuration": "For a site served from a subfolder, see [robots.txt](/advanced/deploying-to-a-subfolder#robotstxt)."
- `seo.defaultAuthor.email` / `seo.author.email` is never printed (V-C06-009).

### Terminology

- "frontmatter" and "front matter" both used in all three pages: configuration/seo.md 213, 215, 420, 716 ("frontmatter") vs 146, 179, 185, 204 ("front matter"); api/seo.md 352, 951 vs 914, 933, 993; seo-usage-scenarios.md uses "frontmatter" (100, 133, 175, 644, 712) and "front matter" (177, 336, 373, 444). Source comments use "front matter".
- "auto-injection", "automatic injection", "automatic SEO injection" and "Auto-Injection" all name the same thing.
- "Twitter Card(s)" vs "Twitter/X": handles are "Twitter/X handle" in types, "Twitter handles" in docs; fine, but pick one.
- Heading "Hybrid mode" vs "Hybrid Mode" (scenarios 250 vs 718).

### Cross-cluster

- `packages/core/src/types/sitemap.ts:41` JSDoc says `defaultChangeFreq` defaults to `'monthly'`; the code writes no `<changefreq>` when unset (seo/sitemap.ts:242-244). Source comment, shown in editors.
- `packages/core/src/types/config.ts:497` JSDoc says robots `sitemap` defaults to "true if sitemap enabled"; it defaults to nothing (seo/robots.ts:180). Source comment.
- `docs-site/site/core-concepts/isg.md`: no SEO content, though api/seo.md:1359 links there for it (V-C06-095).

### Phase 5 log

- V-C06-001: applied
- V-C06-002: applied
- V-C06-009: applied per D15: `email` dropped from defaultAuthor examples (configuration/seo.md, seo-usage-scenarios.md Scenarios 2 and 4; the api/seo.md examples that held it were deleted under V-C06-081/094); api/seo.md `AuthorConfig.email` comment now says "accepted but not printed in any tag". Re-checked: no read of `email` in packages/core/src (grep; only types/content.ts:347). Rebuilt p1 with the edited config block: author, og:locale, article:author, twitter:creator printed, no config error.
- V-C06-017: applied (heading also "Front matter SEO fields"; no inbound links to `#frontmatter-seo-fields` or `#basic-seo-fields`)
- V-C06-019: applied; re-checked against seo/utils/escape-and-validation.utils.ts:36-37, seo/generator.ts:232-240, seo/defaults.ts:144-151 and the p1 build output
- V-C06-034: applied, with one added fact: an invalid front matter `changefreq` is ignored and falls back to `defaultChangeFreq` (seo/sitemap.ts:239-244)
- V-C06-042: applied (kept `## SEO tag types` / `### Tag type groups`, linked from configuration/seo.md:211)
- V-C06-044: applied (whole Best practices section removed; done with a small node splice rather than the Edit tool, result checked in git diff). 1200 x 630 stays on api/seo.md `OpenGraphImage`.
- V-C06-045: applied (removed with V-C06-044)
- V-C06-048: applied; "tags are still generated with the values you gave" moved into the validation paragraph
- V-C06-050: applied; re-checked against seo/generator.ts:45-66 and seo/utils/escape-and-validation.utils.ts:289-361; link `/api/seo#seovalidationresult` matches slugify (core/utils/slugify.utils.ts)
- V-C06-051: applied
- V-C06-053: applied
- V-C06-056: applied (line 53 cut)
- V-C06-057: left (D16: generatedImage/deferGeneratedImage stay undocumented)
- V-C06-059: applied
- V-C06-060: applied (three callouts removed; config page states production-only at the sitemap, news and robots sections)
- V-C06-061: applied; re-checked against seo/sitemap.ts:57-78, 371-376
- V-C06-069: applied; re-checked against seo/sitemap.ts:201-206
- V-C06-073: applied; re-checked against seo/utils/escape-and-validation.utils.ts:36-37 and `escapeHtml(undefined) === ''` in node
- V-C06-081: applied
- V-C06-089: applied (`news` field, `NewsSitemapConfig` block, one line on `NewsSitemapGenerationResult`); re-checked against types/sitemap.ts:83, 107-121, 141-150 and seo/news-sitemap.ts:141-150
- V-C06-090: applied (notes replaced by a link; configuration/seo.md states every fact: baseUrl 337, transformEntry null and first-match rules in the example comments, patterns 405-408, lastmod/decimals/split 416, per-page priority 426)
- V-C06-091: applied; re-checked against seo/robots.ts:180-197 and core/build.ts:1744-1749
- V-C06-092: applied
- V-C06-094: applied (the `defaultLocale: 'en-US'` → `en_US` fact is on configuration/seo.md "Locale")
- V-C06-095: applied; re-checked: core-concepts/isg.md has no SEO content
- V-C06-096: applied
- V-C06-097: applied
- V-C06-098: applied per D14: line 31 deleted; Scenario 3 "Best for" now "Move here from Scenario 1 when you need per-page control"; table row Best For: "SEO values in front matter" (2) / "Per-page control" (3); Recommended approach reduced to "Start with Scenario 1 (Automatic), and move to Scenario 3 (Hybrid) when you need per-page control."
- V-C06-100: applied
- V-C06-101: applied (all five)
- V-C06-104: applied
- V-C06-107: applied
- V-C06-111: applied (link to `/configuration/seo#available-tag-types`, heading still there)
- V-C06-113: applied
- V-C06-116: applied (both links removed, nothing put in their place); re-checked: the URL answers 307 to the X login page
- V-C06-117: applied
- V-C06-118: applied
- V-C06-119: applied
- Gap, unknown keys: applied, one sentence at api/seo.md under `SEOConfig`; re-checked against seo/defaults.ts:382-390, 421, 436
- Gap, robots.txt under a base path: applied, configuration/seo.md robots section links `/advanced/deploying-to-a-subfolder#robots-txt` (heading `## robots.txt` at deploying-to-a-subfolder.md:89; slug from slugify.utils.ts); evidence core/build.ts:1757-1762
- Gap, URL helpers: applied as `#### URL helpers` in api/seo.md; each signature and behavior from seo/utils/url.utils.ts:19-78, checked in node (`normalizeUrlPath('about')`, `resolveAbsoluteUrl('/about','https://example.com/docs')`, protocol-relative with an `http://` base, `data:` URL, `isValidUrl('ftp://a.com')`)
- Terminology: "frontmatter" → "front matter" in prose of all three files (configuration/seo.md 213, 215, 409, 697 old numbering; api/seo.md 79, 951; scenarios 100, 133, 176, 642). Left in code comments (api/seo.md:341, 756). `html` fences around Eta code left where the lines were not otherwise touched.
- D7: no change needed; the scenario templates print absolute URLs from `stati.site.baseUrl`, which already holds the base path.
- Cross-cluster items raised against C06 files by other agents: none (C05 V-C05-052/055 and C07 V-C07-034 link to `#site-wide-defaults` and `#sitemap-configuration`, both kept).
- Inbound links: no file links to an anchor removed here (grep of docs-site/site, llms.txt, READMEs).

Applied 39 (10 ❌, 27 ✂️, 2 ⚠️) plus 3 gaps; rejected 0; left 1 (V-C06-057, D16).

## C07 findings

Summary: 129 claims; ✅ 95, ❌ 17 (H 0, M 3, L 14), ⚠️ 3, ✂️ 14.

Test project: `scratchpad/work/C07/proj` (junctions to `packages/core` and `packages/images`), built with the local CLI in production mode: plain, `--include-drafts`, `C07_IMAGES=full` (responsive + og), `C07_MODE=invalid` and `C07_MODE=nofeeds`. No dev server was started.

### docs-site/site/configuration/rss.md

Covers: `packages/core/src/rss/generator.ts`, `rss/validation.ts`, `rss/utils/pattern-matching.utils.ts`, `types/rss.ts`, `core/build.ts:1756-1806`, `core/content.ts:30-79`.

| ID | Line | Claim | Cat | Status | Evidence | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| V-C07-001 | 17-20 | Production-only; regenerated on every production build; several feeds; mappings and filters | B | ✅ | build.ts:1757 (`currentEnv === 'production'`), :1783-1791 (no cache); generator.ts:394-412 | |
| V-C07-002 | 11-21 | Intro sentence plus Overview list | V | ✂️ | Bullets restate the section headings below; "Highly customizable", "Works out of the box" carry no information; "Production-only" is repeated at 516-528 and 536 | old: "Stati supports automatic RSS feed generation for your content. RSS feeds allow visitors to subscribe to your content and receive updates in their feed readers." plus the whole `## Overview` section (lines 13-21) → new: "Stati writes RSS 2.0 feeds during production builds (`stati build`), never in `stati dev`. A site can have several feeds, each with its own content selection." |
| V-C07-003 | 27-46 | Minimal config with `filename`, `title`, `description` | X | ✅ | types/rss.ts:12-29; built in test project (feed.xml written) | |
| V-C07-004 | 48, 70, 84, 368 | `excludePatterns: ['**/index.md']` leaves index (listing) pages out | X | ❌ M | pattern-matching.utils.ts:84-108 + glob-patterns.utils.ts:27-107: `**/index.md` matches every `index.md`, including posts written as `blog/post-a/index.md` (the folder layout images.md:30 recommends for co-located images). Test: blog.xml with `['**/blog/**']` + `['**/index.md']` kept only post-b, dropping `blog/post-a/index.md` | line 48 old: "Use `excludePatterns: ['**/index.md']` to leave index pages out." → new: "To leave a listing page out, exclude its file, such as `excludePatterns: ['**/blog/index.md']`. A pattern like `'**/index.md'` also drops posts written as `post-name/index.md`." Line 70 old: "add `excludePatterns: ['**/index.md']` to leave the listing page out" → new: "add `excludePatterns: ['**/blog/index.md']` to leave the listing page out". Line 84 old: "excludePatterns: ['**/draft-*', '**/index.md']," → new: "excludePatterns: ['**/draft-*', '**/blog/index.md'],". Line 368 is in the section V-C07-021 cuts; if kept: `['**/blog/index.md']`. Same in api/rss.md:464 (V-C07-055). |
| V-C07-005 | 56-68 | `contentPatterns: ['**/blog/**']` keeps only pages in a blog folder | X | ✅ | generator.ts:51-71; test blog/linked feeds | |
| V-C07-006 | 70 | Patterns are tested against the absolute source path; `'blog/**'` and `'site/blog/**'` match nothing; patterns without `*`/`?` must equal the path or be a prefix; generated pages, later pagination pages and the 404 page are never in a feed | B | ✅ | content.ts:40-45,74 (`absolute: true`, `sourcePath: file`); generator.ts:62-63; pattern-matching.utils.ts:28-58 (prefix only at a `/` boundary); test rel.xml: 0 items; 404 absent from feed.xml | |
| V-C07-007 | 83 | Exclude example described as 'All content except drafts' | X | ❌ L | `**/draft-*` matches file names starting `draft-` (glob-patterns.utils.ts:51-53), not `draft: true` pages; those are skipped at load unless `--include-drafts` (content.ts:61-64), and then they do appear in feeds (test: 7 items incl. "Draft") | old: "description: 'All content except drafts'," → new: "description: 'All content except draft-* files'," |
| V-C07-008 | 94-106 | `filter(page)` for fine-grained control | X | ✅ | generator.ts:65-68; types/rss.ts:108 | |
| V-C07-009 | 112-137 | Several feeds, each with own patterns and `maxItems` | X | ✅ | generator.ts:406-409; test built 5 feeds | |
| V-C07-010 | 143-170 | Feed metadata: `language`, `copyright`, `category`, `ttl` (minutes), `managingEditor`, `webMaster`, `image` | G | ✅ | types/rss.ts:38-88; generator.ts:228-275 | |
| V-C07-011 | 178-185 | `sortBy` values `date-desc`, `date-asc`, `title-asc`, `title-desc`, `custom` | G | ✅ | types/rss.ts:124; generator.ts:88-119; validation.ts:68-71 | |
| V-C07-012 | 189-202 | `sortBy: 'custom'` with `sortFn(a, b)` | X | ✅ | generator.ts:92-94; validation.ts:64-66 | |
| V-C07-013 | 208-215 | `maxItems` limits the feed | G | ✅ | generator.ts:202-204 | |
| V-C07-014 | 223-228 | Default mapping: title, description, first valid of `publishedAt`/`published`/`date`/`createdAt`, tags → categories | B | ❌ L | All four correct (generator.ts:284, 302-307, 314-316, 329-334; date.utils.ts:10). Incomplete: `author` front matter → `<author>` is also a default (generator.ts:323; test feed.xml shows `<author>`) | after "- `tags` → RSS item categories" add: "- `author` → RSS item author" |
| V-C07-015 | 234-247 | `itemMapping` string values name other front matter fields | X | ❌ L | generator.ts:157-169 ✅; the `pubDate` comment says it replaces `'publishedAt'`, but it replaces the whole date fallback chain (generator.ts:314-316) | old: "pubDate: 'publishDate',   // Use 'publishDate' instead of 'publishedAt'" → new: "pubDate: 'publishDate',   // Use 'publishDate' instead of the default date fields" |
| V-C07-016 | 253-278 | Mapping functions, including `link: (page, config) => ...` | X | ❌ M | `title`/`description`/`author` functions ✅ (generator.ts:144-155). The `link` example builds `${baseUrl}/posts${page.url}`: page URLs already start with the section (`/blog/post-b`), so items link to `https://example.com/posts/blog/post-b?utm_source=rss`, a page that doesn't exist (test linked.xml). The `guid` defaults to the link (generator.ts:343-349), so the tracking URL also becomes every item's `guid` | old: "`${config.site.baseUrl}/posts${page.url}?utm_source=rss`," → new: "`${config.site.baseUrl}${page.url}?utm_source=rss`," and add after the code block: "An item's `guid` defaults to its link, so a custom `link` changes the `guid` too. Set `itemMapping.guid` to keep it stable." |
| V-C07-017 | 282-295 | `includeContent: true` puts the Markdown source (not HTML) in a CDATA `<description>` | B | ✅ | generator.ts:299-300; content.ts:76 (`content: markdown`); test blog.xml | |
| V-C07-018 | 301-313 | `namespaces` adds `xmlns:` attributes | G | ✅ | generator.ts:216-221; test blog.xml | |
| V-C07-019 | 319-331 | `customItemElements`: values stringified and escaped, `undefined`/`null` skipped, declare prefixes in `namespaces` | X | ❌ L | Behavior ✅ (generator.ts:362-369; test `<custom:x>&lt;a&amp;b&gt;</custom:x>`, null skipped). Example reads `page.frontMatter.readTime`, which pages don't have, so it prints "undefined min"; Stati provides `page.readingTime` (types/content.ts:392-397) | old: "'custom:readTime': `${page.frontMatter.readTime} min`," → new: "'custom:readTime': `${page.readingTime} min`," |
| V-C07-020 | 337-353 | `enclosure(page)` returns `{ url, length, type }` or `undefined` | X | ✅ | types/rss.ts:209-215; generator.ts:352-359 | |
| V-C07-021 | 355-443 | "Real-world examples" (blog, news, podcast) | V | ✂️ | Blog feed repeats Filter by directory + Feed metadata and sets two defaults (`category: 'tags'`, `includeContent: false`); news repeats Multiple feeds + Custom filter; podcast repeats Enclosures | delete the whole `## Real-world examples` section (lines 355-443) |
| V-C07-022 | 431-435 | Podcast `enclosure` returns an object for every page | X | ❌ L | generator.ts:352-358 writes `url="undefined" length="NaN"` for a page without `audioUrl`; the earlier example (342-351) guards it | moot if V-C07-021 is applied; otherwise use the guarded function from lines 342-351 |
| V-C07-023 | 447 | Any validation error: errors logged, no feeds written, build continues; warnings logged, feeds written | B | ✅ | build.ts:1765-1777, 1800-1805; test `C07_MODE=invalid`: no .xml written, "Site built successfully" | |
| V-C07-024 | 449-472 | "Automatic validation" heading and commented config block | V | ✂️ | Repeats line 447; the comments repeat the rules list at 494-512, and "Image dimensions are within limits" is only a warning | delete lines 449-472 (`### Automatic validation` through the closing code fence) |
| V-C07-025 | 474-492 | "Manual validation" with `validateRSSConfig` | V | ✂️ | API ✅ (validation.ts:126; index.ts:160-165). Near-verbatim copy of api/rss.md:261-275 and :336-345 | replace lines 474-492 with: "To validate a config in your own code, use [`validateRSSConfig()`](/api/rss#validaterssconfig)." (check the anchor id in the build) |
| V-C07-026 | 496-504 | Error rules: required fields, TTL, `maxItems`, `sortBy`, `sortFn`, duplicate filenames, image fields | G | ❌ L | All listed ✅ (validation.ts:34-46, 49-55, 57-61, 64-71, 74-83, 150-156). Missing: an empty `feeds` array is an error (validation.ts:138-141; test `C07_MODE=nofeeds`) | after "- Missing image fields when image is specified" add: "- An empty `feeds` array" |
| V-C07-027 | 506-512 | Warning rules: email format, image above 144×400, non-`.xml` filename, TTL 0, empty `contentPatterns` | G | ✅ | validation.ts:36-37, 52-53, 84-93, 97-107, 110-112. Note: an empty `contentPatterns` actually includes every page (see Gaps) | |
| V-C07-028 | 514 | "For more details on validation, see the RSS API" | R | ❌ L | api/rss.md#rssvalidationresult only shows the result type; this page has the rules | delete the sentence (covered by the new link in V-C07-025) |
| V-C07-029 | 516-528 | "Development vs production" section | V | ✂️ | Fact ✅ (build.ts:1757) but stated in the Overview (17), again here with a bash block, and in Troubleshooting 536 | delete lines 516-528; the new intro from V-C07-002 states it once |
| V-C07-030 | 534-541 | "Feed not generated" checklist; `maxItems: 0` fails validation | B | ✅ | validation.ts:57-61; build.ts:1767-1772 | |
| V-C07-031 | 545-549 | "Empty feed" checklist, leading `**/` | B | ✅ | as V-C07-006 | |
| V-C07-032 | 553-557 | Stati escapes XML characters; custom element names must be valid | B | ✅ | generator.ts:223-369 (`escapeHtml` on every value); :366 element names are not checked. Exception: `includeContent` CDATA (see Gaps) | |
| V-C07-033 | 559-568 | "Best practices" list | V | ✂️ | Items 1-7 are generic advice or repeat the page; item 8 is the only place saying feeds are not linked from pages (no `application/rss+xml` anywhere in packages/core/src) | delete lines 559-568; add at the end of "Basic configuration": "Stati does not link the feed from your pages. Add `<link rel=\"alternate\" type=\"application/rss+xml\" title=\"My Blog Posts\" href=\"<%= stati.url('/feed.xml') %>\">` to the `<head>` of your layout." |
| V-C07-034 | 572-573 | Next steps: SEO configuration and Sitemap generation | R | ❌ L | Both link `/configuration/seo`; the sitemap section is `## Sitemap configuration` (configuration/seo.md:322) | old: "- Configure [Sitemap generation](/configuration/seo)" → new: "- Configure [Sitemap generation](/configuration/seo#sitemap-configuration)" |

### docs-site/site/api/rss.md

Covers: `packages/core/src/types/rss.ts`, `rss/validation.ts`, `rss/generator.ts`, `src/index.ts:77-78,158-165`.

Overlap with configuration/rss.md: Basic feed (423-440 = config 27-46), Multiple feeds (444-470 ≈ config 112-137), Custom field mapping (474-501 ≈ config 253-278), validation example (261-275 ≈ 336-345 ≈ config 478-492, three copies), sort options (102-108 ≈ config 183), pattern note (96 ≈ config 70). Recommendation: the config page is the guide with examples; this page keeps types and signatures only.

| ID | Line | Claim | Cat | Status | Evidence | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| V-C07-035 | 11 | "This document provides a reference for RSS feed generation in Stati." | V | ✂️ | Restates title and description | delete line 11 |
| V-C07-036 | 19-29 | `RSSConfig { enabled?: boolean; feeds: RSSFeedConfig[] }`, `enabled` default false, production only | T | ✅ | types/rss.ts:235-265; build.ts:1757; exported index.ts:78 | |
| V-C07-037 | 37-72 | `RSSFeedConfig` shape (all fields and types) | T | ✅ | types/rss.ts:12-229, field by field | |
| V-C07-038 | 76-89 | Required/optional metadata, `link` defaults to `site.baseUrl`, email format, `ttl` minutes | G | ✅ | types/rss.ts:31-72; generator.ts:207 | |
| V-C07-039 | 91-98 | Content selection list; patterns match absolute `sourcePath` | B | ❌ L | Facts ✅ (as V-C07-006). The paragraph at 96 sits between list items, so `filter` and `maxItems` start a second list after a note about patterns | move line 96 ("Both are matched against ... matches nothing.") below line 98, separated by a blank line |
| V-C07-040 | 102-108 | `sortBy` values and `sortFn` | G | ✅ | types/rss.ts:124-132 | |
| V-C07-041 | 112-118 | itemMapping, enclosure, namespaces, customItemElements one-liners | G | ✅ | types/rss.ts:138-228 | |
| V-C07-042 | 126, 175, 201 | Three notes: type "defined inline ... but documented here for clarity and reference" | V | ✂️ | `RSSItemMapping`, `RSSImageConfig`, `RSSEnclosure` are not exported (index.ts:78 exports only `RSSConfig`, `RSSFeedConfig`, `RSSGenerationResult`); "for clarity and reference" is filler, and readers need to know they can't import the names | each: old: "> **Note:** This type is defined inline within `RSSFeedConfig.itemMapping` but documented here for clarity and reference." → new: "> **Note:** Not exported: this is the inline type of `RSSFeedConfig.itemMapping`." (same pattern for `.image` and the return type of `.enclosure`) |
| V-C07-043 | 129-138 | `RSSItemMapping` shape | T | ✅ | types/rss.ts:138-203 | |
| V-C07-044 | 143-163 | Defaults: title `'title'`, description `'description'`, pubDate date chain, author `'author'`, category `'tags'` | G | ✅ | generator.ts:284, 302-307, 314-316, 323, 329-334; date.utils.ts:10 | |
| V-C07-045 | 151, 165 | `link` default "uses page URL"; `guid` default "uses page URL" | G | ❌ L | link = `site.baseUrl` (trailing slash removed) + page URL (generator.ts:178-182); guid = the item's link, including a custom `link`, always with `isPermaLink="true"` (generator.ts:343-349; test linked.xml) | old: "- `link` - Custom link generator (default: uses page URL)" → new: "- `link` - Custom link generator (default: `site.baseUrl` plus the page URL)"; old: "- `guid` - Custom GUID generator (default: uses page URL)" → new: "- `guid` - Custom GUID generator (default: the item's link, written with `isPermaLink=\"true\"`)" |
| V-C07-046 | 167 | `includeContent` puts Markdown source in CDATA | B | ✅ | generator.ts:299-300 | |
| V-C07-047 | 177-193 | `RSSImageConfig` shape; `width` "max 144", `height` "max 400" | T | ❌ L | Shape ✅ (types/rss.ts:77-88). Not maximums: larger values pass, with a warning (validation.ts:84-93), and are written as given (generator.ts:268-273) | old: "- `width` - Image width in pixels (max 144)" → new: "- `width` - Image width in pixels (RSS recommends at most 144; a larger value logs a warning)"; old: "- `height` - Image height in pixels (max 400)" → new: "- `height` - Image height in pixels (RSS recommends at most 400; a larger value logs a warning)" |
| V-C07-048 | 203-215 | `RSSEnclosure { url, length, type }` | T | ✅ | types/rss.ts:209-215 | |
| V-C07-049 | 223-237 | `RSSGenerationResult` fields | T | ✅ | types/rss.ts:271-280; generator.ts:379-384 | |
| V-C07-050 | 245-257 | `RSSValidationResult { valid, errors, warnings }`, exported | T | ✅ | validation.ts:11-18; index.ts:159 | |
| V-C07-051 | 259-275 | Example under RSSValidationResult | V | ✂️ | Same code as 336-345 on this page and configuration/rss.md:478-492 | delete lines 259-275 (`**Example:**` and its code block) |
| V-C07-052 | 279-314 | `validateRSSFeedConfig(feedConfig, feedIndex?)`, default index 0 | A | ✅ | validation.ts:26-29; index.ts:164 | |
| V-C07-053 | 318-345 | `validateRSSConfig(rssConfig: RSSConfig \| undefined)`, aggregated errors and warnings | A | ✅ | validation.ts:126-165 (also returns `valid: true` with a warning when `rss` is undefined or disabled, see Gaps) | |
| V-C07-054 | 349-417 | `generateRSSFeed(pages, config, feedConfig, logger?)`, `generateRSSFeeds(pages, config, logger?)` | A | ✅ | generator.ts:192-197, 394-412; index.ts:161-162. `Logger` type is exported from `@stati/core/types` (types/index.ts:100), not the root | |
| V-C07-055 | 419-501 | "Usage examples": basic, multiple feeds, custom field mapping | V | ✂️ | Duplicates configuration/rss.md (27-46, 112-137, 253-278); the See also section already links it. Multiple feeds also repeats `['**/index.md']` (V-C07-004) | delete lines 419-501 (`## Usage examples` through the last code block) |
| V-C07-056 | 503-507 | See also links | R | ✅ | `/configuration/rss`, `/api/seo`, `/configuration/file` exist | |

### docs-site/site/configuration/search.md

Covers: `packages/core/src/search/*`, `types/search.ts`, `core/build.ts:522-584, 651-676, 775-798, 949-956, 1658-1660`, `core/utils/glob-patterns.utils.ts`.

| ID | Line | Claim | Cat | Status | Evidence | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| V-C07-057 | 11 | JSON search index generated at build time | B | ✅ | build.ts:531-584 | |
| V-C07-058 | 13-21 | Overview list (build and dev, section-level, hashed names, meta tag, configurable) | V | ✂️ | Facts ✅ (build.ts:539 has no environment check; :562-563 dev name). Every bullet but "in both `stati build` and `stati dev`" repeats a later section | delete lines 13-21; old line 11: "Stati can generate a JSON search index at build time, enabling client-side search functionality for your static site." → new: "Stati can generate a JSON search index at build time, in both `stati build` and `stati dev`, for client-side search on your static site." |
| V-C07-059 | 27-38 | `search: { enabled: true }` writes `search-index-[hash].json` with every page but the home page | X | ✅ | generator.ts:316-320, 479-490; test: `search-index-06b492b1.json`, no `/` document | |
| V-C07-060 | 42-61 | Full configuration example | V | ✂️ | Values ✅ (constants.ts:13-30) but every option and default is in the table right below | delete lines 42-61 (`### Full configuration example` and its code block) |
| V-C07-061 | 65-75 | Option table: types and defaults of all nine options | G | ✅ | types/search.ts:27-54; constants.ts:13-30; build.ts:539 (`enabled !== true` → off) | |
| V-C07-062 | 83-95 | `exclude` globs match the whole page URL; `/private/**` doesn't match `/private`; no wildcard = exact URL | G | ✅ | generator.ts:323-328 (`matchesGlob(page.url, …)`); glob-patterns.utils.ts:31,105 (`^…$`); test: `/private` indexed, `/private/secret` not | |
| V-C07-063 | 97-99 | `[param].md` pages out unless the template sets `search: true`; later pagination pages always out | B | ✅ | generator.ts:341-347; build.ts:551; anchor `core-concepts/collections.md:264` exists | |
| V-C07-064 | 101-103 | 404 page out unless `search: true`; `exclude` still applies | B | ✅ | generator.ts:310-313, 322-328 | |
| V-C07-065 | 105-114 | "Include home page" subsection | V | ✂️ | Fact ✅ (generator.ts:316-320) but already stated at line 38 and in the table row `includeHomePage` | delete lines 105-114 |
| V-C07-066 | 118-127 | `headingLevels`; sections come from `markdown.toc` anchors; `toc: false` leaves only page-level entries | G | ✅ | generator.ts:195-202, 217-236; build.ts:547, 555 | |
| V-C07-067 | 131-165 | Index object `{ version, generatedAt, documentCount, documents }`; one page-level entry (`level: 1`, empty anchor, `#top`) plus one per section with text | B | ✅ | constants.ts:10; generator.ts:244-286, 395-400; test index (empty `### Empty` section skipped) | |
| V-C07-068 | 169-179 | Document fields: id, url (site-root relative), anchor, title (slug fallback), heading, level, content (Markdown stripped), breadcrumb (URL folders + title + heading), tags (optional) | T | ✅ | types/search.ts:75-94; generator.ts:57-84, 244-286, 381; build.ts:556 (`page.url`, no base path); test output | |
| V-C07-069 | 183-191 | `stati.assets.searchIndexPath` in templates | X | ❌ L | Value ✅ (build.ts:775-784, `/name.json` without base path, so `stati.url()` is right). The code fence is labelled `html` but holds Eta tags (images.md uses ```` ```eta ```` for the same) | old: "```html" (line 185) → new: "```eta" |
| V-C07-070 | 195-199 | Auto-injected `<meta name="stati:search-index" content="…">` | B | ✅ | auto-inject.ts:24-40; build.ts:949-956; test HTML | |
| V-C07-071 | 201 | With a base path the tag holds `/docs/search-index-….json`, the file stays at the root of `dist/`, entry `url`s stay site-root relative | B | ✅ | build.ts:955 (`${basePath}/${searchIndexFilename}`); generator.ts:452-453 (written in `outDir`); build.ts:556 | |
| V-C07-072 | 205-214 | Client code reads the meta tag and fetches the index | X | ✅ | matches auto-inject.ts:36 | |
| V-C07-073 | 218-245 | Client search example over `index.documents` | X | ✅ | SearchIndex shape (types/search.ts:110-119) | |
| V-C07-074 | 249-259 | Production hash from index content; old index files deleted by `stati build`; dev name fixed; name in every page's cache hash; `hashFilename: false` renders only changed pages; index built after `beforeAll`, before rendering | B | ✅ | build.ts:562-567, 651-676, 789-791, 1637, 1658-1660; generator.ts:503-527 | |
| V-C07-075 | 263-268 | `hashFilename: false` writes `search-index.json` | G | ✅ | generator.ts:488-489 | |
| V-C07-076 | 270-310 | "Performance considerations" (content length, heading levels, excluding content) | V | ✂️ | Three code blocks repeat the option table and the `exclude`/`headingLevels` sections above | replace lines 270-310 with: "## Index size\n\nLower `maxContentLength` and `maxPreviewLength`, fewer `headingLevels` and more `exclude` patterns give a smaller index with less context per result." |
| V-C07-077 | 312-314 | Drafts never indexed, also with `stati build --include-drafts` | B | ✅ | generator.ts:301-303; test with `--include-drafts`: no "Draft" document | |

### docs-site/site/configuration/images.md

Covers: `packages/core/src/images/*`, `types/images.ts`, `core/templates.ts:85-100, 322-353`, `core/build.ts:1304-1311, 1592-1632, 1672-1686`, `seo/generator.ts:196-219`, `packages/images/src/*`, `packages/images/templates/og.eta`.

| ID | Line | Claim | Cat | Status | Evidence | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| V-C07-078 | 11 | Markdown images get width, height and lazy loading with no configuration; `@stati/images` adds responsive images and OG cards | B | ✅ | types/images.ts:90-114; runtime.ts:553-568 | |
| V-C07-079 | 13-18 | Comparison table | B | ❌ L | Built-in column ✅. "Images next to a page: Same, plus responsive variants" is wrong: with `responsive` on, a co-located image is encoded to variants and the plain copy is only made if encoding fails (runtime.ts:333-361; copy only as `fallbackCopy`). Test: the second build logged "Removed 1 unused generated image" (the copy) | old: "\| Images next to a page \| Copied to the output \| Same, plus responsive variants \|" → new: "\| Images next to a page \| Copied to the output \| Responsive variants instead of the copy \|" |
| V-C07-080 | 22-26 | Output `<img src alt width height loading="lazy" decoding="async">` | X | ✅ | markup.ts:51-66; test HTML | |
| V-C07-081 | 28 | Reads PNG, JPEG, GIF, WebP, AVIF; swaps width/height for EXIF-rotated photos | B | ✅ | resolve.ts:9; image-probe.utils.ts:3, 119-135 (JPEG orientation 5-8) | |
| V-C07-082 | 30 | `/` paths from `public/`; relative paths next to the page; co-located copies at `/_img/` with a content-based name | B | ✅ | resolve.ts:69-80; plan.ts:113-127; test `/_img/local-c9c1090f.png` | |
| V-C07-083 | 31 | First image in the first few blocks is eager with `fetchpriority="high"`; `eagerFirst: false` turns it off | G | ✅ | markdown-rule.ts:13, 61-73; runtime.ts:264; markup.ts:63; test | |
| V-C07-084 | 32 | Remote, `data:`, SVG and other formats left as authored; `?raw` opts out; raw `<img>` untouched | B | ✅ | resolve.ts:53-67; markdown-rule.ts:26-47 (image token rule only); test `?raw` image has no width | |
| V-C07-085 | 33 | Missing file: warning, written as authored, page rebuilds once the file appears | B | ✅ | runtime.ts:306-315 (added to `assetDeps` first); isg/builder.ts:153-160 (missing files hash to a sentinel) | |
| V-C07-086 | 35-44 | Starters include `img { max-width: 100%; height: auto; }` | B | ✅ | examples/blank/public/styles.css:111-113, blog:125-129, docs:156-161, news:118-127 | |
| V-C07-087 | 48-55 | `images: false`: Markdown images as authored, co-located images not copied | G | ✅ | config.ts:238-241; runtime.ts:557-559; markdown-rule.ts:33-35 | |
| V-C07-088 | 59-72 | `stati.image(src, { alt, priority, sizes, class, title })`; warns without `alt`; same path rules; empty `src` returns `''` | A | ✅ | runtime.ts:92-103, 272-291; templates.ts:85-92, 325-328 | |
| V-C07-089 | 76-89 | `npm install --save-dev @stati/images`, `images.responsive: true` | X | ✅ | provider.ts:26-33; config.ts:245-246; test build | |
| V-C07-090 | 91-100 | `<picture>` with AVIF and WebP `<source>`s plus fallback `<img srcset sizes>` (largest width as `src`) | X | ✅ | markup.ts:76-96; plan.ts:181-213; test HTML | |
| V-C07-091 | 102-111 | Object form `{ widths, formats, quality, sizes }` | G | ✅ | config.ts:84-131 | |
| V-C07-092 | 113 | Widths above the image skipped; own width added when below the largest; never enlarged | B | ✅ | plan.ts:33-43; variants.ts:23-24; test (1200 px image → 480, 960, 1200) | |
| V-C07-093 | 114 | Fallback keeps the format, GIF → PNG; PNG lossless unless `quality.png` | B | ✅ | plan.ts:49-51; variants.ts:38-44 | |
| V-C07-094 | 115 | `sizes` default `100vw` | G | ✅ | constants.ts:179; config.ts:257 | |
| V-C07-095 | 116 | Animated GIF, WebP, PNG, AVIF keep the built-in behavior | B | ✅ | runtime.ts:341; image-probe.utils.ts:21, 76, 222, 251, 308 | |
| V-C07-096 | 118 | File names hash the image and options | B | ✅ | plan.ts:167-180 | |
| V-C07-097 | 124-133 | `images.og: true` adds `og:image`, `og:image:width`, `og:image:height`, `og:image:alt`, `twitter:image`; 1200×630 PNG under `/_img/og/`; production needs a public `site.baseUrl` | B | ❌ L | Size, path and base URL check ✅ (constants.ts:161, 185-188; runtime.ts:447-454, 168-184, 571-574). The tag list misses `twitter:image:alt`, written whenever the card has alt text (test: `dist/blog/post-a.html`) | old: "`og:image:alt` and `twitter:image` to each page" → new: "`og:image:alt`, `twitter:image` and `twitter:image:alt` to each page" |
| V-C07-098 | 135-150 | Front matter `seo.openGraph.image` is used as given; `false` gives no image | B | ✅ | og.ts:23-33; seo/generator.ts:196-219 | |
| V-C07-099 | 152-160 | 404 page gets no card; `exclude` takes URL globs | G | ✅ | og.ts:24-26, 32; config.ts:193-199 | |
| V-C07-100 | 164-166 | Built-in card shows site name, section, title, description, address; nearest `og.eta` wins; built-in at `node_modules/@stati/images/templates/og.eta` | B | ✅ | packages/images/templates/og.eta; packages/images/package.json `files`; runtime.ts:403-413 | |
| V-C07-101 | 168-173 | Example card template | X | ✅ | Inter 500 bundled (packages/images/src/og/defaults.ts:11-16); every multi-child element has `display:flex` | |
| V-C07-102 | 175 | Card templates get the layout's `stati` with empty `stati.content` and `stati.og = { width, height }`; `include`, `layout`, `helpers` work | B | ✅ | templates.ts:336-352; runtime.ts:73-87, 385-388 | |
| V-C07-103 | 177-181 | Satori subset; `/` image paths from `public/`, relative from the template's folder; `stati.image()` works and cards use the original file | B | ✅ | og.ts:91-170; runtime.ts:425-434, 845-847 | |
| V-C07-104 | 183 | Dev: failing card goes to the error overlay; production: page written without the image, error logged | B | ✅ | runtime.ts:414-423, 724-729, 751-757; build.ts:1624-1632 | |
| V-C07-105 | 187-199 | Bundled fonts and coverage; `images.og.fonts` paths relative to the project; TTF/OTF/WOFF, no WOFF2 | G | ✅ | defaults.ts:11-16; runtime.ts:193-210 (`process.cwd()`, `wOF2` check); packages/images/fonts/README.md:18-21 | |
| V-C07-106 | 203-209 | SEO injection and `stati.generateSEO()` add the tags; `stati.ogImage` has `url` (absolute), `path`, `width`, `height`, `alt` | A | ✅ | types/images.ts:190-199; templates.ts:308-315, 332-352, 373; seo/generator.ts:196-203 | |
| V-C07-107 | 213-218 | `images.dev: 'fast'` (default) skips responsive and OG in dev; `'full'` runs them; package must be installed either way | G | ✅ | runtime.ts:561-568; provider.ts:57-63 (`load: false` still checks); config.ts:278 | |
| V-C07-108 | 222-225 | Encoded once, reused via `.stati/images/manifest.json`; only pages showing a replaced image rebuild; cards redrawn on shown changes only; `stati build` deletes only generated, unused files; `public/_img/` warning; keep `dist/_img` and `.stati` on CI | B | ✅ | manifest.ts:1-40; runtime.ts:437-446, 588-592, 781-810, 886-896; build.ts:1672-1686 | |
| V-C07-109 | 229-245 | Option reference (13 rows: types and defaults) | G | ✅ | types/images.ts:22-114; config.ts:238-279; constants.ts:170-188 | |
| V-C07-110 | 249-251 | `images.responsive requires @stati/images`; same for `images.og` | B | ✅ | provider.ts:38-42 | |
| V-C07-111 | 253-255 | `@stati/images … is not compatible with @stati/core …` → update both | B | ✅ | provider.ts:81-88 | |
| V-C07-112 | 257-259 | `images.og needs site.baseUrl set to your site's public address` | B | ✅ | runtime.ts:180-182 | |
| V-C07-113 | 261-263 | `Could not load sharp for linux-x64` → reinstall so the lockfile lists `@img/sharp-*` | B | ✅ | packages/images/src/runtime.ts:26-37 (wrapped by provider.ts:74-78 as "Failed to load @stati/images: …") | |
| V-C07-114 | 265-267 | Failed encode: warning, original image, rebuilt next build | B | ✅ | runtime.ts:684-757 (`inputsHash: 'STALE'`) | |

No ✂️ items: the page is already tight.

### packages/images/README.md

Covers: `packages/images/src/*`, `packages/images/package.json`, `packages/core/src/images/provider.ts`.

| ID | Line | Claim | Cat | Status | Evidence | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| V-C07-115 | 3-8 | Core does sizes and lazy loading; package adds responsive images and OG cards with a built-in or `og.eta` card | B | ✅ | as V-C07-078, V-C07-100 | |
| V-C07-116 | 10 | sharp encodes; Satori lays out, sharp rasterizes, no headless browser; works on Netlify, Vercel, Cloudflare Pages and GitHub Actions without system packages | B | ⚠️ | First part ✅ (src/og/render.ts:38-62, package.json deps). The host list can't be verified from the repo; settled only by a build on each host | none proposed; keep or drop the host names at maintainer's choice |
| V-C07-117 | 16-26 | `npx create-stati my-site --images`; `npm install --save-dev @stati/images` | L | ✅ | packages/create-stati/src/index.ts:39-41 | |
| V-C07-118 | 30-43 | Config example; missing package stops the build | X | ✅ | provider.ts:57-60; build.ts:1304-1311 | |
| V-C07-119 | 45 | (F1) "Requires `@stati/core` 1.28 or later and Node.js 22.20 or later." | B | ❌ M | Core part ✅: the provider contract (`apiVersion: 1`, `renderOgImage`, `loadOgDefaults`) came with core 1.28.0 (core CHANGELOG.md:196-202, commit 9a95fc8) and core 2.8.0 still supports exactly `apiVersion` 1 (provider.ts:14, 81-88); @stati/images 1.1.0 returns `apiVersion: 1` (src/index.ts:39) and has no peer dependency (AGENTS.md:271). Node part ❌: `engines` is `^22.20.0 \|\| >=24` (packages/images/package.json, same in core), so Node 23 is excluded | old: "Requires `@stati/core` 1.28 or later and Node.js 22.20 or later." → new: "Requires `@stati/core` 1.28 or later and Node.js 22.20 or later on the 22.x line, or 24 and later." |
| V-C07-120 | 51-73 | Responsive options and defaults; markup example; hashed names; unchanged images never encoded twice; only pages showing a replaced image rebuild | X | ✅ | as V-C07-090 to V-C07-096, V-C07-108 | |
| V-C07-121 | 77-79 | `stati.image()` example with `sizes` and `priority` | X | ✅ | runtime.ts:92-103 | |
| V-C07-122 | 83-94 | OG options; front matter image kept, `false` gives none; 404 page has no card with core 2.2 or later | G | ✅ | config.ts:155-200; og.ts:23-33; core CHANGELOG.md:108-111 (2.2.0) | |
| V-C07-123 | 98-100 | Card design, nearest `og.eta`, link `./templates/og.eta`, template context and Satori rules | B | ✅ | as V-C07-100 to V-C07-103; file exists | |
| V-C07-124 | 104-112 | Fonts and formats | G | ✅ | as V-C07-105 | |
| V-C07-125 | 118-120 | sharp troubleshooting; cache in `dist/_img` and `.stati/images` | B | ✅ | as V-C07-108, V-C07-113 | |
| V-C07-126 | 126 | MIT; fonts under SIL OFL in `fonts/` | B | ✅ | packages/images/fonts/OFL-*.txt:3 | |

No ✂️: the README overlaps configuration/images.md, as an npm README should; no filler.

### packages/images/fonts/README.md

Covers: `packages/images/fonts/*`, `packages/images/src/og/defaults.ts`, `examples/*/og/fonts`.

| ID | Line | Claim | Cat | Status | Evidence | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| V-C07-127 | 3-14 | Built-in card uses these four files; families and weights; WOFF2 unsupported; OFL 1.1; static instances, subset | B | ✅ | src/og/defaults.ts:11-16; fonts/OFL-*.txt:3; core runtime.ts:198-202. "Satori ignores variable font axes" is external behavior, not checked | |
| V-C07-128 | 18-21, 25-60 | Coverage (U+0020-017F, U+2000-206F, euro, trademark, arrows); rebuild with fontTools from google/fonts | B | ⚠️ | Coverage text matches `UNICODES` in the script (lines 34-37). Not checked: the font binaries' actual cmaps, the google/fonts paths, and the script itself (no Python here). Settled by running the script or reading the cmaps with a font library | |
| V-C07-129 | 62-63 | The `og/fonts` folders of the blog and docs starters were built the same way | B | ⚠️ | blog (young-serif-regular.woff) and docs (inter-semibold.woff, inter-extrabold.woff) ✅. The news starter also has `examples/news/og/fonts/` (libre-franklin-semibold.woff, libre-franklin-black.woff), not mentioned; whether it was built with this script needs the maintainer | if confirmed: old: "The `og/fonts` folders of the blog and docs starters in `examples/` were built the same way:\nYoung Serif 400 for the blog (`ofl/youngserif`), Inter 600 and 800 for docs." → new: "The `og/fonts` folders of the blog, docs and news starters in `examples/` were built the same way:\nYoung Serif 400 for the blog (`ofl/youngserif`), Inter 600 and 800 for docs, Libre Franklin 600 and 900 for news (`ofl/librefranklin`)." |

V-C07-022 is moot if V-C07-021 is applied.

### Gaps

- **Drafts in feeds.** With `stati build --include-drafts`, draft pages appear in every RSS feed (generator.ts:51-71 has no draft check; test: feed.xml 7 items incl. "Draft"), while search leaves them out (search/generator.ts:301-303). The docs say nothing. Maintainer decision: document it ("`--include-drafts` also puts drafts in feeds") or treat it as a bug.
- **Empty `contentPatterns`.** `contentPatterns: []` includes every page (pattern-matching.utils.ts:95 skips an empty list; test empty.xml: 6 items), while the validation warning says the feed "may not include any content" (validation.ts:110-112) and configuration/rss.md:512 lists it as such. One line would help: "An empty `contentPatterns` array includes every page."
- **`includeContent` and `]]>`.** The Markdown body goes into CDATA unescaped (generator.ts:300); a body containing `]]>` (for example in a code sample) produces invalid XML. Worth a sentence in the includeContent note, or a code fix.
- **Search with nothing to index.** When no page is searchable, pages still link to the index name but no file is written (build.ts:570-573), so client code gets a 404. Client examples should handle a failed fetch.
- **No per-page search opt-out.** `search: false` in front matter does nothing on an ordinary page (search/generator.ts:299-331 only reads `search === true` for generated and 404 pages); `exclude` is the only way. Optional one-liner in "Exclude pages".
- **Search types.** `SearchIndex`, `SearchDocument`, `SearchConfig` are exported from `@stati/core/types` (types/index.ts:75) but not from `@stati/core`; useful for TypeScript client code. Low priority.
- **validateRSSConfig on a disabled config** returns `valid: true` with a warning ("RSS feed generation is disabled" / "RSS configuration is not defined", validation.ts:130-136), and `generateRSSFeeds` returns `[]` when RSS is off (generator.ts:399-402); neither generate function validates. Low priority for api/rss.md.

### Terminology

- "frontmatter" (configuration/rss.md:223, 232; search.md:179) vs "front matter" (configuration/rss.md:295; search.md:99, 103, 174, 314; images.md:135, 217). Most of the cluster uses "front matter"; api/rss.md's "frontMatter property name" refers to the `page.frontMatter` property and is fine.
- images.md:59 "layouts and partials" vs Stati 2's "included templates" (`stati.include()`); the skill and AGENTS.md say "included templates".
- OG naming varies: "Open Graph image" (images.md headings, types), "card" (images.md 162-183), "social card" (images/README.md:8), "link previews" (images.md:17, 122). Using "Open Graph image" for the file and "card" for the template design is consistent enough; "social card" in the README is the outlier.
- "static directory (`public/`)" is used consistently.

### Cross-cluster

- `packages/core/src/types/rss.ts:196-201`: JSDoc says `includeContent` "uses the rendered HTML content"; the generator writes the Markdown source (generator.ts:300). Source comment, shows in IntelliSense.
- `packages/core/src/types/rss.ts:93, 253, 259`: JSDoc examples use `contentPatterns: ['blog/**']` / `['news/**']`, which match nothing (absolute source paths). `:84-87` say "(max 144)/(max 400)" for recommendations.
- `packages/core/src/rss/validation.ts:111`: the empty-`contentPatterns` warning text contradicts the behavior (see Gaps).
- `packages/core/src/search/index.ts:9`: module example imports from `'@stati/core/search'`, which is not an export path (packages/core/package.json exports `.`, `./types`, `./config`).
- `.claude/skills/stati/references/features.md:80-81`: lists the generated OG tags without `twitter:image:alt` (same omission as V-C07-097).
- `.claude/skills/stati/references/features.md:356-360` and AGENTS.md:33 say generated and later listing pages are "out of ... RSS"; correct. No skill note covers drafts in feeds with `--include-drafts` (see Gaps).

### Phase 5 log

- V-C07-002: applied (new intro states production-only and several feeds; Overview cut)
- V-C07-004: applied at config/rss.md:38, :66, :80; line 368 removed with V-C07-021; api/rss.md:464 removed with V-C07-055. Re-checked against pattern-matching.utils.ts:84-108; re-run: blog.xml now keeps `blog/post-a/index.md`, drops `blog/index.md`
- V-C07-007: applied. Re-checked against glob-patterns.utils.ts:51-53
- V-C07-014: applied. Re-checked against rss/generator.ts:323
- V-C07-015: applied. Re-checked against rss/generator.ts:314-316
- V-C07-016: applied (link fixed, guid sentence added). Re-checked against rss/generator.ts:178-182, 343-349; re-run: linked.xml links `https://example.com/blog/post-b?utm_source=rss`
- V-C07-019: applied. Re-checked against types/content.ts:392-397; re-run: `<custom:readTime>1 min</custom:readTime>`
- V-C07-021: applied (Real-world examples cut)
- V-C07-022: applied (moot, removed with V-C07-021)
- V-C07-024: applied (Automatic validation cut)
- V-C07-025: applied (Manual validation replaced by a link to `/api/rss#validaterssconfig`; slug confirmed with core `slugify('validateRSSConfig')` = `validaterssconfig`, heading api/rss.md `### validateRSSConfig`)
- V-C07-026: applied. Re-checked against rss/validation.ts:138-141
- V-C07-028: applied (sentence deleted)
- V-C07-029: applied (Development vs production cut; fact kept in the intro)
- V-C07-033: applied (Best practices cut; "Stati does not link the feed" kept with an `eta` snippet using `stati.url('/feed.xml')`). Re-checked: no `application/rss+xml` in packages/core/src
- V-C07-034: applied. Re-checked: configuration/seo.md:322 `## Sitemap configuration`
- V-C07-035: applied
- V-C07-039: applied (note moved below the list). Re-checked against content.ts:40-45,74
- V-C07-042: applied (three notes). Re-checked against src/index.ts:78
- V-C07-045: applied. Re-checked against rss/generator.ts:178-182, 343-349
- V-C07-047: applied. Re-checked against rss/validation.ts:84-93
- V-C07-051: applied per ruling D11: api/rss.md keeps one validation example, under `validateRSSConfig` (the fuller version with warnings); the copy under RSSValidationResult is cut
- V-C07-055: applied (Usage examples cut)
- V-C07-058: applied
- V-C07-060: applied
- V-C07-065: applied (fact remains at search.md "Basic configuration" and the option table)
- V-C07-069: applied (fence `eta`)
- V-C07-076: applied (one-paragraph "Index size")
- V-C07-079: applied. Re-checked against images/runtime.ts:333-361
- V-C07-097: applied. Re-checked against seo/generator.ts:377-381
- V-C07-116: applied per D10 (host names and "without system packages" dropped)
- V-C07-119: applied (Node part; core 1.28 kept). Re-checked against packages/images/package.json engines
- V-C07-128: left (⚠️ unsettled; binaries and script not checked)
- V-C07-129: left (no repo evidence that the news fonts came from the same script: no notes in examples/news, file names differ in style)
- Gap, empty contentPatterns: applied (one sentence in the patterns note, config/rss.md:66). Re-checked against pattern-matching.utils.ts:95
- Gap, CDATA `]]>`: applied (one sentence in the includeContent note). Re-checked against rss/generator.ts:300
- Gap, drafts in feeds: left (ruling: code bug H6, not documented)
- Gap, empty index file link: left (ruling: skip)
- Other gaps (search opt-out, search types, disabled validation): left (not approved)
- Terminology: "frontmatter" → "front matter" at config/rss.md:219, :228, search.md:179 (table), api/rss.md "frontMatter property name" ×5 → "front matter property name"; images.md:59 "partials" → "included templates"
- Cross-cluster items against C07 files from other agents: none found

Applied 35 (32 findings, 2 gaps, 1 terminology pass), rejected 0, left 7 (V-C07-128, V-C07-129, and five gaps: drafts in feeds, empty index link, search opt-out, search types, disabled validation).

## C08 findings

Summary: 172 claims; ✅ 105, ❌ 12 (H 0, M 5, L 7), ⚠️ 8, ✂️ 47.

Scratch projects: `work/C08/blog` (copy of `examples/blog`), `work/C08/t1` (config and hook checks), `work/C08/t2` (Tailwind and hashed CSS, with Tailwind 4 junctioned from `docs-site/node_modules`). All builds ran with `node packages/cli/dist/cli.js build`; no server was started.

Proposed split for the two ISG pages (the ✂️ rows below follow it): `core-concepts/isg.md` keeps how ISG works (dependency tracking, removing pages, cache manifest, build process, development, persistence). `configuration/isg.md` keeps the `isg` options, front matter overrides, aging rules, the age cap, invalidation (CLI and programmatic), rebuild decision logic, template dependency tracking and troubleshooting. Each page links to the other instead of repeating it. Anchors other pages link to stay: `core-concepts/isg#dependency-tracking`, `#removing-pages-that-no-longer-exist`, `configuration/isg#template-dependency-tracking`.

### docs-site/site/core-concepts/isg.md

Covers: `packages/core/src/core/isg/*`, `types/isg.ts`, `core/build.ts` (cache check, prune, manifest save), `core/invalidate.ts`, `core/dev.ts` (initial cache clear), `config/loader.ts` (ISG defaults)

| ID | Line | Claim | Cat | Status | Evidence | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| V-C08-001 | 9 | "one of Stati's most powerful features. It intelligently tracks..." | V | ✂️ | Marketing; the next sections say what it tracks | old: "Incremental Static Generation is one of Stati's most powerful features. It intelligently tracks dependencies, caches build outputs, and only regenerates what has actually changed. This reduces build times, especially for large sites." → new: "Incremental Static Generation (ISG) caches each page between builds and renders only the pages whose inputs changed. It runs at build time: a static host needs a new build to show new content." |
| V-C08-002 | 11-20 | "What is ISG?" bullet list and "Unlike traditional static site generators..." | V | ✂️ | Restates line 9 and the next section | delete lines 11-20 (the `## What is ISG?` section) |
| V-C08-003 | 26 | Records layout, shells, includes, Open Graph template, every name looked up and the file found, while rendering; a conditional include counts only where it rendered; images hashed by content | B | ✅ | core/templates.ts:249-254, 355-364, 417-432; core/isg/builder.ts:400-423, 457-464; core/build.ts:1002-1008; scratch manifest `work/C08/blog/.stati/manifest.json` | |
| V-C08-004 | 30 | Reading `stati.collection` adds a summary: URL, publish date, `title`, `description`, `tags`, `draft`; `summaryFields` changes it; pagination depends on its slice and page count; generated pages on their items | B | ✅ | core/collections.ts:21, 281-287; core/build.ts:808-838 | |
| V-C08-005 | 31 | Reading `stati.nav` or `stati.page.navNode` adds the navigation tree | B | ✅ | core/templates.ts:281-289 (navNode getter sets `reads.nav`); core/build.ts:838; types/isg.ts:149-152 | |
| V-C08-006 | 33 | Re-rendered on own Markdown/front matter, template or image change, read data change, TTL expiry | B | ✅ | core/isg/builder.ts:262-287, 289-372 | |
| V-C08-007 | 35-59 | Example rebuild table (body edit, title edit, add/delete, layout change, new section template, unused template) | X | ✅ | core/isg/builder.ts:250-264 (`lookupsChanged`); core/build.ts:831-847; core/isg/prune.ts:43-110 | |
| V-C08-008 | 61 | Data a helper returns from `beforeAll` is not tracked; front matter written in `beforeAll` is hashed | B | ✅ | core/isg/builder.ts:267, 410 (`computeContentHash(page.content, page.frontMatter)`); core/build.ts:652-656 (hook before cache check) | |
| V-C08-009 | 65 | Build deletes HTML of pages that no longer exist (deleted file, draft after `--include-drafts`, unused tag, shorter listing), only manifest-recorded files, emptied folders, never outside `dist/` through a link; undeletable file keeps its entry | B | ✅ | core/isg/prune.ts:43-110, 131-145; core/build.ts:1575-1590; core/content.ts:62 | |
| V-C08-010 | 67-69 | First build after upgrading re-renders every page once | B | ✅ | core/isg/builder.ts:119-133, 239-242; core/build.ts:842, 855 | |
| V-C08-011 | 67-69, 106 | "Upgrading" section and the last sentence of line 106 say the same thing | V | ✂️ | Same fact twice on the page | delete lines 67-69 (`### Upgrading` and its paragraph); line 106 keeps "An entry without these records makes its page rebuild once." |
| V-C08-012 | 73-104 | Manifest at `.stati/manifest.json`, keyed by output path; sample entry fields | T | ✅ | core/isg/manifest.ts; types/isg.ts:103-181; core/build.ts:601-604; scratch manifest matches the field set | |
| V-C08-013 | 106 | `deps` layout first; `templateLookups` with folder and file; `readsCollection`/`readsNav` | T | ✅ | types/isg.ts:64-81, 108-152; core/isg/builder.ts:461-464 | |
| V-C08-014 | 108-114 | Build process: discovery, cache check (hashes + TTL), selective rendering (changed, expired, no output file), cleanup, manifest update | B | ✅ | core/build.ts:1363-1366, 849-866, 1575-1590, 1617-1621 | |
| V-C08-015 | 116-147 | `## Configuration` example and defaults (enabled true, 21600, 365) | G | ✅ | config/loader.ts:63-67, 238; constants.ts:56, 59; validation passes for the example (core/isg/validation.ts:140-246) | |
| V-C08-016 | 116-147 | Configuration section repeats `configuration/isg.md` (same options, defaults, aging example) | V | ✂️ | configuration/isg.md:13-52, 83-113 | replace lines 116-147 with: "## Configuration\n\nSet the default TTL, aging rules and the age cap in the [`isg` options](/configuration/isg). A page can override its TTL and age cap in front matter." |
| V-C08-017 | 155-170 | CLI invalidate examples: `path:` prefix on output-path keys, `tag:`, `age:7days`, no query clears all, several terms OR | L | ✅ | core/invalidate.ts:80-114, 227-252; packages/cli/src/cli.ts:374-400 | |
| V-C08-018 | 174-193 | `import { invalidate } from '@stati/core'` and calls | A | ✅ | packages/core/src/index.ts:112; core/invalidate.ts:210 | |
| V-C08-019 | 149-193, 243-260 | Cache management and age format repeat `configuration/isg.md` "Cache invalidation" (patterns, OR, age units, calendar arithmetic) | V | ✂️ | configuration/isg.md:187-239 | replace lines 149-193 with "## Invalidation\n\n`stati invalidate` removes cache entries by tag, path, glob or render age, so the next build renders those pages again. See [Cache invalidation](/configuration/isg#cache-invalidation)." and move the programmatic snippet to configuration/isg.md (V-C08-047). Delete lines 243-260 (`### Age format for invalidation`). |
| V-C08-020 | 197-222 | Front matter `ttlSeconds`/`maxAgeCapDays` override; `ttlSeconds` applies to undated pages when aging is set | G | ✅ | core/isg/ttl.ts:83-99; core/isg/builder.ts:436-445 | |
| V-C08-021 | 195-241 | "Cache configuration" and "Aging configuration" repeat `configuration/isg.md` TTL and aging sections | V | ✂️ | configuration/isg.md:44-52, 83-113 | delete lines 195-241 (covered by the pointer from V-C08-016) |
| V-C08-022 | 226, 241 | Age from `publishedAt`/`published`/`date`/`createdAt`; first rule in ascending order with `untilDays` ≥ age; older than every rule uses the last; undated uses `ttlSeconds`; rule constraints; frozen past cap | B | ✅ | core/utils/date.utils.ts:10, 33-58; core/isg/ttl.ts:205-235; core/isg/validation.ts:140-246; core/isg/builder.ts:289-292; tested: `untilDays: 400` fails with ISG_AGING_RULE_EXCEEDS_CAP (cap 365 from defaults) | |
| V-C08-023 | 254-260 | Days/weeks simple, months `setMonth`, years `setFullYear`; `age:3months` is three calendar months | B | ✅ | core/invalidate.ts:155-182 | |
| V-C08-024 | 262-276 | "How ISG helps" tree | V | ✂️ | Repeats the example block at lines 35-59 | delete lines 262-276 (`## Build efficiency`, `### How ISG helps`); keep `### Development experience` under a `## Development` heading |
| V-C08-025 | 280-285 | Dev server clears the cache and builds every page; content, template, add/delete behavior | B | ✅ | core/dev.ts:106-115; core/isg/prune.ts runs in every build (core/build.ts:1579); AGENTS.md "Dev + preview servers" (`markTemplateChanges`) | |
| V-C08-026 | 287 | "This means most edits during development result in significantly faster rebuilds..." | V | ✂️ | Restates the list | delete line 287 |
| V-C08-027 | 293-300 | Cache directory structure | B | ❌ L | Missing `images/` (`.stati/images/manifest.json`, core/images/manifest.ts:2), which the blog starter build creates | old: "├── metrics/                 # Build metrics (only with --metrics)" → new: "├── images/manifest.json     # Generated and copied images, reused between builds\n├── metrics/                 # Build metrics (only with --metrics)" |
| V-C08-028 | 304 | Cached page reused only while its HTML exists, so cache `.stati/` with `dist/` | B | ✅ | core/build.ts:851-855 | |
| V-C08-029 | 306-313 | Hosting table: "Serverless (Vercel, Netlify) / Ephemeral filesystems / platform cache features", "Docker ... mount volumes" | B | ⚠️ L | Host behavior, not Stati's; can't be checked against source. Line 304 already says what matters | replace lines 306-313 with: "Keep both `.stati/` and `dist/` between builds. A CI runner or container that starts empty builds every page." |
| V-C08-030 | 317-332 | GitHub Actions and GitLab cache examples | X | ✅ | Paths match V-C08-028 | |
| V-C08-031 | 334 | Ephemeral first build is a full build | B | ✅ | core/build.ts:851-855 | |
| V-C08-032 | 340 | Build output shows rendered vs cached pages and the hit rate; `--metrics` | B | ✅ | packages/cli/src/colors.ts:599-632; scratch build prints "Cache: 0/22 hits (0.0%)" | |
| V-C08-033 | 342 | "ISG is central to Stati's build workflow. Understanding how to configure and optimize it..." | V | ✂️ | Filler | old: "ISG is central to Stati's build workflow. Understanding how to configure and optimize it will improve your development experience and build times. Next, learn about" → new: "Next, learn about" |

### docs-site/site/configuration/isg.md

Covers: `types/isg.ts`, `core/isg/validation.ts`, `core/isg/ttl.ts`, `core/isg/builder.ts`, `config/loader.ts`, `core/invalidate.ts`, `packages/cli/src/cli.ts` (build flags, invalidate)

| ID | Line | Claim | Cat | Status | Evidence | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| V-C08-034 | 11 | "Stati's intelligent caching system that provides selective rebuilds... Configure ISG to optimize..." | V | ✂️ | Marketing | old: "Incremental Static Generation (ISG) is Stati's intelligent caching system that provides selective rebuilds by only regenerating content that has actually changed. Configure ISG to optimize your site's build workflow and deployment strategy." → new: "The `isg` options set how long Stati reuses a cached page before it renders it again. See [Incremental Static Generation](/core-concepts/isg) for what the cache tracks." |
| V-C08-035 | 17-31 | Example config | X | ✅ | Passes core/isg/validation.ts:50-246 (untilDays ≤ 365, ttlSeconds ≤ 2592000) | |
| V-C08-036 | 35-40 | Options table: `enabled` true, `ttlSeconds` 21600 for pages no aging rule covers, `maxAgeCapDays` 365 freezes dated pages, `aging` `[]` | G | ✅ | config/loader.ts:63-67, 238; constants.ts:56, 59; core/isg/ttl.ts:83-99; core/isg/builder.ts:223, 289-292 | |
| V-C08-037 | 42 | `ttlSeconds` whole number 0 to one year, `maxAgeCapDays` 1 to 3650, "Invalid ISG configuration" error | G | ✅ | core/isg/validation.ts:74-135; config/loader.ts:241-257; tested `ttlSeconds: 'invalid'` | |
| V-C08-038 | 44-52 | Front matter `ttlSeconds` and `maxAgeCapDays` override | G | ✅ | core/isg/ttl.ts:83-85; core/isg/builder.ts:436-445 | |
| V-C08-039 | 56-60 | `enabled: false` renders every page; missing HTML rebuilds even when fresh or frozen; deleting `dist/` alone recreates pages | B | ✅ | core/isg/builder.ts:223-225; core/build.ts:851-855 | |
| V-C08-040 | 62-71 | Second `ttlSeconds` example | V | ✂️ | Shows only what the table and the example at 17-31 show | delete lines 62-71 (from "The `ttlSeconds` option sets the default cache duration" through the code block) |
| V-C08-041 | 73-81 | "Common TTL values" table | V | ✂️ | Opinion, not behavior; repeats "Best practices" item 1 | delete lines 73-81 |
| V-C08-042 | 89-96 | Publish date fields, pages without one use `ttlSeconds`, rule selection, last rule until cap | B | ✅ | core/utils/date.utils.ts:10, 33-58; core/isg/ttl.ts:91-99, 205-235 | |
| V-C08-043 | 98-113 | Example and rule constraints (ascending, unique, ≤ cap, ≤ 2592000) | G | ✅ | core/isg/validation.ts:140-246 | |
| V-C08-044 | 115-165 | Three "Practical examples" (news, docs, blog) | V | ✂️ | Same shape three times; the example at 98-111 already shows aging with comments | delete lines 115-165, or keep only the news example (the one that sets a short cap) |
| V-C08-045 | 169, 185 | Frozen pages rebuild for every reason but TTL, and when forced; undated pages never frozen | B | ✅ | core/isg/builder.ts:284-292; core/isg/ttl.ts:167-184; core/build.ts:851-853 | |
| V-C08-046 | 171-183 | Max age cap example | V | ✂️ | Same config as lines 17-31 | delete lines 171-183 (the code block) |
| V-C08-047 | 189-201 | Patterns `tag:`, `path:` prefix, `glob:`, `age:`, empty clears all; keys are output paths with leading `/`; several terms OR | L | ✅ | core/invalidate.ts:80-114, 227-252; core/isg/builder.ts:18-26; core/build.ts:601-604 | Also add the programmatic call moved from core-concepts/isg.md (V-C08-019) after line 201: "The same queries work from code: `import { invalidate } from '@stati/core'`, then `await invalidate('tag:blog')`, or `await invalidate()` to clear everything. It reads `.stati/` in the current working directory." (core/invalidate.ts:211) |
| V-C08-048 | 205-226 | CLI examples, including quoted values with spaces | X | ✅ | core/invalidate.ts:30-64 (quote-aware split) | |
| V-C08-049 | 230-239 | Age table and calendar note | L | ✅ | core/invalidate.ts:134-182 | |
| V-C08-050 | 239 | "**Note:** Months and years use exact calendar arithmetic..." | V | ✂️ | Repeats line 230 and the table | delete line 239 |
| V-C08-051 | 246-253 | `stati build`, `--force` bypasses cache | L | ✅ | packages/cli/src/cli.ts:43-46, 88; core/build.ts:851-852 | |
| V-C08-052 | 252 | `# Clean cache before building` | L | ❌ L | `--clean` deletes the output directory and `.stati/` (core/build.ts:1283-1289) | old: "# Clean cache before building" → new: "# Delete the output directory and the cache, then build everything" |
| V-C08-053 | 260-271 | Manifest field list | T | ✅ | types/isg.ts:103-153 | |
| V-C08-054 | 268 | `tags`: "Tags from front matter for invalidation" | T | ❌ L | Generated pages also carry their key and label (core/isg/builder.ts:139-151) | old: "- **tags**: Tags from front matter for invalidation" → new: "- **tags**: Tags from front matter, plus a generated page's key and label, for invalidation" |
| V-C08-055 | 258-273 | `### Cache manifest` list repeats core-concepts/isg.md `### Cache manifest` | V | ✂️ | core-concepts/isg.md:71-106 | delete lines 258-271 and keep line 273 as: "Each page's entry in `.stati/manifest.json` is described in [Cache manifest](/core-concepts/isg#cache-manifest). Generated images are tracked separately, in `.stati/images/manifest.json`, ..." (rest of line 273 unchanged). Add `images` (generated files the page references) to the core page's line 106 so the field isn't lost: append "`images` lists the generated images the page references." |
| V-C08-056 | 277-286 | Rebuild decision list (force/disabled, missing HTML or image, no entry, hash change, TTL, failed image job, layout/lookup/deleted template, unrecorded entry) | B | ✅ | core/build.ts:851-866; core/isg/builder.ts:223-372 | |
| V-C08-057 | 282 | Item 4 lists what `inputsHash` covers | B | ⚠️ L | Also covers the render settings: bundle paths, search index name, base path, stylesheet settings, reading time, collection path (core/build.ts:789-829). A page without any layout always rebuilds (core/isg/builder.ts:246-258), not listed | old: "the `images` settings, or data it read" → new: "the `images` settings, the bundles, search index and stylesheet it links, or data it read". Optional: add to item 7 "or it has no layout at all". |
| V-C08-058 | 288 | Listing rebuilds on title/description/tags/publish date change, not body | B | ✅ | core/collections.ts:21; core/build.ts:834-838 | |
| V-C08-059 | 290-292 | "Removing stale pages" section | V | ✂️ | Repeats core-concepts/isg.md:63-65 (which cli/commands.md links to); "is no longer needed" is version framing | delete lines 290-292 |
| V-C08-060 | 296-306 | Template tracking list (layout from front matter or nearest `layout.eta`, `index.eta` first for index pages; shells; includes; OG template; names incl. `has()` misses); add/delete behavior; helpers untracked | B | ✅ | core/templates.ts:236-254; core/template-render.ts:280-300; core/isg/builder.ts:250-277 | |
| V-C08-061 | 310-319 | "Only values in the `tags` array become searchable tags" | B | ❌ L | Generated pages add key and label (core/isg/builder.ts:139-151); a non-array `tags` fails the build (core/isg/validation.ts:301-323; tested `tags: news` → "Invalid tags in front-matter of ... Must be an array of strings.") | old: "Only values in the `tags` array become searchable tags for invalidation. Individual properties like `category` are not automatically converted to tags." → new: "Only values in the `tags` array, and a generated page's key and label, become tags for invalidation; other properties such as `category` don't. `tags` must be a list of strings: `tags: news` stops the build." |
| V-C08-062 | 321-349 | Best practices lists | V | ✂️ | Mostly restates the page ("Enable ISG" is the default; "hierarchical tags" means nothing for exact-match `tag:`; "Dev Mode" repeats core-concepts/isg.md:282) | delete lines 321-349; keep "Keep both `.stati/` and `dist/` between CI/CD builds" only if V-C08-029 is not applied |
| V-C08-063 | 342 | "Listing pages: Give index pages that list other pages a short `ttlSeconds`, or invalidate them after publishing" | B | ❌ M | Listings that read `stati.collection` rebuild when a listed page's summary changes (core/build.ts:834-838; core/isg/builder.ts:282-287); the advice suggests a workaround the feature replaced | delete with V-C08-062; if the section stays: old: "4. **Listing pages**: Give index pages that list other pages a short `ttlSeconds`, or invalidate them after publishing" → new: "4. **Listing pages**: Read listings from `stati.collection`, which rebuilds them when a listed page changes; data a helper returns is not tracked" |
| V-C08-064 | 353-372 | Troubleshooting items (enabled, manifest + dist, hit/miss output, `--clean`, `deps`, TTL, `beforeRender` rewrites hash, case-sensitive tags, leading slash, clear all) | B | ✅ | core/isg/builder.ts:223; core/build.ts:854, 886-892; core/invalidate.ts:92, 96; scratch test (V-C08-076) | |
| V-C08-065 | 374 | "ISG is a powerful feature that can help with build workflows..." | V | ✂️ | Filler | delete line 374 |

### docs-site/site/api/hooks.md

Covers: `core/build.ts` (hook calls and order), `types/config.ts` (`BuildHooks`, `BuildContext`, `PageContext`), `env.ts`

| ID | Line | Claim | Cat | Status | Evidence | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| V-C08-066 | 9 | "They provide powerful extension points for..." | V | ✂️ | Marketing | old: "Build hooks allow you to inject custom logic at various stages of the Stati build process. They provide powerful extension points for preprocessing content, integrating external services, generating additional files, and customizing the build pipeline." → new: "Build hooks run your own code at four points of a build: `beforeAll`, `beforeRender`, `afterRender` and `afterAll`. Define them under `hooks` in `stati.config.ts`; each may be async." |
| V-C08-067 | 13-31 | Lifecycle order: config, content, generated/paginated pages, navigation; TypeScript; `beforeAll`; search index; per page cache check → `beforeRender` → render/inject/write → `afterRender`; prune, manifest, static copy; sitemap/robots/RSS (production); `afterAll` | B | ✅ | core/build.ts:1270-1413 (config, content, nav, TS), 652-676 (`beforeAll`, search index), 849-1083 (per page), 1575-1667 (prune, manifest save 1620, static copy 1667), 1691-1806, 1808-1813 | |
| V-C08-068 | 24-27 | Dev writes after every page renders; Tailwind build writes after Tailwind runs; `afterRender` can run before the file is written | B | ✅ | core/build.ts:1028-1050, 1077-1094, 1501; tested in `work/C08/t2`: hook saw no file for `/` | |
| V-C08-069 | 33 | Cached pages skip per-page hooks; `--force` runs them for every page | B | ✅ | core/build.ts:851-879 | |
| V-C08-070 | 35 | Throwing hook fails the build; no timeout | B | ✅ | core/build.ts:652-656, 886-892, 1078-1082, 1809-1813 (no catch, no timer) | |
| V-C08-071 | 41-45 | `beforeAll` once, before rendering, with generated/paginated pages; front matter it writes is hashed; helper data isn't; generated pages and pagination fixed before it | B | ✅ | core/build.ts:427, 649-656; core/isg/builder.ts:267, 410; core/expand.ts (runs in loadContentAndBuildNavigation, core/build.ts:426-427) | |
| V-C08-072 | 47-52, 76-81, 114-118, 141-145 | "Use cases" lists under each hook | V | ✂️ | Generic; the examples show the same | delete the four "**Use cases:**" blocks, except as rewritten in V-C08-077 |
| V-C08-073 | 54-70 | `beforeAll` example | X | ✅ | `ctx.pages` (types/config.ts:514-519) | |
| V-C08-074 | 74, 83 | `afterAll` after static assets, sitemap, robots, RSS; those are built in | B | ✅ | core/build.ts:1663-1813 | |
| V-C08-075 | 86-106 | `getEnv()` from `@stati/core` is `'production'` in `stati build` | A | ✅ | packages/core/src/index.ts:169; packages/cli/src/cli.ts:131; core/dev.ts:528 | |
| V-C08-076 | 112, 120, 135 | `beforeRender` only for rendered pages; front matter values show as `stati.page.<name>`; `wordCount`/`readingTime` on `ctx.page`; caching note: changed front matter re-renders the page every build | B | ✅ | core/build.ts:886-892; core/templates.ts:262-280; tested in `work/C08/t1`: a hook setting `section` on `/b` gave "Cache: 1/2 hits" on every later build | |
| V-C08-077 | 114-133 | `beforeRender` use cases ("Add dynamic data", "Derive values", "Modify page content") and example setting `ctx.page.frontMatter.section` | X | ❌ M | Every such change re-renders the page on every build (V-C08-076, which the page's own note at line 135 says); the lead example shows the pattern the note warns against | old (114-133, from "**Use cases:**" through the closing code fence) → new: "Changes the hook makes to `ctx.page.frontMatter` appear in templates as `stati.page.<name>`, and `ctx.page.content` is the Markdown body. Word count and reading time need no hook: every page has `wordCount` and `readingTime` (see [Word count and reading time](/core-concepts/markdown#word-count-and-reading-time)).\n\n```javascript\nexport default defineConfig({\n  hooks: {\n    beforeRender: async (ctx) => {\n      if (!ctx.page.frontMatter.description) {\n        console.warn(`${ctx.page.url} has no description`);\n      }\n    }\n  }\n});\n```" and keep the caching note (line 135) right after it. |
| V-C08-078 | 139 | `afterRender` context: page and config only; no HTML | B | ✅ | core/build.ts:1080 | |
| V-C08-079 | 147-163 | `afterRender` example counts words with `split(/\s+/)` "for search index or analytics" | X | ❌ L | `ctx.page.wordCount` exists (core/build.ts:795; core/reading-time.ts); the search index is written before any page renders (core/build.ts:669) | old: "      // Extract data for search index or analytics\n      const wordCount = ctx.page.content.split(/\\s+/).length;\n      await trackPageMetrics({\n        url: ctx.page.url,\n        title: ctx.page.frontMatter.title,\n        wordCount: wordCount\n      });" → new: "      await trackPageMetrics({\n        url: ctx.page.url,\n        title: ctx.page.frontMatter.title,\n        wordCount: ctx.page.wordCount,\n      });" and add after the block: "`trackPageMetrics` stands for your own function." |
| V-C08-080 | 171-185 | `BuildContext { config, pages }`, `PageContext { page, config }` | T | ✅ | types/config.ts:514-539 | |
| V-C08-081 | 191 | Each hook gets a new context object | B | ✅ | core/build.ts:649, 888, 1080, 1811 | |
| V-C08-082 | 218 | "see the caching note under [`beforeRender`](#beforerender)" | R | ❌ L | The note there is about front matter a hook changes; helper data is covered under `beforeAll` (line 43) and in Dependency tracking | old: "see the caching note under [`beforeRender`](#beforerender)." → new: "see [Dependency tracking](/core-concepts/isg#dependency-tracking)." |
| V-C08-083 | 222-246 | "Conditional hook execution" sets `category` and `tags` in `beforeRender` | X | ❌ M | Same re-render-every-build pattern as V-C08-077 | old (lines 227-236, the `beforeRender` function) → new: "    beforeAll: async (ctx) => {\n      // Only blog posts; values set here are part of each page's cache hash\n      for (const page of ctx.pages) {\n        if (page.url.startsWith('/blog/')) {\n          page.frontMatter.category = extractCategory(page.url);\n        }\n      }\n    }," (the `afterRender` part stays) |
| V-C08-084 | 248-278 | "Error handling in hooks" example | V | ✂️ | Generic try/catch; line 35 already says a throw fails the build; api/error-handling.md:445-462 repeats it | delete lines 248-278 |
| V-C08-085 | 280-307 | "Async hook patterns" (`Promise.all`) | V | ✂️ | Generic JavaScript, nothing Stati-specific | delete lines 280-307 |
| V-C08-086 | 313-336 | Page filtering: drafts only with `--include-drafts`; blog index at `/blog`; list in front matter rebuilds it | X | ✅ | core/content.ts:62, 97-98; core/isg/builder.ts:267 | |
| V-C08-087 | 340 | Headings available as `stati.page.toc` | A | ✅ | core/templates.ts:268 | |
| V-C08-088 | 342-348 | `calculateReadingTime` helper (200 wpm) | V | ✂️ | Built in: every page has `readingTime` (line 120 says so; default 230 wpm, core/reading-time.ts) | delete lines 338-348 (`### Content processing helpers` with the sentence and block) |
| V-C08-089 | 354 | Posts read their folder's collection; `stati.collection.recentPages`; the blog starter does it | B | ✅ | types/content.ts:478; examples/blog/site/posts/layout.eta:13-17 | |
| V-C08-090 | 356-386 | Related posts in `beforeAll` become part of each post's hash | X | ✅ | core/isg/builder.ts:267, 410 | |
| V-C08-091 | 388 | "Build hooks provide powerful extensibility while maintaining Stati's performance and simplicity..." | V | ✂️ | Filler | delete line 388 |

### docs-site/site/api/error-handling.md

Covers: `config/loader.ts`, `config/errors.ts`, `core/isg/validation.ts`, `core/content.ts`, `core/utils/front-matter.utils.ts`, `core/templates.ts`, `core/template-render.ts`, `core/eta-plugin.ts`, `core/utils/context-validation.utils.ts`, `core/utils/template-errors.utils.ts`, `core/utils/error-overlay.utils.ts`, `core/isg/build-lock.ts`, `packages/cli/src/colors.ts`, images errors (`images/provider.ts`, `images/runtime.ts`, `images/config.ts`)

| ID | Line | Claim | Cat | Status | Evidence | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| V-C08-092 | 9-18 | Intro and "Error handling philosophy" principles | V | ✂️ | Marketing; principle 3 is stated again at line 30, the others are the sections below | old: lines 9-18 → new: "This page lists what stops a build, what a production build works around, and how errors are reported in the terminal and in the dev server's error overlay." |
| V-C08-093 | 28 | No config file: defaults, title "My Stati Site", base URL `http://localhost:3000` | G | ✅ | config/loader.ts:181-183; constants.ts:47-51, 121 | |
| V-C08-094 | 29 | Config that fails to load prints the error and "Falling back to default configuration." and builds with defaults | B | ✅ | config/loader.ts:361-373 | |
| V-C08-095 | 30 | Invalid `isg` stops the build with "Invalid ISG configuration", naming the field | G | ✅ | config/loader.ts:241-257; tested | |
| V-C08-096 | 31 | Invalid `images` stops with "Invalid images configuration in <config file>"; unknown keys rejected | G | ✅ | config/loader.ts:260-270; images/config.ts:72-77 | |
| V-C08-097 | 32-33 | Unknown options ("Invalid configuration in", "Unknown option eta.", "Did you mean"); `helpers` message with "(got number 1)" | G | ✅ | config/loader.ts:73-100 (`describeConfigValue`), 335-347 | |
| V-C08-098 | 34 | "**Other values are not validated** at load time" | G | ❌ M | `css`, `readingTime`, `seo`, `sitemap.news` and the `outDir` layout are validated and stop the build (config/loader.ts:272-333; css/config.ts:33-54; core/reading-time.ts:34-50; seo/defaults.ts:399-411; seo/news-sitemap.ts:67-80; config/directories.ts:65-80) | insert before line 34: "- **Invalid `css`, `readingTime`, `seo` or `sitemap.news` values**: the build stops with an `Invalid <option> configuration in <config file>` error, such as `Invalid css configuration`, that names the value.\n- **An `outDir` that overlaps the site's folders**: the build stops with `Invalid configuration in <config file>`, naming both paths. See [Configuration file](/configuration/file)." and change line 34 old: "- **Other values are not validated** at load time." → new: "- **Other values are not validated** at load time." (unchanged; it is then true). The `srcDir: 123` example was tested and is ✅. |
| V-C08-099 | 38-48 | Example: `ISG_INVALID_TTL: ttlSeconds must be a positive integer representing seconds`; images message "Unknown option images.responsive.widht. Allowed options: widths, formats, quality, sizes." | X | ✅ | Tested (ISG message); images/config.ts:75 | |
| V-C08-100 | 56-59 | Content loading: vanished or empty file skipped with a warning, other read errors stop; invalid front matter stops with "Invalid front matter in <file>" and line; missing/empty `srcDir` gives "Found 0 pages"; `---toml` fails, YAML and `---json` work | B | ✅ | core/content.ts:51-56; core/utils/fs.utils.ts:59-64; core/utils/front-matter.utils.ts:81-150; core/build.ts:429 | |
| V-C08-101 | 50-65 | Content loading errors | B | ⚠️ L | Not listed: front matter `tags` that is not a list of strings, and a non-integer or negative `ttlSeconds`/`maxAgeCapDays`, stop the build (core/isg/validation.ts:265-323 via core/isg/builder.ts:408; tested `tags: news`) | add a bullet after line 57: "- **Invalid ISG front matter**: `tags` that is not a list of strings, or a `ttlSeconds` or `maxAgeCapDays` that is not a whole number, stops the build, for example `Invalid tags in front-matter of <file>. Must be an array of strings.`" |
| V-C08-102 | 73-74 | Dev throws `TemplateError` with file/line/column for the failing template, shown in the overlay; production writes the fallback for a failing layout or shell, and replaces a failing include with `<!-- Error rendering site/partials/card.eta: message -->` | B | ✅ | core/templates.ts:369-389; core/template-render.ts:342-349, 534-542 | |
| V-C08-103 | 85-94 | Template syntax example (`stati.collection?.pages`) | X | ✅ | types/content.ts:473-474 | |
| V-C08-104 | 98 | "Mistakes in `stati.include()` and `stati.layout()` calls stop the dev server with an error overlay" | B | ❌ L | The dev server keeps running; the build fails and the overlay shows the error (core/template-render.ts:476-487; core/dev.ts:541-605) | old: "stop the dev server with an error overlay at the template that made the call" → new: "fail the dev build and show the error overlay at the template that made the call" |
| V-C08-105 | 100-108 | Include/layout table: unknown name, props/body types, second layout, late layout, cycle, `await`, Eta's own functions | B | ✅ | core/template-render.ts:288-470, 476-487, 495-504, 534-542; core/eta-plugin.ts:188-205 | |
| V-C08-106 | 114-144 | Unknown `stati.*` properties in dev: message format, suggestions, what is checked (top level; `site`, `nav`, `collection`, `generator`, `helpers`), `stati.body` hint, `in` for helpers, `it` hint | B | ✅ | core/utils/context-validation.utils.ts:46-64, 97-105, 175-176; core/utils/template-errors.utils.ts:154-160 | |
| V-C08-107 | 146-157 | File system errors fail immediately; "Common scenarios" (permissions, disk space, corruption, directory creation) | V | ✂️ | Behavior ✅ (core/utils/fs.utils.ts:69-75 throws); the scenario list is generic | delete lines 152-157 ("**Common scenarios**:" and its list) |
| V-C08-108 | 161-172 | Image errors: missing `@stati/images` message, incompatible version, `images.og` with local `baseUrl` in production, missing file warns, encode failure rewrites page, OG template failure (overlay in dev) | B | ✅ | images/provider.ts:41, 83; images/runtime.ts:70, 170-182; core/build.ts:1592-1632 | |
| V-C08-109 | 174-195 | Hook errors fail immediately; no timeout | B | ✅ | V-C08-070 | |
| V-C08-110 | 199-201 | Classes are internal (not exported); check `error.name`; invalid `isg` arrives as `Error` with `cause` `ISGConfigurationError` | A | ✅ | packages/core/src/index.ts (no error class exports); config/loader.ts:248-254 | |
| V-C08-111 | 201 | "or `error.cause?.name` for configuration errors" | A | ⚠️ L | True only for `isg`. Other config errors are `ConfigValidationError` themselves (`error.name`), with the inner error as `cause` (config/loader.ts:263-345; config/errors.ts:5-10). `ConfigValidationError` and `FrontMatterError` (core/utils/front-matter.utils.ts:23-38) are not listed | covered by V-C08-112 |
| V-C08-112 | 203-280 | Source listings of `TemplateError`, `ISGConfigurationError` + enum, `DuplicateBundleNameError` | T | ✂️ | Listings match source (core/utils/template-errors.utils.ts:9-36; core/isg/validation.ts:7-29; core/utils/bundle-matching.utils.ts:13-21), but users can't import the classes, and the most common one, `ConfigValidationError`, is missing | replace lines 197-280 with: "## Error names\n\nStati's error classes are internal: `@stati/core` does not export them, so check `error.name` instead of using `instanceof`.\n\n| `error.name` | Thrown when |\n| --- | --- |\n| `ConfigValidationError` | An option is unknown or invalid, `helpers` are not functions, or `outDir` overlaps the site's folders |\n| `Error` with `cause.name` `ISGConfigurationError` | The `isg` block is invalid. `cause.code` is `ISG_INVALID_TTL`, `ISG_INVALID_MAX_AGE_CAP`, `ISG_INVALID_AGING_RULE`, `ISG_DUPLICATE_AGING_RULE`, `ISG_UNSORTED_AGING_RULES` or `ISG_AGING_RULE_EXCEEDS_CAP`, and `cause.field` names the setting |\n| `ISGConfigurationError` | A page's `tags`, `ttlSeconds` or `maxAgeCapDays` front matter is invalid |\n| `FrontMatterError` | A page's front matter can't be read |\n| `TemplateError` | A template fails in development; it carries `filePath`, `line` and `column` when known |\n| `DuplicateBundleNameError` | Two TypeScript bundles share a `bundleName` |" (evidence for the ISGConfigurationError-from-front-matter row: core/isg/builder.ts:408, validation.ts:265-323) |
| V-C08-113 | 286-311 | Fallback for no layout or a failing layout/shell in production; include failures don't use it; title and description escaped; warning "No layout template found, using fallback" | B | ✅ | core/templates.ts:366-389, 435-466 | |
| V-C08-114 | 288-311 | Fallback sample written as template-literal source; lines 305-309 restate it; line 311 repeats line 286 | V | ✂️ | Same facts three times | replace lines 288-311 with: "```html\n<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n  <meta charset=\"UTF-8\">\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n  <title>Page title</title>\n  <meta name=\"description\" content=\"Page description\">\n</head>\n<body>\n  <main>\n    <!-- the page's rendered Markdown -->\n  </main>\n</body>\n</html>\n```\n\nThe title and description come from front matter (the title is `Untitled` without one), and the description tag is left out when there is none. A page with no layout at all logs \"No layout template found, using fallback\"." |
| V-C08-115 | 313-315 | Navigation fallback paragraph | V | ✂️ | Says only that an error fails the build (and lacks a final period) | delete lines 313-315 |
| V-C08-116 | 321-330 | Glyphs `×`/`!`/`✓`, ASCII `ERR`/`WARN`/`OK`, colors, streams; info in blue; `NO_COLOR`, non-TTY, `FORCE_COLOR`; `STATI_ASCII_ICONS=1` | B | ✅ | packages/cli/src/colors.ts:9-21, 28-46, 60-74, 826-855 | |
| V-C08-117 | 334-343 | Overlay served in place of the page; heading by type, timestamp, message, file/line/column, route, code context, suggestions, stack with `node_modules`/Node frames dimmed; light/dark | B | ✅ | core/utils/error-overlay.utils.ts:8-9, 697-800, 910; core/utils/theme.utils.ts:42; core/dev.ts:541-605 | |
| V-C08-118 | 358 | `× Error rendering site/blog/layout.eta for /blog/my-post: ...` | X | ✅ | core/templates.ts:387; core/template-render.ts:144-154 (path from the project folder) | |
| V-C08-119 | 363-380 | `BuildStats` shape returned by `build()` | T | ✅ | types/config.ts:588-601; core/build.ts:1221-1229 | |
| V-C08-120 | 386-392 | "Build with subset of content" (`mv site/blog ...`) | V | ✂️ | Generic; such a build also deletes those pages from `dist/` (core/isg/prune.ts) | delete lines 386-392 |
| V-C08-121 | 394-399 | `node -e "console.log(require('./stati.config.js'))"` to test config loading | X | ⚠️ L | Works for a `.js` config on Node 22.12+ (prints the module namespace; tested on Node 22.22 in `work/C08/blog`), fails for `stati.config.ts`, and doesn't run Stati's loading or validation | replace lines 394-399 with: "**Check configuration:** run `stati build` and read the first lines. A config that fails to load prints `Error loading config from ...` followed by \"Falling back to default configuration.\"" (config/loader.ts:371-372) |
| V-C08-122 | 401-423 | "Check build output" sentence and "Common error scenarios" checklists | V | ✂️ | Restates earlier sections; "Review template file permissions" etc. are generic | delete lines 401-423 |
| V-C08-123 | 431-441 | "Validate configuration" example (`getEnv()` switching `baseUrl`) | V | ✂️ | Doesn't show validation | replace lines 429-441 with: "`defineConfig()` gives your editor and `tsc` the config's types." |
| V-C08-124 | 443 | "At load time Stati checks the option names, `helpers`, and the `isg` and `images` settings" | G | ❌ M | Also `css`, `readingTime`, `seo`, `sitemap.news` and `outDir` (V-C08-098) | old: "At load time Stati checks the option names, `helpers`, and the `isg` and `images` settings, so the type check is your safeguard for everything else." → new: "At load time Stati checks the option names, `helpers`, `outDir`, and the `isg`, `images`, `css`, `readingTime`, `seo` and `sitemap.news` settings, so the type check is your safeguard for everything else." |
| V-C08-125 | 445-462 | "Handle hook errors gracefully": catch, log, rethrow | V | ✂️ | Same result as no `try`; duplicates hooks.md:248-278 | delete lines 445-462 |
| V-C08-126 | 464-471 | "Test content incrementally" | V | ✂️ | Generic | delete lines 464-471 |
| V-C08-127 | 477-485 | Front matter "schema" with "(required)" markers | V | ✂️ | Stati requires none of these fields; the block invents a contract | delete lines 475-485 ("**Establish a schema:**" and the block); keep line 487 |
| V-C08-128 | 487 | Publish date from first valid of `publishedAt`, `published`, `date`, `createdAt`, quoted or not; used for collections, navigation, aging, RSS; invalid skipped with a warning | B | ✅ | core/utils/date.utils.ts:6-58; core/content.ts:80-82; core/navigation.ts:111-134 | |
| V-C08-129 | 493 | Production writes fallback and continues; `Error rendering` and `stati.include('…'): no template at …` messages; hook, file system and invalid `isg` errors still stop the build | B | ⚠️ L | Messages ✅ (core/template-render.ts:318-323, 536). The list of what stops the build is incomplete (other config validation, front matter errors) | old: "Hook errors, file system errors and invalid `isg` settings still stop the build." → new: "Configuration and front matter errors, hook errors and file system errors still stop the build." |
| V-C08-130 | 499-501 | Manifest saved only at the end; `.stati/.build-lock`; stale lock removed; `--force`/`--clean` take it over | B | ✅ | core/build.ts:1617-1621, 361-365; core/isg/build-lock.ts:30, 54-102 | |
| V-C08-131 | 505-516 | Cache commands; `stati build --clean # Clear all cache`; `--clean --force` | L | ✂️ | `--clean` also deletes `dist/`, and it already empties the cache, so `--force` adds nothing (core/build.ts:1283-1289) | replace lines 503-516 with: "### Cache-related issues\n\n`stati build --clean` deletes the output directory and the cache, then builds everything. `stati build --force` renders every page and keeps both." |
| V-C08-132 | 518-551 | "Development workflow" (clean build, `stati dev`, build + preview, `ls -la dist/`, `test -f ... && echo "✅ ..."`) | V | ✂️ | Generic; the overlay sentence repeats line 334; adds an emoji | delete lines 518-551 |
| V-C08-133 | 553 | Closing paragraph | V | ✂️ | Filler | delete line 553 |

### docs-site/site/core-concepts/static-assets.md

Covers: `core/build.ts` (`copyStaticAssets`, order), `core/utils/typescript.utils.ts` (injection), `core/utils/template.utils.ts` (`propValue`), `core/utils/tailwind-inventory.utils.ts`, `packages/cli/src/tailwind.ts`, `css/*`, `images/markup.ts`, `packages/create-stati/src/sass-processor.ts`

| ID | Line | Claim | Cat | Status | Evidence | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| V-C08-134 | 11 | Static assets, built-in TypeScript, Tailwind from `stati dev`/`stati build` flags; Sass/PostCSS at project level | B | ✅ | core/build.ts:1275-1280, 1403-1413; packages/cli/src/cli.ts:70-81, 208-220 | |
| V-C08-135 | 56 | "Stati does not include a built-in CSS preprocessor. Tailwind CSS runs from Stati's commands..." | V | ✂️ | Repeats line 11 | old: "Stati does not include a built-in CSS preprocessor. Tailwind CSS runs from Stati's commands when you pass them its input and output (see [Tailwind CSS integration](#tailwind-css-integration)); other tools, such as Sass or PostCSS, run from your npm scripts.\n\n" → new: "" (keep the scaffolder sentence at line 58) |
| V-C08-136 | 15-26 | `public/` copied to the output root without processing | B | ✅ | core/build.ts:249-294, 1153-1199; scratch build copies `public/*` | |
| V-C08-137 | 28 | Static copy runs after pages; generated `robots.txt`/`sitemap.xml` replace copies in production | B | ✅ | core/build.ts:1663-1667 then 1691-1754 | |
| V-C08-138 | 30 | Avoid `public/_img/`; Stati writes images to `/_img/` | B | ✅ | AGENTS.md image runtime; core/images (output dir `_img`) | |
| V-C08-139 | 32-38 | "Use the `public/` directory for" list | V | ✂️ | Restates line 15 | delete lines 32-38 |
| V-C08-140 | 42-52 | esbuild from `src/`, `main.ts` default, bundles injected before `</body>`, include/exclude per page | B | ✅ | core/utils/typescript.utils.ts:657-667 (before `</body>`); configuration/typescript.md (C01) for defaults | |
| V-C08-141 | 62-81 | Basic CSS sample with custom properties | V | ✂️ | The CSS content shows nothing about Stati | replace the `css` block (lines 64-75) with "Put your stylesheet in `public/`, such as `public/styles.css`, and link it from your layout:" and keep the `eta` block |
| V-C08-142 | 83 | Production links a copy named after its content, `/_assets/styles-A1B2C3D4.css` | B | ✅ | css/static.ts:43-83; tested (`/extra.css` → `/_assets/extra-6C27B0B3.css`) | |
| V-C08-143 | 87-101 | Sass scripts (`npm run dev`, `build`, `watch:css`, `build:css`), `src/styles.scss` → `public/styles.css`, hashed like any public stylesheet | B | ✅ | packages/create-stati/src/sass-processor.ts:47-53 | |
| V-C08-144 | 105, 145-168 | `propValue()` tracks every class for the inventory, drops falsy values, accepts strings/arrays/objects, splits space-separated strings | A | ✅ | core/utils/template.utils.ts:32-72 | |
| V-C08-145 | 109-113 | Tailwind 4 and 3; v4 CLI in `@tailwindcss/cli` | B | ✅ | css/tailwind.ts:15; packages/cli/src/tailwind.ts:34-56 | |
| V-C08-146 | 117-141 | `@source '../.stati/tailwind-classes.html'`; Tailwind skips gitignored folders; Tailwind 3 `content` entries | G | ✅ | core/utils/tailwind-inventory.utils.ts:248, 280-285; tested Tailwind 4 build in `work/C08/t2` picked up `text-red-500` from the inventory | |
| V-C08-147 | 139 | Inventory written during build and dev startup | B | ✅ | core/build.ts:1313-1336, 1457-1471 | |
| V-C08-148 | 172 | Link the output under its path; production points it at the hashed file; a page without the link gets one | B | ✅ | core/build.ts:969-986; tested | |
| V-C08-149 | 174-212 | 38-line layout with Tailwind utility classes | V | ✂️ | Only line 181 matters | replace lines 174-212 with: "```eta\n<head>\n  <link rel=\"stylesheet\" href=\"/styles.css\">\n</head>\n```" |
| V-C08-150 | 216-237 | Dev watcher: both flags, one process, `/styles.css`, stops with the dev server, quiet by default, `--tailwind-verbose`, local install validated first | L | ✅ | packages/cli/src/cli.ts:208-220, 259-290; packages/cli/src/tailwind.ts:63-90, 117-150, 274-303 | |
| V-C08-151 | 214-239 | Dev watcher section | V | ✂️ | Repeats cli/development.md:69-97 | replace lines 214-239 with: "### Development\n\n`stati dev --tailwind-input src/styles.css --tailwind-output dist/styles.css` runs Tailwind's watcher next to the dev server. See [Development server](/cli/development#tailwind-css-integration)." |
| V-C08-152 | 243-249 | Build runs Tailwind once after the last page, writes minified `dist/_assets/styles-[hash].css`, points `/styles.css` links at it, adds missing links, deletes older names | B | ✅ | core/build.ts:1478-1510, 1634-1649; css/stylesheet.ts:417-450; tested | |
| V-C08-153 | 241-251 | Production section | V | ✂️ | Repeats configuration/css.md "What a production build does" | replace lines 243-251 with: "`stati build` takes the same flags and writes the stylesheet under a name made from its content. See [CSS](/configuration/css#tailwind-css)." |
| V-C08-154 | 255-263 | Markdown images get `width`/`height`, lazy loading; first image near the top eager with `fetchpriority="high"`; sample markup | B | ✅ | images/markup.ts:20, 63; scratch blog output `<img ... width="1200" height="630" loading="lazy" decoding="async">` | |
| V-C08-155 | 265-271 | Co-located images copied to `/_img/` with a content name; `stati.image()` with `alt`, `priority`; raw `<img>` as authored | A | ✅ | images/runtime.ts:98; types/content.ts:631 | |
| V-C08-156 | 275-285 | Responsive images need `@stati/images`; hand-written `<picture>` for art direction | B | ✅ | AGENTS.md images; configuration/images.md (C07) | |
| V-C08-157 | 287-307 | Google Fonts snippet | V | ✂️ | Not Stati-specific | delete lines 287-307 |
| V-C08-158 | 309-340 | Self-hosted fonts example and closing sentence | V | ✂️ | Behavior ✅ (copy of `public/`), but line 340 repeats line 15 and the CSS sample is generic | replace lines 309-340 with: "## Fonts\n\nPut font files in `public/`, such as `public/fonts/inter.woff2`, and reference them from your CSS as `url('/fonts/inter.woff2')`. A relative `url()` works too: production rewrites it for the hashed copy (see [CSS](/configuration/css#how-pages-link-the-hashed-name))." (css/stylesheet.ts:371-380) |

### docs-site/site/configuration/css.md

Covers: `css/config.ts`, `css/static.ts`, `css/stylesheet.ts`, `css/tailwind.ts`, `core/build.ts` (stylesheet plan, deferred writes, relink, stale removal, static copy skip), `core/dev.ts:500-512`, `packages/cli/src/cli.ts` (flags), `packages/create-stati/src/sass-processor.ts`

| ID | Line | Claim | Cat | Status | Evidence | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| V-C08-159 | 11, 19-29 | Production names stylesheets after content and rewrites links; templates link `/styles.css`; covers `public/`, Sass output in `public/`, Tailwind | B | ✅ | core/build.ts:1293-1302, 742-757, 969-986; tested | |
| V-C08-160 | 31 | Rewrites `rel="stylesheet"`, `alternate stylesheet`, `preload as="style"`; keeps quotes, query/fragment, site origin; relative `href` becomes root path | B | ✅ | css/stylesheet.ts:584-616, 738-752, 925-948 | |
| V-C08-161 | 32 | Other sites, text, code samples, comments, scripts, `<template>` untouched; `integrity` link to a `public/` file kept; such a link to the Tailwind output stops the build | B | ✅ | css/stylesheet.ts:113, 750-752, 763-820; core/build.ts:958-967 | |
| V-C08-162 | 33 | Hash is the start of the SHA-256; folder kept under `_assets/` | B | ✅ | css/stylesheet.ts:122-176 (hash of the rebased CSS, 8 uppercase hex) | |
| V-C08-163 | 34 | Relative `url()` and `@import` strings rebased to root paths; escapes handled; comments and other strings untouched | B | ✅ | css/stylesheet.ts:312-380; tested `url(img/a.png)` → `url(/img/a.png)` | |
| V-C08-164 | 35-36 | Cached pages relinked without re-render; removed stylesheet back to its own path; added one gets its copy; older hashed files deleted | B | ✅ | core/build.ts:1512-1573, 1634-1649; css/stylesheet.ts:476-553 | |
| V-C08-165 | 38 | Development keeps own names; first hashing build re-renders every page | B | ✅ | css/config.ts:63-72; core/build.ts:800-802 (`hashedStylesheets` in render inputs) | |
| V-C08-166 | 42-48 | Public stylesheet linked by a page gets a copy; original still copied; import-only files keep their name; Tailwind output reference stops the build; unlinked gets no copy; not minified; unsafe characters keep the name | B | ✅ | css/static.ts:43-83; css/stylesheet.ts:74, 149-153 | |
| V-C08-167 | 52-65 | Sass scripts; `public/styles.css` gitignored; dev copies and reloads | B | ✅ | packages/create-stati/src/sass-processor.ts:47-53; AGENTS.md (dev watches `public/`) | |
| V-C08-168 | 71-87 | Flags in both commands; output must be `.css` inside `outDir` with safe characters; `public/` file at that path never copied, with a warning; `stati build` errors with one flag; Tailwind 4 vs 3 packages; auto-injected link unless the page links the path; preload/comment/script don't count | L | ✅ | packages/cli/src/cli.ts:70-81 (`implies`; tested "Missing dependent arguments"); css/stylesheet.ts:190-231, 729-732, 960-973; core/build.ts:1164-1177; css/tailwind.ts:15 | |
| V-C08-169 | 91-104 | Production steps; Tailwind with `--minify`; pages written after `afterRender`; Tailwind failure leaves previous pages and stylesheet; `dist/styles.css` from dev stays; references that aren't rewritten load nothing; `css.hash: false` keeps the name | B | ✅ | core/build.ts:1275-1280, 1457-1510, 762, 1077-1083; css/stylesheet.ts:241-255, 417-450, 545-553; tested in `work/C08/t2` | |
| V-C08-170 | 96 | "the build holds the pages it renders in memory until then" | B | ⚠️ L | Past 64 M characters of HTML it stages them in `.stati/pending-pages/` (core/build.ts:200-201, 1038-1050; constants.ts:153) | old: "so the build holds the pages it renders in memory until then, with `css.hash: false` too," → new: "so the build holds the pages it renders until then (in memory, or in `.stati/pending-pages/` for a very large site), with `css.hash: false` too," |
| V-C08-171 | 108-119 | Added link at the end of `<head>`; `css.autoInject: false`; `stati.assets.stylesheetPaths` value per mode; print it unchanged or through `stati.url()` | A | ⚠️ L | Behavior ✅ (css/stylesheet.ts:960-973; core/build.ts:729, 1501). But during rendering a hashed build's `stylesheetPaths` holds a placeholder (`/_assets/styles-pending-<random>.css`, css/stylesheet.ts:278-283) that the build replaces on write; "is `['/_assets/styles-A1B2C3D4.css']` in production" describes the written page, not what the template sees | old: "`stati.assets.stylesheetPaths` is `['/styles.css']` in development and `['/_assets/styles-A1B2C3D4.css']` in production, and an empty array without the Tailwind flags." → new: "`stati.assets.stylesheetPaths` is `['/styles.css']` in development, and an empty array without the Tailwind flags. In production it holds a temporary path that becomes `/_assets/styles-A1B2C3D4.css` when the page is written." |
| V-C08-172 | 136-142, 146-155, 159-177 | Options table and defaults; validation; `_headers` sample; dev watcher and outputs outside `outDir`; moving from `build:css` | G | ✅ | css/config.ts:16-72; config/loader.ts:308-318; core/dev.ts:500-512; typescript `outDir` default `_assets` (AGENTS.md). Note line 177 "The first build renders every page again" holds for the Tailwind move (core/build.ts:800); a Sass move relinks cached pages instead (core/build.ts:1549-1552). Minor, left as is. | |

### Gaps

- Files deleted from `public/` stay in `dist/` until `stati build --clean`: nothing prunes static copies (tested in `work/C08/t2`: `public/old.txt` removed, `dist/old.txt` kept; core/isg/prune.ts only touches manifest-recorded `.html`). Belongs in static-assets.md under `public/`.
- A file in `public/` at the same path as a page's output (`public/about.html`) or the search index replaces it, because the static copy runs after pages are written (core/build.ts:1575-1577, 1663-1667). static-assets.md line 28 covers only `robots.txt` and `sitemap.xml`.
- Hooks may be synchronous (types/config.ts:563-569), and in `stati dev` all four hooks run on every rebuild, `beforeAll`/`afterAll` with every page (core/dev.ts calls `build()`). hooks.md shows only async hooks and doesn't mention dev rebuilds.
- Invalid ISG front matter (`tags` not a list of strings, non-integer `ttlSeconds`/`maxAgeCapDays`) stops the build (V-C08-101). Not documented anywhere in this cluster.
- `stati dev` with only one of `--tailwind-input`/`--tailwind-output` silently starts no watcher and links nothing (packages/cli/src/cli.ts:227-230, 261), while `stati build` errors. css.md line 85 mentions only build.
- Programmatic `invalidate()` works on `.stati/` in the current working directory (core/invalidate.ts:211). Folded into V-C08-047.

### Terminology

- "front matter" is used throughout the cluster except api/error-handling.md:139 "Frontmatter under `stati.page`". Use "Front matter".
- "partial(s)" for included templates: api/error-handling.md:350 ("footer partial"), core-concepts/static-assets.md:265 ("layouts and partials"). Other pages say "included templates" or "templates rendered by `stati.include()`".
- Cache naming varies: "ISG cache" (css.md:35), "cache manifest" / "manifest", "incremental cache" (cli/development.md:34), "build cache" (page description of core-concepts/isg.md: "build caching"). Suggest "the ISG cache" for the concept and "the cache manifest (`.stati/manifest.json`)" for the file.
- "development server" vs "dev server": both in error-handling.md (527, 534) and static-assets.md (216, 239); the rest of the cluster says "dev server".
- "Tailwind output" vs "Tailwind stylesheet" vs "the stylesheet Stati builds with Tailwind" in css.md; fine as long as each page sticks to one.
- configuration/isg.md uses Title Case bold labels ("**News Site (Keep Recent Content Fresh):**", "**Appropriate TTL**") unlike the sentence case elsewhere; mostly removed by the ✂️ items.

### Cross-cluster

- docs-site/site/configuration/file.md:28, docs-site/site/cli/commands.md:347, docs-site/site/advanced/troubleshooting.md:14: list load-time validation as only `isg`, `images`, unknown options and `helpers` (file.md adds `outDir`). Missing `css`, `readingTime`, `seo`, `sitemap.news` (config/loader.ts:272-333). Same fix as V-C08-098.
- docs-site/site/api/types.md:557: `AgingRule.untilDays` comment "Number of days after which this aging rule applies" is backwards: the rule applies to pages up to that age (core/isg/ttl.ts:219-224). Copied from packages/core/src/types/isg.ts:12, 18, whose JSDoc also says "for content older than 7 days". types/isg.ts:157 says the manifest is `.stati/cache/manifest.json` (it is `.stati/manifest.json`) and :171 says entries are keyed by page URLs (they are output paths such as `/blog.html`). Owner C05 for the doc; the JSDoc is source.
- .claude/skills/stati/references/configuration.md:39: loader default `site.title` is `Stati Site`; source is `My Stati Site` (packages/core/src/constants.ts:121).
- docs-site/site/cli/commands.md:93-94: `stati dev` flag descriptions don't say that one flag without the other does nothing (see Gaps).

### Phase 5 log

Scratch re-runs: `work/C08/t1` (node_modules now a junction to the repo-root `node_modules`; the Phase 4 copy failed with `ERR_MODULE_NOT_FOUND` for configs that import `@stati/core`, which the Phase 4 tests did not do), `work/C08/t2`, new `work/C08/t3` (base path).

core-concepts/isg.md
- V-C08-001: applied
- V-C08-002: applied
- V-C08-011: applied (Upgrading section cut; line 91 now says "such as one an older Stati release wrote")
- V-C08-016: applied (pointer section `## Configuration`)
- V-C08-019: applied (pointer section `## Invalidation`; programmatic call moved to configuration/isg.md; age format cut)
- V-C08-021: applied
- V-C08-024: applied (`### Development experience` kept as `## Development`, intro shortened to "In `stati dev`:")
- V-C08-026: applied
- V-C08-027: applied, re-checked against packages/core/src/images/manifest.ts:2
- V-C08-029: applied (D10); the "ephemeral filesystems" sentence after the CI block cut as well, it repeated the new sentence
- V-C08-033: applied
- V-C08-055 (core part): applied (`images` field sentence added to line 91)

configuration/isg.md
- V-C08-034: applied
- V-C08-040, 041, 044, 046, 050, 059, 062, 065: applied
- V-C08-047: applied (programmatic `invalidate()`), re-checked against core/invalidate.ts:210-211 and core/utils/paths.utils.ts:46-48
- V-C08-052: applied, re-checked against core/build.ts:1283-1289
- V-C08-054: applied by V-C08-055 (field list removed); the tags fact lives in V-C08-061
- V-C08-055: applied (list replaced by a link to `/core-concepts/isg#cache-manifest`)
- V-C08-057: applied (render inputs wording), re-checked against core/build.ts:789-829; the optional "no layout" addition left out
- V-C08-061: applied, re-checked against core/isg/builder.ts:139-151 and core/isg/validation.ts:301-323
- V-C08-063: applied (section deleted with V-C08-062), re-checked against core/build.ts:834-838

api/hooks.md
- V-C08-066: applied, plus approved gaps: hooks may be synchronous (types/config.ts:563-569 allow `Promise<void> | void`) and the dev server runs them on every rebuild (core/dev.ts:110, 243 call `build()`)
- V-C08-072: applied
- V-C08-077: applied, re-checked against core/build.ts:851-892; new example run in `work/C08/t1` (warning printed, cache stable)
- V-C08-079: applied, re-checked against core/build.ts:669, 795
- V-C08-082: applied
- V-C08-083: applied (D9), re-checked against core/build.ts:652-656; run in `work/C08/t1`: "Cache: 1/2" on the first build after adding the hook, then "2/2"
- V-C08-084, 085, 088, 091: applied
- C01 cross-cluster (hooks.md:122-131, :226-236 `beforeRender` changing front matter): applied as V-C08-077 and V-C08-083

api/error-handling.md
- V-C08-092: applied
- V-C08-098: applied, re-checked against config/loader.ts:241-347, css/config.ts:33-54, core/reading-time.ts:34-50, seo/defaults.ts:399-450, seo/news-sitemap.ts:67-80, images/config.ts:89-215, config/directories.ts:65-80; same facts as C05's file.md fix; tested `css: { hsh }`, `outDir: 'site'`, `seo: { twitter: { x } }` (stop) and `search: { nope }` (ignored)
- V-C08-101: applied (approved gap), re-checked against core/isg/validation.ts:265-323, core/isg/builder.ts:408
- V-C08-104: applied, re-checked against core/template-render.ts:476-487, core/dev.ts:541-605
- V-C08-107, 114, 115, 120, 122, 125, 126, 127, 132, 133: applied
- V-C08-111/112: applied (`## Error names` table; link at line 30 changed from `#isg-configuration-errors` to `#error-names`), names re-checked against config/errors.ts:8, core/utils/front-matter.utils.ts:37, core/utils/template-errors.utils.ts:30, core/isg/validation.ts:27, core/utils/bundle-matching.utils.ts:19, config/loader.ts:248
- V-C08-121: applied, re-checked against config/loader.ts:371-372
- V-C08-123, 124: applied (merged into "1. Validate configuration"; "4. Use consistent front matter" renumbered to 2)
- V-C08-129: applied
- V-C08-131: applied, re-checked against core/build.ts:1283-1289
- D6: "Frontmatter" → "Front matter" at the unknown-properties list

core-concepts/static-assets.md
- V-C08-135, 139, 141, 149, 151, 153, 157, 158: applied
- Gap (public file at a page's output path replaces the page): applied, re-checked against core/build.ts:1575-1577, 1663-1667
- Gap (files deleted from `public/` stay in `dist/` until `--clean`): applied, tested in `work/C08/t2`
- D7: the stylesheet link and the art-direction `<picture>` example use `stati.url()`
- D6: "layouts and partials" → "layouts and included templates"

configuration/css.md
- V-C08-170: applied, re-checked against core/build.ts:200-201, 1038-1050; constants.ts:153
- V-C08-171: applied (also notes `css.hash: false`), re-checked against css/stylesheet.ts:278-283, core/build.ts:729, 1501
- Gap (`stati dev` with one Tailwind flag starts no watcher): applied, re-checked against packages/cli/src/cli.ts:227-230, 261 (no `implies` on dev)
- C03 cross-cluster (bare `/styles.css` link on a base-path site): applied (first example uses `stati.url('/styles.css')` in an `eta` fence, plus one sentence), tested in `work/C08/t3`: `stati.url('/a.css')` became `/docs/_assets/a-2708D73B.css`, `/b.css` stayed and the build warned

Other cross-cluster items
- C05 (configuration/isg.md aging wording, V-C05-084): left, the page already says rules apply "up to" `untilDays` (matches core/isg/ttl.ts:219-224)
- C06 V-C06-095 (api/seo.md links to core-concepts/isg.md for SEO content): left, nothing to change in core-concepts/isg.md; the link is in C06's file
- C05/C10 (types/isg.ts JSDoc): left, source code (H9)

Anchors: no heading that another file links to was removed. Kept: `core-concepts/isg#dependency-tracking`, `#removing-pages-that-no-longer-exist`, `#cache-manifest`; `configuration/isg#template-dependency-tracking`, `#cache-invalidation`; `api/error-handling#error-overlay`, `#unknown-template-properties`; `core-concepts/static-assets#tailwind-css-integration`; all `configuration/css` anchors.

Count: 67 finding items applied (12 ❌, 47 ✂️, 8 ⚠️), 5 approved gaps applied, 2 cross-cluster items applied (C01, C03), 1 D6 pass item each in error-handling.md and static-assets.md; 0 rejected; left: V-C08-057 optional sub-fix, V-C08-172 note, 3 cross-cluster items (no change needed or source code).

## C09 findings

Summary: 136 claims; ✅ 88, ❌ 16 (H 0, M 7, L 9), ⚠️ 14, ✂️ 18. (V-C09-105 and V-C09-113 are ✅ claims that also carry a ✂️ wording fix.)

Method notes:

- Homepage TypeScript snippets: `npm run check:snippets` in `docs-site` passes, but `docs-site/node_modules/@stati/core` is the published 2.3.0, not the source. I re-ran the same script against the local core 2.8.0 (copy in `work/C09/snip`, junction to `packages/core`): all 4 snippets type-check.
- The README and core README `defineConfig(...)` blocks were extracted and type-checked against local core 2.8.0 (`work/C09/snip/readme`): all pass, apart from two core README fragments that leave out `site` (excerpts, not an error).
- The introduction's two-file site was built with the local CLI (`work/C09/two`): `dist/hello.html` as described. The core README quick example (config + `site/index.md`, no layout) builds with the warning `No layout template found, using fallback` (`work/C09/nolayout`).
- A zero-config build writes `canonical` and `og:url` as `http://localhost:3000/...` (default `site.baseUrl`, `packages/core/src/config/loader.ts:55-68`, `constants.ts:51`), seen in `work/C09/two/dist/hello.html`.
- `npm view stati`: an unrelated package `stati` 0.0.1 ("Static blog generator") exists, so the introduction's `npx stati` warning is right.

### README.md

Covers: whole system at summary level; `packages/create-stati/src/index.ts`, `packages/cli/src/cli.ts`, `packages/core/src/{config/loader.ts,core/invalidate.ts,core/isg/*,seo/*,core/expand.ts}`

| ID | Line | Claim | Cat | Status | Evidence | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| V-C09-001 | 19 | "Create a site in under 2 minutes" | V | ⚠️ | Unverifiable (depends on install time) | old: "**Fast Setup** - Create a site in under 2 minutes with `npx create-stati`" → new: "**Fast Setup** - Create a site with `npx create-stati`" |
| V-C09-002 | 31-38 | `npx create-stati my-site`, `npm run dev`, site at `http://localhost:3000` with live reload, edit `site/index.md` | X | ✅ | packages/core/src/constants.ts:42; packages/core/src/core/dev.ts:517-526; examples/blank/package.json (`dev: stati dev`); examples/blank/site/index.md | |
| V-C09-003 | 46-54 | Tree: `site/`, `public/`, `src/` created unless `--no-typescript`, optional `stati.config.js` (or `.ts`) | B | ✅ | packages/create-stati/src/index.ts:91-98,253-260 (TS default true); typescript-processor.ts:24-37 (`src/main.ts`); create.ts:211-219; loader.ts:183-185 (no config → defaults) | |
| V-C09-004 | 67-70 | `site/index.md` → `/`, `site/blog/hello.md` → `/blog/hello` (`dist/blog/hello.html`), `site/about.md` → `/about` | B | ✅ | packages/core/src/core/content.ts:94-111; core/utils/paths.utils.ts:227-232 | |
| V-C09-005 | 94-112 | Shell `site/base.eta` with `stati.include()` and `stati.body`; `site/layout.eta` with `<% stati.layout('base') %>` and `stati.content` | X | ✅ | packages/core/src/types/content.ts:559-572; .claude/skills/stati/references/eta.md:263-290 | |
| V-C09-006 | 116-120 | ISG: only changed pages plus the listings that show them; deleted posts and unused tag pages removed; TTL; tag invalidation | B | ✅ | core/collections.ts:299-311 (listing summary hash); core/isg/prune.ts; core/isg/ttl.ts:80-99; core/invalidate.ts:91-92 | |
| V-C09-007 | 122-131 | `stati invalidate "tag:news"`, `"path:/blog/2024/"`, `"age:3months"`; comment "Invalidate by age" | L | ⚠️ L | core/invalidate.ts:94-104,134-185: `age:` matches entries **rendered within** the period (`renderedAt >= cutoff`), not old content. The bare comment invites the opposite reading | old: "# Invalidate by age" → new: "# Invalidate pages rendered within the last 3 months" |
| V-C09-008 | 135-151 | Folder with `index.md` is a collection read as `stati.collection`; `paginate: 10` gives `/blog/page/2`; `[tag].md` with `title: 'Posts tagged {tag}'` and `generate.from: tags` | X | ✅ | core/collections.ts:64-99; types/content.ts:147-152 (path default `page`); core/expand.ts:70-78 (`{tag}` placeholder), 402-413 (`from` required) | |
| V-C09-009 | 155 | "SEO optimization works automatically with zero configuration. Stati analyzes your pages and injects SEO metadata during build." | B | ❌ M | Tags are injected by default (seo/auto-inject.ts:71), but with no `site.baseUrl` the canonical and `og:url` point at `http://localhost:3000` (config/loader.ts:55-68; verified in a zero-config build). "Analyzes" is promotional | old: "SEO optimization works automatically with zero configuration. Stati analyzes your pages and injects SEO metadata during build." → new: "Stati injects SEO metadata into every page during the build. Set `site.baseUrl` so canonical and Open Graph URLs point at your domain." |
| V-C09-010 | 157-163 | Default tags: title, description, keywords; Open Graph with `og:locale` from `site.defaultLocale`; Twitter `site`/`creator` from config handles; article tags on `seo.articles` pages; JSON-LD from front matter; 404 `noindex` and exclusions | B | ✅ | seo/generator.ts:95-158; seo/defaults.ts:107-160,211-213; types/config.ts:223-237; AGENTS.md:34 (404 handling) | |
| V-C09-011 | 165 | Sitemap and robots.txt each enabled with one option | G | ✅ | core/build.ts:1692,1730 (`enabled`, production only) | |
| V-C09-012 | 171-177 | `--styling=tailwind`; plain CSS, Sass, Tailwind | L | ✅ | packages/create-stati/src/index.ts:87-90,233-245 | |
| V-C09-013 | 183-199 | `npm run dev -- --port 8080 --open`, `npx stati build --clean --force`, `npm run preview`, invalidate queries | L | ✅ | packages/cli/src/cli.ts:43-54 (build flags), 197-207 (dev `--port`, `--open`); examples/blank/package.json scripts | |
| V-C09-014 | 205, 220-223 | Works with zero configuration; defaults: ISG 6-hour TTL, SEO auto-injection, Markdown | G | ✅ | config/loader.ts:55-68,183-185; constants.ts:56; seo/auto-inject.ts:71 | |
| V-C09-015 | 229-327 | Extended configuration example (every option and the defaults in comments) | X | ✅ | Type-checks against local core (work/C09/snip/readme); constants.ts:9-15,42-48,56,59,129,138; core/utils/typescript.utils.ts:102-104 | |
| V-C09-016 | 264 | `maxAgeCapDays: 30, // Max age for aging rules (default: 365)` | G | ❌ M | `maxAgeCapDays` is the age past which a dated page stops rebuilding on its TTL ("frozen"): core/isg/ttl.ts:125-141, core/isg/builder.ts:289-292. It does not bound the rules, though the loader rejects rules beyond it (core/isg/validation.ts:171-178) | old: "maxAgeCapDays: 30,        // Max age for aging rules (default: 365)" → new: "maxAgeCapDays: 30,        // Dated pages older than this stop rebuilding on TTL (default: 365)" |
| V-C09-017 | 267 | `{ untilDays: 30, ttlSeconds: 604800 }, // up to 30 days old (and older): 1 week` | G | ❌ L | With `maxAgeCapDays: 30` in the same block, pages older than 30 days never rebuild on TTL (ttl.ts:130-141), so "(and older)" never applies | old: "// up to 30 days old (and older): 1 week" → new: "// up to 30 days old: 1 week" |
| V-C09-018 | 276-281 | `defaultAuthor.url` → `article:author`, `twitter` → `twitter:creator`, `twitter.site`, `articles.include`, `debug` | G | ✅ | seo/defaults.ts:158-160,211-213; types/config.ts:223-250 | |
| V-C09-019 | 340-355 | Blog post front matter with `seo.keywords` and `seo.openGraph.image` string | X | ✅ | types/content.ts:199,274 | |
| V-C09-020 | 359-374 | Custom blog layout printing `<time><%= stati.page.date %></time>` | X | ⚠️ L | YAML reads an unquoted `date: 2024-01-15` as a `Date` (core/utils/front-matter.utils.ts:130, default schema), so the layout prints `Mon Jan 15 2024 01:00:00 GMT+0100 ...` | old: "<time><%= stati.page.date %></time>" → new: "<time><%= stati.helpers.formatDate(stati.page.date) %></time>" (the extended config above defines `formatDate`) |
| V-C09-021 | 380-385, 332, 486-487 | Links to `https://stati.build/.../` with trailing slashes | R | ✅ | `curl` returns 301 to the slashless URL, which resolves. Optional L: drop the trailing slash to skip the redirect | |
| V-C09-022 | 389-394 | Context7 indexes the docs site and package READMEs via `context7.json` | R | ✅ | context7.json:6-12 | |
| V-C09-023 | 398-426 | Agent skill: `create-stati --agent-skill`, `npx skills add/update`, `skills-lock.json`, `.claude/skills` vs `-a universal`, telemetry env vars | L | ✅ | packages/create-stati/src/index.ts:111-136; .claude/skills/stati/references/installation.md:29-62; .claude/skills/stati/scripts/smoke-test.mjs exists | |
| V-C09-024 | 436-442 | Monorepo packages; "Each package can be used independently or together for the complete Stati experience." | B | ⚠️ L | `@stati/cli` and `@stati/images` both need `@stati/core` (packages/cli/package.json deps; AGENTS.md:15) | delete "Each package can be used independently or together for the complete Stati experience." |
| V-C09-025 | 448-451 | Node 22.20+ on 22.x or 24+; npm, pnpm, yarn or bun; contributors need npm 11.5.1+ | B | ✅ | package.json:66-69; packages/core/package.json engines; packages/create-stati/src/create.ts:27 | |
| V-C09-026 | 465-473 | Philosophy section | V | ✂️ | No information; "Speed by default - Fast builds, fast development, fast sites" is unverifiable. README filler | delete the "## Philosophy" section (lines 465-475) |
| V-C09-027 | 490-494 | "Ready to build something?" `npx create-stati my-awesome-site` | V | ✂️ | Repeats Quick Start (line 31) | delete lines 490-494 |

### packages/core/README.md

Covers: `packages/core/src/index.ts`, `core/{build,dev,preview,invalidate}.ts`, `config/loader.ts`, `env.ts`, `core/markdown.ts`, `core/isg/*`, `types/*`

| ID | Line | Claim | Cat | Status | Evidence | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| V-C09-028 | 13-30 | `npx create-stati`, `npm install @stati/core` | L | ✅ | packages/create-stati/src/index.ts; packages/core/package.json | |
| V-C09-029 | 38-80 | Quick example: config, `site/index.md`, `createDevServer({ port, open })` + `start()`, `setEnv('production')` + `build({ clean: true })` | X | ✅ | Built (work/C09/nolayout); index.ts:112,169; core/dev.ts:494; core/build.ts:345 | |
| V-C09-030 | 75 | "build() alone runs a development build" | B | ⚠️ L | The environment starts as `process.env.NODE_ENV` or `development` (packages/core/src/env.ts:3) | old: "(build() alone runs a development build)" → new: "(build() alone runs a development build unless NODE_ENV is production)" |
| V-C09-031 | 84 | "That's it! Your site is ready." | V | ✂️ | With no `site/layout.eta` the build warns `No layout template found, using fallback` and writes Stati's fallback page (work/C09/nolayout) | old: "That's it! Your site is ready." → new: "Add `site/layout.eta` to shape the page; without one Stati writes a basic fallback page and warns." |
| V-C09-032 | 92-103 | "Why Choose" bullets; "Extensible Hooks - Customize every stage of the build" | B | ❌ L | Four hooks: before/after the build and before/after each rendered page (types/config.ts:561-570) | old: "**Extensible Hooks** - Customize every stage of the build" → new: "**Build Hooks** - Run code before and after the build and each rendered page" |
| V-C09-033 | 113-128 | Project layout, workflow, deploy anywhere | B | ✅ | content.ts:94-111; static output | |
| V-C09-034 | 136-163 | Markdown front matter and layout examples | X | ✅ | types/content.ts:559 (`stati.content`) | |
| V-C09-035 | 169-185 | ISG: hashes of content, templates, collection and navigation data read; removal of deleted pages; TTL; `invalidate('tag:blog')`, `'path:/posts'`, `'age:3months'` (rendered within) | A | ✅ | core/isg/builder.ts:266-287; core/collections.ts:299-311; AGENTS.md:165-166; core/isg/prune.ts; core/invalidate.ts:80-112,134-185 | |
| V-C09-036 | 189 | Collections sorted by date and grouped by tag, `paginate`, `[tag].md`, `stati.pagination`, `stati.generated` | B | ✅ | types/content.ts:472-492,600-604 | |
| V-C09-037 | 193 | "SEO optimization works automatically with zero configuration" | B | ❌ M | Same as V-C09-009: without `site.baseUrl` canonical and `og:url` point at `http://localhost:3000` | old: "SEO optimization works automatically with zero configuration:" → new: "Stati injects SEO metadata into every page by default. Set `site.baseUrl` so canonical and Open Graph URLs point at your domain:" |
| V-C09-038 | 195-202 | Default SEO tags; sitemap/robots with one option | B | ✅ | as V-C09-010, V-C09-011 | |
| V-C09-039 | 206 vs 231 | Heading "Complete Configuration Reference", body "This is **not a complete list**" | V | ❌ L | Contradiction on the page | old: "## Complete Configuration Reference" → new: "## Configuration" |
| V-C09-040 | 223-227 | Defaults: ISG 6-hour TTL, SEO auto-injection | G | ✅ | constants.ts:56; seo/auto-inject.ts:71 | |
| V-C09-041 | 233-346 | Extended configuration (robots `crawlDelay`, `customLines`; preview defaults; hooks) | X | ✅ | Type-checks against local core; types/config.ts:467-499,514-570; constants.ts:42-48 | |
| V-C09-042 | 255-262 | `configure: (md) => { md.set({ html: true, linkify: true, typographer: true }) }` | X | ❌ L | Stati already creates markdown-it with exactly these options (core/markdown.ts:66-70), so the example changes nothing | old: "md.set({\n        html: true,\n        linkify: true,\n        typographer: true,\n      });" → new: "md.set({ breaks: true }); // Turn single line breaks into <br>" |
| V-C09-043 | 273 | `maxAgeCapDays: 30, // Max age for aging rules (default: 365)` | G | ❌ M | Same as V-C09-016 | same fix as V-C09-016 |
| V-C09-044 | 276 | `// up to 30 days old (and older): 1 week` | G | ❌ L | Same as V-C09-017 | old: "// up to 30 days old (and older): 1 week" → new: "// up to 30 days old: 1 week" |
| V-C09-045 | 356-371 | `build(options?: BuildOptions): Promise<BuildResult>`; options `force`, `clean`, `includeDrafts`, `configPath` (directory only), `metrics`, `logger` | T | ✅ | core/build.ts:156-187,345,377 | |
| V-C09-046 | 365 | `clean?: boolean; // Clean output directory before build` | T | ❌ L | Also deletes the `.stati` cache (core/build.ts:1283-1289; CLI help "Clean cache before building", cli.ts:47-50) | old: "clean?: boolean;        // Clean output directory before build" → new: "clean?: boolean;        // Delete the output directory and the .stati cache first" |
| V-C09-047 | 362-371 | BuildOptions list | T | ⚠️ L | Leaves out `tailwind?: { input, output }` (core/build.ts:179-186), the programmatic form of `--tailwind-input`/`--tailwind-output` | add line: "tailwind?: TailwindBuildOptions; // Tailwind input and output, as --tailwind-input/--tailwind-output" |
| V-C09-048 | 358 | Default environment; sitemap, robots.txt and RSS only in production | B | ✅ | env.ts:3; core/build.ts:1692,1730,1757 (see V-C09-030 for NODE_ENV) | |
| V-C09-049 | 375-388 | Example; returns `totalPages`, `assetsCount`, `buildTimeMs`, `outputSizeBytes`, `cacheHits`, `cacheMisses`, `buildMetrics` | T | ✅ | types/config.ts:588-601; core/build.ts:206-209 | |
| V-C09-050 | 392-423 | `createDevServer(options?): Promise<DevServer>`; `port` 3000, `host` localhost, `open` false, `logger`; config from cwd; `start()`, `stop()`, `url` | T | ✅ | core/dev.ts:56-75,494,517-526; constants.ts:42,48 | |
| V-C09-051 | 398-405 | DevServerOptions list | T | ⚠️ L | Leaves out `tailwind` (core/dev.ts:61-65) | add line: "tailwind?: TailwindBuildOptions; // Tailwind input and output the dev watcher uses" |
| V-C09-052 | 427-465 | `createPreviewServer` options (4000, localhost, false), config from cwd, serves `dist/`, no live reload | T | ✅ | core/preview.ts:22-31,42-47,60; constants.ts:45 | |
| V-C09-053 | 469-502 | `invalidate(query?)`: `tag:`, `path:` prefix of output-path key (`/posts/hello.html`), `glob:` whole key, `age:` rendered within, none clears all, OR logic, returns count | A | ✅ | core/invalidate.ts:8-15,80-112,205-275; core/build.ts:591-604 (cache key) | |
| V-C09-054 | 506-540 | `defineConfig(config): StatiConfig`; `loadConfig(cwd?): Promise<StatiConfig>` | A | ✅ | packages/core/src/index.ts:207-209; config/loader.ts:172 | |
| V-C09-055 | 548-576 | Exported types list | T | ✅ | packages/core/src/index.ts:23-111 | |
| V-C09-056 | 578-579 | "Template and cache types are only exported from the types entry point" (`TemplateContext`, `CacheManifest`) | T | ❌ M | `TemplateContext` is exported from `@stati/core` (packages/core/src/index.ts:27); only `CacheManifest` needs `@stati/core/types` (types/index.ts:7, not re-exported in index.ts) | old: "// Template and cache types are only exported from the types entry point\nimport type { TemplateContext, CacheManifest } from '@stati/core/types';" → new: "// Cache types are only exported from the types entry point\nimport type { CacheManifest } from '@stati/core/types';" and add `TemplateContext,` to the list above (under "// Pages") |
| V-C09-057 | 592-596 | Front matter YAML or JSON (`---json`); any markdown-it 15 plugin; `language-*` classes; drafts | B | ✅ | core/utils/front-matter.utils.ts:128-140; packages/core/package.json (`markdown-it ^15`); core/markdown.ts:66 (default fence renderer) | |
| V-C09-058 | 600-610, 719 | Plugin examples `'footnote'`, `['abbr', ...]`, `'container'` | X | ⚠️ L | Stati loads `markdown-it-<name>` from the project (core/markdown.ts:39-51) and only warns when it is missing; the examples never say to install them | after the "Example with plugins" code block add: "Install each plugin first, such as `npm install markdown-it-footnote`; Stati loads `markdown-it-<name>` from your project." |
| V-C09-059 | 616-639 | Template bullets and example | B | ✅ | types/content.ts:545-639; template-index.ts:477-527 | |
| V-C09-060 | 643-666 | Navigation: tree from folders, breadcrumbs, `order`, `stati.nav.getBreadcrumbs()`, `stati.nav.tree` | A | ✅ | types/content.ts:576-595; types/navigation.ts:28-43 | |
| V-C09-061 | 672-676 | WebSocket live reload, rebuilds, error overlay, `public/`, source maps | B | ✅ | core/dev.ts (ws); core/utils/typescript.utils.ts:422-424 | |
| V-C09-062 | 678-701 | "Caching & Performance" section | V | ✂️ | Repeats the ISG section (lines 165-185) and the aging example of the extended config; "lightning-fast" is promotional; line 697 "Older content also uses the last rule" ignores the default 365-day cap (ttl.ts:130-141) | delete lines 678-701 |
| V-C09-063 | 707-760 | Use cases configs | X | ✅ | Type-check against local core | |
| V-C09-064 | 737 | `{ untilDays: 365, ttlSeconds: 86400 }, // up to a year old (and older): 1 day` | G | ❌ L | Default `maxAgeCapDays` is 365 (constants.ts:59), so older pages stop rebuilding on TTL | old: "// up to a year old (and older): 1 day" → new: "// up to a year old: 1 day" |
| V-C09-065 | 766-767 | Node `^22.20.0 \|\| >=24`; package managers | B | ✅ | packages/core/package.json engines | |
| V-C09-066 | 781-815 | Philosophy, Support & Community (repeats Learn More's docs link), closing CTA | V | ✂️ | Philosophy is filler; the CTA repeats Getting Started | delete "## Philosophy" (781-791) and the closing "Ready to build?" block (807-815); drop the "Documentation" bullet from Support & Community |

### docs-site/site/index.md (homepage) and home partials

Covers: everything at summary level; `docs-site/stati.config.ts`; `packages/create-stati/src/index.ts`; `core/isg/ttl.ts`; `docs-site/site/home.eta`, `partials/home/*.eta`

| ID | Line | Claim | Cat | Status | Evidence | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| V-C09-067 | 2-3 | Title and description: Markdown and Eta in, static HTML out, search, sitemaps, RSS, SEO, incremental rebuilds built in | B | ✅ | search/, seo/, rss/, core/isg/ | |
| V-C09-068 | 6-27 | Structured data: Node 22.20+ or 24+, npm packages, MIT | B | ✅ | package.json engines; LICENSE | |
| V-C09-069 | 31 | Hero lede | B | ✅ | as above | |
| V-C09-070 | 34-36 | Specs: no client runtime, Node 22.20+ or 24+, MIT | B | ✅ | Production pages carry only the bundles the config names (core/utils/bundle-matching.utils.ts:86-88); the live reload script is dev only | |
| V-C09-071 | 37-55 | Hero config: `typescript.bundles` with `include: ['/docs/**']`, `isg`, `search`, `sitemap` | X | ✅ | Type-checks against local core 2.8.0; bundle-matching.utils.ts:86-88 | |
| V-C09-072 | 59 | "Every feature below ships in Stati’s own packages and is documented here. Most switch on with one line in a typed config file. No plugin hunting, no glue code." | V | ✂️ | "No plugin hunting, no glue code" is promotional; the Agent skill item is installed from the GitHub repo by the `skills` CLI, not from a package (AGENTS.md:20) | old: "Every feature below ships in Stati’s own packages and is documented here. Most switch on with one line in a typed config file. No plugin hunting, no glue code." → new: "Every feature below is part of Stati and documented here. Most switch on with one line in a typed config file." |
| V-C09-073 | 63-102 | Write group: Markdown pipeline (plugins, anchors, TOC, sized lazy images), front matter (titles, tags, drafts, layouts, permalinks), layouts by folder in one shared page, includes overridable per section, collections (current listings, pagination, page per tag), routing with permalinks, navigation helpers, config helpers | B | ✅ | core/markdown.ts:56-104,134-186; images/markdown-rule.ts; content.ts:60-63,104-107; template-index.ts:477-527; collections.ts; expand.ts; types/content.ts:576-595; loader.ts:111-140 | |
| V-C09-074 | 80 | Includes: "Reusable templates with props and children" | B | ⚠️ L | The third argument is called the body (`stati.body`, types/content.ts:560-566); "children" is used nowhere else | old: "Reusable templates with props and children, overridable per section." → new: "Reusable templates with props and a body, overridable per section." |
| V-C09-075 | 105-144 | Build group: typed config, esbuild bundles hashed/minified/injected per page, ISG TTLs and aging, invalidation by tag/path/age from CLI or API, hooks, Tailwind or Sass at scaffold with Stati running Tailwind, programmatic API, metrics JSON/HTML | B | ✅ | index.ts:207; typescript.utils.ts:102-104; ttl.ts; invalidate.ts; types/config.ts:561-570; cli.ts:70-81; create-stati css-processors.ts; index.ts:112; cli.ts:55-69 | |
| V-C09-076 | 147-186 | Publish group: search index, sitemap priorities/filters/indexes, per-agent robots rules, RSS item mapping, SEO meta/OG/Twitter/JSON-LD, AVIF/WebP via `@stati/images`, OG image from an Eta template, `public/` copied | B | ✅ | search/; seo/sitemap.ts:27,346-420 (index past 50,000 entries); types/config.ts:467-499; rss/; seo/generator.ts; images/config.ts:52; packages/images/src/og/defaults.ts:19 (built-in card is `templates/og.eta`) | |
| V-C09-077 | 189-217 | Develop group: dev server, error overlay, preview, scaffolder, four starters, agent skill | B | ✅ | core/dev.ts; core/utils/error-overlay.utils.ts; core/preview.ts; create-stati/src/index.ts:202-230,275-288 | |
| V-C09-078 | features.eta:43 | "N features across @stati/core, @stati/cli, create-stati and the optional @stati/images" | B | ✅ | Count computed from front matter (features.eta:11) | |
| V-C09-079 | 224-249 | Claim "small": Markdown + Eta, no hydration, nothing shipped unless added; panels `hello.md`, `layout.eta` with `stati.include('partials/header')` and `stati.content` | X | ✅ | types/content.ts:559,570 | |
| V-C09-080 | 252-272 | Claim "typed": typed config, esbuild, hashed in production, bundles only on matching pages; panel bundles | X | ✅ | typescript.utils.ts:102-104,240-244; bundle-matching.utils.ts:86-88; snippet type-checks | |
| V-C09-081 | 275-294 | Claim "isg": rebuild on content/template change or TTL; aging rules; panel: undated pages 6 h, frozen after 30 days, aging 5 min / 1 h / 1 day | X | ✅ | core/isg/builder.ts:266-292; ttl.ts:80-99 (undated → `ttlSeconds`), 125-141 (cap), 203-232 (rules); validation.ts:140-193 (rules sorted, within cap) | |
| V-C09-082 | 298-307 | `npx stati invalidate "tag:news"` and an illustrative rebuild log | X | ✅ | invalidate.ts:91-92,254-262; log is labelled illustrative | |
| V-C09-083 | 311-357 | Dogfood: built with Stati, Tailwind, Prism, FlexSearch; index, sitemap, robots, RSS, bundles, responsive images and OG cards from the excerpted config | X | ✅ | docs-site/stati.config.ts:63-137 (excerpt matches); docs-site/package.json (`flexsearch`, `prismjs`, `tailwindcss`); docs-site/src/core/search/search-engine.ts | |
| V-C09-084 | 361 | "The scaffolder asks a few questions, from CSS, Sass or Tailwind to TypeScript and git, then installs dependencies. Accept the defaults for a TypeScript project like the one above, three commands from a running site." | B | ❌ M | The defaults give the blank template with plain CSS, TypeScript on, image tools off, the agent skill in `.claude/skills`, git and install on (create-stati/src/index.ts:202-306); not "a project like the one above" (the dogfood config with search, images, RSS). The question list also leaves out the template, image tools and agent skill | old: "The scaffolder asks a few questions, from CSS, Sass or Tailwind to TypeScript and git, then installs dependencies. Accept the defaults for a TypeScript project like the one above, three commands from a running site." → new: "The scaffolder asks for a starter template, CSS, Sass or Tailwind, TypeScript and a few more choices, then installs dependencies. The defaults give a blank TypeScript site with plain CSS, three commands from running." |
| V-C09-085 | 363-366 | Commands; dev server on `localhost:3000`, reloads on change | L | ✅ | constants.ts:42; core/dev.ts:517-526 | |
| V-C09-086 | hero.eta:28-35, quickStart.eta, claims.eta, dogfood.eta | Hard-coded links and text (`/getting-started/quick-start`, GitHub; rebuilt/cached counts computed from rows) | R | ✅ | docs-site/site/getting-started/quick-start.md exists; claims.eta:37 | |

### docs-site/site/getting-started/introduction.md

Covers: summary of the whole system; `packages/core/package.json`; `core/collections.ts`; `core/isg/*`

| ID | Line | Claim | Cat | Status | Evidence | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| V-C09-087 | 22 | Open-source, TypeScript-first SSG; Markdown pages, Eta layouts, static HTML | B | ✅ | LICENSE; core/build.ts | |
| V-C09-088 | 26-46 | Two-file site: `site/hello.md` → `/hello`, `site/layout.eta`, `npm install -D @stati/cli @stati/core`, `npx stati build`, static HTML in `dist/`; unrelated `stati` npm package | X | ✅ | Built with the local CLI (work/C09/two → `dist/hello.html`); `npm view stati` shows an unrelated 0.0.1 "Static blog generator" | |
| V-C09-089 | 50 | Nine runtime dependencies in `@stati/core`; no framework runtime in the browser | B | ✅ | packages/core/package.json dependencies (chokidar, esbuild, eta, fs-extra, js-yaml, markdown-it, open, tinyglobby, ws) | |
| V-C09-090 | 51 | `defineConfig()` typed config; esbuild bundles injected only where needed | B | ✅ | index.ts:207; bundle-matching.utils.ts:86-88 | |
| V-C09-091 | 52 | "a build cache that rebuilds a listing when a post it lists changes, removes the pages of deleted posts, and supports TTLs, age-based aging rules and invalidation by tag, path or age" | B | ❌ M | A listing rebuilds only when a listed page's URL, date or summary field changes (title, description, tags, draft by default), not on any change: core/collections.ts:21,299-311; FAQ line 57 states it right | old: "rebuilds a listing when a post it lists changes" → new: "rebuilds a listing when a post it lists is added, removed or retitled" |
| V-C09-092 | 53 | Collections sorted by date, grouped by tag, `paginate`, one page per tag or author from `[tag].md` | B | ✅ | types/content.ts:165-173,472-480 | |
| V-C09-093 | 54 | Built in: search, sitemap, robots, RSS, SEO, sized lazy images, hooks, metrics; `@stati/images` adds AVIF/WebP and OG images | B | ✅ | AGENTS.md:15; images/config.ts:52 | |
| V-C09-094 | 55 | Dev server with live reload, incremental rebuilds, error overlay | B | ✅ | core/dev.ts; error-overlay.utils.ts | |
| V-C09-095 | 57-61, 72, 74-79 | "Quick overview" list, "Ready to get started?" line and "Related topics" | V | ✂️ | The three links appear twice (Quick overview and Related topics) and Installation a third time | delete the "## Quick overview" section (lines 57-61) and the line "Ready to get started? Head over to the [Installation guide](/getting-started/installation)." |
| V-C09-096 | 63-70 | Philosophy: simplicity, sensible defaults, DX first, modern standards | V | ✂️ | No information ("Built with modern web technologies"); the "What makes Stati different?" list says it concretely | delete the "## Philosophy" section |
| V-C09-097 | 11 | Structured data description "Learn how to install and set up Stati" | V | ✅ | Page leads to installation | |

### docs-site/site/core-concepts/overview.md

Covers: summary of routing, templates, Markdown, ISG, static assets; `core/utils/typescript.utils.ts`, `css/*`, `core/isg/*`

| ID | Line | Claim | Cat | Status | Evidence | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| V-C09-098 | 22 | "Stati is built on several key concepts that work together to create a powerful yet simple static site generation experience. Understanding these concepts will help you make the most of Stati's features." | V | ✂️ | Promotional, no information | delete |
| V-C09-099 | 24-26 | "## Overview" heading under "# Overview"; "Stati combines modern web development tools with proven static site generation patterns:" | V | ✂️ | Repeats the page title; the lead-in says nothing | old: "## Overview\n\nStati combines modern web development tools with proven static site generation patterns:" → new: "The core concepts:" |
| V-C09-100 | 28-32 | Concept links and one-line descriptions | R | ⚠️ L | Links resolve, but the list leaves out [Collections](/core-concepts/collections), and "Modern asset processing", "Smart caching" say nothing | old: "- **[Static Assets & Bundling](/core-concepts/static-assets)** - Modern asset processing" → new: "- **[Static Assets & Bundling](/core-concepts/static-assets)** - Copying `public/`, client TypeScript bundles and stylesheets"; add after the Markdown line: "- **[Collections](/core-concepts/collections)** - Listings, pagination and one page per tag" |
| V-C09-101 | 40-46 | TypeScript-first: typed config, IntelliSense, esbuild, multiple bundles with include/exclude, automatic script injection in dev and build, `stati.assets`, dev source maps, production minify and hash | B | ✅ | typescript.utils.ts:102-104,422-424; types/config.ts:367-417 (`autoInject`); types/content.ts:605-606 (`assets`); bundle-matching.utils.ts:86-88 | |
| V-C09-102 | 48-55 | "Minimal dependencies" section | V | ✂️ | Vague ("modern build tools", "avoiding heavy frameworks"); the introduction already gives the concrete fact (nine runtime dependencies) | delete the "### Minimal dependencies" section |
| V-C09-103 | 57-65 | "Developer experience" section: zero-config setup, file routing, live reload, clear errors, "Flexible enough for any use case" | V | ✂️ | Repeats the introduction's list; "Flexible enough for any use case" is unverifiable; zero config still needs a `layout.eta` for anything but the fallback page | delete the "### Developer experience" section |
| V-C09-104 | 73 | Markdown with front matter; file location sets the URL | B | ✅ | content.ts:94-111 | |
| V-C09-105 | 77-82 | Layouts by folder (nearest `layout.eta`) or per page; includes and shells; helpers; "Dynamic content generation" | B | ✅ | template-index.ts:477-527 | "Dynamic content generation" is vague: old: "- Dynamic content generation" → new: "- Collections, pagination and generated pages" |
| V-C09-106 | 86 | Copies `staticDir`; runs Tailwind with `--tailwind-input`/`--tailwind-output` on `dev` and `build`; Sass via scripts; production stylesheet names change with content | B | ✅ | cli.ts:70-81 and dev options; AGENTS.md:40,75; css/config.ts (`hash` default true) | |
| V-C09-107 | 92-95 | Changed page re-rendered, others cached; template changes rebuild users; static assets copied every build; "an image a page shows is one of its dependencies"; TTL expiry | B | ⚠️ L | Only images Stati processes are recorded (`assetDeps`: Markdown images, `stati.image()`); a raw `<img>` in a template is not (AGENTS.md:165-166; SKILL.md:121-124) | old: "an image a page shows is one of its dependencies" → new: "an image in the page's Markdown or from `stati.image()` is one of its dependencies" |
| V-C09-108 | 99-104 | Output: static delivery, SEO-friendly URLs, modern web standards, easy deployment | V | ✂️ | Vague | old: the "### 5. Output generation" section → new: "### 5. Output generation\n\nThe result is static HTML in `dist/` that any static host can serve." |
| V-C09-109 | 108 | "Each core concept builds on the others to create Stati's unique approach ... powerful and flexible system." | V | ✂️ | Promotional | delete line 108 (keep line 110) |
| V-C09-110 | 112-118 | Related topics | V | ✂️ | Repeats the list at lines 28-32 apart from Glossary | old: the four concept links in Related topics → new: keep only "- [Glossary](/glossary) – Definitions of key terms and concepts" |

### docs-site/site/faq.md

Covers: summary claims; `core/isg/*`, `core/collections.ts`, `core/expand.ts`, `seo/*`, `core/templates.ts`

| ID | Line | Claim | Cat | Status | Evidence | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| V-C09-111 | 10-35 | FAQPage structured data answers | V | ⚠️ L | They differ from the visible answers (line 20 "update specific pages without running a full rebuild ... intelligent caching"; line 25 drops `await`). Search engines expect the structured answer to match the page | after the visible answers are edited, copy each one into its `acceptedAnswer.text` (plain text, no links) |
| V-C09-112 | 44 (and 15) | "with zero-config setup, fast esbuild bundling, and file-based routing" | V | ✂️ | "fast" is promotional; "zero-config setup" overstates (a layout is still needed for a real page) | old: "Stati is a TypeScript-first static site generator for documentation, blogs, and content-heavy sites, with zero-config setup, fast esbuild bundling, and file-based routing." → new: "Stati is a TypeScript-first static site generator for documentation, blogs, and content-heavy sites. It runs without a config file, bundles client-side TypeScript with esbuild, and turns the files in `site/` into URLs." |
| V-C09-113 | 48-53 | Choose Stati for type safety, minimal footprint, incremental builds, built-in SEO | B | ✅ | as introduction | "Minimal footprint – No heavy frameworks or unnecessary abstractions" is vague: old: "No heavy frameworks or unnecessary abstractions" → new: "No client-side framework, and nine runtime dependencies in `@stati/core`" (✂️, counted here) |
| V-C09-114 | 57 | ISG on by default; re-renders on content, templates, shown data or TTL; listing rebuild on add/remove/retitle; deleted page removed; `isg` settings; `stati invalidate` | B | ✅ | config/loader.ts:63-67; core/isg/builder.ts:223-292; collections.ts:299-311; core/isg/prune.ts | |
| V-C09-115 | 61 | `paginate: 10` → `/blog`, `/blog/page/2`; `[tag].md` with `generate: { from: tags }` → `/blog/tags/css` | B | ✅ | types/content.ts:147-173; expand.ts:402-413 | |
| V-C09-116 | 65-71 | Eta; layout inheritance, shells, includes with props and content, helpers, `await` in layouts and shells | B | ✅ | core/templates.ts:372,427-430 (`renderAsync`); template-render.ts:525; eta.md:244-245 | |
| V-C09-117 | 75-86 | Auto-injected title, description, canonical from `site.baseUrl`, OG, Twitter, JSON-LD from `seo.structuredData`; opt-in sitemap with priority rules, robots.txt with sitemap, RSS | B | ✅ | seo/generator.ts:95-158; seo/auto-inject.ts:71; build.ts:1692-1757 | |
| V-C09-118 | 90-94 | `stati.config.ts`, esbuild, bundles with include/exclude | B | ✅ | typescript.utils.ts; bundle-matching.utils.ts | |

### docs-site/site/glossary.md

Covers: terms across `packages/core/src` (templates, routing, ISG, collections, images)

| ID | Line | Claim | Cat | Status | Evidence | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| V-C09-119 | 15 | `site/docs/intro.md` → `/docs/intro`, written to `dist/docs/intro.html` | B | ✅ | content.ts:94-111; paths.utils.ts:227-232 | |
| V-C09-120 | 19 | ISG "only rebuilds when content changes or TTL expires" | B | ❌ L | Template changes and the collection and navigation data a page reads also rebuild it (core/isg/builder.ts:246-287) | old: "caches rendered pages and only rebuilds when content changes or TTL expires" → new: "caches rendered pages and rebuilds a page when its content, its templates or the data it shows change, or its TTL expires" |
| V-C09-121 | 23-35 | Eta templates, Layout (nearest `layout.eta`, `index.eta` on index pages, front matter name without extension), layout override, Shell | B | ✅ | template-index.ts:477-527; types/content.ts:560-572 | |
| V-C09-122 | 39-69 | Partials and Includes: `stati.include(name, props?, body?)`, `stati.props`, `stati.body`, examples | X | ✅ | types/content.ts:505-520,566-570 | |
| V-C09-123 | 51-56 | "Examples" list of four include calls | V | ✂️ | The signature and the first code block already show plain, props and body calls; the templates page covers loops | delete the "**Examples:**" list (lines 51-56) |
| V-C09-124 | 73 | Frontmatter: "YAML metadata at the top of Markdown files" | B | ⚠️ L | JSON front matter after `---json` is read too (core/utils/front-matter.utils.ts:134-140) | old: "YAML metadata at the top of Markdown files." → new: "YAML metadata (or JSON after `---json`) at the top of Markdown files." |
| V-C09-125 | 77 | Template lookup: from the page's folder up, nearest wins, page not caller, `/` from `site/`, `./` and `../` from the caller | B | ✅ | types/content.ts:507-510; template-index.ts | |
| V-C09-126 | 81-89 | Template context entries | T | ✅ | types/content.ts:545-639 | |
| V-C09-127 | 93-105 | SEO metadata, `stati.config.ts`, `defineConfig`, build hooks | B | ✅ | seo/generator.ts; index.ts:207; types/config.ts:561-570 | |
| V-C09-128 | 109 | esbuild "Provides near-instant build times for client-side code." | V | ✂️ | Promotional, unverifiable | old: "The underlying JavaScript bundler that powers Stati's TypeScript compilation. Provides near-instant build times for client-side code." → new: "The bundler Stati uses to compile client-side TypeScript." |
| V-C09-129 | 113-117 | Dev server; TTL via `isg.ttlSeconds` | B | ✅ | core/dev.ts; ttl.ts:80-99 | |
| V-C09-130 | 121 | Cache invalidation "marking cached entries as stale" with `tag:`, `path:`, `glob:`, `age:` | B | ❌ L | `invalidate` deletes the matching entries from `.stati/manifest.json` (core/invalidate.ts:254-262), so the next build renders those pages again | old: "The process of marking cached entries as stale using `stati invalidate`" → new: "Removing entries from the build cache with `stati invalidate`, so the next build renders those pages again. It takes queries" (rest of sentence unchanged: "with patterns like ...") |
| V-C09-131 | 125 | Drafts excluded from every build including `stati dev`, unless `stati build --include-drafts` | B | ✅ | content.ts:60-63; cli.ts:51-54,90; core/dev.ts passes no `includeDrafts` | |
| V-C09-132 | 129-145 | Dynamic attribute values, Collection, Pagination, Generated page, Helpers | B | ✅ | collections.ts:64-99; types/content.ts:147-173,472-492; expand.ts | |
| V-C09-133 | 149-162 | `stati.nav` methods and signatures; NavNode fields | T | ✅ | types/content.ts:576-595; types/navigation.ts:28-43 | |
| V-C09-134 | 166-170 | Sitemap in production builds when enabled; RSS via `rss.feeds` | B | ✅ | build.ts:1692,1757 | |
| V-C09-135 | 174-182 | `@stati/images`, Open Graph card from `og.eta` or the built-in card, `/_img/` names change with content | B | ✅ | images/plan.ts:99,161,182; packages/images/src/og/defaults.ts:19; images/og.ts:23-30 | |
| V-C09-136 | 186 | Scaffolder "with styling options, TypeScript support, and Git initialization" | B | ⚠️ L | Leaves out the starter templates, image tools and the agent skill (create-stati/src/index.ts:202-288) | old: "The interactive CLI tool that creates new Stati projects with styling options, TypeScript support, and Git initialization." → new: "The interactive CLI tool that creates a Stati project from a starter template, with a choice of styling, TypeScript, image tools, an agent skill and git initialization." |

### Gaps

- `packages/core/README.md` documents `BuildOptions` and `DevServerOptions` without `tailwind` (V-C09-047, V-C09-051). The programmatic way to have Stati run Tailwind appears in none of the C09 pages.
- None of the overview pages says that a site without `site.baseUrl` gets canonical and Open Graph URLs on `http://localhost:3000` in production (V-C09-009, V-C09-037). Worth one sentence wherever "zero configuration" is promised.
- `core-concepts/overview.md` does not link the Collections concept page (V-C09-100).

### Terminology

- "front matter" (index.md, introduction.md, overview.md, FAQ line 61, glossary 27/77/133-137) vs "frontmatter" (FAQ 77, glossary 71-73, 84, 125) vs "front-matter" (README 78, core README 125/134/592/647). Root README uses all three.
- "Layout inheritance" (FAQ 67, overview 29/114, glossary 29) describes replacement, not inheritance; the glossary entry itself says "override".
- Include third argument: "body" (`stati.body`), "content" (FAQ 69, glossary 49 "HTML to wrap"), "children" (homepage line 80).
- "Partials" (glossary heading) vs "includes" vs "templates"; AGENTS.md and the skill say "included templates".
- "Filesystem-based routing" (overview, glossary) vs "file-based routing" (FAQ 15/44, introduction structured data, overview 62).
- "build cache" (homepage, introduction) vs "ISG cache"/"cache" (core README, CLI help "Clean cache").
- "Open Graph card" (glossary) vs "link preview card" (homepage) vs "Open Graph image" (introduction 54, homepage 179).
- "Twitter Cards" (READMEs, FAQ) vs "Twitter cards" (homepage 169).

### Cross-cluster

- `docs-site/package.json:39-41` pins `@stati/core` 2.3.0, `@stati/cli` 2.1.0 and `@stati/images` 1.0.1, so `npm run check:snippets` (and the docs-site `typecheck`) check the homepage snippets against core 2.3.0, not the source. The plan's Phase 7 check should run against the local core (as done here in `work/C09/snip`). `docs-site/package.json` also carries stale `"stati": { "version": "2.2.0" }`. (Lead / C10)
- `examples/blank/package.json` declares `@stati/core ^2.3.0`, `@stati/cli ^2.1.0`; fine as ranges, noted only for the starter-range follow-up. (C02)
- `packages/core/src/index.ts:6-19` JSDoc and `config/loader.ts:156` JSDoc (`import { loadConfig } from 'stati'`) show the wrong package name in source comments (not docs; FYI).

### Phase 5 log

- V-C09-001: applied.
- V-C09-007: applied (re-checked against packages/core/src/core/invalidate.ts:134-185, `renderedAt >= cutoff`).
- V-C09-009: applied per the lead's ruling ("no `seo` block needed; canonical and Open Graph URLs use `site.baseUrl`"); plus one sentence where the README introduces the config file: "Without a config file, `site.baseUrl` is `http://localhost:3000` ..." (re-checked against config/loader.ts:55-68, constants.ts:51, core/build.ts:935 `siteUrl: config.site.baseUrl`). Note: loader.ts merges `DEFAULT_CONFIG.site` into every config too, so a JS config that omits `baseUrl` also gets localhost; the sentence stays limited to the no-config case as ruled.
- V-C09-016, V-C09-017: applied (re-checked against core/isg/ttl.ts:125-141, core/isg/builder.ts:289-292).
- V-C09-020: applied; fence changed to `eta` (D6) since the block was touched (helper defined in the same README, line 258).
- V-C09-024: applied (sentence deleted).
- V-C09-026, V-C09-027: applied (Philosophy and closing CTA deleted; no links to `#philosophy` anywhere).
- V-C09-030: applied (re-checked against packages/core/src/env.ts:3).
- V-C09-031: applied (re-checked against core/templates.ts:367 warning text).
- V-C09-032: applied (re-checked against types/config.ts:561-570).
- V-C09-037: applied per ruling, same wording as V-C09-009.
- V-C09-039: applied; no link targets `#complete-configuration-reference`; no other `## Configuration` heading in the file.
- V-C09-042: applied (`md.set({ breaks: true })`; Stati's own options re-checked at core/markdown.ts:66-70; README configs re-type-checked against local core: OK).
- V-C09-043, V-C09-044: applied (as V-C09-016/017).
- V-C09-046: applied (re-checked against core/build.ts:1283-1289).
- V-C09-047 (approved gap): applied as `tailwind?: { input: string; output: string }; // As --tailwind-input/--tailwind-output; production builds run Tailwind` (re-checked against css/stylesheet.ts:32-40, core/build.ts:179-186: development builds only link the output).
- V-C09-051 (approved gap): applied as `// Links the output; run Tailwind's watcher yourself (stati dev does)` (re-checked against core/dev.ts:61-65,500-515: createDevServer links the output, the CLI runs Tailwind, packages/cli/src/tailwind.ts).
- V-C09-056: applied; `TemplateContext` added to the main import list (re-checked against packages/core/src/index.ts:27, types/index.ts:7).
- V-C09-058: applied (re-checked against core/markdown.ts:39-51).
- V-C09-062: applied (section deleted; the aging and invalidation facts are on configuration/isg.md per D11).
- V-C09-064: applied (constants.ts:59).
- V-C09-066: applied (Philosophy, the Documentation bullet in Support & Community and the closing CTA deleted).
- D7 in packages/core/README.md navigation example: applied, `stati.url(crumb.url)` and `stati.url(item.url)`, fence `eta` (types/content.ts:618).
- V-C09-072, V-C09-074, V-C09-084: applied; homepage front matter re-parsed with js-yaml and `check-snippets.mjs` re-run against local core 2.8.0 (work/C09/snip): all 4 snippets type-check. V-C09-084 re-checked against packages/create-stati/src/index.ts:202-306 (defaults blank, css, TypeScript on).
- V-C09-091: applied (re-checked against core/collections.ts:21,299-311).
- V-C09-095, V-C09-096: applied; no links to `introduction#quick-overview` or `#philosophy`.
- V-C09-098, V-C09-099: applied ("# Overview\n\nThe core concepts:").
- V-C09-100 (approved gap): applied; Collections link added, static assets line reworded; the Templates line now says layouts "replace the layouts above them" (D6).
- V-C09-102, V-C09-103: applied (sections deleted; the dependency count stays on introduction.md and FAQ).
- V-C09-105: wording applied ("Collections, pagination and generated pages").
- V-C09-107: applied (re-checked against images/runtime.ts:289-306: Markdown images and `stati.image()` both go through `renderImage`, which adds `assetDeps`).
- V-C09-108, V-C09-109, V-C09-110: applied (Related topics keeps only the Glossary link).
- V-C09-111: applied; all five FAQPage answers re-synced with the visible answers (plain text, no links); YAML parsed OK.
- V-C09-112, V-C09-113: applied. FAQ "Layout inheritance" bullet → "Layouts chosen by folder, which replace the layouts above them"; "Includes with props and content" → "with props and a body" (D6).
- V-C09-120, V-C09-123, V-C09-124, V-C09-128, V-C09-130: applied (V-C09-130 re-checked against core/invalidate.ts:254-262).
- V-C09-136: applied; also covers C02's cross-cluster item on glossary.md:184-186 (re-checked against packages/create-stati/src/index.ts:202-306).
- Glossary heading "Layout inheritance" → "Layout override" with "replaces" wording (D6); no links to `#layout-inheritance` anywhere. Heading "Frontmatter" → "Front matter"; no links to `glossary#frontmatter`.
- D6 front matter pass: README.md (2), packages/core/README.md (4), faq.md (1), glossary.md (3). Code identifiers untouched.
- V-C09-021: left (✅; the optional trailing-slash cleanup was not part of an approved fix).
- Anchor check of every internal link in my five docs-site files after the edits: all pages and anchors exist (my slug script flagged `/configuration/seo#robots-txt-configuration`, but that heading is unchanged and V-AUTO-002 resolved it in the build).

Applied 50 (16 ❌, 14 ⚠️, 18 ✂️, 2 ✅-with-wording), plus the D6/D7 terminology edits; rejected 0; left 1 (V-C09-021).

## C10 findings

Summary: 145 claims; ✅ 100, ❌ 16 (H 0, M 6, L 10), ⚠️ 13, ✂️ 22. Rows marked "✅ / ✂️" or "❌ L / ✂️" count under both statuses.

Scratch projects (built with the local CLI, `node packages/cli/dist/cli.js`, `@stati/core` junctioned to `packages/core`):

- `work/C10/site1`: every recipe template extracted verbatim from `recipes.md` by `work/C10/extract.mjs` (the first `site/blog/index.eta` written to `site/news/index.eta`), plus the recipe config (helpers, SEO, sitemap, robots, ISG aging, markdown plugins and `configure`, all four hooks) in `stati.config.js`, pages from `work/C10/mkpages.mjs`. `markdown-it-container@4` installed. Built, rebuilt, invalidated, `stati dev --port 4110` started and stopped (port checked free afterwards).
- `work/C10/site2`: troubleshooting cases (wrong `layout`, blank line before front matter, invalid YAML, draft, untitled page, `_folder`, `_file`, spaces and underscores in names, `README.md`).
- `work/C10/site3`: no layout at all; no config; `.js` config without `"type"` and with `"type": "commonjs"`.

### docs-site/site/examples/recipes.md

Covers: `core/templates.ts`, `core/template-render.ts`, `core/utils/navigation-helpers.utils.ts`, `core/navigation.ts`, `core/markdown.ts`, `core/collections.ts`, `core/expand.ts`, `core/build.ts` (hooks), `core/isg/*`, `core/invalidate.ts`, `seo/*`, `config/loader.ts`, `env.ts`, `core/reading-time.ts`

| ID | Line | Claim | Cat | Status | Evidence | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| V-C10-001 | 11 | Templates under `site/partials/` are included with `stati.include('partials/menu')`; the other recipes are layouts that wrap themselves with `stati.layout('base')` | B | ✅ | site1 build: every extracted recipe rendered through `site/base.eta`; core/template-render.ts | |
| V-C10-002 | 19-41 | Dynamic navigation menu recipe | X | ✅ | site1 `dist/docs/a.html`: nested `<ul class="menu-level level-1">`, `menu-link active` on the current page | |
| V-C10-003 | 43 | A template function that writes markup is called with `<% %>`; `<%~ fn() %>` prints `undefined`. Every folder is a top-level node, so the menu has at most two levels with nested folders at the top | B | ✅ | site1 output: `/docs/sub` listed both under Docs (no children) and at the top level with Doc C; an undefined value prints `undefined` (site1 `buttons.eta` without front matter printed `undefined`) | |
| V-C10-004 | 47-74 | Section navigation from `stati.page.navNode.children`; children only on a folder's `index.md`; a nested folder's index appears without children, look it up in `stati.nav.tree` | X/B | ✅ | site1: `/docs` lists Doc A, Doc B, Sub; `/docs/sub` renders no section nav (its `navNode` is the childless entry) | |
| V-C10-005 | 76-80 | `stati.nav.getChildren('/path')`, `stati.nav.getSiblings()` | A | ✅ | core/utils/navigation-helpers.utils.ts:216-232; types/content.ts:584-594 | |
| V-C10-006 | 84 | Headings h2-h6 go into `stati.page.toc` | B | ✅ | core/markdown.ts:157; site1 `/` toc has h2 and h3, not the h1 | |
| V-C10-007 | 86-106 | TOC recipe; entries have `id`, `text`, `level` (2-6) | T/X | ✅ | types/content.ts:59-66; site1 `/` output `toc-level-2`, `#intro` | |
| V-C10-008 | 110-156 | Hierarchical TOC recipe | X | ✅ | site1 `/`: `<ul><li>Intro<ul><li>Deeper</li></ul></li><li>Second</li></ul>` | |
| V-C10-009 | 158 | "Here are practical examples:" introduces three navigation sidebars inside the "Table of contents" section | V | ✂️ | The examples use `stati.nav`, not the TOC; they belong after "Common navigation patterns" (line 80) | Move the `docs-sidebar.eta` and `sibling-nav.eta` blocks (lines 160-197) to just after line 80, and delete "Here are practical examples:" |
| V-C10-010 | 160-197 | Docs sidebar from `getChildren('/docs')`, siblings from `getSiblings()` | X | ✅ | site1 `/docs/a`: sidebar Doc A (active), Doc B, Sub; siblings Doc B, Sub | |
| V-C10-011 | 199-230 | Multi-section sidebar: three copies of the docs-sidebar loop with other paths | V | ✂️ | Shows nothing the docs-sidebar example doesn't | Delete the `site/partials/multi-section-sidebar.eta` block (lines 199-230) |
| V-C10-012 | 234-261 | Prev/next from `getSiblings(undefined, true)` | X | ✅ | site1 `/docs/a` → next Doc B; `/docs/sub` → previous Doc B; navigation-helpers.utils.ts:96,231 | |
| V-C10-013 | 265-321 | Collection index recipe: `stati.collection.recentPages`, `pagesByTag`, `post.publishedAt` Date, `post.frontMatter.*`; "Collection data is automatically provided to index pages" | X | ✅ | site1 `/news`: tag counts x (1), y (2); posts newest first with `datetime="2026-10-10T00:00:00.000Z"`, author, description, tags | |
| V-C10-014 | 276-288 | Tag filter links to `#tag-${tag}` with `class="<%= stati.propValue('tag', 'filter-tag') %>"` | X | ⚠️ L | The page has no element with id `tag-…`, so the links go nowhere; `propValue` with two fixed strings adds nothing. Settle: maintainer decides whether the filter should link to the tag pages of "A page for every tag" | old: ``href="<%= `#tag-${tag}` %>"`` / `class="<%= stati.propValue('tag', 'filter-tag') %>"` / `data-tag="<%= tag %>"` → new: ``href="<%= `/blog/tags/${stati.slugify(tag)}` %>"`` / `class="tag"` |
| V-C10-015 | 300 | `post.publishedAt.toLocaleDateString()` | X | ❌ L | Uses the build machine's locale: site1 printed `2026. 10. 10.` on a Hungarian system | old: `<%= post.publishedAt.toLocaleDateString() %>` → new: `<%= post.publishedAt.toLocaleDateString('en-US') %>` |
| V-C10-016 | 325-361 | Related posts from `stati.collection` with no hook; "ISG re-renders the posts when a post is added or removed or its title or tags change" | X/B | ✅ | site1 `/blog/p3` lists p1 (common tag Web Dev); renaming p1 re-rendered the posts, editing only p2's body re-rendered only p2 (22/23 hits); core/collections.ts:21 (default summary fields) | |
| V-C10-017 | 365-398 | `paginate: 10`; `stati.pagination` `{ items, pageNumber, totalPages, prevUrl, nextUrl, urls }`; first page at `/blog`, then `/blog/page/2` | X | ✅ | site1 with `paginate: 2`: `dist/blog.html`, `dist/blog/page/2.html`, prev/next and page links correct | |
| V-C10-018 | 402-432 | `[tag].md` with `generate: from: tags`, `{tag}` in the title, `stati.generated.items`, links via `stati.slugify(tag)` | X | ✅ | site1: `dist/blog/tags/{web-dev,tech,other}.html`, title "Posts tagged Web Dev", link `/blog/tags/web-dev` resolves | |
| V-C10-019 | 474-481, 499 | `readingTime` helper (200 words a minute) and `<span><%= stati.helpers.readingTime(stati.content) %></span>` | X | ❌ M | Works, but Stati computes it: `stati.page.readingTime` (whole minutes, at least 1, `readingTime.wordsPerMinute`, default 230). core/reading-time.ts; core/templates.ts:269-270; types/content.ts:392-397, 554-555 | Delete the `// Reading time estimation` helper (lines 474-481, and the comma after `excerpt`). old: `<span><%= stati.helpers.readingTime(stati.content) %></span>` → new: `<span><%= stati.page.readingTime %> min read</span>`. After the template add: "`stati.page.readingTime` is built in: whole minutes at `readingTime.wordsPerMinute` (default 230)." |
| V-C10-020 | 466-472 | `excerpt` helper | V | ✂️ | Defined but never used on the page | Delete the `// Excerpt generation` helper |
| V-C10-021 | 438-484 | `formatDate`, `timeAgo` helpers called as `stati.helpers.name()` | X | ✅ | site1 `/notes/n`: "October 20, 2026", "5 days ago"; config/loader.ts:112-140 (helpers must be functions) | |
| V-C10-022 | 438, 537, 605, 645, 697, 749, 818 | Config snippets headed `// stati.config.js` call `defineConfig` without importing it | X | ❌ M | Copied as is, the file throws `ReferenceError: defineConfig is not defined`; the loader prints "Error loading config" and "Falling back to default configuration." and builds with the defaults (config/loader.ts:362-374) | Add `import { defineConfig } from '@stati/core';` (and a blank line) under each `// stati.config.js` line that lacks it |
| V-C10-023 | 486 | `stati.slugify()` is built in | A | ✅ | core/templates.ts (context); site1 tag links | |
| V-C10-024 | 488-504 | Post template with `stati.page.publishedAt ?? stati.page.date` | X | ✅ | site1 `/notes/n` (front matter `date`). `stati.page.publishedAt` is the raw front matter field, not the computed `page.publishedAt` (core/templates.ts:263-271) | |
| V-C10-025 | 508 | `getBreadcrumbs()` starts at the page's top-level node, the nearest folder for nested pages; add Home yourself | B | ✅ | site1 `/docs/sub/c`: Home > Sub > Doc C; `/docs/a`: Home > Docs > Doc A | |
| V-C10-026 | 534-575 | SEO config; every page gets `og:locale en_US`, `twitter:site`, `twitter:creator`; `/blog/` posts get `og:type article`, `article:published_time`, `article:modified_time` from `updated`, `article:tag` per tag, `article:author` | G/B | ✅ | site1 `dist/blog/p1.html` head (all listed tags present; `/blog`, `/blog/page/2`, `/blog/tags/*` stay `website`); `robots.txt` with both disallows and `Sitemap:`; sitemap priorities 1.0 for `/`, 0.8 for `/blog/p1` | |
| V-C10-027 | 577-596 | Front matter `seo` values win over the config | B | ✅ | site1 p1: `og:title` "Custom SEO Title \| My Site", `keywords`, `article:section`, `twitter:card` | |
| V-C10-028 | 598 | "an unquoted YAML date becomes a `Date` object, which breaks the Open Graph tag generator" | B | ❌ M | Nothing breaks: the tag is printed from `String(date)`. site1 `seo.openGraph.article.publishedTime: 2024-01-15` gave `article:published_time` = `Mon Jan 15 2024 01:00:00 GMT+0100 (…)`, no warning. seo/generator.ts:230-235 | old: "an unquoted YAML date becomes a `Date` object, which breaks the Open Graph tag generator." → new: "an unquoted YAML date becomes a `Date` object, which the tag prints as a local date string such as `Mon Jan 15 2024 …` instead of ISO 8601." |
| V-C10-029 | 602 | `beforeAll` changes are page input, so cached pages stay cached; `beforeRender` changes make the page re-render on every build | B | ✅ | site1: structured data from `beforeAll` → 23/23 cache hits on rebuild; a `beforeRender` front matter change on `/about` re-rendered it on every following build (22/23); core/build.ts:651-668, 869-888 | |
| V-C10-030 | 604-634 | Structured data hook | X | ✅ | site1 p1: `<script type="application/ld+json">` with BlogPosting, author "Ann", publisher | |
| V-C10-031 | 636 | `page.publishedAt` from the first valid of `publishedAt`, `published`, `date`, `createdAt`; `undefined` when undated | T | ✅ | core/utils/date.utils.ts:10; types/content.ts:384 | |
| V-C10-032 | 642-662 | Build-time fetch in `beforeAll`, stored in front matter | X | ✅ | core/build.ts:651-654 (pages passed by reference); front matter is in the page hash (AGENTS ISG section) | |
| V-C10-033 | 666-689 | `stati.propValue()` for classes and data attributes | X | ✅ | site1 `/`: `class="btn btn-secondary btn-lg"`, `data-analytics="card-click category-news"` | |
| V-C10-034 | 693-710 | `isg.aging` rules; the last rule also covers older pages | G | ✅ | core/isg/ttl.ts:214-231; config validated in site1 | |
| V-C10-035 | 712-725 | Cache entries carry the front matter `tags` for `tag:` invalidation | B | ✅ | core/isg/builder.ts:136-140 (generated pages also carry their key and label) | |
| V-C10-036 | 727-740 | `stati invalidate` with `tag:`, `path:` (prefix), `glob:`, `age:` | L | ✅ | core/invalidate.ts:91-104; site1: tag:tech 4, path:/blog 9, glob:/blog/** 8, age:3months 23 entries | |
| V-C10-037 | 744-746 | "Track build performance with hooks:" followed by a second intro sentence | V | ✂️ | Two lead-ins before one code block | Delete "Track build performance with hooks:" |
| V-C10-038 | 746-778 | Each hook receives a new context object; timing via module-level state | X/B | ✅ | core/build.ts:888 and 1080 build `{ page, config }` per call; site1 logged "Building 23 pages...", "Build completed in …", "Average: …" | |
| V-C10-039 | 780 | Render hooks run only for re-rendered pages | B | ✅ | core/build.ts:869-888 (cache hit `continue`s before `beforeRender`) | |
| V-C10-040 | 788 | `import { getEnv } from '@stati/core';` then `export default defineConfig({` | X | ❌ M | `defineConfig` is not imported: the config fails to load and the build silently uses the defaults (config/loader.ts:362-374) | old: `import { getEnv } from '@stati/core';` → new: `import { defineConfig, getEnv } from '@stati/core';` |
| V-C10-041 | 790-791 | `getEnv()` at config load is `development` under `stati dev` and `production` under `stati build` | B | ✅ | site1 logged `env at config load: production` (build) and `development` (dev); env.ts:3 defaults to `NODE_ENV` or `development`; packages/cli/src/cli.ts:131; core/dev.ts:497 loads config, dev.ts:528 sets env | |
| V-C10-042 | 803 | `ttlSeconds: isDev ? 0 : 21600 // No cache in dev` next to `enabled: isProd` | V | ✂️ | ISG is already off in development, and `stati dev` clears the cache at start (AGENTS dev server); the line does nothing | Delete the `ttlSeconds` line; old comment `// Only enable ISG in production` stays |
| V-C10-043 | 806-809 | `seo.autoInject`, `seo.debug` | G | ✅ | types/config.ts:233-236 | |
| V-C10-044 | 819-826 | `['container', 'tip']` loads `markdown-it-container` with `'tip'`; TOC and anchors are built in | G | ✅ | core/markdown.ts:39-51, 87-96; site1 rendered `<div class="tip">` | |
| V-C10-045 | 819-826 | The plugin must be installed in the project | B | ⚠️ L | Gap: the recipe never says so; without it the build only warns "Failed to load markdown plugin: markdown-it-container" (markdown.ts:93-96) and goes on without the containers | Before the code block add: "Install the plugin first: `npm install -D markdown-it-container`." |
| V-C10-046 | 829-849 | Wrapping the default image rule keeps Stati's sizes and lazy loading; a class set on the token stays on the `<img>` | X | ✅ | site1 `/about`: `<img … class="responsive-image" width="1200" height="630" loading="eager" …>` in `<figure>`; markdown.ts:70-72, 101-104 | |
| V-C10-047 | 843-848 | The image rule returns a `<figure>` | X | ⚠️ L | An inline image sits in a paragraph, so the output is `<p><figure>…</figure></p>` (site1 `/about`), which HTML does not allow; browsers close the `<p>` early. Settle: maintainer decides whether to keep the figure example | none proposed (keeping is acceptable for an illustration) |
| V-C10-048 | 852 | `const defaultFenceRender = …` | X | ❌ L | Declared and never used | Delete line 852 and the blank line after it |
| V-C10-049 | 873 | An image rule that doesn't call `defaultImageRender` loses sizes, lazy loading and responsive versions | B | ✅ | markdown.ts:70-72 installs Stati's rule before plugins and `configure` | |
| V-C10-050 | 879-892 | Build scripts: `build` runs `build:clean` (two `node -e rmSync` scripts) before every `stati build`; `dev --port 3000` | X | ❌ M | Cleaning before every build throws away the ISG cache the page is about; `stati build --clean` deletes the output directory and the cache itself (core/build.ts:1283-1289); 3000 is the default port (constants.ts:42) | Replace the JSON with: `"dev": "stati dev",` `"build": "stati build",` `"build:clean": "stati build --clean",` `"preview": "stati preview --port 8080",` `"invalidate:recent": "stati invalidate tag:recent",` `"invalidate:all": "stati invalidate"` |
| V-C10-051 | 888 | `"stati invalidate 'tag:recent'"` in an npm script | X | ✅ | Works under cmd.exe too: npm passed `'tag:tech'` with the quotes and it still invalidated 4 entries (site1 `npm run inv`; invalidate.ts:19 quoted values) | |
| V-C10-052 | 896-903 | `.husky/post-merge` running `npx stati invalidate`; no query clears every entry; `path:` is a prefix, `glob:` for wildcards | X/L | ✅ | core/invalidate.ts:94-100, 227-237; site1 "Cleared entire cache (23 entries)" | |
| V-C10-053 | 905 | Link to `/examples/list` | R | ✅ | docs-site/site/examples/list.md | |

### docs-site/site/advanced/troubleshooting.md

Covers: `config/loader.ts`, `constants.ts`, `core/templates.ts`, `core/content.ts`, `seo/auto-inject.ts`, `images/runtime.ts`, `core/build.ts`, `rss/*`, `core/utils/typescript.utils.ts`, `packages/cli/src/tailwind.ts`, `core/utils/tailwind-inventory.utils.ts`, `css/stylesheet.ts`

| ID | Line | Claim | Cat | Status | Evidence | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| V-C10-054 | 14 | No `stati.config.ts`/`.js`/`.mjs` → defaults, title "My Stati Site", base URL `http://localhost:3000` | B | ✅ | constants.ts:28-37, 51, 121; config/loader.ts:182-184; site3 without config: `og:site_name` "My Stati Site", canonical `http://localhost:3000/` | |
| V-C10-055 | 14 | A config that fails to load prints the error and "Falling back to default configuration." | B | ✅ | config/loader.ts:371-373; site3 with `"type": "commonjs"` | |
| V-C10-056 | 14 | Validation errors that stop the build: unknown option, `helpers` not functions, invalid `isg` or `images` | B | ⚠️ L | Incomplete: `seo`, `sitemap.news`, `css`, `readingTime` and the directory options are validated and stop the build too (config/loader.ts:244-340, 362-369) | old: "and invalid `isg` or `images` settings stop the build with an error that names the setting." → new: "and invalid `isg`, `images`, `seo`, `sitemap.news`, `css`, `readingTime` or directory settings stop the build with an error that names the setting." |
| V-C10-057 | 18-20 | Run from the root; read "Error loading config"; a `.js` config with `import` loads with a Node warning unless `"type": "module"`, fails with `"type": "commonjs"` | B | ✅ | site3: `[MODULE_TYPELESS_PACKAGE_JSON]` warning and config used; `"commonjs"` → "Error loading config from …" and defaults; loader.ts:371 | |
| V-C10-058 | 27 | Front matter `layout` naming no template warns with similar names and falls back to the nearest `layout.eta` (`index.eta` on index pages); no layout at all logs "No layout template found, using fallback" and writes a bare page | B | ✅ | site2: `layout "layuot" names no template; using site/sec/layout.eta. Did you mean "layout"?`, `layout: nope` on `sec/index.md` → `site/sec/index.eta`; site3: warning and fallback HTML; core/templates.ts:367 | |
| V-C10-059 | 31-33 | `layout: post` looks up `post.eta` from the page's folder up; `/layouts/blog` reads `site/layouts/blog.eta` only | B | ✅ | core/template-index.ts (AGENTS templates section); link target `/core-concepts/templates#template-resolution-order` (V-AUTO-001) | |
| V-C10-060 | 39-47 | Template syntax: `<%~` raw, `<%=` escaped, JavaScript only, data in `stati` | B | ✅ | core/templates.ts:165-173 (`varName: 'stati'`) | |
| V-C10-061 | 58-59 | ISG is on by default; `stati dev` rebuilds incrementally | G | ✅ | config/loader.ts:63-66 | |
| V-C10-062 | 60 | "Run `npm run clean` then `stati build` if cache is corrupted" | L | ❌ L | `clean` is a script only scaffolded projects have (examples/*/package.json:13-14); the page itself recommends `stati build --clean` at line 109 | old: "Run `npm run clean` then `stati build` if cache is corrupted" → new: "Run `stati build --clean` if the cache is corrupted" |
| V-C10-063 | 66-73 | SEO tags missing: `seo.autoInject` not false; manual `<%~ stati.generateSEO() %>`; `site.baseUrl` for canonicals | B | ✅ | seo/auto-inject.ts:71-73; core/templates.ts:308; types/content.ts:634 | |
| V-C10-064 | 66-73 | (gap) A layout without `<head>` gets no tags | B | ⚠️ L | Stati warns "No <head> tag found in HTML, SEO auto-injection may not work correctly" (seo/utils/escape-and-validation.utils.ts:386; seen in site2) and injects nothing | Add item: "4. Make sure the layout or shell has a `<head>` element: auto-injection writes the tags before `</head>`" |
| V-C10-065 | 77-85 | Markdown images get `width`/`height`; `images: false` turns it off | B | ✅ | site1 `/about` `width="1200" height="630"`; AGENTS images config | |
| V-C10-066 | 89-96 | Image errors: missing `@stati/images`, version mismatch, `images.og` without a public `site.baseUrl`; link to images troubleshooting | B/R | ✅ | images/runtime.ts:166-181; docs-site/site/configuration/images.md:247-259 | |
| V-C10-067 | 100-112 | Rebuilds follow own files, the collection and the navigation; helper data and helper changes untracked; `summaryFields` default; `--clean` clears `dist/` and `.stati/`; deleted pages pruned every build | B | ✅ | core/collections.ts:21; core/build.ts:1283-1289; AGENTS ISG and prune notes | |
| V-C10-068 | 116-125 | Templates not refreshing: run from root, editor saves, restart | B | ✅ | generic; core/dev.ts watches `site/` and `public/` | |
| V-C10-069 | 136 | Front matter must start on line 1; otherwise it shows in the page; invalid YAML stops the build with the file and line | B | ✅ | site2 `blankfirst.md` rendered `<hr>` and the YAML as text; `bad.md` → "Invalid front matter in site/bad.md at line 4, column 1: …" | |
| V-C10-070 | 139 | "Check the `layout` field points to an existing template" under "Markdown content not rendering" | V | ✂️ | A wrong `layout` falls back to the nearest layout (V-C10-058) and doesn't stop Markdown rendering; already covered at line 27 | Delete item 4 |
| V-C10-071 | 150-153 | Assets in `public/`; "Use absolute paths starting with `/`" | B | ❌ M | Root paths break when `site.baseUrl` has a path; templates should link with `stati.url()` (core/base-path-links.ts; SKILL.md:70-74; docs-site/site/advanced/deploying-to-a-subfolder.md) | old: "Use absolute paths starting with `/` (e.g., `/images/logo.png`)" → new: "Use paths from the site root (`/images/logo.png`), and in templates write them as `stati.url('/images/logo.png')` so they also work when the site is served from a subfolder (see [Deploying to a subfolder](/advanced/deploying-to-a-subfolder))" |
| V-C10-072 | 157-168 | RSS only in production builds; `rss.enabled`; `site.baseUrl`; "RSS configuration validation failed" stops all feeds; `feeds[].filename` | B | ✅ | core/build.ts:1757-1790 | |
| V-C10-073 | 172-180 | Feed patterns match the absolute source path; `'blog/**'` never matches; use `'**/blog/**'` | B | ✅ | rss/generator.ts:53-63 (`page.sourcePath`); core/content.ts:40-43 (`absolute: true`); rss/utils/pattern-matching.utils.ts | |
| V-C10-074 | 184-194 | Sitemap only in production, needs `enabled` and `baseUrl`, written to `dist/sitemap.xml` | B | ✅ | core/build.ts:1689-1692; site1 `dist/sitemap.xml` | |
| V-C10-075 | 205-206 | `typescript.enabled`; "entry point at `src/main.ts` (or configured `srcDir`)" | G | ✅ | constants.ts:129, 138; core/utils/typescript.utils.ts:99-100, 224 | |
| V-C10-076 | 209 | "Bundles are automatically injected when TypeScript is enabled" | G | ⚠️ L | Only while `typescript.autoInject` is not `false` (types/config.ts:408-418) | old: "Bundles are automatically injected when TypeScript is enabled" → new: "Check that `typescript.autoInject` is not `false`; with it off, add the script tags from `stati.assets.bundlePaths` yourself" |
| V-C10-077 | 220-224 | Untitled nodes use the file name; drafts left out unless `--include-drafts`; `_` folders excluded, `_` files not; nested folders are top-level nodes | B | ✅ | site2 nav: `notitle (/notitle)`, no `/draft`, no `/_hidden/h`, `/_under` present; site1 Sub at top level | |
| V-C10-078 | 231 | File names are kept as written | B | ✅ | site2: `dist/my post.html`, `dist/my_post.html` | |
| V-C10-079 | 235-238 | Four solution items that restate one rule | V | ✂️ | Items 2-4 repeat item 1 | Replace the list with: "1. Name files with lowercase letters, digits and hyphens: `my-post.md`, not `my post.md` or `my_post.md`" |
| V-C10-080 | 249-266 | Hooks failing: wrap logic in try-catch and continue; "Ensure async hooks return a Promise"; "Test hooks in isolation" | B/V | ⚠️ L | Hooks may be synchronous (types/config.ts:567-569). A hook that throws stops the build (core/build.ts:652-654, 886-888, 1078-1080, 1809-1811); the sample catches and logs, which hides the failure. Items 3 and 4 carry no Stati information. Settle: maintainer decides whether to keep the try/catch advice | Replace items 1-4 and the code block with: "1. Read the error in the build output: a hook that throws stops the build, and `stati dev` shows it in the error overlay\n2. Catch errors inside the hook only around work the site can do without, such as an optional fetch" |
| V-C10-081 | 277-282 | Tailwind 4 needs `@tailwindcss/cli`; both flags; `@source` or `content`; `--tailwind-verbose`; watcher stopped/exited messages | L/B | ✅ | packages/cli/src/tailwind.ts:124-144 (`node_modules/.bin/tailwindcss`), 255-259; packages/create-stati/src/tailwind-processor.ts:54-55; packages/cli/src/cli.ts:200-232 | |
| V-C10-082 | 293-300 | `propValue` records classes in `.stati/tailwind-classes.html`; `@source '../.stati/tailwind-classes.html';` | B | ✅ | core/utils/tailwind-inventory.utils.ts:110, 248; packages/create-stati/src/tailwind-processor.ts:17 | |
| V-C10-083 | 311-315 | Hashed `/_assets/styles-[hash].css`; unhashed cases: `build:css` after build, `css.hash: false`, `@import` or unsafe path characters | B | ✅ | css/stylesheet.ts:74, 188, 217; AGENTS css section | |
| V-C10-084 | 322-326 | `README.md` in `site/` becomes a page | B | ✅ | site2: `dist/README.html` | |

### docs-site/site/advanced/contributing.md

Covers: root `package.json`, `.github/workflows/ci.yml`, `.github/workflows/perf.yml`, `.husky/*`, `scripts/check-commit-msg.mjs`, `scripts/generate-changesets.mjs`, `scripts/compare-perf.mjs`, `perf/baselines/benchmark.json`, code samples from `packages/core/src`

| ID | Line | Claim | Cat | Status | Evidence | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| V-C10-085 | 11 | "Stati is an open-source project and we welcome contributions from the community! Whether you're fixing bugs …" | V | ✂️ | Reassurance, no information | Delete line 11 |
| V-C10-086 | 13-20 | Quick start: install, then `npm test`, without a build | L | ❌ L / ✂️ | CLI and scaffolder tests need fresh `dist` (AGENTS.md:28); the list repeats "Local development" (lines 32-50), which has the build | Delete the "Quick start" section; "Local development" covers it |
| V-C10-087 | 26-28 | Node 22.20.0+ on 22.x or 24+; npm 11.5.1+ | G | ✅ | package.json `engines` (`^22.20.0 \|\| >=24`, `>=11.5.1`) | |
| V-C10-088 | 32-50 | `git clone`, `npm install`, `npm run build` (core → images → cli → create-stati), `npm test`, `npm run lint`, `npm run typecheck` | L | ✅ | package.json scripts `build`, `test`, `lint`, `typecheck` | |
| V-C10-089 | 54-80 | Project structure: examples `blog`, `docs`, `blank` | X | ❌ L | `examples/news` is missing | old: `│   └── blank/` → new: `│   ├── blank/` + new line `│   └── news/` |
| V-C10-090 | 86-103 | Monorepo workflow: install, build, test again, plus `--workspace=@stati/core` and an example | L/V | ✂️ | Install, build and test repeat lines 37-44. `npm run test --workspace=@stati/core` ✅ (packages/core/package.json:38); `cd examples/blog && npm run dev` ✅ (examples are workspaces, package.json `workspaces`; `node_modules/@stati/cli` links `packages/cli`) | Replace the block with: `# Test one package` / `npm run test --workspace=@stati/core` / blank / `# Run an example with the local packages` / `cd examples/blog` / `npm run dev`, and drop "Stati uses a monorepo structure with multiple packages:" |
| V-C10-091 | 109-122 | ESLint, Prettier, strict TypeScript, Conventional Commits; lint and typecheck commands | B | ✅ / ✂️ | package.json `lint-staged` (eslint --fix, prettier --write); tsconfig.base.json:6 `strict`; the bash block repeats lines 46-48 | Delete the bash block (lines 116-122) |
| V-C10-092 | 126-140 | Test commands: `npm test`, `-- --coverage`, a single file, `npx vitest` watch | L | ✅ | package.json `test: vitest run`; `@vitest/coverage-v8` devDependency; packages/core/test/core/build.test.ts exists | old: "We maintain comprehensive test coverage:" → delete (✂️) |
| V-C10-093 | 144-152 | CI on pushes to `main` and every PR; npm 11.5.1 check, `npm ci`, build, skill smoke test, Vitest with coverage excluding perf, Codecov; Ubuntu Node 22; images tests on macOS and Windows; publish commits skipped | B | ✅ | .github/workflows/ci.yml:3-5, 21-82, 86-108 | |
| V-C10-094 | 156-163 | Scenarios and baselines (60/35/40/60 ms); complex = 111 pages | B | ✅ | perf/baselines/benchmark.json; packages/core/test/perf/benchmark.test.ts:23-35 (100 pages + index + 10 complex) | |
| V-C10-095 | 168 | "Run only the perf tests (CI skips them; npm test runs them too)" | B | ❌ L | The CI test job skips them, but the Performance workflow runs them on every PR to `main` (.github/workflows/perf.yml:3-5, 37-55), as line 176 itself says | old: "# Run only the perf tests (CI skips them; npm test runs them too)" → new: "# Run only the perf tests (npm test runs them too; CI runs them in the Performance workflow)" |
| V-C10-096 | 176 | "Each benchmark passes if its median over 7 runs stays within 30% of the baseline or 25ms above it, whichever is larger … Cache hit rates are validated too … CI reruns the suite once" | B | ⚠️ L | Correct for CI (scripts/compare-perf.mjs:146-151; benchmark.json `tolerance: 0.3`, `minHeadroomMs: 25`, `minCacheHitRate: 0.95`; perf.yml:57-66), but the tests run locally only assert 5-15 s ceilings (benchmark.test.ts:431, 533, 607); the comparison is the script's | old: "Baselines are defined in `perf/baselines/benchmark.json`. Each benchmark passes if" → new: "Baselines are defined in `perf/baselines/benchmark.json`, and `scripts/compare-perf.mjs` checks them in the Performance workflow: each benchmark passes if" |
| V-C10-097 | 178-196 | Build metrics section | V | ✂️ | Claims ✅ (metrics/types.ts:80-215; cli.ts:54-69), but it repeats [/advanced/metrics](/advanced/metrics) | Replace the section with: "To find slow phases, build with `--metrics` (see [Build metrics](/advanced/metrics))." under the "Performance benchmarks" section |
| V-C10-098 | 200-207 | PR process steps | B | ✅ | generic | |
| V-C10-099 | 209-236 | "PR template" | B | ⚠️ | The repo has no pull request template (`.github/` has none; GitHub community profile `pull_request_template: false`). Settle: maintainer adds `.github/pull_request_template.md` or the section goes | Delete the "PR template" section (or add the file) |
| V-C10-100 | 240, 255-258 | `commit-msg` hook rejects anything after the subject; type and scope unchecked; one line, ≤72 chars, scopes, `!`, `BREAKING CHANGE:` footer rejected | B | ✅ | .husky/commit-msg; scripts/check-commit-msg.mjs:17-45 | |
| V-C10-101 | 250, 258, 274 | `feat(core)!: rename the isg.ttl option`; "`!` produces a major release" | B | ⚠️ M | scripts/generate-changesets.mjs:114 matches `^(\w+)(!)?(?:\(([^)]+)\))?: (.+)`: the `!` must come before the scope. `feat(core)!: x` doesn't match (checked with node), is logged "Not a conventional commit" and skipped (lines 386-391), so it produces no changeset at all; `feat!: x` works. The docs follow Conventional Commits; the script is wrong. Same example in AGENTS.md:258. Settle: maintainer fixes the regex (`^(\w+)(?:\(([^)]+)\))?(!)?: (.+)` with the destructuring reordered) | No doc change if the script is fixed; otherwise old: "feat(core)!: rename the isg.ttl option" → new: "feat!: rename the isg.ttl option" and in the rules "Mark breaking changes with `!` after the type, before any scope" |
| V-C10-102 | 262-274 | Types; every type except `feat` → patch, `!` → major | B | ⚠️ L | generate-changesets.mjs:52-64, 159. Incomplete: commits that change only `docs-site/`, `.github/`, `.claude/`, `scripts/` or root docs produce no changeset (lines 37-48, 397-401) | old: "Every type except `feat` produces a patch release, and `!` produces a major release." → new: "Every type except `feat` produces a patch release of the packages the commit changes, and `!` produces a major release. Commits that change only `docs-site/`, `.github/`, `.claude/`, `scripts/` or root docs release nothing." |
| V-C10-103 | 280-296 | `BuildResult extends BuildStats`, `build(options: BuildOptions = {}): Promise<BuildResult>` | T | ✅ | core/build.ts:206-209, 345 | |
| V-C10-104 | 300-345 | `ISGConfigurationError`, `TemplateUsageError`, `DuplicateBundleNameError`, `TemplateError` | T | ✅ | core/isg/validation.ts:19-29; core/utils/template-errors.utils.ts:9, 117-127; core/utils/bundle-matching.utils.ts:13-21 | |
| V-C10-105 | 351-375 | File hash cache with `clearFileHashCache` | X | ✅ | core/isg/hash.ts:31-37, 91-119 (simplified, same behavior for existing files) | |
| V-C10-106 | 377 | "**Bounded caches with LRU eviction:**" | B | ❌ L | The code clears the whole cache when it is full; nothing is evicted by recency (seo/utils/escape-and-validation.utils.ts:15-16, 55-63) | old: "**Bounded caches with LRU eviction:**" → new: "**Bounded caches that clear when full:**" |
| V-C10-107 | 398-405 | Batched directory creation and writes with `Promise.all` | X | ✅ | core/build.ts:1090-1092 | |
| V-C10-108 | 416-451 | SemVer; `npm run changeset`, `changeset:status`, `changeset:generate` (used by CI), `changeset:dry-run` | L | ✅ | package.json scripts; .github/workflows/publish.yml:103; .github/workflows/changeset-bot.yml:68 | |
| V-C10-109 | 453-508 | "Documentation": writing-style bullets, a page template ending in "Best practices" and "Next steps", "Use TypeScript interfaces for API docs" | V | ✂️ | Generic; the template contradicts the current docs (no Best practices lists). `AgingRule` sample matches types/isg.ts:17-22 | Replace lines 453-508 with: "## Documentation\n\nPages live in `docs-site/site/`. `docs-site/README.md` explains how to run the docs site with the local packages and the checks to run before a pull request." |
| V-C10-110 | 514-515 | GitHub Discussions and Issues | R | ✅ | `gh repo view ianchak/stati`: `hasDiscussionsEnabled: true`, `hasIssuesEnabled: true` | |
| V-C10-111 | 519-524 | "We follow the Contributor Covenant" | B | ⚠️ | No `CODE_OF_CONDUCT.md` in the repo (community profile `code_of_conduct: false`). Settle: maintainer adds the file or the section goes | Delete the "Code of conduct" section (or add the file) |
| V-C10-112 | 528-539 | "good first issue" label; suggested first contributions | R/V | ✅ / ✂️ | `gh label list`: `good first issue` exists. The "Good first issues" list repeats the steps above | Delete "### Good first issues" and its list |
| V-C10-113 | 541-543 | Closing thanks and "We're here to help" | V | ✂️ | No information | Delete lines 541-543 |

### docs-site/site/advanced/topics.md

Covers: `env.ts`, `core/build.ts`, `core/templates.ts`, `core/dev.ts`, template context in `types/content.ts`

| ID | Line | Claim | Cat | Status | Evidence | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| V-C10-114 | 15 | ISG link | R | ✅ | docs-site/site/core-concepts/isg.md | |
| V-C10-115 | 19-30 | `build()` runs a development build unless `setEnv('production')` first; `{ force: true, clean: true }` cleans output and cache and renders every page; `{ force: false }` is incremental | A | ✅ | env.ts:3 (default `NODE_ENV` or `development`); core/build.ts:363, 1283-1289 | |
| V-C10-116 | 36 | Eta caches compiled templates; the dev server keeps them between rebuilds and clears them on template changes; separate from ISG | B | ✅ | core/templates.ts:137-181 | |
| V-C10-117 | 38 | Links to `/configuration/templates` and `/api/templates#stati-propvalue-args` | R | ✅ | V-AUTO-001 | |
| V-C10-118 | 40-54 | "Static asset optimization": an `afterAll` hook that logs "Copied public assets" | V | ✂️ | Optimizes nothing; the log line is not even true when copying failed | Delete the "#### Static asset optimization" section |
| V-C10-119 | 64 | "These built-in features handle sitemap.xml and robots.txt generation automatically based on your configuration." | B | ❌ L / ✂️ | Only with `sitemap.enabled` / `robots.enabled` set and in production builds (core/build.ts:1689-1730; neither is in the default config, config/loader.ts:55-67); the linked pages cover it | Delete the sentence |
| V-C10-120 | 70-104 | Environment-based configuration | X/V | ✅ / ✂️ | Imports and behavior ✅ (`getEnv()` is `production` in `stati build`, `development` in `stati dev`, site1 log; ISG validation accepts `ttlSeconds: 0`, core/isg/validation.ts:74-90). Repeats the recipe "Environment-specific configuration" | Replace lines 68-104 with "### Environment-based configuration\n\nFor settings that differ between `stati dev` and `stati build`, see [Environment-specific configuration](/examples/recipes#environment-specific-configuration)." |
| V-C10-121 | 106-110 | Links to configuration file and Markdown pages | R | ✅ | V-AUTO-001 | |
| V-C10-122 | 118-141 | `dev.port`, `dev.open`; a throwing `beforeRender` fails the build and `stati dev` shows the overlay; `ctx.page.sourcePath` | G/B | ✅ | constants.ts:42; core/build.ts:886-888 (no catch); core/dev.ts:129, 600, 736; core/content.ts:74 | |
| V-C10-123 | 127-138 | try/catch that logs and rethrows | V | ✂️ | The catch adds a log line before the same error | Replace the hook body with: `if (!ctx.page.frontMatter.title) {` / `  // A thrown error fails the build; stati dev shows it in the error overlay` / ``  throw new Error(`Missing title in ${ctx.page.sourcePath}`);`` / `}` |
| V-C10-124 | 151-165 | `stati.page.*`, `stati.content`, `stati.site.*`; `stati.page` holds front matter, `url`, `toc`, `navNode`, `wordCount`, `readingTime`; `stati.nav`; `stati.collection` | T | ✅ | core/templates.ts:263-271; types/content.ts:545-600 | |
| V-C10-125 | 167-169 | Two closing "for more, see" lines | V | ✂️ | Line 169 repeats links given above | Delete line 169 |

### docs-site/site/information/ai-policy.md

Covers: `LICENSE`, `context7.json`, `.claude/skills/stati/*`, `docs-site/public/llms.txt`

| ID | Line | Claim | Cat | Status | Evidence | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| V-C10-126 | 13 | Documentation under the MIT License, link to `LICENSE` | R | ✅ | LICENSE:1-3; `gh repo view` licenseInfo MIT; link returns 200 | |
| V-C10-127 | 15-26 | "You are free to: Use … Copy … Adapt" then "We explicitly permit AI and LLM systems to: …" | V | ✂️ | The second list repeats the first (training, indexing, answers) | Delete the "## AI usage permissions" section (lines 19-26) and change line 15 to "- **Use** the documentation for training, inference, indexing and AI-generated answers" |
| V-C10-128 | 32-34 | Attribution requests | B | ✅ | Matches docs-site/public/llms.txt:29-32 | |
| V-C10-129 | 38 | `/llms.txt` | R | ✅ | `curl https://stati.build/llms.txt` 200, identical to docs-site/public/llms.txt | |
| V-C10-130 | 42 | Context7 indexes the docs; `use context7`, `use library /ianchak/stati`; `context7.json` controls files and rules | R | ✅ | https://context7.com/ianchak/stati returns 200; context7.json `folders`, `excludeFolders`, `rules` | |
| V-C10-131 | 46-53 | Skill bundle scope; `create-stati --agent-skill` installs it | B | ✅ | .claude/skills/stati/SKILL.md; docs-site/site/cli/scaffolder.md:112-134 | |
| V-C10-132 | 55-75 | `skills` CLI commands and the notes on one copy, `skills-lock.json`, project rules | L/V | ✅ / ✂️ | Same commands and notes as .claude/skills/stati/references/installation.md and docs-site/site/cli/scaffolder.md:136-157 | Replace lines 53-75 (from "To add it to an existing site, or update it" through "requirements and usage data.") with: "To add it to an existing site or update it, see [Add or update the skill in an existing site](/cli/scaffolder#add-or-update-the-skill-in-an-existing-site)." keeping "`create-stati --agent-skill` installs it in a new site." |
| V-C10-133 | 77-87 | `/stati` in the command menu; smoke test builds an isolated temporary example against the installed `@stati/core` | B | ✅ | .claude/skills/stati/references/installation.md (verify section); .claude/skills/stati/scripts/smoke-test.mjs:9-14, 232-233 | |
| V-C10-134 | 91 | Contact via GitHub issues | R | ✅ | issues enabled | |

### docs-site/site/404.md

Covers: docs-site `base.eta`, `partials/components/searchTemplates.eta`, `src/core/search/search-dialog.ts`

| ID | Line | Claim | Cat | Status | Evidence | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| V-C10-135 | 10-13 | "Search the docs" button opens the search dialog (`data-search-open`, `aria-controls="search-dialog"`) | B | ✅ | docs-site/src/core/search/search-dialog.ts:7, 38-39; docs-site/site/base.eta:45; built `docs-site/dist/404.html` contains `search-dialog` | |
| V-C10-136 | 17-22 | Links to quick start, configuration file, ISG, CLI commands, issues | R | ✅ | V-AUTO-001/002 | |

### docs-site/README.md

Covers: `docs-site/package.json`, `docs-site/scripts/check-snippets.mjs`

| ID | Line | Claim | Cat | Status | Evidence | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| V-C10-137 | 7-15 | Node 22.20+/24+, npm 11.5.1+, same as the root | G | ✅ | package.json and docs-site/package.json `engines` | |
| V-C10-138 | 19-33 | Build the packages at the root, `npm install` in docs-site, `dev:local` (live reload, Tailwind watcher), `build:local` (clean build), `preview:local` | L | ✅ | docs-site/package.json scripts (`--clean`, `--tailwind-input/--tailwind-output`); docs-site is not a workspace (root `workspaces`) | |
| V-C10-139 | 35 | Scripts without `:local` use the published `@stati/cli` | L | ✅ | docs-site/package.json devDependencies `@stati/cli` 2.1.0 | |
| V-C10-140 | 37-43 | `npm run typecheck` = tsc then `check:snippets`; snippets in `site/index.md` front matter checked against the installed `@stati/core` types | L | ✅ | docs-site/package.json `typecheck`; docs-site/scripts/check-snippets.mjs:1-12 | |

### docs-site/public/llms.txt

Covers: what stati.build serves (checked with curl on 2026-10-25)

| ID | Line | Claim | Cat | Status | Evidence | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| V-C10-141 | 1-2 | Points to llmstxt.org | B | ⚠️ | The file doesn't use the llmstxt.org format (an H1 with the project name, a blockquote summary, H2 sections of Markdown links); it uses `key: value` lines and robots-style `include:` rules that format doesn't define. Settle: maintainer chooses the llmstxt.org format or drops the link | If the format is adopted, new file: "# Stati\n\n> Documentation for Stati, a TypeScript-first static site generator with incremental static generation. Training, inference and indexing are allowed; see https://stati.build/information/ai-policy.\n\n## Docs\n\n- [Introduction](https://stati.build/getting-started/introduction)\n- [Configuration file](https://stati.build/configuration/file)\n- [CLI commands](https://stati.build/cli/commands)\n- [API reference](https://stati.build/api/reference)\n- [FAQ](https://stati.build/faq)\n\n## Optional\n\n- [Repository](https://github.com/ianchak/stati)\n- [@stati/core on npm](https://www.npmjs.com/package/@stati/core)" |
| V-C10-142 | 4-12 | Name, description, URL, permissions | B | ✅ | Consistent with ai-policy.md:13-26 | |
| V-C10-143 | 16-25 | Scope `include:` prefixes | R | ❌ L | `/faq/` and `/glossary/` match no page (the pages are `/faq` and `/glossary`; `curl` 301 to the slashless URL; docs-site/dist/faq.html); `/information/` (this policy) is not listed. The section folders have no index page (`/api/`, `/cli/` … return 404), which is fine for prefixes | old: `include: /faq/` → new: `include: /faq`; old: `include: /glossary/` → new: `include: /glossary`; add `include: /information/` |
| V-C10-144 | 36-40 | Key resources `/getting-started/introduction/`, `/api/reference/`, `/cli/commands/`, `/configuration/file/`, `/faq/` | R | ❌ L | Each redirects (301) to the URL without the trailing slash (curl) | Drop the trailing slashes: `/getting-started/introduction`, `/api/reference`, `/cli/commands`, `/configuration/file`, `/faq` |
| V-C10-145 | 44-45 | Repository and npm links | R | ✅ | github.com/ianchak/stati; npm page exists (curl 403 to bots) | |

### Gaps

- recipes.md: the Markdown recipe needs `markdown-it-container` installed (V-C10-045); the helpers recipe should point at the built-in `stati.page.readingTime` and `stati.page.wordCount` (V-C10-019).
- troubleshooting.md: SEO tags are not injected into a layout without `<head>` (V-C10-064).
- troubleshooting.md: a config file that throws (for example a snippet copied without `import { defineConfig } …`) is not a validation error: the build logs "Error loading config" and continues with the defaults. The "default title" entry covers the symptom; the recipe snippets are the likely cause (V-C10-022).
- contributing.md: the `pre-commit` hook (`.husky/pre-commit`) runs `lint-staged` (ESLint and Prettier on staged files), `npm run build` and `npm run typecheck` on every commit. Contributors meet it on their first commit and the page doesn't mention it. Suggested text under "Code style": "A `pre-commit` hook runs ESLint and Prettier on staged files, then `npm run build` and `npm run typecheck`."
- contributing.md: how to compare benchmarks with the baselines locally (`STATI_METRICS=1 npx vitest run packages/core/test/perf packages/images/test/perf`, then `node scripts/compare-perf.mjs`, as perf.yml does). Only if the maintainer wants local comparisons documented.

### Terminology

- "frontmatter" (recipes.md:714, 716, 728) vs "front matter" everywhere else in the cluster. Use "front matter".
- recipes.md mixes "Cache Tags:" bold pseudo-headings and "**Example frontmatter:**" with normal headings; the rest of the page uses `###` headings.
- topics.md link text "Template Configuration", "SEO Configuration", "SEO API", "SEO Usage Scenarios", "Markdown Configuration" in title case; other pages use sentence case ("Configuration file", "Build metrics").
- troubleshooting.md headings "Error: Template syntax error" and "Error: Assets not loading" prefix "Error:" while the others name the symptom; "Assets not loading" is not an error message Stati prints.
- "ISG cache" (troubleshooting.md, recipes.md) vs "cache" vs "build cache": consistent enough within the cluster; the lead should pick one across clusters.

### Cross-cluster

- scripts/generate-changesets.mjs:114 does not recognize `type(scope)!:` (see V-C10-101); AGENTS.md:258 and `.github/commit-message-guidelines.md` give `feat(core)!: ...` as the way to mark a breaking change.
- packages/core/src/types/isg.ts:18 JSDoc "Number of days after which this aging rule applies" is the reverse of ttl.ts:220 (`ageDays <= rule.untilDays`, "up to").
- packages/core/src/seo/utils/escape-and-validation.utils.ts:22-24, 59-60 call clear-on-full eviction "LRU-style".
- CONTRIBUTING.md (root): "`npm run test` # Run all tests (excludes perf tests)" is wrong (vitest.config.ts excludes only `dev-server-leak.test.ts`); "`npm run test:ci` # Lint + typecheck + test + build" (`lint:ci` lints only `examples`, `typecheck:ci` only echoes); "Every push and pull request triggers the CI workflow" (only pushes to `main`); metrics "ISG: Cache hit rate, skipped pages, rebuild reasons" (actual: `enabled`, `cacheHitRate`, `manifestEntries`, `invalidatedEntries`); CI steps omit the skill smoke test; `npm run build --workspaces` also tries the example workspaces and doesn't guarantee the core → images → cli order; examples list omits `blank`; "create-stati … in development".
- .claude/skills/stati/references/workflow.md ("Working in the Stati monorepo"): build order "core -> cli -> create-stati" omits `images`.
- docs-site/package.json: `check:snippets` checks the homepage against the published `@stati/core` 2.3.0 in docs-site/node_modules, not the 2.8.0 source; snippets using newer options would fail or pass against the wrong version.
- docs-site sections `/api`, `/cli`, `/getting-started`, … have nav nodes but no index page, so `stati.nav` links to them 404 on stati.build (`curl https://stati.build/api` 404). Not checked further.

### Phase 5 log

Re-check setup: `work/C10/site1` re-extracted from the edited `recipes.md` (`extract.mjs`) and rebuilt with the local CLI (no warnings); `site1/checkcfg.mjs` loads every config snippet with `loadConfig` in its own folder and reports a fallback; `checklinks.mjs` checks every internal link and anchor of my pages against current headings (none missing, after the other clusters' edits too).

- V-C10-009: applied (docs-sidebar and sibling-nav moved under "Section-specific navigation", "Here are practical examples:" deleted)
- V-C10-011: applied (multi-section sidebar deleted)
- V-C10-014: applied (ruling): tag filter links to `stati.url(`/blog/tags/${stati.slugify(tag)}`)`, `class="tag"`, plus one sentence linking to "A page for every tag". Re-checked: site1 `/news` links `/blog/tags/x`, `/blog/tags/y`, both built by the `[tag].md` recipe; core/templates.ts:320-323
- V-C10-015: applied. Re-checked: site1 `/news` prints `10/10/2026`
- V-C10-019: applied (helper removed, `stati.page.readingTime` in the template, one sentence). Re-checked against core/reading-time.ts:8 (230), :104 (`Math.max(1, Math.round(...))`), core/templates.ts:269-270; site1 `/notes/n` "1 min read"
- V-C10-020: applied (excerpt helper removed)
- V-C10-022: applied to all 8 `// stati.config.js` blocks. Re-checked: checkcfg loads all 8 with no fallback; the HEAD versions all print "Error loading config" (config/loader.ts:362-374)
- V-C10-028: applied. Re-checked against seo/generator.ts:230-235 and the site1 output from Phase 4
- V-C10-037: applied
- V-C10-040: applied (checkcfg block 7 loads)
- V-C10-042: applied (`ttlSeconds` line removed; `isDev` still used by `seo.debug`)
- V-C10-045: applied (install sentence). Re-checked core/markdown.ts:39-51
- V-C10-047: applied (ruling): image rule simplified to add the class and return the default rule's output, no `<figure>`. Re-checked: site1 build with the snippet's config gives `<p><img src="/cat.png" alt="A cat" class="responsive-image" width="1200" height="630" ...></p>`; markdown-it and Stati both define `rules.image` (markdown.ts:70-72), so the `||` fallback went too
- V-C10-048: applied
- V-C10-050: applied. Re-checked core/build.ts:1283-1289, constants.ts:42; `invalidate tag:recent` needs no quotes
- V-C10-056: applied, list matched to config/loader.ts:240-345 exactly: top-level unknown option and `helpers` (loader.ts:112-140), `outDir` layout (config/directories.ts:65-112: the project folder, or overlapping `srcDir`, `staticDir`, `typescript.srcDir`, `.stati`), `isg`, `images`, `readingTime`, `seo`, `sitemap.news` (news-sitemap.ts:67-70 checks only `news`), `css`. Also covers C08's cross-cluster item
- V-C10-062: applied
- V-C10-064: applied. Re-checked seo/utils/escape-and-validation.utils.ts:386
- V-C10-070: applied
- V-C10-071: applied. Re-checked core/base-path-links.ts:1-60; `/advanced/deploying-to-a-subfolder` exists
- V-C10-076: applied. Re-checked types/config.ts:408-418, types/content.ts:26
- V-C10-079: applied
- V-C10-080: applied (ruling): no swallowing; read the error, or catch, log and rethrow. Re-checked core/build.ts:652-654, 886-888, 1078-1080, 1809-1811 (no catch), core/dev.ts:121-129 (overlay); site2 run of the new sample: "beforeRender failed for /README: boom", "Build failed: boom", exit 1
- V-C10-085, V-C10-086: applied (intro and Quick start deleted; fork and PR steps remain under "Pull request process")
- V-C10-089: applied
- V-C10-090, V-C10-091, V-C10-092: applied
- V-C10-095, V-C10-096: applied. Re-checked .github/workflows/perf.yml:3-5, 37-66; scripts/compare-perf.mjs:146-151
- V-C10-097: applied (one line linking `/advanced/metrics`, which states the flags and `.stati/metrics/`)
- V-C10-099: applied (ruling H12): PR template section deleted
- V-C10-101: left (ruling H1: code bug in scripts/generate-changesets.mjs; docs example unchanged)
- V-C10-102: applied with wording corrected against scripts/generate-changesets.mjs:162-235: a root build file such as `package.json` releases every package, `examples/` counts as `create-stati`, a commit touching none of them releases nothing
- V-C10-106: applied
- V-C10-109: applied (Documentation section replaced by two sentences)
- V-C10-111: applied (ruling H12): Code of conduct section deleted
- V-C10-112, V-C10-113: applied
- V-C10-118, V-C10-119, V-C10-120, V-C10-123, V-C10-125: applied. Anchor `/examples/recipes#environment-specific-configuration` checked
- V-C10-127, V-C10-132: applied (also C02's cross-cluster item). `/cli/scaffolder#add-or-update-the-skill-in-an-existing-site` still exists after C02's edits
- V-C10-141: left (ruling H13: no format rewrite)
- V-C10-143, V-C10-144: applied. Re-checked with curl: all seven paths return 200
- Every ✅ row (100 claims): no change
- D7: every recipe template link to the site's own pages now uses `stati.url()` (menu, section nav, docs sidebar, siblings, prev/next, collection index, related posts, pagination incl. `prevUrl`/`nextUrl`/`urls`, tag pages and tag links, breadcrumbs incl. Home); one sentence added to the recipes intro. Re-checked: site1 built with `baseUrl: 'https://example.com/sub'` reports no base-path warnings and prints `/sub/...` links; `withBasePath` is safe on already prefixed paths (core/templates.ts:321-323)
- D6: `html` → `eta` fences on the recipe blocks I edited; "frontmatter" → "front matter" in recipes prose (2 places); the bash comment `# Invalidate by tag from frontmatter` left as code
- D15: `defaultAuthor.email` removed from the recipes SEO example
- D11: topics.md "Cache management" now links `/configuration/isg#cache-invalidation`
- topics.md config snippet: `import { defineConfig }` added (same issue as V-C10-022); loads with `loadConfig`
- Cross-cluster C01 (recipes.md:656 hook): verified it is `beforeAll`, no change. C02: applied as V-C10-132. C08: applied as V-C10-056
- Gaps (pre-commit hook, local perf comparison): left, not approved

Counts: applied 48 findings (plus the D6, D7, D11, D15 and topics-import changes), rejected 0, left 2 (V-C10-101, V-C10-141).
