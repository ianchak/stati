# Stati AI Guide for Coding Agents

## Repo map

- Monorepo root uses npm workspaces; build flow is always `core` → `cli` → `create-stati`.
- `packages/core/src/core/*` runs the pipeline (content → markdown → templates → ISG cache). `packages/core/src/config/loader.ts` dynamically imports `stati.config.ts`.
- `packages/cli/src/cli.ts` wires yargs commands to core while `packages/cli/src/logger.ts` creates the colored logger contract used across builds.
- `packages/create-stati/src/create.ts` scaffolds from `examples/`; its build step copies templates into `dist/templates`.
- `examples/*` double as integration fixtures and `docs-site/` hosts the real documentation built with Stati.

## Build + test workflow

- Node 22+ required. Run `npm install`, then `npm run build` (workspaces chain the packages in dependency order).
- `npm run test` executes Vitest across workspaces; `npm run test:blank:full` cleans, rebuilds, and verifies the blank starter end-to-end.
- CLI and scaffolder checks assume fresh dist artifacts—run `npm run build` before touching example scripts or `test:create-stati`.

## Core engine hotspots

- `core/build.ts` streams Markdown through `renderMarkdown` into Eta `renderPage`, writing HTML under `dist/` and recording cache metadata in `.stati/cache/manifest.json`.
- Rebuild decisions come from `shouldRebuildPage` plus config hooks (`beforeAll`, `beforeRender`, `afterRender`) defined via `defineConfig()`.
- Static assets move through `copyStaticAssetsWithLogging`; preserve `logger.*` calls to keep CLI output structured.

## Eta Template Restrictions

- **CRITICAL**: Eta templates do NOT support partial dynamic attributes like `class="static-<%= dynamic %>-morestatic"`. All dynamic content in HTML attributes must be fully dynamic.
- **Solution**: Use template literals for fully dynamic values: `class="<%= `static-${dynamic}-morestatic` %>"`
- **Utility Function**: Use `stati.propValue()` for building space-separated property values (similar to classnames). It accepts strings, arrays, and objects: `class="<%= stati.propValue('base-class', `dynamic-${value}`, condition && 'conditional-class') %>"` or `data-analytics="<%= stati.propValue('cta', campaign, isPrimary && 'primary') %>"`.
- **Concatenation Note**: When you need a single concatenated value (e.g., `data-id="item-42"`), prefer a template literal: `data-id="<%= `item-${id}` %>"`.
- **Common Pattern**: Build dynamic segments with template literals before passing them to `propValue`: `class="<%= stati.propValue('card', `hover:border-${color}-300`) %>"`.

## Dev + preview servers

- `createDevServer` (in `core/dev.ts`) clears cache, triggers an initial build, then watches `site/` and `public/`. Template edits flow through `handleTemplateChange` to evict affected manifest entries.
- Build failures feed the in-browser overlay produced by `utils/error-overlay.ts`; prefer surfacing errors via the logger instead of throwing inside incremental rebuilds.
- `createPreviewServer` serves the built `dist/` with the same logger expectations as dev.

## CLI surface

- yargs commands live in `packages/cli/src/cli.ts`; each command calls `setEnv` before delegating to core and reuses the shared logger factory.
- Options surfaced to users (`--force`, `--clean`, `--include-drafts`, invalidate queries like `tag:news` or `age:3months`) must line up with `BuildOptions`/`InvalidateOptions` in core.
- Version banners rely on reading the package JSON; keep `getVersion()` in sync when moving files.

## Scaffolder specifics

- `src/index.ts` parses flags, prompts for missing values, and hands control to `createSite` in `create.ts`.
- Styling choices map to installers in `css-processors.ts`; updating templates requires touching both `examples/` sources and the copy routine in the package build script.
- Generated projects expect `site/layout.eta`, `site/index.md`, and `public/styles.css`; maintain these when extending templates.

## Conventions

- Packages ship as ESM (`"type": "module"`); import locals with explicit `.js` extensions and use helpers from `core/utils/fs.ts` instead of `fs` directly.
- Strict TypeScript everywhere; export runtime symbols and types from separate barrels (`types/` for declarations). Avoid default exports except in configs.
- Tests live beside features (`packages/*/src/tests`), use Vitest in `node` mode with `mockReset`/`restoreMocks`, and prefer temporary directories for file-system assertions.
- **Utils naming**: All utility files in `utils/` folders must use the `.utils.ts` suffix (e.g., `fs.utils.ts`, `error-overlay.utils.ts`). Each `utils/` folder must have an `index.ts` barrel that re-exports all utilities from that folder.

## Troubleshooting

- Cache hiccups: clear `.stati/` or run `stati build --clean`; the invalidate logic lives under `core/invalidate.ts`.
- If templates stop refreshing, inspect dependency tracking in `core/isg/manifest.ts`; `handleTemplateChange` expects POSIX-normalized paths.
- For docs regressions, run `npm run build` followed by entering the directory `docs-site` and running one of the local scripts. In the `docs-site` dir `npm run build:local` to confirm build is running with local CLI. In the `docs-site` dir `npm run dev:local` to start a dev server with local CLI. In the `docs-site` dir `npm run preview:local` to preview the static build with local CLI.
