# Scaffolding, commands, deployment, and troubleshooting

## Start a site

Check installed requirements rather than blindly upgrading runtimes. The checked
monorepo requires Node 22+ and npm 11.5.1+ (the npm constraint supports publishing
OIDC). Consumer projects should also honor the installed package's engines and
lockfile.

For a fresh project:

```sh
npx create-stati my-site --template blank --styling css
cd my-site
npm run dev
```

TypeScript + styling:

```sh
npx create-stati my-site --template blank --styling tailwind --typescript
```

Recognized scaffolder flags:

| Flag                                     | Meaning                                            |
| ---------------------------------------- | -------------------------------------------------- |
| `--template blank\|blog`                 | Minimal starter, or a complete blog                |
| `--styling css\|sass\|tailwind`          | Styling installer choice                           |
| `--typescript`, `--ts`                   | TS config/client scaffold and typecheck tooling    |
| `--no-typescript`, `--no-ts`             | JavaScript scaffold (newer versions default to TS) |
| `--no-git`                               | Skip Git initialization                            |
| `--no-install`                           | Skip dependency installation                       |
| `--package-manager npm\|yarn\|pnpm\|bun` | Choose installer                                   |
| `--help`, `-h`                           | Discover installed CLI behavior                    |

The CLI accepts `--flag=value` as well as value arguments for relevant options.
Use `npm create stati ...` as an alternative; use npm's `--` separator when
forwarding flags through npm create/run. Prefer the project's selected package
manager; examples here use npm.

Do not scaffold over an existing project or replace its package manifest.
Scaffolding can prompt, install dependencies, and initialize Git by default.
In automation, use explicit options and `--no-install`/`--no-git` where required
by the user's intent. Do not assume advertised blog/docs starters exist as
scaffolder template names in this version.

Typical site:

```text
package.json
stati.config.js or stati.config.ts
site/
  index.md
  layout.eta
  _partials/
public/
  styles.css
  images/
src/                    optional browser TypeScript or styling inputs
dist/                   generated output
.stati/                 generated cache, locks, inventory, metrics
```

Generated plain-CSS scripts usually call `stati dev`, `stati build`, and
`stati preview`. Sass/Tailwind scripts include additional orchestration. Preserve
them. Reproducible installed projects use the lockfile and CI's chosen install
command; add dependencies only when needed, not to repair unrelated tooling.

## CLI reference

Use `npm run <script> -- <flags>` when forwarding flags to a site script.

| Command                    | Options                                                                                                                                   |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `stati build`              | `--force`, `--clean`, `--config <path>`, `--include-drafts`, `--metrics`, `--metrics-file <path>`, `--metrics-detailed`, `--metrics-html` |
| `stati dev`                | `--port`, `--host`, `--open`, `--config`, `--tailwind-input`, `--tailwind-output`, `--tailwind-verbose`                                   |
| `stati preview`            | `--port`, `--host`, `--open`, `--config`                                                                                                  |
| `stati invalidate [query]` | Tag/path/glob/recent-render age invalidation; see features                                                                                |

Default dev address: `http://localhost:3000`; preview: `http://localhost:4000`.
Check config and CLI precedence for an existing site; use explicit flags for a
required bind address/port. Binding `0.0.0.0` exposes the server beyond loopback:
do it only intentionally.

- `build` selects production mode.
- `dev` builds, watches, and injects live reload/error overlay. Verify that a
  launched server is listening/responding; do not claim it is running based only
  on a process launch.
- `preview` serves **already built output**, with no rebuild/watch/live reload.
- `--force` rebuilds pages without deleting output, and can override a build
  lock. Do not override another active build casually.
- `--clean` deletes the **configured output directory and Stati cache directory**,
  then rebuilds. Confirm these resolve to disposable generated paths before use.
  Never point output to a source, workspace root, home, or shared unrelated tree.
- `--include-drafts` can produce publishable draft HTML: keep preview artifacts
  out of production deployments.
- `--config` has standard-filename/directory-loading limitations in this version;
  see configuration reference.

## Programmatic surface

For sites needing an explicit build script:

```js
import { build, setEnv } from '@stati/core';

setEnv('production');
await build({ force: true });
```

