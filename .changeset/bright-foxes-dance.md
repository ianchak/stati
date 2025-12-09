---
"@stati/core": patch
---

improve dev server file watching with CSS watcher and pending changes queue

- Add separate CSS watcher for output directory to enable live reload when external tools update CSS
- Implement pending changes queue to prevent file changes from being lost during active builds
- Improve incremental rebuild logging with action-specific messages (rebuilt, copied, deleted)
- Fix recursive copy logging parameter in static asset copying
