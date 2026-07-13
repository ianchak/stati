# Implementation Plan: Docs-Site Performance & Design Refresh

## Metadata

- Status: DESIGN-VALIDATED
- Current Phase: Ready for implementation - technical and visual direction validated against the codebase
- Generated: 2026-07-11
- Scope: `docs-site/` only (no changes to `packages/core`, `packages/cli`, `packages/create-stati`)
- Related prior doc: `docs/docs-site-minimal-pro-refresh-design.md` (narrower — syntax/readability only; this plan supersedes and extends it)

## 0. Requirements (Raw)

> Improve docs-site overall feel of performance and also the design to appeal a js/ts
> developer in his 30s and 40s, do conscious design decisions to improve the docs site,
> docs-site should feel fancy but minimal and fast.

## 1. Requirements Analysis

### 1.1 Functional Requirements

| ID   | Requirement                                                                                                                                               | Acceptance Signal                                                                                                                                                                       |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-1 | Reduce initial and interaction load cost so the site _feels_ fast (fast first paint, minimal main-thread jank, snappy navigation).                        | Homepage JS payload materially reduced from the current ~328 KB `home.js` (primarily by removing/replacing the eager tsParticles dependency); no long tasks blocking first interaction. |
| FR-2 | Refine visual design toward "fancy but minimal" tuned for a senior JS/TS developer audience (30s–40s).                                                    | Reduced decorative noise, refined type scale, restrained motion, consistent light/dark treatment.                                                                                       |
| FR-3 | Fix the font pipeline inconsistency (declared font stack vs. shipped fonts) so typography is intentional and consistent.                                  | The font family actually rendered matches the fonts that are preloaded/shipped; no silent fallback to unintended system fonts.                                                          |
| FR-4 | Make every design change a _conscious, documented decision_ (rationale captured), not incidental restyling.                                               | Each change in Section 4 references a rationale in Section 3 / this analysis.                                                                                                           |
| FR-5 | Preserve all existing functionality: search, TOC, sidebar, theme toggle, reading progress, scroll-to-top, mobile menu, view transitions, RSS/sitemap/SEO. | Manual + smoke checks pass for each feature after changes.                                                                                                                              |
| FR-6 | Improve perceived-performance affordances (font-display, skeleton/reserved space to avoid layout shift, motion that respects `prefers-reduced-motion`).   | No new CLS regressions; reduced-motion users get a static experience.                                                                                                                   |

### 1.2 Non-Functional Requirements

| ID    | Requirement                          | Target                                                                                                                                                                                          |
| ----- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| NFR-1 | Performance budgets.                 | Homepage transferred JS < 60 KB gzip (excl. optional lazy particles); docs page JS < 40 KB gzip; CSS < 30 KB gzip; LCP < 1.5 s on mid-tier laptop over local preview; CLS < 0.05; TBT < 150 ms. |
| NFR-2 | Accessibility preserved/improved.    | Contrast AA in both themes; focus-visible retained; reduced-motion fully honored; skip-link works.                                                                                              |
| NFR-3 | No new heavy runtime dependencies.   | Net dependency weight must not increase; ideally decreases (particles made optional/removed).                                                                                                   |
| NFR-4 | Build stays green.                   | `npm run typecheck` and `npm run build:local` succeed; no console errors on built pages.                                                                                                        |
| NFR-5 | Maintainability.                     | Design tokens centralized; changes are minimal-surface and documented for maintainers.                                                                                                          |
| NFR-6 | Cross-theme + cross-viewport parity. | Visual QA at 360 / 768 / 1280 / 1920 px, light + dark.                                                                                                                                          |

### 1.3 Implicit Requirements

- "Fancy but minimal" = intentional restraint: fewer but higher-quality visual accents (typography, spacing, one or two signature accents) instead of many competing effects (particles + animated orbs + 16rem gradient title + glow shadows all at once).
- "Fast" is both _measured_ (bundle/LCP/CLS) and _felt_ (no jank, instant theme switch, no font swap flash, stable layout).
- Senior JS/TS audience expects: precise code samples, excellent monospace rendering, high information density, low chrome, dark mode as a first-class citizen, keyboard affordances (search `/`, etc.).
- Changes must respect Stati/Eta constraints (no partial dynamic attribute interpolation; use `stati.propValue()`), and the docs-site build pipeline (Tailwind purge via `content` globs incl. `.stati/tailwind-classes.html`).

### 1.4 Scope Boundaries

**In scope**

- `docs-site/src/styles.css`, `docs-site/tailwind.config.js` — design tokens, type scale, motion, component styles.
- `docs-site/site/layout.eta`, `docs-site/site/_sections/*`, `docs-site/site/_components/*`, `docs-site/site/_home/*` — template polish and motion/decoration adjustments.
- `docs-site/src/**` TypeScript bundles — removing particles and trimming/deferring non-critical JS.
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
- **Fonts**: Only `inter.woff2` and `fira-code.woff2` are currently shipped. The revised direction intentionally replaces Inter with a subsetted IBM Plex Sans variable WOFF2 from the official IBM Plex release, retains Fira Code for code, and preserves the font license alongside the asset. The added font must remain within the existing font-transfer budget by removing Inter rather than shipping both.
- **Particles**: The tsParticles hero background is decorative only. Given the bundling reality above (it cannot be truly lazy-loaded), the decision is to remove tsParticles and use one static CSS structural treatment. Keeping particles eager is rejected by the fast and restrained design requirements.
- **Metrics tooling**: Stati `--metrics`/`--metrics-html` build flags and Lighthouse (via local preview) are the measurement instruments; no CI perf gate exists yet, so verification is manual against the budgets in NFR-1.
- **Design direction**: "Fancy but minimal" is interpreted as _editorial/technical_ (strong typographic hierarchy, restrained accent color, precise code blocks) rather than _maximalist_ (heavy animation, particles, oversized gradients).
- **Visual regression**: No automated visual-diff harness exists; QA is manual screenshot comparison across the matrix in NFR-6.

### 1.6 Design Read, Redesign Mode, and Dials

**Design Read:** This is a preserve-mode redesign for experienced JS/TS developers who recognize craft quickly. The visual language is instrument-grade technical editorial: dense enough to feel capable, quiet enough to read for hours, and distinctive through real source-to-output artifacts rather than SaaS decoration.

- **Redesign mode**: preserve the information architecture, route slugs, navigation labels, search model, theme behavior, and documentation content. Overhaul only the homepage composition and decorative layer. Evolve the docs chrome rather than replacing it.
- **Target `DESIGN_VARIANCE: 8`**: the homepage uses offset columns, source/output pairings, and deliberately uneven module spans. Reference pages remain predictable because variance is concentrated in marketing surfaces.
- **Target `MOTION_INTENSITY: 5`**: a sequenced source-to-output reveal, tab state transitions, tactile controls, and view transitions. No particles, perpetual loops, marquee, parallax, or scroll hijacking.
- **Target `VISUAL_DENSITY: 6`**: experienced developers get meaningful code and architecture above the fold, compact chrome, and high scan efficiency without cockpit-level compression.
- **Design foundation**: keep Tailwind 3.4 and native CSS variables. This is an existing static Eta site, so a React component system or Tailwind migration would add risk without improving the design outcome.

