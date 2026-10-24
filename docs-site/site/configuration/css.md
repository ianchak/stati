---
title: 'CSS'
description: 'Ship stylesheets named after their content, and run Tailwind CSS from stati dev and stati build.'
order: 9
seo:
  title: 'CSS configuration'
---

# CSS

A production build names your stylesheets after their content, such as `/_assets/styles-A1B2C3D4.css`, and points the pages' links at those names, the way it names [TypeScript bundles](/configuration/typescript). Your templates link `/styles.css` as in development. That covers a stylesheet in `public/`, one Sass compiles there, and the one Stati builds with Tailwind CSS when `stati dev` and `stati build` get its input and output files.

## Why the name changes

Pages are usually served with no caching or a short one, but a stylesheet with a fixed name can stay in a browser's cache for hours: some hosts and CDNs cache every `.css` file by default. After a deploy that adds markup together with the CSS for it, those browsers show the new markup without its styles until their copy expires. A stylesheet named after its content gets a new URL whenever it changes, so browsers load it with the pages that need it.

## How pages link the hashed name

A template links the stylesheet under its own path:

```html
<link rel="stylesheet" href="/styles.css" />
```

A production build writes the page with the hashed name:

```html
<link rel="stylesheet" href="/_assets/styles-A1B2C3D4.css" />
```

- Every `<link>` that applies, offers or preloads a stylesheet is rewritten: `rel="stylesheet"`, `rel="alternate stylesheet"` and `rel="preload" as="style"`. The `href` keeps its quotes, a query or fragment such as `?v=2`, and the site's own origin when it carries one, such as `https://example.com/styles.css`. A relative `href` resolves against the page's URL and becomes a path from the site root.
- Links to other sites, links in page text and code samples, and links in comments, scripts and `<template>` elements stay as they are. So does a link with an `integrity` digest: the digest was taken from the file under its own name, which is still copied.
- `A1B2C3D4` is the start of the SHA-256 of the CSS. A stylesheet in a folder keeps its folder: `/css/site.css` becomes `/_assets/css/site-A1B2C3D4.css`.
- Relative `url()` references and `@import` strings in the CSS, such as `url(fonts/inter.woff2)`, become paths from the site root, `url(/fonts/inter.woff2)`, so they load the same files from `_assets/` as from the stylesheet's own path. References with CSS escapes are rebased too; comments and other strings, such as a `content` value, are left alone.
- When the CSS changes, Stati writes the new name into the pages the [ISG cache](/core-concepts/isg) kept: a CSS change doesn't render any page again. When a stylesheet is gone from `public/`, those pages link its own path again, and once a stylesheet they link is added to `public/`, they link its copy. Only their stylesheet links change.
- Hashed files earlier builds left in `dist/_assets/` under other names are deleted.

Development keeps every stylesheet's own name. The first production build that hashes renders every page again.

## Stylesheets in `public/`

A `.css` file in `public/` that a page links gets a hashed copy in `dist/_assets/`. Nothing needs to be set up.

- The file is still copied under its own name, so a stylesheet that `@import`s it, or a script that loads it, keeps working. A file only another stylesheet imports keeps its fixed name.
- A stylesheet no page links gets no copy.
- Stati copies the CSS as it is: it doesn't minify it.
- A path holding characters other than letters, digits, `-`, `_`, `.` and `/` keeps its name.

## Sass

Compile Sass into `public/` before `stati build`, and the build hashes the result like any stylesheet there. Projects that `create-stati` scaffolds with Sass are set up this way:

```json
{
  "scripts": {
    "build:css": "sass src/styles.scss public/styles.css --style=compressed --no-source-map",
    "watch:css": "sass --watch src/styles.scss public/styles.css --no-source-map",
    "build": "npm run build:css && stati build",
    "dev": "concurrently --prefix none \"npm run watch:css\" \"stati dev\""
  }
}
```

`public/styles.css` is a build output, so list it in `.gitignore`. In development, `sass --watch` rewrites it, and the dev server copies it and reloads the page.

## Tailwind CSS

### Setup

Pass the same two flags to both commands:

```json
{
  "scripts": {
    "dev": "stati dev --tailwind-input src/styles.css --tailwind-output dist/styles.css",
    "build": "stati build --tailwind-input src/styles.css --tailwind-output dist/styles.css"
  }
}
```

- `--tailwind-input` is Tailwind's input stylesheet.
- `--tailwind-output` is the stylesheet's file in the output directory. The dev server's Tailwind watcher writes it, and pages link it under its path there, `/styles.css`. It must be a `.css` file inside the output directory, with only letters, digits, `-`, `_`, `.` and `/` in its path. A file at the same path in `public/`, such as `public/styles.css`, is never copied, in development or production, and the build warns about it.

