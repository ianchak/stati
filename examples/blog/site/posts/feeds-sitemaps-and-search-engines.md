---
title: Feeds, sitemaps and search engines
description: The RSS feed, sitemap, robots.txt and link-preview metadata this blog publishes, and the one setting they all depend on.
publishedAt: '2026-09-28'
tags: ['seo', 'feeds']
---

Production builds write four extra files next to your pages, and every page carries metadata for search engines and link previews. They are switched on in `stati.config.js` and need one thing from you: the real address of your blog.

## Set your address first

```js
const site = {
  title: 'Stati Blog',
  baseUrl: 'https://example.com',
  // ...
};
```

Feeds, sitemaps and link previews need full addresses, and they all build them from `baseUrl`. Until you change it, they point at `example.com`.

## The RSS feed

`/feed.xml` lists your 20 newest posts with their titles, descriptions, dates and tags. Feed readers check it for new posts, so readers can follow the blog without an account anywhere. The header and every post link to it, and the page head announces it, so readers that find feeds by themselves will.

The `rss` block in the config controls it. To publish a second feed, for one tag for example, add another entry to `feeds` with its own `filename` and a `filter`.

## The sitemap and robots.txt

`/sitemap.xml` lists every public page for search engines, with posts ranked above other pages. The 404 page is left out. `/robots.txt` allows every crawler and points them at the sitemap.

## Link previews

Each page gets a description, a canonical link, Open Graph and Twitter tags, so a shared link shows a title, a summary and, when the page has one, an image. They come from front matter you already write, `title` and `description`, and from the author in `stati.config.js`.

---

If you added image tools when you created the blog, each page gets its own preview image, drawn from `site/og.eta` with the page's title and description. Without them, a page has an image only when you give it one. Either way, a post's own picture wins; 1200 by 630 pixels suits every network:

```yaml
seo:
  openGraph:
    image:
      url: /images/my-post-card.png
      alt: A short description of the picture
```

The same `seo` block takes other overrides, such as `title`, `description` or `structuredData` for search engines.

## Checking the output

Feeds, the sitemap and `robots.txt` are written by production builds only, not by the dev server. Run `npm run build` and look in `dist/`, or paste a post's link into a social network's preview tool once the blog is online.
