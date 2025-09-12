# Contributing to Stati

Thanks for your interest in contributing to **Stati** — a lightweight, TypeScript-first static site generator.

---

## 🛠 Requirements

- **Node.js** 22+ (see `engines` in package.json)
- **npm** with workspace support
- Familiarity with TypeScript and monorepo layouts is helpful

---

## 🚧 Project Structure

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

## 📜 Available Scripts

```bash
# Code quality and validation
npm run lint           # ESLint across packages
npm run typecheck      # TypeScript compilation check

# Testing (Vitest with 154+ tests)
npm run test           # Run all tests across packages
npm run test:ci        # CI-specific testing with workspace support

# Building
npm run build          # Build core, cli, and create-stati packages
npm run build:demo     # Build packages and example blog

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

## 🔄 Making Changes

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
npm run ci
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

## 🧪 Tests

- **Framework:** Vitest with comprehensive test coverage (154+ tests)
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
npm run test           # Run all tests
npm run test:ci        # Full CI pipeline including tests
```

---

## 🤝 Contributor Roles

- `type:bug`, `type:feat`, `type:chore`, `area:isg`, `area:scaffolder`, etc.
- GitHub templates + labels help guide issues & PRs

---

## 🏁 Release Flow

After merging a PR with a changeset:

```bash
# Update versions based on changesets
npm run release:version

# Push changes and tags
git push --follow-tags

# Publish packages to npm
npm run release:publish

# Or run the complete flow
npm run release
```

The project uses [Changesets](https://github.com/changesets/changesets) for version management and publishing.

---

## 🙏 Thank You!

Your contributions make this project better. Whether you're fixing bugs, suggesting features, writing docs, or improving templates — you’re helping developers build faster, simpler static sites.
