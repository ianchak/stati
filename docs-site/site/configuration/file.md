---
title: 'Configuration file'
description: 'Where Stati looks for stati.config.ts, how it merges and validates your config, and the main options.'
order: 1
seo:
  title: 'Stati configuration file'
---

# Configuration file

## File name and location

Stati looks in the directory you run it from for `stati.config.ts`, then `stati.config.js`, then `stati.config.mjs`, and uses the first one it finds. The file's default export is the configuration. Without a config file, Stati uses its defaults:

| Option | Default |
| ------ | ------- |
| `srcDir` | `'site'` |
| `outDir` | `'dist'` |
| `staticDir` | `'public'` |
| `site.title` | `'My Stati Site'` |
| `site.baseUrl` | `'http://localhost:3000'` |
| `isg` | `{ enabled: true, ttlSeconds: 21600, maxAgeCapDays: 365 }` |

Your config is merged over these defaults: `site` and `isg` field by field, every other section replaces the default as a whole.

- If the file fails to load, for example with a syntax error, Stati prints the error and "Falling back to default configuration." and builds with the defaults, so watch the output.
- These stop the build with an error instead: a top-level option Stati does not know (such as a leftover `eta` block), `helpers` entries that are not functions, invalid `isg`, `images`, `readingTime` or `css` blocks, an invalid `search.fields` list, invalid `seo.defaultAuthor.twitter`, `seo.twitter` or `seo.articles` values, and an invalid `sitemap.news` block. Unknown keys are rejected at the top level and inside `css`, `images`, `readingTime`, `seo.twitter`, `seo.articles` and `sitemap.news`, and ignored inside other blocks, such as `search` or `markdown`.
- An `outDir` that is, contains or sits inside `srcDir`, `staticDir`, `typescript.srcDir` (when TypeScript is enabled) or the `.stati/` cache folder, or that is the project folder or one of its parents, stops the build with an error that names both paths: every build writes pages into `outDir`, and `stati build --clean` deletes it.
- `stati.config.ts` is compiled with esbuild before it loads. Files it imports by relative path are bundled into it; packages stay imports that Node resolves from your project, as in a `.js` config, so they must be installed. When Node can't see a CommonJS package's named exports, as with `fs-extra`, use its default import.
- A `.js` config with `import` statements loads without `"type": "module"` in `package.json`, but Node prints a warning; add it, or name the file `.mjs`.

## Basic setup

Create `stati.config.ts` (or `stati.config.js`) in your project root. `defineConfig()` types the object, so your editor checks the options and completes them:

```typescript
import { defineConfig } from '@stati/core';

export default defineConfig({
  site: {
    title: 'My Stati Site',
    baseUrl: 'https://my-site.com',
    defaultLocale: 'en-US',
  },
});
```

## Configuration sections

### Site metadata

```javascript
export default defineConfig({
  site: {
    title: 'Stati Documentation',        // Required
    baseUrl: 'https://stati.build',      // Required
    description: 'Build static sites',   // Optional
    defaultLocale: 'en-US',              // Optional
  },
});
```

See [Site metadata](/configuration/site-metadata) for each field.

### Markdown configuration

The `markdown` block takes `plugins` (markdown-it plugin names or `[name, options]` tuples), `configure` (a function that receives the markdown-it instance after the plugins) and `toc` (heading anchors and `stati.page.toc`, default `true`). See [Markdown](/configuration/markdown).

### Template configuration

Register functions for your templates under `helpers`, and call them as `stati.helpers.name()`:

```javascript
export default defineConfig({
  helpers: {
    upper: (text) => String(text).toUpperCase(),
  },
});
```

```eta
<span><%= stati.helpers.upper(stati.page.category) %></span>
```

