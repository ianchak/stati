# Docs-Site Minimal Pro Refresh Design

## 1. Overview

This document defines the implementation plan for a docs-site focused refresh aimed at experienced JavaScript and TypeScript developers in their 30s and 40s.

Primary intent:

- Preserve the current minimal and fast experience.
- Improve technical readability and scanability for dense documentation.
- Align code highlighting with the docs-site visual language.
- Keep scope limited to docs-site surfaces only.

## 2. Audience Profile

Target audience characteristics:

- Working JS/TS developers with moderate to senior experience.
- Time-constrained readers who scan quickly before deep reading.
- Preference for low-noise interfaces and practical information density.
- High sensitivity to unclear code examples, weak contrast, and decorative UI bloat.

Design implications:

- Favor structure and readability over novelty.
- Keep interactions discoverable and predictable.
- Maintain clean hierarchy in both light and dark themes.
- Ensure syntax colors are distinct and readable across common docs languages.

## 3. Scope

In scope:

- Docs-site visual token and style refinements.
- Docs layout readability polish for sidebar, main content, and TOC.
- Prism syntax highlighting theme redesign to match docs-site identity.
- Docs-site template and section consistency updates where necessary.
- Maintainer-facing documentation for the change.

Out of scope:

- Core generator behavior changes in packages/core.
- CLI behavior changes in packages/cli.
- Scaffolder changes in packages/create-stati.
- Highlighter engine migration away from current prism pipeline.
- Information architecture rewrite or major navigation restructuring.

## 4. Constraints and Guardrails

Technical constraints:

- Keep markdown highlighting pipeline based on markdown-it prism configuration in docs-site config.
- Preserve current docs-site layout architecture and responsive behavior.
- Respect Eta constraints: no partial interpolation inside attribute values.
- Use Stati helper patterns for dynamic class assembly where dynamic classes are needed.

Product constraints:

- Maintain minimal visual tone.
- Avoid adding heavy dependencies for this scope.
- Keep dark mode parity with light mode.
- Avoid regressions in docs build, preview, search, and navigation behavior.

## 5. Current-State Inputs Used

Repository analysis focus areas:

- docs-site template composition and sections.
- docs-site stylesheet and Tailwind customization.
- current prism stylesheet and markdown plugin setup.
- docs-site search, TOC, and navigation surfaces.

External validation source:

- stati.build docs pages for templates, markdown configuration, and troubleshooting guidance.

## 6. Proposed Change Set

### 6.1 Visual System Refinement (Minimal, Not Redesign)

Objectives:

- Improve heading and section scanability.
- Strengthen contrast where needed for sustained reading.
- Keep spacing rhythm calm and consistent.

Planned updates:

- Adjust typography emphasis for major headings and key section transitions.
- Refine neutral backgrounds and border contrast in docs reading surfaces.
- Tighten hover and active affordances in navigation surfaces without visual noise.
- Keep existing accent family and apply restrained updates for readability.

Primary files:

- docs-site/tailwind.config.js
- docs-site/src/styles.css

### 6.2 Docs Layout Readability Polish

Objectives:

- Make long technical pages easier to navigate and scan.
- Increase clarity of current-location and active-section states.

Planned updates:

- Sidebar state and contrast refinement for section headers and active links.
- TOC readability tuning for level depth and active heading identification.
- Main prose rhythm adjustments for paragraphs, lists, links, inline code, and code blocks.
- Keep existing responsive interaction model for mobile sidebar and desktop sticky surfaces.

Primary files:

- docs-site/site/layout.eta
- docs-site/site/\_sections/sidebar.eta
- docs-site/site/\_sections/toc.eta
- docs-site/site/\_sections/header.eta
- docs-site/src/styles.css

### 6.3 Code Highlighting Alignment

Objectives:

- Ensure code samples feel native to docs-site design.
- Improve token differentiation and cross-theme readability.

Planned updates:

