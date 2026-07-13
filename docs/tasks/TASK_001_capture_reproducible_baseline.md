# TASK_001: Capture Reproducible Baseline

## Metadata

| Field | Value |
| --- | --- |
| **Milestone** | M1: Foundation and Design System |
| **Priority** | High |
| **Complexity** | S (≤2h) |
| **Dependencies** | None |
| **Plan Reference** | §4 Phase 1 step 1; §10 Performance Verification |
| **Skip Test-First** | false |

## Description

Capture the before-state needed to prove that the docs-site refresh improves measured and perceived performance. Use one fixed Lighthouse and transfer-size methodology for both homepage and a representative dense docs page, without changing product code.

## Acceptance Criteria

- [ ] Run a clean `npm run build:local` from `docs-site/`, then serve with `npm run preview:local`.
- [ ] Record gzip totals for route JS (`core` + route bundle) and final `dist/styles.css`, plus median LCP, CLS, and TBT from five cold-cache Lighthouse Mobile runs per URL.
- [ ] Record the exact URLs, hardware/browser profile, throttling, date, and current bundle names so the after measurement is comparable.
- [ ] Add the baseline table and methodology to `docs/docs-site-minimal-pro-refresh-design.md` without claiming unmeasured improvements.

## Technical Approach

Use the plan's fixed build, preview, cold-cache, five-run median, and `/` plus representative dense-doc methodology. Measure final CSS after `build:css`; do not use raw bytes or pre-CSS Stati metrics as the acceptance number.

### Integration Wiring

The baseline is consumed by TASK_018 and TASK_019. It is registered in the existing maintainer design record rather than a temporary untracked worksheet.

## Files to Create/Modify

| File | Action | Purpose |
| --- | --- | --- |
| `docs/docs-site-minimal-pro-refresh-design.md` | Modify | Store reproducible before metrics and methodology |

## Tuning Parameters

None.

## Testing Strategy

- [ ] Verify `npm run typecheck` and `npm run build:local` still pass.
- [ ] Recalculate one recorded gzip value independently.
- [ ] Confirm all five raw runs and the median are present.

## Gate Compliance

- **Types/Interfaces**: No production types are introduced.
- **Existing Tests**: Measurement and documentation only; no runtime behavior changes.
- **New Tests**: None; build/typecheck are executed in this task.
- **Imports/Exports**: No module changes.

## Milestone Contribution

Provides the controlled comparison used by all later performance acceptance work.

## Out of Scope

Optimizing bundles, changing templates, or treating an existing dirty `dist/` as the baseline.

## Notes

Do not edit the implementation plan. Keep generated build artifacts out of source control.
