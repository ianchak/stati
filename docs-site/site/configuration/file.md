---
title: 'Configuration file'
description: 'Learn how to configure Stati with the stati.config.js (or stati.config.ts) file and available options.'
order: 1
seo:
  title: 'Stati configuration file'
---

# Configuration file

`stati.config.ts` (or `.js`, `.mjs`) configures your site.

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

Your config is merged over these defaults: `site` and `isg` are merged field by field, every other section replaces the default as a whole. If the file fails to load (for example, a syntax error), Stati prints the error and builds with the defaults, so watch the output for "Falling back to default configuration.". These stop the build with an error instead: invalid `isg`, `images`, `readingTime` or `css` blocks, an invalid `search.fields` list, invalid `seo.defaultAuthor.twitter`, `seo.twitter` or `seo.articles` values, an invalid `sitemap.news` block, `helpers` entries that are not functions, and a top-level option Stati does not know (such as a leftover `eta` block). Unknown keys stop the build at the top level and inside `css`, `images`, `readingTime`, `seo.twitter`, `seo.articles` and `sitemap.news`; an unknown key inside other blocks, such as `search` or `markdown`, is ignored (`search.fields` is checked, the other `search` options are not). An `outDir` that is, contains or sits inside `srcDir`, `staticDir`, `typescript.srcDir` (when TypeScript is enabled) or the `.stati/` cache folder, or that is the project folder or one of its parents, stops the build with an error that names both paths, because every build writes pages into `outDir` and `stati build --clean` deletes it. A `stati.config.ts` is compiled with esbuild before it loads: files it imports by relative path are bundled into it, while packages (including CommonJS ones such as `fs-extra`) stay imports that Node resolves from your project at load time, as in a `.js` config, so they must be installed and Node's rules for importing CommonJS apply (when it cannot see a package's named exports, as with `fs-extra`, use the default import). A `.js` config with `import` statements loads without `"type": "module"` in `package.json`, but Node prints a warning; add it, or name the file `.mjs`.

## Basic setup

Create `stati.config.js` in your project root:

```javascript
import { defineConfig } from '@stati/core';

export default defineConfig({
  site: {
    title: 'My Stati Site',
    baseUrl: 'https://my-site.com',
    defaultLocale: 'en-US',
  },
});
```

## TypeScript configuration

For full type safety, use `stati.config.ts`:

```typescript
import { defineConfig } from '@stati/core';
import type { StatiConfig } from '@stati/core';

const config: StatiConfig = {
  site: {
    title: 'My Stati Site',
    baseUrl: 'https://my-site.com',
    defaultLocale: 'en-US',
  },

  // Type-safe plugin configuration
  markdown: {
    plugins: ['footnote'], // loads markdown-it-footnote
  },

  // ISG options with autocomplete
  isg: {
    enabled: true,
    ttlSeconds: 21600,
  },
};

export default defineConfig(config);
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

Register functions for your templates under `helpers`:

```javascript
export default defineConfig({
  helpers: {
    // Date formatting
    date: (date) => {
      return new Intl.DateTimeFormat('en-US', {
        dateStyle: 'long',
      }).format(new Date(date));
    },

    // Uppercase transform
    upper: (text) => String(text).toUpperCase(),
  },
});
```

> **Note:** Helpers are called from templates as `stati.helpers.name()`. Stati's own functions, such as `stati.slugify()`, stay on `stati` itself.

**Using helpers in templates:**

```eta
<!-- Format a date -->
<time><%= stati.helpers.date(stati.page.date) %></time>

<!-- Uppercase text -->
<span><%= stati.helpers.upper(stati.page.category) %></span>

<!-- Combine with Stati's slugify -->
<a href="<%= stati.url(`/${stati.slugify(stati.page.title)}`) %>"><%= stati.helpers.upper(stati.page.title) %></a>
```

See [Template configuration](/configuration/templates) for more helper patterns.

### ISG configuration

Configure Incremental Static Generation for smart caching:

```javascript
export default defineConfig({
  isg: {
    // Enable ISG caching
    enabled: true,

    // Default cache TTL in seconds
    ttlSeconds: 21600, // 6 hours

    // Maximum age cap in days
    maxAgeCapDays: 365,

    // Aging rules: TTL by age since the page's publish date
    aging: [
      { untilDays: 7, ttlSeconds: 86400 },     // up to 7 days old: 1 day
      { untilDays: 30, ttlSeconds: 604800 },   // up to 30 days old: 1 week
      { untilDays: 365, ttlSeconds: 2592000 }, // up to 365 days old: 30 days
    ],
  },
});
```

**Available Options:**

- `enabled` (boolean) - Enable or disable ISG caching (default: true)
- `ttlSeconds` (number) - Cache time-to-live in seconds for pages no aging rule covers (default: 21600)
- `maxAgeCapDays` (number) - Dated pages older than this are frozen: no longer rebuilt for TTL reasons (default: 365)
- `aging` (array) - Array of aging rules with `untilDays` and `ttlSeconds` properties

**Aging Rules:**

Aging rules set a dated page's TTL from its age. A page's age is counted from its `publishedAt` (or `published`, `date`, `createdAt`) front matter. Stati applies the first rule whose `untilDays` is at least the page's age; pages older than every rule use the last rule. Pages without a publish date use `ttlSeconds`.

See [ISG configuration](/configuration/isg) for validation rules and examples.

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

**Available Hooks:**

- `beforeAll` (function) - Called once after content is loaded, before any page renders, receives `BuildContext`
- `afterAll` (function) - Called after completing the build process, receives `BuildContext`
- `beforeRender` (function) - Called before rendering each page that is re-rendered (not for pages served from the ISG cache), receives `PageContext`
- `afterRender` (function) - Called after rendering each re-rendered page, receives `PageContext`

See [Build hooks](/api/hooks) for the full order and the caching notes.

### Multiple configuration files

You can split configuration across multiple files:

```javascript
// config/base.js
export const baseConfig = {
  site: {
    title: 'My Site',
    baseUrl: 'https://example.com',
  },
};

// stati.config.js
import { defineConfig } from '@stati/core';
import { baseConfig } from './config/base.js';

export default defineConfig({
  ...baseConfig,

  // Environment-specific overrides
  site: {
    ...baseConfig.site,
    baseUrl: process.env.SITE_URL || baseConfig.site.baseUrl,
  },
});
```

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

## Configuration reference

For detailed information about specific configuration options, see:

- **[Site Metadata](/configuration/site-metadata)** - Site title, base URL, and locale settings
- **[Templates](/configuration/templates)** - Template helpers and the Eta settings Stati fixes
- **[Markdown Configuration](/configuration/markdown)** - Plugins and markdown-it processing
- **[ISG Options](/configuration/isg)** - Incremental static generation and caching
- **[Collections](/core-concepts/collections)** - Listings, pagination and generated pages
- **[SEO Configuration](/configuration/seo)** - SEO metadata, sitemap and robots.txt
- **[Search](/configuration/search)** - Search index generation
- **[RSS Configuration](/configuration/rss)** - RSS feed generation
- **[TypeScript](/configuration/typescript)** - Built-in TypeScript compilation with esbuild
- **[Images](/configuration/images)** - Image sizes, responsive images and Open Graph cards
- **[CSS](/configuration/css)** - Hashed production stylesheets, and Tailwind CSS in `stati dev` and `stati build`
- **[CLI commands](/cli/commands#config-file-location)** - Where Stati looks for the config file
