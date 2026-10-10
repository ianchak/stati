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
delivery. `defineConfig` is an identity/typing helper, **not runtime validation**.

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

Only `site` and `isg` are explicitly nested-merged with loader defaults. Other
feature blocks apply their own defaults at use time; do not assume `loadConfig`
returns a fully expanded configuration object.

Missing config uses defaults. Ordinary import/compilation errors currently log
and fall back to defaults; ISG validation errors are rethrown. Treat unexpected
default title/domain/output or configuration errors as failed validation.
Config caching uses path and mtime; `clearConfigCache()` is a public programmatic
escape hatch, not an author requirement for every build.

**`--config` caveat:** `build({ configPath })` loads standard config filenames
from the path's **directory**. It does not reliably select arbitrary names such
as `stati.production.js`. Run from the site root with a recognized filename.
Relative content/static/output paths are also tied to the working directory;
passing a config path is not a substitute for setting the site working directory.

Set the real deployment `site.baseUrl` before production. Do not expect a base URL
path prefix to rewrite every page link, stylesheet, or bundle URL automatically.
For subpath hosting, audit generated URLs and the host's routing explicitly.

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
  eta: {
    filters: {
      uppercase: (value: string) => value.toUpperCase(),
    },
  },
});
```

Named plugins resolve as `markdown-it-<name>` and must be installed in the site.
The runtime tries the site first, then core dependencies. A missing plugin can
warn and continue; assert its expected rendered behavior instead of trusting the
exit status. `configure` runs after plugin loading.

`stati.uppercase(value)` is a registered filter; pipes are not supported.
Avoid context-reserved filter names. Prefer synchronous, deterministic helpers
safe for repeated component pre-rendering. Full rules are in the Eta reference.

## Static assets

`public/styles.css` becomes `dist/styles.css`; `public/images/logo.svg` becomes
`dist/images/logo.svg`. Use `/styles.css` and `/images/logo.svg` as public URLs
for root-hosted sites, never `/public/...` or filesystem paths.

Static files are copied, not bundled or optimized. Put fonts, favicon files,
images, downloads, and plain browser scripts here when they need no compilation.
Do not put private configuration, credentials, or unpublished content in public
assets. Avoid collisions with generated page HTML, bundle paths, search index,
feeds, sitemap, or robots files.

Stati does not imply responsive image generation or compression. Supply suitable
image sizes, explicit width/height where possible, alt text, and lazy loading for
noncritical images. Use real asset files, not broken placeholders.

## Styling

Preserve scaffold-generated scripts; they orchestrate styling differently.

| Choice    | Author source             | Public output | Workflow                                       |
| --------- | ------------------------- | ------------- | ---------------------------------------------- |
| Plain CSS | `public/styles.css`       | `/styles.css` | Copied directly                                |
| Sass      | `src/styles.scss`         | `/styles.css` | Generated `build:css` / `watch:css`            |
| Tailwind  | `src/styles.css` + config | `/styles.css` | Generated CSS build plus Stati dev integration |

Scaffolding supports `--styling css`, `sass`, or `tailwind`. Do not replace Sass
or Tailwind scripts with a plain `"build": "stati build"` shortcut.

Tailwind's scaffold includes content scanning for
`site/**/*.{md,eta,html}` and `.stati/tailwind-classes.html`.
`stati.propValue()` records runtime tokens for that inventory. Production
styling must run in the proper order so classes recorded during rendering exist
before the final CSS compilation. Retain the actual installed scaffold's build
order and verify the emitted CSS.

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
      include: ['/docs/**', '/api/**'],
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
- Include/exclude matching uses page **output paths**, e.g.
  `/docs/guide.html`, not Markdown source paths. No includes means global;
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
`tailwind-inventory.utils.ts`; scaffolder styling processors in
`packages/create-stati/src/`. These paths belong to the Stati source checkout.
