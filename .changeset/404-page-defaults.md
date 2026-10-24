---
'@stati/core': minor
---

Stati recognises the site's 404 page, the page at `/404` or `/404/` that `stati dev` and `stati preview` serve for a missing URL, and keeps it out of the outputs that list a site's pages. Sites no longer repeat the same exclusions across their config and front matter.

- The sitemap, the search index and every RSS feed leave it out, and `images.og` draws no card for it.
- `stati.nav` leaves it out, so `stati.page.navNode` is `undefined` on that page.
- Its robots meta tag gets `noindex`, filled into `seo.noindex` like the other SEO defaults, unless the page sets `seo.noindex`, or a `seo.robots` value that says whether to index it (`index`, `noindex`, `all`, `none`, or `index` in the object form). A value such as `nofollow` gets `noindex` added. Requested by its own URL, the page is an ordinary file that most hosts send with a 200, so without `noindex` a search engine could list it.
- Front matter opts back in: `sitemap.exclude: false` (with `seo.noindex: false`, or the page is listed as noindex), `search: true`, `nav: true`. Only the page at the site root counts: `/docs/404` is an ordinary page. Collections are unchanged.

The sitemap also leaves out every page marked noindex (`seo.noindex: true`, `seo.robots.index: false`, or a `seo.robots` string with a `noindex` or `none` directive), as search engines report a sitemap URL marked noindex as an error. `sitemap.exclude: false` keeps such a page in.

Existing exclude patterns and front matter keep working; they are now redundant. A 404 page cached by an earlier version is rebuilt once.