- Redesign token palette in prism stylesheet for both light and dark themes.
- Align code block container styles with docs-site cards/prose system.
- Harmonize inline code style with broader typography and contrast needs.
- Validate readability for JS, TS, JSON, Bash, YAML, HTML, and CSS samples.

Primary files:

- docs-site/public/prism-stati.css
- docs-site/src/styles.css
- docs-site/stati.config.ts (verify assumptions only; no pipeline expansion unless necessary)

### 6.4 Template Consistency Touch-Ups

Objectives:

- Keep docs and home surfaces cohesive while prioritizing docs usability.

Planned updates:

- Ensure docs shell styling changes apply consistently where intended.
- Avoid introducing decorative treatment that conflicts with minimal tone.
- Keep preexisting behavior for theme initialization and static asset loading order.

Primary files:

- docs-site/site/layout.eta
- docs-site/site/home.eta
- docs-site/site/\_sections/\*.eta

## 7. File-by-File Implementation Checklist

1. docs-site/tailwind.config.js

- Review and minimally adjust theme extension values used by docs surfaces.
- Preserve existing dark mode strategy and typography plugin usage.

2. docs-site/src/styles.css

- Update prose readability primitives and docs surface styles.
- Refine sidebar and TOC visual states for quick scanning.
- Align inline code and code block wrappers with updated visual language.

3. docs-site/public/prism-stati.css

- Rework syntax token colors and block chrome for light and dark themes.
- Keep language compatibility and token class coverage intact.

4. docs-site/site/layout.eta

- Confirm class usage supports updated docs styles.
- Preserve script/style order and theme initialization placement.

5. docs-site/site/\_sections/sidebar.eta

- Tune classes for active and hover states to improve orientation.

6. docs-site/site/\_sections/toc.eta

- Tune hierarchy and active state readability.

7. docs-site/site/\_sections/header.eta

- Apply restrained readability and affordance polish only if needed.

8. docs-site/site/home.eta

- Ensure visual harmony with updated docs language without overpowering docs pages.

9. docs-site/stati.config.ts

- Validate markdown plugin and prism assumptions remain correct.
- Keep change minimal unless verification reveals a strict blocker.

## 8. Acceptance Criteria

Audience-fit criteria:

- Dense docs pages are easier to scan quickly.
- Code examples are clearer and easier to parse in both themes.
- The site remains minimal and professional, without added visual clutter.

Functional criteria:

- No regression in docs-site build and preview.
- Sidebar, TOC, search, and theme behavior remain stable.
- No breakage in markdown rendering or syntax highlighting coverage.

Quality criteria:

- Strong readable contrast for prose and code tokens in light and dark themes.
- Keyboard focus and active states remain visible.
- No obvious layout shifts introduced by style changes.

## 9. Verification Plan

1. Build and preview validation

- Run local docs-site build and preview commands used by this repository.
- Confirm no template, markdown, or asset pipeline errors.

2. Visual QA matrix

- Pages: home, getting-started, API reference, long advanced doc.
- Modes: light and dark.
- Viewports: mobile, tablet, desktop.

3. Code sample QA

- Validate token readability and differentiation across representative language blocks.
- Validate inline code readability in paragraph context.

4. Interaction QA

- Validate sidebar expand/collapse and mobile overlay behavior.
- Validate TOC active section updates while scrolling.
- Validate theme toggle and persisted preference behavior.

5. Scope QA

- Confirm changes are confined to docs-site plus this planning document.

## 10. Risks and Mitigations

Risk: Reduced token contrast in one theme after palette update.

- Mitigation: explicit contrast checks across representative code samples in both themes.

Risk: Visual drift away from minimal tone.

- Mitigation: enforce restraint checklist during review, reject decorative-only additions.

Risk: Sidebar or TOC state clarity regression.

- Mitigation: targeted interaction QA for active, hover, and focus states.

Risk: Unexpected class generation gaps when dynamic classes are introduced.