**Current-state audit**

- **Current brand tokens**: default Tailwind blue, slate neutrals, Inter, Fira Code, 6/12/16px radius tiers, and soft slate-tinted shadows. The standard blue/slate/Inter combination is functional but anonymous; the refresh replaces it with a bespoke cold-paper/cobalt palette and IBM Plex Sans.
- **Patterns to preserve**: sticky 72px header, inline no-flash theme initialization, site-wide search, three-column documentation layout, collapsible sidebar, reading progress, restrained view transitions, 74ch prose measure, and polished syntax blocks.
- **Patterns to retire**: tsParticles, animated blur orbs, 16rem gradient wordmark, page-wide gradient haze, repeated centered gradient section headers, six equal feature cards, multicolor feature accents, fake terminal chrome, decorative traffic-light dots, broad `transition-all`, and raw inline SVG controls outside the shared icon component.
- **SEO and IA lock**: no route, canonical URL, primary navigation label, heading anchor, structured-data key, or analytics-relevant identifier changes without separate approval.

## 2. Codebase Context

### 2.1 Relevant Existing Code

| Path                                                                     | Relevance                                                                                                                                                  | Notes                                                                                                                       |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `docs-site/tailwind.config.js`                                           | Design tokens (colors, fonts, spacing, shadows, animations, keyframes).                                                                                    | Sans stack leads with unshipped `IBM Plex Sans`/`Aptos`; mono leads with unshipped `JetBrains Mono`. Central token surface. |
| `docs-site/src/styles.css` (426 lines)                                   | Base layer (CSS vars, `@font-face`, scrollbars, focus), components layer (`.prose`, `.nav-link`, `.sidebar-link`), view transitions, reduced-motion block. | Compiled to `dist/styles.css` (~124 KB min). Primary design + token file.                                                   |
| `docs-site/site/layout.eta`                                              | Root document: head (preloads, stylesheets, modulepreload), body shell, reading-progress bar, sidebar/TOC layout, scroll-to-top, search templates.         | Controls critical-path asset order and global chrome.                                                                       |
| `docs-site/site/_sections/header.eta`                                    | Sticky header: logo, nav, search trigger, theme toggle, GitHub, mobile menu.                                                                               | Heavy `transition-all` usage; gradient brand text.                                                                          |
| `docs-site/site/_home/hero.eta`                                          | Homepage hero: 16rem gradient title, animated `blur-3xl` orbs (`animate-pulse`), `#particles-js` container, CTA buttons.                                   | Highest decorative density; primary "minimal" target.                                                                       |
| `docs-site/src/home/particles.ts` (186 lines)                            | tsParticles init (`@tsparticles/engine` + `/slim`), 60 particles, opacity/size animation, dark-mode reactive.                                              | Root cause of ~328 KB `home.js`. Lazy/optional target.                                                                      |
| `docs-site/src/home.ts` / `src/home/index.ts`                            | Homepage entry: eagerly imports `initParticles` on `DOMContentLoaded`.                                                                                     | Static import forces particles into main homepage chunk.                                                                    |
| `docs-site/src/core.ts` / `core/*` (theme 110, mobile-menu 57)           | Shared bundle: theme toggle, mobile menu, search UI init.                                                                                                  | `core.js` ~93 KB — investigate what inflates it (search-ui pulled into core?).                                              |
| `docs-site/src/docs.ts` / `docs/*` (sidebar 406, search-ui 611, toc 129) | Docs bundle: sidebar, TOC, scroll-to-top, reading progress, search.                                                                                        | `docs.js` ~89 KB; search-ui is the largest single module.                                                                   |
| `docs-site/src/core/index.ts`                                            | Barrel exporting `initTheme`, `initMobileMenu`, `initSearchUI`.                                                                                            | `initSearchUI` in core means the 611-line search UI ships on _every_ page. Split candidate.                                 |
| `docs-site/public/prism-stati.css` (~4 KB)                               | Custom Prism syntax theme.                                                                                                                                 | Align to refreshed palette (carry over prior design doc intent).                                                            |
| `docs-site/public/fonts/{inter,fira-code}.woff2`                         | The only shipped font binaries.                                                                                                                            | Ground truth for FR-3 font alignment.                                                                                       |
| `docs-site/stati.config.ts`                                              | Bundle definitions (`core`, `home`, `docs`) with include/exclude routing.                                                                                  | Controls which JS ships to which routes; edit point for split changes.                                                      |
| `docs-site/dist/_assets/*`                                               | Built artifacts; multiple stale hashed `docs-*`/`home-*` chunks present.                                                                                   | Confirms bundle sizes; hygiene item (clean build).                                                                          |

### 2.2 Patterns to Follow

- **ESM + `.js` import extensions** in `src/**` TypeScript (per repo convention). Barrels (`index.ts`) re-export module inits.
- **Bundle-per-surface** via `stati.config.ts` `typescript.bundles[]` with `include`/`exclude` route globs (existing pattern: `home` on `/`, `docs` excludes `/`, `core` everywhere).
- **`DOMContentLoaded` init** pattern in each `*.ts` entry calling feature `init*()` functions.
- **CSS variables for theme tokens** (`--docs-*`) set in `@layer base` on `html` / `html[data-theme='dark']`; component styles consume the vars — extend this token system rather than hardcoding colors.
- **Tailwind `@apply` in `@layer components`** for reusable classes (`.prose`, `.nav-link`, `.sidebar-link`).
- **`stati.propValue()`** for any dynamic/conditional class assembly in Eta (never partial attribute interpolation).
- **Preload critical fonts** + `font-display: swap` + fallback `@font-face` with metric overrides (`size-adjust`, `ascent-override`) - preserve this anti-CLS pattern when replacing Inter with IBM Plex Sans.
- **`prefers-reduced-motion` guard** exists at bottom of `styles.css`; extend it to cover _all_ new/existing motion.

### 2.3 Types to Reuse

- tsParticles types already imported in `particles.ts`: `Container`, `ISourceOptions` from `@tsparticles/engine` — reuse when refactoring to dynamic import.
- Search types in `docs/search/types.ts` (`SearchDocument`, etc.) — unchanged; only load strategy may change.
- No new cross-cutting types are required for CSS/token/template changes. New `onIdle` and reduced-motion helpers export small typed signatures from `src/core/` through its barrel.

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
- **Avoid** adding new large runtime dependencies (the whole point is to _reduce_ weight).
- **Avoid** over-animating; every motion must have a reduced-motion fallback.
- **Beware** the font mismatch anti-pattern: declaring fonts in the stack that are never loaded produces inconsistent rendering across OSes — align declared vs. shipped fonts.
- **Beware** eager static imports of heavy libs (tsParticles) — they bloat the entry chunk even when the feature is off-screen or motion-disabled.

## 3. Technical Architecture

### 3.1 Component Overview

The refresh has four coordinated workstreams, each mapping to an existing surface:

