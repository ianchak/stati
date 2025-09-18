---
title: 'Plugin API'
description: 'Learn how to create custom plugins to extend Stati functionality with custom processors, transforms, and integrations.'
---

# Plugin API

Stati provides a powerful plugin system that allows you to extend core functionality with custom processors, content transforms, template filters, and build hooks. Create plugins to integrate with external services, add custom content types, or implement specialized build workflows.

## Plugin Basics

### Creating a Plugin

A Stati plugin is a JavaScript object or function that exports plugin configuration:

```javascript
// my-plugin.js
export default function myPlugin(options = {}) {
  return {
    name: 'my-plugin',
    version: '1.0.0',

    // Plugin hooks
    hooks: {
      'build:start': async (context) => {
        console.log('Build started');
      },

      'build:end': async (context) => {
        console.log('Build completed');
      },
    },
  };
}
```

### Using Plugins

Register plugins in your `stati.config.js`:

```javascript
// stati.config.js
import { defineConfig } from '@stati/core';
import myPlugin from './plugins/my-plugin.js';

export default defineConfig({
  plugins: [
    // Simple plugin
    myPlugin(),

    // Plugin with options
    myPlugin({
      option1: 'value1',
      option2: true,
    }),

    // Inline plugin
    {
      name: 'inline-plugin',
      hooks: {
        'page:process': async (page, context) => {
          page.customField = 'added by plugin';
          return page;
        },
      },
    },
  ],
});
```

## Plugin Structure

### Plugin Definition

```javascript
export default function createPlugin(options = {}) {
  // Validate options
  const config = {
    enabled: true,
    debug: false,
    ...options,
  };

  return {
    // Plugin metadata
    name: 'my-awesome-plugin',
    version: '1.2.0',
    description: 'An awesome Stati plugin',
    author: 'Your Name',
    homepage: 'https://github.com/username/stati-plugin',

    // Plugin configuration
    config,

    // Plugin hooks
    hooks: {
      // Build lifecycle hooks
      'build:start': buildStartHandler,
      'build:end': buildEndHandler,

      // Content processing hooks
      'content:load': contentLoadHandler,
      'content:process': contentProcessHandler,

      // Template processing hooks
      'template:load': templateLoadHandler,
      'template:render': templateRenderHandler,

      // Page generation hooks
      'page:create': pageCreateHandler,
      'page:process': pageProcessHandler,
      'page:render': pageRenderHandler,
    },

    // Custom processors
    processors: {
      'custom-content': customContentProcessor,
    },

    // Template filters
    filters: {
      customFilter: customFilterFunction,
    },

    // Custom CLI commands
    commands: {
      'my-command': myCommandHandler,
    },
  };
}
```

## Plugin Hooks

### Build Lifecycle Hooks

Control the build process at various stages:

```javascript
const hooks = {
  // Called before build starts
  'build:start': async (context) => {
    console.log('Starting build...');

    // Access build configuration
    const { config, pages, assets } = context;

    // Perform setup tasks
    await setupExternalServices();
    await createBuildDirectories();
  },

  // Called after build completes
  'build:end': async (context) => {
    const { config, stats, outputDir } = context;

    console.log(`Build completed in ${stats.buildTime}ms`);
    console.log(`Generated ${stats.pageCount} pages`);

    // Post-build tasks
    await generateSitemap(outputDir);
    await uploadToS3(outputDir);
    await notifyWebhooks(stats);
  },

  // Called when build fails
  'build:error': async (error, context) => {
    console.error('Build failed:', error.message);

    // Error handling
    await logErrorToService(error);
    await cleanupPartialBuild(context.outputDir);
  },

  // Called before cleaning output directory
  'build:clean': async (context) => {
    const { outputDir } = context;

    // Preserve certain files
    await backupImportantFiles(outputDir);
  },
};
```

### Content Processing Hooks

Process content files during the build:

