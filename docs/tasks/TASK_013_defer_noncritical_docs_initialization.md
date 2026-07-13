# TASK_013: Defer Non-Critical Docs Initialization

## Metadata

| Field | Value |
| --- | --- |
| **Milestone** | M3: Runtime Performance and Motion |
| **Priority** | Medium |
| **Complexity** | S (≤2h) |
| **Dependencies** | TASK_012 |
| **Plan Reference** | §3.4; §4 Phase 3 step 14 |
| **Skip Test-First** | false |

## Description

Use `onIdle` only for reading-progress and scroll-to-top listener attachment. Preserve immediate initialization for theme, mobile menu, search, sidebar, and TOC so visible affordances never feel delayed.

## Acceptance Criteria

- [ ] Wrap only `initReadingProgress` and `initScrollToTop` in `onIdle` from the docs entry path.
- [ ] Keep theme, mobile menu, search UI, sidebar, and TOC immediate and in their existing order.
- [ ] Both deferred features work through the native idle callback and timeout fallback.
- [ ] No visible control becomes temporarily inert; TBT is unchanged or improved.

## Technical Approach

Import the completed helper through the existing core barrel with `.js` extensions and schedule the two low-priority initializers from the docs entry. Do not move internal feature code or duplicate scheduling logic.

### Integration Wiring

`src/docs.ts` is registered as the non-home route bundle in `stati.config.ts`; it consumes `onIdle` and existing docs initializers on `DOMContentLoaded`.

## Files to Create/Modify

| File | Action | Purpose |
| --- | --- | --- |
| `docs-site/src/docs.ts` | Modify | Schedule selected initializers |
| `docs-site/src/docs/index.ts` | Verify/Modify | Preserve exports |
| Existing compatible tests | Modify | Init-order/fallback smoke |

## Tuning Parameters

No new value beyond TASK_012 fallback.

## Testing Strategy

- [ ] Run typecheck/build and applicable tests.
- [ ] Exercise progress/scroll-top with and without `requestIdleCallback`.
- [ ] Immediately exercise search/sidebar/TOC after page load.

## Gate Compliance

- **Types/Interfaces**: Uses a completed dependency contract.
- **Existing Tests**: Update initialization-order expectations in this task.
- **New Tests**: Native/fallback behavior passes now.
- **Imports/Exports**: Import resolves to TASK_012; no dangling symbol.

## Milestone Contribution

Reduces cheap startup work without harming primary interactions.

## Out of Scope

Deferring search, theme, menu, sidebar, or TOC.
