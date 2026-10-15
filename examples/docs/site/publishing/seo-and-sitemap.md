---
title: SEO and sitemap
description: The metadata every page gets, the sitemap and robots.txt, and how to override them.
order: 1
---

## What every page gets

Stati adds these to each page's `<head>` when it builds:

- A description, from the page's `description`
- A canonical link, built from `baseUrl` and the page's address
- Open Graph and Twitter tags, so links shared in chat apps and social networks show a title, description and image
- Breadcrumb structured data, which search engines can show in place of the URL

`helpers/docs.js` sets the default link-preview image and the breadcrumbs; the `seo` block in `stati.config.js` turns the injection on.

## The link-preview image

Every page uses `public/images/social-card.png` unless it sets its own. Replace it with a 1200 by 630 pixel image of your own, and update its `alt` text in `stati.config.js`. If you added image tools when you created the site, each page gets its own card instead, drawn from `site/og.eta` with the page's title, description and section. To give one page its own image:

```yaml
---
title: Release 2.0
image: /images/release-2.png
imageAlt: The new dashboard in release 2.0
---
```

## Overriding metadata per page

Front matter under `seo` wins over the defaults:

```yaml
---
title: Configuration
seo:
  title: Configuration reference for Your Project
  description: Every option, its type and its default.
---
```

Use `seo.noindex: true` to ask search engines not to list a page.

## Sitemap and robots.txt

The build writes `sitemap.xml` and `robots.txt` to `dist/`. The sitemap lists every page except the ones matching `excludePatterns`, and `robots.txt` points crawlers at it. Both use `baseUrl`, so set it to your real address before you deploy.

To keep one page out of the sitemap:

```yaml
---
sitemap:
  exclude: true
---
```

Priorities are set per path in the `sitemap` block of `stati.config.js`. They are hints to crawlers, so the defaults are usually fine.
