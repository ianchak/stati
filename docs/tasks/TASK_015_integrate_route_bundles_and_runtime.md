# TASK_015: Integrate Route Bundles and Runtime

## Metadata

| Field | Value |
| --- | --- |
| **Milestone** | M3: Runtime Performance and Motion |
| **Priority** | High |
| **Complexity** | M (2-4h) |
| **Dependencies** | TASK_011, TASK_012, TASK_013, TASK_014 |
| **Plan Reference** | §2.4; §3.2-3.4; §4 Phase 3 step 16 |
| **Skip Test-First** | true |

## Description

Validate end-to-end registration and delivery of the lean core/home/docs runtime after dependency removal and helper wiring. Confirm actual built pages receive only their configured route bundles and no stale chunks or async-splitting assumptions remain.

## Acceptance Criteria

- [ ] Clean output contains `core` + `home` modulepreloads on `/` and `core` + `docs` on non-home docs pages.
- [ ] No stale hashed chunks, tsParticles identifiers, missing import, async local chunk expectation, or browser console error remains.
- [ ] Core still initializes theme, menu, and search immediately; docs initializes sidebar/TOC immediately and only the approved features at idle.
- [ ] Search works from desktop, header/mobile buttons, `/`, and Cmd/Ctrl+K on home and docs routes.
- [ ] Live reduced motion and idle fallback work through normal entry points; typecheck/build/tests pass.

## Technical Approach

Clean-build, inspect `dist/_assets` and emitted HTML, then exercise normal route entry points. Edit `stati.config.ts` only if current include/exclude delivery is wrong; do not add unsupported splitting.

### Integration Wiring

| Component | Registration | Consumer |
| --- | --- | --- |
| Core helpers | `src/core/index.ts`, `src/core.ts` | Docs runtime |
| Home entry | `stati.config.ts` include `/` | Homepage |
| Docs entry | `stati.config.ts` exclude `/` | Docs routes |
| Bundle paths | `layout.eta` | Emitted modulepreloads |

## Files to Create/Modify

| File | Action | Purpose |
| --- | --- | --- |
| `docs-site/stati.config.ts` | Verify/Modify if necessary | Route bundle registration |
| `docs-site/site/layout.eta` | Verify/Modify | Emitted bundle consumption |
| `docs-site/src/{core,home,docs}.ts` | Verify/Modify | Initialization wiring |
| `docs-site/src/{core,docs}/index.ts` | Verify/Modify | Valid exports |

## Tuning Parameters

No new values; preserve current route globs.

## Testing Strategy

- [ ] Run clean, typecheck, applicable tests, and build.
- [ ] Inspect emitted assets/modulepreloads and grep particle identifiers.
- [ ] Execute route, search, idle fallback, and live-motion end-to-end smoke.

## Gate Compliance

- **Types/Interfaces**: Integrates only completed contracts.
- **Existing Tests**: Full runtime regression smoke is required.
- **New Tests**: End-to-end checks require no future task.
- **Imports/Exports**: Every entry/barrel symbol and emitted asset resolves.

## Milestone Contribution

Provides dedicated wiring for all interacting runtime components.

## Out of Scope

Engine changes, true client splitting, or search replacement.
