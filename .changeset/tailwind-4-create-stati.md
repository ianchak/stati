---
'create-stati': minor
---

Sites created with `--styling=tailwind` use Tailwind CSS 4: `tailwindcss` and `@tailwindcss/cli` replace Tailwind CSS 3, `autoprefixer` and `postcss`. Tailwind is configured in `src/styles.css`, so there is no `tailwind.config.js`; the stylesheet imports Tailwind and adds an `@source` rule for `.stati/tailwind-classes.html`, which Tailwind would otherwise skip because `.stati/` is gitignored. The blog and docs templates keep their own stylesheet in Tailwind's `components` layer, where it overrides Tailwind's base styles and utility classes override it; both render as they did with Tailwind CSS 3.
