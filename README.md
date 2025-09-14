# Stati — Lightweight TypeScript Static Site Generator

Stati is a **lightweight static site generator** (SSG) built in **TypeScript** using **Vite**, **Markdown-It**, and **Eta templates**. It prioritizes speed, simplicity, and developer experience with features like live reload development server, incremental static generation, and project scaffolding.

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
- **Additional templates** (blog, docs, news)

---

## ISG at a glance

- Default builds are incremental when a cache exists; full rebuild on first run.
- Pages rebuild when inputs change, TTL expires (unless frozen), or when explicitly invalidated.
- Per-page overrides via front‑matter: `ttlSeconds`, `maxAgeCapDays`, `tags`, `publishedAt`.
- Invalidate examples:
  - `stati invalidate "tag:news"`
  - `stati invalidate "path:/blog/2024/hello"`
  - `stati invalidate "age:3months"`

See the ISG concept guide in [docs/concept_doc.md](./docs/concept_doc.md) and configuration details in [docs/configuration.md](./docs/configuration.md).

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

# Or use CLI commands directly
stati dev --port 3000 --open
stati build --force --clean --include-drafts
```

---

## 📦 Packages

```
packages/
├─ @stati/core         → Core SSG engine with build, dev server, and content processing
├─ @stati/cli          → Command-line interface (stati build, dev, invalidate)
├─ create-stati        → Project scaffolder (npx create-stati)
examples/
├─ blank               → Minimal starter template
├─ blog                → Complete blog example with navigation and content (WIP)
├─ docs                → Documentation site template (WIP)
├─ news                → News/article site template (WIP)
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

- [Getting Started Guide](./docs/README.md) — Quick start and project setup
- [Configuration Guide](./docs/configuration.md) — Complete configuration reference
- [Error Handling](./docs/error-handling.md) — Error codes, fallbacks, and debugging
- [Feature Overview](./docs/feature_doc.md) — Detailed feature descriptions
- [ISG Concept & TTL Model](./docs/concept_doc.md) — Incremental static generation guide
- [Roadmap & Milestones](./docs/implementation_plan.md) — Development progress and planning

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
