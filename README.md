# Stati — Lightweight TypeScript Static Site Generator

Stati is a **lightweight static site generator** (SSG) built in **TypeScript** using **Vite**, **Markdown-It**, and **Eta templates**. It prioritizes speed, simplicity, and a clean developer experience — while offering powerful features like **Incremental Static Generation (ISG)**.

---

## 🚀 Planned Features (v1.0)

- ✅ Filesystem-based routing from `site/`
- ✅ Markdown + front-matter with curated plugins
- ✅ Layouts & partials via Eta templates
- ✅ Development server with live reload
- Incremental Static Generation with TTL + aging + freeze
- Blog, Docs, and News templates with scaffolding support
- SEO tags, RSS, sitemap, and draft support
- Optional Tailwind or SCSS setup via scaffolder
- Strict TypeScript, ESLint/Prettier, and CI by default

---

## 🧪 Quick Start (Local Dev)

```bash
# Install deps
npm install

# Build packages
npm run build --workspaces

# Build site
npx stati build --force

# Development server with live reload
npx stati dev --port 3000 --open
```

---

## 📦 Packages

```txt
packages/
├─ stati               → CLI: build, invalidate, dev
├─ create-stati        → NPX scaffolder (templates, Tailwind opt-in)
examples/
├─ blog
├─ docs
├─ news
```

---

## 📁 Repo Scripts

```bash
# Lint, typecheck, test, build
npm run lint
npm run typecheck
npm run test
npm run build --workspaces
npm run ci

# Release (via Changesets)
npm run release:version
npm run release:publish
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

- **Minimal dependencies**: markdown-it, eta, yargs, fast-glob.
- **Safe by default**: drafts are excluded from builds, ISG respects TTL/freeze.
- **Composable**: templates, layouts, widgets, hooks — all extensible but optional.
