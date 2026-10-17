---
'@stati/core': patch
---

Fix cache reuse for sites with search: production builds name the hashed search index after its content instead of the build time, so a build that changes no indexed text reuses every cached page again (since 1.24.3 every production build with search re-rendered every page). The index is now generated before rendering, after `beforeAll`.

`stati build` deletes the hashed TypeScript bundles and search index files that earlier builds wrote in `dist/`, and the bundle and source map `stati dev` leaves there.

`stati dev` and `stati preview` serve `.mjs`, `.avif`, `.xml`, `.txt` and other common files with the right content type, serve the site's `404.html` for a missing URL, ignore query strings and decode escaped file names. They also no longer serve a file outside the output directory: a raw request for `/../dist`, when `dist/` has no `index.html`, could read `dist.html` next to it.
