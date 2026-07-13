# TASK_018: Remeasure Performance Budgets

## Metadata

| Field | Value |
| --- | --- |
| **Milestone** | M4: Verification and Handoff |
| **Priority** | High |
| **Complexity** | M (2-4h) |
| **Dependencies** | TASK_001, TASK_016, TASK_017 |
| **Plan Reference** | §1.2 NFR-1; §4 Phase 4 step 19; §10 Performance Verification |
| **Skip Test-First** | false |

## Description

Repeat the exact baseline methodology against clean final artifacts, compare medians, and resolve docs-site regressions until budgets pass or record precise evidence for any explicit escalation.

## Acceptance Criteria

- [ ] Repeat the same five-run cold-cache Lighthouse profile and URLs recorded in TASK_001.
- [ ] Record median LCP/CLS/TBT and gzip route JS/CSS, with home JS <60 KB, docs JS <40 KB, CSS <30 KB, LCP <1.5s, CLS <0.05, and TBT <150ms.
- [ ] Confirm particle identifiers are absent and route bundle sums use actual emitted assets.
- [ ] Add a transparent before/after table; do not cherry-pick runs or mix raw/gzip measurements.
- [ ] Typecheck/build remain green after any docs-site-only optimization needed to meet acceptance.

## Technical Approach

Fix every variable from the baseline. Measure CSS directly after `build:css`; use median rather than best run. If a budget cannot be met within plan scope, preserve exact evidence and escalate rather than inventing success.

### Integration Wiring

Final emitted assets and Lighthouse are the consumers of all implementation work. Results are registered in the existing maintainer design record for TASK_019.

## Files to Create/Modify

| File | Action | Purpose |
| --- | --- | --- |
| `docs/docs-site-minimal-pro-refresh-design.md` | Modify | Before/after budget table |
| `docs-site/**` | Modify only if needed | Requirement-backed final optimization |

## Tuning Parameters

Exactly the baseline profile and NFR-1 thresholds.

## Testing Strategy

- [ ] Validate gzip arithmetic independently.
- [ ] Run typecheck/build after any correction.
- [ ] Preserve five raw runs and median for each URL.

## Gate Compliance

- **Types/Interfaces**: Any optimization remains a complete vertical change.
- **Existing Tests**: Final gates rerun after changes.
- **New Tests**: Measurement completes within this task.
- **Imports/Exports**: Clean artifacts prove resolution.

## Milestone Contribution

Supplies objective final performance acceptance.

## Out of Scope

CDN/backend tuning or engine-level splitting.
