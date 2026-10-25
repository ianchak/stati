---
title: One feed for the whole site, and one for every section
description: Readers who only want Business can follow Business. Every section gets an RSS feed of its own, next to the feed with every story.
date: 2026-10-23T10:00:00Z
author: staff-writer
image: /images/news/feeds.png
imageAlt: Curved broadcast lines rising from a dot, repeated in five columns of different heights.
caption: One feed carries every story; each section has a narrower one.
credit: 'Illustration: Stati News'
tags: [Feeds]
---

RSS is how many readers, aggregators and newsletter tools follow a news site. The starter writes several feeds on every build:

- `feed.xml` with the newest 30 stories from every section;
- `feed-world.xml`, `feed-politics.xml` and so on, with the newest 20 stories of each section.

Every page links the site-wide feed in its `<head>`, so feed readers find it from any address on the site. Section pages and their stories also link their section's feed, and the footer lists them all.

## What is in a feed item

Each story appears with its headline, its standfirst as the summary, its date, its authors and its categories: the section first, then its topics. A reader that groups by category can sort stories by section without opening them.

## Where the feeds are set up

The feeds come from `news.feeds()` in `helpers/news.js`, which `stati.config.js` passes to Stati's `rss.feeds`. It builds one entry for the whole site and one for each section in `site.sections`, so a new section gets a feed as soon as it is in the list.

Each entry is a plain Stati feed: a file name, a title, a description and a filter that picks its stories by their address.

```js
{
  filename: 'feed-business.xml',
  title: 'Business · Stati News',
  description: 'Companies, jobs and the local economy.',
  filter: (page) => page.url.startsWith('/news/business/'),
  maxItems: 20,
}
```

To change how many stories a feed carries, edit `news.feeds()`. To add a feed for a topic, add an entry of your own after it in `rss.feeds`, with a filter such as `(page) => page.frontMatter.tags?.includes('Council')`.

## Drafts and dates

Drafts are never in a feed. Stories are sorted by their `date`, newest first, so a story you publish with an earlier date lands lower in the feed, where readers may miss it; use the real time of publication.
