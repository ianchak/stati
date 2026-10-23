---
'@stati/core': minor
---

Site-wide SEO defaults for `og:locale`, the Twitter handles and Open Graph article tags, so a site no longer writes them into every page's front matter from a `beforeAll` hook. Each value is used only where the page's front matter leaves it out.

- `og:locale` comes from `site.defaultLocale` converted to Open Graph form: `en-US` becomes `en_US`, `pt-br` becomes `pt_BR`, `zh-Hant-TW` becomes `zh_TW`. Stati used to print `defaultLocale` as written, so a site following the docs printed an invalid `en-US`. A tag without a region, such as `en`, now prints no `og:locale`, and `seo.debug` warns about it.
- `seo.defaultAuthor.twitter` and a page's own `seo.author.twitter` give `twitter:creator`; `seo.twitter.site` gives `twitter:site`. Handles are accepted with or without `@` and printed with one. A page that names its own author never gets the default author's handle.
- `seo.articles: { include, exclude }` takes URL glob patterns, with the same rules as bundle `include` and `exclude`. A matching page prints `og:type` `article`, `article:published_time` from its publish date, `article:modified_time` from `updated`, one `article:tag` per tag and `article:author` from the author's `url`, filled in value by value. Generated pages and the pages of a paginated listing never match.
- Stati writes these values into each page's `seo` front matter after the `beforeAll` hook, so templates read them as `stati.page.seo`, and changing one of them rebuilds the cached pages it changes. After the `beforeRender` hook, values Stati filled in are worked out again from the page as the hook left it, so a hook that sets the author or tags gets matching tags.
- The config loader rejects `seo.articles`, `seo.twitter` and `seo.defaultAuthor.twitter` values of the wrong type.

`twitter:creator` no longer falls back to the author's name, which was never a valid handle. Sites that relied on it lose the tag until they set a `twitter` handle on the author.
