---
title: 'Documentation Site Example'
description: 'Build a comprehensive documentation site with Stati featuring navigation, search, versioning, and API docs.'
---

# Documentation Site Example

Learn how to build a professional documentation site with Stati, featuring hierarchical navigation, search functionality, API documentation, versioning, and excellent developer experience.

## Project Structure

```
docs-site/
├── stati.config.js          # Configuration
├── package.json
├── site/                    # Documentation content
│   ├── index.md            # Homepage
│   ├── layout.eta          # Main layout
│   ├── _partials/          # Reusable components
│   │   ├── header.eta
│   │   ├── sidebar.eta
│   │   ├── breadcrumbs.eta
│   │   ├── toc.eta         # Table of contents
│   │   ├── edit-link.eta
│   │   └── page-nav.eta    # Previous/Next navigation
│   ├── getting-started/    # Getting started guide
│   │   ├── index.md
│   │   ├── installation.md
│   │   ├── quick-start.md
│   │   └── configuration.md
│   ├── guides/             # User guides
│   │   ├── index.md
│   │   ├── basic-usage.md
│   │   ├── advanced-features.md
│   │   └── best-practices.md
│   ├── api/                # API documentation
│   │   ├── index.md
│   │   ├── layout.eta      # API-specific layout
│   │   ├── reference/
│   │   │   ├── classes.md
│   │   │   ├── functions.md
│   │   │   └── interfaces.md
│   │   └── examples/
│   │       ├── basic.md
│   │       └── advanced.md
│   ├── changelog/          # Version history
│   │   ├── index.md
│   │   ├── v2.0.0.md
│   │   └── v1.5.0.md
│   └── contributing/       # Contribution guide
│       ├── index.md
│       ├── development.md
│       └── guidelines.md
├── public/                 # Static assets
│   ├── styles.css
│   ├── search.js
│   ├── images/
│   └── api-specs/          # OpenAPI specs
└── dist/                   # Generated site
```

## Configuration

### Basic Configuration

```javascript
// stati.config.js
import { defineConfig } from '@stati/core';

export default defineConfig({
  site: {
    title: 'MyLibrary Documentation',
    description: 'Complete documentation for MyLibrary - a powerful JavaScript utility library',
    url: 'https://docs.mylibrary.com',
    author: {
      name: 'MyLibrary Team',
      email: 'docs@mylibrary.com',
    },
    language: 'en',
  },

  build: {
    contentDir: 'site',
    outputDir: 'dist',
    publicDir: 'public',
  },

  markdown: {
    html: true,
    linkify: true,
    typographer: true,

    // Code highlighting for documentation
    highlight: {
      enabled: true,
      theme: 'github',
      lineNumbers: true,
      copyButton: true,
    },

    // Documentation-specific extensions
    extensions: {
      // Table of contents generation
      toc: {
        enabled: true,
        includeLevel: [1, 2, 3, 4],
        containerClass: 'table-of-contents',
      },

      // Code block enhancements
      codeBlocks: {
        showLanguage: true,
        showFilename: true,
        lineHighlight: true,
      },

      // Callout boxes
      containers: [
        { name: 'tip', className: 'callout callout-tip' },
        { name: 'warning', className: 'callout callout-warning' },
        { name: 'danger', className: 'callout callout-danger' },
        { name: 'info', className: 'callout callout-info' },
      ],
    },
  },

  // Documentation navigation
  navigation: {
    // Main navigation structure
    main: [
      {
        text: 'Getting Started',
        link: '/getting-started/',
        children: [
          { text: 'Installation', link: '/getting-started/installation/' },
          { text: 'Quick Start', link: '/getting-started/quick-start/' },
          { text: 'Configuration', link: '/getting-started/configuration/' },
        ],
      },
      {
        text: 'Guides',
        link: '/guides/',
        children: [
          { text: 'Basic Usage', link: '/guides/basic-usage/' },
          { text: 'Advanced Features', link: '/guides/advanced-features/' },
          { text: 'Best Practices', link: '/guides/best-practices/' },
        ],
      },
      {
        text: 'API Reference',
        link: '/api/',
        children: [
          { text: 'Classes', link: '/api/reference/classes/' },
          { text: 'Functions', link: '/api/reference/functions/' },
          { text: 'Interfaces', link: '/api/reference/interfaces/' },
        ],
      },
      {
        text: 'Contributing',
        link: '/contributing/',
      },
    ],

    // Footer navigation
    footer: [
      { text: 'GitHub', link: 'https://github.com/company/mylibrary' },
      { text: 'Issues', link: 'https://github.com/company/mylibrary/issues' },
      { text: 'Changelog', link: '/changelog/' },
    ],
  },

  // Search configuration
  search: {
    enabled: true,
    provider: 'local', // 'local' | 'algolia'

    // Local search options
    local: {
      maxResults: 10,
      placeholder: 'Search documentation...',
      noResultsText: 'No results found',
    },
  },

  // Version configuration
  versioning: {
    enabled: true,
    current: '2.0.0',
    versions: ['2.0.0', '1.5.0', '1.0.0'],
    basePath: '/versions',
  },
});
```