1. **Design Token & Type System** (`tailwind.config.js`, `styles.css` base layer): consolidate/refine color, spacing, radius, shadow, and typography tokens; establish a deliberate type scale; fix font stacks to shipped fonts; add a single restrained accent treatment.
2. **Chrome & Layout Polish** (`layout.eta`, `_sections/*`, `_components/*`): reduce transition/decoration noise, tighten header/sidebar/TOC, ensure stable layout (reserve space, avoid shift), keep keyboard/search affordances prominent.
3. **Hero De-noising & Motion Discipline** (`_home/hero.eta`, `home/particles.ts`, `styles.css` motion): replace the maximalist hero (16rem title + `blur-3xl` orbs + tsParticles) with an asymmetric hero, a real configuration code surface, and one static CSS structural treatment; extend reduced-motion coverage to all transitions and smooth scrolling, including a live `matchMedia` change listener.
4. **JS Performance / Bundle Right-Sizing** (`src/**`, `stati.config.ts`): the dominant win is **removing tsParticles** (collapses `home.js` from ~328 KB toward the low tens of KB). Secondary: keep the always-on `core` bundle lean, defer _cheap_ non-critical listener attachment to idle, and clean stale build artifacts. Note: search UI cannot be truly code-split within scope (Section 2.4/1.5); it stays in the bundle(s) that need it, and deeper splitting is flagged as an engine follow-up (Section 14).

### 3.2 Data Flow

- **Build time**: `stati build` compiles `.eta` + Markdown → HTML; esbuild builds `core`/`home`/`docs` bundles per `stati.config.ts`; `build:css` runs Tailwind purge over `content` globs → `dist/styles.css`. Stati injects `modulepreload` for each route's bundle paths and the search-index meta tag.
- **Runtime (page load)**: HTML parsed → `<head>` preloads fonts + CSS + module bundles → `core` bundle inits theme (reads `localStorage`/`prefers-color-scheme`) + mobile menu + search trigger → route bundle (`home` or `docs`) inits feature modules on `DOMContentLoaded`.
- **Refactored runtime (target)**: theme init stays render-critical via the inline `themeInit` partial (unchanged, to avoid FOUC). The hero uses static CSS and a server-rendered code surface, so there is zero hero JS cost. Search remains available site-wide from its existing bundle; its cost is accepted and offset by particle removal. Cheap, non-critical listener attachment may be deferred to `requestIdleCallback` only where it does not delay a visible affordance.

### 3.3 State Management

- **Theme**: `data-theme` + `.dark` class on `<html>`, persisted in `localStorage`, initialized by the inline `themeInit` partial before paint (must remain to prevent theme flash). Refactor must not move theme init later in the critical path.
- **Motion preference**: `matchMedia('(prefers-reduced-motion: reduce)')` gates decorative CSS animation. Because particles are removed, there is no runtime particle to stop; however a `matchMedia` **change listener** must still toggle `scroll-behavior` and any JS-driven smooth scrolling (TOC anchor scroll, scroll-to-top) so a mid-session preference change is honored. Single source of truth reused by CSS + JS.
- **Search**: index fetched on demand by the existing search module; UI state local to the module. It is initialized eagerly from its bundle (no split available); all existing triggers — desktop dropdown input, header `search-trigger`, `mobile-search-btn`, `/` and Cmd/Ctrl+K shortcuts — must keep working unchanged.
- **No global store**: state stays per-module. The only new shared primitives are the idle helper and reduced-motion preference helper.

### 3.4 Integration Map

> Every new/changed component must have a consumer and a registration/initialization point.

| Component                                            | Consumed By                                                        | Registered In                                                                    | Initialization Code                                                        | Wire-Up Notes                                                                                                             |
| ---------------------------------------------------- | ------------------------------------------------------------------ | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Refined design tokens (colors/fonts/shadows/spacing) | All templates via Tailwind classes + CSS vars                      | `tailwind.config.js` `theme.extend`; `styles.css` `@layer base` vars             | Consumed at build (Tailwind) and runtime (CSS vars)                        | Font stack must reference only shipped families; purge globs unchanged                                                    |
| IBM Plex Sans + Fira Code pipeline                   | `body`/`.prose`/`code`                                             | `styles.css` `@font-face` + Tailwind `fontFamily`; preloads in `layout.eta`      | Browser loads preloaded WOFF2 with `font-display: swap` + fallback metrics | Replace Inter rather than shipping two sans families; preserve font licenses; measure CLS                                 |
| Source/output hero treatment (replaces particles)    | Homepage hero                                                      | `site/_home/hero.eta` + `styles.css`                                             | Rendered server-side; CSS sequence only                                    | Pair real source with real generated structure; remove particle code and dependencies                                     |
| Search (unchanged, eager)                            | `core` bundle (site-wide)                                          | `src/core/index.ts` → `initSearchUI`                                             | Existing `DOMContentLoaded` init                                           | Cannot be split without engine support; keep all triggers working (desktop input, header/mobile buttons, `/`, Cmd/Ctrl+K) |
| Idle-defer helper (`onIdle`)                         | scroll-to-top, reading-progress                                    | `src/core/*` new util + barrel                                                   | `requestIdleCallback` (fallback `setTimeout`) wrapper                      | Must NOT defer theme init, sidebar, or any visible affordance; marginal TBT win only                                      |
| Reduced-motion gate                                  | Hero entrance, view transitions, smooth scroll, micro-interactions | `styles.css` `@media (prefers-reduced-motion)` + JS `matchMedia` change listener | CSS disables animation + `scroll-behavior: auto`; JS uses instant scroll   | Honor the initial and live preference state                                                                               |
| Refined hero                                         | Homepage                                                           | `site/_home/hero.eta`                                                            | Rendered server-side                                                       | Reserve stable space; solid display type, actual config and route output, one blue build edge                             |

### 3.5 Concrete Design Decisions

> These satisfy FR-4. The design is optimized for technical-reading workflows, not audience age. Values below are implementation defaults and must only change with a recorded reason.

#### 3.5.1 Homepage Composition

The concept is **Compiled Editorial**. It combines the precision of a printed systems manual with the immediacy of a modern build tool. Its signature is the relationship between source and generated output, shown with real Stati artifacts. It must not resemble a generic SaaS homepage, an IDE mockup, or a retro terminal theme.

Use five visually distinct layout families. Mobile fallback for every section is a strict single column below 768px.

1. **Source/output hero**: a 7/5 offset grid. The left column contains the brand statement and actions. The right column is a vertically offset composition of real `stati.config.ts` source and the generated route tree or build output it produces. These are semantic `pre`/`code` and list elements, not a screenshot shell. A narrow blue build edge visually connects input to output and becomes the page's sole signature device.
2. **Build path band**: a full-width horizontal sequence showing the real pipeline: content, Markdown, Eta, HTML, cache. Each stage contains one concrete noun and one short operational phrase. It is not a marquee and does not loop. On mobile it becomes a vertical sequence.
3. **Capability module map**: exactly six modules in a 12-column asymmetric grid. TypeScript and ISG span larger areas because they differentiate Stati; routing, Markdown, configuration, and tooling occupy smaller modules. At least three modules contain a real artifact such as a config fragment, route path, cache key, or CLI command. The rest use typography and quiet surface contrast, not decorative gradients.
4. **Proof desk**: retain the five real feature demonstrations, but replace centered pills above a floating panel with a vertical text rail and a changing proof surface. The rail occupies 3 columns and the active code or output occupies 9. The transition communicates state change, not spectacle. On mobile the rail becomes a horizontal scroll-snap control above the proof.
5. **Command close**: a sparse full-width close with the real `npx create-stati` command, one consistent `Get started` action, and no terminal window frame. It should feel like the final line of a well-edited technical document, not another marketing card.

