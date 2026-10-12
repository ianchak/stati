---
"@stati/core": patch
---

Keep acronyms uppercase in search index breadcrumbs

URL segments such as `cli`, `api`, `seo` and `rss` now produce
"CLI > Commands" instead of "Cli > Commands" in `SearchDocument.breadcrumb`.
