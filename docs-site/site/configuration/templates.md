---
title: 'Template Configuration'
description: 'Configure the Eta template engine, layouts, partials, and custom filters for your Stati site.'
---

# Template Configuration

Stati uses the [Eta template engine](https://eta.js.org/) to process templates and layouts. The template configuration allows you to customize how templates are processed, define custom filters, and configure template discovery.

## Basic Template Configuration

Configure template engine settings in your `stati.config.js`:

```javascript
// stati.config.js
import { defineConfig } from '@stati/core';

export default defineConfig({
  templates: {
    // Template engine settings
    engine: 'eta',

    // Template directory (relative to site root)
    templatesDir: 'site',

    // Layouts directory (relative to templatesDir)
    layoutsDir: '_layouts',

    // Partials directory (relative to templatesDir)
    partialsDir: '_partials',

    // Template file extensions
    extensions: ['.eta', '.html'],

    // Default layout for pages
    defaultLayout: 'layout',
  },
});
```

## Eta Engine Configuration

Configure Eta-specific settings:

```javascript
export default defineConfig({
  templates: {
    eta: {
      // Template delimiters
      tags: ['<%', '%>'],

      // Auto-escape HTML (recommended for security)
      autoEscape: true,

      // Remove whitespace from templates
      autoTrim: false,

      // Use with expressions for debugging
      debug: process.env.NODE_ENV === 'development',

      // Cache compiled templates
      cache: process.env.NODE_ENV === 'production',

      // Custom filter functions
      filters: {
        // Custom date formatting
        formatDate: (date, format = 'YYYY-MM-DD') => {
          return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          });
        },

        // Truncate text
        truncate: (text, length = 100) => {
          return text.length > length ? text.substring(0, length) + '...' : text;
        },

        // URL slug generation
        slugify: (text) => {
          return text
            .toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/[\s_-]+/g, '-')
            .replace(/^-+|-+$/g, '');
        },

        // Markdown to HTML conversion
        markdown: (content) => {
          // This filter would use your markdown processor
          return markdownProcessor.render(content);
        },
      },

      // Global template data
      data: {
        siteName: 'My Stati Site',
        currentYear: new Date().getFullYear(),
        buildTime: new Date().toISOString(),
      },
    },
  },
});
```

### Dynamic Attribute Values

Eta requires the entire value of an HTML attribute to be produced dynamically. Avoid mixing static strings with inline `<%=` expressions like `class="btn-<%= variant %>"`; Eta will treat that as invalid.

Use template literals when the value is mostly static:

```eta
<!-- ✅ Entire attribute value is dynamic -->
<button class="<%= `btn-${variant}` %>">Buy now</button>
```

For reusable compositions, prefer `stati.propValue()`. The helper is available in every template and works best for attributes that accept space-separated tokens—not just `class`:

```eta
<a
  class="<%= stati.propValue('btn', `btn-${variant}`, isActive && 'is-active') %>"
  data-analytics="<%= stati.propValue('cta', campaign, isActive && 'active') %>"
>
  View details
</a>
```

`stati.propValue()` joins all truthy values with spaces. For single concatenated values, use a template literal instead:

```eta
data-id="<%= `item-${id}` %>"
```

## Layout Configuration

Configure how layouts are discovered and applied:

```javascript
export default defineConfig({
  templates: {
    layouts: {
      // Default layout for all pages
      default: 'layout',

      // Layout inheritance patterns
      patterns: {
        'blog/**': 'blog-layout',
        'docs/**': 'docs-layout',
        'api/**': 'api-layout',
      },

      // Layout discovery rules
      discovery: {
        // Look for layout.eta in each directory
        cascading: true,

        // Fallback to parent directory layouts
        inherit: true,

        // Stop layout inheritance at these directories
        boundaries: ['site', 'content'],
      },
    },
  },
});
```

### Layout Inheritance

Stati supports cascading layout inheritance:

```text
site/
├── layout.eta              # Root layout
├── blog/
│   ├── layout.eta          # Blog layout (inherits from root)
│   ├── post-1.md
│   └── tutorials/
│       ├── layout.eta      # Tutorial layout (inherits from blog)
│       └── tutorial-1.md
└── docs/
    ├── layout.eta          # Docs layout (inherits from root)
    └── guide.md
```

## Partials Configuration

Configure template partials for reusable components:

```javascript
export default defineConfig({
  templates: {
    partials: {
      // Partials directories to scan
      directories: ['_partials', '_components', '_includes'],

      // Partial naming conventions
      naming: {
        // Prefix for partial files
        prefix: '_',

        // Auto-register partials by filename
        autoRegister: true,

        // Case sensitivity for partial names
        caseSensitive: false,
      },

      // Global partials available to all templates
      global: {
        header: '_partials/header.eta',
        footer: '_partials/footer.eta',
        sidebar: '_partials/sidebar.eta',
        meta: '_partials/meta.eta',
      },
    },
  },
});
```

### Using Partials in Templates

```html
<!-- In your layout.eta -->
<!DOCTYPE html>
<html>
  <head>
    <%~ include('meta', { title: page.title }) %>
  </head>
  <body>
    <%~ include('header') %>

    <main><%~ content %></main>

    <%~ include('footer') %>
  </body>
</html>
```

## Custom Filters

Define powerful custom filters for template processing:

```javascript
export default defineConfig({
  templates: {
    eta: {
      filters: {
        // Date and time filters
        formatDate: (date, options = {}) => {
          const defaults = {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          };
          return new Date(date).toLocaleDateString('en-US', {
            ...defaults,
            ...options,
          });
        },

        timeAgo: (date) => {
          const now = new Date();
          const diffMs = now - new Date(date);
          const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

          if (diffDays === 0) return 'Today';
          if (diffDays === 1) return 'Yesterday';
          if (diffDays < 7) return `${diffDays} days ago`;
          if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
          return `${Math.floor(diffDays / 30)} months ago`;
        },

        // String manipulation filters
        capitalize: (str) => {
          return str.charAt(0).toUpperCase() + str.slice(1);
        },

        camelCase: (str) => {
          return str.replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''));
        },

        kebabCase: (str) => {
          return str
            .replace(/([a-z])([A-Z])/g, '$1-$2')
            .replace(/[\s_]+/g, '-')
            .toLowerCase();
        },

        // Content filters
        excerpt: (content, length = 150) => {
          // Remove HTML tags and truncate
          const text = content.replace(/<[^>]*>/g, '');
          return text.length > length ? text.substring(0, length).trim() + '...' : text;
        },

        readingTime: (content) => {
          const wordsPerMinute = 200;
          const words = content.trim().split(/\s+/).length;
          const minutes = Math.ceil(words / wordsPerMinute);
          return `${minutes} min read`;
        },

        // URL and path filters
        absoluteUrl: (path, base) => {
          if (path.startsWith('http')) return path;
          return new URL(path, base || 'https://example.com').href;
        },

        // Array and object filters
        sortBy: (array, key, direction = 'asc') => {
          return [...array].sort((a, b) => {
            const aVal = key.split('.').reduce((obj, k) => obj?.[k], a);
            const bVal = key.split('.').reduce((obj, k) => obj?.[k], b);

            if (direction === 'desc') {
              return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
            }
            return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
          });
        },

        groupBy: (array, key) => {
          return array.reduce((groups, item) => {
            const group = key.split('.').reduce((obj, k) => obj?.[k], item);
            groups[group] = groups[group] || [];
            groups[group].push(item);
            return groups;
          }, {});
        },
      },
    },
  },
});
```

## Global Template Data

Make data available to all templates:

```javascript
export default defineConfig({
  templates: {
    eta: {
      data: {
        // Static data
        siteName: 'My Stati Site',
        currentYear: new Date().getFullYear(),

        // Dynamic data functions
        buildTime: () => new Date().toISOString(),

        // Helper functions
        helpers: {
          isActive: (currentPath, linkPath) => {
            return currentPath === linkPath || currentPath.startsWith(linkPath + '/');
          },

          getPagesByTag: (pages, tag) => {
            return pages.filter((page) => page.tags && page.tags.includes(tag));
          },

          formatFileSize: (bytes) => {
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            if (bytes === 0) return '0 Bytes';
            const i = Math.floor(Math.log(bytes) / Math.log(1024));
            return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
          },
        },
      },
    },
  },
});
```

## Template Compilation

Configure template compilation settings:

```javascript
export default defineConfig({
  templates: {
    compilation: {
      // Watch for template changes in development
      watch: process.env.NODE_ENV === 'development',

      // Compile templates on demand or precompile
      strategy: 'on-demand', // 'on-demand' | 'precompile'

      // Template compilation cache
      cache: {
        enabled: true,
        directory: '.stati/template-cache',
        maxAge: 1000 * 60 * 60 * 24, // 24 hours
      },

      // Source maps for debugging
      sourceMaps: process.env.NODE_ENV === 'development',
    },
  },
});
```

## Error Handling

Configure template error handling:

```javascript
export default defineConfig({
  templates: {
    errors: {
      // How to handle template errors
      strategy: 'throw', // 'throw' | 'log' | 'ignore'

      // Custom error pages
      errorPages: {
        404: 'errors/404.eta',
        500: 'errors/500.eta',
      },

      // Development error overlay
      overlay: process.env.NODE_ENV === 'development',

      // Error logging
      logging: {
        enabled: true,
        level: 'error', // 'error' | 'warn' | 'info'
        file: 'logs/template-errors.log',
      },
    },
  },
});
```

## Performance Optimization

Optimize template performance:

```javascript
export default defineConfig({
  templates: {
    performance: {
      // Precompile templates for production
      precompile: process.env.NODE_ENV === 'production',

      // Template minification
      minify: {
        enabled: process.env.NODE_ENV === 'production',
        options: {
          removeComments: true,
          collapseWhitespace: true,
          removeEmptyAttributes: true,
        },
      },

      // Parallel template processing
      parallel: {
        enabled: true,
        maxWorkers: require('os').cpus().length,
      },

      // Template output caching
      outputCache: {
        enabled: true,
        strategy: 'content-hash', // 'content-hash' | 'mtime'
        maxSize: 100 * 1024 * 1024, // 100MB
      },
    },
  },
});
```

## Advanced Features

### Custom Template Loaders

Define custom template loading logic:

```javascript
export default defineConfig({
  templates: {
    loaders: {
      // Custom loader for remote templates
      remote: async (templatePath) => {
        if (templatePath.startsWith('http')) {
          const response = await fetch(templatePath);
          return response.text();
        }
        return null;
      },

      // Custom loader for database templates
      database: async (templatePath) => {
        if (templatePath.startsWith('db:')) {
          const templateId = templatePath.slice(3);
          return await database.getTemplate(templateId);
        }
        return null;
      },
    },
  },
});
```

### Template Middleware

Process templates with custom middleware:

```javascript
export default defineConfig({
  templates: {
    middleware: [
      // Add security headers to templates
      (template, context) => {
        if (context.type === 'layout') {
          template = template.replace(
            '<head>',
            '<head>\n  <meta http-equiv="X-Content-Type-Options" content="nosniff">',
          );
        }
        return template;
      },

      // Process custom template syntax
      (template, context) => {
        return template.replace(
          /\{\{@([^}]+)\}\}/g,
          (match, componentName) => `<%~ include('components/${componentName}') %>`,
        );
      },

      // Add analytics to layouts
      (template, context) => {
        if (context.type === 'layout' && process.env.NODE_ENV === 'production') {
          template = template.replace('</head>', '  <!-- Analytics code -->\n</head>');
        }
        return template;
      },
    ],
  },
});
```

## Template Organization

### Recommended Structure

```text
site/
├── layout.eta                 # Root layout
├── _partials/                 # Shared partials
│   ├── header.eta
│   ├── footer.eta
│   ├── sidebar.eta
│   └── meta.eta
├── _components/               # Reusable components
│   ├── button.eta
│   ├── card.eta
│   └── form.eta
├── _layouts/                  # Alternative layouts
│   ├── blog.eta
│   ├── docs.eta
│   └── landing.eta
└── pages/                     # Page templates
    ├── home.eta
    ├── about.eta
    └── contact.eta
```

### Best Practices

1. **Separation of Concerns**: Keep layouts, partials, and components organized
2. **Naming Conventions**: Use consistent naming for templates and partials
3. **Template Inheritance**: Leverage layout inheritance for maintainability
4. **Component Reusability**: Create reusable components for common UI elements
5. **Performance**: Use template caching and minification in production

## Testing Templates

Test your template configuration:

```bash
# Validate template syntax
stati build --validate-templates

# Test template rendering
stati dev --debug-templates

# Profile template performance
stati build --profile-templates
```

Template configuration is crucial for creating maintainable and performant Stati sites. Take advantage of Eta's powerful features and Stati's template organization to build flexible, reusable template systems.
