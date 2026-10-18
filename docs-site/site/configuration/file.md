---
title: 'Configuration file'
description: 'Learn how to configure Stati with the stati.config.js (or stati.config.ts) file and available options.'
order: 1
seo:
  title: 'Stati configuration file'
---

# Configuration file

Stati is designed to work great out of the box, but it's also highly configurable. The `stati.config.js` file (or `stati.config.ts` for TypeScript projects) is where you customize every aspect of your site's behavior, from basic metadata to advanced build optimizations.

## Configuration file

### File name and location

Stati looks in the directory you run it from for `stati.config.ts`, then `stati.config.js`, then `stati.config.mjs`, and uses the first one it finds. The file's default export is the configuration. Without a config file, Stati uses its defaults:

| Option | Default |
| ------ | ------- |
| `srcDir` | `'site'` |
| `outDir` | `'dist'` |
| `staticDir` | `'public'` |
| `site.title` | `'My Stati Site'` |
| `site.baseUrl` | `'http://localhost:3000'` |
| `isg` | `{ enabled: true, ttlSeconds: 21600, maxAgeCapDays: 365 }` |

Your config is merged over these defaults: `site` and `isg` are merged field by field, every other section replaces the default as a whole. If the file fails to load (for example, a syntax error), Stati prints the error and builds with the defaults, so watch the output for "Falling back to default configuration.". Invalid `isg` or `images` values, an option Stati does not know (such as a leftover `eta` block) and `helpers` entries that are not functions stop the build instead. A `.js` config with `import` statements loads without `"type": "module"` in `package.json`, but Node prints a warning; add it, or name the file `.mjs`.

### Basic setup

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

### TypeScript configuration

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

The foundation of your site configuration:

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

**Required Fields:**

- `title` (string) - The site's title, used in templates and metadata
- `baseUrl` (string) - Base URL for the site, used for absolute URL generation

**Optional Fields:**

- `defaultLocale` (string) - Default locale for internationalization (e.g., 'en-US', 'fr-FR')
- `description` (string) - Default site description for meta tags (used as fallback when page has no description)

### Markdown configuration

Configure markdown processing with plugins and custom renderer modifications:

```javascript
export default defineConfig({
  markdown: {
    // Plugin configuration - array of plugin names or [name, options] tuples
    plugins: [
      'footnote',                          // markdown-it-footnote - Footnotes
      ['container', 'tip'],                // markdown-it-container: [plugin, container name]
    ],

    // Custom markdown-it configuration function (runs after plugins)
    configure: (md) => {
      // Add custom plugins or modify renderer
      md.use(customPlugin, options);

      // Modify rendering rules
      md.renderer.rules.code_inline = (tokens, idx) => {
        const token = tokens[idx];
        return `<code class="inline-code">${md.utils.escapeHtml(token.content)}</code>`;
      };
    },
  },
});
```

> **Note:** TOC extraction and heading anchor generation are built into Stati and enabled by default. You don't need `markdown-it-anchor` or `markdown-it-toc-done-right` plugins.

**Available Options:**

- `plugins` (array) - Array of markdown-it plugin names (strings) or [name, options] tuples
- `configure` (function) - Function that receives the markdown-it instance for custom configuration
- `toc` (boolean) - Enable/disable TOC extraction and heading anchor generation (default: `true`)

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
<a href="<%= `/${stati.slugify(stati.page.title)}` %>"><%= stati.helpers.upper(stati.page.title) %></a>
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

```javascript
// Example: older content gets cached longer
aging: [
  { untilDays: 7, ttlSeconds: 86400 },    // up to 7 days old: 1 day
  { untilDays: 30, ttlSeconds: 604800 },  // older: 1 week
]
```

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

- `summaryFields` (string[]) - Front matter fields of collection pages whose changes rebuild the pages that list them (default: `['title', 'description', 'tags', 'draft']`; URLs and publish dates always count, and `content` stands for the Markdown body)
- `generate` (function) - Returns pages to create, each with a `url` and a `[param].md` `template`, plus optional `key`, `label`, `items` and `data`

See [Collections and generated pages](/core-concepts/collections).

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

### Development server

Configure the development server:

```javascript
export default defineConfig({
  dev: {
    // Server configuration
    port: 3000,        // Port for development server
    host: 'localhost', // Host to bind to
    open: false,       // Whether to open browser automatically
  },
});
```

**Available Options:**

- `port` (number) - Port for development server (default: 3000)
- `host` (string) - Host to bind to (default: 'localhost')
- `open` (boolean) - Whether to open browser automatically (default: false)

### Preview server

Configure the preview server:

```javascript
export default defineConfig({
  preview: {
    // Server configuration
    port: 4000,        // Port for preview server
    host: 'localhost', // Host to bind to
    open: false,       // Whether to open browser automatically
  },
});
```

**Available Options:**

- `port` (number) - Port for preview server (default: 4000)
- `host` (string) - Host to bind to (default: 'localhost')
- `open` (boolean) - Whether to open browser automatically (default: false)

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
        page.frontMatter.readingTime = calculateReadingTime(page.content);
        page.frontMatter.wordCount = countWords(page.content);
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

**Context Types:**

```typescript
// BuildContext - passed to beforeAll and afterAll
interface BuildContext {
  config: StatiConfig;  // The resolved configuration
  pages: PageModel[];   // Array of all loaded pages
}

// PageContext - passed to beforeRender and afterRender
interface PageContext {
  page: PageModel;      // The page being processed
  config: StatiConfig;  // The resolved configuration
}
```

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

## Best practices

### Configuration organization

1. **Keep it readable**

   ```javascript
   // Good: organized and commented
   export default defineConfig({
     // Site metadata
     site: {
       title: 'My Site',
       baseUrl: 'https://example.com',
     },

     // Markdown processing
     markdown: {
       plugins: ['footnote'],  // markdown-it-footnote
     },
   });
   ```

2. **Use environment variables for secrets**

   ```javascript
   export default defineConfig({
     site: {
       title: 'My Site',
       baseUrl: process.env.SITE_URL || 'http://localhost:3000',
     },
   });
   ```

3. **Split large configurations**

   ```javascript
   // config/site.js
   export const siteConfig = {
     title: 'My Site',
     baseUrl: 'https://example.com',
   };

   // config/markdown.js
   export const markdownConfig = {
     plugins: ['footnote', ['container', 'tip']],  // Stati auto-prepends 'markdown-it-'
   };

   // stati.config.js
   import { siteConfig } from './config/site.js';
   import { markdownConfig } from './config/markdown.js';

   export default defineConfig({
     site: siteConfig,
     markdown: markdownConfig,
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
// `stati build` → 'production', `stati dev` → 'development'
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
- **[CLI commands](/cli/commands#config-file-location)** - How `--config` and the config file location work

The configuration system is designed to grow with your needs while maintaining simplicity for basic use cases. Start with minimal configuration and add complexity as your site evolves.
