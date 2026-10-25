---
title: What Stati rebuilds when a story changes
description: A newsroom publishes all day. Stati keeps every build small by rebuilding only the pages a change reaches.
date: 2026-10-18T10:30:00Z
author: staff-writer
image: /images/news/rebuilds.png
imageAlt: A grid of page tiles, three of them green with a circular arrow, the rest grey.
caption: Only the pages a change reaches are built again.
credit: 'Illustration: Stati News'
tags: [Publishing]
---

Stati keeps a cache of every page it builds, in the `.stati/` folder. On the next build it renders only the pages whose inputs changed and copies the rest from the cache. On a news site, where most builds add or fix one story, that keeps builds quick however large the archive grows.

## Fixing a typo

Change a word in the body of a story, and the listings don't need it: they show the headline, standfirst and byline, not the body. Only the reading time can change them, when an edit adds or removes enough words.

The search index does need it. It holds the text of every story, and its file name changes with its content, so after a text edit every page links a new index and is written again. On a site of this size that takes well under a second. A site without search (`search: { enabled: false }` in `stati.config.js`) rebuilds only the edited story.

## Adding, moving or retitling a story

A new story changes what the listings show, so Stati rebuilds the pages that list it:

- the front page and the latest stream;
- the page of its section, or of both sections when it moves;
- the pages of its authors and its topics;
- the other stories, whose "More in" rail and related stories may now include it.

The same happens when a story's headline, standfirst, image, authors, topics, `lead` or `featured` change. The fields that count are listed under `collections.summaryFields` in `stati.config.js`; add any field your listings start to show.

## Changing a template

Edit a template in `site/` and Stati rebuilds the pages that use it. A change to `site/partials/byline.eta` rebuilds every page with a byline; a change to `site/front.eta` rebuilds the front page only.

## Changing the config or the helpers

`stati.config.js` and `helpers/news.js` are code that Stati runs, not templates it reads. After changing the ranking in `frontPage()` or the date formats, run a full build so every page picks up the change:

```bash
npx stati build --force
```

`npm run clean` empties the cache and the `dist/` folder, for a build from scratch.

## Feeds and sitemaps

The RSS feeds, `sitemap.xml`, `news-sitemap.xml` and the search index are written fresh on every build, so they always match the stories on disk.
