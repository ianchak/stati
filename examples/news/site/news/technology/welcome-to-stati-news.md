---
title: 'Stati News is live: here is how this newsroom is put together'
description: Sections, a ranked front page, author pages, feeds and search all come from plain Stati features. This story walks through each part, then shows you where to make it yours.
date: 2026-10-25T14:05:00Z
author: your-name
image: /images/news/welcome.png
imageAlt: A front page drawn as blocks, with a large green lead story and smaller stories in columns beside and below it.
caption: Every page of the site starts as a Markdown file and a template.
credit: 'Illustration: Stati News'
tags: [Guides, Getting started]
lead: true
---

This site is a starter: a complete newsroom you can rename, fill with your own stories and publish today. Everything you see, from the front page to the feeds, is built by [Stati](https://stati.build) from the Markdown files in `site/` and the settings in `stati.config.js`. Nothing runs on a server; `npm run build` writes plain HTML to `dist/`.

The stories on the front page explain the starter itself. Read them in any order, then replace them with your own.

## Where everything lives

```text
site/
├── index.md            # The front page
├── news/
│   ├── index.md        # Every story, newest first: /news
│   ├── [section].md    # One page per section: /news/world...
│   ├── layout.eta      # The article page
│   ├── world/          # One folder of articles per section
│   └── technology/
├── authors/            # The author index and one page per author
├── tags/               # The topic index and one page per topic
└── partials/           # The nameplate, bylines, story teasers, search
stati.config.js         # Name, sections, authors, feeds, SEO
helpers/news.js         # Ranking, bylines, dates and metadata
public/styles.css       # Colours, fonts and layout
```

## The parts of the site

- **Sections.** Each section is a folder in `site/news/` and one line in `stati.config.js`. [Adding a section](/news/world/adding-a-section) takes a minute.
- **The front page** puts a lead story first, then the top stories, then the newest stories of every section. You choose the lead with front matter; [how the front page decides](/news/politics/how-the-front-page-picks-its-lead) explains the rules.
- **Articles** have a headline, a standfirst, a byline, a lead image with a caption and a credit, and a reading time. [Writing an article](/news/technology/writing-an-article) lists every front matter field.
- **Authors** are listed once in the config, and each one gets a page. See [authors and bylines](/news/culture/authors-and-bylines).
- **Topics, search and the latest stream** help readers find older stories: see [how readers find stories](/news/politics/topics-search-and-the-latest-stream).
- **Feeds and search engines.** There is an RSS feed for the whole site and [one for every section](/news/business/feeds-for-every-section), plus a sitemap, a Google News sitemap and `NewsArticle` metadata on every story, covered in [search engines and Google News](/news/business/search-engines-and-google-news).

## Your first hour

1. Run `npm run dev` and open the address it prints.
2. Change `site.title`, `site.description` and `site.tagline` in `stati.config.js`.
3. Replace the authors with your newsroom, and the sections with the ones you cover.
4. Delete the sample stories in `site/news/` and write your first one.
5. Pick your colours and fonts: [make it yours](/news/culture/make-it-yours) shows where.
6. Set `site.baseUrl` to your address and [deploy](/news/world/deploying-your-newsroom).

Stati rebuilds only what changed. When you add a story, it updates the front page, its section, its author, its topics and the feeds, and leaves the rest of the site alone.
