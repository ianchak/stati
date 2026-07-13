# TASK_003: Establish Tokens, Type, and Syntax System

## Metadata

| Field | Value |
| --- | --- |
| **Milestone** | M1: Foundation and Design System |
| **Priority** | High |
| **Complexity** | L (4-8h) |
| **Dependencies** | TASK_002 |
| **Plan Reference** | §3.5.3-3.5.5; §4 Phase 1 steps 3-4; Phase 2 step 10 |
| **Skip Test-First** | false |

## Description

Create the canonical cold-paper/cobalt design system and technical-reading type scale, then apply it to prose and Prism code surfaces. Centralize theme values so templates do not accumulate one-off colors, radii, or shadows.

## Acceptance Criteria

- [ ] Implement the specified light/dark canvas, surface, text, muted, border, focus, and cobalt semantic tokens with verified AA contrast.
- [ ] Remove glow shadows and unrelated decorative color emphasis; retain only `soft` and `soft-lg` elevation.
- [ ] Apply the documented 8/12/16px radius tiers and canonical docs heading/body/code scale, including 17px/2rem/74ch prose.
- [ ] Refine links, inline code, blocks, tables, and blockquotes for long-form legibility and copy-friendly code.
- [ ] Align `prism-stati.css` with the refreshed surfaces while retaining semantic syntax colors.

## Technical Approach

Define shared CSS variables in both themes and map Tailwind extensions/component classes to them. Keep syntax token colors semantically distinct but use the same background, border, typography, and focus rules as other code surfaces.

### Integration Wiring

Tokens are registered in `tailwind.config.js` and `styles.css`; all Eta templates consume generated utility classes or component classes. Prism is loaded by the existing layout and needs no new runtime registration.

## Files to Create/Modify

| File | Action | Purpose |
| --- | --- | --- |
| `docs-site/tailwind.config.js` | Modify | Build-time semantic tokens |
| `docs-site/src/styles.css` | Modify | Theme variables, type scale, prose components |
| `docs-site/public/prism-stati.css` | Modify | Syntax surface alignment |

## Tuning Parameters

Use the exact color anchors, type clamps, 74ch measure, and radius tiers in plan §3.5.

## Testing Strategy

- [ ] Run `npm run typecheck` and `npm run build:local`.
- [ ] Spot-check contrast in both themes and inspect representative prose/code/table pages.
- [ ] Confirm Tailwind output includes every changed component class.

## Gate Compliance

- **Types/Interfaces**: No TypeScript types introduced.
- **Existing Tests**: Existing class consumers remain valid; removed tokens are replaced in every current consumer in this task.
- **New Tests**: Build and visual checks are self-contained.
- **Imports/Exports**: No CSS reference points to a removed token.

## Milestone Contribution

Provides the shared visual substrate for homepage and docs chrome work.

## Out of Scope

Homepage composition, navigation restructuring, or adding a CSS/runtime dependency.