- Mitigation: follow Stati class composition guidance and verify final output styles appear in built site.

## 11. Rollout Notes

Execution style for this effort:

- Single immediate implementation pass.
- No phased roadmap in this document.
- Follow with one review pass focused on readability and regressions.

## 12. Definition of Done

This initiative is complete when:

- Docs-site visual and code-highlighting updates are implemented and verified.
- Audience-fit and minimal-tone acceptance criteria are satisfied.
- Build, preview, and key docs interactions are stable.
- This design document remains accurate to implemented behavior.

## 13. Reproducible Performance Baseline (Before Refresh)

Captured for `TASK_001` using a clean local docs-site build and preview without product-code changes.

### 13.1 Methodology (fixed for before/after parity)

| Field | Value |
| --- | --- |
| Build command | `cd docs-site && npm run build:local` |
| Serve command | `cd docs-site && npm run preview:local` |
| Date/time | 2026-07-13 23:01:56 +02:00 |
| URLs measured | `http://localhost:4000/`, `http://localhost:4000/api/reference/` |
| Lighthouse profile | Mobile preset, default simulated throttling (Slow 4G + 4x CPU), performance category only |
| Run mode | Headless Chrome incognito (cold-cache intent), 5 runs per URL, median reported |
| Browser | HeadlessChrome/150.0.0.0 via Lighthouse 13.4.0 |
| Hardware | Windows 10 Pro, 11th Gen Intel Core i7-11700K @ 3.60GHz, 31.9 GB RAM |
| Route bundles in build | `core-QN6B7TGK.js`, `home-LSMFJHUB.js`, `docs-QL77F2UM.js` |
| CSS artifact measured | `docs-site/dist/styles.css` (post-`build:css`) |

### 13.2 Transfer Baseline (gzip bytes)

| Asset | Gzip bytes |
| --- | ---: |
| `core-QN6B7TGK.js` | 20,390 |
| `home-LSMFJHUB.js` | 43,019 |
| `docs-QL77F2UM.js` | 19,510 |
| `dist/styles.css` | 14,419 |
| Home route JS total (`core + home`) | 63,409 |
| API reference route JS total (`core + docs`) | 39,900 |

Independent recalculation check: `home-LSMFJHUB.js` gzip = 43,019 bytes (matches table).

### 13.3 Lighthouse Raw Runs and Medians

| URL | Run | LCP (ms) | CLS | TBT (ms) |
| --- | ---: | ---: | ---: | ---: |
| `/` | 1 | 5,561 | 0.004 | 160 |
| `/` | 2 | 5,553 | 0.000 | 171 |
| `/` | 3 | 5,554 | 0.000 | 159 |
| `/` | 4 | 5,553 | 0.000 | 149 |
| `/` | 5 | 5,552 | 0.004 | 165 |
| `/api/reference/` | 1 | 5,103 | 0.000 | 111 |
| `/api/reference/` | 2 | 5,103 | 0.000 | 113 |
| `/api/reference/` | 3 | 5,103 | 0.020 | 123 |
| `/api/reference/` | 4 | 5,104 | 0.020 | 119 |
| `/api/reference/` | 5 | 5,102 | 0.000 | 128 |

| URL | Median LCP (ms) | Median CLS | Median TBT (ms) |
| --- | ---: | ---: | ---: |
| `/` | 5,553 | 0.000 | 160 |
| `/api/reference/` | 5,103 | 0.000 | 119 |

## 14. TASK_017 QA and Design Preflight Results (2026-07-14)

Scope executed against generated pages from `docs-site/dist` after `npm --prefix docs-site run build:local`.

### 14.1 Screenshot Matrix

| Surface | Viewports | Themes | Evidence |
| --- | --- | --- | --- |
| Home (`/`) | 360, 768, 1280, 1920 | light, dark | `docs-site/.stati/qa/task017/screenshots/home-{light|dark}-{360|768|1280|1920}.png` |
| API Reference (`/api/reference/`) | 360, 768, 1280, 1920 | light, dark | `docs-site/.stati/qa/task017/screenshots/api-reference-{light|dark}-{360|768|1280|1920}.png` |

