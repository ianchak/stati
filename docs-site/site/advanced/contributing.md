---
title: 'Contributing'
description: 'Learn how to contribute to Stati development, report issues, and help improve the project.'
order: 3
---

# Contributing to Stati

Stati is an open-source project and we welcome contributions from the community! Whether you're fixing bugs, adding features, improving documentation, or helping with testing, there are many ways to get involved.

## Quick Start

1. **Fork the repository** on GitHub
2. **Clone your fork** locally
3. **Install dependencies** with `npm install`
4. **Run the test suite** with `npm test`
5. **Make your changes** and add tests
6. **Submit a pull request**

## Development Setup

### Prerequisites

- **Node.js** 22.0.0 or higher
- **npm** 11.5.1 or higher
- **Git** for version control

### Local Development

```bash
# Clone the repository
git clone https://github.com/your-username/stati.git
cd stati

# Install dependencies
npm install

# Build all packages (core → cli → create-stati)
npm run build

# Run the test suite
npm test

# Lint and type-check
npm run lint
npm run typecheck

```

### Project Structure

```
stati/
├── packages/
│   ├── core/              # Core Stati engine
│   │   ├── src/
│   │   ├── tests/
│   │   └── package.json
│   ├── cli/               # Command-line interface
│   │   ├── src/
│   │   ├── tests/
│   │   └── package.json
│   └── create-stati/      # Project scaffolder
│       ├── src/
│       ├── tests/
│       └── package.json
├── examples/              # Example projects (bundled with the scaffolder)
│   ├── blog/
│   ├── docs/
│   └── blank/
├── docs-site/             # Project documentation site
├── scripts/               # Build and development scripts
└── package.json           # Root package.json
```

### Monorepo Workflow

Stati uses a monorepo structure with multiple packages:

```bash
# Install dependencies for all packages
npm install

# Build all packages (required order: core → cli → create-stati)
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

## Making Changes

### Code Style

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
npm test -- packages/core/src/__tests__/build.test.ts

# Run tests in watch mode
npm test -- --watch
```

### CI Pipeline

Every push and pull request triggers the CI workflow (`.github/workflows/ci.yml`):

1. **Dependency Install** — `npm ci` with npm 11.5.1+
2. **Build Packages** — `npm run build` (core → cli → create-stati)
3. **Run Tests** — Vitest with coverage (perf tests excluded from CI)
4. **Upload Coverage** — Reports sent to Codecov

The pipeline runs on Ubuntu with Node.js 22. Version commits from the publish workflow are automatically skipped.

### Performance Benchmarks

Performance tests live in `packages/core/test/perf/` and measure build speed across scenarios:

| Scenario | Description | Baseline |
| -------- | ----------- | -------- |
| Cold Build | Clean slate, no cache | ~300ms median |
| Warm Build | No changes, high cache hit | ~80ms median |
| Incremental | Single file change | ~90ms median |
| Complex | Nested components, 100 pages | ~400ms median |

Run benchmarks locally:

```bash
# Run perf tests (excluded from regular test runs)
npx vitest run packages/core/test/perf

# Benchmarks use 100 generated pages with warmup runs
```

Baselines are defined in `perf/baselines/benchmark.json` with a 30% tolerance. Tests validate median duration and cache hit rates.

### Build Metrics System

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

Metrics are written to `.stati/metrics/` as JSON files with timestamps. Use these to diagnose slow builds or cache inefficiencies.

## Contributing Guidelines

### Pull Request Process

1. **Create an Issue** first for significant changes
2. **Fork and Branch** from `main`
3. **Make Changes** with tests
4. **Update Documentation** if needed
5. **Test Thoroughly** across packages
6. **Submit PR** with clear description

### PR Template

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

### Commit Messages

