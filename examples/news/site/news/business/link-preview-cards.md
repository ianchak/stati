---
title: A link preview card for every page
description: Stories are shared with their lead image. With image tools installed, every other page gets a card drawn in the site's own colours and type.
date: 2026-10-16T11:20:00Z
author: staff-writer
image: /images/news/preview-cards.png
imageAlt: A phone showing a shared link with a green header band and large headline bars.
caption: The card readers see before they click.
credit: 'Illustration: Stati News'
tags: [SEO, Images]
---

A story shared in a chat or a social feed appears as a card: an image, the headline and the site's name. What goes in that card is decided by the starter, page by page.

## Stories use their lead image

A story with an `image` in its front matter is shared with that image, and with its `imageAlt` as the image's description. Choose lead images that still read when they are cropped to a wide rectangle and shown small.

## Every other page

Section pages, author pages, topics and stories without an image need a card too. There are two ways to give them one.

**The default card.** Without image tools, they all share `public/images/social-card.png`, 1200 by 630 pixels. Replace it with a card for your site.

**Generated cards.** Create the site with `npx create-stati my-news --template=news --images`, or add `@stati/images` and an `images` block to `stati.config.js` later. Stati then draws a card for every page from `site/og.eta`: the nameplate band, the section and the page's title in Libre Franklin, in the site's green.

```js
images: {
  responsive: true,
  og: {
    fonts: [
      { name: 'Libre Franklin', path: './og/fonts/libre-franklin-semibold.woff', weight: 600 },
      { name: 'Libre Franklin', path: './og/fonts/libre-franklin-black.woff', weight: 900 },
    ],
  },
},
```

## Changing the card

`site/og.eta` is a template like the others, written with inline styles: cards are drawn without a browser, so they support flexbox layout and a subset of CSS, without classes or grid. Change its colours along with `--flag` in the stylesheet, and its fonts along with the files in `og/fonts/`.

## Checking a preview

After publishing, paste a story's address into the preview tool of the network you share on, or into an Open Graph checker, to see the card as readers will.
