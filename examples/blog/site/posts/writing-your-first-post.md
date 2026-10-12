---
title: Writing your first post
description: Create a Markdown file, fill in its front matter, and it appears everywhere it should.
publishedAt: '2026-10-09'
updated: '2026-10-11'
tags: ['writing', 'guides']
---

A post is a Markdown file in `site/posts/`. The file name becomes the address: `site/posts/my-first-post.md` is published at `/posts/my-first-post`. Use lowercase words joined by hyphens, and choose carefully, because changing a file name later changes its link.

## Front matter

Every post starts with a short block of settings between two `---` lines, called front matter:

```yaml
---
title: My first post
description: A sentence or two about the post.
publishedAt: '2026-10-20'
updated: '2026-10-22'
tags: ['notes', 'travel']
---
```

| Field         | Required | What it does                                                |
| ------------- | -------- | ----------------------------------------------------------- |
| `title`       | Yes      | The post's heading, page title and feed entry               |
| `description` | Yes      | Shown under the title on the home page and in link previews |
| `publishedAt` | Yes      | Orders posts and groups them by year. Keep the quotes       |
| `updated`     | No       | Adds an "Updated" date to the post and its metadata         |
| `tags`        | No       | Files the post under each tag on the tags page              |
| `image`       | No       | A picture for link previews, such as `/images/my-post.png`  |
| `imageAlt`    | No       | Describes that picture for people who cannot see it         |
| `draft`       | No       | `true` keeps the post out of the build                      |

Write the date as `'YYYY-MM-DD'` in quotes. Without quotes, some dates are read as something other than text and sort unpredictably.

## Writing the post

Below the front matter, write ordinary Markdown. Do not repeat the title as a `#` heading: the layout already prints it. Start sections with `##`, and smaller ones with `###`.

The first paragraph gets a drop cap automatically. A line with three hyphens, `---`, becomes the leaf ornament you see between sections in these posts. [The Markdown style guide](/posts/markdown-style-guide) shows how everything else looks.

## Drafts

Set `draft: true` and the post is left out of the site, the feed, the sitemap and every list. To check a draft before publishing, build with drafts included and preview the result:

```bash
npm run build:drafts
npm run preview
```

Drafts in that build are marked with a small "Draft" label. Remove the `draft` line, or set it to `false`, when the post is ready.

## Images

Put images in `public/images/` and link them from the root:

```markdown
![A harbour at dawn, boats still moored](/images/harbour.jpg)
```

Write alt text that says what the picture shows. Stati copies images as they are, so resize them before adding them; around 1600 pixels wide is plenty for this column.