```javascript
const hooks = {
  // Called when content files are discovered
  'content:discover': async (files, context) => {
    // Filter or modify discovered files
    return files.filter((file) => !file.includes('draft'));
  },

  // Called when loading individual content files
  'content:load': async (filePath, context) => {
    // Custom content loading logic
    const content = await fs.readFile(filePath, 'utf-8');

    // Process special file types
    if (filePath.endsWith('.mdx')) {
      return await processMDX(content);
    }

    return content;
  },

  // Called after content is parsed
  'content:process': async (page, context) => {
    // Add custom properties
    page.readingTime = calculateReadingTime(page.content);
    page.wordCount = page.content.split(/\s+/).length;

    // Process custom front matter fields
    if (page.gallery) {
      page.galleryImages = await processGalleryImages(page.gallery);
    }

    return page;
  },

  // Called before content is rendered
  'content:transform': async (content, page, context) => {
    // Transform content before rendering
    content = await processShortcodes(content);
    content = await optimizeImages(content);

    return content;
  },
};
```

### Template Processing Hooks

Customize template rendering:

```javascript
const hooks = {
  // Called when loading templates
  'template:load': async (templatePath, context) => {
    let template = await fs.readFile(templatePath, 'utf-8');

    // Process custom template syntax
    template = template.replace(
      /\{\{component:(\w+)\}\}/g,
      (match, componentName) => `<%~ include('components/${componentName}') %>`,
    );

    return template;
  },

  // Called before template is rendered
  'template:render': async (template, data, context) => {
    // Add custom data to template context
    data.buildTime = new Date().toISOString();
    data.version = context.config.version;

    return { template, data };
  },

  // Called after template is rendered
  'template:rendered': async (html, page, context) => {
    // Post-process rendered HTML
    html = await minifyHTML(html);
    html = await inlineCSS(html);

    return html;
  },
};
```

### Page Generation Hooks

Control page creation and output:

```javascript
const hooks = {
  // Called when creating new pages
  'page:create': async (page, context) => {
    // Set default properties
    page.id = page.id || generateUniqueId();
    page.createdAt = page.createdAt || new Date().toISOString();

    return page;
  },

  // Called during page processing
  'page:process': async (page, context) => {
    // Generate additional pages
    if (page.type === 'post' && page.tags) {
      for (const tag of page.tags) {
        await generateTagPage(tag, context);
      }
    }

    return page;
  },

  // Called before page is written to disk
  'page:write': async (page, outputPath, context) => {
    // Custom output logic
    if (page.draft && context.config.env === 'production') {
      return null; // Skip draft pages in production
    }

    return { page, outputPath };
  },
};
```

## Custom Processors

### Content Processors

Create processors for custom content types:

```javascript
function createCustomProcessor() {
  return {
    name: 'custom-processor',

    // File patterns this processor handles
    test: /\.(custom|special)$/,

    // Process function
    async process(filePath, context) {
      const content = await fs.readFile(filePath, 'utf-8');

      // Parse custom format
      const parsed = parseCustomFormat(content);

      // Return page object
      return {
        path: filePath.replace(/\.(custom|special)$/, '.html'),
        title: parsed.title,
        content: parsed.body,
        data: parsed.metadata,
        type: 'custom-page',
      };
    },
  };
}

// Register processor
export default function myPlugin() {
  return {
    name: 'custom-content-plugin',
    processors: {
      'custom-content': createCustomProcessor(),
    },
  };
}
```

### Data Processors

Process data files and make them available to templates:

```javascript
function createDataProcessor() {
  return {
    name: 'data-processor',
    test: /\.(yaml|yml|json)$/,

    async process(filePath, context) {
      const content = await fs.readFile(filePath, 'utf-8');

      let data;
      if (filePath.endsWith('.json')) {
        data = JSON.parse(content);
      } else {
        data = yaml.load(content);
      }

      // Make data available globally
      const dataKey = path.basename(filePath, path.extname(filePath));
      context.globalData[dataKey] = data;

      return null; // Don't generate a page
    },
  };
}
```

## Template Filters

### Custom Filters

Add custom template filters:

```javascript
export default function filtersPlugin() {
  return {
    name: 'custom-filters',
    filters: {
      // String manipulation filters
      reverse: (str) => str.split('').reverse().join(''),

      slugify: (text) =>
        text
          .toLowerCase()
          .replace(/[^\w\s-]/g, '')
          .replace(/[\s_-]+/g, '-')
          .replace(/^-+|-+$/g, ''),

      // Date filters
      formatDate: (date, format = 'YYYY-MM-DD') => {
        return moment(date).format(format);
      },

      timeAgo: (date) => {
        return moment(date).fromNow();
      },

      // Array filters
      chunk: (array, size) => {
        return array.reduce((chunks, item, index) => {
          const chunkIndex = Math.floor(index / size);
          chunks[chunkIndex] = chunks[chunkIndex] || [];
          chunks[chunkIndex].push(item);
          return chunks;
        }, []);
      },

      // Content filters
      excerpt: (content, length = 150) => {
        const text = content.replace(/<[^>]*>/g, '');
        return text.length > length ? text.substring(0, length) + '...' : text;
      },

      // Async filters
      fetchData: async (url) => {
        const response = await fetch(url);
        return response.json();
      },
    },
  };
}
```

### Filter Usage

Use custom filters in templates:

```html
<!-- Basic filters -->
<h1><%= post.title | reverse %></h1>
<p class="slug"><%= post.title | slugify %></p>

<!-- Date filters -->
<time><%= post.publishedAt | formatDate('MMMM Do, YYYY') %></time>
<span><%= post.publishedAt | timeAgo %></span>

<!-- Array filters -->
<% const postChunks = posts | chunk(3) %> <% for (const chunk of postChunks) { %>
<div class="row">
  <% for (const post of chunk) { %>
  <div class="col"><%= post.title %></div>
  <% } %>
</div>
<% } %>

<!-- Content filters -->
<p><%= post.content | excerpt(200) %></p>

<!-- Async filters (use with await) -->
<div><%- await (apiUrl | fetchData) %></div>
```

## External Integrations

### CMS Integration

Connect to headless CMS systems:

```javascript
function createCMSPlugin(options) {
  return {
    name: 'cms-integration',

    hooks: {
      'content:discover': async (files, context) => {
        // Fetch content from CMS
        const cmsContent = await fetchFromCMS(options.endpoint, options.apiKey);

        // Convert CMS content to Stati pages
        const cmsPages = cmsContent.map((item) => ({
          path: `/cms/${item.slug}.html`,
          title: item.title,
          content: item.body,
          publishedAt: item.published_at,
          author: item.author,
          tags: item.tags,
          type: 'cms-post',
        }));

        // Add to context for processing
        context.cmsPages = cmsPages;

        return files;
      },

      'build:start': async (context) => {
        // Process CMS pages
        if (context.cmsPages) {
          for (const page of context.cmsPages) {
            context.pages.push(page);
          }
        }
      },
    },
  };
}
```

### Analytics Integration

Add analytics tracking:

```javascript
function createAnalyticsPlugin(options) {
  return {
    name: 'analytics-integration',

    hooks: {
      'template:rendered': async (html, page, context) => {
        // Inject analytics code
        const analyticsCode = `
          <script>
            gtag('config', '${options.trackingId}', {
              page_title: '${page.title}',
              page_location: '${context.config.site.url}${page.path}'
            });
          </script>
        `;

        return html.replace('</head>', `${analyticsCode}\n</head>`);
      },

      'build:end': async (context) => {
        // Send build completion event
        await fetch(`${options.endpoint}/build-complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            site: context.config.site.url,
            pages: context.stats.pageCount,
            buildTime: context.stats.buildTime,
          }),
        });
      },
    },
  };
}
```

### Search Integration

Add search functionality:

```javascript
function createSearchPlugin(options) {
  return {
    name: 'search-integration',

    hooks: {
      'build:end': async (context) => {
        // Generate search index
        const searchIndex = context.pages.map((page) => ({
          title: page.title,
          content: page.content.replace(/<[^>]*>/g, ''),
          url: page.path,
          tags: page.tags || [],
        }));

        // Write search index
        const indexPath = path.join(context.outputDir, 'search-index.json');
        await fs.writeFile(indexPath, JSON.stringify(searchIndex, null, 2));

        // Upload to search service
        if (options.service === 'algolia') {
          await uploadToAlgolia(searchIndex, options.algolia);
        }
      },
    },

    filters: {
      // Add search highlighting filter
      highlight: (text, query) => {
        if (!query) return text;
        const regex = new RegExp(`(${query})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
      },
    },
  };
}
```

## CLI Commands

### Custom Commands

Add custom CLI commands:

```javascript
function createCLIPlugin() {
  return {
    name: 'custom-commands',

    commands: {
      // Custom deploy command
      deploy: {
        description: 'Deploy site to production',
        options: [
          {
            name: 'environment',
            alias: 'e',
            description: 'Deployment environment',
            default: 'production',
          },
          {
            name: 'dry-run',
            description: 'Preview deployment without executing',
            type: 'boolean',
          },
        ],

        async handler(args, context) {
          const { environment, dryRun } = args;

          console.log(`Deploying to ${environment}...`);

          if (dryRun) {
            console.log('Dry run mode - no changes will be made');
            return;
          }

          // Deployment logic
          await deployToEnvironment(environment, context.outputDir);
        },
      },

      // Content generation command
      'new:post': {
        description: 'Create a new blog post',
        options: [
          {
            name: 'title',
            alias: 't',
            description: 'Post title',
            required: true,
          },
          {
            name: 'author',
            alias: 'a',
            description: 'Post author',
            default: 'Default Author',
          },
        ],

        async handler(args, context) {
          const { title, author } = args;
          const slug = slugify(title);
          const date = new Date().toISOString().split('T')[0];

          const frontMatter = `---
title: '${title}'
author: '${author}'
publishedAt: '${date}'
draft: true
---

# ${title}

Write your post content here...
`;

          const postPath = path.join(context.config.contentDir, 'blog', `${slug}.md`);
          await fs.writeFile(postPath, frontMatter);

          console.log(`Created new post: ${postPath}`);
        },
      },
    },
  };
}
```

## Plugin Development

### Plugin Template

Start with this plugin template:

```javascript
import { z } from 'zod';

// Options schema
const optionsSchema = z.object({
  enabled: z.boolean().default(true),
  debug: z.boolean().default(false),
  // Add your options here
});

export default function createMyPlugin(userOptions = {}) {
  // Validate and merge options
  const options = optionsSchema.parse(userOptions);

  // Plugin state
  let pluginState = {};

  return {
    name: 'my-plugin',
    version: '1.0.0',
    description: 'A template for Stati plugins',

    // Plugin configuration
    config: options,

    // Plugin hooks
    hooks: {
      'build:start': async (context) => {
        if (options.debug) {
          console.log('My plugin: Build started');
        }

        // Initialize plugin state
        pluginState = {
          startTime: Date.now(),
          processedFiles: 0,
        };
      },

      'build:end': async (context) => {
        if (options.debug) {
          const duration = Date.now() - pluginState.startTime;
          console.log(`My plugin: Build completed in ${duration}ms`);
          console.log(`My plugin: Processed ${pluginState.processedFiles} files`);
        }
      },
    },

    // Cleanup function
    cleanup: async () => {
      // Cleanup resources
      pluginState = {};
    },
  };
}
```

### Testing Plugins

Test your plugins thoroughly:

```javascript
// tests/my-plugin.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import { createTestContext } from '@stati/core/testing';
import myPlugin from '../src/my-plugin.js';

describe('MyPlugin', () => {
  let context;
  let plugin;

  beforeEach(() => {
    context = createTestContext();
    plugin = myPlugin({ debug: true });
  });

  it('should initialize correctly', () => {
    expect(plugin.name).toBe('my-plugin');
    expect(plugin.hooks).toBeDefined();
  });

  it('should process content correctly', async () => {
    const testPage = {
      title: 'Test Page',
      content: 'Test content',
    };

    const result = await plugin.hooks['content:process'](testPage, context);
    expect(result).toBeDefined();
  });
});
```

## Best Practices

### Plugin Design

1. **Single Responsibility**: Each plugin should have a focused purpose
2. **Configuration**: Provide sensible defaults and clear options
3. **Error Handling**: Handle errors gracefully and provide helpful messages
4. **Performance**: Minimize impact on build performance

### Development

1. **Testing**: Write comprehensive tests for your plugins
2. **Documentation**: Provide clear documentation and examples
3. **Versioning**: Use semantic versioning for plugin releases
4. **Dependencies**: Minimize external dependencies

### Distribution

1. **NPM Publishing**: Publish plugins to npm for easy installation
2. **Examples**: Provide working examples and use cases
3. **Community**: Engage with the Stati community for feedback
4. **Maintenance**: Keep plugins updated with Stati releases

The Stati plugin system provides unlimited extensibility for your static site generation needs. Create plugins to integrate with any service, add custom functionality, or implement specialized build workflows.
