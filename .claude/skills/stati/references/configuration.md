# Configuration, static assets, CSS, and browser TypeScript

## Configuration files and defaults

Use an ESM default export, with `defineConfig` for editor typing:

```ts
import { defineConfig } from '@stati/core';

export default defineConfig({
  srcDir: 'site',
  outDir: 'dist',
  staticDir: 'public',
  site: {
    title: 'Example',
    baseUrl: 'https://example.com',
    description: 'An example Stati website.',
    defaultLocale: 'en',
  },
});
```

The loader searches `stati.config.ts`, then `.js`, then `.mjs`. JavaScript sites
using `.js` should declare `"type": "module"` in their package manifest; `.mjs`
is explicitly ESM. TypeScript configs are compiled for loading, not browser
delivery: files imported by relative path are bundled in, while packages stay
imports that Node resolves from the project, as in a `.js` config (so a
CommonJS package whose named exports Node cannot see, such as `fs-extra`, needs
a default import). `defineConfig` is an identity/typing helper, **not runtime
validation**.

Loader defaults:

| Field               | Value                   |
| ------------------- | ----------------------- |
| `srcDir`            | `site`                  |
| `outDir`            | `dist`                  |
| `staticDir`         | `public`                |
| `site.title`        | `Stati Site`            |
| `site.baseUrl`      | `http://localhost:3000` |
| `isg.enabled`       | `true`                  |
| `isg.ttlSeconds`    | `21600` (six hours)     |
| `isg.maxAgeCapDays` | `365`                   |

`outDir` must not be, contain or sit inside `srcDir`, `staticDir`, `typescript.srcDir` (when
TypeScript is enabled) or `.stati/`, and must not be the project folder or a parent of it: `loadConfig`
throws a `ConfigValidationError` naming both paths, because every build writes pages into `outDir`
and `stati build --clean` deletes it.

Only `site` and `isg` are explicitly nested-merged with loader defaults. Other
feature blocks apply their own defaults at use time; do not assume `loadConfig`
returns a fully expanded configuration object.

Missing config uses defaults. Ordinary import/compilation errors currently log
and fall back to defaults; ISG validation errors are rethrown. Treat unexpected
default title/domain/output or configuration errors as failed validation.
Config caching uses path and mtime; `clearConfigCache()` is a public programmatic
escape hatch, not an author requirement for every build.

**`configPath` caveat:** `build({ configPath })` loads standard config filenames
from the path's **directory**. It does not reliably select arbitrary names such
as `stati.production.js`. Run from the site root with a recognized filename.
Relative content/static/output paths are also tied to the working directory;
passing a config path is not a substitute for setting the site working directory.

Set the real deployment `site.baseUrl` before production. The path of `baseUrl`
(`https://user.github.io/repo` gives `/repo`) is the site's base path (core 2.5+):
Stati builds for that subfolder with no other setting. Output stays at the root of
`dist/`; the host maps it to the subfolder. Core adds the prefix to bundle scripts,
stylesheet links, the search index meta tag, images and root-absolute Markdown
links; templates add it to their own links with `stati.url()`, and a build with a
base path warns about `href`/`src` values starting with `/` without it. `page.url`,
config URL patterns, front matter and ISG keys stay relative to the site root.
`stati dev` and `stati preview` serve under the base path (`/` redirects there,
`/__ws` stays at the root). `robots.txt` is ignored by crawlers outside a host's root.
Search index entries keep site-relative `url`s; the index holds `basePath`,
so a result links to `index.basePath + doc.url`.
Changing the base path rebuilds every page. Before core 2.5, a path in `baseUrl`
only affected absolute URLs (canonical links, sitemap, feeds).

## Site metadata and custom data

Typed built-ins are `title`, `baseUrl`, `description`, `defaultLocale`.
Additional runtime site fields can be useful, but the public `SiteConfig` is not
an unrestricted arbitrary-data interface. Preserve type safety with a properly
typed extended object:

```ts
import { defineConfig } from '@stati/core';
import type { SiteConfig } from '@stati/core';

const site: SiteConfig & { authorName: string } = {
  title: 'Example',
  baseUrl: 'https://example.com',
  authorName: 'Example author',
};

export default defineConfig({ site });
```

Then templates may use `stati.site.authorName`. Setting `defaultLocale` does not
create translated pages, locale routing, or date formatting automatically.

## Markdown and Eta configuration

