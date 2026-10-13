---
'@stati/core': minor
'create-stati': patch
---

In the dev server, reading an unknown `stati.*` property in an Eta template now fails with the template file, line, and a "Did you mean" suggestion in the error overlay. The bundled agent skill documents the check.
