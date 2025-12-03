---
"@stati/core": minor
---

add validation for unique bundle names

- Added `DuplicateBundleNameError` thrown when duplicate bundleNames are detected
- Validation runs early during compilation to fail fast with a clear error message
