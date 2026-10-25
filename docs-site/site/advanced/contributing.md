---
title: 'Contributing'
description: 'Learn how to contribute to Stati development, report issues, and help improve the project.'
order: 3
seo:
  title: 'Contributing to Stati'
---

# Contributing

Stati is an open-source project and we welcome contributions from the community! Whether you're fixing bugs, adding features, improving documentation, or helping with testing, there are many ways to get involved.

## Quick start

1. **Fork the repository** on GitHub
2. **Clone your fork** locally
3. **Install dependencies** with `npm install`
4. **Run the test suite** with `npm test`
5. **Make your changes** and add tests
6. **Submit a pull request**

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
│   └── blank/
├── docs-site/             # Project documentation site
├── scripts/               # Build and development scripts
└── package.json           # Root package.json
```

### Monorepo workflow

Stati uses a monorepo structure with multiple packages:

```bash
# Install dependencies for all packages
npm install

# Build all packages (required order: core → images → cli → create-stati)
npm run build

# Test all packages
npm run test

# Test specific package
npm run test --workspace=@stati/core

# Develop with a specific example
cd examples/blog
npm install
npm run dev
```

## Making changes

### Code style

Stati uses strict TypeScript and follows these conventions:

- **ESLint** for code linting
- **Prettier** for code formatting
- **TypeScript** strict mode
- **Conventional Commits** for commit messages

```bash
# Run linting
npm run lint

# Type checking
npm run typecheck
```

### Testing

We maintain comprehensive test coverage:

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
# Run only the perf tests (CI skips them; npm test runs them too)
npx vitest run packages/core/test/perf

# Benchmarks use 100 generated pages with warmup runs
```

Baselines are defined in `perf/baselines/benchmark.json`. Each benchmark passes if its median over 7 runs stays within 30% of the baseline or 40ms above it, whichever is larger, so fast benchmarks are not failed by CI runner noise. Cache hit rates are validated too. If a benchmark fails, CI reruns the suite once and fails only if the rerun fails as well, so a stalled runner does not fail the check.

### Build metrics system

Stati includes a metrics system for debugging performance issues. Enable it via CLI:

```bash
stati build --metrics                    # Write JSON to .stati/metrics/
stati build --metrics --metrics-html     # Also generate HTML report
stati build --metrics --metrics-detailed # Include per-page timings
```

**Metrics include:**

- **Totals:** Duration, peak RSS, heap usage
- **Phases:** Config load, content discovery, rendering, asset copy, etc.
- **Counts:** Pages rendered, cache hits/misses, assets copied, templates loaded and rendered, include cache hits
- **ISG:** Whether ISG is enabled, cache hit rate, manifest entries, invalidated entries
- **Per-page timing** (when `--metrics-detailed` is used)

Metrics are written to `.stati/metrics/` as JSON files with timestamps. Use these to diagnose slow builds or cache inefficiencies.

## Contributing guidelines

### Pull request process

1. **Create an Issue** first for significant changes
2. **Fork and Branch** from `main`
3. **Make Changes** with tests
4. **Update Documentation** if needed
5. **Test Thoroughly** across packages
6. **Submit PR** with clear description

### PR template

```markdown
## Description

Brief description of changes

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Performance improvement
- [ ] Refactoring

## Testing

- [ ] Unit tests added/updated
- [ ] Integration tests passing
- [ ] Manual testing completed

## Checklist

- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No breaking changes (or properly documented)
```

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

Every type except `feat` produces a patch release, and `!` produces a major release.

## Development guidelines

### TypeScript standards

```typescript
// Use strict TypeScript and prefer interfaces for object shapes
export interface BuildResult extends BuildStats {
  /** Build metrics (only present when metrics are enabled) */
  buildMetrics?: BuildMetrics;
}

// Use JSDoc for public APIs
/**
 * Builds the site in the current working directory.
 * @param options - Build options
 * @returns Build statistics, plus metrics when they are enabled
 */
export async function build(options: BuildOptions = {}): Promise<BuildResult> {
  // Implementation
}
```

### Error handling

Stati uses domain-specific error classes rather than a generic error class. Each error type captures relevant context for debugging:

```typescript
// Domain-specific errors with context
export class ISGConfigurationError extends Error {
  constructor(
    public readonly code: ISGValidationError,
    public readonly field: string,
    public readonly value: unknown,
    message: string,
  ) {
    super(message);
    this.name = 'ISGConfigurationError';
  }
}

// Error that carries the fixes the dev server's error overlay shows
export class TemplateUsageError extends Error {
  /** Fixes to show in the error overlay */
  public readonly suggestions: string[];

  constructor(message: string, suggestions: string[] = []) {
    super(message);
    this.name = 'TemplateUsageError';
    this.suggestions = suggestions;
  }
}

// Self-documenting error messages
export class DuplicateBundleNameError extends Error {
  constructor(duplicates: string[]) {
    super(
      `Duplicate bundleName(s) found in configuration: ${duplicates.join(', ')}. ` +
        'Each bundle must have a unique bundleName.',
    );
    this.name = 'DuplicateBundleNameError';
  }
}
```

