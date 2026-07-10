# Implementation Plan: Docs-Site Performance & Design Refresh

## Metadata

- Status: VALIDATED
- Current Phase: Complete — plan validated against codebase (see Refinement Log V1)
- Generated: 2026-07-11
- Scope: `docs-site/` only (no changes to `packages/core`, `packages/cli`, `packages/create-stati`)
- Related prior doc: `docs/docs-site-minimal-pro-refresh-design.md` (narrower — syntax/readability only; this plan supersedes and extends it)

## 0. Requirements (Raw)

> Improve docs-site overall feel of performance and also the design to appeal a js/ts
> developer in his 30s and 40s, do conscious design decisions to improve the docs site,
> docs-site should feel fancy but minimal and fast.

## 1. Requirements Analysis

### 1.1 Functional Requirements

| ID   | Requirement | Acceptance Signal |
| ---- | ----------- | ----------------- |
| FR-1 | Reduce initial and interaction load cost so the site *feels* fast (fast first paint, minimal main-thread jank, snappy navigation). | Homepage JS payload materially reduced from the current ~328 KB `home.js` (primarily by removing/replacing the eager tsParticles dependency); no long tasks blocking first interaction. |
| FR-2 | Refine visual design toward "fancy but minimal" tuned for a senior JS/TS developer audience (30s–40s). | Reduced decorative noise, refined type scale, restrained motion, consistent light/dark treatment. |
| FR-3 | Fix the font pipeline inconsistency (declared font stack vs. shipped fonts) so typography is intentional and consistent. | The font family actually rendered matches the fonts that are preloaded/shipped; no silent fallback to unintended system fonts. |
| FR-4 | Make every design change a *conscious, documented decision* (rationale captured), not incidental restyling. | Each change in Section 4 references a rationale in Section 3 / this analysis. |
| FR-5 | Preserve all existing functionality: search, TOC, sidebar, theme toggle, reading progress, scroll-to-top, mobile menu, view transitions, RSS/sitemap/SEO. | Manual + smoke checks pass for each feature after changes. |
| FR-6 | Improve perceived-performance affordances (font-display, skeleton/reserved space to avoid layout shift, motion that respects `prefers-reduced-motion`). | No new CLS regressions; reduced-motion users get a static experience. |

### 1.2 Non-Functional Requirements

| ID    | Requirement | Target |
| ----- | ----------- | ------ |
| NFR-1 | Performance budgets. | Homepage transferred JS < 60 KB gzip (excl. optional lazy particles); docs page JS < 40 KB gzip; CSS < 30 KB gzip; LCP < 1.5 s on mid-tier laptop over local preview; CLS < 0.05; TBT < 150 ms. |
| NFR-2 | Accessibility preserved/improved. | Contrast AA in both themes; focus-visible retained; reduced-motion fully honored; skip-link works. |
| NFR-3 | No new heavy runtime dependencies. | Net dependency weight must not increase; ideally decreases (particles made optional/removed). |
| NFR-4 | Build stays green. | `npm run typecheck` and `npm run build:local` succeed; no console errors on built pages. |
| NFR-5 | Maintainability. | Design tokens centralized; changes are minimal-surface and documented for maintainers. |
| NFR-6 | Cross-theme + cross-viewport parity. | Visual QA at 360 / 768 / 1280 / 1920 px, light + dark. |

### 1.3 Implicit Requirements

- "Fancy but minimal" = intentional restraint: fewer but higher-quality visual accents (typography, spacing, one or two signature accents) instead of many competing effects (particles + animated orbs + 16rem gradient title + glow shadows all at once).
- "Fast" is both *measured* (bundle/LCP/CLS) and *felt* (no jank, instant theme switch, no font swap flash, stable layout).
- Senior JS/TS audience expects: precise code samples, excellent monospace rendering, high information density, low chrome, dark mode as a first-class citizen, keyboard affordances (search `/`, etc.).
- Changes must respect Stati/Eta constraints (no partial dynamic attribute interpolation; use `stati.propValue()`), and the docs-site build pipeline (Tailwind purge via `content` globs incl. `.stati/tailwind-classes.html`).

### 1.4 Scope Boundaries

**In scope**

- `docs-site/src/styles.css`, `docs-site/tailwind.config.js` — design tokens, type scale, motion, component styles.
- `docs-site/site/layout.eta`, `docs-site/site/_sections/*`, `docs-site/site/_components/*`, `docs-site/site/_home/*` — template polish and motion/decoration adjustments.
- `docs-site/src/**` TypeScript bundles — code-splitting, lazy-loading particles, trimming/deferring non-critical JS.
- `docs-site/public/prism-stati.css`, `docs-site/public/fonts/*` — syntax theme + font pipeline correctness.
- `docs-site/stati.config.ts` — bundle definitions if splitting changes are needed.
- Maintainer documentation of the design decisions.

**Out of scope (explicitly)**

- Any change to `packages/core`, `packages/cli`, `packages/create-stati`, or the Stati engine behavior.
- Information architecture / navigation restructure or content rewrites of the Markdown docs.
- Migrating the highlighter away from the markdown-it Prism pipeline.
- Adding a new client framework (React/Vue/etc.) or a CSS framework swap away from Tailwind.
- Search algorithm/engine replacement (only load-strategy tuning if needed).
- Backend/hosting/CDN configuration.

### 1.5 Assumptions

