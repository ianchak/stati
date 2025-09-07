# Lightweight Static Site Generator with Built-In Editor Concept

## Vision

The project is a **lightweight static site generator (SSG)** built with **TypeScript** and **Vite**. Its purpose is to make building content-driven websites fast and simple.

Long term, the generator should provide ready-made templates for:

- Blogs
- Documentation
- News sites

It should also support RSS feeds, sitemaps, and incremental static generation (ISG) at build time.

This SSG is meant to be **distributed as an npm package**, with an **NPX scaffolder (**``**\*\*\*\*)** for easy bootstrapping of new projects.

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
   - `--force` triggers full rebuild and reseeds cache.
   - `--clean` wipes cache before building.
   - TTL with cap (“freeze”): pages revalidate by TTL until max-age is reached (then freeze).
   - Aging schedule: staged TTLs by content age (e.g., hourly in week 1, daily until 90d, weekly to 1y).
   - Per-page overrides: `ttlSeconds`, `maxAgeCapDays`, `tags`, `publishedAt` in front matter.
   - Dirty detection: rebuild if inputs changed, TTL expired, tag/path invalidated, or `--force` used.
   - Manifest stores metadata: deps, lastBuiltAt, publishedAt, TTL, tags, artifact paths.
   - CLI supports `--invalidateTag` and `--invalidatePath` for targeted rebuilds.
   - Global switch: renderer version bump invalidates cache globally.

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

- **Nested layouts**: `+layout.eta` at any level applies to children, cascades until overridden.
- **Navbar partial**: included in all templates (`partials/navbar.eta`).
- **Widgets**: layout can render dynamic lists (e.g., recent posts, tagged articles).

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

```ts
export default defineConfig({
  title: 'My Site',
  baseUrl: 'https://example.com',
  outDir: 'dist',
  markdown: {
    plugins: [
      'anchor',
      'task-lists',
      ['external-links', { externalTarget: '_blank', externalRel: 'noopener noreferrer' }],
    ],
  },
  isg: {
    defaultTtlSeconds: 3600,
    maxAgeCapDays: 365,
    agingSchedule: [
      { untilDays: 7, ttlSeconds: 3600 },
      { untilDays: 90, ttlSeconds: 86400 },
      { untilDays: 365, ttlSeconds: 604800 },
    ],
  },
});
```

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

- **Blog**: posts list + article pages + RSS
- **Docs**: sidebar docs layouts
- **News**: sectioned content lists + RSS

Each template includes:

- `site/` with sample content
- `site/partials/navbar.eta`
- `assets/styles.css`
- `stati.config.ts` with defaults

---

## Dev / Build / Preview

- `npm run dev` → starts Vite dev server, site at `/`
- `npm run build` → static export with ISG support, RSS, sitemap
- `npm run preview` → serves `dist/`
