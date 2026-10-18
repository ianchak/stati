---
'create-stati': major
---

New sites use Stati 2: `@stati/core` and `@stati/cli` 2, and the starters' templates are written for them. Their shared pieces move from `site/_partials/` to `site/partials/` and are included with `stati.include()`; the blog and docs templates keep the page around their layouts in one `site/base.eta`, named with `stati.layout()`, and register their functions as `helpers`, called as `stati.helpers.formatDate()` and `stati.helpers.docsSections()`. The blog archive names the site layout as `layout: /layout`. The bundled agent skill documents includes, shells, helpers and the template names they take, and its starter and smoke test use them.
