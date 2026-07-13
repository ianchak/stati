# TASK_005: Build Source/Output Hero

## Metadata

| Field | Value |
| --- | --- |
| **Milestone** | M2: Composed Editorial Experience |
| **Priority** | High |
| **Complexity** | L (4-8h) |
| **Dependencies** | TASK_004 |
| **Plan Reference** | §3.5.1-3.5.2; §4 Phase 2 step 6 |
| **Skip Test-First** | false |

## Description

Replace the maximalist homepage hero with the plan's server-rendered 7/5 source/output composition: exact copy, real Stati configuration and output, stable viewport fit, and one cobalt build edge.

## Acceptance Criteria

- [ ] Use headline `TypeScript in. Static HTML out.`, the exact 13-word subtext, and `Get started` / `Read the architecture` actions.
- [ ] Render semantic real config plus matching route/output content; no fake window chrome, decorative SVG, gradient H1, blur orb, or particle container.
- [ ] Fit header, hero, both CTAs, and code surface in the initial desktop viewport; headline is at most two lines and actions do not wrap.
- [ ] Collapse to one column below 768px with no overflow at 360px and reserved dimensions that prevent CLS.

## Technical Approach

Use the existing Eta partial and semantic `pre`/`code`/list markup. Consume the completed design tokens and add only component CSS needed for the offset composition and 2px build edge.

### Integration Wiring

`site/home.eta` already renders `hero.eta`; preserve that registration. Content comes from `site/index.md`, and styles are registered in `src/styles.css`.

## Files to Create/Modify

| File | Action | Purpose |
| --- | --- | --- |
| `docs-site/site/_home/hero.eta` | Modify | Source/output hero |
| `docs-site/site/index.md` | Modify | Exact copy and real artifact data |
| `docs-site/src/styles.css` | Modify | Stable responsive composition |

## Tuning Parameters

Use plan §3.5.2 clamps, maximum 6rem desktop top padding, 7/5 grid, and 2px edge.

## Testing Strategy

- [ ] Build/typecheck and render with JS disabled.
- [ ] Check 360/768/1280/1920 and both themes.
- [ ] Confirm semantic content and links remain usable.

## Gate Compliance

- **Types/Interfaces**: No client API.
- **Existing Tests**: Existing hero call site and frontmatter contract are updated together.
- **New Tests**: Build and viewport checks pass with this task alone.
- **Imports/Exports**: No new module dependency.

## Milestone Contribution

Creates the primary Compiled Editorial signature.

## Out of Scope

Removing the tsParticles packages/code (TASK_011) or redesigning later homepage sections.
