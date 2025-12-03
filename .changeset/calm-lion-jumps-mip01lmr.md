---
"@stati/core": minor
---

change StatiAssets to support multiple bundles

- Replaced `bundleName` and `bundlePath` with `bundlePaths` array
- `bundlePaths` contains all matched bundle paths for each page
- Updated build pipeline to compute per-page bundle matching
