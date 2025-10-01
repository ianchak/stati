# @stati/core

The core engine for Stati, a lightweight TypeScript static site generator built with modern architecture.

## Installation

```bash
npm install @stati/core
```

## Usage

### Basic Setup

```typescript
import { build, createDevServer, defineConfig, loadConfig } from '@stati/core';

// Define configuration
const config = defineConfig({
  srcDir: './site',
  outDir: './dist',
  staticDir: './public',
  site: {
    title: 'My Site',
    baseUrl: 'https://example.com',
  },
});

// Load configuration and build site
await build({
  clean: false,
  force: false,
  includeDrafts: false,
});

// Or start development server
const server = await createDevServer({
  port: 3000,
  open: true,
});
```

### Configuration

```typescript
import { defineConfig } from '@stati/core';

export default defineConfig({
  // Source directory for content files
  srcDir: './site',

  // Output directory for built site
  outDir: './dist',

  // Static assets directory
  staticDir: './public',

  // Site metadata
  site: {
    title: 'My Site',
    baseUrl: 'https://example.com',
  },

  // Markdown configuration
  markdown: {
    plugins: ['anchor'],
    configure: (md) => {
      md.set({
        html: true,
        linkify: true,
        typographer: true,
      });
    },
  },

  // Eta template configuration
  eta: {
    filters: {
      // Custom template filters
    },
  },

  // Incremental Static Generation
  isg: {
    enabled: true,
    ttlSeconds: 3600,
    maxAgeCapDays: 30,
  },

  // Development server options
  dev: {
    port: 3000,
    host: 'localhost',
    open: false,
  },

  // Build lifecycle hooks
  hooks: {
    beforeAll: async (ctx) => {
      console.log(`Building ${ctx.pages.length} pages`);
    },
    beforeRender: async (ctx) => {
      // Custom pre-render logic
    },
    afterRender: async (ctx) => {
      // Custom post-render logic
    },
  },
});
```

## API

### Core Functions

#### `build(options: BuildOptions): Promise<BuildStats>`

Build a static site.

```typescript
import { build } from '@stati/core';

await build({
  force: false,        // Force rebuild of all pages
  clean: false,        // Clean output directory before build
  includeDrafts: false, // Include draft pages in build
  configPath: './stati.config.js', // Custom config file path
});
```

#### `createDevServer(options: DevServerOptions): Promise<DevServer>`

Create a development server with live reload.

```typescript
import { createDevServer } from '@stati/core';

const server = await createDevServer({
  port: 3000,
  host: 'localhost',
  open: true,
  configPath: './stati.config.js',
});
```

#### `invalidate(query?: string): Promise<InvalidationResult>`

Invalidate cache by tags, paths, patterns, or age.

```typescript
import { invalidate } from '@stati/core';

// Invalidate by tag
await invalidate('tag:blog');

// Invalidate by path prefix
await invalidate('path:/posts');

// Invalidate by glob pattern
await invalidate('glob:/blog/**');

// Invalidate content younger than 3 months
await invalidate('age:3months');

// Multiple criteria (OR logic)
await invalidate('tag:blog age:1month');

// Clear entire cache
await invalidate();
```

### Configuration

#### `defineConfig(config: StatiConfig): StatiConfig`

Define a type-safe configuration with full TypeScript support.

```typescript
import { defineConfig } from '@stati/core';

export default defineConfig({
  // Your configuration here
});
```

#### `loadConfig(cwd?: string): Promise<StatiConfig>`

Load and validate Stati configuration from the project directory.

```typescript
import { loadConfig } from '@stati/core';

const config = await loadConfig(); // Load from current directory
const config2 = await loadConfig('/path/to/project'); // Load from specific directory
```

## Types

The package exports comprehensive TypeScript types:

```typescript
import type {
  StatiConfig,
  BuildOptions,
  DevServerOptions,
  InvalidationResult,
  PageModel,
  FrontMatter,
  BuildContext,
  PageContext,
  BuildHooks,
  NavNode,
  ISGConfig,
  AgingRule,
  BuildStats,
} from '@stati/core/types';
```

## Features

### Markdown Processing

- **Front-matter support** with YAML, TOML, or JSON
- **Plugin system** using markdown-it ecosystem
- **Custom rendering** with configurable options
- **Draft pages** with `draft: true` in front-matter

### Template Engine

- **Eta templates** with layouts and partials
- **Template inheritance** with `layout` front-matter property
- **Custom helpers** and filters
- **Hot reload** during development

### Navigation System

- **Automatic hierarchy** based on filesystem structure
- **Breadcrumbs** and navigation trees
- **Custom sorting** with `order` front-matter property
- **Index pages** with special handling

### Development Server

- **Live reload** with WebSocket integration
- **Hot rebuilding** on file changes
- **Static asset serving** from public directory
- **Error overlay** for development debugging

### Caching & Performance

- **Smart caching** based on file modification times
- **Incremental builds** for faster rebuilds
- **Tag-based invalidation** for selective cache clearing
- **Memory optimization** for large sites

## Architecture

Stati Core is built with a modular architecture:

- **Content processing** - Markdown parsing and front-matter extraction
- **Template rendering** - Eta engine with layouts and partials
- **Navigation building** - Automatic hierarchy generation
- **Asset handling** - Static file copying and optimization
- **Development server** - Live reload and hot rebuilding
- **Build system** - Production optimization and output generation

## License

MIT
