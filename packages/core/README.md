# @stati/core

The core engine for Stati, a lightweight TypeScript static site generator built with Vite-inspired architecture.

## Installation

```bash
npm install @stati/core
```

## Usage

### Basic Setup

```typescript
import { build, createDevServer, defineConfig } from '@stati/core';

// Define configuration
const config = defineConfig({
  site: './site',
  output: './dist',
  public: './public',
});

// Build site
await build(config);

// Or start development server
const server = await createDevServer(config, {
  port: 3000,
  open: true,
});
```

### Configuration

```typescript
import { defineConfig } from '@stati/core/config';

export default defineConfig({
  // Site source directory
  site: './site',

  // Output directory for built site
  output: './dist',

  // Static assets directory
  public: './public',

  // Site metadata
  meta: {
    title: 'My Site',
    description: 'A great static site',
    url: 'https://example.com',
  },

  // Markdown configuration
  markdown: {
    plugins: ['markdown-it-anchor'],
    options: {
      html: true,
      linkify: true,
      typographer: true,
    },
  },

  // Template configuration
  templates: {
    engine: 'eta',
    options: {
      views: './site',
      cache: true,
    },
  },
});
```

## API

### Core Functions

#### `build(options: BuildOptions): Promise<void>`

Build a static site.

```typescript
import { build } from '@stati/core';

await build({
  config: './stati.config.js',
  force: false,
  clean: false,
  includeDrafts: false,
});
```

#### `createDevServer(config: StatiConfig, options: DevServerOptions): Promise<DevServer>`

Create a development server with live reload.

```typescript
import { createDevServer } from '@stati/core';

const server = await createDevServer(config, {
  port: 3000,
  open: true,
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
import { defineConfig } from '@stati/core/config';

export default defineConfig({
  // Your configuration here
});
```

## Types

The package exports comprehensive TypeScript types:

```typescript
import type {
  StatiConfig,
  BuildOptions,
  DevServerOptions,
  InvalidateOptions,
  Page,
  Navigation,
  MarkdownOptions,
  TemplateOptions,
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
