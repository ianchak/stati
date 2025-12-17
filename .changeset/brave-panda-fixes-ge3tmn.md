---
"@stati/core": patch
---

Fix dev server template change detection with path normalization. Template changes now reliably trigger page rebuilds by normalizing file watcher and cached dependency paths to a consistent format before comparison.