### Advanced Configuration

```javascript
export default defineConfig({
  // ... basic config

  plugins: [
    // API documentation generator
    apiDocsPlugin({
      specs: 'public/api-specs/*.yaml',
      output: 'site/api/generated',
    }),

    // Search index generator
    searchPlugin({
      enabled: true,
      fields: ['title', 'content', 'headers'],
      boost: {
        title: 3,
        headers: 2,
        content: 1,
      },
    }),

    // Link checker
    linkCheckerPlugin({
      internal: true,
      external: false, // Skip external links in CI
    }),

    // Edit on GitHub links
    editLinkPlugin({
      pattern: 'https://github.com/company/mylibrary/edit/main/docs/:path',
      text: 'Edit this page on GitHub',
    }),
  ],
});
```

## Content Structure

### Homepage

````markdown
---
title: 'MyLibrary Documentation'
description: 'Complete documentation for MyLibrary - a powerful JavaScript utility library'
template: 'home'
---

# MyLibrary Documentation

Welcome to the comprehensive documentation for MyLibrary, a powerful JavaScript utility library designed to simplify common programming tasks and boost your productivity.

## Quick Start

Get up and running with MyLibrary in minutes:

```bash
npm install mylibrary
```
````

```javascript
import { helper, utilities } from 'mylibrary';

// Use powerful utilities
const result = helper.process(data);
const formatted = utilities.format(result);
```

[Get Started →](/getting-started/)

## Features

<div class="feature-grid">
  <div class="feature">
    <h3>🚀 Fast & Lightweight</h3>
    <p>Optimized for performance with minimal bundle size impact</p>
  </div>

  <div class="feature">
    <h3>📖 TypeScript Support</h3>
    <p>Full TypeScript definitions for excellent developer experience</p>
  </div>

  <div class="feature">
    <h3>🔧 Modular Design</h3>
    <p>Import only what you need with tree-shaking support</p>
  </div>

  <div class="feature">
    <h3>✅ Well Tested</h3>
    <p>Comprehensive test suite with 100% code coverage</p>
  </div>
</div>

## Popular Guides

- [Installation Guide](/getting-started/installation/) - Set up MyLibrary in your project
- [Basic Usage](/guides/basic-usage/) - Learn the fundamentals
- [Advanced Features](/guides/advanced-features/) - Explore powerful capabilities
- [API Reference](/api/) - Complete API documentation

## Need Help?

