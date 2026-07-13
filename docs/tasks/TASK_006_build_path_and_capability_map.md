# TASK_006: Build Path and Capability Map

## Metadata

| Field | Value |
| --- | --- |
| **Milestone** | M2: Composed Editorial Experience |
| **Priority** | High |
| **Complexity** | L (4-8h) |
| **Dependencies** | TASK_005 |
| **Plan Reference** | §3.5.1 items 2-3; §4 Phase 2 step 7 |
| **Skip Test-First** | false |

## Description

Add the real content-to-cache build band and replace equal feature cards with exactly six asymmetric capability modules that foreground TypeScript and ISG.

## Acceptance Criteria

- [ ] Create the non-looping build sequence using the exact plan vocabulary from `site/*.md` through `.stati/cache`.
- [ ] Render exactly six capabilities in a 12-column map; TypeScript and ISG are larger, and at least three modules contain a real code/path/cache/command artifact.
- [ ] Preserve existing frontmatter keys and add only artifact fields needed by templates.
- [ ] Both layouts become strict single columns below 768px, with no marquee, gradients, equal-card grid, or invented claims.

## Technical Approach

Create `buildPath.eta`, register it between hero and capabilities, and refactor `features.eta` to use explicit spans and semantic artifact markup. Keep all visible claims grounded in current Stati behavior.

### Integration Wiring

| Wiring Step | File to Modify | What to Add | Why |
| --- | --- | --- | --- |
| Register build band | `site/home.eta` | Include `buildPath.eta` after hero | Reachable homepage section |
| Supply artifacts | `site/index.md` | Minimal structured values | Template input |
| Preserve CSS | `src/styles.css` / Tailwind sources | Responsive module classes | Production purge safety |

## Files to Create/Modify

| File | Action | Purpose |
| --- | --- | --- |
| `docs-site/site/_home/buildPath.eta` | Create | Build-path band |
| `docs-site/site/home.eta` | Modify | Register section |
| `docs-site/site/_home/features.eta` | Modify | Capability map |
| `docs-site/site/index.md` | Modify | Real artifact data |
| `docs-site/src/styles.css` | Modify | Layout styling |

## Tuning Parameters

Use 12 columns on desktop, section spacing from §3.5.5, and no extra accent hue.

## Testing Strategy

- [ ] Run typecheck/build and inspect built homepage.
- [ ] Verify count, order, vocabulary, and artifacts against the plan.
- [ ] Check 360/768/1280/1920 in both themes.

## Gate Compliance

- **Types/Interfaces**: Eta data additions are consumed in the same task.
- **Existing Tests**: Existing feature data keys remain available.
- **New Tests**: Build and rendered-output checks are self-contained.
- **Imports/Exports**: New partial is created before being included.

## Milestone Contribution

Adds two distinct homepage layout families and implementation truth.

## Out of Scope

Proof tabs, docs chrome, or runtime bundle changes.
