---
"@stati/core": patch
---

Fix a dev-server startup regression where pages could render before TypeScript bundles were available.
In development mode, build now compiles TypeScript once when no bundles exist yet, ensuring scripts are injected on first load.
