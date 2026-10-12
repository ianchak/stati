---
title: Quick start
description: Run the site locally, make it yours, and add your first page.
order: 2
---

## Start the development server

From the project folder, run:

```bash
npm run dev
```

Stati builds the site and serves it at `http://localhost:3000`. Pages rebuild and the browser reloads as you save.

## Make it yours

Open `stati.config.js` (or `stati.config.ts`) and change the values at the top:

```js
const site = {
  title: 'Stati Docs',
  description: 'Documentation built with Stati.',
  baseUrl: 'https://example.com',
  nav: [
    { label: 'Guide', url: '/getting-started/introduction' },
    { label: 'Customizing', url: '/customizing' },
  ],
  repository: 'https://github.com/your-name/your-project',
  footer: 'Released under the MIT License.',
};
```

| Setting       | Where it shows                                               |
| ------------- | ------------------------------------------------------------ |
| `title`       | The header, the browser tab and link previews                |
| `description` | Search engines and link previews for pages without their own |
| `baseUrl`     | The sitemap, canonical links and link previews               |
| `nav`         | Links in the header, and at the top of the mobile menu       |
| `repository`  | The source icon in the header (set it to `''` to hide it)    |
| `footer`      | The line next to the copyright at the bottom of every page   |

Then replace `public/favicon.svg` with your logo. It is used as the favicon and next to the title in the header.

## Add a page

Create `site/getting-started/first-page.md`:

```md
---
title: My first page
description: One sentence about what this page covers.
order: 4
---

Write anything here, in Markdown.

## A section

Headings at level 2 and 3 appear in "On this page".
```

Save it and it appears in the sidebar under **Getting started**, in search, and in the previous and next links.

## Build for production

```bash
npm run build
```

The finished site is in `dist/`. Preview it with `npm run preview`, and see [Deploying](/publishing/deploying) when you are ready to publish it.
