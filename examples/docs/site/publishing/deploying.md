---
title: Deploying
description: Build the site and publish it on any static host.
order: 2
---

## Before you deploy

- Set `baseUrl` in `stati.config.js` to the address the site will live at, without a trailing slash
- Replace `public/favicon.svg` and `public/images/social-card.png`
- Replace or delete these sample pages
- Run `npm run build` and `npm run preview`, then click through the result

## Build

```bash
npm run build
```

The whole site is in `dist/`: HTML pages, styles, the search index, the sitemap and `robots.txt`. Upload that folder to any host that serves static files. There is no server to run.

## Hosting settings

Most hosts detect the settings, but if yours asks:

| Setting          | Value           |
| ---------------- | --------------- |
| Build command    | `npm run build` |
| Output directory | `dist`          |
| Node.js version  | 22 or newer     |

## Netlify, Vercel and Cloudflare Pages

Connect your repository, use the settings above, and every push to your main branch publishes the site. Pull requests get preview deployments.

## GitHub Pages

Add `.github/workflows/deploy.yml` to your repository:

```yaml
name: Deploy docs
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
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
      - id: deployment
        uses: actions/deploy-pages@v4
```

Then choose **GitHub Actions** as the source under **Settings → Pages**. If the site lives at `https://your-name.github.io/your-project`, serve it from a custom domain or a user site instead: the template's links start at `/`, which points at the domain root.

## The 404 page

`site/404.md` builds to `dist/404.html`. Netlify, Cloudflare Pages and GitHub Pages serve it for unknown addresses on their own; on other hosts, set it as the error page.
