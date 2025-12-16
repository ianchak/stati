---
"@stati/core": patch
---

Fix dev server template change detection with path normalization

Template changes in dev mode weren't triggering page rebuilds due to inconsistent path normalization between file watcher events and cached dependencies. This fix adds a `normalizePathForComparison()` utility that converts all paths to absolute POSIX format for reliable comparison across different path representations (Windows/POSIX, relative/absolute).

**Changes:**
- Added `normalizePathForComparison()` utility for consistent path handling
- Fixed `handleTemplateChange()` to properly match template paths across different formats
- Added comprehensive test coverage (16 unit tests + 6 integration tests)

This ensures template changes are reliably detected in development mode, preventing stale page issues.
