---
title: 'Introduction'
description: 'What Stati is, what a minimal site looks like, and what sets it apart from other static site generators.'
order: 1
seo:
  title: 'Introduction to Stati'
  structuredData:
    "@context": "https://schema.org"
    "@type": "TechArticle"
    "headline": "Getting Started with Stati"
    "description": "What Stati is, what a minimal site looks like, and what sets it apart from other static site generators."
    "about":
      - "static site generator"
      - "TypeScript"
      - "esbuild"
      - "file-based routing"
    "proficiencyLevel": "Beginner"
---

# Introduction

**Stati** is an open-source, TypeScript-first static site generator for documentation, blogs, and content-heavy websites. You write pages in Markdown and layouts in Eta templates; Stati turns them into plain static HTML.

## A site in two files

A page is a Markdown file with front matter:

```markdown
---
title: Hello, Stati
---

# Hello, Stati

This page becomes `/hello`.
```

Install Stati with `npm install -D @stati/cli @stati/core`, save the page as `site/hello.md` and the layout below as `site/layout.eta`, then run `npx stati build`. The output in `dist/` is static HTML with no client-side framework.

```eta
<!doctype html>
<html lang="en">
  <head><title><%= stati.page.title %></title></head>
  <body><%~ stati.content %></body>
</html>
```

## What makes Stati different?

- **Small and simple**: Markdown plus Eta templates, nine runtime dependencies in `@stati/core`, and no framework runtime in the browser.
- **TypeScript-first**: `defineConfig()` gives you a typed `stati.config.ts`, and client-side TypeScript is compiled with esbuild and injected only on the pages that need it.
- **Incremental Static Generation**: a build cache that rebuilds a listing when a post it lists is added, removed or retitled, removes the pages of deleted posts, and supports TTLs, age-based aging rules and invalidation by tag, path or age (`stati invalidate "tag:news"`).
- **Collections**: folder listings sorted by date and grouped by tag, split into pages with `paginate`, and one page per tag or author from a `[tag].md` template.
- **Built in, not bolted on**: search index, sitemap, robots.txt, RSS feeds, SEO metadata, sized and lazy-loaded images, build hooks and build metrics ship with Stati. The optional `@stati/images` package adds responsive AVIF and WebP images and an Open Graph image for every page.
- **Fast feedback**: a dev server with live reload, incremental rebuilds and an in-browser error overlay.
