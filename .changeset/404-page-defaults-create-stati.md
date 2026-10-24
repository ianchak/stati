---
'create-stati': patch
---

The blog and docs templates no longer leave their 404 page out of the sitemap and search themselves or mark it `noindex`, and `--images` no longer writes `og: { exclude: ['/404'] }`: `@stati/core` 2.2 does all of this for every site. The bundled Stati agent skill describes the 404 page defaults.
