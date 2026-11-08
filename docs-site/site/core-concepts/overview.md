---
title: 'Overview'
description: 'Understand the fundamental concepts that power Stati.'
order: 1
seo:
  title: 'Stati core concepts'
  structuredData:
    "@context": "https://schema.org"
    "@type": "TechArticle"
    "headline": "Core Concepts in Stati"
    "description": "Understand the fundamental concepts that power Stati, including routing, templates, Markdown, and ISG."
    "about":
      - "routing"
      - "templates"
      - "Markdown"
      - "ISG"
    "proficiencyLevel": "Beginner"
---

# Overview

- **[Routing](/core-concepts/routing)** - The path of each Markdown file in `site/` is its URL
- **[Templates and layouts](/core-concepts/templates)** - Eta layouts chosen by folder, which replace the layouts above them
- **[Collections and generated pages](/core-concepts/collections)** - Listings, pagination and one page per tag
- **[Markdown pipeline](/core-concepts/markdown)** - markdown-it with heading anchors, image sizes and your own plugins
- **[Incremental Static Generation](/core-concepts/isg)** - Pages render again only when their inputs change
- **[Static assets](/core-concepts/static-assets)** - Copying `public/`, client TypeScript bundles and stylesheets

## How a build works

1. **Content.** Each Markdown file in `site/` is a page with YAML front matter, and its path is its URL.
2. **Templates.** Eta layouts, chosen by folder or by the page's `layout`, render each page, with includes, shared shells, helpers and collections.
3. **Assets.** Stati copies `staticDir` (`public/`) into the output folder, bundles client TypeScript when `typescript.enabled` is set, and runs Tailwind CSS when `stati dev` and `stati build` get `--tailwind-input` and `--tailwind-output` (see [CSS](/configuration/css)). Other preprocessors, such as Sass, run from your own scripts. Production builds link stylesheets under names that change with their content.
4. **Caching.** A page renders again when its content, a template it rendered, an image it shows or data it read changes, or when its TTL runs out; other pages come from the cache.
5. **Output.** The result is static HTML in `dist/` that any static host can serve.
