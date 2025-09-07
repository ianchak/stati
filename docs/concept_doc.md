# Lightweight Static Site Generator Concept

## Vision

The project is a **lightweight static site generator (SSG)** built with **TypeScript** and **Vite**. Its purpose is to make building content-driven websites fast and simple.

Long term, the generator should provide ready-made templates for:

- Blogs
- Documentation
- News sites

It should also support RSS feeds, sitemaps, and incremental static generation (ISG) at build time.

This SSG is meant to be **distributed as an npm package**, with an **NPX scaffolder** for easy bootstrapping of new projects.

---

## Core Principles

1. **Lightweight First**
   - Minimal dependencies, fast builds, no React/JSX overhead.
   - Eta for templating, Markdown-It for content.

2. **Content in Filesystem**
   - Drop files in `site/`; routing and aggregation follow directory structure.
   - Front matter enriches content with metadata (title, description, tags, etc.).

3. **Extensible Templates**
   - Support for nested layouts (`+layout.eta` cascading).
   - Templates define overall structure, while widgets can inject lists of tagged content or recent items.

4. **Incremental Static Generation (ISG)**
   - Default mode: reuse cache if present; full build if not.
   - TTL with cap ("freeze"): pages revalidate by TTL until max-age is reached (then freeze).
   - Aging schedule: staged TTLs by content age (e.g., hourly in week 1, daily until 90d, weekly to 1y).
   - Per-page overrides: `ttlSeconds`, `maxAgeCapDays`, `tags`, `publishedAt` in front matter.
   - Dirty detection: rebuild if inputs changed, TTL expired, tag/path invalidated, or forced.
   - Manifest stores metadata: deps, lastBuiltAt, publishedAt, TTL, tags, artifact paths.
   - CLI supports targeted invalidation by tag or path for targeted rebuilds.
   - Global switch: renderer version bump invalidates cache globally.

> **📖 For complete ISG configuration and CLI options, see [Configuration Guide](configuration.md)**

---

## Authoring Model

### Filesystem Structure

- **Single root folder:** `site/`
- **Routing:**
  - `site/index.md` → `/`
  - `site/about.md` → `/about`
  - `site/posts/hello-world.md` → `/posts/hello-world`

### Ordering & Visibility

- **Numeric prefixes** (`01-intro.md`) control order; fallback alphabetical.
- `hidden: true` excludes from navigation but keeps page routable.
- Tags in front matter allow aggregation pages and widgets.

### Front Matter Support

- Standard fields: `title`, `description`, `tags`, `order`, `publishedAt`, `ttlSeconds`, `maxAgeCapDays`.
- Custom fields automatically added to the render context.

---

## Layout System

Stati provides a flexible hierarchical layout system with cascading templates and auto-discovered partials.

> **📖 For complete template system documentation, see [Template System](configuration.md#template-system)**

Key features:

- **Nested layouts**: `+layout.eta` files cascade through directory hierarchy
- **Named templates**: Content-specific templates (e.g., `post.eta`, `article.eta`)
- **Hierarchical partials**: Auto-discovered components and utilities in `_` folders
- **Flexible placement**: Templates can be placed anywhere in the structure

---

## Templates

### Blog

- Top navigation bar.
- Index pages aggregate child posts.
- RSS supported for posts.
- Widgets for recent posts.

### Docs

- Two-column or three-column variants.
- Sidebar navigation from directory structure.
- ToC support in right column (optional).

### News

- Front page lists recent stories.
- Aggregation by tags (e.g., Politics, Tech, Sports).
- RSS for sections.

---

## Markdown Pipeline

- Default plugins: `markdown-it-anchor`, `markdown-it-task-lists`, `markdown-it-external-links`.
- Optional: other markdown-it plugins.

---

## Config (`stati.config.ts`)

Stati uses a TypeScript configuration file for customization. Here's a basic example:

```ts
import type { StatiConfig } from 'stati';

const config: StatiConfig = {
  site: {
    title: 'My Site',
    baseUrl: 'https://example.com',
  },
  outDir: 'dist',
  markdown: {
    configure: (md) => {
      // Configure MarkdownIt instance with plugins
    },
  },
  isg: {
    enabled: true,
    ttlSeconds: 3600,
    maxAgeCapDays: 365,
    aging: [
      { untilDays: 7, ttlSeconds: 3600 },
      { untilDays: 90, ttlSeconds: 86400 },
      { untilDays: 365, ttlSeconds: 604800 },
    ],
  },
};

export default config;
```

> **📖 For complete configuration documentation, see [Configuration Guide](configuration.md)**

---

## Rendering Context

```ts
{
  site: SsgConfig,
  page: {
    path: string,
    title?: string,
    description?: string,
    tags?: string[],
    order?: number,
    publishedAt?: string,
    ttlSeconds?: number,
    maxAgeCapDays?: number,
    toc?: Array<{ id: string, text: string, level: number }>,
    [custom: string]: any
  },
  nav: {
    tree: NavNode[],
    currentPath: string
  },
  content: string
}
```

---

## NPX Scaffolder (`create-stati`)

### Usage

```bash
npx create-stati@latest my-project -- --template blog
```

### Options

- `--template <blog|docs|news>` (mandatory)
- `--tailwind` → init Tailwind support
- `--sass` → init SCSS support
- `--yes` → skip prompts

### Template Outputs

**Blog**: Posts listing, individual article pages, and RSS feeds
**Docs**: Sidebar navigation layouts with optional table of contents
**News**: Sectioned content listings with tag aggregation and RSS feeds

Each template includes:

- Sample content structure in `site/`
- Layout files (`+layout.eta`) and partials (`_partials/`)
- Stylesheet foundation (`assets/styles.css`)
- Pre-configured `stati.config.ts` with sensible defaults

> **📖 For template structure and organization details, see [Template System](configuration.md#template-system)**

---

## Dev / Build / Preview

- `npm run dev` → starts Vite dev server, site at `/`
- `npm run build` → static export with ISG support, RSS, sitemap
- `npm run preview` → serves `dist/`
