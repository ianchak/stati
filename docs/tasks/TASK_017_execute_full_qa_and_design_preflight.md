# TASK_017: Execute Full QA and Design Preflight

## Metadata

| Field | Value |
| --- | --- |
| **Milestone** | M4: Verification and Handoff |
| **Priority** | High |
| **Complexity** | L (4-8h) |
| **Dependencies** | TASK_016 |
| **Plan Reference** | §1.1 FR-5; §10 Manual QA and Design Preflight |
| **Skip Test-First** | false |

## Description

Execute the complete functional, accessibility, visual, responsive, and anti-slop matrix against clean built pages. Fix docs-site defects discovered by the matrix and rerun affected gates before closing the task.

## Acceptance Criteria

- [ ] Verify 360/768/1280/1920 in light/dark for home and representative dense docs pages.
- [ ] Pass every mechanical preflight item: hero, nav, theme/color/shape locks, five layouts, eyebrow/motion/control/copy/asset/sidebar/responsive/state/performance rules.
- [ ] Pass preserved functionality for search, TOC, sidebar, theme, progress, scroll-top, mobile menu, view transitions, skip link, RSS/sitemap/SEO, and no-JS readability.
- [ ] Verify AA contrast, focus-visible, keyboard flows, 40px targets, reduced motion, FOUC absence, and no console errors.
- [ ] Record screenshots and outcomes; any correction remains `docs-site/` scoped and all gates pass afterward.

## Technical Approach

Use the plan checklist as a binary matrix. Test generated pages rather than templates, prioritize real interaction states, and make only requirement-backed corrections.

### Integration Wiring

This task exercises every component through `layout.eta`, route bundles, generated pages, search index, and production CSS. Corrections update both producer and consumer when a shared contract changes.

## Files to Create/Modify

| File | Action | Purpose |
| --- | --- | --- |
| `docs-site/**` | Verify/Modify only as defects require | Close requirement-backed QA defects |
| `docs/docs-site-minimal-pro-refresh-design.md` | Modify | Record QA matrix/screenshots references |

## Tuning Parameters

No deviations from plan locks without documented rationale.

## Testing Strategy

- [ ] Complete the entire manual matrix.
- [ ] Rerun typecheck/build and affected interaction checks after every correction set.
- [ ] Confirm generated SEO/RSS/sitemap output and no-JS pages.

## Gate Compliance

- **Types/Interfaces**: Any correction updates all affected consumers in the same task.
- **Existing Tests**: Full regression scope is the purpose of this task.
- **New Tests**: Defect regression checks are added and passing when practical.
- **Imports/Exports**: Clean build and runtime smoke reject unresolved wiring.

## Milestone Contribution

Provides comprehensive evidence that polish did not regress the docs-site.

## Out of Scope

Changing IA, docs prose broadly, or relaxing a failed requirement.
