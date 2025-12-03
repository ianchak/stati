---
"@stati/core": minor
---

add bundle matching utilities for per-page targeting

- Added `matchBundlesForPage` to filter bundles based on include/exclude glob patterns
- Added `getBundlePathsForPage` to get bundle paths for compiled bundles
- Bundle order from config is preserved
- Exclude patterns take precedence over include patterns
