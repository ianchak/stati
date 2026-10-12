# Stati Blog Template

A ready-to-write blog for [Stati](https://stati.build). Posts, tags, a yearly archive, an RSS feed, a sitemap and search-engine metadata are already wired in, and the sample posts explain how each part works.

## What's included

- **Posts** in Markdown under `site/posts/`, listed newest first on the home page
- **Tags** collected on `/tags`, with every post under each tag
- **A yearly archive** at `/archive`
- **Newer, older and related posts** under every post
- **RSS feed** (`/feed.xml`), **sitemap** (`/sitemap.xml`) and **robots.txt**
- **Link previews and structured data**: Open Graph, Twitter cards and `BlogPosting` JSON-LD
- **Drafts** that stay out of the build until you publish them
- **Light and dark themes** following the reader's system setting, with a self-hosted display face (Young Serif)
- **A 404 page** that points lost readers at your latest posts
- No client-side JavaScript required

## Quick start

1. Set your blog's name, address and author in `stati.config.js` (or `stati.config.ts`)
2. Run `npm run dev`
3. Read the sample posts, then replace them with your own in `site/posts/`
4. Edit `site/about.md` and the introduction in `site/index.md`

## Writing a post

Create `site/posts/my-post.md`:

```markdown
---
title: My post
description: One or two sentences for the home page, link previews and search results.
publishedAt: '2026-10-20'
tags: ['notes']
---

Your post, in Markdown.
```

It appears on the home page, in the archive, under its tags and in the feed. Add `draft: true` to keep it out of the build.

## Available scripts

- `npm run dev` - Start the development server
- `npm run build` - Build the site for production
- `npm run build:drafts` - Build including draft posts
- `npm run preview` - Preview the built site
- `npm run clean` - Clean build artifacts

## Directory structure

```
├── helpers/
│   └── blog.js           # Post index, listing filters and article SEO
├── public/
│   ├── fonts/            # Young Serif and its licence
│   ├── images/           # Ornament and link-preview image
│   ├── favicon.svg
│   └── styles.css        # All styles; colours and fonts at the top
├── site/
│   ├── _partials/        # Head, header, footer, post lists, tag links
│   ├── posts/
│   │   ├── layout.eta    # Post layout
│   │   └── *.md          # One file per post
│   ├── layout.eta        # Layout for every other page
│   ├── index.md          # Home page
│   ├── archive.md        # All posts by year
│   ├── tags.md           # All posts by tag
│   ├── about.md
│   └── 404.md
└── stati.config.js       # Name, author, header links, feed, sitemap, SEO
```

## How listings work

Templates can read Stati's navigation tree as `stati.nav`, but its nodes only carry a title, URL, order and date. Listings also need descriptions and tags, so `helpers/blog.js` builds an index of every post in the `beforeAll` hook and hands it to templates as filters: `stati.blogPosts()`, `stati.blogTags()`, `stati.postsByYear()`, `stati.adjacentPosts(url)`, `stati.relatedPosts(url)`, `stati.tagUrl(name)` and `stati.formatDate(date)`. A page asks for a generated list with `listing: latest`, `archive` or `tags` in its front matter.

## Before you deploy

- Set `baseUrl` in the config to your real address; feeds and link previews use it
- Replace `public/images/social-card.png` (1200 by 630) and `public/favicon.svg`
- Build with `npm run build` and deploy the `dist/` folder to any static host

Happy writing!
