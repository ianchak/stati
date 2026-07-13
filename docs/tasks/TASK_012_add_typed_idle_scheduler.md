# TASK_012: Add Typed Idle Scheduler

## Metadata

| Field | Value |
| --- | --- |
| **Milestone** | M3: Runtime Performance and Motion |
| **Priority** | Medium |
| **Complexity** | S (≤2h) |
| **Dependencies** | TASK_011 |
| **Plan Reference** | §3.4; §4 Phase 3 step 13; §6 |
| **Skip Test-First** | false |

## Description

Add a tiny typed `onIdle(callback)` helper using `requestIdleCallback` when available and a `setTimeout` fallback. Export and exercise it within this task so it is not an unused forward reference.

## Acceptance Criteria

- [ ] Implement `onIdle(callback: () => void): void` with feature detection and approximately 1ms timeout fallback.
- [ ] Export it from `src/core/index.ts` using existing `.js` import conventions.
- [ ] Add lightweight tests for native and fallback paths using existing monorepo-compatible test tooling, or a self-contained typed smoke consumer if no docs-site test harness can be used without new dependencies.
- [ ] Do not defer theme, mobile menu, search, sidebar, TOC, or visible affordances.

## Technical Approach

Keep the helper browser-safe and fire-and-forget. Avoid adding a runtime dependency or changing global type declarations beyond what TypeScript needs for supported browser APIs.

### Integration Wiring

The core barrel registers the helper. A same-task smoke/test consumes it; TASK_013 is the production consumer after this independently gate-green primitive exists.

## Files to Create/Modify

| File | Action | Purpose |
| --- | --- | --- |
| `docs-site/src/core/idle.ts` | Create | Typed scheduling helper |
| `docs-site/src/core/index.ts` | Modify | Export helper |
| Existing compatible test location | Create/Modify | Native/fallback coverage |

## Tuning Parameters

Fallback delay approximately 1ms.

## Testing Strategy

- [ ] Verify callback via mocked `requestIdleCallback`.
- [ ] Verify callback via fallback when API is absent.
- [ ] Run typecheck/build and applicable test command.

## Gate Compliance

- **Types/Interfaces**: Helper implementation, export, and same-task consumer/test are complete.
- **Existing Tests**: No initialization order changes.
- **New Tests**: Both paths pass in this task.
- **Imports/Exports**: Barrel points to the file created here; no future module reference.

## Milestone Contribution

Provides the safe primitive for marginal non-critical initialization deferral.

## Out of Scope

Changing feature initialization order (TASK_013).