`build(options?)` returns build statistics, optionally metrics, **not rendered
HTML**. Options include `force`, `clean`, `configPath`, `includeDrafts`, `logger`,
`cliVersion`, `coreVersion`, `metrics`, and internal optimization flags
`skipCacheUpdate`, `skipManifestSave`, `skipAssetCopy`.
Do not use skip flags for normal published builds.

Public APIs also include `loadConfig`, `clearConfigCache`, `defineConfig`,
`createDevServer`, `createPreviewServer`, `invalidate`, and environment helpers.
Server lifecycle objects must be stopped when an owning script finishes.
Inspect installed signatures before custom orchestration.

## Validation gate

1. Run the site's smallest relevant tests/typecheck if present.
2. Build production output using its real styling/bundle scripts.
3. Inspect requested output files and contents: expected title/body/components,
   correct URLs, no fallback/error overlays/comments.
4. Check assets and client behavior in the production preview.
5. Verify applicable SEO, search JSON, sitemap, robots, and feed output.
6. Test missing/empty data, draft filtering, duplicate headings, and list sorting
   where those behaviors matter.
7. For incremental-sensitive changes, verify an actual change/rebuild path and
   compare it to a forced build. External data/config changes may need force.

The bundle's smoke test validates its starter and key contracts against the
installed core in an isolated temporary project. It complements, not replaces,
tests for the user's own site.

## Deploy static output

Publish the complete configured output directory, normally `dist`, including
copied assets, bundles, JSON/XML, and generated feed files. Do not publish
`site`, `.stati`, or source configuration as the site.

Set a real base URL. The checked version emits many routes as `about.html` and
`blog/post.html`, not universally as `about/index.html`.
Confirm the target host supports extensionless requests and intended trailing
slashes; configuring Stati preview is not configuring the production host.
Subdirectory hosting requires explicit path auditing. Configure redirects/404
behavior at the host or via authored files; do not assume SPA fallback is correct
for a content SSG.

Use a repeatable production build/deployment for TTL-driven updates. A static host
will not execute Stati to refresh expired cache entries on visitor requests.

## Troubleshooting by symptom

| Symptom                               | Investigate                                                                             |
| ------------------------------------- | --------------------------------------------------------------------------------------- |
| Wrong title/domain or output location | Config import errors/fallback, recognized filename, working directory                   |
| Missing component                     | `_` folder discovery, exact basename, source ancestry, Windows intermediate-path caveat |
| Error despite supplying props         | All components pre-render without props; add safe guard/defaults                        |
| Blank component from `{}`             | Empty object returns pre-rendered content; supply a real prop                           |
| Escaped tags displayed as text        | Use raw output for rendered Markdown/partial results only                               |
| Template syntax failure               | JavaScript only; no `as string`, JSX, type declarations, or undeclared locals           |
| `post.title` missing                  | Collection entries require `post.frontMatter.title`                                     |
| Missing post sidebar collection       | Parent URL normalization caveat; use guarded navigation helpers                         |
| Date sort not applied                 | Use quoted valid `publishedAt`; `date` is not universally parsed into PageModel         |
| Missing Tailwind variant              | Inventory/build order, literal class map, branches actually rendered                    |
| Bundle on wrong page                  | Output-path include/exclude patterns and unique bundle names                            |
| Missing feed/sitemap/robots in dev    | Production-only generators; run production build                                        |
| Stale rendered content                | Cache hit, hook timing, dependency tracking, force vs invalidation                      |
| Missing search file                   | Search enablement, actual hash/meta URL, excluded pages, generation logs                |
| Old route still present               | Clean disposable output after rename/delete                                             |
| Preview differs from dev              | Fresh production artifacts, host pretty-URL behavior, stale CSS/bundles                 |
| Successful build but broken page      | Read warnings/errors and inspect fallback HTML/error comments                           |

## Working in the Stati monorepo

Only if modifying/testing the generator itself: root npm workspaces build in
`core -> cli -> create-stati` order. Run `npm run build` before examples or
scaffolder checks that depend on dist. Tests are Vitest under
`packages/*/test/`, not `src/`. Docs local scripts are `build:local`, `dev:local`,
`preview:local` run from `docs-site`.
Do not copy monorepo relative package paths into independent generated sites.
