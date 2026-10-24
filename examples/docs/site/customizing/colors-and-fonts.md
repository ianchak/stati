---
title: Colors and fonts
description: Change the accent color, the palette for each theme, the typeface and the page widths.
order: 1
---

All the design decisions live as custom properties at the top of `public/styles.css`. Change them there and every page follows.

## The accent color

Links, the current page in the sidebar and focus rings use one accent color, set once per theme:

```css
:root {
  --accent: #2563eb;
  --accent-hover: #1d4ed8;
}

:root[data-theme='dark'] {
  --accent: #60a5fa;
  --accent-hover: #93c5fd;
}
```

The dark values are repeated in a `prefers-color-scheme: dark` block for readers who never touch the toggle. Change both. Check that text in your accent color has a contrast of at least 4.5:1 against the background, in both themes.

## The full palette

| Property           | Used for                                                    |
| ------------------ | ----------------------------------------------------------- |
| `--bg`             | Page background                                             |
| `--bg-soft`        | Quotes, keys and the search button                          |
| `--inline-code-bg` | Code inside a sentence                                      |
| `--text-strong`    | Headings and the current item                               |
| `--text`           | Body text                                                   |
| `--text-muted`     | Secondary text: descriptions, labels, the table of contents |
| `--border`         | Dividers and outlines                                       |
| `--code-bg`        | Code block background (dark in both themes)                 |

## Light and dark themes

The site follows the reader's system setting until they press the theme toggle in the header. Their choice is saved in the browser and applied before the page paints, so there is no flash. The toggle sets `data-theme="light"` or `data-theme="dark"` on the `<html>` element.

## The typeface

The template ships [Inter](https://rsms.me/inter/), self-hosted from `public/fonts/` under the SIL Open Font License. To use another face, add its `.woff2` file to `public/fonts/`, update the `@font-face` rule and the preload link in `site/partials/head.eta`, and set `--font-sans`:

```css
--font-sans: 'Your Font', ui-sans-serif, system-ui, sans-serif;
```

To use the reader's system font instead, delete the `@font-face` rule and the preload link, and leave only the system stack. Code uses `--font-mono`, a stack of monospace fonts readers already have.

## Widths

```css
--sidebar-width: 17rem;
--toc-width: 14rem;
--content-width: 46rem;
--header-height: 4rem;
```

`--content-width` sets the reading column. Keep lines between 60 and 80 characters for comfortable reading.

## Sass and Tailwind

If you chose Sass or Tailwind when creating the project, these styles live in `src/styles.scss` or `src/styles.css` instead. Sass compiles them to `dist/styles.css`; Tailwind does too in development, while a production build names the file after its content, such as `dist/_assets/styles-A1B2C3D4.css`. The custom properties work the same way.
