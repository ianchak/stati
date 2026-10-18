---
title: Header and footer
description: The site name, logo, header links, repository link and footer line.
order: 2
---

## Site name and logo

The header shows `site.title` from `stati.config.js` next to `public/favicon.svg`. Replace the SVG with your own logo; keep it square, and it doubles as the browser tab icon.

## Header links

`nav` is a list of links shown in the header on wide screens and at the top of the menu on small ones:

```js
nav: [
  {
    label: 'Guide',
    url: '/getting-started/introduction',
    match: ['/getting-started', '/writing', '/publishing'],
  },
  { label: 'Customizing', url: '/customizing' },
  { label: 'Changelog', url: 'https://github.com/your-name/your-project/releases' },
],
```

A link is highlighted when the reader is on that page or anywhere in the section it points to. Add `match`, a list of section addresses, when one link stands for several sections, as **Guide** does here. Keep the list short: two to four links read best.

## Repository link

`repository` adds a source icon to the right of the header. Point it at GitHub, GitLab or any other address, or set it to `''` to remove it.

## Footer

The footer shows the copyright year, the site title and the `footer` line from the config, such as a license. To change its structure, edit `site/partials/footer.eta`.

## Search and theme buttons

The search button and theme toggle are in `site/partials/header.eta`. They appear once `public/scripts/docs.js` has loaded, since neither works without JavaScript.
