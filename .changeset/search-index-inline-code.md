---
'@stati/core': patch
---

Keep inline code and clean up tables in search index text

`SearchDocument.content` now keeps the text of inline code instead of
dropping it, so searching for an option or function name such as
`ttlSeconds` finds the section that mentions it.

- Code spans with longer delimiters (`` `a` ``) stay one span.
- Spans written with three backticks inside a sentence are no longer
  mistaken for code blocks. Fenced blocks opened with `~~~` are now
  removed like those opened with three backticks.
- Table pipes and delimiter rows are removed from indexed text.
