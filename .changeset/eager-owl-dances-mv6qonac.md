---
"@stati/core": patch
"@stati/cli": patch
"create-stati": patch
---

upgrade ESLint 9 to 10

Errors that wrap a lower-level failure (file system operations, cache manifest saves, build and dev server locks, ISG config validation, Tailwind executable lookup, and create-stati styling and package.json setup) now keep the original error as `cause`. Messages are unchanged.
