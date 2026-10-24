---
'@stati/core': minor
---

Production builds name stylesheets after their content and point the pages' `<link>` tags at those names, so a deploy that changes the CSS gives it a new URL. A `.css` file in the static directory that a page links gets a copy at `_assets/[folder/]name-[hash].css` (the file is still copied under its own name), and `build()` and `createDevServer()` take `tailwind: { input, output }`: production builds run Tailwind CSS after the last page renders and write `_assets/[name]-[hash].css`, adding a link on pages that have none. Relative `url()` references and `@import` strings become paths from the site root, and pages kept by the ISG cache get the new names written in. New `css` options (`hash`, `minify`, `autoInject`) and `stati.assets.stylesheetPaths`. Set `css.hash: false` to keep every stylesheet's own name; the first build that hashes renders every page again.
