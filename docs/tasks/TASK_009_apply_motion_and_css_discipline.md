# TASK_009: Apply Motion and CSS Discipline

## Metadata

| Field | Value |
| --- | --- |
| **Milestone** | M2: Composed Editorial Experience |
| **Priority** | High |
| **Complexity** | M (2-4h) |
| **Dependencies** | TASK_005, TASK_006, TASK_007, TASK_008 |
| **Plan Reference** | §3.5.6; §4 Phase 2 steps 11-11b |
| **Skip Test-First** | false |

## Description

Apply one coherent CSS motion policy and remove obsolete generated CSS after the redesigned surfaces exist. Motion must communicate compile order or state, remain bounded, and disappear under reduced motion.

## Acceptance Criteria

- [ ] Hero copy/source/output/build edge sequence completes within 520ms and runs only under `no-preference`.
- [ ] Proof feedback is 180-220ms, controls 120-160ms, and view transitions 200ms; only opacity/transform animate.
- [ ] Remove active infinite/pulse/float utilities and replace every touched `transition-all` with explicit properties.
- [ ] Reduced mode disables entrances/transitions and uses `scroll-behavior: auto`.
- [ ] Collapse stale sidebar variants and remove unused glow, homepage color, animation, and safelist entries; final compressed CSS shrinks without purging live classes.

## Technical Approach

Implement the compile-order cascade in CSS, extend the existing reduced-motion block, then audit built class usage and `.stati/tailwind-classes.html`. Measure gzip/Brotli on final `dist/styles.css`.

### Integration Wiring

Motion classes are consumed by TASK_005-008 templates and registered in `styles.css`/Tailwind config. Production build/purge is the activation point.

## Files to Create/Modify

| File | Action | Purpose |
| --- | --- | --- |
| `docs-site/src/styles.css` | Modify | Motion gates and CSS cleanup |
| `docs-site/tailwind.config.js` | Modify | Remove obsolete utilities/keyframes |
| `docs-site/.stati/tailwind-classes.html` | Verify/Modify | Purge safety |
| `docs-site/site/**/*.eta` | Modify touched files only | Explicit transitions/motion hooks |

## Tuning Parameters

Use only timing and easing constraints in §3.5.6.

## Testing Strategy

- [ ] Build/typecheck; compare final CSS compressed size.
- [ ] Verify normal and reduced motion visually.
- [ ] Grep touched sources for forbidden active utilities and `transition-all`.

## Gate Compliance

- **Types/Interfaces**: No new runtime type.
- **Existing Tests**: Remove a class only after all consumers are migrated.
- **New Tests**: Build/purge and motion checks complete here.
- **Imports/Exports**: No module changes.

## Milestone Contribution

Makes the redesigned experience restrained, responsive, and purge-safe.

## Out of Scope

Live JS preference changes, handled by TASK_014.
