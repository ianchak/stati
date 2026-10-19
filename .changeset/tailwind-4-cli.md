---
'@stati/cli': minor
---

`stati dev --tailwind-input` runs Tailwind CSS 4 as well as 3. The `tailwindcss` peer range is now `^3.0.0 || ^4.0.0`, so npm no longer refuses to install Tailwind CSS 4 next to the CLI, and `@tailwindcss/cli`, which provides the `tailwindcss` command in version 4, is an optional peer. Tailwind CSS 4's errors are shown in the dev server output: they arrived together with the "Done in" line and were hidden unless `--tailwind-verbose` was set. When the command is missing, the message names `@tailwindcss/cli`.
