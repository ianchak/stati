# MVT_M4: Verification and Handoff - Manual Verification Test

## Metadata

| Field | Value |
| --- | --- |
| **Milestone** | M4: Verification and Handoff |
| **Type** | Manual Verification Test |
| **Dependencies** | TASK_016, TASK_017, TASK_018, TASK_019, TASK_020 |
| **Estimated Time** | 75 minutes |
| **Plan Reference** | §1 Acceptance Signals; §10 |

## Purpose

Provide the human release gate for clean artifacts, visual/functional quality, measured budgets, and maintainer handoff.

## Prerequisites

- [ ] All milestone tasks COMPLETE
- [ ] Every applicable automated gate passes
- [ ] Clean production preview and final evidence are available

## Manual Test Steps

| Step | Action | Expected Result | Pass/Fail |
| --- | --- | --- | --- |
| 1 | Clean and rebuild, then inspect emitted assets and key routes | Reproducible build, current assets only, no 404 or console error | [ ] |
| 2 | Repeat representative home/docs visual matrix and mechanical preflight | Both themes and all widths meet every locked design rule | [ ] |
| 3 | Exercise all preserved features, keyboard flow, no-JS, reduced motion, and idle fallback | Functionality and accessibility are intact in every mode | [ ] |
| 4 | Audit Lighthouse/raw runs and gzip arithmetic | Five-run medians are reproducible and all NFR-1 budgets are honestly reported | [ ] |
| 5 | Inspect SEO/RSS/sitemap and route/label/anchor locks | Existing IA and generated metadata remain valid | [ ] |
| 6 | Read the maintainer document against the final site | Decisions, provenance, screenshots, and before/after evidence are accurate and sufficient | [ ] |

## Pass/Fail Criteria

PASS requires all steps, all applicable gates, all plan acceptance criteria, no crash/error, and no unrecorded exception. Any failed budget or checklist row is FAIL and must be resolved or explicitly escalated before sign-off.

## Failure Documentation

Record requirement ID, route/theme/viewport, actual result, reproduction steps, build/console evidence, and screenshot.

## Sign-off

| Role | Name | Date | Status |
| --- | --- | --- | --- |
| Tester |  |  | NOT STARTED |
| Reviewer |  |  | NOT STARTED |
