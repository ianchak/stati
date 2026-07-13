# TASK_016: Clean Build Artifact Hygiene

## Metadata

| Field | Value |
| --- | --- |
| **Milestone** | M4: Verification and Handoff |
| **Priority** | High |
| **Complexity** | S (≤2h) |
| **Dependencies** | TASK_015 |
| **Plan Reference** | §4 Phase 4 step 17; §12 |
| **Skip Test-First** | false |

## Description

Produce and inspect a clean docs-site build so stale hashed assets cannot mask bundle or CSS results. Resolve only docs-site build/hygiene defects exposed by the completed work.

## Acceptance Criteria

- [ ] Run `npm run clean && npm run typecheck && npm run build:local` in `docs-site/`.
- [ ] `dist/_assets` contains only current referenced outputs with no duplicate stale home/docs hashes.
- [ ] Every emitted asset referenced by built HTML exists; no deleted font, particle, token, or chunk is referenced.
- [ ] Final compressed CSS and route bundle sizes are captured for TASK_018.
- [ ] Generated `dist/`/cache artifacts are not accidentally committed unless already tracked by repository policy.

## Technical Approach

Use package scripts rather than ad hoc deletion. Inspect emitted HTML against asset inventory and fix source/config references in this task if clean output reveals a defect.

### Integration Wiring

The build pipeline consumes all completed source/template/config work; emitted HTML and `dist/_assets` provide the integration boundary.

## Files to Create/Modify

| File | Action | Purpose |
| --- | --- | --- |
| `docs-site/` source/config files | Modify only if needed | Resolve clean-build references |
| `docs-site/dist/`, `.stati/` | Regenerate, normally untracked | Verify hygiene |

## Tuning Parameters

None.

## Testing Strategy

- [ ] Clean, typecheck, build, and verify asset-reference integrity.
- [ ] Load home and representative docs page with no console/network 404.

## Gate Compliance

- **Types/Interfaces**: No planned API change.
- **Existing Tests**: Executes all available docs-site quality gates.
- **New Tests**: Asset-integrity checks finish in this task.
- **Imports/Exports**: Clean build proves all references resolve.

## Milestone Contribution

Establishes trustworthy final artifacts for QA and measurement.

## Out of Scope

Committing generated output or changing core build-engine behavior.