`stati build` stops with an error when it gets only one of the two. Tailwind CSS 4 needs `tailwindcss` and `@tailwindcss/cli` installed in the project, Tailwind CSS 3 needs `tailwindcss`. See [Tailwind CSS integration](/core-concepts/static-assets#tailwind-css-integration) for the stylesheet itself, including the `@source` rule for classes your templates build at render time.

A template can link `/styles.css` or leave the link out: Stati adds `<link rel="stylesheet">` before `</head>` on every page that doesn't have one to the path. A preload of the path, and a link in a comment or script, don't count.

### What a production build does

1. Before any page renders, it checks that the input file exists and that Tailwind CSS is installed.
2. It renders the pages. Every class a template builds with `stati.propValue()` goes into `.stati/tailwind-classes.html`.
3. With that list complete, it runs Tailwind once, with `--minify`, and writes `dist/_assets/styles-A1B2C3D4.css`.
4. It writes the pages it rendered, with their links to `/styles.css` pointed at that file.

Tailwind runs after the pages, so the build holds the pages it renders in memory until then, with `css.hash: false` too, and writes each once, with the final file name, after the [`afterRender`](/api/hooks) hook has run for it. If Tailwind fails, the build stops with Tailwind's error and the previous build's pages and stylesheet stay as they were.

### Linking it yourself

The added link goes at the end of `<head>`, after the page's other stylesheets. To place it yourself, for example before a stylesheet that has to override it, link `/styles.css` where you want it. With `css.autoInject` set to `false`, Stati adds no link, and templates can print `stati.assets.stylesheetPaths`:

```eta
<head>
  <% for (const href of stati.assets.stylesheetPaths) { %>
  <link rel="stylesheet" href="<%= href %>">
  <% } %>
  <link rel="stylesheet" href="/prism-theme.css">
</head>
```

`stati.assets.stylesheetPaths` is `['/styles.css']` in development and `['/_assets/styles-A1B2C3D4.css']` in production, and an empty array without the Tailwind flags. Print each path as it is: a production build writes the final name into the page after rendering, by replacing the path the template printed, so a path the template changes, such as one it encodes or takes apart, keeps a name no file has.

## Options

The `css` block in `stati.config.ts` changes the defaults:

```typescript
import { defineConfig } from '@stati/core';

export default defineConfig({
  site: { title: 'My Site', baseUrl: 'https://example.com' },
  css: {
    autoInject: false, // link the Tailwind stylesheet in your templates
  },
});
```

| Option       | Type      | Default | Description                                                                                                                                             |
| ------------ | --------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `hash`       | `boolean` | `true`  | Name production stylesheets after their content and point the pages' links at them. With `false`, production links every stylesheet under its own name. |
| `minify`     | `boolean` | `true`  | Minify the Tailwind stylesheet in production. Development output and stylesheets in `public/` are never minified.                                       |
| `autoInject` | `boolean` | `true`  | Add the Tailwind stylesheet's `<link>` before `</head>` on every page that doesn't link it yet.                                                         |

Development always uses each stylesheet's own name, whatever `hash` says. Unknown options and values that aren't `true` or `false` stop the build with an error.

## Caching on your host

The hashed files never change under their names, so they can be cached for as long as you like, along with the TypeScript bundles in the same folder. On hosts that read a `_headers` file, such as Netlify and Cloudflare Pages, put one in `public/`:

```text
/_assets/*
  Cache-Control: public, max-age=31536000, immutable
```

## Development

`stati dev` with the Tailwind flags starts Tailwind's watcher next to the dev server. Pages link `/styles.css`, and the browser reloads when Tailwind writes it. An output outside the output directory still works for the watcher, but Stati can't link it, and the dev server says so when it starts. See [Development server](/cli/development#tailwind-css-integration).

## Moving from a `build:css` script

A project that runs Tailwind or Sass in its own script after `stati build` writes the stylesheet to `dist/` under a fixed name, which the build can't hash:

```json
{
  "scripts": {
    "build": "stati build && npm run build:css",
    "build:css": "tailwindcss -i src/styles.css -o dist/styles.css --minify"
  }
}
```

To move a Tailwind project:

1. Give `build` the same flags as `dev`: `stati build --tailwind-input src/styles.css --tailwind-output dist/styles.css`.
2. Delete the `build:css` script.

To move a Sass project, have `build:css` write `public/styles.css` instead of `dist/styles.css`, run it before `stati build`, and list `public/styles.css` in `.gitignore`. See [Sass](#sass).

Your templates keep their `<link rel="stylesheet" href="/styles.css">`. The first build renders every page again.
