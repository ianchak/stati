---
'@stati/core': patch
---

Open Graph and Twitter card image URLs are now built with `resolveAbsoluteUrl`, so a `site.baseUrl` that ends in a trailing slash no longer produces a double slash in `og:image` and `twitter:image`. Sitemap dates (`sitemap.lastmod`, `updated`, `date`) are now validated before formatting: an invalid date such as `updated: soon` is skipped with a warning that names the page and the field, instead of failing the build with `RangeError: Invalid time value`.
