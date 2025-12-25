---
"@stati/core": patch
---

Optimize search index and Tailwind inventory writes in dev mode

- Skip writes when content hash unchanged (search index and Tailwind inventory)
- Use MD5 hash for accurate change detection
- Escape single quotes in HTML output for security
