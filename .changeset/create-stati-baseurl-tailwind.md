---
'create-stati': patch
---

New blank sites get a placeholder `site.baseUrl`, which the config type requires, so their TypeScript config type-checks as generated. Sites set up with Tailwind no longer keep `public/styles.css`: every build copied it over the compiled `dist/styles.css`, so under `stati dev` the Tailwind styles could disappear after an edit.
