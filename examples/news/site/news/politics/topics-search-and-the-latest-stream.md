---
title: Topics, search and the latest stream help readers find older stories
description: A story falls off the front page within a day. Topic pages, search and a stream of every story keep it findable.
date: 2026-10-19T12:00:00Z
author: guest-writer
image: /images/news/finding-stories.png
imageAlt: A magnifying glass over rows of headlines, two of them highlighted in green.
caption: Topics cut across sections; search reaches every story.
credit: 'Illustration: Stati News'
tags: [Search, Topics, Guides]
---

The front page shows today. Readers who arrive later, or want everything on one subject, need other ways in.

## Topics

Sections say where a story belongs; topics say what it is about, across sections. A story about a new bus route might sit in Politics and carry the topics Transport and Council. List them under `tags` in the front matter:

```yaml
tags: [Transport, Council]
```

Every topic gets a page, such as `/tags/transport`, with its stories newest first, twelve to a page. Stati makes those pages from one template, `site/tags/[tag].md`, and deletes a topic's page when the last story drops the topic. The [topics index](/tags) lists them all, with how many stories each has. Stories show their topics at the end, and related stories are the ones that share the most topics, from the same section first.

## Search

The Search button in the section tabs opens a search box; so do `/` and `Ctrl K` (`⌘ K` on a Mac). It searches the headline, standfirst and text of every story, and works without a server: Stati writes a search index at build time, and the browser loads it the first time someone searches.

Search is set up in `stati.config.js` (`search: { enabled: true }`), and the search box is `site/partials/search.eta` with `public/scripts/news.js`. Without JavaScript the button stays hidden and the rest of the site works as before.

## The latest stream

[Every story](/news) lists the whole site, newest first, grouped by day, eight to a page. It is the page to bookmark for readers who check in once a day, and it has its own RSS feed.

## Section, author and topic pages

All of these show twelve stories to a page, with numbered links between the pages. The page size is the `generate.paginate` value at the top of `site/news/[section].md`, `site/authors/[author].md` and `site/tags/[tag].md`, and `paginate` in `site/news/index.md` for the latest stream.
