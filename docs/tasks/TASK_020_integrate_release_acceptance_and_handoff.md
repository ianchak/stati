# TASK_020: Integrate Release Acceptance and Handoff

## Metadata

| Field | Value |
| --- | --- |
| **Milestone** | M4: Verification and Handoff |
| **Priority** | High |
| **Complexity** | M (2-4h) |
| **Dependencies** | TASK_016, TASK_017, TASK_018, TASK_019 |
| **Plan Reference** | §1 Acceptance Signals; §4 Phase 4; §10 |
| **Skip Test-First** | true |

## Description

Perform the final integration gate across clean artifacts, measured budgets, preserved functionality, visual QA, and maintainer evidence. This task closes only when the docs-site is independently reproducible and ready for implementation review.

## Acceptance Criteria

- [ ] From a clean checkout-compatible state, install as required and run all repository/docs-site format, lint, typecheck, test, and build gates that apply.
- [ ] Confirm all FR-1 through FR-6 and NFR-1 through NFR-6 evidence is present and traceable to final output.
- [ ] Confirm every new component/helper has a consumer and registration point, every route bundle resolves, and no stale/deleted asset is referenced.
- [ ] Re-run critical smoke for home/docs, both themes, target widths, keyboard, search triggers, no-JS, reduced motion, idle fallback, SEO/RSS/sitemap, and console/network health.
- [ ] Verify the maintainer record contains accurate decisions, screenshots, methodology, and before/after results with no unsupported claim.

## Technical Approach

Use a release checklist mapped to plan requirement IDs. Correct only docs-site-scoped integration defects, then rerun the full affected gate chain; do not waive a gate.

### Integration Wiring

This dedicated final task connects all milestone outputs through package scripts, Stati bundle configuration, root layout, route entries, generated HTML/assets, and the maintainer handoff document.

## Files to Create/Modify

| File | Action | Purpose |
| --- | --- | --- |
| `docs-site/**` | Verify/Modify only as needed | Resolve final integration defects |
| `docs/docs-site-minimal-pro-refresh-design.md` | Verify/Modify | Complete traceable handoff |

## Tuning Parameters

No new values; enforce approved defaults and budgets.

## Testing Strategy

- [ ] Run every applicable quality gate in dependency order.
- [ ] Execute the complete release smoke checklist.
- [ ] Verify a clean rebuild reproduces assets and recorded results.

## Gate Compliance

- **Types/Interfaces**: Any final correction updates implementation, consumers, and tests together.
- **Existing Tests**: All applicable repository/docs-site gates must pass.
- **New Tests**: Regression coverage for any discovered defect lands with its fix.
- **Imports/Exports**: Clean build and route smoke prove all wiring resolves.

## Milestone Contribution

Provides the final end-to-end integration and handoff gate.

## Out of Scope

Product implementation outside `docs-site/`, commits, deployment, or acceptance exceptions.