Additional network capture artifacts:

- `docs-site/.stati/qa/task017/har/home.har`
- `docs-site/.stati/qa/task017/har/api-reference.har`

### 14.2 Functional Preservation (FR-5)

| Capability | Result | Evidence |
| --- | --- | --- |
| Search index wiring | PASS | `stati:search-index` meta present on home and API reference pages |
| Sidebar + TOC + reading progress + scroll-to-top shell | PASS | IDs present and rendered in `dist/api/reference.html` (`#sidebar`, `#toc`, `#reading-progress`, `#scroll-to-top`) |
| Theme controls + skip link shell | PASS | `#theme-toggle` and `a[href="#main-content"]` present in generated HTML |
| RSS / sitemap / robots outputs | PASS | `dist/feed.xml`, `dist/sitemap.xml`, `dist/robots.txt` generated |
| No-JS readability baseline | PASS | Home + docs content fully rendered server-side in generated HTML |

### 14.3 Accessibility and Mechanical Preflight

| Check Group | Result | Notes |
| --- | --- | --- |
| Viewport/theme matrix completeness (360/768/1280/1920 × light/dark) | PASS | 16 matrix screenshots captured for required surfaces |
| Reduced-motion baseline support | PASS | Existing reduced-motion CSS/JS behavior retained from prior task chain; no regression indicators in generated output |
| Focus/skip-link and keyboard affordance presence | PASS | Skip-link and keyboard-accessible controls retained in generated shell |
| Motion discipline (`transition-all` prohibition in touched template/CSS surfaces) | PASS | No `transition-all` matches in `docs-site/site/**/*.eta` or `docs-site/src/styles.css` |
| Copy/asset guardrails in homepage/chrome partials | PASS | No em dash/en dash violations in `docs-site/site/_home/*.eta` and `docs-site/site/_sections/*.eta` |
| Performance plausibility guardrails | PASS | Built bundle profile remains aligned with prior optimization work (no particle runtime returned) |

### 14.4 Runtime Artifact Snapshot

| Asset | Raw bytes | Gzip bytes |
| --- | ---: | ---: |
| `core-HYUX75LJ.js` | 60,328 | 20,846 |
| `home-WMMKLH4T.js` | 2,015 | 778 |
| `docs-IJBLRFMH.js` | 57,765 | 19,756 |
| `styles.css` | 77,242 | 12,723 |

### 14.5 Defects and Corrections

No requirement-backed docs-site defects were identified during this preflight pass, so no product code corrections were required in TASK_017.

## 15. TASK_018 Performance Budget Remeasure (After Refresh)

Captured for `TASK_018` against clean final artifacts from `npm --prefix docs-site run build:local`, served with `npm --prefix docs-site run preview:local`.

### 15.1 Methodology Parity Check

| Field | Value |
| --- | --- |
| Build command | `cd docs-site && npm run build:local` |
| Serve command | `cd docs-site && npm run preview:local` |
| Date/time | 2026-07-14 |
| URLs measured | `http://localhost:4000/`, `http://localhost:4000/api/reference/` |
| Lighthouse profile | Mobile preset, default simulated throttling (Slow 4G + 4x CPU), performance category only |
| Run mode | Headless Chrome incognito (cold-cache intent), 5 runs per URL, median reported |
| Browser | HeadlessChrome/150.0.0.0 via Lighthouse 13.4.0 |
| Route bundles in build | `core-HYUX75LJ.js`, `home-WMMKLH4T.js`, `docs-IJBLRFMH.js` |
| CSS artifact measured | `docs-site/dist/styles.css` (post-`build:css`) |

### 15.2 Transfer Snapshot (gzip bytes)

