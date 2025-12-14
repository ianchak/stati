---
"@stati/core": minor
---

feat(toc): add build-time TOC extraction and heading anchor generation

- Add `TocEntry` type for representing table of contents entries with `id`, `text`, and `level` properties
- Implement `slugify` utility for generating URL-friendly anchor IDs with full Unicode transliteration support
- Enhance `renderMarkdown` to extract TOC entries and inject anchor IDs into heading elements (h2-h6)
- Add `toc` array to template context (`page.toc`) for building in-page navigation
- Add `markdown.toc` config option to enable/disable TOC extraction (default: true)
- Handle duplicate heading IDs by appending numeric suffixes
- Warn when frontmatter contains reserved keys that conflict with page properties
