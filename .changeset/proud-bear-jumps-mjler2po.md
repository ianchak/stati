---
"@stati/core": minor
---

Improve dev server performance with comprehensive caching and concurrency management

- Cache markdown processor, templates, file hashes, and config in dev mode
- Add dev server lock manager to prevent multiple instances
- Optimize cache updates with fast mode that reuses existing deps
- Add batched pending changes queue for incremental rebuilds
- Skip TypeScript compilation in dev when bundles exist
- Add isDevelopment(), isProduction(), isTest() helpers