**Guidelines:**

- Create domain-specific error classes (e.g., `TemplateError`, `ISGConfigurationError`)
- Include relevant context as public readonly properties
- Provide actionable error messages that explain what went wrong and how to fix it
- Use error codes (enums) for structured error identification where appropriate

### Performance considerations

Stati uses several patterns to optimize build performance:

**Module-level caches with clear functions:**

```typescript
// Cache expensive operations at module level
const fileHashCache = new Map<string, string | null>();

// Clear at the start of each build
export function clearFileHashCache(): void {
  fileHashCache.clear();
}

// Use cache in hot paths
export async function computeFileHash(filePath: string): Promise<string | null> {
  const normalizedPath = filePath.replace(/\\/g, '/');

  if (fileHashCache.has(normalizedPath)) {
    return fileHashCache.get(normalizedPath) ?? null;
  }

  const content = await readFile(filePath, 'utf-8');
  const hash = content === null ? null : createSha256Hash(content);
  fileHashCache.set(normalizedPath, hash);
  return hash;
}
```

**Bounded caches with LRU eviction:**

```typescript
const escapeHtmlCache = new Map<string, string>();
const ESCAPE_CACHE_MAX_SIZE = 1000;

export function escapeHtml(text: string): string {
  const cached = escapeHtmlCache.get(text);
  if (cached !== undefined) return cached;

  const result = text.replace(/[&<>"']/g, (char) => htmlEscapes[char] || char);

  // Clear when full to prevent unbounded growth
  if (escapeHtmlCache.size >= ESCAPE_CACHE_MAX_SIZE) {
    escapeHtmlCache.clear();
  }
  escapeHtmlCache.set(text, result);
  return result;
}
```

**Parallel I/O operations:**

```typescript
// Batch file writes in dev mode for Windows filesystem performance
const uniqueDirs = [...new Set(pendingWrites.map((w) => dirname(w.outputPath)))];
await Promise.all(uniqueDirs.map((dir) => ensureDir(dir)));
await Promise.all(pendingWrites.map((w) => writeFile(w.outputPath, w.content, 'utf-8')));
```

**Guidelines:**

- Use module-level `Map` caches with explicit `clear()` functions
- Implement size limits on caches to prevent memory leaks
- Batch I/O operations with `Promise.all` for parallel execution
- Normalize paths before using as cache keys (`/` not `\`)

## Release process

### Versioning

Stati follows [Semantic Versioning](https://semver.org/):

- **MAJOR** - Breaking changes
- **MINOR** - New features (backward compatible)
- **PATCH** - Bug fixes (backward compatible)

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

### Writing style

- **Clear and concise** explanations
- **Code examples** for every concept
- **Step-by-step** instructions
- **Real-world** use cases

### Documentation structure

````markdown
# Page Title

Brief description of what this page covers.

## Section 1

Explanation with code example:

```javascript
// Code example
const example = 'value';
```

### Subsection

More detailed information.

## Best practices

- Tip 1
- Tip 2
- Tip 3

## Next steps

Links to related documentation.
````

### API documentation

Use TypeScript interfaces for API docs:

```typescript
/**
 * An ISG aging rule: a cache lifetime for pages up to a given age.
 */
export interface AgingRule {
  /** Pages up to this many days old use this rule */
  untilDays: number;

  /** Cache time-to-live in seconds for pages in this age range */
  ttlSeconds: number;
}
```

## Community

### Getting help

- **GitHub Discussions** - Ask questions and share ideas
- **GitHub Issues** - Report bugs and request features

### Code of conduct

We follow the [Contributor Covenant](https://www.contributor-covenant.org/):

- **Be respectful** and inclusive
- **Be patient** with newcomers
- **Be constructive** in feedback
- **Be collaborative** in discussions

## Getting started contributing

1. **Browse Issues** - Look for "good first issue" labels
2. **Join Discussions** - Introduce yourself and ask questions
3. **Start Small** - Fix typos, add tests, improve docs
4. **Ask for Help** - Don't hesitate to ask for guidance

### Good first issues

- Documentation improvements
- Test coverage additions
- Error message improvements
- Example project enhancements
- Performance optimizations

Thank you for considering contributing to Stati! Every contribution, no matter how small, helps make Stati better for everyone. We're excited to work with you and see what we can build together.

For questions about contributing, feel free to open a discussion on GitHub or reach out to the maintainers. We're here to help and want to make contributing as smooth as possible for everyone.
