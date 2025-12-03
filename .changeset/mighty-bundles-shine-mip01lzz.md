---
"@stati/core": minor
---

add multiple TypeScript bundles support

- Added `bundles` array in TypeScriptConfig for defining multiple entry points
- Each bundle can target specific pages using `include`/`exclude` glob patterns
- Bundles compile in parallel for faster builds
- Replaces deprecated `entryPoint` and `bundleName` single-bundle options
- Added `BundleConfig` interface with `entryPoint`, `bundleName`, `include`, `exclude` properties
- Dev server now supports multiple TypeScript watchers (one per bundle)
