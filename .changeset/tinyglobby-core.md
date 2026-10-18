---
'@stati/core': patch
---

Stati finds content, templates and the dev server's CSS files with tinyglobby instead of fast-glob, so `npm audit` no longer reports the braces advisory that fast-glob brought in through micromatch. Content files are read in path order, so pages that sort equally, such as undated pages in the RSS feed and the sitemap, keep the same order on every build.
