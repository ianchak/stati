---
title: 'Lead images that load fast on any screen'
description: Every image gets its size and lazy loading from Stati. Image tools add smaller AVIF and WebP copies, so phones never download a desktop-sized picture.
date: 2026-10-15T13:00:00Z
author: guest-writer
image: /images/news/responsive.png
imageAlt: The same picture at three sizes, stepping down from wide on the left to small on the right.
caption: One picture, served at the size each screen needs.
credit: 'Illustration: Stati News'
tags: [Images, Publishing]
---

Images are the heaviest part of most news pages. The starter places them with `stati.image()`, which takes care of the details whether or not the project has image tools.

## Without image tools

Stati reads each image's width and height at build time and writes them into the page, so the text does not jump when the image arrives. Images further down the page load only when the reader scrolls near them; the lead image on an article loads first.

## With image tools

A project created with `--images` has `@stati/images` and this in its `stati.config.js`:

```js
images: {
  responsive: true,
},
```

Stati then makes smaller copies of every image, in the AVIF and WebP formats, and lets the browser pick the right one for the screen and the layout. A phone downloads a picture the width of a phone.

## The sizes in the templates

Each `stati.image()` call in the templates says how wide the image is shown, so the browser can choose a copy before the page is laid out:

```eta
<%~ stati.image(fm.image, { alt: fm.imageAlt, priority: true, sizes: '(min-width: 72rem) 46rem, 100vw' }) %>
```

If you change the layout, change the `sizes` with it: the article's lead image in `site/news/layout.eta`, and the story images in `site/partials/story.eta` and `site/front.eta`.

## Images in the text

Images in the body of a story, written in Markdown as `![What it shows](/images/news/map.png)`, get the same treatment.