The current `sectionHeader` pattern must not stamp a centered gradient heading onto every section. Section headings use left-aligned vertical stacks with a maximum `65ch` description. Use no more than one small uppercase eyebrow across the five homepage sections. The hero uses no eyebrow.

**Target-group filter**

- Show implementation truth before claims. Experienced developers trust real config, route structure, cache behavior, and commands more than adjectives.
- Prefer compressed, exact copy. Remove phrases such as "powerful", "modern", "intuitive", "just works", and "in minutes" unless the following artifact proves the claim.
- Keep keyboard affordances visible and interactions predictable. Distinction comes from composition and detail, not hidden navigation or novelty controls.
- Avoid faux nostalgia. No CRT green, terminal traffic lights, monospace body copy, fake shell prompts, build-version stamps, or hacker motifs.
- Reward long reading sessions: stable navigation, disciplined line length, strong focus states, low-glare dark mode, and no ambient movement.

#### 3.5.2 Hero Rules

- Initial viewport: header plus hero content fits within `min-height: calc(100dvh - 4.5rem)` without hiding either CTA. Desktop top padding is capped at 6rem.
- Headline: one line where space permits and never more than two lines. Use `clamp(3.75rem, 8vw, 6.5rem)`, `line-height: 0.95`, and restrained negative tracking. Remove gradient text from the H1.
- Subtext: no more than 20 words and four lines. Keep the existing TypeScript-first value proposition, but tighten grammar rather than inventing a new voice.
- Actions: one primary and at most one secondary CTA, with `white-space: nowrap`. Reuse one label for each intent across hero and later sections.
- Visual: show a real configuration example paired with the real route tree or output implied by that example. The relationship between source and result is the visual idea. Do not use stock photography, a generated dashboard, or fake window chrome.
- Signature device: use one 2px blue build edge between source and output surfaces. It organizes real content and must not become a decorative crosshair or page-wide grid.
- Background: use a flat token surface with one subtle tonal shift behind the proof composition. Remove the page dot grid, radial washes, homepage-level blur orbs, and section-specific gradient haze. The offset content provides the visual interest.

#### 3.5.3 Typography

- Use IBM Plex Sans Variable for interface and prose. Its engineered shapes and strong small-size readability fit a mature developer audience without feeling like the default SaaS stack. Source it from the official IBM Plex release, subset to the required Latin glyphs, self-host it, and retain the SIL Open Font License.
- Keep Fira Code for code. Lead the Tailwind stacks with `IBM Plex Sans`, `IBM Plex Sans Fallback` and `Fira Code`, `Fira Code Fallback`. Remove Inter after visual and CLS verification so only one sans is transferred.
- Docs body stays `17px`, `line-height: 2rem`, and `max-width: 74ch`.
- Docs headings: H1 `clamp(2.25rem, 4vw, 2.9rem)`, H2 `clamp(1.75rem, 3vw, 2rem)`, H3 `clamp(1.25rem, 2vw, 1.5rem)`, H4 `1.125rem`.
- Homepage display weight uses the wider, heavier end of IBM Plex Sans without exceeding `clamp(3.75rem, 8vw, 6.5rem)` in the hero. Section headings use `clamp(2.25rem, 5vw, 4rem)` with no gradient fill. Body copy is capped at `65ch`.
- Inline code stays `0.84em`; block code stays `0.84rem` with Fira Code ligatures. Do not use serif type or mixed-family emphasis.

#### 3.5.4 Color, Theme, and Material

- Theme is page-level auto mode, initialized from stored preference or `prefers-color-scheme`. Sections may vary between `--docs-surface` and `--docs-surface-muted`, but may not invert theme mid-page.
- Cobalt is the only interface accent. Rebuild the semantic tokens around these anchors instead of retaining Tailwind's default blue/slate values:
  - Light canvas `#F4F6F8`, surface `#FCFCFD`, muted surface `#E9EDF2`, strong text `#17202A`, muted text `#4B5968`, accent `#2948C8`.
  - Dark canvas `#0B111B`, surface `#101925`, muted surface `#162232`, strong text `#E7ECF2`, muted text `#AAB5C3`, accent `#9AAEFF`.
- Derive hover, active, border, inline-code, and focus tokens from those anchors and verify them rather than introducing unrelated hues. Remove decorative indigo, purple, emerald, cyan, red, amber, and yellow from homepage and navigation chrome. Syntax highlighting may retain semantic token colors.
- The recognizable palette is cold paper or smoke plus cobalt, not generic white plus blue glow. Dark surfaces use low-glare blue-charcoal rather than pure black.
- Remove gradient text, `shadow-glow`, `shadow-glow-lg`, and pure black shadows. Keep the existing slate-tinted `soft` and `soft-lg` shadows.
- Reserve translucency and `backdrop-blur` for the sticky header and overlays. Ordinary content blocks use opaque token surfaces so the page does not become a glassmorphism demo.
- Contrast: body and form labels target 7:1 where practical and never fall below 4.5:1. Large display text and non-text controls never fall below 3:1.

#### 3.5.5 Shape and Spacing System

- Radius rule: 8px for inputs and small controls, 12px for buttons and content panels, 16px for code blocks and overlays. Pills are reserved for the tab selector only. No other radius values are introduced.
- Header height remains 72px. Desktop navigation stays on one line at 1024px; if it does not fit, hide secondary links rather than wrap.
- Docs hit targets remain at least 40px. Homepage sections use `py-16 md:py-20 lg:py-24`; the hero is governed by viewport fit rather than oversized `py-48` spacing.
- Use elevation only for an actual interactive or code surface. Capability modules use grid span, typography, tonal surfaces, and one build edge; they do not become six identical elevated cards.

#### 3.5.6 Motion

- Motion communicates compilation order or state only: hero copy enters first, source follows, output follows source, and the build edge resolves last. The full sequence completes within 520ms. Controls use 120-160ms feedback, proof-desk state changes use 180-220ms, and page view transitions remain 200ms.
- No infinite animations. Remove `animate-pulse`, `pulse-slow`, `animate-float`, particle motion, blinking cursors, and decorative icon scaling.
- Animate only transform and opacity. Replace all broad `transition-all` uses with explicit color, border-color, opacity, or transform transitions.
- Implement the hero sequence with a CSS delay cascade under `prefers-reduced-motion: no-preference`; do not add an animation library. All entrance and transition motion is disabled in reduced mode, which uses instant scrolling. The live JS preference listener updates smooth-scroll behavior without reload.

#### 3.5.7 Docs Chrome

- Keep the three-column docs shell. Consolidate seven duplicate active sidebar classes into one `.sidebar-link.active` rule.
- Remove decorative colored dots from sidebar links and multicolor section icon backgrounds. Section hierarchy comes from type weight, indentation, and the single blue active state.
- Keep one icon family and a global `strokeWidth` of `1.5`. Replace the raw inline sidebar-toggle and scroll-to-top SVGs with the shared icon partial. Do not add new hand-authored path data during this refresh.
- Keep the header brand treatment compact. Use solid text instead of gradient text; retain the documentation descriptor only if the full navigation remains on one line at 1024px.
- Search input, search modal, empty state, loading state, and error state must share the token, radius, focus, and contrast rules above.

