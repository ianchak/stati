---
'@stati/core': patch
---

Tailwind CSS 4 projects are recognized by `@tailwindcss/cli` or `@tailwindcss/postcss` in `package.json` as well as by `tailwindcss`, so their class inventory is written even without a `tailwind.config.js`. The comment at the top of `.stati/tailwind-classes.html` shows the `@source` rule that Tailwind CSS 4 needs to scan it, next to the `content` entry for Tailwind CSS 3.