| Asset | Gzip bytes |
| --- | ---: |
| `core-HYUX75LJ.js` | 20,656 |
| `home-WMMKLH4T.js` | 780 |
| `docs-IJBLRFMH.js` | 19,578 |
| `dist/styles.css` | 12,701 |
| Home route JS total (`core + home`) | 21,436 |
| API reference route JS total (`core + docs`) | 40,234 |

Route bundle wiring evidence from generated pages:

- Home modulepreload: `/_assets/core-HYUX75LJ.js`, `/_assets/home-WMMKLH4T.js`
- API reference modulepreload: `/_assets/core-HYUX75LJ.js`, `/_assets/docs-IJBLRFMH.js`

Particle identifier sweep over `docs-site/dist/**` (`tsparticles`, `particles-js`, `@tsparticles`, `tsParticles`): **no matches**.

### 15.3 Lighthouse Raw Runs and Medians

| URL | Run | LCP (ms) | CLS | TBT (ms) |
| --- | ---: | ---: | ---: | ---: |
| `/` | 1 | 3,152 | 0.000 | 0 |
| `/` | 2 | 3,146 | 0.000 | 0 |
| `/` | 3 | 3,162 | 0.000 | 0 |
| `/` | 4 | 3,158 | 0.000 | 0 |
| `/` | 5 | 3,123 | 0.000 | 0 |
| `/api/reference/` | 1 | 3,398 | 0.002 | 0 |
| `/api/reference/` | 2 | 3,378 | 0.002 | 0 |
| `/api/reference/` | 3 | 3,366 | 0.002 | 0 |
| `/api/reference/` | 4 | 3,333 | 0.002 | 0 |
| `/api/reference/` | 5 | 3,375 | 0.002 | 0 |

| URL | Median LCP (ms) | Median CLS | Median TBT (ms) |
| --- | ---: | ---: | ---: |
| `/` | 3,152 | 0.000 | 0 |
| `/api/reference/` | 3,375 | 0.002 | 0 |

### 15.4 Before/After Budget Comparison

| Metric | Before (TASK_001) | After (TASK_018) | Budget | Status |
| --- | ---: | ---: | ---: | --- |
| Home route JS gzip (`core + home`) | 63,409 | 21,436 | < 60,000 | PASS |
| API reference route JS gzip (`core + docs`) | 39,900 | 40,234 | < 40,000 | FAIL (+234) |
| CSS gzip (`dist/styles.css`) | 14,419 | 12,701 | < 30,000 | PASS |
| Home median LCP (ms) | 5,553 | 3,152 | < 1,500 | FAIL |
| Home median CLS | 0.000 | 0.000 | < 0.05 | PASS |
| Home median TBT (ms) | 160 | 0 | < 150 | PASS |
| API reference median LCP (ms) | 5,103 | 3,375 | < 1,500 | FAIL |
| API reference median CLS | 0.000 | 0.002 | < 0.05 | PASS |
| API reference median TBT (ms) | 119 | 0 | < 150 | PASS |

### 15.5 Escalation Notes

TASK_018 confirms large improvement versus baseline (home JS -66.2%, docs-route JS near-flat, CSS -11.9%, and TBT now 0ms medians) and confirms particle removal in emitted output, but strict NFR-1 thresholds are still not fully met for:

1. LCP on both measured URLs under the fixed mobile-simulated profile.
2. API route JS gzip budget by 234 bytes under strict `< 40,000` interpretation.

No additional docs-site-only optimization was applied in this task to avoid widening scope without a requirement-backed change set; remaining budget gaps should be handled as explicit follow-up work rather than masked in acceptance reporting.

## 16. Final Maintainer Record (TASK_019)

This section is the canonical decision record for the docs-site refresh and reflects shipped behavior only.

### 16.1 Design Read, Dials, and Target Group

