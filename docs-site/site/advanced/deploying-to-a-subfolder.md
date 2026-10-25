---
title: 'Deploying to a subfolder'
description: 'Build a Stati site for a path such as example.com/docs or user.github.io/repo, with the base path taken from site.baseUrl.'
order: 7
---

# Deploying to a subfolder

A site does not have to live at the root of a host. A GitHub Pages project site is served from `https://user.github.io/repo/`, a documentation site from `https://example.com/docs/`, and a reverse proxy can map any path to a site. Stati builds a site for such a path from one setting: the path in `site.baseUrl`.

## Set the base URL

Put the full address of the site, path included, in `site.baseUrl`:

```javascript
// stati.config.js
import { defineConfig } from '@stati/core';

export default defineConfig({
  site: {
    title: 'My Project',
    baseUrl: 'https://user.github.io/repo',
  },
});
```

The path of `baseUrl` is the **base path**: `/repo` here. A trailing slash does not matter. A `baseUrl` without a path, or with `/`, has no base path, and the site builds exactly as before.

There is no second setting to keep in step with `baseUrl`. Moving a site to a subfolder changes this one value: content, front matter, URL patterns in the config (`seo.articles`, `rss.contentPatterns`, `sitemap.priorityRules`, bundle `include` and `exclude`) and the ISG cache keys all stay relative to the site root, like `/posts/hello`.

## Link with `stati.url()`

Stati cannot know which `href` and `src` values in your templates mean the site, so templates add the base path themselves with [`stati.url()`](/api/templates#stati-url-path):

```eta
<link rel="icon" href="<%= stati.url('/favicon.svg') %>">

<nav>
  <a href="<%= stati.url('/') %>">Home</a>
  <% for (const item of stati.nav.getTree()) { %>
    <a href="<%= stati.url(item.url) %>"><%= item.title %></a>
  <% } %>
</nav>
```

`stati.url()` adds the base path to a path that starts with `/`. Absolute URLs, `//` URLs, `#hash` and `?query` values, relative paths and paths that already start with the base path are left alone, so calling it twice is harmless. Without a base path it returns the path unchanged.

`page.url`, navigation `url`s, collection entries and pagination URLs are always relative to the site root. Wrap them in `stati.url()` where you print them as a link.

## What Stati prefixes for you

| Output | With `baseUrl: 'https://example.com/docs'` |
|---|---|
| Bundle `<script>` tags (`typescript.autoInject`) | `/docs/_assets/main-A1B2C3D4.js` |
| The stylesheet links Stati hashes and the Tailwind stylesheet it adds, including links on cached pages it updates, and the relative `url()`s inside the hashed copies | `/docs/_assets/styles-A1B2C3D4.css` |
| The search index `<meta name="stati:search-index">` | `/docs/search-index-a1b2c3d4.json` |
| `stati.image()` and Markdown images, responsive variants and copies of co-located images | `/docs/_img/hero-1a2b3c4d-960.webp` |
| Root-absolute `href` and `src` in Markdown (`[Tags](/tags)`, `![Logo](/logo.png)`) | `/docs/tags`, `/docs/logo.png` |
| Canonical links, Open Graph images, the sitemap, RSS links and the `Sitemap:` line of `robots.txt` | `https://example.com/docs/…` (these always followed `baseUrl`) |

Relative links, absolute URLs, `#hash` links and `mailto:` links in Markdown are left alone. Raw HTML in Markdown is not changed; write `<a href="/docs/tags">` there yourself or use a Markdown link.

Some values stay relative to the site root, because they are data and not links: the `url` of each search index entry, `stati.assets.bundlePaths`, `stati.assets.stylesheetPaths`, `stati.assets.searchIndexPath` and `stati.ogImage.path`. Print them with `stati.url()`. Client-side code that builds links from the search index needs the base path too; a template can hand it over:

```eta
<body data-base-path="<%= stati.url('/') %>">
```

Stylesheets are not rewritten, except that the hashed copies Stati writes keep their relative `url()`s and `@import`s working: a reference such as `url(fonts/inter.woff2)` in `public/styles.css` becomes `url(/docs/fonts/inter.woff2)` in the copy under `_assets/`. A root-absolute `url(/fonts/inter.woff2)` is left as written and does not know the base path, so use relative URLs in CSS.

## Output

`dist/` holds the site at its root, with or without a base path: `dist/index.html`, `dist/_assets/…`. The host, or a parent build that copies `dist/` into a folder of a bigger site, puts it under the subfolder. Nothing in `dist/` is nested in a `docs/` folder.

## Development and preview

`stati dev` and `stati preview` serve the site under the base path, so links behave as they will in production. The printed address includes it (`http://localhost:3000/docs/`), `/` and `/docs` redirect to `/docs/`, and any other URL outside the base path is a 404. Live reload keeps working: the `/__ws` socket stays at the server's root.

## Missed links

After a build with a base path, Stati warns about each `href` or `src` in a page it rendered that starts with `/` but not with the base path, naming the first page it appears on and the attribute:

```text
/ and 12 more page(s): href="/about" does not start with the base path /docs, so it breaks when the site is served from there. Use stati.url("/about").
```

A template that skips `stati.url()` shows up in the build log instead of as a 404 in production. Pages served from the ISG cache are not checked again; run `stati build --force` to check them all. There are no warnings without a base path.

## robots.txt

Crawlers read `robots.txt` only at the root of a host, so they ignore one under `/docs/`. Stati still writes it, with the base path in the `Sitemap:` URL, and logs a note. Serve a copy at the root of the host as well; its `Allow` and `Disallow` paths are matched against full URLs there, so include the base path in them.

## Caching

The base path is part of what Stati checks before it reuses a page. Builds with the same base path reuse cached pages as usual; changing the path in `baseUrl` rebuilds every page.

## GitHub Pages project site

A project site is served from `https://<user>.github.io/<repo>/`. Set `baseUrl` to that address and deploy `dist/`:

```javascript
export default defineConfig({
  site: {
    title: 'My Project',
    baseUrl: 'https://my-user.github.io/my-repo',
  },
});
```

```yaml
# .github/workflows/pages.yml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
permissions:
  contents: read
  pages: write
  id-token: write
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm ci
      - run: npx stati build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
      - id: deployment
        uses: actions/deploy-pages@v4
```

A site on a custom domain, or a user site at `https://my-user.github.io/`, has no path and needs none of this.

## Related documentation

- [`stati.url()`](/api/templates#stati-url-path)
- [Site metadata](/configuration/site-metadata#baseurl-required)
- [Development server](/cli/development)