```ts
export default defineConfig({
  site: { title: 'Example', baseUrl: 'https://example.com' },
  markdown: {
    toc: true,
    plugins: [['external-links', { externalTarget: '_blank' }]],
    configure: (md) => {
      // Configure only what this site actually needs.
      md.set({ typographer: false });
    },
  },
  helpers: {
    uppercase: (value: string) => value.toUpperCase(),
  },
});
```

Named plugins resolve as `markdown-it-<name>` and must be installed in the site.
The runtime tries the site first, then core dependencies. A missing plugin can
warn and continue; assert its expected rendered behavior instead of trusting the
exit status. `configure` runs after plugin loading.

Core 2.0 runs markdown-it 15, which removed the `markdown-it/lib/*` imports and
`md.utils.assign`, `has` and `isString`; a plugin that uses them fails. Only a
named plugin that fails to load is a warning: an error thrown in `configure` or
by a plugin's rule while rendering fails the build. markdown-it ships its own
types, so `md` in `configure` is typed without `@types/markdown-it`. Take the
type from `import type { MarkdownIt } from '@stati/core'` (core 2.0+): a plain
`'markdown-it'` import can resolve to an untyped markdown-it 14 that a plugin's
peer range installed. A typed `md` can surface errors in plugin calls whose own
types are strict, such as `md.use(prism)`; builds never type-check the config.
markdown-it-prism 3 and 4 both work on the instance Stati passes them. From 3.0.1 they declare
markdown-it `<15`, so npm installs a second markdown-it 14 beside Stati's,
without a warning. Version 4 puts the `language-*` class on `<code>` only, so
Prism theme rules for `pre[class*="language-"]` also need
`pre:has(> code[class*="language-"])`.

`stati.helpers.uppercase(value)` calls a registered helper (core 2.0+; 1.x used
`eta.filters` and `stati.uppercase()`); pipes are not supported. `helpers` must be
an object of functions, checked when the config loads, and an `eta` key is
rejected as an unknown option. Helpers live under `stati.helpers`, so they never
shadow Stati's own keys. Prefer synchronous, deterministic helpers. Full rules are
in the Eta reference. Data a helper returns is invisible to ISG, and so is a change
to a helper: a page listing posts through a helper is not rebuilt when the posts
change. Prefer `stati.collection`, and rebuild with `--force` after editing a helper.

## Collections

Core 1.29+. Collections, `paginate` and `[param].md` templates need no config;
the optional block:

```ts
collections: {
  // Frontmatter that listings show; default ['title', 'description', 'tags', 'draft'].
  // URL and publish date always count; 'content' means the Markdown body, and
  // 'wordCount' and 'readingTime' mean the counts Stati computes for each page.
  summaryFields: ['title', 'description', 'tags', 'draft', 'image', 'readingTime'],
  // Pages from data, rendered by a [param].md template (path relative to srcDir)
  generate: async ({ config, pages }) => [
    { url: '/authors/ada', template: 'authors/[author].md', label: 'Ada', items: [], data: {} },
  ],
},
```

`generate` runs once per build after content loads (before navigation and
`beforeAll`), receives content pages without templates, and may be async; a
throw fails the build. Entries need `url` (starting with `/`) and an existing
template, else they are skipped with a warning. `data` must be JSON-serializable;
it is hashed, so changing it rebuilds the page. See the content reference.

## Reading time

Every page has `wordCount` and `readingTime` (see the content reference). The only
option is the reading speed:

```ts
readingTime: { wordsPerMinute: 230 }, // default; any number above 0, checked when the config loads
```

A listing that shows `post.readingTime` and names `readingTime` in
`collections.summaryFields` rebuilds only when the minutes change, not on every edit.
Changing the speed rebuilds the pages whose minutes change.

## Static assets

`public/styles.css` becomes `dist/styles.css`; `public/images/logo.svg` becomes
`dist/images/logo.svg`. Use `/styles.css` and `/images/logo.svg` as public URLs
for root-hosted sites, never `/public/...` or filesystem paths.

Static files are copied, not bundled or optimized. Put fonts, favicon files,
images, downloads, and plain browser scripts here when they need no compilation.
Do not put private configuration, credentials, or unpublished content in public
assets. Avoid collisions with generated page HTML, bundle paths, search index,
feeds, sitemap, or robots files. Leave `public/_img/` unused: `/_img/` holds
copied and generated images.

## Images

From core 1.28, Markdown images (`![alt](src)`) get their intrinsic `width` and
`height` (read from the file, EXIF rotation applied), `loading="lazy"` and
`decoding="async"` with no configuration. A page's first image in its first few
blocks loads eagerly with `fetchpriority="high"` (`images.eagerFirst: false` turns
that off).

