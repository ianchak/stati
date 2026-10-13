---
'@stati/core': patch
'@stati/cli': patch
'create-stati': patch
---

Upgrade yargs to 18 in `@stati/cli` and require Node.js `^22.12.0 || >=24`. The published packages now declare this in `engines`, and new projects from `create-stati` declare it too. Node 22.0–22.11 is no longer supported because yargs 18 requires 22.12 or later.
