# @stati/core

**The engine of [Stati](https://stati.build), a TypeScript-first static site generator.** It turns Markdown and Eta templates into static HTML with an incremental cache, and runs the dev and preview servers.

---

## Getting Started

Create a site with the scaffolder:

```bash
npx create-stati my-site
cd my-site
npm run dev
```

To call Stati from your own code, install the core package:

```bash
npm install @stati/core
```

---

## Quick Example

**1. Create a configuration file (`stati.config.js`):**

```javascript
import { defineConfig } from '@stati/core';

export default defineConfig({
  site: {
    title: 'My Site',
    baseUrl: 'https://example.com',
  },
});
```

**2. Add some content (`site/index.md`):**

```markdown
---
title: Welcome
---

# Hello Stati

This is my first page. It's just Markdown.
```

**3. Build or develop:**

```typescript
import { build, createDevServer, setEnv } from '@stati/core';

// Development with live reload
const server = await createDevServer({
  port: 3000,
  open: true,
});
await server.start();

// Or build for production (build() alone runs a development build unless NODE_ENV is production)
setEnv('production');
const stats = await build({
  clean: true,
});
```

Most projects use the `stati` command from [`@stati/cli`](https://www.npmjs.com/package/@stati/cli) instead (`stati dev`, `stati build`), which sets the environment for you.

Add `site/layout.eta` to shape the page; without one Stati writes a basic fallback page and warns.

---

## Configuration

Every option, with its default, is in the [configuration reference](https://stati.build/configuration/file/).

---

## API Reference

### Build Functions

#### `build(options?: BuildOptions): Promise<BuildResult>`

Build your static site. `build()` uses Stati's current environment, which is `NODE_ENV` or else `development`, unless you call `setEnv('production')` first (the `stati build` command does). Sitemap, robots.txt and RSS are only generated in production.

**Options:**

```typescript
{
  force?: boolean;        // Force rebuild of all pages (ignores cache)
  clean?: boolean;        // Delete the output directory and the .stati cache first
  includeDrafts?: boolean; // Include draft pages in build
  configPath?: string;    // Config file; only its directory is used to find stati.config.*
  metrics?: MetricsOptions; // Collect build metrics
  logger?: Logger;        // Custom logger for build output
  tailwind?: { input: string; output: string }; // As --tailwind-input/--tailwind-output; production builds run Tailwind
}
```

**Example:**

```typescript
import { build, setEnv } from '@stati/core';

setEnv('production');
const stats = await build({
  clean: true,
  force: false,
  includeDrafts: false,
});

console.log(`Built ${stats.totalPages} pages in ${stats.buildTimeMs}ms`);
```

**Returns:** Build statistics (`totalPages`, `assetsCount`, `buildTimeMs`, `outputSizeBytes`, `cacheHits`, `cacheMisses`), plus `buildMetrics` when metrics are enabled.

---

#### `createDevServer(options?: DevServerOptions): Promise<DevServer>`

Start a development server with live reload.

**Options:**

```typescript
{
  port?: number;          // Port number (default: 3000)
  host?: string;          // Host address (default: 'localhost')
  open?: boolean;         // Auto-open browser (default: false)
  logger?: Logger;        // Custom logger
  tailwind?: { input: string; output: string }; // Links the output; run Tailwind's watcher yourself (stati dev does)
}
```

The config is always loaded from the current working directory, after the environment is set to development.

**Example:**

```typescript
import { createDevServer } from '@stati/core';

const server = await createDevServer({
  port: 3000,
  open: true,
});
await server.start();

console.log(`Dev server running at ${server.url}`);
```

**Returns:** A server object with `start()`, `stop()` and `url`. Nothing listens until you call `start()`.

---

#### `createPreviewServer(options?: PreviewServerOptions): Promise<PreviewServer>`

Start a production preview server to test your built site locally.

**Options:**

```typescript
{
  port?: number;          // Port number (default: 4000)
  host?: string;          // Host address (default: 'localhost')
  open?: boolean;         // Auto-open browser (default: false)
  logger?: Logger;        // Custom logger
}
```

The config (used to find the output directory) is always loaded from the current working directory, in the production environment, as `stati build` does. The environment it was called in is restored afterwards.

**Example:**

```typescript
import { build, createPreviewServer, setEnv } from '@stati/core';

// First build your site
setEnv('production');
await build({ clean: true });

// Then preview it
const server = await createPreviewServer({
  port: 4000,
  open: true,
});
await server.start();

console.log(`Preview server running at ${server.url}`);
```

**Returns:** A server object with `start()`, `stop()` and `url`.

**Note:** The preview server serves `dist/` as it is, without live reload or rebuilding.

---

#### `invalidate(query?: string): Promise<InvalidationResult>`

Invalidate cache by tags, paths, patterns, or age.

**Query Syntax:**

- `tag:blog` - Invalidate pages with specific tag
- `path:/posts` - Invalidate cache entries whose key (output path, such as `/posts/hello.html`) starts with this prefix
- `glob:/blog/**` - Invalidate by glob pattern matched against the whole key
- `age:3months` - Invalidate pages rendered within the last 3 months
- No query - Invalidate every entry

**Examples:**

```typescript
import { invalidate } from '@stati/core';

// Invalidate by tag
await invalidate('tag:news');

// Invalidate by path prefix
await invalidate('path:/blog/2024/');

// Invalidate pages rendered within the last 6 months
await invalidate('age:6months');

// Multiple criteria (OR logic)
await invalidate('tag:blog age:1month');

// Invalidate everything
await invalidate();
```

**Returns:** Invalidation result with count of pages affected.

---

#### `defineConfig(config: StatiConfig): StatiConfig`

Define a type-safe configuration with full TypeScript support.

**Example:**

```typescript
import { defineConfig } from '@stati/core';

export default defineConfig({
  site: {
    title: 'My Site',
    baseUrl: 'https://example.com',
  },
  // TypeScript provides autocomplete and validation
});
```

---

#### `loadConfig(cwd?: string): Promise<StatiConfig>`

Load and validate Stati configuration from a project directory.

**Example:**

```typescript
import { loadConfig } from '@stati/core';

// Load from current directory
const config = await loadConfig();

// Load from specific directory
const config2 = await loadConfig('/path/to/project');
```

---

### TypeScript Types

Full type definitions for TypeScript users:

```typescript
import type {
  // Configuration
  StatiConfig,
  ISGConfig,
  BuildHooks,

  // Build
  BuildOptions,
  BuildResult,
  BuildContext,
  BuildStats,

  // Pages
  PageModel,
  PageContext,
  FrontMatter,
  TemplateContext,

  // Navigation
  NavNode,

  // Development
  DevServerOptions,
  PreviewServerOptions,

  // Cache
  InvalidationResult,
  AgingRule,
} from '@stati/core';

// Cache types are only exported from the types entry point
import type { CacheManifest } from '@stati/core/types';
```

> **Need more types?** This is a curated list of commonly used types. For the complete type reference including all SEO, sitemap, and configuration types, see the [API Types Documentation](https://stati.build/api/types/).

---

## Requirements

- **Node.js** ^22.20.0 || >=24
- **A package manager**: npm, pnpm, yarn or bun

---

## Learn More

- [**Full Documentation**](https://stati.build) - Complete guides and tutorials
- [**Configuration Guide**](https://stati.build/configuration/file/) - All options explained
- [**API Reference**](https://stati.build/api/reference/) - Detailed API docs
- [**Examples**](https://stati.build/examples/list/) - Real-world projects
- [**Contributing**](https://github.com/ianchak/stati/blob/main/CONTRIBUTING.md) - Help improve Stati

---

## Support & Community

- [GitHub Issues](https://github.com/ianchak/stati/issues) - Report bugs or request features
- [Discussions](https://github.com/ianchak/stati/discussions) - Ask questions, share ideas

---

## License

MIT © [Imre Csige](https://github.com/ianchak)

