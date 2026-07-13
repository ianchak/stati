# TASK_007: Build Proof Desk and Command Close

## Metadata

| Field | Value |
| --- | --- |
| **Milestone** | M2: Composed Editorial Experience |
| **Priority** | High |
| **Complexity** | L (4-8h) |
| **Dependencies** | TASK_006 |
| **Plan Reference** | §3.5.1 items 4-5; §3.5.8; §4 Phase 2 step 8 |
| **Skip Test-First** | false |

## Description

Refactor the five existing demonstrations into a 3/9 proof desk and simplify quick start into a sparse command close using real output and one consistent action vocabulary.

## Acceptance Criteria

- [ ] Keep all five real demonstrations in a vertical desktop rail and changing proof surface; mobile uses a horizontal scroll-snap control.
- [ ] Tab semantics, keyboard navigation, active/inactive states, and destination-specific proof links remain accessible.
- [ ] Replace fake terminal chrome/blinking cursor with `npx create-stati`, heading `One command. A real project.`, and consistent `Get started` intent.
- [ ] Remove generic headings, repeated `Learn more`, em/separator dashes, fake metrics, and unsupported claims from touched homepage copy.

## Technical Approach

Retain existing tab behavior and partial boundaries while changing layout and content density. Use shared button/link/icon components, semantic tab roles, and real config/output examples.

### Integration Wiring

`home.eta` continues to include highlights and quick start. `highlights.eta` invokes all tab partials; `index.md` supplies command/copy. Existing homepage client initialization remains the consumer for interactive proof state.

## Files to Create/Modify

| File | Action | Purpose |
| --- | --- | --- |
| `docs-site/site/_home/highlights.eta` | Modify | Proof-desk shell |
| `docs-site/site/_home/highlightTab.eta` | Modify | Accessible rail control |
| `docs-site/site/_home/highlightItem.eta` | Modify | Proof surface |
| `docs-site/site/_home/tab*.eta` | Modify | Normalized real artifacts |
| `docs-site/site/_home/quickStart.eta` | Modify | Command close |
| `docs-site/site/index.md` | Modify | Exact visible copy |

## Tuning Parameters

3/9 desktop columns and 180-220ms state feedback; motion gating is finalized in TASK_009.

## Testing Strategy

- [ ] Build/typecheck and exercise every tab by keyboard and pointer.
- [ ] Verify mobile scroll-snap and desktop 3/9 layout.
- [ ] Audit touched copy against §3.5.8.

## Gate Compliance

- **Types/Interfaces**: Existing tab contracts are preserved or updated with all consumers.
- **Existing Tests**: All five proof partials remain reachable.
- **New Tests**: Interaction and build checks pass in this slice.
- **Imports/Exports**: No partial reference is left unresolved.

## Milestone Contribution

Completes the final two homepage layout families.

## Out of Scope

New claims, content IA changes, or replacing the existing interaction framework.
