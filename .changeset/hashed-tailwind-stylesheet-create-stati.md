---
'create-stati': minor
---

Tailwind projects build their CSS with `stati build --tailwind-input --tailwind-output` instead of a `build:css` script. Sass projects compile into `public/styles.css` before `stati build`, which the generated `.gitignore` lists, so production builds link the stylesheet under a name that changes with its content.