- **Node/npm baseline**: Node 22+, npm 11.5.1+ (repo requirement); Tailwind + esbuild pipeline already in place via Stati.
- **Build pipeline reality (critical)**: Stati compiles each configured bundle with a **separate esbuild `build()` call using `bundle: true` but NOT `splitting: true`** (verified in `packages/core/src/core/utils/typescript.utils.ts`), and registers only the **first `.js` output** as the bundle path. Consequences: a dynamic `import()` of a local module is **inlined into the same entry bundle** — it does **not** produce a separately-loaded async chunk. Therefore **true client-side lazy code-splitting is not achievable within docs-site scope**; JS-weight reduction must come from (a) removing/replacing heavy dependencies and (b) assigning modules to the correct per-route bundle via `include`/`exclude`. Engine-level splitting is a separate, out-of-scope initiative (see Section 14).
- **Fonts**: Only `inter.woff2` and `fira-code.woff2` are shipped/preloaded; the declared Tailwind stacks (`IBM Plex Sans`, `Aptos`, `JetBrains Mono`) are *not* shipped. Assumption: the intended, licensable, already-shipped fonts are **Inter** (sans) and **Fira Code** (mono); the stack will be aligned to these rather than shipping additional font files. (Auto-resolved from disk inventory — see Section 14.)
- **Particles**: The tsParticles hero background is decorative only. Given the bundling reality above (it cannot be truly lazy-loaded), the **default decision is to remove tsParticles** and replace the "fancy" accent with a lightweight, dependency-free CSS/SVG treatment. (Auto-deferred: default = remove + CSS accent; keeping it eager is the only "keep" option and is rejected on the "fast" requirement. See Section 14.)
- **Metrics tooling**: Stati `--metrics`/`--metrics-html` build flags and Lighthouse (via local preview) are the measurement instruments; no CI perf gate exists yet, so verification is manual against the budgets in NFR-1.
- **Design direction**: "Fancy but minimal" is interpreted as *editorial/technical* (strong typographic hierarchy, restrained accent color, precise code blocks) rather than *maximalist* (heavy animation, particles, oversized gradients).
- **Visual regression**: No automated visual-diff harness exists; QA is manual screenshot comparison across the matrix in NFR-6.

## 2. Codebase Context

### 2.1 Relevant Existing Code

| Path | Relevance | Notes |
| ---- | --------- | ----- |
| `docs-site/tailwind.config.js` | Design tokens (colors, fonts, spacing, shadows, animations, keyframes). | Sans stack leads with unshipped `IBM Plex Sans`/`Aptos`; mono leads with unshipped `JetBrains Mono`. Central token surface. |
| `docs-site/src/styles.css` (426 lines) | Base layer (CSS vars, `@font-face`, scrollbars, focus), components layer (`.prose`, `.nav-link`, `.sidebar-link`), view transitions, reduced-motion block. | Compiled to `dist/styles.css` (~124 KB min). Primary design + token file. |
| `docs-site/site/layout.eta` | Root document: head (preloads, stylesheets, modulepreload), body shell, reading-progress bar, sidebar/TOC layout, scroll-to-top, search templates. | Controls critical-path asset order and global chrome. |
| `docs-site/site/_sections/header.eta` | Sticky header: logo, nav, search trigger, theme toggle, GitHub, mobile menu. | Heavy `transition-all` usage; gradient brand text. |
| `docs-site/site/_home/hero.eta` | Homepage hero: 16rem gradient title, animated `blur-3xl` orbs (`animate-pulse`), `#particles-js` container, CTA buttons. | Highest decorative density; primary "minimal" target. |
| `docs-site/src/home/particles.ts` (186 lines) | tsParticles init (`@tsparticles/engine` + `/slim`), 60 particles, opacity/size animation, dark-mode reactive. | Root cause of ~328 KB `home.js`. Lazy/optional target. |
| `docs-site/src/home.ts` / `src/home/index.ts` | Homepage entry: eagerly imports `initParticles` on `DOMContentLoaded`. | Static import forces particles into main homepage chunk. |
| `docs-site/src/core.ts` / `core/*` (theme 110, mobile-menu 57) | Shared bundle: theme toggle, mobile menu, search UI init. | `core.js` ~93 KB — investigate what inflates it (search-ui pulled into core?). |
| `docs-site/src/docs.ts` / `docs/*` (sidebar 406, search-ui 611, toc 129) | Docs bundle: sidebar, TOC, scroll-to-top, reading progress, search. | `docs.js` ~89 KB; search-ui is the largest single module. |
| `docs-site/src/core/index.ts` | Barrel exporting `initTheme`, `initMobileMenu`, `initSearchUI`. | `initSearchUI` in core means the 611-line search UI ships on *every* page. Split candidate. |
| `docs-site/public/prism-stati.css` (~4 KB) | Custom Prism syntax theme. | Align to refreshed palette (carry over prior design doc intent). |
| `docs-site/public/fonts/{inter,fira-code}.woff2` | The only shipped font binaries. | Ground truth for FR-3 font alignment. |
| `docs-site/stati.config.ts` | Bundle definitions (`core`, `home`, `docs`) with include/exclude routing. | Controls which JS ships to which routes; edit point for split changes. |
| `docs-site/dist/_assets/*` | Built artifacts; multiple stale hashed `docs-*`/`home-*` chunks present. | Confirms bundle sizes; hygiene item (clean build). |

### 2.2 Patterns to Follow

- **ESM + `.js` import extensions** in `src/**` TypeScript (per repo convention). Barrels (`index.ts`) re-export module inits.
- **Bundle-per-surface** via `stati.config.ts` `typescript.bundles[]` with `include`/`exclude` route globs (existing pattern: `home` on `/`, `docs` excludes `/`, `core` everywhere).
- **`DOMContentLoaded` init** pattern in each `*.ts` entry calling feature `init*()` functions.
- **CSS variables for theme tokens** (`--docs-*`) set in `@layer base` on `html` / `html[data-theme='dark']`; component styles consume the vars — extend this token system rather than hardcoding colors.
- **Tailwind `@apply` in `@layer components`** for reusable classes (`.prose`, `.nav-link`, `.sidebar-link`).
- **`stati.propValue()`** for any dynamic/conditional class assembly in Eta (never partial attribute interpolation).
- **Preload critical fonts** + `font-display: swap` + fallback `@font-face` with metric overrides (`size-adjust`, `ascent-override`) — already present for Inter/Fira; keep this anti-CLS pattern.
- **`prefers-reduced-motion` guard** exists at bottom of `styles.css`; extend it to cover *all* new/existing motion.

