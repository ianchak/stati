---
title: Welcome
description: A minimal Stati site
---

# Welcome to your Stati site

This page is `site/index.md`. Change it, save, and the dev server reloads your browser.

## Get started

1. **Write content.** Every Markdown file in `site/` becomes a page, so `site/about.md` is served at `/about`.
2. **Shape the HTML.** `site/layout.eta` wraps every page. Edit it to change the header, footer and `<head>`.
3. **Make it yours.** Colors and fonts are custom properties at the top of the stylesheet.
4. **Configure the site.** Set the title, `baseUrl` and features like the sitemap or RSS in `stati.config.ts` (or `stati.config.js`).

```bash
npm run dev      # dev server
npm run build    # build into dist/
npm run preview  # serve dist/
```

## Learn more

- [Templates](https://stati.build/core-concepts/templates): layouts, partials and template helpers.
- [Markdown](https://stati.build/core-concepts/markdown): front matter, plugins and content authoring.
- [Configuration](https://stati.build/configuration/file): SEO, sitemap, RSS, search and the rest of `stati.config`.
