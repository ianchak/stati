---
title: 'CSS'
description: 'Run Tailwind CSS from stati dev and stati build, and ship a stylesheet named after its content.'
order: 9
seo:
  title: 'CSS configuration'
---

# CSS

Stati runs Tailwind CSS for you when `stati dev` and `stati build` get its input and output files. The dev server keeps the stylesheet under the name you give it. A production build runs Tailwind after the last page renders, names the file after its content, such as `/_assets/styles-A1B2C3D4.css`, and links it on every page, the way it names and links [TypeScript bundles](/configuration/typescript).

## Why the name changes

Pages are usually served with no caching or a short one, but a stylesheet with a fixed name can stay in a browser's cache for hours: some hosts and CDNs cache every `.css` file by default. After a deploy that adds markup together with the CSS for it, those browsers show the new markup without its styles until their copy expires. A stylesheet named after its content gets a new URL whenever it changes, so browsers load it with the pages that need it.

## Setup

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

Stati links the stylesheet on every page, so your templates don't need a `<link>` to it. Projects that `create-stati` scaffolds with Tailwind are set up this way.

## What a production build does

1. Before any page renders, it checks that the input file exists and that Tailwind CSS is installed.
2. It renders the pages. Every class a template builds with `stati.propValue()` goes into `.stati/tailwind-classes.html`.
3. With that list complete, it runs Tailwind once, with `--minify`, and writes `dist/_assets/styles-A1B2C3D4.css`, where `A1B2C3D4` comes from the CSS. Relative `url()` references, such as `url(fonts/inter.woff2)`, become paths from the site root, `url(/fonts/inter.woff2)`, so they load the same files from `_assets/` as from `/styles.css`.
4. It writes the pages it rendered. Every page links that file with `<link rel="stylesheet" href="/_assets/styles-A1B2C3D4.css">`, added before `</head>` unless the page has a `<link rel="stylesheet">` to the path already. A preload of the path doesn't count.
5. It deletes the stylesheets earlier builds left in `dist/_assets/` under other names.

The file name is known only once Tailwind has run, after the pages, so the build holds the pages it renders in memory until then and writes each once, after the [`afterRender`](/api/hooks) hook has run for it. When the CSS changes, Stati also writes the new name into the pages the [ISG cache](/core-concepts/isg) kept: a CSS change doesn't render any page again. If Tailwind fails, the build stops with Tailwind's error and the previous build's pages and stylesheet stay as they were.

## Linking it yourself

The link goes at the end of `<head>`, after the page's other stylesheets. To place it yourself, for example before a stylesheet that has to override it, set `css.autoInject` to `false` and print `stati.assets.stylesheetPaths`:

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
    autoInject: false, // print stati.assets.stylesheetPaths in your templates
  },
});
```

| Option       | Type      | Default | Description                                                                                                                                  |
| ------------ | --------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `hash`       | `boolean` | `true`  | Name the production stylesheet after its content. With `false`, production writes and links the `--tailwind-output` file under its own name. |
| `minify`     | `boolean` | `true`  | Minify the production stylesheet. Development output is never minified.                                                                      |
| `autoInject` | `boolean` | `true`  | Add the `<link>` before `</head>` on every page that doesn't link the stylesheet yet.                                                        |

Development always uses the output's own name, whatever `hash` says. Unknown options and values that aren't `true` or `false` stop the build with an error.

## Caching on your host

The hashed file never changes under its name, so it can be cached for as long as you like, along with the TypeScript bundles in the same folder. On hosts that read a `_headers` file, such as Netlify and Cloudflare Pages, put one in `public/`:

```text
/_assets/*
  Cache-Control: public, max-age=31536000, immutable
```

## Development

`stati dev` with the same flags starts Tailwind's watcher next to the dev server. Pages link `/styles.css`, and the browser reloads when Tailwind writes it. An output outside the output directory still works for the watcher, but Stati can't link it, and the dev server says so when it starts. See [Development server](/cli/development#tailwind-css-integration).

## Sass and plain CSS

Stati names only the stylesheet it builds with Tailwind after its content. A stylesheet in `public/`, or one Sass writes after `stati build`, keeps its name: link it in your templates as before.

## Moving from a `build:css` script

A project that runs Tailwind in its own script after `stati build` keeps the stylesheet's fixed name:

```json
{
  "scripts": {
    "build": "stati build && npm run build:css",
    "build:css": "tailwindcss -i src/styles.css -o dist/styles.css --minify"
  }
}
```

To move:

1. Give `build` the same flags as `dev`: `stati build --tailwind-input src/styles.css --tailwind-output dist/styles.css`.
2. Delete the `build:css` script.
3. Remove `<link rel="stylesheet" href="/styles.css">` from your templates.

The first build renders every page again, because the pages now link the stylesheet.
