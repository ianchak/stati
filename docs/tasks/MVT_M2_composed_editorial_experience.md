# MVT_M2: Composed Editorial Experience - Manual Verification Test

## Metadata

| Field | Value |
| --- | --- |
| **Milestone** | M2: Composed Editorial Experience |
| **Type** | Manual Verification Test |
| **Dependencies** | TASK_005, TASK_006, TASK_007, TASK_008, TASK_009, TASK_010 |
| **Estimated Time** | 60 minutes |
| **Plan Reference** | §3.5; §10 Design Preflight |

## Purpose

Verify the homepage's five layout families and evolved docs chrome work together without sacrificing accessibility, information architecture, or restraint.

## Prerequisites

- [ ] All milestone tasks COMPLETE
- [ ] Typecheck and clean production build pass
- [ ] Preview available in a clean browser

## Manual Test Steps

| Step | Action | Expected Result | Pass/Fail |
| --- | --- | --- | --- |
| 1 | Inspect hero at 360/768/1280/1920 in both themes | Exact copy, real source/output, stable fit, no overflow or forbidden decoration | [ ] |
| 2 | Inspect build path and six capability modules | Correct vocabulary, asymmetry, real artifacts, and mobile single-column fallback | [ ] |
| 3 | Exercise all proof controls by keyboard/pointer/mobile | Five proofs, clear state, usable rail/scroll-snap, destination-specific links | [ ] |
| 4 | Inspect command close and all touched copy | Real command, consistent CTA labels, no fake/generic claims or forbidden punctuation | [ ] |
| 5 | Exercise header, search states/triggers, theme, mobile menu, sidebar, TOC, progress, and scroll-top | Every preserved feature remains reachable and predictable | [ ] |
| 6 | Compare normal and reduced motion | Bounded state/compile motion normally; static, instant behavior in reduced mode | [ ] |
| 7 | Inspect focus, contrast, hit targets, icons, and built CSS | AA/focus preserved, shared icons used, live classes survive purge | [ ] |

## Pass/Fail Criteria

PASS requires every row, no console errors or crashes, five visibly distinct layout families, no horizontal overflow, and compliance with every mechanical design-preflight lock.

## Failure Documentation

Record viewport/theme/input mode, failed row, actual behavior, screenshot, and console details.

## Sign-off

| Role | Name | Date | Status |
| --- | --- | --- | --- |
| Tester |  |  | NOT STARTED |
| Reviewer |  |  | NOT STARTED |