We use [Conventional Commits](https://www.conventionalcommits.org/):

```bash
# Format: <type>(<scope>): <description>

# Examples:
feat(core): add ISG aging algorithm
fix(cli): resolve build output path issue
docs(readme): update installation instructions
test(core): add markdown processing tests
refactor(templates): improve Eta helper organization
```

**Types:**

- `feat` - New features
- `fix` - Bug fixes
- `docs` - Documentation changes
- `test` - Test additions/changes
- `refactor` - Code refactoring
- `perf` - Performance improvements
- `chore` - Maintenance tasks

## Development Guidelines

### TypeScript Standards

```typescript
// Use strict TypeScript
interface StatiConfig {
  site: SiteConfig;
  markdown?: MarkdownConfig;
  // ... other properties
}

// Prefer interfaces over types
interface BuildResult {
  pageCount: number;
  buildTime: number;
  cacheHitRate: number;
}

// Use JSDoc for public APIs
/**
 * Build a Stati site
 * @param config - Site configuration
 * @param options - Build options
 * @returns Build result with statistics
 */
export async function build(config: StatiConfig, options: BuildOptions = {}): Promise<BuildResult> {
  // Implementation
}
```

### Error Handling

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

// Error with dependency chain for debugging
export class CircularDependencyError extends Error {
  constructor(
    public readonly dependencyChain: string[],
    message: string,
  ) {
    super(message);
    this.name = 'CircularDependencyError';
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

### Performance Considerations

Stati uses several patterns to optimize build performance:

**Module-level caches with clear functions:**

```typescript
// Cache expensive operations at module level
const templatePathCache = new Map<string, string | null>();
const templateContentCache = new Map<string, string | null>();

// Clear at the start of each build
export function clearTemplatePathCache(): void {
  templatePathCache.clear();
  templateContentCache.clear();
}

// Use cache in hot paths
export async function computeFileHash(filePath: string): Promise<string | null> {
  const normalizedPath = filePath.replace(/\\/g, '/');

  if (fileHashCache.has(normalizedPath)) {
    return fileHashCache.get(normalizedPath) ?? null;
  }

  const hash = createSha256Hash(await readFile(filePath, 'utf-8'));
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

## Release Process

### Versioning

Stati follows [Semantic Versioning](https://semver.org/):

- **MAJOR** - Breaking changes
- **MINOR** - New features (backward compatible)
- **PATCH** - Bug fixes (backward compatible)

### Changesets

We use [Changesets](https://github.com/changesets/changesets) for version management:

```bash
# Add a changeset
npx changeset

# Version packages
npx changeset version

# Publish packages
npx changeset publish
```

Example changeset:

```markdown
---
'@stati/core': minor
'@stati/cli': patch
---

Add ISG aging algorithm for intelligent cache TTL management. This feature automatically adjusts cache durations based on content age, improving performance for sites with mixed content freshness.
```

## Documentation

### Writing Style

- **Clear and concise** explanations
- **Code examples** for every concept
- **Step-by-step** instructions
- **Real-world** use cases

### Documentation Structure

````markdown
# Page Title

Brief description of what this page covers.

## Section 1

Explanation with code example:

```javascript
// Code example
const example = 'value';
```
````

### Subsection

More detailed information.

## Best Practices

- Tip 1
- Tip 2
- Tip 3

## Next Steps

Links to related documentation.

````

### API Documentation

Use TypeScript interfaces for API docs:

```typescript
/**
 * Configuration for Stati sites
 */
export interface StatiConfig {
  /** Site metadata and settings */
  site: SiteConfig;

  /** Markdown processing configuration */
  markdown?: MarkdownConfig;

  /** Template engine settings */
  templates?: TemplateConfig;
}
````

## Community

### Getting Help

- **GitHub Discussions** - Ask questions and share ideas
- **GitHub Issues** - Report bugs and request features

### Code of Conduct

We follow the [Contributor Covenant](https://www.contributor-covenant.org/):

- **Be respectful** and inclusive
- **Be patient** with newcomers
- **Be constructive** in feedback
- **Be collaborative** in discussions

### Recognition

Contributors are recognized in:

- **Changelog** for each release
- **Contributors** section in README
- **All Contributors** bot acknowledgment

## Getting Started Contributing

1. **Browse Issues** - Look for "good first issue" labels
2. **Join Discussions** - Introduce yourself and ask questions
3. **Start Small** - Fix typos, add tests, improve docs
4. **Ask for Help** - Don't hesitate to ask for guidance

### Good First Issues

- Documentation improvements
- Test coverage additions
- Error message improvements
- Example project enhancements
- Performance optimizations

Thank you for considering contributing to Stati! Every contribution, no matter how small, helps make Stati better for everyone. We're excited to work with you and see what we can build together.

For questions about contributing, feel free to open a discussion on GitHub or reach out to the maintainers. We're here to help and want to make contributing as smooth as possible for everyone.