### 2.3 Types to Reuse

- tsParticles types already imported in `particles.ts`: `Container`, `ISourceOptions` from `@tsparticles/engine` — reuse when refactoring to dynamic import.
- Search types in `docs/search/types.ts` (`SearchDocument`, etc.) — unchanged; only load strategy may change.
- No new cross-cutting types required for CSS/token/template changes. Any new TS helper (e.g., an `onIdle`/lazy-loader utility) should export a small typed function signature and live under `src/core/` with a `.ts` module + barrel export.

### 2.4 Integration Points

- **Tailwind `content` globs** (`tailwind.config.js`): `./site/**/*.{md,eta,html}`, `./public/**/*.js`, `./.stati/tailwind-classes.html`. Any new class used only in TS-generated DOM must be safelisted or present in these sources or it will be purged.
- **`stati.config.ts` → esbuild bundles**: each bundle entry is compiled by a **separate esbuild `build()` with `bundle: true`, `format: 'esm'`, and NO `splitting`** (see `typescript.utils.ts`). A dynamic `import()` is therefore inlined into the entry, not emitted as a loadable chunk; only the first `.js` output is registered as the route bundle. Weight reduction = remove heavy deps + route modules to the right bundle via `include`/`exclude`; it is **not** achievable via dynamic import within this scope.
- **`layout.eta` `<head>` asset order + `modulepreload`**: bundle path list comes from `stati.assets.bundlePaths`; changing bundles changes preloads automatically — verify order stays correct (CSS before JS; critical fonts preloaded).
- **`build:css` script**: CSS is built separately via `tailwindcss --minify`; token/`@layer` changes flow through this. Purge correctness depends on 2.4 globs.
- **View Transitions API** (`@view-transition` in CSS + `<meta name="view-transition">`): navigation animations; must remain smooth and reduced-motion-safe after changes.
- **Prism theme** (`prism-stati.css`) is linked in `layout.eta`; palette must stay in sync with refreshed tokens.

### 2.5 Constraints & Anti-Patterns

- **Do not** use partial dynamic attribute interpolation in Eta (`class="x-<%= y %>"`). Use template literals or `stati.propValue()`.
- **Do not** modify engine packages; all changes stay in `docs-site/`.
- **Do not** introduce classes only in runtime JS strings without ensuring Tailwind can see them (purge risk) — prefer static classes in `.eta` or the safelist file.
- **Avoid** adding new large runtime dependencies (the whole point is to *reduce* weight).
- **Avoid** over-animating; every motion must have a reduced-motion fallback.
- **Beware** the font mismatch anti-pattern: declaring fonts in the stack that are never loaded produces inconsistent rendering across OSes — align declared vs. shipped fonts.
- **Beware** eager static imports of heavy libs (tsParticles) — they bloat the entry chunk even when the feature is off-screen or motion-disabled.

## 3. Technical Architecture

### 3.1 Component Overview

The refresh has four coordinated workstreams, each mapping to an existing surface:

1. **Design Token & Type System** (`tailwind.config.js`, `styles.css` base layer): consolidate/refine color, spacing, radius, shadow, and typography tokens; establish a deliberate type scale; fix font stacks to shipped fonts; add a single restrained accent treatment.
2. **Chrome & Layout Polish** (`layout.eta`, `_sections/*`, `_components/*`): reduce transition/decoration noise, tighten header/sidebar/TOC, ensure stable layout (reserve space, avoid shift), keep keyboard/search affordances prominent.
3. **Hero De-noising & Motion Discipline** (`_home/hero.eta`, `home/particles.ts`, `styles.css` motion): replace the maximalist hero (16rem title + `blur-3xl` orbs + tsParticles) with a refined, minimal-but-premium hero using a **dependency-free CSS/SVG accent** (e.g., subtle grid/gradient or a tiny static SVG) instead of the ~235 KB particle library; extend reduced-motion coverage to *all* motion (orbs, smooth scroll, transitions) including a live `matchMedia` change listener.
4. **JS Performance / Bundle Right-Sizing** (`src/**`, `stati.config.ts`): the dominant win is **removing tsParticles** (collapses `home.js` from ~328 KB toward the low tens of KB). Secondary: keep the always-on `core` bundle lean, defer *cheap* non-critical listener attachment to idle, and clean stale build artifacts. Note: search UI cannot be truly code-split within scope (Section 2.4/1.5); it stays in the bundle(s) that need it, and deeper splitting is flagged as an engine follow-up (Section 14).

### 3.2 Data Flow

- **Build time**: `stati build` compiles `.eta` + Markdown → HTML; esbuild builds `core`/`home`/`docs` bundles per `stati.config.ts`; `build:css` runs Tailwind purge over `content` globs → `dist/styles.css`. Stati injects `modulepreload` for each route's bundle paths and the search-index meta tag.
- **Runtime (page load)**: HTML parsed → `<head>` preloads fonts + CSS + module bundles → `core` bundle inits theme (reads `localStorage`/`prefers-color-scheme`) + mobile menu + search trigger → route bundle (`home` or `docs`) inits feature modules on `DOMContentLoaded`.
- **Refactored runtime (target)**: theme init stays render-critical via the inline `themeInit` partial (unchanged, to avoid FOUC). The hero no longer loads any particle library — its accent is pure CSS/SVG, so there is zero hero JS cost. Search remains available site-wide from its existing bundle (it cannot be split off without engine support); its cost is accepted and offset by the large particle removal. Cheap, non-critical listener attachment (scroll-to-top, reading-progress) may be deferred to `requestIdleCallback` to shorten TBT, but only where it does not delay a visible/interactive affordance.

### 3.3 State Management