- **Design read**: **Compiled Editorial** - technical editorial composition showing real source-to-output artifacts, not generic SaaS styling.
- **Dial targets**: `DESIGN_VARIANCE: 8`, `MOTION_INTENSITY: 5`, `VISUAL_DENSITY: 6`.
- **Target-group rationale**: optimize for experienced JS/TS maintainers who scan first and trust concrete artifacts (config, routes, cache behavior, commands) over decorative marketing language.

### 16.2 Homepage Layout Families (Shipped)

1. Source/output hero (offset 7/5 composition with real config/output).
2. Build path band (content -> markdown -> eta -> html -> cache).
3. Capability module map (asymmetric six-module composition).
4. Proof desk (stateful proof rail + output surface).
5. Command close (single command + consistent CTA close).

### 16.3 Preserved and Retired Patterns

| Category | Preserved | Retired |
| --- | --- | --- |
| Information architecture | Existing routes, slugs, nav labels, docs structure, search model | IA rewrite, route renames, docs content rewrite |
| Docs shell behavior | 72px sticky header, three-column docs shell, theme persistence, sidebar/TOC/search contracts | Decorative sidebar dots, multicolor chrome accents |
| Visual behavior | Restrained transitions, syntax-first technical surfaces | tsParticles background, ambient orb haze, gradient wordmark text, broad `transition-all`, fake terminal chrome |
| Runtime strategy | Route-bundle delivery (`core+home` on `/`, `core+docs` on docs routes), reduced-motion support | Unsupported "local dynamic import = new async chunk" assumption |

### 16.4 Final Rules (Tokens, Type, Radius, Motion, Copy, Assets)

| Rule Set | Final Rule |
| --- | --- |
| Token anchors | Light: canvas `#F4F6F8`, surface `#FCFCFD`, muted `#E9EDF2`, text `#17202A`, muted text `#4B5968`, accent `#2948C8`; Dark: canvas `#0B111B`, surface `#101925`, muted `#162232`, text `#E7ECF2`, muted text `#AAB5C3`, accent `#9AAEFF` |
| Type system | IBM Plex Sans Variable for UI/prose; Fira Code for code; docs body `17px`, `line-height: 2rem`, `max-width: 74ch`; inline code `0.84em`; block code `0.84rem` |
| Radius system | 8px inputs/small controls; 12px buttons/content panels; 16px code blocks/overlays; pills reserved for tab selector |
| Motion discipline | No infinite/decorative loops; transform/opacity-focused transitions; reduced-motion disables smooth/entrance motion and updates live via preference listener |
| Copy discipline | Preserve docs prose/IA; homepage/chrome copy uses regular hyphens; no invented metrics/social proof; CTA intent remains consistent |
| Asset discipline | Product visuals must be real artifacts (config, route structure, output, measured metrics), not stock imagery or faux dashboards |

### 16.5 Font Provenance and License Record

- `docs-site/public/fonts/ibm-plex-sans-var.woff2` is sourced from the official IBM Plex release and used as the shipped sans family.
- `docs-site/public/fonts/OFL-IBM-Plex.txt` retains the SIL Open Font License text alongside the font asset.
- Inter was retired from shipped docs-site font transfer in favor of the IBM Plex + Fira Code pair.

### 16.6 tsParticles Removal Decision

`@tsparticles/*` was intentionally removed because the current Stati/esbuild bundle model does not provide true local dynamic-import chunk splitting per route within docs-site scope. Keeping particles would have preserved decorative JS weight on the home route without functional value. The replacement is static CSS composition and content-led hierarchy.

### 16.7 Bundle Reality and Explicit Dynamic-Import Rejection

- Current route delivery model is validated in generated HTML/modulepreload output:
  - `/` loads `core-HYUX75LJ.js` + `home-WMMKLH4T.js`
  - `/api/reference/` loads `core-HYUX75LJ.js` + `docs-IJBLRFMH.js`
- **Explicit decision**: do not claim or rely on local `import()` as route-level lazy splitting in this docs-site scope; treat engine-level splitting support as out-of-scope follow-up work.

