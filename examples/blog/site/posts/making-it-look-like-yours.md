---
title: Making it look like yours
description: Change the colours, fonts and ornament from a handful of settings at the top of one stylesheet.
publishedAt: '2026-09-20'
tags: ['design', 'guides']
---

Everything visible is styled from `public/styles.css`, and most of what makes the blog look like this one is a dozen custom properties at its top. Change them and the whole site follows.

## Colours

```css
:root {
  --paper: #ffffff;
  --ink: #1b1f1d;
  --muted: #545d58;
  --accent: #0f7b6c;
  /* ... */
}
```

`--accent` is the one to change first. It colours links, the drop caps, the ornament, list markers and the RSS link. The dark theme has its own set of values further down, inside `@media (prefers-color-scheme: dark)`; give it a lighter version of the same accent.

Check that body text stays easy to read on your background. The contrast between `--ink` and `--paper` should be at least 4.5 to 1, and so should `--muted` and `--faint`, which are used for dates and descriptions.

## Fonts

Headings, post titles and drop caps use Young Serif, which lives in `public/fonts/` with its licence. Body text uses a reading serif already installed on the reader's device, so it costs nothing to load.

To use another display face, put its `.woff2` file in `public/fonts/`, point the `@font-face` rule at it, and update the preload link in `site/_partials/head.eta`. For a sans-serif blog, set `--font-text` to `var(--font-ui)`.

## The ornament

The leaf between sections and at the end of each post is `public/images/fleuron.svg`, drawn in your accent colour. Replace it with any single-colour SVG: an asterism, a star, your initials.

## The favicon and link preview image

Replace `public/favicon.svg` with your own icon, and `public/images/social-card.png` with a 1200 by 630 pixel image for link previews. With image tools on, each page's preview is drawn from `site/og.eta` instead; edit its colours and fonts there.

## Header links

The header links come from the `nav` list in `stati.config.js`. Add a page, such as `site/now.md`, then add it to the list:

```js
nav: [
  { label: 'Archive', url: '/archive' },
  { label: 'Tags', url: '/tags' },
  { label: 'Now', url: '/now' },
  { label: 'About', url: '/about' },
],
```

## Going further

The layouts are plain HTML with a little Eta templating: `site/layout.eta` for pages, `site/posts/layout.eta` for posts, and the shared pieces in `site/_partials/`. The [Stati template docs](https://stati.build/core-concepts/templates) cover the syntax.
