---
'create-stati': minor
---

Add a docs template

`create-stati my-docs --template=docs` scaffolds a complete
documentation site that works on first run. Its sample pages explain how
each part works.

- A sidebar built from folders: each top-level folder is a section and
  each Markdown file a page, ordered by `order` in front matter, with
  section overview pages, previous/next links and breadcrumbs. The
  grouping lives in `helpers/docs.js` and reaches templates as filters
  such as `stati.docsSections()`.
- Ctrl/Cmd+K search over Stati's search index, an on-page table of
  contents that tracks the section in view, heading links, and code
  blocks highlighted at build time with a copy button.
- Light and dark themes with a toggle, a mobile navigation drawer,
  self-hosted Inter, a sitemap, `robots.txt`, link previews and
  breadcrumb structured data, drafts and a 404 page.

The interactive prompt offers Docs, and the bundled agent skill lists
the new template.
