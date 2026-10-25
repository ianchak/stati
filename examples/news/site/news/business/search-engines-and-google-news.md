---
title: Search engines, link previews and Google News
description: Every story carries NewsArticle structured data, Open Graph tags with its section and author, and a place in two sitemaps. You write none of it by hand.
date: 2026-10-22T13:45:00Z
author: [your-name, staff-writer]
image: /images/news/search-engines.png
imageAlt: A story card connected by lines to a magnifying glass, a speech bubble and a stack of pages.
caption: The same front matter feeds search results, link previews and sitemaps.
credit: 'Illustration: Stati News'
tags: [SEO, Feeds]
---

Search engines and social networks read more than the visible page. The starter fills in what they look for from the front matter you already write.

## NewsArticle structured data

Every story gets a block of [schema.org](https://schema.org/NewsArticle) structured data, which search engines use for news results and top stories. It holds the headline, the standfirst, the lead image, the publication and update dates, the authors with links to their pages, the section, the topics and the site as publisher.

It is added by the `beforeAll` hook in `helpers/news.js`, before Stati renders the pages. To check a story, paste its address into Google's [Rich Results Test](https://search.google.com/test/rich-results) once the site is published.

## Link previews

When someone shares a story, the preview shows its headline, its standfirst and its lead image. Stati prints the Open Graph and Twitter tags, marks stories as articles and adds `article:section`, `article:author`, `article:published_time`, `article:modified_time` and one `article:tag` per topic.

Pages without a lead image, such as the section pages, use the default card, `public/images/social-card.png`. Replace it with your own, 1200 by 630 pixels. In a project created with `--images`, Stati draws a card for every page instead, from `site/og.eta`.

## Sitemaps and robots.txt

Each build writes three files for crawlers:

- `sitemap.xml` with every page, the front page and the section pages first;
- `news-sitemap.xml`, the Google News sitemap, with the stories of the last two days;
- `robots.txt`, which names both sitemaps.

Google News only reads stories from the last two days, so the news sitemap is empty when nothing new was published, and it is only as fresh as your last build. Rebuild when you publish, or on a schedule; see [deploying your newsroom](/news/world/deploying-your-newsroom).

## Set your address first

Every absolute link in these files starts with `site.baseUrl` in `stati.config.js`. Set it to the address readers will use before you publish; the placeholder `https://example.com` would send search engines elsewhere.