#### 3.5.8 Visible Copy and Asset Policy

- Preserve documentation prose and IA, but audit all homepage and chrome strings for grammar, duplicated CTA intent, filler verbs, and unclear claims.
- Visible homepage and chrome copy uses regular hyphens only. Replace any em dash or separator en dash encountered in those surfaces. Documentation prose cleanup is a separate content pass unless a changed component owns the string.
- Do not invent usage metrics, customer logos, performance multipliers, or fake social proof. Real npm/GitHub facts may be shown only when sourced at build time or written without volatile numbers.
- Product visuals must be real: syntax-highlighted config, actual generated route structure, actual rendered example output, or an actual build-metrics screenshot. Do not use stock photography or div-built dashboards for this developer tool.

**Homepage copy contract**

- Hero headline: `TypeScript in. Static HTML out.` This states the transformation and naturally supports the source/output composition.
- Hero subtext: `Stati turns Markdown, Eta, and typed client code into fast, cache-aware sites.` This is 13 words and names the real stack.
- Primary CTA: `Get started`. Secondary CTA: `Read the architecture`. Reuse these exact labels for the same intents elsewhere.
- Build path vocabulary: `site/*.md` / content, `markdown-it` / transform, `.eta` / compose, `dist/*.html` / emit, `.stati/cache` / reuse. Do not prefix these with step numbers.
- Capability heading: `The build stays understandable.` Proof heading: `See each layer work.` Command-close heading: `One command. A real project.`
- Proof links use destination labels such as `TypeScript configuration`, `ISG configuration`, and `Template reference`, not five repeated `Learn more` buttons.
- Remove the current generic headings and phrases `Why Choose Stati?`, `Powerful Features`, `Modern web development`, `features that just work`, `Get Started in Minutes`, and `Learn More`.

## 4. Implementation Steps

### Phase 1: Foundation (tokens, fonts, measurement baseline)

1. **Capture baseline metrics** (no code change): build with `npm run build:local` (which runs `stati build` **then** `npm run build:css`), then `npm run preview:local` and measure with Lighthouse. Record: **gzip** transfer of each route's JS (`core`+`home` for `/`; `core`+`docs` for a docs page), **gzip** of final `dist/styles.css`, and LCP/CLS/TBT. Use a fixed methodology (see Section 10) so before/after is comparable. This is the before-state for NFR-1.
2. **Build the intentional font pipeline (FR-3)**: obtain the subsetted IBM Plex Sans variable WOFF2 from the official release, preserve its SIL Open Font License, and add metric-adjusted fallback values. Lead `fontFamily.sans` with IBM Plex Sans and `fontFamily.mono` with Fira Code. Remove the Inter preload and binary after CLS and visual verification so total font transfer does not grow materially.
3. **Consolidate design tokens**: retain the existing blue and slate scales, remove `glow` and `glow-lg`, and keep only `soft` and `soft-lg` elevation. Introduce or confirm CSS variables for colors consumed by both themes.
4. **Establish deliberate type scale**: audit `.prose` heading/body sizes and line-height in `styles.css` for density + rhythm suited to technical reading (senior dev audience); document the chosen scale as the canonical hierarchy.

### Phase 2: Core Implementation (design polish)

5. **Recompose the homepage shell (FR-2)**: remove the page-level blur layer from `home.eta`. Implement the five layout families in 3.5.1 and add a dedicated build-path partial between hero and capabilities. Keep content meaning, but replace repeated centered gradient headers with section-specific compositions.
6. **Build the source/output hero (FR-2)**: in `_home/hero.eta`, remove animated orbs and `#particles-js`; use the 7/5 offset grid and viewport-fit rules; pair actual `stati.config.ts` source with a real route tree or generated-output fragment; apply the single blue build edge. No fake screenshot chrome or decorative SVG. Particle dependency removal is wired in Phase 3 step 12.
7. **Build the pipeline band and module map**: add `_home/buildPath.eta` for the real content-to-cache sequence. In `_home/features.eta`, render the exact six capabilities in a 12-column asymmetric module map, with TypeScript and ISG larger and at least three modules showing real artifacts. Preserve existing frontmatter keys and add only the artifact data needed by the templates.
8. **Turn highlights into a proof desk and simplify the close**: in `_home/highlights.eta` and tab partials, replace centered tabs with a 3/9 vertical rail and proof surface, plus an explicit mobile scroll-snap fallback. In `_home/quickStart.eta`, replace terminal chrome and blinking cursor with the command close and one consistently labeled action.
9. **Chrome polish**: in `header.eta`, `sidebar.eta`, `toc.eta`, `footer*.eta`, and `layout.eta`, replace broad transitions, remove decorative dots and multicolor navigation accents, replace raw inline SVG controls with the shared icon partial, and verify desktop navigation stays on one line. Keep search `/` discoverable.
10. **Prose and code polish**: refine `.prose` code, `pre`, table, blockquote, and link styles in `styles.css`; align `prism-stati.css` to the refreshed tokens. Prioritize monospace legibility and copy-friendly code blocks. Do not turn long technical tables into marketing cards.
11. **Motion discipline**: remove perpetual animation utilities from active markup; gate the short hero entrance, tab feedback, and view transitions behind reduced-motion preferences; set reduced-mode scrolling to `auto`; replace every touched `transition-all` with explicit properties.
    11b. **CSS reduction strategy (concrete)**: measure `dist/styles.css` **gzip/Brotli** size, not raw size. Collapse `.sidebar-link.active-*` variants into `.sidebar-link.active`; audit `.stati/tailwind-classes.html`; remove unused `glow*`, `animate-pulse`, `pulse-slow`, `animate-float`, and old homepage color utilities. Re-run `build:css` and confirm compressed size drops. Stati metrics run before `build:css`, so measure final `dist/styles.css` directly.

### Phase 3: Integration & Wiring (performance / bundle right-sizing)

> CRITICAL: explicit wiring so components connect end-to-end. NOTE: true lazy code-splitting is unavailable (Section 2.4); wins come from dependency removal + idle deferral of cheap work.

12. **Remove tsParticles (primary perf win)**: delete `#particles-js` usage from `_home/hero.eta`, remove `src/home/particles.ts`, and drop `initParticles` from `src/home/index.ts` and `src/home.ts`. Remove `@tsparticles/engine` and `@tsparticles/slim` from `docs-site/package.json`. **Verify**: `home.js` transfer collapses from ~328 KB to the low tens of KB; no runtime errors on `/`.
13. **Add `onIdle` helper**: create `src/core/idle.ts` (typed `onIdle(cb)` using `requestIdleCallback` with `setTimeout` fallback) and export via `src/core/index.ts`. Consumers: step 14.
14. **Defer cheap non-critical init**: wrap listener attachment for `initScrollToTop` and `initReadingProgress` in `onIdle`. Keep `initTheme`, `initMobileMenu`, `initSearchUI`, `initSidebar`, and `initToc` immediate. **Verify**: features still function; TBT unchanged or improved.
15. **Add live reduced-motion listener**: create `src/core/motion.ts` with `prefersReducedMotion(): boolean`, `onReducedMotionChange(callback)`, and cleanup. Export it from `src/core/index.ts`; use it in TOC and scroll-to-top paths; update root scroll behavior when the preference changes. **Verify**: toggling OS reduced motion switches scrolling between smooth and instant without reload.
16. **Confirm bundle delivery**: after a clean build, inspect `dist/_assets` and emitted `modulepreload` links; confirm `core` + `home` on `/`, `core` + `docs` elsewhere, and no stale hashed chunks. Do not rely on async chunks.

