# Contributing to Stati

Thanks for your interest in contributing to **Stati** — a lightweight, TypeScript-first static site generator.

---

## Requirements

- **Node.js** 22+ (see `engines` in package.json)
- **npm** 11.5.1+ with workspace support (required for OIDC publishing)
- Familiarity with TypeScript and monorepo layouts is helpful

---

## Project Structure

```
packages/
├─ @stati/core         → Core SSG engine (build, dev server, content processing)
├─ @stati/cli          → Command-line interface (stati build, dev, invalidate)
├─ create-stati        → NPX scaffolder (templates, Tailwind opt-in) - in development
examples/
├─ blog                → Complete blog example with navigation and content
├─ docs                → Documentation site template
├─ news                → News/article site template
```

---

## Setup

```bash
# Install dependencies
npm install

# Build all packages
npm run build --workspaces

# Run tests to verify setup
npm run test

# Optional: Run full CI pipeline
npm run test:ci
```

---

## Available Scripts

```bash
# Code quality and validation
npm run lint           # ESLint across packages
npm run typecheck      # TypeScript compilation check

# Testing
npm run test           # Run all tests across packages

# Building
npm run build          # Build core, cli, and create-stati packages

# Full pipeline
npm run test:ci        # Lint + typecheck + test + build (CI workflow)
```

**Testing the Development Server:**

```bash
# Build the packages first
npm run build --workspaces

# Test the dev server with the blog example
cd examples/blog
npx stati dev --port 3000

# Or test with custom options
npx stati dev --port 8080 --open --host 0.0.0.0

# Test building
npx stati build --force --clean

# Warm cache and test invalidation
npx stati build
npx stati invalidate "tag:news"
```

**CLI Commands Available:**

- `stati build [--force] [--clean] [--include-drafts] [--config path]`
- `stati dev [--port 3000] [--host localhost] [--open] [--config path]`
- `stati invalidate [tag:foo|path:/x|age:3months]` — cache invalidation

---

## Making Changes

### 1. Fork + Clone the Repo

Use your GitHub fork and create a new branch for your change.

### 2. Commit Style

We use **Changesets** for versioning. When your change affects public packages, run:

```bash
npx changeset
```

This creates a `.md` file in `.changeset/` describing the change and its bump type (patch/minor/major).

### 3. Run Tests & CI

Make sure everything passes:

```bash
npm run test:ci
```

### 4. Open a PR

PRs should be:

- Atomic and focused
- Documented if relevant (README, templates, CLI help)
- Reviewed before merging

---

## Coding Style

- TypeScript strict mode
- Small, composable functions
- Minimal external dependencies
- Prefer clarity over cleverness

---

## Tests

- **Framework:** Vitest with comprehensive test coverage
- **Coverage:** Unit tests for all core functionality including:
  - Configuration loading and validation
  - Content processing and markdown rendering
  - Template engine and layout system
  - Navigation building and routing
  - Build pipeline and asset copying
  - Development server functionality
  - Error handling and edge cases
- **Test Types:** Unit tests, integration tests, and snapshot testing for HTML output
- **CI Integration:** Tests run automatically on all commits and PRs

**Running Tests:**

```bash
npm run test           # Run all tests (excludes perf tests)
npm run test:ci        # Full CI pipeline including tests
```

---

## CI Pipeline

Every push and pull request triggers the CI workflow (`.github/workflows/ci.yml`):

1. **Dependency Install** — `npm ci` with npm 11.5.1+
2. **Build Packages** — `npm run build` (core → cli → create-stati)
3. **Run Tests** — Vitest with coverage (perf tests excluded from CI)
4. **Upload Coverage** — Reports sent to Codecov

The pipeline runs on Ubuntu with Node.js 22. Version commits from the publish workflow are automatically skipped to prevent infinite loops.

---

## Performance Benchmarks

Performance tests live in `packages/core/test/perf/` and measure build speed across scenarios:

| Scenario | Description | Baseline |
| -------- | ----------- | -------- |
| Cold Build | Clean slate, no cache | ~300ms median |
| Warm Build | No changes, high cache hit | ~80ms median |
| Incremental | Single file change | ~90ms median |
| Complex | Nested components, 100 pages | ~400ms median |

**Running Benchmarks:**

```bash
# Run perf tests (excluded from regular test runs)
npx vitest run packages/core/test/perf

# Benchmarks use 100 generated pages with warmup runs
```

Baselines are defined in `perf/baselines/benchmark.json` with a 30% tolerance. Tests validate median duration and cache hit rates.

---

## Build Metrics System

Stati includes a metrics system for debugging performance issues. Enable it via CLI:

```bash
stati build --metrics                    # Write JSON to .stati/metrics/
stati build --metrics --metrics-html     # Also generate HTML report
stati build --metrics --metrics-detailed # Include per-page timings
```

**Metrics include:**

- **Totals:** Duration, peak RSS, heap usage
- **Phases:** Config load, content discovery, rendering, asset copy, etc.
- **Counts:** Pages rendered, cache hits/misses, assets copied
- **ISG:** Cache hit rate, skipped pages, rebuild reasons
- **Per-page timing** (when `--metrics-detailed` is used)

**Programmatic access:**

```typescript
import { build } from '@stati/core';

const result = await build({
  metrics: { enabled: true, detailed: true }
});

if (result.buildMetrics) {
  console.log(`Duration: ${result.buildMetrics.totals.durationMs}ms`);
  console.log(`Cache hit rate: ${result.buildMetrics.isg.cacheHitRate}`);
}
```

Metrics are written to `.stati/metrics/` as JSON files with timestamps. Use these to diagnose slow builds or cache inefficiencies.

---

## Contributor Roles

- `type:bug`, `type:feat`, `type:chore`, `area:isg`, `area:scaffolder`, etc.
- GitHub templates + labels help guide issues & PRs

---

## Release Flow

**Releases are fully automated!** When you merge a PR with a changeset to `main`, GitHub Actions automatically:

1. Versions packages based on changesets
2. Publishes to npm using OIDC authentication
3. Pushes version commits and tags

**You don't need to do anything manually.**

### Changeset Commands (for development)

```bash
# Create a changeset manually
npm run changeset

# Check pending changes
npm run changeset:status

# Auto-generate changesets from commits (used by CI)
npm run changeset:generate

# Preview version changes
npm run changeset:dry-run
```

---

## Thank You

Your contributions make this project better. Whether you're fixing bugs, suggesting features, writing docs, or improving templates — you’re helping developers build faster, simpler static sites.
