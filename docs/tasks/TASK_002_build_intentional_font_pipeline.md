# TASK_002: Build Intentional Font Pipeline

## Metadata

| Field | Value |
| --- | --- |
| **Milestone** | M1: Foundation and Design System |
| **Priority** | High |
| **Complexity** | M (2-4h) |
| **Dependencies** | TASK_001 |
| **Plan Reference** | §3.4; §3.5.3; §4 Phase 1 step 2 |
| **Skip Test-First** | false |

## Description

Replace the inconsistent Inter declaration and asset with a licensed, subsetted IBM Plex Sans variable font while retaining Fira Code for code. Align preload, CSS declarations, Tailwind stacks, and fallback metrics as one gate-safe vertical slice.

## Acceptance Criteria

- [ ] Add an official-release Latin-subset IBM Plex Sans variable WOFF2 and its SIL Open Font License.
- [ ] Define IBM Plex Sans and metric-adjusted fallback faces with `font-display: swap`; retain Fira Code and its fallback.
- [ ] Update Tailwind sans/mono stacks and `layout.eta` preload to exactly match shipped assets.
- [ ] Remove Inter only after slow-font visual and CLS checks show visible text immediately and no regression; do not ship both sans fonts.
- [ ] Font transfer stays within the existing budget and both light/dark themes render the intended families.

## Technical Approach

Source the font from the official IBM Plex release, subset only required Latin glyphs, and document provenance. Update the asset, preload, `@font-face`, and token consumers together so no intermediate state references a missing font.

### Integration Wiring

| Wiring Step | File to Modify | What to Add | Why |
| --- | --- | --- | --- |
| Register assets | `src/styles.css` | IBM Plex faces and fallback metrics | Browser font resolution |
| Register stacks | `tailwind.config.js` | Sans/mono family order | Tailwind consumers |
| Activate preload | `site/layout.eta` | IBM Plex preload | Critical-path delivery |

The browser loads the font through the layout preload; body, prose, and controls consume it via Tailwind/CSS.

## Files to Create/Modify

| File | Action | Purpose |
| --- | --- | --- |
| `docs-site/public/fonts/ibm-plex-sans-var.woff2` | Create | Interface/prose font |
| `docs-site/public/fonts/OFL-IBM-Plex.txt` | Create | Preserve license |
| `docs-site/public/fonts/inter.woff2` | Delete | Prevent duplicate sans transfer |
| `docs-site/src/styles.css` | Modify | Font faces and fallback metrics |
| `docs-site/tailwind.config.js` | Modify | Canonical font stacks |
| `docs-site/site/layout.eta` | Modify | Correct preload |

## Tuning Parameters

Fallback metric overrides are derived from measured font metrics, not aesthetic guesses.

## Testing Strategy

- [ ] Run `npm run typecheck` and `npm run build:local`.
- [ ] Inspect built preload URLs and Network font requests.
- [ ] Throttle fonts and verify immediate text plus CLS < 0.05.

## Gate Compliance

- **Types/Interfaces**: None introduced.
- **Existing Tests**: Template and CSS consumers are updated atomically with asset replacement.
- **New Tests**: Build and browser checks complete within this task.
- **Imports/Exports**: No dangling asset URL remains.

## Milestone Contribution

Establishes intentional, stable typography before layout polish.

## Out of Scope

New runtime font loaders, third-party font CDNs, or typography redesign beyond the plan scale.