### Phase 4: Polish (verification, hygiene, docs)

17. **Clean build and artifact hygiene**: run `npm run clean && npm run build:local`; confirm no stale hashed chunks and that final CSS shrank.
18. **Full QA and anti-slop preflight**: verify FR-5, NFR-6, and the mechanical checklist in Section 10. Check generated pages in both themes at all target widths, not just templates in isolation.
19. **Re-measure**: repeat step 1; confirm NFR-1 budgets; record before/after.
20. **Maintainer documentation**: update `docs/docs-site-minimal-pro-refresh-design.md` with the design read, dials, preserved patterns, retired patterns, token rules, and before/after screenshots.

## 5. File Changes

### New Files

| Path                                             | Purpose                                                            | Key Exports                                           |
| ------------------------------------------------ | ------------------------------------------------------------------ | ----------------------------------------------------- |
| `docs-site/src/core/idle.ts`                     | Idle-deferral helper for non-critical initialization.              | `onIdle(cb: () => void): void`                        |
| `docs-site/src/core/motion.ts`                   | Shared reduced-motion state and live preference subscription.      | `prefersReducedMotion()`, `onReducedMotionChange(cb)` |
| `docs-site/site/_home/buildPath.eta`             | Real content-to-cache pipeline band between hero and capabilities. | Eta partial                                           |
| `docs-site/public/fonts/ibm-plex-sans-var.woff2` | Subsetted interface/prose font from the official IBM Plex release. | n/a                                                   |
| `docs-site/public/fonts/OFL-IBM-Plex.txt`        | Font license retained with the self-hosted asset.                  | n/a                                                   |

### Modified Files

| Path                                                                                 | Changes                                                                                                                   | Reason             |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| `docs-site/tailwind.config.js`                                                       | Set IBM Plex Sans/Fira Code stacks; refine color and shadow tokens; remove glow emphasis.                                 | FR-2, FR-3, NFR-5  |
| `docs-site/src/styles.css`                                                           | Token vars, type scale, prose/code polish, expanded reduced-motion block, motion gating.                                  | FR-2, FR-6, NFR-2  |
| `docs-site/public/prism-stati.css`                                                   | Palette aligned to refreshed tokens; legibility.                                                                          | FR-2               |
| `docs-site/site/_home/hero.eta`                                                      | Build stable source/output composition; remove orbs, gradient wordmark, and particle container.                           | FR-2, FR-6         |
| `docs-site/site/home.eta`                                                            | Remove page-wide decorative blur layer; preserve section order; apply one page-level theme treatment.                     | FR-2, FR-6         |
| `docs-site/site/_home/{features,highlights,quickStart}.eta`                          | Build module map, proof desk, and command close; remove multicolor haze and fake terminal chrome.                         | FR-2, FR-4         |
| `docs-site/site/_home/tab*.eta`                                                      | Normalize tab layouts, code surfaces, copy density, and responsive collapse.                                              | FR-2, NFR-6        |
| `docs-site/site/layout.eta`                                                          | Verify/adjust preload + modulepreload ordering for split bundles.                                                         | FR-1, NFR-1        |
| `docs-site/site/_sections/{header,sidebar,toc,footer,footerBrand,footerSection}.eta` | Chrome polish; scope transitions; spacing/contrast.                                                                       | FR-2               |
| `docs-site/site/_components/{button,link,icon,sectionHeader}.eta`                    | Consistent tokens, no wrapped CTA labels, one icon stroke system, and left-aligned section-header default.                | FR-2               |
| `docs-site/site/index.md`                                                            | Tighten homepage copy, add real pipeline/artifact data, and preserve existing frontmatter keys, SEO data, and CTA intent. | FR-2, FR-4         |
| `docs-site/src/home.ts`, `src/home/index.ts`                                         | Remove `initParticles` import/call.                                                                                       | FR-1, NFR-1, NFR-3 |
| `docs-site/src/home/particles.ts`                                                    | **Deleted.**                                                                                                              | FR-1, NFR-3        |
| `docs-site/src/core.ts`, `src/core/index.ts`                                         | Add `onIdle` and motion helper wiring; search stays.                                                                      | FR-1, FR-6         |
| `docs-site/src/docs.ts`, `src/docs/index.ts`                                         | Defer `initScrollToTop`/`initReadingProgress` via `onIdle`.                                                               | FR-1               |
| `docs-site/package.json`                                                             | Remove `@tsparticles/engine` + `@tsparticles/slim` deps.                                                                  | NFR-3              |
| `docs-site/stati.config.ts`                                                          | (Likely unchanged — no split possible; edit only if a bundle needs re-scoping.)                                           | FR-1               |
| `docs/docs-site-minimal-pro-refresh-design.md`                                       | Extend with performance + design decision log.                                                                            | FR-4, NFR-5        |

### Integration Touchpoints

| File                                     | Integration Change                                                                    | Connects Component        | To System                             |
| ---------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------- | ------------------------------------- |
| `docs-site/stati.config.ts`              | Adjust `typescript.bundles[]` only if a bundle needs re-scoping (no split available). | Bundle routing            | esbuild build + per-route JS delivery |
| `docs-site/site/layout.eta`              | Verify `modulepreload` lists only configured route bundles (no async chunks exist).   | Route bundles             | Critical-path asset loading           |
| `docs-site/tailwind.config.js` `content` | Keep globs covering static classes; prune stale safelist entries.                     | Refined tokens/classes    | Tailwind purge                        |
| `docs-site/src/core/index.ts`            | Export `onIdle`; wire reduced-motion listener.                                        | idle helper + motion gate | core bundle init                      |
| `docs-site/package.json`                 | Drop `@tsparticles/*`.                                                                | Particle removal          | Dependency graph / bundle size        |

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

