# Stati — Lightweight TypeScript Static Site Generator

Stati is a **lightweight static site generator** (SSG) built in **TypeScript** using **Vite**-inspired architecture, **Markdown-It**, and **Eta templates**. It prioritizes speed, simplicity, and developer experience with features like live reload development server, TypeScript-first configuration, and comprehensive testing.

---

## 🚀 Features

### ✅ Core Features (Ready)

- **Filesystem-based routing** from `site/` directory
- **Markdown + front-matter** with customizable plugins
- **Eta template engine** with layouts & partials support
- **Development server** with live reload and hot rebuilding
- **Navigation system** with automatic hierarchy building
- **Static asset copying** from `public/` directory
- **TypeScript-first** configuration with full type safety
- **Comprehensive testing** with Vitest and 154+ tests
- **Draft page support** with `--include-drafts` flag
- **Incremental Static Generation (ISG)** with TTL, aging, and freeze (per-page overrides)
- **Cache manifest** with input hashing and dependency tracking
- **Invalidation CLI**: invalidate by tag, path, or age (`stati invalidate`)
- **Build modes**: incremental by default; `--force` and `--clean` supported

### 🚧 Planned Features (v1.0+)

- **Blog, Docs, and News templates** via scaffolder
- **SEO enhancements** (meta tags, RSS, sitemap)
- **Optional Tailwind CSS** setup via scaffolder

---

## ⚡ ISG at a glance

- Default builds are incremental when a cache exists; full rebuild on first run.
- Pages rebuild when inputs change, TTL expires (unless frozen), or when explicitly invalidated.
- Per-page overrides via front‑matter: `ttlSeconds`, `maxAgeCapDays`, `tags`, `publishedAt`.
- Invalidate examples:
  - `stati invalidate "tag:news"`
  - `stati invalidate "path:/blog/2024/hello"`
  - `stati invalidate "age:3months"`

See the ISG concept guide in [docs/concept_doc.md](./docs/concept_doc.md) and configuration details in [docs/configuration.md](./docs/configuration.md).

---

## 🧪 Quick Start

### Using the CLI (Development)

```bash
# Install dependencies
npm install

# Build all packages
npm run build --workspaces

# Create or navigate to a site directory
cd examples/blog

# Development server with live reload
npx stati dev --port 3000 --open

# Build the site
npx stati build

# Build with options
npx stati build --force --clean --include-drafts
```

### Available Commands

- **`stati build`** - Build your site with options for force rebuild, cleaning cache, and including drafts
- **`stati dev`** - Start development server with configurable port, host, and auto-open browser
- **`stati invalidate`** - Cache invalidation by tags, paths, patterns, or age

---

## 📦 Packages

```
packages/
├─ @stati/core         → Core SSG engine with build, dev server, and content processing
├─ @stati/cli          → Command-line interface (stati build, dev, invalidate)
├─ create-stati        → Project scaffolder (npx create-stati) - coming soon
examples/
├─ blog                → Complete blog example with navigation and content
├─ docs                → Documentation site template
├─ news                → News/article site template
```

---

## 📁 Development Scripts

```bash
# Linting and code quality
npm run lint           # ESLint across packages
npm run typecheck      # TypeScript compilation check

# Testing
npm run test           # Run all tests with Vitest (154+ tests)

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

## 📚 Docs

- [Configuration Guide](./docs/configuration.md) — Complete configuration reference
- [Error Handling](./docs/error-handling.md) — Error codes, fallbacks, and debugging
- [Feature Overview](./docs/feature_doc.md)
- [ISG Concept & TTL Model](./docs/concept_doc.md)
- [Roadmap & Milestones](./docs/implementation_plan.md)

---

## 🤝 Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for setup, coding style, and PR instructions.

---

## 🧠 Philosophy

- **Minimal dependencies**: Only essential packages (markdown-it, eta, yargs, fast-glob, etc.)
- **TypeScript-first**: Full type safety with comprehensive interfaces and strict configuration
- **Developer experience**: Fast builds, live reload, helpful error messages, and intuitive CLI
- **Composable architecture**: Templates, layouts, partials, and hooks are all extensible
- **Safe by default**: Drafts excluded from builds, robust error handling, comprehensive testing