- **Theme**: `data-theme` + `.dark` class on `<html>`, persisted in `localStorage`, initialized by the inline `themeInit` partial before paint (must remain to prevent theme flash). Refactor must not move theme init later in the critical path.
- **Motion preference**: `matchMedia('(prefers-reduced-motion: reduce)')` gates decorative CSS animation. Because particles are removed, there is no runtime particle to stop; however a `matchMedia` **change listener** must still toggle `scroll-behavior` and any JS-driven smooth scrolling (TOC anchor scroll, scroll-to-top) so a mid-session preference change is honored. Single source of truth reused by CSS + JS.
- **Search**: index fetched on demand by the existing search module; UI state local to the module. It is initialized eagerly from its bundle (no split available); all existing triggers — desktop dropdown input, header `search-trigger`, `mobile-search-btn`, `/` and Cmd/Ctrl+K shortcuts — must keep working unchanged.
- **No global store**: state stays per-module (existing pattern); the only new shared primitive is an idle/lazy-load helper.

### 3.4 Integration Map

> Every new/changed component must have a consumer and a registration/initialization point.

| Component | Consumed By | Registered In | Initialization Code | Wire-Up Notes |
| --------- | ----------- | ------------- | ------------------- | ------------- |
| Refined design tokens (colors/fonts/shadows/spacing) | All templates via Tailwind classes + CSS vars | `tailwind.config.js` `theme.extend`; `styles.css` `@layer base` vars | Consumed at build (Tailwind) and runtime (CSS vars) | Font stack must reference only shipped families; purge globs unchanged |
| Aligned font pipeline (Inter/Fira) | `body`/`.prose`/`code` | `styles.css` `@font-face` + Tailwind `fontFamily`; preloads in `layout.eta` | Browser loads preloaded woff2, `font-display: swap` + fallback metrics | Remove unshipped families from stacks; keep fallback `@font-face` overrides; re-evaluate preloading Fira (not above-the-fold) |
| CSS/SVG hero accent (replaces particles) | Homepage hero | `site/_home/hero.eta` + `styles.css` | Rendered server-side; no JS | Remove `#particles-js`, `particles.ts`, `initParticles`; drop `@tsparticles/*` deps |
| Search (unchanged, eager) | `core` bundle (site-wide) | `src/core/index.ts` → `initSearchUI` | Existing `DOMContentLoaded` init | Cannot be split without engine support; keep all triggers working (desktop input, header/mobile buttons, `/`, Cmd/Ctrl+K) |
| Idle-defer helper (`onIdle`) | scroll-to-top, reading-progress | `src/core/*` new util + barrel | `requestIdleCallback` (fallback `setTimeout`) wrapper | Must NOT defer theme init, sidebar, or any visible affordance; marginal TBT win only |
| Reduced-motion gate | Hero accent, view transitions, smooth scroll, micro-animations | `styles.css` `@media (prefers-reduced-motion)` + JS `matchMedia` change listener | CSS disables animation + `scroll-behavior: auto`; JS uses instant scroll | Single predicate reused by CSS + JS; honor live preference changes |
| Refined hero | Homepage | `site/_home/hero.eta` | Rendered server-side | Reserve stable space (no CLS); tasteful gradient/typography accent |

### 3.5 Concrete Design Decisions

> These satisfy FR-4 (conscious, documented decisions). Rationale is framed around **technical-reading workflows** (dense reference docs, code-heavy pages, fast scanning) — not audience age. Exact values are the recommended defaults for implementation; adjust only with a recorded reason.

**Typography (technical reading, ~66–75ch measure)**
- Body: 16–17px, line-height 1.7, measure capped at `74ch` (already in layout) — optimal for prose scanning.
- Type scale (major-second-ish, tightened): h1 `2.25–2.9rem`, h2 `1.75–2rem`, h3 `1.35–1.5rem`, h4 `1.15rem`, small/caption `0.8125rem`. Tighter than current 16rem-class hero extremes.
- Hero title: reduce from `16rem` class to a responsive `clamp(3rem, 8vw, 6rem)` — bold and present without dominating or causing overflow/CLS.
- Mono: Fira Code at `0.84em` inline / `0.875rem` in blocks; enable ligatures only in code blocks, not inline identifiers.

**Color & accent (single restrained accent)**
- Keep one accent hue (blue `primary`); remove `glow`/`glow-lg` decorative shadows from default usage (retain tokens for opt-in). Accent used for: links, active nav/sidebar, h2 bar marker, focus ring, primary CTA — nowhere else.
- Contrast targets: body text ≥ 7:1 where feasible (AAA) and never below 4.5:1 (AA) in both themes; muted/caption text ≥ 4.5:1.

**Spacing, radius, elevation (tiered, minimal)**
- Radius tiers: `sm 6px` (inputs/kbd), `md 10–12px` (cards/buttons), `lg 16px` (code blocks). No mixing beyond these.
- Elevation: two tiers only — `soft` (resting cards) and `soft-lg` (overlays/menus). Drop ad-hoc glows.
- Density: comfortable but efficient — section rhythm via consistent `mt-14/mb-4` heading spacing (already present); avoid oversized vertical padding in chrome.

**Motion (subtle, purposeful, reduced-motion-safe)**
- Durations: micro-interactions 120–160ms, entrances 200–300ms; easing `ease-out`. No infinite decorative loops in the default (reduced-motion-independent) experience beyond a single very-subtle hero accent, which is itself disabled under reduced-motion.
- Replace broad `transition-all` with explicit `transition-colors`/`transition-transform` to avoid animating layout/paint-heavy properties.

**Chrome**
- Sticky header stays; `backdrop-blur` retained but transitions scoped. Sidebar/TOC: crisp active states, quiet resting states, generous hit targets (≥ 40px). Search affordance (`/`) remains visibly discoverable in the header.

## 4. Implementation Steps

### Phase 1: Foundation (tokens, fonts, measurement baseline)