| ID    | Scenario                                                          | Handling                                                                                                                                                          | Test Case                                                                      |
| ----- | ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| EC-1  | `prefers-reduced-motion: reduce`                                  | Disable hero entrance and other transitions via CSS; retain the static background treatment; set `scroll-behavior: auto`; JS uses instant scroll.                 | Toggle OS reduced-motion; load `/`; assert static hero, instant anchor scroll. |
| EC-2  | Slow/offline network                                              | No hero JS to fail (particles removed). Search index fetch failure is non-fatal (existing handling).                                                              | Throttle to offline after first paint; page fully usable.                      |
| EC-3  | Fonts not yet loaded                                              | `font-display: swap` + fallback `@font-face` metric overrides prevent invisible text and minimize CLS.                                                            | Emulate slow font; verify text visible immediately and minimal shift.          |
| EC-4  | JS disabled                                                       | Content, nav links, theme via `prefers-color-scheme`, and layout render server-side; hero accent (CSS) still shows; only enhancements (search/scroll-top) absent. | Disable JS; verify readable, navigable docs + styled hero.                     |
| EC-5  | Search opened via any trigger                                     | All existing triggers keep working (desktop input, header/mobile buttons, `/`, Cmd/Ctrl+K); no regression since search is not refactored to lazy.                 | Exercise each trigger on home + docs pages.                                    |
| EC-6  | Homepage hero on small screens                                    | Refined `clamp()` title scales down; no overflow/CLS; no particle work at any size.                                                                               | Visual QA at 360px.                                                            |
| EC-7  | Tailwind purge removes a class only present in runtime JS strings | Ensure such classes are in `.eta`/safelist/`.stati/tailwind-classes.html`; audit after removing stale safelist entries.                                           | Grep runtime-injected classNames; confirm each survives production CSS.        |
| EC-8  | Theme flash (FOUC) on load                                        | Inline `themeInit` partial must remain first in `<head>`; refactor must not defer it.                                                                             | Hard-reload in dark mode; assert no light flash.                               |
| EC-9  | Very wide (1920px+) and narrow (360px) viewports                  | Refined type scale + layout must hold; TOC hidden < xl, sidebar collapsible.                                                                                      | Visual QA at matrix widths.                                                    |
| EC-10 | Existing deep links / view transitions                            | Navigation transitions remain smooth; reduced-motion disables them.                                                                                               | Navigate between docs pages; verify transition + reduced-motion off-path.      |
| EC-11 | Reduced-motion preference changed mid-session                     | `matchMedia` `change` listener flips smooth/instant scroll and re-gates animation without reload.                                                                 | Toggle OS setting while page open; assert scroll behavior switches.            |
| EC-12 | `requestIdleCallback` unsupported (Safari/older)                  | `onIdle` falls back to `setTimeout`; deferred features still init.                                                                                                | Stub out `requestIdleCallback`; verify scroll-top/reading-progress still work. |

## 9. Error Handling

| Error Type                               | Cause                                 | Recovery                                                                        | User Message                      |
| ---------------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------- | --------------------------------- |
| Search index fetch failure               | Network/missing index                 | Existing search module handling; trigger remains, results empty.                | Existing behavior (non-blocking). |
| Font load failure                        | Missing/blocked woff2                 | Fallback `@font-face` metric-matched families render.                           | None.                             |
| `requestIdleCallback` unsupported        | Safari/older                          | `setTimeout` fallback in `onIdle`.                                              | None.                             |
| `matchMedia` change unsupported (legacy) | Old engine                            | Feature-detect `addEventListener` on the query; fall back to initial read only. | None.                             |
| Tailwind class purged unexpectedly       | Missing safelist                      | Build-time visual regression; fix by adding to `content`/safelist.              | N/A (caught in QA).               |
| Theme init error                         | `localStorage` blocked (privacy mode) | try/catch around storage; fall back to `prefers-color-scheme`.                  | None.                             |

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

### Design Preflight (Mechanical)

- **Hero**: initial viewport contains headline, subtext, both CTAs, and the real code surface; headline is at most two lines; subtext is at most 20 words; desktop top padding is no more than 6rem.
- **Navigation**: one line at 1024px and wider; header height is 72px; labels and routes are unchanged.
- **Theme lock**: every section stays in the selected light or dark theme family; no isolated inverted section.
- **Color lock**: custom cobalt is the sole interface accent outside semantic syntax highlighting; the final UI does not fall back to Tailwind's default blue/slate appearance and no decorative purple, indigo, emerald, amber, cyan, red, or yellow remains.
- **Shape lock**: only the documented 8/12/16px radius tiers appear, except the pill tab selector.
- **Homepage layouts**: source/output hero, build-path band, capability module map, proof desk, and command close are five distinct families; no equal three-column cards and no repeated centered gradient section headers.
- **Eyebrows**: zero in hero and no more than one across the remaining homepage sections.
- **Motion**: no infinite animation; every animation communicates hierarchy or state; reduced mode is static; no `transition-all` remains in touched templates or component CSS.
- **Controls**: CTA labels do not wrap; active states include tactile feedback; button, input, placeholder, helper, and focus-ring contrast passes AA.
- **Copy**: homepage and chrome strings contain no em dash or separator en dash, no duplicated CTA intent with different labels, no fake metrics, no version labels, no scroll cues, and no decorative locale/status text.
- **Assets**: hero pairs actual Stati configuration with real route or generated output; capability modules use actual code, paths, cache data, commands, or build metrics. No fake screenshot UI, traffic-light terminal chrome, stock image, decorative SVG, or plain-text logo wall.
- **Sidebar**: no decorative status dots or multicolor section accents; active state uses one blue treatment; controls use the shared icon partial.
- **Responsive**: each multi-column homepage section has an explicit single-column layout below 768px; no horizontal overflow at 360px; no `h-screen` is introduced.
- **States**: search loading, empty, error, and populated states are visually verified in both themes; mobile sidebar open/closed and tab active/inactive states are verified.
- **Performance plausibility**: hero visual reserves dimensions; fonts are preloaded intentionally; no new runtime dependency; no layout property is animated.

## 11. Dependencies

- **Existing**: Tailwind CSS + `@tailwindcss/typography`, esbuild (via Stati, no `splitting`), `@tsparticles/engine` + `@tsparticles/slim`, markdown-it Prism, Inter/Fira Code WOFF2.
- **Change**: remove `@tsparticles/engine` and `@tsparticles/slim`; replace Inter with a subsetted, self-hosted IBM Plex Sans variable WOFF2 and retain its SIL Open Font License. Do not ship both sans families in production.
- **No new runtime dependencies** (NFR-3). The only new code is a tiny in-repo `onIdle` + reduced-motion helper.
- **Tooling**: Lighthouse + gzip size measurement for verification — already available; no perf-gate install required.

## 12. Risks & Mitigations

