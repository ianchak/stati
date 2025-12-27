---
title: 'Template Settings'
description: 'Configure custom template filters for the Eta template engine.'
order: 3
---

# Template Configuration

Stati uses the [Eta template engine](https://eta.js.org/) to process templates and layouts. Most Eta settings are hardcoded for reliability, but you can define custom filters to extend template functionality.

## Configuration Options

Stati's template engine configuration is minimal by design. The only configurable option is `eta.filters`:

```javascript
// stati.config.js
import { defineConfig } from '@stati/core';

export default defineConfig({
  eta: {
    // Define custom template filters
    filters: {
      uppercase: (str) => String(str).toUpperCase(),
      lowercase: (str) => String(str).toLowerCase(),
    },
  },
});
```

## Custom Filters

Filters are functions that transform values in templates. They're useful for formatting dates, manipulating strings, or performing calculations.

### Defining Filters

```javascript
export default defineConfig({
  eta: {
    filters: {
      // Date formatting
      formatDate: (date) => {
        return new Date(date).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      },

      // Text truncation
      truncate: (text, length = 100) => {
        if (!text || text.length <= length) return text;
        return text.substring(0, length) + '...';
      },

      // URL slug generation
      slugify: (text) => {
        return String(text)
          .toLowerCase()
          .replace(/[^\w\s-]/g, '')
          .replace(/[\s_-]+/g, '-')
          .replace(/^-+|-+$/g, '');
      },

      // Number formatting
      formatNumber: (num) => {
        return Number(num).toLocaleString('en-US');
      },

      // Relative time
      timeAgo: (date) => {
        const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
        const intervals = {
          year: 31536000,
          month: 2592000,
          week: 604800,
          day: 86400,
          hour: 3600,
          minute: 60,
        };

        for (const [unit, secondsInUnit] of Object.entries(intervals)) {
          const interval = Math.floor(seconds / secondsInUnit);
          if (interval >= 1) {
            return `${interval} ${unit}${interval !== 1 ? 's' : ''} ago`;
          }
        }
        return 'just now';
      },
    },
  },
});
```

### Using Custom Filters

Access filters directly from the `stati` context:

```eta
<!-- Built-in filters from config -->
<h1><%= stati.uppercase('hello world') %></h1>
<!-- Result: HELLO WORLD -->

<time><%= stati.formatDate(stati.page.date) %></time>
<!-- Result: January 15, 2024 -->

<p><%= stati.truncate(stati.page.description, 150) %></p>
<!-- Result: First 150 characters... -->

<a href="/tags/<%= stati.slugify(tag) %>/"><%= tag %></a>
<!-- Result: /tags/my-tag/ -->

<span><%= stati.timeAgo(stati.page.publishedAt) %></span>
<!-- Result: 3 days ago -->
```

## Hardcoded Settings

The following Eta settings are hardcoded and cannot be configured:

- **Template directory**: Always `srcDir` (default `'site'`)
- **Variable name**: Always `'stati'` (the context object in templates)
- **Delimiters**: Always `<%` and `%>`
- **Caching**: Enabled in production, disabled in development
- **File extension**: Always `.eta`

## Advanced: Custom Filter Patterns

### Chaining Filters

You can combine filters for complex transformations:

```eta
<!-- Chain multiple transformations -->
<%= stati.slugify(stati.lowercase(stati.page.title)) %>

<!-- Or create a composite filter -->
<%
const titleSlug = (title) => stati.slugify(stati.lowercase(title));
%>
<a href="/posts/<%= titleSlug(stati.page.title) %>/"><%= stati.page.title %></a>
```

### Conditional Filters

Apply filters based on conditions:

```eta
<%
const displayDate = (date, format = 'short') => {
  if (format === 'relative') {
    return stati.timeAgo(date);
  }
  return stati.formatDate(date);
};
%>

<time><%= displayDate(stati.page.date, 'relative') %></time>
```

### Filters with External Dependencies

Import utilities in your config file for use in filters:

```javascript
import { marked } from 'marked';
import { highlight } from 'highlight.js';

export default defineConfig({
  eta: {
    filters: {
      // Process markdown in templates
      renderMarkdown: (content) => {
        return marked(content);
      },

      // Syntax highlighting
      highlight: (code, lang) => {
        if (lang && highlight.getLanguage(lang)) {
          return highlight.highlight(code, { language: lang }).value;
        }
        return code;
      },
    },
  },
});
```

## Filter Examples

Here are practical filter examples you can use in your project:

```javascript
export default defineConfig({
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
});
```

## Using Filters in Templates

Once defined, filters are available directly in the `stati` context:

```eta
<!-- String manipulation -->
<h1><%= stati.capitalize(stati.page.title) %></h1>
<p class="<%= stati.kebabCase(category) %>"></p>

<!-- Date formatting -->
<time><%= stati.formatDate(stati.page.date) %></time>
<span><%= stati.timeAgo(stati.page.publishedAt) %></span>

<!-- Content processing -->
<p><%= stati.excerpt(stati.page.content, 200) %></p>
<span><%= stati.readingTime(stati.page.content) %></span>

<!-- Arrays and objects -->
<%
const sortedPosts = stati.sortBy(posts, 'publishedAt', 'desc');
const postsByTag = stati.groupBy(posts, 'category');
%>
```

## TypeScript Bundle Access

When TypeScript is enabled, Stati provides access to compiled bundle paths via `stati.assets.bundlePaths`. This is useful for preloading, custom script placement, or conditional rendering.

### Auto-Injection (Default Behavior)

By default, Stati **automatically injects** all matched bundle scripts before the closing `</body>` tag. You don't need to add script tags manually - they're handled for you during both development and production builds.

### Accessing Bundle Paths

If you need to access bundle paths in your templates (for example, to preload modules or customize their placement), use `stati.assets.bundlePaths`:

```eta
<head>
  <!-- Preload all matched bundles for this page -->
  <% if (stati.assets?.bundlePaths) { %>
    <% for (const path of stati.assets.bundlePaths) { %>
    <link rel="modulepreload" href="<%= path %>">
    <% } %>
  <% } %>
</head>
```

### Conditional Rendering

Check if any bundles are available before rendering:

```eta
<% if (stati.assets?.bundlePaths && stati.assets.bundlePaths.length > 0) { %>
  <!-- Page has TypeScript bundles -->
  <div class="interactive-content">
    <!-- Your interactive content here -->
  </div>
<% } else { %>
  <!-- Static fallback content -->
  <div class="static-content">
    <!-- Fallback for pages without JavaScript -->
  </div>
<% } %>
```

### Bundle Paths Array

The `bundlePaths` array contains paths to all bundles matched for the current page based on your TypeScript configuration:

- Global bundles (no `include` pattern) appear on all pages
- Targeted bundles appear only on pages matching their `include` patterns
- Bundles are listed in the order defined in your config

```eta
<!-- Debug: Show which bundles are loaded on this page -->
<% if (stati.assets?.bundlePaths) { %>
<script>
  console.log('Bundles for this page:', <%= JSON.stringify(stati.assets.bundlePaths) %>);
</script>
<% } %>
```

For more details on configuring multiple bundles, see [TypeScript Support](/configuration/typescript).

## Best Practices

1. **Keep filters simple**: Each filter should do one thing well
2. **Handle edge cases**: Check for null, undefined, and invalid inputs
3. **Return consistent types**: Always return the same data type
4. **Avoid side effects**: Filters should be pure functions
5. **Document complex filters**: Add comments for non-obvious logic

## Next Steps

- See [Templates & Layouts](/core-concepts/templates) for template usage
- Learn about [built-in helpers](/api/templates) like `stati.propValue()`
- Explore [SEO configuration](/configuration/seo) for meta tag generation
