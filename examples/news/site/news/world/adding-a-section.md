---
title: Adding a section takes one folder and one line of config
description: Create a folder for its stories, name it in stati.config.js, and the new section joins the tabs, the front page and the feeds.
date: 2026-10-25T09:15:00Z
author: staff-writer
image: /images/news/sections.png
imageAlt: Five folder tabs in a row, each a different shade of green, one pulled forward.
caption: A section is a folder of stories and an entry in the config.
credit: 'Illustration: Stati News'
tags: [Guides, Sections]
featured: true
---

The starter ships with five sections: World, Politics, Business, Technology and Culture. Yours will be different. A local paper might want Council, Schools, Sport and Food; a trade publication might want one section per industry it covers.

## Add the folder

Every story lives in a folder named after its section, inside `site/news/`:

```text
site/news/
├── world/
├── politics/
└── science/            # The new section
    └── a-first-story.md
```

The folder name is the section's key. It becomes part of the address of every story in it: `site/news/science/a-first-story.md` is published at `/news/science/a-first-story`.

## Name it in the config

Then add the section to `site.sections` in `stati.config.js`:

```js
sections: [
  { key: 'world', title: 'World', description: 'News from beyond the city limits.' },
  // ...
  { key: 'science', title: 'Science', description: 'Research, health and the natural world.' },
],
```

The order of this list is the order of the section tabs under the nameplate, and of the sections on the front page. The title is what readers see; the description sits at the top of the section's own page.

## What you get

With those two steps, the section has:

- a tab in the nameplate, marked on the section page and on each of its stories;
- a page at `/news/science` that lists its stories, newest first, twelve to a page;
- a block on the front page with its four newest stories;
- its own RSS feed, `feed-science.xml`, linked from the section page and the footer.

The section page comes from one template, `site/news/[section].md`. `helpers/news.js` hands Stati one entry per section, and Stati renders the template once for each. When a story moves from one folder to another, both section pages, the front page and both feeds are rebuilt.

## Folders the config does not list

A folder that is not in `site.sections` still works: its stories are published, and its page is titled after the folder name. The build prints a warning, because the section has no tab and no feed of its own until you add it to the list.

## Removing a section

Move or delete its folder, then remove its line from `site.sections`. Stati deletes the section's page on the next build.
