# Feature Documentation — Lightweight Static Site Generator STATI v1.0

This document provides an overview of all features included in the **v1.0 release** of the lightweight static site generator (STATI). Each feature is explained briefly with its value and inner workings, offering a complete but concise definition.

---

## 1. Lightweight Build

The STATI is built with **TypeScript** and **Vite**, ensuring fast development and production builds. By relying on Eta for templating and Markdown-It for content parsing, the system avoids heavy React/JSX runtime dependencies.

This lightweight approach translates into shorter build times, reduced bundle sizes, and easier maintainability. Developers can rely on modern tooling while keeping the dependency graph lean.

---

## 2. Filesystem-Driven Content

All content lives inside a `site/` folder, with routes derived directly from the file and folder structure. Markdown and Eta files define pages, while front matter enriches them with metadata like title, description, tags, and publishing date.

This predictable structure lowers the learning curve. Authors don’t need to configure routes manually — what you see in the folder tree is what you get in the site output.

---

## 3. Built-In Local Editor

STATI ships with a **WYSIWYG Markdown editor** available at `/_editor` during development. It includes a file tree, autosave with debounce, front matter editing, and distraction-free mode.

This feature removes the need for third-party CMS solutions for local editing. Authors can create, rename, or delete files directly from the browser while previewing changes in real time.

---

## 4. Layout System

Layouts can be nested and overridden at any directory level using `+layout.eta`. Partials like headers, footers, or navbars can be reused across the site, while widgets allow injecting lists of posts or tagged content.

This design encourages modularity. Authors can keep templates DRY, define global structures once, and tailor child pages or sections with minimal repetition.

---

## 5. Incremental Static Generation (ISG)

ISG minimizes unnecessary rebuilds. By default, if a cache exists, only changed or invalidated pages rebuild. Pages can also be set to expire via TTL (time-to-live), with a maximum age cap preventing old content from endless revalidation.

Per-page overrides let authors configure custom `ttlSeconds`, `maxAgeCapDays`, and tags. CLI flags allow targeted invalidation (`--invalidateTag`, `--invalidatePath`) or forcing full rebuilds. This makes large sites efficient to maintain.

---

## 6. Templates for Blogs, Docs, and News

The generator ships with **ready-made templates** for common site types:

- **Blog**: index, posts, RSS feeds.
- **Docs**: sidebar navigation, ToC support, multi-column layouts.
- **News**: front-page aggregation, tag-based sections, RSS.

These templates make it possible to scaffold a working site in minutes, while remaining customizable via layouts and CSS.

---

## 7. Markdown Pipeline

Markdown is processed with **Markdown-It** and useful default plugins like anchors, task lists, and external links. The user has the option to add other markdown plugins too.

This provides authors with a balance of simplicity and power. Content can stay Markdown-first, while optional syntax expansions enable richer documents when needed.

---

## 8. NPX Scaffolder

The `create-stati` command scaffolds new projects with a chosen template (`blog`, `docs`, `news`). Options include initializing Tailwind support, adding SCSS support.

This reduces onboarding friction. New users can bootstrap a project with sensible defaults, ready-to-use layouts, and example content.

---

## 9. Image Optimization Pipeline

The build pipeline processes images into multiple formats (e.g., WebP, JPEG) and sizes, emitting responsive `srcset` attributes. It also compresses files for performance.

This ensures high Lighthouse scores and fast loading times without requiring external tools. Developers can use a helper function to generate `<img>` tags with optimized variants automatically.

---

## 10. CSS/JS Bundling and Minification

Thanks to Vite, CSS and JS files are automatically bundled and minified for production. Authors can drop raw CSS/JS in the project, and the pipeline ensures optimized delivery.

This avoids manual configuration and guarantees that shipped assets are small and cache-friendly.

---

## 11. Draft Mode

Pages can be marked with `draft: true` in front matter. Drafts are excluded from builds by default. Use `stati build --include-drafts` to include draft pages in the build.

This lets authors work on unfinished content without accidentally publishing it. Drafts can be included when needed for review or testing purposes.

---

## 12. Search Index Generator (Opt-In)

The generator can optionally build a JSON search index compatible with client-side libraries like Lunr.js or MiniSearch. It includes page titles, descriptions, and tags.

This feature is off by default to keep the core lightweight. Developers who want in-site search can enable it with minimal setup.

---

## 13. Plugin System and Hooks

A plugin API allows developers to hook into build stages. For example, custom plugins can modify Markdown output, add extra data sources, or transform final HTML.

This makes the STATI extensible and community-friendly. Third-party plugins can expand the ecosystem without bloating the core.

---

## 14. Deploy Adapters

Pre-configured adapters make it trivial to deploy to **Netlify**, **Vercel**, or **Cloudflare Pages**. These adapters configure redirects, headers, and caching automatically.

This reduces trial-and-error for new users. A single command can publish the site with best-practice defaults on popular hosts.

---

## 15. Live Reload and HMR for Content

During development, content and template changes instantly update in the browser without a full rebuild. Markdown edits refresh the preview, and style changes apply live.

This improves developer experience (DX), keeping iteration loops short and fluid.

---

## 16. Theming System with Tailwind Support

A theming system is available with configurable CSS variables and optional **Tailwind CSS** integration. When chosen, the scaffolder sets up Tailwind with a preconfigured config file.

This gives authors flexibility: lightweight vanilla CSS for simple sites, or Tailwind for rapid prototyping and utility-based styling.

---

## 17. Default SEO Meta Tags

If front matter provides standard fields (`title`, `description`, `image`), the STATI injects SEO tags including Open Graph and Twitter cards. Behavior is configurable in `stati.config.ts`.

This improves out-of-the-box SEO and social media previews without requiring additional setup. Developers can override or disable auto-generated tags.

---

## 18. Sitemap.xml Generator

The build process generates a `sitemap.xml` file including all public routes. It respects exclusions (`hidden: true`, drafts) and supports custom priority/changefreq values.

Search engines use sitemaps to discover content efficiently. This ensures the site is crawlable and indexed correctly.

---

## 19. Asset Hashing and Cache Busting

Static assets like CSS, JS, and images are emitted with content hashes in their filenames (e.g., `style.abc123.css`). References in HTML are updated automatically.

This makes deploys cache-safe. Browsers can cache assets indefinitely, and new builds will always fetch fresh versions when content changes.

---

## 20. Dev / Build / Preview Commands

Standard scripts provide a smooth workflow:

- `npm run dev` starts the dev server with live reload and editor.
- `npm run build` produces optimized static output with ISG, RSS, and sitemap.
- `npm run preview` serves the final output from `dist/`.

These commands keep development, testing, and deployment consistent across projects.

---
