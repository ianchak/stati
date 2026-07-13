# TASK_014: Add Live Reduced-Motion Behavior

## Metadata

| Field | Value |
| --- | --- |
| **Milestone** | M3: Runtime Performance and Motion |
| **Priority** | High |
| **Complexity** | M (2-4h) |
| **Dependencies** | TASK_013 |
| **Plan Reference** | §3.3-3.4; §4 Phase 3 step 15; EC-1, EC-11 |
| **Skip Test-First** | false |

## Description

Create the shared reduced-motion query API and wire it into root scroll behavior, TOC navigation, and scroll-to-top so an OS preference change takes effect without reload.

## Acceptance Criteria

- [ ] Implement `prefersReducedMotion(): boolean` and `onReducedMotionChange(callback)` with cleanup and legacy feature detection.
- [ ] Export the API from the core barrel and consume it in TOC and scroll-to-top paths.
- [ ] Initial and live preference state switches root and JS-driven scrolling between instant and smooth.
- [ ] CSS decorative motion remains gated; unsupported change listeners degrade to initial-state behavior without error.
- [ ] Tests cover initial state, change event, cleanup, and unsupported listener behavior.

## Technical Approach

Own one `matchMedia('(prefers-reduced-motion: reduce)')` query contract. Keep CSS as the animation source of truth and use the helper only where JavaScript selects scrolling behavior.

### Integration Wiring

| Wiring Step | File to Modify | What to Add | Why |
| --- | --- | --- | --- |
| Register API | `src/core/index.ts` | Export motion helpers | Shared consumption |
| Initialize live behavior | `src/core.ts` or existing init path | Root subscription and cleanup | Mid-session updates |
| Consume predicate | TOC/scroll-to-top modules | Smooth vs instant option | Accessible navigation |

## Files to Create/Modify

| File | Action | Purpose |
| --- | --- | --- |
| `docs-site/src/core/motion.ts` | Create | Shared motion preference |
| `docs-site/src/core/index.ts`, `src/core.ts` | Modify | Export/init |
| `docs-site/src/docs/toc.ts` | Modify | Preference-aware anchors |
| `docs-site/src/docs/scroll-to-top.ts` | Modify | Preference-aware scrolling |
| Existing compatible tests | Create/Modify | Motion API coverage |

## Tuning Parameters

Use the exact media query; no debounce or animation library.

## Testing Strategy

- [ ] Run typecheck/build and tests.
- [ ] Toggle OS preference while home/docs pages remain open.
- [ ] Verify smooth/instant TOC and scroll-to-top plus listener cleanup.

## Gate Compliance

- **Types/Interfaces**: API, implementation, exports, consumers, and tests ship together.
- **Existing Tests**: Scroll expectations are updated atomically.
- **New Tests**: Every supported/fallback path passes here.
- **Imports/Exports**: New file exists before barrel and consumers reference it.

## Milestone Contribution

Completes accessible runtime motion behavior.

## Out of Scope

Changing CSS design timings established in TASK_009.
