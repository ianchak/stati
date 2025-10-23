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

# Optional: watch core package TypeScript
npm run dev --workspace=@stati/core
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
├── examples/              # Example projects
│   ├── blog/
│   ├── docs/
│   └── blank/
├── docs/                  # Project documentation
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

### Test Categories

1. **Unit Tests** - Test individual functions and classes
2. **Integration Tests** - Test component interactions
3. **End-to-End Tests** - Test complete workflows
4. **Example Tests** - Validate example projects

Example test structure:

```typescript
// packages/core/src/__tests__/build.test.ts
import { describe, it, expect } from 'vitest';
import { build } from '../../core/build.js';

describe('build', () => {
  it('returns build statistics', async () => {
    const stats = await build({ force: true });

    expect(stats.totalPages).toBeGreaterThanOrEqual(0);
    expect(stats.assetsCount).toBeGreaterThanOrEqual(0);
  });
});
```

## Contributing Guidelines

### Types of Contributions

**🐛 Bug Fixes**

- Fix functionality issues
- Improve error handling
- Performance improvements

**✨ New Features**

- Add new Stati capabilities
- Extend plugin system
- Improve developer experience

**📚 Documentation**

- Fix typos and unclear sections
- Add examples and tutorials
- Improve API documentation

**🧪 Testing**

- Add test coverage
- Improve test reliability
- Add integration tests

**🔧 Infrastructure**

- Improve build process
- CI/CD improvements
- Development tooling

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

```typescript
// Use custom error classes
export class StatiError extends Error {
  constructor(
    message: string,
    public code: string,
    public category: ErrorCategory,
  ) {
    super(message);
    this.name = 'StatiError';
  }
}

// Provide helpful error messages
throw new StatiError(
  `Template not found: ${templatePath}. ` + `Make sure the file exists and check the file path.`,
  'TEMPLATE_NOT_FOUND',
  'template',
);
```

### Performance Considerations

```typescript
// Use caching appropriately
const cache = new Map<string, CachedItem>();

function expensiveOperation(input: string): Result {
  if (cache.has(input)) {
    return cache.get(input)!.result;
  }

  const result = doExpensiveWork(input);
  cache.set(input, { result, timestamp: Date.now() });
  return result;
}

// Optimize for common cases
function processPages(pages: Page[]): ProcessedPage[] {
  // Batch operations when possible
  return pages.map((page) => processPage(page));
}
```

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

### Release Notes

Each release includes:

- **New Features** with examples
- **Bug Fixes** with issue references
- **Breaking Changes** with migration guides
- **Performance Improvements**
- **Documentation Updates**

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

## Roadmap

### Current Priorities

1. **Performance validation**
  - Benchmark build and cache behaviour using the bundled examples.
  - Track Incremental Static Generation cache metrics.

1. **Developer experience**
  - Improve diagnostic output in the CLI.
  - Expand automated test coverage for build edge cases.

1. **Documentation coverage**
  - Keep this docs-site in sync with shipped features.
  - Add walkthroughs for the blank template workflow.

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