| Risk                                                       | Likelihood      | Impact              | Mitigation                                                                                                                                                   |
| ---------------------------------------------------------- | --------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Assumed dynamic import would create lazy chunks (it won't) | N/A (resolved)  | High if unaddressed | **Resolved**: verified Stati esbuild has no `splitting`; strategy pivoted to dependency removal + idle deferral. Do NOT reintroduce a lazy-chunk assumption. |
| Removing particles disappoints "fancy" expectation         | Low             | Medium              | Use asymmetric composition, a real configuration code surface, precise typography, and one static CSS treatment instead of decorative effects.               |
| Search cost remains on all pages (no split possible)       | High (accepted) | Low–Medium          | Accepted within scope; offset by particle removal. Deeper split flagged as engine follow-up (Section 14).                                                    |
| Font-stack change shifts layout/metrics                    | Low             | Medium              | Keep metric-override fallback `@font-face`; QA CLS; the fix improves consistency since declared fonts never loaded.                                          |
| Deferring init introduces perceptible lag                  | Low             | Low                 | Only defer truly non-critical `scroll-to-top`/`reading-progress`; keep sidebar/theme/search/TOC immediate.                                                   |
| Theme FOUC introduced by reordering head                   | Low             | High                | Do not move inline `themeInit`; explicitly test dark reload (EC-8).                                                                                          |
| CSS reduction target (30 KB) not met                       | Medium          | Low                 | Measure gzip; collapse `.sidebar-link.active-*` variants, prune stale safelist + unused `glow*`/animations; iterate.                                         |
| No automated visual regression → subtle breakage           | Medium          | Medium              | Structured manual QA matrix + before/after screenshots; small, reviewable diffs per phase.                                                                   |
| Stale hashed chunks mask real size wins                    | Low             | Low                 | Clean build (`npm run clean`) before measuring (steps 1, 16).                                                                                                |

## 13. Refinement Log

| Round | Focus                                         | Findings                                                                                                                                                                                                                                                                                                                              | Changes Made                                                                                                                                                                                                                                                                                                                                                                |
| ----- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| V3    | Distinctiveness and target-group fit          | The 6/4/5 direction was tasteful but still resembled a mainstream developer SaaS refresh. It lacked a memorable system-level idea and did not show enough implementation truth for experienced JS/TS developers.                                                                                                                      | Introduced the Compiled Editorial concept and 8/5/6 dials; made source-to-output the signature; added a real pipeline band, asymmetric capability module map, vertical proof desk, command close, target-group copy filter, IBM Plex Sans direction, and sequenced compile-order motion.                                                                                    |
| V2    | Design direction and anti-slop audit          | Existing plan removed particles but still left the replacement composition ambiguous; it did not address repeated centered headers, equal feature cards, multicolor accents, fake terminal chrome, decorative sidebar dots, or a mechanical visual preflight.                                                                         | Added preserve-mode audit and 6/4/5 dials; specified four distinct homepage layout families; locked typography, color, theme, radius, motion, copy, and asset rules; expanded implementation files and added a mechanical design preflight.                                                                                                                                 |
| V1    | Technical accuracy vs. codebase (rubber-duck) | Blocking: dynamic `import()` won't create lazy chunks (no esbuild `splitting`); lazy search contract missed sidebar input trigger; `modulepreload` reasoning wrong; reduced-motion omitted smooth-scroll + live changes; CSS reduction lacked a concrete strategy; perf acceptance not reproducible; visual direction too subjective. | Pivoted perf strategy to **remove tsParticles** + idle-defer (Sections 1.5, 2.4, 3.1–3.4, 4, 5, 11); added concrete design decisions (3.5); fixed reduced-motion (live listener, smooth-scroll) (3.3, 4.8, EC-1/EC-11); concrete CSS-reduction step (4.8b) + gzip methodology (10); reproducible perf method (10); flagged engine-splitting as out-of-scope follow-up (14). |
| 1     | Requirements Completeness                     | Pending                                                                                                                                                                                                                                                                                                                               |                                                                                                                                                                                                                                                                                                                                                                             |
| 2     | Architecture Validation                       | Addressed in V1                                                                                                                                                                                                                                                                                                                       |                                                                                                                                                                                                                                                                                                                                                                             |
| 3     | Data Flow Analysis                            | Addressed in V1                                                                                                                                                                                                                                                                                                                       |                                                                                                                                                                                                                                                                                                                                                                             |
| 4     | Error Handling                                | Updated (Section 9)                                                                                                                                                                                                                                                                                                                   |                                                                                                                                                                                                                                                                                                                                                                             |
| 5     | Edge Cases                                    | Updated (Section 8)                                                                                                                                                                                                                                                                                                                   |                                                                                                                                                                                                                                                                                                                                                                             |
| 6     | Testing Coverage                              | Updated (Section 10)                                                                                                                                                                                                                                                                                                                  |                                                                                                                                                                                                                                                                                                                                                                             |
| 7     | Integration Points                            | Addressed in V1                                                                                                                                                                                                                                                                                                                       |                                                                                                                                                                                                                                                                                                                                                                             |
| 8     | Performance                                   | Addressed in V1                                                                                                                                                                                                                                                                                                                       |                                                                                                                                                                                                                                                                                                                                                                             |
| 9     | Security Review                               | Low surface (static docs; no user data, no new deps, external links already `rel=noopener`)                                                                                                                                                                                                                                           |                                                                                                                                                                                                                                                                                                                                                                             |
| 10    | Final Validation                              | Pending                                                                                                                                                                                                                                                                                                                               |                                                                                                                                                                                                                                                                                                                                                                             |

## 14. Open Questions

### Deferred Decisions

| Question                                                                | Default Decision                                                                                                                | Rationale                                                                                                                                 | Override Instructions                                                                   |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Keep, lazy-load, or remove hero particles?                              | **Remove** tsParticles; use one static CSS structural treatment.                                                                | True lazy-loading is impossible; keeping it eager costs ~235 KB and conflicts with the restrained direction.                              | Any future animated hero requires a separate design and performance review.             |
| Use the anonymous shipped sans or establish a stronger technical voice? | Replace Inter with subsetted IBM Plex Sans Variable; keep Fira Code.                                                            | IBM Plex Sans better supports the instrument-grade editorial direction. Removing Inter keeps the family count and transfer budget stable. | Revert only if measured LCP or CLS misses budget after subsetting and metric overrides. |
| Should search be code-split off `core`?                                 | **No** (not possible in scope). Keep search eager where needed.                                                                 | Stati's per-bundle esbuild has no `splitting`; dynamic imports inline. Splitting requires engine changes (out of scope).                  | Pursue as the engine follow-up below.                                                   |
| Preload Fira Code globally?                                             | Keep it on the homepage because real code is above the fold; re-evaluate it on docs routes if route-level head control permits. | The source/output hero makes code part of LCP on the homepage.                                                                            | Measure with and without preload using the fixed Lighthouse method.                     |
| Add a unit-test harness to docs-site?                                   | Do not add a new harness; rely on typecheck + build + manual/perf QA.                                                           | docs-site has no existing test setup; adding one exceeds the refresh's minimal-surface intent.                                            | If desired, wire Vitest consistent with the monorepo and move Section 10 unit tests in. |
| Introduce automated visual-regression?                                  | No; manual screenshot matrix.                                                                                                   | Keeps scope minimal; no infra to maintain.                                                                                                | Add Playwright/visual-diff as a separate initiative if regressions recur.               |

### Recommended Follow-Up (Out of Current Scope)

- **Add esbuild code-splitting to Stati core** (`packages/core/src/core/utils/typescript.utils.ts`): enable `splitting: true` for ESM builds and register _all_ emitted chunks (not just the first `.js`) as bundle/preload paths. This would unlock true lazy-loading of heavy client modules (e.g., search UI) across all Stati sites — a meaningful engine feature, but explicitly **out of scope** for this docs-site-only refresh.

### Auto-Resolved

- **Testing framework / harness**: none currently in `docs-site` (no test script in `package.json`); resolved to manual + typecheck + build + Lighthouse. (Section 1.5, 10.)
- **Current font inventory**: only `inter.woff2` + `fira-code.woff2` exist today. The design decision is to replace Inter with subsetted IBM Plex Sans, not add a third production font. (Sections 1.5 and 3.5.3.)
- **Bundle mechanism**: esbuild via Stati `typescript.bundles[]`, compiled per-entry with `bundle: true` and **no `splitting`** (verified in `typescript.utils.ts`); dynamic imports are inlined, not chunked. (Sections 1.5, 2.4.)
