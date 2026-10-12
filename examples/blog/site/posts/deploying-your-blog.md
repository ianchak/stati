---
title: Deploying your blog
description: Build the site into plain files and put it on any static host, with clean links and a working 404 page.
publishedAt: '2026-09-12'
tags: ['publishing']
---

A production build turns the blog into plain files in `dist/`: HTML pages, the stylesheet, fonts, images, the feed and the sitemap. Any host that serves files can serve it.

## Build and check

```bash
npm run build
npm run preview
```

`preview` serves `dist/` exactly as a host would. Click around, open `/feed.xml` and `/sitemap.xml`, and visit a link that does not exist to see the 404 page.

Before the first deploy, set `baseUrl` in `stati.config.js` to the address the blog will live at. Feeds and link previews use it.

## Choosing a host

Netlify, Cloudflare Pages, Vercel and GitHub Pages all host static sites for free and rebuild them when you push to Git. For each, the settings are the same:

| Setting          | Value           |
| ---------------- | --------------- |
| Build command    | `npm run build` |
| Output directory | `dist`          |
| Node.js version  | 22 or newer     |

## Clean links

Posts are written as `dist/posts/writing-your-first-post.html` and linked without the `.html`. Netlify, Cloudflare Pages and Vercel serve those links by default; GitHub Pages does too. If your host shows a 404 for every post, look for its "pretty URLs" or "clean URLs" option.

## The 404 page

`site/404.md` builds `dist/404.html`, which most static hosts show automatically for missing pages. It lists your latest posts so a lost reader has somewhere to go.

## Publishing new posts

Write the post, commit, push. The host rebuilds the site and the new post appears on the home page, the archive, its tags and the feed.
