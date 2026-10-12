---
'create-stati': minor
---

Add a blog template

`create-stati my-blog --template blog` scaffolds a complete blog that
works on first run. Its sample posts explain how each part works.

- Markdown posts with tags, a yearly archive, newer/older links and
  related posts, built from a post index in `helpers/blog.js` that is
  exposed to templates as filters such as `stati.blogPosts()`.
- RSS feed, sitemap, `robots.txt`, Open Graph and Twitter tags, and
  `BlogPosting` structured data.
- Drafts, a 404 page, a default link-preview image, and light and dark
  themes with a self-hosted display face.

The scaffolder now keeps a template's own config and styles:

- The blog's `stati.config.js` is kept, and becomes `stati.config.ts`
  with `typescript.enabled` for TypeScript projects.
- With Tailwind or Sass the blog's stylesheet moves into `src/` instead
  of being replaced by the blank starter's styles.
- Unknown `--template` values are rejected with the list of templates,
  and the interactive prompt offers Blog.
- The bundled agent skill lists the new template.
