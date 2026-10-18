# Stati Blog Template

A ready-to-write blog for [Stati](https://stati.build). Posts, tags, a yearly archive, an RSS feed, a sitemap and search-engine metadata are already wired in, and the sample posts explain how each part works.

## What's included

- **Posts** in Markdown under `site/posts/`, listed newest first on the home page, five to a page
- **Tags** collected on `/tags`, with a page for every tag at `/tags/<tag>`
- **A yearly archive** at `/posts`
- **Newer, older and related posts** under every post
- **RSS feed** (`/feed.xml`), **sitemap** (`/sitemap.xml`) and **robots.txt**
- **Link previews**: Open Graph and Twitter tags on every page
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
│   └── blog.js           # Related posts and dates, as template helpers
├── public/
│   ├── fonts/            # Young Serif and its licence
│   ├── images/           # Ornament and a sample image
│   ├── favicon.svg
│   └── styles.css        # All styles; colours and fonts at the top
├── site/
│   ├── partials/         # Head, header, footer, post lists, page links, tag links
│   ├── posts/
│   │   ├── index.md      # The archive: all posts by year
│   │   ├── layout.eta    # Post layout
│   │   └── *.md          # One file per post
│   ├── tags/
│   │   ├── index.md      # All tags
│   │   └── [tag].md      # One page per tag
│   ├── base.eta          # The page around both layouts: head, header, footer
│   ├── layout.eta        # Layout for every other page
│   ├── index.md          # Home page
│   ├── about.md
│   └── 404.md
└── stati.config.js       # Name, author, header links, feed, sitemap, SEO
```

## How listings work

Every list comes from Stati's collection of the posts in `site/posts/`. The archive is that folder's index page, so `stati.collection` holds the posts there; the home page, the tags pages and the 404 page name it with `collection: /posts` in their front matter. A page asks the layout for a list with `listing: latest`, `archive`, `tags` or `tag`.

- **Pages of posts:** `paginate: 5` in `site/index.md` splits the home page into `/`, `/page/2` and so on; templates read the current page's posts from `stati.pagination`.
- **Tag pages:** `site/tags/[tag].md` is a template. Stati makes one page from it for every tag, with `{tag}` in its front matter replaced by the tag, and gives each page its tag and posts as `stati.generated`.
- **Under each post:** the post layout finds the newer and older posts in `stati.collection`, and `stati.helpers.relatedPosts(posts, url)` from `helpers/blog.js` picks related ones.

Stati rebuilds the pages that list a post when the post is added, removed, retitled or retagged, and removes the pages of deleted posts and unused tags.

## Before you deploy

- Set `baseUrl` in the config to your real address; feeds and link previews use it
- Replace `public/favicon.svg`, and give posts a link-preview image under `seo.openGraph.image` (or create the blog with image tools, which draws one for every page)
- Build with `npm run build` and deploy the `dist/` folder to any static host

Happy writing!
