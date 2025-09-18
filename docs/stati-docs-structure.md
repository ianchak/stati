# Stati Documentation Site Structure

This document describes the proposed structure for the Stati documentation site. It is inspired by the best practices of top static site generators (Next.js, Hugo, Docusaurus, VuePress, etc.) and tailored to Stati’s vision and existing documentation.

---

## 1. Home

- **Overview** — Introduction to Stati: lightweight static site generator built with TypeScript.
- **Key Features** — Highlight of major features with links to deeper sections.
- **Philosophy** — Design principles: lightweight, minimal dependencies, developer experience first.

---

## 2. Getting Started

- **Introduction** — Why Stati exists, its goals, and intended use cases.
- **Installation** — How to install Stati via `npm` and scaffold a new project with `npx create-stati`.
- **Project Structure** — Explanation of the `site/`, `public/`, and config files.
- **Quick Start Guide** — Walkthrough of creating and serving a new project.

---

## 3. Core Concepts

- **Filesystem-based Routing** — Pages generated from files in `site/`.
- **Templates & Layouts (Eta)** — Layout inheritance, partials, underscore folders.
- **Markdown Pipeline** — Markdown-It with default plugins and extensibility.
- **Incremental Static Generation (ISG)** — TTL, aging, freeze, cache manifest, invalidation.
- **Static Assets & Bundling** — Copying `public/`, CSS/JS bundling, Tailwind support.

---

## 4. Configuration

- **Configuration File** — `stati.config.ts` and the `defineConfig` helper.
- **Site Metadata** — title, baseUrl, SEO defaults.
- **Template Engine Settings** — Eta filters, template placement, resolution order.
- **Markdown Configuration** — Plugins and custom configuration functions.
- **ISG Options** — ttlSeconds, maxAgeCapDays, aging schedule.
- **Development Server Settings** — port, host, auto-open.
- **Build Lifecycle Hooks** — beforeAll, afterAll, beforeRender, afterRender.

---

## 5. CLI & Tooling

- **Available Commands** — `stati build`, `stati dev`, `stati invalidate`.
- **Scaffolder: `create-stati`** — Blog, docs, news templates, Tailwind/Sass support.
- **Development Workflow** — Dev server with live reload, incremental builds.

---

## 6. API Reference

- **Template API** — Eta helpers, partial usage, hierarchical resolution.
- **Plugin & Hook API** — Extending Stati with custom plugins and hooks.
- **Cache Manifest Schema** — ISG manifest JSON structure and types.
- **TypeScript Types** — Public interfaces like `StatiConfig`.

---

## 7. Advanced Topics

- **Performance & Build Statistics** — Metrics, cache efficiency, bottlenecks.
- **SEO, Metadata, Sitemap, RSS** — Default SEO tags, auto sitemap, RSS feeds.
- **Error Handling** — StatiError class, error categories, fallback templates.
- **Drafts & Publishing Workflow** — Marking drafts, including/excluding them in builds.

---

## 8. Examples & Recipes

- **Blog Example** — Posts, index, RSS.
- **Docs Example** — Sidebar navigation, ToC support.
- **News Example** — Section-based aggregation, tag-based content.
- **Custom Plugin Example** — Extending Stati via hooks or Markdown plugins.

---

## 9. Contributing

- **Contribution Guide** — Setup, scripts, code style.
- **Roadmap & Milestones** — Current implementation plan and roadmap.
- **Governance & Releases** — CI/CD, Changesets, semantic versioning.

---

## 10. Changelog / Releases

- Human-readable changelogs with semantic versioning.

---

## 11. FAQ

- Answers to common questions: drafts, deployment, ISG behavior, migration.

---

## 12. Glossary

- Definitions of technical terms: ISG, TTL, freeze, aging, front matter, partials, etc.

---

## Summary

This structure ensures:

- **Clarity for new users** through a focused Getting Started section.
- **Depth for power users** with Core Concepts, API Reference, and Advanced Topics.
- **Practical guidance** via Examples & Recipes.
- **Sustainability for contributors** with Contributing and Governance sections.