1. **Capture baseline metrics** (no code change): build with `npm run build:local` (which runs `stati build` **then** `npm run build:css`), then `npm run preview:local` and measure with Lighthouse. Record: **gzip** transfer of each route's JS (`core`+`home` for `/`; `core`+`docs` for a docs page), **gzip** of final `dist/styles.css`, and LCP/CLS/TBT. Use a fixed methodology (see Section 10) so before/after is comparable. This is the before-state for NFR-1.
2. **Resolve font pipeline (FR-3)**: in `tailwind.config.js`, set `fontFamily.sans` to lead with `Inter` (then `Inter Fallback`, system stack) and `fontFamily.mono` to lead with `Fira Code` (then `Fira Code Fallback`, mono stack); remove `IBM Plex Sans`, `Aptos`, `Segoe UI Variable`, `JetBrains Mono` unless those binaries are added. Keep existing `@font-face` + fallback metric overrides in `styles.css`.
3. **Consolidate design tokens**: review/adjust `colors.primary` and `colors.dark` scales and `boxShadow` (`soft`, `soft-lg`, `glow*`) toward the "minimal/premium" direction — retain a single restrained accent (blue) and de-emphasize `glow*` usage. Introduce/confirm CSS vars for any color used in both light/dark component styles.
4. **Establish deliberate type scale**: audit `.prose` heading/body sizes and line-height in `styles.css` for density + rhythm suited to technical reading (senior dev audience); document the chosen scale as the canonical hierarchy.

### Phase 2: Core Implementation (design polish)

5. **Hero refinement (FR-2)**: in `_home/hero.eta`, reduce the title to `clamp(3rem, 8vw, 6rem)` (per 3.5); remove the animated `blur-3xl` orbs and the `#particles-js` container; replace with a single **dependency-free** accent — a subtle CSS radial/linear gradient wash and/or a small static SVG motif — that reads as premium without JS. Ensure the hero reserves stable space (no CLS). (Particle dependency removal is wired in Phase 3 step 9.)
6. **Chrome polish**: in `header.eta`, `sidebar.eta`, `toc.eta`, `footer*.eta`, replace broad `transition-all` with specific transitions (color/transform), tighten spacing, and ensure focus/hover states are crisp in both themes. Keep search `/` affordance visible.
7. **Prose & code block polish**: refine `.prose` code, `pre`, table, blockquote, and link styles in `styles.css`; align `prism-stati.css` palette to refreshed tokens (carry intent from prior design doc). Prioritize monospace legibility and copy-friendly code blocks.
8. **Motion discipline**: extend the `@media (prefers-reduced-motion: reduce)` block to cover the hero accent, any header/nav micro-animations, `scroll-behavior` (set `auto`), and smooth-scroll JS paths; ensure all decorative keyframes are gated. Replace broad `transition-all` with explicit `transition-colors`/`transition-transform` (per 3.5).
8b. **CSS reduction strategy (concrete)**: measure `dist/styles.css` **gzip/Brotli** size (not raw) as the real budget (NFR-1 targets are compressed). Audit generated CSS for: unused component classes, redundant per-section `.sidebar-link.active-*` variants (collapse to a single data-attribute-driven rule if feasible), and over-broad safelisted classes in `.stati/tailwind-classes.html`. Remove decorative `glow*`/animation utilities no longer used after hero simplification. Re-run `build:css` and confirm compressed size drop. Note: Stati's `--metrics` report is generated *before* `npm run build:css`, so CSS size must be measured on the final `dist/styles.css`, not from the metrics report.

### Phase 3: Integration & Wiring (performance / bundle right-sizing)

> CRITICAL: explicit wiring so components connect end-to-end. NOTE: true lazy code-splitting is unavailable (Section 2.4); wins come from dependency removal + idle deferral of cheap work.

