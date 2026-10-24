---
'@stati/core': minor
---

`build()` and `createDevServer()` take `tailwind: { input, output }`. Production builds run Tailwind CSS after the last page renders, write `_assets/[name]-[hash].css`, with relative `url()` references rewritten from the site root, and link it on every page, including cached ones. New `css` options (`hash`, `minify`, `autoInject`) and `stati.assets.stylesheetPaths`.
