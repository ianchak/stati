# TASK_008: Polish Documentation Chrome

## Metadata

| Field | Value |
| --- | --- |
| **Milestone** | M2: Composed Editorial Experience |
| **Priority** | High |
| **Complexity** | L (4-8h) |
| **Dependencies** | TASK_004 |
| **Plan Reference** | §3.5.7; §4 Phase 2 step 9 |
| **Skip Test-First** | false |

## Description

Evolve the existing three-column docs shell without changing routes, labels, search behavior, or information architecture. Reduce decorative noise and normalize controls around shared tokens and icons.

## Acceptance Criteria

- [ ] Keep the 72px header and one-line desktop navigation at 1024px; retain theme, GitHub, mobile menu, search `/`, sidebar, TOC, progress, and scroll-to-top behavior.
- [ ] Consolidate sidebar active variants into `.sidebar-link.active`; remove decorative dots and multicolor section accents.
- [ ] Replace raw sidebar-toggle and scroll-to-top SVGs with the shared icon partial at stroke width 1.5.
- [ ] Apply explicit transitions, 40px minimum docs hit targets, solid brand text, and coherent search loading/empty/error/populated states.
- [ ] Preserve skip link, focus-visible, heading anchors, routes, labels, and three-column responsive behavior.

## Technical Approach

Modify existing Eta partials and shared button/link/icon/section-header components. Prefer shared component options over copied markup and use `stati.propValue()` for conditional attributes.

### Integration Wiring

All partials remain registered through `layout.eta`; shared components are invoked directly from section templates. Existing core/docs bundles continue to own interactions.

## Files to Create/Modify

| File | Action | Purpose |
| --- | --- | --- |
| `docs-site/site/layout.eta` | Modify | Shell/control integration |
| `docs-site/site/_sections/{header,sidebar,toc,footer,footerBrand,footerSection}.eta` | Modify | Chrome polish |
| `docs-site/site/_components/{button,link,icon,sectionHeader,searchTemplates}.eta` | Modify | Shared controls/states |
| `docs-site/src/styles.css` | Modify | Active state and chrome styles |

## Tuning Parameters

72px header, 40px targets, stroke width 1.5, and documented radius/transition values.

## Testing Strategy

- [ ] Build/typecheck and exercise all preserved features on home/docs/mobile.
- [ ] Verify keyboard focus, skip link, every search state, and 1024px nav fit.
- [ ] Check light/dark and target viewport matrix.

## Gate Compliance

- **Types/Interfaces**: Shared partial inputs and every caller are updated together.
- **Existing Tests**: Existing functionality is explicitly regression-tested.
- **New Tests**: All checks target behavior implemented in this task.
- **Imports/Exports**: Every shared icon name exists before use.

## Milestone Contribution

Extends the design system to the stable documentation reading experience.

## Out of Scope

Route/content restructuring or search engine/load-strategy replacement.
