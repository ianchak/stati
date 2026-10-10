---
'@stati/core': patch
---

Fix importing `SiteConfig` from `@stati/core` by exporting it from the package root.
Correct the `@stati/core/types` and `@stati/core/config` export mappings to point to
the declarations and JavaScript files emitted by the build.
