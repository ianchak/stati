---
title: 'Make it yours: the name, colours, fonts and sections'
description: The nameplate colour, the typefaces and the name of the site are each one edit away. Here is where to find them.
date: 2026-10-21T09:30:00Z
author: guest-writer
image: /images/news/make-it-yours.png
imageAlt: Colour swatches in greens and greys beside the letters Aa set large in a heavy typeface.
caption: Colours and typefaces are custom properties at the top of the stylesheet.
credit: 'Illustration: Stati News'
tags: [Design, Guides]
---

The starter is meant to stop looking like a starter within an afternoon. Most of that is four places.

## The name and the date line

`site.title` in `stati.config.js` is the name in the nameplate, the page titles, the feeds and the publisher in search engines' metadata. `site.tagline` is the line under the date on the front page, and `site.description` sits in the footer and in link previews.

## Colours

Open `public/styles.css`. The colours are custom properties at the top:

```css
:root {
  --flag: #0b6b4f; /* The nameplate, section names and links */
  --flag-text: #0b6b4f; /* Section names and links on the page ground */
  --ground: #ffffff;
  --ink: #141414;
  --wash: #e9efe9; /* The strip under the nameplate and the footer */
  --rule: #c7d3cc; /* Column rules */
}
```

Change `--flag` and the nameplate, the section tabs and the links follow. Below it, a `prefers-color-scheme: dark` block sets the same properties for readers whose devices are in dark mode; change both. Keep text readable: white on `--flag` and `--flag-text` on `--ground` need a contrast of at least 4.5 to 1.

## Typefaces

Headlines, the nameplate and the interface are set in Libre Franklin; standfirsts and stories in Source Serif 4. Both are open source and served from `public/fonts/`, so readers' browsers never contact another site. To change them, put your font files in `public/fonts/`, update the `@font-face` rules at the top of the stylesheet and set `--font-display` and `--font-text`.

## The icon and the publisher logo

`public/favicon.svg` is the browser tab icon. `public/images/logo.png`, 512 pixels square, is the logo search engines show next to your stories. `public/images/social-card.png` is the default link preview. Replace all three.

## Sections and authors

Rename the sections and authors in `stati.config.js`, then rename or move the folders in `site/news/` to match. [Adding a section](/news/world/adding-a-section) and [authors and bylines](/news/culture/authors-and-bylines) cover both.

## Further

The templates are in `site/`: `front.eta` is the front page, `news/layout.eta` the article, `listing.eta` the section, author and topic pages, and `partials/` the nameplate, the footer, the byline and the story teasers. They are plain HTML with a little JavaScript between `<%` and `%>`.
