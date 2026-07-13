# TASK_011: Remove tsParticles

## Metadata

| Field | Value |
| --- | --- |
| **Milestone** | M3: Runtime Performance and Motion |
| **Priority** | High |
| **Complexity** | M (2-4h) |
| **Dependencies** | TASK_010 |
| **Plan Reference** | §1.5; §4 Phase 3 step 12; §7 |
| **Skip Test-First** | false |

## Description

Remove the decorative tsParticles implementation and dependencies completely. The completed server-rendered hero is the replacement, so this vertical slice deletes runtime code, imports, package entries, and stale markup references together.

## Acceptance Criteria

- [ ] Delete `src/home/particles.ts`, all `initParticles` imports/calls, and any remaining `#particles-js` markup/style reference.
- [ ] Remove both `@tsparticles/engine` and `@tsparticles/slim` from `docs-site/package.json` and lockfile.
- [ ] Clean build `/` without runtime errors; built home assets contain no tsParticles identifiers.
- [ ] Homepage route JS collapses from the baseline toward the low tens of KB without introducing another runtime dependency.
- [ ] Search and all non-particle homepage behavior remain unchanged.

## Technical Approach

Remove the dependency graph from leaf markup through entry point and package metadata. Do not attempt dynamic import because Stati's current per-bundle esbuild calls do not emit async chunks.

### Integration Wiring

`home.ts` remains the homepage entry registered by `stati.config.ts`; its barrel exports only existing modules after particle deletion. The CSS hero from TASK_005 is the active replacement.

## Files to Create/Modify

| File | Action | Purpose |
| --- | --- | --- |
| `docs-site/src/home/particles.ts` | Delete | Remove particle runtime |
| `docs-site/src/home/index.ts` | Modify | Remove export/init |
| `docs-site/src/home.ts` | Modify | Remove call |
| `docs-site/package.json` | Modify | Remove dependencies |
| `package-lock.json` | Modify | Synchronize dependency graph |
| `docs-site/site/_home/hero.eta`, `src/styles.css` | Verify/Modify | Remove stale hooks |

## Tuning Parameters

None.

## Testing Strategy

- [ ] Run install/lockfile consistency, typecheck, and clean build.
- [ ] Grep source and built output for tsparticles/particle hooks.
- [ ] Compare route gzip bytes to TASK_001.

## Gate Compliance

- **Types/Interfaces**: All particle types and consumers are removed atomically.
- **Existing Tests**: Homepage smoke covers replacement hero.
- **New Tests**: Build/output checks pass now, not in a later task.
- **Imports/Exports**: No dangling `initParticles` export/import.

## Milestone Contribution

Delivers the primary JS performance win.

## Out of Scope

Engine-level code splitting or search replacement.
