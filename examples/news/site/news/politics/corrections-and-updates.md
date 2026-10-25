---
title: 'Corrections and updates: how a changed story is marked'
description: Readers and search engines should be able to tell when a story changed after it was published. One front matter field does both.
date: 2026-10-17T15:10:00Z
updated: 2026-10-18T09:00:00Z
author: your-name
image: /images/news/corrections.png
imageAlt: A story page with one line struck through and a green tab marked with a tick.
caption: An updated story keeps its date and says when it changed.
credit: 'Illustration: Stati News'
tags: [Writing, Guides]
---

Stories change after they are published: a figure is corrected, a name is fixed, a development is added. Keep the original `date`, so the story stays where it was in every listing, and add `updated`:

```yaml
---
title: The bridge reopens after two years of repairs
date: 2026-10-25T09:15:00Z
updated: 2026-10-25T13:40:00Z
---
```

## What `updated` changes

- The byline gains a line: "Updated October 25, 2026 at 1:40 PM", like the one on this story.
- The `NewsArticle` structured data gets a `dateModified`, and link previews an `article:modified_time`, so search engines know the story changed.
- Listings keep sorting by `date`. An update does not push an old story back to the top of the front page; to bring it back, mark it `lead` or `featured`.

## Saying what changed

The date tells readers that a story changed, not how. For a correction, add a note at the end of the story that says what was wrong and what is right now:

_Correction: an earlier version of this story gave the wrong opening date. The bridge reopens on Monday._

For an update that adds news, say so at the point where the new material starts, or in the standfirst if it changes the story's main point.

## A corrections policy

Readers trust a newsroom that tells them how it handles mistakes. Write your policy on the [About page](/about): how to report an error, how quickly you fix it, and how a corrected story is marked.
