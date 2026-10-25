---
'@stati/core': minor
---

`createDevServer()` and `createPreviewServer()` no longer take `configPath`. Both servers, and the builds the dev server runs, load `stati.config.*` from the current directory. Before, the dev server read its own settings from the current directory but built with the config next to `configPath`, and the preview server ignored the option.
