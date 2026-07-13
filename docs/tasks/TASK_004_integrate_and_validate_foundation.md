# TASK_004: Integrate and Validate Foundation

## Metadata

| Field | Value |
| --- | --- |
| **Milestone** | M1: Foundation and Design System |
| **Priority** | High |
| **Complexity** | M (2-4h) |
| **Dependencies** | TASK_001, TASK_002, TASK_003 |
| **Plan Reference** | §2.4; §3.4; §5 Integration Touchpoints |
| **Skip Test-First** | true |

## Description

Wire the font, token, prose, and syntax changes through the real docs-site build and critical asset path. This dedicated integration task catches stale references, purge omissions, preload mistakes, and cross-theme mismatches before component redesign starts.

## Acceptance Criteria

- [ ] A clean build emits only valid IBM Plex/Fira Code font URLs and no Inter request or stale token reference.
- [ ] Tailwind content globs still cover all static classes; required classes survive production purge.
- [ ] `themeInit` remains before paint, and CSS/font/module preload order introduces no FOUC or console error.
- [ ] Representative home and docs pages use one coherent token/type system in both themes with CLS < 0.05.
- [ ] `npm run typecheck` and `npm run build:local` pass from `docs-site/`.

## Technical Approach

Inspect built HTML/CSS and browser Network/Console output after a clean build. Make only integration corrections needed to connect completed foundation tasks; do not begin homepage redesign.

### Integration Wiring

| Wiring Step | File to Modify | What to Add | Why |
| --- | --- | --- | --- |
| Verify critical assets | `site/layout.eta` | Correct preload ordering if needed | No FOUC/CLS |
| Verify purge | `tailwind.config.js` | Keep valid content coverage | Preserve component styles |
| Resolve consumers | `src/styles.css`, templates | Replace stale token/font references | No orphan foundation work |

## Files to Create/Modify

| File | Action | Purpose |
| --- | --- | --- |
| `docs-site/site/layout.eta` | Verify/Modify | Critical asset wiring |
| `docs-site/tailwind.config.js` | Verify/Modify | Purge integration |
| `docs-site/src/styles.css` | Verify/Modify | Consumer consistency |

## Tuning Parameters

No new values; use TASK_002-003 decisions.

## Testing Strategy

- [ ] Clean, typecheck, and production-build.
- [ ] Hard reload light/dark and slow-font cases.
- [ ] Inspect built output for missing assets/classes and browser console errors.

## Gate Compliance

- **Types/Interfaces**: No new API.
- **Existing Tests**: Runs all available docs-site gates after integrating dependencies.
- **New Tests**: Integration checks validate only completed work.
- **Imports/Exports**: Built asset and CSS references must all resolve.

## Milestone Contribution

Makes the design foundation reachable through the production build.

## Out of Scope

Homepage component composition and client-runtime performance changes.
