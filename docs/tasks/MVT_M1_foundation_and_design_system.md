# MVT_M1: Foundation and Design System - Manual Verification Test

## Metadata

| Field | Value |
| --- | --- |
| **Milestone** | M1: Foundation and Design System |
| **Type** | Manual Verification Test |
| **Dependencies** | TASK_001, TASK_002, TASK_003, TASK_004 |
| **Estimated Time** | 35 minutes |
| **Plan Reference** | §3.5.3-3.5.5; §10 |

## Purpose

Verify the measured baseline, font pipeline, and shared visual system work together in the production docs-site.

## Prerequisites

- [ ] All milestone tasks COMPLETE
- [ ] `npm run typecheck` and `npm run build:local` pass in `docs-site/`
- [ ] Preview is running with a clean browser profile

## Manual Test Steps

| Step | Action | Expected Result | Pass/Fail |
| --- | --- | --- | --- |
| 1 | Compare the recorded baseline method with a fresh run | URLs, build, throttling, five-run median, and gzip units are reproducible | [ ] |
| 2 | Load home and docs pages with network font throttling | Text is immediate; IBM Plex then renders with minimal shift; Fira Code renders code | [ ] |
| 3 | Inspect Network and built HTML | Only intended IBM Plex/Fira Code assets load; preload URLs resolve; no Inter is shipped | [ ] |
| 4 | Inspect prose, code, table, quote, links, and controls in light/dark | Type hierarchy, cobalt accent, surfaces, focus, radii, and syntax remain legible and coherent | [ ] |
| 5 | Hard-reload a stored dark theme | No light-theme flash or console error appears | [ ] |
| 6 | Resize representative docs pages | 74ch reading measure and hierarchy remain usable without overflow | [ ] |

## Pass/Fail Criteria

**PASS** only if every step passes, CLS remains below 0.05 in the slow-font check, contrast is AA, and no crash, missing asset, or console error occurs. Any failed row is an MVT failure.

## Failure Documentation

Record the failed step, URL/theme/viewport, actual result, console/network evidence, and screenshot.

## Sign-off

| Role | Name | Date | Status |
| --- | --- | --- | --- |
| Tester |  |  | NOT STARTED |
| Reviewer |  |  | NOT STARTED |

## Notes

This MVT requires visual judgment and network inspection; it does not replace automated gates.
