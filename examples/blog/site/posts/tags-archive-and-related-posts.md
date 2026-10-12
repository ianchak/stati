---
title: Tags, the archive and related posts
description: How one index of your posts powers the home page, the tags page, the archive and the links under every post.
publishedAt: '2026-10-05'
tags: ['structure', 'guides']
---

Every template can read Stati's navigation tree through `stati.nav`, but its entries only carry a title, address, order and date. Listings also need each post's description and tags, so the starter builds that view once per build in `helpers/blog.js` and hands it to the templates.

## The post index

Before any page renders, Stati runs the `beforeAll` hook with every page it found. The starter keeps the pages under `/posts/` and sorts them newest first. Templates then read that index through filters:

```eta
<% for (const post of stati.blogPosts(5)) { %>
  <a href="<%= post.url %>"><%= post.title %></a>
<% } %>
```

| Filter                          | Returns                                         |
| ------------------------------- | ----------------------------------------------- |
| `stati.blogPosts(limit?)`       | Posts, newest first                             |
| `stati.blogTags()`              | Every tag with its posts, most used first       |
| `stati.postsByYear()`           | Posts grouped by year, for the archive          |
| `stati.adjacentPosts(url)`      | The newer and older neighbours of a post        |
| `stati.relatedPosts(url, n)`    | Posts that share the most tags with a post      |
| `stati.tagUrl(name)`            | The link to a tag's section on the tags page    |
| `stati.formatDate(date, style)` | A date in your locale: `short`, `long` or `day` |

Each post in these lists has `url`, `title`, `description`, `date`, `updated`, `tags` and `draft`.

## Tags

Tags come from each post's `tags` list. The [tags page](/tags) lists them by how often they are used, then every post under each one. A tag's link jumps to its section, so `/tags#guides` opens straight on the guides.

Keep tags few and reusable. A tag with one post in it is a label; a tag with ten is a way in.

## The archive

The [archive](/archive) lists every post grouped by year. It comes from `site/archive.md`, whose front matter asks the layout for that list with `listing: archive`. The home page does the same with `listing: latest`, and the tags page with `listing: tags`. Any page can use one.

## Newer, older and related

Under each post, links lead to the next newer and older post, and to up to three related posts. A post is related when it shares a tag; the more tags it shares, the higher it ranks. Posts without tags have no related posts.

## Why listings stay current

Stati caches pages between builds and only re-renders a page when its own files change. Listings depend on other posts, so the starter stores a fingerprint of the index on every page. Add, retitle or retag a post and every listing re-renders with it. Edit only a post's text and only that post is rebuilt.
