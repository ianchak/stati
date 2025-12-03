---
"@stati/core": minor
---

add autoInject option to control script tag injection

- Added `autoInject` option in TypeScriptConfig (default: true)
- When disabled, users can manually place script tags using `stati.assets.bundlePaths` in templates