- 📖 [Browse the documentation](/getting-started/)
- 💬 [Join our Discord community](https://discord.gg/mylibrary)
- 🐛 [Report issues on GitHub](https://github.com/company/mylibrary/issues)
- 📧 [Contact support](mailto:support@mylibrary.com)

````

### Guide Example

```markdown
---
title: 'Advanced Features'
description: 'Explore the advanced features and capabilities of MyLibrary'
---

# Advanced Features

MyLibrary provides powerful advanced features for complex use cases. This guide covers the most important advanced capabilities.

::: tip
Make sure you've read the [Basic Usage](/guides/basic-usage/) guide before diving into advanced features.
:::

## Table of Contents

[[toc]]

## Advanced Configuration

### Custom Processors

Create custom processors for specialized data handling:

```javascript
import { createProcessor } from 'mylibrary';

const customProcessor = createProcessor({
  name: 'custom-processor',

  // Configuration options
  options: {
    strict: true,
    timeout: 5000
  },

  // Processing function
  process: async (input, context) => {
    // Custom processing logic
    const result = await performComplexOperation(input);

    // Apply transformations
    return transform(result, context.options);
  },

  // Validation
  validate: (input) => {
    if (!input || typeof input !== 'object') {
      throw new Error('Input must be a valid object');
    }
  }
});

// Use the custom processor
const result = await customProcessor.process(data);
````

### Pipeline Composition

Chain multiple processors for complex workflows:

```javascript
import { Pipeline, processors } from 'mylibrary';

const pipeline = new Pipeline()
  .use(processors.validate())
  .use(
    processors.transform({
      mapping: {
        old_field: 'new_field',
        legacy_id: 'id',
      },
    }),
  )
  .use(
    processors.filter({
      condition: (item) => item.status === 'active',
    }),
  )
  .use(
    processors.sort({
      by: 'createdAt',
      order: 'desc',
    }),
  );

// Process data through the pipeline
const processedData = await pipeline.execute(rawData);
```

### Event System

Listen to and emit custom events:

```javascript
import { EventEmitter } from 'mylibrary';

const emitter = new EventEmitter();

// Listen to events
emitter.on('data:processed', (data) => {
  console.log('Data processed:', data.id);
});

emitter.on('error', (error) => {
  console.error('Processing error:', error.message);
});

// Emit events
emitter.emit('data:processed', { id: '123', result: 'success' });

// Use with async processing
const processor = createAsyncProcessor({
  emitter,

  async process(data) {
    try {
      const result = await heavyOperation(data);
      emitter.emit('data:processed', result);
      return result;
    } catch (error) {
      emitter.emit('error', error);
      throw error;
    }
  },
});
```

## Performance Optimization

### Caching Strategies

Implement efficient caching for better performance:

```javascript
import { Cache } from 'mylibrary';

// Create cache instance
const cache = new Cache({
  // Memory cache with LRU eviction
  type: 'memory',
  maxSize: 1000,
  ttl: 60000, // 1 minute

  // Custom key generation
  keyGenerator: (input) => {
    return `${input.type}:${input.id}:${input.version}`;
  },

  // Serialization for complex objects
  serializer: {
    serialize: JSON.stringify,
    deserialize: JSON.parse,
  },
});

// Use cache with automatic key generation
const getCachedData = cache.wrap(async (id) => {
  return await fetchDataFromAPI(id);
});

// Manual cache operations
cache.set('key', value);
const cached = cache.get('key');
cache.delete('key');
cache.clear();
```

### Batch Processing

Process large datasets efficiently:

```javascript
import { BatchProcessor } from 'mylibrary';

const batchProcessor = new BatchProcessor({
  batchSize: 100,
  concurrency: 5,
  retries: 3,

  // Progress tracking
  onProgress: (processed, total) => {
    console.log(`Progress: ${processed}/${total} (${Math.round((processed / total) * 100)}%)`);
  },

  // Error handling
  onError: (error, item, retryCount) => {
    console.error(`Error processing item ${item.id} (retry ${retryCount}):`, error.message);
  },
});

// Process large dataset
const results = await batchProcessor.process(largeDataset, async (batch) => {
  // Process each batch
  return await Promise.all(batch.map((item) => processItem(item)));
});
```

## Plugin System

### Creating Plugins

Extend MyLibrary with custom plugins:

```javascript
// plugins/custom-plugin.js
export default function customPlugin(options = {}) {
  return {
    name: 'custom-plugin',
    version: '1.0.0',

    // Plugin initialization
    install(mylibrary) {
      // Add custom methods
      mylibrary.customMethod = function (input) {
        return processCustom(input, options);
      };

      // Register processors
      mylibrary.registerProcessor('custom', createCustomProcessor(options));

      // Add event listeners
      mylibrary.on('beforeProcess', (data) => {
        if (options.preprocess) {
          return options.preprocess(data);
        }
      });
    },

    // Plugin cleanup
    uninstall(mylibrary) {
      delete mylibrary.customMethod;
      mylibrary.unregisterProcessor('custom');
    },
  };
}

// Usage
import MyLibrary from 'mylibrary';
import customPlugin from './plugins/custom-plugin.js';

const lib = new MyLibrary();
lib.use(
  customPlugin({
    preprocess: true,
    customOption: 'value',
  }),
);
```

### Available Plugins

- **mylibrary-plugin-database** - Database integration
- **mylibrary-plugin-validation** - Advanced validation rules
- **mylibrary-plugin-serialization** - Custom serialization formats
- **mylibrary-plugin-monitoring** - Performance monitoring

::: warning Performance Considerations
When using multiple plugins, be aware of the performance impact. Some plugins may add overhead to processing operations.
:::

## Advanced Patterns

### Observer Pattern

Implement reactive programming patterns:

```javascript
import { Observable } from 'mylibrary';

// Create observable data
const observable = new Observable(initialData);

// Subscribe to changes
const subscription = observable.subscribe((newValue, oldValue) => {
  console.log('Data changed:', { newValue, oldValue });
});

// Transform data reactively
const transformed = observable
  .map((data) => data.filter((item) => item.active))
  .filter((data) => data.length > 0)
  .debounce(300);

// Update data (triggers subscribers)
observable.next(newData);

// Cleanup
subscription.unsubscribe();
```

### State Management

Manage complex application state:

```javascript
import { StateManager } from 'mylibrary';

const state = new StateManager({
  initialState: {
    users: [],
    currentUser: null,
    loading: false,
  },

  // Reducers
  reducers: {
    setUsers: (state, users) => ({
      ...state,
      users,
      loading: false,
    }),

    setCurrentUser: (state, currentUser) => ({
      ...state,
      currentUser,
    }),

    setLoading: (state, loading) => ({
      ...state,
      loading,
    }),
  },

  // Middleware
  middleware: [
    // Logging middleware
    (action, state, next) => {
      console.log('Action:', action.type, action.payload);
      const result = next();
      console.log('New state:', state.getState());
      return result;
    },

    // Async middleware
    (action, state, next) => {
      if (action.type.endsWith('_ASYNC')) {
        // Handle async actions
        return handleAsyncAction(action, state, next);
      }
      return next();
    },
  ],
});

// Dispatch actions
state.dispatch({ type: 'setLoading', payload: true });
state.dispatch({ type: 'setUsers', payload: users });

// Subscribe to state changes
state.subscribe((newState, action) => {
  updateUI(newState);
});
```

## Integration Examples

### React Integration

```jsx
import React, { useState, useEffect } from 'react';
import { useMyLibrary } from 'mylibrary-react';

function DataProcessor() {
  const { processor, isLoading, error } = useMyLibrary();
  const [data, setData] = useState([]);
  const [result, setResult] = useState(null);

  const handleProcess = async () => {
    try {
      const processed = await processor.process(data);
      setResult(processed);
    } catch (err) {
      console.error('Processing failed:', err);
    }
  };

  return (
    <div>
      <button onClick={handleProcess} disabled={isLoading}>
        {isLoading ? 'Processing...' : 'Process Data'}
      </button>

      {error && <div className="error">{error.message}</div>}
      {result && <div className="result">{JSON.stringify(result)}</div>}
    </div>
  );
}
```

### Node.js Integration

```javascript
// server.js
import express from 'express';
import { createProcessor, middleware } from 'mylibrary';

const app = express();
const processor = createProcessor({
  // Server-specific configuration
  timeout: 30000,
  maxConcurrency: 10,
});

// Use MyLibrary middleware
app.use(middleware.requestLogger());
app.use(middleware.errorHandler());

app.post('/api/process', async (req, res) => {
  try {
    const result = await processor.process(req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

## Best Practices

### Error Handling

Implement robust error handling:

```javascript
import { MyLibraryError, ValidationError } from 'mylibrary';

try {
  const result = await processor.process(data);
} catch (error) {
  if (error instanceof ValidationError) {
    // Handle validation errors
    console.error('Validation failed:', error.details);
  } else if (error instanceof MyLibraryError) {
    // Handle library-specific errors
    console.error('Library error:', error.code, error.message);
  } else {
    // Handle unexpected errors
    console.error('Unexpected error:', error);
  }
}
```

### Memory Management

Optimize memory usage for large datasets:

```javascript
// Use streaming for large files
import { createReadStream } from 'fs';
import { StreamProcessor } from 'mylibrary';

const streamProcessor = new StreamProcessor({
  highWaterMark: 64 * 1024, // 64KB chunks
  objectMode: true,
});

createReadStream('large-file.json').pipe(streamProcessor).pipe(process.stdout);

// Cleanup resources
process.on('exit', () => {
  streamProcessor.destroy();
});
```

### Testing

Test advanced features effectively:

```javascript
// tests/advanced.test.js
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createProcessor, Cache } from 'mylibrary';

describe('Advanced Features', () => {
  let processor;
  let cache;

  beforeEach(() => {
    processor = createProcessor();
    cache = new Cache({ type: 'memory' });
  });

  afterEach(() => {
    cache.clear();
  });

  it('should handle complex data transformations', async () => {
    const input = {
      /* complex test data */
    };
    const result = await processor.process(input);

    expect(result).toMatchObject({
      transformed: true,
      metadata: expect.objectContaining({
        processedAt: expect.any(Date),
      }),
    });
  });

  it('should cache results efficiently', async () => {
    const key = 'test-key';
    const value = { data: 'test' };

    cache.set(key, value);
    const cached = cache.get(key);

    expect(cached).toEqual(value);
  });
});
```

This advanced features guide provides comprehensive coverage of MyLibrary's sophisticated capabilities, helping users leverage the full power of the library for complex use cases.

````

### API Documentation Example

```markdown
---
title: 'Class: DataProcessor'
description: 'Complete API reference for the DataProcessor class'
---

# DataProcessor

The `DataProcessor` class provides advanced data processing capabilities with support for validation, transformation, and caching.

## Constructor

### `new DataProcessor(options)`

Creates a new DataProcessor instance.

**Parameters:**

- `options` (Object) - Configuration options
  - `strict` (boolean) - Enable strict mode validation (default: `false`)
  - `timeout` (number) - Processing timeout in milliseconds (default: `5000`)
  - `cache` (Object) - Cache configuration
    - `enabled` (boolean) - Enable caching (default: `true`)
    - `ttl` (number) - Time to live in milliseconds (default: `60000`)

**Example:**

```javascript
const processor = new DataProcessor({
  strict: true,
  timeout: 10000,
  cache: {
    enabled: true,
    ttl: 120000
  }
});
````

## Methods

### `process(data, options)`

Process input data with optional configuration.

**Parameters:**

- `data` (any) - Input data to process
- `options` (Object, optional) - Processing options
  - `validate` (boolean) - Enable validation (default: `true`)
  - `transform` (boolean) - Enable transformation (default: `true`)

**Returns:** `Promise<ProcessedData>`

**Throws:**

- `ValidationError` - When validation fails
- `ProcessingError` - When processing fails

**Example:**

```javascript
const result = await processor.process(inputData, {
  validate: true,
  transform: true,
});
```

### `validate(data, schema)`

Validate data against a schema.

**Parameters:**

- `data` (any) - Data to validate
- `schema` (Object) - Validation schema

**Returns:** `ValidationResult`

**Example:**

```javascript
const result = processor.validate(data, {
  type: 'object',
  properties: {
    name: { type: 'string', required: true },
    age: { type: 'number', min: 0 },
  },
});
```

## Properties

### `options`

Current processor configuration.

**Type:** `Object`

### `cache`

Cache instance used by the processor.

**Type:** `Cache`

## Events

The DataProcessor extends EventEmitter and emits the following events:

### `processed`

Emitted when data processing completes successfully.

**Parameters:**

- `result` (ProcessedData) - Processing result
- `duration` (number) - Processing duration in milliseconds

### `error`

Emitted when processing fails.

**Parameters:**

- `error` (Error) - The error that occurred
- `data` (any) - Input data that failed to process

**Example:**

```javascript
processor.on('processed', (result, duration) => {
  console.log(`Processing completed in ${duration}ms`);
});

processor.on('error', (error, data) => {
  console.error('Processing failed:', error.message);
});
```

## Static Methods

### `DataProcessor.createDefault()`

Create a DataProcessor with default configuration.

**Returns:** `DataProcessor`

### `DataProcessor.fromConfig(config)`

Create a DataProcessor from configuration object.

**Parameters:**

- `config` (Object) - Configuration object

**Returns:** `DataProcessor`

```

This documentation example shows how to build comprehensive, professional documentation sites with Stati, complete with navigation, search, API docs, and all the features needed for a world-class documentation experience.
```
