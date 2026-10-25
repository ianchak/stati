---
title: How the front page decides which story leads
description: Two front matter fields put an editor's judgment on the front page. Without them, the newest story leads.
date: 2026-10-24T16:30:00Z
author: your-name
image: /images/news/front-page.png
imageAlt: A page layout drawn as a grid of rectangles, the largest at the top left marked with a star.
caption: The lead, the top stories, the latest strip and a block per section.
credit: 'Illustration: Stati News'
tags: [Front page, Guides]
featured: true
---

A news site's front page is ranked, not just dated. The most important story is not always the newest one, so the starter lets you say which story leads, and which stories sit beside it.

## The lead story

Add `lead: true` to the front matter of the story that should lead:

```yaml
---
title: The council approves the new budget
lead: true
---
```

The lead gets the biggest headline on the page, its image, its standfirst and up to two related stories underneath. If several stories say `lead: true`, the newest of them leads, so you can mark the next lead before you unmark the current one. If none do, the newest story leads.

## Top stories

Stories with `featured: true` fill the column beside the lead, newest first, three at most. When fewer than three stories are featured, the newest remaining stories fill the gaps, so the column is never empty.

## The latest strip

Under the nameplate, a strip shows the three newest stories that are neither the lead nor a top story. It keeps the page moving on a day when the lead stays put.

## A block for every section

Below the top of the page, every section in `site.sections` gets a column with up to four of its stories, in the order of the list. Stories not already shown higher on the page come first, newest first, so a column repeats the lead or a top story only when its section has nothing else. A section with no stories yet is left out.

## The date in the nameplate

The date line in the nameplate is the date of the newest story, in the time zone set by `site.timeZone`. It tells readers how fresh the edition is without needing a server to keep a clock.

## Where the rules live

The ranking is a short function, `frontPage()`, in `helpers/news.js`, and the page itself is `site/front.eta`. Change the number of top stories, the size of the strip or the order of the blocks there.

Stati keeps the page current on its own: the front page reads every article through `collection: /news`, so it is rebuilt whenever a story is added or moved, or its headline, standfirst, image, `lead` or `featured` changes. The fields that count are listed under `collections.summaryFields` in `stati.config.js`; add any other field your front page shows.
