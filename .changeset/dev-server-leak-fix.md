---
'@stati/core': patch
---

Fix dev server memory leak and rebuild-time growth by reusing the markdown-it and Eta engines across rebuilds.
