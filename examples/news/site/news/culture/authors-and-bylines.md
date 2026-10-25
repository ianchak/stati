---
title: 'Every writer gets a page: authors and bylines'
description: Authors are listed once in the config. Articles name them by key, and each author gets a page with everything they have written.
date: 2026-10-24T11:00:00Z
author: guest-writer
image: /images/news/authors.png
imageAlt: Three square monograms side by side, each with initials, above ruled lines of text.
caption: Each author's details live in one place and appear on every story they write.
credit: 'Illustration: Stati News'
tags: [Authors, Guides]
featured: true
---

A newsroom has many writers. The starter keeps their details in one place, `site.authors` in `stati.config.js`, so a name or a bio is never typed twice.

## Listing an author

Each author has a key, which is also the address of their page:

```js
authors: {
  'your-name': {
    name: 'Your Name',
    role: 'Editor',
    bio: 'Runs the newsroom and edits the front page.',
    email: 'editor@example.com',
    website: 'https://example.com',
    twitter: '@yourname',
  },
},
```

Only `name` is required. The role and bio appear on the author's page and under their stories; the email and website appear on their page; the X/Twitter handle goes into link previews as `twitter:creator`.

## Naming the author of a story

An article names its author by key:

```yaml
author: your-name
```

For a shared byline, give a list. The first author is the one search engines and link previews name as the article's author; all of them are listed in the byline and in the `NewsArticle` metadata:

```yaml
author: [your-name, staff-writer]
```

A key that is not in `site.authors` still prints a name in the byline, made from the key, but with no link, and the build warns about it.

## Author pages

Everyone in `site.authors` gets a page at `/authors/<key>`, listing their stories newest first, twelve to a page. The page comes from one template, `site/authors/[author].md`; `helpers/news.js` hands Stati one entry per author with their stories and their details, so an author with no stories yet still has a page.

The [authors index](/authors) lists everyone, with their role and the number of stories they have written.

## When someone leaves

Keep their entry in `site.authors` as long as their stories are published, so the bylines keep linking to their page. Change their role or bio to say they have moved on.
