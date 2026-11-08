---
title: 'Contributing'
description: 'Set up the Stati monorepo, run its tests and benchmarks, and follow its commit and release conventions.'
order: 3
seo:
  title: 'Contributing to Stati'
---

# Contributing

## Development setup

### Prerequisites

- **Node.js** 22.20.0 or higher on the 22.x line, or 24 and later
- **npm** 11.5.1 or higher
- **Git** for version control

### Local development

```bash
# Clone the repository
git clone https://github.com/your-username/stati.git
cd stati

# Install dependencies
npm install

# Build all packages (core → images → cli → create-stati)
npm run build

# Run the test suite
npm test

# Lint and type-check
npm run lint
npm run typecheck

```

### Project structure

```text
stati/
├── packages/
│   ├── core/              # Core Stati engine
│   │   ├── src/
│   │   ├── test/
│   │   └── package.json
│   ├── cli/               # Command-line interface
│   │   ├── src/
│   │   ├── test/
│   │   └── package.json
│   ├── create-stati/      # Project scaffolder
│   │   ├── src/
│   │   ├── test/
│   │   └── package.json
│   └── images/            # Image processing (@stati/images)
│       ├── src/
│       ├── test/
│       └── package.json
├── examples/              # Example projects (bundled with the scaffolder)
│   ├── blog/
│   ├── docs/
│   ├── blank/
│   └── news/
├── docs-site/             # Project documentation site
├── scripts/               # Build and development scripts
└── package.json           # Root package.json
```

### Monorepo workflow

```bash
# Test one package
npm run test --workspace=@stati/core

# Run an example with the local packages
cd examples/blog
npm run dev
```

## Making changes

### Code style

Stati uses strict TypeScript and follows these conventions:

- **ESLint** for code linting
- **Prettier** for code formatting
- **TypeScript** strict mode
- **Conventional Commits** for commit messages

### Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- packages/core/test/core/build.test.ts

# Run tests in watch mode
npx vitest
```

### CI pipeline

Pushes to `main` and every pull request trigger the CI workflow (`.github/workflows/ci.yml`):

1. **Dependency Install** - `npm ci` with npm 11.5.1+
2. **Build Packages** - `npm run build` (core → images → cli → create-stati)
3. **Smoke-test the agent skill** - `node .claude/skills/stati/scripts/smoke-test.mjs`
4. **Run Tests** - Vitest with coverage (perf tests excluded from CI)
5. **Upload Coverage** - Reports sent to Codecov

The test job runs on Ubuntu with Node.js 22; the `@stati/images` tests also run on macOS and Windows. Version commits from the publish workflow are automatically skipped.

### Performance benchmarks

Performance tests live in `packages/core/test/perf/` and measure build speed across scenarios:

| Scenario | Description | Baseline |
| -------- | ----------- | -------- |
| Cold Build | Clean slate, no cache | ~60ms median |
| Warm Build | No changes, high cache hit | ~35ms median |
| Incremental | Single file change | ~40ms median |
| Complex | Nested components, 111 pages | ~60ms median |

Run benchmarks locally:

```bash
# Run only the perf tests (npm test runs them too; CI runs them in the Performance workflow)
npx vitest run packages/core/test/perf packages/images/test/perf

# Benchmarks use 100 generated pages with warmup runs
```

The `linear-time.test.ts` files beside the benchmarks hold the tests that assert a wall-clock limit on scanners fed input that never closes. Put new timing assertions in a `test/perf/` folder, not next to the unit tests, since coverage runs on CI are too slow and noisy for them.

Baselines are defined in `perf/baselines/benchmark.json`, and `scripts/compare-perf.mjs` checks them in the Performance workflow: each benchmark passes if its median over 7 runs stays within 30% of the baseline or 25ms above it, whichever is larger, so fast benchmarks are not failed by CI runner noise. Cache hit rates are validated too. If a benchmark fails, CI reruns the suite once and fails only if the rerun fails as well, so a stalled runner does not fail the check.

To find slow phases, build with `--metrics` (see [Build metrics](/advanced/metrics)).

## Contributing guidelines

### Pull request process

1. **Create an Issue** first for significant changes
2. **Fork and Branch** from `main`
3. **Make Changes** with tests
4. **Update Documentation** if needed
5. **Test Thoroughly** across packages
6. **Submit PR** with clear description

### Commit messages

We use [Conventional Commits](https://www.conventionalcommits.org/), and a `commit-msg` hook rejects anything after the subject line. The type and scope are a convention the hook does not check:

```bash
# Format: <type>(<scope>): <subject>

# Examples:
feat(core): add ISG aging algorithm
fix(cli): resolve build output path issue
docs(docs): update installation instructions
test(core): add markdown processing tests
feat(core)!: rename the isg.ttl option
```

**Rules:**

- One line only: no body, no trailers such as `Co-Authored-By:` or `Signed-off-by:`, and no closing keywords such as `Closes #123`. Put details, issue links and co-author credits in the pull request description. The changeset generator reads every line of a commit as a separate change.
- Imperative mood, subject of 72 characters or less.
- Scope is usually the package (`core`, `images`, `cli`, `create-stati`) or an area such as `isg`, `search` or `docs`.
- Mark breaking changes with `!` after the type. A `BREAKING CHANGE:` footer is rejected.

**Types:**

- `feat` - New features (minor release)
- `fix` - Bug fixes
- `docs` - Documentation changes
- `style` - Formatting changes
- `refactor` - Code refactoring
- `perf` - Performance improvements
- `test` - Test additions/changes
- `build` - Build system and dependencies
- `ci` - CI configuration
- `chore` - Maintenance tasks
- `revert` - Reverting a previous commit

Every type except `feat` produces a patch release, and `!` produces a major release. A commit releases the packages whose files it changes (`examples/` counts as `create-stati`, and a root build file such as `package.json` as every package); a commit that changes none of them, such as a docs-only commit, releases nothing.

## Development guidelines

- Strict TypeScript, ESM with explicit `.js` extensions on local imports, and JSDoc on public APIs.
- Throw domain-specific error classes that carry their context as readonly properties, such as `ISGConfigurationError` (`code`, `field`, `value`) or `TemplateUsageError` (the `suggestions` the dev server's error overlay shows), with messages that say what went wrong and how to fix it.
- Keep per-build caches in module-level `Map`s with an explicit `clear()` function, such as `clearFileHashCache()`, which runs at the start of every build. Cap caches that could grow without limit, and normalize paths to `/` before using them as keys.
- Run independent file system work in parallel with `Promise.all`.

## Release process

### Changesets

We use [Changesets](https://github.com/changesets/changesets) for version management:

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

Changeset messages should be a brief summary of the changes made:

```markdown
---
'@stati/core': minor
'@stati/cli': patch
---

Add ISG aging algorithm for cache TTL management
```

## Documentation

Pages live in `docs-site/site/`. `docs-site/README.md` explains how to run the docs site with the local packages and the checks to run before a pull request.

## Getting help

Ask questions and share ideas in [GitHub Discussions](https://github.com/ianchak/stati/discussions), and report bugs and request features in [GitHub Issues](https://github.com/ianchak/stati/issues). Issues labeled `good first issue` are a good place to start.
