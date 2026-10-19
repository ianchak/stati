---
'create-stati': minor
---

New docs sites use markdown-it-prism 4, which puts a code block's `language-*` class on `<code>` only. The docs template reads the language from there, so code blocks keep their highlighting, label and copy button.