- `/images/a.jpg` resolves from `public/`; `./a.jpg` resolves next to the page's
  Markdown file and is copied to `/_img/{name}-{hash}.{ext}`.
- Left as authored: remote URLs, `data:` URIs, SVG and other formats, paths ending
  in `?raw` (the suffix is removed), and raw `<img>` HTML. Missing files warn.
- The site CSS needs `img { max-width: 100%; height: auto; }`, or sized images
  stretch when narrowed. The starters have it.
- `images: false` turns all of this off.

In templates use `stati.image(src, options)`; see the Eta reference.

Two features need the optional `@stati/images` package; each is independent:

```ts
images: {
  responsive: true, // or { widths, formats, quality, sizes }
  og: true, // or { template, width, height, format, fonts, exclude }
}
```

- `responsive` writes `<picture>` with AVIF and WebP `srcset`s plus a fallback in the
  source format (GIF becomes PNG; PNG stays lossless). Widths never exceed the
  image's own width. Animated images keep the built-in behavior.
- `og` generates a link preview card per page; see the features reference.
- With either on and the package missing, every build, including the dev server,
  stops with `images.<feature> requires @stati/images. Run: npm i -D @stati/images`.
- `images.dev: 'fast'` (default) skips both in the dev server; `'full'` runs them.
- Generated files live in `dist/_img/`, keyed by content and options, reused
  between builds via `.stati/images/manifest.json`. `stati build` deletes generated
  files no page uses; it never deletes files copied from `public/`.

Do not hand-write `width`, `height` or `loading` on Markdown images; use real
asset files, not broken placeholders, and always write alt text.

## Styling

Preserve scaffold-generated scripts; they orchestrate styling differently.

| Choice    | Author source       | Public output                                            | Workflow                                                     |
| --------- | ------------------- | -------------------------------------------------------- | ------------------------------------------------------------ |
| Plain CSS | `public/styles.css` | `/styles.css` in dev, `/_assets/styles-[hash].css` built | Copied, and hashed when a page links it                      |
| Sass      | `src/styles.scss`   | `/styles.css` in dev, `/_assets/styles-[hash].css` built | `build:css` into `public/` before `stati build`, `watch:css` |
| Tailwind  | `src/styles.css`    | `/styles.css` in dev, `/_assets/styles-[hash].css` built | `--tailwind-input`/`--tailwind-output` on `dev` and `build`  |

Scaffolding supports `--styling css`, `sass`, or `tailwind`. Do not replace Sass
or Tailwind scripts with a plain `"build": "stati build"` shortcut.

Templates link `/styles.css` in every setup. Production builds (`css.hash`, on by
default) point each `<link>` that applies, offers or preloads a stylesheet
(`rel="stylesheet"`, `rel="alternate stylesheet"`, `rel="preload" as="style"`) at
a copy named after its content, `_assets/[folder/]name-[hash].css`; development
keeps the own names.

- Covered: a `.css` file in `public/` a page links, and the Tailwind output. The
  `public/` file is still copied under its own name; a file only another
  stylesheet `@import`s, or one with characters other than letters, digits, `-`,
  `_`, `.` and `/`, keeps its name. Links keep quotes, a query or fragment and
  the site's own origin; relative links resolve against the page. Links with an
  `integrity` digest, and links in comments, scripts and templates, stay as they are.
- The Tailwind output is written only under its hashed name, never as
  `dist/styles.css` (one the dev watcher left there is stale). So a hashed build
  stops when a page links it with `integrity`, or when a `public/` stylesheet a
  page links `@import`s or `url()`s it; a script or another site that loads
  `/styles.css` gets nothing. `css.hash: false` writes it under its own name.
- Relative `url()` references and `@import` strings in the CSS become root paths
  (`url(fonts/a.woff2)` from `/styles.css` becomes `url(/fonts/a.woff2)`), so
  `_assets/` loads the same files.
- Cached ISG pages get the new name written in when the CSS changes, so a CSS
  change re-renders nothing; a stylesheet removed from `public/` goes back to its
  own path, and one added later gets linked. Only their stylesheet links change. Earlier hashed copies are deleted. The first hashing build re-renders
  every page.
- Sass compiles into `public/styles.css` (gitignored) before `stati build`. A
  script that writes CSS to `dist/` after `stati build` keeps a fixed name.

`stati build --tailwind-input src/styles.css --tailwind-output dist/styles.css`
runs Tailwind once after the last page renders, minified, and writes
`dist/_assets/styles-[hash].css`; a `dist/styles.css` the dev server wrote stays.
`stati dev` with the same flags links `/styles.css`.

