---
title: 'Troubleshooting'
description: 'Common errors and solutions when using Stati.'
order: 5
---

# Troubleshooting

Common errors you may encounter when using Stati and how to fix them.

## Site uses the default title or `localhost` URLs

**Cause:**
Stati did not use your configuration. Without a `stati.config.ts`, `stati.config.js` or `stati.config.mjs` in the current directory, Stati silently uses its defaults (site title "My Stati Site", base URL `http://localhost:3000`). If the file exists but fails to load, the build prints the error followed by "Falling back to default configuration." and continues with the defaults. Validation errors are different: an option Stati does not know (such as Stati 1's `eta`), `helpers` that are not functions, and invalid `isg` or `images` settings stop the build with an error that names the setting.

**Solution:**

1. Run commands from the project root, where the config file is
2. Read the start of the build output for "Error loading config" and fix the reported error
3. A `.js` config that uses `import` loads anyway, but Node prints a warning unless `package.json` has `"type": "module"`, and the config fails to load if it says `"type": "commonjs"`. Add `"type": "module"` or rename the file to `.mjs`

---

## Page renders with the wrong layout or no styling

**Cause:**
A `layout` named in front matter that names no template logs a warning with similar names, and Stati falls back to the nearest `layout.eta` (or `index.eta` on index pages). If no layout exists at all, Stati logs "No layout template found, using fallback" and writes a bare HTML page.

**Solution:**

1. Check the `layout` field in your page's front matter
2. Ensure the layout file exists in `site/` (e.g., `site/layout.eta`)
3. Name it the way [template names](/core-concepts/templates#template-resolution-order) work: `layout: post` uses the nearest `post.eta` from the page's folder up to `site/`, and `layout: /layouts/blog` uses `site/layouts/blog.eta` only

---

## Error: Template syntax error

**Cause:**
Invalid Eta template syntax.

**Solution:**

1. Check for unclosed tags: `<%` must have matching `%>`
2. Use `<%~` for unescaped output (HTML), `<%=` for escaped output
3. Write JavaScript only inside `<% %>`: TypeScript annotations and `as` casts are syntax errors in templates
4. Read the data from `stati`, not Eta's default `it`

---

## Build is slow

**Cause:**
Full rebuilds on every change, or ISG cache may be corrupted.

**Solution:**

1. ISG is enabled by default; if disabled, re-enable with `isg: { enabled: true }` in `stati.config.ts`
2. Use `stati dev` during development for incremental rebuilds and live reload
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

## Images look stretched or squashed

**Cause:**
Stati adds `width` and `height` to Markdown images. A stylesheet that sets `max-width: 100%` without `height: auto` narrows the image but keeps its full height.

**Solution:**

1. Add `height: auto` next to `max-width` in your image styles
2. Or turn the built-in image handling off with `images: false`

---

## Build stops with an image error

**Cause:**
`images.responsive` or `images.og` is on without `@stati/images` installed, the package doesn't match your `@stati/core` version, or `images.og` has no public `site.baseUrl`.

**Solution:**

See [Images troubleshooting](/configuration/images#troubleshooting) for each message and its fix.

---

## Cache hiccups or stale content

**Cause:**
ISG cache is outdated or corrupted, or a page shows data that Stati doesn't track. Stati rebuilds a page when its own files change and when data it read changes: its [collection](/core-concepts/collections) or the navigation. Data that a helper collects in a `beforeAll` hook isn't tracked, and neither is a change to a helper itself.

**Solution:**

1. Read listings from `stati.collection`, or, in the `beforeAll` hook, write what a page shows into its front matter so it becomes part of the page's hash
2. When a listing shows front matter beyond `title`, `description`, `tags` and `draft`, add the fields to `collections.summaryFields`
3. Run `stati build --clean` to clear `dist/` and `.stati/` and rebuild everything
4. Check your ISG TTL settings in `stati.config.ts`

Pages that no longer exist are removed by every `stati build`, so stale HTML from a deleted or renamed page doesn't need `--clean`.

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
The front matter may not start on the file's first line, or the Markdown may have syntax issues.

**Solution:**

1. Start the file with the opening `---` line. With a blank line or other text before it, the front matter is read as Markdown and shows up in the page. (Front matter that is not valid YAML stops the build with the file and the line.)
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
3. Verify `site.baseUrl` is configured (used for RSS URLs)
4. Check the build output for "RSS configuration validation failed": any validation error stops all feeds
5. Check the `dist/` directory for your configured feed file(s) (filename is set in `rss.feeds[].filename`)

---

## RSS feed is empty

**Cause:**
`contentPatterns` and `excludePatterns` are matched against each page's absolute source file path. A pattern such as `'blog/**'` never matches.

**Solution:**

1. Start folder patterns with `**/`: `contentPatterns: ['**/blog/**']`
2. Check that `excludePatterns` and `filter` do not remove every page

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
TypeScript bundles may not be compiling or bundle patterns may not match your pages.

**Solution:**

1. Ensure `typescript.enabled: true` in your config
2. Verify your entry point exists at `src/main.ts` (or configured `srcDir`)
3. Check the dev server console for TypeScript compilation errors
4. If using `include`/`exclude` patterns in bundles, verify they match your page URLs
5. Bundles are automatically injected when TypeScript is enabled

---

## Navigation not showing pages

**Cause:**
Navigation generation may have failed or pages are excluded.

**Solution:**

1. Give pages a `title` in front matter; without one, the node is labeled with the file name
2. Check that pages don't have `draft: true` (unless using `--include-drafts`)
3. Verify markdown files have `.md` extension
4. Folders starting with `_` are excluded from pages and navigation (individual files starting with `_` are not)
5. Remember that every folder of pages is a top-level node in `stati.nav.tree`; nested folders are not inside their parent's `children` (see [Navigation](/api/navigation#tree-shape))

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
  },
}
```

---

## Tailwind CSS not compiling in development

**Cause:**
Tailwind watcher may not be started, may have stopped, or is misconfigured.

**Solution:**

1. Ensure the Tailwind command is installed locally. Tailwind CSS 4, the version the scaffolder installs, ships it in `@tailwindcss/cli`: `npm install -D tailwindcss @tailwindcss/cli`. With Tailwind CSS 3, `npm install -D tailwindcss@3` includes it
2. Use both flags: `stati dev --tailwind-input src/styles.css --tailwind-output dist/styles.css`
3. Check where Tailwind looks for classes: the `@source` rules in your stylesheet with Tailwind CSS 4, or the `content` paths in `tailwind.config.js` with Tailwind CSS 3
4. Add `--tailwind-verbose` to see Tailwind output for debugging
5. Check that the input file path is correct
6. If the dev server reported that the Tailwind CSS watcher stopped or exited, restart `stati dev`. Tailwind CSS 4 exits when the stylesheet has an error at startup, so fix the error first

---

## Dynamic Tailwind classes missing from the CSS

**Cause:**
Tailwind finds class names by scanning your files, so a class assembled at render time, such as `class="bg-<%= color %>-500"`, is never seen.

**Solution:**

1. Build the classes with `stati.propValue()`, which records every class it returns in `.stati/tailwind-classes.html` when Tailwind is detected:

   ```eta
   class="<%= stati.propValue('base-class', `bg-${color}-500`, isActive && 'active') %>"
   ```

2. Make sure Tailwind scans `.stati/tailwind-classes.html` (projects scaffolded with Tailwind already do). With Tailwind CSS 4, add `@source '../.stati/tailwind-classes.html';` to `src/styles.css`: Tailwind skips gitignored folders such as `.stati/` unless an `@source` rule names them. With Tailwind CSS 3, add `./.stati/tailwind-classes.html` to the `content` array in `tailwind.config.js`
3. See [Tailwind CSS integration](/core-concepts/static-assets#tailwind-css-integration) and [Dynamic attribute values](/core-concepts/templates#dynamic-attribute-values) for details

---

## New sections unstyled after a deploy

**Cause:**
The stylesheet has the same URL in every deploy, such as `/styles.css`, and browsers that visited before still use their cached copy. Some hosts and CDNs cache CSS files for hours whatever the page's own headers say, so new markup arrives with the old CSS.

**Solution:**

Production builds name stylesheets after their content, `/_assets/styles-[hash].css`, so each gets a new URL whenever it changes. A stylesheet still under a fixed name is one the build doesn't see or can't hash:

1. A stylesheet that a script writes to `dist/` after `stati build`, such as a `build:css` script. Build Tailwind with `stati build --tailwind-input src/styles.css --tailwind-output dist/styles.css`, and compile Sass into `public/` before `stati build`. See [Moving from a `build:css` script](/configuration/css#moving-from-a-build-css-script)
2. `css.hash` set to `false` in `stati.config`
3. A stylesheet loaded some other way than a page's `<link>`, such as an `@import` in another stylesheet, or a path with characters other than letters, digits, `-`, `_`, `.` and `/`. Link it from the page, or rename it. See [How pages link the hashed name](/configuration/css#how-pages-link-the-hashed-name)

---

## `README.md` appearing as a page

**Cause:**
Stati routes all `.md` files inside the `site/` directory, including `README.md` files placed there.

**Solution:**

1. Move the README outside the `site/` directory (e.g., to project root)
