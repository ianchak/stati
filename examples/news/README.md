# Stati News Template

A ready-to-publish news site for [Stati](https://stati.build). Sections, a ranked front page, author pages, topics, RSS feeds, search and search-engine metadata are already wired in, and the sample articles explain how each part works.

## What's included

- **Sections** as folders under `site/news/`, each with its own page (`/news/world`) and RSS feed
- **A front page** ranked by front matter: a lead story (`lead: true`), top stories (`featured: true`), a strip of the latest stories and a column per section, with the newest story as the fallback lead
- **Articles** with a headline, standfirst, byline linking to author pages, published and "Updated" dates, a lead image with caption and credit, reading time, more from the section and related stories
- **Authors** listed once in the config, with an index at `/authors` and a page for each author
- **Topics** from tags, with an index at `/tags` and a page for each topic
- **The latest stream** at `/news`: every story, newest first, grouped by day
- **Pagination** on the latest stream and every section, author and topic page
- **Search** over Stati's built-in search index (`/` or Ctrl/Cmd+K), with no server
- **Feeds**: `/feed.xml` with every story, plus `/feed-<section>.xml` for each section
- **SEO**: `NewsArticle` structured data, Open Graph article tags with section and author, a default link preview card, `sitemap.xml`, a Google News sitemap (`news-sitemap.xml`) and `robots.txt`
- **Drafts** that stay out of the build until you publish them
- **Light and dark themes** following the reader's system setting, with self-hosted Libre Franklin and Source Serif 4
- **A 404 page** that lists the latest stories

## Quick start

1. Set the site's name, tagline and address in `stati.config.js` (or `stati.config.ts`)
2. Replace the sections and authors in the same file
3. Run `npm run dev`
4. Read the sample articles, then replace them with your own in `site/news/<section>/`
5. Edit `site/about.md`

## Writing an article

Create `site/news/world/bridge-reopens.md`:

```markdown
---
title: The bridge reopens after two years of repairs
description: Traffic returns to the river crossing on Monday, three months later than planned.
date: 2026-10-25T09:15:00Z
author: staff-writer
image: /images/news/bridge.jpg
imageAlt: The bridge seen from the riverbank, with scaffolding on one side.
caption: The east span was the last to be finished.
credit: 'Photo: Your Name'
tags: [Transport, Council]
---

The story, in Markdown.
```

It appears on the front page, in its section, on its author's and topics' pages, in the feeds, the sitemaps and search. Add `lead: true` to make it the front page's lead, `featured: true` to put it in the top stories, `updated` when it changes, and `draft: true` to keep it out of the build.

## Adding a section

Create a folder in `site/news/`, such as `site/news/science/`, and add the section to `site.sections` in the config:

```js
{ key: 'science', title: 'Science', description: 'Research, health and the natural world.' },
```

The key is the folder name. The section gets a tab, a page at `/news/science`, a column on the front page and `feed-science.xml`.

## Available scripts

- `npm run dev` - Start the development server
- `npm run build` - Build the site for production
- `npm run build:drafts` - Build including drafts
- `npm run preview` - Preview the built site
- `npm run clean` - Clean build artifacts and the cache

## Directory structure

```
├── helpers/
│   └── news.js           # Front page ranking, bylines, dates, section and author pages,
│                         # NewsArticle metadata, feeds and reading time
├── public/
│   ├── fonts/            # Libre Franklin, Source Serif 4 and their licences
│   ├── images/           # Lead images, the default link preview card, the publisher logo
│   ├── scripts/news.js   # The search dialog
│   ├── favicon.svg
│   └── styles.css        # All styles; colours and fonts at the top
├── site/
│   ├── news/
│   │   ├── index.md      # The latest stream: every story by day
│   │   ├── [section].md  # One page per section
│   │   ├── layout.eta    # Article layout
│   │   └── <section>/    # One folder of articles per section
│   ├── authors/
│   │   ├── index.md      # All authors
│   │   └── [author].md   # One page per author
│   ├── tags/
│   │   ├── index.md      # All topics
│   │   └── [tag].md      # One page per topic
│   ├── partials/         # Nameplate, footer, byline, story teasers, page links, search
│   ├── base.eta          # The page around every layout
│   ├── front.eta         # The front page
│   ├── listing.eta       # Section, author, topic and latest pages
│   ├── layout.eta        # About, 404 and the indexes
│   ├── index.md          # Front page
│   ├── about.md
│   └── 404.md
└── stati.config.js       # Name, sections, authors, feeds, search, sitemap, SEO
```

## How the listings work

Every article lives under `site/news/`, so `site/news/index.md` makes one collection of them all. The front page, the topic pages and the indexes name it with `collection: /news`, and read the articles from `stati.collection`.

- **Section and author pages** come from `collections.generate` in `helpers/news.js`: one entry per section in `site.sections` and per author in `site.authors`, each rendered with `site/news/[section].md` or `site/authors/[author].md`.
- **Topic pages** come from `site/tags/[tag].md`, which Stati turns into one page for every tag.
- **Pages of stories:** `paginate` and `generate.paginate` split long listings into `/page/2` and so on; templates read the current page from `stati.pagination`.

Stati rebuilds the pages that list a story when it is added, moved, retitled, or its standfirst, image, authors, topics, `lead` or `featured` change; `collections.summaryFields` in the config lists the fields that count. After changing `helpers/news.js`, build with `npx stati build --force`.

## Before you deploy

- Set `baseUrl` in the config to your real address; feeds, sitemaps and link previews use it
- Replace `public/favicon.svg`, `public/images/logo.png` (the publisher logo search engines show) and `public/images/social-card.png` (the default link preview), or create the site with image tools to draw a card for every page
- Replace the sample lead images in `public/images/news/` with your own
- Build with `npm run build` and deploy the `dist/` folder to any static host; rebuild when you publish, or on a schedule, to keep the front page date and the Google News sitemap current

Happy publishing!
