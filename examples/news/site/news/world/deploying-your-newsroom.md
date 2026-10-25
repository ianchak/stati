---
title: 'From laptop to front page: deploying your newsroom'
description: The build is a folder of plain files. Any static host can serve it; a rebuild when you publish keeps the front page and the sitemaps fresh.
date: 2026-10-20T14:00:00Z
author: staff-writer
image: /images/news/deploying.png
imageAlt: A laptop with an arrow rising from it to a stack of three servers.
caption: Build once, upload the folder, repeat when there is news.
credit: 'Illustration: Stati News'
tags: [Publishing]
---

A news site built with Stati has no server to run. `npm run build` writes the whole site to `dist/`: HTML pages, the stylesheet, fonts, images, feeds, sitemaps and the search index. Upload that folder to any static host.

## Before the first deploy

Set `site.baseUrl` in `stati.config.js` to the address of the site, such as `https://news.example.org`. Feeds, sitemaps, canonical links and link previews use it.

If the site lives in a folder of a domain, such as `https://example.org/news-site`, put the folder in `baseUrl` too. Stati then serves and links every page under that folder.

## Hosts

Any host that serves static files works. The build command is `npm run build` and the folder to publish is `dist`:

- **Netlify, Vercel, Cloudflare Pages:** connect the repository and set those two values.
- **GitHub Pages:** build in a GitHub Actions workflow and publish `dist` as the Pages artifact.
- **Your own server:** copy `dist/` to the folder your web server serves.

Most hosts serve `404.html` for addresses that do not exist; the starter's 404 page lists the latest stories.

## Rebuild when there is news

A static site changes when it is rebuilt. With a host that builds from your repository, every commit publishes. Two things also depend on time:

- the date line in the nameplate shows the date of the newest story;
- the Google News sitemap lists the stories of the last two days.

A scheduled build, for example once an hour from a CI workflow, keeps both current on quiet days. Builds are quick because Stati reuses every page that did not change.

## Preview before you publish

`npm run preview` serves the built `dist/` folder on your machine, exactly as a host would. `npm run build:drafts` builds with drafts included, to check a story in place before it goes live.
