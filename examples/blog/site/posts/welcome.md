---
title: Welcome to your new blog
description: What this starter gives you, where everything lives, and what to change first.
publishedAt: '2026-10-12'
tags: ['guides', 'starter']
---

This blog is a working Stati site with sample posts, and you are reading the first one. Every sample post explains one part of the starter. When you have read them, delete them and start writing your own.

## What you get

- **Posts** written in Markdown, listed newest first on the home page.
- **Tags** on each post, collected on a [tags page](/tags) with every post under each tag.
- **An [archive](/archive)** of every post, grouped by year.
- **Newer, older and related posts** under each post, so readers keep going.
- **An RSS feed** at `/feed.xml`, plus a sitemap and `robots.txt` for search engines.
- **Link previews and search metadata**: Open Graph, Twitter cards and `BlogPosting` structured data on every post.
- **Light and dark themes** that follow the reader's system setting.

None of it needs JavaScript in the browser. The pages are plain HTML and one stylesheet.

## Your first five minutes

1. Open `stati.config.js` and change `title`, `description`, `baseUrl` and the `author` block. Those values appear in the header, the footer, the feed and every page's metadata.
2. Run `npm run dev` and keep the browser open. Every save reloads the page.
3. Edit `site/about.md` and `site/index.md` so they talk about you.
4. Add a file to `site/posts/` and write your first post. [Writing your first post](/posts/writing-your-first-post) covers the details.

## Where things live

| Path                    | What it is                                            |
| ----------------------- | ----------------------------------------------------- |
| `site/posts/`           | One Markdown file per post                            |
| `site/*.md`             | Home, archive, tags, about and the 404 page           |
| `site/layout.eta`       | The layout for pages                                  |
| `site/posts/layout.eta` | The layout for posts                                  |
| `site/_partials/`       | Shared pieces: head, header, footer, post lists       |
| `public/styles.css`     | Every style on the site                               |
| `helpers/blog.js`       | Builds the post index behind listings and tags        |
| `stati.config.js`       | Your name, the feed, the sitemap and the SEO settings |

## Next steps

Read the rest of the sample posts in any order. [Making it look like yours](/posts/making-it-look-like-yours) is the one to read before you share the link, and [Deploying your blog](/posts/deploying-your-blog) gets it online.
