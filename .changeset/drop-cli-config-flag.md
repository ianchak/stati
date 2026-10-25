---
'@stati/cli': minor
---

`stati build`, `stati dev` and `stati preview` no longer take `--config`. Every command loads `stati.config.*` from the current directory, so run Stati from the project root.
