# TASK_010: Integrate Homepage and Chrome

## Metadata

| Field | Value |
| --- | --- |
| **Milestone** | M2: Composed Editorial Experience |
| **Priority** | High |
| **Complexity** | M (2-4h) |
| **Dependencies** | TASK_005, TASK_006, TASK_007, TASK_008, TASK_009 |
| **Plan Reference** | §3.4; §3.5; §5 Integration Touchpoints |
| **Skip Test-First** | true |

## Description

Wire all redesigned homepage sections, shared components, content data, and docs chrome into one coherent production experience. Validate that the five layout families remain distinct while shared navigation, theme, search, and responsive behavior stay intact.

## Acceptance Criteria

- [ ] `home.eta` renders hero, build path, capability map, proof desk, and command close exactly once in the intended order.
- [ ] All new partials/data/classes have consumers, registration points, and production CSS; no orphan component or purged runtime class remains.
- [ ] Homepage/chrome copy, routes, SEO keys, navigation labels, and CTA intents comply with the lock in §3.5.8.
- [ ] End-to-end smoke covers home-to-doc navigation, theme, all search triggers, mobile menu, proof controls, sidebar, TOC, progress, and scroll-to-top.
- [ ] Both themes and all target widths have no overflow, console error, broken link, or decorative-policy violation.

## Technical Approach

Review built HTML rather than isolated templates. Correct only wiring/data/shared-component mismatches across completed tasks and add a reproducible smoke checklist.

### Integration Wiring

| Component | Registration | Consumer |
| --- | --- | --- |
| Homepage partials | `site/home.eta` | Built `/` |
| Homepage data | `site/index.md` | Eta partials |
| Shared controls | Section/home partials | Layout and interactions |
| Tokens/motion | Tailwind + `styles.css` | All rendered surfaces |

## Files to Create/Modify

| File | Action | Purpose |
| --- | --- | --- |
| `docs-site/site/home.eta` | Modify | Final section registration |
| `docs-site/site/index.md` | Modify | Final data/copy contract |
| `docs-site/site/_home/*.eta` | Verify/Modify | Cross-partial consistency |
| `docs-site/site/layout.eta` | Verify/Modify | Global chrome integration |
| `docs-site/src/styles.css` | Verify/Modify | Reachable production styles |

## Tuning Parameters

No new tunables; enforce plan defaults.

## Testing Strategy

- [ ] Run `npm run typecheck` and `npm run build:local`.
- [ ] Execute end-to-end smoke with keyboard, pointer, JS-disabled, and reduced-motion modes.
- [ ] Inspect generated home/docs HTML and browser console.

## Gate Compliance

- **Types/Interfaces**: Any data-contract correction updates producer and consumers together.
- **Existing Tests**: Full preserved-function smoke is mandatory.
- **New Tests**: Integration checks rely only on completed dependencies.
- **Imports/Exports**: Every partial, icon, class, and link resolves.

## Milestone Contribution

Provides dedicated end-to-end wiring for all interacting design components.

## Out of Scope

Particle package removal and new runtime helpers.
