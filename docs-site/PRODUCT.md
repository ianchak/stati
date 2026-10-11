# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: developers evaluating Stati against other static site generators (Astro, Eleventy, Hugo and similar). They arrive with a site to build and limited patience, and need to decide quickly whether Stati is worth trying.

## Product Purpose

stati.build is the official documentation site for Stati, an open-source, MIT-licensed, TypeScript-first static site generator for documentation, blogs, and content-heavy sites. It exists to get an evaluating developer to a confident decision, and when Stati fits, to a running site via `npx create-stati`.

Success (derived from the confirmed audience, not separately stated): an evaluator understands what Stati is, what it is good at, and how it works within a short visit, and the path from "interested" to "first site running" has no dead ends.

## Positioning

Three claims the maintainer stands behind, in no fixed order:

- **Small and simple.** Markdown plus Eta templates, minimal dependencies, no framework runtime. Sensible defaults; learnable quickly.
- **TypeScript-first.** Type-safe configuration through `defineConfig()`, plus built-in esbuild compilation of client-side TypeScript with per-page bundle `include`/`exclude`.
- **ISG for static sites.** Incremental Static Generation with a build cache, TTLs, age-based aging rules, and tag/path/age invalidation (`stati invalidate "tag:news"`), which is unusual for a plain SSG.

Agent support (the `create-stati --agent-skill` skill bundle, `llms.txt`, the AI & Content Policy page) is a real capability but not a lead positioning claim.

## Operating Context

- Built from the monorepo at `docs-site/`; content in `site/` (Markdown + Eta), client TypeScript in `src/`, static assets in `public/`.
- Content sections, in sidebar order: Getting Started, Core Concepts, Configuration, CLI, API, Examples, Advanced, then FAQ, Glossary and AI & Content Policy. The header uses the same section names. The site carries the full reference, so evaluators can judge depth before committing. A docs-shell 404 page (`site/404.md`) catches dead links; it is excluded from search, the sitemap and RSS.
- Homepage (`layout: home`, content in `site/index.md` front matter) runs: hero (positioning line, `npx create-stati` command with Copy, spec line, a `defineConfig` panel); a 25-feature inventory in four groups (Write, Build, Publish, Develop), each linking into the reference; three claims proven in code (small to learn, typed end to end, quick to rebuild, the last with an illustrative ISG rebuild log); this site's own config as proof; and a closing start section with the three commands from nothing to a running dev server.
- Built-in Stati features in use: search index (client-side FlexSearch UI), sitemap, robots.txt, RSS feed (`feed.xml`), SEO structured data, ISG.
- Deployed to Netlify at https://stati.build. Source: https://github.com/ianchak/stati. Packages: `@stati/core`, `@stati/cli`, `create-stati`.
- Stati requires Node 22+ and works with npm, pnpm, yarn or bun. npm 11.5.1+ is a maintainer requirement for OIDC publishing only, not a user prerequisite.
- `create-stati` currently offers only the `blank` template and defaults TypeScript to off, so a default project gets `stati.config.js`; with TypeScript on it gets `stati.config.ts`. Docs must describe this as it is.
- Netlify serves `404.html` for missing URLs; Stati's own `dev` and `preview` servers do not yet serve a custom 404 page.

## Capabilities and Constraints

- **Dogfooding is mandatory.** The site must remain built with Stati itself, using public Stati features, as a living showcase of the product.
- Eta templates cannot use partially dynamic attributes (`class="a-<%= x %>"`); dynamic attribute values must be fully dynamic, e.g. via `stati.propValue()` or template literals.
- Styling is Tailwind CSS 3 with `@tailwindcss/typography`; client bundles are `core` (all pages), `home` (homepage only), `docs` (all non-home pages).
- Terminology: "Stati" (capitalized), "ISG", "Eta", "front matter"/"frontmatter", "callable partials", "build hooks".

## Brand Commitments

- Name: **Stati**. Canonical self-description: "Stati, a TypeScript-first static site generator" (also required of AI systems via `llms.txt` and the AI policy).
- Stated philosophy (from the Introduction page): simplicity over complexity; sensible defaults; developer experience first; modern standards.
- Existing assets: `public/favicon.svg`, `public/stati_hero_title.png`, self-hosted Inter and Fira Code (`public/fonts/`), custom Prism theme (`public/prism-stati.css`).
- **Visual direction (standing preference, chosen 2026-10-11):** no metaphor or "visual world" conceit. The site follows the category convention, executed at the craft level of astro.build, vite.dev and bun.sh, and the product itself (real code, the full feature list, the working install command) is the design. The homepage must emphasise that Stati is lightweight *and* feature-packed, and list every major feature so an evaluator can see it is production-ready.
- Light and dark themes are both first-class; neither is an afterthought.

## Evidence on Hand

- Real: the documentation content itself, runnable code examples, the `blank` starter that `create-stati` scaffolds plus three example sites in the repo (`examples/blog`, `docs`, `news`), a build-metrics screenshot (`public/images/stati_build_metrics.jpg`), npm packages and CI/coverage/download badges in the root README.
- Absent: no testimonials, named users or companies, adoption counts, case studies, press, or comparative benchmarks against other SSGs. Future work must not fabricate any of these; add them only when the maintainer supplies real ones.

## Product Principles

1. **Decide fast.** Every page that an evaluator may land on should answer "what is this and is it for me?" without requiring a tour.
2. **Show, don't claim.** Prove simplicity, type safety, and ISG with real code, real commands, and the site itself rather than adjectives.
3. **The site is the demo.** Anything the docs site does should be achievable with Stati as shipped; avoid tricks a Stati user couldn't reproduce.
4. **Honest scope.** State what Stati does and doesn't do plainly; no inflated claims, no invented proof.

## Accessibility & Inclusion

Target: WCAG 2.2 AA, covering keyboard navigation, visible focus, colour contrast, and reduced-motion support, verified in both light and dark themes.