9. **Remove tsParticles (primary perf win)**: delete `#particles-js` usage from `_home/hero.eta`, remove `src/home/particles.ts`, and drop `initParticles` from `src/home/index.ts` and `src/home.ts`. Remove `@tsparticles/engine` and `@tsparticles/slim` from `docs-site/package.json`. Replace the visual with the CSS/SVG hero accent (step 5). **Verify**: `home.js` transfer collapses from ~328 KB to the low tens of KB (only `tabs` remains); no runtime errors on `/`.
10. **Add `onIdle` helper**: create `src/core/idle.ts` (typed `onIdle(cb)` using `requestIdleCallback` with `setTimeout` fallback) and export via `src/core/index.ts`. Consumers: step 11.
11. **Defer cheap non-critical init**: wrap listener attachment for `initScrollToTop` and `initReadingProgress` in `onIdle` (these are not needed for first paint or first interaction). Keep `initTheme`, `initMobileMenu`, `initSearchUI`, `initSidebar`, and `initToc` immediate (they back visible/interactive affordances). **Verify**: features still function; TBT unchanged or improved.
12. **Add live reduced-motion listener**: in a small shared module (or `initTheme`'s scope), attach a `matchMedia('(prefers-reduced-motion: reduce)')` `change` listener that flips `document.documentElement.style.scrollBehavior` and is consulted by JS smooth-scroll paths (TOC anchor scroll, scroll-to-top). **Verify**: toggling OS reduced-motion mid-session switches scrolling between smooth and instant.
13. **Confirm bundle delivery**: after a clean build, inspect `dist/_assets` and the emitted `modulepreload` links in built HTML; confirm each route ships only its intended bundle(s) (`core` + `home` on `/`; `core` + `docs` elsewhere) and that no stale/duplicate hashed chunks remain. **Verify** against measured sizes (step 16). Do NOT rely on async chunks (none are produced).

### Phase 4: Polish (verification, hygiene, docs)

14. **Clean build & artifact hygiene**: run `npm run clean && npm run build:local`; confirm no stale hashed `docs-*`/`home-*` chunks and that `dist/styles.css` shrank (purge working).
15. **Full QA matrix**: verify FR-5 features and NFR-6 viewports/themes; check no console errors; confirm view transitions and theme toggle have no flash.
16. **Re-measure**: repeat step 1's measurement; confirm budgets in NFR-1 are met; record before/after in the maintainer doc.
17. **Maintainer documentation**: update/extend `docs/docs-site-minimal-pro-refresh-design.md` (or add a short "performance & design decisions" note) capturing each conscious decision and its rationale (FR-4).

## 5. File Changes

### New Files

| Path | Purpose | Key Exports |
| ---- | ------- | ----------- |
| `docs-site/src/core/idle.ts` | Idle-deferral helper for non-critical init and lazy loads. | `onIdle(cb: () => void): void` |
| `docs-site/public/fonts/*` (conditional) | Only if the team elects to ship additional families instead of aligning to Inter/Fira. | n/a (binaries) |

### Modified Files

| Path | Changes | Reason |
| ---- | ------- | ------ |
| `docs-site/tailwind.config.js` | Fix `fontFamily.sans`/`mono` to shipped fonts; refine color/shadow tokens; prune `glow*` emphasis. | FR-2, FR-3, NFR-5 |
| `docs-site/src/styles.css` | Token vars, type scale, prose/code polish, expanded reduced-motion block, motion gating. | FR-2, FR-6, NFR-2 |
| `docs-site/public/prism-stati.css` | Palette aligned to refreshed tokens; legibility. | FR-2 |
| `docs-site/site/_home/hero.eta` | De-noise hero (title scale, orbs), stable layout, particle container disposition. | FR-2, FR-6 |
| `docs-site/site/layout.eta` | Verify/adjust preload + modulepreload ordering for split bundles. | FR-1, NFR-1 |
| `docs-site/site/_sections/{header,sidebar,toc,footer,footerBrand,footerSection}.eta` | Chrome polish; scope transitions; spacing/contrast. | FR-2 |
| `docs-site/site/_components/{button,link,icon,sectionHeader}.eta` | Consistency with refined tokens. | FR-2 |
| `docs-site/src/home.ts`, `src/home/index.ts` | Remove `initParticles` import/call. | FR-1, NFR-1, NFR-3 |
| `docs-site/src/home/particles.ts` | **Deleted.** | FR-1, NFR-3 |
| `docs-site/src/core.ts`, `src/core/index.ts` | Add `onIdle` helper + reduced-motion listener wiring; search stays. | FR-1, FR-6 |
| `docs-site/src/docs.ts`, `src/docs/index.ts` | Defer `initScrollToTop`/`initReadingProgress` via `onIdle`. | FR-1 |
| `docs-site/package.json` | Remove `@tsparticles/engine` + `@tsparticles/slim` deps. | NFR-3 |
| `docs-site/stati.config.ts` | (Likely unchanged — no split possible; edit only if a bundle needs re-scoping.) | FR-1 |
| `docs/docs-site-minimal-pro-refresh-design.md` | Extend with performance + design decision log. | FR-4, NFR-5 |

### Integration Touchpoints

| File | Integration Change | Connects Component | To System |
| ---- | ------------------ | ------------------ | --------- |
| `docs-site/stati.config.ts` | Adjust `typescript.bundles[]` only if a bundle needs re-scoping (no split available). | Bundle routing | esbuild build + per-route JS delivery |
| `docs-site/site/layout.eta` | Verify `modulepreload` lists only configured route bundles (no async chunks exist). | Route bundles | Critical-path asset loading |
| `docs-site/tailwind.config.js` `content` | Keep globs covering static classes; prune stale safelist entries. | Refined tokens/classes | Tailwind purge |
| `docs-site/src/core/index.ts` | Export `onIdle`; wire reduced-motion listener. | idle helper + motion gate | core bundle init |
| `docs-site/package.json` | Drop `@tsparticles/*`. | Particle removal | Dependency graph / bundle size |

## 6. Data Structures

- `onIdle(callback: () => void): void` — schedules non-critical work; uses `requestIdleCallback` when available, else `setTimeout(cb, ~1)`. No return; fire-and-forget.
- `prefersReducedMotion(): boolean` and a `change`-listener registrar — single source of truth for CSS/JS motion gating; toggles `document.documentElement.style.scrollBehavior`.
- Design tokens (conceptual): `--docs-*` CSS custom properties (existing) extended with any new accent/surface tokens; Tailwind `theme.extend` remains the build-time token source. No serialized data formats introduced.
- **No particle/search lazy handles** — those approaches were rejected because the build pipeline does not emit async chunks (Section 2.4).

## 7. API Contracts

- **No public/HTTP API changes.** This is a presentation + client-bundle refactor.
- **Internal module contracts**:
  - `initParticles` is **removed**; `src/home.ts` no longer references it.
  - `initSearchUI(): void` — unchanged; remains eagerly initialized from `core` (no split). All existing triggers preserved.
  - `onIdle(cb): void` — stable helper contract for deferrals.
- **Build contract**: bundle names/paths in `stati.config.ts` match esbuild output; `layout.eta` consumes `stati.assets.bundlePaths` unchanged; no async chunks are produced.

## 8. Edge Cases

| ID   | Scenario | Handling | Test Case |
| ---- | -------- | -------- | --------- |
| EC-1 | `prefers-reduced-motion: reduce` | Disable hero accent + decorative animations via CSS; set `scroll-behavior: auto`; JS uses instant scroll. | Toggle OS reduced-motion; load `/`; assert static hero, instant anchor scroll. |
| EC-2 | Slow/offline network | No hero JS to fail (particles removed). Search index fetch failure is non-fatal (existing handling). | Throttle to offline after first paint; page fully usable. |
| EC-3 | Fonts not yet loaded | `font-display: swap` + fallback `@font-face` metric overrides prevent invisible text and minimize CLS. | Emulate slow font; verify text visible immediately and minimal shift. |
| EC-4 | JS disabled | Content, nav links, theme via `prefers-color-scheme`, and layout render server-side; hero accent (CSS) still shows; only enhancements (search/scroll-top) absent. | Disable JS; verify readable, navigable docs + styled hero. |
| EC-5 | Search opened via any trigger | All existing triggers keep working (desktop input, header/mobile buttons, `/`, Cmd/Ctrl+K); no regression since search is not refactored to lazy. | Exercise each trigger on home + docs pages. |
| EC-6 | Homepage hero on small screens | Refined `clamp()` title scales down; no overflow/CLS; no particle work at any size. | Visual QA at 360px. |
| EC-7 | Tailwind purge removes a class only present in runtime JS strings | Ensure such classes are in `.eta`/safelist/`.stati/tailwind-classes.html`; audit after removing stale safelist entries. | Grep runtime-injected classNames; confirm each survives production CSS. |
| EC-8 | Theme flash (FOUC) on load | Inline `themeInit` partial must remain first in `<head>`; refactor must not defer it. | Hard-reload in dark mode; assert no light flash. |
| EC-9 | Very wide (1920px+) and narrow (360px) viewports | Refined type scale + layout must hold; TOC hidden < xl, sidebar collapsible. | Visual QA at matrix widths. |
| EC-10 | Existing deep links / view transitions | Navigation transitions remain smooth; reduced-motion disables them. | Navigate between docs pages; verify transition + reduced-motion off-path. |
| EC-11 | Reduced-motion preference changed mid-session | `matchMedia` `change` listener flips smooth/instant scroll and re-gates animation without reload. | Toggle OS setting while page open; assert scroll behavior switches. |
| EC-12 | `requestIdleCallback` unsupported (Safari/older) | `onIdle` falls back to `setTimeout`; deferred features still init. | Stub out `requestIdleCallback`; verify scroll-top/reading-progress still work. |

## 9. Error Handling

| Error Type | Cause | Recovery | User Message |
| ---------- | ----- | -------- | ------------ |
| Search index fetch failure | Network/missing index | Existing search module handling; trigger remains, results empty. | Existing behavior (non-blocking). |
| Font load failure | Missing/blocked woff2 | Fallback `@font-face` metric-matched families render. | None. |
| `requestIdleCallback` unsupported | Safari/older | `setTimeout` fallback in `onIdle`. | None. |
| `matchMedia` change unsupported (legacy) | Old engine | Feature-detect `addEventListener` on the query; fall back to initial read only. | None. |
| Tailwind class purged unexpectedly | Missing safelist | Build-time visual regression; fix by adding to `content`/safelist. | N/A (caught in QA). |
| Theme init error | `localStorage` blocked (privacy mode) | try/catch around storage; fall back to `prefers-color-scheme`. | None. |

## 10. Testing Strategy

### Unit Tests

> Note: docs-site currently has no unit-test harness; these are lightweight, optional, and must not pull in a new heavy framework. If added, keep them Node/Vitest-style consistent with the monorepo.

- `onIdle` invokes callback (via `requestIdleCallback` mock and `setTimeout` fallback path).
- Reduced-motion `change` listener flips `scrollBehavior` and the smooth-scroll predicate (mock `matchMedia`).

### Integration Tests

> Verify components work together through normal entry points. Each Section 3.4 row has coverage.

- **Build integration**: `npm run typecheck` passes; `npm run build:local` produces bundles; assert (grep on `dist/_assets`) that `home.js` no longer contains tsParticles identifiers and its size collapsed. Search remains present in its bundle (not split — expected).
- **Reduced-motion (live)**: toggling the OS preference mid-session flips smooth/instant scrolling (JS listener) and disables decorative CSS animation (EC-1, EC-11).
- **No-JS**: server-rendered pages readable/navigable (EC-4).
- **Theme no-flash**: dark reload has no FOUC (EC-8).
- **Purge safety**: production CSS contains all runtime-injected classes (EC-7).

### Performance Verification (primary acceptance)

**Reproducible methodology (fix all variables):**
- Build: `npm run build:local` (ensures `build:css` runs), serve via `npm run preview:local`.
- Tool: Lighthouse (Chrome, Incognito/cold cache, no extensions), **Mobile** preset with default throttling (Slow 4G, 4× CPU), or an explicitly recorded desktop profile — pick one and use it for both before and after.
- Runs: 5 runs per URL, report the **median**.
- URLs: `/` (home) and one representative dense docs page (e.g., `/api/reference`).
- Budgets (NFR-1) are **gzip transfer**: JS is the sum of the route's shipped bundles; CSS is final `dist/styles.css`.
- Record before/after table in the maintainer doc.

- Compare `dist/_assets` bundle sizes before/after; confirm tsParticles is gone from `home.js` (grep built output for `tsparticles`/particle identifiers → none).
- `--metrics-html` may be used for build-time timing, but **CSS size must be read from final `dist/styles.css`** (metrics run before `build:css`).

### Manual/Visual QA

- NFR-6 matrix: 360 / 768 / 1280 / 1920 px × light/dark; screenshots vs. baseline; contrast spot-checks (AA).

## 11. Dependencies

- **Existing**: Tailwind CSS + `@tailwindcss/typography`, esbuild (via Stati, no `splitting`), `@tsparticles/engine` + `@tsparticles/slim`, markdown-it Prism, Inter/Fira Code woff2.
- **Change**: **remove `@tsparticles/engine` and `@tsparticles/slim`** from `docs-site/package.json` (the largest single dependency contribution to homepage JS). This is the primary NFR-1/NFR-3 lever and is fully within docs-site scope.
- **No new runtime dependencies** (NFR-3). The only new code is a tiny in-repo `onIdle` + reduced-motion helper.
- **Tooling**: Lighthouse + gzip size measurement for verification — already available; no perf-gate install required.

## 12. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
| ---- | ---------- | ------ | ---------- |
| Assumed dynamic import would create lazy chunks (it won't) | N/A (resolved) | High if unaddressed | **Resolved**: verified Stati esbuild has no `splitting`; strategy pivoted to dependency removal + idle deferral. Do NOT reintroduce a lazy-chunk assumption. |
| Removing particles disappoints "fancy" expectation | Low | Medium | Replace with a refined dependency-free CSS/SVG accent + strong typography so "premium" feel is retained without the payload. |
| Search cost remains on all pages (no split possible) | High (accepted) | Low–Medium | Accepted within scope; offset by particle removal. Deeper split flagged as engine follow-up (Section 14). |
| Font-stack change shifts layout/metrics | Low | Medium | Keep metric-override fallback `@font-face`; QA CLS; the fix improves consistency since declared fonts never loaded. |
| Deferring init introduces perceptible lag | Low | Low | Only defer truly non-critical `scroll-to-top`/`reading-progress`; keep sidebar/theme/search/TOC immediate. |
| Theme FOUC introduced by reordering head | Low | High | Do not move inline `themeInit`; explicitly test dark reload (EC-8). |
| CSS reduction target (30 KB) not met | Medium | Low | Measure gzip; collapse `.sidebar-link.active-*` variants, prune stale safelist + unused `glow*`/animations; iterate. |
| No automated visual regression → subtle breakage | Medium | Medium | Structured manual QA matrix + before/after screenshots; small, reviewable diffs per phase. |
| Stale hashed chunks mask real size wins | Low | Low | Clean build (`npm run clean`) before measuring (steps 1, 16). |

## 13. Refinement Log

| Round | Focus                     | Findings | Changes Made |
| ----- | ------------------------- | -------- | ------------ |
| V1    | Technical accuracy vs. codebase (rubber-duck) | Blocking: dynamic `import()` won't create lazy chunks (no esbuild `splitting`); lazy search contract missed sidebar input trigger; `modulepreload` reasoning wrong; reduced-motion omitted smooth-scroll + live changes; CSS reduction lacked a concrete strategy; perf acceptance not reproducible; visual direction too subjective. | Pivoted perf strategy to **remove tsParticles** + idle-defer (Sections 1.5, 2.4, 3.1–3.4, 4, 5, 11); added concrete design decisions (3.5); fixed reduced-motion (live listener, smooth-scroll) (3.3, 4.8, EC-1/EC-11); concrete CSS-reduction step (4.8b) + gzip methodology (10); reproducible perf method (10); flagged engine-splitting as out-of-scope follow-up (14). |
| 1     | Requirements Completeness | Pending  |              |
| 2     | Architecture Validation   | Addressed in V1 |          |
| 3     | Data Flow Analysis        | Addressed in V1 |          |
| 4     | Error Handling            | Updated (Section 9) |     |
| 5     | Edge Cases                | Updated (Section 8) |     |
| 6     | Testing Coverage          | Updated (Section 10) |    |
| 7     | Integration Points        | Addressed in V1 |          |
| 8     | Performance               | Addressed in V1 |          |
| 9     | Security Review           | Low surface (static docs; no user data, no new deps, external links already `rel=noopener`) |          |
| 10    | Final Validation          | Pending  |              |

## 14. Open Questions

### Deferred Decisions

| Question | Default Decision | Rationale | Override Instructions |
| -------- | ---------------- | --------- | --------------------- |
| Keep, lazy-load, or remove hero particles? | **Remove** tsParticles; replace with a dependency-free CSS/SVG accent. | True lazy-loading is impossible (no esbuild `splitting`); keeping it eager costs ~235 KB against the "fast" goal. Removal is the clean, in-scope win. | To keep an animated hero without the payload, author a tiny in-repo canvas/SVG effect (< a few KB) instead of tsParticles. |
| Align fonts to shipped Inter/Fira, or ship IBM Plex/JetBrains? | Align stacks to Inter (sans) + Fira Code (mono). | Those binaries are already shipped/preloaded; shipping more fonts adds payload against the "fast" goal. | To ship IBM Plex/JetBrains: add woff2 to `public/fonts`, add `@font-face` + preloads, keep stacks as-is. |
| Should search be code-split off `core`? | **No** (not possible in scope). Keep search eager where needed. | Stati's per-bundle esbuild has no `splitting`; dynamic imports inline. Splitting requires engine changes (out of scope). | Pursue as the engine follow-up below. |
| Preload Fira Code globally? | **Re-evaluate**: only preload fonts proven above-the-fold critical. Default to keeping Inter preload; consider dropping Fira preload (code fonts are below the fold). | Preloading non-critical fonts competes with LCP resources. | Measure LCP with/without Fira preload; keep whichever is faster. |
| Add a unit-test harness to docs-site? | Do not add a new harness; rely on typecheck + build + manual/perf QA. | docs-site has no existing test setup; adding one exceeds the refresh's minimal-surface intent. | If desired, wire Vitest consistent with the monorepo and move Section 10 unit tests in. |
| Introduce automated visual-regression? | No; manual screenshot matrix. | Keeps scope minimal; no infra to maintain. | Add Playwright/visual-diff as a separate initiative if regressions recur. |

### Recommended Follow-Up (Out of Current Scope)

- **Add esbuild code-splitting to Stati core** (`packages/core/src/core/utils/typescript.utils.ts`): enable `splitting: true` for ESM builds and register *all* emitted chunks (not just the first `.js`) as bundle/preload paths. This would unlock true lazy-loading of heavy client modules (e.g., search UI) across all Stati sites — a meaningful engine feature, but explicitly **out of scope** for this docs-site-only refresh.

### Auto-Resolved

- **Testing framework / harness**: none currently in `docs-site` (no test script in `package.json`); resolved to manual + typecheck + build + Lighthouse. (Section 1.5, 10.)
- **Shipped fonts**: only `inter.woff2` + `fira-code.woff2` exist on disk; resolved font-alignment default accordingly. (Section 1.5.)
- **Bundle mechanism**: esbuild via Stati `typescript.bundles[]`, compiled per-entry with `bundle: true` and **no `splitting`** (verified in `typescript.utils.ts`); dynamic imports are inlined, not chunked. (Sections 1.5, 2.4.)
