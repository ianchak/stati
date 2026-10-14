---
'@stati/core': patch
'create-stati': patch
---

Read page publish dates the same way everywhere. `PageModel.publishedAt`, and with it `stati.collection.recentPages` and navigation order, now accepts unquoted YAML dates (`publishedAt: 2026-01-01`) and falls back to `published`, `date` and `createdAt`, matching ISG aging. RSS sorting and the default `pubDate` use the same fields and skip invalid values instead of stopping at them. Invalid dates are reported with a warning. The `FrontMatter` type now allows `Date` for `publishedAt` and `date`, and the bundled Stati agent skill describes the new behavior.