See [Templates](/configuration/templates#helpers) for the rules helpers follow.

### ISG configuration

Incremental Static Generation keeps unchanged pages from the last build:

```javascript
export default defineConfig({
  isg: {
    enabled: true, // default
    ttlSeconds: 21600, // default: rebuild a page after 6 hours
    maxAgeCapDays: 365, // default: pages published longer ago are no longer rebuilt for their TTL
    aging: [
      { untilDays: 7, ttlSeconds: 86400 }, // pages up to 7 days old: 1 day
      { untilDays: 30, ttlSeconds: 604800 }, // up to 30 days old: 1 week
    ],
  },
});
```

See [ISG configuration](/configuration/isg) for how aging rules apply, validation and invalidation.

### Collections configuration

Collections need no configuration: a folder's `index.md` makes one, `paginate` and `[param].md` templates work from front matter. The `collections` block covers the rest:

```javascript
export default defineConfig({
  collections: {
    // Front matter that listings show; changing it rebuilds the pages that list the page
    summaryFields: ['title', 'description', 'tags', 'draft', 'image'],

    // Pages from data, rendered with a [param].md template
    generate: async ({ pages }) => [
      {
        url: '/authors/ada',
        template: 'authors/[author].md',
        label: 'Ada Lovelace',
        items: pages.filter((page) => page.frontMatter.author === 'ada'),
      },
    ],
  },
});
```

**Available Options:**

- `summaryFields` (string[]) - Front matter fields of collection pages whose changes rebuild the pages that list them (default: `['title', 'description', 'tags', 'draft']`; URLs and publish dates always count, `content` stands for the Markdown body, and `wordCount` and `readingTime` for the counts Stati computes)
- `generate` (function) - Returns pages to create, each with a `url` and a `[param].md` `template`, plus optional `key`, `label`, `items` and `data`

See [Collections and generated pages](/core-concepts/collections).

### Reading time configuration

Every page has a [word count and reading time](/core-concepts/markdown#word-count-and-reading-time). The `readingTime` block sets the reading speed:

```javascript
export default defineConfig({
  readingTime: {
    wordsPerMinute: 200,
  },
});
```

**Available Options:**

- `wordsPerMinute` (number) - Words read in a minute; any number above 0 (default: `230`). The reading time is the word count divided by it, rounded to whole minutes, and never less than 1

### Image configuration

Markdown images get their `width`, `height` and lazy loading without any configuration. The `images` block turns on features from the optional `@stati/images` package, or turns the built-in handling off:

```javascript
export default defineConfig({
  images: {
    // Responsive AVIF and WebP images (needs @stati/images)
    responsive: true,

    // An Open Graph image for every page (needs @stati/images and a public site.baseUrl)
    og: true,
  },
});
```

**Available Options:**

- `eagerFirst` (boolean) - Load the first image near the top of a page eagerly (default: true)
- `responsive` (boolean or object) - Responsive variants with `widths`, `formats`, `quality` and `sizes` (default: false)
- `og` (boolean or object) - Open Graph cards with `template`, `width`, `height`, `format`, `fonts` and `exclude` (default: false)
- `dev` (`'fast'` or `'full'`) - Whether the dev server generates responsive images and cards (default: `'fast'`)

Set `images: false` to write Markdown images exactly as authored. Unknown or invalid options stop the build with an error that names them. See [Images](/configuration/images) for every option.

### CSS configuration

Production builds name stylesheets after their content and point the pages' links at those names: the stylesheets in `public/` that pages link, and the one Tailwind CSS builds when `stati dev` and `stati build` get `--tailwind-input` and `--tailwind-output`. The `css` block changes the defaults:

```javascript
export default defineConfig({
  css: {
    hash: true, // _assets/styles-[hash].css in production
    minify: true, // minify the production Tailwind stylesheet
    autoInject: true, // link the Tailwind stylesheet on every page
  },
});
```

See [CSS](/configuration/css) for how the build names and links stylesheets.

### Development server

```javascript
export default defineConfig({
  dev: {
    port: 3000,        // Port (default: 3000)
    host: 'localhost', // Host to bind to (default: 'localhost')
    open: false,       // Open the browser automatically (default: false)
  },
});
```

### Preview server

```javascript
export default defineConfig({
  preview: {
    port: 4000,        // Port (default: 4000)
    host: 'localhost', // Host to bind to (default: 'localhost')
    open: false,       // Open the browser automatically (default: false)
  },
});
```

> **Note:** CLI options (e.g., `stati dev --port 8080` or `stati preview --port 8080`) take precedence over config file settings.

## Advanced configuration

### Build hooks

Add custom logic at various stages of the build process:

```javascript
export default defineConfig({
  hooks: {
    // After pages are loaded, before any page renders - receives BuildContext.
    // Change page data here: beforeAll runs before the cache check.
    async beforeAll(context) {
      console.log('Starting build...');
      console.log(`Building ${context.pages.length} pages`);
      for (const page of context.pages) {
        page.frontMatter.section = page.url.split('/')[1] || 'home';
      }
    },

    // After build completes - receives BuildContext
    async afterAll(context) {
      console.log('Build completed!');
      console.log(`Generated ${context.pages.length} pages`);
    },

    // Before each page renders - receives PageContext. Front matter changed here
    // misses the cache check, so the page would re-render on every build.
    async beforeRender(context) {
      console.log(`Rendering: ${context.page.url}`);
    },

    // After each page renders - receives PageContext
    async afterRender(context) {
      console.log(`Rendered: ${context.page.slug}`);
    },
  },
});
```

`beforeRender` and `afterRender` run only for pages that render again, not for pages the ISG cache serves. See [Build hooks](/api/hooks) for the full order and the caching notes.

## Multi-environment configuration

Configure different settings for development, staging, and production:

```javascript
// config/environments.js
const environments = {
  development: {
    site: {
      title: 'My Site (Dev)',
      baseUrl: 'http://localhost:3000',
    },
    isg: { enabled: false },
    dev: { port: 3000, open: true },
  },

  staging: {
    site: {
      title: 'My Site (Staging)',
      baseUrl: 'https://staging.mysite.com',
    },
    isg: { enabled: true, ttlSeconds: 300 },
  },

  production: {
    site: {
      title: 'My Site',
      baseUrl: 'https://mysite.com',
    },
    isg: {
      enabled: true,
      ttlSeconds: 21600,
      aging: [
        { untilDays: 7, ttlSeconds: 21600 },
        { untilDays: 30, ttlSeconds: 86400 },
      ],
    },
  },
};

export default environments;
```

```javascript
// stati.config.js
import { defineConfig, getEnv } from '@stati/core';
import environments from './config/environments.js';

// STATI_TARGET selects staging; otherwise follow the command:
// `stati build` and `stati preview` → 'production', `stati dev` → 'development'
const env = process.env.STATI_TARGET || getEnv();
const envConfig = environments[env] || environments.development;

export default defineConfig({
  srcDir: 'site',
  outDir: 'dist',
  staticDir: 'public',

  ...envConfig,
});
```

```bash
stati build                       # production settings
STATI_TARGET=staging stati build  # staging settings
stati dev                         # development settings
```

Stati does not set `process.env.NODE_ENV`. A config that selects its settings with `process.env.NODE_ENV || 'development'` gets the development settings during a plain `stati build`, unless your script sets `NODE_ENV=production` itself. `getEnv()` reflects the command that is running. The dev server does not watch the config file, and some settings (such as Markdown plugins) are set up only once, so restart it after changing the config or its environment variables.
