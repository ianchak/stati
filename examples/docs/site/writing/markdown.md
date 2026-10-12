---
title: Markdown reference
sidebarTitle: Markdown
description: Every element this template styles, with the Markdown that produces it.
order: 3
---

This page shows how each Markdown element looks. Keep it as a reference while you write, or delete it.

## Text

Paragraphs are separated by a blank line. Use **bold** for words a reader must not miss, _italics_ for emphasis, `inline code` for names from code, and ~~strikethrough~~ for what no longer applies. Press <kbd>Ctrl</kbd> <kbd>C</kbd> to copy: keys are written as `<kbd>Ctrl</kbd>`.

[Links](/writing/code-blocks) to other pages use their address. Links to other sites, like [the Stati docs](https://stati.build), work the same way.

## Headings

`##` starts a section and `###` a subsection. Both appear in **On this page** and get a link icon on hover, so readers can share a link to them.

### A subsection

Use `####` for smaller labels inside a subsection. They are not listed in **On this page**.

## Lists

- Unordered lists use `-`
- Items can hold `code` and [links](#lists)
  - Indent by two spaces to nest

1. Ordered lists number themselves
2. Use them for steps a reader follows in order
3. Each step should be one action

## Tables

| Option | Type      | Default       | Description                             |
| ------ | --------- | ------------- | --------------------------------------- |
| `port` | `number`  | `3000`        | Port for the development server         |
| `host` | `string`  | `'localhost'` | Interface the server listens on         |
| `open` | `boolean` | `false`       | Open the browser when the server starts |

Wide tables scroll sideways on small screens instead of squeezing the page.

## Quotes

> Blockquotes suit notes, quotations and asides. Start each line with `>`.
>
> **Tip:** a bold first word turns a quote into a quick note or warning.

## Images

```md
![The search dialog with results for "sidebar"](/images/search.png)
```

![The search dialog with results for "sidebar": matching headings grouped under their pages, the first one selected](/images/search.png)

Put images in `public/images/` and link to them from `/images/`. Write alt text that says what the image shows.

## Collapsible details

<details>
<summary>Why HTML works in Markdown</summary>

Markdown passes HTML through, so `<details>`, `<kbd>` and other elements work. Leave a blank line after `<summary>` so the Markdown inside is still processed.

</details>

## Horizontal rule

Three dashes on their own line draw a divider.

---

Use it sparingly: a heading usually separates ideas better.
