# Stati — Lightweight TypeScript Static Site Generator

Stati is a **lightweight static site generator** (SSG) built in **TypeScript** using **Markdown-It**, and **Eta templates**. It prioritizes speed, simplicity, and developer experience with features like live reload development server, incremental static generation, and project scaffolding.

---

## Quick Start

### Create a New Project

```bash
# Create a new Stati site
npx create-stati my-site

# Navigate to your project
cd my-site

# Start development server
npm run dev
```

The scaffolder will guide you through setting up a new project with your choice of styling (CSS, Sass, or Tailwind CSS).

---

## Features

### Core Features (Ready)

- **Project Scaffolding** — `npx create-stati` with interactive setup and styling options
- **Filesystem-based routing** from `site/` directory
- **Markdown + front-matter** with customizable plugins
- **Eta template engine** with layouts & partials support
- **Hierarchical partial overriding** — customize templates per directory with inheritance
- **Development server** with live reload and hot rebuilding
- **Static asset copying** from `public/` directory
- **TypeScript-first** configuration with full type safety
- **Comprehensive testing** with Vitest and 358+ tests
- **Draft page support** with `--include-drafts` flag
- **Incremental Static Generation (ISG)** with TTL, aging, and freeze
- **Cache manifest** with input hashing and dependency tracking
- **Invalidation CLI** — invalidate by tag, path, or age
- **Build modes** — incremental by default; `--force` and `--clean` supported
- **CSS Preprocessing** — Sass and Tailwind CSS integration via scaffolder

### 🚧 Planned Features (v1.0+)

- **SEO enhancements** (meta tags, RSS, sitemap)
- **Image optimization** pipeline
- **Additional template examples** (blog, documentation, news site patterns)

---

## ISG at a glance

- Default builds are incremental when a cache exists; full rebuild on first run.
- Pages rebuild when inputs change, TTL expires (unless frozen), or when explicitly invalidated.
- Per-page overrides via front‑matter: `ttlSeconds`, `maxAgeCapDays`, `tags`, `publishedAt`.
- Invalidate examples:
  - `stati invalidate "tag:news"`
  - `stati invalidate "path:/blog/2024/hello"`
  - `stati invalidate "age:3months"`

See the ISG concept guide on [stati.imrecsige.dev/core-concepts/isg/](https://stati.imrecsige.dev/core-concepts/isg/) and configuration details at [stati.imrecsige.dev/configuration/](https://stati.imrecsige.dev/configuration/).

---

## CLI Usage

### Project Creation

```bash
# Interactive setup
npx create-stati my-site

# Non-interactive with flags
npx create-stati my-site --template=blank --styling=tailwind --git
```

**Scaffolding Options:**

- **Templates**: `blank` (minimal starter)
- **Styling**: `css`, `sass`, `tailwind`
- **Features**: Git initialization, CSS preprocessing

### Available Commands

- **`stati build`** — Build your site with options for force rebuild, cleaning cache, and including drafts
- **`stati dev`** — Start development server with configurable port, host, and auto-open browser
- **`stati preview`** — Serve the built site locally for preview with configurable port and host
- **`stati invalidate`** — Cache invalidation by tags, paths, patterns, or age

_Commands available when `@stati/cli` is installed in your project._

### Development Workflow

```bash
# Navigate to your Stati project
cd my-stati-site

# Development server with live reload
npm run dev

# Build the site
npm run build

# Preview the built site
npm run preview

# Or use CLI commands directly
stati dev --port 3000 --open
stati build --force --clean --include-drafts
stati preview --port 4000 --open
```

---

## 📦 Packages

```
packages/
├─ @stati/core         → Core SSG engine with build, dev server, and content processing
├─ @stati/cli          → Command-line interface (stati build, dev, preview, invalidate)
├─ create-stati        → Project scaffolder (npx create-stati)
examples/
├─ blank               → Minimal starter template
```

---

## Development Setup

For contributors working on Stati itself:

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

## 📁 Development Scripts

```bash
# Linting and code quality
npm run lint           # ESLint across packages
npm run typecheck      # TypeScript compilation check

# Testing
npm run test           # Run all tests with Vitest (358+ tests)

# Building
npm run build          # Build core, cli, and create-stati packages
npm run build:demo     # Build packages and example blog

# CI Pipeline
npm run test:ci        # CI-specific testing with workspace support

# Release management (via Changesets)
npm run release:version   # Update package versions
npm run release:publish   # Publish to npm
npm run release          # Version + publish + push tags
```

---

## Documentation

- [Getting Started Guide](https://stati.imrecsige.dev/getting-started/) — Quick start and project setup
- [Configuration Reference](https://stati.imrecsige.dev/configuration/) — Complete configuration reference
- [Error Handling](https://stati.imrecsige.dev/api/error-handling/) — Error codes, fallbacks, and debugging
- [Feature Overview](https://stati.imrecsige.dev/core-concepts/) — Detailed feature descriptions
- [ISG Concept & TTL Model](https://stati.imrecsige.dev/core-concepts/isg/) — Incremental static generation guide

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for setup, coding style, and PR instructions.

---

## Philosophy

- **Minimal dependencies**: Only essential packages (markdown-it, eta, yargs, fast-glob, etc.)
- **TypeScript-first**: Full type safety with comprehensive interfaces and strict configuration
- **Developer experience**: Fast builds, live reload, helpful error messages, and intuitive CLI
- **Composable architecture**: Templates, layouts, partials, and hooks are all extensible
- **Safe by default**: Drafts excluded from builds, robust error handling, comprehensive testing
- **Getting started fast**: `npx create-stati` gets you running in under 2 minutes

---

## License

MIT © [Imre Csige](https://github.com/ianchak)
