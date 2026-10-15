---
title: Tags, the archive and related posts
description: How one collection of your posts powers the home page, the archive, a page for every tag and the links under every post.
publishedAt: '2026-10-05'
tags: ['structure', 'guides']
---

Every list on this blog comes from one place: the posts in `site/posts/`. Stati calls a folder with an `index.md` a collection, and hands it to templates as `stati.collection`, already sorted newest first and grouped by tag.

## The collection

`site/posts/index.md` is the folder's index page, the [archive](/posts). Pages elsewhere name the collection in their front matter with `collection: /posts`, as the home page, the tags pages and the 404 page do. Templates then read it:

```eta
<% for (const post of stati.collection.recentPages.slice(0, 5)) { %>
  <a href="<%= post.url %>"><%= post.frontMatter.title %></a>
<% } %>
```

| Property                       | Holds                                    |
| ------------------------------ | ---------------------------------------- |
| `stati.collection.recentPages` | Every post, newest first                 |
| `stati.collection.pagesByTag`  | The posts for each tag                   |
| `stati.collection.pages`       | Every post, in no particular order       |
| `stati.pagination`             | This page's share of a paginated listing |
| `stati.generated`              | The tag and posts of a tag page          |

Each post in these lists is a page: its front matter is under `post.frontMatter`, its date is `post.publishedAt`.

## Pages of posts

The home page lists five posts at a time. `paginate: 5` in `site/index.md` splits the collection into pages: the first at `/`, the next at [/page/2](/page/2), and so on, each with links to the others. Change the number to show more or fewer.

## A page for every tag

Tags come from each post's `tags` list. The [tags page](/tags) lists them by how often they are used, and each tag has a page of its own, such as [/tags/guides](/tags/guides).

Those pages come from one file, `site/tags/[tag].md`. The brackets make it a template: Stati creates one page from it for every tag the posts use, and drops pages for tags no post uses anymore. In its front matter, `{tag}` stands for the tag, so `title: '{tag}'` gives each page its tag as its title.

Keep tags few and reusable. A tag with one post in it is a label; a tag with ten is a way in.

## The archive

The [archive](/posts) lists every post grouped by year. Its front matter asks the layout for that list with `listing: archive`, the home page does the same with `listing: latest`, and the tags pages with `listing: tags` and `listing: tag`. Any page can use one.

## Newer, older and related

Under each post, links lead to the next newer and older post, and to up to three related posts. A post is related when it shares a tag; the more tags it shares, the higher it ranks. Posts without tags have no related posts. The post layout finds all of them in `stati.collection`, the related ones with `stati.relatedPosts` from `helpers/blog.js`.

## Why listings stay current

Stati caches pages between builds and re-renders a page when what it shows changes. It notices which pages read `stati.collection`, so adding, removing, retitling or retagging a post rebuilds the pages that list it, and nothing else. Edit only a post's text and only that post is rebuilt.
