---
'@stati/core': major
---

Markdown renders with markdown-it 15. URLs with a scheme and email addresses still become links, but domains without a scheme, such as `www.example.com`, no longer do, so file names such as `README.md` stop turning into links too; `md.linkify.set({ fuzzyLink: true })` in `markdown.configure` brings the old behavior back. Links now end at CJK punctuation and closing quotes, and image alt text keeps inline code. Plugins that import `markdown-it/lib/*` or call `md.utils.assign()`, `has()` or `isString()` need a version that supports markdown-it 15. markdown-it ships its own TypeScript types, so the `md` that `markdown.configure` receives is typed without `@types/markdown-it`, and code that names the type imports it as `import type { MarkdownIt } from 'markdown-it'`.