- The output must be a `.css` file inside the output directory; the build fails
  otherwise, and when the input or the Tailwind CLI is missing, before rendering.
- Pages without a `<link rel="stylesheet">` to the output get one before
  `</head>` (a preload or an alternate stylesheet doesn't count); turn that off
  with `css.autoInject: false`. `stati.assets.stylesheetPaths` holds the path;
  print it unchanged, because a hashed build writes the final name into the page
  after rendering. If Tailwind fails, the previous pages stay as they were.
- A file in `public/` at the Tailwind output's path is never copied, in dev or in
  production, hashed or not, and the build warns about it.
- `css: { hash, minify, autoInject }`, all `true` by default; development never
  hashes or minifies. `minify` and `autoInject` apply to the Tailwind stylesheet
  only. `hash: false` links every stylesheet under its own name.

Tailwind's scaffold installs Tailwind CSS 4 (`tailwindcss` and
`@tailwindcss/cli`) and configures it in `src/styles.css`, without a
`tailwind.config.js`. Tailwind finds the templates itself but skips gitignored
folders, so the stylesheet adds the inventory with
`@source '../.stati/tailwind-classes.html';`. A Tailwind CSS 3 project lists
`./site/**/*.{md,eta,html}` and `./.stati/tailwind-classes.html` in the
`content` array of `tailwind.config.js` instead. `stati dev --tailwind-input`
runs either version.
`stati.propValue()` records runtime tokens for that inventory. Production
styling must run in the proper order so classes recorded during rendering exist
before the final CSS compilation: `stati build` with the Tailwind flags does this
itself, and a separate Tailwind `build:css` script must run after `stati build`. Retain the
actual installed scaffold's build order and verify the emitted CSS.

Literal variant maps are safer than constructing unbounded classes from user
data. Inventory only includes exercised dynamic branches; it is not a guarantee
that every unseen runtime variant will exist. Follow the installed Tailwind
version's syntax; do not silently migrate a scaffold to another major version.

## Browser TypeScript

Optional `typescript.enabled` activates esbuild for client-side code. It is
distinct from using a TypeScript config.

```ts
typescript: {
  enabled: true,
  srcDir: 'src',
  outDir: '_assets',
  hash: true,
  minify: true,
  autoInject: true,
  bundles: [
    { entryPoint: 'main.ts', bundleName: 'main' },
    {
      entryPoint: 'docs.ts',
      bundleName: 'docs',
      include: ['/docs', '/docs/**', '/api/**'],
      exclude: ['/docs/legacy/**'],
    },
  ],
}
```

- Defaults: source `src`, output subdirectory `_assets`, entry `main.ts`, bundle
  `main` if no bundle list is supplied.
- Entry points are relative to the TypeScript source directory, not `site`.
  Output subdirectory is inside the site's output tree, not a second site root.
- Compilation targets browser ESM, `es2022`; Node-only APIs do not belong here.
- Production hashing/minification default on; development uses stable filenames,
  source maps, and unminified output. Do not hardcode a production hash.
- Bundle names must be unique.
- Include/exclude patterns match the page **URL**, e.g. `/docs/guide` (`/` for
  the home page), not the output file `/docs/guide.html` or the Markdown source
  path. ISG invalidation keys are output paths; bundle patterns are not.
- A pattern must match the whole URL: `/docs/**` matches `/docs/guide` but not
  the `/docs` index page, so list `/docs` too. Brace alternatives such as
  `{a,b}` are not supported; list each pattern. No includes means global;
  excludes win. Matching bundle order follows config order.
- Templates can inspect `stati.assets?.bundlePaths ?? []`.
- Standard builds auto-inject matching module script tags. Do not emit a second
  copy of the same scripts without verifying the injector's deduplication.
- For manual placement set `typescript.autoInject: false`, then emit guarded
  `bundlePaths` as `<script type="module" src="<%= path %>"></script>`.
- Bundling is not type checking. Run the site's `typecheck` script when one exists.
- Browser scripts must handle missing DOM elements on pages sharing a global
  bundle. Use progressive enhancement; readable content and links should work
  without JavaScript.

Source authority: `packages/core/src/config/loader.ts`, `types/config.ts`,
`core/utils/typescript.utils.ts`, `bundle-matching.utils.ts`,
`tailwind-inventory.utils.ts`, `css/` (the Tailwind stylesheet); scaffolder styling processors in
`packages/create-stati/src/`. These paths belong to the Stati source checkout.
