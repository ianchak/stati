---
title: 'Writing an article: headline, standfirst, images and captions'
description: Every story is a Markdown file with a few lines of front matter. Here is each field, what it does and where it shows up.
date: 2026-10-23T15:20:00Z
updated: 2026-10-25T08:00:00Z
author: your-name
image: /images/news/writing.png
imageAlt: A sheet of paper with a heavy headline bar, two lines of standfirst and lines of body text.
caption: The headline, the standfirst and the first paragraph do most of the work.
credit: 'Illustration: Stati News'
tags: [Writing, Guides, Images]
---

Create a Markdown file in the folder of its section, such as `site/news/world/bridge-reopens.md`. The file name becomes the address: `/news/world/bridge-reopens`.

## The front matter

```yaml
---
title: The bridge reopens after two years of repairs
description: Traffic returns to the river crossing on Monday, three months later than planned.
date: 2026-10-25T09:15:00Z
updated: 2026-10-25T13:40:00Z
author: staff-writer
image: /images/news/bridge.jpg
imageAlt: The bridge seen from the riverbank, with scaffolding on one side.
caption: The east span was the last to be finished.
credit: 'Photo: Your Name'
tags: [Transport, Council]
---
```

| Field                  | What it does                                                           |
| ---------------------- | ---------------------------------------------------------------------- |
| `title`                | The headline, on the article and in every listing                      |
| `description`          | The standfirst under the headline, and the summary in feeds and search |
| `date`                 | When the story was published; listings sort by it                      |
| `updated`              | Adds an "Updated" line to the byline and to the metadata               |
| `author`               | A key from `site.authors`, or a list of keys                           |
| `image`                | The lead image, a path in `public/`                                    |
| `imageAlt`             | What the image shows, for readers who cannot see it                    |
| `caption` and `credit` | The line under the image, and who made it                              |
| `tags`                 | Topics, each with its own page                                         |
| `lead` and `featured`  | Placement on the front page                                            |
| `draft`                | Leaves the story out of the build until you publish it                 |

## Dates and times

Write dates with a time and a time zone, as in `2026-10-25T09:15:00Z`, so a story published at nine in the morning sorts above one from the night before. `site.timeZone` in `stati.config.js` sets the time zone readers see the time in. A date without a time, such as `2026-10-25`, works too; the byline then shows the day only.

## Images, captions and credits

Put images in `public/images/news/` and point `image` at them with a path that starts with `/`. Keep `imageAlt` and `caption` apart: the alt text describes what is in the picture for someone who cannot see it, and the caption adds what the picture cannot say. The credit names the photographer or the agency.

The images on this site are illustrations that ship with the starter. Replace them with your own, landscape at 16:9 and at least 1200 pixels wide. When the project uses `@stati/images` (`create-stati --images`), Stati turns each one into responsive AVIF and WebP files at build time; without it, the file is used as it is.

## The body

Write the story in Markdown under the front matter. The first paragraph does the most work; keep it short. Use `##` headings to break up a long story, quotes for what people said, and lists where readers will want to scan.

> A blockquote sets a quote apart from the text around it.

The reading time in the byline is counted from the body, at 230 words a minute.

## Drafts

Add `draft: true` to keep a story out of the site while you write it. `npm run build:drafts` builds the site with drafts included, marked with a Draft label, so you can preview them.
