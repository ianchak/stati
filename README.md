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

### 🚧 Planned Features (v1.0+)

- **Incremental Static Generation** with TTL + aging + freeze
- **Content invalidation** by tags or paths (`stati invalidate`)
- **Blog, Docs, and News templates** via scaffolder
- **SEO enhancements** (meta tags, RSS, sitemap)
- **Optional Tailwind CSS** setup via scaffolder

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
- **`stati invalidate`** - Cache invalidation (coming in future release)

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
