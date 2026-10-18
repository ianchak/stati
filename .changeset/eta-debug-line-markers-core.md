---
'@stati/core': patch
---

Template tags that start with `(`, `[` or a template literal render under `stati dev` too. The line markers Eta adds in development no longer join them to the statement before, which failed with errors such as "1 is not a function".
