---
title: Search
description: How search works, what it indexes, and how to tune it.
order: 4
---

## Using it

Open search with the button in the header, <kbd>Ctrl</kbd> <kbd>K</kbd> (<kbd>⌘</kbd> <kbd>K</kbd> on a Mac), or <kbd>/</kbd>. Type a few letters, move through results with the arrow keys, and press <kbd>Enter</kbd> to open one. Results link straight to the matching heading, not just the page.

## How it works

When you build, Stati writes a search index to `dist/`: one entry for every page and every heading in it, with the text under that heading. It adds a `<meta name="stati:search-index">` tag pointing at the file to every page.

The first time a reader opens search, `public/scripts/docs.js` reads that tag, downloads the index, and searches it in the browser. Nothing is sent to a server, and the search works on any static host.

Results are ranked by where the words appear: matches in a page title rank above matches in a heading, which rank above matches in the text. Every word you type has to appear, but it can match anywhere inside a word, so `bar sec` finds "Sidebar and sections". Matches at the start of a word rank above matches inside one.

## Configuration

Search is set up in `stati.config.js`:

```js
search: {
  enabled: true,
  exclude: ['/404'],
},
```

| Option             | Default           | What it does                                                             |
| ------------------ | ----------------- | ------------------------------------------------------------------------ |
| `exclude`          | `[]`              | Glob patterns for pages to leave out, such as `'/drafts/**'`             |
| `headingLevels`    | `[2, 3, 4, 5, 6]` | Heading levels that get their own entry                                  |
| `maxContentLength` | `1000`            | Characters of text kept per heading                                      |
| `includeHomePage`  | `false`           | Whether the home page is indexed                                         |
| `hashFilename`     | `true`            | Adds a content hash to the file name, so browsers never use an old index |

Drafts are never indexed. For every option, see the [Stati search docs](https://stati.build/configuration/search).

## Changing the dialog

The dialog's markup is in `site/partials/search.eta`, its styles under "Search" in `public/styles.css`, and the ranking in the `score` function of `public/scripts/docs.js`.
