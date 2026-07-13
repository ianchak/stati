# TASK_019: Document Design and Performance Decisions

## Metadata

| Field | Value |
| --- | --- |
| **Milestone** | M4: Verification and Handoff |
| **Priority** | Medium |
| **Complexity** | M (2-4h) |
| **Dependencies** | TASK_017, TASK_018 |
| **Plan Reference** | §1.1 FR-4; §4 Phase 4 step 20 |
| **Skip Test-First** | false |

## Description

Complete the maintainer-facing record of the redesign using actual implemented decisions and measured evidence. Explain what was preserved, retired, and why, so future changes do not accidentally restore expensive or generic patterns.

## Acceptance Criteria

- [ ] Document the Compiled Editorial design read, 8/5/6 dials, target-group rationale, and five layout families.
- [ ] Record preserved/retired patterns, exact token/type/radius/motion/copy/asset rules, font provenance/license, and why tsParticles was removed.
- [ ] Include reproducible before/after performance tables and representative light/dark, desktop/mobile screenshot references from completed QA.
- [ ] Explain per-route bundle reality and explicitly reject unsupported local dynamic-import splitting.
- [ ] Every claim matches final output; routes, IA, and product documentation prose are not rewritten.

## Technical Approach

Extend the existing design document rather than create competing guidance. Link decisions to plan sections and actual evidence, keeping implementation details useful to maintainers.

### Integration Wiring

The document consumes final QA and measurement artifacts from TASK_017-018 and becomes the canonical maintainer record referenced by future docs-site changes.

## Files to Create/Modify

| File | Action | Purpose |
| --- | --- | --- |
| `docs/docs-site-minimal-pro-refresh-design.md` | Modify | Final decision and evidence record |
| Approved screenshot location, if repository policy permits | Create | Before/after evidence |

## Tuning Parameters

Document final values; do not introduce new ones.

## Testing Strategy

- [ ] Validate links, file paths, figures, and metric arithmetic.
- [ ] Run Markdown formatting/linting if configured.
- [ ] Cross-check every final claim against built output.

## Gate Compliance

- **Types/Interfaces**: Documentation only.
- **Existing Tests**: No runtime changes; repository docs gates remain green.
- **New Tests**: Link/evidence checks complete here.
- **Imports/Exports**: No module changes.

## Milestone Contribution

Makes conscious design and performance decisions maintainable.

## Out of Scope

Broad content rewrite, marketing claims, or undocumented design deviations.
