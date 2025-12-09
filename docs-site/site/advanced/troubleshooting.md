---
title: 'Troubleshooting'
description: 'Common errors and solutions when using Stati.'
order: 5
---

# Troubleshooting

Common errors you may encounter when using Stati and how to fix them.

## Error: `stati.config.ts` not found

**Cause:**
Stati could not find a configuration file in the current directory.

**Solution:**

1. Ensure `stati.config.ts` (or `stati.config.js`) exists in your project root
2. Run commands from the project root directory
3. If using a custom path, specify it with `--config`: `stati build --config ./config/stati.config.ts`

---

## Error: `layout.eta` not found

**Cause:**
A page references a layout that doesn't exist.

**Solution:**

1. Check the `layout` field in your page's frontmatter
2. Ensure the layout file exists in `site/` (e.g., `site/layout.eta`)
3. Use paths relative to `site/` **without** the `.eta` extension: `layout: layout` or `layout: layouts/blog`

---

## Error: Template syntax error

**Cause:**
Invalid Eta template syntax.

**Solution:**

1. Check for unclosed tags: `<%` must have matching `%>`
2. Use `<%~` for unescaped output (HTML), `<%=` for escaped output
3. Avoid partial dynamic attributes (see [Eta Template Restrictions](/core-concepts/templates/#restrictions))

---

## Build is slow

**Cause:**
Full rebuilds on every change, or ISG cache may be corrupted.

**Solution:**

1. ISG is enabled by default; if disabled, re-enable with `isg: { enabled: true }` in `stati.config.ts`
2. Use `stati dev` during development for hot reload
3. Run `npm run clean` then `stati build` if cache is corrupted

---

## SEO tags not appearing

**Cause:**
Auto-injection disabled or manual generation not called.

**Solution:**

1. Check `seo.autoInject` is not set to `false`
2. If using manual mode, add `<%~ stati.generateSEO() %>` to your layout's `<head>`
3. Ensure `site.baseUrl` is set for canonical URLs

---

## Cache hiccups or stale content

**Cause:**
ISG cache is outdated or corrupted.

**Solution:**

1. Run `npm run clean` to clear the `.stati/` directory and `dist/` folder
2. Run `stati build --clean` to force a full rebuild
3. Check your ISG TTL settings in `stati.config.ts`

---

## Templates not refreshing during development

**Cause:**
The development server may not be detecting file changes correctly.

**Solution:**

1. Ensure you're running `stati dev` from your project root
2. Check that your editor is saving files (some editors have auto-save delays)
3. Try restarting the development server

---

## Markdown content not rendering

**Cause:**
Markdown file may have invalid frontmatter or syntax issues.

**Solution:**

1. Ensure frontmatter is valid YAML between `---` delimiters
2. Check for unclosed code blocks or invalid Markdown syntax
3. Verify the file has a `.md` extension
4. Check the `layout` field points to an existing template

---

## Error: Assets not loading

**Cause:**
Static assets may not be copied or paths may be incorrect.

**Solution:**

1. Ensure assets are in the `public/` directory
2. Use absolute paths starting with `/` (e.g., `/images/logo.png`)
3. Run `stati build` to copy static assets to `dist/`
4. Check browser console for 404 errors

---

## RSS feed not generating

**Cause:**
RSS feeds are only generated during production builds, not in development mode.

**Solution:**

1. Run `stati build` (not `stati dev`) to generate the RSS feed
2. Ensure `rss.enabled: true` is set in your `stati.config.ts`
3. Verify `site.baseUrl` is configured (required for RSS URLs)
4. Check the `dist/` directory for the generated `feed.xml` file

---

## Sitemap not generating

**Cause:**
Sitemaps are only generated during production builds.

**Solution:**

1. Run `stati build` (not `stati dev`) to generate the sitemap
2. Enable sitemap in config: `sitemap: { enabled: true }`
3. Ensure `site.baseUrl` is set (required for absolute URLs)
4. Check `dist/sitemap.xml` exists after building

---

## TypeScript bundles not appearing

**Cause:**
TypeScript auto-injection may be disabled or bundles may not be compiling.

**Solution:**

1. Ensure `typescript.enabled: true` in your config
2. Check that `autoInject` is not set to `false`
3. Verify your entry point exists at `src/main.ts` (or configured `srcDir`)
4. Check the dev server console for TypeScript compilation errors
5. If using `include`/`exclude` patterns in bundles, verify they match your page URLs

---

## Navigation not showing pages

**Cause:**
Navigation generation may have failed or pages are excluded.

**Solution:**

1. Ensure pages have valid frontmatter with `title` field
2. Check that pages don't have `draft: true` (unless using `--include-drafts`)
3. Verify markdown files have `.md` extension
4. Files/folders starting with `_` are excluded from navigation
5. Check for frontmatter parsing errors in build output

---

## Invalid characters in URLs

**Cause:**
Stati preserves filenames exactly (no automatic slug transformation). Spaces, underscores, or special characters in filenames become URL characters.

**Solution:**

1. Use lowercase letters, numbers, and hyphens only in filenames
2. Replace spaces with hyphens: `my-post.md` not `my post.md`
3. Replace underscores with hyphens: `my-post.md` not `my_post.md`
4. Rename files with problematic characters before building

---

## Build hooks failing

**Cause:**
Custom hook functions (`beforeAll`, `afterAll`, `beforeRender`, `afterRender`) are throwing errors.

**Solution:**

1. Wrap hook logic in try-catch for graceful error handling
2. Check the error message in console output for specific details
3. Ensure async hooks return a Promise or use async/await properly
4. Test hooks in isolation before integrating

```javascript
// Example: Safe hook with error handling
hooks: {
  beforeRender: async (ctx) => {
    try {
      await yourLogic();
    } catch (error) {
      console.error('Hook failed:', error);
      // Decide: throw to stop build, or continue
    }
  }
}
```

---

## Tailwind CSS not compiling in development

**Cause:**
Tailwind watcher may not be started or is misconfigured.

**Solution:**

1. Ensure `tailwindcss` is installed locally: `npm install -D tailwindcss`
2. Use both flags: `stati dev --tailwind-input src/styles.css --tailwind-output dist/styles.css`
3. Verify `tailwind.config.js` exists and has correct content paths
4. Add `--tailwind-verbose` to see Tailwind output for debugging
5. Check that the input file path is correct

---

## Partial interpolation in template attributes

**Cause:**
Eta templates don't support mixing static and dynamic text within attribute values like `class="bg-<%= color %>-500"`.

**Solution:**

1. Use template literals for the entire attribute value:

   ```eta
   class="<%= `bg-${color}-500` %>"
   ```

2. For multiple classes, use `stati.propValue()`:

   ```eta
   class="<%= stati.propValue('base-class', `hover:bg-${color}-300`, isActive && 'active') %>"
   ```

3. See [Eta Template Restrictions](/core-concepts/templates/#dynamic-attribute-values) for details

---

## `README.md` appearing as a page

**Cause:**
Stati routes all `.md` files inside the `site/` directory, including `README.md` files placed there.

**Solution:**

1. Move the README outside the `site/` directory (e.g., to project root)
