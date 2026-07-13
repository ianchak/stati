# MVT_M3: Runtime Performance and Motion - Manual Verification Test

## Metadata

| Field | Value |
| --- | --- |
| **Milestone** | M3: Runtime Performance and Motion |
| **Type** | Manual Verification Test |
| **Dependencies** | TASK_011, TASK_012, TASK_013, TASK_014, TASK_015 |
| **Estimated Time** | 45 minutes |
| **Plan Reference** | §3.2-3.4; §10 Integration Tests |

## Purpose

Verify the lean route runtime, approved idle deferral, and live reduced-motion behavior through real built entry points.

## Prerequisites

- [ ] All milestone tasks COMPLETE
- [ ] Clean build, typecheck, and applicable tests pass
- [ ] Browser DevTools Network/Console available

## Manual Test Steps

| Step | Action | Expected Result | Pass/Fail |
| --- | --- | --- | --- |
| 1 | Load `/` after a clean build and inspect assets | Only core/home route bundles load; no particle identifiers or stale chunks; hero needs no JS | [ ] |
| 2 | Load a dense docs route and inspect assets | Only core/docs route bundles load; no missing module or console error | [ ] |
| 3 | Immediately exercise theme, menu, all search triggers, sidebar, and TOC | Every visible affordance responds immediately | [ ] |
| 4 | Exercise reading progress and scroll-to-top normally and with `requestIdleCallback` unavailable | Both initialize and function in native/fallback paths | [ ] |
| 5 | Toggle OS reduced motion while page stays open, then use TOC/scroll-top | Scrolling switches between smooth and instant without reload; decorative motion follows preference | [ ] |
| 6 | Compare homepage route gzip JS with baseline | tsParticles cost is gone and transfer trends toward low tens of KB | [ ] |

## Pass/Fail Criteria

PASS requires every row, valid route bundle delivery, no crash/console error, no particle runtime, preserved search, working fallback, and live preference response.

## Failure Documentation

Record route, loaded assets, browser support condition, failed step, console output, and observed timing.

## Sign-off

| Role | Name | Date | Status |
| --- | --- | --- | --- |
| Tester |  |  | NOT STARTED |
| Reviewer |  |  | NOT STARTED |