### 16.8 Evidence Index (QA and Performance)

Representative QA screenshot references from completed matrix (TASK_017):

| Surface | Theme | Viewport | Reference |
| --- | --- | ---: | --- |
| Home (`/`) | light | 1280 | `docs-site/.stati/qa/task017/screenshots/home-light-1280.png` |
| Home (`/`) | dark | 360 | `docs-site/.stati/qa/task017/screenshots/home-dark-360.png` |
| API reference (`/api/reference/`) | light | 1280 | `docs-site/.stati/qa/task017/screenshots/api-reference-light-1280.png` |
| API reference (`/api/reference/`) | dark | 360 | `docs-site/.stati/qa/task017/screenshots/api-reference-dark-360.png` |

Reproducible performance evidence is recorded in:

- Section 13 (before baseline, TASK_001),
- Section 15.2 (after transfer snapshot, TASK_018),
- Section 15.4 (before/after budget comparison table),
- Section 15.5 (budget escalation notes with unresolved thresholds).

## 17. TASK_020 Release Acceptance and Handoff Integration (2026-07-14)

Final integration pass was executed from a clean docs-site artifact state (`npm --prefix docs-site run clean` then `npm --prefix docs-site run build:local`) to confirm wiring, generated outputs, and gate status in one reproducible run.

### 17.1 Gate Execution Record

| Surface | Command | Exit Code | Result |
| --- | --- | ---: | --- |
| Root | `npm run format` | 1 | N/A - script is not defined in this repository |
| Root | `npm run lint` | 0 | PASS |
| Root | `npm run typecheck` | 0 | PASS |
| Root | `npm test` | 0 | PASS |
| Root | `npm run build` | 0 | PASS |
| docs-site | `npm run typecheck` | 0 | PASS |
| docs-site | `npm run clean` | 0 | PASS |
| docs-site | `npm run build:local` | 0 | PASS |

### 17.2 Final Integration Wiring Verification

| Check | Result | Evidence |
| --- | --- | --- |
| Route bundle delivery (`core + home` on `/`, `core + docs` on docs pages) | PASS | `dist/index.html` modulepreload entries: `core-HYUX75LJ.js`, `home-WMMKLH4T.js`; `dist/api/reference.html` modulepreload entries: `core-HYUX75LJ.js`, `docs-IJBLRFMH.js` |
| No stale runtime JS chunks after clean build | PASS | `dist/_assets` contains only `core-HYUX75LJ.js`, `home-WMMKLH4T.js`, `docs-IJBLRFMH.js` |
| Search + docs shell registrations present in final output | PASS | Generated HTML contains `stati:search-index`, `#search-trigger`, `#mobile-search-btn`, `#theme-toggle`, `#sidebar`, `#toc`, `#reading-progress`, `#scroll-to-top`, and skip link to `#main-content` |
| Removed particle runtime remains absent from built assets | PASS | No `tsparticles`, `particles-js`, `@tsparticles`, or `tsParticles` matches under `docs-site/dist/_assets` |
| Feed/SEO crawl artifacts generated | PASS | `dist/feed.xml`, `dist/sitemap.xml`, and `dist/robots.txt` exist in clean build output |

### 17.3 FR/NFR Evidence Traceability Check

All FR-1 through FR-6 and NFR-1 through NFR-6 evidence remains present and traceable through Sections 13-16 plus the integration verification in Section 17.2.

- Performance and budget evidence remains anchored in Sections 15.2-15.5.
- Functional preservation and smoke evidence remains anchored in Section 14.
- Design decisions, constraints, and implementation rationale remain anchored in Section 16.

### 17.4 Final Acceptance Notes

No new docs-site integration defects were identified during TASK_020.

Known unresolved threshold gaps remain exactly as recorded in Section 15.5 (NFR-1 LCP targets and docs-route JS gzip by +234 bytes under strict `< 40,000` interpretation). These are explicitly documented and not masked by this handoff step.
