---
"create-stati": patch
---

remove deprecated CSSProcessor class

- Removed the deprecated `CSSProcessor` class wrapper
- The `processStyling` function should be used directly instead
- Updated tests to use the function-based API
