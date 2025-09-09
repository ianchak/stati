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

## 3. Flexible Layout System

Stati's template system is co-located with content in the `site/` directory with intelligent organization rules and hierarchical inheritance.

> **📖 For complete template system documentation including placement rules and resolution order, see [Template System](configuration.md#template-system)**

**Key Features:**

- **Hierarchical layouts**: `layout.eta` files cascade through directories
- **Named templates**: Content-type specific templates (e.g., `post.eta`, `article.eta`)
- **Underscore folders**: Any folder starting with `_` is excluded from routing, perfect for partials and components
- **Auto-discovery**: Partials are automatically available to templates in their hierarchy
- **Flexible placement**: Templates can be placed anywhere while maintaining clear organizational boundaries

---

## 4. Incremental Static Generation (ISG)

ISG minimizes unnecessary rebuilds. By default, if a cache exists, only changed or invalidated pages rebuild. Pages can also be set to expire via TTL (time-to-live), with a maximum age cap preventing old content from endless revalidation.

Per-page overrides let authors configure custom `ttlSeconds`, `maxAgeCapDays`, and tags. The `stati invalidate` command allows targeted invalidation by tag or path, and build flags allow forcing full rebuilds. This makes large sites efficient to maintain.

> **📖 For ISG configuration options, see [Configuration Guide](configuration.md#incremental-static-generation-isg)**
> **📖 For CLI commands, see [CLI Reference](configuration.md#cli-reference)**

---

## 5. Development Server with Live Reload

Stati includes a fully-featured development server that serves your built site locally with automatic live reload functionality. The dev server watches for changes in your `site/` and `public/` directories and automatically rebuilds and refreshes the browser.

**Key Features:**

- **HTTP Server**: Serves the built site from the `dist/` directory
- **File Watching**: Monitors source files for changes with intelligent debouncing
- **Live Reload**: WebSocket-based browser refresh on file changes
- **Auto-injection**: Live reload script automatically injected into HTML pages
- **Incremental Rebuilds**: Fast updates using the existing build system
- **Configurable**: Port, host, auto-open browser, and custom config file support

The development server provides a smooth developer experience with instant feedback as you work on your site.

> **📖 For development server configuration, see [Configuration Guide](configuration.md#development-server)**
> **📖 For CLI usage examples, see [CLI Reference](configuration.md#cli-reference)**

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

> **📖 For Markdown configuration options, see [Configuration Guide](configuration.md#markdown-configuration)**

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

The generator includes **CSS and JavaScript bundling**, with minification for production builds. It can optionally set up PostCSS with Tailwind if requested via the scaffolder.

This removes the need for external build tools in simple cases. Developers can rely on the generator for asset compilation, while complex projects can opt out and use their own toolchain.

---

## 11. Draft Mode

Pages can be marked with `draft: true` in front matter. Drafts are excluded from builds by default.

This lets authors work on unfinished content without accidentally publishing it. Drafts can be included when needed for review or testing purposes.

> **📖 For CLI options to include drafts, see [CLI Reference](configuration.md#cli-reference)**

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

## 15. Theming System with Tailwind Support

A theming system is available with configurable CSS variables and optional **Tailwind CSS** integration. When chosen, the scaffolder sets up Tailwind with a preconfigured config file.

This gives authors flexibility: lightweight vanilla CSS for simple sites, or Tailwind for rapid prototyping and utility-based styling.

---

## 16. Default SEO Meta Tags

If front matter provides standard fields (`title`, `description`, `image`), the STATI injects SEO tags including Open Graph and Twitter cards. Behavior is configurable in `stati.config.ts`.

This improves out-of-the-box SEO and social media previews without requiring additional setup. Developers can override or disable auto-generated tags.

> **📖 For site metadata configuration, see [Configuration Guide](configuration.md#site-configuration)**

---

## 17. Sitemap.xml Generator

The build process generates a `sitemap.xml` file including all public routes. It respects exclusions (`hidden: true`, drafts) and supports custom priority/changefreq values.

Search engines use sitemaps to discover content efficiently. This ensures the site is crawlable and indexed correctly.

---

## 18. Asset Hashing and Cache Busting

Static assets like CSS, JS, and images are emitted with content hashes in their filenames (e.g., `style.abc123.css`). References in HTML are updated automatically.

This makes deploys cache-safe. Browsers can cache assets indefinitely, and new builds will always fetch fresh versions when content changes.

---

## 19. Build Statistics and Performance Metrics

Stati provides detailed build statistics to help developers monitor and optimize their site generation process. After each build, comprehensive metrics are displayed showing performance insights.

**Build Statistics Include:**

- **Build time**: Total time taken to process all content and generate the site
- **Pages built**: Number of content pages processed and rendered
- **Assets copied**: Count of static files copied from the public directory
- **Output size**: Total size of the generated site in the output directory
- **Cache performance**: Hit rate and efficiency metrics (when ISG caching is enabled)

**Example Output:**

```
📊 Build Statistics:
  ⏱️  Build time: 2.15s
  📄 Pages built: 23
  📦 Assets copied: 12
  💾 Output size: 1.2 MB
  🎯 Cache hits: 15/18 (83.3%)
```

These metrics help identify performance bottlenecks, track site growth over time, and validate that caching strategies are working effectively. The statistics are also returned programmatically when using Stati as a library.

---

## 20. Dev / Build / Preview Commands

Standard scripts provide a smooth workflow:

- `npm run dev` starts the dev server with live reload and editor.
- `npm run build` produces optimized static output with ISG, RSS, and sitemap.
- `npm run preview` serves the final output from `dist/`.

These commands keep development, testing, and deployment consistent across projects.

---
